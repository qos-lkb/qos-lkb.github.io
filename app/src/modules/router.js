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
        { re: /^\/admin\/summer-homework\/new\/?$/, name: '/admin/summer-homework/new' },
        { re: /^\/admin\/summer-homework\/(\d+)\/edit\/?$/, name: '/admin/summer-homework/:id/edit', keys: [1] },
        { re: /^\/admin\/summer-homework\/(\d+)\/view\/?$/, name: '/admin/summer-homework/:id/view', keys: [1] },
        { re: /^\/admin\/summer-homework\/(\d+)\/analytics\/?$/, name: '/admin/summer-homework/:id/analytics', keys: [1] },
        { re: /^\/admin\/summer-homework\/?$/, name: '/admin/summer-homework' },
        { re: /^\/admin\/worksheets\/new\/?$/, name: '/admin/worksheets/new' },
        { re: /^\/admin\/worksheets\/(\d+)\/edit\/?$/, name: '/admin/worksheets/:id/edit', keys: [1] },
        { re: /^\/admin\/worksheets\/?$/, name: '/admin/worksheets' },
        { re: /^\/admin\/review-queue\/?$/, name: '/admin/review-queue' },
        { re: /^\/admin\/articles\/new\/?$/, name: '/admin/articles/new' },
        { re: /^\/admin\/articles\/(\d+)\/edit\/?$/, name: '/admin/articles/:id/edit', keys: [1] },
        { re: /^\/admin\/articles\/?$/, name: '/admin/articles' },
        { re: /^\/admin\/learning-videos\/new\/?$/, name: '/admin/learning-videos/new' },
        { re: /^\/admin\/learning-videos\/(\d+)\/edit\/?$/, name: '/admin/learning-videos/:id/edit', keys: [1] },
        { re: /^\/admin\/learning-videos\/?$/, name: '/admin/learning-videos' },
        { re: /^\/admin\/learning-notes\/new\/?$/, name: '/admin/learning-notes/new' },
        { re: /^\/admin\/learning-notes\/(\d+)\/edit\/?$/, name: '/admin/learning-notes/:id/edit', keys: [1] },
        { re: /^\/admin\/learning-notes\/?$/, name: '/admin/learning-notes' },
        { re: /^\/admin\/simulations\/new\/?$/, name: '/admin/simulations/new' },
        { re: /^\/admin\/simulations\/(\d+)\/edit\/?$/, name: '/admin/simulations/:id/edit', keys: [1] },
        { re: /^\/admin\/simulations\/?$/, name: '/admin/simulations' },
        { re: /^\/admin\/question-banks\/new\/?$/, name: '/admin/question-banks/new' },
        { re: /^\/admin\/question-banks\/(\d+)\/edit\/?$/, name: '/admin/question-banks/:id/edit', keys: [1] },
        { re: /^\/admin\/question-banks\/?$/, name: '/admin/question-banks' },
        { re: /^\/admin\/course-curriculum\/?$/, name: '/admin/course-curriculum' },
        { re: /^\/admin\/nav-menu\/?$/, name: '/admin/nav-menu' },
        { re: /^\/admin\/permissions\/?$/, name: '/admin/permissions' },
        { re: /^\/admin\/db-export\/?$/, name: '/admin/db-export' },
        { re: /^\/admin\/db-import\/?$/, name: '/admin/db-import' },
        { re: /^\/admin\/qsis-import\/?$/, name: '/admin/qsis-import' },
        { re: /^\/admin\/data-dictionary\/?$/, name: '/admin/data-dictionary' },
        { re: /^\/admin\/subjects\/?$/, name: '/admin/subjects' },
        { re: /^\/admin\/courses\/(\d+)\/students\/(\d+)\/?$/, name: '/admin/courses/:id/students/:userId', keys: [1, 2] },
        { re: /^\/admin\/courses\/(\d+)\/students\/?$/, name: '/admin/courses/:id/students', keys: [1] },
        { re: /^\/admin\/courses\/(\d+)\/report\/?$/, name: '/admin/courses/:id/report', keys: [1] },
        { re: /^\/admin\/courses\/(\d+)\/summer\/?$/, name: '/admin/courses/:id/summer', keys: [1] },
        { re: /^\/admin\/courses\/(\d+)\/worksheets\/?$/, name: '/admin/courses/:id/worksheets', keys: [1] },
        { re: /^\/admin\/courses\/(\d+)\/?$/, name: '/admin/courses/:id', keys: [1] },
        { re: /^\/admin\/courses\/?$/, name: '/admin/courses' },
        { re: /^\/admin\/inbox\/?$/, name: '/admin/inbox' },
        { re: /^\/admin\/school-overview\/?$/, name: '/admin/school-overview' },
        { re: /^\/admin\/users\/(\d+)\/?$/, name: '/admin/users/:id', keys: [1] },
        { re: /^\/admin\/users\/?$/, name: '/admin/users' },
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

    /**
     * Absolute URL path for an SPA route (safe for <a href>, with or without <base>).
     * e.g. spaHref('/admin/courses/1') → '/science_sims/app/admin/courses/1'
     */
    function spaHref(route) {
        const rawFull = String(route || '/');
        const qIdx = rawFull.indexOf('?');
        const hIdx = rawFull.indexOf('#');
        let pathPart = rawFull;
        let suffix = '';
        if (qIdx >= 0 || hIdx >= 0) {
            const cut = qIdx >= 0 && hIdx >= 0 ? Math.min(qIdx, hIdx) : (qIdx >= 0 ? qIdx : hIdx);
            pathPart = rawFull.slice(0, cut);
            suffix = rawFull.slice(cut);
        }
        const r = '/' + pathPart.replace(/^\/+/, '');
        const site = typeof window.__SITE_BASE__ === 'string'
            ? window.__SITE_BASE__
            : (location.pathname.split('/app')[0] || '');
        return (site || '') + '/app' + (r === '/' ? '/' : r) + suffix;
    }

    async function dispatch(path) {
        async function afterRoute() {
            if (global.AppLearningTracker) global.AppLearningTracker.trackPageView(path);
        }

        // Strip query/hash if a caller accidentally passes them.
        const clean = String(path || '/').split('?')[0].split('#')[0] || '/';

        if (typeof routes[clean] === 'function') {
            await routes[clean]();
            await afterRoute();
            return;
        }

        for (const m of PATH_MATCHERS) {
            const hit = clean.match(m.re);
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
        // Global SPA nav: do not rely on each page re-binding [data-spa-nav].
        document.addEventListener('click', (e) => {
            const a = e.target && e.target.closest ? e.target.closest('[data-spa-nav]') : null;
            if (!a || e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const route = a.getAttribute('data-spa-nav');
            if (!route) return;
            e.preventDefault();
            const uid = parseInt(a.getAttribute('data-user-id') || '0', 10) || 0;
            if (uid > 0 && route.indexOf('/analytics') >= 0) {
                const appBase = location.pathname.split('/app')[0] + '/app';
                const path = route.startsWith('/') ? route : '/' + route;
                history.pushState({ path }, '', appBase + path + '?user_id=' + uid);
                dispatch(path);
                return;
            }
            navigate(route);
        });
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
        getPath,
        t,
        toggleLang,
        getLang: () => currentLang,
        setLang,
        escapeHtml,
        spaHref,
        PATH_MATCHERS,
    };

export {};
