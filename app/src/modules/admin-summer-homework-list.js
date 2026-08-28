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

    function canReorderSummer(items) {
        const api = global.ScienceApi;
        if (!api || !canCreateSummer() || !items.length) return false;
        if (api.hasPermission('summer_homework.manage_any')) return true;
        return items.every((row) => !!row.can_manage);
    }

    function toDatetimeLocalValue(dueAt) {
        if (!dueAt || dueAt === '—') return '';
        const s = String(dueAt).trim().replace(' ', 'T');
        return s.length >= 16 ? s.slice(0, 16) : s;
    }

    function formatDueDisplay(dueAt) {
        if (!dueAt) return '—';
        return String(dueAt).trim().replace('T', ' ').slice(0, 16);
    }

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    function showFlash(flash, msg, isError) {
        if (!flash) return;
        flash.textContent = msg;
        flash.classList.remove('hidden');
        flash.className = 'text-sm mb-3 rounded-lg px-3 py-2 border '
            + (isError ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200');
    }

    function collectRowOrder(tbody) {
        return Array.from(tbody.querySelectorAll('.sh-item-row'))
            .map((row) => Number(row.getAttribute('data-id') || 0))
            .filter((id) => id > 0);
    }

    function wireSummerSort(tbody, flash, canReorder) {
        if (!canReorder || !tbody) return;
        let dragged = null;

        function dragAfter(y) {
            const els = Array.prototype.slice.call(tbody.querySelectorAll('.sh-item-row:not(.dragging)'));
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

        tbody.querySelectorAll('.sh-item-row').forEach((row) => {
            const handle = row.querySelector('.sh-drag-handle');
            if (!handle) return;
            handle.addEventListener('mousedown', () => {
                row.setAttribute('draggable', 'true');
            });
            row.addEventListener('dragend', async () => {
                row.removeAttribute('draggable');
                row.classList.remove('dragging', 'opacity-60');
                if (dragged === row) dragged = null;
                try {
                    await global.ScienceApi.apiFetch('/admin/summer-homework', {
                        method: 'POST',
                        body: { action: 'reorder', order: collectRowOrder(tbody) },
                    });
                    showFlash(flash, t('已更新排序。', 'Order updated.'), false);
                } catch (err) {
                    showFlash(flash, err.message || t('儲存排序失敗', 'Failed to save order'), true);
                    void renderAdminSummerHomeworkList();
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
                    e.dataTransfer.setData('text/plain', row.getAttribute('data-id') || '');
                }
            });
        });
    }

    function beginInlineEdit(cell, opts) {
        if (!cell || cell.querySelector('input, textarea')) return;
        const { type, value, onSave, onCancel } = opts;
        const originalHtml = cell.innerHTML;
        cell.classList.add('bg-indigo-50/60');

        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        input.className = 'w-full min-w-[8rem] border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';
        if (type === 'datetime-local') {
            input.className += ' font-mono text-xs';
        }
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();

        let closed = false;
        async function finish(save) {
            if (closed) return;
            closed = true;
            if (!save) {
                cell.innerHTML = originalHtml;
                cell.classList.remove('bg-indigo-50/60');
                if (onCancel) onCancel();
                return;
            }
            try {
                await onSave(input.value.trim());
            } catch (_err) {
                cell.innerHTML = originalHtml;
                cell.classList.remove('bg-indigo-50/60');
            }
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                void finish(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                void finish(false);
            }
        });
        input.addEventListener('blur', () => {
            window.setTimeout(() => void finish(true), 0);
        });
    }

    function wireInlineEdits(box, flash) {
        box.querySelectorAll('.sh-title-cell[data-editable="1"]').forEach((cell) => {
            cell.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const id = Number(cell.closest('.sh-item-row')?.getAttribute('data-id') || 0);
                if (id <= 0) return;
                const titleZh = cell.getAttribute('data-title-zh') || '';
                const titleEn = cell.getAttribute('data-title-en') || '';
                beginInlineEdit(cell, {
                    type: 'text',
                    value: titleZh,
                    onSave: async (nextTitle) => {
                        if (nextTitle === '') {
                            showFlash(flash, t('標題不可為空。', 'Title cannot be empty.'), true);
                            throw new Error('empty');
                        }
                        const payload = { action: 'patch', id, title_zh: nextTitle };
                        if (titleEn === titleZh || titleEn === '') {
                            payload.title_en = nextTitle;
                        }
                        const updated = await global.ScienceApi.apiFetch('/admin/summer-homework', {
                            method: 'POST',
                            body: payload,
                        });
                        cell.innerHTML = escapeHtml(updated.title_zh || updated.title_en || '—');
                        cell.setAttribute('data-title-zh', updated.title_zh || '');
                        cell.setAttribute('data-title-en', updated.title_en || '');
                        cell.classList.remove('bg-indigo-50/60');
                        cell.title = updated.title_en && updated.title_en !== updated.title_zh
                            ? updated.title_en
                            : '';
                        showFlash(flash, t('已更新標題。', 'Title updated.'), false);
                    },
                });
            });
        });

        box.querySelectorAll('.sh-due-cell[data-editable="1"]').forEach((cell) => {
            cell.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const id = Number(cell.closest('.sh-item-row')?.getAttribute('data-id') || 0);
                if (id <= 0) return;
                const dueRaw = cell.getAttribute('data-due-raw') || '';
                beginInlineEdit(cell, {
                    type: 'datetime-local',
                    value: toDatetimeLocalValue(dueRaw),
                    onSave: async (nextDue) => {
                        const updated = await global.ScienceApi.apiFetch('/admin/summer-homework', {
                            method: 'POST',
                            body: { action: 'patch', id, due_at: nextDue || null },
                        });
                        const display = formatDueDisplay(updated.due_at);
                        cell.textContent = display;
                        cell.setAttribute('data-due-raw', updated.due_at || '');
                        cell.classList.remove('bg-indigo-50/60');
                        showFlash(flash, t('已更新截止日期。', 'Due date updated.'), false);
                    },
                });
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
            const canReorder = canReorderSummer(items);

            const rows = items.map((row) => {
                const id = Number(row.id);
                const titleText = row.title_zh || row.title_en || '—';
                const titleEnHint = row.title_en && row.title_en !== row.title_zh ? row.title_en : '';
                const form = String(row.form_level) === '2' ? t('中二', 'S2') : t('中一', 'S1');
                const type = row.content_type === 'video' ? t('影片', 'Video') : t('閱讀', 'Reading');
                const dueDisplay = formatDueDisplay(row.due_at);
                const late = !row.due_at
                    ? '—'
                    : (row.allow_late_submit ? t('允許', 'Allowed') : t('禁止', 'Blocked'));
                const canManage = !!row.can_manage;
                const editable = canManage ? '1' : '0';
                const dragCell = canReorder
                    ? `<td class="p-3 w-10 text-slate-400">
                        <span class="sh-drag-handle cursor-grab select-none hover:text-slate-600" title="${escapeHtml(t('拖曳排序', 'Drag to reorder'))}" aria-label="${escapeHtml(t('拖曳排序', 'Drag to reorder'))}">⠿</span>
                       </td>`
                    : '';
                return `<tr class="sh-item-row border-t border-slate-100 hover:bg-slate-50/80" data-id="${id}">
                    ${dragCell}
                    <td class="p-3 font-medium sh-title-cell ${canManage ? 'cursor-text' : ''}" data-editable="${editable}" data-title-zh="${escapeHtml(row.title_zh || '')}" data-title-en="${escapeHtml(row.title_en || '')}" title="${canManage ? escapeHtml(t('雙擊編輯標題', 'Double-click to edit title')) : ''}${titleEnHint ? ' · ' + escapeHtml(titleEnHint) : ''}">${escapeHtml(titleText)}</td>
                    <td class="p-3">${escapeHtml(form)}</td>
                    <td class="p-3">${escapeHtml(type)}</td>
                    <td class="p-3">${escapeHtml(String(row.pass_percent ?? ''))}%</td>
                    <td class="p-3 text-xs whitespace-nowrap sh-due-cell ${canManage ? 'cursor-text' : ''}" data-editable="${editable}" data-due-raw="${escapeHtml(row.due_at || '')}" title="${canManage ? escapeHtml(t('雙擊編輯截止日期', 'Double-click to edit due date')) : ''}">${escapeHtml(dueDisplay)}</td>
                    <td class="p-3">${escapeHtml(late)}</td>
                    <td class="p-3">${escapeHtml(statusLabel(row.status))}</td>
                    <td class="p-3 font-mono text-xs">${escapeHtml(row.slug || '')}</td>
                    <td class="p-3 text-xs text-slate-500">${escapeHtml(row.updated_at || '')}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        <a class="text-indigo-600 hover:underline" href="${escapeHtml(spaHref('/admin/summer-homework/' + id + '/view'))}" data-spa-nav="/admin/summer-homework/${id}/view">${escapeHtml(t('內容／答案', 'Content / answers'))}</a>
                        <a class="text-indigo-600 hover:underline ml-2" href="${escapeHtml(spaHref('/admin/summer-homework/' + id + '/preview'))}" data-spa-nav="/admin/summer-homework/${id}/preview">${escapeHtml(t('預覽', 'Preview'))}</a>
                        <a class="text-indigo-600 hover:underline ml-2" href="${escapeHtml(spaHref('/admin/summer-homework/' + id + '/analytics'))}" data-spa-nav="/admin/summer-homework/${id}/analytics">${escapeHtml(t('分析', 'Analytics'))}</a>
                        ${canManage ? `<a class="text-indigo-600 hover:underline ml-2" href="${escapeHtml(spaHref('/admin/summer-homework/' + id + '/edit'))}" data-spa-nav="/admin/summer-homework/${id}/edit">${escapeHtml(t('編輯', 'Edit'))}</a>` : ''}
                        ${canManage ? `<button type="button" class="text-red-600 hover:underline ml-2 sh-delete" data-id="${id}">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                    </td>
                </tr>`;
            }).join('');

            const dragHead = canReorder
                ? `<th class="p-3 w-10" aria-label="${escapeHtml(t('排序', 'Order'))}"></th>`
                : '';
            const emptyColspan = canReorder ? 11 : 10;

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    ${canCreate ? `<a href="${escapeHtml(spaHref('/admin/summer-homework/new'))}" data-spa-nav="/admin/summer-homework/new" class="text-sm rounded-lg bg-indigo-700 text-white px-3 py-1.5 font-semibold hover:bg-indigo-800">${escapeHtml(t('新增習作', 'New item'))}</a>` : ''}
                    ${global.ScienceApi.hasPermission('summer_homework.manage_any') ? `<a href="${escapeHtml(spaHref('/admin/review-queue'))}" data-spa-nav="/admin/review-queue" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('審核佇列', 'Review queue'))}</a>` : ''}
                    <button type="button" id="admin-sh-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('教師／管理員可檢視全部習作內容、答案與呈交分析；編輯限擁有者或管理員。', 'Teachers/admins can review all items; edit is limited to owners or admins.'))}${canReorder ? escapeHtml(t(' 可拖曳 ⠿ 調整次序；雙擊標題或截止日期快速修改。', ' Drag ⠿ to reorder; double-click title or due date to edit.')) : canCreate ? escapeHtml(t(' 雙擊標題或截止日期快速修改（限可管理項目）。', ' Double-click title or due date on items you manage.')) : ''}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                ${dragHead}
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
                        <tbody id="admin-sh-tbody">
                            ${rows || `<tr><td colspan="${emptyColspan}" class="p-6 text-slate-500 text-center">${escapeHtml(t('尚未建立暑期功課。', 'No summer homework yet.'))}${canCreate ? escapeHtml(t('請按「新增習作」。', ' Use “New item”.')) : ''}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;

            bindSpaNav(box);
            const flash = document.getElementById('admin-sh-flash');
            const tbody = document.getElementById('admin-sh-tbody');
            wireSummerSort(tbody, flash, canReorder);
            wireInlineEdits(box, flash);

            document.getElementById('admin-sh-reload')?.addEventListener('click', () => {
                void renderAdminSummerHomeworkList();
            });
            box.querySelectorAll('.sh-delete').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = Number(btn.getAttribute('data-id') || 0);
                    if (id <= 0) return;
                    if (!window.confirm(t('確定刪除此習作？', 'Delete this item?'))) return;
                    try {
                        await global.ScienceApi.apiFetch('/admin/summer-homework', {
                            method: 'DELETE',
                            body: { id },
                        });
                        await renderAdminSummerHomeworkList();
                    } catch (err) {
                        showFlash(flash, err.message || t('刪除失敗', 'Delete failed'), true);
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
