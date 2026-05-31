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

    function renderNav() {
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
        document.querySelectorAll('.nav-group-btn').forEach(btn => {
            btn.onclick = () => {
                const submenu = btn.nextElementSibling;
                const icon = btn.querySelector('.rotate-icon');
                submenu.classList.toggle('open');
                icon.classList.toggle('active');
                showCategory(btn.dataset.cat, null);
            };
        });
        document.querySelectorAll('.topic-nav-btn').forEach(btn => {
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

    async function loadCatalog(skipNavRender = false) {
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
        if (!skipNavRender) {
            renderNav();
            const firstKey = Object.keys(subjectData)[0];
            if (firstKey) {
                showCategory(firstKey.toLowerCase().replace(/\s+/g, '-'), null);
            }
        }
        return data;
    }

    async function renderLearningNotesList() {
        await loadCatalog(true);
        const container = document.getElementById('card-container');
        const lang = getLang();
        document.getElementById('page-title').textContent = t('學習筆記', 'Learning Notes');
        if (!learningNotes.length) {
            container.innerHTML = `<p class="text-slate-500">${t('尚無已發佈的學習筆記。', 'No published learning notes yet.')}</p>`;
            return;
        }
        container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${learningNotes.map(n => `
            <a href="#" data-slug="${escapeHtml(n.slug)}" class="note-card block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <h3 class="font-bold text-lg text-slate-800 mb-2">${escapeHtml(lang === 'zh' ? n.title_zh : n.title_en)}</h3>
                ${n.reading_time_minutes ? `<p class="text-xs text-slate-400">${t('約', '~')}${n.reading_time_minutes}${t(' 分鐘', ' min read')}</p>` : ''}
            </a>`).join('')}</div>`;
        container.querySelectorAll('.note-card').forEach(a => {
            a.onclick = (e) => {
                e.preventDefault();
                global.AppRouter.navigate('/note/' + encodeURIComponent(a.dataset.slug));
            };
        });
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
        openModal,
        closeModal,
        renderLearningNotesList,
        renderWorksheetsList,
        renderLearningToolsList,
        renderArticlesList,
        getLearningTools: () => learningTools,
        getArticles: () => articles,
        getLearningNotes: () => learningNotes,
        getWorksheets: () => worksheets,
    };
})(window);
