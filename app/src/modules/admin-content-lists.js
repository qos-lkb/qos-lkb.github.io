'use strict';
const global = window;

    function t(zh, en) {
        return global.AppRouter && global.AppRouter.t ? global.AppRouter.t(zh, en) : zh;
    }

    function escapeHtml(s) {
        return global.AppRouter && global.AppRouter.escapeHtml
            ? global.AppRouter.escapeHtml(s)
            : String(s || '');
    }

    function spaHref(route) {
        return global.AppRouter && global.AppRouter.spaHref
            ? global.AppRouter.spaHref(route)
            : String(route || '');
    }


    function setShell() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    function statusLabel(status) {
        const map = {
            draft: t('草稿', 'Draft'),
            pending_review: t('待審核', 'Pending review'),
            published: t('已發佈', 'Published'),
        };
        return map[status] || status || '—';
    }

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    function canAnyOrOwn(anyPerm, ownPerm) {
        const api = global.ScienceApi;
        if (!api || !api.getUser()) return false;
        return api.hasPermission(anyPerm) || api.hasPermission(ownPerm);
    }

    function canManageRow(row, anyPerm) {
        const api = global.ScienceApi;
        const me = api.getUser();
        if (!me) return false;
        if (api.hasPermission(anyPerm)) return true;
        return Number(row.owner_user_id || 0) === Number(me.id);
    }

    function canReviewQueue() {
        const api = global.ScienceApi;
        return api.hasPermission('learning_tool.manage_any')
            || api.hasPermission('article.manage_any')
            || api.hasPermission('learning_note.manage_any')
            || api.hasPermission('worksheet.manage_any')
            || api.hasPermission('learning_video.manage_any')
            || api.hasPermission('question_bank.manage_any')
            || api.hasPermission('summer_homework.manage_any');
    }

    async function loadSubjectTopicLabels() {
        const subjects = {};
        const topics = {};
        try {
            const list = await global.ScienceApi.apiFetch('/admin/subjects');
            (Array.isArray(list) ? list : []).forEach((s) => {
                subjects[Number(s.id)] = s.name_zh || s.name_en || ('#' + s.id);
                (s.topics || []).forEach((tp) => {
                    topics[Number(tp.id)] = tp.name_zh || tp.name_en || ('#' + tp.id);
                });
            });
        } catch (e) { /* ignore */ }
        return { subjects, topics };
    }

    /**
     * @param {{
     *   titleZh: string, titleEn: string,
     *   anyPerm: string, ownPerm: string,
     *   listPath: string, deletePath: string,
     *   editSpaBase: string,
     *   previewRoute?: (slug: string) => string,
     *   showReview?: boolean,
     *   toolbarExtra?: string,
     *   extraHeaders?: string[],
     *   extraCells?: (row: object, ctx: object) => string[],
     *   emptyZh: string, emptyEn: string,
     *   reload: () => Promise<void>,
     * }} cfg
     */
    async function renderContentList(cfg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t(cfg.titleZh, cfg.titleEn);

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!canAnyOrOwn(cfg.anyPerm, cfg.ownPerm)) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        try {
            const ctx = cfg.loadCtx ? await cfg.loadCtx() : {};
            const list = await global.ScienceApi.apiFetch(cfg.listPath);
            const items = Array.isArray(list) ? list : [];
            const showReview = cfg.showReview !== false && canReviewQueue();
            const toolbarExtra = cfg.toolbarExtra || '';
            const extraHeaders = cfg.extraHeaders || [];

            const rows = items.map((row) => {
                const id = Number(row.id);
                const canManage = canManageRow(row, cfg.anyPerm);
                const slug = row.slug || '';
                const preview = cfg.previewRoute
                    ? `<a href="${escapeHtml(spaHref(cfg.previewRoute(slug)))}" class="text-slate-600 hover:underline ml-2" target="_blank" rel="noopener">${escapeHtml(t('預覽', 'Preview'))}</a>`
                    : '';
                const extra = (cfg.extraCells ? cfg.extraCells(row, ctx) : [])
                    .map((cell) => `<td class="p-3">${cell}</td>`).join('');
                const editHref = spaHref(`${cfg.editSpaBase}/${id}/edit`);
                const editNav = ` data-spa-nav="${escapeHtml(`${cfg.editSpaBase}/${id}/edit`)}"`;
                return `<tr class="border-t border-slate-100">
                    <td class="p-3">${escapeHtml(row.title_zh || row.title_en || '—')}</td>
                    <td class="p-3 font-mono text-xs">${escapeHtml(slug)}</td>
                    ${extra}
                    <td class="p-3">${escapeHtml(statusLabel(row.status))}</td>
                    <td class="p-3 text-xs">${escapeHtml(row.updated_at || '')}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        ${canManage ? `<a href="${escapeHtml(editHref)}"${editNav} class="text-indigo-600 hover:underline">${escapeHtml(t('編輯', 'Edit'))}</a>` : ''}
                        ${preview}
                        ${canManage ? `<button type="button" class="text-red-600 hover:underline ml-2 content-delete" data-id="${id}">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                    </td>
                </tr>`;
            }).join('');

            const headExtra = extraHeaders.map((h) => `<th class="p-3">${escapeHtml(h)}</th>`).join('');
            const colSpan = 5 + extraHeaders.length;
            const newHref = spaHref(`${cfg.editSpaBase}/new`);
            const newNav = ` data-spa-nav="${escapeHtml(`${cfg.editSpaBase}/new`)}"`;
            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <a href="${escapeHtml(newHref)}"${newNav} class="text-sm rounded-lg bg-indigo-700 text-white px-3 py-1.5 font-semibold hover:bg-indigo-800">${escapeHtml(t('新增', 'New'))}</a>
                    ${showReview ? `<a href="${escapeHtml(spaHref('/admin/review-queue'))}" data-spa-nav="/admin/review-queue" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('審核佇列', 'Review queue'))}</a>` : ''}
                    ${toolbarExtra}
                    <button type="button" id="content-list-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                <p id="content-list-flash" class="text-sm mb-3 hidden"></p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100">
                            <tr>
                                <th class="p-3 text-left">${escapeHtml(t('標題', 'Title'))}</th>
                                <th class="p-3">slug</th>
                                ${headExtra}
                                <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                                <th class="p-3">${escapeHtml(t('更新', 'Updated'))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || `<tr><td colspan="${colSpan}" class="p-6 text-center text-slate-500">${escapeHtml(t(cfg.emptyZh, cfg.emptyEn))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;

            bindSpaNav(box);
            document.getElementById('content-list-reload')?.addEventListener('click', () => {
                void cfg.reload();
            });
            box.querySelectorAll('.content-delete').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = Number(btn.getAttribute('data-id') || 0);
                    if (id <= 0) return;
                    if (!window.confirm(t('確定刪除此項目？', 'Delete this item?'))) return;
                    const flash = document.getElementById('content-list-flash');
                    try {
                        await global.ScienceApi.apiFetch(cfg.deletePath, {
                            method: 'DELETE',
                            body: { id },
                        });
                        await cfg.reload();
                    } catch (err) {
                        if (flash) {
                            flash.textContent = err.message || t('刪除失敗', 'Delete failed');
                            flash.className = 'text-sm mb-3 text-red-600';
                        }
                    }
                });
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    async function renderAdminArticlesList() {
        await renderContentList({
            titleZh: '科學文章',
            titleEn: 'Articles',
            anyPerm: 'article.manage_any',
            ownPerm: 'article.manage_own',
            listPath: '/admin/articles',
            deletePath: '/admin/articles',
            editSpaBase: '/admin/articles',
            previewRoute: (slug) => '/article/' + encodeURIComponent(slug),
            emptyZh: '尚無文章。',
            emptyEn: 'No articles yet.',
            reload: renderAdminArticlesList,
        });
    }

    async function renderAdminLearningVideosList() {
        await renderContentList({
            titleZh: '學習影片',
            titleEn: 'Learning videos',
            anyPerm: 'learning_video.manage_any',
            ownPerm: 'learning_video.manage_own',
            listPath: '/admin/learning-videos',
            deletePath: '/admin/learning-videos',
            editSpaBase: '/admin/learning-videos',
            previewRoute: (slug) => '/video/' + encodeURIComponent(slug),
            extraHeaders: [t('平台', 'Provider')],
            extraCells: (row) => [escapeHtml(row.provider || '—')],
            emptyZh: '尚無學習影片。',
            emptyEn: 'No learning videos yet.',
            reload: renderAdminLearningVideosList,
        });
    }

    async function renderAdminLearningNotesList() {
        await renderContentList({
            titleZh: '學習筆記',
            titleEn: 'Learning notes',
            anyPerm: 'learning_note.manage_any',
            ownPerm: 'learning_note.manage_own',
            listPath: '/admin/learning-notes',
            deletePath: '/admin/learning-notes',
            editSpaBase: '/admin/learning-notes',
            previewRoute: (slug) => '/note/' + encodeURIComponent(slug),
            loadCtx: loadSubjectTopicLabels,
            extraHeaders: [t('科目', 'Subject'), t('單元', 'Topic')],
            extraCells: (row, ctx) => [
                escapeHtml(ctx.subjects[Number(row.subject_id)] || (row.subject_id ? '#' + row.subject_id : '—')),
                escapeHtml(ctx.topics[Number(row.topic_id)] || (row.topic_id ? '#' + row.topic_id : '—')),
            ],
            emptyZh: '尚無學習筆記。',
            emptyEn: 'No learning notes yet.',
            reload: renderAdminLearningNotesList,
        });
    }

    async function renderAdminSimulationsList() {
        await renderContentList({
            titleZh: '模擬程式',
            titleEn: 'Simulations',
            anyPerm: 'simulation.manage_any',
            ownPerm: 'simulation.manage_own',
            listPath: '/admin/simulations',
            deletePath: '/admin/simulations',
            editSpaBase: '/admin/simulations',
            previewRoute: (slug) => '/simulation/' + encodeURIComponent(slug),
            showReview: false,
            loadCtx: loadSubjectTopicLabels,
            extraHeaders: [t('科目', 'Subject'), t('單元', 'Topic'), t('排序', 'Sort')],
            extraCells: (row, ctx) => [
                escapeHtml(ctx.subjects[Number(row.subject_id)] || (row.subject_id ? '#' + row.subject_id : '—')),
                escapeHtml(ctx.topics[Number(row.topic_id)] || (row.topic_id ? '#' + row.topic_id : '—')),
                escapeHtml(String(row.list_sort_order ?? '—')),
            ],
            emptyZh: '尚無模擬程式。',
            emptyEn: 'No simulations yet.',
            reload: renderAdminSimulationsList,
        });
    }

    async function renderAdminQuestionBanksList() {
        const canWs = global.ScienceApi.hasPermission('worksheet.manage_any')
            || global.ScienceApi.hasPermission('worksheet.manage_own');
        const canAny = global.ScienceApi.hasPermission('question_bank.manage_any');
        await renderContentList({
            titleZh: canAny ? '試題庫' : '我的試題庫',
            titleEn: canAny ? 'Question banks' : 'My question banks',
            anyPerm: 'question_bank.manage_any',
            ownPerm: 'question_bank.manage_own',
            listPath: '/admin/question-banks',
            deletePath: '/admin/question-banks',
            editSpaBase: '/admin/question-banks',
            previewRoute: (slug) => '/quiz/' + encodeURIComponent(slug),
            showReview: true,
            toolbarExtra: canWs
                ? `<a href="${escapeHtml(spaHref('/admin/worksheets'))}" data-spa-nav="/admin/worksheets" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('工作紙', 'Worksheets'))}</a>`
                : '',
            extraHeaders: [t('預設科目', 'Default subject'), t('預設課題', 'Default topic'), t('題數', 'Questions')],
            extraCells: (row) => [
                escapeHtml(row.subject_zh || row.subject_en || '—'),
                escapeHtml(row.topic_zh || row.topic_en || '—'),
                escapeHtml(String(row.question_count != null ? row.question_count : '—')),
            ],
            emptyZh: '尚無試題庫。',
            emptyEn: 'No question banks yet.',
            reload: renderAdminQuestionBanksList,
        });
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminArticlesList,
        renderAdminLearningVideosList,
        renderAdminLearningNotesList,
        renderAdminSimulationsList,
        renderAdminQuestionBanksList,
    });

export {};
