'use strict';
const global = window;

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
        question_bank: { zh: '試題庫', en: 'Question bank' },
        video: { zh: '影片', en: 'Video' },
    };

    const TYPE_ICONS = {
        note: '📝',
        simulation: '🔬',
        worksheet: '📄',
        article: '📰',
        learning_tool: '❓',
        question_bank: '❓',
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
            case 'question_bank': return '/quiz/' + slug;
            case 'video': return '/video/' + slug;
            case 'simulation': return '/simulation/' + slug;
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

        let prevSubjectSlug = subjectSlug;
        let prevTopicSlug = topicSlug;
        let nextSubjectSlug = subjectSlug;
        let nextTopicSlug = topicSlug;

        if (idx === items.length - 1 && !next && topicNext && (topicNext.items || []).length) {
            next = topicNext.items[0];
            nextTopicSlug = topicNext.slug;
        }
        if (idx === 0 && !prev && topicPrev && (topicPrev.items || []).length) {
            prev = topicPrev.items[topicPrev.items.length - 1];
            prevTopicSlug = topicPrev.slug;
        }

        return {
            prev, next, topicPrev, topicNext,
            prevSubjectSlug, prevTopicSlug, nextSubjectSlug, nextTopicSlug,
            subject: ctx.subject, topic: ctx.topic,
        };
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
        if (global.AppCatalog && global.AppCatalog.closeModal) {
            global.AppCatalog.closeModal();
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
            prevBtn = `<button type="button" class="course-nav-prev px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50" data-content-type="${escapeHtml(adj.prev.content_type)}" data-slug="${escapeHtml(adj.prev.slug)}" data-subject="${escapeHtml(adj.prevSubjectSlug)}" data-topic="${escapeHtml(adj.prevTopicSlug)}">← ${t('上一項', 'Previous')}</button>`;
        } else if (adj.topicPrev) {
            prevBtn = `<button type="button" class="course-nav-topic-prev px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(adj.topicPrev.slug)}">← ${t('上一課題', 'Previous topic')}</button>`;
        }

        if (adj.next) {
            nextBtn = `<button type="button" class="course-nav-next px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-content-type="${escapeHtml(adj.next.content_type)}" data-slug="${escapeHtml(adj.next.slug)}" data-subject="${escapeHtml(adj.nextSubjectSlug)}" data-topic="${escapeHtml(adj.nextTopicSlug)}">${t('下一項', 'Next')} →</button>`;
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

    function navItemFromBtn(btn, fallbackSubject, fallbackTopic) {
        return {
            item: {
                content_type: btn.getAttribute('data-content-type') || btn.dataset.contentType,
                slug: btn.dataset.slug,
            },
            subjectSlug: btn.dataset.subject || fallbackSubject,
            topicSlug: btn.dataset.topic || fallbackTopic,
        };
    }

    function bindNavBar(root, subjectSlug, topicSlug) {
        root.querySelector('.course-nav-prev')?.addEventListener('click', async (e) => {
            const { item, subjectSlug: sub, topicSlug: top } = navItemFromBtn(e.currentTarget, subjectSlug, topicSlug);
            await openItem(item, sub, top);
        });
        root.querySelector('.course-nav-next')?.addEventListener('click', async (e) => {
            const { item, subjectSlug: sub, topicSlug: top } = navItemFromBtn(e.currentTarget, subjectSlug, topicSlug);
            await openItem(item, sub, top);
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

    function itemRowHtml(item, idx, subjectSlug, topicSlug, completed, bookmarked, canBookmark) {
        const lang = getLang();
        const title = lang === 'zh' ? item.title_zh : item.title_en;
        const icon = TYPE_ICONS[item.content_type] || '•';
        const label = typeLabel(item.content_type);
        const doneBadge = completed ? '<span class="text-emerald-500 text-sm flex-shrink-0" title="' + t('已完成', 'Done') + '">✓</span>' : '';
        const bookmarkToggle = canBookmark
            ? `<span class="course-bookmark-toggle cursor-pointer select-none flex-shrink-0 ${bookmarked ? 'text-indigo-600' : 'text-slate-400'}"
                role="button"
                tabindex="0"
                aria-label="${bookmarked ? escapeHtml(t('已收藏', 'Bookmarked')) : escapeHtml(t('未收藏', 'Not bookmarked'))}"
                data-content-type="${escapeHtml(item.content_type)}"
                data-content-slug="${escapeHtml(item.slug)}">${bookmarked ? '★' : '☆'}</span>`
            : '';
        let meta = '';
        if (item.reading_time_minutes) {
            meta = `<span class="text-xs text-slate-400">${t('約', '~')}${item.reading_time_minutes}${t(' 分鐘', ' min')}</span>`;
        } else if (item.duration_minutes) {
            meta = `<span class="text-xs text-slate-400">${item.duration_minutes}${t(' 分鐘', ' min')}</span>`;
        }
        return `
            <button type="button" class="course-item-row w-full text-left flex items-center gap-3 p-4 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 shadow-sm transition-all" data-idx="${idx}" data-content-type="${escapeHtml(item.content_type)}" data-slug="${escapeHtml(item.slug)}" data-subject="${escapeHtml(subjectSlug)}" data-topic="${escapeHtml(topicSlug)}">
                <span class="text-xs font-mono text-indigo-600 w-6">${idx + 1}</span>
                <span class="text-lg" aria-hidden="true">${icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-slate-800 truncate">${escapeHtml(title)}</p>
                    <p class="text-xs text-slate-500">${escapeHtml(label)}</p>
                </div>
                ${meta}
                ${bookmarkToggle}
                ${doneBadge}
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

        if (global.AppLearningTracker) {
            global.AppLearningTracker.trackCourseTopic(subjectSlug, topicSlug, ctx.topic.id || null);
        }

        let progressMap = {};
        let recBanner = '';
        const progressAvailable = !!(global.ScienceApi.getUser() && ctx.topic.id);
        let bookmarkSet = new Set();
        if (global.ScienceApi.getUser() && ctx.topic.id) {
            try {
                const prog = await apiFetch('/learning/progress?topic_id=' + encodeURIComponent(ctx.topic.id));
                progressMap = prog.completed || {};
            } catch (e) { /* ignore */ }
            try {
                const bm = await apiFetch('/learning/bookmarks?limit=200');
                const list = bm.bookmarks || [];
                bookmarkSet = new Set(list.map((x) => String(x.content_type || '') + ':' + String(x.content_slug || '')));
            } catch (e) { /* ignore */ }
            try {
                const rec = await apiFetch('/learning/recommendations');
                const weak = (rec.weak_topics || []).find((w) => w.topic_slug === topicSlug);
                if (weak && weak.suggested_items && weak.suggested_items.length) {
                    const sug = weak.suggested_items[0];
                    const stitle = lang === 'zh' ? sug.title_zh : sug.title_en;
                    recBanner = `<div class="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                        <p class="text-amber-900 font-medium">${t('根據你的表現，建議先完成：', 'Based on your progress, try:')} ${escapeHtml(stitle)}</p>
                        <button type="button" class="course-rec-link text-indigo-600 hover:underline" data-route="${escapeHtml(sug.route)}">${t('前往', 'Go')} →</button>
                    </div>`;
                } else if (rec.next_course_item && rec.next_course_item.topic_slug === topicSlug) {
                    const ni = rec.next_course_item;
                    const ntitle = lang === 'zh' ? ni.title_zh : ni.title_en;
                    recBanner = `<div class="mb-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm">
                        <p class="text-indigo-900">${t('建議下一步：', 'Suggested next:')} ${escapeHtml(ntitle)}</p>
                        <button type="button" class="course-rec-link text-indigo-600 hover:underline" data-route="${escapeHtml(ni.route)}">${t('繼續', 'Continue')} →</button>
                    </div>`;
                }
            } catch (e) { /* ignore */ }
        }

        function isItemDone(item) {
            const list = progressMap[item.content_type] || [];
            return list.includes(item.slug);
        }

        function isItemBookmarked(item) {
            if (!bookmarkSet || bookmarkSet.size === 0) return false;
            return bookmarkSet.has(String(item.content_type || '') + ':' + String(item.slug || ''));
        }

        const items = ctx.topic.items || [];
        const topics = ctx.subject.topics || [];
        const topicIdx = topics.findIndex((tp) => tp.slug === topicSlug);
        const topicPrev = topicIdx > 0 ? topics[topicIdx - 1] : null;
        const topicNext = topicIdx >= 0 && topicIdx < topics.length - 1 ? topics[topicIdx + 1] : null;

        let topicProgressHtml = '';
        let coachHtml = '';
        if (items.length && progressAvailable) {
            const doneCount = items.reduce((acc, it) => acc + (isItemDone(it) ? 1 : 0), 0);
            const pct = Math.round((doneCount / Math.max(1, items.length)) * 100);
            topicProgressHtml = `
                <div class="mb-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p class="text-sm font-medium text-slate-800">${t('完成度', 'Progress')}</p>
                        <p class="text-xs text-slate-500">${doneCount}/${items.length} ${t('項完成', 'items done')}</p>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-600 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <p class="text-xs text-slate-500 mt-2">${pct}% ${t('進度', 'complete')}</p>
                </div>`;

            const coachFallback = `<div class="mb-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm">
                <p class="text-indigo-900">${t('你已完成部分內容；下一步推薦會在你做完測驗後更新。', 'Nice work. Recommendations will improve after you complete quizzes.')}</p>
            </div>`;

            coachHtml = `
                <div class="mb-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p class="text-sm font-bold text-indigo-900">${t('學習教練', 'Learning coach')}</p>
                        <p class="text-xs text-indigo-700">${t('規則式建議', 'Rule-based tips')}</p>
                    </div>
                    ${recBanner || coachFallback}
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button"
                            class="course-adaptive-quiz px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            data-topic-id="${escapeHtml(String(ctx.topic.id))}">
                            ${t('開始適性小測', 'Start adaptive quiz')} →
                        </button>
                        <p class="text-xs text-slate-600">${t('會優先用弱項/錯題生成測驗。', 'Prioritizes weak areas and recent wrong answers.')}</p>
                    </div>
                </div>`;
        }

        let discussionHtml = '';
        if (progressAvailable) {
            discussionHtml = `
                <div class="course-discussions mt-10 pt-6 border-t border-slate-200">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 class="text-lg font-bold text-slate-900">${t('討論串', 'Discussion')}</h2>
                        <span class="text-xs text-slate-500">${t('班別 + 課題', 'Class + topic')}</span>
                    </div>

                    <div class="mb-3">
                        <label for="course-discussions-class" class="block text-xs text-slate-500 mb-1">${t('選擇班別', 'Select class')}</label>
                        <select id="course-discussions-class" class="w-full border rounded-lg px-3 py-2 text-sm"></select>
                    </div>

                    <div id="course-discussions-flash" class="text-sm mb-3 hidden"></div>

                    <div class="grid lg:grid-cols-2 gap-4 mb-4">
                        <section class="rounded-xl border border-slate-200 bg-white p-4">
                            <h3 class="text-sm font-bold text-slate-900 mb-2">${t('已發布留言', 'Published posts')}</h3>
                            <div id="course-discussions-published" class="space-y-2"></div>
                        </section>
                        <section class="rounded-xl border border-slate-200 bg-white p-4">
                            <h3 class="text-sm font-bold text-slate-900 mb-2">${t('等待審核（我）', 'Pending (me)')}</h3>
                            <div id="course-discussions-pending" class="space-y-2"></div>
                        </section>
                    </div>

                    <section class="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 class="text-sm font-bold text-slate-900 mb-2">${t('發表留言', 'Write a message')}</h3>
                        <p id="course-discussions-reply-hint" class="text-xs text-indigo-700 mb-2 hidden"></p>
                        <textarea id="course-discussions-message" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm"></textarea>
                        <div class="flex flex-wrap items-center gap-2 mt-3">
                            <button type="button" id="course-discussions-send" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${t('送出（等待審核）', 'Send (pending)')}</button>
                            <button type="button" id="course-discussions-cancel-reply" class="hidden text-sm text-slate-600 hover:underline">${t('取消回覆', 'Cancel reply')}</button>
                            <p class="text-xs text-slate-500">${t('內容需教師審核後才會顯示為已發布。', 'Posts require teacher approval before becoming published.')}</p>
                        </div>
                    </section>
                </div>`;
        }

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
                ${topicNav}
                ${discussionHtml}`;
        } else {
            const canBookmark = !!global.ScienceApi.getUser();
            container.innerHTML = `
                <p class="text-xs text-indigo-600 mb-2">${escapeHtml(subName)}</p>
                ${topicProgressHtml}
                ${coachHtml}
                <p class="text-slate-600 text-sm mb-4">${t('依序完成以下內容：', 'Complete the following in order:')}</p>
                <div class="space-y-2">${items.map((it, i) => itemRowHtml(it, i, subjectSlug, topicSlug, isItemDone(it), isItemBookmarked(it), canBookmark)).join('')}</div>
                ${topicNav}
                ${discussionHtml}`;
            container.querySelectorAll('.course-item-row').forEach((row) => {
                row.onclick = () => openItem(
                    { content_type: row.getAttribute('data-content-type') || row.dataset.contentType, slug: row.dataset.slug },
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
        container.querySelectorAll('.course-rec-link').forEach((btn) => {
            btn.addEventListener('click', () => navigate(btn.getAttribute('data-route')));
        });

        container.querySelectorAll('.course-bookmark-toggle').forEach((el) => {
            el.addEventListener('click', async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const contentType = el.getAttribute('data-content-type') || '';
                const contentSlug = el.getAttribute('data-content-slug') || '';
                const key = String(contentType || '') + ':' + String(contentSlug || '');
                try {
                    const res = await apiFetch('/learning/bookmarks', {
                        method: 'POST',
                        body: { action: 'toggle', content_type: contentType, content_slug: contentSlug },
                    });
                    const bookmarked = !!res.bookmarked;
                    if (bookmarked) bookmarkSet.add(key);
                    else bookmarkSet.delete(key);

                    el.textContent = bookmarked ? '★' : '☆';
                    el.classList.toggle('text-indigo-600', bookmarked);
                    el.classList.toggle('text-slate-400', !bookmarked);
                } catch (err) {
                    alert(err.message || t('收藏失敗。', 'Bookmark failed.'));
                }
            });
        });

        container.querySelector('.course-adaptive-quiz')?.addEventListener('click', async (e) => {
            if (!ctx.topic.id) return;
            try {
                const res = await apiFetch('/learning/adaptive-quiz?topic_id=' + encodeURIComponent(ctx.topic.id));
                if (res && res.ok === true && res.mode === 'learning_tool' && res.source && res.source.route) {
                    // Enable quiz prev/next navigation by switching into "course mode".
                    setCourseContext({
                        subjectSlug,
                        topicSlug,
                        contentType: 'learning_tool',
                        slug: res.source.slug || '',
                    });
                    await navigate(res.source.route);
                    return;
                }
                if (res && res.ok === true && res.mode === 'review_wrong' && Array.isArray(res.questions) && res.questions.length) {
                    setCourseContext({
                        subjectSlug,
                        topicSlug,
                        contentType: 'learning_tool',
                        slug: '',
                    });
                    if (global.AppFrontLoader && global.AppFrontLoader.ensureAppRoute) {
                        await global.AppFrontLoader.ensureAppRoute('/quiz/adaptive-review');
                    }
                    if (global.AppQuiz && typeof global.AppQuiz.renderReviewWrong === 'function') {
                        await global.AppQuiz.renderReviewWrong(res);
                        return;
                    }
                    alert(t('無法載入錯題回顧介面。', 'Unable to load review UI.'));
                    return;
                }
                alert((res && res.error) ? res.error : t('無法產生適性小測。', 'Unable to generate adaptive quiz.'));
            } catch (err) {
                alert((err && err.message) ? err.message : t('取得測驗失敗。', 'Failed to fetch quiz.'));
            }
        });

        if (progressAvailable) {
            const classSelect = container.querySelector('#course-discussions-class');
            const publishedEl = container.querySelector('#course-discussions-published');
            const pendingEl = container.querySelector('#course-discussions-pending');
            const messageEl = container.querySelector('#course-discussions-message');
            const sendBtn = container.querySelector('#course-discussions-send');
            const flashEl = container.querySelector('#course-discussions-flash');
            const replyHint = container.querySelector('#course-discussions-reply-hint');
            const cancelReplyBtn = container.querySelector('#course-discussions-cancel-reply');

            if (classSelect && publishedEl && pendingEl && messageEl && sendBtn && flashEl) {
                function showFlash(msg, isError) {
                    flashEl.textContent = msg;
                    flashEl.classList.remove('hidden', 'text-red-600', 'text-emerald-700');
                    flashEl.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
                }

                function classLabel(c) {
                    const parts = [];
                    if (c.name) parts.push(String(c.name));
                    const fc = c.form_class ? String(c.form_class) : '';
                    const cn = c.class_no != null && c.class_no !== '' ? '#' + Number(c.class_no) : '';
                    const moi = c.moi ? 'MOI ' + String(c.moi) : '';
                    const sub = [fc, cn, moi].filter(Boolean).join(' ');
                    if (sub) parts.push(sub);
                    return parts.join(' · ');
                }

                const topicId = ctx.topic.id;
                const storageKey = 'science_sims_discussion_class_' + String(topicId);
                let selectedClassId = 0;
                let replyToPostId = null;
                let replyToName = '';

                function setReplyTarget(postId, displayName) {
                    replyToPostId = postId || null;
                    replyToName = displayName || '';
                    if (replyHint) {
                        if (replyToPostId) {
                            replyHint.textContent = t('回覆 ', 'Replying to ') + (replyToName || ('#' + replyToPostId));
                            replyHint.classList.remove('hidden');
                        } else {
                            replyHint.textContent = '';
                            replyHint.classList.add('hidden');
                        }
                    }
                    if (cancelReplyBtn) {
                        cancelReplyBtn.classList.toggle('hidden', !replyToPostId);
                    }
                }

                function postMsg(p) {
                    return lang === 'zh' ? (p.message_zh || p.message_en || '') : (p.message_en || p.message_zh || '');
                }

                function renderPublishedTree(published) {
                    const tops = published.filter((p) => !p.parent_post_id);
                    const byParent = {};
                    published.forEach((p) => {
                        if (p.parent_post_id) {
                            const pid = Number(p.parent_post_id);
                            if (!byParent[pid]) byParent[pid] = [];
                            byParent[pid].push(p);
                        }
                    });

                    function cardHtml(p, isReply) {
                        const msg = postMsg(p);
                        const when = p.created_at ? String(p.created_at).slice(0, 16).replace('T', ' ') : '';
                        const reacted = !!p.my_reacted;
                        const count = Number(p.reaction_count || 0);
                        return `
                            <div class="${isReply ? 'ml-4 pl-3 border-l border-slate-200 ' : ''}p-3 rounded-xl border border-slate-200 bg-white" data-post-id="${Number(p.id)}">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <span class="text-xs font-medium text-indigo-700">${escapeHtml(p.display_name || '')}</span>
                                    <span class="text-xs text-slate-500">${escapeHtml(when)}</span>
                                </div>
                                <p class="text-sm text-slate-800 whitespace-pre-wrap">${escapeHtml(msg)}</p>
                                <div class="flex flex-wrap items-center gap-3 mt-2">
                                    <button type="button" class="course-discussion-react text-xs ${reacted ? 'text-indigo-600 font-medium' : 'text-slate-500'} hover:underline"
                                        data-post-id="${Number(p.id)}" aria-pressed="${reacted ? 'true' : 'false'}">👍 ${count}</button>
                                    ${!isReply ? `<button type="button" class="course-discussion-reply text-xs text-indigo-600 hover:underline" data-post-id="${Number(p.id)}" data-name="${escapeHtml(p.display_name || '')}">${t('回覆', 'Reply')}</button>` : ''}
                                </div>
                            </div>`;
                    }

                    if (!tops.length && !published.length) {
                        return `<p class="text-sm text-slate-500">${t('尚無已發布留言。', 'No published posts yet.')}</p>`;
                    }

                    return tops.map((p) => {
                        const replies = byParent[Number(p.id)] || [];
                        return cardHtml(p, false) + replies.map((r) => cardHtml(r, true)).join('');
                    }).join('');
                }

                async function fetchDiscussion(cid) {
                    publishedEl.innerHTML = `<p class="text-sm text-slate-500">${t('載入中…', 'Loading…')}</p>`;
                    pendingEl.innerHTML = '';
                    try {
                        const data = await apiFetch(
                            '/course-discussions?class_id=' + encodeURIComponent(cid) + '&topic_id=' + encodeURIComponent(topicId)
                        );
                        const published = data.published_posts || [];
                        const myPending = data.my_pending_posts || [];

                        publishedEl.innerHTML = renderPublishedTree(published);

                        publishedEl.querySelectorAll('.course-discussion-reply').forEach((btn) => {
                            btn.addEventListener('click', () => {
                                setReplyTarget(parseInt(btn.getAttribute('data-post-id') || '0', 10) || null, btn.getAttribute('data-name') || '');
                                messageEl.focus();
                            });
                        });
                        publishedEl.querySelectorAll('.course-discussion-react').forEach((btn) => {
                            btn.addEventListener('click', async () => {
                                const postId = parseInt(btn.getAttribute('data-post-id') || '0', 10) || 0;
                                if (!postId) return;
                                try {
                                    const res = await apiFetch('/course-discussions/posts/' + postId + '/reactions', {
                                        method: 'POST',
                                        body: { action: 'toggle', reaction: 'up' },
                                    });
                                    const reacted = !!res.reacted;
                                    btn.setAttribute('aria-pressed', reacted ? 'true' : 'false');
                                    btn.classList.toggle('text-indigo-600', reacted);
                                    btn.classList.toggle('font-medium', reacted);
                                    btn.classList.toggle('text-slate-500', !reacted);
                                    btn.textContent = '👍 ' + Number(res.reaction_count || 0);
                                } catch (err) {
                                    showFlash(err.message || t('按讚失敗。', 'Reaction failed.'), true);
                                }
                            });
                        });

                        if (myPending.length) {
                            pendingEl.innerHTML = myPending.map((p) => {
                                const msg = postMsg(p);
                                const when = p.created_at ? String(p.created_at).slice(0, 16).replace('T', ' ') : '';
                                const replyNote = p.parent_post_id
                                    ? `<p class="text-xs text-amber-800 mb-1">${t('回覆留言 #', 'Reply to #')}${Number(p.parent_post_id)}</p>`
                                    : '';
                                return `
                                    <div class="p-3 rounded-xl border border-amber-200 bg-amber-50">
                                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <span class="text-xs font-medium text-amber-900">${t('等待審核', 'Pending review')}</span>
                                            <span class="text-xs text-slate-500">${escapeHtml(when)}</span>
                                        </div>
                                        ${replyNote}
                                        <p class="text-sm text-slate-800 whitespace-pre-wrap">${escapeHtml(msg)}</p>
                                    </div>`;
                            }).join('');
                        } else {
                            pendingEl.innerHTML = `<p class="text-sm text-slate-500">${t('你尚未送出等待審核的留言。', 'No pending posts.')}</p>`;
                        }
                    } catch (e) {
                        publishedEl.innerHTML = '';
                        pendingEl.innerHTML = '';
                        showFlash(e.message || t('討論載入失敗。', 'Failed to load discussions.'), true);
                    }
                }

                async function loadClassesAndDiscussion() {
                    try {
                        const data = await apiFetch('/student/classes');
                        const classes = data.classes || [];
                        classSelect.innerHTML = classes.length
                            ? classes.map((c) => `<option value="${Number(c.id)}">${escapeHtml(classLabel(c))}</option>`).join('')
                            : `<option value="0">${t('尚未加入班別', 'No classes')}</option>`;

                        selectedClassId = Number(localStorage.getItem(storageKey) || 0);
                        if (!selectedClassId || !classes.some((c) => Number(c.id) === selectedClassId)) {
                            selectedClassId = classes.length ? Number(classes[0].id) : 0;
                        }
                        classSelect.value = selectedClassId ? String(selectedClassId) : '0';

                        if (selectedClassId) {
                            await fetchDiscussion(selectedClassId);
                        } else {
                            publishedEl.innerHTML = `<p class="text-sm text-slate-500">${t('先加入班別，才能開始討論。', 'Join a class to start discussions.')}</p>`;
                            pendingEl.innerHTML = '';
                        }
                    } catch (e) {
                        showFlash(e.message || t('無法載入班別。', 'Failed to load classes.'), true);
                    }
                }

                classSelect.addEventListener('change', async () => {
                    const cid = parseInt(classSelect.value || '0', 10) || 0;
                    selectedClassId = cid;
                    setReplyTarget(null, '');
                    try {
                        localStorage.setItem(storageKey, String(cid));
                    } catch (err) { /* ignore */ }
                    if (cid) {
                        await fetchDiscussion(cid);
                    }
                });

                cancelReplyBtn?.addEventListener('click', () => setReplyTarget(null, ''));

                sendBtn.addEventListener('click', async () => {
                    const cid = selectedClassId;
                    const raw = String(messageEl.value || '');
                    const msg = raw.trim();
                    if (!cid) {
                        showFlash(t('請先選擇班別。', 'Please select a class first.'), true);
                        return;
                    }
                    if (!msg) {
                        showFlash(t('請輸入訊息內容。', 'Please type a message.'), true);
                        return;
                    }

                    sendBtn.disabled = true;
                    try {
                        const body = {
                            class_id: cid,
                            topic_id: topicId,
                            message_zh: lang === 'zh' ? msg : '',
                            message_en: lang === 'en' ? msg : '',
                        };
                        if (replyToPostId) body.parent_post_id = replyToPostId;
                        await apiFetch('/course-discussions/posts', {
                            method: 'POST',
                            body,
                        });
                        messageEl.value = '';
                        setReplyTarget(null, '');
                        showFlash(t('已送出，等待教師審核。', 'Sent! Waiting for teacher approval.'), false);
                        await fetchDiscussion(cid);
                    } catch (err) {
                        showFlash(err.message || t('送出失敗。', 'Failed to send.'), true);
                    } finally {
                        sendBtn.disabled = false;
                    }
                });

                await loadClassesAndDiscussion();
            }
        }
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

export {};
