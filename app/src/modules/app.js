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
    /** @type {string[]|null} */
    let navOrder = null;

    function applyNavOrder(order) {
        if (!Array.isArray(order) || !order.length) return;
        navOrder = order.slice();
        const nav = document.querySelector('header nav');
        if (!nav) return;
        const tabs = Array.from(nav.querySelectorAll('.nav-tab'));
        if (!tabs.length) return;
        const byKey = {};
        tabs.forEach((btn) => {
            const key = btn.dataset.tab;
            if (key) byKey[key] = btn;
        });
        order.forEach((key) => {
            if (byKey[key]) nav.appendChild(byKey[key]);
        });
        // Append any unknown tabs last (preserve leftover order)
        tabs.forEach((btn) => {
            const key = btn.dataset.tab;
            if (key && !order.includes(key)) nav.appendChild(btn);
        });
    }

    function applyNavVisibility(items, order) {
        navVisibility = items && typeof items === 'object' ? items : null;
        if (Array.isArray(order) && order.length) {
            applyNavOrder(order);
        }
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
        const order = (navOrder && navOrder.length) ? navOrder : Object.keys(TAB_ROUTES);
        for (const key of order) {
            if (!TAB_ROUTES[key]) continue;
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
                applyNavVisibility(null, null);
                return;
            }
            const data = await ScienceApi.apiFetch('/nav-menu');
            applyNavVisibility(
                data && data.items ? data.items : null,
                data && Array.isArray(data.order) ? data.order : null
            );
        } catch (e) {
            applyNavVisibility(null, null);
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

    function clearNavTabActive() {
        document.querySelectorAll('.nav-tab').forEach((btn) => {
            btn.classList.remove('active');
            btn.classList.add('text-indigo-200');
        });
    }

    async function runAdminRoute(renderFn) {
        restoreMainShell();
        clearNavTabActive();
        // Wait for /auth/me before deciding login redirect (cold deep-links).
        if (window.AppAuth && typeof AppAuth.whenReady === 'function') {
            await AppAuth.whenReady();
        }
        if (window.AppAdminLoader) {
            const path = window.AppRouter && typeof AppRouter.getPath === 'function'
                ? AppRouter.getPath()
                : (location.pathname || '/admin');
            if (typeof AppAdminLoader.ensureAdminRoute === 'function') {
                await AppAdminLoader.ensureAdminRoute(path);
            } else if (typeof AppAdminLoader.ensureAdminModules === 'function') {
                await AppAdminLoader.ensureAdminModules();
            }
        }
        await renderFn();
    }

    async function ensureFrontModules(pathOrGroup) {
        if (window.AppFrontLoader && typeof AppFrontLoader.ensureAppRoute === 'function') {
            await AppFrontLoader.ensureAppRoute(pathOrGroup);
        }
    }

    /** Wrap a front route handler so required modules load before render. */
    function front(pathHint, fn) {
        return async (...args) => {
            await ensureFrontModules(pathHint);
            return fn(...args);
        };
    }

    async function ensureCatalog() {
        await ensureFrontModules('catalog');
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
        await ensureFrontModules('/');
        const user = window.ScienceApi && ScienceApi.getUser ? ScienceApi.getUser() : null;
        if (!user) {
            setActiveTab('');
            if (window.AppGuestHome) {
                AppGuestHome.renderGuestHome();
            }
            return;
        }
        setActiveTab('summer');
        if (window.AppSummerHomework) {
            await AppSummerHomework.renderHome();
        }
    }

    async function showSummerList(formFilter) {
        await ensureFrontModules('/summer-homework');
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
        await ensureFrontModules('/courses');
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
        await ensureFrontModules('catalog');
        if (window.AppCatalog) await AppCatalog.loadCatalog({ skipNavRender: true });
        if (window.AppCourse) await AppCourse.loadCourses(true);
        const path = location.pathname.replace(/.*\/app/, '') || '/';
        AppRouter.dispatch(path.replace(/\/index\.html/i, '') || '/');
    });

    function currentAppPath() {
        let p = location.pathname || '/';
        const appIdx = p.indexOf('/app');
        if (appIdx >= 0) {
            p = p.slice(appIdx + 4) || '/';
        }
        return p.replace(/\/index\.html$/i, '') || '/';
    }

    function isHomePath(path) {
        return path === '/' || path === '/summer-homework' || path === '/summer-homework/';
    }

    async function boot() {
        // Paint first: register routes and dispatch immediately (guest shell already in HTML).
        if (window.AppUserMenu) AppUserMenu.init();
        if (window.AppLearningTracker) AppLearningTracker.init();
        if (window.AppSidebar) AppSidebar.init();
        updateNavLabels();
        updateSiteBranding();

        // Show login link immediately while session loads.
        const authNav = document.getElementById('auth-nav');
        if (authNav && !authNav.innerHTML.trim()) {
            const base = (window.__SITE_BASE__ || '') + '/login.php?next=' + encodeURIComponent('app/');
            authNav.innerHTML = `<a href="${base}" class="user-menu-login">登入</a>`;
        }

        // Start session before first route handlers await AppAuth.whenReady().
        const authBoot = (window.AppAuth && typeof AppAuth.initAuth === 'function')
            ? AppAuth.initAuth()
            : Promise.resolve();

        AppRouter.init({
            '/': showHome,
            '/index.html': showHome,
            '/courses': showCoursesHome,
            '/course/:subject': front('/course/', async (subjectSlug) => {
                restoreMainShell();
                setActiveTab('courses');
                if (window.AppCourse) await AppCourse.renderSubject(subjectSlug);
            }),
            '/course/:subject/:topic': front('/course/', async (subjectSlug, topicSlug) => {
                restoreMainShell();
                setActiveTab('courses');
                if (window.AppCourse) await AppCourse.renderTopic(subjectSlug, topicSlug);
            }),
            '/simulations': showSimulationsHome,
            '/simulations/contribute': front('/simulations/contribute', async () => {
                restoreMainShell();
                setActiveTab('simulations');
                if (window.AppCourse) AppCourse.clearCourseContext();
                if (window.AppSimContribute) await AppSimContribute.renderContribute();
            }),
            '/learning-notes': front('/learning-notes', async () => {
                restoreMainShell();
                setActiveTab('notes');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderLearningNotesList();
            }),
            '/worksheets': front('/worksheets', async () => {
                restoreMainShell();
                setActiveTab('worksheets');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderWorksheetsList();
            }),
            '/learning-videos': front('/learning-videos', async () => {
                restoreMainShell();
                setActiveTab('videos');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderLearningVideosList();
            }),
            '/learning-tools': front('/learning-tools', async () => {
                restoreMainShell();
                setActiveTab('learning');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await ensureCatalog();
                AppCatalog.renderLearningToolsList();
            }),
            '/articles': front('/articles', async () => {
                restoreMainShell();
                setActiveTab('articles');
                if (window.AppCourse) AppCourse.clearCourseContext();
                await AppCatalog.renderArticlesList();
            }),
            '/quiz/:slug': front('/quiz/', async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'learning');
                document.getElementById('sidebar').style.display = window.AppCourse && AppCourse.isCourseMode() ? '' : 'none';
                await AppQuiz.renderQuiz(slug);
            }),
            '/article/:slug': front('/article/', async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'articles');
                await AppCatalog.loadCatalog({ skipNavRender: true });
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                } else {
                    await AppCatalog.prepareArticlesSidebar(slug);
                }
                await AppArticle.renderArticle(slug);
            }),
            '/note/:slug': front('/note/', async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'notes');
                await AppCatalog.loadCatalog({ skipNavRender: true });
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                } else {
                    await AppCatalog.prepareNotesSidebar(slug);
                }
                await AppNote.renderNote(slug);
            }),
            '/worksheet/:slug': front('/worksheet/', async (slug) => {
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'worksheets');
                await AppCatalog.loadCatalog({ skipNavRender: true });
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                } else {
                    await AppCatalog.prepareWorksheetsSidebar(slug);
                }
                await AppWorksheet.renderWorksheet(slug);
            }),
            '/video/:slug': front('/video/', async (slug) => {
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
            }),
            '/simulation/:slug': front('/simulation/', async (slug) => {
                if (window.AppCatalog && AppCatalog.closeModal) AppCatalog.closeModal();
                setActiveTab(window.AppCourse && AppCourse.isCourseMode() ? 'courses' : 'simulations');
                if (window.AppCourse && AppCourse.isCourseMode()) {
                    const ctx = AppCourse.getCourseContext();
                    if (ctx) AppCourse.renderCoursesSidebar(ctx.subjectSlug, ctx.topicSlug);
                }
                await AppSimulation.renderSimulation(slug);
            }),
            '/dashboard': front('/dashboard', async () => {
                document.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('text-indigo-200');
                });
                if (window.AppDashboard) await AppDashboard.renderDashboard();
            }),
            '/assignments': front('/assignments', async () => {
                document.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('text-indigo-200');
                });
                if (window.AppAssignments) await AppAssignments.renderAssignmentsList();
            }),
            '/assignment/:id': front('/assignment/', async (id) => {
                document.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('text-indigo-200');
                });
                if (window.AppAssignments) await AppAssignments.renderAssignment(id);
            }),
            '/summer-homework': async () => {
                await showSummerList(null);
            },
            '/summer-homework/s1': async () => {
                await showSummerList('1');
            },
            '/summer-homework/s2': async () => {
                await showSummerList('2');
            },
            '/summer-homework/:slug': front('/summer-homework', async (slug) => {
                setActiveTab('summer');
                if (window.AppSummerHomework) await AppSummerHomework.renderItem(slug);
            }),
            '/login': front('/login', async () => {
                restoreMainShell();
                clearNavTabActive();
                if (window.AppAuth && typeof AppAuth.whenReady === 'function') {
                    await AppAuth.whenReady();
                }
                if (window.AppLogin) await AppLogin.renderLogin();
            }),
            '/admin': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminHome();
                });
            },
            '/admin/subjects': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSubjects();
                });
            },
            '/admin/courses': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminCourses();
                });
            },
            '/admin/courses/:id': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminCourseEdit(id);
                });
            },
            '/admin/courses/:id/students': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminCourseStudents(id);
                });
            },
            '/admin/courses/:id/students/:userId': async (id, userId) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminStudentDossier(id, userId);
                });
            },
            '/admin/courses/:id/report': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminCourseReport(id);
                });
            },
            '/admin/courses/:id/summer': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminCourseSummer(id);
                });
            },
            '/admin/courses/:id/worksheets': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminCourseWorksheets(id);
                });
            },
            '/admin/inbox': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminInbox();
                });
            },
            '/admin/school-overview': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSchoolOverview();
                });
            },
            '/admin/summer-homework/:id/analytics': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSummerAnalytics(id);
                });
            },
            '/admin/summer-homework/new': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSummerHomeworkEdit();
                });
            },
            '/admin/summer-homework/:id/edit': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSummerHomeworkEdit(id);
                });
            },
            '/admin/summer-homework/:id/view': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSummerHomeworkView(id);
                });
            },
            '/admin/summer-homework': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSummerHomeworkList();
                });
            },
            '/admin/worksheets/new': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminWorksheetEdit();
                });
            },
            '/admin/worksheets/:id/edit': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminWorksheetEdit(id);
                });
            },
            '/admin/worksheets': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminWorksheetsList();
                });
            },
            '/admin/review-queue': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminReviewQueue();
                });
            },
            '/admin/articles': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminArticlesList();
                });
            },
            '/admin/articles/new': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminArticleEdit();
                });
            },
            '/admin/articles/:id/edit': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminArticleEdit(id);
                });
            },
            '/admin/learning-videos': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminLearningVideosList();
                });
            },
            '/admin/learning-videos/new': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminLearningVideoEdit();
                });
            },
            '/admin/learning-videos/:id/edit': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminLearningVideoEdit(id);
                });
            },
            '/admin/learning-notes': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminLearningNotesList();
                });
            },
            '/admin/learning-notes/new': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminLearningNoteEdit();
                });
            },
            '/admin/learning-notes/:id/edit': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminLearningNoteEdit(id);
                });
            },
            '/admin/simulations': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSimulationsList();
                });
            },
            '/admin/simulations/new': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSimulationEdit();
                });
            },
            '/admin/simulations/:id/edit': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminSimulationEdit(id);
                });
            },
            '/admin/question-banks': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminQuestionBanksList();
                });
            },
            '/admin/question-banks/new': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminQuestionBankEdit();
                });
            },
            '/admin/question-banks/:id/edit': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminQuestionBankEdit(id);
                });
            },
            '/admin/course-curriculum': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminCourseCurriculum();
                });
            },
            '/admin/nav-menu': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminNavMenu();
                });
            },
            '/admin/permissions': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminPermissions();
                });
            },
            '/admin/db-export': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminDbExport();
                });
            },
            '/admin/db-import': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminDbImport();
                });
            },
            '/admin/qsis-import': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminQsisImport();
                });
            },
            '/admin/data-dictionary': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminDataDictionary();
                });
            },
            '/admin/users': async () => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminUsers();
                });
            },
            '/admin/users/:id': async (id) => {
                await runAdminRoute(async () => {
                    if (window.AppAdmin) await AppAdmin.renderAdminUserEdit(id);
                });
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

        // Session + nav menu in background — do not block first paint.
        void (async () => {
            try {
                await authBoot;
            } catch (e) {
                console.warn('Auth init failed', e);
            }
            void refreshNavVisibility();
            // First dispatch may have run before session; refresh current route
            // (home for teachers, and any /admin deep link after cookie is known).
            if (window.AppRouter?.dispatch) {
                AppRouter.dispatch(currentAppPath());
            }
        })();
    }

    window.AppNav = {
        refresh: refreshNavVisibility,
        apply: applyNavVisibility,
        isTabVisible,
    };

    document.addEventListener('DOMContentLoaded', boot);

export {};
