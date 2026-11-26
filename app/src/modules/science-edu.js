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
                <article class="sci-edu-article">${sanitize(html)}</article>
            </div>`;
        bindPageLinks(main);
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
