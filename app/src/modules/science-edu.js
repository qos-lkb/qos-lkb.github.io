'use strict';
const global = window;

function t(zh, en) {
    return global.AppRouter && global.AppRouter.t ? global.AppRouter.t(zh, en) : zh;
}

function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    }[m]));
}

function siteBase() {
    if (global.ScienceApi && typeof global.ScienceApi.SITE_BASE === 'string') {
        return global.ScienceApi.SITE_BASE;
    }
    return typeof global.__SITE_BASE__ === 'string' ? global.__SITE_BASE__ : '';
}

function contentBase() {
    return siteBase() + '/science-edu';
}

function ensureCss() {
    if (document.getElementById('sci-edu-css')) return;
    const link = document.createElement('link');
    link.id = 'sci-edu-css';
    link.rel = 'stylesheet';
    link.href = contentBase() + '/science-edu.css';
    document.head.appendChild(link);
}

async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) throw new Error(t('讀取科學教育內容失敗', 'Could not load science pages'));
    return res.text();
}

async function loadNav() {
    const raw = await fetchText(contentBase() + '/nav.json');
    const data = JSON.parse(raw);
    const pages = Array.isArray(data.pages) ? data.pages.slice() : [];
    pages.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    return {
        title: String(data.title || '科學教育'),
        lead: String(data.lead || ''),
        pages,
    };
}

function sanitize(html) {
    const rewritten = String(html || '').replace(/src=(["'])images\//g, 'src=$1' + contentBase() + '/images/');
    if (typeof global.DOMPurify === 'undefined') return rewritten;
    return global.DOMPurify.sanitize(rewritten, {
        ADD_ATTR: ['target', 'rel', 'class', 'data-sci-slug'],
    });
}

function pageBySlug(nav, slug) {
    return nav.pages.find((p) => p.slug === slug) || null;
}

function pageHref(slug) {
    if (global.AppRouter && typeof global.AppRouter.spaHref === 'function') {
        return global.AppRouter.spaHref('/science/' + slug);
    }
    return '#/science/' + slug;
}

function navigate(slug) {
    const path = '/science/' + encodeURIComponent(slug);
    if (global.AppRouter && typeof global.AppRouter.navigate === 'function') {
        global.AppRouter.navigate(path);
        return;
    }
    location.hash = '#' + path;
}

function bindPageLinks(root) {
    root.querySelectorAll('[data-sci-slug]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const slug = el.getAttribute('data-sci-slug');
            if (slug) navigate(slug);
        });
    });
}

function canEditScience() {
    const api = global.ScienceApi;
    if (!api || typeof api.getUser !== 'function' || !api.getUser()) return false;
    if (typeof api.hasPermission !== 'function') return false;
    return api.hasPermission('article.manage_any') || api.hasPermission('user.manage');
}

function editButtonHtml() {
    if (!canEditScience()) return '';
    return `<div class="sci-edu-toolbar"><button type="button" class="sci-edu-edit" data-sci-admin="1">${escapeHtml(t('編輯學科網頁', 'Edit subject pages'))}</button></div>`;
}

