(function (global) {
    'use strict';

    function getDragAfterElement(container, y, itemSelector) {
        const els = Array.prototype.slice.call(container.querySelectorAll(itemSelector + ':not(.dragging)'));
        return els.reduce(function (closest, child) {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: undefined }).element;
    }

    function wireVerticalSort(container, itemSelector, handleSelector, persist) {
        if (!container) return;
        let dragged = null;

        container.addEventListener('dragenter', function (e) {
            e.preventDefault();
        });
        container.addEventListener('dragover', function (e) {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }
            if (!dragged) return;
            const after = getDragAfterElement(container, e.clientY, itemSelector);
            if (after == null) {
                container.appendChild(dragged);
            } else {
                container.insertBefore(dragged, after);
            }
        });
        container.addEventListener('drop', function (e) {
            e.preventDefault();
        });

        Array.prototype.forEach.call(container.querySelectorAll(itemSelector), function (row) {
            const handle = row.querySelector(handleSelector);
            if (!handle) return;

            function armSortRow() {
                row.setAttribute('draggable', 'true');
                row.dataset.sortArmed = '1';
            }

            handle.addEventListener('pointerdown', armSortRow);
            handle.addEventListener('mousedown', armSortRow);
            row.addEventListener('dragend', function () {
                row.removeAttribute('draggable');
                delete row.dataset.sortArmed;
                row.classList.remove('dragging', 'opacity-60');
                if (dragged === row) {
                    dragged = null;
                    persist(container);
                }
            });
            row.addEventListener('dragstart', function (e) {
                if (row.dataset.sortArmed !== '1') {
                    e.preventDefault();
                    return;
                }
                delete row.dataset.sortArmed;
                dragged = row;
                row.classList.add('dragging', 'opacity-60');
                e.dataTransfer.effectAllowed = 'move';
                try {
                    e.dataTransfer.setData('text/plain', 'sort');
                } catch (err) { /* ignore */ }
            });
        });
    }

    global.AdminListReorder = { wireVerticalSort };
})(window);
