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

    function legacyAdmin(path) {
        return ((global.ScienceApi && global.ScienceApi.SITE_BASE) || '') + '/admin/' + path;
    }

    function requireUsersAccess() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        if (!global.ScienceApi.hasPermission('user.manage')) {
            return false;
        }
        return true;
    }

    async function renderAdminUsers() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('使用者', 'Users');

        if (!requireUsersAccess()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const data = await global.ScienceApi.apiFetch('/admin/users');
            const users = data.users || [];
            const roles = data.roles || [];
            const canImpersonate = !!data.can_impersonate;
            const me = global.ScienceApi.getUser();
            const myId = me && me.id ? Number(me.id) : 0;

            const roleChecks = roles.map((role) =>
                `<label class="inline-flex items-center gap-1.5 text-xs mr-3 mb-1">
                    <input type="checkbox" name="roles" value="${Number(role.id)}" class="rounded border-slate-300">
                    ${escapeHtml(role.label || role.slug)}
                </label>`
            ).join('');

            const rows = users.map((u) => {
                if (u.is_system) {
                    return `<tr class="border-t border-slate-100 text-slate-400">
                        <td class="p-3">${Number(u.id)}</td>
                        <td class="p-3">${escapeHtml(u.email)}</td>
                        <td class="p-3" colspan="3">${escapeHtml(t('系統帳號', 'System account'))}</td>
                        <td class="p-3">—</td>
                    </tr>`;
                }
                const active = u.is_active
                    ? escapeHtml(t('是', 'Yes'))
                    : escapeHtml(t('否', 'No'));
                const impersonate = canImpersonate && Number(u.id) !== myId
                    ? `<button type="button" class="admin-impersonate text-amber-700 hover:underline ml-2" data-id="${Number(u.id)}" data-label="${escapeHtml(u.name_zh || u.name_en || u.email)}">${escapeHtml(t('模仿', 'Impersonate'))}</button>`
                    : '';
                return `<tr class="border-t border-slate-100">
                    <td class="p-3">${Number(u.id)}</td>
                    <td class="p-3">${escapeHtml(u.email)}</td>
                    <td class="p-3">${escapeHtml(u.name_zh || '')}</td>
                    <td class="p-3">${escapeHtml(u.name_en || '')}</td>
                    <td class="p-3 text-slate-600">${escapeHtml(u.role_names || '—')}</td>
                    <td class="p-3">${active}</td>
                    <td class="p-3 whitespace-nowrap">
                        <a class="text-indigo-700 hover:underline" href="${escapeHtml(spaHref(`/admin/users/${Number(u.id)}`))}" data-spa-nav="/admin/users/${Number(u.id)}">${escapeHtml(t('編輯', 'Edit'))}</a>
                        ${impersonate}
                        <button type="button" class="admin-user-delete text-red-600 hover:underline ml-2" data-id="${Number(u.id)}">${escapeHtml(t('刪除', 'Delete'))}</button>
                    </td>
                </tr>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <a href="${escapeHtml(legacyAdmin('permissions.php'))}" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('角色權限', 'Permissions'))}</a>
                    <a href="${escapeHtml(legacyAdmin('users.php'))}" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('完整 PHP 列表', 'Full PHP list'))}</a>
                </div>
                <p id="admin-users-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-user-create" class="mb-6 space-y-3 bg-white border border-slate-200 rounded-xl p-4">
                    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <label class="text-sm sm:col-span-2">${escapeHtml(t('帳戶名稱／電郵', 'Login / email'))}
                            <input name="email" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" autocomplete="username">
                        </label>
                        <label class="text-sm">${escapeHtml(t('中文名', 'Name ZH'))}
                            <input name="name_zh" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" maxlength="120">
                        </label>
                        <label class="text-sm">${escapeHtml(t('英文名', 'Name EN'))}
                            <input name="name_en" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" maxlength="120">
                        </label>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-slate-700 mb-1">${escapeHtml(t('角色', 'Roles'))}</p>
                        <div>${roleChecks || `<span class="text-xs text-slate-400">${escapeHtml(t('尚無角色', 'No roles'))}</span>`}</div>
                    </div>
                    <div class="flex flex-wrap items-center gap-4">
                        <label class="text-sm inline-flex items-center gap-2">
                            <input type="checkbox" name="is_active" checked class="rounded border-slate-300">
                            ${escapeHtml(t('啟用帳戶', 'Active'))}
                        </label>
                        <button type="submit" class="rounded-lg bg-indigo-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('新增使用者', 'Create user'))}</button>
                    </div>
                    <p class="text-xs text-slate-500">${escapeHtml(t('密碼由 QSIS 驗證；本站不儲存密碼。', 'Passwords are verified via QSIS; none are stored here.'))}</p>
                </form>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">ID</th>
                                <th class="p-3">${escapeHtml(t('電郵', 'Email'))}</th>
                                <th class="p-3">${escapeHtml(t('中文名', 'Name ZH'))}</th>
                                <th class="p-3">${escapeHtml(t('英文名', 'Name EN'))}</th>
                                <th class="p-3">${escapeHtml(t('角色', 'Roles'))}</th>
                                <th class="p-3">${escapeHtml(t('啟用', 'Active'))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;

            const flash = document.getElementById('admin-users-flash');
            function showFlash(msg, isError) {
                if (!flash) return;
                flash.textContent = msg;
                flash.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
                flash.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
            }

            box.querySelectorAll('[data-spa-nav]').forEach((a) => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
                });
            });

            document.getElementById('admin-user-create')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const fd = new FormData(form);
                const roleIds = Array.from(form.querySelectorAll('input[name="roles"]:checked'))
                    .map((el) => parseInt(el.value, 10))
                    .filter((n) => n > 0);
                try {
                    const res = await global.ScienceApi.apiFetch('/admin/users', {
                        method: 'POST',
                        body: {
                            email: String(fd.get('email') || '').trim(),
                            name_zh: String(fd.get('name_zh') || '').trim(),
                            name_en: String(fd.get('name_en') || '').trim(),
                            is_active: !!form.querySelector('input[name="is_active"]')?.checked,
                            roles: roleIds,
                        },
                    });
                    const newId = res.user && res.user.id ? Number(res.user.id) : 0;
                    if (newId > 0) {
                        global.AppRouter.navigate('/admin/users/' + newId);
                        return;
                    }
                    showFlash(t('已新增使用者。', 'User created.'), false);
                    await renderAdminUsers();
                } catch (err) {
                    showFlash(err.message || t('儲存失敗', 'Save failed'), true);
                }
            });

            box.querySelectorAll('.admin-user-delete').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = parseInt(btn.getAttribute('data-id') || '0', 10);
                    if (!id || !confirm(t('確定刪除？', 'Delete this user?'))) return;
                    try {
                        await global.ScienceApi.apiFetch('/admin/users', { method: 'DELETE', body: { id } });
                        showFlash(t('已刪除。', 'Deleted.'), false);
                        await renderAdminUsers();
                    } catch (err) {
                        showFlash(err.message || t('刪除失敗', 'Delete failed'), true);
                    }
                });
            });

            box.querySelectorAll('.admin-impersonate').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = parseInt(btn.getAttribute('data-id') || '0', 10);
                    const label = btn.getAttribute('data-label') || '';
                    if (!id || !confirm(t('確定以「' + label + '」的身分瀏覽前台？', 'Impersonate “' + label + '”?'))) return;
                    try {
                        await global.ScienceApi.apiFetch('/admin/users/' + id + '/impersonate', { method: 'POST', body: {} });
                        location.href = ((global.ScienceApi && global.ScienceApi.SITE_BASE) || '') + '/app/';
                    } catch (err) {
                        showFlash(err.message || t('模仿失敗', 'Impersonation failed'), true);
                    }
                });
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    async function renderAdminUserEdit(idRaw) {
        setShell();
        const id = parseInt(idRaw, 10) || 0;
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('編輯使用者', 'Edit user');

        if (!requireUsersAccess()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }
        if (id <= 0) {
            global.AppRouter.navigate('/admin/users');
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const data = await global.ScienceApi.apiFetch('/admin/users/' + id);
            const u = data.user;
            const roles = data.roles || [];
            if (!u) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('找不到使用者。', 'User not found.'))}</p>`;
                return;
            }
            const selected = new Set((u.role_ids || []).map((n) => Number(n)));
            const roleChecks = roles.map((role) =>
                `<label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="roles" value="${Number(role.id)}" class="rounded border-slate-300"${selected.has(Number(role.id)) ? ' checked' : ''}>
                    ${escapeHtml(role.label || role.slug)}
                    <span class="text-xs text-slate-400 font-mono">${escapeHtml(role.slug || '')}</span>
                </label>`
            ).join('');
            const emailReadonly = u.is_system ? ' readonly' : '';

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin/users'))}" data-spa-nav="/admin/users" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 使用者列表', '← Users'))}</a>
                </div>
                <p id="admin-user-edit-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-user-edit" class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm max-w-2xl">
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('帳戶名稱／電郵', 'Login / email'))}
                        <input name="email" required value="${escapeHtml(u.email)}" class="mt-1 w-full border rounded-lg px-3 py-2"${emailReadonly} autocomplete="username">
                    </label>
                    <p class="text-xs text-slate-500 -mt-2">${escapeHtml(t('學校帳戶請填 QSIS 帳戶名；外部可填完整電郵。', 'Use QSIS username for school accounts; full email for external.'))}</p>
                    <div class="grid sm:grid-cols-2 gap-4">
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('中文名', 'Name ZH'))}
                            <input name="name_zh" value="${escapeHtml(u.name_zh || '')}" maxlength="120" class="mt-1 w-full border rounded-lg px-3 py-2">
                        </label>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('英文名', 'Name EN'))}
                            <input name="name_en" value="${escapeHtml(u.name_en || '')}" maxlength="120" class="mt-1 w-full border rounded-lg px-3 py-2">
                        </label>
                    </div>
                    <p class="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">${escapeHtml(t('登入密碼由 QSIS 驗證；本站不儲存密碼。', 'Passwords are verified via QSIS; none are stored here.'))}</p>
                    <label class="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" name="is_active" class="rounded border-slate-300"${u.is_active ? ' checked' : ''}>
                        ${escapeHtml(t('啟用帳戶', 'Active'))}
                    </label>
                    <fieldset>
                        <legend class="text-sm font-medium text-slate-700 mb-2">${escapeHtml(t('角色', 'Roles'))}</legend>
                        <div class="space-y-2">${roleChecks}</div>
                    </fieldset>
                    <div class="flex flex-wrap gap-3 items-center">
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">${escapeHtml(t('儲存', 'Save'))}</button>
                        <button type="button" id="admin-user-edit-cancel" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${escapeHtml(t('取消', 'Cancel'))}</button>
                        ${u.is_system ? '' : `<button type="button" id="admin-user-edit-delete" class="text-red-600 hover:underline text-sm ml-auto">${escapeHtml(t('刪除使用者', 'Delete user'))}</button>`}
                    </div>
                </form>`;

            const flash = document.getElementById('admin-user-edit-flash');
            function showFlash(msg, isError) {
                if (!flash) return;
                flash.textContent = msg;
                flash.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
                flash.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
            }

            box.querySelector('[data-spa-nav="/admin/users"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/admin/users');
            });
            document.getElementById('admin-user-edit-cancel')?.addEventListener('click', () => {
                global.AppRouter.navigate('/admin/users');
            });

            document.getElementById('admin-user-edit')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const fd = new FormData(form);
                const roleIds = Array.from(form.querySelectorAll('input[name="roles"]:checked'))
                    .map((el) => parseInt(el.value, 10))
                    .filter((n) => n > 0);
                try {
                    await global.ScienceApi.apiFetch('/admin/users/' + id, {
                        method: 'PUT',
                        body: {
                            email: String(fd.get('email') || '').trim(),
                            name_zh: String(fd.get('name_zh') || '').trim(),
                            name_en: String(fd.get('name_en') || '').trim(),
                            is_active: !!form.querySelector('input[name="is_active"]')?.checked,
                            roles: roleIds,
                        },
                    });
                    showFlash(t('已儲存。', 'Saved.'), false);
                    await renderAdminUserEdit(String(id));
                } catch (err) {
                    showFlash(err.message || t('儲存失敗', 'Save failed'), true);
                }
            });

            document.getElementById('admin-user-edit-delete')?.addEventListener('click', async () => {
                if (!confirm(t('確定刪除？', 'Delete this user?'))) return;
                try {
                    await global.ScienceApi.apiFetch('/admin/users/' + id, { method: 'DELETE', body: {} });
                    global.AppRouter.navigate('/admin/users');
                } catch (err) {
                    showFlash(err.message || t('刪除失敗', 'Delete failed'), true);
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminUsers,
        renderAdminUserEdit,
    });

export {};
