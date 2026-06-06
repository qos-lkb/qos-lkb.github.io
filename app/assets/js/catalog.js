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
    let worksheets = [];
    let notesTree = { subjects: [], uncategorized: [] };
    let notesNavMode = false;

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

    function sortNotes(a, b) {
        return (a.list_sort_order || 0) - (b.list_sort_order || 0)
            || String(a.title_en || a.title_zh).localeCompare(String(b.title_en || b.title_zh));
    }

    function noteNavItem(n) {
        return {
            slug: n.slug,
            title_zh: n.title_zh,
            title_en: n.title_en,
            reading_time_minutes: n.reading_time_minutes,
            list_sort_order: n.list_sort_order || 0,
        };
    }

    function buildNotesTree(notes) {
        const subjectMap = new Map();
        const uncategorized = [];

        for (const n of notes) {
            const item = noteNavItem(n);
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
                    looseNotes: [],
                });
            }
            const sub = subjectMap.get(sid);
            if (!n.topic_id) {
                sub.looseNotes.push(item);
                continue;
            }
            const tid = String(n.topic_id);
            if (!sub.topics.has(tid)) {
                sub.topics.set(tid, {
                    id: n.topic_id,
                    label_zh: n.topic_zh || t('未分類課題', 'Uncategorized topic'),
                    label_en: n.topic_en || 'Uncategorized topic',
                    notes: [],
                });
            }
            sub.topics.get(tid).notes.push(item);
        }

        const subjects = [...subjectMap.values()].map((sub) => {
            const topics = [...sub.topics.values()]
                .map((tp) => ({ ...tp, notes: tp.notes.sort(sortNotes) }))
                .sort((a, b) => sortNotes(
                    { list_sort_order: 0, title_en: a.label_en, title_zh: a.label_zh },
                    { list_sort_order: 0, title_en: b.label_en, title_zh: b.label_zh }
                ));
            return {
                ...sub,
                topics,
                looseNotes: sub.looseNotes.sort(sortNotes),
            };
        }).sort((a, b) => String(a.label_en).localeCompare(String(b.label_en)));

        return { subjects, uncategorized: uncategorized.sort(sortNotes) };
    }

    function getFirstNotesSelection() {
        if (notesTree.uncategorized.length) {
            return { subjectId: '_other', topicId: '_other' };
        }
        const sub = notesTree.subjects[0];
        if (!sub) return null;
        if (sub.topics.length) {
            return { subjectId: String(sub.id), topicId: String(sub.topics[0].id) };
        }
        if (sub.looseNotes.length) {
            return { subjectId: String(sub.id), topicId: '_loose' };
        }
        return null;
    }

    function findNotesSelection(subjectId, topicId) {
        if (subjectId === '_other' || topicId === '_other') {
            return {
                subjectLabel: { zh: t('其他', 'Other'), en: 'Other' },
                topicLabel: null,
                notes: notesTree.uncategorized,
            };
        }
        const sub = notesTree.subjects.find((s) => String(s.id) === String(subjectId));
        if (!sub) return null;
        if (topicId === '_loose') {
            return {
                subjectLabel: { zh: sub.label_zh, en: sub.label_en },
                topicLabel: { zh: t('一般', 'General'), en: 'General' },
                notes: sub.looseNotes,
            };
        }
        const topic = sub.topics.find((tp) => String(tp.id) === String(topicId));
        if (!topic) return null;
        return {
            subjectLabel: { zh: sub.label_zh, en: sub.label_en },
            topicLabel: { zh: topic.label_zh, en: topic.label_en },
            notes: topic.notes,
        };
    }

    function renderNotesNav(activeSlug, subjectId, topicId) {
        notesNavMode = true;
        const nav = document.getElementById('main-nav');
        if (!nav) return;
        const lang = getLang();
        let html = '';
        let first = true;

        const renderNoteLinks = (notes, subId, topId, expanded) => {
            if (!notes.length) return '';
            const openClass = expanded ? 'open' : '';
            return `<div class="notes-nav-list ${openClass}" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}">
                ${notes.map((note, idx) => {
                    const title = lang === 'zh' ? note.title_zh : note.title_en;
                    const active = activeSlug === note.slug ? ' active' : '';
                    return `<button type="button" class="note-nav-btn w-full text-left pl-6 pr-3 py-1.5 text-xs text-slate-500 hover:text-indigo-300${active}" data-slug="${escapeHtml(note.slug)}" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}">
                        <span class="note-nav-index">${idx + 1}.</span> ${escapeHtml(title)}
                    </button>`;
                }).join('')}
            </div>`;
        };

        for (const sub of notesTree.subjects) {
            const subId = String(sub.id);
            const subOpen = subjectId == null || String(subjectId) === subId;
            html += `<div class="nav-group ${first ? '' : 'border-t border-slate-700/40 mt-1 pt-1'}">
                <button type="button" class="nav-group-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium" data-notes-subject="${escapeHtml(subId)}">
                    <span>${escapeHtml(lang === 'zh' ? sub.label_zh : sub.label_en)}</span>
                    <svg class="w-4 h-4 rotate-icon ${subOpen ? 'active' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="submenu bg-slate-950/50 rounded-lg mx-1 mb-1 ${subOpen ? 'open' : ''}">`;

            for (const topic of sub.topics) {
                const topId = String(topic.id);
                const topicOpen = subOpen && (topicId == null || String(topicId) === topId);
                const count = topic.notes.length;
                html += `<div class="notes-topic-block">
                    <button type="button" class="topic-nav-btn notes-topic-btn w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-indigo-300" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}">
                        ${escapeHtml(lang === 'zh' ? topic.label_zh : topic.label_en)} ${count ? '(' + count + ')' : ''}
                    </button>
                    ${renderNoteLinks(topic.notes, subId, topId, topicOpen)}
                </div>`;
            }

            if (sub.looseNotes.length) {
                const topId = '_loose';
                const topicOpen = subOpen && (topicId == null || topicId === topId);
                html += `<div class="notes-topic-block">
                    <button type="button" class="topic-nav-btn notes-topic-btn w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-indigo-300" data-subject-id="${escapeHtml(subId)}" data-topic-id="${escapeHtml(topId)}">
                        ${escapeHtml(t('一般', 'General'))} (${sub.looseNotes.length})
                    </button>
                    ${renderNoteLinks(sub.looseNotes, subId, topId, topicOpen)}
                </div>`;
            }

            html += '</div></div>';
            first = false;
        }

        if (notesTree.uncategorized.length) {
            const subId = '_other';
            const topId = '_other';
            const otherOpen = subjectId === subId || subjectId == null;
            html += `<div class="nav-group border-t border-slate-700/40 mt-1 pt-1">
                <button type="button" class="nav-group-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium" data-notes-subject="${escapeHtml(subId)}">
                    <span>${escapeHtml(t('其他', 'Other'))}</span>
                    <svg class="w-4 h-4 rotate-icon ${otherOpen ? 'active' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="submenu bg-slate-950/50 rounded-lg mx-1 mb-1 ${otherOpen ? 'open' : ''}">
                    ${renderNoteLinks(notesTree.uncategorized, subId, topId, otherOpen)}
                </div>
            </div>`;
        }

        nav.innerHTML = html || `<p class="px-3 py-4 text-xs text-slate-500">${t('尚無已發佈的學習筆記。', 'No published learning notes yet.')}</p>`;
        bindNotesNavEvents();
    }

    function bindNotesNavEvents() {
        document.querySelectorAll('.nav-group-btn[data-notes-subject]').forEach((btn) => {
            btn.onclick = () => {
                const submenu = btn.nextElementSibling;
                const icon = btn.querySelector('.rotate-icon');
                submenu?.classList.toggle('open');
                icon?.classList.toggle('active');
                showNotesTopic(btn.dataset.notesSubject, null);
            };
        });
        document.querySelectorAll('.notes-topic-btn').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const list = btn.nextElementSibling;
                list?.classList.toggle('open');
                showNotesTopic(btn.dataset.subjectId, btn.dataset.topicId);
            };
        });
        document.querySelectorAll('.note-nav-btn').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                global.AppRouter.navigate('/note/' + encodeURIComponent(btn.dataset.slug));
            };
        });
    }

    function showNotesTopic(subjectId, topicId) {
        const container = document.getElementById('card-container');
        const titleEl = document.getElementById('page-title');
        if (!container || !titleEl) return;

        let selection = subjectId != null ? findNotesSelection(subjectId, topicId) : null;
        if (!selection) {
            const first = getFirstNotesSelection();
            if (first) selection = findNotesSelection(first.subjectId, first.topicId);
        }
        if (!selection) {
            titleEl.textContent = t('課程及學習筆記', 'Courses & Learning Notes');
            container.innerHTML = `<p class="text-slate-500">${t('尚無已發佈的學習筆記。', 'No published learning notes yet.')}</p>`;
            return;
        }

        const lang = getLang();
        const subName = lang === 'zh' ? selection.subjectLabel.zh : selection.subjectLabel.en;
        const topName = selection.topicLabel
            ? (lang === 'zh' ? selection.topicLabel.zh : selection.topicLabel.en)
            : '';
        titleEl.textContent = topName ? `${subName} · ${topName}` : subName;

        document.querySelectorAll('.note-nav-btn').forEach((btn) => {
            btn.classList.remove('active');
        });

        if (!selection.notes.length) {
            container.innerHTML = `<p class="text-slate-500">${t('此課題尚無學習筆記。', 'No learning notes in this topic yet.')}</p>`;
            return;
        }

        container.innerHTML = `
            <section class="notes-linear-panel bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <p class="text-sm text-slate-600">${t('依序閱讀以下學習筆記', 'Read the following notes in order')}</p>
                </div>
                <ol class="notes-linear-list divide-y divide-slate-100">
                    ${selection.notes.map((note, idx) => {
                        const title = lang === 'zh' ? note.title_zh : note.title_en;
                        const time = note.reading_time_minutes
                            ? `<span class="text-xs text-slate-400">${t('約', '~')}${note.reading_time_minutes}${t(' 分鐘', ' min')}</span>`
                            : '';
                        return `<li>
                            <a href="#" data-slug="${escapeHtml(note.slug)}" class="notes-linear-item flex items-center justify-between gap-4 px-4 py-4 hover:bg-indigo-50/50 transition-colors">
                                <div class="flex items-start gap-3 min-w-0">
                                    <span class="notes-linear-num flex-shrink-0">${idx + 1}</span>
                                    <span class="font-medium text-slate-800">${escapeHtml(title)}</span>
                                </div>
                                ${time}
                            </a>
                        </li>`;
                    }).join('')}
                </ol>
            </section>`;

        container.querySelectorAll('.notes-linear-item').forEach((a) => {
            a.onclick = (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/note/' + encodeURIComponent(a.dataset.slug));
            };
        });
    }

    function renderNav() {
        notesNavMode = false;
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

    function openModal(url) {
        const modal = document.getElementById('sim-modal');
        const iframe = document.getElementById('sim-modal-iframe');
        if (!modal || !iframe) return;
        const resolved = resolveAssetUrl(url);
        iframe.src = resolved;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (global.SimModal) SimModal.onOpen(resolved);
    }

    function closeModal() {
        const modal = document.getElementById('sim-modal');
        const iframe = document.getElementById('sim-modal-iframe');
        if (global.SimModal) SimModal.onClose();
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
        worksheets = data.worksheets || [];
        notesTree = buildNotesTree(learningNotes);
        if (!opts.skipNavRender) {
            if (opts.navMode === 'notes') {
                renderNotesNav(opts.activeSlug || null, opts.subjectId, opts.topicId);
                showNotesTopic(opts.subjectId, opts.topicId);
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
        const note = learningNotes.find((n) => n.slug === slug);
        if (!note) return { subjectId: null, topicId: null };
        if (!note.subject_id) return { subjectId: '_other', topicId: '_other' };
        if (!note.topic_id) return { subjectId: String(note.subject_id), topicId: '_loose' };
        return { subjectId: String(note.subject_id), topicId: String(note.topic_id) };
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
        await loadCatalog({ skipNavRender: true });
        setupNotesPageHeader();
        renderNotesNav(null, subjectId, topicId);

        const container = document.getElementById('card-container');
        const canCreate = global.AppInlineEdit && global.AppInlineEdit.canEditType('note');

        if (!learningNotes.length) {
            if (container) {
                container.innerHTML = `<p class="text-slate-500">${t('尚無已發佈的學習筆記。', 'No published learning notes yet.')}${canCreate ? ' ' + t('按「新增」建立第一則筆記。', 'Click "New" to create one.') : ''}</p>`;
            }
            return;
        }

        const sel = subjectId != null
            ? { subjectId, topicId }
            : getFirstNotesSelection();
        showNotesTopic(sel?.subjectId, sel?.topicId);
        renderNotesNav(null, sel?.subjectId, sel?.topicId);
    }

    async function prepareNotesSidebar(activeSlug) {
        if (!learningNotes.length) {
            await loadCatalog({ skipNavRender: true });
        }
        notesTree = buildNotesTree(learningNotes);
        const ctx = activeSlug ? getNoteContext(activeSlug) : getFirstNotesSelection() || {};
        renderNotesNav(activeSlug || null, ctx.subjectId, ctx.topicId);
        return ctx;
    }

    async function renderWorksheetsList() {
        await loadCatalog(true);
        const container = document.getElementById('card-container');
        const lang = getLang();
        document.getElementById('page-title').textContent = t('工作紙', 'Worksheets');
        if (!worksheets.length) {
            container.innerHTML = `<p class="text-slate-500">${t('尚無已發佈的工作紙。', 'No published worksheets yet.')}</p>`;
            return;
        }
        container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">${worksheets.map(w => {
            const title = lang === 'zh' ? w.title_zh : w.title_en;
            const desc = lang === 'zh' ? (w.description_zh || '') : (w.description_en || '');
            return `
            <a href="#" data-slug="${escapeHtml(w.slug)}" class="ws-card block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <h3 class="font-bold text-lg text-slate-800 mb-2">${escapeHtml(title)}</h3>
                ${desc ? `<p class="text-sm text-slate-600 line-clamp-2">${escapeHtml(desc)}</p>` : ''}
            </a>`;
        }).join('')}</div>`;
        container.querySelectorAll('.ws-card').forEach(a => {
            a.onclick = (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/worksheet/' + encodeURIComponent(a.dataset.slug));
            };
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

    function renderArticlesList() {
        const container = document.getElementById('card-container');
        const lang = getLang();
        document.getElementById('page-title').textContent = t('科學文章', 'Science Articles');
        if (!articles.length) {
            container.innerHTML = `<p class="text-slate-500">${t('尚無已發佈的文章。', 'No published articles yet.')}</p>`;
            return;
        }
        container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${articles.map(a => `
            <a href="#" data-slug="${escapeHtml(a.slug)}" class="art-card block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md">
                <h3 class="font-bold text-lg text-slate-800 mb-2">${escapeHtml(lang === 'zh' ? a.title_zh : a.title_en)}</h3>
                ${a.reading_time_minutes ? `<p class="text-xs text-slate-400">${t('約', '~')}${a.reading_time_minutes}${t(' 分鐘', ' min read')}</p>` : ''}
            </a>`).join('')}</div>`;
        container.querySelectorAll('.art-card').forEach(a => {
            a.onclick = (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/article/' + encodeURIComponent(a.dataset.slug));
            };
        });
    }

    global.AppCatalog = {
        loadCatalog,
        showCategory,
        showNotesTopic,
        openModal,
        closeModal,
        renderLearningNotesList,
        renderNotesNav,
        prepareNotesSidebar,
        getNoteContext,
        renderWorksheetsList,
        renderLearningToolsList,
        renderArticlesList,
        getLearningTools: () => learningTools,
        getArticles: () => articles,
        getLearningNotes: () => learningNotes,
        getWorksheets: () => worksheets,
    };
})(window);
