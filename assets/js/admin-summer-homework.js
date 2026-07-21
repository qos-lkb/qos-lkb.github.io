(function () {
    'use strict';

    const qBox = document.getElementById('questions');
    if (!qBox || !window.AdminApi) return;

    function toggleContentType() {
        const type = document.getElementById('content-type').value;
        document.getElementById('passage-fields').classList.toggle('hidden', type !== 'passage');
        document.getElementById('video-fields').classList.toggle('hidden', type !== 'video');
    }

    function blankMcq() {
        return {
            question_type: 'mcq',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
            options: [
                { text_zh: '', text_en: '', is_correct: true },
                { text_zh: '', text_en: '', is_correct: false },
                { text_zh: '', text_en: '', is_correct: false },
                { text_zh: '', text_en: '', is_correct: false },
            ],
            blanks: [],
        };
    }

    function blankFill() {
        return {
            question_type: 'fill_blank',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
            options: [],
            blanks: [
                { blank_index: 1, acceptable_answer_zh: '', acceptable_answer_en: '' },
            ],
        };
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderQuestion(q, index) {
        const wrap = document.createElement('div');
        wrap.className = 'border border-slate-200 rounded-xl p-4 bg-slate-50/50 sh-q';
        wrap.dataset.type = q.question_type;

        const typeLabel = q.question_type === 'fill_blank' ? '填充題' : '選擇題';
        let body = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-semibold text-slate-500">題目 ${index + 1} · ${typeLabel}</span>
                <button type="button" class="text-xs text-red-600 sh-remove">移除</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <textarea class="stem-zh w-full border rounded-lg px-3 py-2 text-sm" rows="2" placeholder="題幹（中）">${escapeHtml(q.stem_zh)}</textarea>
                <textarea class="stem-en w-full border rounded-lg px-3 py-2 text-sm" rows="2" placeholder="題幹（英）">${escapeHtml(q.stem_en)}</textarea>
            </div>`;

        if (q.question_type === 'mcq') {
            const opts = (q.options && q.options.length) ? q.options : blankMcq().options;
            body += '<div class="space-y-2 sh-options">';
            opts.forEach((o, i) => {
                body += `<label class="flex items-start gap-2 text-sm bg-white border rounded-lg p-2">
                    <input type="radio" name="correct-${index}" class="mt-1 is-correct" ${o.is_correct ? 'checked' : ''}>
                    <span class="font-bold text-indigo-600 w-5">${String.fromCharCode(65 + i)}</span>
                    <input class="opt-zh flex-1 border rounded px-2 py-1" placeholder="選項中文" value="${escapeHtml(o.text_zh)}">
                    <input class="opt-en flex-1 border rounded px-2 py-1" placeholder="選項英文" value="${escapeHtml(o.text_en)}">
                </label>`;
            });
            body += '</div>';
        } else {
            const blanks = (q.blanks && q.blanks.length) ? q.blanks : blankFill().blanks;
            body += '<div class="space-y-2 sh-blanks">';
            blanks.forEach((b, i) => {
                body += `<div class="flex gap-2 items-center text-sm bg-white border rounded-lg p-2">
                    <span class="text-slate-500 w-12">空格 ${i + 1}</span>
                    <input class="blank-zh flex-1 border rounded px-2 py-1" placeholder="可接受答案（中）" value="${escapeHtml(b.acceptable_answer_zh)}">
                    <input class="blank-en flex-1 border rounded px-2 py-1" placeholder="可接受答案（英）" value="${escapeHtml(b.acceptable_answer_en)}">
                </div>`;
            });
            body += '<button type="button" class="text-xs text-indigo-600 sh-add-blank">+ 空格</button></div>';
        }

        body += `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <input class="expl-zh w-full border rounded-lg px-3 py-2 text-sm" placeholder="解釋（中，選填）" value="${escapeHtml(q.explanation_zh || '')}">
            <input class="expl-en w-full border rounded-lg px-3 py-2 text-sm" placeholder="解釋（英，選填）" value="${escapeHtml(q.explanation_en || '')}">
        </div>`;

        wrap.innerHTML = body;
        wrap.querySelector('.sh-remove').onclick = () => {
            wrap.remove();
            renumber();
        };
        const addBlank = wrap.querySelector('.sh-add-blank');
        if (addBlank) {
            addBlank.onclick = () => {
                const box = wrap.querySelector('.sh-blanks');
                const n = box.querySelectorAll('.blank-zh').length + 1;
                const div = document.createElement('div');
                div.className = 'flex gap-2 items-center text-sm bg-white border rounded-lg p-2';
                div.innerHTML = `<span class="text-slate-500 w-12">空格 ${n}</span>
                    <input class="blank-zh flex-1 border rounded px-2 py-1" placeholder="可接受答案（中）">
                    <input class="blank-en flex-1 border rounded px-2 py-1" placeholder="可接受答案（英）">`;
                box.insertBefore(div, addBlank);
            };
        }
        qBox.appendChild(wrap);
    }

    function renumber() {
        [...qBox.querySelectorAll('.sh-q')].forEach((el, i) => {
            const typeLabel = el.dataset.type === 'fill_blank' ? '填充題' : '選擇題';
            const label = el.querySelector('.text-xs.font-semibold');
            if (label) label.textContent = `題目 ${i + 1} · ${typeLabel}`;
            el.querySelectorAll('input[type=radio]').forEach((r) => {
                r.name = `correct-${i}`;
            });
        });
    }

    function collectQuestions() {
        return [...qBox.querySelectorAll('.sh-q')].map((el, i) => {
            const type = el.dataset.type;
            const base = {
                question_type: type,
                sort_order: i,
                stem_zh: el.querySelector('.stem-zh').value,
                stem_en: el.querySelector('.stem-en').value,
                explanation_zh: el.querySelector('.expl-zh').value,
                explanation_en: el.querySelector('.expl-en').value,
            };
            if (type === 'mcq') {
                base.options = [...el.querySelectorAll('.sh-options label')].map((lab, oi) => ({
                    sort_order: oi,
                    text_zh: lab.querySelector('.opt-zh').value,
                    text_en: lab.querySelector('.opt-en').value,
                    is_correct: lab.querySelector('.is-correct').checked,
                }));
                base.blanks = [];
            } else {
                base.options = [];
                base.blanks = [...el.querySelectorAll('.sh-blanks > div')].map((row, bi) => ({
                    blank_index: bi + 1,
                    sort_order: bi,
                    acceptable_answer_zh: row.querySelector('.blank-zh').value,
                    acceptable_answer_en: row.querySelector('.blank-en').value,
                }));
            }
            return base;
        });
    }

    document.getElementById('content-type').onchange = toggleContentType;
    document.getElementById('add-mcq').onclick = () => {
        renderQuestion(blankMcq(), qBox.children.length);
        renumber();
    };
    document.getElementById('add-fill').onclick = () => {
        renderQuestion(blankFill(), qBox.children.length);
        renumber();
    };

    (async function init() {
        await AdminApi.initSession();
        toggleContentType();
        if (EDIT_ID) {
            try {
                const detail = await AdminApi.apiFetch('/admin/summer-homework/' + EDIT_ID);
                document.getElementById('title-zh').value = detail.title_zh || '';
                document.getElementById('title-en').value = detail.title_en || '';
                document.getElementById('slug').value = detail.slug || '';
                document.getElementById('form-level').value = detail.form_level || '1';
                document.getElementById('content-type').value = detail.content_type || 'passage';
                document.getElementById('pass-percent').value = detail.pass_percent || 80;
                document.getElementById('list-sort').value = detail.list_sort_order || 0;
                document.getElementById('status').value = detail.status || 'draft';
                document.getElementById('body-zh').value = detail.body_zh || '';
                document.getElementById('body-en').value = detail.body_en || '';
                document.getElementById('video-url').value = detail.video_embed_url || '';
                document.getElementById('video-provider').value = detail.video_provider || 'youtube';
                toggleContentType();
                (detail.questions || []).forEach((q, i) => renderQuestion(q, i));
                if (!(detail.questions || []).length) renderQuestion(blankMcq(), 0);
            } catch (e) {
                const flash = document.getElementById('flash');
                flash.textContent = e.message || '載入失敗';
                flash.classList.remove('hidden');
            }
        } else {
            renderQuestion(blankMcq(), 0);
        }

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                form_level: document.getElementById('form-level').value,
                content_type: document.getElementById('content-type').value,
                pass_percent: parseFloat(document.getElementById('pass-percent').value) || 80,
                list_sort_order: parseInt(document.getElementById('list-sort').value, 10) || 0,
                status: document.getElementById('status').value,
                body_zh: document.getElementById('body-zh').value,
                body_en: document.getElementById('body-en').value,
                video_embed_url: document.getElementById('video-url').value,
                video_provider: document.getElementById('video-provider').value,
                questions: collectQuestions(),
            };
            try {
                const saved = await AdminApi.apiFetch('/admin/summer-homework', {
                    method: 'POST',
                    body: payload,
                });
                window.location.href = 'summer_homework_edit.php?id=' + saved.id;
            } catch (err) {
                const flash = document.getElementById('flash');
                flash.textContent = err.message || '儲存失敗';
                flash.classList.remove('hidden');
            }
        };
    })();
})();
