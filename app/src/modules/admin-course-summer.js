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

    function legacyAdmin(path) {
        return ((global.ScienceApi && global.ScienceApi.SITE_BASE) || '') + '/admin/' + path;
    }

    function requireCoursesAccess() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        return global.ScienceApi.hasPermission('class.manage_any')
            || global.ScienceApi.hasPermission('class.manage_own');
    }

    function statusBadgeClass(st) {
        if (st === 'on_time') return 'bg-sky-100 text-sky-900';
        if (st === 'late') return 'bg-orange-100 text-orange-900';
        return 'bg-slate-100 text-slate-600';
    }

    function displayName(stu) {
        return (stu.display_name || stu.name_zh || stu.name_en || stu.email || '').trim() || '—';
    }

    async function renderAdminCourseSummer(idRaw) {
        setShell();
        const id = parseInt(idRaw, 10) || 0;
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('暑期功課紀錄', 'Summer homework');

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

        const params = new URLSearchParams(location.search);
        let statusFilter = params.get('status') || '';
        if (!['', 'missing', 'on_time', 'late'].includes(statusFilter)) statusFilter = '';

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const q = statusFilter ? ('?status=' + encodeURIComponent(statusFilter)) : '';
            const report = await global.ScienceApi.apiFetch('/admin/classes/' + id + '/summer-homework' + q);
            const c = report.class || {};
            const items = report.items || [];
            let students = report.students || [];
            const rows = report.rows || [];
            const message = report.message || null;
            const subtitle = [c.form_level_label, c.course_subject_label].filter(Boolean).join(' · ');

            /** @type {Record<number, Record<number, object>>} */
            const byStudent = {};
            rows.forEach((r) => {
                const uid = Number(r.student_user_id);
                const iid = Number(r.item_id);
                if (!byStudent[uid]) byStudent[uid] = {};
                byStudent[uid][iid] = r;
            });

            const headCells = items.map((item) => {
                const titleText = item.title_zh || item.title_en || ('#' + item.id);
                const due = item.due_at
                    ? (t('截止 ', 'Due ') + String(item.due_at).slice(0, 16))
                    : t('無截止', 'No due date');
                return `<th class="p-3 min-w-[11rem]">
                    <div class="font-semibold">
                        <a class="text-indigo-700 hover:underline" href="${escapeHtml(legacyAdmin('summer_homework_view.php?id=' + item.id))}">${escapeHtml(titleText)}</a>
                    </div>
                    <div class="text-xs font-normal text-slate-500 mt-0.5">${escapeHtml(due)}</div>
                    <a class="text-xs text-indigo-600 hover:underline mt-1 inline-block" href="${escapeHtml(spaHref(`/admin/summer-homework/${Number(item.id)}/analytics`))}" data-spa-nav="/admin/summer-homework/${Number(item.id)}/analytics">${escapeHtml(t('分析', 'Analytics'))}</a>
                </th>`;
            }).join('');

            const bodyRows = students.map((stu) => {
                const uid = Number(stu.id || stu.user_id || 0);
                let anyNotPassed = false;
                items.forEach((item) => {
                    const cell = byStudent[uid] && byStudent[uid][Number(item.id)];
                    if (cell && Number(cell.attempts || 0) > 0 && !cell.passed) anyNotPassed = true;
                });
                const rowBg = anyNotPassed ? 'bg-amber-50/50' : '';
                const stickyBg = anyNotPassed ? 'bg-amber-50' : 'bg-white';
                const cells = items.map((item) => {
                    const iid = Number(item.id);
                    const cell = byStudent[uid] && byStudent[uid][iid];
                    if (!cell) return '<td class="p-3 text-slate-400">—</td>';
                    const st = String(cell.status || 'missing');
                    const attempts = Number(cell.attempts || 0);
                    if (attempts <= 0) {
                        return `<td class="p-3">
                            <span class="inline-block text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(st)}">${escapeHtml(cell.status_label || t('未交', 'Missing'))}</span>
                            <div class="mt-1.5 text-xs text-slate-400">${escapeHtml(t('未交', 'Missing'))}</div>
                        </td>`;
                    }
                    const recordAt = cell.first_passed_at ? String(cell.first_passed_at).slice(0, 16) : '';
                    const scoreLine = cell.score != null
                        ? `<span class="text-slate-500 text-xs">（${escapeHtml(String(cell.score))}/${escapeHtml(String(cell.max_score))}）</span>`
                        : '';
                    return `<td class="p-3">
                        <span class="inline-block text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(st)}">${escapeHtml(cell.status_label || st)}</span>
                        <div class="mt-1.5 text-slate-800">${escapeHtml(String(cell.percent ?? '—'))}% ${scoreLine}</div>
                        <div class="text-xs text-slate-500 mt-0.5">
                            ${escapeHtml(recordAt ? (t('首次及格 ', 'First pass ') + recordAt) : t('尚未及格', 'Not passed yet'))}
                            · <a class="text-indigo-600 hover:underline" href="${escapeHtml(spaHref(`/admin/summer-homework/${iid}/analytics`) + '?user_id=' + uid)}" data-spa-nav="/admin/summer-homework/${iid}/analytics" data-user-id="${uid}">${attempts} ${escapeHtml(t('次', 'tries'))}</a>
                            · ${cell.passed
                                ? `<span class="text-emerald-700 font-medium">${escapeHtml(t('及格', 'Passed'))}</span>`
                                : `<span class="text-amber-800 font-medium">${escapeHtml(t('須重做', 'Retry'))}</span>`}
                        </div>
                    </td>`;
                }).join('');

                return `<tr class="border-t border-slate-100 align-top ${rowBg}">
                    <td class="p-3 sticky left-0 ${stickyBg} font-medium whitespace-nowrap z-10">
                        ${escapeHtml(displayName(stu))}
                        <div class="text-xs text-slate-500 font-normal">${escapeHtml(stu.email || '')}</div>
                    </td>
                    ${cells}
                </tr>`;
            }).join('');

            let tableOrEmpty = '';
            if (items.length && students.length) {
                tableOrEmpty = `<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3 sticky left-0 bg-slate-100 z-10">${escapeHtml(t('學生', 'Student'))}</th>
                                ${headCells}
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>`;
            } else if (!items.length && !message) {
                tableOrEmpty = `<p class="text-slate-500 text-sm">${escapeHtml(t('尚無習作資料。', 'No homework items.'))}</p>`;
            } else if (!students.length && items.length) {
                tableOrEmpty = `<p class="text-slate-500 text-sm">${escapeHtml(t('此課程尚無在籍學生。', 'No enrolled students.'))}</p>`;
            }

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}`))}" data-spa-nav="/admin/courses/${id}" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 編輯課程', '← Edit course'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/students`))}" data-spa-nav="/admin/courses/${id}/students" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('學生與修讀語言', 'Students & MOI'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/report`))}" data-spa-nav="/admin/courses/${id}/report" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('學習報告', 'Report'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/worksheets`))}" data-spa-nav="/admin/courses/${id}/worksheets" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('工作紙派發', 'Worksheets'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/summer-homework'))}" data-spa-nav="/admin/summer-homework" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('設計習作', 'Design items'))}</a>
                    <button type="button" id="sh-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${escapeHtml(t('匯出 CSV', 'Export CSV'))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${escapeHtml(c.name || '')}</h2>
                <p class="text-sm text-slate-500 mb-2">${escapeHtml(subtitle)}</p>
                <p class="text-xs text-slate-400 mb-4">${escapeHtml(t('未完成＝未交；截止後才及格＝欠交；呈交時間＝首次及格', 'Missing = not submitted; late = passed after due; time = first pass'))}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                ${message ? `<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${escapeHtml(message)}</div>` : ''}
                <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                    <label class="text-slate-600">${escapeHtml(t('篩選狀態', 'Filter status'))}
                        <select id="sh-status-filter" class="ml-1 border rounded-lg px-2 py-1.5">
                            <option value=""${statusFilter === '' ? ' selected' : ''}>${escapeHtml(t('全部', 'All'))}</option>
                            <option value="missing"${statusFilter === 'missing' ? ' selected' : ''}>${escapeHtml(t('未交', 'Missing'))}</option>
                            <option value="on_time"${statusFilter === 'on_time' ? ' selected' : ''}>${escapeHtml(t('準時', 'On time'))}</option>
                            <option value="late"${statusFilter === 'late' ? ' selected' : ''}>${escapeHtml(t('欠交', 'Late'))}</option>
                        </select>
                    </label>
                    <span class="text-slate-400">${escapeHtml(t('顯示至少一項符合該狀態的學生', 'Show students with at least one matching cell'))}</span>
                </div>
                ${tableOrEmpty}`;

            const flash = document.getElementById('admin-sh-flash');
            function showFlash(msg, isError) {
                if (!flash) return;
                flash.textContent = msg;
                flash.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
                flash.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
            }

            box.querySelectorAll('[data-spa-nav]').forEach((a) => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const path = a.getAttribute('data-spa-nav');
                    const uid = parseInt(a.getAttribute('data-user-id') || '0', 10) || 0;
                    if (uid > 0 && path && path.indexOf('/analytics') >= 0) {
                        const appBase = location.pathname.split('/app')[0] + '/app';
                        history.pushState({ path }, '', appBase + path + '?user_id=' + uid);
                        global.AppRouter.dispatch(path);
                        return;
                    }
                    global.AppRouter.navigate(path);
                });
            });

            document.getElementById('sh-status-filter')?.addEventListener('change', async (e) => {
                const v = e.target.value || '';
                const appBase = location.pathname.split('/app')[0] + '/app';
                const path = '/admin/courses/' + id + '/summer';
                const url = appBase + path + (v ? ('?status=' + encodeURIComponent(v)) : '');
                history.replaceState({ path }, '', url);
                await renderAdminCourseSummer(String(id));
            });

            document.getElementById('sh-export-csv')?.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                try {
                    const res = await global.ScienceApi.apiFetch('/admin/classes/' + id + '/summer-homework.csv', { method: 'GET' });
                    if (!(res instanceof Response)) throw new Error(t('匯出回應格式錯誤', 'Unexpected export response'));
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'summer_homework_class_' + id + '.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showFlash(t('已開始下載 CSV。', 'CSV download started.'), false);
                } catch (err) {
                    showFlash(err.message || t('匯出失敗', 'Export failed'), true);
                } finally {
                    btn.disabled = false;
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminCourseSummer,
    });

export {};
