'use strict';
const global = window;

    function t(zh, en) {
        return global.AppRouter && global.AppRouter.t ? global.AppRouter.t(zh, en) : zh;
    }

    function escapeHtml(s) {
        return global.AppRouter && global.AppRouter.escapeHtml
            ? global.AppRouter.escapeHtml(s)
            : String(s || '');
    }

    function spaHref(route) {
        return global.AppRouter && global.AppRouter.spaHref
            ? global.AppRouter.spaHref(route)
            : String(route || '');
    }


    function setShell() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    const DASH_ICONS = {
        course: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 6h16M4 10h16M4 14h10M4 18h6"/>',
        summer: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M8.05 15.95l-1.414 1.414m0-9.728L8.05 8.05m9.9 9.9l-1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z"/>',
        sheet: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 17v-2m3 2v-4m3 4v-6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
        curriculum: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 6h16M4 10h16M4 14h10M4 18h6"/>',
        bank: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M8 11h8"/>',
        note: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
        article: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2"/>',
        video: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
        sim: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        review: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        folder: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
        users: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
        lock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>',
        menu: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 6h16M4 12h16M4 18h7"/>',
        db: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>',
        import: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>',
        export: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
        dict: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>',
        arrow: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>',
    };

    function dashIconSvg(name) {
        const path = DASH_ICONS[name] || DASH_ICONS.folder;
        return `<svg class="admin-dash-card-icon-svg" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
    }

    function dashCard(item) {
        const badge = item.badge != null && item.badge > 0
            ? `<span class="admin-dash-badge">${escapeHtml(String(item.badge))}</span>`
            : '';
        return `<a href="${escapeHtml(spaHref(item.route))}" data-spa-nav="${escapeHtml(item.route)}" class="admin-dash-card admin-dash-card-${escapeHtml(item.tone || 'slate')}">
            <span class="admin-dash-card-icon">${dashIconSvg(item.icon)}</span>
            <span class="admin-dash-card-body">
                <span class="admin-dash-card-title">${escapeHtml(item.label)}${badge}</span>
                <span class="admin-dash-card-desc">${escapeHtml(item.desc)}</span>
            </span>
            <span class="admin-dash-card-arrow">${dashIconSvg('arrow')}</span>
        </a>`;
    }

    function dashSection(title, cards) {
        if (!cards.length) return '';
        return `<section class="admin-dash-section">
            <div class="admin-dash-section-head">
                <h2 class="admin-dash-section-title">${escapeHtml(title)}</h2>
            </div>
            <div class="admin-dash-grid">${cards.map(dashCard).join('')}</div>
        </section>`;
    }

    function bindDashNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    function formatStat(value) {
        if (value == null || Number.isNaN(Number(value))) return '—';
        return String(Number(value));
    }

    async function renderAdminHome() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) {
            title.textContent = t('儀表板', 'Dashboard');
            const titleWrap = title.closest('.mb-6');
            if (titleWrap) titleWrap.hidden = true;
        }

        const user = global.ScienceApi && global.ScienceApi.getUser ? global.ScienceApi.getUser() : null;
        if (!user) {
            global.AppRouter.navigate('/login');
            return;
        }

        const displayName = String(user.display_name || user.email || '').trim()
            || t('使用者', 'User');
        const names = global.__SITE_NAMES__ || {};
        const lang = global.AppRouter && global.AppRouter.getLang ? global.AppRouter.getLang() : 'zh';
        const siteName = String((lang === 'en' ? names.en : names.zh) || names.zh || names.en || '').trim()
            || t('科學模擬', 'Science Sims');

        const canSubjects = global.ScienceApi.hasPermission('user.manage');
        const canUsers = canSubjects;
        const canCourses = global.ScienceApi.hasPermission('class.manage_any')
            || global.ScienceApi.hasPermission('class.manage_own');
        const canSummer = global.ScienceApi.hasPermission('summer_homework.manage_any')
            || global.ScienceApi.hasPermission('summer_homework.manage_own')
            || canCourses;
        const canWorksheets = global.ScienceApi.hasPermission('worksheet.manage_any')
            || global.ScienceApi.hasPermission('worksheet.manage_own');
        const canReview = global.ScienceApi.hasPermission('learning_tool.manage_any')
            || global.ScienceApi.hasPermission('article.manage_any')
            || global.ScienceApi.hasPermission('learning_note.manage_any')
            || global.ScienceApi.hasPermission('worksheet.manage_any')
            || global.ScienceApi.hasPermission('learning_video.manage_any')
            || global.ScienceApi.hasPermission('question_bank.manage_any')
            || global.ScienceApi.hasPermission('summer_homework.manage_any');
        const canArticles = global.ScienceApi.hasPermission('article.manage_any')
            || global.ScienceApi.hasPermission('article.manage_own');
        const canNotes = global.ScienceApi.hasPermission('learning_note.manage_any')
            || global.ScienceApi.hasPermission('learning_note.manage_own');
        const canVideos = global.ScienceApi.hasPermission('learning_video.manage_any')
            || global.ScienceApi.hasPermission('learning_video.manage_own');
        const canSims = global.ScienceApi.hasPermission('simulation.manage_any')
            || global.ScienceApi.hasPermission('simulation.manage_own');
        const canQb = global.ScienceApi.hasPermission('question_bank.manage_any')
            || global.ScienceApi.hasPermission('question_bank.manage_own')
            || global.ScienceApi.hasPermission('learning_tool.manage_any')
            || global.ScienceApi.hasPermission('learning_tool.manage_own');
        const canCurriculum = global.ScienceApi.hasPermission('topic_item.manage_any')
            || global.ScienceApi.hasPermission('user.manage');

        const teachingCards = [
            canCourses ? {
                route: '/admin/courses',
                label: t('課程管理', 'Courses'),
                desc: t('管理班級、學生與課程設定。', 'Manage classes, students, and course settings.'),
                tone: 'blue',
                icon: 'course',
            } : null,
            canCourses ? {
                route: '/admin/inbox',
                label: t('待批改／逾期', 'Grading inbox'),
                desc: t('待批改工作紙與逾期未交催交。', 'Ungraded submissions and overdue chase list.'),
                tone: 'amber',
                icon: 'sheet',
            } : null,
            global.ScienceApi.hasPermission('class.manage_any') ? {
                route: '/admin/school-overview',
                label: t('全校概覽', 'School overview'),
                desc: t('各班活躍度、呈交率與待批改摘要。', 'Per-class activity, submission rates, and backlog.'),
                tone: 'indigo',
                icon: 'curriculum',
            } : null,
            canSummer ? {
                route: '/admin/summer-homework',
                label: t('暑期功課設計', 'Summer homework'),
                desc: t('設計與發佈暑期功課習作。', 'Design and publish summer homework.'),
                tone: 'amber',
                icon: 'summer',
            } : null,
            canWorksheets ? {
                route: '/admin/worksheets',
                label: t('工作紙設計', 'Worksheets'),
                desc: t('管理工作紙與可列印內容。', 'Manage worksheets and printable content.'),
                tone: 'sky',
                icon: 'sheet',
            } : null,
            canCurriculum ? {
                route: '/admin/course-curriculum',
                label: t('自學課程編排', 'Course curriculum'),
                desc: t('編排自學課程與前台課程樹。', 'Arrange self-study curriculum and front-end trees.'),
                tone: 'indigo',
                icon: 'curriculum',
            } : null,
        ].filter(Boolean);

        const contentCards = [
            canQb ? {
                route: '/admin/question-banks',
                label: t('試題庫', 'Question banks'),
                desc: t('維護試題庫與題目資料。', 'Maintain question banks and items.'),
                tone: 'rose',
                icon: 'bank',
            } : null,
            canNotes ? {
                route: '/admin/learning-notes',
                label: t('學習筆記', 'Learning notes'),
                desc: t('管理學習筆記內容、排序與發佈。', 'Manage notes, order, and publish status.'),
                tone: 'indigo',
                icon: 'note',
            } : null,
            canArticles ? {
                route: '/admin/articles',
                label: t('科學文章', 'Articles'),
                desc: t('管理科學文章與閱讀內容。', 'Manage science articles and reading content.'),
                tone: 'emerald',
                icon: 'article',
            } : null,
            canVideos ? {
                route: '/admin/learning-videos',
                label: t('學習影片', 'Learning videos'),
                desc: t('管理學習影片與發佈狀態。', 'Manage learning videos and status.'),
                tone: 'fuchsia',
                icon: 'video',
            } : null,
            canSims ? {
                route: '/admin/simulations',
                label: t('模擬程式', 'Simulations'),
                desc: t('檢視、編輯與排序互動模擬。', 'View, edit, and order simulations.'),
                tone: 'violet',
                icon: 'sim',
            } : null,
            canReview ? {
                route: '/admin/review-queue',
                label: t('審核佇列', 'Review queue'),
                desc: t('審核待發佈的投稿內容。', 'Review content pending publication.'),
                tone: 'amber',
                icon: 'review',
                badge: 0,
            } : null,
        ].filter(Boolean);

        const platformCards = [
            canSubjects ? {
                route: '/admin/subjects',
                label: t('科目與單元', 'Subjects & topics'),
                desc: t('維護科目、單元與目錄結構。', 'Maintain subjects, topics, and catalog structure.'),
                tone: 'slate',
                icon: 'folder',
            } : null,
            canUsers ? {
                route: '/admin/users',
                label: t('使用者', 'Users'),
                desc: t('新增、編輯使用者並指派角色。', 'Create users and assign roles.'),
                tone: 'blue',
                icon: 'users',
            } : null,
            canUsers ? {
                route: '/admin/permissions',
                label: t('角色權限', 'Permissions'),
                desc: t('調整各角色的系統權限。', 'Adjust role-based permissions.'),
                tone: 'slate',
                icon: 'lock',
            } : null,
            canUsers ? {
                route: '/admin/nav-menu',
                label: t('主選單管理', 'Main menu'),
                desc: t('調整前台主選單次序與各類使用者可見性。', 'Reorder the front main menu and set audience visibility.'),
                tone: 'slate',
                icon: 'menu',
            } : null,
            canUsers ? {
                route: '/admin/db-export',
                label: t('匯出資料庫', 'Export DB'),
                desc: t('下載完整資料庫 SQL 備份。', 'Download a full database SQL dump.'),
                tone: 'teal',
                icon: 'export',
            } : null,
            canUsers ? {
                route: '/admin/db-import',
                label: t('匯入資料庫', 'Import DB'),
                desc: t('上載 SQL 還原或取代資料庫。', 'Upload SQL to restore or replace the database.'),
                tone: 'orange',
                icon: 'import',
            } : null,
            canUsers ? {
                route: '/admin/qsis-import',
                label: t('QSIS 匯入', 'QSIS import'),
                desc: t('從 QSIS 匯入課程與學生資料。', 'Import courses and students from QSIS.'),
                tone: 'teal',
                icon: 'import',
            } : null,
            canUsers ? {
                route: '/admin/data-dictionary',
                label: t('資料字典', 'Data dictionary'),
                desc: t('檢視與重新產生資料字典。', 'View and regenerate the data dictionary.'),
                tone: 'violet',
                icon: 'dict',
            } : null,
        ].filter(Boolean);

        const paint = (totals, hasStats, inboxTotal) => {
            const pending = totals?.pending ?? null;
            const reviewCard = contentCards.find((c) => c.route === '/admin/review-queue');
            if (reviewCard && pending != null) {
                reviewCard.badge = pending;
            }
            const inboxCard = teachingCards.find((c) => c.route === '/admin/inbox');
            if (inboxCard && inboxTotal != null && inboxTotal > 0) {
                inboxCard.badge = inboxTotal;
            }

            const statsHtml = hasStats
                ? `<div class="admin-dash-stats">
                    <div class="admin-dash-stat-card">
                        <span class="admin-dash-stat-label">${escapeHtml(t('已發佈', 'Published'))}</span>
                        <span class="admin-dash-stat-value admin-dash-stat-value-emerald">${escapeHtml(formatStat(totals.published))}</span>
                    </div>
                    <div class="admin-dash-stat-card">
                        <span class="admin-dash-stat-label">${escapeHtml(t('待審核', 'Pending review'))}</span>
                        <span class="admin-dash-stat-value admin-dash-stat-value-amber">${escapeHtml(formatStat(totals.pending))}</span>
                    </div>
                    <div class="admin-dash-stat-card">
                        <span class="admin-dash-stat-label">${escapeHtml(t('草稿', 'Draft'))}</span>
                        <span class="admin-dash-stat-value admin-dash-stat-value-slate">${escapeHtml(formatStat(totals.draft))}</span>
                    </div>
                </div>`
                : '';

            const reviewBadge = canReview && pending != null && pending > 0
                ? `<span class="admin-dash-badge admin-dash-badge-hero">${escapeHtml(String(pending))}</span>`
                : '';

            box.innerHTML = `
                <div class="admin-dash max-w-6xl mx-auto w-full">
                    <header class="admin-dash-hero">
                        <div class="admin-dash-hero-text">
                            <p class="admin-dash-eyebrow">${escapeHtml(t('管理後台', 'Admin'))}</p>
                            <h1 class="admin-dash-title">${escapeHtml(t('儀表板', 'Dashboard'))}</h1>
                            <p class="admin-dash-greeting">${escapeHtml(t(
                                `歡迎回來，${displayName}。管理 ${siteName} 的內容與平台設定。`,
                                `Welcome back, ${displayName}. Manage content and platform settings for ${siteName}.`
                            ))}</p>
                        </div>
                        <div class="admin-dash-hero-actions">
                            <a href="${escapeHtml(spaHref('/'))}" data-spa-nav="/" class="admin-dash-hero-btn admin-dash-hero-btn-primary">${escapeHtml(t('前往前台', 'Go to site'))}</a>
                            ${canReview ? `<a href="${escapeHtml(spaHref('/admin/review-queue'))}" data-spa-nav="/admin/review-queue" class="admin-dash-hero-btn admin-dash-hero-btn-secondary">${escapeHtml(t('審核佇列', 'Review queue'))}${reviewBadge}</a>` : ''}
                        </div>
                    </header>
                    ${statsHtml}
                    ${dashSection(t('教學', 'Teaching'), teachingCards)}
                    ${dashSection(t('內容', 'Content'), contentCards)}
                    ${dashSection(t('平台', 'Platform'), platformCards)}
                </div>`;
            bindDashNav(box);
        };

        paint({ published: null, pending: null, draft: null }, true, null);

        try {
            const [data, inboxCount] = await Promise.all([
                global.ScienceApi.apiFetch('/admin/dashboard'),
                canCourses
                    ? global.ScienceApi.apiFetch('/teacher/inbox/count').catch(() => null)
                    : Promise.resolve(null),
            ]);
            const totals = data?.totals || { published: 0, pending: 0, draft: 0 };
            const byType = data?.by_type || {};
            const hasStats = Object.keys(byType).length > 0;
            const inboxTotal = inboxCount && typeof inboxCount.total === 'number' ? inboxCount.total : null;
            paint(totals, hasStats, inboxTotal);
        } catch (_err) {
            paint({ published: null, pending: null, draft: null }, true, null);
        }
    }

    async function renderAdminSubjects() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('科目與單元', 'Subjects & topics');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!global.ScienceApi.hasPermission('user.manage')) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const list = await global.ScienceApi.apiFetch('/admin/subjects');
            const rows = (list || []).map((s) => {
                const topics = (s.topics || []).map((tp) =>
                    `<li class="text-sm text-slate-600">${escapeHtml(tp.name_zh || tp.name_en)} <span class="text-slate-400">(${escapeHtml(tp.slug)})</span></li>`
                ).join('');
                return `<article class="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 class="font-bold text-slate-900">${escapeHtml(s.name_zh || s.name_en)}
                        <span class="text-slate-400 font-normal text-sm">/${escapeHtml(s.name_en || '')}</span>
                    </h2>
                    <p class="text-xs text-slate-400 mb-2">slug: ${escapeHtml(s.slug)}</p>
                    <ul class="list-disc pl-5 space-y-0.5">${topics || `<li class="text-slate-400 text-sm">${escapeHtml(t('尚無單元', 'No topics'))}</li>`}</ul>
                </article>`;
            }).join('');

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                    <button type="button" id="admin-subj-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('重新整理', 'Reload'))}</button>
                </div>
                <form id="admin-subj-create" class="mb-6 grid sm:grid-cols-3 gap-2 items-end bg-white border border-slate-200 rounded-xl p-4">
                    <label class="text-sm">${escapeHtml(t('英文名稱', 'English name'))}
                        <input name="name_en" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${escapeHtml(t('中文名稱', 'Chinese name'))}
                        <input name="name_zh" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <button type="submit" class="rounded-lg bg-indigo-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('新增科目', 'Add subject'))}</button>
                </form>
                <p id="admin-subj-msg" class="hidden text-sm mb-3"></p>
                <div class="space-y-3">${rows || `<p class="text-slate-500">${escapeHtml(t('尚無科目', 'No subjects'))}</p>`}</div>`;

            document.getElementById('admin-subj-reload').onclick = () => renderAdminSubjects();
            document.querySelector('[data-spa-nav="/admin"]').addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/admin');
            });
            document.getElementById('admin-subj-create').addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const msg = document.getElementById('admin-subj-msg');
                try {
                    await global.ScienceApi.apiFetch('/admin/subjects', {
                        method: 'POST',
                        body: {
                            name_en: String(fd.get('name_en') || ''),
                            name_zh: String(fd.get('name_zh') || ''),
                        },
                    });
                    msg.textContent = t('已新增。', 'Created.');
                    msg.className = 'text-sm mb-3 text-emerald-700';
                    await renderAdminSubjects();
                } catch (err) {
                    msg.textContent = err.message || t('儲存失敗', 'Save failed');
                    msg.className = 'text-sm mb-3 text-red-600';
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = {
        renderAdminHome,
        renderAdminSubjects,
    };

export {};
