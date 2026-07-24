'use strict';
const global = window;

    const EMBED_TOKEN = '\uE000EMBED';
    const MCQ_LABELS = ['A', 'B', 'C', 'D'];

    const cache = {
        video: Object.create(null),
        simulation: Object.create(null),
        article: Object.create(null),
        questionBank: Object.create(null),
    };

    const answerRegistry = Object.create(null);
    let embedCounter = 0;
    /** @type {{state?:string,savedResponses?:object[]} | null} */
    let worksheetCtx = null;

    function setWorksheetContext(ctx) {
        worksheetCtx = ctx
            ? {
                state: ctx.state || 'editable',
                savedResponses: Array.isArray(ctx.savedResponses) ? ctx.savedResponses : [],
            }
            : null;
    }

    function worksheetState() {
        return worksheetCtx ? worksheetCtx.state : null;
    }

    function isWorksheetMode() {
        return !!worksheetCtx;
    }

    function isAnswerLocked() {
        return worksheetState() === 'graded';
    }

    function shouldRevealResults() {
        return worksheetState() === 'graded';
    }

    function getSavedResponse(bank, questionId, embedKey) {
        const list = worksheetCtx?.savedResponses || [];
        if (!list.length) return null;
        return list.find((r) => r.embed_key && r.embed_key === embedKey)
            || list.find((r) => r.bank === bank && String(r.question_id) === String(questionId))
            || null;
    }

    function resetAnswerRegistry() {
        Object.keys(answerRegistry).forEach((k) => { delete answerRegistry[k]; });
        embedCounter = 0;
    }

    function registerAnswer(key, payload) {
        answerRegistry[key] = payload;
    }

    function collectAnswers(root) {
        const fromDom = collectAnswersFromDom(root);
        if (fromDom.length) return fromDom;
        return Object.values(answerRegistry);
    }

    function collectAnswersFromDom(root) {
        const scope = root || document;
        const answers = [];
        scope.querySelectorAll('.content-embed-question-wrap[data-embed-key]').forEach((node) => {
            const embedKey = node.getAttribute('data-embed-key') || '';
            const bank = node.getAttribute('data-embed-bank') || '';
            const questionId = parseInt(node.getAttribute('data-embed-question-id') || '0', 10);
            const qType = node.getAttribute('data-question-type') || 'mcq';
            const scoreAttr = node.getAttribute('data-embed-score');
            const score = scoreAttr !== null && scoreAttr !== '' ? parseFloat(scoreAttr) : null;
            const base = { embed_key: embedKey, bank, question_id: questionId, score };

            if (qType === 'mcq' || qType === 'true_false') {
                const selectedBtn = node.querySelector('.content-embed-q-opt.selected');
                if (!selectedBtn) return;
                const selected = parseInt(selectedBtn.dataset.opt, 10);
                const isCorrect = node.getAttribute('data-answer-correct') === String(selected);
                answers.push({
                    ...base,
                    question_type: qType,
                    selected_option_index: selected,
                    is_correct: isCorrect,
                    auto_gradable: true,
                });
                return;
            }
            if (qType === 'short_answer') {
                const ta = node.querySelector('.content-embed-q-textarea');
                const text = ta ? ta.value.trim() : '';
                answers.push({
                    ...base,
                    question_type: qType,
                    response_text: text,
                    auto_gradable: false,
                });
                return;
            }
            if (qType === 'long_answer') {
                const parts = Array.from(node.querySelectorAll('.content-embed-q-part .content-embed-q-textarea')).map((ta, i) => ({
                    part_index: parseInt(ta.dataset.part, 10) || i,
                    text: ta.value.trim(),
                }));
                answers.push({
                    ...base,
                    question_type: qType,
                    parts: parts,
                    auto_gradable: false,
                });
                return;
            }
            if (qType === 'fill_blank') {
                const blanks = Array.from(node.querySelectorAll('.content-embed-q-blank-input')).map((inp, i) => ({
                    blank_index: parseInt(inp.dataset.blank, 10) || i,
                    text: inp.value.trim(),
                }));
                answers.push({
                    ...base,
                    question_type: qType,
                    blanks,
                    auto_gradable: false,
                });
            }
        });
        return answers;
    }

    function applySavedResponses(root) {
        if (!root || !worksheetCtx?.savedResponses?.length) return;
        const byKey = Object.create(null);
        const byBankQ = Object.create(null);
        worksheetCtx.savedResponses.forEach((r) => {
            if (r.embed_key) byKey[r.embed_key] = r;
            if (r.bank && r.question_id) byBankQ[r.bank + '#' + r.question_id] = r;
        });
        root.querySelectorAll('.content-embed-question-wrap[data-embed-key]').forEach((node) => {
            const key = node.getAttribute('data-embed-key');
            const bank = node.getAttribute('data-embed-bank');
            const qid = node.getAttribute('data-embed-question-id');
            const resp = (key && byKey[key]) || (bank && qid && byBankQ[bank + '#' + qid]);
            if (!resp) return;
            node._pendingSavedResponse = resp;
        });
    }

    function scoreLabel(score) {
        if (score == null || score === '' || Number.isNaN(parseFloat(score))) return '';
        return t(`${parseFloat(score)} 分`, `${parseFloat(score)} pts`);
    }

    function scoreBadgeHtml(score) {
        const label = scoreLabel(score);
        return label ? `<span class="content-embed-score-badge">${escapeHtml(label)}</span>` : '';
    }

    function t(zh, en) {
        return global.AppRouter && global.AppRouter.t ? global.AppRouter.t(zh, en) : zh;
    }

    function escapeHtml(text) {
        return global.AppRouter && global.AppRouter.escapeHtml
            ? global.AppRouter.escapeHtml(text)
            : String(text).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    function escapeAttr(text) {
        return escapeHtml(text).replace(/"/g, '&quot;');
    }

    function getLang() {
        return global.AppRouter && global.AppRouter.getLang ? global.AppRouter.getLang() : 'zh';
    }

    function parseAttrs(attrStr) {
        const attrs = {};
        String(attrStr || '').replace(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g, (_, key, dq, sq, bare) => {
            attrs[key] = dq ?? sq ?? bare ?? '';
            return '';
        });
        return attrs;
    }

    function protectContentEmbeds(markdown) {
        const store = [];
        const text = String(markdown || '').replace(
            /^::(video|simulation|sim|article|question)\s+([^\n\r]+)\s*$/gm,
            (_, type, attrStr) => {
                const key = store.length;
                store.push({ type: type === 'sim' ? 'simulation' : type, attrs: parseAttrs(attrStr) });
                return EMBED_TOKEN + key + '\uE001\n';
            }
        );
        return { text, store };
    }

    function restoreContentEmbeds(html, store) {
        if (!store || !store.length) return html;
        return html.replace(new RegExp(EMBED_TOKEN + '(\\d+)' + '\uE001', 'g'), (_, i) => {
            const entry = store[parseInt(i, 10)];
            if (!entry) return '';
            const attrs = entry.attrs || {};
            const parts = [`data-embed-type="${escapeHtml(entry.type)}"`];
            if (entry.type === 'question') {
                if (attrs.bank) parts.push(`data-embed-bank="${escapeHtml(attrs.bank)}"`);
                if (attrs.id) parts.push(`data-embed-question-id="${escapeHtml(attrs.id)}"`);
                if (attrs.code) parts.push(`data-embed-question-code="${escapeHtml(attrs.code)}"`);
                if (attrs.index) parts.push(`data-embed-question-index="${escapeHtml(attrs.index)}"`);
                if (attrs.score) parts.push(`data-embed-score="${escapeHtml(attrs.score)}"`);
            } else if (attrs.slug) {
                parts.push(`data-embed-slug="${escapeHtml(attrs.slug)}"`);
            }
            return `<div class="content-embed content-embed-pending my-6" ${parts.join(' ')}></div>`;
        });
    }

    async function apiFetch(path) {
        return global.ScienceApi.apiFetch(path);
    }

    function embedError(msg) {
        return `<div class="content-embed-error">${escapeHtml(msg)}</div>`;
    }

    function embedHeader(icon, title, meta, score) {
        return `<div class="content-embed-header">
            <span class="content-embed-icon" aria-hidden="true">${icon}</span>
            <div class="content-embed-header-text">
                <p class="content-embed-title">${escapeHtml(title)}${scoreBadgeHtml(score)}</p>
                ${meta ? `<p class="content-embed-meta">${escapeHtml(meta)}</p>` : ''}
            </div>
        </div>`;
    }

    function resolveQuestionScore(node, question) {
        const embedScore = node.getAttribute('data-embed-score');
        if (embedScore !== null && embedScore !== '') {
            const parsed = parseFloat(embedScore);
            if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }
        if (question.default_score != null && question.default_score !== '') {
            const parsed = parseFloat(question.default_score);
            if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }
        return null;
    }

    async function fetchVideo(slug) {
        if (cache.video[slug]) return cache.video[slug];
        const data = await apiFetch('/learning-videos/' + encodeURIComponent(slug));
        cache.video[slug] = data;
        return data;
    }

    async function fetchSimulation(slug) {
        if (cache.simulation[slug]) return cache.simulation[slug];
        const data = await apiFetch('/simulations/' + encodeURIComponent(slug));
        cache.simulation[slug] = data;
        return data;
    }

    async function fetchArticle(slug) {
        if (cache.article[slug]) return cache.article[slug];
        const data = await apiFetch('/articles/' + encodeURIComponent(slug));
        cache.article[slug] = data;
        return data;
    }

    async function fetchQuestionBank(bankSlug) {
        if (cache.questionBank[bankSlug]) return cache.questionBank[bankSlug];
        const bank = await apiFetch('/question-banks/' + encodeURIComponent(bankSlug));
        let answers = { answers: [] };
        try {
            answers = await apiFetch('/question-banks/' + encodeURIComponent(bankSlug) + '/answers');
        } catch (e) { /* optional */ }
        const answerMap = {};
        (answers.answers || []).forEach((a) => { answerMap[a.question_id] = a; });
        const pack = { bank, answerMap };
        cache.questionBank[bankSlug] = pack;
        return pack;
    }

    function findQuestion(questions, attrs) {
        if (attrs.id) {
            const id = parseInt(attrs.id, 10);
            return questions.find((q) => q.id === id) || null;
        }
        if (attrs.code) {
            return questions.find((q) => q.question_code === attrs.code) || null;
        }
        if (attrs.index) {
            const idx = parseInt(attrs.index, 10) - 1;
            return idx >= 0 && idx < questions.length ? questions[idx] : null;
        }
        return null;
    }

    function renderStemHtml(stem, format) {
        if (global.AppMarkdown) {
            if (format === 'markdown' && global.AppMarkdown.renderMarkdownToHtml) {
                return global.AppMarkdown.renderMarkdownToHtml(stem || '');
            }
            if (global.AppMarkdown.renderPlainWithMathToHtml) {
                return global.AppMarkdown.renderPlainWithMathToHtml(stem || '');
            }
            if (global.AppMarkdown.renderMarkdownToHtml) {
                return global.AppMarkdown.renderMarkdownToHtml(stem || '');
            }
        }
        return escapeHtml(stem || '').replace(/\n/g, '<br>');
    }

    function renderOptionHtml(text, format) {
        if (global.AppMarkdown) {
            if (format === 'markdown' && global.AppMarkdown.renderMarkdownToHtml) {
                return global.AppMarkdown.renderMarkdownToHtml(text || '');
            }
            if (global.AppMarkdown.renderPlainWithMathToHtml) {
                return global.AppMarkdown.renderPlainWithMathToHtml(text || '');
            }
        }
        return escapeHtml(text || '');
    }

    function enhanceQuestionMath(root) {
        if (!global.AppMarkdown || !root) return;
        if (typeof global.AppMarkdown.typesetMath === 'function') {
            global.AppMarkdown.typesetMath(root);
            return;
        }
        if (typeof global.AppMarkdown.enhanceMarkdown === 'function') {
            global.AppMarkdown.enhanceMarkdown(root);
        }
    }

    function renderQuestionMedia(media) {
        if (!media || !media.length) return '';
        return `<div class="content-embed-q-media">${media.map((m) => {
            const url = m.url || m.file_path || '';
            if (!url) return '';
            if ((m.media_type || m.type) === 'video') {
                return `<video controls class="content-embed-q-media-item" src="${escapeHtml(url)}"></video>`;
            }
            return `<img class="content-embed-q-media-item" src="${escapeHtml(url)}" alt="">`;
        }).join('')}</div>`;
    }

    function bindMcqQuestion(root, question, answer, bankId, meta) {
        const lang = getLang();
        const opts = question.options || [];
        const saved = meta.savedResponse || null;
        let selected = saved && saved.selected_option_index != null ? saved.selected_option_index : null;
        let checked = false;
        const score = meta?.score ?? null;
        const embedKey = meta?.embedKey || '';
        const locked = isAnswerLocked();
        const reveal = shouldRevealResults();

        if (answer && answer.correct_option_index != null) {
            root.setAttribute('data-answer-correct', String(answer.correct_option_index));
        }

        function recordAnswer(isCorrect) {
            if (!embedKey) return;
            registerAnswer(embedKey, {
                embed_key: embedKey,
                bank: meta?.bank || '',
                question_id: question.id,
                question_type: 'mcq',
                score,
                selected_option_index: selected,
                is_correct: !!isCorrect,
                auto_gradable: true,
            });
        }

        function syncRecord() {
            if (selected == null || !answer) return;
            recordAnswer(selected === answer.correct_option_index);
        }

        function render() {
            const stem = lang === 'zh' ? question.stem_zh : question.stem_en;
            const showResult = reveal && selected != null;
            root.innerHTML = `
                ${embedHeader('❓', t('試題庫題目', 'Question bank item'), null, score)}
                <div class="content-embed-question">
                    <div class="content-embed-q-stem prose-article">${renderStemHtml(stem, question.content_format)}</div>
                    ${renderQuestionMedia(question.media)}
                    <div class="content-embed-q-options">
                        ${opts.map((o, i) => {
                            const text = lang === 'zh' ? o.text_zh : o.text_en;
                            let cls = 'content-embed-q-opt';
                            if (showResult) {
                                if (answer && i === answer.correct_option_index) cls += ' correct';
                                else if (selected === i) cls += ' incorrect';
                            } else if (selected === i) cls += ' selected';
                            return `<button type="button" class="${cls}" data-opt="${i}" ${locked ? 'disabled' : ''}>
                                <span class="font-bold text-indigo-600 mr-2">${MCQ_LABELS[i] || i + 1}</span><span class="content-embed-q-opt-text">${renderOptionHtml(text, question.content_format)}</span>
                            </button>`;
                        }).join('')}
                    </div>
                    ${showResult && answer ? renderExplanation(answer, lang) : ''}
                    <div class="content-embed-q-actions">
                        ${!isWorksheetMode() && !checked ? `<button type="button" class="content-embed-q-check px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm" disabled>${t('確認答案', 'Check answer')}</button>` : ''}
                        ${isWorksheetMode() && !locked ? `<p class="text-xs text-slate-500 mt-2">${t('選擇後於上方按「提交習作」送出。', 'Select an option, then submit the assignment above.')}</p>` : ''}
                        <p class="content-embed-q-result text-sm font-medium mt-2 hidden"></p>
                    </div>
                </div>`;

            if (!locked) {
                root.querySelectorAll('.content-embed-q-opt').forEach((btn) => {
                    btn.onclick = () => {
                        selected = parseInt(btn.dataset.opt, 10);
                        root.querySelectorAll('.content-embed-q-opt').forEach((b) => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        if (isWorksheetMode()) {
                            syncRecord();
                            return;
                        }
                        const check = root.querySelector('.content-embed-q-check');
                        if (check) check.disabled = false;
                    };
                });
                if (!isWorksheetMode()) {
                    root.querySelector('.content-embed-q-check')?.addEventListener('click', async () => {
                        checked = true;
                        const correct = answer && selected === answer.correct_option_index;
                        recordAnswer(correct);
                        render();
                        const result = root.querySelector('.content-embed-q-result');
                        if (result) {
                            result.classList.remove('hidden');
                            result.textContent = correct
                                ? t('答對了！', 'Correct!')
                                : t('答錯了，請參考解析。', 'Incorrect. See the explanation.');
                            result.classList.toggle('text-emerald-600', correct);
                            result.classList.toggle('text-red-600', !correct);
                        }
                        if (global.ScienceApi.getUser() && bankId) {
                            try {
                                await apiFetch('/learning/attempts', {
                                    method: 'POST',
                                    body: {
                                        source_type: 'question_bank',
                                        source_id: bankId,
                                        responses: [{ question_id: question.id, selected_option_index: selected }],
                                    },
                                });
                            } catch (e) { /* ignore */ }
                        }
                    });
                }
            }
        }

        render();
        if (selected != null && isWorksheetMode()) syncRecord();
        if (global.AppMarkdown) {
            enhanceQuestionMath(root);
        }
    }

    function renderExplanation(answer, lang) {
        const ex = lang === 'zh' ? answer.explanation_zh : answer.explanation_en;
        if (!ex) return '';
        const html = global.AppMarkdown && global.AppMarkdown.renderPlainWithMathToHtml
            ? global.AppMarkdown.renderPlainWithMathToHtml(ex)
            : escapeHtml(ex);
        return `<div class="content-embed-q-explanation text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded-lg prose-article">${html}</div>`;
    }

    function bindTrueFalseQuestion(root, question, answer, meta) {
        const lang = getLang();
        const saved = meta.savedResponse || null;
        let selected = saved && saved.selected_option_index != null ? saved.selected_option_index : null;
        const correctVal = answer ? answer.true_false_answer : question.true_false_answer;
        const score = meta?.score ?? null;
        const embedKey = meta?.embedKey || '';
        const locked = isAnswerLocked();
        const reveal = shouldRevealResults();

        if (correctVal != null) {
            root.setAttribute('data-answer-correct', String(correctVal));
        }

        function recordAnswer(isCorrect) {
            if (!embedKey) return;
            registerAnswer(embedKey, {
                embed_key: embedKey,
                bank: meta?.bank || '',
                question_id: question.id,
                question_type: 'true_false',
                score,
                selected_option_index: selected,
                is_correct: !!isCorrect,
                auto_gradable: true,
            });
        }

        function render() {
            const stem = lang === 'zh' ? question.stem_zh : question.stem_en;
            const showResult = reveal && selected != null;
            root.innerHTML = `
                ${embedHeader('❓', t('試題庫題目', 'Question bank item'), null, score)}
                <div class="content-embed-question">
                    <div class="content-embed-q-stem prose-article">${renderStemHtml(stem, question.content_format)}</div>
                    ${renderQuestionMedia(question.media)}
                    <div class="content-embed-q-options flex gap-2 flex-wrap">
                        ${[t('是', 'True'), t('否', 'False')].map((label, i) => {
                            let cls = 'content-embed-q-opt';
                            if (showResult) {
                                if (correctVal === i) cls += ' correct';
                                else if (selected === i) cls += ' incorrect';
                            } else if (selected === i) cls += ' selected';
                            return `<button type="button" class="${cls}" data-opt="${i}" ${locked ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
                        }).join('')}
                    </div>
                    ${showResult && answer ? renderExplanation(answer, lang) : ''}
                    ${isWorksheetMode() && !locked ? `<p class="text-xs text-slate-500 mt-2">${t('選擇後於上方按「提交習作」送出。', 'Select an option, then submit the assignment above.')}</p>` : ''}
                    <p class="content-embed-q-result text-sm font-medium mt-2 hidden"></p>
                </div>`;

            if (!locked) {
                root.querySelectorAll('.content-embed-q-opt').forEach((btn) => {
                    btn.onclick = () => {
                        selected = parseInt(btn.dataset.opt, 10);
                        if (isWorksheetMode()) {
                            recordAnswer(selected === correctVal);
                            render();
                            return;
                        }
                        const correct = selected === correctVal;
                        recordAnswer(correct);
                        render();
                        const result = root.querySelector('.content-embed-q-result');
                        if (result) {
                            result.classList.remove('hidden');
                            result.textContent = correct
                                ? t('答對了！', 'Correct!')
                                : t('答錯了，請參考解析。', 'Incorrect. See the explanation.');
                            result.classList.toggle('text-emerald-600', correct);
                            result.classList.toggle('text-red-600', !correct);
                        }
                    };
                });
            }
        }
        render();
        if (selected != null && isWorksheetMode()) recordAnswer(selected === correctVal);
        if (global.AppMarkdown) {
            enhanceQuestionMath(root);
        }
    }

    function bindShortAnswerQuestion(root, question, answer, meta) {
        const lang = getLang();
        const stem = lang === 'zh' ? question.stem_zh : question.stem_en;
        const score = meta?.score ?? null;
        const embedKey = meta?.embedKey || '';
        const saved = meta.savedResponse || null;
        const locked = isAnswerLocked();
        const model = lang === 'zh'
            ? (answer?.model_answer_zh || question.model_answer_zh)
            : (answer?.model_answer_en || question.model_answer_en);
        const savedText = saved?.response_text || '';

        root.innerHTML = `
            ${embedHeader('❓', t('試題庫題目', 'Question bank item'), t('短答題（教師評分）', 'Short answer — teacher graded'), score)}
            <div class="content-embed-question">
                <div class="content-embed-q-stem prose-article">${renderStemHtml(stem, question.content_format)}</div>
                ${renderQuestionMedia(question.media)}
                <textarea class="content-embed-q-textarea w-full border rounded-lg p-3 text-sm min-h-[5rem]" placeholder="${escapeHtml(t('在此作答…', 'Write your answer…'))}" ${locked ? 'readonly' : ''}>${escapeHtml(savedText)}</textarea>
                ${!isWorksheetMode() ? `<button type="button" class="content-embed-q-reveal mt-2 px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm">${t('顯示參考答案', 'Show model answer')}</button>` : ''}
                <div class="content-embed-q-model hidden mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm"></div>
            </div>`;

        const ta = root.querySelector('.content-embed-q-textarea');
        function syncRecord() {
            if (!embedKey || !ta) return;
            registerAnswer(embedKey, {
                embed_key: embedKey,
                bank: meta?.bank || '',
                question_id: question.id,
                question_type: 'short_answer',
                score,
                response_text: ta.value.trim(),
                auto_gradable: false,
            });
        }
        ta?.addEventListener('input', syncRecord);
        syncRecord();

        root.querySelector('.content-embed-q-reveal')?.addEventListener('click', () => {
            const box = root.querySelector('.content-embed-q-model');
            if (!box) return;
            box.classList.remove('hidden');
            box.innerHTML = `<strong>${escapeHtml(t('參考答案', 'Model answer'))}:</strong> ${renderStemHtml(model || '', 'plain')}`;
        });
        if (global.AppMarkdown) {
            enhanceQuestionMath(root);
        }
    }

    function bindLongAnswerQuestion(root, question, answer, meta) {
        const lang = getLang();
        const stem = lang === 'zh' ? question.stem_zh : question.stem_en;
        const score = meta?.score ?? null;
        const embedKey = meta?.embedKey || '';
        const saved = meta.savedResponse || null;
        const locked = isAnswerLocked();
        const parts = question.parts || [];
        const answerParts = answer?.parts || [];
        const savedParts = saved?.parts || [];

        root.innerHTML = `
            ${embedHeader('❓', t('試題庫題目', 'Question bank item'), t('長答題（教師評分）', 'Long answer — teacher graded'), score)}
            <div class="content-embed-question">
                <div class="content-embed-q-stem prose-article">${renderStemHtml(stem, question.content_format)}</div>
                ${renderQuestionMedia(question.media)}
                <div class="content-embed-q-parts space-y-4 mt-4">
                    ${parts.map((p, i) => {
                        const prompt = lang === 'zh' ? p.prompt_zh : p.prompt_en;
                        const label = p.part_label || String.fromCharCode(97 + i);
                        const savedPart = savedParts.find((sp) => sp.part_index === i);
                        const val = savedPart?.text || '';
                        return `<div class="content-embed-q-part border rounded-lg p-3 bg-slate-50">
                            <p class="font-medium mb-2">(${escapeHtml(label)}) ${escapeHtml(prompt)}</p>
                            <textarea class="content-embed-q-textarea w-full border rounded-lg p-2 text-sm min-h-[4rem]" data-part="${i}" ${locked ? 'readonly' : ''}>${escapeHtml(val)}</textarea>
                            ${!isWorksheetMode() ? `<button type="button" class="content-embed-q-reveal-part mt-2 text-sm text-indigo-600 hover:underline" data-part="${i}">${t('顯示參考答案', 'Show model answer')}</button>` : ''}
                            <div class="content-embed-q-model-part hidden mt-2 text-sm text-slate-700"></div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;

        function syncRecord() {
            if (!embedKey) return;
            const partAnswers = Array.from(root.querySelectorAll('.content-embed-q-part .content-embed-q-textarea')).map((ta, i) => ({
                part_index: parseInt(ta.dataset.part, 10) || i,
                text: ta.value.trim(),
            }));
            registerAnswer(embedKey, {
                embed_key: embedKey,
                bank: meta?.bank || '',
                question_id: question.id,
                question_type: 'long_answer',
                score,
                parts: partAnswers,
                auto_gradable: false,
            });
        }
        root.querySelectorAll('.content-embed-q-textarea').forEach((ta) => {
            ta.addEventListener('input', syncRecord);
        });
        syncRecord();

        root.querySelectorAll('.content-embed-q-reveal-part').forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.part, 10);
                const ap = answerParts[i] || parts[i];
                const model = lang === 'zh' ? ap?.model_answer_zh : ap?.model_answer_en;
                const box = btn.parentElement?.querySelector('.content-embed-q-model-part');
                if (box) {
                    box.classList.remove('hidden');
                    box.textContent = (model || '').trim() || t('（無參考答案）', '(No model answer)');
                }
            });
        });
        if (global.AppMarkdown) {
            enhanceQuestionMath(root);
        }
    }

    function bindFillBlankQuestion(root, question, answer, meta) {
        const lang = getLang();
        const stem = lang === 'zh' ? question.stem_zh : question.stem_en;
        const score = meta?.score ?? null;
        const embedKey = meta?.embedKey || '';
        const saved = meta.savedResponse || null;
        const locked = isAnswerLocked();
        const blanks = question.blanks || [];
        const answerBlanks = answer?.blanks || [];
        const savedBlanks = saved?.blanks || [];

        root.innerHTML = `
            ${embedHeader('❓', t('試題庫題目', 'Question bank item'), t('填充題', 'Fill in the blank'), score)}
            <div class="content-embed-question">
                <div class="content-embed-q-stem prose-article">${renderStemHtml(stem, question.content_format)}</div>
                ${renderQuestionMedia(question.media)}
                <div class="content-embed-q-blanks space-y-2 mt-3">
                    ${blanks.map((b, i) => {
                        const savedBlank = savedBlanks.find((sb) => (sb.blank_index ?? i) === (b.blank_index || i + 1) - 1 || sb.blank_index === i);
                        const val = savedBlank?.text || '';
                        return `<label class="block text-sm">
                        <span class="text-slate-600">${t('空格', 'Blank')} ${b.blank_index || i + 1}</span>
                        <input type="text" class="content-embed-q-blank-input w-full border rounded-lg px-3 py-2 mt-1 text-sm" data-blank="${i}" value="${escapeAttr(val)}" ${locked ? 'readonly' : ''}>
                    </label>`;
                    }).join('')}
                </div>
                ${!isWorksheetMode() ? `<button type="button" class="content-embed-q-reveal mt-3 px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm">${t('顯示參考答案', 'Show model answers')}</button>` : ''}
                <div class="content-embed-q-model hidden mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm"></div>
            </div>`;

        function syncRecord() {
            if (!embedKey) return;
            const blankAnswers = Array.from(root.querySelectorAll('.content-embed-q-blank-input')).map((inp, i) => ({
                blank_index: parseInt(inp.dataset.blank, 10) || i,
                text: inp.value.trim(),
            }));
            registerAnswer(embedKey, {
                embed_key: embedKey,
                bank: meta?.bank || '',
                question_id: question.id,
                question_type: 'fill_blank',
                score,
                blanks: blankAnswers,
                auto_gradable: false,
            });
        }
        root.querySelectorAll('.content-embed-q-blank-input').forEach((inp) => {
            inp.addEventListener('input', syncRecord);
        });
        syncRecord();

        root.querySelector('.content-embed-q-reveal')?.addEventListener('click', () => {
            const box = root.querySelector('.content-embed-q-model');
            if (!box) return;
            const lines = blanks.map((b, i) => {
                const ab = answerBlanks[i] || b;
                const ans = lang === 'zh' ? ab.acceptable_answer_zh : ab.acceptable_answer_en;
                return `${t('空格', 'Blank')} ${b.blank_index || i + 1}: ${ans || '—'}`;
            });
            box.classList.remove('hidden');
            box.innerHTML = lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
        });
        if (global.AppMarkdown) {
            enhanceQuestionMath(root);
        }
    }

    async function hydrateQuestionEmbed(node) {
        const bankSlug = node.getAttribute('data-embed-bank');
        if (!bankSlug) {
            node.innerHTML = embedError(t('題目嵌入缺少 bank 屬性。', 'Question embed missing bank attribute.'));
            return;
        }
        const attrs = {
            id: node.getAttribute('data-embed-question-id') || '',
            code: node.getAttribute('data-embed-question-code') || '',
            index: node.getAttribute('data-embed-question-index') || '',
        };
        try {
            const { bank, answerMap } = await fetchQuestionBank(bankSlug);
            const questions = bank.questions || [];
            const question = findQuestion(questions, attrs);
            if (!question) {
                node.innerHTML = embedError(t('找不到指定題目。', 'Question not found.'));
                return;
            }
            const answer = answerMap[question.id] || null;
            node.classList.remove('content-embed-pending');
            node.classList.add('content-embed-question-wrap');
            const embedKey = 'q' + (++embedCounter) + '-' + bankSlug + '-' + question.id;
            node.setAttribute('data-embed-key', embedKey);
            node.setAttribute('data-embed-question-id', String(question.id));
            const score = resolveQuestionScore(node, question);
            const savedResponse = node._pendingSavedResponse
                || getSavedResponse(bankSlug, question.id, embedKey);
            const meta = { embedKey, bank: bankSlug, score, savedResponse };

            const type = question.question_type || 'mcq';
            node.setAttribute('data-question-type', type);
            if (type === 'mcq') bindMcqQuestion(node, question, answer, bank.id, meta);
            else if (type === 'true_false') bindTrueFalseQuestion(node, question, answer, meta);
            else if (type === 'short_answer') bindShortAnswerQuestion(node, question, answer, meta);
            else if (type === 'long_answer') bindLongAnswerQuestion(node, question, answer, meta);
            else if (type === 'fill_blank') bindFillBlankQuestion(node, question, answer, meta);
            else node.innerHTML = embedError(t('不支援的題型。', 'Unsupported question type.'));
        } catch (err) {
            node.innerHTML = embedError(err.message || t('無法載入題目。', 'Could not load question.'));
        }
    }

    function pickVideoEmbed(video, lang) {
        const isEn = lang === 'en';
        return {
            embedUrl: isEn
                ? (video.embed_url_en || video.embed_url_zh || video.embed_url)
                : (video.embed_url_zh || video.embed_url_en || video.embed_url),
            provider: isEn
                ? (video.provider_en || video.provider_zh || video.provider)
                : (video.provider_zh || video.provider_en || video.provider),
        };
    }

    async function hydrateVideoEmbed(node, slug) {
        try {
            const video = await fetchVideo(slug);
            const lang = getLang();
            const title = lang === 'zh' ? video.title_zh : video.title_en;
            const { embedUrl, provider } = pickVideoEmbed(video, lang);
            if (!embedUrl) {
                node.innerHTML = embedError(t('此語言版本尚未提供影片。', 'No video available for this language.'));
                return;
            }
            const providerKey = provider || '';
            const iframeAllow = providerKey === 'facebook'
                ? 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
                : 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            const iframeExtra = providerKey === 'instagram' ? ' scrolling="no"' : '';

            node.classList.remove('content-embed-pending');
            node.classList.add('content-embed-video');
            node.innerHTML = `
                ${embedHeader('▶️', title, video.duration_minutes ? `${video.duration_minutes}${t(' 分鐘', ' min')}` : '')}
                <div class="video-embed-wrap relative w-full rounded-xl overflow-hidden border border-slate-200 bg-black" style="padding-bottom:56.25%;height:0;">
                    <iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(title)}" class="absolute inset-0 w-full h-full" allow="${iframeAllow}" allowfullscreen loading="lazy"${iframeExtra}></iframe>
                </div>`;
        } catch (err) {
            node.innerHTML = embedError(err.message || t('無法載入影片。', 'Could not load video.'));
        }
    }

    async function hydrateSimulationEmbed(node, slug) {
        try {
            const sim = await fetchSimulation(slug);
            const lang = getLang();
            const title = lang === 'zh' ? sim.title_zh : sim.title_en;
            const apiBase = global.ScienceApi.API_BASE || '../api/v1';
            const src = apiBase + '/simulations/' + encodeURIComponent(slug) + '/html';

            node.classList.remove('content-embed-pending');
            node.classList.add('content-embed-simulation');
            node.innerHTML = `
                ${embedHeader('🔬', title, t('模擬實驗', 'Simulation'))}
                <div class="content-embed-sim-frame-wrap">
                    <iframe class="content-embed-sim-frame" src="${escapeHtml(src)}" title="${escapeHtml(title)}" loading="lazy" allowfullscreen></iframe>
                </div>
                <button type="button" class="content-embed-sim-fullscreen mt-2 text-sm text-indigo-600 hover:underline">${t('全螢幕開啟', 'Open fullscreen')}</button>`;

            node.querySelector('.content-embed-sim-fullscreen')?.addEventListener('click', () => {
                if (global.AppCatalog && global.AppCatalog.openModal) {
                    global.AppCatalog.openModal(src);
                } else {
                    window.open(src, '_blank', 'noopener');
                }
            });
        } catch (err) {
            node.innerHTML = embedError(err.message || t('無法載入模擬實驗。', 'Could not load simulation.'));
        }
    }

    async function hydrateArticleEmbed(node, slug) {
        try {
            const article = await fetchArticle(slug);
            const lang = getLang();
            const title = lang === 'zh' ? article.title_zh : article.title_en;
            const body = lang === 'zh' ? article.body_zh : article.body_en;

            node.classList.remove('content-embed-pending');
            node.classList.add('content-embed-article');
            node.innerHTML = `
                ${embedHeader('📰', title, t('科學文章', 'Article'))}
                <article class="content-embed-article-body prose-article">${global.AppMarkdown.renderMarkdownToHtml(body || '')}</article>`;

            await global.AppMarkdown.enhanceMarkdown(node.querySelector('.content-embed-article-body'));
        } catch (err) {
            node.innerHTML = embedError(err.message || t('無法載入文章。', 'Could not load article.'));
        }
    }

    async function hydrateEmbedNode(node) {
        if (!node.classList.contains('content-embed-pending')) return;
        const type = node.getAttribute('data-embed-type');
        const slug = node.getAttribute('data-embed-slug');

        if (type === 'video' && slug) await hydrateVideoEmbed(node, slug);
        else if (type === 'simulation' && slug) await hydrateSimulationEmbed(node, slug);
        else if (type === 'article' && slug) await hydrateArticleEmbed(node, slug);
        else if (type === 'question') await hydrateQuestionEmbed(node);
        else node.innerHTML = embedError(t('嵌入語法無效。', 'Invalid embed directive.'));
    }

    async function hydrate(root) {
        if (!root) return;
        resetAnswerRegistry();
        applySavedResponses(root);
        const nodes = root.querySelectorAll('.content-embed-pending');
        await Promise.all(Array.from(nodes).map((node) => hydrateEmbedNode(node)));
    }

    global.AppContentEmbeds = {
        protect: protectContentEmbeds,
        restore: restoreContentEmbeds,
        hydrate,
        resetAnswerRegistry,
        setWorksheetContext,
        collectAnswers,
        collectAnswersFromDom,
        applySavedResponses,
        insertShortcode(type, attrs) {
            const parts = Object.entries(attrs).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`);
            return `::${type} ${parts.join(' ')}\n`;
        },
    };

export {};
