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

    function moiLabel(raw) {
        const v = String(raw || '').toUpperCase();
        if (v === 'E') return t('英文 (E)', 'English (E)');
        if (v === 'C') return t('中文 (C)', 'Chinese (C)');
        return '—';
    }

    function displayName(s) {
        return (s.display_name || s.name_zh || s.name_en || s.email || '').trim() || '—';
    }

    function requireCoursesAccess() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        return global.ScienceApi.hasPermission('class.manage_any')
            || global.ScienceApi.hasPermission('class.manage_own');
    }

    async function renderAdminCourseStudents(idRaw) {
        setShell();
        const id = parseInt(idRaw, 10) || 0;
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('學生與修讀語言', 'Students & MOI');

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
            const canEdit = !!data.can_edit_students;
            const students = data.students || [];
            const subtitle = [c.form_level_label, c.course_subject_label, c.school_year]
                .filter(Boolean).join(' · ');

            const rows = students.map((s) => {
                const uid = Number(s.id);
                const moi = String(s.moi || '').toUpperCase();
                if (!canEdit) {
                    return `<tr class="border-t border-slate-100">
                        <td class="p-3">
                            <div class="font-medium">${escapeHtml(displayName(s))}</div>
                            <div class="text-xs text-slate-500">${escapeHtml(trimPair(s.name_zh, s.name_en))}</div>
                        </td>
                        <td class="p-3">${escapeHtml(s.email || '')}</td>
                        <td class="p-3">${escapeHtml(s.student_number || '—')}</td>
                        <td class="p-3">${escapeHtml(s.form_class || '—')}</td>
                        <td class="p-3">${s.class_no != null && s.class_no !== '' ? Number(s.class_no) : '—'}</td>
                        <td class="p-3">${escapeHtml(moiLabel(moi))}</td>
                    </tr>`;
                }
                return `<tr class="border-t border-slate-100 align-middle" data-user-id="${uid}">
                    <td class="p-3">
                        <div class="font-medium">${escapeHtml(displayName(s))}</div>
                        <div class="text-xs text-slate-500">${escapeHtml(trimPair(s.name_zh, s.name_en))}</div>
                    </td>
                    <td class="p-3">${escapeHtml(s.email || '')}</td>
                    <td class="p-3">${escapeHtml(s.student_number || '—')}</td>
                    <td class="p-3">
                        <input type="text" class="student-form-class w-24 border rounded-lg px-2 py-1.5" maxlength="32"
                            value="${escapeHtml(s.form_class || '')}" placeholder="1A">
                    </td>
                    <td class="p-3">
                        <input type="number" class="student-class-no w-20 border rounded-lg px-2 py-1.5" min="1" max="99"
                            value="${s.class_no != null && s.class_no !== '' ? Number(s.class_no) : ''}" placeholder="—">
                    </td>
                    <td class="p-3">
                        <select class="student-moi border rounded-lg px-2 py-1.5">
                            <option value=""${moi !== 'E' && moi !== 'C' ? ' selected' : ''}>—</option>
                            <option value="E"${moi === 'E' ? ' selected' : ''}>${escapeHtml(t('英文 (E)', 'English (E)'))}</option>
                            <option value="C"${moi === 'C' ? ' selected' : ''}>${escapeHtml(t('中文 (C)', 'Chinese (C)'))}</option>
                        </select>
                    </td>
                    <td class="p-3 whitespace-nowrap">
                        <button type="button" class="course-remove-student text-red-600 hover:underline text-xs" data-user-id="${uid}">${escapeHtml(t('移出', 'Remove'))}</button>
                    </td>
                </tr>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}`))}" data-spa-nav="/admin/courses/${id}" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 編輯課程', '← Edit course'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('課程列表', 'Courses'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/report`))}" data-spa-nav="/admin/courses/${id}/report" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('學習報告', 'Report'))}</a>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${escapeHtml(c.name)}</h2>
                <p class="text-sm text-slate-500 mb-4">${escapeHtml(subtitle)}</p>
                <p id="admin-course-students-flash" class="text-sm mb-4 hidden"></p>
                ${canEdit ? '' : `<div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">${escapeHtml(t('此頁僅供檢視。班內學生與 MOI 由管理員編輯。', 'View only. Admins edit enrollments and MOI.'))}</div>`}
                ${canEdit ? `
                <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
                    <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('加入學生（帳戶名稱）', 'Enroll students (login id)'))}</h3>
                    <form id="course-enroll-form" class="space-y-3">
                        <textarea name="emails" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="${escapeHtml(t('多個帳戶名以逗號或換行分隔（須已存在）', 'Comma or newline separated existing accounts'))}"></textarea>
                        <button type="submit" class="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm">${escapeHtml(t('加入課程', 'Enroll'))}</button>
                    </form>
                </div>` : ''}
                <form id="course-students-form">
                    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                            <h3 class="font-bold text-slate-800">${escapeHtml(t('學生名單', 'Students'))}（${students.length}）</h3>
                            ${canEdit ? `<button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${escapeHtml(t('儲存班別／班號／修讀語言', 'Save class / no. / MOI'))}</button>` : ''}
                        </div>
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-3">${escapeHtml(t('姓名', 'Name'))}</th>
                                    <th class="p-3">${escapeHtml(t('帳戶', 'Login'))}</th>
                                    <th class="p-3">${escapeHtml(t('學號', 'Student no.'))}</th>
                                    <th class="p-3">${escapeHtml(t('班別', 'Class'))}</th>
                                    <th class="p-3">${escapeHtml(t('班號', 'No.'))}</th>
                                    <th class="p-3">${escapeHtml(t('修讀語言（MOI）', 'MOI'))}</th>
                                    ${canEdit ? `<th class="p-3">${escapeHtml(t('操作', 'Actions'))}</th>` : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${rows || `<tr><td colspan="${canEdit ? 7 : 6}" class="p-6 text-slate-500 text-center">${escapeHtml(t('尚無學生', 'No students'))}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </form>`;

            const flash = document.getElementById('admin-course-students-flash');
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

            if (!canEdit) return;

            document.getElementById('course-enroll-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const raw = String(new FormData(e.target).get('emails') || '').trim();
                const emails = raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
                if (!emails.length) {
                    showFlash(t('請輸入至少一個帳戶名稱。', 'Enter at least one login id.'), true);
                    return;
                }
                try {
                    const res = await global.ScienceApi.apiFetch('/admin/classes/' + id + '/students', {
                        method: 'POST',
                        body: { action: 'enroll', emails },
                    });
                    showFlash(t('已加入 ', 'Enrolled ') + (res.enrolled || 0) + t(' 位學生。', ' student(s).'), false);
                    await renderAdminCourseStudents(String(id));
                } catch (err) {
                    showFlash(err.message || t('加入失敗', 'Enroll failed'), true);
                }
            });

            document.getElementById('course-students-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const batch = [];
                document.querySelectorAll('#course-students-form tr[data-user-id]').forEach((tr) => {
                    const userId = parseInt(tr.getAttribute('data-user-id') || '0', 10);
                    if (!userId) return;
                    batch.push({
                        user_id: userId,
                        form_class: (tr.querySelector('.student-form-class') || {}).value || '',
                        class_no: (tr.querySelector('.student-class-no') || {}).value || '',
                        moi: (tr.querySelector('.student-moi') || {}).value || '',
                    });
                });
                try {
                    const res = await global.ScienceApi.apiFetch('/admin/classes/' + id + '/students', {
                        method: 'POST',
                        body: { action: 'batch_update', rows: batch },
                    });
                    showFlash(t('已更新 ', 'Updated ') + (res.updated || 0) + t(' 位學生。', ' student(s).'), false);
                    await renderAdminCourseStudents(String(id));
                } catch (err) {
                    showFlash(err.message || t('儲存失敗', 'Save failed'), true);
                }
            });

            box.querySelectorAll('.course-remove-student').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const userId = parseInt(btn.getAttribute('data-user-id') || '0', 10);
                    if (!userId || !confirm(t('確定將此學生移出本課程？', 'Remove this student from the course?'))) return;
                    try {
                        await global.ScienceApi.apiFetch('/admin/classes/' + id + '/students/' + userId, {
                            method: 'DELETE',
                            body: {},
                        });
                        showFlash(t('已移出學生。', 'Student removed.'), false);
                        await renderAdminCourseStudents(String(id));
                    } catch (err) {
                        showFlash(err.message || t('移出失敗', 'Remove failed'), true);
                    }
                });
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    function trimPair(a, b) {
        return [a, b].map((x) => String(x || '').trim()).filter(Boolean).join(' / ');
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminCourseStudents,
    });

export {};
