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
        return map[status] || status;
    }

    function canReviewSummer() {
        const api = global.ScienceApi;
        if (!api || !api.getUser()) return false;
        return api.hasPermission('summer_homework.manage_any')
            || api.hasPermission('summer_homework.manage_own')
            || api.hasPermission('class.manage_any')
            || api.hasPermission('class.manage_own');
    }

    function canCreateSummer() {
        const api = global.ScienceApi;
        return api.hasPermission('summer_homework.manage_any')
            || api.hasPermission('summer_homework.manage_own');
    }

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    async function renderAdminSummerHomeworkList() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('暑期功課', 'Summer homework');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!canReviewSummer()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        const canCreate = canCreateSummer();
        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        try {
            const list = await global.ScienceApi.apiFetch('/admin/summer-homework');
            const items = Array.isArray(list) ? list : [];

            const rows = items.map((row) => {
                const id = Number(row.id);
                const titleText = row.title_zh || row.title_en || '—';
                const form = String(row.form_level) === '2' ? t('中二', 'S2') : t('中一', 'S1');
                const type = row.content_type === 'video' ? t('影片', 'Video') : t('閱讀', 'Reading');
                const due = row.due_at || '—';
                const late = !row.due_at
                    ? '—'
                    : (row.allow_late_submit ? t('允許', 'Allowed') : t('禁止', 'Blocked'));
                const canManage = !!row.can_manage;
                return `<tr class="border-t border-slate-100">
                    <td class="p-3 font-medium">${escapeHtml(titleText)}</td>
                    <td class="p-3">${escapeHtml(form)}</td>
                    <td class="p-3">${escapeHtml(type)}</td>
                    <td class="p-3">${escapeHtml(String(row.pass_percent ?? ''))}%</td>
                    <td class="p-3 text-xs whitespace-nowrap">${escapeHtml(String(due))}</td>
                    <td class="p-3">${escapeHtml(late)}</td>
                    <td class="p-3">${escapeHtml(statusLabel(row.status))}</td>
                    <td class="p-3 font-mono text-xs">${escapeHtml(row.slug || '')}</td>
                    <td class="p-3 text-xs text-slate-500">${escapeHtml(row.updated_at || '')}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        <a class="text-indigo-600 hover:underline" href="${escapeHtml(spaHref('/admin/summer-homework/' + id + '/view'))}" data-spa-nav="/admin/summer-homework/${id}/view">${escapeHtml(t('內容／答案', 'Content / answers'))}</a>
                        <a class="text-indigo-600 hover:underline ml-2" href="${escapeHtml(spaHref('/admin/summer-homework/' + id + '/analytics'))}" data-spa-nav="/admin/summer-homework/${id}/analytics">${escapeHtml(t('分析', 'Analytics'))}</a>
                        ${canManage ? `<a class="text-indigo-600 hover:underline ml-2" href="${escapeHtml(spaHref('/admin/summer-homework/' + id + '/edit'))}" data-spa-nav="/admin/summer-homework/${id}/edit">${escapeHtml(t('編輯', 'Edit'))}</a>` : ''}
                        ${canManage ? `<button type="button" class="text-red-600 hover:underline ml-2 sh-delete" data-id="${id}">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                        <a class="text-slate-500 hover:underline ml-2" href="${escapeHtml(spaHref('/summer-homework/' + encodeURIComponent(row.slug || '')))}" target="_blank" rel="noopener">${escapeHtml(t('前台', 'Front'))}</a>
                    </td>
                </tr>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    ${canCreate ? `<a href="${escapeHtml(spaHref('/admin/summer-homework/new'))}" data-spa-nav="/admin/summer-homework/new" class="text-sm rounded-lg bg-indigo-700 text-white px-3 py-1.5 font-semibold hover:bg-indigo-800">${escapeHtml(t('新增習作', 'New item'))}</a>` : ''}
                    ${global.ScienceApi.hasPermission('summer_homework.manage_any') ? `<a href="${escapeHtml(spaHref('/admin/review-queue'))}" data-spa-nav="/admin/review-queue" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('審核佇列', 'Review queue'))}</a>` : ''}
                    <button type="button" id="admin-sh-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('教師／管理員可檢視全部習作內容、答案與呈交分析；編輯限擁有者或管理員。', 'Teachers/admins can review all items; edit is limited to owners or admins.'))}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${escapeHtml(t('標題', 'Title'))}</th>
                                <th class="p-3">${escapeHtml(t('級別', 'Form'))}</th>
                                <th class="p-3">${escapeHtml(t('類型', 'Type'))}</th>
                                <th class="p-3">${escapeHtml(t('及格%', 'Pass %'))}</th>
                                <th class="p-3">${escapeHtml(t('截止日期', 'Due'))}</th>
                                <th class="p-3">${escapeHtml(t('遲交', 'Late'))}</th>
                                <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                                <th class="p-3">slug</th>
                                <th class="p-3">${escapeHtml(t('更新', 'Updated'))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || `<tr><td colspan="10" class="p-6 text-slate-500 text-center">${escapeHtml(t('尚未建立暑期功課。', 'No summer homework yet.'))}${canCreate ? escapeHtml(t('請按「新增習作」。', ' Use “New item”.')) : ''}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;

            bindSpaNav(box);
            document.getElementById('admin-sh-reload')?.addEventListener('click', () => {
                void renderAdminSummerHomeworkList();
            });
            box.querySelectorAll('.sh-delete').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = Number(btn.getAttribute('data-id') || 0);
                    if (id <= 0) return;
                    if (!window.confirm(t('確定刪除此習作？', 'Delete this item?'))) return;
                    const flash = document.getElementById('admin-sh-flash');
                    try {
                        await global.ScienceApi.apiFetch('/admin/summer-homework', {
                            method: 'DELETE',
                            body: { id },
                        });
                        await renderAdminSummerHomeworkList();
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
        renderAdminSummerHomeworkList,
    });

export {};
