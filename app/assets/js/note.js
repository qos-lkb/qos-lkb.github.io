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

    async function renderNote(slug) {
        const main = document.getElementById('main-content');
        const note = await apiFetch('/learning-notes/' + encodeURIComponent(slug));
        const lang = getLang();
        const title = lang === 'zh' ? note.title_zh : note.title_en;
        const body = lang === 'zh' ? note.body_zh : note.body_en;

        main.innerHTML = `
            <div class="max-w-3xl mx-auto">
                <button type="button" id="note-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回列表', 'Back to list')}</button>
                <h1 class="text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                ${note.reading_time_minutes ? `<p class="text-sm text-slate-500 mb-6">${t('約', '~')}${note.reading_time_minutes}${t(' 分鐘閱讀', ' min read')}</p>` : ''}
                <article class="prose-article bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">${renderMarkdown(body)}</article>
            </div>`;

        document.getElementById('note-back').onclick = () => global.AppRouter.navigate('/learning-notes');
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            MathJax.typesetPromise([main]).catch(() => {});
        }
    }

    global.AppNote = { renderNote };
})(window);
