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

function canViewAll() {
    return global.ScienceApi && global.ScienceApi.hasPermission('user.manage');
}

async function renderMessages(host, messages) {
    host.innerHTML = '';
    if (!messages.length) {
        host.innerHTML = `<p class="text-slate-500">${escapeHtml(t('這段對話還沒有內容。', 'This chat is empty.'))}</p>`;
        return;
    }
    for (const msg of messages) {
        const el = document.createElement('div');
        el.className = 'science-tutor-msg ' + (msg.role === 'user' ? 'science-tutor-msg-user' : 'science-tutor-msg-assistant');
        const content = String(msg.content || '');
        if (msg.role === 'assistant' && global.AppMarkdown && typeof AppMarkdown.renderMarkdownToHtml === 'function') {
            el.classList.add('is-rich');
            el.innerHTML = AppMarkdown.renderMarkdownToHtml(content);
            if (typeof AppMarkdown.typesetMath === 'function') {
                await AppMarkdown.typesetMath(el);
            }
        } else {
            el.textContent = content;
        }
        host.appendChild(el);
    }
}

async function renderAdminTutor() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('科學助教紀錄', 'Science tutor history');
    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }

    const params = new URLSearchParams(location.search);
    let all = canViewAll() && params.get('all') !== '0';
    let q = params.get('q') || '';

    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        const path = '/tutor/conversations' + (all ? '?all=1' : '') + (q ? (all ? '&' : '?') + 'q=' + encodeURIComponent(q) : '');
        const data = await global.ScienceApi.apiFetch(path);
        const items = data.conversations || [];
        const showAll = !!data.can_view_all;
        const filter = showAll ? `
            <form id="admin-tutor-filter" class="flex flex-wrap gap-2 items-end mb-4">
                <label class="text-sm">${escapeHtml(t('搜尋', 'Search'))}
                    <input name="q" value="${escapeHtml(q)}" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm min-w-[12rem]" placeholder="${escapeHtml(t('姓名、帳戶或標題', 'Name, login or title'))}">
                </label>
                <label class="text-sm inline-flex items-center gap-2 pb-1.5">
                    <input type="checkbox" name="all" ${all ? 'checked' : ''} class="rounded border-slate-300">
                    ${escapeHtml(t('顯示全部同學', 'Show all students'))}
                </label>
                <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('套用', 'Apply'))}</button>
            </form>` : '';
        const rows = items.map((c) => {
            const who = all
                ? `<td class="p-3">${escapeHtml(c.user_name || '')}<div class="text-xs text-slate-500">${escapeHtml(c.user_email || '')}</div></td>`
                : '';
            return `<tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="p-3">${Number(c.id)}</td>
                ${who}
                <td class="p-3">${escapeHtml(c.title || t('新對話', 'New chat'))}</td>
                <td class="p-3 text-slate-500 whitespace-nowrap">${escapeHtml(c.updated_at || '')}</td>
                <td class="p-3"><a href="${escapeHtml(spaHref('/admin/tutor/' + c.id))}" data-spa-nav="/admin/tutor/${Number(c.id)}" class="text-brand-700 hover:underline">${escapeHtml(t('查看', 'View'))}</a></td>
            </tr>`;
        }).join('');
        box.innerHTML = `
            <p class="text-slate-600 text-sm mb-4">${escapeHtml(all
                ? t('管理員可查看全校科學助教對話。', 'Admins can read every science-tutor conversation.')
                : t('以下是你自己的科學助教對話。', 'These are your own science-tutor chats.'))}</p>
            ${filter}
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left">
                        <tr>
                            <th class="p-3">ID</th>
                            ${all ? `<th class="p-3">${escapeHtml(t('學生', 'Student'))}</th>` : ''}
                            <th class="p-3">${escapeHtml(t('標題', 'Title'))}</th>
                            <th class="p-3">${escapeHtml(t('最近活動', 'Updated'))}</th>
                            <th class="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td class="p-3 text-slate-500" colspan="${all ? 5 : 4}">${escapeHtml(t('尚無對話。', 'No chats yet.'))}</td></tr>`}
                    </tbody>
                </table>
            </div>`;
        box.querySelector('#admin-tutor-filter')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const nextQ = (form.q && form.q.value) ? form.q.value.trim() : '';
            const nextAll = !!(form.all && form.all.checked);
            const qs = [];
            if (showAll) qs.push('all=' + (nextAll ? '1' : '0'));
            if (nextQ) qs.push('q=' + encodeURIComponent(nextQ));
            const href = '/admin/tutor' + (qs.length ? '?' + qs.join('&') : '');
            const appBase = location.pathname.split('/app')[0] + '/app';
            history.pushState({ path: '/admin/tutor' }, '', appBase + href);
            void renderAdminTutor();
        });
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗。', 'Failed to load.'))}</p>`;
    }
}

async function renderAdminTutorThread(id) {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('科學助教對話', 'Science tutor chat');
    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        if (!global.AppMarkdown) {
            await import('./markdown.js');
        }
        const data = await global.ScienceApi.apiFetch('/tutor/conversations/' + encodeURIComponent(id));
        const conv = data.conversation || {};
        const messages = data.messages || [];
        const owner = conv.user_name
            ? `<p class="text-sm text-slate-600">${escapeHtml(conv.user_name)} · ${escapeHtml(conv.user_email || '')}</p>`
            : '';
        box.innerHTML = `
            <p class="mb-4"><a href="${escapeHtml(spaHref('/admin/tutor'))}" data-spa-nav="/admin/tutor" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 返回列表', '← Back to list'))}</a></p>
            <h2 class="text-lg font-bold text-slate-900">${escapeHtml(conv.title || t('新對話', 'New chat'))}</h2>
            ${owner}
            <p class="text-xs text-slate-500 mb-4">${escapeHtml(conv.updated_at || '')}</p>
            <div id="admin-tutor-log" class="science-tutor-log science-tutor-log-static rounded-xl border border-slate-200"></div>`;
        await renderMessages(box.querySelector('#admin-tutor-log'), messages);
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗。', 'Failed to load.'))}</p>`;
    }
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminTutor,
    renderAdminTutorThread,
});

export {};
