(async function () {
    'use strict';

    await AdminApi.initSession();
    const flash = document.getElementById('flash');

    function showFlash(msg, isError) {
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
            if (cell) cell.textContent = String(index);
        });
    }

    async function persistGroup(groupEl) {
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

    document.querySelectorAll('.note-sort-group').forEach(function (groupEl) {
        AdminListReorder.wireVerticalSort(groupEl, '.note-sort-item', '.note-drag-handle', function () {
            persistGroup(groupEl);
        });
    });
})();
