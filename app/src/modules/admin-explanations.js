'use strict';
const global = window;

import { audioPlayerHtml, bindDeferredAudio } from './audio-playback.js';

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

function audioUrl(id) {
    const base = (global.ScienceApi && ScienceApi.API_BASE) || '/api/v1';
    return base + '/explain/attempts/' + encodeURIComponent(String(id)) + '/audio';
}

function setShell() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

function scoreClass(score) {
    if (score >= 70) return 'text-emerald-700';
    if (score >= 40) return 'text-amber-700';
    return 'text-rose-700';
}

function currentView() {
    const view = new URLSearchParams(location.search).get('view') || 'questions';
    if (view === 'subjects' || view === 'attempts') return view;
    return 'questions';
}

function pushAdminUrl(params) {
    const next = new URLSearchParams(params);
    const href = '/admin/explanations' + (next.toString() ? '?' + next.toString() : '');
    const appBase = location.pathname.split('/app')[0] + '/app';
    history.pushState({ path: '/admin/explanations' }, '', appBase + href);
    void renderAdminExplanations();
}

function tabBar(view) {
    const items = [
        ['questions', t('問題', 'Questions')],
        ['subjects', t('科目', 'Subjects')],
        ['attempts', t('作答', 'Answers')],
    ];
    return `<nav class="flex flex-wrap gap-2 mb-4" aria-label="${escapeHtml(t('口述解釋管理', 'Explanation admin'))}">
        ${items.map(([id, label]) => {
            const on = view === id;
            return `<button type="button" data-view="${id}" class="px-3 py-1.5 rounded-full text-sm border ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-200'}">${escapeHtml(label)}</button>`;
        }).join('')}
    </nav>`;
}

function bindTabs(box) {
    box.querySelectorAll('[data-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view') || 'questions';
            pushAdminUrl(view === 'questions' ? {} : { view });
        });
    });
}

function lines(list) {
    return (Array.isArray(list) ? list : []).join('\n');
}

function field(label, html) {
    return `<label class="block text-sm mb-3"><span class="font-medium text-slate-700">${escapeHtml(label)}</span>${html}</label>`;
}

function input(name, value, extra = '') {
    return `<input name="${escapeHtml(name)}" value="${escapeHtml(value)}" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm" ${extra}>`;
}

function textarea(name, value, rows = 4) {
    return `<textarea name="${escapeHtml(name)}" rows="${rows}" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${escapeHtml(value)}</textarea>`;
}