function absoluteImages(html) {
    return String(html || '').replace(/src=(["'])images\//g, 'src=$1' + contentBase() + '/images/');
}

function relativeImages(html) {
    const base = contentBase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(html || '').replace(new RegExp('src=(["\'])' + base + '/images/', 'g'), 'src=$1images/');
}

let editorSlug = '';
let editorMode = 'visual';
let editorNav = null;

function editorRoot() {
    return document.getElementById('sci-edu-modal');
}

function editorStatus(message, isError) {
    const el = document.getElementById('sci-edu-modal-status');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'sci-edu-modal-status' + (isError ? ' is-error' : '');
}

function syncEditorTo(mode) {
    const visual = document.getElementById('sci-edu-visual');
    const source = document.getElementById('sci-edu-source');
    if (!visual || !source) return;
    if (mode === 'html' && editorMode !== 'html') {
        source.value = relativeImages(visual.innerHTML).trim();
    } else if (mode === 'visual' && editorMode === 'html') {
        visual.innerHTML = sanitize(absoluteImages(source.value));
    }
    editorMode = mode;
    visual.hidden = mode !== 'visual';
    source.hidden = mode !== 'html';
    editorRoot()?.querySelectorAll('[data-editor-mode]').forEach((btn) => {
        const on = btn.getAttribute('data-editor-mode') === mode;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function editorHtml() {
    const visual = document.getElementById('sci-edu-visual');
    const source = document.getElementById('sci-edu-source');
    if (editorMode === 'html') return source ? source.value : '';
    return relativeImages(visual ? visual.innerHTML : '').trim();
}

function fillEditor(html) {
    const visual = document.getElementById('sci-edu-visual');
    const source = document.getElementById('sci-edu-source');
    const stored = String(html || '');
    if (source) source.value = stored;
    if (visual) visual.innerHTML = sanitize(absoluteImages(stored));
    editorMode = 'html';
    syncEditorTo('visual');
}

function execEditor(command, value) {
    const visual = document.getElementById('sci-edu-visual');
    if (!visual) return;
    visual.focus();
    document.execCommand(command, false, value);
}

function ensureModal() {
    if (editorRoot()) return;
    const wrap = document.createElement('div');
    wrap.id = 'sci-edu-modal';
    wrap.className = 'sci-edu-modal';
    wrap.hidden = true;
    wrap.innerHTML = `
        <div class="sci-edu-modal-backdrop" data-sci-close="1"></div>
        <div class="sci-edu-modal-panel" role="dialog" aria-modal="true" aria-labelledby="sci-edu-modal-title">
            <header class="sci-edu-modal-head">
                <h2 id="sci-edu-modal-title">${escapeHtml(t('編輯學科網頁', 'Edit subject pages'))}</h2>
                <button type="button" class="sci-edu-modal-close" data-sci-close="1" aria-label="${escapeHtml(t('關閉', 'Close'))}">×</button>
            </header>
            <div class="sci-edu-modal-tools">
                <label class="sci-edu-modal-page">
                    <span>${escapeHtml(t('頁面', 'Page'))}</span>
                    <select id="sci-edu-modal-page"></select>
                </label>
                <div class="sci-edu-mode" role="group" aria-label="${escapeHtml(t('編輯方式', 'Editor mode'))}">
                    <button type="button" data-editor-mode="visual" class="is-on" aria-pressed="true">${escapeHtml(t('視覺', 'Visual'))}</button>
                    <button type="button" data-editor-mode="html" aria-pressed="false">HTML</button>
                </div>
            </div>
            <div class="sci-edu-rte-bar" data-rte-bar="1">
                <button type="button" data-cmd="formatBlock" data-value="<h1>">H1</button>
                <button type="button" data-cmd="formatBlock" data-value="<h2>">H2</button>
                <button type="button" data-cmd="formatBlock" data-value="<p>">${escapeHtml(t('內文', 'Text'))}</button>
                <button type="button" data-cmd="bold"><strong>B</strong></button>
                <button type="button" data-cmd="italic"><em>I</em></button>
                <button type="button" data-cmd="insertUnorderedList">${escapeHtml(t('清單', 'List'))}</button>
                <button type="button" data-cmd="insertOrderedList">1.</button>
                <button type="button" data-cmd="createLink">${escapeHtml(t('連結', 'Link'))}</button>
                <label class="sci-edu-upload">${escapeHtml(t('圖片', 'Image'))}<input id="sci-edu-modal-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
            </div>
            <div id="sci-edu-visual" class="sci-edu-visual sci-edu-article" contenteditable="true" role="textbox" aria-multiline="true"></div>
            <textarea id="sci-edu-source" class="sci-edu-source" hidden spellcheck="false" aria-label="HTML"></textarea>
            <footer class="sci-edu-modal-foot">
                <p id="sci-edu-modal-status" class="sci-edu-modal-status" role="status"></p>
                <button type="button" id="sci-edu-modal-save" class="sci-edu-edit">${escapeHtml(t('儲存', 'Save'))}</button>
            </footer>
        </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => {
        if (e.target.closest('[data-sci-close]')) closeEditor();
    });
    wrap.querySelectorAll('[data-editor-mode]').forEach((btn) => {
        btn.addEventListener('click', () => syncEditorTo(btn.getAttribute('data-editor-mode')));
    });
    wrap.querySelectorAll('[data-cmd]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const cmd = btn.getAttribute('data-cmd');
            if (cmd === 'createLink') {
                const url = window.prompt(t('連結網址', 'Link URL'), 'https://');
                if (url) execEditor('createLink', url);
                return;
            }
            const value = btn.getAttribute('data-value');
            execEditor(cmd, value || undefined);
        });
    });
    document.getElementById('sci-edu-modal-page')?.addEventListener('change', (e) => {
        loadEditorPage(e.target.value);
    });
    document.getElementById('sci-edu-modal-save')?.addEventListener('click', saveEditor);
    document.getElementById('sci-edu-modal-file')?.addEventListener('change', uploadEditorImage);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editorRoot() && !editorRoot().hidden) closeEditor();
    });
}

function fillPageSelect() {
    const select = document.getElementById('sci-edu-modal-page');
    if (!select || !editorNav) return;
    select.innerHTML = editorNav.pages.map((page) => (
        `<option value="${escapeHtml(page.slug)}"${page.slug === editorSlug ? ' selected' : ''}>${escapeHtml(page.title)}</option>`
    )).join('');
}

async function loadEditorPage(slug) {
    editorSlug = slug;
    editorStatus(t('載入中…', 'Loading…'), false);
    try {
        const data = await global.ScienceApi.apiFetch('/admin/science-edu/pages/' + encodeURIComponent(slug));
        fillEditor(data.html || '');
        editorStatus('', false);
    } catch (err) {
        editorStatus(err.message || t('讀取失敗', 'Load failed'), true);
    }
}

async function openEditor(slug) {
    if (!canEditScience()) return;
    ensureCss();
    ensureModal();
    const modal = editorRoot();
    editorNav = await loadNav();
    editorSlug = slug && pageBySlug(editorNav, slug) ? slug : (editorNav.pages[0] && editorNav.pages[0].slug) || 'home';
    fillPageSelect();
    modal.hidden = false;
    document.body.classList.add('sci-edu-modal-open');
    modal.querySelector('.sci-edu-modal-close')?.focus();
    await loadEditorPage(editorSlug);
}

function closeEditor() {
    const modal = editorRoot();
    if (modal) modal.hidden = true;
    document.body.classList.remove('sci-edu-modal-open');
}

async function saveEditor() {
    if (!editorSlug) return;
    editorStatus(t('儲存中…', 'Saving…'), false);
    try {
        await global.ScienceApi.apiFetch('/admin/science-edu/pages/' + encodeURIComponent(editorSlug), {
            method: 'PUT',
            body: { html: editorHtml() },
        });
        const article = document.querySelector('.sci-edu-article:not(.sci-edu-visual)');
        const shown = document.querySelector('.sci-edu-nav [aria-current="page"]')?.getAttribute('data-sci-slug');
        if (article && shown === editorSlug) {
            article.innerHTML = sanitize(absoluteImages(editorHtml()));
            bindPageLinks(article);
        }
        editorStatus(t('已儲存。', 'Saved.'), false);
    } catch (err) {
        editorStatus(err.message || t('儲存失敗', 'Save failed'), true);
    }
}

async function uploadEditorImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !editorSlug) return;
    const body = new FormData();
    body.append('slug', editorSlug);
    body.append('file', file);
    try {
        const stored = await global.ScienceApi.apiFetch('/admin/science-edu/images', { method: 'POST', body });
        const figure = `<figure class="sci-edu-figure"><img src="${contentBase()}/${stored.path}" alt=""></figure>`;
        if (editorMode === 'html') {
            const source = document.getElementById('sci-edu-source');
            if (source) source.value += `\n<figure class="sci-edu-figure"><img src="${stored.path}" alt=""></figure>\n`;
        } else {
            document.getElementById('sci-edu-visual')?.focus();
            document.execCommand('insertHTML', false, figure);
        }
        editorStatus(t('圖片已插入，記得儲存。', 'Image inserted. Remember to save.'), false);
    } catch (err) {
        editorStatus(err.message || t('上傳失敗', 'Upload failed'), true);
    }
}

function bindAdminEdit(root) {
    root.querySelectorAll('[data-sci-admin]').forEach((el) => {
        el.addEventListener('click', () => {
            const current = root.querySelector('.sci-edu-nav [aria-current="page"]')?.getAttribute('data-sci-slug') || 'home';
            openEditor(current);
        });
    });
}

function renderNav(nav, current) {
    const tops = nav.pages.filter((p) => !p.parent);
    const html = tops.map((page) => {
        const kids = nav.pages.filter((p) => p.parent === page.slug);
        const self = `<a href="${escapeHtml(pageHref(page.slug))}" data-sci-slug="${escapeHtml(page.slug)}"${page.slug === current ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a>`;
        const childHtml = kids.map((kid) => (
            `<a class="is-child" href="${escapeHtml(pageHref(kid.slug))}" data-sci-slug="${escapeHtml(kid.slug)}"${kid.slug === current ? ' aria-current="page"' : ''}>${escapeHtml(kid.title)}</a>`
        )).join('');
        return self + childHtml;
    }).join('');
    return `<nav class="sci-edu-nav" aria-label="${escapeHtml(t('科學教育', 'Science education'))}">${html}</nav>`;
}

async function renderPage(slug) {
    ensureCss();
    const main = document.getElementById('main-content');
    if (!main) return;
    document.body.classList.remove('guest-landing');
    main.innerHTML = `<p class="text-slate-500 p-6">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        const nav = await loadNav();
        const wanted = slug && pageBySlug(nav, slug) ? slug : 'home';
        const page = pageBySlug(nav, wanted) || { slug: 'home', title: nav.title };
        const html = await fetchText(contentBase() + '/pages/' + encodeURIComponent(page.slug) + '.html');
        document.title = page.title + ' · ' + (global.__SITE_NAMES__ && global.__SITE_NAMES__.zh ? global.__SITE_NAMES__.zh : '科學教育');
        main.innerHTML = `
            <div class="sci-edu-shell">
                ${renderNav(nav, page.slug)}
                <div class="sci-edu-main">
                    ${editButtonHtml()}
                    <article class="sci-edu-article">${sanitize(html)}</article>
                </div>
            </div>`;
        bindPageLinks(main);
        bindAdminEdit(main);
    } catch (err) {
        main.innerHTML = `<p class="text-red-600 p-6">${escapeHtml(err && err.message ? err.message : t('載入失敗', 'Load failed'))}</p>`;
    }
}

async function mountHome(slot) {
    if (!slot) return;
    ensureCss();
    try {
        const nav = await loadNav();
        const ideas = [
            '讓學生認識自己及生活環境，建立對科學與自然界的基本認知。',
            '通過科學探究，培養生活技能、學習能力與明辨思考。',
            '運用科學知識解決真實問題，並養成終身學習的習慣。',
        ];
        const cards = nav.pages.filter((p) => p.showOnHome && !p.parent);
        slot.innerHTML = `
            <section class="sci-edu-home" aria-labelledby="sci-edu-home-title">
                <div class="sci-edu-home-inner">
                    <p class="sci-edu-kicker">Queen Elizabeth School Old Students' Association Secondary School</p>
                    <h2 id="sci-edu-home-title">${escapeHtml(nav.title)}</h2>
                    <p class="sci-edu-lead">${escapeHtml(nav.lead)}</p>
                    <ul class="sci-edu-ideas">
                        ${ideas.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                    <a class="sci-edu-more" href="${escapeHtml(pageHref('home'))}" data-sci-slug="home">${escapeHtml(t('閱讀課程理念', 'Read the curriculum ideas'))}</a>
                    <div class="sci-edu-grid">
                        ${cards.map((card) => `
                            <a class="sci-edu-card" href="${escapeHtml(pageHref(card.slug))}" data-sci-slug="${escapeHtml(card.slug)}">
                                <strong>${escapeHtml(card.title)}</strong>
                                <span>${escapeHtml(card.summary || '')}</span>
                            </a>`).join('')}
                    </div>
                </div>
            </section>`;
        bindPageLinks(slot);
    } catch (err) {
        slot.innerHTML = '';
    }
}

global.AppScienceEdu = {
    renderPage,
    mountHome,
    contentBase,
};

export {};
