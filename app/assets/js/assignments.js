(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;

    function statusLabel(status) {
        const map = {
            pending: t('未開始', 'Not started'),
            submitted: t('已提交', 'Submitted'),
            graded: t('已評分', 'Graded'),
            active: t('進行中', 'Active'),
            closed: t('已結束', 'Closed'),
        };
        return map[status] || status;
    }

    function statusBadgeClass(status) {
        if (status === 'graded') return 'bg-emerald-100 text-emerald-800';
        if (status === 'submitted') return 'bg-indigo-100 text-indigo-800';
        if (status === 'pending') return 'bg-amber-100 text-amber-800';
        return 'bg-slate-100 text-slate-700';
    }

    function formatDue(dueAt) {
        if (!dueAt) return '';
        const d = new Date(dueAt.replace(' ', 'T'));
        if (Number.isNaN(d.getTime())) return dueAt.slice(0, 16);
        return d.toLocaleString(getLang() === 'zh' ? 'zh-HK' : 'en-GB', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }

    async function renderAssignmentsList() {
        const main = document.getElementById('main-content');
        document.getElementById('sidebar').style.display = 'none';
        document.body.classList.remove('sidebar-tab-active');

        main.innerHTML = `<div class="max-w-3xl mx-auto"><p class="text-slate-500">${t('載入中…', 'Loading…')}</p></div>`;

        let data;
        try {
            data = await apiFetch('/student/worksheet-assignments');
        } catch (e) {
            main.innerHTML = `<div class="max-w-lg mx-auto text-center py-12">
                <p class="text-slate-600 mb-4">${t('請先登入以查看課程習作。', 'Please log in to view assignments.')}</p>
                <a href="../login.php?next=${encodeURIComponent('app/assignments')}" class="text-indigo-600 underline">${t('登入', 'Log in')}</a>
            </div>`;
            return;
        }

        const lang = getLang();
        const items = data.assignments || [];

        const listHtml = items.length
            ? items.map((a) => {
                const title = lang === 'zh' ? (a.title_zh || a.worksheet_title_zh) : (a.title_en || a.worksheet_title_en);
                const sub = a.submission || {};
                const due = a.due_at ? `<span class="text-xs text-slate-500">${t('截止', 'Due')}: ${escapeHtml(formatDue(a.due_at))}</span>` : '';
                const score = sub.status === 'graded' && sub.score != null
                    ? `<span class="text-xs font-medium text-emerald-700">${sub.score} / ${a.max_score}</span>`
                    : '';
                return `<button type="button" class="assign-item block w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition" data-id="${a.id}">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p class="text-xs text-slate-400">${escapeHtml(a.class_name || '')}</p>
                            <p class="font-semibold text-slate-900">${escapeHtml(title || a.worksheet_slug)}</p>
                        </div>
                        <span class="text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(sub.status)}">${statusLabel(sub.status)}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-3">${due}${score}</div>
                </button>`;
            }).join('')
            : `<p class="text-sm text-slate-500">${t('目前沒有派發的習作。', 'No assignments yet.')}</p>`;

        main.innerHTML = `
            <div class="max-w-3xl mx-auto space-y-6">
                <div>
                    <button type="button" id="assign-back-dash" class="text-indigo-600 text-sm mb-3 hover:underline">← ${t('我的學習', 'My learning')}</button>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t('課程習作', 'Course assignments')}</h1>
                    <p class="text-sm text-slate-500 mt-1">${t('完成老師派發的工作紙習作，並查看評分。', 'Complete worksheet assignments from your teachers.')}</p>
                </div>
                <div class="space-y-3">${listHtml}</div>
            </div>`;

        document.getElementById('assign-back-dash')?.addEventListener('click', () => navigate('/dashboard'));
        main.querySelectorAll('.assign-item').forEach((btn) => {
            btn.addEventListener('click', () => navigate('/assignment/' + btn.dataset.id));
        });
    }

    async function renderAssignment(assignmentId) {
        const main = document.getElementById('main-content');
        document.getElementById('sidebar').style.display = 'none';
        document.body.classList.remove('sidebar-tab-active');

        let data;
        try {
            data = await apiFetch('/student/worksheet-assignments/' + assignmentId);
        } catch (e) {
            main.innerHTML = `<div class="max-w-lg mx-auto py-12 text-center">
                <p class="text-slate-600 mb-4">${escapeHtml(e.message || t('無法載入習作。', 'Could not load assignment.'))}</p>
                <button type="button" id="assign-back-list" class="text-indigo-600 underline">${t('返回習作列表', 'Back to assignments')}</button>
            </div>`;
            document.getElementById('assign-back-list')?.addEventListener('click', () => navigate('/assignments'));
            return;
        }

        const a = data.assignment;
        const slug = a.worksheet_slug;
        if (global.AppWorksheet && typeof global.AppWorksheet.renderWorksheet === 'function') {
            await global.AppWorksheet.renderWorksheet(slug, {
                assignmentId: parseInt(String(assignmentId), 10),
                assignment: a,
                submission: data.submission,
            });
        }
    }

    global.AppAssignments = { renderAssignmentsList, renderAssignment };
})(window);
