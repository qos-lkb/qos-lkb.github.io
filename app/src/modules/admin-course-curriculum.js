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

    const TYPE_LABELS = {
        note: () => t('學習筆記', 'Learning note'),
        simulation: () => t('模擬實驗', 'Simulation'),
        worksheet: () => t('工作紙', 'Worksheet'),
        article: () => t('科學文章', 'Article'),
        learning_tool: () => t('互動測驗', 'Quiz'),
        video: () => t('影片', 'Video'),
    };

    function canManageCurriculum() {
        const api = global.ScienceApi;
        if (!api || !api.getUser()) return false;
        return api.hasPermission('topic_item.manage_any') || api.hasPermission('user.manage');
    }

    function wireVerticalSort(container, itemSelector, handleSelector, persist) {
        if (!container) return;
        let dragged = null;

        function getDragAfterElement(y) {
            const els = Array.prototype.slice.call(container.querySelectorAll(itemSelector + ':not(.dragging)'));
            return els.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                }
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY, element: undefined }).element;
        }

        container.addEventListener('dragenter', (e) => e.preventDefault());
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            if (!dragged) return;
            const after = getDragAfterElement(e.clientY);
            if (after == null) container.appendChild(dragged);
            else container.insertBefore(dragged, after);
        });
        container.addEventListener('drop', (e) => e.preventDefault());

        container.querySelectorAll(itemSelector).forEach((row) => {
            const handle = row.querySelector(handleSelector);
            if (!handle) return;
            const arm = () => {
                row.setAttribute('draggable', 'true');
                row.dataset.sortArmed = '1';
            };
            handle.addEventListener('pointerdown', arm);
            handle.addEventListener('mousedown', arm);
            row.addEventListener('dragend', () => {
                row.removeAttribute('draggable');
                delete row.dataset.sortArmed;
                row.classList.remove('dragging', 'opacity-60');
                if (dragged === row) {
                    dragged = null;
                    persist();
                }
            });
            row.addEventListener('dragstart', (e) => {
                if (row.dataset.sortArmed !== '1') {
                    e.preventDefault();
                    return;
                }
                delete row.dataset.sortArmed;
                dragged = row;
                row.classList.add('dragging', 'opacity-60');
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', 'sort'); } catch (err) { /* ignore */ }
            });
        });
    }

    async function renderAdminCourseCurriculum() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('自學課程編排', 'Course curriculum');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!canManageCurriculum()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        let subjects = [];
        try {
            subjects = await global.ScienceApi.apiFetch('/admin/subjects');
            if (!Array.isArray(subjects)) subjects = [];
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
            return;
        }

        const typeOptions = Object.keys(TYPE_LABELS).map((k) =>
            `<option value="${escapeHtml(k)}">${escapeHtml(TYPE_LABELS[k]())}</option>`
        ).join('');

        box.innerHTML = `
            <style>
                .curriculum-layout{display:grid;grid-template-columns:280px 1fr;gap:1rem}
                @media(max-width:768px){.curriculum-layout{grid-template-columns:1fr}}
                .topic-pick.active{background:rgb(238 242 255);border-color:rgb(129 140 248)}
                .item-row.dragging{opacity:.6}
                .type-badge{font-size:10px;padding:2px 8px;border-radius:9999px;background:#e2e8f0;color:#475569}
            </style>
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                <a href="${escapeHtml(spaHref('/admin/subjects'))}" data-spa-nav="/admin/subjects" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('科目與單元', 'Subjects & topics'))}</a>
            </div>
            <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('為各課題安排混合學習內容的順序。學習者將依此順序在「自學課程」分頁學習。', 'Arrange mixed learning content per topic. Learners follow this order in Courses.'))}</p>
            <p id="curr-flash" class="text-sm mb-3 hidden"></p>
            <div class="curriculum-layout">
                <aside class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-fit">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(t('科目', 'Subject'))}</label>
                    <select id="curr-subject" class="w-full border rounded-lg px-3 py-2 mt-1 mb-4 text-sm">
                        ${subjects.map((s) => `<option value="${Number(s.id)}">${escapeHtml(s.name_zh || s.name_en || '')}</option>`).join('')}
                    </select>
                    <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">${escapeHtml(t('課題（學習順序）', 'Topics (order)'))}</div>
                    <div id="curr-topic-list" class="space-y-1 max-h-[60vh] overflow-y-auto"></div>
                </aside>
                <section class="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm min-h-[420px]">
                    <div id="curr-topic-empty" class="text-slate-500 text-sm py-12 text-center">${escapeHtml(t('請選擇課題以編排學習內容。', 'Select a topic to arrange content.'))}</div>
                    <div id="curr-topic-editor" class="hidden">
                        <div class="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                            <div>
                                <h2 id="curr-editor-title" class="text-lg font-bold text-slate-900"></h2>
                                <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('拖曳調整學習順序；僅已發佈內容會顯示給學習者。', 'Drag to reorder; only published items are shown to learners.'))}</p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button type="button" id="curr-import-all" class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">${escapeHtml(t('從課題匯入全部', 'Import all from topic'))}</button>
                                <button type="button" id="curr-add-item" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">${escapeHtml(t('加入內容', 'Add content'))}</button>
                            </div>
                        </div>
                        <ul id="curr-items-list" class="space-y-2"></ul>
                        <p id="curr-items-empty" class="text-slate-500 text-sm py-8 text-center hidden">${escapeHtml(t('此課題尚無編排項目。', 'No items in this topic yet.'))}</p>
                    </div>
                </section>
            </div>
            <dialog id="curr-add-dialog" class="rounded-xl border border-slate-200 p-0 w-full max-w-md shadow-xl backdrop:bg-slate-900/50">
                <form method="dialog" class="p-5 space-y-4">
                    <h3 class="font-bold text-lg">${escapeHtml(t('加入學習內容', 'Add learning content'))}</h3>
                    <div>
                        <label class="text-sm font-medium">${escapeHtml(t('內容類型', 'Content type'))}</label>
                        <select id="curr-add-type" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm">${typeOptions}</select>
                    </div>
                    <div>
                        <label class="text-sm font-medium">${escapeHtml(t('選擇項目', 'Choose item'))}</label>
                        <select id="curr-add-content" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm"><option value="">${escapeHtml(t('載入中…', 'Loading…'))}</option></select>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" id="curr-add-cancel" class="px-3 py-1.5 text-sm border rounded-lg">${escapeHtml(t('取消', 'Cancel'))}</button>
                        <button type="button" id="curr-add-confirm" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg">${escapeHtml(t('加入', 'Add'))}</button>
                    </div>
                </form>
            </dialog>`;

        box.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });

        const flash = document.getElementById('curr-flash');
        const subjectSelect = document.getElementById('curr-subject');
        const topicList = document.getElementById('curr-topic-list');
        const topicEmpty = document.getElementById('curr-topic-empty');
        const topicEditor = document.getElementById('curr-topic-editor');
        const itemsList = document.getElementById('curr-items-list');
        const itemsEmpty = document.getElementById('curr-items-empty');
        const editorTitle = document.getElementById('curr-editor-title');
        const addDialog = document.getElementById('curr-add-dialog');
        const addType = document.getElementById('curr-add-type');
        const addContent = document.getElementById('curr-add-content');

        let currentTopicId = null;

        function showFlash(msg, isError) {
            flash.textContent = msg;
            flash.className = isError ? 'text-sm mb-3 text-red-600' : 'text-sm mb-3 text-emerald-700';
            flash.classList.remove('hidden');
            clearTimeout(flash._t);
            flash._t = setTimeout(() => flash.classList.add('hidden'), 4000);
        }

        function topicsForSubject(sid) {
            const s = subjects.find((x) => Number(x.id) === Number(sid));
            return (s && s.topics) || [];
        }

        function renderTopics() {
            const topics = topicsForSubject(subjectSelect.value);
            topicList.innerHTML = topics.map((tp, i) => {
                const name = tp.name_zh || tp.name_en || '';
                return `<button type="button" class="topic-pick w-full text-left px-3 py-2 rounded-lg border border-transparent text-sm hover:bg-slate-50" data-topic-id="${Number(tp.id)}" data-topic-name="${escapeHtml(name)}">
                    <span class="text-indigo-600 font-mono text-xs mr-2">${i + 1}.</span>${escapeHtml(name)}
                </button>`;
            }).join('') || `<p class="text-slate-500 text-sm px-2">${escapeHtml(t('此科目尚無課題。', 'No topics in this subject.'))}</p>`;

            topicList.querySelectorAll('.topic-pick').forEach((btn) => {
                btn.addEventListener('click', () => selectTopic(btn));
            });
            currentTopicId = null;
            topicEditor.classList.add('hidden');
            topicEmpty.classList.remove('hidden');
        }

        function selectTopic(btn) {
            topicList.querySelectorAll('.topic-pick').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentTopicId = parseInt(btn.getAttribute('data-topic-id') || '0', 10);
            editorTitle.textContent = btn.getAttribute('data-topic-name') || '';
            topicEmpty.classList.add('hidden');
            topicEditor.classList.remove('hidden');
            void loadItems();
        }

        function itemRowHtml(it, idx) {
            const typeLabel = (TYPE_LABELS[it.content_type] && TYPE_LABELS[it.content_type]()) || it.content_type;
            const itemTitle = it.title_zh || it.title_en || t('(無標題)', '(Untitled)');
            const missing = it.missing ? ' opacity-50' : '';
            return `<li class="item-row flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/50${missing}" data-item-id="${Number(it.id)}">
                <span class="item-drag-handle cursor-grab text-slate-400 select-none" title="${escapeHtml(t('拖曳排序', 'Drag to sort'))}">☰</span>
                <span class="item-order-num text-xs font-mono text-indigo-600 w-6">${idx + 1}</span>
                <span class="type-badge">${escapeHtml(typeLabel)}</span>
                <span class="flex-1 text-sm font-medium truncate">${escapeHtml(itemTitle)}</span>
                <button type="button" class="text-red-600 text-xs hover:underline remove-btn" data-id="${Number(it.id)}">${escapeHtml(t('移除', 'Remove'))}</button>
            </li>`;
        }

        async function loadItems() {
            if (!currentTopicId) return;
            try {
                const data = await global.ScienceApi.apiFetch('/admin/topic-items/' + currentTopicId);
                const items = data.items || [];
                itemsList.innerHTML = items.map(itemRowHtml).join('');
                itemsEmpty.classList.toggle('hidden', items.length > 0);
                bindItemRows();
            } catch (e) {
                showFlash(e.message, true);
            }
        }

        function refreshOrderLabels() {
            itemsList.querySelectorAll('.item-row').forEach((row, index) => {
                const label = row.querySelector('.item-order-num');
                if (label) label.textContent = String(index + 1);
            });
        }

        function bindItemRows() {
            itemsList.querySelectorAll('.remove-btn').forEach((btn) => {
                btn.onclick = async () => {
                    if (!window.confirm(t('移除此學習項目？', 'Remove this item?'))) return;
                    try {
                        await global.ScienceApi.apiFetch('/admin/topic-items', {
                            method: 'POST',
                            body: { action: 'remove', id: parseInt(btn.getAttribute('data-id') || '0', 10) },
                        });
                        await loadItems();
                    } catch (e) {
                        showFlash(e.message, true);
                    }
                };
            });
            wireVerticalSort(itemsList, '.item-row', '.item-drag-handle', () => {
                void persistOrder();
            });
        }

        async function persistOrder() {
            if (!currentTopicId) return;
            refreshOrderLabels();
            const order = Array.prototype.map.call(itemsList.querySelectorAll('.item-row'), (r) =>
                parseInt(r.getAttribute('data-item-id') || '0', 10)
            ).filter((id) => id > 0);
            if (!order.length) return;
            try {
                await global.ScienceApi.apiFetch('/admin/topic-items', {
                    method: 'POST',
                    body: { action: 'reorder', topic_id: currentTopicId, order },
                });
            } catch (e) {
                showFlash(e.message, true);
            }
        }

        async function loadAvailable() {
            if (!currentTopicId) return;
            const type = addType.value;
            addContent.innerHTML = `<option value="">${escapeHtml(t('載入中…', 'Loading…'))}</option>`;
            try {
                const list = await global.ScienceApi.apiFetch(
                    '/admin/topic-items/' + currentTopicId + '/available/' + encodeURIComponent(type)
                );
                const rows = Array.isArray(list) ? list : [];
                if (!rows.length) {
                    addContent.innerHTML = `<option value="">${escapeHtml(t('（無可加入的已發佈項目）', '(No published items available)'))}</option>`;
                    return;
                }
                addContent.innerHTML = rows.map((x) =>
                    `<option value="${Number(x.id)}">${escapeHtml(x.title_zh || x.title_en || '')}</option>`
                ).join('');
            } catch (e) {
                addContent.innerHTML = `<option value="">${escapeHtml(t('載入失敗', 'Load failed'))}</option>`;
            }
        }

        subjectSelect.addEventListener('change', renderTopics);
        document.getElementById('curr-import-all').onclick = async () => {
            if (!currentTopicId || !window.confirm(t('將此課題下所有已發佈內容依類型順序加入編排？已存在的項目不會重複。', 'Import all published content for this topic? Existing items are skipped.'))) return;
            try {
                const r = await global.ScienceApi.apiFetch('/admin/topic-items', {
                    method: 'POST',
                    body: { action: 'import_all', topic_id: currentTopicId },
                });
                showFlash(t('已加入 ', 'Added ') + (r.added || 0) + t(' 項', ' item(s)'), false);
                await loadItems();
            } catch (e) {
                showFlash(e.message, true);
            }
        };
        document.getElementById('curr-add-item').onclick = () => {
            if (!currentTopicId) return;
            void loadAvailable();
            addDialog.showModal();
        };
        addType.onchange = () => { void loadAvailable(); };
        document.getElementById('curr-add-cancel').onclick = () => addDialog.close();
        document.getElementById('curr-add-confirm').onclick = async () => {
            const contentId = parseInt(addContent.value || '0', 10);
            if (!contentId) {
                showFlash(t('請選擇項目', 'Please choose an item'), true);
                return;
            }
            try {
                await global.ScienceApi.apiFetch('/admin/topic-items', {
                    method: 'POST',
                    body: {
                        topic_id: currentTopicId,
                        content_type: addType.value,
                        content_id: contentId,
                    },
                });
                addDialog.close();
                await loadItems();
            } catch (e) {
                showFlash(e.message, true);
            }
        };

        renderTopics();
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminCourseCurriculum,
    });

export {};
