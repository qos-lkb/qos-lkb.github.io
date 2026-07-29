'use strict';
const global = window;

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
            const base = (global.ScienceApi && ScienceApi.SITE_BASE) || '';
            const login = escapeHtml(base + '/login.php?next=' + encodeURIComponent('app/dashboard'));
            main.innerHTML = `<div class="max-w-lg mx-auto text-center py-12">
                <p class="text-slate-600 mb-4">${t('請先登入以查看學習儀表板。', 'Please log in to view your learning dashboard.')}</p>
                <a href="${login}" class="text-indigo-600 underline">${t('登入', 'Log in')}</a>
            </div>`;
            return;
        }

        const summary = data.summary || {};
        const goal = data.goal;
        const continueItems = data.continue_learning || [];
        const mastery = data.mastery || [];
        const rec = data.recommendations || {};
        const streak = data.streak || null;
        const badges = data.badges || [];
        const bookmarks = data.bookmarks || [];
        const pendingAssignments = data.worksheet_assignments || [];
        const lang = getLang();

        // Phase 1: class leaderboard (Top N / weekly champion)
        let leaderboard = null;
        try {
            const classResp = await apiFetch('/student/classes');
            const classes = classResp.classes || [];
            const classId = classes[0] ? Number(classes[0].id) : 0;
            if (classId) {
                leaderboard = await apiFetch(`/learning/class-leaderboard?class_id=${encodeURIComponent(classId)}&limit=5`);
            }
        } catch (e) {
            leaderboard = null;
        }

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

        function badgePillHtml(b) {
            const text = lang === 'zh' ? (b.label_zh || '') : (b.label_en || '');
            if (!text) return '';
            return `<span class="inline-flex items-center px-2 py-1 rounded-full border border-slate-200 bg-white text-xs text-slate-700">${escapeHtml(text)}</span>`;
        }

        const streakHtml = streak
            ? `<div>
                <p class="text-xs text-slate-400 uppercase tracking-wide">${t('連續學習', 'Streak')}</p>
                <p class="text-3xl font-bold text-indigo-600 mt-1">${Number(streak.current_streak_days || 0)} <span class="text-lg font-normal">${t('天', 'days')}</span></p>
                <p class="text-sm text-slate-500 mt-1">${t('最佳連續', 'Best')}：${Number(streak.best_streak_days || 0)} ${t('天', 'days')}</p>
            </div>`
            : `<p class="text-sm text-slate-500">${t('完成小測後顯示連續學習。', 'Streak will appear after you complete quizzes.')}</p>`;

        const badgesHtml = badges.length
            ? `<div class="flex flex-wrap gap-2 mt-3">${badges.slice(0, 8).map(badgePillHtml).filter(Boolean).join('')}</div>`
            : `<p class="text-sm text-slate-500 mt-3">${t('完成內容後將解鎖徽章。', 'Badges unlock as you complete content.')}</p>`;

        const BOOKMARK_TYPE_LABEL = {
            note: { zh: '筆記', en: 'Note' },
            worksheet: { zh: '工作紙', en: 'Worksheet' },
            article: { zh: '文章', en: 'Article' },
            learning_tool: { zh: '互動測驗', en: 'Quiz' },
            question_bank: { zh: '試題庫', en: 'Question bank' },
            video: { zh: '影片', en: 'Video' },
            simulation: { zh: '模擬', en: 'Simulation' },
        };

        function bookmarkTypeLabel(type) {
            const v = BOOKMARK_TYPE_LABEL[type] || { zh: type, en: type };
            return lang === 'zh' ? v.zh : v.en;
        }

        const bookmarksHtml = bookmarks.length
            ? `<div class="space-y-2">${bookmarks.slice(0, 6).map((bm) => {
                const title = lang === 'zh' ? (bm.title_zh || bm.title_en || '') : (bm.title_en || bm.title_zh || '');
                const label = bookmarkTypeLabel(bm.content_type || '');
                return `<button type="button" class="w-full text-left px-3 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${escapeHtml(bm.route || '')}">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-xs text-slate-500">${escapeHtml(label)}</span>
                        <span class="text-sm font-medium text-slate-800 truncate flex-1">${escapeHtml(title)}</span>
                    </div>
                </button>`;
            }).join('')}</div>`
            : `<p class="text-sm text-slate-500">${t('收藏內容以便稍後回看。', 'Bookmark items to review later.')}</p>`;

        const leaderboardHtml = leaderboard
            ? `<div>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-xs text-slate-400 uppercase tracking-wide">${t('同班排行榜', 'Class leaderboard')}</p>
                        <p class="text-sm font-bold text-slate-900 mt-1">
                            ${leaderboard.my_rank ? t('你目前排名', 'Your current rank') + '：#' + Number(leaderboard.my_rank) : t('Top N 本週表現', 'Top N this week')}
                        </p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 uppercase tracking-wide">${t('本週挑戰', 'Weekly challenge')}</p>
                        <p class="text-sm font-bold text-indigo-700 mt-1">
                            ${leaderboard.weekly_champion ? escapeHtml(lang === 'zh' ? (leaderboard.weekly_champion.display_name || '') : (leaderboard.weekly_champion.display_name || '')) : '—'}
                        </p>
                        <p class="text-xs text-slate-500">${leaderboard.weekly_champion ? Number(leaderboard.weekly_champion.minutes_week || 0) : 0} ${t('分鐘', 'min')}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    ${leaderboard.leaders && leaderboard.leaders.length
                        ? leaderboard.leaders.map((s, i) => {
                            const dn = s.display_name || '';
                            const am = Number(s.avg_mastery || 0);
                            const mw = Number(s.minutes_week || 0);
                            return `
                                <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                                    <span class="text-sm font-medium text-slate-800">${i + 1}. ${escapeHtml(dn)}</span>
                                    <span class="text-xs text-slate-600">${am}% · ${mw} ${t('分鐘', 'min')}</span>
                                </div>`;
                        }).join('')
                        : `<p class="text-sm text-slate-500">${t('尚無排行榜資料。', 'No leaderboard data yet.')}</p>`}
                </div>
            </div>`
            : `<p class="text-sm text-slate-500">${t('加入班別後顯示排行榜。', 'Join a class to see leaderboard.')}</p>`;

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
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <button type="button" id="dash-goto-summer" class="text-indigo-600 hover:underline">${t('暑期功課', 'Summer homework')} →</button>
                        <button type="button" id="dash-goto-courses" class="text-indigo-600 hover:underline">${t('瀏覽自學課程', 'Browse courses')} →</button>
                    </div>
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

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-2">${t('連續學習 / 徽章 / 收藏', 'Streak / Badges / Bookmarks')}</h2>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            ${streakHtml}
                            <div class="mt-5">
                                <p class="text-sm font-bold text-slate-800">${t('徽章', 'Badges')}</p>
                                ${badgesHtml}
                            </div>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-800 mb-2">${t('我的收藏', 'My bookmarks')}</p>
                            ${bookmarksHtml}
                        </div>
                    </div>
                </section>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${t('同班排行榜 / 本週挑戰', 'Class leaderboard / Weekly challenge')}</h2>
                    ${leaderboardHtml}
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
        document.getElementById('dash-goto-summer')?.addEventListener('click', () => navigate('/summer-homework'));
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

export {};
