(function (global) {
    'use strict';

    const MATH_PLACEHOLDER = '\uE000MDMATH';
    const MERMAID_PLACEHOLDER = '\uE000MDMERM';
    let markedReady = false;

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
    }

    function decodeHtmlEntities(text) {
        return String(text)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
    }

    function normalizeMermaidSource(code) {
        let text = String(code).replace(/\r\n/g, '\n').trim();
        if (/^mindmap\b/im.test(text) || /\nmindmap\b/im.test(text)) {
            text = sanitizeMindmapSource(text);
            if (!/^---[\s\S]*?\blayout:\s*tidy-tree\b[\s\S]*?---/im.test(text)) {
                text = '---\nconfig:\n  layout: tidy-tree\n---\n' + text;
            }
        }
        return text;
    }

    function sanitizeMindmapSource(source) {
        if (!/\bmindmap\b/i.test(source)) return source;
        return source.split('\n').map((line) => {
            if (/^\s*(---|config:|layout:)/.test(line) || /^\s*mindmap\s*$/i.test(line)) return line;
            if (/^\s*root\s*\(\(/i.test(line)) return line;

            let l = line.replace(/^(\s*)-->\s*/, '$1');
            l = l.replace(/^(\s*)[A-Za-z][A-Za-z0-9_]*\[([^\]]+)\]\s*$/, '$1$2');
            l = l.replace(/(\S)\s*<-->\s*(\S)/g, '$1 ↔ $2');
            l = l.replace(/\$([^$]+)\$/g, (_, tex) => tex
                .replace(/\\text\{([^}]+)\}/g, '$1')
                .replace(/\\circ/g, '°')
                .replace(/[{}\\^]/g, '')
                .trim()
            );
            return l;
        }).join('\n');
    }

    function extractMermaidErrorMessage(err) {
        const raw = (err && err.message) ? err.message : String(err || '');
        if (/Syntax error in text/i.test(raw)) {
            return t('Mermaid 無法解析這段語法。', 'Mermaid could not parse this diagram.');
        }
        if (/Parse error/i.test(raw)) return raw;
        return raw || t('無法渲染圖表。', 'Could not render diagram.');
    }

    function getMermaidHints(source) {
        const hints = [];
        if (!/\bmindmap\b/i.test(source)) return hints;

        if (/-->|---|<-->/i.test(source)) {
            hints.push(t(
                'mindmap 使用「縮排」表示層級，不能使用流程圖箭頭（-->、<-->）。',
                'Mindmaps use indentation for hierarchy, not flowchart arrows (-->, <-->).'
            ));
        }
        if (/^[ \t]*[A-Za-z][A-Za-z0-9_]*\[/m.test(source)) {
            hints.push(t(
                'mindmap 節點請直接寫文字，不能使用 A[文字] 方塊語法。',
                'Mindmap nodes should be plain text, not A[label] boxes.'
            ));
        }
        if (/\$[^$]+\$/.test(source)) {
            hints.push(t(
                'Mermaid 不支援 $...$ 數學公式；請改用純文字（例如 0°C）。',
                'Mermaid does not support $...$ math; use plain text (e.g. 0°C).'
            ));
        }
        return hints;
    }

    function showMermaidError(node, source, err) {
        node.classList.remove('mermaid-zoomable', 'mermaid');
        node.classList.add('mermaid-failed');
        node.removeAttribute('data-zoom-bound');
        node.removeAttribute('data-processed');
        node.removeAttribute('role');
        node.removeAttribute('tabindex');

        const rawSource = node.dataset.mermaidRaw
            ? decodeURIComponent(node.dataset.mermaidRaw)
            : source;
        const msg = extractMermaidErrorMessage(err);
        const hints = getMermaidHints(rawSource);
        const hintsHtml = hints.length
            ? `<ul class="mermaid-error-hints">${hints.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
            : '';

        node.innerHTML = `
            <div class="mermaid-error-panel">
                <p class="mermaid-error-title">${escapeHtml(t('無法顯示 Mermaid 圖表', 'Mermaid diagram could not be rendered'))}</p>
                <p class="mermaid-error-msg">${escapeHtml(msg)}</p>
                ${hintsHtml}
                <details class="mermaid-error-source">
                    <summary>${escapeHtml(t('查看原始碼', 'View source'))}</summary>
                    <pre>${escapeHtml(rawSource)}</pre>
                </details>
            </div>`;
    }

    function mermaidNodeHasRenderError(node) {
        if (!node.querySelector('svg')) return true;
        if (node.querySelector('.error-icon, .error-text')) return true;
        const svgText = node.querySelector('svg')?.textContent || '';
        return /Syntax error/i.test(svgText);
    }

    async function renderOneMermaidNode(node) {
        const source = node.dataset.mermaidSource || (node.textContent || '').trim();
        node.dataset.mermaidSource = source;
        node.textContent = source;
        node.classList.add('mermaid');
        node.classList.remove('mermaid-failed', 'mermaid-has-error');

        try {
            if (typeof global.mermaid.parse === 'function') {
                await global.mermaid.parse(source);
            }
            await global.mermaid.run({ nodes: [node], suppressErrors: true });
            if (mermaidNodeHasRenderError(node)) {
                throw new Error('Syntax error in text');
            }
        } catch (err) {
            showMermaidError(node, source, err);
        }
    }

    function protectMermaid(markdown) {
        const store = [];
        const text = (markdown || '').replace(/```[ \t]*mermaid[^\n]*\r?\n([\s\S]*?)```/gi, (_, code) => {
            const key = store.length;
            const raw = String(code).replace(/\r\n/g, '\n').trim();
            store.push({ raw, normalized: normalizeMermaidSource(code) });
            return MERMAID_PLACEHOLDER + key + '\uE001';
        });
        return { text, store };
    }

    function restoreMermaid(html, store) {
        return html.replace(new RegExp(MERMAID_PLACEHOLDER + '(\\d+)' + '\uE001', 'g'), (_, i) => {
            const entry = store[parseInt(i, 10)] || {};
            const code = entry.normalized || '';
            const raw = entry.raw || code;
            const safe = code.replace(/</g, '&lt;');
            const rawAttr = encodeURIComponent(raw);
            return `<div class="mermaid" data-mermaid-raw="${rawAttr}">\n${safe}\n</div>\n`;
        });
    }

    function protectMath(markdown) {
        const store = [];
        let text = markdown || '';

        text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
            const key = store.length;
            store.push(match);
            return MATH_PLACEHOLDER + key + '\uE001';
        });

        text = text.replace(/(?<!\$)\$(?!\$)((?:\\.|[^$\n\\])+?)\$(?!\$)/g, (match) => {
            const key = store.length;
            store.push(match);
            return MATH_PLACEHOLDER + key + '\uE001';
        });

        return { text, store };
    }

    function restoreMath(html, store) {
        return html.replace(new RegExp(MATH_PLACEHOLDER + '(\\d+)' + '\uE001', 'g'), (_, i) => store[parseInt(i, 10)] || '');
    }

    function promoteMermaidBlocks(html) {
        return html.replace(/<pre>\s*<code class="language-mermaid">([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => {
            const text = decodeHtmlEntities(code).trim();
            const safe = text.replace(/</g, '&lt;');
            return `<div class="mermaid">\n${safe}\n</div>\n`;
        });
    }

    function configureMarked() {
        if (markedReady || typeof marked === 'undefined') return;
        markedReady = true;

        if (typeof marked.use === 'function') {
            marked.use({ gfm: true, breaks: false });
        } else if (typeof marked.setOptions === 'function') {
            marked.setOptions({ gfm: true, breaks: false });
        }
    }

    function sanitizeHtml(html) {
        if (typeof DOMPurify === 'undefined') return html;
        return DOMPurify.sanitize(html, {
            ADD_ATTR: [
                'target', 'rel', 'class', 'id',
                'data-embed-type', 'data-embed-slug', 'data-embed-bank',
                'data-embed-question-id', 'data-embed-question-code', 'data-embed-question-index', 'data-embed-score', 'data-embed-key', 'data-question-type',
            ],
            ADD_TAGS: ['details', 'summary'],
        });
    }

    function renderMarkdownToHtml(markdown) {
        if (typeof marked === 'undefined') {
            return escapeHtml(markdown || '').replace(/\n/g, '<br>');
        }
        configureMarked();
        let source = markdown || '';
        let embedStore = [];
        if (global.AppContentEmbeds) {
            const protectedEmbeds = global.AppContentEmbeds.protect(source);
            source = protectedEmbeds.text;
            embedStore = protectedEmbeds.store;
        }
        const mermaidProtected = protectMermaid(source);
        const { text, store } = protectMath(mermaidProtected.text);
        let html = marked.parse(text);
        html = restoreMath(html, store);
        html = restoreMermaid(html, mermaidProtected.store);
        html = promoteMermaidBlocks(html);
        if (global.AppContentEmbeds) {
            html = global.AppContentEmbeds.restore(html, embedStore);
        }
        return sanitizeHtml(html);
    }

    function collectMermaidNodes(root) {
        root.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
            const pre = code.parentElement;
            if (!pre) return;
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = code.textContent || '';
            pre.replaceWith(div);
        });
        return Array.from(root.querySelectorAll('.mermaid'));
    }

    function whenReady(testFn, label, timeoutMs) {
        const timeout = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function tick() {
                if (testFn()) return resolve();
                if (Date.now() - start > timeout) {
                    reject(new Error(label + ' load timeout'));
                    return;
                }
                setTimeout(tick, 50);
            })();
        });
    }

    async function initMermaid() {
        if (global.__mermaidModuleReady) {
            await global.__mermaidModuleReady;
        }
        await whenReady(
            () => typeof global.mermaid !== 'undefined' && typeof global.mermaid.initialize === 'function',
            'Mermaid'
        );
        if (global.__mermaidInitialized) return;
        global.mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            mindmap: { useMaxWidth: true, padding: 16 },
            flowchart: { useMaxWidth: true },
        });
        global.__mermaidInitialized = true;
    }

    async function renderMermaid(root) {
        const nodes = collectMermaidNodes(root);
        if (!nodes.length || typeof global.mermaid === 'undefined') return;

        nodes.forEach((node) => {
            if (!node.dataset.mermaidSource) {
                node.dataset.mermaidSource = (node.textContent || '').trim();
            }
        });

        try {
            await initMermaid();
            await whenReady(
                () => typeof global.mermaid.run === 'function',
                'Mermaid run'
            );
            for (const node of nodes) {
                if (node.classList.contains('mermaid-failed')) continue;
                await renderOneMermaidNode(node);
            }
            bindMermaidZoom(root);
        } catch (err) {
            console.warn('Mermaid render failed', err);
            nodes.forEach((node) => {
                if (node.querySelector('svg') || node.classList.contains('mermaid-failed')) return;
                showMermaidError(node, node.dataset.mermaidSource || '', err);
            });
        }
    }

    function t(zh, en) {
        return global.AppRouter && typeof global.AppRouter.t === 'function'
            ? global.AppRouter.t(zh, en)
            : zh;
    }

    let mermaidModalReady = false;

    function closeMermaidModal() {
        const modal = document.getElementById('mermaid-modal');
        const body = document.getElementById('mermaid-modal-body');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        if (body) body.innerHTML = '';
        document.body.style.overflow = '';
    }

    function openMermaidModal(svg) {
        const modal = document.getElementById('mermaid-modal');
        const body = document.getElementById('mermaid-modal-body');
        const title = document.getElementById('mermaid-modal-title');
        if (!modal || !body || !svg) return;

        body.innerHTML = '';
        const clone = svg.cloneNode(true);
        clone.style.maxWidth = 'none';
        clone.style.height = 'auto';
        if (clone.hasAttribute('width') && clone.getAttribute('width') === '100%') {
            clone.removeAttribute('width');
        }
        body.appendChild(clone);

        if (title) title.textContent = t('圖表預覽', 'Diagram preview');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        document.getElementById('mermaid-modal-close')?.focus();
    }

    function ensureMermaidModal() {
        if (mermaidModalReady) return;
        mermaidModalReady = true;

        const modal = document.getElementById('mermaid-modal');
        const closeBtn = document.getElementById('mermaid-modal-close');
        if (!modal) return;

        closeBtn?.addEventListener('click', closeMermaidModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeMermaidModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeMermaidModal();
            }
        });

        document.addEventListener('langchange', () => {
            modal.querySelectorAll('.mermaid-zoomable').forEach((node) => {
                node.setAttribute('aria-label', t('點擊放大圖表', 'Click to enlarge diagram'));
                node.setAttribute('title', t('點擊放大', 'Click to enlarge'));
            });
            const style = document.getElementById('mermaid-zoom-hint-style');
            if (style) {
                style.textContent = `.prose-article .mermaid.mermaid-zoomable::after{content:'${t('點擊放大', 'Click to enlarge')}';}`;
            }
        });
    }

    function injectMermaidZoomHintStyle() {
        if (document.getElementById('mermaid-zoom-hint-style')) return;
        const style = document.createElement('style');
        style.id = 'mermaid-zoom-hint-style';
        style.textContent = `.prose-article .mermaid.mermaid-zoomable::after{content:'${t('點擊放大', 'Click to enlarge')}';}`;
        document.head.appendChild(style);
    }

    function bindMermaidZoom(root) {
        ensureMermaidModal();
        injectMermaidZoomHintStyle();

        root.querySelectorAll('.mermaid').forEach((node) => {
            const svg = node.querySelector('svg');
            if (!svg || node.classList.contains('mermaid-failed')) return;
            if (node.dataset.zoomBound === '1') return;

            node.dataset.zoomBound = '1';
            node.classList.add('mermaid-zoomable');
            node.setAttribute('role', 'button');
            node.setAttribute('tabindex', '0');
            node.setAttribute('aria-label', t('點擊放大圖表', 'Click to enlarge diagram'));
            node.setAttribute('title', t('點擊放大', 'Click to enlarge'));

            const open = () => openMermaidModal(svg);
            node.addEventListener('click', open);
            node.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        });
    }

    async function typesetMath(root) {
        try {
            await whenReady(
                () => global.MathJax && typeof global.MathJax.typesetPromise === 'function',
                'MathJax'
            );
            await global.MathJax.typesetPromise([root]);
        } catch (err) {
            console.warn('MathJax typeset failed', err);
        }
    }

    async function enhanceMarkdown(root) {
        if (!root) return;
        await renderMermaid(root);
        await typesetMath(root);
        if (global.AppContentEmbeds) {
            await global.AppContentEmbeds.hydrate(root);
        }
    }

    global.AppMarkdown = {
        renderMarkdownToHtml,
        enhanceMarkdown,
    };
})(window);
