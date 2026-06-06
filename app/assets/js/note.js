(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;
    const { renderMarkdownToHtml, enhanceMarkdown } = global.AppMarkdown;
    const { attachMarkdownEditor, buildNotePayload, attachNotePropertiesButton } = global.AppInlineEdit;

    function renderNoteMeta(note) {
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
        return {
            title,
            metaHtml: metaParts.length
                ? `<p id="note-meta" class="text-sm text-slate-500 mb-6">${metaParts.map((p) => escapeHtml(p)).join(' · ')}</p>`
                : '',
        };
    }

    async function enrichNoteFromCatalog(note) {
        if (!global.AppCatalog) return note;
        await global.AppCatalog.loadCatalog({ skipNavRender: true });
        const hit = global.AppCatalog.getLearningNotes().find((n) => n.slug === note.slug);
        return hit ? Object.assign(note, hit) : note;
    }

    async function refreshNoteAfterPropsSave(note, page) {
        if (global.AppCatalog) {
            await global.AppCatalog.loadCatalog({ skipNavRender: true });
            await global.AppCatalog.prepareNotesSidebar(note.slug);
        }
        const { title, metaHtml } = renderNoteMeta(note);
        const titleEl = document.getElementById('note-title');
        const metaEl = document.getElementById('note-meta');
        if (titleEl) titleEl.textContent = title;
        if (metaEl) {
            metaEl.outerHTML = metaHtml || '';
        } else if (metaHtml && titleEl) {
            titleEl.insertAdjacentHTML('afterend', metaHtml);
        }
        if (page) {
            showFlashOnPage(page, t('特性已更新', 'Properties updated'), false);
        }
    }

    function showFlashOnPage(root, message, isError) {
        let el = root.querySelector('.inline-edit-flash');
        if (!el) {
            el = document.createElement('p');
            el.className = 'inline-edit-flash';
            root.prepend(el);
        }
        el.textContent = message;
        el.classList.toggle('inline-edit-flash-error', !!isError);
        el.classList.toggle('inline-edit-flash-ok', !isError);
        el.hidden = false;
        clearTimeout(el._flashTimer);
        el._flashTimer = setTimeout(() => { el.hidden = true; }, 4000);
    }

    async function renderNote(slug) {
        const main = document.getElementById('main-content');
        try {
            const note = await apiFetch('/learning-notes/' + encodeURIComponent(slug));
            await enrichNoteFromCatalog(note);
            const lang = getLang();
            const { title, metaHtml } = renderNoteMeta(note);
            const body = lang === 'zh' ? note.body_zh : note.body_en;

            main.innerHTML = `
                <div class="reading-page" id="note-page">
                    <button type="button" id="note-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回課程列表', 'Back to courses')}</button>
                    <h1 id="note-title" class="text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                    ${metaHtml}
                    <article id="note-body" class="prose-article bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">${renderMarkdownToHtml(body)}</article>
                </div>`;

            document.getElementById('note-back').onclick = () => global.AppRouter.navigate('/learning-notes');
            await enhanceMarkdown(main);

            const page = document.getElementById('note-page');
            attachMarkdownEditor({
                type: 'note',
                record: note,
                root: page,
                titleEl: document.getElementById('note-title'),
                bodyEl: document.getElementById('note-body'),
                buildPayload: (rec) => buildNotePayload(rec),
                onBodyUpdated: async (bodyEl, markdown) => {
                    bodyEl.innerHTML = renderMarkdownToHtml(markdown);
                    await enhanceMarkdown(main);
                },
            });
            attachNotePropertiesButton(page, note, async (updated) => {
                Object.assign(note, updated);
                await enrichNoteFromCatalog(note);
                await refreshNoteAfterPropsSave(note, page);
            });
        } catch (err) {
            main.innerHTML = `
                <div class="reading-page">
                    <button type="button" id="note-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回課程列表', 'Back to courses')}</button>
                    <p class="text-red-600">${escapeHtml(err.message || t('無法載入筆記。', 'Could not load note.'))}</p>
                </div>`;
            document.getElementById('note-back').onclick = () => global.AppRouter.navigate('/learning-notes');
        }
    }

    global.AppNote = { renderNote };
})(window);
