(function (global) {
    'use strict';

    const { t, escapeHtml, getLang } = global.AppRouter;

    const PRINT_WIDTH_PX = 794;
    const PDF_MARGIN_MM = 12;

    function siteName() {
        const names = global.__SITE_NAMES__ || {};
        return getLang() === 'zh' ? (names.zh || '伊中中科學學習平台') : (names.en || 'QESOSASS Science Learning Platform');
    }

    function sanitizeFilename(text) {
        return String(text || 'note')
            .replace(/[^\w\u4e00-\u9fff.-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) || 'note';
    }

    async function waitForRender(root) {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
        if (global.MathJax && typeof global.MathJax.typesetPromise === 'function') {
            try {
                await global.MathJax.typesetPromise([root]);
            } catch (e) { /* ignore */ }
        }
        const images = Array.from(root.querySelectorAll('img'));
        await Promise.all(images.filter((img) => !img.complete).map((img) => new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        })));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    function buildPrintLayout(note, bodyEl) {
        const lang = getLang();
        const title = lang === 'zh' ? note.title_zh : note.title_en;
        const metaParts = [];
        const sub = lang === 'zh' ? note.subject_zh : note.subject_en;
        const top = lang === 'zh' ? note.topic_zh : note.topic_en;
        if (sub && top) metaParts.push(`${sub} · ${top}`);
        else if (sub) metaParts.push(sub);
        if (note.reading_time_minutes) {
            metaParts.push(`${t('約', '~')}${note.reading_time_minutes}${t(' 分鐘閱讀', ' min read')}`);
        }

        const root = document.createElement('div');
        root.className = 'note-print-root';
        root.setAttribute('aria-hidden', 'true');

        const header = document.createElement('header');
        header.className = 'note-print-header';
        header.innerHTML = `
            <p class="note-print-site">${escapeHtml(siteName())}</p>
            <h1 class="note-print-title">${escapeHtml(title)}</h1>
            ${metaParts.length ? `<p class="note-print-meta">${metaParts.map((p) => escapeHtml(p)).join(' · ')}</p>` : ''}`;

        const article = document.createElement('article');
        article.className = 'prose-article note-print-body';
        article.innerHTML = bodyEl.innerHTML;

        article.querySelectorAll('.mermaid.mermaid-zoomable').forEach((el) => {
            el.classList.remove('mermaid-zoomable');
            el.removeAttribute('tabindex');
            el.removeAttribute('role');
            el.style.cursor = 'default';
        });
        article.querySelectorAll('.mermaid-error-panel, .inline-edit-admin-hint, .inline-edit-admin-bar').forEach((el) => {
            el.remove();
        });

        const footer = document.createElement('footer');
        footer.className = 'note-print-footer';
        footer.textContent = t(
            '版權 © Mr. Bryan Leung · CC BY 4.0',
            '© Mr. Bryan Leung · CC BY 4.0'
        );

        root.appendChild(header);
        root.appendChild(article);
        root.appendChild(footer);
        document.body.appendChild(root);
        return root;
    }

    async function capturePrintLayout(root) {
        if (typeof html2canvas !== 'function') {
            throw new Error(t('html2canvas 未載入。', 'html2canvas is not loaded.'));
        }
        return html2canvas(root, {
            backgroundColor: '#ffffff',
            scale: Math.min(global.devicePixelRatio || 1, 2),
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: PRINT_WIDTH_PX,
            windowWidth: PRINT_WIDTH_PX,
            onclone(clonedDoc, clonedEl) {
                clonedEl.querySelectorAll('img, svg').forEach((el) => {
                    el.style.display = 'inline-block';
                    el.style.verticalAlign = 'middle';
                });
                const style = clonedDoc.createElement('style');
                style.textContent = [
                    '.note-print-root { left: 0 !important; top: 0 !important; position: relative !important; }',
                    '.prose-article mjx-container { overflow: visible !important; }',
                ].join('\n');
                clonedDoc.head.appendChild(style);
            },
        });
    }

    function canvasToPdf(canvas, filename) {
        if (!global.jspdf || !global.jspdf.jsPDF) {
            throw new Error(t('jsPDF 未載入。', 'jsPDF is not loaded.'));
        }
        const pdf = new global.jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - PDF_MARGIN_MM * 2;
        const contentHeight = pageHeight - PDF_MARGIN_MM * 2;
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        let heightLeft = imgHeight;
        let y = PDF_MARGIN_MM;

        pdf.addImage(imgData, 'JPEG', PDF_MARGIN_MM, y, contentWidth, imgHeight);
        heightLeft -= contentHeight;

        while (heightLeft > 0) {
            y = PDF_MARGIN_MM - (imgHeight - heightLeft);
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', PDF_MARGIN_MM, y, contentWidth, imgHeight);
            heightLeft -= contentHeight;
        }

        pdf.save(filename);
    }

    async function exportNoteToPdf(note, bodyEl) {
        if (!bodyEl) {
            throw new Error(t('找不到筆記內容。', 'Note content not found.'));
        }

        const printRoot = buildPrintLayout(note, bodyEl);
        try {
            await waitForRender(printRoot);
            const canvas = await capturePrintLayout(printRoot);
            const slug = sanitizeFilename(note.slug || note.title_zh || note.title_en);
            const filename = `${slug}.pdf`;
            canvasToPdf(canvas, filename);
        } finally {
            printRoot.remove();
        }
    }

    function attachExportPdfButton(page, note) {
        const bodyEl = document.getElementById('note-body');
        if (!page || !bodyEl) return;

        let actions = page.querySelector('.note-page-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'note-page-actions';
            const anchor = page.querySelector('#note-meta') || page.querySelector('#note-title');
            if (anchor) {
                anchor.insertAdjacentElement('afterend', actions);
            } else {
                page.prepend(actions);
            }
        }

        let btn = actions.querySelector('#note-export-pdf');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'note-export-pdf';
            btn.className = 'note-export-pdf-btn';
            btn.innerHTML = `
                <svg class="note-export-pdf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5-5m0 0l5 5"></path>
                </svg>
                <span>${t('匯出至 PDF', 'Export to PDF')}</span>`;
            actions.appendChild(btn);
        }

        const label = btn.querySelector('span');
        const defaultText = t('匯出至 PDF', 'Export to PDF');
        const busyText = t('產生 PDF 中…', 'Generating PDF…');

        btn.onclick = async () => {
            if (btn.disabled) return;
            btn.disabled = true;
            if (label) label.textContent = busyText;
            try {
                await exportNoteToPdf(note, bodyEl);
            } catch (err) {
                const msg = err && err.message ? err.message : t('無法匯出 PDF。', 'Could not export PDF.');
                if (global.AppNote && typeof global.AppNote.showFlash === 'function') {
                    global.AppNote.showFlash(page, msg, true);
                } else {
                    global.alert(msg);
                }
            } finally {
                btn.disabled = false;
                if (label) label.textContent = defaultText;
            }
        };
    }

    global.AppNotePdf = {
        exportNoteToPdf,
        attachExportPdfButton,
    };
})(window);
