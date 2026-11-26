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

let navState = { title: '', lead: '', pages: [] };
let currentSlug = '';
let adminEditorMode = 'visual';

function contentBase() {
    return (global.__SITE_BASE__ || '') + '/science-edu';
}

function absoluteImages(html) {
    return String(html || '').replace(/src=(["'])images\//g, 'src=$1' + contentBase() + '/images/');
}

function relativeImages(html) {
    const base = contentBase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(html || '').replace(new RegExp('src=(["\'])' + base + '/images/', 'g'), 'src=$1images/');
}

function setAdminMode(mode) {
    const visual = document.getElementById('sci-edu-visual');
    const source = document.getElementById('sci-edu-html');
    if (!visual || !source) return;
    if (mode === 'html' && adminEditorMode !== 'html') source.value = relativeImages(visual.innerHTML).trim();
    if (mode === 'visual' && adminEditorMode === 'html') {
        visual.innerHTML = typeof global.DOMPurify === 'undefined'
            ? absoluteImages(source.value)
            : global.DOMPurify.sanitize(absoluteImages(source.value), { ADD_ATTR: ['target', 'rel', 'class', 'data-sci-slug'] });
    }
    adminEditorMode = mode;
    visual.hidden = mode !== 'visual';
    source.hidden = mode !== 'html';
    document.querySelectorAll('[data-admin-mode]').forEach((btn) => {
        const on = btn.getAttribute('data-admin-mode') === mode;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function adminHtml() {
    const visual = document.getElementById('sci-edu-visual');
    const source = document.getElementById('sci-edu-html');
    if (adminEditorMode === 'html') return source ? source.value : '';
    return relativeImages(visual ? visual.innerHTML : '').trim();
}

function fillAdminEditor(html) {
    const source = document.getElementById('sci-edu-html');
    if (source) source.value = html || '';
    adminEditorMode = 'html';
    setAdminMode('visual');
}

function sortedPages() {
    return navState.pages.slice().sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
}

function pageBySlug(slug) {
    return navState.pages.find((p) => p.slug === slug) || null;
}

async function loadNav() {
    navState = await global.ScienceApi.apiFetch('/admin/science-edu');
    if (!navState.pages) navState.pages = [];
}

async function saveNav() {
    navState = await global.ScienceApi.apiFetch('/admin/science-edu', {
        method: 'PUT',
        body: navState,
    });
}

function status(message, isError) {
    const el = document.getElementById('sci-edu-admin-status');
    if (!el) return;
    el.textContent = message || '';
    el.className = isError ? 'text-sm text-red-600' : 'text-sm text-emerald-700';
}

function renderList() {
    const pages = sortedPages();
    return pages.map((page) => {
        const active = page.slug === currentSlug ? ' bg-teal-50 border-teal-300' : ' bg-white border-slate-200';
        const child = page.parent ? ' pl-6' : '';
        return `<button type="button" class="sci-edu-admin-pick w-full text-left px-3 py-2 rounded-lg border text-sm${active}${child}" data-slug="${escapeHtml(page.slug)}">
            <span class="font-medium">${escapeHtml(page.title)}</span>
            <span class="block text-xs text-slate-500">${escapeHtml(page.slug)}</span>
        </button>`;
    }).join('');
}

function parentOptions(page) {
    const options = [`<option value="">${escapeHtml(t('（頂層）', '(Top level)'))}</option>`];
    sortedPages().forEach((item) => {
        if (page && item.slug === page.slug) return;
        const selected = page && page.parent === item.slug ? ' selected' : '';
        options.push(`<option value="${escapeHtml(item.slug)}"${selected}>${escapeHtml(item.title)}</option>`);
    });
    return options.join('');
}

function renderEditor() {
    const page = pageBySlug(currentSlug);
    if (!page) {
        return `<p class="text-sm text-slate-500">${escapeHtml(t('請選擇左側頁面，或新增一頁。', 'Choose a page, or add one.'))}</p>`;
    }
    return `
        <div class="space-y-3">
            <label class="block text-sm">
                <span class="text-slate-600">${escapeHtml(t('標題', 'Title'))}</span>
                <input id="sci-edu-title" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${escapeHtml(page.title)}">
            </label>
            <label class="block text-sm">
                <span class="text-slate-600">${escapeHtml(t('首頁摘要', 'Home summary'))}</span>
                <input id="sci-edu-summary" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${escapeHtml(page.summary || '')}">
            </label>
            <div class="grid sm:grid-cols-2 gap-3">
                <label class="block text-sm">
                    <span class="text-slate-600">${escapeHtml(t('父頁', 'Parent'))}</span>
                    <select id="sci-edu-parent" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${parentOptions(page)}</select>
                </label>
                <label class="flex items-end gap-2 text-sm pb-2">
                    <input id="sci-edu-home" type="checkbox"${page.showOnHome ? ' checked' : ''}>
                    <span>${escapeHtml(t('在訪客首頁顯示為卡片', 'Show as a card on the guest home'))}</span>
                </label>
            </div>
            <div class="flex items-center justify-between gap-2">
                <span class="text-sm text-slate-600">${escapeHtml(t('正文', 'Body'))}</span>
                <div class="sci-edu-mode" role="group">
                    <button type="button" data-admin-mode="visual" class="is-on" aria-pressed="true">${escapeHtml(t('視覺', 'Visual'))}</button>
                    <button type="button" data-admin-mode="html" aria-pressed="false">HTML</button>
                </div>
            </div>
            <div class="sci-edu-rte-bar">
                <button type="button" data-admin-cmd="formatBlock" data-value="<h1>">H1</button>
                <button type="button" data-admin-cmd="formatBlock" data-value="<h2>">H2</button>
                <button type="button" data-admin-cmd="formatBlock" data-value="<p>">${escapeHtml(t('內文', 'Text'))}</button>
                <button type="button" data-admin-cmd="bold" title="${escapeHtml(t('粗體', 'Bold'))}"><strong>B</strong></button>
                <button type="button" data-admin-cmd="italic" title="${escapeHtml(t('斜體', 'Italic'))}"><em>I</em></button>
                <button type="button" data-admin-cmd="underline" title="${escapeHtml(t('底線', 'Underline'))}"><span style="text-decoration:underline">U</span></button>
                <button type="button" data-admin-cmd="justifyLeft">${escapeHtml(t('置左', 'Left'))}</button>
                <button type="button" data-admin-cmd="justifyCenter">${escapeHtml(t('置中', 'Center'))}</button>
                <button type="button" data-admin-cmd="justifyRight">${escapeHtml(t('置右', 'Right'))}</button>
                <button type="button" data-admin-cmd="insertUnorderedList">${escapeHtml(t('清單', 'List'))}</button>
                <button type="button" data-admin-cmd="insertOrderedList">1.</button>
                <button type="button" data-admin-cmd="createLink">${escapeHtml(t('連結', 'Link'))}</button>
            </div>
            <div id="sci-edu-visual" class="sci-edu-visual sci-edu-article" contenteditable="true"></div>
            <textarea id="sci-edu-html" class="sci-edu-source w-full" rows="16" hidden></textarea>
            <div class="flex flex-wrap gap-2">
                <button type="button" id="sci-edu-save" class="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium">${escapeHtml(t('儲存此頁', 'Save page'))}</button>
                <button type="button" id="sci-edu-preview" class="px-4 py-2 rounded-lg border border-slate-300 text-sm">${escapeHtml(t('預覽', 'Preview'))}</button>
                <label class="px-4 py-2 rounded-lg border border-slate-300 text-sm cursor-pointer">
                    ${escapeHtml(t('上傳圖片', 'Upload image'))}
                    <input id="sci-edu-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden">
                </label>
                <button type="button" id="sci-edu-delete" class="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm">${escapeHtml(t('刪除', 'Delete'))}</button>
            </div>
            <div id="sci-edu-preview-box" class="sci-edu-article hidden"></div>
        </div>`;
}

function paint() {
    const box = document.getElementById('card-container');
    const title = document.getElementById('page-title');
    if (title) title.textContent = t('科學教育網頁', 'Science pages');
    if (!box) return;
    box.innerHTML = `
        <p class="text-sm text-slate-500">${escapeHtml(t('內容寫入 science-edu/ 靜態檔，不會進入資料庫。', 'Content is saved as static files under science-edu/, not in the database.'))}</p>
        <p id="sci-edu-admin-status" class="text-sm text-emerald-700" role="status"></p>
        <label class="block text-sm max-w-3xl">
            <span class="text-slate-600">${escapeHtml(t('首頁導言', 'Home lead'))}</span>
            <input id="sci-edu-lead" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${escapeHtml(navState.lead || '')}">
        </label>
        <div class="flex flex-wrap gap-2">
            <button type="button" id="sci-edu-save-lead" class="px-4 py-2 rounded-lg border border-slate-300 text-sm">${escapeHtml(t('儲存導言', 'Save lead'))}</button>
            <button type="button" id="sci-edu-up" class="px-3 py-2 rounded-lg border border-slate-300 text-sm">${escapeHtml(t('上移', 'Up'))}</button>
            <button type="button" id="sci-edu-down" class="px-3 py-2 rounded-lg border border-slate-300 text-sm">${escapeHtml(t('下移', 'Down'))}</button>
        </div>
        <div class="grid lg:grid-cols-[16rem_1fr] gap-4 items-start">
            <div class="space-y-2">
                <div id="sci-edu-list" class="space-y-1">${renderList()}</div>
                <form id="sci-edu-new" class="space-y-2 border border-dashed border-slate-300 rounded-lg p-3">
                    <p class="text-xs font-medium text-slate-500">${escapeHtml(t('新增頁面', 'New page'))}</p>
                    <input name="title" required placeholder="${escapeHtml(t('標題', 'Title'))}" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="slug" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <button type="submit" class="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">${escapeHtml(t('加入', 'Add'))}</button>
                </form>
            </div>
            <div id="sci-edu-editor">${renderEditor()}</div>
        </div>`;
    wire();
}

async function openPage(slug) {
    currentSlug = slug;
    paint();
    const area = document.getElementById('sci-edu-html');
    if (!area) return;
    try {
        const data = await global.ScienceApi.apiFetch('/admin/science-edu/pages/' + encodeURIComponent(slug));
        fillAdminEditor(data.html || '');
    } catch (err) {
        status(err.message || t('讀取失敗', 'Load failed'), true);
    }
}

function readEditorIntoState() {
    const page = pageBySlug(currentSlug);
    if (!page) return;
    const title = document.getElementById('sci-edu-title');
    const summary = document.getElementById('sci-edu-summary');
    const parent = document.getElementById('sci-edu-parent');
    const home = document.getElementById('sci-edu-home');
    if (title) page.title = title.value.trim();
    if (summary) page.summary = summary.value.trim();
    if (parent) page.parent = parent.value;
    if (home) page.showOnHome = home.checked;
}

async function savePage() {
    if (!currentSlug || !document.getElementById('sci-edu-visual')) return;
    const html = adminHtml();
    readEditorIntoState();
    const page = pageBySlug(currentSlug);
    status(t('儲存中…', 'Saving…'), false);
    try {
        const data = await global.ScienceApi.apiFetch('/admin/science-edu/pages/' + encodeURIComponent(currentSlug), {
            method: 'PUT',
            body: {
                html,
                title: page.title,
                summary: page.summary,
                parent: page.parent,
                showOnHome: page.showOnHome,
                sort: page.sort,
            },
        });
        if (data.nav) navState = data.nav;
        status(t('已寫入靜態檔。', 'Saved to static files.'), false);
        paint();
        fillAdminEditor(html);
    } catch (err) {
        status(err.message || t('儲存失敗', 'Save failed'), true);
    }
}

function move(delta) {
    const pages = sortedPages();
    const index = pages.findIndex((p) => p.slug === currentSlug);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= pages.length) return;
    const a = pages[index];
    const b = pages[next];
    const sort = a.sort;
    a.sort = b.sort;
    b.sort = sort;
    if (a.sort === b.sort) {
        a.sort = index + delta;
        b.sort = index;
    }
    navState.pages = pages;
    saveNav().then(async () => {
        if (currentSlug) await openPage(currentSlug);
        else paint();
        status(t('次序已更新。', 'Order updated.'), false);
    }).catch((err) => status(err.message || t('儲存失敗', 'Save failed'), true));
}

function insertAtCursor(text) {
    if (adminEditorMode === 'html') {
        const area = document.getElementById('sci-edu-html');
        if (!area) return;
        const start = area.selectionStart || 0;
        const end = area.selectionEnd || 0;
        area.value = area.value.slice(0, start) + text + area.value.slice(end);
        area.focus();
        return;
    }
    const visual = document.getElementById('sci-edu-visual');
    if (!visual) return;
    visual.focus();
    document.execCommand('insertHTML', false, text.replace(/src=(["'])images\//g, 'src=$1' + contentBase() + '/images/'));
}

function wire() {
    document.getElementById('sci-edu-save-lead')?.addEventListener('click', async () => {
        const lead = document.getElementById('sci-edu-lead');
        navState.lead = lead ? lead.value.trim() : navState.lead;
        try {
            await saveNav();
            status(t('導言已儲存。', 'Lead saved.'), false);
        } catch (err) {
            status(err.message || t('儲存失敗', 'Save failed'), true);
        }
    });
    document.getElementById('sci-edu-up')?.addEventListener('click', () => move(-1));
    document.getElementById('sci-edu-down')?.addEventListener('click', () => move(1));
    document.querySelectorAll('.sci-edu-admin-pick').forEach((btn) => {
        btn.addEventListener('click', () => openPage(btn.getAttribute('data-slug') || ''));
    });
    document.getElementById('sci-edu-new')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const body = {
            title: form.title.value.trim(),
            slug: form.slug.value.trim().toLowerCase(),
        };
        try {
            navState = await global.ScienceApi.apiFetch('/admin/science-edu/pages', { method: 'POST', body });
            status(t('已新增頁面。', 'Page added.'), false);
            await openPage(body.slug);
        } catch (err) {
            status(err.message || t('新增失敗', 'Could not add'), true);
        }
    });
    document.getElementById('sci-edu-save')?.addEventListener('click', savePage);
    document.querySelectorAll('[data-admin-mode]').forEach((btn) => {
        btn.addEventListener('click', () => setAdminMode(btn.getAttribute('data-admin-mode')));
    });
    document.querySelectorAll('[data-admin-cmd]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const visual = document.getElementById('sci-edu-visual');
            if (!visual) return;
            setAdminMode('visual');
            visual.focus();
            const cmd = btn.getAttribute('data-admin-cmd');
            if (cmd === 'createLink') {
                const url = window.prompt(t('連結網址', 'Link URL'), 'https://');
                if (url) document.execCommand('createLink', false, url);
                return;
            }
            const value = btn.getAttribute('data-value');
            document.execCommand(cmd, false, value || undefined);
        });
    });
    document.getElementById('sci-edu-preview')?.addEventListener('click', () => {
        const box = document.getElementById('sci-edu-preview-box');
        if (!box) return;
        box.classList.remove('hidden');
        const html = absoluteImages(adminHtml());
        box.innerHTML = typeof global.DOMPurify === 'undefined'
            ? html
            : global.DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel', 'class'] });
    });
    document.getElementById('sci-edu-file')?.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file || !currentSlug) return;
        const body = new FormData();
        body.append('slug', currentSlug);
        body.append('file', file);
        try {
            const stored = await global.ScienceApi.apiFetch('/admin/science-edu/images', { method: 'POST', body });
            insertAtCursor(`\n<figure class="sci-edu-figure"><img src="${stored.path}" alt=""></figure>\n`);
            status(t('圖片已插入，記得儲存此頁。', 'Image inserted. Save the page.'), false);
        } catch (err) {
            status(err.message || t('上傳失敗', 'Upload failed'), true);
        }
    });
    document.getElementById('sci-edu-delete')?.addEventListener('click', async () => {
        if (!currentSlug) return;
        if (!window.confirm(t('刪除此頁及以它命名的圖片？', 'Delete this page and images named for it?'))) return;
        try {
            await global.ScienceApi.apiFetch('/admin/science-edu/pages/' + encodeURIComponent(currentSlug), { method: 'DELETE' });
            currentSlug = '';
            await loadNav();
            status(t('已刪除。', 'Deleted.'), false);
            paint();
        } catch (err) {
            status(err.message || t('刪除失敗', 'Delete failed'), true);
        }
    });
}

async function render() {
    if (!document.getElementById('sci-edu-css')) {
        const link = document.createElement('link');
        link.id = 'sci-edu-css';
        link.rel = 'stylesheet';
        link.href = (global.__SITE_BASE__ || '') + '/science-edu/science-edu.css';
        document.head.appendChild(link);
    }
    const title = document.getElementById('page-title');
    if (title) title.textContent = t('科學教育網頁', 'Science pages');
    const box = document.getElementById('card-container');
    if (box) box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        await loadNav();
        if (!currentSlug && navState.pages[0]) currentSlug = navState.pages[0].slug;
        if (currentSlug) {
            await openPage(currentSlug);
        } else {
            paint();
        }
    } catch (err) {
        if (box) box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
    }
}

global.AppScienceEduAdmin = { render };

export {};
