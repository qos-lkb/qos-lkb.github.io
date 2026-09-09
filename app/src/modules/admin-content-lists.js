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
            || api.hasPermission('flashcard_set.manage_any')
            || api.hasPermission('summer_homework.manage_any');
    }

    async function loadSubjectTopicLabels() {
        const subjects = {};
        const topics = {};
        const subjectList = [];
        const topicsBySubject = {};
        try {
            let list;
            try {
                list = await global.ScienceApi.apiFetch('/admin/subjects');
            } catch (_err) {
                list = await global.ScienceApi.apiFetch('/subjects');
            }
            (Array.isArray(list) ? list : []).forEach((s) => {
                const sid = Number(s.id);
                subjects[sid] = s.name_zh || s.name_en || ('#' + s.id);
                subjectList.push(s);
                topicsBySubject[sid] = s.topics || [];
                (s.topics || []).forEach((tp) => {
                    topics[Number(tp.id)] = tp.name_zh || tp.name_en || ('#' + tp.id);
                });
            });
        } catch (e) { /* ignore */ }
        return { subjects, topics, subjectList, topicsBySubject };
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

    const simListFilters = { subjectId: '', ownerId: '' };

    function showContentFlash(flash, msg, isError) {
        if (!flash) return;
        flash.textContent = msg;
        flash.classList.remove('hidden');
        flash.className = 'text-sm mb-3 rounded-lg px-3 py-2 border '
            + (isError ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200');
    }

    function ownerLabel(row) {
        const name = String(row.owner_display_name || '').trim();
        const email = String(row.owner_email || '').trim();
        if (name && email) return name + ' · ' + email;
        return name || email || (row.owner_user_id ? '#' + row.owner_user_id : '—');
    }

    function collectSimOwners(items) {
        const seen = {};
        const owners = [];
        items.forEach((row) => {
            const id = Number(row.owner_user_id || 0);
            if (id <= 0 || seen[id]) return;
            seen[id] = true;
            owners.push({
                id,
                label: ownerLabel(row),
            });
        });
        owners.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
        return owners;
    }

    function assignableOwnerLabel(user) {
        return ownerLabel({
            owner_display_name: user.display_name,
            owner_email: user.email,
            owner_user_id: user.id,
        });
    }

    function assignableOwnerChoices(assignable) {
        const owners = (assignable || []).map((u) => ({
            id: Number(u.id),
            label: assignableOwnerLabel(u),
        })).filter((o) => o.id > 0);
        owners.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
        return owners;
    }

    function ownerChoicesForRow(choices, rowEl) {
        const list = (choices || []).slice();
        const currentId = Number(rowEl?.getAttribute('data-owner-id') || 0);
        if (currentId > 0 && !list.some((o) => o.id === currentId)) {
            const cell = rowEl.querySelector('.sim-owner-cell');
            list.unshift({
                id: currentId,
                label: (cell && cell.textContent.trim()) || ('#' + currentId),
            });
        }
        return list;
    }

    function ownerOptionsHtml(owners) {
        return owners.map((o) =>
            `<option value="${o.id}">${escapeHtml(o.label)}</option>`
        ).join('');
    }

    function subjectLabel(ctx, subjectId) {
        const id = Number(subjectId || 0);
        if (id <= 0) return '—';
        return ctx.subjects[id] || ('#' + id);
    }

    function topicLabel(ctx, topicId) {
        const id = Number(topicId || 0);
        if (id <= 0) return '—';
        return ctx.topics[id] || ('#' + id);
    }

    function collectSimRowOrder(tbody) {
        return Array.from(tbody.querySelectorAll('.sim-item-row'))
            .map((row) => Number(row.getAttribute('data-id') || 0))
            .filter((id) => id > 0);
    }

    function wireSimSort(tbody, flash, canReorder) {
        if (!canReorder || !tbody) return;
        let dragged = null;

        function dragAfter(y) {
            const els = Array.prototype.slice.call(tbody.querySelectorAll('.sim-item-row:not(.dragging)'));
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

        tbody.querySelectorAll('.sim-item-row').forEach((row) => {
            const handle = row.querySelector('.sim-drag-handle');
            if (!handle) return;
            handle.addEventListener('mousedown', () => {
                row.setAttribute('draggable', 'true');
            });
            row.addEventListener('dragend', async () => {
                row.removeAttribute('draggable');
                row.classList.remove('dragging', 'opacity-60');
                if (dragged === row) dragged = null;
                try {
                    await global.ScienceApi.apiFetch('/admin/simulations', {
                        method: 'POST',
                        body: { action: 'reorder', order: collectSimRowOrder(tbody) },
                    });
                    showContentFlash(flash, t('已更新排序。', 'Order updated.'), false);
                } catch (err) {
                    showContentFlash(flash, err.message || t('儲存排序失敗', 'Failed to save order'), true);
                    void renderAdminSimulationsList();
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

    function beginInlineSelect(cell, optionsHtml, currentValue, onSave) {
        if (!cell || cell.querySelector('select')) return;
        const originalHtml = cell.innerHTML;
        cell.classList.add('bg-indigo-50/60');
        const select = document.createElement('select');
        select.className = 'w-full min-w-[8rem] border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';
        select.innerHTML = optionsHtml;
        select.value = currentValue == null || currentValue === '' ? '' : String(currentValue);
        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();

        let closed = false;
        async function finish(save) {
            if (closed) return;
            closed = true;
            if (!save) {
                cell.innerHTML = originalHtml;
                cell.classList.remove('bg-indigo-50/60');
                return;
            }
            try {
                await onSave(select.value);
            } catch (_err) {
                cell.innerHTML = originalHtml;
                cell.classList.remove('bg-indigo-50/60');
            }
        }

        select.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                void finish(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                void finish(false);
            }
        });
        select.addEventListener('change', () => {
            void finish(true);
        });
        select.addEventListener('blur', () => {
            window.setTimeout(() => void finish(true), 0);
        });
    }

    function subjectOptionsHtml(subjectList) {
        const opts = [`<option value="">—</option>`];
        subjectList.forEach((s) => {
            opts.push(`<option value="${Number(s.id)}">${escapeHtml(s.name_zh || s.name_en || ('#' + s.id))}</option>`);
        });
        return opts.join('');
    }

    function topicOptionsHtml(topicsBySubject, subjectId) {
        const opts = [`<option value="">—</option>`];
        (topicsBySubject[Number(subjectId)] || []).forEach((tp) => {
            opts.push(`<option value="${Number(tp.id)}">${escapeHtml(tp.name_zh || tp.name_en || ('#' + tp.id))}</option>`);
        });
        return opts.join('');
    }

    function wireSimInlineClassification(box, flash, ctx) {
        box.querySelectorAll('.sim-subject-cell[data-editable="1"]').forEach((cell) => {
            cell.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const rowEl = cell.closest('.sim-item-row');
                const id = Number(rowEl?.getAttribute('data-id') || 0);
                if (id <= 0) return;
                const current = rowEl.getAttribute('data-subject-id') || '';
                beginInlineSelect(cell, subjectOptionsHtml(ctx.subjectList || []), current, async (next) => {
                    const subjectId = next === '' ? null : Number(next);
                    let topicId = Number(rowEl.getAttribute('data-topic-id') || 0) || null;
                    const allowed = (ctx.topicsBySubject[Number(subjectId)] || []).some((tp) => Number(tp.id) === Number(topicId));
                    if (!allowed) topicId = null;
                    const updated = await global.ScienceApi.apiFetch('/admin/simulations', {
                        method: 'POST',
                        body: { action: 'patch', id, subject_id: subjectId, topic_id: topicId },
                    });
                    rowEl.setAttribute('data-subject-id', updated.subject_id || '');
                    rowEl.setAttribute('data-topic-id', updated.topic_id || '');
                    cell.textContent = subjectLabel(ctx, updated.subject_id);
                    cell.classList.remove('bg-indigo-50/60');
                    const topicCell = rowEl.querySelector('.sim-topic-cell');
                    if (topicCell && !topicCell.querySelector('select')) {
                        topicCell.textContent = topicLabel(ctx, updated.topic_id);
                    }
                    if (simListFilters.subjectId !== '' && String(updated.subject_id || '') !== simListFilters.subjectId) {
                        rowEl.remove();
                    }
                    showContentFlash(flash, t('已更新科目。', 'Subject updated.'), false);
                });
            });
        });

        box.querySelectorAll('.sim-topic-cell[data-editable="1"]').forEach((cell) => {
            cell.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const rowEl = cell.closest('.sim-item-row');
                const id = Number(rowEl?.getAttribute('data-id') || 0);
                if (id <= 0) return;
                const subjectId = Number(rowEl.getAttribute('data-subject-id') || 0);
                if (subjectId <= 0) {
                    showContentFlash(flash, t('請先雙擊設定科目。', 'Set a subject first.'), true);
                    return;
                }
                const current = rowEl.getAttribute('data-topic-id') || '';
                beginInlineSelect(cell, topicOptionsHtml(ctx.topicsBySubject || {}, subjectId), current, async (next) => {
                    const topicId = next === '' ? null : Number(next);
                    const updated = await global.ScienceApi.apiFetch('/admin/simulations', {
                        method: 'POST',
                        body: { action: 'patch', id, subject_id: subjectId, topic_id: topicId },
                    });
                    rowEl.setAttribute('data-topic-id', updated.topic_id || '');
                    cell.textContent = topicLabel(ctx, updated.topic_id);
                    cell.classList.remove('bg-indigo-50/60');
                    showContentFlash(flash, t('已更新單元。', 'Topic updated.'), false);
                });
            });
        });

        box.querySelectorAll('.sim-owner-cell[data-editable="1"]').forEach((cell) => {
            cell.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const rowEl = cell.closest('.sim-item-row');
                const id = Number(rowEl?.getAttribute('data-id') || 0);
                if (id <= 0) return;
                const current = rowEl.getAttribute('data-owner-id') || '';
                const options = ownerOptionsHtml(ownerChoicesForRow(ctx.ownerChoices || [], rowEl));
                if (!options) {
                    showContentFlash(flash, t('沒有可選的擁有者。', 'No owners available.'), true);
                    return;
                }
                beginInlineSelect(cell, options, current, async (next) => {
                    const ownerUserId = Number(next || 0);
                    if (ownerUserId <= 0) {
                        throw new Error('empty');
                    }
                    const updated = await global.ScienceApi.apiFetch('/admin/simulations', {
                        method: 'POST',
                        body: { action: 'patch', id, owner_user_id: ownerUserId },
                    });
                    rowEl.setAttribute('data-owner-id', updated.owner_user_id || '');
                    cell.textContent = ownerLabel(updated);
                    cell.classList.remove('bg-indigo-50/60');
                    if (simListFilters.ownerId !== '' && String(updated.owner_user_id || '') !== simListFilters.ownerId) {
                        rowEl.remove();
                    }
                    showContentFlash(flash, t('已更新擁有者。', 'Owner updated.'), false);
                });
            });
        });
    }

    async function renderAdminSimulationsList() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('模擬程式', 'Simulations');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!canAnyOrOwn('simulation.manage_any', 'simulation.manage_own')) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        try {
            const ctx = await loadSubjectTopicLabels();
            const canAny = global.ScienceApi.hasPermission('simulation.manage_any');
            const [list, assignable] = await Promise.all([
                global.ScienceApi.apiFetch('/admin/simulations'),
                canAny
                    ? global.ScienceApi.apiFetch('/admin/simulations?assignable_owners=1').catch(() => [])
                    : Promise.resolve([]),
            ]);
            const items = Array.isArray(list) ? list : [];
            const ownersFromList = collectSimOwners(items);
            ctx.ownerChoices = assignableOwnerChoices(Array.isArray(assignable) ? assignable : []);
            const owners = ownersFromList;
            const showReview = canReviewQueue();

            const filtered = items.filter((row) => {
                if (simListFilters.subjectId !== '') {
                    if (String(row.subject_id || '') !== simListFilters.subjectId) return false;
                }
                if (simListFilters.ownerId !== '') {
                    if (String(row.owner_user_id || '') !== simListFilters.ownerId) return false;
                }
                return true;
            });

            const canReorder = filtered.length > 0 && (
                canAny || filtered.every((row) => canManageRow(row, 'simulation.manage_any'))
            );

            const rows = filtered.map((row) => {
                const id = Number(row.id);
                const canManage = canManageRow(row, 'simulation.manage_any');
                const slug = row.slug || '';
                const editHref = spaHref(`/admin/simulations/${id}/edit`);
                const previewHref = spaHref('/simulation/' + encodeURIComponent(slug));
                const dragCell = canReorder
                    ? `<td class="p-3 w-10 text-slate-400">
                        <span class="sim-drag-handle cursor-grab select-none hover:text-slate-600" title="${escapeHtml(t('拖曳排序', 'Drag to reorder'))}" aria-label="${escapeHtml(t('拖曳排序', 'Drag to reorder'))}">⠿</span>
                       </td>`
                    : '';
                const editable = canManage ? '1' : '0';
                const ownerEditable = canAny ? '1' : '0';
                return `<tr class="sim-item-row border-t border-slate-100 hover:bg-slate-50/80" data-id="${id}" data-subject-id="${escapeHtml(row.subject_id || '')}" data-topic-id="${escapeHtml(row.topic_id || '')}" data-owner-id="${escapeHtml(row.owner_user_id || '')}">
                    ${dragCell}
                    <td class="p-3">${escapeHtml(row.title_zh || row.title_en || '—')}</td>
                    <td class="p-3 font-mono text-xs">${escapeHtml(slug)}</td>
                    <td class="p-3 sim-subject-cell ${canManage ? 'cursor-pointer' : ''}" data-editable="${editable}" title="${canManage ? escapeHtml(t('雙擊選擇科目', 'Double-click to choose subject')) : ''}">${escapeHtml(subjectLabel(ctx, row.subject_id))}</td>
                    <td class="p-3 sim-topic-cell ${canManage ? 'cursor-pointer' : ''}" data-editable="${editable}" title="${canManage ? escapeHtml(t('雙擊選擇單元', 'Double-click to choose topic')) : ''}">${escapeHtml(topicLabel(ctx, row.topic_id))}</td>
                    <td class="p-3 text-xs sim-owner-cell ${canAny ? 'cursor-pointer' : ''}" data-editable="${ownerEditable}" title="${canAny ? escapeHtml(t('雙擊選擇擁有者', 'Double-click to choose owner')) : ''}">${escapeHtml(ownerLabel(row))}</td>
                    <td class="p-3">${escapeHtml(statusLabel(row.status))}</td>
                    <td class="p-3 text-xs">${escapeHtml(row.updated_at || '')}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        ${canManage ? `<a href="${escapeHtml(editHref)}" data-spa-nav="/admin/simulations/${id}/edit" class="text-indigo-600 hover:underline">${escapeHtml(t('編輯', 'Edit'))}</a>` : ''}
                        <a href="${escapeHtml(previewHref)}" class="text-slate-600 hover:underline ml-2" target="_blank" rel="noopener">${escapeHtml(t('預覽', 'Preview'))}</a>
                        ${canManage ? `<button type="button" class="text-red-600 hover:underline ml-2 content-delete" data-id="${id}">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                    </td>
                </tr>`;
            }).join('');

            const dragHead = canReorder
                ? `<th class="p-3 w-10" aria-label="${escapeHtml(t('排序', 'Order'))}"></th>`
                : '';
            const colSpan = canReorder ? 9 : 8;
            const newHref = spaHref('/admin/simulations/new');
            const subjectFilterOpts = [`<option value="">${escapeHtml(t('全部科目', 'All subjects'))}</option>`]
                .concat((ctx.subjectList || []).map((s) =>
                    `<option value="${Number(s.id)}" ${simListFilters.subjectId === String(s.id) ? 'selected' : ''}>${escapeHtml(s.name_zh || s.name_en || ('#' + s.id))}</option>`
                ));
            const ownerFilterOpts = [`<option value="">${escapeHtml(t('全部擁有者', 'All owners'))}</option>`]
                .concat(owners.map((o) =>
                    `<option value="${o.id}" ${simListFilters.ownerId === String(o.id) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
                ));

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <a href="${escapeHtml(newHref)}" data-spa-nav="/admin/simulations/new" class="text-sm rounded-lg bg-indigo-700 text-white px-3 py-1.5 font-semibold hover:bg-indigo-800">${escapeHtml(t('新增', 'New'))}</a>
                    ${showReview ? `<a href="${escapeHtml(spaHref('/admin/review-queue'))}" data-spa-nav="/admin/review-queue" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('審核佇列', 'Review queue'))}</a>` : ''}
                    <label class="text-sm text-slate-600 flex items-center gap-2">
                        <span>${escapeHtml(t('科目', 'Subject'))}</span>
                        <select id="sim-filter-subject" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white">${subjectFilterOpts.join('')}</select>
                    </label>
                    <label class="text-sm text-slate-600 flex items-center gap-2">
                        <span>${escapeHtml(t('擁有者', 'Owner'))}</span>
                        <select id="sim-filter-owner" class="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white">${ownerFilterOpts.join('')}</select>
                    </label>
                    <button type="button" id="content-list-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('可依科目或擁有者篩選。拖曳 ⠿ 調整目前列表次序；雙擊科目、單元或擁有者可快速修改。擁有者限管理員或教師。', 'Filter by subject or owner. Drag ⠿ to reorder; double-click subject, topic, or owner to edit. Owners must be admins or teachers.'))}</p>
                <p id="content-list-flash" class="text-sm mb-3 hidden"></p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                ${dragHead}
                                <th class="p-3">${escapeHtml(t('標題', 'Title'))}</th>
                                <th class="p-3">slug</th>
                                <th class="p-3">${escapeHtml(t('科目', 'Subject'))}</th>
                                <th class="p-3">${escapeHtml(t('單元', 'Topic'))}</th>
                                <th class="p-3">${escapeHtml(t('擁有者', 'Owner'))}</th>
                                <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                                <th class="p-3">${escapeHtml(t('更新', 'Updated'))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody id="admin-sim-tbody">
                            ${rows || `<tr><td colspan="${colSpan}" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無符合的模擬程式。', 'No matching simulations.'))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;

            bindSpaNav(box);
            const flash = document.getElementById('content-list-flash');
            const tbody = document.getElementById('admin-sim-tbody');
            wireSimSort(tbody, flash, canReorder);
            wireSimInlineClassification(box, flash, ctx);

            document.getElementById('sim-filter-subject')?.addEventListener('change', (e) => {
                simListFilters.subjectId = e.target.value || '';
                void renderAdminSimulationsList();
            });
            document.getElementById('sim-filter-owner')?.addEventListener('change', (e) => {
                simListFilters.ownerId = e.target.value || '';
                void renderAdminSimulationsList();
            });
            document.getElementById('content-list-reload')?.addEventListener('click', () => {
                void renderAdminSimulationsList();
            });
            box.querySelectorAll('.content-delete').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = Number(btn.getAttribute('data-id') || 0);
                    if (id <= 0) return;
                    if (!window.confirm(t('確定刪除此項目？', 'Delete this item?'))) return;
                    try {
                        await global.ScienceApi.apiFetch('/admin/simulations', {
                            method: 'DELETE',
                            body: { id },
                        });
                        await renderAdminSimulationsList();
                    } catch (err) {
                        showContentFlash(flash, err.message || t('刪除失敗', 'Delete failed'), true);
                    }
                });
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
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

    async function renderAdminFlashcardSetsList() {
        const canAny = global.ScienceApi.hasPermission('flashcard_set.manage_any');
        await renderContentList({
            titleZh: canAny ? '閃卡組' : '我的閃卡組',
            titleEn: canAny ? 'Flashcard sets' : 'My flashcard sets',
            anyPerm: 'flashcard_set.manage_any',
            ownPerm: 'flashcard_set.manage_own',
            listPath: '/admin/flashcard-sets',
            deletePath: '/admin/flashcard-sets',
            editSpaBase: '/admin/flashcard-sets',
            previewRoute: (slug) => '/flashcards/' + encodeURIComponent(slug),
            showReview: true,
            extraHeaders: [t('科目', 'Subject'), t('課題', 'Topic'), t('卡片數', 'Cards')],
            extraCells: (row) => [
                escapeHtml(row.subject_zh || row.subject_en || '—'),
                escapeHtml(row.topic_zh || row.topic_en || '—'),
                escapeHtml(String(row.card_count != null ? row.card_count : '—')),
            ],
            emptyZh: '尚無閃卡組。',
            emptyEn: 'No flashcard sets yet.',
            reload: renderAdminFlashcardSetsList,
        });
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminArticlesList,
        renderAdminLearningVideosList,
        renderAdminLearningNotesList,
        renderAdminSimulationsList,
        renderAdminQuestionBanksList,
        renderAdminFlashcardSetsList,
    });

export {};
