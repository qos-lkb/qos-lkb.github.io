(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;
    const { renderMarkdownToHtml, enhanceMarkdown } = global.AppMarkdown;

    const { attachMarkdownEditor, buildArticlePayload, questionsForArticleSave } = global.AppInlineEdit;

    const LABELS = ['A', 'B', 'C', 'D'];

    async function renderArticle(slug) {
        const main = document.getElementById('main-content');
        const article = await apiFetch('/articles/' + encodeURIComponent(slug));
        const lang = getLang();
        const title = lang === 'zh' ? article.title_zh : article.title_en;
        const body = lang === 'zh' ? article.body_zh : article.body_en;
        const questions = article.questions || [];

        let answers = null;
        try {
            answers = await apiFetch('/articles/' + encodeURIComponent(slug) + '/answers');
        } catch (e) {
            answers = null;
        }
        const answerMap = {};
        if (answers && answers.answers) {
            answers.answers.forEach(a => { answerMap[a.question_id] = a; });
        }

        let selections = {};
        let submitted = false;

        function renderComprehension() {
            const section = document.getElementById('comprehension-section');
            if (!section || !questions.length) return;

            section.innerHTML = `
                <h2 class="text-xl font-bold mt-10 mb-4">${t('閱讀理解', 'Reading Comprehension')}</h2>
                ${questions.map((q, qi) => {
                    const stem = lang === 'zh' ? q.stem_zh : q.stem_en;
                    const opts = q.options || [];
                    return `<div class="mb-8 p-4 bg-slate-50 rounded-xl" data-qid="${q.id}">
                        <p class="font-medium mb-3">${qi + 1}. ${escapeHtml(stem)}</p>
                        ${opts.map((o, i) => {
                            const text = lang === 'zh' ? o.text_zh : o.text_en;
                            let cls = 'quiz-option block w-full text-left border rounded-lg p-3 mb-2 text-sm';
                            if (submitted) {
                                const ans = answerMap[q.id];
                                if (ans && i === ans.correct_option_index) cls += ' correct';
                                else if (selections[q.id] === i) cls += ' incorrect';
                            } else if (selections[q.id] === i) cls += ' selected border-indigo-400 bg-indigo-50';
                            else cls += ' border-slate-200 bg-white';
                            return `<button type="button" class="${cls}" data-q="${q.id}" data-opt="${i}" ${submitted ? 'disabled' : ''}>
                                <span class="font-bold mr-2">${LABELS[i]}</span>${escapeHtml(text)}
                            </button>`;
                        }).join('')}
                        ${submitted && answerMap[q.id] && (lang === 'zh' ? answerMap[q.id].explanation_zh : answerMap[q.id].explanation_en) ?
                            `<p class="text-sm text-slate-600 mt-2">${escapeHtml(lang === 'zh' ? answerMap[q.id].explanation_zh : answerMap[q.id].explanation_en)}</p>` : ''}
                    </div>`;
                }).join('')}
                ${!submitted ? `<button type="button" id="art-submit" class="px-6 py-2 bg-indigo-600 text-white rounded-lg">${t('提交答案', 'Submit answers')}</button>` : ''}
                <p id="art-score" class="mt-4 text-sm font-medium text-slate-700"></p>`;

            if (!submitted) {
                section.querySelectorAll('button[data-q]').forEach(btn => {
                    btn.onclick = () => {
                        selections[parseInt(btn.dataset.q, 10)] = parseInt(btn.dataset.opt, 10);
                        section.querySelectorAll(`button[data-q="${btn.dataset.q}"]`).forEach(b => {
                            b.classList.remove('selected', 'border-indigo-400', 'bg-indigo-50');
                            b.classList.add('border-slate-200', 'bg-white');
                        });
                        btn.classList.add('selected', 'border-indigo-400', 'bg-indigo-50');
                        btn.classList.remove('border-slate-200', 'bg-white');
                    };
                });
                document.getElementById('art-submit').onclick = () => {
                    submitted = true;
                    let score = 0;
                    questions.forEach(q => {
                        const ans = answerMap[q.id];
                        if (ans && selections[q.id] === ans.correct_option_index) score++;
                    });
                    renderComprehension();
                    document.getElementById('art-score').textContent = t(
                        `得分：${score} / ${questions.length}`,
                        `Score: ${score} / ${questions.length}`
                    );
                };
            }
        }

        main.innerHTML = `
            <div class="reading-page" id="art-page">
                <button type="button" id="art-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回文章列表', 'Back to articles')}</button>
                <h1 id="art-title" class="text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                ${article.reading_time_minutes ? `<p class="text-sm text-slate-500 mb-6">${t('約', '~')}${article.reading_time_minutes}${t(' 分鐘閱讀', ' min read')}</p>` : ''}
                <article id="art-body" class="prose-article bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm mb-6">${renderMarkdownToHtml(body)}</article>
                <div id="comprehension-section"></div>
            </div>`;

        document.getElementById('art-back').onclick = () => {
            const back = global.AppCourse && global.AppCourse.isCourseMode()
                ? global.AppCourse.getBackRoute()
                : '/articles';
            global.AppRouter.navigate(back);
        };
        renderComprehension();
        await enhanceMarkdown(main);

        const artPage = document.getElementById('art-page');
        if (global.AppCourse && global.AppCourse.isCourseMode()) {
            global.AppCourse.attachItemNav(artPage, 'article', slug);
        }

        const answerMapForSave = {};
        if (answers && answers.answers) {
            answers.answers.forEach((a) => { answerMapForSave[a.question_id] = a; });
        }

        attachMarkdownEditor({
            type: 'article',
            record: article,
            root: document.getElementById('art-page'),
            titleEl: document.getElementById('art-title'),
            bodyEl: document.getElementById('art-body'),
            buildPayload: (rec) => buildArticlePayload(
                rec,
                questionsForArticleSave(rec.questions || questions, answerMapForSave)
            ),
            onBodyUpdated: async (bodyEl, markdown) => {
                bodyEl.innerHTML = renderMarkdownToHtml(markdown);
                await enhanceMarkdown(main);
            },
        });
    }

    global.AppArticle = { renderArticle };
})(window);
