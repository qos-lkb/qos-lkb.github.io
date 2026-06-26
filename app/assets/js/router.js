(function (global) {
    'use strict';

    const routes = {};
    let currentLang = 'zh';

    function register(path, handler) {
        routes[path] = handler;
    }

    function getPath() {
        const base = document.querySelector('base')?.href || (location.origin + location.pathname.replace(/\/[^/]*$/, '/'));
        let p = location.pathname;
        const appIdx = p.indexOf('/app');
        if (appIdx >= 0) {
            p = p.slice(appIdx + 4) || '/';
        }
        p = p.replace(/\/index\.html$/i, '') || '/';
        if (!p.startsWith('/')) p = '/' + p;
        const hash = location.hash.replace(/^#/, '');
        if (hash.startsWith('/')) return hash;
        return p;
    }

    async function navigate(path, replace) {
        const full = path.startsWith('/') ? path : '/' + path;
        const appBase = location.pathname.split('/app')[0] + '/app';
        const newUrl = appBase + full;
        if (replace) {
            history.replaceState({ path: full }, '', newUrl);
        } else {
            history.pushState({ path: full }, '', newUrl);
        }
        await dispatch(full);
    }

    async function dispatch(path) {
        async function afterRoute() {
            if (global.AppLearningTracker) global.AppLearningTracker.trackPageView(path);
        }
        if (routes[path]) {
            await routes[path]();
            await afterRoute();
            return;
        }
        const quiz = path.match(/^\/quiz\/([^/]+)$/);
        if (quiz) {
            await routes['/quiz/:slug'](decodeURIComponent(quiz[1]));
            await afterRoute();
            return;
        }
        const article = path.match(/^\/article\/([^/]+)$/);
        if (article) {
            await routes['/article/:slug'](decodeURIComponent(article[1]));
            await afterRoute();
            return;
        }
        const note = path.match(/^\/note\/([^/]+)$/);
        if (note) {
            await routes['/note/:slug'](decodeURIComponent(note[1]));
            await afterRoute();
            return;
        }
        const worksheet = path.match(/^\/worksheet\/([^/]+)$/);
        if (worksheet) {
            await routes['/worksheet/:slug'](decodeURIComponent(worksheet[1]));
            await afterRoute();
            return;
        }
        if (path === '/learning-tools') {
            await routes['/learning-tools']();
            await afterRoute();
            return;
        }
        if (path === '/learning-notes') {
            await routes['/learning-notes']();
            await afterRoute();
            return;
        }
        if (path === '/worksheets') {
            await routes['/worksheets']();
            await afterRoute();
            return;
        }
        if (path === '/articles') {
            await routes['/articles']();
            await afterRoute();
            return;
        }
        const courses = path.match(/^\/courses\/?$/);
        if (courses) {
            await routes['/courses']();
            await afterRoute();
            return;
        }
        const courseSubject = path.match(/^\/course\/([^/]+)$/);
        if (courseSubject) {
            await routes['/course/:subject'](decodeURIComponent(courseSubject[1]));
            await afterRoute();
            return;
        }
        const courseTopic = path.match(/^\/course\/([^/]+)\/([^/]+)$/);
        if (courseTopic) {
            await routes['/course/:subject/:topic'](decodeURIComponent(courseTopic[1]), decodeURIComponent(courseTopic[2]));
            await afterRoute();
            return;
        }
        const video = path.match(/^\/video\/([^/]+)$/);
        if (video) {
            await routes['/video/:slug'](decodeURIComponent(video[1]));
            await afterRoute();
            return;
        }
        const simulation = path.match(/^\/simulation\/([^/]+)$/);
        if (simulation) {
            await routes['/simulation/:slug'](decodeURIComponent(simulation[1]));
            await afterRoute();
            return;
        }
        if (path === '/simulations') {
            await routes['/simulations']();
            await afterRoute();
            return;
        }
        if (path === '/dashboard') {
            await routes['/dashboard']();
            await afterRoute();
            return;
        }
        await routes['/']();
        await afterRoute();
    }

    function init(onRoute) {
        Object.assign(routes, onRoute);
        window.addEventListener('popstate', () => dispatch(getPath()));
        dispatch(getPath());
    }

    function t(zh, en) {
        return currentLang === 'zh' ? zh : en;
    }

    function setLang(lang) {
        currentLang = lang;
        document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
        try {
            localStorage.setItem('science_sims_ui_lang', lang);
        } catch (e) { /* ignore */ }
    }

    function initLangFromStorage() {
        try {
            const saved = localStorage.getItem('science_sims_ui_lang');
            if (saved === 'zh' || saved === 'en') {
                setLang(saved);
            }
        } catch (e) { /* ignore */ }
    }

    initLangFromStorage();

    function toggleLang() {
        setLang(currentLang === 'zh' ? 'en' : 'zh');
        document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
    }

    global.AppRouter = { register, navigate, dispatch, init, t, toggleLang, getLang: () => currentLang, setLang, escapeHtml };
})(window);
