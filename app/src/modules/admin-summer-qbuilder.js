'use strict';
const global = window;

    let qBox = null;
    let editId = 0;
    let onSaved = null;
    /** When false, English stem/option/answer fields stay visible but can be collapsed. Default: show bilingual. */
    let showEn = true;

    function apiFetch(path, opts) {
        return global.ScienceApi.apiFetch(path, opts);
    }

    function ensureReady() {
        return !!qBox && !!global.ScienceApi;
    }

    const TYPE_LABELS = {
        mcq: '選擇題',
        multi_select: '多選題',
        fill_blank: '填充題',
        true_false: '是非題',
        short_answer: '短答題',
        long_answer: '長答題',
    };

    const MCQ_MIN = 2;
    const MCQ_MAX = 6;

    function toggleContentType() {
        const type = document.getElementById('content-type').value;
        document.getElementById('passage-fields').classList.toggle('hidden', type !== 'passage');
        document.getElementById('video-fields').classList.toggle('hidden', type !== 'video');
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function typeLabel(type) {
        return TYPE_LABELS[type] || type;
    }

    function typesetPreview(el) {
        if (!el) return;
        if (global.MathJax && typeof global.MathJax.typesetPromise === 'function') {
            global.MathJax.typesetPromise([el]).catch(() => {});
        }
    }

    function insertAtCursor(textarea, text) {
        if (!textarea) return;
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? start;
        const val = textarea.value;
        textarea.value = val.slice(0, start) + text + val.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }

    function enClass() {
        return showEn ? '' : 'hidden';
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
        };
    }

    function blankMultiSelect() {
        const q = blankMcq();
        q.question_type = 'multi_select';
        q.options[0].is_correct = true;
        q.options[1].is_correct = true;
        return q;
    }

    function blankFill() {
        return {
            question_type: 'fill_blank',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
            blanks: [blankFillBlank(0)],
        };
    }

    function blankFillBlank(index) {
        return {
            blank_index: index + 1,
            sort_order: index,
            acceptable_answers: [{ acceptable_answer_zh: '', acceptable_answer_en: '' }],
        };
    }

    function blankTrueFalse() {
        return {
            question_type: 'true_false',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
            correct_bool: true,
        };
    }

    function blankShortAnswer() {
        return {
            question_type: 'short_answer',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
            match_mode: 'exact',
            acceptable_answers: [{ acceptable_answer_zh: '', acceptable_answer_en: '' }],
        };
    }

    function blankLongAnswer() {
        return {
            question_type: 'long_answer',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
            max_score: 5,
            rubric_zh: '',
            rubric_en: '',
        };
    }

    function blankForType(type) {
        if (type === 'fill_blank') return blankFill();
        if (type === 'true_false') return blankTrueFalse();
        if (type === 'short_answer') return blankShortAnswer();
        if (type === 'long_answer') return blankLongAnswer();
        if (type === 'multi_select') return blankMultiSelect();
        return blankMcq();
    }

    function normalizeFillBlanks(blanks) {
        if (!Array.isArray(blanks) || !blanks.length) {
            return [blankFillBlank(0)];
        }
        return blanks.map((b, i) => {
            let answers = b.acceptable_answers;
            if (!Array.isArray(answers) || !answers.length) {
                answers = [{
                    acceptable_answer_zh: b.acceptable_answer_zh || '',
                    acceptable_answer_en: b.acceptable_answer_en || '',
                }];
            }
            return {
                blank_index: b.blank_index || i + 1,
                sort_order: b.sort_order != null ? b.sort_order : i,
                acceptable_answers: answers.map((a) => ({
                    acceptable_answer_zh: a.acceptable_answer_zh || '',
                    acceptable_answer_en: a.acceptable_answer_en || '',
                })),
            };
        });
    }

    function normalizeShortAnswers(answers) {
        if (!Array.isArray(answers) || !answers.length) {
            return [{ acceptable_answer_zh: '', acceptable_answer_en: '' }];
        }
        return answers.map((a) => ({
            acceptable_answer_zh: a.acceptable_answer_zh || '',
            acceptable_answer_en: a.acceptable_answer_en || '',
        }));
    }

    function renderRichTextarea(className, value, placeholder, rows) {
        return `<div class="rich-field">
            <div class="flex justify-end mb-1">
                <button type="button" class="preview-math text-xs px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50" data-target="${className}">預覽</button>
            </div>
            <textarea class="${className} w-full border rounded-lg px-3 py-2 text-sm font-mono" rows="${rows || 2}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
            <div class="math-preview hidden mt-1 p-2 border rounded bg-white text-sm"></div>
        </div>`;
    }

    function renderExplanationFields(q) {
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <div>${renderRichTextarea('expl-zh', q.explanation_zh || '', '解釋（中，選填）', 2)}</div>
            <div class="sh-en-field ${enClass()}">${renderRichTextarea('expl-en', q.explanation_en || '', '解釋（英，選填）', 2)}</div>
        </div>`;
    }

    function renderStemFields(q) {
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div>
                <label class="text-xs text-slate-500 mb-1 block">題幹（中）</label>
                ${renderRichTextarea('stem-zh', q.stem_zh || '', '題幹（中）', 2)}
            </div>
            <div class="sh-en-field ${enClass()}">
                <label class="text-xs text-slate-500 mb-1 block">題幹（英）</label>
                ${renderRichTextarea('stem-en', q.stem_en || '', '題幹（英）', 2)}
            </div>
        </div>`;
    }

    function renderTypeSelect(type) {
        const opts = Object.keys(TYPE_LABELS).map((k) =>
            `<option value="${k}" ${k === type ? 'selected' : ''}>${TYPE_LABELS[k]}</option>`
        ).join('');
        return `<select class="sh-type-select text-xs border rounded px-2 py-1 bg-white">${opts}</select>`;
    }

    function renderMcqBody(q, index, multi) {
        const opts = (q.options && q.options.length >= MCQ_MIN) ? q.options : blankMcq().options;
        const inputType = multi ? 'checkbox' : 'radio';
        let html = `<div class="flex items-center gap-3 mb-2">
            <span class="text-xs text-slate-500">選項（${MCQ_MIN}–${MCQ_MAX} 項）${multi ? ' · 可多選正確答案' : ''}</span>
            <button type="button" class="text-xs text-indigo-600 sh-add-opt">+ 選項</button>
        </div>
        <div class="space-y-2 sh-options">`;
        opts.forEach((o, i) => {
            const isCorrect = o.is_correct === 1 || o.is_correct === '1' || o.is_correct === true;
            html += `<div class="flex items-start gap-2 text-sm bg-white border rounded-lg p-2 sh-opt-row">
                <input type="${inputType}" name="correct-${index}" class="mt-1 is-correct" ${isCorrect ? 'checked' : ''}>
                <span class="font-bold text-indigo-600 w-5 sh-opt-letter">${String.fromCharCode(65 + i)}</span>
                <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1">
                    <input class="opt-zh w-full border rounded px-2 py-1" placeholder="選項中文" value="${escapeHtml(o.text_zh)}">
                    <input class="opt-en w-full border rounded px-2 py-1 sh-en-field ${enClass()}" placeholder="選項英文" value="${escapeHtml(o.text_en)}">
                </div>
                <button type="button" class="text-xs text-red-600 sh-remove-opt-row shrink-0" title="移除此選項">×</button>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    function renderAnswerRow(ans) {
        return `<div class="border rounded-lg p-2 bg-slate-50 sh-answer-row">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs text-slate-500">可接受答案</span>
                <button type="button" class="text-xs text-red-600 sh-remove-answer" title="移除答案">×</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <input class="ans-zh w-full border rounded px-2 py-1" placeholder="中文" value="${escapeHtml(ans.acceptable_answer_zh)}">
                <input class="ans-en w-full border rounded px-2 py-1 sh-en-field ${enClass()}" placeholder="English" value="${escapeHtml(ans.acceptable_answer_en)}">
            </div>
        </div>`;
    }

    function renderFillBlankBody(q) {
        const blanks = normalizeFillBlanks(q.blanks);
        let html = '<p class="text-xs text-slate-500 mb-2">題幹中使用 <code>{{1}}</code>、<code>{{2}}</code> 或 <code>___</code> 標記空格。</p>';
        html += '<div class="space-y-3 sh-blanks">';
        blanks.forEach((b, bi) => {
            html += renderBlankBlock(b, bi);
        });
        html += `<button type="button" class="text-xs text-indigo-600 sh-add-blank">+ 空格</button></div>`;
        return html;
    }

    function renderBlankBlock(blank, bi) {
        const answers = blank.acceptable_answers || [{ acceptable_answer_zh: '', acceptable_answer_en: '' }];
        let html = `<div class="border border-slate-200 rounded-lg p-3 bg-white sh-blank-block" data-blank-index="${bi + 1}">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-semibold text-slate-600 sh-blank-label">空格 ${bi + 1}</span>
                <button type="button" class="text-xs text-red-600 sh-remove-blank">移除空格</button>
            </div>
            <div class="space-y-2 sh-answers">`;
        answers.forEach((ans) => {
            html += renderAnswerRow(ans);
        });
        html += `</div>
            <button type="button" class="text-xs text-indigo-600 mt-2 sh-add-answer">+ 答案</button>
        </div>`;
        return html;
    }

    function renderTrueFalseBody(q, index) {
        const isTrue = q.correct_bool === true || q.correct_bool === 1 || q.correct_bool === '1';
        const isFalse = q.correct_bool === false || q.correct_bool === 0 || q.correct_bool === '0';
        return `<div class="text-sm bg-white border rounded-lg p-3 sh-tf">
            <span class="text-xs text-slate-500 block mb-2">正確答案</span>
            <label class="inline-flex items-center gap-2 mr-4 cursor-pointer">
                <input type="radio" name="tf-${index}" class="tf-correct" value="true" ${isTrue || (!isTrue && !isFalse) ? 'checked' : ''}>
                <span>是</span>
            </label>
            <label class="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tf-${index}" class="tf-correct" value="false" ${isFalse ? 'checked' : ''}>
                <span>否</span>
            </label>
        </div>`;
    }

    function renderShortAnswerBody(q) {
        const answers = normalizeShortAnswers(q.acceptable_answers);
        const mode = q.match_mode === 'contains' ? 'contains' : 'exact';
        let html = `<div class="mb-2">
            <label class="text-xs text-slate-500 mr-2">比對模式</label>
            <select class="match-mode text-xs border rounded px-2 py-1">
                <option value="exact" ${mode === 'exact' ? 'selected' : ''}>完全相符</option>
                <option value="contains" ${mode === 'contains' ? 'selected' : ''}>含關鍵字</option>
            </select>
        </div>`;
        html += '<div class="space-y-2 sh-short-answers">';
        answers.forEach((ans) => {
            html += renderAnswerRow(ans);
        });
        html += '</div>';
        html += '<button type="button" class="text-xs text-indigo-600 mt-2 sh-add-short-answer">+ 答案</button>';
        return html;
    }

    function renderLongAnswerBody(q) {
        const maxScore = q.max_score != null && q.max_score !== '' ? q.max_score : 5;
        return `<div class="space-y-2 sh-long">
            <div>
                <label class="text-xs text-slate-500">滿分</label>
                <input type="number" min="0.5" step="0.5" class="max-score w-24 border rounded-lg px-3 py-2 text-sm mt-1" value="${escapeHtml(maxScore)}">
            </div>
            <div class="space-y-2">
                <div>
                    <label class="text-xs text-slate-500 block mb-1">評分準則（中）</label>
                    <textarea class="rubric-zh w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="評分準則（中）">${escapeHtml(q.rubric_zh || '')}</textarea>
                </div>
                <div class="sh-en-field ${enClass()}">
                    <label class="text-xs text-slate-500 block mb-1">評分準則（英）</label>
                    <textarea class="rubric-en w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="評分準則（英）">${escapeHtml(q.rubric_en || '')}</textarea>
                </div>
            </div>
            <p class="text-xs text-slate-500">長答題須教師人手評分，不計入自動及格百分比。</p>
        </div>`;
    }

    function getWrapIndex(wrap) {
        return [...qBox.querySelectorAll('.sh-q')].indexOf(wrap);
    }

    function bindRichPreview(scope) {
        scope.querySelectorAll('.preview-math').forEach((btn) => {
            btn.onclick = () => {
                const cls = btn.dataset.target;
                const field = btn.closest('.rich-field');
                const ta = field ? field.querySelector('.' + cls) : scope.querySelector('.' + cls);
                const preview = field ? field.querySelector('.math-preview') : null;
                if (!ta || !preview) return;
                preview.classList.remove('hidden');
                const md = global.AppMarkdown && global.AppMarkdown.renderMarkdownToHtml
                    ? global.AppMarkdown.renderMarkdownToHtml(ta.value)
                    : ta.value.replace(/\n/g, '<br>');
                preview.innerHTML = md;
                typesetPreview(preview);
            };
        });
    }

    function wireMcqHandlers(wrap, multi) {
        const optBox = wrap.querySelector('.sh-options');
        const addBtn = wrap.querySelector('.sh-add-opt');

        function refreshMcqLetters() {
            optBox.querySelectorAll('.sh-opt-row').forEach((row, i) => {
                const letter = row.querySelector('.sh-opt-letter');
                if (letter) letter.textContent = String.fromCharCode(65 + i);
            });
        }

        function mcqCount() {
            return optBox.querySelectorAll('.sh-opt-row').length;
        }

        function wireOptRow(row) {
            const rm = row.querySelector('.sh-remove-opt-row');
            if (!rm) return;
            rm.onclick = () => {
                if (mcqCount() <= MCQ_MIN) return;
                const wasCorrect = row.querySelector('.is-correct')?.checked;
                row.remove();
                if (wasCorrect && !multi) {
                    const first = optBox.querySelector('.sh-opt-row .is-correct');
                    if (first) first.checked = true;
                }
                refreshMcqLetters();
                updateMcqButtons(wrap);
            };
        }

        addBtn.onclick = () => {
            if (mcqCount() >= MCQ_MAX) return;
            const n = mcqCount();
            const idx = getWrapIndex(wrap);
            const inputType = multi ? 'checkbox' : 'radio';
            const div = document.createElement('div');
            div.className = 'flex items-start gap-2 text-sm bg-white border rounded-lg p-2 sh-opt-row';
            div.innerHTML = `
                <input type="${inputType}" name="correct-${idx}" class="mt-1 is-correct">
                <span class="font-bold text-indigo-600 w-5 sh-opt-letter">${String.fromCharCode(65 + n)}</span>
                <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1">
                    <input class="opt-zh w-full border rounded px-2 py-1" placeholder="選項中文">
                    <input class="opt-en w-full border rounded px-2 py-1 sh-en-field ${enClass()}" placeholder="選項英文">
                </div>
                <button type="button" class="text-xs text-red-600 sh-remove-opt-row shrink-0" title="移除此選項">×</button>`;
            optBox.appendChild(div);
            wireOptRow(div);
            refreshMcqLetters();
            updateMcqButtons(wrap);
        };

        optBox.querySelectorAll('.sh-opt-row').forEach(wireOptRow);
        updateMcqButtons(wrap);
    }

    function updateMcqButtons(wrap) {
        const optBox = wrap.querySelector('.sh-options');
        if (!optBox) return;
        const count = optBox.querySelectorAll('.sh-opt-row').length;
        const addBtn = wrap.querySelector('.sh-add-opt');
        if (addBtn) addBtn.disabled = count >= MCQ_MAX;
        optBox.querySelectorAll('.sh-remove-opt-row').forEach((btn) => {
            btn.disabled = count <= MCQ_MIN;
            btn.classList.toggle('opacity-40', count <= MCQ_MIN);
        });
    }

    function blankAnswerRowHtml() {
        return `<div class="border rounded-lg p-2 bg-slate-50 sh-answer-row">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs text-slate-500">可接受答案</span>
                <button type="button" class="text-xs text-red-600 sh-remove-answer" title="移除答案">×</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <input class="ans-zh w-full border rounded px-2 py-1" placeholder="中文">
                <input class="ans-en w-full border rounded px-2 py-1 sh-en-field ${enClass()}" placeholder="English">
            </div>
        </div>`;
    }

    function wireFillBlankHandlers(wrap) {
        const blanksBox = wrap.querySelector('.sh-blanks');
        const addBlankBtn = wrap.querySelector('.sh-add-blank');

        function reindexBlanks() {
            blanksBox.querySelectorAll('.sh-blank-block').forEach((block, i) => {
                block.dataset.blankIndex = String(i + 1);
                const label = block.querySelector('.sh-blank-label');
                if (label) label.textContent = `空格 ${i + 1}`;
            });
        }

        function wireBlankBlock(block) {
            block.querySelector('.sh-add-answer').onclick = () => {
                const answersBox = block.querySelector('.sh-answers');
                const div = document.createElement('div');
                div.innerHTML = blankAnswerRowHtml();
                const row = div.firstElementChild;
                wireRemoveAnswer(row);
                answersBox.appendChild(row);
            };

            block.querySelector('.sh-remove-blank').onclick = () => {
                const blocks = blanksBox.querySelectorAll('.sh-blank-block');
                if (blocks.length <= 1) return;
                block.remove();
                reindexBlanks();
            };

            block.querySelectorAll('.sh-answer-row').forEach(wireRemoveAnswer);
        }

        addBlankBtn.onclick = () => {
            const n = blanksBox.querySelectorAll('.sh-blank-block').length;
            const div = document.createElement('div');
            div.innerHTML = renderBlankBlock(blankFillBlank(n), n);
            const block = div.firstElementChild;
            blanksBox.insertBefore(block, addBlankBtn);
            wireBlankBlock(block);
            reindexBlanks();
        };

        blanksBox.querySelectorAll('.sh-blank-block').forEach(wireBlankBlock);
    }

    function wireRemoveAnswer(row) {
        const btn = row.querySelector('.sh-remove-answer');
        if (!btn) return;
        btn.onclick = () => {
            const container = row.parentElement;
            row.remove();
            if (!container.querySelector('.sh-answer-row')) {
                const div = document.createElement('div');
                div.innerHTML = blankAnswerRowHtml();
                const row = div.firstElementChild;
                wireRemoveAnswer(row);
                container.appendChild(row);
            }
        };
    }

    function wireShortAnswerHandlers(wrap) {
        const addBtn = wrap.querySelector('.sh-add-short-answer');
        const box = wrap.querySelector('.sh-short-answers');
        addBtn.onclick = () => {
            const div = document.createElement('div');
            div.innerHTML = blankAnswerRowHtml();
            const row = div.firstElementChild;
            wireRemoveAnswer(row);
            box.appendChild(row);
        };
        box.querySelectorAll('.sh-answer-row').forEach(wireRemoveAnswer);
    }

    function collectAnswerRows(container) {
        return [...container.querySelectorAll('.sh-answer-row')].map((row) => ({
            acceptable_answer_zh: row.querySelector('.ans-zh').value,
            acceptable_answer_en: row.querySelector('.ans-en').value,
        }));
    }

    function moveQuestion(wrap, dir) {
        const sibling = dir < 0 ? wrap.previousElementSibling : wrap.nextElementSibling;
        if (!sibling || !sibling.classList.contains('sh-q')) return;
        if (dir < 0) qBox.insertBefore(wrap, sibling);
        else qBox.insertBefore(sibling, wrap);
        renumber();
    }

    function changeQuestionType(wrap, newType) {
        if (newType === wrap.dataset.type) return;
        if (!confirm('切換題型會清空該題的答案結構（保留題幹與解釋）。確定？')) {
            wrap.querySelector('.sh-type-select').value = wrap.dataset.type;
            return;
        }
        const stemZh = wrap.querySelector('.stem-zh')?.value || '';
        const stemEn = wrap.querySelector('.stem-en')?.value || '';
        const explZh = wrap.querySelector('.expl-zh')?.value || '';
        const explEn = wrap.querySelector('.expl-en')?.value || '';
        const qid = wrap.dataset.qid;
        const fresh = blankForType(newType);
        fresh.stem_zh = stemZh;
        fresh.stem_en = stemEn;
        fresh.explanation_zh = explZh;
        fresh.explanation_en = explEn;
        if (qid) fresh.id = parseInt(qid, 10);
        const idx = getWrapIndex(wrap);
        const next = wrap.nextElementSibling;
        wrap.remove();
        renderQuestion(fresh, idx, next);
        renumber();
    }

    function renderQuestion(q, index, beforeEl) {
        const wrap = document.createElement('div');
        wrap.className = 'border border-slate-200 rounded-xl p-4 bg-slate-50/50 sh-q';
        wrap.dataset.type = q.question_type;
        if (q.id) wrap.dataset.qid = String(q.id);

        let body = `
            <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
                <span class="text-xs font-semibold text-slate-500 sh-q-label">題目 ${index + 1} · ${typeLabel(q.question_type)}</span>
                <div class="flex flex-wrap items-center gap-2">
                    ${renderTypeSelect(q.question_type)}
                    <button type="button" class="text-xs text-slate-600 sh-move-up" title="上移">↑</button>
                    <button type="button" class="text-xs text-slate-600 sh-move-down" title="下移">↓</button>
                    <button type="button" class="text-xs text-red-600 sh-remove">移除</button>
                </div>
            </div>
            ${renderStemFields(q)}`;

        if (q.question_type === 'mcq') {
            body += renderMcqBody(q, index, false);
        } else if (q.question_type === 'multi_select') {
            body += renderMcqBody(q, index, true);
        } else if (q.question_type === 'fill_blank') {
            body += renderFillBlankBody(q);
        } else if (q.question_type === 'true_false') {
            body += renderTrueFalseBody(q, index);
        } else if (q.question_type === 'short_answer') {
            body += renderShortAnswerBody(q);
        } else if (q.question_type === 'long_answer') {
            body += renderLongAnswerBody(q);
        }

        body += renderExplanationFields(q);
        wrap.innerHTML = body;

        wrap.querySelector('.sh-remove').onclick = () => {
            wrap.remove();
            renumber();
        };
        wrap.querySelector('.sh-move-up').onclick = () => moveQuestion(wrap, -1);
        wrap.querySelector('.sh-move-down').onclick = () => moveQuestion(wrap, 1);
        wrap.querySelector('.sh-type-select').onchange = (e) => changeQuestionType(wrap, e.target.value);

        if (q.question_type === 'mcq') wireMcqHandlers(wrap, false);
        else if (q.question_type === 'multi_select') wireMcqHandlers(wrap, true);
        else if (q.question_type === 'fill_blank') wireFillBlankHandlers(wrap);
        else if (q.question_type === 'short_answer') wireShortAnswerHandlers(wrap);

        bindRichPreview(wrap);

        if (beforeEl) qBox.insertBefore(wrap, beforeEl);
        else qBox.appendChild(wrap);
    }

    function applyEnVisibility() {
        if (!qBox) return;
        qBox.querySelectorAll('.sh-en-field').forEach((el) => {
            el.classList.toggle('hidden', !showEn);
        });
        const btn = document.getElementById('sh-toggle-en');
        if (btn) btn.textContent = showEn ? '隱藏英文欄' : '顯示英文欄';
    }

    function renumber() {
        [...qBox.querySelectorAll('.sh-q')].forEach((el, i) => {
            const label = el.querySelector('.sh-q-label');
            if (label) label.textContent = `題目 ${i + 1} · ${typeLabel(el.dataset.type)}`;
            el.querySelectorAll('input.is-correct').forEach((r) => {
                r.name = `correct-${i}`;
            });
            el.querySelectorAll('input[type=radio].tf-correct').forEach((r) => {
                r.name = `tf-${i}`;
            });
            if (el.dataset.type === 'mcq' || el.dataset.type === 'multi_select') updateMcqButtons(el);
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
            const qid = parseInt(el.dataset.qid || '0', 10);
            if (qid > 0) base.id = qid;

            if (type === 'mcq' || type === 'multi_select') {
                base.options = [...el.querySelectorAll('.sh-options .sh-opt-row')].map((row, oi) => ({
                    sort_order: oi,
                    text_zh: row.querySelector('.opt-zh').value,
                    text_en: row.querySelector('.opt-en').value,
                    is_correct: row.querySelector('.is-correct').checked,
                }));
            } else if (type === 'fill_blank') {
                base.blanks = [...el.querySelectorAll('.sh-blank-block')].map((block, bi) => ({
                    blank_index: bi + 1,
                    sort_order: bi,
                    acceptable_answers: collectAnswerRows(block.querySelector('.sh-answers')),
                }));
            } else if (type === 'true_false') {
                const checked = el.querySelector('.tf-correct:checked');
                base.correct_bool = checked ? checked.value === 'true' : true;
            } else if (type === 'short_answer') {
                base.acceptable_answers = collectAnswerRows(el.querySelector('.sh-short-answers'));
                const mm = el.querySelector('.match-mode');
                base.match_mode = mm && mm.value === 'contains' ? 'contains' : 'exact';
            } else if (type === 'long_answer') {
                const maxEl = el.querySelector('.max-score');
                base.max_score = maxEl ? parseFloat(maxEl.value) || 5 : 5;
                base.rubric_zh = el.querySelector('.rubric-zh').value;
                base.rubric_en = el.querySelector('.rubric-en').value;
            }
            return base;
        });
    }

    function wireAddButton(id, factory) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.onclick = () => {
            renderQuestion(factory(), qBox.children.length);
            renumber();
        };
    }

    function wireEnToggle() {
        const btn = document.getElementById('sh-toggle-en');
        if (!btn) return;
        btn.onclick = () => {
            showEn = !showEn;
            applyEnVisibility();
        };
        applyEnVisibility();
    }

    /**
     * Mount summer homework editor onto the current DOM form (#edit-form, #questions, …).
     * @param {{ editId?: number, onSaved?: (saved: object) => void, onError?: (err: Error) => void }} opts
     */
    async function mountSummerHomeworkEditor(opts) {
        opts = opts || {};
        qBox = document.getElementById('questions');
        editId = Number(opts.editId || 0) || 0;
        onSaved = typeof opts.onSaved === 'function' ? opts.onSaved : null;
        showEn = true;
        const onError = typeof opts.onError === 'function' ? opts.onError : null;
        if (!ensureReady()) {
            throw new Error('Summer editor mount failed');
        }
        qBox.innerHTML = '';

        const contentTypeEl = document.getElementById('content-type');
        if (contentTypeEl) contentTypeEl.onchange = toggleContentType;
        wireAddButton('add-mcq', blankMcq);
        wireAddButton('add-multi', blankMultiSelect);
        wireAddButton('add-fill', blankFill);
        wireAddButton('add-tf', blankTrueFalse);
        wireAddButton('add-short', blankShortAnswer);
        wireAddButton('add-long', blankLongAnswer);
        wireEnToggle();

        toggleContentType();
        if (editId) {
            try {
                const detail = await apiFetch('/admin/summer-homework/' + editId);
                document.getElementById('item-id').value = String(detail.id || editId);
                document.getElementById('title-zh').value = detail.title_zh || '';
                document.getElementById('title-en').value = detail.title_en || '';
                document.getElementById('slug').value = detail.slug || '';
                document.getElementById('form-level').value = detail.form_level || '1';
                document.getElementById('content-type').value = detail.content_type || 'passage';
                document.getElementById('pass-percent').value = detail.pass_percent || 80;
                document.getElementById('list-sort').value = detail.list_sort_order || 0;
                document.getElementById('status').value = detail.status || 'draft';
                const dueEl = document.getElementById('due-at');
                if (dueEl && detail.due_at) {
                    dueEl.value = String(detail.due_at).replace(' ', 'T').slice(0, 16);
                }
                const lateEl = document.getElementById('allow-late');
                if (lateEl) lateEl.checked = detail.allow_late_submit !== false && detail.allow_late_submit !== 0;
                document.getElementById('body-zh').value = detail.body_zh || '';
                document.getElementById('body-en').value = detail.body_en || '';
                document.getElementById('video-url').value = detail.video_embed_url || '';
                document.getElementById('video-provider').value = detail.video_provider || 'youtube';
                const refsEl = document.getElementById('content-refs-json');
                if (refsEl) {
                    const refs = detail.content_refs || detail.content_refs_json || [];
                    refsEl.value = typeof refs === 'string' ? refs : JSON.stringify(refs, null, 2);
                }
                toggleContentType();
                (detail.questions || []).forEach((q, i) => renderQuestion(q, i));
                if (!(detail.questions || []).length) renderQuestion(blankMcq(), 0);
                applyEnVisibility();
                return detail;
            } catch (e) {
                if (onError) onError(e);
                throw e;
            }
        }
        renderQuestion(blankMcq(), 0);
        applyEnVisibility();
        return null;
    }

    function bindSummerHomeworkSubmit() {
        const form = document.getElementById('edit-form');
        if (!form) return;
        form.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                form_level: document.getElementById('form-level').value,
                content_type: document.getElementById('content-type').value,
                pass_percent: parseFloat(document.getElementById('pass-percent').value) || 80,
                due_at: document.getElementById('due-at').value || '',
                allow_late_submit: document.getElementById('allow-late').checked ? 1 : 0,
                list_sort_order: parseInt(document.getElementById('list-sort').value, 10) || 0,
                status: document.getElementById('status').value,
                body_zh: document.getElementById('body-zh').value,
                body_en: document.getElementById('body-en').value,
                video_embed_url: document.getElementById('video-url').value,
                video_provider: document.getElementById('video-provider').value,
                questions: collectQuestions(),
            };
            const refsEl = document.getElementById('content-refs-json');
            if (refsEl) {
                try {
                    payload.content_refs = refsEl.value.trim() ? JSON.parse(refsEl.value) : [];
                } catch (err) {
                    alert('內容引用 JSON 格式錯誤');
                    return;
                }
            }
            try {
                const saved = await apiFetch('/admin/summer-homework', {
                    method: 'POST',
                    body: payload,
                });
                if (onSaved) onSaved(saved);
            } catch (err) {
                const flash = document.getElementById('edit-flash') || document.getElementById('flash');
                if (flash) {
                    flash.textContent = err.message || '儲存失敗';
                    flash.classList.remove('hidden');
                    flash.classList.add('text-red-600');
                    flash.classList.remove('text-emerald-700');
                }
                throw err;
            }
        };
    }

    global.AppAdminSummerQBuilder = {
        mount: mountSummerHomeworkEditor,
        bindSubmit: bindSummerHomeworkSubmit,
        collectQuestions,
        insertAtCursor,
        getEditId: () => editId || parseInt(document.getElementById('item-id')?.value || '0', 10) || 0,
    };

export {};
