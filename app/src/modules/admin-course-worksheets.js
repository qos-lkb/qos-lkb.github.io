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


    function statusLabel(s) {
        return {
            draft: t('草稿', 'Draft'),
            active: t('進行中', 'Active'),
            closed: t('已結束', 'Closed'),
            pending: t('未開始', 'Pending'),
            submitted: t('已提交', 'Submitted'),
            graded: t('已評分', 'Graded'),
            pending_review: t('待審', 'Pending review'),
            published: t('已發佈', 'Published'),
        }[s] || s;
    }

    function formatResponse(r) {
        if (!r) return '—';
        if (r.question_type === 'mcq' || r.question_type === 'true_false') {
            const labels = ['A', 'B', 'C', 'D'];
            const idx = r.selected_option_index;
            if (r.question_type === 'true_false') return idx === 0 ? t('是', 'Yes') : (idx === 1 ? t('否', 'No') : '—');
            return labels[idx] != null ? labels[idx] : String(idx + 1);
        }
        if (r.question_type === 'short_answer') return r.response_text || t('（空白）', '(blank)');
        if (r.question_type === 'long_answer' && r.parts) {
            return r.parts.map((p) => '(' + String.fromCharCode(97 + p.part_index) + ') ' + p.text).join(' / ')
                || t('（空白）', '(blank)');
        }
        if (r.question_type === 'fill_blank' && r.blanks) {
            return r.blanks.map((b) => '[' + (b.blank_index + 1) + '] ' + b.text).join(' ')
                || t('（空白）', '(blank)');
        }
        return '—';
    }

    function canAccessWorksheets() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        return global.ScienceApi.hasPermission('worksheet.assign_own')
            || global.ScienceApi.hasPermission('class.manage_any')
            || global.ScienceApi.hasPermission('worksheet.manage_any')
            || global.ScienceApi.hasPermission('worksheet.manage_own');
    }

    async function renderAdminCourseWorksheets(idRaw) {
        setShell();
        const id = parseInt(idRaw, 10) || 0;
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('工作紙派發', 'Worksheet assignments');

        if (!canAccessWorksheets()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }
        if (id <= 0) {
            global.AppRouter.navigate('/admin/courses');
            return;
        }

        const canDesign = global.ScienceApi.hasPermission('worksheet.manage_any')
            || global.ScienceApi.hasPermission('worksheet.manage_own');

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        try {
            const meta = await global.ScienceApi.apiFetch('/admin/classes/' + id);
            const c = meta.class || {};

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}`))}" data-spa-nav="/admin/courses/${id}" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 編輯課程', '← Edit course'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/report`))}" data-spa-nav="/admin/courses/${id}/report" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('學習報告', 'Report'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/summer`))}" data-spa-nav="/admin/courses/${id}/summer" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('暑期功課', 'Summer HW'))}</a>
                    ${canDesign ? `<a href="${escapeHtml(spaHref('/admin/worksheets'))}" data-spa-nav="/admin/worksheets" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('設計工作紙', 'Design worksheets'))}</a>` : ''}
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(c.name || '')}</h2>
                <p id="admin-ws-flash" class="text-sm mb-4 hidden"></p>
                ${canDesign ? `<p class="text-sm text-slate-600 mb-4">${escapeHtml(t('選擇工作紙、設定派發對象與截止日期，學生提交後可在此評分。', 'Assign worksheets, set due dates, then grade submissions.'))}</p>` : ''}
                <div class="grid lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('新增派發', 'New assignment'))}</h3>
                        <form id="assign-form" class="space-y-3 text-sm">
                            <label class="block font-medium">${escapeHtml(t('工作紙', 'Worksheet'))}
                                <select id="worksheet-id" required class="w-full border rounded-lg px-3 py-2 mt-1"></select>
                            </label>
                            <label class="block font-medium">${escapeHtml(t('習作標題（選填）', 'Title (optional)'))}
                                <input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="${escapeHtml(t('中文標題', 'Chinese title'))}">
                                <input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="English title">
                            </label>
                            <label class="block font-medium">${escapeHtml(t('說明（選填）', 'Instructions (optional)'))}
                                <textarea id="instructions-zh" rows="2" class="w-full border rounded-lg px-3 py-2 mt-1"></textarea>
                            </label>
                            <div class="grid grid-cols-2 gap-2">
                                <label class="block font-medium">${escapeHtml(t('滿分', 'Max score'))}
                                    <input type="number" id="max-score" value="100" min="1" step="0.5" class="w-full border rounded-lg px-3 py-2 mt-1">
                                </label>
                                <label class="block font-medium">${escapeHtml(t('截止（選填）', 'Due (optional)'))}
                                    <input type="datetime-local" id="due-at" class="w-full border rounded-lg px-3 py-2 mt-1">
                                </label>
                            </div>
                            <label class="inline-flex items-center gap-2">
                                <input type="checkbox" id="assign-all" checked>
                                <span>${escapeHtml(t('派發給全班學生', 'Assign to all students'))}</span>
                            </label>
                            <div id="student-pick-wrap" class="hidden border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1"></div>
                            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">${escapeHtml(t('建立派發', 'Create assignment'))}</button>
                        </form>
                    </div>
                    <div class="lg:col-span-3 space-y-4">
                        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('派發紀錄', 'Assignments'))}</h3>
                            <div id="assign-list" class="text-sm text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</div>
                        </div>
                        <div id="grade-panel" class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hidden">
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h3 class="font-bold text-slate-800" id="grade-title">${escapeHtml(t('評分', 'Grading'))}</h3>
                                <button type="button" id="close-grade" class="text-sm text-slate-500 hover:underline">${escapeHtml(t('關閉', 'Close'))}</button>
                            </div>
                            <div id="grade-table-wrap" class="overflow-x-auto"></div>
                        </div>
                    </div>
                </div>`;

            const flash = document.getElementById('admin-ws-flash');
            const assignList = document.getElementById('assign-list');
            const gradePanel = document.getElementById('grade-panel');
            const gradeTitle = document.getElementById('grade-title');
            const gradeWrap = document.getElementById('grade-table-wrap');
            let students = [];

            function showFlash(msg, isError) {
                if (!flash) return;
                flash.textContent = msg;
                flash.classList.remove('hidden');
                flash.className = 'text-sm mb-4 ' + (isError ? 'text-red-600' : 'text-emerald-700');
            }

            function renderStudentPick() {
                const wrap = document.getElementById('student-pick-wrap');
                const all = document.getElementById('assign-all').checked;
                wrap.classList.toggle('hidden', all);
                if (all) return;
                wrap.innerHTML = students.map((s) =>
                    `<label class="flex items-center gap-2"><input type="checkbox" class="stu-pick" value="${Number(s.id)}"> ${escapeHtml(s.name_zh || s.display_name || s.email)}</label>`
                ).join('');
            }

            async function loadWorksheets() {
                const list = await global.ScienceApi.apiFetch('/teacher/worksheets');
                const sel = document.getElementById('worksheet-id');
                if (!list || !list.length) {
                    sel.innerHTML = `<option value="">${escapeHtml(t('— 請先設計工作紙 —', '— Create a worksheet first —'))}</option>`;
                    return;
                }
                sel.innerHTML = list.map((w) => {
                    const mine = w.is_mine ? t('（我的）', ' (mine)') : '';
                    const st = w.status === 'published' ? '' : (' [' + statusLabel(w.status) + ']');
                    return `<option value="${Number(w.id)}">${escapeHtml((w.title_zh || w.title_en || '') + mine + st)}</option>`;
                }).join('');
            }

            async function loadAssignments() {
                const data = await global.ScienceApi.apiFetch('/teacher/classes/' + id + '/worksheet-assignments');
                students = data.students || [];
                const assignments = data.assignments || [];
                renderStudentPick();
                if (!assignments.length) {
                    assignList.innerHTML = `<p class="text-slate-500">${escapeHtml(t('尚無派發紀錄。', 'No assignments yet.'))}</p>`;
                    return;
                }
                assignList.innerHTML = '<div class="space-y-2">' + assignments.map((a) => {
                    const titleText = a.title_zh || a.worksheet_title_zh || a.worksheet_slug;
                    const due = a.due_at ? (' · ' + t('截止 ', 'Due ') + String(a.due_at).replace('T', ' ').slice(0, 16)) : '';
                    return `<button type="button" class="assign-row w-full text-left border rounded-lg px-3 py-2 hover:border-indigo-300" data-id="${Number(a.id)}">
                        <span class="font-medium">${escapeHtml(titleText)}</span>
                        <span class="block text-xs text-slate-500">${escapeHtml(statusLabel(a.status))} · ${escapeHtml(t('已提交', 'Submitted'))} ${Number(a.submitted_count)}/${Number(a.student_count)} · ${escapeHtml(t('已評分', 'Graded'))} ${Number(a.graded_count)}${escapeHtml(due)}</span>
                    </button>`;
                }).join('') + '</div>';
                assignList.querySelectorAll('.assign-row').forEach((btn) => {
                    btn.addEventListener('click', () => openGrade(parseInt(btn.getAttribute('data-id') || '0', 10)));
                });
            }

            async function openGrade(assignmentId) {
                if (!assignmentId) return;
                const data = await global.ScienceApi.apiFetch('/teacher/worksheet-assignments/' + assignmentId);
                const a = data.assignment;
                gradeTitle.textContent = (a.title_zh || a.worksheet_title_zh || t('習作', 'Assignment')) + ' — ' + t('評分', 'Grading');
                const subs = data.submissions || [];
                gradeWrap.innerHTML = `<table class="min-w-full text-sm"><thead class="bg-slate-50"><tr>
                    <th class="p-2 text-left">${escapeHtml(t('學生', 'Student'))}</th>
                    <th class="p-2">${escapeHtml(t('狀態', 'Status'))}</th>
                    <th class="p-2">${escapeHtml(t('提交', 'Submitted'))}</th>
                    <th class="p-2">${escapeHtml(t('分數', 'Score'))}</th>
                    <th class="p-2">${escapeHtml(t('評語', 'Feedback'))}</th>
                    <th class="p-2">${escapeHtml(t('自動', 'Auto'))}</th>
                    <th class="p-2"></th></tr></thead><tbody>`
                    + subs.map((s) => {
                        const respRows = (s.responses || []).map((r, i) => {
                            const mark = r.auto_gradable && r.is_correct != null
                                ? ` <span class="${r.is_correct ? 'text-emerald-600' : 'text-red-600'}">${r.is_correct ? '✓' : '✗'}</span>`
                                : '';
                            return `<tr class="border-t bg-slate-50/50"><td class="p-2 pl-6 text-xs text-slate-500" colspan="2">${escapeHtml(t('題', 'Q') + ' ' + (i + 1))}</td><td class="p-2 text-xs" colspan="5">${escapeHtml(formatResponse(r))}${mark}</td></tr>`;
                        }).join('');
                        const defaultScore = s.score != null ? s.score : (s.auto_score != null ? s.auto_score : '');
                        return `<tr class="border-t" data-sub-id="${Number(s.id)}">
                            <td class="p-2">${escapeHtml(s.student_name || ('#' + s.user_id))}</td>
                            <td class="p-2 text-center">${escapeHtml(statusLabel(s.status))}</td>
                            <td class="p-2 text-center text-xs">${s.submitted_at ? escapeHtml(String(s.submitted_at).slice(0, 16)) : '—'}</td>
                            <td class="p-2"><input type="number" class="grade-score w-20 border rounded px-2 py-1" min="0" max="${Number(a.max_score)}" step="0.5" value="${escapeHtml(String(defaultScore))}"></td>
                            <td class="p-2"><input type="text" class="grade-feedback w-full border rounded px-2 py-1" value="${escapeHtml(s.feedback_zh || '')}" placeholder="${escapeHtml(t('評語', 'Feedback'))}"></td>
                            <td class="p-2 text-center text-xs text-slate-500">${s.auto_score != null ? escapeHtml(String(s.auto_score)) : '—'}
                                ${s.auto_score != null ? ` <button type="button" class="btn-use-auto text-indigo-600 hover:underline" data-auto="${escapeHtml(String(s.auto_score))}">${escapeHtml(t('採用', 'Use'))}</button>` : ''}
                            </td>
                            <td class="p-2"><button type="button" class="btn-save-grade text-indigo-600 hover:underline">${escapeHtml(t('儲存', 'Save'))}</button></td>
                        </tr>${respRows}`;
                    }).join('')
                    + '</tbody></table>';
                gradePanel.classList.remove('hidden');

                gradeWrap.querySelectorAll('.btn-use-auto').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const row = btn.closest('tr');
                        const scoreInp = row && row.querySelector('.grade-score');
                        if (scoreInp && btn.getAttribute('data-auto')) scoreInp.value = btn.getAttribute('data-auto');
                    });
                });
                gradeWrap.querySelectorAll('.btn-save-grade').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const row = btn.closest('tr');
                        const subId = parseInt(row.getAttribute('data-sub-id') || '0', 10);
                        const score = row.querySelector('.grade-score').value;
                        const feedback = row.querySelector('.grade-feedback').value;
                        try {
                            await global.ScienceApi.apiFetch('/teacher/worksheet-submissions/' + subId + '/grade', {
                                method: 'POST',
                                body: { score, feedback_zh: feedback, feedback_en: feedback },
                            });
                            showFlash(t('已儲存評分', 'Grade saved'), false);
                            await loadAssignments();
                        } catch (e) {
                            showFlash(e.message || t('儲存失敗', 'Save failed'), true);
                        }
                    });
                });
            }

            box.querySelectorAll('[data-spa-nav]').forEach((a) => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
                });
            });

            document.getElementById('assign-all')?.addEventListener('change', renderStudentPick);
            document.getElementById('close-grade')?.addEventListener('click', () => gradePanel.classList.add('hidden'));

            document.getElementById('assign-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const assignAll = document.getElementById('assign-all').checked;
                const studentIds = assignAll
                    ? []
                    : Array.from(document.querySelectorAll('.stu-pick:checked')).map((el) => parseInt(el.value, 10));
                if (!assignAll && !studentIds.length) {
                    showFlash(t('請至少選擇一位學生', 'Select at least one student'), true);
                    return;
                }
                const due = document.getElementById('due-at').value;
                try {
                    await global.ScienceApi.apiFetch('/teacher/classes/' + id + '/worksheet-assignments', {
                        method: 'POST',
                        body: {
                            worksheet_id: parseInt(document.getElementById('worksheet-id').value, 10),
                            title_zh: document.getElementById('title-zh').value,
                            title_en: document.getElementById('title-en').value,
                            instructions_zh: document.getElementById('instructions-zh').value,
                            max_score: parseFloat(document.getElementById('max-score').value) || 100,
                            due_at: due || null,
                            assign_all: assignAll,
                            student_ids: studentIds,
                            status: 'active',
                        },
                    });
                    showFlash(t('已建立派發', 'Assignment created'), false);
                    e.target.reset();
                    document.getElementById('assign-all').checked = true;
                    document.getElementById('max-score').value = '100';
                    renderStudentPick();
                    await loadAssignments();
                } catch (err) {
                    showFlash(err.message || t('建立失敗', 'Create failed'), true);
                }
            });

            await loadWorksheets();
            await loadAssignments();
            const openAssignment = parseInt(new URLSearchParams(location.search).get('assignment') || '0', 10);
            if (openAssignment > 0) {
                await openGrade(openAssignment);
            }
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminCourseWorksheets,
    });

export {};
