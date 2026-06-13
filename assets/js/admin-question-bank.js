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

    const DIFFICULTIES = [
        { value: '', label: '—' },
        { value: 'easy', label: '易' },
        { value: 'medium', label: '中' },
        { value: 'hard', label: '難' },
    ];

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function typeLabel(type) {
        const found = QUESTION_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    }

    function getSubjects() {
        return global.QB_SUBJECTS || [];
    }

    function getTopicsMap() {
        return global.TOPICS || {};
    }

    function getBankId() {
        return parseInt(global.EDIT_ID || '0', 10) || 0;
    }

    function getDefaultSubjectId() {
        const el = document.getElementById('subject-id');
        return el && el.value ? el.value : '';
    }

    function getDefaultTopicId() {
        const el = document.getElementById('topic-id');
        return el && el.value ? el.value : '';
    }

    function buildSubjectOptions(selectedId) {
        return getSubjects().map(s =>
            `<option value="${s.id}" ${String(s.id) === String(selectedId || '') ? 'selected' : ''}>${escapeHtml(s.name_zh)}</option>`
        ).join('');
    }

    function buildTopicOptions(subjectId, selectedId) {
        const topics = getTopicsMap()[subjectId] || [];
        let html = '<option value="">—</option>';
        topics.forEach(t => {
            html += `<option value="${t.id}" ${String(t.id) === String(selectedId || '') ? 'selected' : ''}>${escapeHtml(t.name_zh)}</option>`;
        });
        return html;
    }

    function wireTopicSelect(subjectSelect, topicSelect) {
        subjectSelect.onchange = () => {
            topicSelect.innerHTML = buildTopicOptions(subjectSelect.value, '');
        };
    }

    function typesetPreview(el) {
        if (!el) return;
        if (global.MathJax && typeof global.MathJax.typesetPromise === 'function') {
            global.MathJax.typesetPromise([el]).catch(() => {});
        }
    }

    function insertAtCursor(textarea, text) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        textarea.value = val.slice(0, start) + text + val.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }

    function renderRichField(label, className, value, opts) {
        opts = opts || {};
        const rows = opts.rows || 3;
        const hint = opts.hint || '支援 $E=mc^2$ 行內公式、$$\\frac{a}{b}$$ 區塊公式，以及 ![](url) 嵌入圖片。';
        return `
            <div class="rich-field mb-2">
                <div class="flex flex-wrap justify-between items-center gap-2 mb-1">
                    <label class="block text-sm">${escapeHtml(label)}</label>
                    <div class="flex gap-2">
                        ${opts.upload ? `<button type="button" class="upload-img text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50" data-target="${className}">上載圖片</button>` : ''}
                        <button type="button" class="preview-math text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50" data-target="${className}">預覽</button>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mb-1">${hint}</p>
                <textarea class="${className} w-full border rounded p-2 text-sm font-mono" rows="${rows}">${escapeHtml(value)}</textarea>
                <div class="math-preview hidden mt-2 p-3 border rounded bg-white text-sm prose max-w-none"></div>
            </div>`;
    }

    function bindRichFieldEvents(div) {
        div.querySelectorAll('.preview-math').forEach(btn => {
            btn.onclick = () => {
                const cls = btn.dataset.target;
                const ta = div.querySelector('.' + cls);
                const preview = btn.closest('.rich-field').querySelector('.math-preview');
                if (!ta || !preview) return;
                preview.classList.remove('hidden');
                preview.innerHTML = ta.value.replace(/\n/g, '<br>');
                typesetPreview(preview);
            };
        });

        div.querySelectorAll('.upload-img').forEach(btn => {
            btn.onclick = () => {
                const bankId = getBankId();
                const qId = parseInt(div.dataset.questionId || '0', 10);
                if (!bankId) {
                    alert('請先儲存試題集，再上載圖片。');
                    return;
                }
                if (!qId) {
                    alert('請先儲存試題集以取得題目 ID，再上載圖片。');
                    return;
                }
                const cls = btn.dataset.target;
                const ta = div.querySelector('.' + cls);
                if (!ta) return;
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/jpeg,image/png,image/gif,image/webp';
                input.onchange = async () => {
                    const file = input.files && input.files[0];
                    if (!file) return;
                    try {
                        const media = await uploadMedia(bankId, qId, file);
                        insertAtCursor(ta, (media.markdown || '') + '\n');
                        if (!div._mediaList) div._mediaList = [];
                        div._mediaList.push(media);
                        renderMediaList(div, div._mediaList);
                    } catch (e) {
                        alert(e.message || '上載失敗');
                    }
                };
                input.click();
            };
        });
    }

    async function uploadMedia(bankId, questionId, file) {
        const fd = new FormData();
        fd.append('question_id', String(questionId));
        fd.append('file', file);
        fd.append('media_role', 'stem');
        const csrf = global.AdminApi && global.AdminApi.getCsrfToken ? global.AdminApi.getCsrfToken() : '';
        const headers = { Accept: 'application/json' };
        if (csrf) headers['X-CSRF-Token'] = csrf;
        const res = await fetch('../api/v1/admin/question-banks/' + bankId + '/media', {
            method: 'POST',
            credentials: 'same-origin',
            headers,
            body: fd,
        });
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error?.message || '上載失敗');
        }
        return json.data;
    }

    function renderMediaList(div, media) {
        div._mediaList = media || [];
        let box = div.querySelector('.media-list');
        if (!box) {
            box = document.createElement('div');
            box.className = 'media-list mt-2 flex flex-wrap gap-2';
            const anchor = div.querySelector('.type-fields') || div.querySelector('.expl-en')?.closest('.rich-field') || div;
            anchor.parentElement.insertBefore(box, anchor.nextSibling);
        }
        box.innerHTML = '';
        (media || []).forEach(m => {
            const chip = document.createElement('div');
            chip.className = 'inline-flex items-center gap-1 text-xs border rounded px-2 py-1 bg-white';
            chip.innerHTML = `<img src="${escapeHtml(m.url)}" alt="" class="h-8 w-8 object-cover rounded"> <span>${escapeHtml(m.original_name || 'image')}</span>`;
            box.appendChild(chip);
        });
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
            question_code: '',
            subject_id: getDefaultSubjectId(),
            topic_id: getDefaultTopicId(),
            difficulty: '',
            source_zh: '',
            source_en: '',
            content_format: 'markdown',
            stem_zh: '',
            stem_en: '',
            explanation_zh: '',
            explanation_en: '',
            media: [],
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
        optContainer.innerHTML = '<div class="options space-y-3"></div>';
        const box = optContainer.querySelector('.options');
        (q.options || blankMcqOptions()).forEach((o, i) => {
            const row = document.createElement('div');
            row.className = 'border rounded p-2 bg-white';
            row.innerHTML = `
                <div class="flex gap-2 items-start flex-wrap mb-1">
                    <span class="text-xs font-bold pt-2 w-4">${String.fromCharCode(65 + i)}</span>
                    <input type="radio" name="correct-${div.dataset.index}" class="correct mt-2" ${o.is_correct ? 'checked' : ''}>
                    <span class="text-xs text-slate-500 pt-2">正確</span>
                </div>
                <textarea class="opt-zh w-full border rounded p-1 text-sm mb-1" rows="2" placeholder="選項（中）">${escapeHtml(o.text_zh)}</textarea>
                <textarea class="opt-en w-full border rounded p-1 text-sm" rows="2" placeholder="Option EN">${escapeHtml(o.text_en)}</textarea>`;
            box.appendChild(row);
        });
    }

    function renderShortAnswer(div, q) {
        div.querySelector('.type-fields').innerHTML =
            renderRichField('參考答案（中）', 'model-zh', q.model_answer_zh, { rows: 2, upload: false }) +
            renderRichField('參考答案（英）', 'model-en', q.model_answer_en, { rows: 2, upload: false });
        bindRichFieldEvents(div.querySelector('.type-fields'));
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
            <textarea class="part-prompt-zh w-full border rounded p-2 mb-2 text-sm font-mono" rows="2">${escapeHtml(part.prompt_zh)}</textarea>
            <label class="block text-xs mb-1">子題（英）</label>
            <textarea class="part-prompt-en w-full border rounded p-2 mb-2 text-sm font-mono" rows="2">${escapeHtml(part.prompt_en)}</textarea>
            <label class="block text-xs mb-1">參考答案（中）</label>
            <textarea class="part-model-zh w-full border rounded p-2 mb-2 text-sm font-mono" rows="2">${escapeHtml(part.model_answer_zh)}</textarea>
            <label class="block text-xs mb-1">參考答案（英）</label>
            <textarea class="part-model-en w-full border rounded p-2 mb-2 text-sm font-mono" rows="2">${escapeHtml(part.model_answer_en)}</textarea>
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

    function renderMetadataRow(q) {
        const diffOpts = DIFFICULTIES.map(d =>
            `<option value="${d.value}" ${String(q.difficulty || '') === d.value ? 'selected' : ''}>${d.label}</option>`
        ).join('');
        const subjId = q.subject_id || getDefaultSubjectId();
        const topicId = q.topic_id || getDefaultTopicId();
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3 p-3 border rounded-lg bg-white q-meta">
                <div>
                    <label class="block text-xs mb-1">題目代號</label>
                    <input class="q-code w-full border rounded p-2 text-sm font-mono" placeholder="如 PHY-01-001" value="${escapeHtml(q.question_code || '')}">
                </div>
                <div>
                    <label class="block text-xs mb-1">科目 <span class="text-red-500">*</span></label>
                    <select class="q-subject w-full border rounded p-2 text-sm">
                        <option value="">—</option>
                        ${buildSubjectOptions(subjId)}
                    </select>
                </div>
                <div>
                    <label class="block text-xs mb-1">課題</label>
                    <select class="q-topic w-full border rounded p-2 text-sm">${buildTopicOptions(subjId, topicId)}</select>
                </div>
                <div>
                    <label class="block text-xs mb-1">難度</label>
                    <select class="q-difficulty w-full border rounded p-2 text-sm">${diffOpts}</select>
                </div>
                <div>
                    <label class="block text-xs mb-1">來源（中）</label>
                    <input class="q-source-zh w-full border rounded p-2 text-sm" placeholder="如 DSE 2023 Q5" value="${escapeHtml(q.source_zh || '')}">
                </div>
                <div>
                    <label class="block text-xs mb-1">來源（英）</label>
                    <input class="q-source-en w-full border rounded p-2 text-sm" value="${escapeHtml(q.source_en || '')}">
                </div>
            </div>`;
    }

    function renderQuestionBlock(q, index, container) {
        const div = document.createElement('div');
        div.className = 'border rounded-xl p-4 mb-4 bg-slate-50 q-block';
        div.dataset.index = String(index);
        if (q.id) div.dataset.questionId = String(q.id);
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
            ${renderMetadataRow(q)}
            ${renderRichField('題幹（中）', 'stem-zh', q.stem_zh, { upload: true })}
            ${renderRichField('題幹（英）', 'stem-en', q.stem_en, { upload: true })}
            <div class="type-fields mb-2"></div>
            ${renderRichField('解析（中）', 'expl-zh', q.explanation_zh || '', { rows: 2, upload: false })}
            ${renderRichField('解析（英）', 'expl-en', q.explanation_en || '', { rows: 2, upload: false })}`;

        const subj = div.querySelector('.q-subject');
        const topic = div.querySelector('.q-topic');
        wireTopicSelect(subj, topic);

        div.querySelector('.remove-q').onclick = () => div.remove();
        div.querySelector('.q-type').onchange = () => {
            const preserved = collectQuestionFromBlock(div);
            preserved.question_type = div.querySelector('.q-type').value;
            const newQ = blankQuestion(preserved.question_type);
            Object.assign(newQ, preserved, { options: undefined, parts: undefined, blanks: undefined });
            if (preserved.question_type === 'mcq') newQ.options = blankMcqOptions();
            renderTypeFields(div, newQ);
        };

        bindRichFieldEvents(div);
        renderTypeFields(div, q);
        renderMediaList(div, q.media || []);
        container.appendChild(div);
    }

    function collectMcqOptions(div) {
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

    function collectQuestionFromBlock(div) {
        const type = div.querySelector('.q-type').value;
        const base = {
            sort_order: parseInt(div.dataset.index, 10) || 0,
            question_type: type,
            question_code: div.querySelector('.q-code')?.value.trim() || '',
            subject_id: div.querySelector('.q-subject')?.value || '',
            topic_id: div.querySelector('.q-topic')?.value || '',
            difficulty: div.querySelector('.q-difficulty')?.value || '',
            source_zh: div.querySelector('.q-source-zh')?.value.trim() || '',
            source_en: div.querySelector('.q-source-en')?.value.trim() || '',
            content_format: 'markdown',
            stem_zh: div.querySelector('.stem-zh').value,
            stem_en: div.querySelector('.stem-en').value,
            explanation_zh: div.querySelector('.expl-zh').value,
            explanation_en: div.querySelector('.expl-en').value,
        };
        const qId = parseInt(div.dataset.questionId || '0', 10);
        if (qId > 0) base.id = qId;
        if (type === 'mcq') base.options = collectMcqOptions(div);
        else if (type === 'short_answer') {
            base.model_answer_zh = div.querySelector('.model-zh')?.value || '';
            base.model_answer_en = div.querySelector('.model-en')?.value || '';
        } else if (type === 'long_answer') base.parts = collectParts(div);
        else if (type === 'fill_blank') base.blanks = collectBlanks(div);
        else if (type === 'true_false') base.true_false_answer = parseInt(div.querySelector('.tf-answer').value, 10);
        return base;
    }

    function collectQuestions(container) {
        return Array.from(container.querySelectorAll(':scope > .q-block')).map((div, sort) => {
            const q = collectQuestionFromBlock(div);
            q.sort_order = sort;
            return q;
        });
    }

    function applySavedQuestionIds(container, questions) {
        const blocks = container.querySelectorAll(':scope > .q-block');
        questions.forEach((q, i) => {
            if (blocks[i] && q.id) {
                blocks[i].dataset.questionId = String(q.id);
            }
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
        DIFFICULTIES,
        typeLabel,
        blankQuestion,
        renderQuestionBlock,
        collectQuestions,
        collectQuestionFromBlock,
        renumberQuestions,
        applySavedQuestionIds,
        uploadMedia,
        typesetPreview,
    };
})(window);
