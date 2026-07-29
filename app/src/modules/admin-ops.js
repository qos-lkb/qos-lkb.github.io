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

    function requireUserManage() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        if (!global.ScienceApi.hasPermission('user.manage')) {
            return false;
        }
        return true;
    }

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    async function renderAdminNavMenu() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('主選單管理', 'Main menu management');

        if (!requireUserManage()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const data = await global.ScienceApi.apiFetch('/admin/nav-menu');
            const items = data.items || [];
            const audiences = data.audiences || [];
            const matrix = data.matrix || {};
            const tableOk = !!data.table_ready;
            const orderOk = !!data.order_table_ready;

            const head = audiences.map((aud) =>
                `<th class="p-3 border-b border-slate-200 font-semibold text-slate-700 text-center whitespace-nowrap">${escapeHtml(aud.label_zh || aud.key)}</th>`
            ).join('');

            const rows = items.map((item) => {
                const cells = audiences.map((aud) => {
                    const checked = !!(matrix[item.key] && matrix[item.key][aud.key]);
                    const id = 'vis_' + item.key + '_' + aud.key;
                    return `<td class="p-3 text-center">
                        <label class="inline-flex items-center justify-center cursor-pointer" for="${escapeHtml(id)}">
                            <input type="checkbox" id="${escapeHtml(id)}" data-item="${escapeHtml(item.key)}" data-audience="${escapeHtml(aud.key)}"
                                class="nav-vis-cb h-4 w-4 rounded border-slate-300 text-indigo-600" ${checked ? 'checked' : ''} ${tableOk ? '' : 'disabled'}>
                        </label>
                    </td>`;
                }).join('');
                return `<tr class="nav-item-row border-b border-slate-100 hover:bg-slate-50/80" data-item-key="${escapeHtml(item.key)}">
                    <td class="p-3 sticky left-0 bg-white whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <span class="nav-drag-handle cursor-grab select-none text-slate-400 hover:text-slate-600 ${orderOk ? '' : 'opacity-40 pointer-events-none'}" title="${escapeHtml(t('拖曳排序', 'Drag to reorder'))}" aria-label="${escapeHtml(t('拖曳排序', 'Drag to reorder'))}">⠿</span>
                            <span>
                                <span class="font-medium text-slate-900">${escapeHtml(item.label_zh || item.key)}</span>
                                <span class="block text-xs font-normal text-slate-500">${escapeHtml(item.label_en || '')}</span>
                            </span>
                        </div>
                    </td>
                    ${cells}
                </tr>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/users'))}" data-spa-nav="/admin/users" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('使用者', 'Users'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/permissions'))}" data-spa-nav="/admin/permissions" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('角色權限', 'Permissions'))}</a>
                </div>
                <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('管理 SPA 上方主選單：拖曳調整顯示次序，並依訪客／學生／教師／管理員設定可見性。', 'Manage the SPA top menu: drag to reorder, and set visibility per guest / student / teacher / admin.'))}</p>
                <p id="nav-flash" class="mb-4 hidden rounded-lg px-4 py-3 text-sm border"></p>
                ${!tableOk ? `<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${escapeHtml(t('尚未建立 spa_nav_visibility 資料表；目前無法儲存可見性。', 'spa_nav_visibility table missing; visibility save is disabled.'))}</div>` : ''}
                ${!orderOk ? `<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${escapeHtml(t('尚未建立 spa_nav_order 資料表；請執行 schema_spa_nav_order.sql 以啟用拖曳排序。', 'spa_nav_order table missing; run schema_spa_nav_order.sql to enable drag reorder.'))}</div>` : ''}
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-100">
                        <h2 class="font-bold text-slate-900">${escapeHtml(t('主選單項目', 'Main menu items'))}</h2>
                        <p class="text-sm text-slate-600 mt-1">${escapeHtml(t('左側 ⠿ 拖曳排序；勾選表示該類使用者可在前台看到該選單。', 'Drag ⠿ to reorder; checked = visible for that audience.'))}</p>
                    </div>
                    <form id="nav-menu-form" class="p-4 md:p-5 overflow-x-auto">
                        <table class="min-w-full text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-50 text-left">
                                    <th class="p-3 border-b border-slate-200 font-semibold text-slate-700 sticky left-0 bg-slate-50">${escapeHtml(t('選單項目', 'Menu item'))}</th>
                                    ${head}
                                </tr>
                            </thead>
                            <tbody id="nav-item-tbody">${rows}</tbody>
                        </table>
                        <div class="mt-5 flex flex-wrap items-center gap-3">
                            <button type="submit" class="rounded-lg bg-indigo-700 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-800" ${tableOk ? '' : 'disabled'}>${escapeHtml(t('儲存設定', 'Save'))}</button>
                            <button type="button" id="nav-check-all" class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" ${tableOk ? '' : 'disabled'}>${escapeHtml(t('全部勾選', 'Check all'))}</button>
                            <button type="button" id="nav-uncheck-all" class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" ${tableOk ? '' : 'disabled'}>${escapeHtml(t('全部取消', 'Uncheck all'))}</button>
                        </div>
                    </form>
                </div>`;

            bindSpaNav(box);
            const form = document.getElementById('nav-menu-form');
            const tbody = document.getElementById('nav-item-tbody');
            const flash = document.getElementById('nav-flash');
            function showFlash(msg, isError) {
                flash.textContent = msg;
                flash.className = 'mb-4 rounded-lg px-4 py-3 text-sm border '
                    + (isError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900');
            }

            function collectOrder() {
                return Array.from(tbody.querySelectorAll('.nav-item-row'))
                    .map((row) => row.getAttribute('data-item-key'))
                    .filter(Boolean);
            }

            function collectMatrix() {
                const next = {};
                form.querySelectorAll('input.nav-vis-cb').forEach((el) => {
                    const item = el.getAttribute('data-item');
                    const audience = el.getAttribute('data-audience');
                    if (!item || !audience) return;
                    if (!next[item]) next[item] = {};
                    next[item][audience] = el.checked ? '1' : '';
                });
                return next;
            }

            function wireNavSort() {
                if (!orderOk || !tbody) return;
                let dragged = null;

                function dragAfter(y) {
                    const els = Array.prototype.slice.call(tbody.querySelectorAll('.nav-item-row:not(.dragging)'));
                    return els.reduce((closest, child) => {
                        const boxRect = child.getBoundingClientRect();
                        const offset = y - boxRect.top - boxRect.height / 2;
                        if (offset < 0 && offset > closest.offset) {
                            return { offset, element: child };
                        }
                        return closest;
                    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
                }

                tbody.addEventListener('dragenter', (e) => e.preventDefault());
                tbody.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!dragged) return;
                    const after = dragAfter(e.clientY);
                    if (after == null) tbody.appendChild(dragged);
                    else tbody.insertBefore(dragged, after);
                });

                tbody.querySelectorAll('.nav-item-row').forEach((row) => {
                    const handle = row.querySelector('.nav-drag-handle');
                    if (!handle) return;
                    handle.addEventListener('mousedown', () => {
                        row.setAttribute('draggable', 'true');
                    });
                    row.addEventListener('dragend', async () => {
                        row.removeAttribute('draggable');
                        row.classList.remove('dragging', 'opacity-60');
                        if (dragged === row) dragged = null;
                        try {
                            await global.ScienceApi.apiFetch('/admin/nav-menu', {
                                method: 'POST',
                                body: { matrix: collectMatrix(), order: collectOrder() },
                            });
                            showFlash(t('已更新選單次序。', 'Menu order updated.'), false);
                        } catch (err) {
                            showFlash(err.message || t('儲存排序失敗', 'Failed to save order'), true);
                        }
                    });
                    row.addEventListener('dragstart', (e) => {
                        if (!row.getAttribute('draggable')) {
                            e.preventDefault();
                            return;
                        }
                        dragged = row;
                        row.classList.add('dragging', 'opacity-60');
                        if (e.dataTransfer) {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', row.getAttribute('data-item-key') || '');
                        }
                    });
                });
            }

            document.getElementById('nav-check-all')?.addEventListener('click', () => {
                form.querySelectorAll('input.nav-vis-cb').forEach((el) => { el.checked = true; });
            });
            document.getElementById('nav-uncheck-all')?.addEventListener('click', () => {
                form.querySelectorAll('input.nav-vis-cb').forEach((el) => { el.checked = false; });
            });
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await global.ScienceApi.apiFetch('/admin/nav-menu', {
                        method: 'POST',
                        body: { matrix: collectMatrix(), order: collectOrder() },
                    });
                    showFlash(t('已更新主選單設定。', 'Main menu settings updated.'), false);
                } catch (err) {
                    showFlash(err.message || t('儲存失敗', 'Save failed'), true);
                }
            });
            wireNavSort();
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    async function renderAdminPermissions() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('角色權限', 'Role permissions');

        if (!requireUserManage()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const data = await global.ScienceApi.apiFetch('/admin/permissions');
            const roles = data.roles || [];
            const groupsRaw = data.groups || {};
            const groups = Array.isArray(groupsRaw) ? groupsRaw : Object.values(groupsRaw);
            const checked = {};
            roles.forEach((role) => {
                checked[role.id] = {};
                (role.permission_ids || []).forEach((pid) => {
                    checked[role.id][Number(pid)] = true;
                });
            });

            const roleHeads = roles.map((role) =>
                `<th class="p-3 text-center font-semibold text-slate-700 min-w-[7rem]" title="${escapeHtml(role.description || '')}">
                    <span class="block">${escapeHtml(role.label || role.slug)}</span>
                    <span class="block text-xs font-normal font-mono text-slate-400 mt-0.5">${escapeHtml(role.slug || '')}</span>
                </th>`
            ).join('');

            const bodyRows = groups.map((group) => {
                const perms = group.permissions || [];
                if (!perms.length) return '';
                const groupRow = `<tr>
                    <td class="p-2 pl-3 font-semibold text-slate-600 text-xs uppercase tracking-wide bg-indigo-50/60 border-y border-indigo-100" colspan="${roles.length + 1}">
                        ${escapeHtml(group.label || '')}
                    </td>
                </tr>`;
                const permRows = perms.map((perm) => {
                    const pid = Number(perm.id);
                    const cells = roles.map((role) => {
                        const isOn = !!(checked[role.id] && checked[role.id][pid]);
                        return `<td class="p-3 text-center align-middle">
                            <label class="inline-flex items-center justify-center w-full min-h-[2.5rem] cursor-pointer rounded-lg hover:bg-indigo-50/50">
                                <input type="checkbox" class="perm-matrix-checkbox w-4 h-4 accent-indigo-600"
                                    data-role-id="${Number(role.id)}" value="${pid}" ${isOn ? 'checked' : ''}
                                    aria-label="${escapeHtml((role.label || role.slug) + ' — ' + (perm.label || perm.name))}">
                            </label>
                        </td>`;
                    }).join('');
                    return `<tr class="border-b border-slate-100 hover:bg-slate-50/80">
                        <td class="p-3 align-middle bg-white sticky left-0">
                            <span class="block text-slate-800 leading-snug">${escapeHtml(perm.label || perm.name)}</span>
                            ${perm.description ? `<span class="block text-xs text-slate-500 mt-0.5">${escapeHtml(perm.description)}</span>` : ''}
                            <span class="block text-xs font-mono text-slate-400 mt-0.5">${escapeHtml(perm.name || '')}</span>
                        </td>
                        ${cells}
                    </tr>`;
                }).join('');
                return groupRow + permRows;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/users'))}" data-spa-nav="/admin/users" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('使用者', 'Users'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/nav-menu'))}" data-spa-nav="/admin/nav-menu" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('主選單管理', 'Main menu'))}</a>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
                    <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(t('橫列為角色、直欄為權限；勾選後按儲存。變更個別使用者角色請至使用者管理。', 'Rows are permissions, columns are roles. Save after editing. Assign user roles under Users.'))}</p>
                </div>
                <p id="perm-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
                ${roles.length ? `
                <form id="perm-matrix-form" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-100 border-b border-slate-200">
                                    <th class="p-3 text-left font-semibold text-slate-700 min-w-[14rem] sticky left-0 bg-slate-100">${escapeHtml(t('權限', 'Permission'))}</th>
                                    ${roleHeads}
                                </tr>
                            </thead>
                            <tbody>${bodyRows}</tbody>
                        </table>
                    </div>
                    <div class="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                        <p class="text-xs text-slate-500">${escapeHtml(t('若移除自己角色的「管理使用者與角色」權限，系統會阻止儲存。', 'Saving is blocked if you remove your own user.manage permission.'))}</p>
                        <button type="submit" class="rounded-lg bg-indigo-700 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-800">${escapeHtml(t('儲存全部角色權限', 'Save all role permissions'))}</button>
                    </div>
                </form>` : `<p class="text-slate-500 text-sm">${escapeHtml(t('尚無角色資料。', 'No roles found.'))}</p>`}`;

            bindSpaNav(box);
            const form = document.getElementById('perm-matrix-form');
            const flash = document.getElementById('perm-flash');
            if (!form) return;
            function showFlash(msg, isError) {
                flash.textContent = msg;
                flash.className = 'rounded-lg border px-4 py-3 text-sm mb-4 '
                    + (isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800');
            }
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const rolePerms = {};
                form.querySelectorAll('.perm-matrix-checkbox').forEach((el) => {
                    const rid = el.getAttribute('data-role-id');
                    if (!rid) return;
                    if (!rolePerms[rid]) rolePerms[rid] = [];
                    if (el.checked) rolePerms[rid].push(parseInt(el.value, 10));
                });
                try {
                    await global.ScienceApi.apiFetch('/admin/permissions', {
                        method: 'PUT',
                        body: { role_perms: rolePerms },
                    });
                    showFlash(t('已更新所有角色權限。', 'All role permissions updated.'), false);
                } catch (err) {
                    showFlash(err.message || t('儲存失敗', 'Save failed'), true);
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminNavMenu,
        renderAdminPermissions,
    });

export {};