async function renderSubjects(box) {
    const data = await global.ScienceApi.apiFetch('/admin/explanations/bank');
    const subjects = data.subjects || [];
    const questions = data.questions || [];
    const counts = {};
    questions.forEach((item) => {
        counts[item.subject] = (counts[item.subject] || 0) + 1;
    });
    const rows = subjects.map((item) => `<tr class="border-t border-slate-100">
        <td class="p-3 font-mono text-xs">${escapeHtml(item.key)}</td>
        <td class="p-3">${escapeHtml(item.label_zh)} / ${escapeHtml(item.label_en)}</td>
        <td class="p-3">${item.published ? escapeHtml(t('公開', 'Published')) : escapeHtml(t('草稿', 'Draft'))}</td>
        <td class="p-3 tabular-nums">${counts[item.key] || 0}</td>
        <td class="p-3 whitespace-nowrap">
            <button type="button" class="text-brand-700 text-sm hover:underline" data-edit-subject="${item.id}">${escapeHtml(t('編輯', 'Edit'))}</button>
            <button type="button" class="text-rose-700 text-sm hover:underline ml-2" data-del-subject="${item.id}">${escapeHtml(t('刪除', 'Delete'))}</button>
        </td>
    </tr>`).join('');
    box.innerHTML = `
        <p class="mb-4"><a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a></p>
        ${tabBar('subjects')}
        <h2 class="text-lg font-bold text-slate-900 mb-1">${escapeHtml(t('口述解釋科目', 'Explanation subjects'))}</h2>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('科目存在資料庫。公開科目才會出現在學生的解釋練習。', 'Subjects are stored in the database. Only published subjects appear in student practice.'))}</p>
        <form id="admin-subject-form" class="bg-white border border-slate-200 rounded-xl p-4 mb-4 max-w-xl">
            <input type="hidden" name="id" value="">
            ${field(t('代碼', 'Key'), input('key', '', 'required'))}
            ${field(t('中文名稱', 'Chinese name'), input('label_zh', '', 'required'))}
            ${field(t('英文名稱', 'English name'), input('label_en', '', 'required'))}
            ${field(t('排序', 'Order'), input('sort_order', '0', 'type="number"'))}
            <label class="flex items-center gap-2 text-sm mb-3"><input type="checkbox" name="published" checked> ${escapeHtml(t('公開', 'Published'))}</label>
            <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('儲存科目', 'Save subject'))}</button>
            <button type="button" id="admin-subject-reset" class="ml-2 text-sm text-slate-600">${escapeHtml(t('新增另一個', 'New'))}</button>
        </form>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left"><tr>
                    <th class="p-3">${escapeHtml(t('代碼', 'Key'))}</th>
                    <th class="p-3">${escapeHtml(t('名稱', 'Name'))}</th>
                    <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                    <th class="p-3">${escapeHtml(t('題數', 'Questions'))}</th>
                    <th class="p-3">${escapeHtml(t('操作', 'Actions'))}</th>
                </tr></thead>
                <tbody>${rows || `<tr><td class="p-3 text-slate-500" colspan="5">${escapeHtml(t('還沒有科目。', 'No subjects yet.'))}</td></tr>`}</tbody>
            </table>
        </div>`;
    bindTabs(box);
    const form = box.querySelector('#admin-subject-form');
    const fill = (item) => {
        form.id.value = item && item.id ? String(item.id) : '';
        form.key.value = item ? item.key : '';
        form.label_zh.value = item ? item.label_zh : '';
        form.label_en.value = item ? item.label_en : '';
        form.sort_order.value = item ? String(item.sort_order || 0) : '0';
        form.published.checked = item ? !!item.published : true;
    };
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.id.value;
        const body = {
            key: form.key.value.trim(),
            label_zh: form.label_zh.value.trim(),
            label_en: form.label_en.value.trim(),
            sort_order: Number(form.sort_order.value) || 0,
            published: form.published.checked,
        };
        try {
            if (id) {
                await global.ScienceApi.apiFetch('/admin/explanations/subjects/' + encodeURIComponent(id), { method: 'PUT', body });
            } else {
                await global.ScienceApi.apiFetch('/admin/explanations/subjects', { method: 'POST', body });
            }
            void renderAdminExplanations();
        } catch (err) {
            window.alert(err.message || t('儲存失敗。', 'Save failed.'));
        }
    });
    box.querySelector('#admin-subject-reset')?.addEventListener('click', () => fill(null));
    box.querySelectorAll('[data-edit-subject]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-edit-subject'));
            fill(subjects.find((item) => item.id === id) || null);
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    box.querySelectorAll('[data-del-subject]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (!window.confirm(t('確定刪除這個科目？', 'Delete this subject?'))) return;
            try {
                await global.ScienceApi.apiFetch('/admin/explanations/subjects/' + encodeURIComponent(btn.getAttribute('data-del-subject')), { method: 'DELETE' });
                void renderAdminExplanations();
            } catch (err) {
                window.alert(err.message || t('刪除失敗。', 'Delete failed.'));
            }
        });
    });
}

