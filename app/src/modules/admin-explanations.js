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
    if (!global.ScienceApi.hasPermission('user.manage')) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限查看各人的作答。', 'You cannot review these answers.'))}</p>`;
        return;
    }

    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const questionKey = params.get('question_key') || '';
    const lang = global.AppRouter && AppRouter.getLang ? AppRouter.getLang() : 'zh';

    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    try {
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
        bindDeferredAudio(box);
        box.querySelector('#admin-explain-filter')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const nextQ = (form.q && form.q.value) ? form.q.value.trim() : '';
            const nextKey = (form.question_key && form.question_key.value) ? form.question_key.value : '';
            const next = [];
            if (nextQ) next.push('q=' + encodeURIComponent(nextQ));
            if (nextKey) next.push('question_key=' + encodeURIComponent(nextKey));
            const href = '/admin/explanations' + (next.length ? '?' + next.join('&') : '');
            const appBase = location.pathname.split('/app')[0] + '/app';
            history.pushState({ path: '/admin/explanations' }, '', appBase + href);
            void renderAdminExplanations();
        });
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗。', 'Failed to load.'))}</p>`;
    }
}

global.AppAdmin = global.AppAdmin || {};
global.AppAdmin.renderAdminExplanations = renderAdminExplanations;

export {};
