(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;

    function renderMarkdown(md) {
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(marked.parse(md || ''));
        }
        return escapeHtml(md || '').replace(/\n/g, '<br>');
    }

    async function renderWorksheet(slug) {
        const main = document.getElementById('main-content');
        const ws = await apiFetch('/worksheets/' + encodeURIComponent(slug));
        const lang = getLang();
        const title = lang === 'zh' ? ws.title_zh : ws.title_en;
        const desc = lang === 'zh' ? (ws.description_zh || '') : (ws.description_en || '');
        const body = lang === 'zh' ? ws.body_zh : ws.body_en;

        main.innerHTML = `
            <div class="max-w-3xl mx-auto">
                <button type="button" id="ws-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回列表', 'Back to list')}</button>
                <h1 class="text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                ${desc ? `<p class="text-slate-600 mb-6">${escapeHtml(desc)}</p>` : ''}
                <article class="prose-article bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">${renderMarkdown(body)}</article>
            </div>`;

        document.getElementById('ws-back').onclick = () => global.AppRouter.navigate('/worksheets');
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            MathJax.typesetPromise([main]).catch(() => {});
        }
    }

    global.AppWorksheet = { renderWorksheet };
})(window);
