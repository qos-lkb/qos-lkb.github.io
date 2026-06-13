(function (global) {
    'use strict';

    const PART_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

    const QUESTION_TYPES = [
        { value: 'mcq', label: '四選一' },
        { value: 'short_answer', label: '短答題' },
        { value: 'long_answer', label: '長答題' },
        { value: 'fill_blank', label: '填充題' },
        { value: 'true_false', label: '是非題' },
    ];

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function typeLabel(type) {
        const found = QUESTION_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    }

    function blankMcqOptions() {
        return [
            { text_zh: '', text_en: '', is_correct: true },
            { text_zh: '', text_en: '', is_correct: false },
            { text_zh: '', text_en: '', is_correct: false },
            { text_zh: '', text_en: '', is_correct: false },
        ];
    }

    function blankPart(index) {
        return {
            part_label: PART_LABELS[index] || String(index + 1),
            prompt_zh: '',
            prompt_en: '',
            model_answer_zh: '',
            model_answer_en: '',
            marks: '',
        };
    }

    function blankFillBlank(index) {
        return {
            blank_index: index + 1,
            acceptable_answer_zh: '',
            acceptable_answer_en: '',
        };
    }

    function blankQuestion(type) {
        const base = {
            question_type: type || 'mcq',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
        };
        if (type === 'mcq') {
            base.options = blankMcqOptions();
        } else if (type === 'short_answer') {
            base.model_answer_zh = '';
            base.model_answer_en = '';
        } else if (type === 'long_answer') {
            base.parts = [blankPart(0)];
        } else if (type === 'fill_blank') {
            base.blanks = [blankFillBlank(0)];
        } else if (type === 'true_false') {
            base.true_false_answer = 1;
        } else {
            base.options = blankMcqOptions();
        }
        return base;
    }

    function renderMcqOptions(div, q) {
        const optContainer = div.querySelector('.type-fields');
        optContainer.innerHTML = '<div class="options space-y-2"></div>';
        const box = optContainer.querySelector('.options');
        (q.options || blankMcqOptions()).forEach((o, i) => {
            const row = document.createElement('div');
            row.className = 'flex gap-2 items-start flex-wrap';
            row.innerHTML = `
                <span class="text-xs font-bold pt-2 w-4">${String.fromCharCode(65 + i)}</span>
                <input type="radio" name="correct-${div.dataset.index}" class="correct mt-2" ${o.is_correct ? 'checked' : ''}>
                <input class="opt-zh flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="選項（中）" value="${escapeHtml(o.text_zh)}">
                <input class="opt-en flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="Option EN" value="${escapeHtml(o.text_en)}">`;
            box.appendChild(row);
        });
    }

    function renderShortAnswer(div, q) {
        div.querySelector('.type-fields').innerHTML = `
            <label class="block text-sm mb-1">參考答案（中）</label>
            <textarea class="model-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeHtml(q.model_answer_zh)}</textarea>
            <label class="block text-sm mb-1">參考答案（英）</label>
            <textarea class="model-en w-full border rounded p-2 text-sm" rows="2">${escapeHtml(q.model_answer_en)}</textarea>`;
    }

    function renderTrueFalse(div, q) {
        const val = q.true_false_answer === 0 || q.true_false_answer === '0' || q.true_false_answer === false ? '0' : '1';
        div.querySelector('.type-fields').innerHTML = `
            <label class="block text-sm mb-1">正確答案</label>
            <select class="tf-answer w-full border rounded p-2 text-sm">
                <option value="1" ${val === '1' ? 'selected' : ''}>是（True）</option>
                <option value="0" ${val === '0' ? 'selected' : ''}>否（False）</option>
            </select>`;
    }

    function renderPartRow(part, pi) {
        const label = part.part_label || PART_LABELS[pi] || String(pi + 1);
        const row = document.createElement('div');
        row.className = 'border rounded-lg p-3 mb-2 bg-white part-row';
        row.innerHTML = `
            <div class="flex justify-between mb-2">
                <strong class="text-sm">(${escapeHtml(label)})</strong>
                <button type="button" class="text-red-600 text-xs remove-part">移除</button>
            </div>
            <label class="block text-xs mb-1">子題（中）</label>
            <textarea class="part-prompt-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeHtml(part.prompt_zh)}</textarea>
            <label class="block text-xs mb-1">子題（英）</label>
            <textarea class="part-prompt-en w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeHtml(part.prompt_en)}</textarea>
            <label class="block text-xs mb-1">參考答案（中）</label>
            <textarea class="part-model-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeHtml(part.model_answer_zh)}</textarea>
            <label class="block text-xs mb-1">參考答案（英）</label>
            <textarea class="part-model-en w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeHtml(part.model_answer_en)}</textarea>
            <label class="block text-xs mb-1">分數（選填）</label>
            <input type="number" min="0" class="part-marks w-24 border rounded p-1 text-sm" value="${escapeHtml(part.marks)}">`;
        row.querySelector('.remove-part').onclick = () => {
            const container = row.parentElement;
            row.remove();
            if (!container.querySelector('.part-row')) {
                container.appendChild(renderPartRow(blankPart(0), 0));
            } else {
                reindexParts(container);
            }
        };
        return row;
    }

    function reindexParts(container) {
        container.querySelectorAll('.part-row').forEach((row, i) => {
            const label = PART_LABELS[i] || String(i + 1);
            row.querySelector('strong').textContent = '(' + label + ')';
        });
    }

    function renderLongAnswer(div, q) {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">子題 (a)(b)…</span>
                <button type="button" class="text-sm text-indigo-600 add-part">+ 新增子題</button>
            </div>
            <div class="parts-container"></div>`;
        const container = wrap.querySelector('.parts-container');
        const parts = q.parts && q.parts.length ? q.parts : [blankPart(0)];
        parts.forEach((p, i) => container.appendChild(renderPartRow(p, i)));
        wrap.querySelector('.add-part').onclick = () => {
            const idx = container.querySelectorAll('.part-row').length;
            container.appendChild(renderPartRow(blankPart(idx), idx));
            reindexParts(container);
        };
        div.querySelector('.type-fields').innerHTML = '';
        div.querySelector('.type-fields').appendChild(wrap);
    }

    function renderBlankRow(blank, bi) {
        const row = document.createElement('div');
        row.className = 'border rounded-lg p-3 mb-2 bg-white blank-row';
        row.innerHTML = `
            <div class="flex justify-between mb-2">
                <strong class="text-sm">空格 {{${bi + 1}}}</strong>
                <button type="button" class="text-red-600 text-xs remove-blank">移除</button>
            </div>
            <label class="block text-xs mb-1">可接受答案（中）</label>
            <input class="blank-zh w-full border rounded p-2 mb-2 text-sm" value="${escapeHtml(blank.acceptable_answer_zh)}">
            <label class="block text-xs mb-1">可接受答案（英）</label>
            <input class="blank-en w-full border rounded p-2 text-sm" value="${escapeHtml(blank.acceptable_answer_en)}">`;
        row.querySelector('.remove-blank').onclick = () => {
            const container = row.parentElement;
            row.remove();
            if (!container.querySelector('.blank-row')) {
                container.appendChild(renderBlankRow(blankFillBlank(0), 0));
            } else {
                reindexBlanks(container);
            }
        };
        return row;
    }

    function reindexBlanks(container) {
        container.querySelectorAll('.blank-row').forEach((row, i) => {
            row.querySelector('strong').textContent = '空格 {{' + (i + 1) + '}}';
        });
    }

    function renderFillBlank(div, q) {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <p class="text-xs text-slate-500 mb-2">題幹中使用 <code>{{1}}</code>、<code>{{2}}</code> 標記空格位置。</p>
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">空格答案</span>
                <button type="button" class="text-sm text-indigo-600 add-blank">+ 新增空格</button>
            </div>
            <div class="blanks-container"></div>`;
        const container = wrap.querySelector('.blanks-container');
        const blanks = q.blanks && q.blanks.length ? q.blanks : [blankFillBlank(0)];
        blanks.forEach((b, i) => container.appendChild(renderBlankRow(b, i)));
        wrap.querySelector('.add-blank').onclick = () => {
            const idx = container.querySelectorAll('.blank-row').length;
            container.appendChild(renderBlankRow(blankFillBlank(idx), idx));
            reindexBlanks(container);
        };
        div.querySelector('.type-fields').innerHTML = '';
        div.querySelector('.type-fields').appendChild(wrap);
    }

    function renderTypeFields(div, q) {
        const type = div.querySelector('.q-type').value;
        q.question_type = type;
        if (type === 'mcq') renderMcqOptions(div, q);
        else if (type === 'short_answer') renderShortAnswer(div, q);
        else if (type === 'long_answer') renderLongAnswer(div, q);
        else if (type === 'fill_blank') renderFillBlank(div, q);
        else if (type === 'true_false') renderTrueFalse(div, q);
    }

    function renderQuestionBlock(q, index, container) {
        const div = document.createElement('div');
        div.className = 'border rounded-xl p-4 mb-4 bg-slate-50 q-block';
        div.dataset.index = String(index);
        const type = q.question_type || 'mcq';
        const typeOptions = QUESTION_TYPES.map(t =>
            `<option value="${t.value}" ${t.value === type ? 'selected' : ''}>${t.label}</option>`
        ).join('');

        div.innerHTML = `
            <div class="flex flex-wrap justify-between gap-2 mb-2">
                <strong>第 ${index + 1} 題</strong>
                <div class="flex items-center gap-2">
                    <select class="q-type border rounded px-2 py-1 text-sm">${typeOptions}</select>
                    <button type="button" class="text-red-600 text-sm remove-q">移除</button>
                </div>
            </div>
            <label class="block text-sm mb-1">題幹（中）</label>
            <textarea class="stem-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeHtml(q.stem_zh)}</textarea>
            <label class="block text-sm mb-1">題幹（英）</label>
            <textarea class="stem-en w-full border rounded p-2 mb-2 text-sm" rows="2">${escapeHtml(q.stem_en)}</textarea>
            <div class="type-fields mb-2"></div>
            <label class="block text-sm mt-2 mb-1">解析（中）</label>
            <textarea class="expl-zh w-full border rounded p-2 text-sm" rows="2">${escapeHtml(q.explanation_zh || '')}</textarea>
            <label class="block text-sm mt-2 mb-1">解析（英）</label>
            <textarea class="expl-en w-full border rounded p-2 text-sm" rows="2">${escapeHtml(q.explanation_en || '')}</textarea>`;

        div.querySelector('.remove-q').onclick = () => div.remove();
        div.querySelector('.q-type').onchange = () => {
            renderTypeFields(div, blankQuestion(div.querySelector('.q-type').value));
        };

        renderTypeFields(div, q);
        container.appendChild(div);
    }

    function collectMcqOptions(div, index) {
        const correctIdx = Array.from(div.querySelectorAll('.correct')).findIndex(r => r.checked);
        return Array.from(div.querySelectorAll('.options > div')).map((row, i) => ({
            text_zh: row.querySelector('.opt-zh').value,
            text_en: row.querySelector('.opt-en').value,
            is_correct: i === correctIdx,
            sort_order: i,
        }));
    }

    function collectParts(div) {
        return Array.from(div.querySelectorAll('.part-row')).map((row, i) => ({
            part_label: PART_LABELS[i] || String(i + 1),
            sort_order: i,
            prompt_zh: row.querySelector('.part-prompt-zh').value,
            prompt_en: row.querySelector('.part-prompt-en').value,
            model_answer_zh: row.querySelector('.part-model-zh').value,
            model_answer_en: row.querySelector('.part-model-en').value,
            marks: row.querySelector('.part-marks').value || null,
        }));
    }

    function collectBlanks(div) {
        return Array.from(div.querySelectorAll('.blank-row')).map((row, i) => ({
            blank_index: i + 1,
            sort_order: i,
            acceptable_answer_zh: row.querySelector('.blank-zh').value,
            acceptable_answer_en: row.querySelector('.blank-en').value,
        }));
    }

    function collectQuestions(container) {
        return Array.from(container.querySelectorAll(':scope > .q-block')).map((div, sort) => {
            const type = div.querySelector('.q-type').value;
            const base = {
                sort_order: sort,
                question_type: type,
                stem_zh: div.querySelector('.stem-zh').value,
                stem_en: div.querySelector('.stem-en').value,
                explanation_zh: div.querySelector('.expl-zh').value,
                explanation_en: div.querySelector('.expl-en').value,
            };
            if (type === 'mcq') {
                base.options = collectMcqOptions(div, sort);
            } else if (type === 'short_answer') {
                base.model_answer_zh = div.querySelector('.model-zh').value;
                base.model_answer_en = div.querySelector('.model-en').value;
            } else if (type === 'long_answer') {
                base.parts = collectParts(div);
            } else if (type === 'fill_blank') {
                base.blanks = collectBlanks(div);
            } else if (type === 'true_false') {
                base.true_false_answer = parseInt(div.querySelector('.tf-answer').value, 10);
            }
            return base;
        });
    }

    function renumberQuestions(container) {
        container.querySelectorAll(':scope > .q-block').forEach((div, i) => {
            div.dataset.index = String(i);
            const title = div.querySelector('strong');
            if (title) title.textContent = '第 ' + (i + 1) + ' 題';
            div.querySelectorAll('.correct').forEach(r => { r.name = 'correct-' + i; });
        });
    }

    global.QbAdmin = {
        QUESTION_TYPES,
        typeLabel,
        blankQuestion,
        renderQuestionBlock,
        collectQuestions,
        renumberQuestions,
    };
})(window);
