(async function () {
    'use strict';

    await AdminApi.initSession();
    const flash = document.getElementById('flash');
    const subjectSelect = document.getElementById('subject-select');
    const topicList = document.getElementById('topic-list');
    const topicEmpty = document.getElementById('topic-empty');
    const topicEditor = document.getElementById('topic-editor');
    const itemsList = document.getElementById('items-list');
    const itemsEmpty = document.getElementById('items-empty');
    const editorTitle = document.getElementById('editor-topic-title');
    const addDialog = document.getElementById('add-dialog');
    const addType = document.getElementById('add-type');
    const addContent = document.getElementById('add-content');
    const TOPICS = window.CURRICULUM_TOPICS || {};
    const TYPE_LABELS = window.CURRICULUM_TYPE_LABELS || {};

    let currentTopicId = null;

    function showFlash(msg, isError) {
        flash.textContent = msg;
        flash.className = isError ? 'text-red-600 text-sm' : 'text-green-700 text-sm';
        flash.classList.remove('hidden');
        clearTimeout(flash._t);
        flash._t = setTimeout(function () { flash.classList.add('hidden'); }, 4000);
    }

    function renderTopics() {
        const sid = subjectSelect.value;
        const topics = TOPICS[sid] || [];
        topicList.innerHTML = topics.map(function (t, i) {
            const name = t.name_zh || t.name_en;
            return '<button type="button" class="topic-pick w-full text-left px-3 py-2 rounded-lg border border-transparent text-sm hover:bg-slate-50" data-topic-id="' + t.id + '" data-topic-name="' + name + '">' +
                '<span class="text-indigo-600 font-mono text-xs mr-2">' + (i + 1) + '.</span>' + name + '</button>';
        }).join('') || '<p class="text-slate-500 text-sm px-2">此科目尚無課題。</p>';
        topicList.querySelectorAll('.topic-pick').forEach(function (btn) {
            btn.onclick = function () { selectTopic(btn); };
        });
        currentTopicId = null;
        topicEditor.classList.add('hidden');
        topicEmpty.classList.remove('hidden');
    }

    function selectTopic(btn) {
        topicList.querySelectorAll('.topic-pick').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentTopicId = parseInt(btn.dataset.topicId, 10);
        editorTitle.textContent = btn.dataset.topicName || '';
        topicEmpty.classList.add('hidden');
        topicEditor.classList.remove('hidden');
        loadItems();
    }

    function itemRowHtml(it, idx) {
        const typeLabel = TYPE_LABELS[it.content_type] || it.content_type;
        const title = it.title_zh || it.title_en || '(無標題)';
        const missing = it.missing ? ' opacity-50' : '';
        return '<li class="item-row flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/50' + missing + '" data-item-id="' + it.id + '">' +
            '<span class="item-drag-handle cursor-grab text-slate-400 select-none" title="拖曳排序">☰</span>' +
            '<span class="item-order-num text-xs font-mono text-indigo-600 w-6">' + (idx + 1) + '</span>' +
            '<span class="type-badge">' + typeLabel + '</span>' +
            '<span class="flex-1 text-sm font-medium truncate">' + title + '</span>' +
            '<button type="button" class="text-red-600 text-xs hover:underline remove-btn" data-id="' + it.id + '">移除</button></li>';
    }

    async function loadItems() {
        if (!currentTopicId) return;
        try {
            const data = await AdminApi.apiFetch('/admin/topic-items/' + currentTopicId);
            const items = data.items || [];
            itemsList.innerHTML = items.map(itemRowHtml).join('');
            itemsEmpty.classList.toggle('hidden', items.length > 0);
            bindItemRows();
        } catch (e) {
            showFlash(e.message, true);
        }
    }

    function refreshOrderLabels() {
        itemsList.querySelectorAll('.item-row').forEach(function (row, index) {
            const label = row.querySelector('.item-order-num');
            if (label) label.textContent = String(index + 1);
        });
    }

    function bindItemRows() {
        itemsList.querySelectorAll('.remove-btn').forEach(function (btn) {
            btn.onclick = async function () {
                if (!confirm('移除此學習項目？')) return;
                try {
                    await AdminApi.apiFetch('/admin/topic-items', { method: 'POST', body: { action: 'remove', id: parseInt(btn.dataset.id, 10) } });
                    loadItems();
                } catch (e) { showFlash(e.message, true); }
            };
        });
        AdminListReorder.wireVerticalSort(itemsList, '.item-row', '.item-drag-handle', function () {
            persistOrder();
        });
    }

    async function persistOrder() {
        if (!currentTopicId) return;
        refreshOrderLabels();
        const order = Array.prototype.map.call(itemsList.querySelectorAll('.item-row'), function (r) {
            return parseInt(r.dataset.itemId, 10);
        }).filter(function (id) { return id > 0; });
        if (order.length === 0) return;
        try {
            await AdminApi.apiFetch('/admin/topic-items', {
                method: 'POST',
                body: { action: 'reorder', topic_id: currentTopicId, order: order },
            });
        } catch (e) { showFlash(e.message, true); }
    }

    async function loadAvailable() {
        if (!currentTopicId) return;
        const type = addType.value;
        addContent.innerHTML = '<option value="">載入中…</option>';
        try {
            const list = await AdminApi.apiFetch('/admin/topic-items/' + currentTopicId + '/available/' + encodeURIComponent(type));
            if (!list.length) {
                addContent.innerHTML = '<option value="">（無可加入的已發佈項目）</option>';
                return;
            }
            addContent.innerHTML = list.map(function (x) {
                return '<option value="' + x.id + '">' + (x.title_zh || x.title_en) + '</option>';
            }).join('');
        } catch (e) {
            addContent.innerHTML = '<option value="">載入失敗</option>';
        }
    }

    subjectSelect.onchange = renderTopics;
    document.getElementById('btn-import-all').onclick = async function () {
        if (!currentTopicId || !confirm('將此課題下所有已發佈內容依類型順序加入編排？已存在的項目不會重複。')) return;
        try {
            const r = await AdminApi.apiFetch('/admin/topic-items', { method: 'POST', body: { action: 'import_all', topic_id: currentTopicId } });
            showFlash('已加入 ' + (r.added || 0) + ' 項', false);
            loadItems();
        } catch (e) { showFlash(e.message, true); }
    };
    document.getElementById('btn-add-item').onclick = function () {
        if (!currentTopicId) return;
        loadAvailable();
        addDialog.showModal();
    };
    addType.onchange = loadAvailable;
    document.getElementById('add-cancel').onclick = function () { addDialog.close(); };
    document.getElementById('add-confirm').onclick = async function () {
        const contentId = parseInt(addContent.value, 10);
        if (!contentId) { showFlash('請選擇項目', true); return; }
        try {
            await AdminApi.apiFetch('/admin/topic-items', {
                method: 'POST',
                body: { topic_id: currentTopicId, content_type: addType.value, content_id: contentId },
            });
            addDialog.close();
            loadItems();
        } catch (e) { showFlash(e.message, true); }
    };

    renderTopics();
})();
