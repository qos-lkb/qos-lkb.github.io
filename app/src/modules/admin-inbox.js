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

function statusLabel(st) {
    if (st === 'ungraded') return t('待批改', 'Ungraded');
    if (st === 'overdue_missing') return t('逾期未交', 'Overdue');
    return st;
}

function reminderText(item) {
    const due = item.due_at ? String(item.due_at) : t('（無截止日期）', '(no due date)');
    return t(
        `同學你好，請盡快完成「${item.title}」（截止：${due}）。如有困難請聯絡老師。`,
        `Please complete "${item.title}" soon (due: ${due}). Contact your teacher if you need help.`
    );
}

async function renderAdminInbox() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('待批改／逾期', 'Grading inbox');

    if (!requireCoursesAccess()) {
        if (global.ScienceApi.getUser()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
        }
        return;
    }

    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        const [inbox, classesData] = await Promise.all([
            global.ScienceApi.apiFetch('/teacher/inbox'),
            global.ScienceApi.apiFetch('/teacher/classes').catch(() => ({ classes: [] })),
        ]);
        const items = inbox.items || [];
        const count = inbox.count || {};
        const classes = classesData.classes || [];

        const params = new URLSearchParams(location.search);
        let filterClass = params.get('class_id') || '';
        let filterStatus = params.get('status') || '';

        function filtered() {
            return items.filter((it) => {
                if (filterClass && String(it.class_id) !== String(filterClass)) return false;
                if (filterStatus && String(it.status) !== String(filterStatus)) return false;
                return true;
            });
        }

        function renderTable() {
            const rows = filtered().map((it) => {
                const badge = it.status === 'overdue_missing'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200';
                const dossier = `/admin/courses/${it.class_id}/students/${it.student_user_id}`;
                return `<tr class="border-t border-slate-100 align-top">
                    <td class="p-3">
                        <span class="inline-block text-xs px-2 py-0.5 rounded border ${badge}">${escapeHtml(statusLabel(it.status))}</span>
                        <div class="font-medium mt-1">${escapeHtml(it.title || '')}</div>
                        <div class="text-xs text-slate-500">${escapeHtml(it.class_name || '')}</div>
                    </td>
                    <td class="p-3">
                        <div class="font-medium">${escapeHtml(it.student_name || '')}</div>
                        <div class="text-xs text-slate-500">${escapeHtml(it.student_email || '')}</div>
                    </td>
                    <td class="p-3 text-xs">${it.due_at ? escapeHtml(it.due_at) : '—'}</td>
                    <td class="p-3 whitespace-nowrap space-x-2">
                        <a href="${escapeHtml(spaHref(it.deep_link || dossier))}" data-spa-nav="${escapeHtml(it.deep_link || dossier)}"
                           class="text-indigo-600 hover:underline text-sm">${escapeHtml(it.status === 'ungraded' ? t('批改', 'Grade') : t('檢視', 'View'))}</a>
                        <a href="${escapeHtml(spaHref(dossier))}" data-spa-nav="${escapeHtml(dossier)}"
                           class="text-slate-600 hover:underline text-sm">${escapeHtml(t('課業', 'Dossier'))}</a>
                        ${it.status === 'overdue_missing' ? `<button type="button" class="inbox-chase text-sm text-amber-700 hover:underline" data-email="${escapeHtml(it.student_email || '')}" data-reminder="${escapeHtml(reminderText(it))}">${escapeHtml(t('催交', 'Chase'))}</button>` : ''}
                    </td>
                </tr>`;
            }).join('');

            const tableBody = document.getElementById('inbox-tbody');
            if (tableBody) {
                tableBody.innerHTML = rows
                    || `<tr><td colspan="4" class="p-6 text-center text-slate-500">${escapeHtml(t('目前沒有項目。', 'Inbox is empty.'))}</td></tr>`;
            }
            bindNav();
            bindChase();
        }

        function bindNav() {
            box.querySelectorAll('[data-spa-nav]').forEach((a) => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
                });
            });
        }

        function bindChase() {
            box.querySelectorAll('.inbox-chase').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const text = btn.getAttribute('data-reminder') || '';
                    const email = btn.getAttribute('data-email') || '';
                    const payload = email ? `${email}\n\n${text}` : text;
                    try {
                        await navigator.clipboard.writeText(payload);
                        const flash = document.getElementById('inbox-flash');
                        if (flash) {
                            flash.textContent = t('已複製催交文案到剪貼簿。', 'Reminder copied to clipboard.');
                            flash.classList.remove('hidden', 'text-red-600');
                            flash.classList.add('text-emerald-700');
                        }
                    } catch (err) {
                        window.prompt(t('請複製以下文案：', 'Copy this reminder:'), payload);
                    }
                });
            });
        }

        const classOpts = classes.map((c) =>
            `<option value="${Number(c.id)}"${String(filterClass) === String(c.id) ? ' selected' : ''}>${escapeHtml(c.name || '')}</option>`
        ).join('');

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 儀表板', '← Dashboard'))}</a>
                <a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('課程', 'Courses'))}</a>
            </div>
            <div class="grid sm:grid-cols-3 gap-4 mb-6">
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p class="text-xs text-slate-500">${escapeHtml(t('待批改', 'Ungraded'))}</p>
                    <p class="text-2xl font-bold text-amber-600">${Number(count.ungraded || 0)}</p>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p class="text-xs text-slate-500">${escapeHtml(t('逾期未交', 'Overdue'))}</p>
                    <p class="text-2xl font-bold text-red-600">${Number(count.overdue_missing || 0)}</p>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p class="text-xs text-slate-500">${escapeHtml(t('合計', 'Total'))}</p>
                    <p class="text-2xl font-bold text-slate-900">${Number(count.total || 0)}</p>
                </div>
            </div>
            <p id="inbox-flash" class="text-sm mb-3 hidden"></p>
            <div class="flex flex-wrap gap-3 mb-4">
                <label class="text-sm text-slate-600">${escapeHtml(t('班級', 'Class'))}
                    <select id="inbox-class" class="ml-2 border rounded-lg px-2 py-1.5">
                        <option value="">${escapeHtml(t('全部', 'All'))}</option>
                        ${classOpts}
                    </select>
                </label>
                <label class="text-sm text-slate-600">${escapeHtml(t('狀態', 'Status'))}
                    <select id="inbox-status" class="ml-2 border rounded-lg px-2 py-1.5">
                        <option value="">${escapeHtml(t('全部', 'All'))}</option>
                        <option value="ungraded"${filterStatus === 'ungraded' ? ' selected' : ''}>${escapeHtml(t('待批改', 'Ungraded'))}</option>
                        <option value="overdue_missing"${filterStatus === 'overdue_missing' ? ' selected' : ''}>${escapeHtml(t('逾期未交', 'Overdue'))}</option>
                    </select>
                </label>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left"><tr>
                        <th class="p-3">${escapeHtml(t('項目', 'Item'))}</th>
                        <th class="p-3">${escapeHtml(t('學生', 'Student'))}</th>
                        <th class="p-3">${escapeHtml(t('截止', 'Due'))}</th>
                        <th class="p-3">${escapeHtml(t('操作', 'Actions'))}</th>
                    </tr></thead>
                    <tbody id="inbox-tbody"></tbody>
                </table>
            </div>`;

        document.getElementById('inbox-class')?.addEventListener('change', (e) => {
            filterClass = e.target.value;
            renderTable();
        });
        document.getElementById('inbox-status')?.addEventListener('change', (e) => {
            filterStatus = e.target.value;
            renderTable();
        });

        renderTable();
        bindNav();
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
    }
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminInbox,
});
