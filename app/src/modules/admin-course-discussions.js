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

function requireCourseModeration() {
    const api = global.ScienceApi;
    if (!api || !api.getUser()) return false;
    return api.hasPermission('class.manage_any') || api.hasPermission('class.manage_own');
}

async function renderAdminCourseDiscussions(idRaw) {
    setShell();
    const id = parseInt(idRaw, 10) || 0;
    const box = document.getElementById('card-container');
    const title = document.getElementById('page-title');
    if (title) title.textContent = t('課程討論審核', 'Course discussions moderation');

    if (id <= 0) {
        global.AppRouter.navigate('/admin/courses');
        return;
    }

    if (!requireCourseModeration()) {
        if (global.ScienceApi && global.ScienceApi.getUser()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
        }
        return;
    }

    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

    try {
        const meta = await global.ScienceApi.apiFetch('/admin/classes/' + id);
        const c = meta.class || {};

        const pending = await global.ScienceApi.apiFetch('/admin/course-discussions/pending?class_id=' + encodeURIComponent(id));
        const pendingPosts = pending.pending_posts || [];

        // Topic id -> title mapping (for better moderation context).
        const topicMap = new Map();
        try {
            const courses = await global.ScienceApi.apiFetch('/courses');
            (courses.subjects || []).forEach((sub) => {
                (sub.topics || []).forEach((tp) => {
                    topicMap.set(Number(tp.id), {
                        name_zh: tp.name_zh || '',
                        name_en: tp.name_en || '',
                    });
                });
            });
        } catch (e) { /* best-effort */ }

        const lang = (global.AppRouter && global.AppRouter.getLang) ? global.AppRouter.getLang() : 'zh';
        const titleForTopic = (tid) => {
            const m = topicMap.get(Number(tid));
            if (!m) return 'Topic #' + Number(tid);
            return lang === 'zh' ? m.name_zh : m.name_en;
        };

        function whenText(dt) {
            if (!dt) return '—';
            return String(dt).slice(0, 16).replace('T', ' ');
        }

        const postCardsHtml = pendingPosts.length
            ? pendingPosts.map((p) => {
                const msg = lang === 'zh' ? (p.message_zh || p.message_en || '') : (p.message_en || p.message_zh || '');
                const topicTitle = titleForTopic(p.topic_id);
                return `
                    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4" data-post-id="${Number(p.id)}">
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-slate-900 truncate">${escapeHtml(topicTitle)}</p>
                                <p class="text-xs text-slate-500">${escapeHtml(p.display_name || '')} · ${escapeHtml(whenText(p.created_at))}</p>
                            </div>
                            <span class="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900">${t('待審核', 'Pending')}</span>
                        </div>
                        <div class="whitespace-pre-wrap text-sm text-slate-800 border border-slate-100 rounded-xl bg-slate-50 p-3 mb-3">
                            ${escapeHtml(msg)}
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700 course-discussion-approve" data-action="publish">
                                ${t('發布', 'Publish')}
                            </button>
                            <button type="button" class="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-rose-700 course-discussion-reject" data-action="reject">
                                ${t('退回', 'Reject')}
                            </button>
                        </div>
                    </div>`;
            }).join('')
            : `<p class="text-sm text-slate-500">${escapeHtml(t('目前沒有待審核的討論留言。', 'No pending discussion posts.'))}</p>`;

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${escapeHtml(spaHref('/admin/courses/' + id + '/report'))}" data-spa-nav="/admin/courses/${id}/report" class="text-sm text-indigo-600 hover:underline">${escapeHtml(t('← 返回報告', '← Back to report'))}</a>
            </div>
            <h2 class="text-lg font-bold text-slate-800 mb-3">${escapeHtml(c.name || t('課程', 'Course'))}</h2>

            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <h3 class="text-base font-bold text-slate-900 mb-3">${escapeHtml(t('待審核留言', 'Pending posts'))} (${Number(pendingPosts.length)})</h3>
                ${postCardsHtml}
            </div>`;

        box.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });

        box.querySelectorAll('.course-discussion-approve, .course-discussion-reject').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const wrap = btn.closest('[data-post-id]');
                const postId = wrap ? parseInt(wrap.getAttribute('data-post-id') || '0', 10) : 0;
                const action = btn.getAttribute('data-action') || '';
                if (!postId) return;

                try {
                    await global.ScienceApi.apiFetch('/admin/course-discussions/posts/' + postId + '/moderate', {
                        method: 'POST',
                        body: { action },
                    });
                    await renderAdminCourseDiscussions(String(id));
                } catch (e) {
                    alert(e.message || t('審核失敗。', 'Moderation failed.'));
                }
            });
        });
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
    }
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminCourseDiscussions,
});

export {};

