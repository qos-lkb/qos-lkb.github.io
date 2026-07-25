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

    function updateStructurePreview() {
        const body = document.getElementById('body-zh')?.value || '';
        const box = document.getElementById('ws-structure-preview');
        if (!box) return;
        const lines = body.split(/\r?\n/).filter((l) => /^::(video|simulation|sim|article|question)\s+/.test(l));
        if (!lines.length) {
            box.classList.add('hidden');
            return;
        }
        const labels = { video: '影片', simulation: '模擬', sim: '模擬', article: '文章', question: '試題' };
        let qScore = 0;
        let qCount = 0;
        const items = lines.map((l) => {
            const m = l.match(/^::(\w+)\s+(.+)$/);
            if (!m) return '';
            const type = m[1] === 'sim' ? 'simulation' : m[1];
            const score = (l.match(/score="([^"]+)"/) || [])[1];
            if (type === 'question') {
                qCount++;
                if (score) qScore += parseFloat(score) || 0;
            }
            return (labels[m[1]] || m[1]) + (score ? (' · ' + score + '分') : '');
        });
        box.innerHTML = '<strong>' + escapeHtml(t('內容結構：', 'Structure: ')) + '</strong> '
            + escapeHtml(items.join(' → '))
            + (qCount ? (' · ' + escapeHtml(t('試題', 'Questions')) + ' ' + qCount
                + (qScore ? (t('，共 ', ', total ') + qScore + t(' 分', ' pts')) : '')) : '');
        box.classList.remove('hidden');
    }

    async function renderAdminWorksheetEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const editId = idArg ? Number(idArg) : 0;
        const canAny = global.ScienceApi.hasPermission('worksheet.manage_any');
        const canQb = global.ScienceApi.hasPermission('question_bank.manage_any')
            || global.ScienceApi.hasPermission('question_bank.manage_own');
        const canCourses = global.ScienceApi.hasPermission('class.manage_own')
            || global.ScienceApi.hasPermission('class.manage_any');
        if (title) title.textContent = editId ? t('編輯工作紙', 'Edit worksheet') : t('新增工作紙', 'New worksheet');

        if (!requirePerm('worksheet.manage_any', 'worksheet.manage_own')) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        let topicsBySubject = {};
        let subjects = [];
        let row = null;
        try {
            const meta = await loadTopicsBySubject();
            subjects = meta.subjects;
            topicsBySubject = meta.topicsBySubject;
            if (editId) {
                const rows = await global.ScienceApi.apiFetch('/admin/worksheets');
                row = (Array.isArray(rows) ? rows : []).find((r) => Number(r.id) === editId);
                if (!row) throw new Error(t('找不到工作紙。', 'Worksheet not found.'));
            }
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message)}</p>`;
            return;
        }

        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml(s.name_zh || s.name_en)}</option>`
        ).join('');
        const statusOpts = `
            <option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>
            <option value="pending_review">${escapeHtml(t('待審核', 'Pending review'))}</option>
            ${canAny ? `<option value="published">${escapeHtml(t('已發佈', 'Published'))}</option>` : ''}`;

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${escapeHtml(spaHref('/admin/worksheets'))}" data-spa-nav="/admin/worksheets" class="text-indigo-700 hover:underline">${escapeHtml(t('← 返回列表', '← Back to list'))}</a>
                ${canQb ? `<a href="${escapeHtml(spaHref('/admin/question-banks'))}" data-spa-nav="/admin/question-banks" class="text-slate-600 hover:underline">${escapeHtml(t('試題庫', 'Question banks'))}</a>` : ''}
                ${canCourses ? `<a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses" class="text-slate-600 hover:underline">${escapeHtml(t('課程派發', 'Course assign'))}</a>` : ''}
            </div>
            ${!canAny ? `<p class="text-sm text-slate-600 mb-4">${escapeHtml(t('使用 Markdown 撰寫工作紙，並以「+ 題庫題目」嵌入試題。儲存後可在課程中派發；選「待審核」可申請發佈至全站。', 'Write worksheets in Markdown and embed bank questions. Assign via courses; submit for site-wide publish via pending review.'))}</p>` : ''}
            <p id="edit-flash" class="text-red-600 text-sm hidden mb-3"></p>
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${editId || ''}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（中）', 'Title (ZH)'))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（英）', 'Title (EN)'))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('簡介（中）', 'Description (ZH)'))}</label><textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm" rows="2"></textarea></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('簡介（英）', 'Description (EN)'))}</label><textarea id="desc-en" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm" rows="2"></textarea></div>
                <div>
                    <label class="text-sm font-medium">${escapeHtml(t('內容（中，Markdown）', 'Body (ZH, Markdown)'))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-ws-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ ${escapeHtml(t('影片', 'Video'))}</button>
                        <button type="button" data-ws-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ ${escapeHtml(t('模擬', 'Sim'))}</button>
                        <button type="button" data-ws-embed="article" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ ${escapeHtml(t('文章', 'Article'))}</button>
                        <button type="button" data-ws-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ ${escapeHtml(t('題庫題目', 'Question'))}</button>
                    </div>
                    <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                    <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('可用 ::video / ::simulation / ::article / ::question 短碼，或上方按鈕插入。', 'Use ::video / ::simulation / ::article / ::question shortcodes, or the buttons above.'))}</p>
                    <div id="ws-structure-preview" class="hidden mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600"></div>
                </div>
                <div>
                    <label class="text-sm font-medium">${escapeHtml(t('內容（英，Markdown）', 'Body (EN, Markdown)'))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-ws-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Video</button>
                        <button type="button" data-ws-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Sim</button>
                        <button type="button" data-ws-embed="article" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Article</button>
                        <button type="button" data-ws-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ Question</button>
                    </div>
                    <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('科目', 'Subject'))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${subOpts}</select></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('單元', 'Topic'))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${escapeHtml(t('排序', 'Sort'))}</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${escapeHtml(t('狀態', 'Status'))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${statusOpts}</select></div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg">${escapeHtml(t('儲存', 'Save'))}</button>
                    ${editId ? `<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">${escapeHtml(t('刪除', 'Delete'))}</button>` : ''}
                </div>
            </form>`;
        bindSpaNav(box);

        if (global.AdminContentEmbed) {
            global.AdminContentEmbed.init(['body-zh', 'body-en']);
        }

        const subjectEl = document.getElementById('subject-id');
        const topicEl = document.getElementById('topic-id');
        subjectEl.addEventListener('change', () => fillTopicSelect(topicEl, topicsBySubject, subjectEl.value, ''));
        if (row && row.subject_id) {
            subjectEl.value = String(row.subject_id);
            fillTopicSelect(topicEl, topicsBySubject, row.subject_id, row.topic_id);
        }

        ['body-zh', 'body-en'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updateStructurePreview);
        });

        if (row) {
            document.getElementById('title-zh').value = row.title_zh || '';
            document.getElementById('title-en').value = row.title_en || '';
            document.getElementById('slug').value = row.slug || '';
            document.getElementById('desc-zh').value = row.description_zh || '';
            document.getElementById('desc-en').value = row.description_en || '';
            document.getElementById('body-zh').value = row.body_zh || '';
            document.getElementById('body-en').value = row.body_en || '';
            document.getElementById('status').value = row.status || 'draft';
            document.getElementById('list-sort').value = row.list_sort_order || 0;
            updateStructurePreview();
        }

        const flash = document.getElementById('edit-flash');
        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                description_zh: document.getElementById('desc-zh').value,
                description_en: document.getElementById('desc-en').value,
                body_zh: document.getElementById('body-zh').value,
                body_en: document.getElementById('body-en').value,
                subject_id: document.getElementById('subject-id').value || null,
                topic_id: document.getElementById('topic-id').value || null,
                list_sort_order: parseInt(document.getElementById('list-sort').value, 10) || 0,
                status: document.getElementById('status').value,
            };
            try {
                await global.ScienceApi.apiFetch('/admin/worksheets', { method: 'POST', body: payload });
                global.AppRouter.navigate('/admin/worksheets');
            } catch (err) {
                flash.textContent = err.message || t('儲存失敗', 'Save failed');
                flash.classList.remove('hidden');
            }
        };

        const delBtn = document.getElementById('btn-delete');
        if (delBtn) {
            delBtn.onclick = async () => {
                if (!confirm(t('確定刪除此工作紙？', 'Delete this worksheet?'))) return;
                try {
                    await global.ScienceApi.apiFetch('/admin/worksheets', { method: 'DELETE', body: { id: editId } });
                    global.AppRouter.navigate('/admin/worksheets');
                } catch (err) {
                    flash.textContent = err.message || t('刪除失敗', 'Delete failed');
                    flash.classList.remove('hidden');
                }
            };
        }
    }

    Object.assign(global.AppAdmin || (global.AppAdmin = {}), {
        renderAdminWorksheetEdit,
    });

export {};
