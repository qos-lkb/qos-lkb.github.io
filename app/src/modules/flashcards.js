'use strict';
const global = window;

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang } = global.AppRouter;

    function md(text) {
        if (global.AppMarkdown && typeof global.AppMarkdown.renderMarkdownToHtml === 'function') {
            return global.AppMarkdown.renderMarkdownToHtml(text || '');
        }
        return escapeHtml(text || '').replace(/\n/g, '<br>');
    }

    async function enhance(el) {
        if (global.AppMarkdown && typeof global.AppMarkdown.enhanceMarkdown === 'function') {
            await global.AppMarkdown.enhanceMarkdown(el);
        }
    }

    function pick(obj, zhKey, enKey) {
        const lang = getLang();
        if (lang === 'zh') return obj[zhKey] || obj[enKey] || '';
        return obj[enKey] || obj[zhKey] || '';
    }

    async function renderFlashcardsSet(slug) {
        const main = document.getElementById('main-content');
        let set;
        try {
            set = await apiFetch('/flashcard-sets/' + encodeURIComponent(slug) + '?mode=study');
        } catch (e) {
            main.innerHTML = `<p class="text-red-600">${escapeHtml(e.message || t('找不到閃卡組。', 'Flashcard set not found.'))}</p>`;
            return;
        }

        if (global.AppLearningTracker) {
            global.AppLearningTracker.trackContentOpen('flashcard_set', slug, {
                subject_id: set.subject_id,
                topic_id: set.topic_id,
            });
        }

        const title = pick(set, 'title_zh', 'title_en');
        const desc = pick(set, 'description_zh', 'description_en');
        const cards = Array.isArray(set.cards) ? set.cards.slice() : [];
        const user = global.ScienceApi.getUser && global.ScienceApi.getUser();

        let reviews = [];
        if (user) {
            try {
                const r = await apiFetch('/flashcard-sets/' + encodeURIComponent(slug) + '/reviews');
                reviews = r.reviews || [];
            } catch (_e) {
                reviews = [];
            }
        }
        const reviewMap = {};
        reviews.forEach((r) => { reviewMap[Number(r.card_id)] = r; });

        main.innerHTML = `
            <div class="max-w-3xl mx-auto w-full">
                <div id="fc-item-nav"></div>
                <div class="mb-6 pb-4 border-b border-slate-200">
                    <p class="text-xs uppercase tracking-wide text-indigo-600 font-semibold">${escapeHtml(t('閃卡', 'Flashcards'))}</p>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${escapeHtml(title)}</h1>
                    ${desc ? `<p class="text-slate-600 mt-2">${escapeHtml(desc)}</p>` : ''}
                    <p class="text-sm text-slate-500 mt-2">${cards.length} ${escapeHtml(t('張卡片', 'cards'))}</p>
                </div>
                <div id="fc-root"></div>
            </div>`;

        if (global.AppCourse && global.AppCourse.attachItemNav) {
            global.AppCourse.attachItemNav(document.getElementById('fc-item-nav'), 'flashcard_set', slug);
        }

        const root = document.getElementById('fc-root');
        if (!cards.length) {
            root.innerHTML = `<p class="text-slate-500">${escapeHtml(t('此閃卡組尚無卡片。', 'This set has no cards yet.'))}</p>`;
            return;
        }

        showModePicker();

        function showModePicker() {
            const dueCount = cards.filter((c) => {
                const r = reviewMap[Number(c.id)];
                return !r || r.is_due;
            }).length;
            root.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button type="button" id="fc-mode-study" class="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition">
                        <p class="text-lg font-bold text-slate-900">${escapeHtml(t('翻卡複習', 'Flip & review'))}</p>
                        <p class="text-sm text-slate-600 mt-1">${escapeHtml(t('看正面、翻背面，再評「再來／記得／容易」。', 'See the front, flip, then rate Again / Good / Easy.'))}</p>
                        ${user ? `<p class="text-xs text-indigo-600 mt-3">${dueCount} ${escapeHtml(t('張到期', 'due'))}</p>` : ''}
                    </button>
                    <button type="button" id="fc-mode-quiz" class="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition">
                        <p class="text-lg font-bold text-slate-900">${escapeHtml(t('測驗模式', 'Quiz mode'))}</p>
                        <p class="text-sm text-slate-600 mt-1">${escapeHtml(t('四選一或短答，完成後顯示分數。', 'Multiple choice or short answer, then see your score.'))}</p>
                    </button>
                </div>`;
            document.getElementById('fc-mode-study').onclick = () => startStudy();
            document.getElementById('fc-mode-quiz').onclick = () => startQuiz();
        }

        function startStudy() {
            const dueOnly = user && cards.some((c) => {
                const r = reviewMap[Number(c.id)];
                return !r || r.is_due;
            });
            let queue = cards.slice();
            if (dueOnly) {
                const due = cards.filter((c) => {
                    const r = reviewMap[Number(c.id)];
                    return !r || r.is_due;
                });
                if (due.length) queue = due;
            }
            shuffle(queue);
            let idx = 0;
            let revealed = false;
            let rated = 0;

            function renderCard() {
                const card = queue[idx];
                if (!card) {
                    if (global.AppLearningTracker) {
                        global.AppLearningTracker.trackContentComplete('flashcard_set', slug, {
                            subject_id: set.subject_id,
                            topic_id: set.topic_id,
                        });
                    }
                    root.innerHTML = `
                        <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                            <p class="text-xl font-bold text-slate-900">${escapeHtml(t('本輪複習完成', 'Review round complete'))}</p>
                            <p class="text-slate-600 mt-2">${rated} ${escapeHtml(t('張已評等', 'rated'))}</p>
                            <button type="button" id="fc-back-modes" class="mt-6 px-4 py-2 rounded-lg bg-indigo-600 text-white">${escapeHtml(t('返回', 'Back'))}</button>
                        </div>`;
                    document.getElementById('fc-back-modes').onclick = () => {
                        studyActive = false;
                        document.removeEventListener('keydown', onKey);
                        showModePicker();
                    };
                    return;
                }
                revealed = false;
                const front = pick(card, 'front_zh', 'front_en');
                const back = pick(card, 'back_zh', 'back_en');
                const hint = pick(card, 'hint_zh', 'hint_en');
                root.innerHTML = `
                    <p class="text-sm text-slate-500 mb-3">${idx + 1} / ${queue.length}</p>
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[220px] p-6">
                        <p class="text-xs uppercase text-slate-400 mb-2">${escapeHtml(t('正面', 'Front'))}</p>
                        <div id="fc-front" class="prose max-w-none text-lg text-slate-900">${md(front)}</div>
                        ${hint ? `<p class="text-xs text-slate-500 mt-3">${escapeHtml(t('提示：', 'Hint: '))} ${escapeHtml(hint)}</p>` : ''}
                        <div id="fc-back-wrap" class="hidden mt-6 pt-4 border-t border-slate-100">
                            <p class="text-xs uppercase text-slate-400 mb-2">${escapeHtml(t('背面', 'Back'))}</p>
                            <div id="fc-back" class="prose max-w-none text-lg text-slate-900">${md(back)}</div>
                        </div>
                    </div>
                    <div id="fc-actions" class="mt-4 flex flex-wrap gap-2 justify-center">
                        <button type="button" id="fc-reveal" class="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium">${escapeHtml(t('顯示背面（空白鍵）', 'Show back (Space)'))}</button>
                    </div>`;
                void enhance(root);
                document.getElementById('fc-reveal').onclick = reveal;
            }

            function reveal() {
                if (revealed) return;
                revealed = true;
                document.getElementById('fc-back-wrap').classList.remove('hidden');
                document.getElementById('fc-actions').innerHTML = `
                    <button type="button" data-rate="again" class="px-4 py-2 rounded-lg bg-rose-100 text-rose-800 font-medium">1 · ${escapeHtml(t('再來', 'Again'))}</button>
                    <button type="button" data-rate="good" class="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 font-medium">2 · ${escapeHtml(t('記得', 'Good'))}</button>
                    <button type="button" data-rate="easy" class="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 font-medium">3 · ${escapeHtml(t('容易', 'Easy'))}</button>`;
                document.getElementById('fc-actions').querySelectorAll('[data-rate]').forEach((btn) => {
                    btn.onclick = () => rate(btn.getAttribute('data-rate'));
                });
            }

            async function rate(rating) {
                const card = queue[idx];
                rated++;
                if (user) {
                    try {
                        const next = await apiFetch('/flashcard-sets/' + encodeURIComponent(slug) + '/reviews', {
                            method: 'POST',
                            body: { card_id: card.id, rating },
                        });
                        reviewMap[Number(card.id)] = next;
                    } catch (_e) { /* guest-like fallback */ }
                }
                idx++;
                renderCard();
            }

            let studyActive = true;
            function onKey(e) {
                if (!studyActive || !root.isConnected) {
                    document.removeEventListener('keydown', onKey);
                    return;
                }
                if (e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    if (!revealed) reveal();
                } else if (revealed && (e.key === '1' || e.key === '2' || e.key === '3')) {
                    e.preventDefault();
                    rate(e.key === '1' ? 'again' : (e.key === '2' ? 'good' : 'easy'));
                }
            }
            document.addEventListener('keydown', onKey);
            renderCard();
        }

        async function startQuiz() {
            let quizSet;
            try {
                quizSet = await apiFetch('/flashcard-sets/' + encodeURIComponent(slug) + '?mode=quiz');
            } catch (e) {
                root.innerHTML = `<p class="text-red-600">${escapeHtml(e.message)}</p>`;
                return;
            }
            const items = Array.isArray(quizSet.cards) ? quizSet.cards : [];
            if (!items.length) {
                root.innerHTML = `<p class="text-slate-500">${escapeHtml(t('沒有可測驗的卡片。', 'No cards to quiz.'))}</p>`;
                return;
            }
            let qIndex = 0;
            const answers = {};

            function renderQ() {
                const q = items[qIndex];
                if (!q) {
                    void submitQuiz();
                    return;
                }
                const front = pick(q, 'front_zh', 'front_en');
                let body = '';
                if (q.question_type === 'mcq') {
                    body = (q.options || []).map((opt, i) => {
                        const text = pick(opt, 'text_zh', 'text_en');
                        const sel = answers[q.card_id] && answers[q.card_id].selected_card_id === opt.id;
                        return `<button type="button" class="quiz-opt w-full text-left border-2 ${sel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'} rounded-xl p-4 mb-2" data-opt-id="${Number(opt.id)}">
                            <span class="font-bold text-indigo-600 mr-2">${String.fromCharCode(65 + i)}</span>
                            <span class="fc-opt-md">${md(text)}</span>
                        </button>`;
                    }).join('');
                } else {
                    const val = answers[q.card_id] ? (answers[q.card_id].response_text || '') : '';
                    body = `<input id="fc-short" class="w-full border rounded-xl px-3 py-3" value="${escapeHtml(val)}" placeholder="${escapeHtml(t('輸入答案', 'Type the answer'))}">`;
                }
                root.innerHTML = `
                    <p class="text-sm text-slate-500 mb-3">${qIndex + 1} / ${items.length}</p>
                    <div class="bg-white rounded-2xl border border-slate-200 p-6">
                        <div class="prose max-w-none text-lg mb-4">${md(front)}</div>
                        <div id="fc-quiz-body">${body}</div>
                    </div>
                    <div class="mt-4 flex justify-between">
                        <button type="button" id="fc-prev" class="px-3 py-2 border rounded-lg" ${qIndex === 0 ? 'disabled' : ''}>${escapeHtml(t('上一題', 'Previous'))}</button>
                        <button type="button" id="fc-next" class="px-4 py-2 bg-indigo-600 text-white rounded-lg">${escapeHtml(qIndex === items.length - 1 ? t('交卷', 'Submit') : t('下一題', 'Next'))}</button>
                    </div>`;
                void enhance(root);
                root.querySelectorAll('.quiz-opt').forEach((btn) => {
                    btn.onclick = () => {
                        answers[q.card_id] = { card_id: q.card_id, selected_card_id: Number(btn.getAttribute('data-opt-id')) };
                        renderQ();
                    };
                });
                const short = document.getElementById('fc-short');
                if (short) {
                    short.oninput = () => {
                        answers[q.card_id] = { card_id: q.card_id, response_text: short.value };
                    };
                }
                document.getElementById('fc-prev').onclick = () => {
                    if (qIndex > 0) { qIndex--; renderQ(); }
                };
                document.getElementById('fc-next').onclick = () => {
                    if (q.question_type === 'short_answer' && short) {
                        answers[q.card_id] = { card_id: q.card_id, response_text: short.value };
                    }
                    qIndex++;
                    renderQ();
                };
            }

            async function submitQuiz() {
                const responses = items.map((q) => answers[q.card_id] || { card_id: q.card_id, response_text: '' });
                let result;
                try {
                    result = await apiFetch('/flashcard-sets/' + encodeURIComponent(slug) + '/attempts', {
                        method: 'POST',
                        body: { responses },
                    });
                } catch (e) {
                    root.innerHTML = `<p class="text-red-600">${escapeHtml(e.message)}</p>`;
                    return;
                }
                if (global.AppLearningTracker) {
                    global.AppLearningTracker.trackContentComplete('flashcard_set', slug, {
                        subject_id: set.subject_id,
                        topic_id: set.topic_id,
                    });
                }
                const score = Number(result.score || 0);
                const max = Number(result.max_score || items.length);
                const resultMap = {};
                (result.results || []).forEach((r) => { resultMap[Number(r.card_id)] = r; });
                root.innerHTML = `
                    <div class="bg-white rounded-2xl border border-slate-200 p-6">
                        <p class="text-xl font-bold text-slate-900">${escapeHtml(t('得分', 'Score'))}：${score} / ${max}</p>
                        <ul class="mt-4 space-y-3">${items.map((q, i) => {
                            const r = resultMap[Number(q.card_id)];
                            const ok = r && r.is_correct;
                            const ans = r ? pick(r, 'back_zh', 'back_en') : '';
                            return `<li class="border rounded-lg p-3 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}">
                                <p class="text-xs text-slate-500">${i + 1}. ${ok ? escapeHtml(t('正確', 'Correct')) : escapeHtml(t('不正確', 'Incorrect'))}</p>
                                <div class="text-sm mt-1">${md(pick(q, 'front_zh', 'front_en'))}</div>
                                <p class="text-sm mt-1">${escapeHtml(t('答案：', 'Answer: '))} ${escapeHtml(ans)}</p>
                            </li>`;
                        }).join('')}</ul>
                        <button type="button" id="fc-back-modes" class="mt-6 px-4 py-2 rounded-lg bg-indigo-600 text-white">${escapeHtml(t('返回', 'Back'))}</button>
                    </div>`;
                void enhance(root);
                document.getElementById('fc-back-modes').onclick = showModePicker;
            }

            renderQ();
        }
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    global.AppFlashcards = {
        renderFlashcardsSet,
    };

export {};
