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

    function legacyAdmin(path) {
        return ((global.ScienceApi && global.ScienceApi.SITE_BASE) || '') + '/admin/' + path;
    }

    function setShell() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    function canReview() {
        const api = global.ScienceApi;
        if (!api || !api.getUser()) return false;
        return api.hasPermission('learning_tool.manage_any')
            || api.hasPermission('article.manage_any')
            || api.hasPermission('learning_note.manage_any')
            || api.hasPermission('worksheet.manage_any')
            || api.hasPermission('learning_video.manage_any')
            || api.hasPermission('question_bank.manage_any')
            || api.hasPermission('summer_homework.manage_any');
    }

    const TYPE_META = {
        article: {
            labelZh: '文章',
            labelEn: 'Article',
            reviewPath: 'articles',
            edit: (id) => ({ spa: '/admin/articles/' + id + '/edit' }),
        },
        learning_tool: {
            labelZh: '學習工具（舊）',
            labelEn: 'Learning tool (legacy)',
            reviewPath: 'learning-tools',
            // Phase 7：若已遷移則連試題庫編輯；否則僅發佈／退回。
            edit: (_id, it) => {
                const bankId = Number(it && it.mapped_bank_id ? it.mapped_bank_id : 0);
                if (bankId > 0) {
                    return { spa: '/admin/question-banks/' + bankId + '/edit' };
                }
                return null;
            },
        },        learning_note: {
            labelZh: '學習筆記',
            labelEn: 'Learning note',
            reviewPath: 'learning-notes',
            edit: (id) => ({ spa: '/admin/learning-notes/' + id + '/edit' }),
        },
        worksheet: {
            labelZh: '工作紙',
            labelEn: 'Worksheet',
            reviewPath: 'worksheets',
            edit: (id) => ({ spa: '/admin/worksheets/' + id + '/edit' }),
        },
        learning_video: {
            labelZh: '學習影片',
            labelEn: 'Learning video',
            reviewPath: 'learning-videos',
            edit: (id) => ({ spa: '/admin/learning-videos/' + id + '/edit' }),
        },
        question_bank: {
            labelZh: '試題庫',
            labelEn: 'Question bank',
            reviewPath: 'question-banks',
            edit: (id) => ({ spa: '/admin/question-banks/' + id + '/edit' }),
        },
        summer_homework: {
            labelZh: '暑期功課',
            labelEn: 'Summer homework',
            reviewPath: 'summer-homework',
            edit: (id) => ({ spa: '/admin/summer-homework/' + id + '/edit' }),
        },
    };

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    async function renderAdminReviewQueue() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('審核佇列', 'Review queue');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!canReview()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        try {
            const items = await global.ScienceApi.apiFetch('/review-queue');
            const list = Array.isArray(items) ? items : [];

            const cards = list.map((it) => {
                const meta = TYPE_META[it.type] || {
                    labelZh: it.type,
                    labelEn: it.type,
                    reviewPath: it.type,
                    edit: null,
                };
                const id = Number(it.id);
                const titleText = it.title_zh || it.title_en || '—';
                const editTarget = meta.edit ? meta.edit(id, it) : null;
                const editHref = editTarget
                    ? (editTarget.spa ? spaHref(editTarget.spa) : legacyAdmin(editTarget.php))
                    : '';
                const editNav = editTarget && editTarget.spa
                    ? ` data-spa-nav="${escapeHtml(editTarget.spa)}"`
                    : '';
                const editLabel = it.type === 'learning_tool' && editHref
                    ? t('編輯試題庫', 'Edit question bank')
                    : t('編輯', 'Edit');
                const legacyNote = it.type === 'learning_tool' && !editHref
                    ? `<p class="text-xs text-amber-800 mt-1">${escapeHtml(t('已凍結；請遷移至試題庫後再編輯，或於此發佈／退回。', 'Frozen; migrate to a question bank to edit, or publish/reject here.'))}</p>`
                    : '';
                return `<div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center shadow-sm" data-review-id="${id}" data-review-path="${escapeHtml(meta.reviewPath)}">
                    <div>
                        <span class="text-xs uppercase text-amber-700 font-bold tracking-wide">${escapeHtml(t(meta.labelZh, meta.labelEn))}</span>
                        <h2 class="font-semibold text-slate-900">${escapeHtml(titleText)}</h2>
                        <p class="text-xs text-slate-500 font-mono">${escapeHtml(it.slug || '')}</p>
                        <p class="text-xs text-slate-400 mt-1">${escapeHtml(it.updated_at || '')}</p>
                        ${legacyNote}
                    </div>
                    <div class="flex flex-wrap gap-2 items-center">
                        ${editHref ? `<a href="${escapeHtml(editHref)}"${editNav} class="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">${escapeHtml(editLabel)}</a>` : ''}
                        <button type="button" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700" data-action="publish">${escapeHtml(t('發佈', 'Publish'))}</button>
                        <button type="button" class="px-3 py-1.5 bg-slate-200 rounded-lg text-sm hover:bg-slate-300" data-action="reject">${escapeHtml(t('退回', 'Reject'))}</button>
                    </div>
                </div>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <button type="button" id="admin-review-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('審核待發佈的學習筆記、工作紙、文章、影片、試題庫、暑期功課與互動學習工具。', 'Review pending notes, worksheets, articles, videos, question banks, summer homework, and learning tools.'))}</p>
                <p id="admin-review-flash" class="text-sm mb-3 hidden"></p>
                <div id="admin-review-list" class="space-y-3">
                    ${cards || `<p class="text-slate-500">${escapeHtml(t('目前沒有待審核項目。', 'No items pending review.'))}</p>`}
                </div>`;

            bindSpaNav(box);
            document.getElementById('admin-review-reload')?.addEventListener('click', () => {
                void renderAdminReviewQueue();
            });

            const flash = document.getElementById('admin-review-flash');
            box.querySelectorAll('[data-action]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('[data-review-id]');
                    if (!card) return;
                    const id = Number(card.getAttribute('data-review-id') || 0);
                    const path = card.getAttribute('data-review-path') || '';
                    const action = btn.getAttribute('data-action');
                    if (id <= 0 || !path || (action !== 'publish' && action !== 'reject')) return;
                    btn.disabled = true;
                    try {
                        await global.ScienceApi.apiFetch(`/review/${path}/${id}/${action}`, {
                            method: 'POST',
                            body: {},
                        });
                        await renderAdminReviewQueue();
                    } catch (err) {
                        if (flash) {
                            flash.textContent = err.message || t('操作失敗', 'Action failed');
                            flash.className = 'text-sm mb-3 text-red-600';
                        }
                        btn.disabled = false;
                    }
                });
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminReviewQueue,
    });

export {};
