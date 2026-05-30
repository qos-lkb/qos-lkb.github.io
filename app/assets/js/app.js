(function () {
    'use strict';

    let catalogLoaded = false;
    let firstCategoryId = null;

    function setActiveTab(tab) {
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
            btn.classList.toggle('text-indigo-200', btn.dataset.tab !== tab);
        });
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = tab === 'simulations' ? '' : 'none';
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
        await AppCatalog.loadCatalog();
        const path = location.pathname.replace(/.*\/app/, '') || '/';
        if (path === '/' || path === '/index.html') showSimulationsHome();
        else AppRouter.dispatch(path.replace(/\/index\.html/i, '') || '/');
    });

    async function boot() {
        await AppAuth.initAuth();

        AppRouter.init({
            '/': showSimulationsHome,
            '/index.html': showSimulationsHome,
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
        });

        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab === 'simulations') AppRouter.navigate('/');
                else if (tab === 'learning') AppRouter.navigate('/learning-tools');
                else if (tab === 'articles') AppRouter.navigate('/articles');
            });
        });

        document.getElementById('btn-lang')?.addEventListener('click', () => AppRouter.toggleLang());

        document.getElementById('sim-modal-close')?.addEventListener('click', () => AppCatalog.closeModal());
        document.getElementById('sim-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'sim-modal') AppCatalog.closeModal();
        });

        document.getElementById('btn-sidebar')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('sidebar-open');
            document.getElementById('overlay')?.classList.toggle('active');
        });
        document.getElementById('overlay')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.remove('sidebar-open');
            document.getElementById('overlay')?.classList.remove('active');
        });
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
