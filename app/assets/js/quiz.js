(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;

    const LABELS = ['A', 'B', 'C', 'D'];

    async function renderQuiz(slug) {
        const main = document.getElementById('main-content');
        const tool = await apiFetch('/learning-tools/' + encodeURIComponent(slug));
        const lang = getLang();
        const title = lang === 'zh' ? tool.title_zh : tool.title_en;
        const questions = tool.questions || [];

        let answers = null;
        try {
            answers = await apiFetch('/learning-tools/' + encodeURIComponent(slug) + '/answers');
        } catch (e) {
            answers = null;
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
                    <span class="font-bold text-indigo-600 mr-2">${LABELS[i]}</span>${escapeHtml(text)}
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
            document.getElementById('quiz-submit')?.addEventListener('click', () => {
                submitted = true;
                score = 0;
                questions.forEach(q => {
                    const ans = answerMap[q.id];
                    if (ans && selections[q.id] === ans.correct_option_index) score++;
                });
                document.getElementById('quiz-score').textContent = t(
                    `得分：${score} / ${questions.length}`,
                    `Score: ${score} / ${questions.length}`
                );
                renderQuestion();
            });
        }

        main.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <button type="button" id="quiz-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回列表', 'Back to list')}</button>
                <h1 class="text-2xl font-bold mb-2">${escapeHtml(title)}</h1>
                <p id="quiz-score" class="text-sm text-slate-500 mb-6"></p>
                <div id="quiz-body" class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"></div>
            </div>`;

        document.getElementById('quiz-back').onclick = () => global.AppRouter.navigate('/learning-tools');
        renderQuestion();
    }

    global.AppQuiz = { renderQuiz };
})(window);
