(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;

    function masteryBarClass(score) {
        if (score < 60) return 'bg-red-500';
        if (score > 80) return 'bg-emerald-500';
        return 'bg-amber-500';
    }

    function statusLabel(status) {
        if (status === 'weak') return t('薄弱', 'Needs work');
        if (status === 'mastered') return t('已掌握', 'Mastered');
        return t('進行中', 'In progress');
    }

    async function renderDashboard() {
        const main = document.getElementById('main-content');
        document.getElementById('sidebar').style.display = 'none';
        document.body.classList.remove('sidebar-tab-active');

        main.innerHTML = `<div class="max-w-5xl mx-auto"><p class="text-slate-500">${t('載入中…', 'Loading…')}</p></div>`;

        let data;
        try {
            data = await apiFetch('/learning/dashboard');
        } catch (e) {
            main.innerHTML = `<div class="max-w-lg mx-auto text-center py-12">
                <p class="text-slate-600 mb-4">${t('請先登入以查看學習儀表板。', 'Please log in to view your learning dashboard.')}</p>
                <a href="../login.php?next=${encodeURIComponent('app/dashboard')}" class="text-indigo-600 underline">${t('登入', 'Log in')}</a>
            </div>`;
            return;
        }

        const summary = data.summary || {};
        const goal = data.goal;
        const continueItems = data.continue_learning || [];
        const mastery = data.mastery || [];
        const rec = data.recommendations || {};
        const pendingAssignments = data.worksheet_assignments || [];
        const lang = getLang();

        let goalHtml = '';
        if (goal) {
            const label = goal.goal_type === 'weekly_items'
                ? t('本週完成項目', 'Weekly items')
                : t('本週學習分鐘', 'Weekly minutes');
            goalHtml = `<p class="text-sm text-indigo-100">${label}：${goal.target_value}</p>`;
        }

        const continueHtml = continueItems.length
            ? continueItems.map((item) => {
                const title = lang === 'zh' ? item.title_zh : item.title_en;
                return `<button type="button" class="dash-continue block w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${escapeHtml(item.route)}">
                    <span class="text-xs text-slate-400 uppercase">${escapeHtml(item.content_type)}</span>
                    <span class="block font-medium text-slate-800">${escapeHtml(title)}</span>
                </button>`;
            }).join('')
            : `<p class="text-sm text-slate-500">${t('暫無未完成項目', 'No items in progress')}</p>`;

        const masteryHtml = mastery.length
            ? mastery.slice(0, 12).map((m) => {
                const name = lang === 'zh' ? m.name_zh : m.name_en;
                const score = parseFloat(m.mastery_score) || 0;
                const status = m.status || (score < 60 ? 'weak' : (score > 80 ? 'mastered' : 'in_progress'));
                return `<div class="mb-3">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-700 truncate pr-2">${escapeHtml(name)}</span>
                        <span class="text-slate-500 flex-shrink-0">${Math.round(score)}% · ${statusLabel(status)}</span>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full ${masteryBarClass(score)} rounded-full" style="width:${Math.min(100, score)}%"></div>
                    </div>
                </div>`;
            }).join('')
            : `<p class="text-sm text-slate-500">${t('完成測驗後將顯示掌握度', 'Complete quizzes to see mastery')}</p>`;

        let suggestHtml = '';
        const weak = rec.weak_topics || [];
        if (weak.length) {
            suggestHtml = weak.map((wt) => {
                const name = lang === 'zh' ? wt.name_zh : wt.name_en;
                const items = (wt.suggested_items || []).slice(0, 2).map((it) => {
                    const ttitle = lang === 'zh' ? it.title_zh : it.title_en;
                    return `<button type="button" class="dash-suggest text-left text-indigo-600 text-sm hover:underline block" data-route="${escapeHtml(it.route)}">${escapeHtml(ttitle)}</button>`;
                }).join('');
                return `<div class="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-2">
                    <p class="font-medium text-amber-900 text-sm">${escapeHtml(name)} (${Math.round(wt.mastery)}%)</p>
                    ${items}
                </div>`;
            }).join('');
        } else if (rec.next_course_item) {
            const ni = rec.next_course_item;
            const ntitle = lang === 'zh' ? ni.title_zh : ni.title_en;
            suggestHtml = `<button type="button" class="dash-suggest block w-full text-left p-4 rounded-xl bg-indigo-50 border border-indigo-100" data-route="${escapeHtml(ni.route)}">
                <p class="text-sm text-indigo-600">${t('建議下一步', 'Suggested next')}</p>
                <p class="font-bold text-indigo-900">${escapeHtml(ntitle)}</p>
            </button>`;
        } else {
            suggestHtml = `<p class="text-sm text-slate-500">${t('繼續探索課程內容', 'Keep exploring course content')}</p>`;
        }

        const assignStatusLabel = (s) => {
            if (s === 'submitted') return t('已提交', 'Submitted');
            return t('待完成', 'To do');
        };
        const assignmentsHtml = pendingAssignments.length
            ? pendingAssignments.map((a) => {
                const title = lang === 'zh' ? a.title_zh : a.title_en;
                const due = a.due_at ? ` · ${t('截止', 'Due')} ${String(a.due_at).slice(0, 10)}` : '';
                return `<button type="button" class="dash-assign block w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${escapeHtml(a.route)}">
                    <span class="text-xs text-slate-400">${escapeHtml(a.class_name || '')}${due}</span>
                    <span class="block font-medium text-slate-800">${escapeHtml(title)}</span>
                    <span class="text-xs text-amber-700">${assignStatusLabel(a.submission_status)}</span>
                </button>`;
            }).join('')
            : `<p class="text-sm text-slate-500">${t('沒有待完成習作', 'No pending assignments')}</p>`;

        main.innerHTML = `
            <div class="max-w-5xl mx-auto space-y-8">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t('我的學習', 'My Learning')}</h1>
                        <p class="text-sm text-slate-500 mt-1">${t('自主規劃學習路徑，追蹤進度與掌握度。', 'Plan your path and track progress.')}</p>
                    </div>
                    <button type="button" id="dash-goto-courses" class="text-sm text-indigo-600 hover:underline">${t('瀏覽自學課程', 'Browse courses')} →</button>
                </div>

                <div class="grid sm:grid-cols-3 gap-4">
                    <div class="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 shadow-lg">
                        <p class="text-xs uppercase tracking-wide text-indigo-200">${t('今日學習', 'Today')}</p>
                        <p class="text-3xl font-bold mt-1">${summary.minutes_today || 0} <span class="text-lg font-normal">${t('分鐘', 'min')}</span></p>
                        ${goalHtml}
                    </div>
                    <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-slate-400">${t('本週學習', 'This week')}</p>
                        <p class="text-3xl font-bold text-slate-900 mt-1">${summary.minutes_week || 0} <span class="text-lg font-normal text-slate-500">${t('分鐘', 'min')}</span></p>
                    </div>
                    <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-slate-400">${t('今日完成', 'Completed today')}</p>
                        <p class="text-3xl font-bold text-emerald-600 mt-1">${summary.completions_today || 0}</p>
                    </div>
                </div>

                <div class="grid lg:grid-cols-2 gap-6">
                    <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div class="flex items-center justify-between gap-2 mb-4">
                            <h2 class="text-lg font-bold text-slate-900">${t('課程習作', 'Assignments')}</h2>
                            <button type="button" id="dash-goto-assignments" class="text-sm text-indigo-600 hover:underline">${t('全部', 'All')} →</button>
                        </div>
                        <div class="space-y-2">${assignmentsHtml}</div>
                    </section>
                    <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h2 class="text-lg font-bold text-slate-900 mb-4">${t('繼續學習', 'Continue learning')}</h2>
                        <div class="space-y-2">${continueHtml}</div>
                    </section>
                </div>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${t('建議學習', 'Recommendations')}</h2>
                    ${suggestHtml}
                </section>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${t('課題掌握度', 'Topic mastery')}</h2>
                    ${masteryHtml}
                </section>

                <section class="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                    <h2 class="text-lg font-bold text-slate-900 mb-2">${t('每週學習目標', 'Weekly goal')}</h2>
                    <form id="goal-form" class="flex flex-wrap gap-3 items-end">
                        <div>
                            <label class="block text-xs text-slate-500 mb-1">${t('目標類型', 'Type')}</label>
                            <select id="goal-type" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="weekly_minutes">${t('學習分鐘', 'Minutes')}</option>
                                <option value="weekly_items">${t('完成項目', 'Items')}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-slate-500 mb-1">${t('目標值', 'Target')}</label>
                            <input type="number" id="goal-value" min="1" max="999" value="${goal ? goal.target_value : 60}" class="border rounded-lg px-3 py-2 text-sm w-24">
                        </div>
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${t('儲存', 'Save')}</button>
                    </form>
                    <p class="text-xs text-slate-400 mt-3">${t('本平台記錄學習活動以提供個人化建議；詳見私隱說明。', 'Learning activity is recorded to personalize recommendations.')}</p>
                </section>
            </div>`;

        if (goal) {
            const gt = document.getElementById('goal-type');
            if (gt) gt.value = goal.goal_type;
        }

        document.getElementById('dash-goto-courses')?.addEventListener('click', () => navigate('/courses'));
        document.getElementById('dash-goto-assignments')?.addEventListener('click', () => navigate('/assignments'));
        main.querySelectorAll('[data-route]').forEach((el) => {
            el.addEventListener('click', () => navigate(el.getAttribute('data-route')));
        });

        document.getElementById('goal-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/learning/goals', {
                    method: 'POST',
                    body: {
                        goal_type: document.getElementById('goal-type').value,
                        target_value: parseInt(document.getElementById('goal-value').value, 10) || 60,
                    },
                });
                await renderDashboard();
            } catch (err) {
                alert(err.message || 'Failed');
            }
        });
    }

    global.AppDashboard = { renderDashboard };
})(window);
