'use strict';
const global = window;

    const routes = {};
    let currentLang = 'zh';

    /**
     * Declarative path matchers. First match wins.
     * `keys` maps capture groups to decoded args for the handler.
     * `name` is the key in `routes` registered via init()/register().
     */
    const PATH_MATCHERS = [
        { re: /^\/quiz\/([^/]+)$/, name: '/quiz/:slug', keys: [1] },
        { re: /^\/article\/([^/]+)$/, name: '/article/:slug', keys: [1] },
        { re: /^\/note\/([^/]+)$/, name: '/note/:slug', keys: [1] },
        { re: /^\/worksheet\/([^/]+)$/, name: '/worksheet/:slug', keys: [1] },
        { re: /^\/learning-tools\/?$/, name: '/learning-tools' },
        { re: /^\/learning-notes\/?$/, name: '/learning-notes' },
        { re: /^\/worksheets\/?$/, name: '/worksheets' },
        { re: /^\/learning-videos\/?$/, name: '/learning-videos' },
        { re: /^\/articles\/?$/, name: '/articles' },
        { re: /^\/courses\/?$/, name: '/courses' },
        { re: /^\/course\/([^/]+)\/([^/]+)$/, name: '/course/:subject/:topic', keys: [1, 2] },
        { re: /^\/course\/([^/]+)$/, name: '/course/:subject', keys: [1] },
        { re: /^\/video\/([^/]+)$/, name: '/video/:slug', keys: [1] },
        { re: /^\/simulation\/([^/]+)$/, name: '/simulation/:slug', keys: [1] },
        { re: /^\/simulations\/?$/, name: '/simulations' },
        { re: /^\/dashboard\/?$/, name: '/dashboard' },
        { re: /^\/assignments\/?$/, name: '/assignments' },
        { re: /^\/summer-homework\/s1\/?$/, name: '/summer-homework/s1' },
        { re: /^\/summer-homework\/s2\/?$/, name: '/summer-homework/s2' },
        { re: /^\/summer-homework\/([^/]+)\/?$/, name: '/summer-homework/:slug', keys: [1] },
        { re: /^\/summer-homework\/?$/, name: '/summer-homework' },
        { re: /^\/assignment\/(\d+)\/?$/, name: '/assignment/:id', keys: [1] },
        { re: /^\/login\/?$/, name: '/login' },
        { re: /^\/admin\/subjects\/?$/, name: '/admin/subjects' },
        { re: /^\/admin\/?$/, name: '/admin' },
        { re: /^\/?$/, name: '/' },
    ];

    function register(path, handler) {
        routes[path] = handler;
    }

    function getPath() {
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

        if (typeof routes[path] === 'function') {
            await routes[path]();
            await afterRoute();
            return;
        }

        for (const m of PATH_MATCHERS) {
            const hit = path.match(m.re);
            if (!hit) continue;
            const handler = routes[m.name];
            if (typeof handler !== 'function') continue;
            const args = (m.keys || []).map((i) => decodeURIComponent(hit[i]));
            await handler(...args);
            await afterRoute();
            return;
        }

        if (typeof routes['/'] === 'function') {
            await routes['/']();
        }
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

    global.AppRouter = {
        register,
        navigate,
        dispatch,
        init,
        t,
        toggleLang,
        getLang: () => currentLang,
        setLang,
        escapeHtml,
        PATH_MATCHERS,
    };

export {};
