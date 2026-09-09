/**
 * Runs inside sandboxed simulation HTML (opaque origin).
 * Parent SPA requests a screenshot via postMessage; this page serializes a
 * script-free, style-inlined snapshot (html2canvas cannot clone from origin null).
 */
(function (global) {
    'use strict';

    if (global.__SCI_SIM_CAPTURE_BRIDGE__) return;
    global.__SCI_SIM_CAPTURE_BRIDGE__ = true;

    var REQUEST_TYPE = 'SCI_SIM_CAPTURE_REQUEST';
    var RESULT_TYPE = 'SCI_SIM_CAPTURE_RESULT';

    function waitForRender() {
        var fontsReady = document.fonts && document.fonts.ready
            ? document.fonts.ready.catch(function () { /* ignore */ })
            : Promise.resolve();
        var mathReady = Promise.resolve();
        if (global.MathJax && typeof global.MathJax.typesetPromise === 'function') {
            mathReady = global.MathJax.typesetPromise().catch(function () { /* ignore */ });
        }
        var images = Array.prototype.slice.call(document.images || []);
        var imagesReady = Promise.all(images.filter(function (img) {
            return !img.complete;
        }).map(function (img) {
            return new Promise(function (resolve) {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }));
        return Promise.all([fontsReady, mathReady, imagesReady]).then(function () {
            return new Promise(function (resolve) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(resolve);
                });
            });
        });
    }

    var STYLE_PROPS = [
        'box-sizing', 'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border-top-width', 'border-top-style', 'border-top-color',
        'border-right-width', 'border-right-style', 'border-right-color',
        'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
        'border-left-width', 'border-left-style', 'border-left-color',
        'border-radius', 'background-color', 'background-image', 'background-size',
        'background-repeat', 'background-position', 'color', 'font-family', 'font-size',
        'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align',
        'text-transform', 'white-space', 'vertical-align', 'opacity', 'overflow',
        'overflow-x', 'overflow-y', 'flex', 'flex-direction', 'flex-wrap', 'flex-grow',
        'flex-shrink', 'align-items', 'justify-content', 'align-self', 'gap',
        'box-shadow', 'transform', 'visibility', 'float', 'clear',
    ];

    function isHtml2CanvasSafeValue(value) {
        if (!value || value === 'initial' || value === 'inherit') return false;
        return !/oklch|oklab|color-mix|light-dark|lab\(|lch\(|color\(|var\(/i.test(value);
    }

    function computedStyleCss(el) {
        var computed = global.getComputedStyle(el);
        var css = '';
        for (var i = 0; i < STYLE_PROPS.length; i++) {
            var prop = STYLE_PROPS[i];
            var value = computed.getPropertyValue(prop);
            if (!isHtml2CanvasSafeValue(value)) continue;
            css += prop + ':' + value + ';';
        }
        return css;
    }

    function inlineComputedStyles(sourceRoot, clonedRoot) {
        var sourceNodes = [sourceRoot].concat(Array.prototype.slice.call(sourceRoot.querySelectorAll('*')));
        var clonedNodes = [clonedRoot].concat(Array.prototype.slice.call(clonedRoot.querySelectorAll('*')));
        var limit = Math.min(sourceNodes.length, clonedNodes.length);
        for (var i = 0; i < limit; i++) {
            clonedNodes[i].setAttribute('style', computedStyleCss(sourceNodes[i]));
        }
    }

    function syncFormValues(sourceRoot, clonedRoot) {
        var sourceInputs = sourceRoot.querySelectorAll('input, textarea, select');
        var clonedInputs = clonedRoot.querySelectorAll('input, textarea, select');
        clonedInputs.forEach(function (cloned, index) {
            var source = sourceInputs[index];
            if (!source) return;
            var tag = source.tagName.toLowerCase();
            var type = (source.getAttribute('type') || '').toLowerCase();
            if (tag === 'textarea') {
                cloned.textContent = source.value;
            } else if (tag === 'select') {
                cloned.querySelectorAll('option').forEach(function (opt, optIndex) {
                    if (optIndex === source.selectedIndex) opt.setAttribute('selected', 'selected');
                    else opt.removeAttribute('selected');
                });
            } else if (type === 'checkbox' || type === 'radio') {
                if (source.checked) cloned.setAttribute('checked', 'checked');
                else cloned.removeAttribute('checked');
            } else {
                cloned.setAttribute('value', source.value);
            }
        });
    }

    function replaceCanvases(sourceRoot, clonedRoot) {
        var sourceCanvases = sourceRoot.querySelectorAll('canvas');
        clonedRoot.querySelectorAll('canvas').forEach(function (clonedCanvas, index) {
            var sourceCanvas = sourceCanvases[index];
            if (!sourceCanvas) return;
            try {
                var img = clonedCanvas.ownerDocument.createElement('img');
                img.src = sourceCanvas.toDataURL('image/png');
                img.alt = '';
                var computed = global.getComputedStyle(sourceCanvas);
                img.setAttribute('style', 'width:' + computed.width + ';height:' + computed.height + ';display:inline-block;');
                if (sourceCanvas.className) img.className = sourceCanvas.className;
                clonedCanvas.replaceWith(img);
            } catch (e) {
                /* tainted / WebGL buffer cleared */
            }
        });
    }

    function serializeSnapshot() {
        var source = document.documentElement;
        var clone = source.cloneNode(true);
        inlineComputedStyles(source, clone);
        clone.querySelectorAll('script, noscript').forEach(function (el) {
            el.remove();
        });
        syncFormValues(source, clone);
        replaceCanvases(source, clone);

        var width = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0, global.innerWidth || 0);
        var height = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, global.innerHeight || 0);
        var html = '<!DOCTYPE html>' + clone.outerHTML;
        return { html: html, width: width, height: height };
    }

    function reply(source, origin, payload) {
        var targetOrigin = origin && origin !== 'null' ? origin : '*';
        source.postMessage(payload, targetOrigin);
    }

    global.addEventListener('message', function (event) {
        var data = event.data;
        if (!data || data.type !== REQUEST_TYPE || !data.requestId) return;
        if (event.source !== global.parent) return;

        waitForRender().then(function () {
            var snapshot = serializeSnapshot();
            reply(event.source, event.origin, {
                type: RESULT_TYPE,
                requestId: data.requestId,
                ok: true,
                html: snapshot.html,
                width: snapshot.width,
                height: snapshot.height,
            });
        }).catch(function (err) {
            reply(event.source, event.origin, {
                type: RESULT_TYPE,
                requestId: data.requestId,
                ok: false,
                error: err && err.message ? err.message : 'Capture failed',
            });
        });
    });
})(window);
