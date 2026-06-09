(function (global) {
    'use strict';

    const { apiFetch, API_BASE } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;

    let coursesData = null;
    /** @type {{ subjectSlug: string, topicSlug: string, contentType: string, slug: string } | null} */
    let courseContext = null;

    const TYPE_LABELS = {
        note: { zh: '學習筆記', en: 'Note' },
        simulation: { zh: '模擬實驗', en: 'Simulation' },
        worksheet: { zh: '工作紙', en: 'Worksheet' },
        article: { zh: '科學文章', en: 'Article' },
        learning_tool: { zh: '互動測驗', en: 'Quiz' },
        video: { zh: '影片', en: 'Video' },
    };

    const TYPE_ICONS = {
        note: '📝',
        simulation: '🔬',
        worksheet: '📄',
        article: '📰',
        learning_tool: '❓',
        video: '▶️',
    };

    async function loadCourses(force) {
        if (coursesData && !force) return coursesData;
        try {
            coursesData = await apiFetch('/courses');
        } catch (e) {
            coursesData = { subjects: [] };
        }
        return coursesData;
    }

    function getSubjects() {
        return (coursesData && coursesData.subjects) || [];
    }

    function findSubject(slug) {
        return getSubjects().find((s) => s.slug === slug) || null;
    }

    function findTopic(subjectSlug, topicSlug) {
        const sub = findSubject(subjectSlug);
        if (!sub) return null;
        const topic = (sub.topics || []).find((tp) => tp.slug === topicSlug);
        return topic ? { subject: sub, topic } : null;
    }

    function setCourseContext(ctx) {
        courseContext = ctx;
    }

    function clearCourseContext() {
        courseContext = null;
    }

    function isCourseMode() {
        return courseContext !== null;
    }

    function getCourseContext() {
        return courseContext;
    }

    function typeLabel(type) {
        const labels = TYPE_LABELS[type] || { zh: type, en: type };
        return getLang() === 'zh' ? labels.zh : labels.en;
    }

    function topicBackRoute(subjectSlug) {
        return '/course/' + encodeURIComponent(subjectSlug);
    }

    function topicRoute(subjectSlug, topicSlug) {
        return '/course/' + encodeURIComponent(subjectSlug) + '/' + encodeURIComponent(topicSlug);
    }

    function itemRoute(item) {
        const slug = encodeURIComponent(item.slug);
        switch (item.content_type) {
            case 'note': return '/note/' + slug;
            case 'worksheet': return '/worksheet/' + slug;
            case 'article': return '/article/' + slug;
            case 'learning_tool': return '/quiz/' + slug;
            case 'video': return '/video/' + slug;
            default: return null;
        }
    }

    function resolveAdjacent(subjectSlug, topicSlug, contentType, slug) {
        const ctx = findTopic(subjectSlug, topicSlug);
        if (!ctx) return { prev: null, next: null, topicPrev: null, topicNext: null };
        const items = ctx.topic.items || [];
        const idx = items.findIndex((it) => it.content_type === contentType && it.slug === slug);
        const topics = ctx.subject.topics || [];
        const topicIdx = topics.findIndex((tp) => tp.slug === topicSlug);

        let prev = null;
        let next = null;
        if (idx > 0) prev = items[idx - 1];
        if (idx >= 0 && idx < items.length - 1) next = items[idx + 1];

        let topicPrev = topicIdx > 0 ? topics[topicIdx - 1] : null;
        let topicNext = topicIdx >= 0 && topicIdx < topics.length - 1 ? topics[topicIdx + 1] : null;

        if (idx === items.length - 1 && !next && topicNext && (topicNext.items || []).length) {
            next = topicNext.items[0];
        }
        if (idx === 0 && !prev && topicPrev && (topicPrev.items || []).length) {
            prev = topicPrev.items[topicPrev.items.length - 1];
        }

        return { prev, next, topicPrev, topicNext, subject: ctx.subject, topic: ctx.topic };
    }

    function openSimulation(slug) {
        const url = API_BASE + '/simulations/' + encodeURIComponent(slug) + '/html';
        if (global.AppCatalog && global.AppCatalog.openModal) {
            global.AppCatalog.openModal(url);
        }
    }

    async function openItem(item, subjectSlug, topicSlug) {
        setCourseContext({
            subjectSlug,
            topicSlug,
            contentType: item.content_type,
            slug: item.slug,
        });
        if (item.content_type === 'simulation') {
            openSimulation(item.slug);
            return;
        }
        const route = itemRoute(item);
        if (route) await navigate(route);
    }

    function navBarHtml(subjectSlug, topicSlug, contentType, slug) {
        const adj = resolveAdjacent(subjectSlug, topicSlug, contentType, slug);
        const topicUrl = topicRoute(subjectSlug, topicSlug);
        const subjectUrl = topicBackRoute(subjectSlug);

        let prevBtn = '';
        let nextBtn = '';
        if (adj.prev) {
            prevBtn = `<button type="button" class="course-nav-prev px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50" data-type="${escapeHtml(adj.prev.content_type)}" data-slug="${escapeHtml(adj.prev.slug)}">← ${t('上一項', 'Previous')}</button>`;
        } else if (adj.topicPrev) {
            prevBtn = `<button type="button" class="course-nav-topic-prev px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(adj.topicPrev.slug)}">← ${t('上一課題', 'Previous topic')}</button>`;
        }

        if (adj.next) {
            nextBtn = `<button type="button" class="course-nav-next px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-type="${escapeHtml(adj.next.content_type)}" data-slug="${escapeHtml(adj.next.slug)}">${t('下一項', 'Next')} →</button>`;
        } else if (adj.topicNext) {
            nextBtn = `<button type="button" class="course-nav-topic-next px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(adj.topicNext.slug)}">${t('下一課題', 'Next topic')} →</button>`;
        }

        return `
            <div class="course-item-nav mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap gap-2">${prevBtn}</div>
                <a href="${escapeHtml(topicUrl)}" class="text-sm text-indigo-600 hover:underline course-nav-topic">${t('返回課題', 'Back to topic')}</a>
                <div class="flex flex-wrap gap-2">${nextBtn}</div>
            </div>
            <p class="text-xs text-slate-400 mt-2 text-center">
                <a href="${escapeHtml(subjectUrl)}" class="hover:underline">${t('返回科目', 'Back to subject')}</a>
            </p>`;
    }

    function bindNavBar(root, subjectSlug, topicSlug) {
        root.querySelector('.course-nav-prev')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            await openItem({ content_type: btn.dataset.type, slug: btn.dataset.slug }, subjectSlug, topicSlug);
        });
        root.querySelector('.course-nav-next')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            await openItem({ content_type: btn.dataset.type, slug: btn.dataset.slug }, subjectSlug, topicSlug);
        });
        root.querySelector('.course-nav-topic-prev')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const ctx = findTopic(btn.dataset.subject, btn.dataset.topic);
            if (ctx && ctx.topic.items && ctx.topic.items.length) {
                const last = ctx.topic.items[ctx.topic.items.length - 1];
                await openItem(last, btn.dataset.subject, btn.dataset.topic);
            } else {
                await navigate(topicRoute(btn.dataset.subject, btn.dataset.topic));
            }
        });
        root.querySelector('.course-nav-topic-next')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const ctx = findTopic(btn.dataset.subject, btn.dataset.topic);
            if (ctx && ctx.topic.items && ctx.topic.items.length) {
                await openItem(ctx.topic.items[0], btn.dataset.subject, btn.dataset.topic);
            } else {
                await navigate(topicRoute(btn.dataset.subject, btn.dataset.topic));
            }
        });
        root.querySelectorAll('a.course-nav-topic, a[href^="/course/"]').forEach((a) => {
            a.addEventListener('click', (ev) => {
                ev.preventDefault();
                navigate(a.getAttribute('href'));
            });
        });
    }

    function attachItemNav(root, contentType, slug) {
        if (!courseContext) return;
        const { subjectSlug, topicSlug } = courseContext;
        root.insertAdjacentHTML('beforeend', navBarHtml(subjectSlug, topicSlug, contentType, slug));
        bindNavBar(root, subjectSlug, topicSlug);
    }

    function renderCoursesSidebar(activeSubjectSlug, activeTopicSlug) {
        const nav = document.getElementById('main-nav');
        if (!nav) return;
        const lang = getLang();
        const subjects = getSubjects();
        if (!subjects.length) {
            nav.innerHTML = `<p class="px-3 py-2 text-sm text-slate-500">${t('尚無自學課程。', 'No courses yet.')}</p>`;
            return;
        }

        let html = '';
        subjects.forEach((sub) => {
            const subOpen = activeSubjectSlug === sub.slug;
            const subLabel = lang === 'zh' ? sub.name_zh : sub.name_en;
            html += `
                <div class="course-subject-block mb-1">
                    <button type="button" class="course-subject-btn w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800/80 ${subOpen ? 'bg-slate-800 text-white' : ''}" data-subject="${escapeHtml(sub.slug)}">${escapeHtml(subLabel)}</button>`;
            if (subOpen) {
                html += '<div class="ml-2 mt-0.5 space-y-0.5">';
                (sub.topics || []).forEach((tp, i) => {
                    const tpLabel = lang === 'zh' ? tp.name_zh : tp.name_en;
                    const active = activeTopicSlug === tp.slug;
                    html += `<button type="button" class="course-topic-btn w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800/60 ${active ? 'text-indigo-300 font-semibold' : 'text-slate-400'}" data-subject="${escapeHtml(sub.slug)}" data-topic="${escapeHtml(tp.slug)}"><span class="font-mono mr-1">${i + 1}.</span>${escapeHtml(tpLabel)} <span class="text-slate-600">(${tp.item_count || 0})</span></button>`;
                });
                html += '</div>';
            }
            html += '</div>';
        });
        nav.innerHTML = html;

        nav.querySelectorAll('.course-subject-btn').forEach((btn) => {
            btn.onclick = () => navigate('/course/' + encodeURIComponent(btn.dataset.subject));
        });
        nav.querySelectorAll('.course-topic-btn').forEach((btn) => {
            btn.onclick = () => navigate('/course/' + encodeURIComponent(btn.dataset.subject) + '/' + encodeURIComponent(btn.dataset.topic));
        });
    }

    function subjectCardHtml(sub) {
        const lang = getLang();
        const name = lang === 'zh' ? sub.name_zh : sub.name_en;
        const topicCount = sub.topic_count || 0;
        const itemCount = sub.item_count || 0;
        return `
            <button type="button" class="course-subject-card text-left bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6 hover:border-indigo-300 hover:shadow-md transition-all" data-slug="${escapeHtml(sub.slug)}">
                <h3 class="font-bold text-lg text-slate-800 mb-2">${escapeHtml(name)}</h3>
                <p class="text-sm text-slate-500">${topicCount} ${t('個課題', 'topics')} · ${itemCount} ${t('項學習內容', 'items')}</p>
            </button>`;
    }

    async function renderCoursesHome() {
        await loadCourses(true);
        const container = document.getElementById('card-container');
        const title = document.getElementById('page-title');
        if (title) title.textContent = t('自學課程', 'Self-study Courses');
        renderCoursesSidebar(null, null);

        const subjects = getSubjects();
        if (!subjects.length) {
            container.innerHTML = `<p class="text-slate-500">${t('編課者尚未安排自學課程內容。', 'No self-study courses have been configured yet.')}</p>`;
            return;
        }

        container.innerHTML = `
            <p class="text-slate-600 text-sm mb-4">${t('選擇科目，依編排順序完成各課題的學習內容。', 'Choose a subject and follow the arranged learning path.')}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">${subjects.map(subjectCardHtml).join('')}</div>`;
        container.querySelectorAll('.course-subject-card').forEach((card) => {
            card.onclick = () => navigate('/course/' + encodeURIComponent(card.dataset.slug));
        });
    }

    async function renderSubject(subjectSlug) {
        await loadCourses(true);
        const sub = findSubject(subjectSlug);
        const container = document.getElementById('card-container');
        const title = document.getElementById('page-title');
        if (!sub) {
            if (title) title.textContent = t('找不到科目', 'Subject not found');
            container.innerHTML = `<p class="text-red-600">${t('找不到此科目。', 'Subject not found.')}</p>`;
            return;
        }
        const lang = getLang();
        if (title) title.textContent = lang === 'zh' ? sub.name_zh : sub.name_en;
        renderCoursesSidebar(subjectSlug, null);

        const topics = sub.topics || [];
        if (!topics.length) {
            container.innerHTML = `<p class="text-slate-500">${t('此科目尚無課題。', 'No topics in this subject.')}</p>`;
            return;
        }

        const steps = topics.map((tp, i) => {
            const tpLabel = lang === 'zh' ? tp.name_zh : tp.name_en;
            const count = tp.item_count || 0;
            const empty = count === 0;
            return `
                <button type="button" class="course-step w-full text-left flex items-start gap-4 p-4 rounded-xl border ${empty ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200/80 bg-white hover:border-indigo-300 shadow-sm'} transition-all" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(tp.slug)}" ${empty ? 'disabled' : ''}>
                    <span class="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">${i + 1}</span>
                    <div class="min-w-0 flex-1">
                        <h3 class="font-semibold text-slate-800">${escapeHtml(tpLabel)}</h3>
                        <p class="text-xs text-slate-500 mt-1">${count} ${t('項內容', 'items')}${empty ? ' · ' + t('尚未編排', 'not configured') : ''}</p>
                    </div>
                </button>`;
        }).join('');

        container.innerHTML = `
            <p class="text-slate-600 text-sm mb-4">${t('依序完成以下課題：', 'Complete the following topics in order:')}</p>
            <div class="space-y-3">${steps}</div>`;
        container.querySelectorAll('.course-step:not([disabled])').forEach((btn) => {
            btn.onclick = () => navigate(topicRoute(btn.dataset.subject, btn.dataset.topic));
        });
    }

    function itemRowHtml(item, idx, subjectSlug, topicSlug) {
        const lang = getLang();
        const title = lang === 'zh' ? item.title_zh : item.title_en;
        const icon = TYPE_ICONS[item.content_type] || '•';
        const label = typeLabel(item.content_type);
        let meta = '';
        if (item.reading_time_minutes) {
            meta = `<span class="text-xs text-slate-400">${t('約', '~')}${item.reading_time_minutes}${t(' 分鐘', ' min')}</span>`;
        } else if (item.duration_minutes) {
            meta = `<span class="text-xs text-slate-400">${item.duration_minutes}${t(' 分鐘', ' min')}</span>`;
        }
        return `
            <button type="button" class="course-item-row w-full text-left flex items-center gap-3 p-4 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 shadow-sm transition-all" data-idx="${idx}" data-type="${escapeHtml(item.content_type)}" data-slug="${escapeHtml(item.slug)}" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(topicSlug)}">
                <span class="text-xs font-mono text-indigo-600 w-6">${idx + 1}</span>
                <span class="text-lg" aria-hidden="true">${icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-slate-800 truncate">${escapeHtml(title)}</p>
                    <p class="text-xs text-slate-500">${escapeHtml(label)}</p>
                </div>
                ${meta}
            </button>`;
    }

    async function renderTopic(subjectSlug, topicSlug) {
        await loadCourses(true);
        const ctx = findTopic(subjectSlug, topicSlug);
        const container = document.getElementById('card-container');
        const title = document.getElementById('page-title');
        if (!ctx) {
            if (title) title.textContent = t('找不到課題', 'Topic not found');
            container.innerHTML = `<p class="text-red-600">${t('找不到此課題。', 'Topic not found.')}</p>`;
            return;
        }
        const lang = getLang();
        const subName = lang === 'zh' ? ctx.subject.name_zh : ctx.subject.name_en;
        const tpName = lang === 'zh' ? ctx.topic.name_zh : ctx.topic.name_en;
        if (title) title.textContent = tpName;
        renderCoursesSidebar(subjectSlug, topicSlug);

        const items = ctx.topic.items || [];
        const topics = ctx.subject.topics || [];
        const topicIdx = topics.findIndex((tp) => tp.slug === topicSlug);
        const topicPrev = topicIdx > 0 ? topics[topicIdx - 1] : null;
        const topicNext = topicIdx >= 0 && topicIdx < topics.length - 1 ? topics[topicIdx + 1] : null;

        let topicNav = '<div class="flex flex-wrap justify-between gap-2 mt-6 pt-4 border-t border-slate-200">';
        if (topicPrev) {
            topicNav += `<button type="button" class="course-topic-nav-prev text-sm text-indigo-600 hover:underline" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(topicPrev.slug)}">← ${t('上一課題', 'Previous topic')}</button>`;
        } else {
            topicNav += '<span></span>';
        }
        if (topicNext) {
            topicNav += `<button type="button" class="course-topic-nav-next text-sm text-indigo-600 hover:underline" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(topicNext.slug)}">${t('下一課題', 'Next topic')} →</button>`;
        }
        topicNav += '</div>';

        if (!items.length) {
            container.innerHTML = `
                <p class="text-xs text-indigo-600 mb-2">${escapeHtml(subName)}</p>
                <p class="text-slate-500 py-8">${t('編課者尚未安排此課題的學習內容。', 'No learning items configured for this topic yet.')}</p>
                ${topicNav}`;
        } else {
            container.innerHTML = `
                <p class="text-xs text-indigo-600 mb-2">${escapeHtml(subName)}</p>
                <p class="text-slate-600 text-sm mb-4">${t('依序完成以下內容：', 'Complete the following in order:')}</p>
                <div class="space-y-2">${items.map((it, i) => itemRowHtml(it, i, subjectSlug, topicSlug)).join('')}</div>
                ${topicNav}`;
            container.querySelectorAll('.course-item-row').forEach((row) => {
                row.onclick = () => openItem(
                    { content_type: row.dataset.type, slug: row.dataset.slug },
                    row.dataset.subject,
                    row.dataset.topic
                );
            });
        }

        container.querySelector('.course-topic-nav-prev')?.addEventListener('click', (e) => {
            navigate(topicRoute(e.currentTarget.dataset.subject, e.currentTarget.dataset.topic));
        });
        container.querySelector('.course-topic-nav-next')?.addEventListener('click', (e) => {
            navigate(topicRoute(e.currentTarget.dataset.subject, e.currentTarget.dataset.topic));
        });
    }

    function getBackRoute() {
        if (!courseContext) return '/courses';
        return topicRoute(courseContext.subjectSlug, courseContext.topicSlug);
    }

    global.AppCourse = {
        loadCourses,
        renderCoursesHome,
        renderSubject,
        renderTopic,
        renderCoursesSidebar,
        setCourseContext,
        clearCourseContext,
        isCourseMode,
        getCourseContext,
        attachItemNav,
        openItem,
        openSimulation,
        getBackRoute,
        findTopic,
    };
})(window);
