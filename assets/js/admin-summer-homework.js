(function () {
    'use strict';

    const qBox = document.getElementById('questions');
    if (!qBox || !window.AdminApi) return;

    const TYPE_LABELS = {
        mcq: '選擇題',
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

    function renderExplanationFields(q) {
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <input class="expl-zh w-full border rounded-lg px-3 py-2 text-sm" placeholder="解釋（中，選填）" value="${escapeHtml(q.explanation_zh || '')}">
            <input class="expl-en w-full border rounded-lg px-3 py-2 text-sm" placeholder="解釋（英，選填）" value="${escapeHtml(q.explanation_en || '')}">
        </div>`;
    }

    function renderStemFields(q) {
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <textarea class="stem-zh w-full border rounded-lg px-3 py-2 text-sm" rows="2" placeholder="題幹（中）">${escapeHtml(q.stem_zh)}</textarea>
            <textarea class="stem-en w-full border rounded-lg px-3 py-2 text-sm" rows="2" placeholder="題幹（英）">${escapeHtml(q.stem_en)}</textarea>
        </div>`;
    }

    function renderMcqBody(q, index) {
        const opts = (q.options && q.options.length >= MCQ_MIN) ? q.options : blankMcq().options;
        let html = `<div class="flex items-center gap-3 mb-2">
            <span class="text-xs text-slate-500">選項（${MCQ_MIN}–${MCQ_MAX} 項）</span>
            <button type="button" class="text-xs text-indigo-600 sh-add-opt">+ 選項</button>
            <button type="button" class="text-xs text-slate-600 sh-remove-opt">− 選項</button>
        </div>
        <div class="space-y-2 sh-options">`;
        opts.forEach((o, i) => {
            const isCorrect = o.is_correct === 1 || o.is_correct === '1' || o.is_correct === true;
            html += `<label class="flex items-start gap-2 text-sm bg-white border rounded-lg p-2 sh-opt-row">
                <input type="radio" name="correct-${index}" class="mt-1 is-correct" ${isCorrect ? 'checked' : ''}>
                <span class="font-bold text-indigo-600 w-5 sh-opt-letter">${String.fromCharCode(65 + i)}</span>
                <input class="opt-zh flex-1 border rounded px-2 py-1" placeholder="選項中文" value="${escapeHtml(o.text_zh)}">
                <input class="opt-en flex-1 border rounded px-2 py-1" placeholder="選項英文" value="${escapeHtml(o.text_en)}">
            </label>`;
        });
        html += '</div>';
        return html;
    }

    function renderAnswerRow(ans) {
        return `<div class="flex gap-2 items-center text-sm bg-slate-50 border rounded-lg p-2 sh-answer-row">
            <input class="ans-zh flex-1 border rounded px-2 py-1" placeholder="可接受答案（中）" value="${escapeHtml(ans.acceptable_answer_zh)}">
            <input class="ans-en flex-1 border rounded px-2 py-1" placeholder="可接受答案（英）" value="${escapeHtml(ans.acceptable_answer_en)}">
            <button type="button" class="text-xs text-red-600 sh-remove-answer" title="移除答案">×</button>
        </div>`;
    }

    function renderFillBlankBody(q) {
        const blanks = normalizeFillBlanks(q.blanks);
        let html = '<p class="text-xs text-slate-500 mb-2">題幹中使用 <code>{{1}}</code>、<code>{{2}}</code> 標記空格。</p>';
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
        let html = '<div class="space-y-2 sh-short-answers">';
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <textarea class="rubric-zh w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="評分準則（中）">${escapeHtml(q.rubric_zh || '')}</textarea>
                <textarea class="rubric-en w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="評分準則（英）">${escapeHtml(q.rubric_en || '')}</textarea>
            </div>
            <p class="text-xs text-slate-500">長答題須教師人手評分，不計入自動及格百分比。</p>
        </div>`;
    }

    function getWrapIndex(wrap) {
        return [...qBox.querySelectorAll('.sh-q')].indexOf(wrap);
    }

    function wireMcqHandlers(wrap) {
        const optBox = wrap.querySelector('.sh-options');
        const addBtn = wrap.querySelector('.sh-add-opt');
        const removeBtn = wrap.querySelector('.sh-remove-opt');

        function refreshMcqLetters() {
            optBox.querySelectorAll('.sh-opt-row').forEach((row, i) => {
                const letter = row.querySelector('.sh-opt-letter');
                if (letter) letter.textContent = String.fromCharCode(65 + i);
            });
        }

        function mcqCount() {
            return optBox.querySelectorAll('.sh-opt-row').length;
        }

        addBtn.onclick = () => {
            if (mcqCount() >= MCQ_MAX) return;
            const n = mcqCount();
            const idx = getWrapIndex(wrap);
            const label = document.createElement('label');
            label.className = 'flex items-start gap-2 text-sm bg-white border rounded-lg p-2 sh-opt-row';
            label.innerHTML = `
                <input type="radio" name="correct-${idx}" class="mt-1 is-correct">
                <span class="font-bold text-indigo-600 w-5 sh-opt-letter">${String.fromCharCode(65 + n)}</span>
                <input class="opt-zh flex-1 border rounded px-2 py-1" placeholder="選項中文">
                <input class="opt-en flex-1 border rounded px-2 py-1" placeholder="選項英文">`;
            optBox.appendChild(label);
            refreshMcqLetters();
            updateMcqButtons(wrap);
        };

        removeBtn.onclick = () => {
            if (mcqCount() <= MCQ_MIN) return;
            const rows = optBox.querySelectorAll('.sh-opt-row');
            const last = rows[rows.length - 1];
            const wasCorrect = last.querySelector('.is-correct').checked;
            last.remove();
            if (wasCorrect) {
                const first = optBox.querySelector('.sh-opt-row .is-correct');
                if (first) first.checked = true;
            }
            refreshMcqLetters();
            updateMcqButtons(wrap);
        };

        updateMcqButtons(wrap);
    }

    function updateMcqButtons(wrap) {
        const optBox = wrap.querySelector('.sh-options');
        if (!optBox) return;
        const count = optBox.querySelectorAll('.sh-opt-row').length;
        const addBtn = wrap.querySelector('.sh-add-opt');
        const removeBtn = wrap.querySelector('.sh-remove-opt');
        if (addBtn) addBtn.disabled = count >= MCQ_MAX;
        if (removeBtn) removeBtn.disabled = count <= MCQ_MIN;
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
                div.className = 'flex gap-2 items-center text-sm bg-slate-50 border rounded-lg p-2 sh-answer-row';
                div.innerHTML = `
                    <input class="ans-zh flex-1 border rounded px-2 py-1" placeholder="可接受答案（中）">
                    <input class="ans-en flex-1 border rounded px-2 py-1" placeholder="可接受答案（英）">
                    <button type="button" class="text-xs text-red-600 sh-remove-answer" title="移除答案">×</button>`;
                wireRemoveAnswer(div);
                answersBox.appendChild(div);
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
                div.className = 'flex gap-2 items-center text-sm bg-slate-50 border rounded-lg p-2 sh-answer-row';
                div.innerHTML = `
                    <input class="ans-zh flex-1 border rounded px-2 py-1" placeholder="可接受答案（中）">
                    <input class="ans-en flex-1 border rounded px-2 py-1" placeholder="可接受答案（英）">
                    <button type="button" class="text-xs text-red-600 sh-remove-answer" title="移除答案">×</button>`;
                wireRemoveAnswer(div);
                container.appendChild(div);
            }
        };
    }

    function wireShortAnswerHandlers(wrap) {
        const addBtn = wrap.querySelector('.sh-add-short-answer');
        const box = wrap.querySelector('.sh-short-answers');
        addBtn.onclick = () => {
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center text-sm bg-slate-50 border rounded-lg p-2 sh-answer-row';
            div.innerHTML = `
                <input class="ans-zh flex-1 border rounded px-2 py-1" placeholder="可接受答案（中）">
                <input class="ans-en flex-1 border rounded px-2 py-1" placeholder="可接受答案（英）">
                <button type="button" class="text-xs text-red-600 sh-remove-answer" title="移除答案">×</button>`;
            wireRemoveAnswer(div);
            box.appendChild(div);
        };
        box.querySelectorAll('.sh-answer-row').forEach(wireRemoveAnswer);
    }

    function collectAnswerRows(container) {
        return [...container.querySelectorAll('.sh-answer-row')].map((row) => ({
            acceptable_answer_zh: row.querySelector('.ans-zh').value,
            acceptable_answer_en: row.querySelector('.ans-en').value,
        }));
    }

    function renderQuestion(q, index) {
        const wrap = document.createElement('div');
        wrap.className = 'border border-slate-200 rounded-xl p-4 bg-slate-50/50 sh-q';
        wrap.dataset.type = q.question_type;
        if (q.id) wrap.dataset.qid = String(q.id);

        let body = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-semibold text-slate-500 sh-q-label">題目 ${index + 1} · ${typeLabel(q.question_type)}</span>
                <button type="button" class="text-xs text-red-600 sh-remove">移除</button>
            </div>
            ${renderStemFields(q)}`;

        if (q.question_type === 'mcq') {
            body += renderMcqBody(q, index);
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

        if (q.question_type === 'mcq') wireMcqHandlers(wrap);
        else if (q.question_type === 'fill_blank') wireFillBlankHandlers(wrap);
        else if (q.question_type === 'short_answer') wireShortAnswerHandlers(wrap);

        qBox.appendChild(wrap);
    }

    function renumber() {
        [...qBox.querySelectorAll('.sh-q')].forEach((el, i) => {
            const label = el.querySelector('.sh-q-label');
            if (label) label.textContent = `題目 ${i + 1} · ${typeLabel(el.dataset.type)}`;
            el.querySelectorAll('input[type=radio].is-correct').forEach((r) => {
                r.name = `correct-${i}`;
            });
            el.querySelectorAll('input[type=radio].tf-correct').forEach((r) => {
                r.name = `tf-${i}`;
            });
            if (el.dataset.type === 'mcq') updateMcqButtons(el);
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

            if (type === 'mcq') {
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

    document.getElementById('content-type').onchange = toggleContentType;
    wireAddButton('add-mcq', blankMcq);
    wireAddButton('add-fill', blankFill);
    wireAddButton('add-tf', blankTrueFalse);
    wireAddButton('add-short', blankShortAnswer);
    wireAddButton('add-long', blankLongAnswer);

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
            try {
                const saved = await AdminApi.apiFetch('/admin/summer-homework', {
                    method: 'POST',
                    body: payload,
                });
                const regraded = parseInt(saved.regraded_attempts || '0', 10) || 0;
                let url = 'summer_homework_edit.php?id=' + saved.id;
                if (regraded > 0) {
                    url += '&regraded=' + regraded;
                }
                window.location.href = url;
            } catch (err) {
                const flash = document.getElementById('flash');
                flash.textContent = err.message || '儲存失敗';
                flash.classList.remove('hidden');
                flash.classList.add('text-red-600');
                flash.classList.remove('text-emerald-700');
            }
        };
    })();
})();
