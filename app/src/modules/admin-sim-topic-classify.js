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

function canManage() {
    return global.ScienceApi.hasPermission('simulation.manage_any')
        || global.ScienceApi.hasPermission('user.manage');
}

function setShell() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

/** @type {Record<number, object>} */
const suggestionStore = {};
/** @type {{text:string,ok:boolean}|null} */
let lastNotice = null;

function topicSelectHtml(subjects, item) {
    const sug = suggestionStore[item.id] || {};
    const sid = sug.subject_id != null ? sug.subject_id : item.subject_id;
    const tid = sug.topic_id != null ? sug.topic_id : '';
    const subjOpts = [`<option value="">${escapeHtml(t('選擇科目', 'Subject'))}</option>`]
        .concat((subjects || []).map((s) => {
            const sel = Number(sid) === Number(s.id) ? ' selected' : '';
            return `<option value="${Number(s.id)}"${sel}>${escapeHtml(s.name_zh || s.slug)}</option>`;
        }));
    const sub = (subjects || []).find((s) => Number(s.id) === Number(sid));
    const topics = sub ? (sub.topics || []) : [];
    const topicOpts = [`<option value="">${escapeHtml(t('選擇課題', 'Topic'))}</option>`]
        .concat(topics.map((tp) => {
            const sel = Number(tid) === Number(tp.id) ? ' selected' : '';
            return `<option value="${Number(tp.id)}"${sel}>${escapeHtml(tp.name_zh || tp.name_en || tp.slug)}</option>`;
        }));
    const newKey = sug.is_new_topic ? `new:${sug.topic_name_zh || ''}|${sug.topic_name_en || ''}|${sug.topic_slug || ''}` : '';
    if (sug.is_new_topic && !tid) {
        topicOpts.push(`<option value="${escapeHtml(newKey)}" selected>${escapeHtml(t('新建：', 'New: ') + (sug.topic_name_zh || sug.topic_name_en))}</option>`);
    }
    return `
        <select class="tc-subject border border-slate-300 rounded px-2 py-1 text-xs bg-white max-w-[9rem]" data-id="${item.id}">${subjOpts.join('')}</select>
        <select class="tc-topic border border-slate-300 rounded px-2 py-1 text-xs bg-white max-w-[12rem]" data-id="${item.id}">${topicOpts.join('')}</select>
    `;
}

async function fetchPlan(search) {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    return global.ScienceApi.apiFetch(`/admin/simulations/topic-classify${q}`);
}

