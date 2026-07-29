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


    function requireCoursesAccess() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        return global.ScienceApi.hasPermission('class.manage_any')
            || global.ScienceApi.hasPermission('class.manage_own');
    }

    function kpiCard(label, valueHtml, valueClass) {
        return `<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p class="text-xs text-slate-500 uppercase">${escapeHtml(label)}</p>
            <p class="text-2xl font-bold ${valueClass || 'text-slate-900'}">${valueHtml}</p>
        </div>`;
    }

    async function renderAdminCourseReport(idRaw) {
        setShell();
        const id = parseInt(idRaw, 10) || 0;
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('課程學習報告', 'Course learning report');

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
            const meta = await global.ScienceApi.apiFetch('/admin/classes/' + id);
            const c = meta.class || {};
            const data = await global.ScienceApi.apiFetch('/teacher/classes/' + id + '/report');
            const summary = data.summary || {};
            const coursework = data.coursework || {};
            const weak = data.weak_topics || [];
            const students = data.students || [];

            const weakHtml = weak.length
                ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                    <h2 class="font-bold text-amber-900 mb-2">${escapeHtml(t('全班薄弱課題 TOP ', 'Weak topics TOP ') + weak.length)}</h2>
                    <ul class="text-sm text-amber-800 space-y-1">
                        ${weak.map((wt) =>
                            `<li>${escapeHtml(wt.name_zh || '')} — ${escapeHtml(t('平均', 'avg'))} ${Number(wt.avg_mastery)}%（${Number(wt.student_count)} ${escapeHtml(t('人', 'students'))}）</li>`
                        ).join('')}
                    </ul>
                </div>`
                : '';

            const studentRows = students.map((s) => {
                const m = Number(s.avg_mastery || 0);
                const cls = m < 60 ? 'text-red-600' : (m > 80 ? 'text-emerald-600' : 'text-amber-600');
                const fc = String(s.form_class || '');
                const cn = s.class_no != null && s.class_no !== '' ? Number(s.class_no) : 0;
                const metaLine = (fc || cn)
                    ? `<span class="block text-xs text-slate-500">${escapeHtml(fc + (cn > 0 ? ' #' + cn : ''))}</span>`
                    : '';
                const attempt = s.last_attempt
                    ? (Number(s.last_attempt.score) + '/' + Number(s.last_attempt.max_score))
                    : '—';
                const ws = s.worksheets || {};
                const sh = s.summer || {};
                const uid = Number(s.user_id);
                const dossier = `/admin/courses/${id}/students/${uid}`;
                return `<tr class="border-t border-slate-100">
                    <td class="p-3">
                        <a href="${escapeHtml(spaHref(dossier))}" data-spa-nav="${escapeHtml(dossier)}" class="font-medium text-indigo-700 hover:underline">${escapeHtml(s.display_name || '')}</a>
                        <span class="block text-xs text-slate-400">${escapeHtml(s.email || '')}</span>
                        ${metaLine}
                    </td>
                    <td class="p-3"><span class="${cls} font-medium">${m}%</span></td>
                    <td class="p-3">${Number(s.minutes_week || 0)}</td>
                    <td class="p-3 text-xs">${Number(ws.submitted || 0)}/${Number(ws.assigned || 0)}${Number(ws.overdue || 0) > 0 ? ` <span class="text-red-600">(${Number(ws.overdue)} ${escapeHtml(t('逾期', 'od'))})</span>` : ''}</td>
                    <td class="p-3 text-xs">${Number(sh.passed || 0)}/${Number(sh.total || 0)}</td>
                    <td class="p-3 text-xs">${s.last_active_at ? escapeHtml(s.last_active_at) : '—'}</td>
                    <td class="p-3">${escapeHtml(attempt)}</td>
                </tr>`;
            }).join('');

            const sortedByMastery = students.slice().sort((a, b) => {
                const am = Number(a.avg_mastery || 0);
                const bm = Number(b.avg_mastery || 0);
                if (bm !== am) return bm - am;
                return Number(b.minutes_week || 0) - Number(a.minutes_week || 0);
            });

            const topLeaders = sortedByMastery.slice(0, 3);

            const weeklySorted = students.slice().sort((a, b) => {
                return Number(b.minutes_week || 0) - Number(a.minutes_week || 0);
            });
            const weeklyChampion = weeklySorted[0] || null;

            const leaderboardHtml = topLeaders.length
                ? `<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h3 class="font-bold text-indigo-900">${escapeHtml(t('Top N 同班排行榜', 'Top N class leaderboard'))}</h3>
                        <div class="text-right">
                            <p class="text-xs text-indigo-700 uppercase tracking-wide">${escapeHtml(t('本週挑戰（分鐘）', 'Weekly challenge (minutes)'))}</p>
                            <p class="text-sm font-bold text-indigo-900">${escapeHtml(weeklyChampion ? weeklyChampion.display_name || '' : '—')}</p>
                            <p class="text-xs text-indigo-700">${weeklyChampion ? Number(weeklyChampion.minutes_week || 0) : 0} ${escapeHtml(t('分鐘', 'min'))}</p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${topLeaders.map((s, i) => {
                            const dn = s.display_name || '';
                            const am = Number(s.avg_mastery || 0);
                            const mw = Number(s.minutes_week || 0);
                            return `<div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-indigo-100 rounded-lg">
                                <span class="text-sm font-medium text-slate-800">${i + 1}. ${escapeHtml(dn)}</span>
                                <span class="text-xs text-slate-600">${am}% · ${mw} ${escapeHtml(t('分鐘', 'min'))}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`
                : '';

            const achievements = data.achievements_summary || {};
            const topStreaks = achievements.top_streaks || [];
            const badgeCounts = achievements.badge_unlock_counts || [];
            const achievementsHtml = `
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <h3 class="font-bold text-emerald-900 mb-3">${escapeHtml(t('連續學習／徽章摘要', 'Streak / badges summary'))}</h3>
                    <div class="grid sm:grid-cols-3 gap-3 mb-4 text-sm">
                        <div class="bg-white rounded-lg border border-emerald-100 p-3">
                            <p class="text-xs text-slate-500">${escapeHtml(t('平均連續天數', 'Avg streak'))}</p>
                            <p class="text-xl font-bold text-emerald-700">${Number(achievements.avg_current_streak || 0)}</p>
                        </div>
                        <div class="bg-white rounded-lg border border-emerald-100 p-3">
                            <p class="text-xs text-slate-500">${escapeHtml(t('連續 ≥3 天人數', 'Students with streak ≥3'))}</p>
                            <p class="text-xl font-bold text-emerald-700">${Number(achievements.students_with_streak_ge_3 || 0)}</p>
                        </div>
                        <div class="bg-white rounded-lg border border-emerald-100 p-3">
                            <p class="text-xs text-slate-500">${escapeHtml(t('抽樣學生數', 'Students sampled'))}</p>
                            <p class="text-xl font-bold text-slate-700">${Number(achievements.students_sampled || 0)}</p>
                        </div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs font-medium text-emerald-900 mb-2">${escapeHtml(t('連續天數 Top 3', 'Top 3 streaks'))}</p>
                            ${topStreaks.length
                                ? `<ul class="text-sm space-y-1">${topStreaks.map((s, i) =>
                                    `<li>${i + 1}. ${escapeHtml(s.display_name || '')} — ${Number(s.current_streak_days || 0)} ${escapeHtml(t('天', 'days'))}</li>`
                                ).join('')}</ul>`
                                : `<p class="text-sm text-slate-500">${escapeHtml(t('尚無資料', 'No data'))}</p>`}
                        </div>
                        <div>
                            <p class="text-xs font-medium text-emerald-900 mb-2">${escapeHtml(t('徽章解鎖次數', 'Badge unlocks'))}</p>
                            ${badgeCounts.length
                                ? `<ul class="text-sm space-y-1">${badgeCounts.slice(0, 5).map((b) =>
                                    `<li>${escapeHtml(b.label_zh || b.badge_id || '')} × ${Number(b.count || 0)}</li>`
                                ).join('')}</ul>`
                                : `<p class="text-sm text-slate-500">${escapeHtml(t('尚無徽章', 'No badges yet'))}</p>`}
                        </div>
                    </div>
                </div>`;

            const submitRate = coursework.worksheet_submit_rate != null
                ? Number(coursework.worksheet_submit_rate) + '%'
                : '—';
            const summerRate = coursework.summer_completion_rate != null
                ? Number(coursework.summer_completion_rate) + '%'
                : '—';

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}`))}" data-spa-nav="/admin/courses/${id}" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 編輯課程', '← Edit course'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/students`))}" data-spa-nav="/admin/courses/${id}/students" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('學生與修讀語言', 'Students & MOI'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/summer`))}" data-spa-nav="/admin/courses/${id}/summer" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('暑期功課', 'Summer HW'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/worksheets`))}" data-spa-nav="/admin/courses/${id}/worksheets" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('工作紙派發', 'Worksheets'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/inbox') + '?class_id=' + id)}" data-spa-nav="/admin/inbox?class_id=${id}" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('待批改／逾期', 'Inbox'))}</a>
                    <a href="${escapeHtml(spaHref(`/admin/courses/${id}/discussions`))}" data-spa-nav="/admin/courses/${id}/discussions" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('討論審核', 'Discussions'))}</a>
                    <button type="button" id="report-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${escapeHtml(t('匯出 CSV', 'Export CSV'))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-4">${escapeHtml(c.name || t('課程', 'Course'))}</h2>
                <p id="admin-course-report-flash" class="text-sm mb-3 hidden"></p>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    ${kpiCard(t('學生人數', 'Students'), String(Number(summary.total_students || 0)))}
                    ${kpiCard(t('本週活躍', 'Active this week'), String(Number(summary.active_students || 0)), 'text-indigo-600')}
                    ${kpiCard(t('本週學習（分鐘）', 'Minutes this week'), String(Number(summary.minutes_week || 0)))}
                    ${kpiCard(t('平均掌握度', 'Avg mastery'), escapeHtml(String(summary.avg_mastery ?? '—')) + '%', 'text-emerald-600')}
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    ${kpiCard(t('工作紙呈交率', 'WS submit rate'), escapeHtml(submitRate), 'text-indigo-700')}
                    ${kpiCard(t('待批改', 'Ungraded'), String(Number(coursework.worksheet_ungraded || 0)), 'text-amber-600')}
                    ${kpiCard(t('逾期未交', 'Overdue'), String(Number(coursework.worksheet_overdue || 0)), 'text-red-600')}
                    ${kpiCard(t('暑期完成率', 'Summer done'), escapeHtml(summerRate))}
                </div>
                ${weakHtml}
                ${achievementsHtml}
                ${leaderboardHtml}
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${escapeHtml(t('學生', 'Student'))}</th>
                                <th class="p-3">${escapeHtml(t('平均掌握度', 'Avg mastery'))}</th>
                                <th class="p-3">${escapeHtml(t('本週分鐘', 'Min / week'))}</th>
                                <th class="p-3">${escapeHtml(t('工作紙', 'Worksheets'))}</th>
                                <th class="p-3">${escapeHtml(t('暑期', 'Summer'))}</th>
                                <th class="p-3">${escapeHtml(t('最後上線', 'Last active'))}</th>
                                <th class="p-3">${escapeHtml(t('最近測驗', 'Last quiz'))}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentRows || `<tr><td colspan="7" class="p-6 text-slate-500 text-center">${escapeHtml(t('尚無學生資料', 'No student data'))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;

            const flash = document.getElementById('admin-course-report-flash');
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

            document.getElementById('report-export-csv')?.addEventListener('click', async () => {
                try {
                    const res = await global.ScienceApi.apiFetch('/teacher/classes/' + id + '/report.csv', { method: 'GET' });
                    if (!(res instanceof Response)) {
                        throw new Error(t('匯出回應格式錯誤', 'Unexpected export response'));
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'class-' + id + '-report.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showFlash(t('已開始下載 CSV。', 'CSV download started.'), false);
                } catch (err) {
                    showFlash(err.message || t('匯出失敗', 'Export failed'), true);
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminCourseReport,
    });

export {};
