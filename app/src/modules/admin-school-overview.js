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

async function renderAdminSchoolOverview() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('全校概覽', 'School overview');

    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    if (!global.ScienceApi.hasPermission('class.manage_any')) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
        return;
    }

    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        const data = await global.ScienceApi.apiFetch('/admin/school-overview');
        const classes = data.classes || [];

        const rows = classes.map((c) => {
            const rate = c.worksheet_submit_rate != null ? Number(c.worksheet_submit_rate) + '%' : '—';
            const summer = c.summer_completion_rate != null ? Number(c.summer_completion_rate) + '%' : '—';
            const link = c.deep_link || `/admin/courses/${c.class_id}/report`;
            return `<tr class="border-t border-slate-100">
                <td class="p-3">
                    <div class="font-medium">${escapeHtml(c.name || '')}</div>
                    <div class="text-xs text-slate-500">${escapeHtml([c.form_level_label, c.school_year].filter(Boolean).join(' · '))}</div>
                </td>
                <td class="p-3">${Number(c.active_students || 0)}/${Number(c.total_students || 0)}</td>
                <td class="p-3">${Number(c.minutes_week || 0)}</td>
                <td class="p-3">${c.avg_mastery != null ? Number(c.avg_mastery) + '%' : '—'}</td>
                <td class="p-3">${escapeHtml(rate)}</td>
                <td class="p-3 text-amber-700">${Number(c.worksheet_ungraded || 0)}</td>
                <td class="p-3 text-red-600">${Number(c.worksheet_overdue || 0)}</td>
                <td class="p-3">${escapeHtml(summer)}</td>
                <td class="p-3">
                    <a href="${escapeHtml(spaHref(link))}" data-spa-nav="${escapeHtml(link)}" class="text-indigo-600 hover:underline text-sm">${escapeHtml(t('報告', 'Report'))}</a>
                </td>
            </tr>`;
        }).join('');

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 儀表板', '← Dashboard'))}</a>
                <a href="${escapeHtml(spaHref('/admin/inbox'))}" data-spa-nav="/admin/inbox" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('待批改／逾期', 'Inbox'))}</a>
                <a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('課程', 'Courses'))}</a>
            </div>
            <p class="text-sm text-slate-500 mb-4">${escapeHtml(t('各班活躍度、工作紙呈交與待批改摘要。', 'Per-class activity, worksheet submission, and grading backlog.'))}</p>
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left"><tr>
                        <th class="p-3">${escapeHtml(t('班級', 'Class'))}</th>
                        <th class="p-3">${escapeHtml(t('本週活躍', 'Active'))}</th>
                        <th class="p-3">${escapeHtml(t('分鐘', 'Minutes'))}</th>
                        <th class="p-3">${escapeHtml(t('掌握度', 'Mastery'))}</th>
                        <th class="p-3">${escapeHtml(t('呈交率', 'Submit %'))}</th>
                        <th class="p-3">${escapeHtml(t('待批', 'Ungraded'))}</th>
                        <th class="p-3">${escapeHtml(t('逾期', 'Overdue'))}</th>
                        <th class="p-3">${escapeHtml(t('暑期%', 'Summer %'))}</th>
                        <th class="p-3"></th>
                    </tr></thead>
                    <tbody>${rows || `<tr><td colspan="9" class="p-6 text-center text-slate-500">${escapeHtml(t('尚無課程', 'No classes'))}</td></tr>`}</tbody>
                </table>
            </div>`;

        box.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
    }
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminSchoolOverview,
});
