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

function wsStatusLabel(st) {
    return {
        missing: t('未交', 'Missing'),
        pending: t('未開始', 'Pending'),
        submitted: t('已提交', 'Submitted'),
        graded: t('已評分', 'Graded'),
    }[st] || st;
}

function bindSpaNav(root) {
    root.querySelectorAll('[data-spa-nav]').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
        });
    });
}

async function renderAdminStudentDossier(classIdRaw, userIdRaw) {
    setShell();
    const classId = parseInt(classIdRaw, 10) || 0;
    const userId = parseInt(userIdRaw, 10) || 0;
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('學生課業總覽', 'Student coursework');

    if (!requireCoursesAccess()) {
        if (global.ScienceApi.getUser()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
        }
        return;
    }
    if (classId <= 0 || userId <= 0) {
        global.AppRouter.navigate('/admin/courses');
        return;
    }

    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        const data = await global.ScienceApi.apiFetch(
            '/teacher/classes/' + classId + '/students/' + userId
        );
        const c = data.class || {};
        const s = data.student || {};
        const kpis = data.kpis || {};
        const worksheets = data.worksheets || [];
        const summer = data.summer_homework || [];
        const detail = data.detail || {};
        const mastery = detail.mastery || [];
        const attempts = detail.attempts || [];
        const events = data.recent_events || [];

        const name = (s.display_name || s.email || '').trim() || '—';
        const meta = [
            s.form_class || '',
            s.class_no != null ? '#' + s.class_no : '',
            s.moi ? 'MOI ' + s.moi : '',
            s.student_number ? t('學號', 'No.') + ' ' + s.student_number : '',
        ].filter(Boolean).join(' · ');

        const wsRows = worksheets.map((w) => {
            const st = String(w.submission_status || 'missing');
            const score = w.score != null ? String(w.score) : (w.auto_score != null ? String(w.auto_score) : '—');
            const overdueBadge = w.overdue
                ? `<span class="ml-1 text-xs text-red-600">${escapeHtml(t('逾期', 'Overdue'))}</span>`
                : '';
            return `<tr class="border-t border-slate-100">
                <td class="p-3">
                    <span class="font-medium">${escapeHtml(w.title_zh || w.title_en || '')}</span>
                    ${overdueBadge}
                </td>
                <td class="p-3">${escapeHtml(wsStatusLabel(st))}</td>
                <td class="p-3 text-xs">${w.due_at ? escapeHtml(w.due_at) : '—'}</td>
                <td class="p-3">${escapeHtml(score)}${w.max_score != null ? ' / ' + Number(w.max_score) : ''}</td>
                <td class="p-3">
                    <a href="${escapeHtml(spaHref(w.deep_link || `/admin/courses/${classId}/worksheets`))}"
                       data-spa-nav="${escapeHtml(w.deep_link || `/admin/courses/${classId}/worksheets`)}"
                       class="text-indigo-600 hover:underline text-xs">${escapeHtml(t('開啟', 'Open'))}</a>
                </td>
            </tr>`;
        }).join('');

        const shRows = summer.map((item) => `<tr class="border-t border-slate-100">
            <td class="p-3 font-medium">${escapeHtml(item.title_zh || item.title_en || '')}</td>
            <td class="p-3">${escapeHtml(item.status_label || item.status || '')}</td>
            <td class="p-3">${item.percent != null ? Number(item.percent) + '%' : '—'}</td>
            <td class="p-3">${Number(item.attempts || 0)}</td>
            <td class="p-3">
                <a href="${escapeHtml(spaHref(item.deep_link || '#'))}"
                   data-spa-nav="${escapeHtml(item.deep_link || '')}"
                   class="text-indigo-600 hover:underline text-xs">${escapeHtml(t('分析', 'Analytics'))}</a>
            </td>
        </tr>`).join('');

        const masteryRows = mastery.slice(0, 12).map((m) => {
            const score = Number(m.mastery_score || 0);
            const cls = score < 60 ? 'text-red-600' : (score > 80 ? 'text-emerald-600' : 'text-amber-600');
            return `<tr class="border-t border-slate-100">
                <td class="p-3">${escapeHtml(m.name_zh || m.name_en || m.topic_id || '')}</td>
                <td class="p-3 ${cls} font-medium">${score}%</td>
            </tr>`;
        }).join('');

        const attemptRows = attempts.slice(0, 10).map((a) => `<tr class="border-t border-slate-100">
            <td class="p-3 text-xs">${escapeHtml(a.source_type || a.content_type || '')}</td>
            <td class="p-3">${Number(a.score || 0)}/${Number(a.max_score || 0)}</td>
            <td class="p-3 text-xs">${a.submitted_at ? escapeHtml(a.submitted_at) : '—'}</td>
        </tr>`).join('');

        const eventRows = events.slice(0, 12).map((ev) => `<tr class="border-t border-slate-100">
            <td class="p-3 text-xs">${escapeHtml(ev.event_type || '')}</td>
            <td class="p-3 text-xs">${escapeHtml([ev.content_type, ev.content_id].filter(Boolean).join(' / ') || '—')}</td>
            <td class="p-3 text-xs">${ev.created_at ? escapeHtml(ev.created_at) : '—'}</td>
        </tr>`).join('');

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${escapeHtml(spaHref(`/admin/courses/${classId}/students`))}" data-spa-nav="/admin/courses/${classId}/students" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 學生名單', '← Students'))}</a>
                <a href="${escapeHtml(spaHref(`/admin/courses/${classId}/report`))}" data-spa-nav="/admin/courses/${classId}/report" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('學習報告', 'Report'))}</a>
                <a href="${escapeHtml(spaHref(`/admin/courses/${classId}/worksheets`))}" data-spa-nav="/admin/courses/${classId}/worksheets" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('工作紙派發', 'Worksheets'))}</a>
            </div>
            <h2 class="text-xl font-bold text-slate-900">${escapeHtml(name)}</h2>
            <p class="text-sm text-slate-500 mb-1">${escapeHtml(s.email || '')}</p>
            <p class="text-sm text-slate-500 mb-6">${escapeHtml((c.name || '') + (meta ? ' · ' + meta : ''))}</p>

            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                ${kpiCard(t('工作紙已交', 'WS submitted'), `${Number(kpis.worksheets_submitted || 0)}/${Number(kpis.worksheets_assigned || 0)}`)}
                ${kpiCard(t('待批改', 'Ungraded'), String(Number(kpis.worksheets_ungraded || 0)), 'text-amber-600')}
                ${kpiCard(t('逾期未交', 'Overdue'), String(Number(kpis.worksheets_overdue || 0)), 'text-red-600')}
                ${kpiCard(t('暑期通過', 'Summer passed'), `${Number(kpis.summer_passed || 0)}/${Number(kpis.summer_total || 0)}`)}
                ${kpiCard(t('平均掌握度', 'Avg mastery'), (kpis.avg_mastery != null ? Number(kpis.avg_mastery) + '%' : '—'), 'text-emerald-600')}
                ${kpiCard(t('本週分鐘', 'Min / week'), String(Number(kpis.minutes_week || 0)))}
            </div>

            <section class="mb-8">
                <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('工作紙', 'Worksheets'))}</h3>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${escapeHtml(t('標題', 'Title'))}</th>
                            <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                            <th class="p-3">${escapeHtml(t('截止', 'Due'))}</th>
                            <th class="p-3">${escapeHtml(t('分數', 'Score'))}</th>
                            <th class="p-3"></th>
                        </tr></thead>
                        <tbody>${wsRows || `<tr><td colspan="5" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無工作紙派發', 'No worksheet assignments'))}</td></tr>`}</tbody>
                    </table>
                </div>
            </section>

            <section class="mb-8">
                <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('暑期功課', 'Summer homework'))}</h3>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${escapeHtml(t('習作', 'Item'))}</th>
                            <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                            <th class="p-3">${escapeHtml(t('最佳%', 'Best %'))}</th>
                            <th class="p-3">${escapeHtml(t('次數', 'Tries'))}</th>
                            <th class="p-3"></th>
                        </tr></thead>
                        <tbody>${shRows || `<tr><td colspan="5" class="p-6 text-center text-slate-500">${escapeHtml(t('無對應暑期功課', 'No summer homework'))}</td></tr>`}</tbody>
                    </table>
                </div>
            </section>

            <div class="grid lg:grid-cols-2 gap-6 mb-8">
                <section>
                    <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('課題掌握度', 'Topic mastery'))}</h3>
                    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left"><tr>
                                <th class="p-3">${escapeHtml(t('課題', 'Topic'))}</th>
                                <th class="p-3">${escapeHtml(t('掌握度', 'Mastery'))}</th>
                            </tr></thead>
                            <tbody>${masteryRows || `<tr><td colspan="2" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無資料', 'No data'))}</td></tr>`}</tbody>
                        </table>
                    </div>
                </section>
                <section>
                    <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('最近測驗', 'Recent quizzes'))}</h3>
                    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left"><tr>
                                <th class="p-3">${escapeHtml(t('來源', 'Source'))}</th>
                                <th class="p-3">${escapeHtml(t('分數', 'Score'))}</th>
                                <th class="p-3">${escapeHtml(t('時間', 'When'))}</th>
                            </tr></thead>
                            <tbody>${attemptRows || `<tr><td colspan="3" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無資料', 'No data'))}</td></tr>`}</tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section>
                <h3 class="font-bold text-slate-800 mb-3">${escapeHtml(t('最近活動', 'Recent activity'))}</h3>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${escapeHtml(t('事件', 'Event'))}</th>
                            <th class="p-3">${escapeHtml(t('內容', 'Content'))}</th>
                            <th class="p-3">${escapeHtml(t('時間', 'When'))}</th>
                        </tr></thead>
                        <tbody>${eventRows || `<tr><td colspan="3" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無資料', 'No data'))}</td></tr>`}</tbody>
                    </table>
                </div>
            </section>`;

        bindSpaNav(box);
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
    }
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminStudentDossier,
});
