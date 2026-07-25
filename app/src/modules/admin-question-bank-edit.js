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

    function requireQbPerm() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        if (!global.ScienceApi.hasPermission('question_bank.manage_any')
            && !global.ScienceApi.hasPermission('question_bank.manage_own')) {
            return false;
        }
        return true;
    }

    async function loadSubjectsMeta() {
        const list = await global.ScienceApi.apiFetch('/admin/subjects');
        const subjects = [];
        const topicsBySubject = {};
        (Array.isArray(list) ? list : []).forEach((s) => {
            subjects.push({
                id: Number(s.id),
                name_zh: s.name_zh || s.name_en || '',
                name_en: s.name_en || '',
            });
            topicsBySubject[Number(s.id)] = (s.topics || []).map((tp) => ({
                id: Number(tp.id),
                name_zh: tp.name_zh || tp.name_en || '',
                name_en: tp.name_en || '',
            }));
        });
        return { subjects, topicsBySubject };
    }

    function syncEmptyState(qBox, qEmpty) {
        const has = qBox.querySelectorAll(':scope > tr.q-meta-row').length > 0;
        qEmpty.classList.toggle('hidden', has);
    }

    async function renderAdminQuestionBankEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        let editId = idArg ? Number(idArg) : 0;
        if (title) title.textContent = editId ? t('編輯試題庫', 'Edit question bank') : t('新增試題庫', 'New question bank');

        if (!requireQbPerm()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }
        if (!global.QbAdmin) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('題目建構器未載入。', 'Question builder not loaded.'))}</p>`;
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        let subjects = [];
        let topicsBySubject = {};
        try {
            const meta = await loadSubjectsMeta();
            subjects = meta.subjects;
            topicsBySubject = meta.topicsBySubject;
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
            return;
        }

        global.QB_SUBJECTS = subjects;
        global.TOPICS = topicsBySubject;
        global.EDIT_ID = editId;

        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml(s.name_zh)}</option>`
        ).join('');

        const typeBtns = [
            ['mcq', t('四選一', 'MCQ')],
            ['short_answer', t('短答', 'Short')],
            ['long_answer', t('長答', 'Long')],
            ['fill_blank', t('填充', 'Fill')],
            ['true_false', t('是非', 'T/F')],
        ].map(([val, label]) =>
            `<button type="button" class="add-q-type text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50" data-type="${val}">+ ${escapeHtml(label)}</button>`
        ).join('');

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${escapeHtml(spaHref('/admin/question-banks'))}" data-spa-nav="/admin/question-banks" class="text-indigo-700 hover:underline">${escapeHtml(t('← 返回列表', '← Back to list'))}</a>
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3"></p>
            <form id="edit-form" class="space-y-6">
                <input type="hidden" id="item-id" value="${editId || ''}">
                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h2 class="text-sm font-semibold text-slate-800">${escapeHtml(t('試題集', 'Question bank'))}</h2>
                        <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(t('預設科目／課題會套用到新加入的題目；各題仍可個別覆寫。', 'Default subject/topic apply to new questions; each question can override.'))}</p>
                    </div>
                    <div class="p-4 overflow-x-auto">
                        <table class="qb-form-table w-full min-w-[640px] text-sm">
                            <tbody>
                                <tr>
                                    <th>${escapeHtml(t('標題（中）', 'Title (ZH)'))}</th>
                                    <td><input id="title-zh" class="w-full border rounded-lg px-3 py-2"></td>
                                    <th>${escapeHtml(t('標題（英）', 'Title (EN)'))}</th>
                                    <td><input id="title-en" class="w-full border rounded-lg px-3 py-2"></td>
                                </tr>
                                <tr>
                                    <th>slug</th>
                                    <td colspan="3"><input id="slug" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="${escapeHtml(t('留空則依標題自動產生', 'Auto from title if empty'))}"></td>
                                </tr>
                                <tr>
                                    <th>${escapeHtml(t('描述（中）', 'Description (ZH)'))}</th>
                                    <td><textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea></td>
                                    <th>${escapeHtml(t('描述（英）', 'Description (EN)'))}</th>
                                    <td><textarea id="desc-en" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea></td>
                                </tr>
                                <tr>
                                    <th>${escapeHtml(t('預設科目', 'Default subject'))}</th>
                                    <td>
                                        <select id="subject-id" class="w-full border rounded-lg px-3 py-2">
                                            <option value="">—</option>${subOpts}
                                        </select>
                                    </td>
                                    <th>${escapeHtml(t('預設課題', 'Default topic'))}</th>
                                    <td><select id="topic-id" class="w-full border rounded-lg px-3 py-2"><option value="">—</option></select></td>
                                </tr>
                                <tr>
                                    <th>${escapeHtml(t('列表排序', 'List sort'))}</th>
                                    <td><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2"></td>
                                    <th>${escapeHtml(t('狀態', 'Status'))}</th>
                                    <td>
                                        <select id="status" class="w-full border rounded-lg px-3 py-2">
                                            <option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>
                                            <option value="pending_review">${escapeHtml(t('待審核', 'Pending review'))}</option>
                                            <option value="published">${escapeHtml(t('已發佈', 'Published'))}</option>
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <h2 class="text-sm font-semibold text-slate-800">${escapeHtml(t('題目', 'Questions'))}</h2>
                            <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(t('題幹支援 MathJax（$...$）及上載圖片（需先儲存試題集）。', 'Stems support MathJax ($...$) and image upload (save bank first).'))}</p>
                        </div>
                        <div class="flex flex-wrap gap-2">${typeBtns}</div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="qb-questions-table min-w-full text-sm border-collapse">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-2 w-10">#</th>
                                    <th class="p-2 min-w-[7rem]">${escapeHtml(t('題目代號', 'Code'))}</th>
                                    <th class="p-2 min-w-[6rem]">${escapeHtml(t('題型', 'Type'))}</th>
                                    <th class="p-2 min-w-[7rem]">${escapeHtml(t('科目', 'Subject'))}</th>
                                    <th class="p-2 min-w-[7rem]">${escapeHtml(t('課題', 'Topic'))}</th>
                                    <th class="p-2 w-16">${escapeHtml(t('難度', 'Diff.'))}</th>
                                    <th class="p-2 w-16">${escapeHtml(t('分數', 'Score'))}</th>
                                    <th class="p-2 min-w-[8rem]">${escapeHtml(t('來源', 'Source'))}</th>
                                    <th class="p-2 w-24">${escapeHtml(t('操作', 'Actions'))}</th>
                                </tr>
                            </thead>
                            <tbody id="questions"></tbody>
                        </table>
                    </div>
                    <p id="questions-empty" class="hidden p-6 text-center text-slate-500 text-sm">${escapeHtml(t('尚無題目，請按上方按鈕新增。', 'No questions yet. Add one above.'))}</p>
                </section>

                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">${escapeHtml(t('儲存', 'Save'))}</button>
                    ${editId ? `<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">${escapeHtml(t('刪除試題集', 'Delete bank'))}</button>` : ''}
                </div>
            </form>`;
        bindSpaNav(box);

        const qBox = document.getElementById('questions');
        const qEmpty = document.getElementById('questions-empty');
        const flash = document.getElementById('edit-flash');
        const Qb = global.QbAdmin;

        function addQuestion(type) {
            Qb.renderQuestionBlock(Qb.blankQuestion(type), qBox.querySelectorAll(':scope > tr.q-meta-row').length, qBox);
            Qb.renumberQuestions(qBox);
            syncEmptyState(qBox, qEmpty);
        }

        box.querySelectorAll('.add-q-type').forEach((btn) => {
            btn.onclick = () => addQuestion(btn.dataset.type);
        });

        document.getElementById('subject-id').onchange = function () {
            const tid = document.getElementById('topic-id');
            tid.innerHTML = '<option value="">—</option>';
            (topicsBySubject[this.value] || topicsBySubject[Number(this.value)] || []).forEach((tp) => {
                const o = document.createElement('option');
                o.value = tp.id;
                o.textContent = tp.name_zh;
                tid.appendChild(o);
            });
        };

        if (editId) {
            try {
                const detail = await global.ScienceApi.apiFetch('/admin/question-banks/' + editId);
                document.getElementById('title-zh').value = detail.title_zh || '';
                document.getElementById('title-en').value = detail.title_en || '';
                document.getElementById('slug').value = detail.slug || '';
                document.getElementById('desc-zh').value = detail.description_zh || '';
                document.getElementById('desc-en').value = detail.description_en || '';
                document.getElementById('status').value = detail.status || 'draft';
                document.getElementById('list-sort').value = detail.list_sort_order || 0;
                if (detail.subject_id) {
                    document.getElementById('subject-id').value = detail.subject_id;
                    document.getElementById('subject-id').dispatchEvent(new Event('change'));
                }
                if (detail.topic_id) document.getElementById('topic-id').value = detail.topic_id;
                (detail.questions || []).forEach((q, i) => Qb.renderQuestionBlock(q, i, qBox));
                syncEmptyState(qBox, qEmpty);
            } catch (e) {
                flash.textContent = e.message || t('載入失敗', 'Load failed');
                flash.classList.remove('hidden');
                flash.classList.add('text-red-600');
            }
        } else {
            addQuestion('mcq');
        }

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                description_zh: document.getElementById('desc-zh').value,
                description_en: document.getElementById('desc-en').value,
                subject_id: document.getElementById('subject-id').value || null,
                topic_id: document.getElementById('topic-id').value || null,
                list_sort_order: parseInt(document.getElementById('list-sort').value, 10) || 0,
                status: document.getElementById('status').value,
                questions: Qb.collectQuestions(qBox),
            };
            try {
                const saved = await global.ScienceApi.apiFetch('/admin/question-banks', { method: 'POST', body: payload });
                Qb.applySavedQuestionIds(qBox, saved.questions || []);
                document.getElementById('item-id').value = saved.id;
                global.EDIT_ID = saved.id;
                editId = Number(saved.id);
                if (!idArg || Number(idArg) !== editId) {
                    global.AppRouter.navigate('/admin/question-banks/' + editId + '/edit');
                    return;
                }
                // Ensure delete button exists after first save of new bank
                if (!document.getElementById('btn-delete')) {
                    const wrap = document.querySelector('#edit-form .flex.gap-3');
                    if (wrap) {
                        const del = document.createElement('button');
                        del.type = 'button';
                        del.id = 'btn-delete';
                        del.className = 'px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50';
                        del.textContent = t('刪除試題集', 'Delete bank');
                        wrap.appendChild(del);
                        wireDelete(del);
                    }
                }
                flash.textContent = t('已儲存。現在可上載題目圖片。', 'Saved. You can upload question images now.');
                flash.classList.remove('hidden', 'text-red-600');
                flash.classList.add('text-emerald-700');
            } catch (err) {
                flash.textContent = err.message || t('儲存失敗', 'Save failed');
                flash.classList.remove('hidden', 'text-emerald-700');
                flash.classList.add('text-red-600');
            }
        };

        function wireDelete(delBtn) {
            delBtn.onclick = async () => {
                if (!confirm(t('確定刪除此試題庫？所有題目將一併刪除。', 'Delete this bank and all questions?'))) return;
                try {
                    await global.ScienceApi.apiFetch('/admin/question-banks', {
                        method: 'DELETE',
                        body: { id: parseInt(document.getElementById('item-id').value, 10) },
                    });
                    global.AppRouter.navigate('/admin/question-banks');
                } catch (err) {
                    flash.textContent = err.message || t('刪除失敗', 'Delete failed');
                    flash.classList.remove('hidden', 'text-emerald-700');
                    flash.classList.add('text-red-600');
                }
            };
        }

        const delBtn = document.getElementById('btn-delete');
        if (delBtn) wireDelete(delBtn);
    }

    Object.assign(global.AppAdmin || (global.AppAdmin = {}), {
        renderAdminQuestionBankEdit,
    });

export {};
