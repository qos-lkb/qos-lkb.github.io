(function () {
    'use strict';

    const STATUS_CYCLE = ['draft', 'pending_review', 'published'];
    const STATUS_LABELS = {
        draft: '草稿',
        pending_review: '待審核',
        published: '已發佈',
    };

    let flash = null;
    let apiReady = false;

    function showFlash(msg, isError) {
        if (!flash) flash = document.getElementById('flash');
        if (!flash) return;
        flash.textContent = msg;
        flash.className = isError ? 'text-red-600 text-sm' : 'text-green-700 text-sm';
        flash.classList.remove('hidden');
        clearTimeout(flash._t);
        flash._t = setTimeout(function () { flash.classList.add('hidden'); }, 4000);
    }

    function refreshSortLabels(groupEl) {
        groupEl.querySelectorAll('.note-sort-item').forEach(function (row, index) {
            const cell = row.querySelector('.note-sort-order');
            if (cell) cell.textContent = String(index + 1);
        });
    }

    async function patchNote(id, fields) {
        return AdminApi.apiFetch('/admin/learning-notes', {
            method: 'POST',
            body: Object.assign({ action: 'patch', id: id }, fields),
        });
    }

    function nextStatus(current) {
        const idx = STATUS_CYCLE.indexOf(current);
        const next = idx < 0 ? 0 : (idx + 1) % STATUS_CYCLE.length;
        return STATUS_CYCLE[next];
    }

    function applyStatusView(el, status) {
        el.dataset.status = status;
        el.textContent = STATUS_LABELS[status] || status;
    }

    function enterRowEdit(row, field) {
        if (row.dataset.editing) return;
        row.dataset.editing = field;
        row.classList.add('note-row-editing');
        const input = row.querySelector(field === 'title' ? '.note-title-input' : '.note-slug-input');
        if (!input) return;
        input.value = (field === 'title'
            ? row.querySelector('.note-title-view')
            : row.querySelector('.note-slug-view')
        ).textContent.trim();
        row.dataset.origValue = input.value;
        window.requestAnimationFrame(function () {
            input.focus();
            input.select();
        });
    }

    function leaveRowEdit(row) {
        row.classList.remove('note-row-editing');
        delete row.dataset.editing;
        delete row.dataset.origValue;
    }

    async function saveInlineField(row, field) {
        if (!apiReady) return;
        const id = parseInt(row.getAttribute('data-note-id'), 10);
        const input = row.querySelector(field === 'title' ? '.note-title-input' : '.note-slug-input');
        const view = row.querySelector(field === 'title' ? '.note-title-view' : '.note-slug-view');
        if (!input || !view || !id) {
            leaveRowEdit(row);
            return;
        }
        const value = input.value.trim();
        const orig = (row.dataset.origValue || '').trim();
        if (value === orig) {
            leaveRowEdit(row);
            return;
        }
        if (value === '') {
            showFlash(field === 'title' ? '標題不可為空' : 'slug 不可為空', true);
            input.focus();
            return;
        }
        try {
            const payload = field === 'title' ? { title_zh: value } : { slug: value };
            const saved = await patchNote(id, payload);
            if (field === 'title') {
                view.textContent = saved.title_zh || value;
                input.value = view.textContent;
            } else {
                view.textContent = saved.slug || value;
                input.value = view.textContent;
            }
            showFlash('已儲存', false);
        } catch (e) {
            showFlash(e.message || '儲存失敗', true);
            input.value = orig;
        }
        leaveRowEdit(row);
    }

    function wireInlineEdit(row) {
        const titleView = row.querySelector('.note-title-view');
        const slugView = row.querySelector('.note-slug-view');
        const titleInput = row.querySelector('.note-title-input');
        const slugInput = row.querySelector('.note-slug-input');
        const statusView = row.querySelector('.note-status-view');

        if (titleView) {
            titleView.addEventListener('dblclick', function (e) {
                e.preventDefault();
                enterRowEdit(row, 'title');
            });
        }
        if (slugView) {
            slugView.addEventListener('dblclick', function (e) {
                e.preventDefault();
                enterRowEdit(row, 'slug');
            });
        }

        [titleInput, slugInput].forEach(function (input) {
            if (!input) return;
            const field = input.classList.contains('note-title-input') ? 'title' : 'slug';
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    input.value = row.dataset.origValue || '';
                    leaveRowEdit(row);
                }
            });
            input.addEventListener('blur', function () {
                if (row.dataset.editing === field) {
                    saveInlineField(row, field);
                }
            });
        });

        if (statusView) {
            statusView.addEventListener('dblclick', async function (e) {
                e.preventDefault();
                if (!apiReady) return;
                const id = parseInt(row.getAttribute('data-note-id'), 10);
                if (!id) return;
                const current = statusView.dataset.status || 'draft';
                const next = nextStatus(current);
                if (next === current) return;
                try {
                    const saved = await patchNote(id, { status: next });
                    applyStatusView(statusView, saved.status || next);
                    showFlash('狀態已更新', false);
                } catch (err) {
                    showFlash(err.message || '狀態更新失敗', true);
                }
            });
        }
    }

    async function persistGroup(groupEl) {
        if (!apiReady) return;
        refreshSortLabels(groupEl);

        const subjectRaw = groupEl.getAttribute('data-subject-id');
        const topicRaw = groupEl.getAttribute('data-topic-id');
        const order = Array.prototype.map.call(groupEl.querySelectorAll('.note-sort-item'), function (row) {
            return parseInt(row.getAttribute('data-note-id'), 10);
        }).filter(function (id) { return id > 0; });

        if (order.length === 0) return;

        try {
            await AdminApi.apiFetch('/admin/learning-notes', {
                method: 'POST',
                body: {
                    action: 'reorder',
                    subject_id: subjectRaw !== '' ? parseInt(subjectRaw, 10) : null,
                    topic_id: topicRaw !== '' ? parseInt(topicRaw, 10) : null,
                    order: order,
                },
            });
            refreshSortLabels(groupEl);
        } catch (e) {
            showFlash(e.message || '排序儲存失敗', true);
        }
    }

    function initInteractiveFeatures() {
        document.querySelectorAll('.note-sort-item').forEach(wireInlineEdit);
        document.querySelectorAll('.note-sort-group').forEach(function (groupEl) {
            AdminListReorder.wireVerticalSort(groupEl, '.note-sort-item', '.note-drag-handle', function () {
                persistGroup(groupEl);
            });
        });
    }

    (async function () {
        try {
            await AdminApi.initSession();
            apiReady = true;
        } catch (e) {
            showFlash(e.message || '無法連線 API，部分功能可能無法使用。', true);
        }
        initInteractiveFeatures();
    })();
})();
