(function () {
    'use strict';

    const NAV_LABELS = {
        notes: { zh: '學習筆記', en: 'Learning Notes' },
        worksheets: { zh: '工作紙', en: 'Worksheets' },
        simulations: { zh: '模擬程式', en: 'Simulations' },
        articles: { zh: '科學文章', en: 'Science Articles' },
        learning: { zh: '互動學習工具', en: 'Interactive Tools' },
    };

    let catalogLoaded = false;
    let firstCategoryId = null;

    function updateNavLabels() {
        const lang = AppRouter.getLang();
        document.querySelectorAll('.nav-tab').forEach(btn => {
            const labels = NAV_LABELS[btn.dataset.tab];
            if (labels) btn.textContent = lang === 'zh' ? labels.zh : labels.en;
        });
        const coreLabel = document.getElementById('sidebar-core-label');
        if (coreLabel) {
            coreLabel.textContent = lang === 'zh' ? '科目' : 'Subjects';
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

    function setActiveTab(tab) {
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
            btn.classList.toggle('text-indigo-200', btn.dataset.tab !== tab);
        });
        const sidebar = document.getElementById('sidebar');
        const showSidebar = tab === 'simulations';
        document.body.classList.toggle('sim-tab-active', showSidebar);
        if (sidebar) {
            sidebar.style.display = showSidebar ? '' : 'none';
        }
        if (!showSidebar) {
            document.body.classList.remove('sidebar-is-collapsed');
            if (window.AppSidebar) AppSidebar.closeMobileSidebar();
        } else if (window.AppSidebar) {
            AppSidebar.initSidebar();
        }
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

    async function showSimulationsHome() {
        restoreMainShell();
        setActiveTab('simulations');
        await ensureCatalog();
        if (firstCategoryId) AppCatalog.showCategory(firstCategoryId, null);
    }

    document.addEventListener('langchange', async () => {
        updateNavLabels();
        await AppCatalog.loadCatalog();
        const path = location.pathname.replace(/.*\/app/, '') || '/';
        if (path === '/' || path === '/index.html') showSimulationsHome();
        else AppRouter.dispatch(path.replace(/\/index\.html/i, '') || '/');
    });

    async function boot() {
        await AppAuth.initAuth();
        if (window.SimModal) SimModal.init();
        if (window.AppSidebar) AppSidebar.init();
        updateNavLabels();

        AppRouter.init({
            '/': showSimulationsHome,
            '/index.html': showSimulationsHome,
            '/learning-notes': async () => {
                restoreMainShell();
                setActiveTab('notes');
                await AppCatalog.renderLearningNotesList();
            },
            '/worksheets': async () => {
                restoreMainShell();
                setActiveTab('worksheets');
                await AppCatalog.renderWorksheetsList();
            },
            '/learning-tools': async () => {
                restoreMainShell();
                setActiveTab('learning');
                await ensureCatalog();
                AppCatalog.renderLearningToolsList();
            },
            '/articles': async () => {
                restoreMainShell();
                setActiveTab('articles');
                await ensureCatalog();
                AppCatalog.renderArticlesList();
            },
            '/quiz/:slug': async (slug) => {
                setActiveTab('learning');
                document.getElementById('sidebar').style.display = 'none';
                await AppQuiz.renderQuiz(slug);
            },
            '/article/:slug': async (slug) => {
                setActiveTab('articles');
                document.getElementById('sidebar').style.display = 'none';
                await AppArticle.renderArticle(slug);
            },
            '/note/:slug': async (slug) => {
                setActiveTab('notes');
                document.getElementById('sidebar').style.display = 'none';
                await AppNote.renderNote(slug);
            },
            '/worksheet/:slug': async (slug) => {
                setActiveTab('worksheets');
                document.getElementById('sidebar').style.display = 'none';
                await AppWorksheet.renderWorksheet(slug);
            },
        });

        const tabRoutes = {
            notes: '/learning-notes',
            worksheets: '/worksheets',
            simulations: '/',
            articles: '/articles',
            learning: '/learning-tools',
        };

        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const route = tabRoutes[btn.dataset.tab];
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
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
