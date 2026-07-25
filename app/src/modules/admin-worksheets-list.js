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

    function statusLabel(status) {
        const map = {
            draft: t('草稿', 'Draft'),
            pending_review: t('待審核', 'Pending review'),
            published: t('已發佈', 'Published'),
        };
        return map[status] || status;
    }

    function canAccessWorksheets() {
        const api = global.ScienceApi;
        if (!api || !api.getUser()) return false;
        return api.hasPermission('worksheet.manage_any')
            || api.hasPermission('worksheet.manage_own');
    }

    function canManageRow(row) {
        const api = global.ScienceApi;
        const me = api.getUser();
        if (!me) return false;
        if (api.hasPermission('worksheet.manage_any')) return true;
        return Number(row.owner_user_id || 0) === Number(me.id);
    }

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    async function renderAdminWorksheetsList() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const canAny = global.ScienceApi.hasPermission('worksheet.manage_any');
        if (title) {
            title.textContent = canAny ? t('工作紙', 'Worksheets') : t('我的工作紙', 'My worksheets');
        }

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!canAccessWorksheets()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        const canCourses = global.ScienceApi.hasPermission('class.manage_any')
            || global.ScienceApi.hasPermission('class.manage_own');

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        try {
            const list = await global.ScienceApi.apiFetch('/admin/worksheets');
            const items = Array.isArray(list) ? list : [];

            const rows = items.map((row) => {
                const id = Number(row.id);
                const canManage = canManageRow(row);
                return `<tr class="border-t border-slate-100">
                    <td class="p-3">${escapeHtml(row.title_zh || row.title_en || '—')}</td>
                    <td class="p-3 font-mono text-xs">${escapeHtml(row.slug || '')}</td>
                    <td class="p-3">${escapeHtml(statusLabel(row.status))}</td>
                    <td class="p-3 text-xs">${escapeHtml(row.updated_at || '')}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        ${canManage ? `<a href="${escapeHtml(spaHref('/admin/worksheets/' + id + '/edit'))}" data-spa-nav="/admin/worksheets/${id}/edit" class="text-indigo-600 hover:underline">${escapeHtml(t('編輯', 'Edit'))}</a>` : ''}
                        <a href="${escapeHtml(spaHref('/worksheet/' + encodeURIComponent(row.slug || '')))}" class="text-slate-600 hover:underline ml-2" target="_blank" rel="noopener">${escapeHtml(t('預覽', 'Preview'))}</a>
                        ${canManage ? `<button type="button" class="text-red-600 hover:underline ml-2 ws-delete" data-id="${id}">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                    </td>
                </tr>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/worksheets/new'))}" data-spa-nav="/admin/worksheets/new" class="text-sm rounded-lg bg-indigo-700 text-white px-3 py-1.5 font-semibold hover:bg-indigo-800">${escapeHtml(t('新增工作紙', 'New worksheet'))}</a>
                    ${canAny ? `<a href="${escapeHtml(spaHref('/admin/review-queue'))}" data-spa-nav="/admin/review-queue" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('審核佇列', 'Review queue'))}</a>` : ''}
                    ${canCourses ? `<a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('課程派發', 'Course assign'))}</a>` : ''}
                    <button type="button" id="admin-ws-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                ${!canAny ? `<p class="text-sm text-slate-600 mb-4">${escapeHtml(t('在此設計工作紙內容；完成後到「課程管理」派發給學生。提交「待審核」後，管理員可發佈至全站列表。', 'Design worksheets here; assign from Courses. Submit for review to publish site-wide.'))}</p>` : ''}
                <p id="admin-ws-flash" class="text-sm mb-3 hidden"></p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100">
                            <tr>
                                <th class="p-3 text-left">${escapeHtml(t('標題', 'Title'))}</th>
                                <th class="p-3">slug</th>
                                <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                                <th class="p-3">${escapeHtml(t('更新', 'Updated'))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || `<tr><td colspan="5" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無工作紙。', 'No worksheets yet.'))} <a href="${escapeHtml(spaHref('/admin/worksheets/new'))}" data-spa-nav="/admin/worksheets/new" class="text-indigo-600 hover:underline">${escapeHtml(t('新增第一份工作紙', 'Create the first worksheet'))}</a></td></tr>`}
                        </tbody>
                    </table>
                </div>`;

            bindSpaNav(box);
            document.getElementById('admin-ws-reload')?.addEventListener('click', () => {
                void renderAdminWorksheetsList();
            });
            box.querySelectorAll('.ws-delete').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = Number(btn.getAttribute('data-id') || 0);
                    if (id <= 0) return;
                    if (!window.confirm(t('確定刪除此工作紙？', 'Delete this worksheet?'))) return;
                    const flash = document.getElementById('admin-ws-flash');
                    try {
                        await global.ScienceApi.apiFetch('/admin/worksheets', {
                            method: 'DELETE',
                            body: { id },
                        });
                        await renderAdminWorksheetsList();
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

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminWorksheetsList,
    });

export {};
