'use strict';

/**
 * Per-route admin module loader. Caches imported groups so revisits are instant.
 */

const loaded = new Set();
const inflight = new Map();

/** @type {Record<string, () => Promise<unknown>>} */
const GROUP_LOADERS = {
    home: () => import('./admin-subjects.js'),
    subjects: () => import('./admin-subjects.js'),
    courses: () => import('./admin-courses.js'),
    'course-students': () => import('./admin-course-students.js'),
    'student-dossier': () => import('./admin-student-dossier.js'),
    'course-report': () => import('./admin-course-report.js'),
    'course-discussions': () => import('./admin-course-discussions.js'),
    'course-summer': () => import('./admin-course-summer.js'),
    'course-worksheets': () => import('./admin-course-worksheets.js'),
    inbox: () => import('./admin-inbox.js'),
    'school-overview': () => import('./admin-school-overview.js'),
    'summer-list': () => import('./admin-summer-homework-list.js'),
    'summer-analytics': () => import('./admin-summer-analytics.js'),
    'summer-edit': () => Promise.all([
        import('./admin-summer-qbuilder.js'),
        import('./admin-summer-edit.js'),
    ]),
    'worksheets-list': () => import('./admin-worksheets-list.js'),
    'worksheet-edit': () => Promise.all([
        import('./admin-content-embed.js'),
        import('./admin-worksheet-edit.js'),
    ]),
    review: () => import('./admin-review-queue.js'),
    'content-lists': () => import('./admin-content-lists.js'),
    'content-edit': () => Promise.all([
        import('./admin-content-embed.js'),
        import('./admin-content-editors.js'),
    ]),
    'qb-edit': () => Promise.all([
        import('./admin-question-bank-qbuilder.js'),
        import('./admin-question-bank-edit.js'),
    ]),
    curriculum: () => import('./admin-course-curriculum.js'),
    ops: () => import('./admin-ops.js'),
    'danger-ops': async () => {
        await import('./markdown.js');
        await import('./admin-danger-ops.js');
    },
    users: () => import('./admin-users.js'),
};

/**
 * Map an app path (e.g. /admin/articles/3/edit) to a loader group key.
 * @param {string} path
 * @returns {string}
 */
function resolveAdminGroup(path) {
    let p = String(path || '');
    const appIdx = p.indexOf('/app');
    if (appIdx >= 0) {
        p = p.slice(appIdx + 4) || '/';
    }
    p = p.replace(/\/index\.html$/i, '').split('?')[0].replace(/\/+$/, '') || '/';

    if (p === '/admin') return 'home';
    if (p.startsWith('/admin/subjects')) return 'subjects';
    if (/^\/admin\/courses\/\d+\/students\/\d+$/.test(p)) return 'student-dossier';
    if (/^\/admin\/courses\/\d+\/students$/.test(p)) return 'course-students';
    if (/^\/admin\/courses\/\d+\/report$/.test(p)) return 'course-report';
    if (/^\/admin\/courses\/\d+\/discussions$/.test(p)) return 'course-discussions';
    if (/^\/admin\/courses\/\d+\/summer$/.test(p)) return 'course-summer';
    if (/^\/admin\/courses\/\d+\/worksheets$/.test(p)) return 'course-worksheets';
    if (/^\/admin\/courses(\/\d+)?$/.test(p)) return 'courses';
    if (p.startsWith('/admin/inbox')) return 'inbox';
    if (p.startsWith('/admin/school-overview')) return 'school-overview';
    if (/^\/admin\/summer-homework\/\d+\/analytics$/.test(p)) return 'summer-analytics';
    if (/^\/admin\/summer-homework\/(new|\d+\/(edit|view))$/.test(p)) return 'summer-edit';
    if (p.startsWith('/admin/summer-homework')) return 'summer-list';
    if (/^\/admin\/worksheets\/(new|\d+\/edit)$/.test(p)) return 'worksheet-edit';
    if (p.startsWith('/admin/worksheets')) return 'worksheets-list';
    if (p.startsWith('/admin/review-queue')) return 'review';
    if (/^\/admin\/(articles|learning-videos|learning-notes|simulations)\/(new|\d+\/edit)$/.test(p)) {
        return 'content-edit';
    }
    if (/^\/admin\/(articles|learning-videos|learning-notes|simulations|question-banks)$/.test(p)) {
        return 'content-lists';
    }
    if (/^\/admin\/question-banks\/(new|\d+\/edit)$/.test(p)) return 'qb-edit';
    if (p.startsWith('/admin/course-curriculum')) return 'curriculum';
    if (p.startsWith('/admin/nav-menu') || p.startsWith('/admin/permissions')) return 'ops';
    if (/^\/admin\/(db-export|db-import|qsis-import|data-dictionary)$/.test(p)) return 'danger-ops';
    if (p.startsWith('/admin/users')) return 'users';
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
 * @param {string} [pathOrGroup] Absolute app path or known group key
 */
function ensureAdminRoute(pathOrGroup) {
    const raw = String(pathOrGroup || '');
    const group = GROUP_LOADERS[raw] ? raw : resolveAdminGroup(raw || '/admin');
    return loadGroup(group);
}

/** @deprecated Prefer ensureAdminRoute */
function ensureAdminModules() {
    return ensureAdminRoute('home');
}

window.AppAdminLoader = {
    ensureAdminModules,
    ensureAdminRoute,
    resolveAdminGroup,
};

export { ensureAdminModules, ensureAdminRoute, resolveAdminGroup };
