'use strict';
const global = window;

    const SIM_MODAL_TOOL_IDS = ['sim-modal-close', 'sim-modal-capture', 'sim-modal-fullscreen'];

    let currentModalUrl = '';
    let modalFullscreen = false;

    function lang() {
        return global.AppRouter && AppRouter.getLang ? AppRouter.getLang() : 'zh';
    }

    function t(zh, en) {
        return lang() === 'zh' ? zh : en;
    }

    function isModalToolElement(el) {
        return el && SIM_MODAL_TOOL_IDS.includes(el.id);
    }

    function getIframeAccess(iframe) {
        try {
            const win = iframe.contentWindow;
            const doc = iframe.contentDocument || (win ? win.document : null);
            if (!win || !doc) return null;
            return { win, doc };
        } catch (e) {
            return null;
        }
    }

    async function waitForIframeRender(doc, win) {
        if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
        if (win && win.MathJax && typeof win.MathJax.typesetPromise === 'function') {
            try { await win.MathJax.typesetPromise(); } catch (e) { /* ignore */ }
        }
        const images = Array.from(doc.images || []);
        await Promise.all(images.filter(img => !img.complete).map(img => new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        })));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    function temporarilyFixPositionedElements(doc, win) {
        const restored = [];
        doc.querySelectorAll('*').forEach(el => {
            const style = win.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'sticky') {
                restored.push({
                    element: el,
                    position: el.style.position,
                    top: el.style.top,
                    left: el.style.left,
                });
                el.style.position = 'absolute';
                const rect = el.getBoundingClientRect();
                el.style.top = (rect.top + (win.scrollY || 0)) + 'px';
                el.style.left = (rect.left + (win.scrollX || 0)) + 'px';
            }
        });
        return function () {
            restored.forEach(item => {
                item.element.style.position = item.position;
                item.element.style.top = item.top;
                item.element.style.left = item.left;
            });
        };
    }

    function withCaptureDocumentFixes(doc, fn) {
        const style = doc.createElement('style');
        style.id = 'html2canvas-live-metric-fix';
        style.textContent = 'body > div:last-child img { display: inline-block !important; vertical-align: baseline !important; }';
        (doc.head || doc.documentElement).appendChild(style);
        return Promise.resolve(fn()).finally(() => style.remove());
    }

    function copyCaptureStyles(sourceEl, targetEl, computed) {
        const props = [
            'boxSizing', 'display', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
            'borderTopWidth', 'borderTopStyle', 'borderTopColor',
            'borderRightWidth', 'borderRightStyle', 'borderRightColor',
            'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor',
            'borderLeftWidth', 'borderLeftStyle', 'borderLeftColor',
            'borderRadius', 'backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight',
            'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'whiteSpace',
            'verticalAlign', 'flex', 'flexGrow', 'flexShrink', 'alignSelf',
            'justifyContent', 'alignItems', 'gap', 'overflow', 'textOverflow', 'boxShadow', 'opacity',
        ];
        props.forEach(prop => { targetEl.style[prop] = computed[prop]; });
    }

    function applyHtml2canvasCloneFixes(clonedDoc) {
        if (clonedDoc.getElementById('html2canvas-capture-fix')) return;
        const style = clonedDoc.createElement('style');
        style.id = 'html2canvas-capture-fix';
        style.textContent = [
            'img, svg, video, canvas { display: inline-block !important; vertical-align: middle !important; height: auto; max-width: 100%; }',
            'svg { overflow: visible; }',
            'button, label, a { vertical-align: middle; }',
            'input, select, textarea { line-height: normal; vertical-align: middle; box-sizing: border-box; }',
            'input[type="range"] { vertical-align: middle; }',
            'mjx-container, mjx-assistive-mml, .MathJax, .MathJax_Display { display: inline-block !important; vertical-align: middle !important; }',
            'p, h1, h2, h3, h4, h5, h6, span, li, td, th, div { -webkit-font-smoothing: antialiased; }',
        ].join('\n');
        (clonedDoc.head || clonedDoc.documentElement).appendChild(style);
    }

    function replaceFormControlsInClone(clonedRoot, sourceRoot, sourceWin) {
        if (!sourceWin) return;

        function replacePair(sourceSelector, createReplacement) {
            const sourceNodes = sourceRoot.querySelectorAll(sourceSelector);
            const clonedNodes = clonedRoot.querySelectorAll(sourceSelector);
            clonedNodes.forEach((clonedNode, index) => {
                const sourceNode = sourceNodes[index];
                if (!sourceNode) return;
                const replacement = createReplacement(sourceNode, clonedNode.ownerDocument, sourceWin);
                if (replacement) clonedNode.replaceWith(replacement);
            });
        }

        replacePair('textarea', (sourceEl, clonedDoc, win) => {
            const computed = win.getComputedStyle(sourceEl);
            const replacement = clonedDoc.createElement('div');
            replacement.textContent = sourceEl.value || sourceEl.placeholder || '';
            replacement.className = sourceEl.className;
            replacement.style.whiteSpace = 'pre-wrap';
            replacement.style.wordBreak = 'break-word';
            replacement.setAttribute('aria-hidden', 'true');
            copyCaptureStyles(sourceEl, replacement, computed);
            return replacement;
        });

        replacePair('select', (sourceEl, clonedDoc, win) => {
            const computed = win.getComputedStyle(sourceEl);
            const replacement = clonedDoc.createElement('span');
            const option = sourceEl.options[sourceEl.selectedIndex];
            replacement.textContent = option ? option.text : '';
            replacement.className = sourceEl.className;
            replacement.setAttribute('aria-hidden', 'true');
            copyCaptureStyles(sourceEl, replacement, computed);
            replacement.style.display = (computed.display === 'inline' || computed.display === 'inline-block')
                ? computed.display : 'inline-block';
            return replacement;
        });

        replacePair(
            'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
            (sourceEl, clonedDoc, win) => {
                const computed = win.getComputedStyle(sourceEl);
                const replacement = clonedDoc.createElement('span');
                replacement.textContent = sourceEl.value || sourceEl.getAttribute('placeholder') || '';
                replacement.className = sourceEl.className;
                replacement.setAttribute('aria-hidden', 'true');
                copyCaptureStyles(sourceEl, replacement, computed);
                if (computed.display === 'block') replacement.style.display = 'block';
                else if (computed.display === 'inline') replacement.style.display = 'inline';
                else replacement.style.display = 'inline-block';
                return replacement;
            }
        );
    }

    function normalizeFlexButtonsInClone(clonedRoot, sourceRoot, sourceWin) {
        if (!sourceWin) return;
        const sourceButtons = sourceRoot.querySelectorAll('button, [role="button"]');
        clonedRoot.querySelectorAll('button, [role="button"]').forEach((clonedBtn, index) => {
            const sourceBtn = sourceButtons[index];
            if (!sourceBtn) return;
            const computed = sourceWin.getComputedStyle(sourceBtn);
            if (computed.display === 'flex' || computed.display === 'inline-flex') {
                clonedBtn.style.display = computed.display;
                clonedBtn.style.alignItems = computed.alignItems;
                clonedBtn.style.justifyContent = computed.justifyContent;
                clonedBtn.style.gap = computed.gap;
                clonedBtn.style.lineHeight = computed.lineHeight;
            }
            clonedBtn.querySelectorAll('svg').forEach(svg => {
                svg.style.display = 'inline-block';
                svg.style.verticalAlign = 'middle';
                svg.style.flexShrink = '0';
            });
        });
    }

    function injectCanvasSnapshots(clonedRoot, sourceRoot) {
        const clonedCanvases = clonedRoot.querySelectorAll('canvas');
        const sourceCanvases = sourceRoot.querySelectorAll('canvas');
        clonedCanvases.forEach((clonedCanvas, index) => {
            const sourceCanvas = sourceCanvases[index];
            if (!sourceCanvas) return;
            try {
                const dataUrl = sourceCanvas.toDataURL('image/png');
                const img = clonedCanvas.ownerDocument.createElement('img');
                img.src = dataUrl;
                img.alt = '';
                const sourceWin = sourceCanvas.ownerDocument.defaultView;
                const computed = sourceWin ? sourceWin.getComputedStyle(sourceCanvas) : null;
                if (computed) {
                    img.style.width = computed.width;
                    img.style.height = computed.height;
                    img.style.maxWidth = computed.maxWidth;
                    img.style.maxHeight = computed.maxHeight;
                }
                img.style.display = 'inline-block';
                img.style.verticalAlign = 'middle';
                if (sourceCanvas.className) img.className = sourceCanvas.className;
                clonedCanvas.replaceWith(img);
            } catch (e) {
                console.warn('Canvas snapshot failed:', e);
            }
        });
    }

    function prepareCaptureClone(clonedDoc, clonedEl, sourceRoot) {
        const sourceWin = sourceRoot.ownerDocument ? sourceRoot.ownerDocument.defaultView : null;
        applyHtml2canvasCloneFixes(clonedDoc);
        injectCanvasSnapshots(clonedEl, sourceRoot);
        replaceFormControlsInClone(clonedEl, sourceRoot, sourceWin);
        normalizeFlexButtonsInClone(clonedEl, sourceRoot, sourceWin);
        clonedEl.querySelectorAll('img, svg').forEach(el => {
            el.style.display = 'inline-block';
            el.style.verticalAlign = 'middle';
        });
    }

    async function html2canvasCapture(targetEl, sourceEl, extraOptions) {
        if (typeof html2canvas !== 'function') {
            throw new Error('html2canvas not loaded');
        }
        const sourceWin = (sourceEl || targetEl).ownerDocument.defaultView;
        const windowWidth = sourceWin ? sourceWin.innerWidth : targetEl.clientWidth;
        const windowHeight = sourceWin ? sourceWin.innerHeight : targetEl.clientHeight;
        const scrollX = sourceWin ? -(sourceWin.scrollX || 0) : 0;
        const scrollY = sourceWin ? -(sourceWin.scrollY || 0) : 0;
        const options = Object.assign({
            backgroundColor: '#ffffff',
            scale: Math.min(window.devicePixelRatio || 1, 2),
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth,
            windowHeight,
            scrollX,
            scrollY,
            onclone(clonedDoc, clonedEl) {
                prepareCaptureClone(clonedDoc, clonedEl, sourceEl || targetEl);
            },
        }, extraOptions || {});
        return html2canvas(targetEl, options);
    }

    async function captureIframeContent(iframe) {
        const access = getIframeAccess(iframe);
        if (!access) throw new Error('Cannot access iframe content');
        const { win, doc } = access;
        const root = doc.body || doc.documentElement;
        const originalScrollX = win.scrollX || 0;
        const originalScrollY = win.scrollY || 0;
        await waitForIframeRender(doc, win);
        return withCaptureDocumentFixes(doc, async () => {
            const restorePositioned = temporarilyFixPositionedElements(doc, win);
            try {
                return await html2canvasCapture(root, root);
            } finally {
                restorePositioned();
                win.scrollTo(originalScrollX, originalScrollY);
            }
        });
    }

    async function captureModalContainer() {
        const modalContent = document.getElementById('sim-modal-content');
        return withCaptureDocumentFixes(document, async () => html2canvasCapture(modalContent, modalContent, {
            ignoreElements(element) {
                return isModalToolElement(element);
            },
        }));
    }

    function getFormattedTimestamp() {
        const tz = (typeof window !== 'undefined' && window.__APP_TIMEZONE__) || 'Asia/Hong_Kong';
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).formatToParts(new Date());
        const get = type => (parts.find(p => p.type === type) || {}).value || '';
        return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
    }

    function getFileNameFromUrl(url) {
        if (!url) return '';
        try {
            const urlObj = new URL(url, window.location.origin);
            const slug = urlObj.searchParams.get('slug');
            if (slug) return slug.replace(/[^a-zA-Z0-9_-]/g, '_') || 'simulation';
            const fileName = urlObj.pathname.split('/').pop().replace(/\.html?$/i, '');
            return fileName || 'simulation';
        } catch (e) {
            return 'simulation';
        }
    }

    function downloadPngFromCanvas(canvas, baseName) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error('Failed to create PNG blob'));
                    return;
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = baseName + '_' + getFormattedTimestamp() + '.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
            }, 'image/png', 1);
        });
    }

    function updateFullscreenButtonUI() {
        const btn = document.getElementById('sim-modal-fullscreen');
        const expandIcon = document.getElementById('sim-modal-fullscreen-expand');
        const compressIcon = document.getElementById('sim-modal-fullscreen-compress');
        if (!btn || !expandIcon || !compressIcon) return;
        if (modalFullscreen) {
            btn.setAttribute('aria-label', t('退出全螢幕', 'Exit fullscreen'));
            btn.title = t('退出全螢幕', 'Exit fullscreen');
            expandIcon.classList.add('hidden');
            compressIcon.classList.remove('hidden');
        } else {
            btn.setAttribute('aria-label', t('全螢幕', 'Fullscreen'));
            btn.title = t('顯示成全螢幕', 'Enter fullscreen');
            expandIcon.classList.remove('hidden');
            compressIcon.classList.add('hidden');
        }
    }

    function setModalFullscreen(enabled) {
        const modal = document.getElementById('sim-modal');
        if (!modal) return;
        modalFullscreen = !!enabled;
        modal.classList.toggle('fullscreen-mode', modalFullscreen);
        updateFullscreenButtonUI();
    }

    function toggleModalFullscreen() {
        setModalFullscreen(!modalFullscreen);
    }

    function onModalOpen(url) {
        currentModalUrl = url;
        setModalFullscreen(false);
        const captureBtn = document.getElementById('sim-modal-capture');
        const iframe = document.getElementById('sim-modal-iframe');
        if (captureBtn) captureBtn.disabled = true;
        if (iframe) {
            iframe.onload = function () {
                setTimeout(() => {
                    if (captureBtn) captureBtn.disabled = false;
                }, 1000);
            };
        }
    }

    function onModalClose() {
        setModalFullscreen(false);
        currentModalUrl = '';
        const captureBtn = document.getElementById('sim-modal-capture');
        if (captureBtn) captureBtn.disabled = true;
    }

    async function captureModal() {
        const captureBtn = document.getElementById('sim-modal-capture');
        const iframe = document.getElementById('sim-modal-iframe');
        if (!iframe || !iframe.src) {
            alert(t('無法截圖：內容尚未載入', 'Cannot capture: Content not loaded'));
            return;
        }
        if (captureBtn) captureBtn.disabled = true;
        try {
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            let canvas;
            try {
                canvas = await captureIframeContent(iframe);
            } catch (iframeError) {
                console.warn('Iframe capture failed, using modal fallback:', iframeError);
                canvas = await captureModalContainer();
            }
            const fileName = getFileNameFromUrl(currentModalUrl) || 'simulation';
            await downloadPngFromCanvas(canvas, fileName);
        } catch (error) {
            console.error('Capture failed:', error);
            alert(t('截圖失敗，請稍後再試', 'Capture failed, please try again'));
        } finally {
            if (captureBtn) captureBtn.disabled = false;
        }
    }

    function init() {
        document.getElementById('sim-modal-fullscreen')?.addEventListener('click', e => {
            e.stopPropagation();
            toggleModalFullscreen();
        });
        document.getElementById('sim-modal-capture')?.addEventListener('click', e => {
            e.stopPropagation();
            captureModal();
        });

        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            const modal = document.getElementById('sim-modal');
            if (!modal || !modal.classList.contains('active')) return;
            if (modalFullscreen) {
                setModalFullscreen(false);
                return;
            }
            global.AppCatalog?.closeModal();
        });

        document.addEventListener('langchange', () => updateFullscreenButtonUI());
    }

    global.SimModal = {
        init,
        onOpen: onModalOpen,
        onClose: onModalClose,
        toggleModalFullscreen,
        captureModal,
        setModalFullscreen,
    };

export {};
