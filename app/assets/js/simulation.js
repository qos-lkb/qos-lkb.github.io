(function (global) {
    'use strict';

    const { apiFetch, API_BASE, SITE_BASE } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;

    function resolveAssetUrl(path) {
        if (!path) return path;
        if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path;
        if (path.startsWith('/')) return path;
        const base = SITE_BASE || '';
        return (base ? base.replace(/\/$/, '') : '') + '/' + path.replace(/^\.\//, '');
    }

    async function renderSimulation(slug) {
        const main = document.getElementById('main-content');
        if (global.AppCatalog && global.AppCatalog.closeModal) {
            global.AppCatalog.closeModal();
        }
        try {
            const sim = await apiFetch('/simulations/' + encodeURIComponent(slug));
            if (global.AppLearningTracker) {
                global.AppLearningTracker.trackContentOpen('simulation', slug, {
                    subject_id: sim.subject_id,
                    topic_id: sim.topic_id,
                });
            }
            const lang = getLang();
            const title = lang === 'zh' ? sim.title_zh : sim.title_en;
            const screenshot = resolveAssetUrl(sim.screenshot_path || '');

            const metaParts = [];
            if (global.AppCourse && global.AppCourse.isCourseMode()) {
                const ctx = global.AppCourse.getCourseContext();
                if (ctx) {
                    const topicCtx = global.AppCourse.findTopic(ctx.subjectSlug, ctx.topicSlug);
                    if (topicCtx) {
                        const sub = lang === 'zh' ? topicCtx.subject.name_zh : topicCtx.subject.name_en;
                        const top = lang === 'zh' ? topicCtx.topic.name_zh : topicCtx.topic.name_en;
                        metaParts.push(`${sub} · ${top}`);
                    }
                }
            }
            metaParts.push(t('模擬實驗', 'Simulation'));

            const backRoute = global.AppCourse && global.AppCourse.isCourseMode()
                ? global.AppCourse.getBackRoute()
                : '/simulations';

            main.innerHTML = `
                <div class="reading-page" id="simulation-page">
                    <button type="button" id="simulation-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回', 'Back')}</button>
                    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                    <p class="text-sm text-slate-500 mb-6">${metaParts.map((p) => escapeHtml(p)).join(' · ')}</p>
                    <button type="button" id="simulation-launch" class="course-sim-launch w-full max-w-xl text-left bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                        <div class="h-40 sm:h-48 bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                            ${screenshot
                                ? `<img src="${escapeHtml(screenshot)}" alt="" class="w-full h-full object-cover">`
                                : `<span class="text-5xl" aria-hidden="true">🔬</span>`}
                        </div>
                        <div class="p-5 flex items-center gap-4">
                            <span class="text-3xl flex-shrink-0" aria-hidden="true">🔬</span>
                            <div class="min-w-0 flex-1">
                                <p class="font-semibold text-slate-800">${t('開始模擬實驗', 'Start simulation')}</p>
                                <p class="text-sm text-slate-500 mt-0.5">${t('點擊以全螢幕開啟互動模擬', 'Click to open the interactive simulation')}</p>
                            </div>
                            <svg class="w-6 h-6 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                    </button>
                </div>`;

            document.getElementById('simulation-back').onclick = () => navigate(backRoute);
            document.getElementById('simulation-launch').onclick = () => {
                if (global.AppCourse && global.AppCourse.openSimulation) {
                    global.AppCourse.openSimulation(slug);
                } else if (global.AppCatalog && global.AppCatalog.openModal) {
                    global.AppCatalog.openModal(API_BASE + '/simulations/' + encodeURIComponent(slug) + '/html');
                }
            };

            if (global.AppCourse && global.AppCourse.isCourseMode()) {
                global.AppCourse.attachItemNav(document.getElementById('simulation-page'), 'simulation', slug);
            }
        } catch (err) {
            main.innerHTML = `
                <div class="reading-page">
                    <button type="button" id="simulation-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回', 'Back')}</button>
                    <p class="text-red-600">${escapeHtml(err.message || t('無法載入模擬實驗。', 'Could not load simulation.'))}</p>
                </div>`;
            document.getElementById('simulation-back').onclick = () => navigate('/courses');
        }
    }

    global.AppSimulation = { renderSimulation };
})(window);
