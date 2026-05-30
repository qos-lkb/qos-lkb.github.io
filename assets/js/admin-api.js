(function (global) {
    'use strict';

    const API_BASE = '../api/v1';
    let csrfToken = '';

    async function apiFetch(path, options = {}) {
        const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
        if (options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        if (csrfToken && options.method && options.method !== 'GET') {
            headers['X-CSRF-Token'] = csrfToken;
        }
        const res = await fetch(API_BASE + path, Object.assign({ credentials: 'same-origin' }, options, { headers }));
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error?.message || 'Request failed');
        }
        return json.data;
    }

    async function initSession() {
        const me = await apiFetch('/auth/me');
        csrfToken = me.csrf_token || '';
        return me;
    }

    function blankQuestion() {
        return {
            stem_zh: '', stem_en: '', explanation_zh: '', explanation_en: '',
            options: [
                { text_zh: '', text_en: '', is_correct: true },
                { text_zh: '', text_en: '', is_correct: false },
                { text_zh: '', text_en: '', is_correct: false },
                { text_zh: '', text_en: '', is_correct: false },
            ],
        };
    }

    function renderQuestionBlock(q, index, container) {
        const div = document.createElement('div');
        div.className = 'border rounded-xl p-4 mb-4 bg-slate-50';
        div.innerHTML = `
            <div class="flex justify-between mb-2">
                <strong>第 ${index + 1} 題</strong>
                <button type="button" class="text-red-600 text-sm remove-q">移除</button>
            </div>
            <label class="block text-sm mb-1">題幹（中）</label>
            <textarea class="stem-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${escape(q.stem_zh)}</textarea>
            <label class="block text-sm mb-1">題幹（英）</label>
            <textarea class="stem-en w-full border rounded p-2 mb-2 text-sm" rows="2">${escape(q.stem_en)}</textarea>
            <div class="options space-y-2"></div>
            <label class="block text-sm mt-2 mb-1">解析（中）</label>
            <textarea class="expl-zh w-full border rounded p-2 text-sm" rows="2">${escape(q.explanation_zh || '')}</textarea>
            <label class="block text-sm mt-2 mb-1">解析（英）</label>
            <textarea class="expl-en w-full border rounded p-2 text-sm" rows="2">${escape(q.explanation_en || '')}</textarea>`;
        const optContainer = div.querySelector('.options');
        (q.options || blankQuestion().options).forEach((o, i) => {
            const row = document.createElement('div');
            row.className = 'flex gap-2 items-start flex-wrap';
            row.innerHTML = `
                <span class="text-xs font-bold pt-2 w-4">${String.fromCharCode(65 + i)}</span>
                <input type="radio" name="correct-${index}" class="correct mt-2" ${o.is_correct ? 'checked' : ''}>
                <input class="opt-zh flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="選項（中）" value="${escape(o.text_zh)}">
                <input class="opt-en flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="Option EN" value="${escape(o.text_en)}">`;
            optContainer.appendChild(row);
        });
        div.querySelector('.remove-q').onclick = () => div.remove();
        container.appendChild(div);
    }

    function collectQuestions(container) {
        return Array.from(container.querySelectorAll(':scope > div')).map((div, sort) => {
            const correctIdx = Array.from(div.querySelectorAll('.correct')).findIndex(r => r.checked);
            const rows = div.querySelectorAll('.options > div');
            const options = Array.from(rows).map((row, i) => ({
                text_zh: row.querySelector('.opt-zh').value,
                text_en: row.querySelector('.opt-en').value,
                is_correct: i === correctIdx,
                sort_order: i,
            }));
            return {
                sort_order: sort,
                stem_zh: div.querySelector('.stem-zh').value,
                stem_en: div.querySelector('.stem-en').value,
                explanation_zh: div.querySelector('.expl-zh').value,
                explanation_en: div.querySelector('.expl-en').value,
                options,
            };
        });
    }

    function escape(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    global.AdminApi = {
        apiFetch, initSession, blankQuestion, renderQuestionBlock, collectQuestions,
        getCsrf: () => csrfToken,
    };
})(window);