async function renderQuestions(box) {
    const data = await global.ScienceApi.apiFetch('/admin/explanations/bank');
    const subjects = data.subjects || [];
    const questions = data.questions || [];
    const lang = global.AppRouter && AppRouter.getLang ? AppRouter.getLang() : 'zh';
    const options = subjects.map((item) => {
        const label = lang === 'zh' ? item.label_zh : item.label_en;
        return `<option value="${escapeHtml(item.key)}">${escapeHtml(label)} (${escapeHtml(item.key)})</option>`;
    }).join('');
    const rows = questions.map((item) => {
        const heading = lang === 'zh' ? item.title_zh : item.title_en;
        return `<tr class="border-t border-slate-100 align-top">
            <td class="p-3 font-mono text-xs">${escapeHtml(item.key)}</td>
            <td class="p-3">${escapeHtml(item.subject)}</td>
            <td class="p-3">${escapeHtml(heading)}</td>
            <td class="p-3">${item.published ? escapeHtml(t('公開', 'Published')) : escapeHtml(t('草稿', 'Draft'))}</td>
            <td class="p-3 whitespace-nowrap">
                <button type="button" class="text-brand-700 text-sm hover:underline" data-edit-question="${item.id}">${escapeHtml(t('編輯', 'Edit'))}</button>
                <button type="button" class="text-rose-700 text-sm hover:underline ml-2" data-del-question="${item.id}">${escapeHtml(t('刪除', 'Delete'))}</button>
            </td>
        </tr>`;
    }).join('');
    box.innerHTML = `
        <p class="mb-4"><a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a></p>
        ${tabBar('questions')}
        <h2 class="text-lg font-bold text-slate-900 mb-1">${escapeHtml(t('口述解釋問題', 'Explanation questions'))}</h2>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('題目與評分答案存在資料庫。評分要點只在評分後顯示給學生，不要寫進公開題幹。', 'Questions and scoring answers are stored in the database. Key points appear to students only after scoring.'))}</p>
        <form id="admin-question-form" class="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <input type="hidden" name="id" value="">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${field(t('代碼', 'Key'), input('key', '', 'required'))}
                ${field(t('科目', 'Subject'), `<select name="subject" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${options}</select>`)}
                ${field(t('中文標題', 'Chinese title'), input('title_zh', '', 'required'))}
                ${field(t('英文標題', 'English title'), input('title_en', '', 'required'))}
            </div>
            ${field(t('中文題目', 'Chinese prompt'), textarea('prompt_zh', '', 3))}
            ${field(t('英文題目', 'English prompt'), textarea('prompt_en', '', 3))}
            ${field(t('中文評分要點／答案（一行一點）', 'Chinese key points / answers (one per line)'), textarea('points_zh', '', 5))}
            ${field(t('英文評分要點／答案（一行一點）', 'English key points / answers (one per line)'), textarea('points_en', '', 5))}
            ${field(t('常見錯誤（一行一項，評分時扣分）', 'Misconceptions (one per line)'), textarea('misconceptions_zh', '', 3))}
            <div class="flex flex-wrap items-center gap-4 mb-3">
                ${field(t('排序', 'Order'), input('sort_order', '0', 'type="number"'))}
                <label class="flex items-center gap-2 text-sm mt-5"><input type="checkbox" name="published" checked> ${escapeHtml(t('公開', 'Published'))}</label>
            </div>
            <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('儲存問題', 'Save question'))}</button>
            <button type="button" id="admin-question-reset" class="ml-2 text-sm text-slate-600">${escapeHtml(t('新增另一題', 'New'))}</button>
        </form>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left"><tr>
                    <th class="p-3">${escapeHtml(t('代碼', 'Key'))}</th>
                    <th class="p-3">${escapeHtml(t('科目', 'Subject'))}</th>
                    <th class="p-3">${escapeHtml(t('標題', 'Title'))}</th>
                    <th class="p-3">${escapeHtml(t('狀態', 'Status'))}</th>
                    <th class="p-3">${escapeHtml(t('操作', 'Actions'))}</th>
                </tr></thead>
                <tbody>${rows || `<tr><td class="p-3 text-slate-500" colspan="5">${escapeHtml(t('還沒有問題。', 'No questions yet.'))}</td></tr>`}</tbody>
            </table>
        </div>`;
    bindTabs(box);
    const form = box.querySelector('#admin-question-form');
    const fill = (item) => {
        form.id.value = item && item.id ? String(item.id) : '';
        form.key.value = item ? item.key : '';
        form.subject.value = item ? item.subject : (subjects[0] ? subjects[0].key : '');
        form.title_zh.value = item ? item.title_zh : '';
        form.title_en.value = item ? item.title_en : '';
        form.prompt_zh.value = item ? item.prompt_zh : '';
        form.prompt_en.value = item ? item.prompt_en : '';
        form.points_zh.value = item ? lines(item.points_zh) : '';
        form.points_en.value = item ? lines(item.points_en) : '';
        form.misconceptions_zh.value = item ? lines(item.misconceptions_zh) : '';
        form.sort_order.value = item ? String(item.sort_order || 0) : '0';
        form.published.checked = item ? !!item.published : true;
    };
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.id.value;
        const body = {
            key: form.key.value.trim(),
            subject: form.subject.value,
            title_zh: form.title_zh.value.trim(),
            title_en: form.title_en.value.trim(),
            prompt_zh: form.prompt_zh.value.trim(),
            prompt_en: form.prompt_en.value.trim(),
            points_zh: form.points_zh.value,
            points_en: form.points_en.value,
            misconceptions_zh: form.misconceptions_zh.value,
            sort_order: Number(form.sort_order.value) || 0,
            published: form.published.checked,
        };
        try {
            if (id) {
                await global.ScienceApi.apiFetch('/admin/explanations/questions/' + encodeURIComponent(id), { method: 'PUT', body });
            } else {
                await global.ScienceApi.apiFetch('/admin/explanations/questions', { method: 'POST', body });
            }
            void renderAdminExplanations();
        } catch (err) {
            window.alert(err.message || t('儲存失敗。', 'Save failed.'));
        }
    });
    box.querySelector('#admin-question-reset')?.addEventListener('click', () => fill(null));
    box.querySelectorAll('[data-edit-question]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-edit-question'));
            fill(questions.find((item) => item.id === id) || null);
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    box.querySelectorAll('[data-del-question]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (!window.confirm(t('確定刪除這條問題？已有作答紀錄會保留。', 'Delete this question? Existing attempts are kept.'))) return;
            try {
                await global.ScienceApi.apiFetch('/admin/explanations/questions/' + encodeURIComponent(btn.getAttribute('data-del-question')), { method: 'DELETE' });
                void renderAdminExplanations();
            } catch (err) {
                window.alert(err.message || t('刪除失敗。', 'Delete failed.'));
            }
        });
    });
}

