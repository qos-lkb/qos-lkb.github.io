(function () {
    'use strict';

    const NAV_LABELS = {
        courses: { zh: '自學課程', en: 'Self-study' },
        notes: { zh: '課程及學習筆記', en: 'Courses & Notes' },
        worksheets: { zh: '工作紙', en: 'Worksheets' },
        videos: { zh: '學習影片', en: 'Videos' },
        simulations: { zh: '模擬程式', en: 'Simulations' },
        articles: { zh: '科學文章', en: 'Science Articles' },
        learning: { zh: '互動學習工具', en: 'Interactive Tools' },
        summer: { zh: '暑期功課', en: 'Summer HW' },
    };

    const TAB_ROUTES = {
        summer: '/summer-homework',
        courses: '/courses',
        notes: '/learning-notes',
        worksheets: '/worksheets',
        videos: '/learning-videos',
        simulations: '/simulations',
        articles: '/articles',
        learning: '/learning-tools',
    };

    /** @type {Record<string, boolean>|null} */
    let navVisibility = null;

    function applyNavVisibility(items) {
        navVisibility = items && typeof items === 'object' ? items : null;
        document.querySelectorAll('.nav-tab').forEach((btn) => {
            const key = btn.dataset.tab;
            const show = !navVisibility || navVisibility[key] !== false;
            btn.classList.toggle('hidden', !show);
            btn.toggleAttribute('hidden', !show);
            if (!show) {
                btn.classList.remove('active');
                btn.classList.add('text-indigo-200');
            }
        });
    }

    function firstVisibleTabRoute() {
        const order = Object.keys(TAB_ROUTES);
        for (const key of order) {
            if (!navVisibility || navVisibility[key] !== false) {
                return TAB_ROUTES[key];
            }
        }
        return '/courses';
    }

    function isTabVisible(tab) {
        return !navVisibility || navVisibility[tab] !== false;
    }

    async function refreshNavVisibility() {
        try {
            if (!window.ScienceApi || !ScienceApi.apiFetch) {
                applyNavVisibility(null);
                return;
            }
            const data = await ScienceApi.apiFetch('/nav-menu');
            applyNavVisibility(data && data.items ? data.items : null);
        } catch (e) {
            applyNavVisibility(null);
        }

        const active = document.querySelector('.nav-tab.active');
        const activeTab = active?.dataset?.tab;
        if (activeTab && !isTabVisible(activeTab) && window.AppRouter?.navigate) {
            AppRouter.navigate(firstVisibleTabRoute(), true);
        }
    }

    let catalogLoaded = false;
    let firstCategoryId = null;

    function updateSiteBranding() {
        const names = window.__SITE_NAMES__;
        if (!names) return;
        const lang = AppRouter.getLang();
        const name = lang === 'zh' ? names.zh : names.en;
        const brand = document.getElementById('site-brand');
        if (brand) brand.textContent = name;
        document.title = name;
    }

    function updateNavLabels() {
        const lang = AppRouter.getLang();
        document.querySelectorAll('.nav-tab').forEach(btn => {
            const labels = NAV_LABELS[btn.dataset.tab];
            if (labels) btn.textContent = lang === 'zh' ? labels.zh : labels.en;
        });
        const coreLabel = document.getElementById('sidebar-core-label');
        if (coreLabel) {
            const courseTab = document.querySelector('.nav-tab[data-tab="courses"]')?.classList.contains('active')
                || ['notes', 'worksheets', 'videos', 'articles'].some((tab) =>
                    document.querySelector(`.nav-tab[data-tab="${tab}"]`)?.classList.contains('active')
                );
            coreLabel.textContent = lang === 'zh'
                ? (courseTab ? '課程' : '科目')
                : (courseTab ? 'Courses' : 'Subjects');
        }
        const collapseBtn = document.getElementById('btn-sidebar-collapse');
        if (collapseBtn) {
            collapseBtn.setAttribute('aria-label', lang === 'zh' ? '收合選單' : 'Collapse menu');
            collapseBtn.title = lang === 'zh' ? '收合選單' : 'Collapse menu';
        }
        const expandBtn = document.getElementById('sidebar-expand');
        if (expandBtn) {
            expandBtn.setAttribute('aria-label', lang === 'zh' ? '展開選單' : 'Expand menu');
        }
    }

    const SIDEBAR_TABS = new Set(['courses', 'simulations', 'notes', 'worksheets', 'videos', 'articles']);

    function setActiveTab(tab) {
        document.querySelectorAll('.nav-tab').forEach(btn => {
            const on = btn.dataset.tab === tab && isTabVisible(tab);
            btn.classList.toggle('active', on);
            btn.classList.toggle('text-indigo-200', !on);
        });
        const sidebar = document.getElementById('sidebar');
        const showSidebar = SIDEBAR_TABS.has(tab);
        document.body.classList.toggle('sidebar-tab-active', showSidebar);
        if (sidebar) {
            sidebar.style.display = showSidebar ? '' : 'none';
        }
        if (!showSidebar) {
            document.body.classList.remove('sidebar-is-collapsed');
            if (window.AppSidebar) AppSidebar.closeMobileSidebar();
        } else if (window.AppSidebar) {
            AppSidebar.initSidebar();
        }
        updateNavLabels();
    }

    function restoreMainShell() {
        document.getElementById('main-content').innerHTML = `
            <div class="max-w-6xl mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80">
                    <h1 id="page-title" class="text-2xl sm:text-3xl font-extrabold text-slate-900"></h1>
                </div>
                <div id="card-container" class="space-y-4"></div>
            </div>`;
    }

    async function ensureCatalog() {
        if (!catalogLoaded) {
            await AppCatalog.loadCatalog();
            catalogLoaded = true;
            const sub = await ScienceApi.apiFetch('/catalog');
            const keys = Object.keys(sub.simulations?.subjects || {});
            if (keys.length) {
                firstCategoryId = keys[0].toLowerCase().replace(/\s+/g, '-');
            }
        }
    }

    async function showHome() {
        setActiveTab('summer');
        if (window.AppSummerHomework) {
            await AppSummerHomework.renderHome();
        }
    }

    async function showSummerList(formFilter) {
        setActiveTab('summer');
        if (!window.AppSummerHomework) return;
        const user = window.ScienceApi && ScienceApi.getUser ? ScienceApi.getUser() : null;
        // Teachers/admins: hub is course list; S1/S2 routes still allow previewing published items.
        if (user && user.is_teacher && formFilter == null) {
            await AppSummerHomework.renderHome();
            return;
        }
        await AppSummerHomework.renderList(formFilter);
    }

    async function showCoursesHome() {
        restoreMainShell();
        setActiveTab('courses');
        if (window.AppCourse) {
            AppCourse.clearCourseContext();
            await AppCourse.renderCoursesHome();
        }
    }

    async function showSimulationsHome() {
        restoreMainShell();
        setActiveTab('simulations');
        await ensureCatalog();
        if (firstCategoryId) AppCatalog.showCategory(firstCategoryId, null);
    }

    document.addEventListener('langchange', async () => {
        updateNavLabels();
        updateSiteBranding();
        await AppCatalog.loadCatalog({ skipNavRender: true });
        if (window.AppCourse) await AppCourse.loadCourses(true);
        const path = location.pathname.replace(/.*\/app/, '') || '/';
        AppRouter.dispatch(path.replace(/\/index\.html/i, '') || '/');
    });

    async function boot() {
        await AppAuth.initAuth();
        if (window.AppLearningTracker) AppLearningTracker.init();
        if (window.SimModal) SimModal.init();
        if (window.AppSidebar) AppSidebar.init();
        updateNavLabels();
        updateSiteBranding();

        AppRouter.init({
            '/': showHome,
            '/index.html': showHome,
            '/courses': showCoursesHome,
            '/course/:subject': async (subjectSlug) => {
                restoreMainShell();
                setActiveTab('courses');
                if (window.AppCourse) await AppCourse.renderSubject(subjectSlug);
            },
            '/course/:subject/:topic': async (subjectSlug, topicSlug) => {
                restoreMainShell();
                setActiveTab('courses');
                if (window.AppCourse) await AppCourse.renderTopic(subjectSlug, topicSlug);
            },
            '/simulations': showSimulationsHome,
            '/learning-notes': async () => {
                restoreMainShell();
                setActiveTab('notes');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderLearningNotesList();
            },
            '/worksheets': async () => {
                restoreMainShell();
                setActiveTab('worksheets');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderWorksheetsList();
            },
            '/learning-videos': async () => {
                restoreMainShell();
                setActiveTab('videos');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderLearningVideosList();
            },
            '/learning-tools': async () => {
                restoreMainShell();
                setActiveTab('learning');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await ensureCatalog();
                AppCatalog.renderLearningToolsList();
            },
            '/articles': async () => {
                restoreMainShell();
                setActiveTab('articles');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderArticlesList();
            },
            '/quiz/:slug': async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'learning');
                document.getElementById('sidebar').style.display = window.AppCourse && AppCourse.isCourseMode() ? '' : 'none';
                await AppQuiz.renderQuiz(slug);
            },
            '/article/:slug': async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'articles');
                await AppCatalog.loadCatalog({ skipNavRender: true });
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                } else {
                    await AppCatalog.prepareArticlesSidebar(slug);
                }
                await AppArticle.renderArticle(slug);
            },
            '/note/:slug': async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'notes');
                await AppCatalog.loadCatalog({ skipNavRender: true });
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                } else {
                    await AppCatalog.prepareNotesSidebar(slug);
                }
                await AppNote.renderNote(slug);
            },
            '/worksheet/:slug': async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'worksheets');
                await AppCatalog.loadCatalog({ skipNavRender: true });
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                } else {
                    await AppCatalog.prepareWorksheetsSidebar(slug);
                }
                await AppWorksheet.renderWorksheet(slug);
            },
            '/video/:slug': async (slug) => {
                const inCourse = window.AppCourse && AppCourse.isCourseMode();
                setActiveTab(inCourse ? 'courses' : 'videos');
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.style.display = '';
                if (inCourse) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                } else {
                    await AppCatalog.loadCatalog({ skipNavRender: true });
                    await AppCatalog.prepareVideosSidebar(slug);
                }
                await AppVideo.renderVideo(slug);
            },
            '/simulation/:slug': async (slug) => {
                if (window.AppCatalog && AppCatalog.closeModal) AppCatalog.closeModal();
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'simulations');
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                }
                await AppSimulation.renderSimulation(slug);
            },
            '/dashboard': async () => {
                document.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('text-indigo-200');
                });
                if (window.AppDashboard) await AppDashboard.renderDashboard();
            },
            '/assignments': async () => {
                document.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('text-indigo-200');
                });
                if (window.AppAssignments) await AppAssignments.renderAssignmentsList();
            },
            '/assignment/:id': async (id) => {
                document.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('text-indigo-200');
                });
                if (window.AppAssignments) await AppAssignments.renderAssignment(id);
            },
            '/summer-homework': async () => {
                await showSummerList(null);
            },
            '/summer-homework/s1': async () => {
                await showSummerList('1');
            },
            '/summer-homework/s2': async () => {
                await showSummerList('2');
            },
            '/summer-homework/:slug': async (slug) => {
                setActiveTab('summer');
                if (window.AppSummerHomework) await AppSummerHomework.renderItem(slug);
            },
        });

        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (!isTabVisible(tab)) return;
                const route = TAB_ROUTES[tab];
                if (route) AppRouter.navigate(route);
            });
        });

        document.getElementById('btn-lang')?.addEventListener('click', () => AppRouter.toggleLang());

        document.getElementById('sim-modal-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            AppCatalog.closeModal();
        });
        document.getElementById('sim-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'sim-modal') AppCatalog.closeModal();
        });

        await refreshNavVisibility();
    }

    window.AppNav = {
        refresh: refreshNavVisibility,
        apply: applyNavVisibility,
        isTabVisible,
    };

    document.addEventListener('DOMContentLoaded', boot);
})();
