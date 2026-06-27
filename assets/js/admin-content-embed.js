(function (global) {
    'use strict';

    let activeTextarea = null;
    let pickerData = null;
    let enabledTabs = ['video', 'simulation', 'article', 'question'];

    function insertAtCursor(textarea, text) {
        if (!textarea) return;
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? start;
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        textarea.value = before + text + after;
        const pos = start + text.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
        textarea.focus();
    }

    function shortcode(type, attrs) {
        const parts = Object.entries(attrs)
            .filter(([, v]) => v != null && String(v).trim() !== '')
            .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`);
        return `::${type} ${parts.join(' ')}\n`;
    }

    async function loadPickerData() {
        if (pickerData) return pickerData;
        const fetchJson = async (path) => {
            try {
                return await AdminApi.apiFetch(path);
            } catch {
                return [];
            }
        };
        const [catalog, videos, banks] = await Promise.all([
            AdminApi.apiFetch('/catalog'),
            fetchJson('/learning-videos').then((rows) => rows.length ? rows : fetchJson('/admin/learning-videos')),
            fetchJson('/admin/question-banks'),
        ]);
        const simulations = [];
        const articles = [];
        const simSubjects = catalog.simulations?.subjects || {};
        Object.values(simSubjects).forEach((sub) => {
            Object.values(sub.topics || {}).forEach((topic) => {
                (topic.items || []).forEach((item) => {
                    simulations.push({
                        slug: item.slug,
                        title_zh: item.title_zh || item.title,
                        title_en: item.title_en || item.title,
                    });
                });
            });
        });
        (catalog.articles || []).forEach((a) => {
            articles.push({ slug: a.slug, title_zh: a.title_zh, title_en: a.title_en });
        });
        pickerData = {
            videos: videos || [],
            simulations,
            articles,
            banks: banks || [],
        };
        return pickerData;
    }

    function renderList(items, renderRow) {
        if (!items.length) {
            return '<p class="text-sm text-slate-500 py-4">尚無可選項目。</p>';
        }
        return `<div class="max-h-72 overflow-y-auto divide-y divide-slate-100">${items.map((item, i) => renderRow(item, i)).join('')}</div>`;
    }

    async function openBankQuestions(bankId, bankSlug, bankTitle) {
        const detail = await AdminApi.apiFetch('/admin/question-banks/' + bankId);
        const questions = detail.questions || [];
        const list = document.getElementById('content-embed-list');
        const title = document.getElementById('content-embed-panel-title');
        if (title) title.textContent = bankTitle + ' — 選擇題目（可設分數）';
        if (!list) return;
        list.innerHTML = renderList(questions, (q, i) => {
            const label = (q.question_code ? q.question_code + ' · ' : '') + (q.stem_zh || q.stem_en || '').slice(0, 60);
            const defScore = q.default_score != null ? q.default_score : '';
            return `<div class="px-3 py-2.5 hover:bg-indigo-50 text-sm flex flex-wrap items-center gap-2 border-b border-slate-100">
                <button type="button" class="content-embed-pick flex-1 text-left min-w-0" data-kind="question" data-bank="${escapeAttr(bankSlug)}" data-id="${q.id}" data-default-score="${escapeAttr(String(defScore))}">
                    <span class="text-slate-400 mr-2">${i + 1}.</span>${escapeHtml(label)}
                </button>
                <label class="text-xs text-slate-500 flex items-center gap-1">分數<input type="number" min="0" step="0.5" class="content-embed-q-score w-16 border rounded px-1 py-0.5 text-xs" value="${escapeHtml(String(defScore))}"></label>
            </div>`;
        });
        bindPickButtons(list);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    function escapeAttr(s) {
        return escapeHtml(s).replace(/"/g, '&quot;');
    }

    function bindPickButtons(container) {
        container.querySelectorAll('.content-embed-pick').forEach((btn) => {
            btn.onclick = async () => {
                const kind = btn.dataset.kind;
                let code = '';
                if (kind === 'video') code = shortcode('video', { slug: btn.dataset.slug });
                else if (kind === 'simulation') code = shortcode('simulation', { slug: btn.dataset.slug });
                else if (kind === 'article') code = shortcode('article', { slug: btn.dataset.slug });
                else if (kind === 'question') {
                    const row = btn.closest('div');
                    const scoreInput = row?.querySelector('.content-embed-q-score');
                    const score = scoreInput && scoreInput.value ? scoreInput.value : (btn.dataset.defaultScore || '');
                    const attrs = { bank: btn.dataset.bank, id: btn.dataset.id };
                    if (score) attrs.score = score;
                    code = shortcode('question', attrs);
                } else if (kind === 'bank') {
                    await openBankQuestions(btn.dataset.id, btn.dataset.slug, btn.textContent.trim().replace(/\s→$/, ''));
                    return;
                }
                if (activeTextarea && code) insertAtCursor(activeTextarea, code);
                closeModal();
            };
        });
    }

    function updateTabVisibility() {
        document.querySelectorAll('.content-embed-tab').forEach((btn) => {
            const show = enabledTabs.includes(btn.dataset.tab);
            btn.classList.toggle('hidden', !show);
        });
    }

    async function showTab(tab) {
        if (!enabledTabs.includes(tab)) {
            tab = enabledTabs[0] || 'video';
        }
        const data = await loadPickerData();
        const list = document.getElementById('content-embed-list');
        const title = document.getElementById('content-embed-panel-title');
        if (!list) return;

        document.querySelectorAll('.content-embed-tab').forEach((b) => {
            b.classList.toggle('bg-indigo-600', b.dataset.tab === tab);
            b.classList.toggle('text-white', b.dataset.tab === tab);
            b.classList.toggle('text-slate-600', b.dataset.tab !== tab);
        });

        if (tab === 'video') {
            if (title) title.textContent = '選擇影片';
            list.innerHTML = renderList(data.videos, (v) =>
                `<button type="button" class="content-embed-pick w-full text-left px-3 py-2.5 hover:bg-indigo-50 text-sm" data-kind="video" data-slug="${escapeAttr(v.slug)}">${escapeHtml(v.title_zh || v.title_en)}</button>`
            );
        } else if (tab === 'simulation') {
            if (title) title.textContent = '選擇模擬實驗';
            list.innerHTML = renderList(data.simulations, (s) =>
                `<button type="button" class="content-embed-pick w-full text-left px-3 py-2.5 hover:bg-indigo-50 text-sm" data-kind="simulation" data-slug="${escapeAttr(s.slug)}">${escapeHtml(s.title_zh || s.title_en || s.slug)}</button>`
            );
        } else if (tab === 'article') {
            if (title) title.textContent = '選擇文章';
            list.innerHTML = renderList(data.articles, (a) =>
                `<button type="button" class="content-embed-pick w-full text-left px-3 py-2.5 hover:bg-indigo-50 text-sm" data-kind="article" data-slug="${escapeAttr(a.slug)}">${escapeHtml(a.title_zh || a.title_en)}</button>`
            );
        } else if (tab === 'question') {
            if (title) title.textContent = '選擇試題庫';
            list.innerHTML = renderList(data.banks, (b) =>
                `<button type="button" class="content-embed-pick w-full text-left px-3 py-2.5 hover:bg-indigo-50 text-sm" data-kind="bank" data-id="${b.id}" data-slug="${escapeAttr(b.slug)}">${escapeHtml(b.title_zh || b.title_en)} →</button>`
            );
        }
        bindPickButtons(list);
    }

    function closeModal() {
        document.getElementById('content-embed-modal')?.classList.add('hidden');
    }

    function ensureModal() {
        if (document.getElementById('content-embed-modal')) {
            updateTabVisibility();
            return;
        }
        const wrap = document.createElement('div');
        wrap.id = 'content-embed-modal';
        wrap.className = 'hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50';
        wrap.innerHTML = `
            <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 border-b">
                    <h3 class="font-semibold text-slate-800">插入嵌入內容</h3>
                    <button type="button" id="content-embed-close" class="text-slate-500 hover:text-slate-800 text-xl leading-none">&times;</button>
                </div>
                <div class="flex gap-1 p-2 border-b bg-slate-50 flex-wrap">
                    <button type="button" class="content-embed-tab px-3 py-1.5 rounded-lg text-sm" data-tab="video">影片</button>
                    <button type="button" class="content-embed-tab px-3 py-1.5 rounded-lg text-sm" data-tab="simulation">模擬</button>
                    <button type="button" class="content-embed-tab px-3 py-1.5 rounded-lg text-sm" data-tab="article">文章</button>
                    <button type="button" class="content-embed-tab px-3 py-1.5 rounded-lg text-sm" data-tab="question">題庫</button>
                </div>
                <p id="content-embed-panel-title" class="px-4 pt-3 text-xs text-slate-500"></p>
                <div id="content-embed-list" class="px-2 pb-3"></div>
            </div>`;
        document.body.appendChild(wrap);
        wrap.querySelector('#content-embed-close').onclick = closeModal;
        wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
        wrap.querySelectorAll('.content-embed-tab').forEach((btn) => {
            btn.onclick = () => showTab(btn.dataset.tab);
        });
        updateTabVisibility();
    }

    function resolveEmbedKind(btn) {
        return btn.dataset.contentEmbed || btn.dataset.wsEmbed || 'video';
    }

    function bindEmbedButtons() {
        document.querySelectorAll('[data-content-embed], [data-ws-embed]').forEach((btn) => {
            if (btn.dataset.embedBound) return;
            btn.dataset.embedBound = '1';
            btn.onclick = async () => {
                const kind = resolveEmbedKind(btn);
                if (!enabledTabs.includes(kind)) return;
                const focused = document.activeElement;
                if (focused && focused.tagName === 'TEXTAREA') activeTextarea = focused;
                else activeTextarea = document.getElementById('body-zh') || document.getElementById('body-en');
                document.getElementById('content-embed-modal')?.classList.remove('hidden');
                await showTab(kind);
            };
        });
    }

    function init(textareaIds, opts) {
        opts = opts || {};
        if (Array.isArray(opts.tabs) && opts.tabs.length) {
            enabledTabs = opts.tabs.slice();
        } else {
            enabledTabs = ['video', 'simulation', 'article', 'question'];
        }
        ensureModal();
        (textareaIds || []).forEach((id) => {
            const ta = document.getElementById(id);
            if (ta) {
                ta.addEventListener('focus', () => { activeTextarea = ta; });
            }
        });
        bindEmbedButtons();
    }

    global.AdminContentEmbed = { init, insertAtCursor, shortcode };
    global.AdminWorksheetEmbed = global.AdminContentEmbed;
})(window);
