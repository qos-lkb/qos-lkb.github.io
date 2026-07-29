'use strict';
const global = window;

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;

    const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

    async function renderQuiz(slug) {
        const main = document.getElementById('main-content');
        let bank;
        try {
            bank = await apiFetch('/question-banks/' + encodeURIComponent(slug));
        } catch (e) {
            // Compat: migrated / legacy learning-tools still served under same slug.
            bank = await apiFetch('/learning-tools/' + encodeURIComponent(slug));
        }
        const sourceKind = bank.source_kind === 'learning_tool' ? 'learning_tool' : 'question_bank';
        if (global.AppLearningTracker) {
            global.AppLearningTracker.trackContentOpen(sourceKind, slug, {
                subject_id: bank.subject_id,
                topic_id: bank.topic_id,
            });
        }
        const lang = getLang();
        const title = lang === 'zh' ? bank.title_zh : bank.title_en;
        const questions = (bank.questions || []).filter(q => {
            if (!q.question_type) return true; // legacy LT shape
            return q.question_type === 'mcq';
        }).map(q => ({
            id: q.id,
            stem_zh: q.stem_zh,
            stem_en: q.stem_en,
            options: q.options || [],
        }));

        let answers = null;
        try {
            answers = await apiFetch('/question-banks/' + encodeURIComponent(slug) + '/answers');
        } catch (e) {
            try {
                answers = await apiFetch('/learning-tools/' + encodeURIComponent(slug) + '/answers');
            } catch (e2) {
                answers = null;
            }
        }

        const answerMap = {};
        if (answers && answers.answers) {
            answers.answers.forEach(a => { answerMap[a.question_id] = a; });
        }

        let qIndex = 0;
        let selections = {};
        let submitted = false;
        let score = 0;

        function renderQuestion() {
            const q = questions[qIndex];
            if (!q) return;
            const stem = lang === 'zh' ? q.stem_zh : q.stem_en;
            const opts = q.options || [];

            let optsHtml = opts.map((o, i) => {
                const text = lang === 'zh' ? o.text_zh : o.text_en;
                let cls = 'quiz-option border-2 border-slate-200 rounded-xl p-4 mb-2';
                if (submitted) {
                    const ans = answerMap[q.id];
                    const correctIdx = ans ? ans.correct_option_index : -1;
                    if (i === correctIdx) cls += ' correct';
                    else if (selections[q.id] === i) cls += ' incorrect';
                } else if (selections[q.id] === i) {
                    cls += ' selected';
                }
                return `<button type="button" class="${cls} w-full text-left" data-opt="${i}" ${submitted ? 'disabled' : ''}>
                    <span class="font-bold text-indigo-600 mr-2">${LABELS[i] || (i + 1)}</span>${escapeHtml(text)}
                </button>`;
            }).join('');

            let expl = '';
            if (submitted && answerMap[q.id]) {
                const ex = lang === 'zh' ? answerMap[q.id].explanation_zh : answerMap[q.id].explanation_en;
                if (ex) expl = `<div class="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-700">${escapeHtml(ex)}</div>`;
            }

            document.getElementById('quiz-body').innerHTML = `
                <p class="text-sm text-slate-500 mb-4">${t('第', 'Question ')}${qIndex + 1}${t(' 題，共 ', ' of ')}${questions.length}${t(' 題', '')}</p>
                <h2 class="text-xl font-bold text-slate-900 mb-6">${escapeHtml(stem)}</h2>
                <div id="quiz-options">${optsHtml}</div>
                ${expl}
                <div class="flex gap-3 mt-8">
                    ${qIndex > 0 ? `<button type="button" id="quiz-prev" class="px-4 py-2 border rounded-lg">${t('上一題', 'Previous')}</button>` : ''}
                    ${!submitted && qIndex < questions.length - 1 ? `<button type="button" id="quiz-next" class="px-4 py-2 bg-indigo-600 text-white rounded-lg" disabled>${t('下一題', 'Next')}</button>` : ''}
                    ${!submitted && qIndex === questions.length - 1 ? `<button type="button" id="quiz-submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg" disabled>${t('提交', 'Submit')}</button>` : ''}
                </div>`;

            document.querySelectorAll('#quiz-options button').forEach(btn => {
                if (submitted) return;
                btn.onclick = () => {
                    selections[q.id] = parseInt(btn.dataset.opt, 10);
                    document.querySelectorAll('#quiz-options button').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    const next = document.getElementById('quiz-next');
                    const submit = document.getElementById('quiz-submit');
                    if (next) next.disabled = false;
                    if (submit) submit.disabled = false;
                };
            });

            document.getElementById('quiz-prev')?.addEventListener('click', () => { qIndex--; renderQuestion(); });
            document.getElementById('quiz-next')?.addEventListener('click', () => { qIndex++; renderQuestion(); });
            document.getElementById('quiz-submit')?.addEventListener('click', async () => {
                submitted = true;
                score = 0;
                const responsePayload = [];
                questions.forEach(q => {
                    const ans = answerMap[q.id];
                    const sel = selections[q.id];
                    const correct = ans && sel === ans.correct_option_index;
                    if (correct) score++;
                    responsePayload.push({
                        question_id: q.id,
                        selected_option_index: sel !== undefined ? sel : null,
                    });
                });
                document.getElementById('quiz-score').textContent = t(
                    `得分：${score} / ${questions.length}`,
                    `Score: ${score} / ${questions.length}`
                );
                if (global.ScienceApi.getUser() && bank.id) {
                    try {
                        await apiFetch('/learning/attempts', {
                            method: 'POST',
                            body: {
                                source_type: sourceKind,
                                source_id: bank.id,
                                responses: responsePayload,
                            },
                        });
                        if (global.AppLearningTracker) {
                            global.AppLearningTracker.trackContentComplete(sourceKind, slug, {
                                subject_id: bank.subject_id,
                                topic_id: bank.topic_id,
                            });
                        }
                    } catch (err) {
                        document.getElementById('quiz-score').textContent += t('（未儲存進度）', ' (not saved)');
                    }
                } else if (!global.ScienceApi.getUser()) {
                    document.getElementById('quiz-score').textContent += ' · ' + t('登入以儲存進度', 'Log in to save progress');
                }
                renderQuestion();
            });
        }

        if (!questions.length) {
            main.innerHTML = `
                <div class="max-w-2xl mx-auto">
                    <button type="button" id="quiz-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回列表', 'Back to list')}</button>
                    <h1 class="text-2xl font-bold mb-2">${escapeHtml(title)}</h1>
                    <p class="text-slate-500">${t('此試題庫沒有可作答的四選一題目。', 'This bank has no MCQ items to attempt.')}</p>
                </div>`;
            document.getElementById('quiz-back').onclick = () => {
                const back = global.AppCourse && global.AppCourse.isCourseMode()
                    ? global.AppCourse.getBackRoute()
                    : '/learning-tools';
                global.AppRouter.navigate(back);
            };
            return;
        }

        main.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <button type="button" id="quiz-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回列表', 'Back to list')}</button>
                <h1 class="text-2xl font-bold mb-2">${escapeHtml(title)}</h1>
                <p id="quiz-score" class="text-sm text-slate-500 mb-6"></p>
                <div id="quiz-body" class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"></div>
            </div>`;

        document.getElementById('quiz-back').onclick = () => {
            const back = global.AppCourse && global.AppCourse.isCourseMode()
                ? global.AppCourse.getBackRoute()
                : '/learning-tools';
            global.AppRouter.navigate(back);
        };
        renderQuestion();

        const quizRoot = main.querySelector('.max-w-2xl');
        if (global.AppCourse && global.AppCourse.isCourseMode() && quizRoot) {
            global.AppCourse.attachItemNav(quizRoot, sourceKind === 'learning_tool' ? 'learning_tool' : 'question_bank', slug);
        }
    }

    /**
     * Phase 2: render hydrated adaptive review_wrong payload (MCQ only).
     * @param {{questions?: array, answers?: array, topic_id?: number}} payload
     */
    async function renderReviewWrong(payload) {
        const main = document.getElementById('main-content');
        const lang = getLang();
        const questions = (payload && payload.questions) || [];
        const answers = (payload && payload.answers) || [];
        const topicId = payload && payload.topic_id ? Number(payload.topic_id) : null;

        const answerMap = {};
        answers.forEach((a) => {
            const key = String(a.source_type || '') + ':' + String(a.source_id || '') + ':' + String(a.question_id || '');
            answerMap[key] = a;
            // Also allow lookup by question_id alone when unique enough in this set.
            answerMap[String(a.question_id)] = a;
        });

        function ansFor(q) {
            const key = String(q.source_type || '') + ':' + String(q.source_id || '') + ':' + String(q.id || '');
            return answerMap[key] || answerMap[String(q.id)] || null;
        }

        if (!questions.length) {
            main.innerHTML = `
                <div class="max-w-2xl mx-auto">
                    <button type="button" id="quiz-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回', 'Back')}</button>
                    <p class="text-slate-500">${t('沒有可回顧的錯題。', 'No wrong questions to review.')}</p>
                </div>`;
            document.getElementById('quiz-back').onclick = () => {
                const back = global.AppCourse && global.AppCourse.isCourseMode()
                    ? global.AppCourse.getBackRoute()
                    : '/courses';
                global.AppRouter.navigate(back);
            };
            return;
        }

        let qIndex = 0;
        let selections = {};
        let submitted = false;
        let score = 0;

        function renderQuestion() {
            const q = questions[qIndex];
            if (!q) return;
            const stem = lang === 'zh' ? q.stem_zh : q.stem_en;
            const opts = q.options || [];
            const ans = ansFor(q);

            let optsHtml = opts.map((o, i) => {
                const text = lang === 'zh' ? o.text_zh : o.text_en;
                let cls = 'quiz-option border-2 border-slate-200 rounded-xl p-4 mb-2';
                if (submitted) {
                    const correctIdx = ans ? ans.correct_option_index : -1;
                    if (i === correctIdx) cls += ' correct';
                    else if (selections[qIndex] === i) cls += ' incorrect';
                } else if (selections[qIndex] === i) {
                    cls += ' selected';
                }
                return `<button type="button" class="${cls} w-full text-left" data-opt="${i}" ${submitted ? 'disabled' : ''}>
                    <span class="font-bold text-indigo-600 mr-2">${LABELS[i] || (i + 1)}</span>${escapeHtml(text)}
                </button>`;
            }).join('');

            let expl = '';
            if (submitted && ans) {
                const ex = lang === 'zh' ? ans.explanation_zh : ans.explanation_en;
                if (ex) expl = `<div class="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-700">${escapeHtml(ex)}</div>`;
            }

            document.getElementById('quiz-body').innerHTML = `
                <p class="text-sm text-slate-500 mb-4">${t('第', 'Question ')}${qIndex + 1}${t(' 題，共 ', ' of ')}${questions.length}${t(' 題', '')}</p>
                <h2 class="text-xl font-bold text-slate-900 mb-6">${escapeHtml(stem)}</h2>
                <div id="quiz-options">${optsHtml}</div>
                ${expl}
                <div class="flex gap-3 mt-8">
                    ${qIndex > 0 ? `<button type="button" id="quiz-prev" class="px-4 py-2 border rounded-lg">${t('上一題', 'Previous')}</button>` : ''}
                    ${!submitted && qIndex < questions.length - 1 ? `<button type="button" id="quiz-next" class="px-4 py-2 bg-indigo-600 text-white rounded-lg" disabled>${t('下一題', 'Next')}</button>` : ''}
                    ${!submitted && qIndex === questions.length - 1 ? `<button type="button" id="quiz-submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg" disabled>${t('提交', 'Submit')}</button>` : ''}
                </div>`;

            document.querySelectorAll('#quiz-options button').forEach((btn) => {
                if (submitted) return;
                btn.onclick = () => {
                    selections[qIndex] = parseInt(btn.dataset.opt, 10);
                    document.querySelectorAll('#quiz-options button').forEach((b) => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    const next = document.getElementById('quiz-next');
                    const submit = document.getElementById('quiz-submit');
                    if (next) next.disabled = false;
                    if (submit) submit.disabled = false;
                };
            });

            document.getElementById('quiz-prev')?.addEventListener('click', () => { qIndex--; renderQuestion(); });
            document.getElementById('quiz-next')?.addEventListener('click', () => { qIndex++; renderQuestion(); });
            document.getElementById('quiz-submit')?.addEventListener('click', async () => {
                submitted = true;
                score = 0;
                const bySource = {};
                questions.forEach((qq, idx) => {
                    const a = ansFor(qq);
                    const sel = selections[idx];
                    if (a && sel === a.correct_option_index) score++;
                    const sk = String(qq.source_type || '') + ':' + String(qq.source_id || '');
                    if (!bySource[sk]) {
                        bySource[sk] = {
                            source_type: qq.source_type,
                            source_id: qq.source_id,
                            responses: [],
                        };
                    }
                    bySource[sk].responses.push({
                        question_id: qq.id,
                        selected_option_index: sel !== undefined ? sel : null,
                    });
                });

                document.getElementById('quiz-score').textContent = t(
                    `得分：${score} / ${questions.length}`,
                    `Score: ${score} / ${questions.length}`
                );

                if (global.ScienceApi.getUser()) {
                    try {
                        for (const group of Object.values(bySource)) {
                            await apiFetch('/learning/attempts', {
                                method: 'POST',
                                body: {
                                    source_type: group.source_type,
                                    source_id: group.source_id,
                                    topic_id: topicId || undefined,
                                    responses: group.responses,
                                },
                            });
                        }
                    } catch (err) {
                        document.getElementById('quiz-score').textContent += t('（未儲存進度）', ' (not saved)');
                    }
                } else {
                    document.getElementById('quiz-score').textContent += ' · ' + t('登入以儲存進度', 'Log in to save progress');
                }
                renderQuestion();
            });
        }

        main.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <button type="button" id="quiz-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回課題', 'Back to topic')}</button>
                <h1 class="text-2xl font-bold mb-2">${t('錯題回顧', 'Wrong-answer review')}</h1>
                <p class="text-sm text-slate-500 mb-2">${t('根據你最近的錯題產生。', 'Generated from your recent wrong answers.')}</p>
                <p id="quiz-score" class="text-sm text-slate-500 mb-6"></p>
                <div id="quiz-body" class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"></div>
            </div>`;

        document.getElementById('quiz-back').onclick = () => {
            const back = global.AppCourse && global.AppCourse.isCourseMode()
                ? global.AppCourse.getBackRoute()
                : '/courses';
            global.AppRouter.navigate(back);
        };
        renderQuestion();
    }

    global.AppQuiz = { renderQuiz, renderReviewWrong };

export {};
