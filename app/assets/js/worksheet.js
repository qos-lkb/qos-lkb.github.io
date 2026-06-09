(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;
    const { renderMarkdownToHtml, enhanceMarkdown } = global.AppMarkdown;
    const { attachMarkdownEditor, buildWorksheetPayload } = global.AppInlineEdit;

    async function renderWorksheet(slug) {
        const main = document.getElementById('main-content');
        const ws = await apiFetch('/worksheets/' + encodeURIComponent(slug));
        const lang = getLang();
        const title = lang === 'zh' ? ws.title_zh : ws.title_en;
        const desc = lang === 'zh' ? (ws.description_zh || '') : (ws.description_en || '');
        const body = lang === 'zh' ? ws.body_zh : ws.body_en;

        main.innerHTML = `
            <div class="max-w-3xl mx-auto" id="ws-page">
                <button type="button" id="ws-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回工作紙列表', 'Back to worksheets')}</button>
                <h1 id="ws-title" class="text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                ${desc ? `<p class="text-slate-600 mb-6">${escapeHtml(desc)}</p>` : ''}
                <article id="ws-body" class="prose-article bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">${renderMarkdownToHtml(body)}</article>
            </div>`;

        document.getElementById('ws-back').onclick = () => {
            const back = global.AppCourse && global.AppCourse.isCourseMode()
                ? global.AppCourse.getBackRoute()
                : '/worksheets';
            global.AppRouter.navigate(back);
        };
        await enhanceMarkdown(main);

        const wsPage = document.getElementById('ws-page');
        if (global.AppCourse && global.AppCourse.isCourseMode()) {
            global.AppCourse.attachItemNav(wsPage, 'worksheet', slug);
        }

        attachMarkdownEditor({
            type: 'worksheet',
            record: ws,
            root: wsPage,
            titleEl: document.getElementById('ws-title'),
            bodyEl: document.getElementById('ws-body'),
            buildPayload: (rec) => buildWorksheetPayload(rec),
            onBodyUpdated: async (bodyEl, markdown) => {
                bodyEl.innerHTML = renderMarkdownToHtml(markdown);
                await enhanceMarkdown(main);
            },
        });
    }

    global.AppWorksheet = { renderWorksheet };
})(window);