async function renderAttempts(box) {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const questionKey = params.get('question_key') || '';
    const lang = global.AppRouter && AppRouter.getLang ? AppRouter.getLang() : 'zh';
    const qs = [];
    if (q) qs.push('q=' + encodeURIComponent(q));
    if (questionKey) qs.push('question_key=' + encodeURIComponent(questionKey));
    const data = await global.ScienceApi.apiFetch('/admin/explanations' + (qs.length ? '?' + qs.join('&') : ''));
    const attempts = data.attempts || [];
    const questions = data.questions || [];
    const options = [`<option value="">${escapeHtml(t('全部題目', 'All questions'))}</option>`]
        .concat(questions.map((item) => {
            const label = lang === 'zh' ? item.title_zh : item.title_en;
            const sel = item.key === questionKey ? ' selected' : '';
            return `<option value="${escapeHtml(item.key)}"${sel}>${escapeHtml(label)}</option>`;
        }))
        .join('');
    const rows = attempts.map((item) => {
        const note = lang === 'zh' ? (item.feedback_zh || item.feedback_en) : (item.feedback_en || item.feedback_zh);
        const heading = lang === 'zh' ? (item.title_zh || item.question_key) : (item.title_en || item.question_key);
        const player = item.has_audio
            ? audioPlayerHtml(audioUrl(item.id), {
                className: 'min-w-[12rem]',
                fallbackText: t('無法播放錄音', 'Could not play the recording'),
            })
            : `<span class="text-slate-400">${escapeHtml(t('沒有錄音', 'No audio'))}</span>`;
        return `<tr class="border-t border-slate-100 align-top">
            <td class="p-3 whitespace-nowrap text-slate-500">${escapeHtml(item.created_at || '')}</td>
            <td class="p-3">${escapeHtml(item.user_name || '')}<div class="text-xs text-slate-500">${escapeHtml(item.user_email || '')}</div></td>
            <td class="p-3">${escapeHtml(heading)}</td>
            <td class="p-3 font-semibold tabular-nums ${scoreClass(Number(item.score) || 0)}">${Number(item.score) || 0}</td>
            <td class="p-3 min-w-[16rem]">${player}</td>
            <td class="p-3 max-w-xs"><p>${escapeHtml(item.transcript || '')}</p><p class="text-xs text-slate-500 mt-1">${escapeHtml(note || '')}</p></td>
        </tr>`;
    }).join('');
    box.innerHTML = `
        <p class="mb-4"><a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a></p>
        ${tabBar('attempts')}
        <h2 class="text-lg font-bold text-slate-900 mb-1">${escapeHtml(t('口述解釋作答', 'Spoken explanations'))}</h2>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('查看各使用者的錄音、轉寫、分數和評語。', 'Review each user\'s recording, transcript, score, and feedback.'))}</p>
        <form id="admin-explain-filter" class="flex flex-wrap gap-2 items-end mb-4">
            <label class="text-sm">${escapeHtml(t('學生', 'Student'))}
                <input name="q" value="${escapeHtml(q)}" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm min-w-[12rem]" placeholder="${escapeHtml(t('姓名或帳戶', 'Name or login'))}">
            </label>
            <label class="text-sm">${escapeHtml(t('題目', 'Question'))}
                <select name="question_key" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm">${options}</select>
            </label>
            <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('套用', 'Apply'))}</button>
        </form>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">${escapeHtml(t('時間', 'Time'))}</th>
                        <th class="p-3">${escapeHtml(t('學生', 'Student'))}</th>
                        <th class="p-3">${escapeHtml(t('題目', 'Question'))}</th>
                        <th class="p-3">${escapeHtml(t('分數', 'Score'))}</th>
                        <th class="p-3">${escapeHtml(t('錄音', 'Recording'))}</th>
                        <th class="p-3">${escapeHtml(t('轉寫與評語', 'Transcript and feedback'))}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td class="p-3 text-slate-500" colspan="6">${escapeHtml(t('還沒有作答。', 'No attempts yet.'))}</td></tr>`}
                </tbody>
            </table>
        </div>`;
    bindTabs(box);
    bindDeferredAudio(box);
    box.querySelector('#admin-explain-filter')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const next = { view: 'attempts' };
        const nextQ = (form.q && form.q.value) ? form.q.value.trim() : '';
        const nextKey = (form.question_key && form.question_key.value) ? form.question_key.value : '';
        if (nextQ) next.q = nextQ;
        if (nextKey) next.question_key = nextKey;
        pushAdminUrl(next);
    });
}

async function renderAdminExplanations() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('口述解釋', 'Oral explanations');
    if (!box) return;
    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    if (!global.ScienceApi.hasPermission('explanation.manage') && !global.ScienceApi.hasPermission('user.manage')) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限管理口述解釋。', 'You cannot manage oral explanations.'))}</p>`;
        return;
    }
    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
        const view = currentView();
        if (view === 'subjects') await renderSubjects(box);
        else if (view === 'attempts') await renderAttempts(box);
        else await renderQuestions(box);
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗。', 'Failed to load.'))}</p>`;
    }
}

global.AppAdmin = global.AppAdmin || {};
global.AppAdmin.renderAdminExplanations = renderAdminExplanations;

export {};
