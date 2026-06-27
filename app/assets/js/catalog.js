(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;

    let subjectData = {};
    let categoryMap = {};
    let titleMap = {};
    let learningTools = [];
    let articles = [];
    let learningNotes = [];
    let learningVideos = [];
    let worksheets = [];
    let contentTrees = {
        notes: { subjects: [], uncategorized: [] },
        videos: { subjects: [], uncategorized: [] },
        worksheets: { subjects: [], uncategorized: [] },
        articles: { subjects: [], uncategorized: [] },
    };
    let contentNavKind = null;

    const CONTENT_KIND = {
        notes: {
            subjectAttr: 'data-notes-subject',
            topicClass: 'notes-topic-btn',
            itemClass: 'note-nav-btn',
            buildRoute: (slug) => '/note/' + encodeURIComponent(slug),
            pageTitle: () => t('課程及學習筆記', 'Courses & Learning Notes'),
            listHint: () => t('依序閱讀以下學習筆記', 'Read the following notes in order'),
            navEmpty: () => t('尚無已發佈的學習筆記。', 'No published learning notes yet.'),
            topicEmpty: () => t('此課題尚無學習筆記。', 'No learning notes in this topic yet.'),
            listEmptyExtra: (canCreate) => canCreate
                ? ' ' + t('按「新增」建立第一則筆記。', 'Click "New" to create one.')
                : '',
            itemExtraHtml: (item, lang) => {
                if (!item.reading_time_minutes) return '';
                return `<span class="text-xs text-slate-400">${t('約', '~')}${item.reading_time_minutes}${t(' 分鐘', ' min')}</span>`;
            },
        },
        worksheets: {
            subjectAttr: 'data-ws-subject',
            topicClass: 'ws-topic-btn',
            itemClass: 'ws-nav-btn',
            buildRoute: (slug) => '/worksheet/' + encodeURIComponent(slug),
            pageTitle: () => t('工作紙', 'Worksheets'),
            listHint: () => t('依序使用以下工作紙', 'Use the following worksheets in order'),
            navEmpty: () => t('尚無已發佈的工作紙。', 'No published worksheets yet.'),
            topicEmpty: () => t('此課題尚無工作紙。', 'No worksheets in this topic yet.'),
            listEmptyExtra: () => '',
            itemExtraHtml: (item, lang) => {
                const desc = lang === 'zh' ? (item.description_zh || '') : (item.description_en || '');
                if (!desc) return '';
                const short = desc.length > 60 ? desc.slice(0, 57) + '…' : desc;
                return `<span class="text-xs text-slate-400 line-clamp-1">${escapeHtml(short)}</span>`;
            },
        },
        videos: {
            subjectAttr: 'data-vid-subject',
            topicClass: 'vid-topic-btn',
            itemClass: 'vid-nav-btn',
            buildRoute: (slug) => '/video/' + encodeURIComponent(slug),
            pageTitle: () => t('學習影片', 'Learning Videos'),
            listHint: () => t('依序觀看以下影片', 'Watch the following videos in order'),
            navEmpty: () => t('尚無已發佈的學習影片。', 'No published learning videos yet.'),
            topicEmpty: () => t('此課題尚無學習影片。', 'No learning videos in this topic yet.'),
            listEmptyExtra: () => '',
            itemExtraHtml: (item) => {
                const parts = [];
                if (item.duration_minutes) {
                    parts.push(`${item.duration_minutes}${t(' 分鐘', ' min')}`);
                }
                if (item.provider) {
                    parts.push(escapeHtml(String(item.provider)));
                }
                if (!parts.length) return '';
                return `<span class="text-xs text-slate-400">${parts.join(' · ')}</span>`;
            },
        },
        articles: {
            subjectAttr: 'data-art-subject',
            topicClass: 'art-topic-btn',
            itemClass: 'art-nav-btn',
            buildRoute: (slug) => '/article/' + encodeURIComponent(slug),
            pageTitle: () => t('科學文章', 'Science Articles'),
            listHint: () => t('依序閱讀以下文章', 'Read the following articles in order'),
            navEmpty: () => t('尚無已發佈的文章。', 'No published articles yet.'),
            topicEmpty: () => t('此課題尚無文章。', 'No articles in this topic yet.'),
            listEmptyExtra: () => '',
            itemExtraHtml: (item, lang) => {
                if (!item.reading_time_minutes) return '';
                return `<span class="text-xs text-slate-400">${t('約', '~')}${item.reading_time_minutes}${t(' 分鐘', ' min')}</span>`;
            },
        },
    };

    let siteBase = '';

    function resolveAssetUrl(path) {
        if (!path) return path;
        if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path;
        if (path.startsWith('/')) return path;
        const base = siteBase || (global.ScienceApi && ScienceApi.SITE_BASE) || '';
        return (base ? base.replace(/\/$/, '') : '') + '/' + path.replace(/^\.\//, '');
    }

    function cardHtmlFromItem(item) {
        const lang = getLang();
        const titleZh = titleMap[item.title] ? titleMap[item.title].zh : item.title;
        const titleEn = titleMap[item.title] ? titleMap[item.title].en : item.title;
        const screenshot = resolveAssetUrl(item.screenshot || '');
        const lastUpdated = item.last_updated || '';
        const exportUrl = resolveAssetUrl(item.export_url || item.url);
        const url = item.url || '';
        const unitZh = item.topic_label_zh || '';
        const unitEn = item.topic_label_en || '';
        return `
            <div class="sim-card bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col cursor-pointer" data-url="${escapeHtml(url)}">
                <div class="h-32 md:h-36 bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                    ${screenshot ? `<img src="${escapeHtml(screenshot)}" alt="" class="w-full h-full object-cover">` :
                        `<span class="text-slate-400 text-sm">${t('[實驗影像]', '[Experiment Image]')}</span>`}
                </div>
                <div class="p-4 md:p-5 flex-grow">
                    <p class="text-[11px] text-indigo-600 font-medium mb-1">${escapeHtml(lang === 'zh' ? unitZh : unitEn)}</p>
                    <h3 class="font-bold text-base md:text-lg text-slate-800 mb-2">${escapeHtml(lang === 'zh' ? titleZh : titleEn)}</h3>
                    <p class="text-slate-600 text-xs md:text-sm">${t('點擊進入模擬實驗', 'Click to enter simulation')}</p>
                </div>
                <div class="px-4 py-2 md:px-5 md:py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <p class="text-[10px] text-slate-400">${t('最後更新：', 'Updated: ')}${escapeHtml(lastUpdated)}</p>
                    <a href="${escapeHtml(exportUrl)}" class="text-[10px] text-indigo-600 hover:underline" download onclick="event.stopPropagation()">${t('下載源碼', 'Download')}</a>
                </div>
            </div>`;
    }

    function topicSectionHtml(topicKey, tInfo, expanded) {
        const lang = getLang();
        const cards = (tInfo.items || []).map(cardHtmlFromItem).join('');
        const hZh = tInfo.label_zh || '';
        const hEn = tInfo.label_en || '';
        const openClass = expanded ? 'open' : '';
        return `
            <section class="topic-panel bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${openClass}" data-topic-key="${escapeHtml(topicKey)}">
                <button type="button" class="topic-panel-header w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 text-left" aria-expanded="${expanded}">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="w-1 h-6 rounded-full bg-indigo-500"></span>
                        <h2 class="text-base font-semibold text-slate-800 truncate">${escapeHtml(lang === 'zh' ? hZh : hEn)}</h2>
                        <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">${(tInfo.items || []).length}</span>
                    </div>
                    <svg class="w-5 h-5 text-slate-400 rotate-icon ${expanded ? 'active' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="topic-panel-body">
                    <div class="px-3 pb-4 pt-1 border-t border-slate-100">
                        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">${cards}</div>
                    </div>
                </div>
            </section>`;
    }

    function sortContentItems(a, b) {
        return (a.list_sort_order || 0) - (b.list_sort_order || 0)
            || String(a.title_en || a.title_zh).localeCompare(String(b.title_en || b.title_zh));
    }

    function contentListForKind(kind) {
        if (kind === 'notes') return learningNotes;
        if (kind === 'videos') return learningVideos;
        if (kind === 'worksheets') return worksheets;
        return articles;
    }

    function contentNavItem(n) {
        return {
            slug: n.slug,
            title_zh: n.title_zh,
            title_en: n.title_en,
            reading_time_minutes: n.reading_time_minutes,
            description_zh: n.description_zh,
            description_en: n.description_en,
            duration_minutes: n.duration_minutes,
            provider: n.provider,
            list_sort_order: n.list_sort_order || 0,
        };
    }

    function buildContentTree(items) {
        const subjectMap = new Map();
        const uncategorized = [];

        for (const n of items) {
            const item = contentNavItem(n);
            if (!n.subject_id) {
                uncategorized.push(item);
                continue;
            }
            const sid = String(n.subject_id);
            if (!subjectMap.has(sid)) {
                subjectMap.set(sid, {
                    id: n.subject_id,
                    label_zh: n.subject_zh || t('未分類科目', 'Uncategorized subject'),
                    label_en: n.subject_en || 'Uncategorized subject',
                    topics: new Map(),
                    looseItems: [],
                });
            }
            const sub = subjectMap.get(sid);
            if (!n.topic_id) {
                sub.looseItems.push(item);
                continue;
            }
            const tid = String(n.topic_id);
            if (!sub.topics.has(tid)) {
                sub.topics.set(tid, {
                    id: n.topic_id,
                    label_zh: n.topic_zh || t('未分類課題', 'Uncategorized topic'),
                    label_en: n.topic_en || 'Uncategorized topic',
                    items: [],
                });
            }
            sub.topics.get(tid).items.push(item);
        }

        const subjects = [...subjectMap.values()].map((sub) => {
            const topics = [...sub.topics.values()]
                .map((tp) => ({ ...tp, items: tp.items.sort(sortContentItems) }))
                .sort((a, b) => sortContentItems(
                    { list_sort_order: 0, title_en: a.label_en, title_zh: a.label_zh },
                    { list_sort_order: 0, title_en: b.label_en, title_zh: b.label_zh }
                ));
            return {
                ...sub,
                topics,
                looseItems: sub.looseItems.sort(sortContentItems),
            };
        }).sort((a, b) => String(a.label_en).localeCompare(String(b.label_en)));

        return { subjects, uncategorized: uncategorized.sort(sortContentItems) };
    }

    function getFirstContentSelection(tree) {
        if (tree.uncategorized.length) {
            return { subjectId: '_other', topicId: '_other' };
        }
        const sub = tree.subjects[0];
        if (!sub) return null;
        if (sub.topics.length) {
            return { subjectId: String(sub.id), topicId: String(sub.topics[0].id) };
        }
        if (sub.looseItems.length) {
            return { subjectId: String(sub.id), topicId: '_loose' };
        }
        return null;
    }

    function findContentSelection(tree, subjectId, topicId) {
        if (subjectId === '_other' || topicId === '_other') {
            return {
                subjectLabel: { zh: t('其他', 'Other'), en: 'Other' },
                topicLabel: null,
                items: tree.uncategorized,
            };
        }
        const sub = tree.subjects.find((s) => String(s.id) === String(subjectId));
        if (!sub) return null;
        if (topicId === '_loose') {
            return {
                subjectLabel: { zh: sub.label_zh, en: sub.label_en },
                topicLabel: { zh: t('一般', 'General'), en: 'General' },
                items: sub.looseItems,
            };
        }
        const topic = sub.topics.find((tp) => String(tp.id) === String(topicId));
        if (!topic) return null;
        return {
            subjectLabel: { zh: sub.label_zh, en: sub.label_en },
            topicLabel: { zh: topic.label_zh, en: topic.label_en },
            items: topic.items,
        };
    }

    function getContentContext(kind, slug) {
        const list = contentListForKind(kind);
        const item = list.find((n) => n.slug === slug);
        if (!item) return { subjectId: null, topicId: null };
        if (!item.subject_id) return { subjectId: '_other', topicId: '_other' };
        if (!item.topic_id) return { subjectId: String(item.subject_id), topicId: '_loose' };
        return { subjectId: String(item.subject_id), topicId: String(item.topic_id) };
    }

    function renderContentNav(kind, activeSlug, subjectId, topicId) {
        contentNavKind = kind;
        const cfg = CONTENT_KIND[kind];
        const tree = contentTrees[kind];
        const nav = document.getElementById('main-nav');
        if (!nav || !cfg || !tree) return;
        const lang = getLang();
        let html = '';
        let first = true;

        const renderItemLinks = (items, subId, topId, expanded) => {
            if (!items.length) return '';
            const openClass = expanded ? 'open' : '';
            return `<div class="notes-nav-list ${openClass}" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}">
                ${items.map((item, idx) => {
                    const title = lang === 'zh' ? item.title_zh : item.title_en;
                    const active = activeSlug === item.slug ? ' active' : '';
                    return `<button type="button" class="${cfg.itemClass} w-full text-left pl-6 pr-3 py-1.5 text-xs text-slate-500 hover:text-indigo-300${active}" data-slug="${escapeHtml(item.slug)}" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}" data-content-kind="${escapeHtml(kind)}">
                        <span class="note-nav-index">${idx + 1}.</span> ${escapeHtml(title)}
                    </button>`;
                }).join('')}
            </div>`;
        };

        for (const sub of tree.subjects) {
            const subId = String(sub.id);
            const subOpen = subjectId == null || String(subjectId) === subId;
            html += `<div class="nav-group ${first ? '' : 'border-t border-slate-700/40 mt-1 pt-1'}">
                <button type="button" class="nav-group-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium" ${cfg.subjectAttr}="${escapeHtml(subId)}">
                    <span>${escapeHtml(lang === 'zh' ? sub.label_zh : sub.label_en)}</span>
                    <svg class="w-4 h-4 rotate-icon ${subOpen ? 'active' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="submenu bg-slate-950/50 rounded-lg mx-1 mb-1 ${subOpen ? 'open' : ''}">`;

            for (const topic of sub.topics) {
                const topId = String(topic.id);
                const topicOpen = subOpen && (topicId == null || String(topicId) === topId);
                const count = topic.items.length;
                html += `<div class="notes-topic-block">
                    <button type="button" class="topic-nav-btn ${cfg.topicClass} w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-indigo-300" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}" data-content-kind="${escapeHtml(kind)}">
                        ${escapeHtml(lang === 'zh' ? topic.label_zh : topic.label_en)} ${count ? '(' + count + ')' : ''}
                    </button>
                    ${renderItemLinks(topic.items, subId, topId, topicOpen)}
                </div>`;
            }

            if (sub.looseItems.length) {
                const topId = '_loose';
                const topicOpen = subOpen && (topicId == null || topicId === topId);
                html += `<div class="notes-topic-block">
                    <button type="button" class="topic-nav-btn ${cfg.topicClass} w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-indigo-300" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}" data-content-kind="${escapeHtml(kind)}">
                        ${escapeHtml(t('一般', 'General'))} (${sub.looseItems.length})
                    </button>
                    ${renderItemLinks(sub.looseItems, subId, topId, topicOpen)}
                </div>`;
            }

            html += '</div></div>';
            first = false;
        }

        if (tree.uncategorized.length) {
            const subId = '_other';
            const topId = '_other';
            const otherOpen = subjectId === subId || subjectId == null;
            html += `<div class="nav-group border-t border-slate-700/40 mt-1 pt-1">
                <button type="button" class="nav-group-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium" ${cfg.subjectAttr}="${escapeHtml(subId)}">
                    <span>${escapeHtml(t('其他', 'Other'))}</span>
                    <svg class="w-4 h-4 rotate-icon ${otherOpen ? 'active' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="submenu bg-slate-950/50 rounded-lg mx-1 mb-1 ${otherOpen ? 'open' : ''}">
                    ${renderItemLinks(tree.uncategorized, subId, topId, otherOpen)}
                </div>
            </div>`;
        }

        nav.innerHTML = html || `<p class="px-3 py-4 text-xs text-slate-500">${cfg.navEmpty()}</p>`;
        bindContentNavEvents(kind);
    }

    function bindContentNavEvents(kind) {
        const cfg = CONTENT_KIND[kind];
        if (!cfg) return;

        document.querySelectorAll(`.nav-group-btn[${cfg.subjectAttr}]`).forEach((btn) => {
            btn.onclick = () => {
                const submenu = btn.nextElementSibling;
                const icon = btn.querySelector('.rotate-icon');
                submenu?.classList.toggle('open');
                icon?.classList.toggle('active');
                showContentTopic(kind, btn.getAttribute(cfg.subjectAttr), null);
            };
        });
        document.querySelectorAll(`.${cfg.topicClass}[data-content-kind="${kind}"]`).forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const list = btn.nextElementSibling;
                list?.classList.toggle('open');
                showContentTopic(kind, btn.dataset.subjectId, btn.dataset.topicId);
            };
        });
        document.querySelectorAll(`.${cfg.itemClass}[data-content-kind="${kind}"]`).forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                global.AppRouter.navigate(cfg.buildRoute(btn.dataset.slug));
            };
        });
    }

    function showContentTopic(kind, subjectId, topicId) {
        const cfg = CONTENT_KIND[kind];
        const tree = contentTrees[kind];
        const container = document.getElementById('card-container');
        const titleEl = document.getElementById('page-title');
        if (!container || !titleEl || !cfg || !tree) return;

        let selection = subjectId != null ? findContentSelection(tree, subjectId, topicId) : null;
        if (!selection) {
            const first = getFirstContentSelection(tree);
            if (first) selection = findContentSelection(tree, first.subjectId, first.topicId);
        }
        if (!selection) {
            titleEl.textContent = cfg.pageTitle();
            container.innerHTML = `<p class="text-slate-500">${cfg.navEmpty()}</p>`;
            return;
        }

        const lang = getLang();
        const subName = lang === 'zh' ? selection.subjectLabel.zh : selection.subjectLabel.en;
        const topName = selection.topicLabel
            ? (lang === 'zh' ? selection.topicLabel.zh : selection.topicLabel.en)
            : '';
        titleEl.textContent = topName ? `${subName} · ${topName}` : subName;

        document.querySelectorAll(`.${cfg.itemClass}[data-content-kind="${kind}"]`).forEach((btn) => {
            btn.classList.remove('active');
        });

        if (!selection.items.length) {
            container.innerHTML = `<p class="text-slate-500">${cfg.topicEmpty()}</p>`;
            return;
        }

        container.innerHTML = `
            <section class="notes-linear-panel bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <p class="text-sm text-slate-600">${cfg.listHint()}</p>
                </div>
                <ol class="notes-linear-list divide-y divide-slate-100">
                    ${selection.items.map((item, idx) => {
                        const title = lang === 'zh' ? item.title_zh : item.title_en;
                        const extra = cfg.itemExtraHtml(item, lang);
                        return `<li>
                            <a href="#" data-slug="${escapeHtml(item.slug)}" class="notes-linear-item flex items-center justify-between gap-4 px-4 py-4 hover:bg-indigo-50/50 transition-colors">
                                <div class="flex items-start gap-3 min-w-0">
                                    <span class="notes-linear-num flex-shrink-0">${idx + 1}</span>
                                    <span class="font-medium text-slate-800">${escapeHtml(title)}</span>
                                </div>
                                ${extra}
                            </a>
                        </li>`;
                    }).join('')}
                </ol>
            </section>`;

        container.querySelectorAll('.notes-linear-item').forEach((a) => {
            a.onclick = (e) => {
                e.preventDefault();
                global.AppRouter.navigate(cfg.buildRoute(a.dataset.slug));
            };
        });
    }

    function renderNotesNav(activeSlug, subjectId, topicId) {
        renderContentNav('notes', activeSlug, subjectId, topicId);
    }

    function showNotesTopic(subjectId, topicId) {
        showContentTopic('notes', subjectId, topicId);
    }

    function renderNav() {
        contentNavKind = 'simulations';
        const nav = document.getElementById('main-nav');
        if (!nav) return;
        const lang = getLang();
        let html = '';
        let first = true;
        for (const [category, subInfo] of Object.entries(subjectData)) {
            const categoryId = category.toLowerCase().replace(/\s+/g, '-');
            const catZh = categoryMap[category]?.zh || subInfo.label_zh || category;
            const catEn = categoryMap[category]?.en || subInfo.label_en || category;
            html += `<div class="nav-group ${first ? '' : 'border-t border-slate-700/40 mt-1 pt-1'}">
                <button type="button" class="nav-group-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium" data-cat="${escapeHtml(categoryId)}">
                    <span>${escapeHtml(lang === 'zh' ? catZh : catEn)}</span>
                    <svg class="w-4 h-4 rotate-icon ${first ? 'active' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="submenu bg-slate-950/50 rounded-lg mx-1 mb-1 ${first ? 'open' : ''}">`;
            for (const [topicKey, topicInfo] of Object.entries(subInfo.topics || {})) {
                const count = (topicInfo.items || []).length;
                const tZh = topicInfo.label_zh || '';
                const tEn = topicInfo.label_en || '';
                html += `<button type="button" class="topic-nav-btn w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-indigo-300" data-cat="${escapeHtml(categoryId)}" data-topic="${escapeHtml(topicKey)}">
                    ${escapeHtml(lang === 'zh' ? tZh : tEn)} ${count ? '(' + count + ')' : ''}
                </button>`;
            }
            html += '</div></div>';
            first = false;
        }
        nav.innerHTML = html;
        bindNavEvents();
    }

    function bindNavEvents() {
        document.querySelectorAll('.nav-group-btn[data-cat]').forEach(btn => {
            btn.onclick = () => {
                const submenu = btn.nextElementSibling;
                const icon = btn.querySelector('.rotate-icon');
                submenu.classList.toggle('open');
                icon.classList.toggle('active');
                showCategory(btn.dataset.cat, null);
            };
        });
        document.querySelectorAll('.topic-nav-btn[data-cat]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                showCategory(btn.dataset.cat, btn.dataset.topic);
            };
        });
    }

    function showCategory(categoryId, topicKey) {
        const subjectKey = Object.keys(subjectData).find(cat => cat.toLowerCase().replace(/\s+/g, '-') === categoryId)
            || Object.keys(subjectData)[0];
        const sub = subjectData[subjectKey];
        const container = document.getElementById('card-container');
        if (!sub || !container) return;

        const categoryZh = categoryMap[subjectKey]?.zh || sub.label_zh;
        const categoryEn = categoryMap[subjectKey]?.en || sub.label_en;
        const lang = getLang();

        document.getElementById('page-title').textContent = (lang === 'zh' ? categoryZh : categoryEn) + t('模擬實驗', ' Simulations');

        if (topicKey == null) {
            container.innerHTML = Object.keys(sub.topics).map((tk, i) => topicSectionHtml(tk, sub.topics[tk], i === 0)).join('');
        } else {
            container.innerHTML = topicSectionHtml(topicKey, sub.topics[topicKey], true);
        }

        container.querySelectorAll('.topic-panel-header').forEach(hdr => {
            hdr.onclick = () => {
                const panel = hdr.closest('.topic-panel');
                const open = !panel.classList.contains('open');
                panel.classList.toggle('open', open);
                hdr.querySelector('.rotate-icon')?.classList.toggle('active', open);
            };
        });

        container.querySelectorAll('.sim-card').forEach(card => {
            card.onclick = () => global.AppCatalog.openModal(card.dataset.url);
        });
    }

    let simOpenAt = 0;
    let simTrackSlug = '';

    function openModal(url) {
        const modal = document.getElementById('sim-modal');
        const iframe = document.getElementById('sim-modal-iframe');
        if (!modal || !iframe) return;
        const resolved = resolveAssetUrl(url);
        iframe.src = resolved;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (global.SimModal) SimModal.onOpen(resolved);
        const m = String(url).match(/\/simulations\/([^/]+)\/html/);
        if (m && global.AppLearningTracker) {
            simTrackSlug = decodeURIComponent(m[1]);
            simOpenAt = Date.now();
            global.AppLearningTracker.trackSimulationOpen(simTrackSlug, {});
        }
    }

    function closeModal() {
        const modal = document.getElementById('sim-modal');
        const iframe = document.getElementById('sim-modal-iframe');
        if (global.SimModal) SimModal.onClose();
        if (simTrackSlug && simOpenAt && global.AppLearningTracker) {
            const secs = Math.round((Date.now() - simOpenAt) / 1000);
            global.AppLearningTracker.trackSimulationClose(simTrackSlug, secs);
            simTrackSlug = '';
            simOpenAt = 0;
        }
        if (modal) modal.classList.remove('active');
        if (iframe) iframe.src = '';
        document.body.style.overflow = '';
    }

    async function loadCatalog(options) {
        const opts = typeof options === 'boolean' ? { skipNavRender: options } : (options || {});
        const data = await apiFetch('/catalog');
        if (data.site_base !== undefined) {
            siteBase = data.site_base || '';
        }
        const sim = data.simulations || {};
        subjectData = sim.subjects || {};
        categoryMap = sim.categoryMap || {};
        titleMap = sim.titleMap || {};
        learningTools = data.learning_tools || [];
        articles = data.articles || [];
        learningNotes = data.learning_notes || [];
        learningVideos = data.learning_videos || [];
        worksheets = data.worksheets || [];
        contentTrees.notes = buildContentTree(learningNotes);
        contentTrees.videos = buildContentTree(learningVideos);
        contentTrees.worksheets = buildContentTree(worksheets);
        contentTrees.articles = buildContentTree(articles);
        if (!opts.skipNavRender) {
            if (opts.navMode === 'notes') {
                renderContentNav('notes', opts.activeSlug || null, opts.subjectId, opts.topicId);
                showContentTopic('notes', opts.subjectId, opts.topicId);
            } else if (opts.navMode === 'videos') {
                renderContentNav('videos', opts.activeSlug || null, opts.subjectId, opts.topicId);
                showContentTopic('videos', opts.subjectId, opts.topicId);
            } else if (opts.navMode === 'worksheets') {
                renderContentNav('worksheets', opts.activeSlug || null, opts.subjectId, opts.topicId);
                showContentTopic('worksheets', opts.subjectId, opts.topicId);
            } else if (opts.navMode === 'articles') {
                renderContentNav('articles', opts.activeSlug || null, opts.subjectId, opts.topicId);
                showContentTopic('articles', opts.subjectId, opts.topicId);
            } else {
                renderNav();
                const firstKey = Object.keys(subjectData)[0];
                if (firstKey) {
                    showCategory(firstKey.toLowerCase().replace(/\s+/g, '-'), null);
                }
            }
        }
        return data;
    }

    function getNoteContext(slug) {
        return getContentContext('notes', slug);
    }

    function rebuildContentTrees() {
        contentTrees.notes = buildContentTree(learningNotes);
        contentTrees.videos = buildContentTree(learningVideos);
        contentTrees.worksheets = buildContentTree(worksheets);
        contentTrees.articles = buildContentTree(articles);
    }

    async function prepareContentSidebar(kind, activeSlug) {
        const list = contentListForKind(kind);
        if (!list.length) {
            await loadCatalog({ skipNavRender: true });
        }
        rebuildContentTrees();
        const ctx = activeSlug ? getContentContext(kind, activeSlug) : getFirstContentSelection(contentTrees[kind]) || {};
        renderContentNav(kind, activeSlug || null, ctx.subjectId, ctx.topicId);
        return ctx;
    }

    async function prepareNotesSidebar(activeSlug) {
        return prepareContentSidebar('notes', activeSlug);
    }

    async function prepareWorksheetsSidebar(activeSlug) {
        return prepareContentSidebar('worksheets', activeSlug);
    }

    async function prepareArticlesSidebar(activeSlug) {
        return prepareContentSidebar('articles', activeSlug);
    }

    async function prepareVideosSidebar(activeSlug) {
        return prepareContentSidebar('videos', activeSlug);
    }

    async function renderContentList(kind, subjectId, topicId, setupHeader) {
        await loadCatalog({ skipNavRender: true });
        if (kind !== 'notes') {
            const createBtn = document.getElementById('btn-create-note');
            if (createBtn) createBtn.hidden = true;
        }
        if (typeof setupHeader === 'function') setupHeader();
        renderContentNav(kind, null, subjectId, topicId);

        const cfg = CONTENT_KIND[kind];
        const list = contentListForKind(kind);
        const container = document.getElementById('card-container');

        if (!list.length) {
            if (container) {
                const extra = cfg.listEmptyExtra
                    ? cfg.listEmptyExtra(kind === 'notes' && global.AppInlineEdit && global.AppInlineEdit.canEditType('note'))
                    : '';
                container.innerHTML = `<p class="text-slate-500">${cfg.navEmpty()}${extra}</p>`;
            }
            return;
        }

        const sel = subjectId != null
            ? { subjectId, topicId }
            : getFirstContentSelection(contentTrees[kind]);
        showContentTopic(kind, sel?.subjectId, sel?.topicId);
        renderContentNav(kind, null, sel?.subjectId, sel?.topicId);
    }

    function setupNotesPageHeader() {
        const titleEl = document.getElementById('page-title');
        const headerWrap = titleEl?.parentElement;
        if (titleEl && !titleEl.textContent.trim()) {
            titleEl.textContent = t('課程及學習筆記', 'Courses & Learning Notes');
        }
        const canCreate = global.AppInlineEdit && global.AppInlineEdit.canEditType('note');
        let createBtn = document.getElementById('btn-create-note');
        if (canCreate && headerWrap) {
            headerWrap.classList.add('page-header-row');
            if (!createBtn) {
                createBtn = document.createElement('button');
                createBtn.type = 'button';
                createBtn.id = 'btn-create-note';
                createBtn.className = 'admin-create-list-btn';
                createBtn.textContent = t('+ 新增', '+ New');
                createBtn.addEventListener('click', () => global.AppInlineEdit.openCreateNoteModal());
                headerWrap.appendChild(createBtn);
            }
            createBtn.hidden = false;
        } else if (createBtn) {
            createBtn.hidden = true;
        }
    }

    async function renderLearningNotesList(subjectId, topicId) {
        await renderContentList('notes', subjectId, topicId, setupNotesPageHeader);
    }
    async function renderWorksheetsList(subjectId, topicId) {
        await renderContentList('worksheets', subjectId, topicId, () => {
            const titleEl = document.getElementById('page-title');
            if (titleEl && !titleEl.textContent.trim()) {
                titleEl.textContent = t('工作紙', 'Worksheets');
            }
        });
    }

    function renderLearningToolsList() {
        const container = document.getElementById('card-container');
        const lang = getLang();
        document.getElementById('page-title').textContent = t('互動學習工具', 'Interactive Learning Tools');
        if (!learningTools.length) {
            container.innerHTML = `<p class="text-slate-500">${t('尚無已發佈的學習工具。', 'No published learning tools yet.')}</p>`;
            return;
        }
        container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">${learningTools.map(lt => `
            <a href="#" data-slug="${escapeHtml(lt.slug)}" class="lt-card block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <h3 class="font-bold text-lg text-slate-800 mb-2">${escapeHtml(lang === 'zh' ? lt.title_zh : lt.title_en)}</h3>
                <p class="text-sm text-slate-600">${escapeHtml(lang === 'zh' ? (lt.description_zh || '') : (lt.description_en || ''))}</p>
            </a>`).join('')}</div>`;
        container.querySelectorAll('.lt-card').forEach(a => {
            a.onclick = (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/quiz/' + encodeURIComponent(a.dataset.slug));
            };
        });
    }

    async function renderLearningVideosList(subjectId, topicId) {
        await renderContentList('videos', subjectId, topicId, () => {
            const titleEl = document.getElementById('page-title');
            if (titleEl && !titleEl.textContent.trim()) {
                titleEl.textContent = t('學習影片', 'Learning Videos');
            }
        });
    }

    async function renderArticlesList(subjectId, topicId) {
        await renderContentList('articles', subjectId, topicId, () => {
            const titleEl = document.getElementById('page-title');
            if (titleEl && !titleEl.textContent.trim()) {
                titleEl.textContent = t('科學文章', 'Science Articles');
            }
        });
    }

    global.AppCatalog = {
        loadCatalog,
        showCategory,
        showNotesTopic,
        showContentTopic,
        openModal,
        closeModal,
        renderLearningNotesList,
        renderNotesNav,
        renderContentNav,
        prepareNotesSidebar,
        prepareWorksheetsSidebar,
        prepareArticlesSidebar,
        prepareVideosSidebar,
        getNoteContext,
        getContentContext,
        renderWorksheetsList,
        renderLearningVideosList,
        renderLearningToolsList,
        renderArticlesList,
        getLearningTools: () => learningTools,
        getArticles: () => articles,
        getLearningNotes: () => learningNotes,
        getLearningVideos: () => learningVideos,
        getWorksheets: () => worksheets,
    };
})(window);
