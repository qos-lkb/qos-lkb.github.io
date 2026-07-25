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

    function topicsForSubject(subjectId) {
        if (!subjectId && subjectId !== 0) {
            return [];
        }
        const map = getTopicsMap();
        const key = String(subjectId);
        return map[key] || map[subjectId] || [];
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
        const topics = topicsForSubject(subjectId);
        let html = '<option value="">—</option>';
        topics.forEach(t => {
            html += `<option value="${t.id}" ${String(t.id) === String(selectedId || '') ? 'selected' : ''}>${escapeHtml(t.name_zh)}</option>`;
        });
        return html;
    }

    function wireTopicSelect(subjectSelect, topicSelect, selectedTopicId) {
        const syncTopics = (topicId) => {
            topicSelect.innerHTML = buildTopicOptions(subjectSelect.value, topicId || '');
        };
        subjectSelect.onchange = () => syncTopics('');
        syncTopics(selectedTopicId);
    }

    function getDetailRow(metaTr) {
        if (metaTr._detailRow) {
            return metaTr._detailRow;
        }
        return metaTr.nextElementSibling && metaTr.nextElementSibling.classList.contains('q-detail-row')
            ? metaTr.nextElementSibling
            : null;
    }

    function getDetailRoot(metaTr) {
        const detailRow = getDetailRow(metaTr);
        return detailRow ? detailRow.querySelector('.q-detail') : null;
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
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(label)}</label>
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

    function bindRichFieldEvents(scope, metaTr) {
        scope.querySelectorAll('.preview-math').forEach(btn => {
            btn.onclick = () => {
                const cls = btn.dataset.target;
                const ta = scope.querySelector('.' + cls);
                const preview = btn.closest('.rich-field').querySelector('.math-preview');
                if (!ta || !preview) return;
                preview.classList.remove('hidden');
                preview.innerHTML = ta.value.replace(/\n/g, '<br>');
                typesetPreview(preview);
            };
        });

        scope.querySelectorAll('.upload-img').forEach(btn => {
            btn.onclick = () => {
                const bankId = getBankId();
                const qId = parseInt(metaTr.dataset.questionId || '0', 10);
                if (!bankId) {
                    alert('請先儲存試題集，再上載圖片。');
                    return;
                }
                if (!qId) {
                    alert('請先儲存試題集以取得題目 ID，再上載圖片。');
                    return;
                }
                const cls = btn.dataset.target;
                const ta = scope.querySelector('.' + cls);
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
                        if (!metaTr._mediaList) metaTr._mediaList = [];
                        metaTr._mediaList.push(media);
                        renderMediaList(scope, metaTr._mediaList);
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
        if (global.ScienceApi && global.ScienceApi.apiFetch) {
            return global.ScienceApi.apiFetch('/admin/question-banks/' + bankId + '/media', {
                method: 'POST',
                body: fd,
            });
        }
        const csrf = global.AdminApi && (global.AdminApi.getCsrfToken || global.AdminApi.getCsrf)
            ? (global.AdminApi.getCsrfToken ? global.AdminApi.getCsrfToken() : global.AdminApi.getCsrf())
            : '';
        const headers = { Accept: 'application/json' };
        if (csrf) headers['X-CSRF-Token'] = csrf;
        const base = (global.ScienceApi && global.ScienceApi.API_BASE) || '../api/v1';
        const res = await fetch(base + '/admin/question-banks/' + bankId + '/media', {
            method: 'POST',
            credentials: 'same-origin',
            headers,
            body: fd,
        });
        const json = await res.json();
        if (!res.ok) {
            throw new Error((json.error && json.error.message) || '上載失敗');
        }
        return json.data;
    }

    function renderMediaList(scope, media) {
        let box = scope.querySelector('.media-list');
        if (!box) {
            box = document.createElement('div');
            box.className = 'media-list mt-2 flex flex-wrap gap-2';
            const anchor = scope.querySelector('.type-fields');
            if (anchor) {
                anchor.parentElement.insertBefore(box, anchor);
            } else {
                scope.appendChild(box);
            }
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
            default_score: '',
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

    function renderMcqOptions(detail, q, metaTr) {
        const optContainer = detail.querySelector('.type-fields');
        optContainer.innerHTML = '<div class="options space-y-3"></div>';
        const box = optContainer.querySelector('.options');
        (q.options || blankMcqOptions()).forEach((o, i) => {
            const row = document.createElement('div');
            row.className = 'border rounded p-2 bg-white';
            const isCorrect = o.is_correct === 1 || o.is_correct === '1' || o.is_correct === true;
            row.innerHTML = `
                <div class="flex gap-2 items-start flex-wrap mb-1">
                    <span class="text-xs font-bold pt-2 w-4">${String.fromCharCode(65 + i)}</span>
                    <input type="radio" name="correct-${metaTr.dataset.index}" class="correct mt-2" ${isCorrect ? 'checked' : ''}>
                    <span class="text-xs text-slate-500 pt-2">正確</span>
                </div>
                <textarea class="opt-zh w-full border rounded p-1 text-sm mb-1" rows="2" placeholder="選項（中）">${escapeHtml(o.text_zh)}</textarea>
                <textarea class="opt-en w-full border rounded p-1 text-sm" rows="2" placeholder="Option EN">${escapeHtml(o.text_en)}</textarea>`;
            box.appendChild(row);
        });
    }

    function renderShortAnswer(detail, q) {
        detail.querySelector('.type-fields').innerHTML =
            renderRichField('參考答案（中）', 'model-zh', q.model_answer_zh, { rows: 2, upload: false }) +
            renderRichField('參考答案（英）', 'model-en', q.model_answer_en, { rows: 2, upload: false });
    }

    function renderTrueFalse(detail, q) {
        const val = q.true_false_answer === 0 || q.true_false_answer === '0' || q.true_false_answer === false ? '0' : '1';
        detail.querySelector('.type-fields').innerHTML = `
            <label class="block text-sm mb-1">正確答案</label>
            <select class="tf-answer w-full max-w-xs border rounded p-2 text-sm">
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

    function renderLongAnswer(detail, q) {
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
        detail.querySelector('.type-fields').innerHTML = '';
        detail.querySelector('.type-fields').appendChild(wrap);
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

    function renderFillBlank(detail, q) {
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
        detail.querySelector('.type-fields').innerHTML = '';
        detail.querySelector('.type-fields').appendChild(wrap);
    }

    function renderTypeFields(metaTr, q) {
        const detail = getDetailRoot(metaTr);
        if (!detail) return;
        const type = metaTr.querySelector('.q-type').value;
        q.question_type = type;
        if (type === 'mcq') renderMcqOptions(detail, q, metaTr);
        else if (type === 'short_answer') renderShortAnswer(detail, q);
        else if (type === 'long_answer') renderLongAnswer(detail, q);
        else if (type === 'fill_blank') renderFillBlank(detail, q);
        else if (type === 'true_false') renderTrueFalse(detail, q);
        if (type === 'short_answer') {
            bindRichFieldEvents(detail.querySelector('.type-fields'), metaTr);
        }
    }

    function buildDetailHtml(q) {
        return `
            ${renderRichField('題幹（中）', 'stem-zh', q.stem_zh, { upload: true })}
            ${renderRichField('題幹（英）', 'stem-en', q.stem_en, { upload: true })}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <div>
                    <label class="block text-xs mb-1 text-slate-600">來源（英）</label>
                    <input class="q-source-en w-full border rounded p-2 text-sm" value="${escapeHtml(q.source_en || '')}">
                </div>
            </div>
            <div class="type-fields mb-2"></div>
            ${renderRichField('解析（中）', 'expl-zh', q.explanation_zh || '', { rows: 2, upload: false })}
            ${renderRichField('解析（英）', 'expl-en', q.explanation_en || '', { rows: 2, upload: false })}`;
    }

    function renderQuestionBlock(q, index, tbody) {
        const metaTr = document.createElement('tr');
        metaTr.className = 'q-meta-row q-block border-t border-slate-100';
        metaTr.dataset.index = String(index);
        if (q.id) metaTr.dataset.questionId = String(q.id);

        const type = q.question_type || 'mcq';
        const typeOptions = QUESTION_TYPES.map(t =>
            `<option value="${t.value}" ${t.value === type ? 'selected' : ''}>${t.label}</option>`
        ).join('');
        const diffOpts = DIFFICULTIES.map(d =>
            `<option value="${d.value}" ${String(q.difficulty || '') === d.value ? 'selected' : ''}>${d.label}</option>`
        ).join('');
        const subjId = q.subject_id || getDefaultSubjectId();
        const topicId = q.topic_id || getDefaultTopicId();

        metaTr.innerHTML = `
            <td class="p-2 text-center font-medium q-num">${index + 1}</td>
            <td class="p-2"><input class="q-code w-full border rounded px-2 py-1 text-xs font-mono" placeholder="PHY-01-001" value="${escapeHtml(q.question_code || '')}"></td>
            <td class="p-2"><select class="q-type w-full border rounded px-1 py-1 text-xs">${typeOptions}</select></td>
            <td class="p-2"><select class="q-subject w-full border rounded px-1 py-1 text-xs"><option value="">—</option>${buildSubjectOptions(subjId)}</select></td>
            <td class="p-2"><select class="q-topic w-full border rounded px-1 py-1 text-xs">${buildTopicOptions(subjId, topicId)}</select></td>
            <td class="p-2"><select class="q-difficulty w-full border rounded px-1 py-1 text-xs">${diffOpts}</select></td>
            <td class="p-2"><input type="number" min="0" step="0.5" class="q-score w-full border rounded px-1 py-1 text-xs" placeholder="—" value="${escapeHtml(q.default_score != null ? q.default_score : '')}"></td>
            <td class="p-2"><input class="q-source-zh w-full border rounded px-2 py-1 text-xs" placeholder="DSE 2023 Q5" value="${escapeHtml(q.source_zh || '')}"></td>
            <td class="p-2 whitespace-nowrap">
                <button type="button" class="toggle-detail text-xs text-indigo-600 hover:underline mr-2">收合</button>
                <button type="button" class="remove-q text-xs text-red-600 hover:underline">移除</button>
            </td>`;

        const detailTr = document.createElement('tr');
        detailTr.className = 'q-detail-row';
        detailTr.innerHTML = `<td colspan="9" class="p-3 bg-slate-50 border-b border-slate-100"><div class="q-detail">${buildDetailHtml(q)}</div></td>`;

        const subj = metaTr.querySelector('.q-subject');
        const topic = metaTr.querySelector('.q-topic');
        wireTopicSelect(subj, topic, topicId);

        metaTr.querySelector('.remove-q').onclick = () => {
            metaTr.remove();
            detailTr.remove();
            renumberQuestions(tbody);
        };

        metaTr.querySelector('.toggle-detail').onclick = () => {
            const collapsed = detailTr.classList.toggle('is-collapsed');
            metaTr.querySelector('.toggle-detail').textContent = collapsed ? '展開' : '收合';
        };

        metaTr.querySelector('.q-type').onchange = () => {
            const preserved = collectQuestionFromBlock(metaTr);
            preserved.question_type = metaTr.querySelector('.q-type').value;
            const newQ = blankQuestion(preserved.question_type);
            Object.assign(newQ, preserved, { options: undefined, parts: undefined, blanks: undefined });
            if (preserved.question_type === 'mcq') newQ.options = blankMcqOptions();
            renderTypeFields(metaTr, newQ);
        };

        metaTr._detailRow = detailTr;
        tbody.appendChild(metaTr);
        tbody.appendChild(detailTr);

        const detail = detailTr.querySelector('.q-detail');
        bindRichFieldEvents(detail, metaTr);
        renderTypeFields(metaTr, q);
        metaTr._mediaList = q.media || [];
        renderMediaList(detail, metaTr._mediaList);
    }

    function collectMcqOptions(detail, index) {
        const correctIdx = Array.from(detail.querySelectorAll('.correct')).findIndex(r => r.checked);
        return Array.from(detail.querySelectorAll('.options > div')).map((row, i) => ({
            text_zh: row.querySelector('.opt-zh').value,
            text_en: row.querySelector('.opt-en').value,
            is_correct: i === correctIdx,
            sort_order: i,
        }));
    }

    function collectParts(detail) {
        return Array.from(detail.querySelectorAll('.part-row')).map((row, i) => ({
            part_label: PART_LABELS[i] || String(i + 1),
            sort_order: i,
            prompt_zh: row.querySelector('.part-prompt-zh').value,
            prompt_en: row.querySelector('.part-prompt-en').value,
            model_answer_zh: row.querySelector('.part-model-zh').value,
            model_answer_en: row.querySelector('.part-model-en').value,
            marks: row.querySelector('.part-marks').value || null,
        }));
    }

    function collectBlanks(detail) {
        return Array.from(detail.querySelectorAll('.blank-row')).map((row, i) => ({
            blank_index: i + 1,
            sort_order: i,
            acceptable_answer_zh: row.querySelector('.blank-zh').value,
            acceptable_answer_en: row.querySelector('.blank-en').value,
        }));
    }

    function collectQuestionFromBlock(metaTr) {
        const detail = getDetailRoot(metaTr);
        const type = metaTr.querySelector('.q-type').value;
        const base = {
            sort_order: parseInt(metaTr.dataset.index, 10) || 0,
            question_type: type,
            question_code: metaTr.querySelector('.q-code')?.value.trim() || '',
            subject_id: metaTr.querySelector('.q-subject')?.value || '',
            topic_id: metaTr.querySelector('.q-topic')?.value || '',
            difficulty: metaTr.querySelector('.q-difficulty')?.value || '',
            default_score: metaTr.querySelector('.q-score')?.value.trim() || '',
            source_zh: metaTr.querySelector('.q-source-zh')?.value.trim() || '',
            source_en: detail?.querySelector('.q-source-en')?.value.trim() || '',
            content_format: 'markdown',
            stem_zh: detail?.querySelector('.stem-zh')?.value || '',
            stem_en: detail?.querySelector('.stem-en')?.value || '',
            explanation_zh: detail?.querySelector('.expl-zh')?.value || '',
            explanation_en: detail?.querySelector('.expl-en')?.value || '',
        };
        const qId = parseInt(metaTr.dataset.questionId || '0', 10);
        if (qId > 0) base.id = qId;
        if (detail) {
            if (type === 'mcq') base.options = collectMcqOptions(detail, metaTr.dataset.index);
            else if (type === 'short_answer') {
                base.model_answer_zh = detail.querySelector('.model-zh')?.value || '';
                base.model_answer_en = detail.querySelector('.model-en')?.value || '';
            } else if (type === 'long_answer') base.parts = collectParts(detail);
            else if (type === 'fill_blank') base.blanks = collectBlanks(detail);
            else if (type === 'true_false') base.true_false_answer = parseInt(detail.querySelector('.tf-answer').value, 10);
        }
        return base;
    }

    function collectQuestions(tbody) {
        return Array.from(tbody.querySelectorAll(':scope > tr.q-meta-row')).map((metaTr, sort) => {
            const q = collectQuestionFromBlock(metaTr);
            q.sort_order = sort;
            return q;
        });
    }

    function applySavedQuestionIds(tbody, questions) {
        const metaRows = tbody.querySelectorAll(':scope > tr.q-meta-row');
        questions.forEach((q, i) => {
            if (metaRows[i] && q.id) {
                metaRows[i].dataset.questionId = String(q.id);
            }
        });
    }

    function renumberQuestions(tbody) {
        tbody.querySelectorAll(':scope > tr.q-meta-row').forEach((metaTr, i) => {
            metaTr.dataset.index = String(i);
            const num = metaTr.querySelector('.q-num');
            if (num) num.textContent = String(i + 1);
            metaTr.querySelectorAll('.correct').forEach(r => { r.name = 'correct-' + i; });
            const detail = getDetailRoot(metaTr);
            if (detail) {
                detail.querySelectorAll('.correct').forEach(r => { r.name = 'correct-' + i; });
            }
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

export {};
