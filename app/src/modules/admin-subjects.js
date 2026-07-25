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

    function setShell() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    async function renderAdminHome() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('管理', 'Admin');

        const user = global.ScienceApi && global.ScienceApi.getUser ? global.ScienceApi.getUser() : null;
        if (!user) {
            global.AppRouter.navigate('/login');
            return;
        }

        const canSubjects = global.ScienceApi.hasPermission('user.manage');
        const canUsers = canSubjects;
        const canCourses = global.ScienceApi.hasPermission('class.manage_any')
            || global.ScienceApi.hasPermission('class.manage_own');
        const legacyAdmin = ((global.ScienceApi && global.ScienceApi.SITE_BASE) || '') + '/admin/';

        box.innerHTML = `
            <div class="max-w-2xl space-y-4">
                <p class="text-slate-600 text-sm">${escapeHtml(t('SPA 後台入口（逐步遷移中）。', 'SPA admin entry (migration in progress).'))}</p>
                <ul class="space-y-2">
                    ${canSubjects ? `<li><a href="./admin/subjects" data-spa-nav="/admin/subjects" class="text-indigo-700 font-medium hover:underline">${escapeHtml(t('科目與單元', 'Subjects & topics'))}</a></li>` : ''}
                    ${canCourses ? `<li><a href="./admin/courses" data-spa-nav="/admin/courses" class="text-indigo-700 font-medium hover:underline">${escapeHtml(t('課程管理', 'Courses'))}</a></li>` : ''}
                    ${canUsers ? `<li><a href="./admin/users" data-spa-nav="/admin/users" class="text-indigo-700 font-medium hover:underline">${escapeHtml(t('使用者', 'Users'))}</a></li>` : ''}
                    <li><a href="${escapeHtml(legacyAdmin)}" class="text-slate-700 hover:underline">${escapeHtml(t('完整 PHP 後台', 'Full PHP admin'))}</a></li>
                </ul>
            </div>`;

        box.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    async function renderAdminSubjects() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('科目與單元', 'Subjects & topics');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!global.ScienceApi.hasPermission('user.manage')) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const list = await global.ScienceApi.apiFetch('/admin/subjects');
            const rows = (list || []).map((s) => {
                const topics = (s.topics || []).map((tp) =>
                    `<li class="text-sm text-slate-600">${escapeHtml(tp.name_zh || tp.name_en)} <span class="text-slate-400">(${escapeHtml(tp.slug)})</span></li>`
                ).join('');
                return `<article class="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 class="font-bold text-slate-900">${escapeHtml(s.name_zh || s.name_en)}
                        <span class="text-slate-400 font-normal text-sm">/${escapeHtml(s.name_en || '')}</span>
                    </h2>
                    <p class="text-xs text-slate-400 mb-2">slug: ${escapeHtml(s.slug)}</p>
                    <ul class="list-disc pl-5 space-y-0.5">${topics || `<li class="text-slate-400 text-sm">${escapeHtml(t('尚無單元', 'No topics'))}</li>`}</ul>
                </article>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="./admin" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <button type="button" id="admin-subj-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                <form id="admin-subj-create" class="mb-6 grid sm:grid-cols-3 gap-2 items-end bg-white border border-slate-200 rounded-xl p-4">
                    <label class="text-sm">${escapeHtml(t('英文名稱', 'English name'))}
                        <input name="name_en" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${escapeHtml(t('中文名稱', 'Chinese name'))}
                        <input name="name_zh" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <button type="submit" class="rounded-lg bg-indigo-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('新增科目', 'Add subject'))}</button>
                </form>
                <p id="admin-subj-msg" class="hidden text-sm mb-3"></p>
                <div class="space-y-3">${rows || `<p class="text-slate-500">${escapeHtml(t('尚無科目', 'No subjects'))}</p>`}</div>`;

            document.getElementById('admin-subj-reload').onclick = () => renderAdminSubjects();
            document.querySelector('[data-spa-nav="/admin"]').addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/admin');
            });
            document.getElementById('admin-subj-create').addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const msg = document.getElementById('admin-subj-msg');
                try {
                    await global.ScienceApi.apiFetch('/admin/subjects', {
                        method: 'POST',
                        body: {
                            name_en: String(fd.get('name_en') || ''),
                            name_zh: String(fd.get('name_zh') || ''),
                        },
                    });
                    msg.textContent = t('已新增。', 'Created.');
                    msg.className = 'text-sm mb-3 text-emerald-700';
                    await renderAdminSubjects();
                } catch (err) {
                    msg.textContent = err.message || t('儲存失敗', 'Save failed');
                    msg.className = 'text-sm mb-3 text-red-600';
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = {
        renderAdminHome,
        renderAdminSubjects,
    };

export {};
