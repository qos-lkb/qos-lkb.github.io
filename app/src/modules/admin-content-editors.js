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

    function escapeAttr(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    function requirePerm(anyPerm, ownPerm) {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        if (!global.ScienceApi.hasPermission(anyPerm) && !(ownPerm && global.ScienceApi.hasPermission(ownPerm))) {
            return false;
        }
        return true;
    }

    function statusOptions(includePending, includePublished) {
        let html = `<option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>`;
        if (includePending) {
            html += `<option value="pending_review">${escapeHtml(t('待審核', 'Pending review'))}</option>`;
        }
        if (includePublished) {
            html += `<option value="published">${escapeHtml(t('已發佈', 'Published'))}</option>`;
        }
        return html;
    }

    async function loadTopicsBySubject() {
        const map = {};
        const subjects = [];
        const list = await global.ScienceApi.apiFetch('/admin/subjects');
        (Array.isArray(list) ? list : []).forEach((s) => {
            subjects.push(s);
            map[Number(s.id)] = s.topics || [];
        });
        return { subjects, topicsBySubject: map };
    }

    function fillTopicSelect(topicEl, topicsBySubject, subjectId, selectedTopicId) {
        topicEl.innerHTML = `<option value="">—</option>`;
        (topicsBySubject[Number(subjectId)] || []).forEach((tp) => {
            const o = document.createElement('option');
            o.value = String(tp.id);
            o.textContent = tp.name_zh || tp.name_en || ('#' + tp.id);
            if (selectedTopicId && Number(tp.id) === Number(selectedTopicId)) o.selected = true;
            topicEl.appendChild(o);
        });
    }

    function wireSubjectTopic(subjectEl, topicEl, topicsBySubject, initialSubject, initialTopic) {
        subjectEl.addEventListener('change', () => {
            fillTopicSelect(topicEl, topicsBySubject, subjectEl.value, '');
        });
        if (initialSubject) {
            subjectEl.value = String(initialSubject);
            fillTopicSelect(topicEl, topicsBySubject, initialSubject, initialTopic || '');
        }
    }

    function blankQuestion() {
        return {
            stem_zh: '', stem_en: '', explanation_zh: '', explanation_en: '',
            options: [
                { text_zh: '', text_en: '', is_correct: true },
                { text_zh: '', text_en: '', is_correct: false },
                { text_zh: '', text_en: '', is_correct: false },
                { text_zh: '', text_en: '', is_correct: false },
            ],
        };
    }

    function renderQuestionBlock(q, index, container) {
        const div = document.createElement('div');
        div.className = 'border rounded-xl p-4 mb-4 bg-slate-50';
        div.innerHTML = `
            <div class="flex justify-between mb-2">
                <strong>${escapeHtml(t('第', 'Q'))} ${index + 1} ${escapeHtml(t('題', ''))}</strong>
                <button type="button" class="text-red-600 text-sm remove-q">${escapeHtml(t('移除', 'Remove'))}</button>
            </div>
            <label class="block text-sm mb-1">${escapeHtml(t('題幹（中）', 'Stem (ZH)'))}</label>
            <textarea class="stem-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeAttr(q.stem_zh)}</textarea>
            <label class="block text-sm mb-1">${escapeHtml(t('題幹（英）', 'Stem (EN)'))}</label>
            <textarea class="stem-en w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeAttr(q.stem_en)}</textarea>
            <div class="options space-y-2"></div>
            <label class="block text-sm mt-2 mb-1">${escapeHtml(t('解析（中）', 'Explanation (ZH)'))}</label>
            <textarea class="expl-zh w-full border rounded p-2 text-sm" rows="2">${escapeAttr(q.explanation_zh || '')}</textarea>
            <label class="block text-sm mt-2 mb-1">${escapeHtml(t('解析（英）', 'Explanation (EN)'))}</label>
            <textarea class="expl-en w-full border rounded p-2 text-sm" rows="2">${escapeAttr(q.explanation_en || '')}</textarea>`;
        const optContainer = div.querySelector('.options');
        (q.options || blankQuestion().options).forEach((o, i) => {
            const row = document.createElement('div');
            row.className = 'flex gap-2 items-start flex-wrap';
            row.innerHTML = `
                <span class="text-xs font-bold pt-2 w-4">${String.fromCharCode(65 + i)}</span>
                <input type="radio" name="correct-${index}" class="correct mt-2" ${o.is_correct ? 'checked' : ''}>
                <input class="opt-zh flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="${escapeAttr(t('選項（中）', 'Option ZH'))}" value="${escapeAttr(o.text_zh)}">
                <input class="opt-en flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="Option EN" value="${escapeAttr(o.text_en)}">`;
            optContainer.appendChild(row);
        });
        div.querySelector('.remove-q').onclick = () => div.remove();
        container.appendChild(div);
    }

    function collectQuestions(container) {
        return Array.from(container.querySelectorAll(':scope > div')).map((div, sort) => {
            const correctIdx = Array.from(div.querySelectorAll('.correct')).findIndex((r) => r.checked);
            const rows = div.querySelectorAll('.options > div');
            const options = Array.from(rows).map((row, i) => ({
                text_zh: row.querySelector('.opt-zh').value,
                text_en: row.querySelector('.opt-en').value,
                is_correct: i === correctIdx,
                sort_order: i,
            }));
            return {
                sort_order: sort,
                stem_zh: div.querySelector('.stem-zh').value,
                stem_en: div.querySelector('.stem-en').value,
                explanation_zh: div.querySelector('.expl-zh').value,
                explanation_en: div.querySelector('.expl-en').value,
                options,
            };
        });
    }

    async function mergeArticleAnswers(slug, questions) {
        try {
            const ans = await global.ScienceApi.apiFetch('/articles/' + encodeURIComponent(slug) + '/answers');
            const map = {};
            (ans.answers || []).forEach((a) => {
                map[a.question_id] = a.correct_option_index;
            });
            questions.forEach((q) => {
                const ci = map[q.id];
                if (ci !== undefined && q.options) {
                    q.options.forEach((o, i) => {
                        o.is_correct = i === ci;
                    });
                }
            });
        } catch (e) { /* draft may lack answers access */ }
        return questions;
    }

    function editorChrome(listRoute, listLabel) {
        return `
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${escapeHtml(spaHref(listRoute))}" data-spa-nav="${escapeHtml(listRoute)}" class="text-indigo-700 hover:underline">${escapeHtml(listLabel)}</a>
            </div>
            <p id="edit-flash" class="text-red-600 text-sm hidden mb-3"></p>`;
    }

    function showFlash(msg) {
        const flash = document.getElementById('edit-flash');
        if (!flash) return;
        flash.textContent = msg;
        flash.classList.remove('hidden');
    }

    async function findInAdminList(path, id) {
        const rows = await global.ScienceApi.apiFetch(path);
        const list = Array.isArray(rows) ? rows : (rows.items || []);
        return list.find((r) => Number(r.id) === Number(id)) || null;
    }

    async function renderAdminLearningVideoEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const editId = idArg ? Number(idArg) : 0;
        if (title) title.textContent = editId ? t('編輯學習影片', 'Edit video') : t('新增學習影片', 'New video');

        if (!requirePerm('learning_video.manage_any', 'learning_video.manage_own')) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `${editorChrome('/admin/learning-videos', t('← 返回列表', '← Back to list'))}<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        bindSpaNav(box);

        let topicsBySubject = {};
        let subjects = [];
        let row = null;
        try {
            const meta = await loadTopicsBySubject();
            subjects = meta.subjects;
            topicsBySubject = meta.topicsBySubject;
            if (editId) {
                row = await findInAdminList('/admin/learning-videos', editId);
                if (!row) throw new Error(t('找不到影片。', 'Video not found.'));
            }
        } catch (err) {
            box.innerHTML = `${editorChrome('/admin/learning-videos', t('← 返回列表', '← Back to list'))}<p class="text-red-600">${escapeHtml(err.message)}</p>`;
            bindSpaNav(box);
            return;
        }

        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml(s.name_zh || s.name_en)}</option>`
        ).join('');

        box.innerHTML = `
            ${editorChrome('/admin/learning-videos', t('← 返回列表', '← Back to list'))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${editId || ''}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（中）', 'Title (ZH)'))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（英）', 'Title (EN)'))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div>
                    <label class="text-sm font-medium">${escapeHtml(t('影片連結（中文版本）', 'Video URL (ZH)'))}</label>
                    <input id="source-url-zh" type="url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/watch?v=...">
                </div>
                <div>
                    <label class="text-sm font-medium">${escapeHtml(t('影片連結（英文版本）', 'Video URL (EN)'))}</label>
                    <input id="source-url-en" type="url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/watch?v=...">
                    <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('至少填寫其中一個語言版本。', 'Provide at least one language version.'))}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('科目', 'Subject'))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${subOpts}</select></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('課題', 'Topic'))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${escapeHtml(t('片長（分鐘，選填）', 'Duration (minutes)'))}</label><input type="number" id="duration" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('狀態', 'Status'))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${statusOptions(true, true)}</select></div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg">${escapeHtml(t('儲存', 'Save'))}</button>
                    ${editId ? `<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                </div>
            </form>`;
        bindSpaNav(box);

        const subjectEl = document.getElementById('subject-id');
        const topicEl = document.getElementById('topic-id');
        wireSubjectTopic(subjectEl, topicEl, topicsBySubject, row && row.subject_id, row && row.topic_id);

        if (row) {
            document.getElementById('title-zh').value = row.title_zh || '';
            document.getElementById('title-en').value = row.title_en || '';
            document.getElementById('slug').value = row.slug || '';
            document.getElementById('source-url-zh').value = row.embed_url_zh || row.embed_url || '';
            document.getElementById('source-url-en').value = row.embed_url_en || '';
            document.getElementById('status').value = row.status || 'draft';
            document.getElementById('duration').value = row.duration_minutes || '';
        }

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                source_url_zh: document.getElementById('source-url-zh').value,
                source_url_en: document.getElementById('source-url-en').value,
                subject_id: document.getElementById('subject-id').value || null,
                topic_id: document.getElementById('topic-id').value || null,
                duration_minutes: document.getElementById('duration').value || null,
                status: document.getElementById('status').value,
            };
            try {
                await global.ScienceApi.apiFetch('/admin/learning-videos', { method: 'POST', body: payload });
                global.AppRouter.navigate('/admin/learning-videos');
            } catch (err) {
                showFlash(err.message || t('儲存失敗', 'Save failed'));
            }
        };

        const delBtn = document.getElementById('btn-delete');
        if (delBtn) {
            delBtn.onclick = async () => {
                if (!confirm(t('確定刪除此影片？', 'Delete this video?'))) return;
                try {
                    await global.ScienceApi.apiFetch('/admin/learning-videos', { method: 'DELETE', body: { id: editId } });
                    global.AppRouter.navigate('/admin/learning-videos');
                } catch (err) {
                    showFlash(err.message || t('刪除失敗', 'Delete failed'));
                }
            };
        }
    }

    async function renderAdminArticleEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const editId = idArg ? Number(idArg) : 0;
        if (title) title.textContent = editId ? t('編輯文章', 'Edit article') : t('新增文章', 'New article');

        if (!requirePerm('article.manage_any', 'article.manage_own')) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `${editorChrome('/admin/articles', t('← 返回列表', '← Back to list'))}<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        bindSpaNav(box);

        let topicsBySubject = {};
        let subjects = [];
        let row = null;
        let questions = [];
        try {
            const meta = await loadTopicsBySubject();
            subjects = meta.subjects;
            topicsBySubject = meta.topicsBySubject;
            if (editId) {
                row = await findInAdminList('/admin/articles', editId);
                if (!row) throw new Error(t('找不到文章。', 'Article not found.'));
                const detail = await global.ScienceApi.apiFetch('/articles/' + encodeURIComponent(row.slug));
                questions = await mergeArticleAnswers(row.slug, detail.questions || []);
            }
        } catch (err) {
            box.innerHTML = `${editorChrome('/admin/articles', t('← 返回列表', '← Back to list'))}<p class="text-red-600">${escapeHtml(err.message)}</p>`;
            bindSpaNav(box);
            return;
        }

        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml(s.name_zh || s.name_en)}</option>`
        ).join('');

        box.innerHTML = `
            ${editorChrome('/admin/articles', t('← 返回列表', '← Back to list'))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${editId || ''}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（中）', 'Title (ZH)'))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（英）', 'Title (EN)'))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('內容（中，Markdown）', 'Body (ZH, Markdown)'))}</label><textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('內容（英，Markdown）', 'Body (EN, Markdown)'))}</label><textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('科目', 'Subject'))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${subOpts}</select></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('單元', 'Topic'))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${escapeHtml(t('閱讀時間（分鐘）', 'Reading time (min)'))}</label><input type="number" id="reading-time" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('狀態', 'Status'))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${statusOptions(true, true)}</select></div>
                <div>
                    <div class="flex justify-between mb-2">
                        <label class="text-sm font-medium">${escapeHtml(t('閱讀理解題（選填）', 'Comprehension questions'))}</label>
                        <button type="button" id="add-q" class="text-sm text-indigo-600">+ ${escapeHtml(t('新增', 'Add'))}</button>
                    </div>
                    <div id="questions"></div>
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg">${escapeHtml(t('儲存', 'Save'))}</button>
            </form>`;
        bindSpaNav(box);

        const qBox = document.getElementById('questions');
        document.getElementById('add-q').onclick = () => renderQuestionBlock(blankQuestion(), qBox.children.length, qBox);
        questions.forEach((q, i) => renderQuestionBlock(q, i, qBox));

        const subjectEl = document.getElementById('subject-id');
        const topicEl = document.getElementById('topic-id');
        wireSubjectTopic(subjectEl, topicEl, topicsBySubject, row && row.subject_id, row && row.topic_id);

        if (row) {
            document.getElementById('title-zh').value = row.title_zh || '';
            document.getElementById('title-en').value = row.title_en || '';
            document.getElementById('slug').value = row.slug || '';
            document.getElementById('body-zh').value = row.body_zh || '';
            document.getElementById('body-en').value = row.body_en || '';
            document.getElementById('status').value = row.status || 'draft';
            document.getElementById('reading-time').value = row.reading_time_minutes || '';
        }

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                body_zh: document.getElementById('body-zh').value,
                body_en: document.getElementById('body-en').value,
                subject_id: document.getElementById('subject-id').value || null,
                topic_id: document.getElementById('topic-id').value || null,
                reading_time_minutes: document.getElementById('reading-time').value || null,
                status: document.getElementById('status').value,
                questions: collectQuestions(qBox),
            };
            try {
                await global.ScienceApi.apiFetch('/admin/articles', { method: 'POST', body: payload });
                global.AppRouter.navigate('/admin/articles');
            } catch (err) {
                showFlash(err.message || t('儲存失敗', 'Save failed'));
            }
        };
    }

    async function renderAdminLearningNoteEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const editId = idArg ? Number(idArg) : 0;
        const canAny = global.ScienceApi.hasPermission('learning_note.manage_any');
        const canQb = global.ScienceApi.hasPermission('question_bank.manage_any')
            || global.ScienceApi.hasPermission('question_bank.manage_own');
        if (title) title.textContent = editId ? t('編輯學習筆記', 'Edit note') : t('新增學習筆記', 'New note');

        if (!requirePerm('learning_note.manage_any', 'learning_note.manage_own')) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `${editorChrome('/admin/learning-notes', t('← 返回列表', '← Back to list'))}<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        bindSpaNav(box);

        let topicsBySubject = {};
        let subjects = [];
        let row = null;
        try {
            const meta = await loadTopicsBySubject();
            subjects = meta.subjects;
            topicsBySubject = meta.topicsBySubject;
            if (editId) {
                row = await findInAdminList('/admin/learning-notes', editId);
                if (!row) throw new Error(t('找不到筆記。', 'Note not found.'));
            }
        } catch (err) {
            box.innerHTML = `${editorChrome('/admin/learning-notes', t('← 返回列表', '← Back to list'))}<p class="text-red-600">${escapeHtml(err.message)}</p>`;
            bindSpaNav(box);
            return;
        }

        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml(s.name_zh || s.name_en)}</option>`
        ).join('');

        box.innerHTML = `
            ${editorChrome('/admin/learning-notes', t('← 返回列表', '← Back to list'))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${editId || ''}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（中）', 'Title (ZH)'))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（英）', 'Title (EN)'))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div>
                    <label class="text-sm font-medium">${escapeHtml(t('內容（中，Markdown）', 'Body (ZH, Markdown)'))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-content-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ ${escapeHtml(t('影片', 'Video'))}</button>
                        <button type="button" data-content-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ ${escapeHtml(t('模擬', 'Sim'))}</button>
                        ${canQb ? `<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ ${escapeHtml(t('題庫題目', 'Question'))}</button>` : ''}
                    </div>
                    <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                    <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('可用 ::video / ::simulation / ::question 短碼嵌入內容；亦可用上方按鈕插入。', 'Use ::video / ::simulation / ::question shortcodes, or the buttons above.'))}</p>
                </div>
                <div>
                    <label class="text-sm font-medium">${escapeHtml(t('內容（英，Markdown）', 'Body (EN, Markdown)'))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-content-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Video</button>
                        <button type="button" data-content-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Sim</button>
                        ${canQb ? `<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ Question</button>` : ''}
                    </div>
                    <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('科目', 'Subject'))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${subOpts}</select></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('單元', 'Topic'))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${escapeHtml(t('閱讀時間（分鐘）', 'Reading time (min)'))}</label><input type="number" id="reading-time" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('排序', 'Sort order'))}</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('狀態', 'Status'))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${statusOptions(true, canAny)}</select></div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg">${escapeHtml(t('儲存', 'Save'))}</button>
                    ${editId ? `<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                </div>
            </form>`;
        bindSpaNav(box);

        if (global.AdminContentEmbed) {
            const tabs = canQb ? ['video', 'simulation', 'question'] : ['video', 'simulation'];
            global.AdminContentEmbed.init(['body-zh', 'body-en'], { tabs });
        }

        const subjectEl = document.getElementById('subject-id');
        const topicEl = document.getElementById('topic-id');
        wireSubjectTopic(subjectEl, topicEl, topicsBySubject, row && row.subject_id, row && row.topic_id);

        if (row) {
            document.getElementById('title-zh').value = row.title_zh || '';
            document.getElementById('title-en').value = row.title_en || '';
            document.getElementById('slug').value = row.slug || '';
            document.getElementById('body-zh').value = row.body_zh || '';
            document.getElementById('body-en').value = row.body_en || '';
            document.getElementById('status').value = row.status || 'draft';
            document.getElementById('reading-time').value = row.reading_time_minutes || '';
            document.getElementById('list-sort').value = row.list_sort_order || 0;
        }

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                body_zh: document.getElementById('body-zh').value,
                body_en: document.getElementById('body-en').value,
                subject_id: document.getElementById('subject-id').value || null,
                topic_id: document.getElementById('topic-id').value || null,
                reading_time_minutes: document.getElementById('reading-time').value || null,
                list_sort_order: parseInt(document.getElementById('list-sort').value, 10) || 0,
                status: document.getElementById('status').value,
            };
            try {
                await global.ScienceApi.apiFetch('/admin/learning-notes', { method: 'POST', body: payload });
                global.AppRouter.navigate('/admin/learning-notes');
            } catch (err) {
                showFlash(err.message || t('儲存失敗', 'Save failed'));
            }
        };

        const delBtn = document.getElementById('btn-delete');
        if (delBtn) {
            delBtn.onclick = async () => {
                if (!confirm(t('確定刪除此學習筆記？', 'Delete this note?'))) return;
                try {
                    await global.ScienceApi.apiFetch('/admin/learning-notes', { method: 'DELETE', body: { id: editId } });
                    global.AppRouter.navigate('/admin/learning-notes');
                } catch (err) {
                    showFlash(err.message || t('刪除失敗', 'Delete failed'));
                }
            };
        }
    }

    async function renderAdminSimulationEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const editId = idArg ? Number(idArg) : 0;
        const canAny = global.ScienceApi.hasPermission('simulation.manage_any');
        if (title) title.textContent = editId ? t('編輯模擬', 'Edit simulation') : t('新增模擬', 'New simulation');

        if (!requirePerm('simulation.manage_any', 'simulation.manage_own')) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `${editorChrome('/admin/simulations', t('← 返回列表', '← Back to list'))}<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        bindSpaNav(box);

        let topicsBySubject = {};
        let subjects = [];
        let row = null;
        let users = [];
        try {
            const meta = await loadTopicsBySubject();
            subjects = meta.subjects;
            topicsBySubject = meta.topicsBySubject;
            if (editId) {
                row = await global.ScienceApi.apiFetch('/admin/simulations?id=' + editId);
                if (!row || !row.id) throw new Error(t('找不到模擬。', 'Simulation not found.'));
            }
            if (canAny) {
                try {
                    const u = await global.ScienceApi.apiFetch('/admin/users');
                    users = Array.isArray(u) ? u : (u.users || u.items || []);
                } catch (e) {
                    users = [];
                }
            }
        } catch (err) {
            box.innerHTML = `${editorChrome('/admin/simulations', t('← 返回列表', '← Back to list'))}<p class="text-red-600">${escapeHtml(err.message)}</p>`;
            bindSpaNav(box);
            return;
        }

        const me = global.ScienceApi.getUser();
        const ownerId = row ? row.owner_user_id : (me && me.id);
        const tags = Array.isArray(row && row.tags) ? row.tags.join(', ') : '';
        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml((s.name_zh || '') + ' / ' + (s.name_en || ''))}</option>`
        ).join('');
        const userOpts = users.map((u) =>
            `<option value="${Number(u.id)}" ${Number(u.id) === Number(ownerId) ? 'selected' : ''}>${escapeHtml((u.email || '') + ' — ' + (u.display_name || ''))}</option>`
        ).join('');

        box.innerHTML = `
            ${editorChrome('/admin/simulations', t('← 返回列表', '← Back to list'))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" name="id" value="${editId || 0}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('中文標題', 'Title (ZH)'))}</label><input name="title_zh" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('英文標題', 'Title (EN)'))}</label><input name="title_en" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                </div>
                <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('網址 slug（留空則依標題自動產生）', 'Slug (auto from title if empty)'))}</label><input name="slug" class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"></div>
                ${canAny ? `<div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('擁有者', 'Owner'))}</label><select name="owner_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">${userOpts}</select></div>` : ''}
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('科目', 'Subject'))}</label><select name="subject_id" id="field-subject" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option>${subOpts}</select></div>
                    <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('單元（課題）', 'Topic'))}</label><select name="topic_id" id="field-topic" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option></select></div>
                </div>
                <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('列表排序', 'List sort'))}</label><input type="number" name="list_sort_order" min="0" step="1" class="mt-1 w-full border rounded-lg px-3 py-2 md:w-40" value="0"></div>
                <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('標籤（逗號分隔）', 'Tags (comma-separated)'))}</label><input name="tags" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('截圖路徑', 'Screenshot path'))}</label><input name="screenshot_path" class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"></div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('狀態', 'Status'))}</label>
                    <select name="status" class="mt-1 w-full border rounded-lg px-3 py-2 md:w-48">
                        <option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>
                        <option value="published">${escapeHtml(t('已發佈', 'Published'))}</option>
                    </select>
                    <p class="mt-1 text-xs text-slate-500">${escapeHtml(t('模擬為免審流程（僅草稿／已發佈）。', 'Simulations skip review (draft / published only).'))}</p>
                </div>
                <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('HTML 內容', 'HTML content'))}</label><textarea name="html" rows="16" required class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea></div>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">${escapeHtml(t('儲存', 'Save'))}</button>
            </form>`;
        bindSpaNav(box);

        const form = document.getElementById('edit-form');
        const subjectEl = document.getElementById('field-subject');
        const topicEl = document.getElementById('field-topic');
        wireSubjectTopic(subjectEl, topicEl, topicsBySubject, row && row.subject_id, row && row.topic_id);

        if (row) {
            form.title_zh.value = row.title_zh || '';
            form.title_en.value = row.title_en || '';
            form.slug.value = row.slug || '';
            form.list_sort_order.value = row.list_sort_order || 0;
            form.tags.value = tags;
            form.screenshot_path.value = row.screenshot_path || '';
            form.status.value = row.status || 'draft';
            form.html.value = row.html || '';
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const payload = {};
            fd.forEach((value, key) => {
                payload[key] = value;
            });
            payload.id = editId || parseInt(payload.id || '0', 10) || 0;
            try {
                await global.ScienceApi.apiFetch('/admin/simulations', { method: 'POST', body: payload });
                global.AppRouter.navigate('/admin/simulations');
            } catch (err) {
                showFlash(err.message || t('儲存失敗', 'Save failed'));
            }
        });
    }

    Object.assign(global.AppAdmin || (global.AppAdmin = {}), {
        renderAdminLearningVideoEdit,
        renderAdminArticleEdit,
        renderAdminLearningNoteEdit,
        renderAdminSimulationEdit,
    });
