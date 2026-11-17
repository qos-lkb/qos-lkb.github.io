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
        let list;
        try {
            list = await global.ScienceApi.apiFetch('/admin/subjects');
        } catch (_err) {
            list = await global.ScienceApi.apiFetch('/subjects');
        }
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
                <a href="${escapeHtml(spaHref(listRoute))}" data-spa-nav="${escapeHtml(listRoute)}" class="text-brand-700 hover:underline">${escapeHtml(listLabel)}</a>
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
                    <button type="submit" class="flex-1 bg-brand-600 text-white py-2 rounded-lg">${escapeHtml(t('儲存', 'Save'))}</button>
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
                        <button type="button" id="add-q" class="text-sm text-brand-600">+ ${escapeHtml(t('新增', 'Add'))}</button>
                    </div>
                    <div id="questions"></div>
                </div>
                <button type="submit" class="w-full bg-brand-600 text-white py-2 rounded-lg">${escapeHtml(t('儲存', 'Save'))}</button>
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
                        ${canQb ? `<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-brand-300 text-brand-700 hover:bg-brand-50">+ ${escapeHtml(t('題庫題目', 'Question'))}</button>` : ''}
                    </div>
                    <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                    <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('可用 ::video / ::simulation / ::question 短碼嵌入內容；亦可用上方按鈕插入。', 'Use ::video / ::simulation / ::question shortcodes, or the buttons above.'))}</p>
                </div>
                <div>
                    <label class="text-sm font-medium">${escapeHtml(t('內容（英，Markdown）', 'Body (EN, Markdown)'))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-content-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Video</button>
                        <button type="button" data-content-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Sim</button>
                        ${canQb ? `<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-brand-300 text-brand-700 hover:bg-brand-50">+ Question</button>` : ''}
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
                    <button type="submit" class="flex-1 bg-brand-600 text-white py-2 rounded-lg">${escapeHtml(t('儲存', 'Save'))}</button>
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
                    const u = await global.ScienceApi.apiFetch('/admin/simulations?assignable_owners=1');
                    users = Array.isArray(u) ? u : [];
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
        if (ownerId && !users.some((u) => Number(u.id) === Number(ownerId))) {
            users = [{
                id: ownerId,
                email: '',
                display_name: '#' + ownerId,
            }].concat(users);
        }
        const tags = Array.isArray(row && row.tags) ? row.tags.join(', ') : '';
        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml((s.name_zh || '') + ' / ' + (s.name_en || ''))}</option>`
        ).join('');
        const userOpts = users.map((u) =>
            `<option value="${Number(u.id)}" ${Number(u.id) === Number(ownerId) ? 'selected' : ''}>${escapeHtml((u.email || '') + ' — ' + (u.display_name || ''))}</option>`
        ).join('');
        box.innerHTML = `
            ${editorChrome('/admin/simulations', t('← 返回列表', '← Back to list'))}
            <form id="edit-form" class="space-y-6">
                <input type="hidden" name="id" value="${editId || 0}">
                <section class="bg-white rounded-xl border p-6 space-y-4">
                    <h2 class="text-sm font-semibold text-slate-800">${escapeHtml(t('基本資料', 'Metadata'))}</h2>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('中文標題', 'Title (ZH)'))}</label><input name="title_zh" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('英文標題', 'Title (EN)'))}</label><input name="title_en" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('中文摘要', 'Summary (ZH)'))}</label><input name="summary_zh" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('英文摘要', 'Summary (EN)'))}</label><input name="summary_en" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('網址 slug（留空則依標題自動產生）', 'Slug (auto from title if empty)'))}</label><input name="slug" class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"></div>
                    ${canAny ? `<div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('擁有者', 'Owner'))}</label><select name="owner_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">${userOpts}</select><p class="mt-1 text-xs text-slate-500">${escapeHtml(t('僅可指定管理員或教師。', 'Admins or teachers only.'))}</p></div>` : ''}
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('科目', 'Subject'))}</label><select name="subject_id" id="field-subject" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option>${subOpts}</select></div>
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('單元（課題）', 'Topic'))}</label><select name="topic_id" id="field-topic" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option></select></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('列表排序', 'List sort'))}</label><input type="number" name="list_sort_order" min="0" step="1" class="mt-1 w-full border rounded-lg px-3 py-2" value="0"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('標籤（逗號分隔）', 'Tags (comma-separated)'))}</label><input name="tags" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('截圖', 'Screenshot'))}</label>
                        <div class="mt-1 flex flex-wrap gap-2 items-center">
                            <input type="file" id="screenshot-file" accept="image/jpeg,image/png,image/gif,image/webp" class="text-sm">
                            <button type="button" id="btn-upload-screenshot" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('上載截圖', 'Upload'))}</button>
                        </div>
                        <input name="screenshot_path" class="mt-2 w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="uploads/…">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('狀態', 'Status'))}</label>
                        <select name="status" class="mt-1 w-full border rounded-lg px-3 py-2 md:w-48">${statusOptions(true, canAny)}</select>
                        ${canAny ? '' : `<p class="mt-1 text-xs text-slate-500">${escapeHtml(t('貢獻者可存草稿或送審；管理員審核後才會公開。', 'Contributors may save as draft or submit for review; admins publish.'))}</p>`}
                    </div>
                    <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('投稿備註（選填）', 'Submitter note (optional)'))}</label><textarea name="submitter_note" rows="2" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></textarea></div>
                </section>
                <section class="bg-white rounded-xl border p-6 space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h2 class="text-sm font-semibold text-slate-800">${escapeHtml(t('HTML 內容', 'HTML content'))}</h2>
                        <div class="flex flex-wrap gap-2 items-center">
                            <input type="file" id="html-file" accept=".html,.htm,text/html" class="text-sm">
                            <button type="button" id="btn-load-html" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('載入 HTML 檔', 'Load HTML file'))}</button>
                            <button type="button" id="btn-preview-html" class="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700">${escapeHtml(t('沙盒預覽', 'Sandbox preview'))}</button>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500">${escapeHtml(t('按「沙盒預覽」於全螢幕視窗中檢視（與前台模擬相同方式）。', 'Use “Sandbox preview” to open a full-screen preview like the public simulation viewer.'))}</p>
                    <p id="html-path-note" class="text-xs text-slate-500"></p>
                    <textarea name="html" id="field-html" rows="16" required class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
                </section>
                <section id="html-agent" class="bg-white rounded-xl border p-6 space-y-4" aria-labelledby="html-agent-title">
                    <div>
                        <h2 id="html-agent-title" class="text-sm font-semibold text-slate-800">${escapeHtml(t('AI 優化', 'AI optimize'))}</h2>
                        <p class="mt-1 text-xs text-slate-500">${escapeHtml(t(
                            '選擇模型與指示來修訂 HTML。結果先給你確認；套用後仍要按儲存才會寫入檔案。',
                            'Pick a model and an instruction to revise the HTML. Review the result first. Apply, then Save, to write the file.'
                        ))}</p>
                    </div>
                    <div id="html-agent-body">
                        <p class="text-sm text-slate-500">${escapeHtml(t('載入模型…', 'Loading models…'))}</p>
                    </div>
                </section>
                <button type="submit" class="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">${escapeHtml(t('儲存', 'Save'))}</button>
            </form>`;
        bindSpaNav(box);

        const form = document.getElementById('edit-form');
        const subjectEl = document.getElementById('field-subject');
        const topicEl = document.getElementById('field-topic');
        const htmlEl = document.getElementById('field-html');
        wireSubjectTopic(subjectEl, topicEl, topicsBySubject, row && row.subject_id, row && row.topic_id);

        async function ensureSimModalReady() {
            if (global.AppCatalog && typeof global.AppCatalog.openModal === 'function') return;
            await import('./modal-capture.js');
            if (global.SimModal && typeof global.SimModal.init === 'function' && !global.SimModal.__inited) {
                global.SimModal.init();
                global.SimModal.__inited = true;
            }
            await import('./catalog.js');
        }

        let previewSeq = 0;
        let agentSeq = 0;
        let agentAbort = null;
        async function openSandboxPreview(htmlOverride) {
            const seq = ++previewSeq;
            const html = typeof htmlOverride === 'string' ? htmlOverride : (htmlEl.value || '');
            if (!html.trim()) {
                showFlash(t('請先輸入或載入 HTML。', 'Enter or load HTML first.'));
                return;
            }
            if (html.length > 1500000) {
                showFlash(t('HTML 內容過大（上限約 1.5 MB）。', 'HTML is too large (about 1.5 MB max).'));
                return;
            }
            try {
                const res = await global.ScienceApi.apiFetch('/admin/simulations/preview-html', {
                    method: 'POST',
                    body: { html },
                });
                if (seq !== previewSeq) return;
                const token = res && res.token ? String(res.token) : '';
                if (!/^[a-f0-9]{32}$/.test(token)) {
                    throw new Error(t('無法建立預覽。', 'Could not create preview.'));
                }
                const base = global.ScienceApi.API_BASE || '/api/v1';
                const previewUrl = base + '/admin/simulations/preview-html?token=' + token;
                await ensureSimModalReady();
                if (global.AppCatalog && typeof global.AppCatalog.openModal === 'function') {
                    global.AppCatalog.openModal(previewUrl);
                } else {
                    showFlash(t('預覽元件未就緒，請重新整理頁面。', 'Preview UI not ready; reload the page.'));
                }
            } catch (err) {
                if (seq !== previewSeq) return;
                showFlash(err.message || t('預覽失敗', 'Preview failed'));
            }
        }

        if (row) {
            form.title_zh.value = row.title_zh || '';
            form.title_en.value = row.title_en || '';
            form.summary_zh.value = row.summary_zh || '';
            form.summary_en.value = row.summary_en || '';
            form.slug.value = row.slug || '';
            form.list_sort_order.value = row.list_sort_order || 0;
            form.tags.value = tags;
            form.screenshot_path.value = row.screenshot_path || '';
            form.status.value = row.status || 'draft';
            form.html.value = row.html || '';
            form.submitter_note.value = row.submitter_note || '';
        } else if (canAny) {
            form.status.value = 'published';
        }

        const pathNote = document.getElementById('html-path-note');
        if (pathNote) {
            pathNote.textContent = row && row.html_path
                ? (t('檔案', 'File') + '：' + row.html_path)
                : t('儲存時寫入科目資料夾的 HTML 檔。標題、狀態與標籤仍留在資料庫。', 'Saving writes an HTML file in the subject folder. Title, status, and tags stay in the database.');
        }

        document.getElementById('btn-preview-html').onclick = () => openSandboxPreview();

        function simEditSubjectLabel() {
            const sid = Number(subjectEl?.value || 0);
            if (!sid) return '';
            const subj = subjects.find((s) => Number(s.id) === sid);
            if (!subj) return '';
            return ((subj.name_zh || '') + ' / ' + (subj.name_en || '')).trim();
        }

        function simGenerateContextPayload() {
            return {
                title_zh: (form.title_zh?.value || '').trim(),
                title_en: (form.title_en?.value || '').trim(),
                summary_zh: (form.summary_zh?.value || '').trim(),
                summary_en: (form.summary_en?.value || '').trim(),
                subject_label: simEditSubjectLabel(),
            };
        }

        let autoGenerateSeq = 0;

        async function autoBootstrapNewSimulationHtml(opts) {
            if (editId) return;
            if ((htmlEl.value || '').trim()) return;
            const seq = ++autoGenerateSeq;
            const skeleton = String((opts && opts.skeleton_html) || '').trim();
            if (skeleton) {
                htmlEl.value = skeleton;
                if (pathNote) {
                    pathNote.textContent = t('已載入專案骨架模板，可編輯後儲存。', 'Loaded the project skeleton template. Edit and save.');
                }
                return;
            }
            if (!opts || !opts.configured) {
                if (pathNote) {
                    pathNote.textContent = t(
                        '尚無骨架 HTML。請貼上內容，或設定 XAI_API_KEY 後重新整理以自動產生。',
                        'No skeleton HTML. Paste content, or set XAI_API_KEY and reload to auto-generate.'
                    );
                }
                return;
            }
            const defaultModel = String(opts.default_model || (Array.isArray(opts.models) && opts.models[0] && opts.models[0].id) || '');
            if (!defaultModel) return;
            if (pathNote) {
                pathNote.textContent = t('正在由 AI 產生初始 HTML…', 'Generating starter HTML with AI…');
            }
            htmlEl.setAttribute('aria-busy', 'true');
            try {
                const res = await global.ScienceApi.apiFetch('/admin/simulations/html-agent', {
                    method: 'POST',
                    body: {
                        mode: 'generate',
                        model: defaultModel,
                        reasoning_effort: 'low',
                        ...simGenerateContextPayload(),
                    },
                });
                if (seq !== autoGenerateSeq) return;
                const generated = String((res && res.html) || '').trim();
                if (generated) {
                    htmlEl.value = generated;
                    if (pathNote) {
                        pathNote.textContent = t('已自動產生初始 HTML。請檢查後按儲存。', 'Starter HTML was generated. Review and save.');
                    }
                }
            } catch (err) {
                if (seq !== autoGenerateSeq) return;
                if (pathNote) {
                    pathNote.textContent = (err && err.message)
                        ? String(err.message)
                        : t('自動產生未完成，請稍後再試或手動貼上 HTML。', 'Auto-generate did not finish. Retry later or paste HTML.');
                }
            } finally {
                if (seq === autoGenerateSeq) {
                    htmlEl.removeAttribute('aria-busy');
                }
            }
        }

        bindHtmlAgent();

        function bindHtmlAgent() {
            const seq = ++agentSeq;
            const host = document.getElementById('html-agent-body');
            if (!host) return;
            if (agentAbort) {
                agentAbort.abort();
                agentAbort = null;
            }
            host.innerHTML = `<p class="text-sm text-slate-500">${escapeHtml(t('載入模型…', 'Loading models…'))}</p>`;
            global.ScienceApi.apiFetch('/admin/simulations/html-agent').then((opts) => {
                if (seq !== agentSeq || !host.isConnected) return;
                renderHtmlAgent(host, opts || {}, seq);
                if (seq === agentSeq) {
                    autoBootstrapNewSimulationHtml(opts || {});
                }
            }).catch((err) => {
                if (seq !== agentSeq || !host.isConnected) return;
                host.innerHTML = `<p class="text-sm text-red-600">${escapeHtml(err.message || t('無法載入 AI 優化。', 'Could not load AI optimize.'))}</p>`;
            });
        }

        function renderHtmlAgent(host, opts, seq) {
            const models = Array.isArray(opts.models) ? opts.models : [];
            const presets = Array.isArray(opts.presets) ? opts.presets : [];
            const configured = !!opts.configured;
            const defaultModel = String(opts.default_model || '');
            const maxBytes = Number(opts.max_bytes || 180000);
            const modelOpts = models.map((m) => {
                const id = String(m.id || '');
                const label = id + (m.label ? ' — ' + m.label : '');
                return `<option value="${escapeAttr(id)}"${id === defaultModel ? ' selected' : ''}>${escapeHtml(label)}</option>`;
            }).join('');
            const presetBtns = presets.map((p) =>
                `<button type="button" data-preset="${escapeAttr(p.id)}" class="html-agent-preset text-xs px-2.5 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50">${escapeHtml(t(p.label_zh || '', p.label_en || p.label_zh || ''))}</button>`
            ).join('');
            const efforts = [
                ['', t('模型預設', 'Model default')],
                ['low', t('低（較快）', 'Low (faster)')],
                ['medium', t('中', 'Medium')],
                ['high', t('高（較仔細）', 'High (slower)')],
            ];
            const effortOpts = efforts.map(([v, label]) =>
                `<option value="${escapeAttr(v)}"${v === 'low' ? ' selected' : ''}>${escapeHtml(label)}</option>`
            ).join('');
            host.innerHTML = `
                ${configured ? '' : `<p class="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-sm">${escapeHtml(t('尚未設定 XAI_API_KEY，無法優化。', 'XAI_API_KEY is not set, so optimize is unavailable.'))}</p>`}
                <div class="grid md:grid-cols-2 gap-4">
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('模型', 'Model'))}
                        <select id="html-agent-model" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"${models.length ? '' : ' disabled'}>${modelOpts || `<option value="">${escapeHtml(t('沒有可用模型', 'No models'))}</option>`}</select>
                    </label>
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('推理深度', 'Reasoning'))}
                        <select id="html-agent-effort" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">${effortOpts}</select>
                        <span id="html-agent-effort-hint" class="mt-1 block text-xs text-slate-500"></span>
                    </label>
                </div>
                <div>
                    <p class="text-sm font-medium text-slate-700">${escapeHtml(t('快速指示', 'Quick prompts'))}</p>
                    <div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="${escapeAttr(t('快速指示', 'Quick prompts'))}">${presetBtns}</div>
                </div>
                <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('修訂指示', 'Instruction'))}
                    <textarea id="html-agent-instruction" rows="3" maxlength="2000" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="${escapeAttr(t('例如：把控制項改成可用鍵盤操作，不要改公式。', 'Example: make the controls keyboard accessible without changing the formulas.'))}"></textarea>
                </label>
                <div class="flex flex-wrap gap-2 items-center">
                    <button type="button" id="html-agent-run" class="text-sm px-3 py-1.5 rounded-lg bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50"${configured && models.length ? '' : ' disabled'}>${escapeHtml(t('開始優化', 'Optimize'))}</button>
                    <button type="button" id="html-agent-cancel" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50" hidden>${escapeHtml(t('取消等待', 'Cancel wait'))}</button>
                </div>
                <p id="html-agent-status" class="text-sm text-slate-600" role="status" aria-live="polite"></p>
                <div id="html-agent-result" class="hidden space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p id="html-agent-notes" class="text-sm text-slate-800 whitespace-pre-wrap"></p>
                    <p id="html-agent-meta" class="text-xs text-slate-500"></p>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" id="html-agent-apply" class="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700">${escapeHtml(t('套用到編輯器', 'Apply to editor'))}</button>
                        <button type="button" id="html-agent-preview" class="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700">${escapeHtml(t('預覽結果', 'Preview result'))}</button>
                        <button type="button" id="html-agent-discard" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('捨棄', 'Discard'))}</button>
                    </div>
                </div>`;

            const presetById = {};
            presets.forEach((p) => {
                presetById[String(p.id)] = p;
            });
            const modelEl = host.querySelector('#html-agent-model');
            const effortEl = host.querySelector('#html-agent-effort');
            const effortHint = host.querySelector('#html-agent-effort-hint');
            const instructionEl = host.querySelector('#html-agent-instruction');
            function syncEffortHint() {
                if (!effortHint || !modelEl) return;
                const skips = String(modelEl.value || '').includes('non-reasoning');
                effortHint.textContent = skips
                    ? t('此模型不使用推理深度。', 'This model ignores reasoning depth.')
                    : '';
                if (effortEl) effortEl.disabled = skips;
            }
            modelEl?.addEventListener('change', syncEffortHint);
            syncEffortHint();
            const general = presetById.general;
            if (instructionEl && general) {
                instructionEl.value = t(general.instruction_zh || '', general.instruction_en || '');
            }
            host.querySelectorAll('.html-agent-preset').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const preset = presetById[btn.getAttribute('data-preset') || ''];
                    if (!instructionEl || !preset) return;
                    instructionEl.value = t(preset.instruction_zh || '', preset.instruction_en || '');
                    instructionEl.focus();
                });
            });

            let proposed = '';
            const resultBox = host.querySelector('#html-agent-result');
            const statusEl = host.querySelector('#html-agent-status');
            const runBtn = host.querySelector('#html-agent-run');
            const cancelBtn = host.querySelector('#html-agent-cancel');
            const notesEl = host.querySelector('#html-agent-notes');
            const metaEl = host.querySelector('#html-agent-meta');

            async function postHtmlAgentBody(body, controller) {
                return global.ScienceApi.apiFetch('/admin/simulations/html-agent', {
                    method: 'POST',
                    signal: controller ? controller.signal : undefined,
                    body,
                });
            }

            function setStatus(text, isError) {
                if (!statusEl) return;
                statusEl.textContent = text || '';
                statusEl.className = 'text-sm ' + (isError ? 'text-red-600' : 'text-slate-600');
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (agentAbort) agentAbort.abort();
                });
            }
            host.querySelector('#html-agent-discard')?.addEventListener('click', () => {
                proposed = '';
                resultBox?.classList.add('hidden');
                setStatus(t('已捨棄這次結果。', 'Discarded this result.'), false);
            });
            host.querySelector('#html-agent-apply')?.addEventListener('click', () => {
                if (!proposed) return;
                htmlEl.value = proposed;
                htmlEl.focus();
                setStatus(t('已套用到編輯器。按「儲存」才會寫入檔案。', 'Applied to the editor. Press Save to write the file.'), false);
            });
            host.querySelector('#html-agent-preview')?.addEventListener('click', () => {
                if (proposed) openSandboxPreview(proposed);
            });
            runBtn?.addEventListener('click', async () => {
                const html = htmlEl.value || '';
                const bytes = new TextEncoder().encode(html).length;
                const instruction = instructionEl ? instructionEl.value.trim() : '';
                const generateMode = !html.trim() && !editId && configured;
                if (!html.trim() && !generateMode) {
                    setStatus(t('請先輸入或載入 HTML。', 'Enter or load HTML first.'), true);
                    return;
                }
                if (!generateMode && bytes > maxBytes) {
                    setStatus(t('HTML 超過 AI 優化上限（約 180 KB）。', 'HTML is over the AI limit (about 180 KB).'), true);
                    return;
                }
                if (!generateMode && !instruction) {
                    setStatus(t('請寫下要優化的地方。', 'Write what to change.'), true);
                    return;
                }
                if (agentAbort) agentAbort.abort();
                const controller = new AbortController();
                agentAbort = controller;
                runBtn.disabled = true;
                if (cancelBtn) cancelBtn.hidden = false;
                resultBox?.classList.add('hidden');
                setStatus(
                    generateMode
                        ? t('正在產生新的模擬 HTML…', 'Generating new simulation HTML…')
                        : t('模型正在修訂 HTML，較大的檔案可能要一兩分鐘。', 'The model is revising the HTML. Large files can take a minute or two.'),
                    false
                );
                try {
                    const body = generateMode
                        ? {
                            mode: 'generate',
                            model: modelEl ? modelEl.value : '',
                            reasoning_effort: effortEl ? effortEl.value : '',
                            instruction,
                            ...simGenerateContextPayload(),
                        }
                        : {
                            html,
                            instruction,
                            model: modelEl ? modelEl.value : '',
                            reasoning_effort: effortEl ? effortEl.value : '',
                        };
                    const res = await postHtmlAgentBody(body, controller);
                    if (seq !== agentSeq || !host.isConnected) return;
                    proposed = String((res && res.html) || '');
                    if (generateMode && proposed) {
                        htmlEl.value = proposed;
                        if (pathNote) {
                            pathNote.textContent = t('已產生 HTML 並寫入編輯器。按儲存才會寫入檔案。', 'HTML generated in the editor. Press Save to write the file.');
                        }
                        setStatus(t('產生完成。', 'Generation complete.'), false);
                    } else {
                        if (notesEl) {
                            notesEl.textContent = String((res && res.notes) || '') || t('模型沒有附加說明。', 'The model did not add notes.');
                        }
                        if (metaEl) {
                            const modelName = String((res && res.model) || '');
                            metaEl.textContent = t(
                                '模型 ' + modelName + '。原 ' + html.length + ' 字元，新 ' + proposed.length + ' 字元。',
                                'Model ' + modelName + '. Was ' + html.length + ' characters, now ' + proposed.length + '.'
                            );
                        }
                        resultBox?.classList.remove('hidden');
                        setStatus(t('優化完成。請預覽或套用；尚未寫入檔案。', 'Done. Preview or apply. Nothing has been saved yet.'), false);
                    }
                } catch (err) {
                    if (seq !== agentSeq || !host.isConnected) return;
                    if (err && err.name === 'AbortError') {
                        setStatus(t('已取消等待。伺服器若已送出，這次回覆不會套用。', 'Wait cancelled. A reply already sent will not be applied.'), false);
                    } else {
                        setStatus((err && err.message) || t('優化失敗', 'Optimize failed'), true);
                    }
                } finally {
                    if (agentAbort === controller) agentAbort = null;
                    if (seq === agentSeq && runBtn && host.isConnected) {
                        runBtn.disabled = !configured;
                    }
                    if (cancelBtn) cancelBtn.hidden = true;
                }
            });
        }

        document.getElementById('btn-load-html').onclick = async () => {
            const fileInput = document.getElementById('html-file');
            const file = fileInput && fileInput.files && fileInput.files[0];
            if (!file) {
                showFlash(t('請先選擇 HTML 檔。', 'Choose an HTML file first.'));
                return;
            }
            try {
                const fd = new FormData();
                fd.append('file', file);
                const res = await global.ScienceApi.apiFetch('/admin/simulations/upload-html', { method: 'POST', body: fd });
                htmlEl.value = res.html || '';
                if ((!form.title_zh.value && !form.title_en.value) && res.suggested_title) {
                    form.title_zh.value = res.suggested_title;
                    form.title_en.value = res.suggested_title;
                }
                showFlash(t('已載入 HTML。', 'HTML loaded.'));
            } catch (err) {
                showFlash(err.message || t('上載失敗', 'Upload failed'));
            }
        };

        document.getElementById('btn-upload-screenshot').onclick = async () => {
            const fileInput = document.getElementById('screenshot-file');
            const file = fileInput && fileInput.files && fileInput.files[0];
            if (!file) {
                showFlash(t('請先選擇截圖檔。', 'Choose a screenshot first.'));
                return;
            }
            try {
                const fd = new FormData();
                fd.append('file', file);
                const res = await global.ScienceApi.apiFetch('/admin/simulations/upload-screenshot', { method: 'POST', body: fd });
                form.screenshot_path.value = res.path || '';
                showFlash(t('截圖已上載。', 'Screenshot uploaded.'));
            } catch (err) {
                showFlash(err.message || t('上載失敗', 'Upload failed'));
            }
        };

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
