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

function settingsFormHtml(settings) {
    const models = settings.models || [];
    const modelOpts = [`<option value="">${escapeHtml(t('跟隨伺服器 .env', 'Follow server .env'))} (${escapeHtml(settings.env_model || 'grok-4.6')})</option>`]
        .concat(models.map((m) => {
            const sel = settings.model === m ? ' selected' : '';
            return `<option value="${escapeHtml(m)}"${sel}>${escapeHtml(m)}</option>`;
        }))
        .join('');
    const effort = settings.reasoning_effort || '';
    const effortOpts = [
        ['', t('跟隨伺服器 .env', 'Follow server .env')],
        ['none', t('不指定', 'API default')],
        ['low', 'low'],
        ['medium', 'medium'],
        ['high', 'high'],
        ['xhigh', 'xhigh'],
    ].map(([v, label]) => `<option value="${escapeHtml(v)}"${effort === v ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
    const keyOk = !!settings.has_api_key;
    const live = !!settings.live;
    const stats = settings.stats || {};
    return `
        <section class="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900 mb-1">${escapeHtml(t('Chatbot 設定', 'Chatbot settings'))}</h2>
            <p class="text-sm text-slate-600 mb-4">${escapeHtml(t(
                '控制右下角科學助教是否開放、使用哪個模型，以及系統提示。API 金鑰只放伺服器 .env。',
                'Control whether the science tutor is on, which model it uses, and the system prompt. The API key stays in server .env.'
            ))}</p>
            <div class="flex flex-wrap gap-3 mb-4 text-sm">
                <span class="rounded-full px-3 py-1 ${live ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}">${escapeHtml(live
                    ? t('目前：已對學生開放', 'Status: available to students')
                    : t('目前：未對學生開放', 'Status: not available to students'))}</span>
                <span class="rounded-full px-3 py-1 ${keyOk ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-800'}">${escapeHtml(keyOk
                    ? t('API 金鑰已設定', 'API key is set')
                    : t('尚未設定 XAI_API_KEY', 'XAI_API_KEY is missing'))}</span>
            </div>
            <dl class="grid grid-cols-3 gap-3 mb-5 text-center">
                <div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs text-slate-500">${escapeHtml(t('對話', 'Chats'))}</dt><dd class="text-xl font-semibold">${Number(stats.conversations || 0)}</dd></div>
                <div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs text-slate-500">${escapeHtml(t('訊息', 'Messages'))}</dt><dd class="text-xl font-semibold">${Number(stats.messages || 0)}</dd></div>
                <div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs text-slate-500">${escapeHtml(t('使用者', 'Users'))}</dt><dd class="text-xl font-semibold">${Number(stats.users || 0)}</dd></div>
            </dl>
            <form id="admin-tutor-settings" class="space-y-4">
                <label class="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="enabled" class="rounded border-slate-300" ${settings.enabled ? 'checked' : ''}>
                    ${escapeHtml(t('開放給已登入使用者', 'Enable for logged-in users'))}
                </label>
                <label class="block text-sm">${escapeHtml(t('模型', 'Model'))}
                    <select name="model" class="mt-1 block w-full max-w-md rounded border border-slate-300 px-2 py-1.5 text-sm">${modelOpts}</select>
                </label>
                <label class="block text-sm">${escapeHtml(t('推理深度', 'Reasoning effort'))}
                    <select name="reasoning_effort" class="mt-1 block w-full max-w-md rounded border border-slate-300 px-2 py-1.5 text-sm">${effortOpts}</select>
                </label>
                <label class="block text-sm">${escapeHtml(t('系統提示', 'System prompt'))}
                    <textarea name="system_prompt" rows="8" maxlength="8000" class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono" placeholder="${escapeHtml(t('留空則使用預設提示', 'Leave blank to use the default prompt'))}">${escapeHtml(settings.system_prompt || '')}</textarea>
                </label>
                <div class="flex flex-wrap gap-2">
                    <button type="submit" class="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-semibold">${escapeHtml(t('儲存設定', 'Save settings'))}</button>
                    <button type="button" id="admin-tutor-reset-prompt" class="rounded-lg border border-slate-300 px-4 py-2 text-sm">${escapeHtml(t('還原預設提示', 'Restore default prompt'))}</button>
                </div>
                <p id="admin-tutor-settings-msg" class="text-sm" hidden></p>
            </form>
        </section>`;
}

function bindSettingsForm(box, settings) {
    const form = box.querySelector('#admin-tutor-settings');
    if (!form) return;
    const msg = box.querySelector('#admin-tutor-settings-msg');
    form.querySelector('#admin-tutor-reset-prompt')?.addEventListener('click', () => {
        form.system_prompt.value = settings.default_system_prompt || '';
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msg) {
            msg.hidden = false;
            msg.className = 'text-sm text-slate-500';
            msg.textContent = t('儲存中…', 'Saving…');
        }
        try {
            await global.ScienceApi.apiFetch('/tutor/settings', {
                method: 'PUT',
                body: {
                    enabled: !!(form.enabled && form.enabled.checked),
                    model: form.model ? form.model.value : '',
                    reasoning_effort: form.reasoning_effort ? form.reasoning_effort.value : '',
                    system_prompt: form.system_prompt ? form.system_prompt.value : '',
                },
            });
            if (global.ScienceTutor && typeof ScienceTutor.mount === 'function') {
                void ScienceTutor.mount();
            }
            await renderAdminTutor();
        } catch (err) {
            if (msg) {
                msg.hidden = false;
                msg.className = 'text-sm text-red-600';
                msg.textContent = err.message || t('儲存失敗。', 'Could not save.');
            }
        }
    });
}

async function renderAdminTutor() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('Chatbot 管理', 'Chatbot admin');
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
        const jobs = [global.ScienceApi.apiFetch(path)];
        if (canViewAll()) jobs.push(global.ScienceApi.apiFetch('/tutor/settings'));
        const [data, settings] = await Promise.all(jobs);
        const items = data.conversations || [];
        const showAll = !!data.can_view_all;
        const manageHtml = settings ? settingsFormHtml(settings) : '';
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
            <p class="mb-4"><a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a></p>
            ${manageHtml}
            <h2 class="text-lg font-bold text-slate-900 mb-2">${escapeHtml(t('對話紀錄', 'Chat history'))}</h2>
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
        if (settings) bindSettingsForm(box, settings);
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
    if (title) title.textContent = t('Chatbot 對話', 'Chatbot thread');
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
            <p class="mb-4"><a href="${escapeHtml(spaHref('/admin/tutor'))}" data-spa-nav="/admin/tutor" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 返回 Chatbot 管理', '← Back to chatbot admin'))}</a></p>
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
