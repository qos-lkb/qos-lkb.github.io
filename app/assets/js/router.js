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
        if (routes[path]) {
            await routes[path]();
            return;
        }
        const quiz = path.match(/^\/quiz\/([^/]+)$/);
        if (quiz) {
            await routes['/quiz/:slug'](decodeURIComponent(quiz[1]));
            return;
        }
        const article = path.match(/^\/article\/([^/]+)$/);
        if (article) {
            await routes['/article/:slug'](decodeURIComponent(article[1]));
            return;
        }
        if (path === '/learning-tools') {
            await routes['/learning-tools']();
            return;
        }
        if (path === '/articles') {
            await routes['/articles']();
            return;
        }
        await routes['/']();
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
    }

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
