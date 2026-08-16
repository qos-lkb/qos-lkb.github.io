'use strict';

/**
 * Per-route front-end module loader (mirrors admin-loader).
 * Caches imported groups so revisits are instant.
 */

const loaded = new Set();
const inflight = new Map();

async function loadMarkdownStack() {
    await import('./markdown.js');
    await import('./content-embeds.js');
    await import('./inline-edit.js');
}

async function loadCatalogStack() {
    await loadMarkdownStack();
    await import('./modal-capture.js');
    if (window.SimModal && typeof window.SimModal.init === 'function' && !window.SimModal.__inited) {
        window.SimModal.init();
        window.SimModal.__inited = true;
    }
    await import('./catalog.js');
    await import('./simulation.js');
    await import('./sim-contribute.js');
}

/** @type {Record<string, () => Promise<unknown>>} */
const GROUP_LOADERS = {
    home: async () => {
        await import('./markdown.js');
        await Promise.all([
            import('./guest-home.js'),
            import('./summer-homework.js'),
        ]);
    },
    catalog: () => loadCatalogStack(),
    course: async () => {
        await loadCatalogStack();
        await import('./course.js');
    },
    quiz: async () => {
        await loadMarkdownStack();
        await import('./quiz.js');
    },
    article: async () => {
        await loadCatalogStack();
        await import('./article.js');
    },
    note: async () => {
        await loadCatalogStack();
        await import('./note-pdf.js');
        await import('./note.js');
    },
    worksheet: async () => {
        await loadCatalogStack();
        await import('./worksheet.js');
    },
    video: async () => {
        await loadCatalogStack();
        await import('./video.js');
    },
    lists: () => loadCatalogStack(),
    learner: async () => {
        await Promise.all([
            import('./dashboard.js'),
            import('./assignments.js'),
        ]);
    },
    login: () => import('./login.js'),
};

/**
 * @param {string} path
 * @returns {string}
 */
function resolveAppGroup(path) {
    let p = String(path || '');
    const appIdx = p.indexOf('/app');
    if (appIdx >= 0) {
        p = p.slice(appIdx + 4) || '/';
    }
    p = p.replace(/\/index\.html$/i, '').split('?')[0].replace(/\/+$/, '') || '/';

    // After stripping trailing slashes, path hints like `/simulation/` become `/simulation`.
    // Match both exact segment prefixes and nested paths.
    const is = (base) => p === base || p.startsWith(base + '/');

    if (p === '/' || is('/summer-homework')) return 'home';
    if (is('/admin')) return 'home'; // admin uses AppAdminLoader; keep no-op-ish
    if (p === '/login') return 'login';
    if (p === '/dashboard' || is('/assignment') || is('/assignments')) return 'learner';
    if (is('/courses') || is('/course')) return 'course';
    if (is('/simulations') || is('/simulation')) return 'catalog';
    if (is('/quiz')) return 'quiz';
    if (is('/article')) return 'article';
    if (is('/note')) return 'note';
    if (is('/worksheet')) return 'worksheet';
    if (is('/video')) return 'video';
    if (
        is('/learning-notes')
        || is('/worksheets')
        || is('/learning-videos')
        || is('/learning-tools')
        || is('/articles')
    ) {
        return 'lists';
    }
    return 'home';
}

function loadGroup(group) {
    if (loaded.has(group)) {
        return Promise.resolve();
    }
    if (inflight.has(group)) {
        return inflight.get(group);
    }
    const loader = GROUP_LOADERS[group] || GROUP_LOADERS.home;
    const promise = Promise.resolve()
        .then(() => loader())
        .then(() => {
            loaded.add(group);
            inflight.delete(group);
        })
        .catch((err) => {
            inflight.delete(group);
            throw err;
        });
    inflight.set(group, promise);
    return promise;
}

/**
 * @param {string} [pathOrGroup]
 */
function ensureAppRoute(pathOrGroup) {
    const raw = String(pathOrGroup || '');
    if (raw.startsWith('/admin')) {
        return Promise.resolve();
    }
    const group = GROUP_LOADERS[raw] ? raw : resolveAppGroup(raw || '/');
    return loadGroup(group);
}

window.AppFrontLoader = {
    ensureAppRoute,
    resolveAppGroup,
};

export { ensureAppRoute, resolveAppGroup };