async function renderAdminSimTopicClassify() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('模擬課題分類', 'Classify simulation topics');

    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    if (!canManage()) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
        return;
    }

    const searchDefault = new URLSearchParams(global.location.search).get('q') || '';
    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

    let plan;
    try {
        plan = await fetchPlan(searchDefault);
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        return;
    }

    const items = Array.isArray(plan.items) ? plan.items : [];
    const subjects = plan.subjects || [];
    const models = Array.isArray(plan.models) ? plan.models : [];
    const defaultModel = plan.default_model || (models[0] || '');
    const xai = !!plan.xai_configured;
    const counts = plan.counts || {};

    const rows = items.map((item) => {
        const sug = suggestionStore[item.id];
        const conf = sug ? sug.confidence : '';
        return `<tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2"><input type="checkbox" class="tc-check rounded border-slate-300" value="${item.id}" checked></td>
            <td class="px-3 py-2">
                <div class="font-medium">${escapeHtml(item.title_zh || item.slug)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(item.title_en || '')}</div>
                <div class="font-mono text-[11px] text-slate-400">${escapeHtml(item.slug)}</div>
            </td>
            <td class="px-3 py-2 font-mono text-xs">${escapeHtml(item.html_path || '—')}</td>
            <td class="px-3 py-2"><div class="flex flex-wrap gap-1">${topicSelectHtml(subjects, item)}</div>
                ${sug ? `<p class="text-[11px] text-violet-700 mt-1">${escapeHtml((sug.is_new_topic ? t('建議新建', 'Suggest new') : t('建議', 'Suggest')) + (conf ? ' · ' + conf : ''))}</p>` : ''}
            </td>
        </tr>`;
    }).join('');

    box.innerHTML = `
        <div class="mb-4 flex flex-wrap gap-3 items-center">
            <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
            <a href="${escapeHtml(spaHref('/admin/simulations'))}" data-spa-nav="/admin/simulations" class="text-sm text-slate-500 hover:underline">${escapeHtml(t('模擬程式', 'Simulations'))}</a>
            <a href="${escapeHtml(spaHref('/admin/subjects'))}" data-spa-nav="/admin/subjects" class="text-sm text-slate-500 hover:underline">${escapeHtml(t('科目與單元', 'Subjects'))}</a>
        </div>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('列出尚未指定課題的模擬。可用 xAI 建議課題；若目錄沒有該課題，寫入時會自動新建。', 'List simulations without a topic. xAI can suggest a unit; missing topics are created when you save.'))}</p>
        <p id="tc-flash" class="${lastNotice ? '' : 'hidden'} rounded-lg border px-4 py-3 text-sm mb-4 ${lastNotice && lastNotice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}">${lastNotice ? escapeHtml(lastNotice.text) : ''}</p>
        <div class="grid sm:grid-cols-2 gap-3 mb-4">
            <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div class="text-xs text-slate-500">${escapeHtml(t('未分類', 'Unclassified'))}</div>
                <div class="text-2xl font-bold text-slate-900">${Number(counts.unclassified || items.length)}</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div class="text-xs text-slate-500">${escapeHtml(t('現有課題', 'Existing topics'))}</div>
                <div class="text-2xl font-bold text-slate-900">${Number(counts.topics || 0)}</div>
            </div>
        </div>
        <form id="tc-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <label class="text-sm text-slate-600" for="tc-q">${escapeHtml(t('搜尋', 'Search'))}</label>
            <input id="tc-q" type="search" value="${escapeHtml(searchDefault)}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[16rem]" placeholder="${escapeHtml(t('標題、slug、路徑…', 'Title, slug, path…'))}">
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${escapeHtml(t('搜尋', 'Search'))}</button>
        </form>
        <div class="flex flex-wrap gap-2 mb-3 items-center">
            ${xai ? `
                <label class="text-sm text-slate-600" for="tc-model">${escapeHtml(t('模型', 'Model'))}</label>
                <select id="tc-model" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    ${models.map((m) => `<option value="${escapeHtml(m)}"${m === defaultModel ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}
                </select>
                <button type="button" id="btn-tc-classify" class="px-4 py-2 rounded-lg border border-violet-400 text-violet-900 text-sm hover:bg-violet-50">${escapeHtml(t('AI 分類已勾選', 'AI classify selected'))}</button>
            ` : `<p class="text-sm text-amber-800">${escapeHtml(t('尚未設定 XAI_API_KEY，無法自動分類。', 'XAI_API_KEY is not set.'))}</p>`}
            <button type="button" id="btn-tc-apply" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${escapeHtml(t('寫入資料庫', 'Save to database'))}</button>
            <label class="text-sm text-slate-600 flex items-center gap-1"><input type="checkbox" id="tc-check-all" class="rounded border-slate-300" checked> ${escapeHtml(t('全選', 'Select all'))}</label>
        </div>
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 w-10"></th>
                        <th class="px-3 py-2">${escapeHtml(t('模擬', 'Simulation'))}</th>
                        <th class="px-3 py-2">${escapeHtml(t('路徑', 'Path'))}</th>
                        <th class="px-3 py-2">${escapeHtml(t('科目／課題', 'Subject / topic'))}</th>
                    </tr>
                </thead>
                <tbody>${rows || `<tr><td colspan="4" class="px-3 py-6 text-slate-500">${escapeHtml(t('沒有未分類的模擬。', 'No unclassified simulations.'))}</td></tr>`}</tbody>
            </table>
        </div>
    `;

    const notice = lastNotice;
    lastNotice = null;
    const flash = document.getElementById('tc-flash');
    function showFlash(msg, ok) {
        if (!flash) return;
        flash.textContent = msg;
        flash.className = ok
            ? 'rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm mb-4'
            : 'rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm mb-4';
    }
    if (notice && flash) {
        showFlash(notice.text, notice.ok);
    }

    document.getElementById('tc-search')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = document.getElementById('tc-q')?.value || '';
        const route = q ? `/admin/classify-sim-topics?q=${encodeURIComponent(q)}` : '/admin/classify-sim-topics';
        history.replaceState(null, '', spaHref(route));
        await renderAdminSimTopicClassify();
    });

    document.getElementById('tc-check-all')?.addEventListener('change', (e) => {
        document.querySelectorAll('.tc-check').forEach((el) => { el.checked = e.target.checked; });
    });

    box.querySelectorAll('.tc-subject').forEach((sel) => {
        sel.addEventListener('change', () => {
            const id = Number(sel.getAttribute('data-id'));
            const prev = suggestionStore[id] || {};
            suggestionStore[id] = { ...prev, subject_id: Number(sel.value) || null, topic_id: null, is_new_topic: false };
            renderAdminSimTopicClassify();
        });
    });

    function selectedIds() {
        return Array.from(document.querySelectorAll('.tc-check:checked')).map((el) => Number(el.value)).filter(Boolean);
    }

    document.getElementById('btn-tc-classify')?.addEventListener('click', async () => {
        const ids = selectedIds();
        if (!ids.length) {
            showFlash(t('請先勾選模擬。', 'Select simulations first.'), false);
            return;
        }
        try {
            const res = await global.ScienceApi.apiFetch('/admin/simulations/topic-classify', {
                method: 'POST',
                body: { action: 'classify', ids, model: document.getElementById('tc-model')?.value || '' },
            });
            (res.items || []).forEach((row) => {
                suggestionStore[row.sim_id] = row;
            });
            lastNotice = { text: t('已填入 AI 建議，請核對後寫入。', 'Suggestions filled. Review, then save.'), ok: true };
            await renderAdminSimTopicClassify();
        } catch (err) {
            showFlash(err.message || t('分類失敗', 'Classify failed'), false);
        }
    });

    document.getElementById('btn-tc-apply')?.addEventListener('click', async () => {
        const payload = [];
        selectedIds().forEach((id) => {
            const subjEl = box.querySelector(`.tc-subject[data-id="${id}"]`);
            const topicEl = box.querySelector(`.tc-topic[data-id="${id}"]`);
            const subjectId = Number(subjEl?.value || 0);
            const topicVal = String(topicEl?.value || '');
            if (topicVal.startsWith('new:')) {
                const rest = topicVal.slice(4);
                const [zh, en, slug] = rest.split('|');
                payload.push({
                    sim_id: id,
                    subject_id: subjectId,
                    create_topic: { subject_id: subjectId, name_zh: zh || '', name_en: en || zh || '', slug: slug || '' },
                });
                return;
            }
            const topicId = Number(topicVal);
            if (subjectId && topicId) {
                payload.push({ sim_id: id, subject_id: subjectId, topic_id: topicId });
            }
        });
        if (!payload.length) {
            showFlash(t('已勾選列尚未指定課題。', 'Selected rows still need a topic.'), false);
            return;
        }
        try {
            const res = await global.ScienceApi.apiFetch('/admin/simulations/topic-classify', {
                method: 'POST',
                body: { action: 'apply', items: payload, search: document.getElementById('tc-q')?.value || '' },
            });
            payload.forEach((row) => { delete suggestionStore[row.sim_id]; });
            lastNotice = {
                text: t(
                    `已更新 ${res.updated} 筆，新建課題 ${res.created_topics} 個。`,
                    `Updated ${res.updated}, created ${res.created_topics} topic(s).`
                ) + (res.errors?.length ? ' ' + res.errors.slice(0, 3).join('；') : ''),
                ok: !res.errors?.length,
            };
            await renderAdminSimTopicClassify();
        } catch (err) {
            showFlash(err.message || t('寫入失敗', 'Save failed'), false);
        }
    });
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminSimTopicClassify,
});
