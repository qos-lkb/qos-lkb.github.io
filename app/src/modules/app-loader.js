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

    if (p === '/' || p.startsWith('/summer-homework')) return 'home';
    if (p.startsWith('/admin')) return 'home'; // admin uses AppAdminLoader; keep no-op-ish
    if (p === '/login') return 'login';
    if (p === '/dashboard' || p.startsWith('/assignment')) return 'learner';
    if (p.startsWith('/courses') || p.startsWith('/course/')) return 'course';
    if (p.startsWith('/simulations') || p.startsWith('/simulation/')) return 'catalog';
    if (p.startsWith('/quiz/')) return 'quiz';
    if (p.startsWith('/article/')) return 'article';
    if (p.startsWith('/note/')) return 'note';
    if (p.startsWith('/worksheet/')) return 'worksheet';
    if (p.startsWith('/video/')) return 'video';
    if (
        p.startsWith('/learning-notes')
        || p.startsWith('/worksheets')
        || p.startsWith('/learning-videos')
        || p.startsWith('/learning-tools')
        || p.startsWith('/articles')
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
