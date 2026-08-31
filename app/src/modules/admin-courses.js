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


    function optionsHtml(map, selected) {
        const entries = Object.entries(map || {});
        return '<option value="">' + escapeHtml(t('請選擇', 'Select')) + '</option>'
            + entries.map(([k, label]) =>
                `<option value="${escapeHtml(k)}"${String(k) === String(selected || '') ? ' selected' : ''}>${escapeHtml(label)}</option>`
            ).join('');
    }

    function moiLabel(raw) {
        const v = String(raw || '').toUpperCase();
        if (v === 'E') return t('英文 (E)', 'English (E)');
        if (v === 'C') return t('中文 (C)', 'Chinese (C)');
        return '—';
    }

    function requireCoursesAccess() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        const canAny = global.ScienceApi.hasPermission('class.manage_any');
        const canOwn = global.ScienceApi.hasPermission('class.manage_own');
        return canAny || canOwn;
    }

    async function renderAdminCourses() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('課程管理', 'Courses');

        if (!requireCoursesAccess()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const data = await global.ScienceApi.apiFetch('/admin/classes');
            const classes = data.classes || [];
            const formLevels = data.form_level_options || {};
            const subjects = data.course_subject_options || {};
            const teachers = data.teacher_options || [];
            const canAny = global.ScienceApi.hasPermission('class.manage_any');
            const me = global.ScienceApi.getUser();
            const defaultYear = (() => {
                const y = new Date().getFullYear();
                return y + '-' + (y + 1);
            })();

            const teacherSelect = canAny && teachers.length
                ? `<label class="text-sm">${escapeHtml(t('任教老師', 'Teacher'))}
                    <select name="teacher_user_id" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                        ${teachers.map((tch) =>
                            `<option value="${Number(tch.id)}"${Number(tch.id) === Number(me.id) ? ' selected' : ''}>${escapeHtml(tch.label || tch.display_name || tch.email)}</option>`
                        ).join('')}
                    </select>
                </label>`
                : `<input type="hidden" name="teacher_user_id" value="${Number(me.id)}">`;

            const rows = classes.map((c) => {
                const status = c.is_active
                    ? `<span class="text-emerald-700 text-xs">${escapeHtml(t('啟用', 'Active'))}</span>`
                    : `<span class="text-slate-400 text-xs">${escapeHtml(t('停用', 'Inactive'))}</span>`;
                const courseName = String(c.name || '');
                return `<tr class="border-t border-slate-100">
                    <td class="p-3 w-10">
                        <input type="checkbox" class="admin-course-cb rounded border-slate-300" value="${Number(c.id)}" aria-label="${escapeHtml(t('選取', 'Select') + ' ' + courseName)}">
                    </td>
                    <td class="p-3 font-medium">${escapeHtml(c.name)}</td>
                    <td class="p-3 text-sm">${escapeHtml(c.form_level_label || '—')}</td>
                    <td class="p-3 text-sm">${escapeHtml(c.course_subject_label || '—')}</td>
                    <td class="p-3 text-sm">${escapeHtml(c.school_year || '')}</td>
                    <td class="p-3 text-sm">${escapeHtml(c.teacher_name || '')}</td>
                    <td class="p-3 text-sm">${Number(c.student_count || 0)}</td>
                    <td class="p-3 font-mono text-xs">${escapeHtml(c.invite_code || '')}</td>
                    <td class="p-3">${status}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        <a class="text-indigo-700 hover:underline" href="${escapeHtml(spaHref(`/admin/courses/${Number(c.id)}`))}" data-spa-nav="/admin/courses/${Number(c.id)}">${escapeHtml(t('編輯', 'Edit'))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${escapeHtml(spaHref(`/admin/courses/${Number(c.id)}/students`))}" data-spa-nav="/admin/courses/${Number(c.id)}/students">${escapeHtml(t('學生', 'Students'))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${escapeHtml(spaHref(`/admin/courses/${Number(c.id)}/report`))}" data-spa-nav="/admin/courses/${Number(c.id)}/report">${escapeHtml(t('報告', 'Report'))}</a>
                        <button type="button" class="admin-course-delete text-red-600 hover:underline ml-2" data-id="${Number(c.id)}">${escapeHtml(t('刪除', 'Delete'))}</button>
                    </td>
                </tr>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                </div>
                <p id="admin-courses-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-course-create" class="mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end bg-white border border-slate-200 rounded-xl p-4">
                    <label class="text-sm sm:col-span-2 lg:col-span-1">${escapeHtml(t('課程名稱', 'Course name'))}
                        <input name="name" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${escapeHtml(t('學年', 'School year'))}
                        <input name="school_year" value="${escapeHtml(defaultYear)}" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${escapeHtml(t('年級', 'Form'))}
                        <select name="form_level" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${optionsHtml(formLevels)}</select>
                    </label>
                    <label class="text-sm">${escapeHtml(t('科目', 'Subject'))}
                        <select name="course_subject" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${optionsHtml(subjects)}</select>
                    </label>
                    ${teacherSelect}
                    <label class="text-sm flex items-center gap-2 mt-6">
                        <input type="checkbox" name="is_active" checked class="rounded border-slate-300">
                        ${escapeHtml(t('啟用', 'Active'))}
                    </label>
                    <button type="submit" class="rounded-lg bg-indigo-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('新增課程', 'Create course'))}</button>
                </form>
                ${classes.length ? `
                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-slate-600">${classes.length} ${escapeHtml(t('門課程', 'courses'))}</p>
                    <button type="button" id="admin-courses-bulk-delete" class="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40">${escapeHtml(t('刪除所選', 'Delete selected'))}</button>
                </div>` : ''}
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3 w-10">
                                    ${classes.length ? `<input type="checkbox" id="admin-courses-select-all" class="rounded border-slate-300" aria-label="${escapeHtml(t('全選', 'Select all'))}">` : ''}
                                </th>
                                <th class="p-3">${escapeHtml(t('課程', 'Course'))}</th>
                                <th class="p-3">${escapeHtml(t('年級', 'Form'))}</th>
                                <th class="p-3">${escapeHtml(t('科目', 'Subject'))}</th>
                                <th class="p-3">${escapeHtml(t('學年', 'Year'))}</th>
                                <th class="p-3">${escapeHtml(t('任教老師', 'Teacher'))}</th>
                                <th class="p-3">${escapeHtml(t('學生', 'Students'))}</th>
                                <th class="p-3">${escapeHtml(t('邀請碼', 'Invite'))}</th>
                                <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || `<tr><td colspan="10" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無課程', 'No courses'))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;

            const flash = document.getElementById('admin-courses-flash');
            function showFlash(msg, isError) {
                if (!flash) return;
                flash.textContent = msg;
                flash.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
                flash.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
            }
            function persistFlash(msg, isError) {
                try {
                    sessionStorage.setItem('admin-courses-flash', JSON.stringify({ msg, err: !!isError }));
                } catch (e) { /* ignore */ }
            }
            try {
                const raw = sessionStorage.getItem('admin-courses-flash');
                if (raw) {
                    sessionStorage.removeItem('admin-courses-flash');
                    const pending = JSON.parse(raw);
                    if (pending && pending.msg) showFlash(pending.msg, !!pending.err);
                }
            } catch (e) { /* ignore */ }

            box.querySelectorAll('[data-spa-nav]').forEach((a) => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
                });
            });

            document.getElementById('admin-course-create')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                try {
                    const res = await global.ScienceApi.apiFetch('/admin/classes', {
                        method: 'POST',
                        body: {
                            name: String(fd.get('name') || ''),
                            school_year: String(fd.get('school_year') || ''),
                            form_level: String(fd.get('form_level') || ''),
                            course_subject: String(fd.get('course_subject') || ''),
                            teacher_user_id: parseInt(String(fd.get('teacher_user_id') || me.id), 10) || me.id,
                            is_active: fd.get('is_active') === 'on' || fd.get('is_active') === '1',
                        },
                    });
                    const newId = res.class && res.class.id ? Number(res.class.id) : 0;
                    if (newId > 0) {
                        global.AppRouter.navigate('/admin/courses/' + newId);
                        return;
                    }
                    showFlash(t('已新增課程。', 'Course created.'), false);
                    await renderAdminCourses();
                } catch (err) {
                    showFlash(err.message || t('儲存失敗', 'Save failed'), true);
                }
            });

            function selectedCourseIds() {
                return Array.from(box.querySelectorAll('.admin-course-cb:checked'))
                    .map((cb) => parseInt(cb.value, 10))
                    .filter((id) => id > 0);
            }

            function syncSelectAll() {
                const master = document.getElementById('admin-courses-select-all');
                const boxes = box.querySelectorAll('.admin-course-cb');
                const checked = box.querySelectorAll('.admin-course-cb:checked');
                if (master) {
                    master.checked = boxes.length > 0 && checked.length === boxes.length;
                    master.indeterminate = checked.length > 0 && checked.length < boxes.length;
                }
                const bulk = document.getElementById('admin-courses-bulk-delete');
                if (bulk) bulk.disabled = checked.length === 0;
            }

            box.querySelectorAll('.admin-course-cb').forEach((cb) => {
                cb.addEventListener('change', syncSelectAll);
            });
            document.getElementById('admin-courses-select-all')?.addEventListener('change', (e) => {
                const on = !!e.target.checked;
                box.querySelectorAll('.admin-course-cb').forEach((cb) => {
                    cb.checked = on;
                });
                syncSelectAll();
            });
            syncSelectAll();

            document.getElementById('admin-courses-bulk-delete')?.addEventListener('click', async () => {
                const ids = selectedCourseIds();
                if (!ids.length) {
                    showFlash(t('請至少勾選一門課程。', 'Select at least one course.'), true);
                    return;
                }
                if (!confirm(t('確定刪除所選的 ' + ids.length + ' 門課程？', 'Delete ' + ids.length + ' selected course(s)?'))) {
                    return;
                }
                try {
                    const res = await global.ScienceApi.apiFetch('/admin/classes', {
                        method: 'POST',
                        body: { action: 'delete_bulk', ids },
                    });
                    const n = Number(res.deleted || ids.length);
                    persistFlash(res.message || t('已刪除 ' + n + ' 門課程。', 'Deleted ' + n + ' course(s).'), false);
                    await renderAdminCourses();
                } catch (err) {
                    showFlash(err.message || t('刪除失敗', 'Delete failed'), true);
                }
            });

            box.querySelectorAll('.admin-course-delete').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = parseInt(btn.getAttribute('data-id') || '0', 10);
                    if (!id || !confirm(t('確定刪除此課程？', 'Delete this course?'))) return;
                    try {
                        await global.ScienceApi.apiFetch('/admin/classes/' + id, { method: 'DELETE', body: {} });
                        persistFlash(t('已刪除。', 'Deleted.'), false);
                        await renderAdminCourses();
                    } catch (err) {
                        showFlash(err.message || t('刪除失敗', 'Delete failed'), true);
                    }
                });
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    async function renderAdminCourseEdit(idRaw) {
        setShell();
        const id = parseInt(idRaw, 10) || 0;
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('編輯課程', 'Edit course');

        if (!requireCoursesAccess()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }
        if (id <= 0) {
            global.AppRouter.navigate('/admin/courses');
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const data = await global.ScienceApi.apiFetch('/admin/classes/' + id);
            const c = data.class;
            if (!c) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('找不到課程。', 'Course not found.'))}</p>`;
                return;
            }
            const formLevels = data.form_level_options || {};
            const subjects = data.course_subject_options || {};
            const teachers = data.teacher_options || [];
            const students = data.students || [];
            const canEditStudents = !!data.can_edit_students;
            const canAny = global.ScienceApi.hasPermission('class.manage_any');
            const me = global.ScienceApi.getUser();

            const teacherSelect = canAny && teachers.length
                ? `<label class="block text-sm font-medium text-slate-700">${escapeHtml(t('任教老師', 'Teacher'))}
                    <select name="teacher_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
                        ${teachers.map((tch) =>
                            `<option value="${Number(tch.id)}"${Number(tch.id) === Number(c.teacher_user_id || me.id) ? ' selected' : ''}>${escapeHtml(tch.label || '')}</option>`
                        ).join('')}
                    </select>
                </label>`
                : `<input type="hidden" name="teacher_user_id" value="${Number(c.teacher_user_id || me.id)}">`;

            const studentRows = students.map((s) => {
                const uid = Number(s.id);
                const dossier = `/admin/courses/${id}/students/${uid}`;
                return `<tr class="border-t border-slate-100">
                <td class="p-3">${escapeHtml(s.name_zh || '')}</td>
                <td class="p-3">${escapeHtml(s.name_en || '')}</td>
                <td class="p-3">${escapeHtml(s.email || '')}</td>
                <td class="p-3">${escapeHtml(s.student_number || '—')}</td>
                <td class="p-3">${escapeHtml(s.form_class || '—')}</td>
                <td class="p-3">${s.class_no != null && s.class_no !== '' ? Number(s.class_no) : '—'}</td>
                <td class="p-3">${escapeHtml(moiLabel(s.moi))}</td>
                <td class="p-3">${escapeHtml(s.joined_at || '')}</td>
                <td class="p-3"><a href="${escapeHtml(spaHref(dossier))}" data-spa-nav="${escapeHtml(dossier)}" class="text-indigo-600 hover:underline text-sm">${escapeHtml(t('課業', 'Dossier'))}</a></td>
            </tr>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 課程列表', '← Courses'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/students`))}" data-spa-nav="/admin/courses/${id}/students" class="text-sm text-slate-600 hover:underline">${escapeHtml(canEditStudents ? t('學生與修讀語言', 'Students & MOI') : t('查看學生', 'View students'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/report`))}" data-spa-nav="/admin/courses/${id}/report" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('學習報告', 'Report'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/summer`))}" data-spa-nav="/admin/courses/${id}/summer" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('暑期功課', 'Summer HW'))}</a>
                    ${c.can_chase_previous_summer || c.form_level === '2' || c.form_level === '3'
                        ? `<a href="${escapeHtml(spaHref(`/admin/courses/${id}/summer?cohort=previous`))}" data-spa-nav="/admin/courses/${id}/summer?cohort=previous" class="text-sm text-amber-800 hover:underline">${escapeHtml(t('上學年追收', 'Last-year chase'))}</a>`
                        : ''}
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/worksheets`))}" data-spa-nav="/admin/courses/${id}/worksheets" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('工作紙派發', 'Worksheets'))}</a>
                </div>
                ${data.has_form_subject_columns === false
                    ? `<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${escapeHtml(t('資料庫尚未加入年級／科目欄位，儲存會失敗。', 'DB missing form/subject columns; save will fail.'))}</div>`
                    : ''}
                <p id="admin-course-edit-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-course-edit" class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm mb-6 max-w-2xl">
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('課程名稱', 'Course name'))}
                        <input name="name" required value="${escapeHtml(c.name || '')}" class="mt-1 w-full border rounded-lg px-3 py-2">
                    </label>
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('學年', 'School year'))}
                        <input name="school_year" value="${escapeHtml(c.school_year || '')}" class="mt-1 w-full border rounded-lg px-3 py-2" placeholder="2025-2026">
                    </label>
                    <div class="grid sm:grid-cols-2 gap-4">
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('年級', 'Form'))} <span class="text-red-500">*</span>
                            <select name="form_level" required class="mt-1 w-full border rounded-lg px-3 py-2">${optionsHtml(formLevels, c.form_level)}</select>
                        </label>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('科目', 'Subject'))} <span class="text-red-500">*</span>
                            <select name="course_subject" required class="mt-1 w-full border rounded-lg px-3 py-2">${optionsHtml(subjects, c.course_subject)}</select>
                        </label>
                    </div>
                    ${teacherSelect}
                    <label class="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" name="is_active" class="rounded border-slate-300"${c.is_active ? ' checked' : ''}>
                        ${escapeHtml(t('啟用', 'Active'))}
                    </label>
                    <p class="text-sm text-slate-600">${escapeHtml(t('邀請碼', 'Invite code'))}：
                        <code id="course-invite-code" class="bg-slate-100 px-2 py-1 rounded font-mono text-xs">${escapeHtml(c.invite_code || '')}</code>
                    </p>
                    <div class="flex flex-wrap items-center gap-3">
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">${escapeHtml(t('儲存', 'Save'))}</button>
                        <button type="button" id="course-reset-invite" class="text-sm text-indigo-600 hover:underline">${escapeHtml(t('重設邀請碼', 'Reset invite'))}</button>
                        <button type="button" id="course-edit-delete" class="text-red-600 hover:underline text-sm ml-auto">${escapeHtml(t('刪除課程', 'Delete course'))}</button>
                    </div>
                </form>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-4">
                    <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                        <h2 class="font-bold text-slate-800">${escapeHtml(t('學生名單', 'Students'))}（${students.length}）</h2>
                        <a href="${escapeHtml(spaHref(`/admin/courses/${id}/students`))}" data-spa-nav="/admin/courses/${id}/students" class="text-sm text-indigo-600 hover:underline">${escapeHtml(canEditStudents ? t('編輯學生與修讀語言', 'Edit students & MOI') : t('查看學生與修讀語言', 'View students & MOI'))}</a>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${escapeHtml(t('中文名', 'Name ZH'))}</th>
                                <th class="p-3">${escapeHtml(t('英文名', 'Name EN'))}</th>
                                <th class="p-3">${escapeHtml(t('電郵', 'Email'))}</th>
                                <th class="p-3">${escapeHtml(t('學號', 'Student no.'))}</th>
                                <th class="p-3">${escapeHtml(t('班別', 'Class'))}</th>
                                <th class="p-3">${escapeHtml(t('班號', 'No.'))}</th>
                                <th class="p-3">MOI</th>
                                <th class="p-3">${escapeHtml(t('加入日期', 'Joined'))}</th>
                                <th class="p-3">${escapeHtml(t('操作', 'Actions'))}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentRows || `<tr><td colspan="9" class="p-6 text-slate-500 text-center">${escapeHtml(t('尚無學生', 'No students'))}</td></tr>`}
                        </tbody>
                    </table>
                </div>
                ${canEditStudents ? '' : `<p class="text-sm text-slate-500">${escapeHtml(t('加入／移出學生與修改修讀語言僅限管理員操作。', 'Only admins can enroll/remove students or edit MOI.'))}</p>`}`;

            const flash = document.getElementById('admin-course-edit-flash');
            function showFlash(msg, isError) {
                if (!flash) return;
                flash.textContent = msg;
                flash.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
                flash.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
            }

            box.querySelectorAll('[data-spa-nav]').forEach((a) => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
                });
            });

            document.getElementById('admin-course-edit')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const fd = new FormData(form);
                try {
                    await global.ScienceApi.apiFetch('/admin/classes/' + id, {
                        method: 'PUT',
                        body: {
                            name: String(fd.get('name') || '').trim(),
                            school_year: String(fd.get('school_year') || '').trim(),
                            form_level: String(fd.get('form_level') || ''),
                            course_subject: String(fd.get('course_subject') || ''),
                            teacher_user_id: parseInt(String(fd.get('teacher_user_id') || me.id), 10) || me.id,
                            is_active: !!form.querySelector('input[name="is_active"]')?.checked,
                        },
                    });
                    showFlash(t('已儲存。', 'Saved.'), false);
                    await renderAdminCourseEdit(String(id));
                } catch (err) {
                    showFlash(err.message || t('儲存失敗', 'Save failed'), true);
                }
            });

            document.getElementById('course-reset-invite')?.addEventListener('click', async () => {
                if (!confirm(t('重設邀請碼？舊碼將失效。', 'Reset invite code? Old code will stop working.'))) return;
                try {
                    const res = await global.ScienceApi.apiFetch('/admin/classes/' + id + '/invite', { method: 'POST', body: {} });
                    const codeEl = document.getElementById('course-invite-code');
                    if (codeEl && res.invite_code) codeEl.textContent = res.invite_code;
                    showFlash(t('新邀請碼：', 'New invite: ') + (res.invite_code || ''), false);
                } catch (err) {
                    showFlash(err.message || t('重設失敗', 'Reset failed'), true);
                }
            });

            document.getElementById('course-edit-delete')?.addEventListener('click', async () => {
                if (!confirm(t('確定刪除此課程？學生選課紀錄將一併移除。', 'Delete this course? Enrollments will be removed.'))) return;
                try {
                    await global.ScienceApi.apiFetch('/admin/classes/' + id, { method: 'DELETE', body: {} });
                    global.AppRouter.navigate('/admin/courses');
                } catch (err) {
                    showFlash(err.message || t('刪除失敗', 'Delete failed'), true);
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminCourses,
        renderAdminCourseEdit,
    });

export {};
