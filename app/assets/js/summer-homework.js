(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;

    function youtubeEmbed(url) {
        if (!url) return '';
        if (url.includes('youtube.com/embed/') || url.includes('youtu.be/') || url.includes('youtube-nocookie.com')) {
            let src = url;
            if (url.includes('youtu.be/')) {
                const id = url.split('youtu.be/')[1].split(/[?&]/)[0];
                src = 'https://www.youtube-nocookie.com/embed/' + id;
            } else if (url.includes('watch?v=')) {
                const id = new URL(url).searchParams.get('v');
                src = 'https://www.youtube-nocookie.com/embed/' + id;
            }
            return `<div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-6">
                <iframe class="w-full h-full" src="${escapeHtml(src)}" title="video" allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
            </div>`;
        }
        return `<div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-6">
            <iframe class="w-full h-full" src="${escapeHtml(url)}" title="video" allowfullscreen></iframe>
        </div>`;
    }

    function renderMarkdown(md) {
        if (global.AppMarkdown && AppMarkdown.renderMarkdownToHtml) {
            return AppMarkdown.renderMarkdownToHtml(md || '');
        }
        if (global.marked && global.DOMPurify) {
            return DOMPurify.sanitize(marked.parse(md || ''));
        }
        return '<p>' + escapeHtml(md || '') + '</p>';
    }

    function progressBadge(progress) {
        if (!progress || progress.attempts === 0) {
            return `<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${t('未開始', 'Not started')}</span>`;
        }
        if (progress.passed) {
            return `<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${t('及格', 'Passed')} · ${t('最高', 'Best')} ${progress.percent}%</span>`;
        }
        return `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">${t('未及格，請重做', 'Failed — redo')} · ${t('最高', 'Best')} ${progress.percent}%</span>`;
    }

    async function renderList(formFilter) {
        const main = document.getElementById('main-content');
        main.innerHTML = `<div class="max-w-4xl mx-auto w-full"><p class="text-slate-500">${t('載入中…', 'Loading…')}</p></div>`;

        let data;
        try {
            const q = formFilter ? ('?form=' + encodeURIComponent(formFilter)) : '';
            data = await apiFetch('/summer-homework' + q);
        } catch (e) {
            main.innerHTML = `<div class="max-w-4xl mx-auto"><p class="text-red-600">${escapeHtml(e.message || t('載入失敗', 'Failed to load'))}</p>
                <p class="text-sm text-slate-500 mt-2">${t('若為新功能，請先匯入 schema_summer_homework.sql。', 'If this is a new install, import schema_summer_homework.sql first.')}</p></div>`;
            return;
        }

        const lang = getLang();
        const items = data.items || [];
        const s1 = items.filter((i) => i.form_level === '1');
        const s2 = items.filter((i) => i.form_level === '2');

        function section(title, list, formKey) {
            if (formFilter && formFilter !== formKey) return '';
            const cards = list.map((item) => {
                const titleText = lang === 'zh' ? item.title_zh : item.title_en;
                const type = item.content_type === 'video' ? t('影片', 'Video') : t('閱讀', 'Passage');
                return `<a href="#" data-slug="${escapeHtml(item.slug)}" class="sh-card block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition">
                    <div class="flex justify-between gap-3 items-start">
                        <div>
                            <h3 class="font-semibold text-slate-900">${escapeHtml(titleText)}</h3>
                            <p class="text-xs text-slate-500 mt-1">${type} · ${t('及格線', 'Pass mark')} ${item.pass_percent}%</p>
                        </div>
                        ${progressBadge(item.progress)}
                    </div>
                </a>`;
            }).join('');
            return `<section class="mb-10">
                <h2 class="text-xl font-bold text-slate-900 mb-3">${title}</h2>
                <div class="space-y-3">${cards || `<p class="text-slate-500 text-sm">${t('暫無習作。', 'No assessments yet.')}</p>`}</div>
            </section>`;
        }

        main.innerHTML = `
            <div class="max-w-4xl mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80">
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t('暑期功課', 'Summer Homework')}</h1>
                    <p class="text-slate-600 mt-2 text-sm">${t('專為中一、中二同學而設。完成閱讀或影片後作答；達 80% 或以上為及格。及格後仍可重做，系統會保留最高分數。', 'For S1 and S2 students. After the passage or video, answer the questions. Score ≥ 80% to pass. You may redo after passing; the highest score is kept.')}</p>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <button type="button" data-form="" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${!formFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}">${t('全部', 'All')}</button>
                        <button type="button" data-form="1" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${formFilter === '1' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}">${t('中一', 'S1')}</button>
                        <button type="button" data-form="2" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${formFilter === '2' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}">${t('中二', 'S2')}</button>
                    </div>
                </div>
                ${section(t('中一 (S1)', 'Form 1 (S1)'), s1, '1')}
                ${section(t('中二 (S2)', 'Form 2 (S2)'), s2, '2')}
            </div>`;

        document.querySelectorAll('.sh-filter').forEach((btn) => {
            btn.addEventListener('click', () => {
                const f = btn.getAttribute('data-form');
                if (f === '1') navigate('/summer-homework/s1');
                else if (f === '2') navigate('/summer-homework/s2');
                else navigate('/summer-homework');
            });
        });
        document.querySelectorAll('.sh-card').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                navigate('/summer-homework/' + encodeURIComponent(a.getAttribute('data-slug')));
            });
        });
    }

    async function renderItem(slug) {
        const main = document.getElementById('main-content');
        main.innerHTML = `<div class="max-w-3xl mx-auto"><p class="text-slate-500">${t('載入中…', 'Loading…')}</p></div>`;

        let item;
        try {
            item = await apiFetch('/summer-homework/' + encodeURIComponent(slug));
        } catch (e) {
            main.innerHTML = `<div class="max-w-3xl mx-auto"><p class="text-red-600">${escapeHtml(e.message || '')}</p>
                <button type="button" id="sh-back" class="mt-4 text-indigo-600 underline">${t('返回列表', 'Back to list')}</button></div>`;
            document.getElementById('sh-back')?.addEventListener('click', () => navigate('/summer-homework'));
            return;
        }

        const lang = getLang();
        const title = lang === 'zh' ? item.title_zh : item.title_en;
        const questions = item.questions || [];
        const alreadyPassed = item.progress && item.progress.passed;

        let contentHtml = '';
        if (item.content_type === 'video') {
            contentHtml = youtubeEmbed(item.video_embed_url);
        } else {
            const body = lang === 'zh' ? item.body_zh : item.body_en;
            contentHtml = `<article class="prose-article max-w-none mb-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">${renderMarkdown(body)}</article>`;
        }

        const formLabel = item.form_level === '2' ? t('中二', 'S2') : t('中一', 'S1');

        main.innerHTML = `
            <div class="max-w-3xl mx-auto w-full">
                <button type="button" id="sh-back" class="text-sm text-indigo-600 mb-4">${t('← 暑期功課', '← Summer homework')}</button>
                <div class="mb-4 flex flex-wrap items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">${formLabel}</span>
                    ${progressBadge(item.progress)}
                </div>
                <h1 class="text-2xl font-extrabold text-slate-900 mb-2">${escapeHtml(title)}</h1>
                <p class="text-sm text-slate-500 mb-6">${t('及格線', 'Pass mark')}: ${item.pass_percent}%</p>
                ${contentHtml}
                <div id="sh-quiz" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"></div>
                <div id="sh-result" class="mt-6 hidden"></div>
            </div>`;

        document.getElementById('sh-back')?.addEventListener('click', () => navigate('/summer-homework'));

        const quizEl = document.getElementById('sh-quiz');
        if (alreadyPassed) {
            const best = item.progress.percent;
            quizEl.insertAdjacentHTML('beforebegin',
                `<div class="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                    ${t(`你已及格（最高 ${best}%）。仍可重做；若本次分數較低，仍保留最高分。`, `You have passed (best ${best}%). You may still redo; if this attempt is lower, your best score is kept.`)}
                </div>`);
        }

        if (!questions.length) {
            quizEl.innerHTML = `<p class="text-slate-500">${t('此習作尚未設定題目。', 'No questions yet.')}</p>`;
            return;
        }

        // Check login for submit
        let me = null;
        try {
            me = await apiFetch('/auth/me');
        } catch (e) {
            me = null;
        }
        if (!me || !me.id) {
            quizEl.innerHTML = `<p class="text-amber-800">${t('請先登入後再作答。', 'Please log in to attempt this assessment.')}</p>
                <a class="inline-block mt-3 text-indigo-600 underline" href="../login.php?next=${encodeURIComponent('app/summer-homework/' + slug)}">${t('登入', 'Log in')}</a>`;
            return;
        }

        let html = `<h2 class="text-lg font-bold mb-4">${t('跟進題目', 'Follow-up questions')}</h2>`;
        questions.forEach((q, qi) => {
            const stem = lang === 'zh' ? q.stem_zh : q.stem_en;
            html += `<div class="mb-6 pb-6 border-b border-slate-100 last:border-0" data-qid="${q.id}" data-type="${q.question_type}">
                <p class="font-medium text-slate-900 mb-3">${qi + 1}. ${escapeHtml(stem)}</p>`;
            if (q.question_type === 'mcq') {
                (q.options || []).forEach((o, oi) => {
                    const text = lang === 'zh' ? o.text_zh : o.text_en;
                    html += `<label class="flex items-start gap-2 mb-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="radio" name="q-${q.id}" value="${oi}" class="mt-1">
                        <span><span class="font-bold text-indigo-600 mr-1">${String.fromCharCode(65 + oi)}</span>${escapeHtml(text)}</span>
                    </label>`;
                });
            } else {
                const blanks = q.blanks || [{ blank_index: 1 }];
                blanks.forEach((b, bi) => {
                    html += `<div class="mb-2">
                        <label class="text-xs text-slate-500">${t('空格', 'Blank')} ${bi + 1}</label>
                        <input type="text" class="sh-blank w-full border rounded-lg px-3 py-2 mt-1" data-blank="${bi}" autocomplete="off">
                    </div>`;
                });
            }
            html += '</div>';
        });
        html += `<button type="button" id="sh-submit" class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">${alreadyPassed ? t('重新提交', 'Resubmit') : t('提交答案', 'Submit')}</button>`;
        quizEl.innerHTML = html;

        document.getElementById('sh-submit')?.addEventListener('click', async () => {
            const responses = {};
            document.querySelectorAll('#sh-quiz [data-qid]').forEach((block) => {
                const qid = block.getAttribute('data-qid');
                const type = block.getAttribute('data-type');
                if (type === 'mcq') {
                    const sel = block.querySelector('input[type=radio]:checked');
                    responses[qid] = {
                        selected_option_index: sel ? parseInt(sel.value, 10) : null,
                    };
                } else {
                    const blanks = [...block.querySelectorAll('.sh-blank')].map((inp) => inp.value);
                    responses[qid] = { blanks };
                }
            });

            const btn = document.getElementById('sh-submit');
            if (btn) {
                btn.disabled = true;
                btn.textContent = t('提交中…', 'Submitting…');
            }
            try {
                const result = await apiFetch('/summer-homework/' + encodeURIComponent(slug) + '/submit', {
                    method: 'POST',
                    body: { responses },
                });
                showResult(result, slug);
            } catch (err) {
                alert(err.message || t('提交失敗', 'Submit failed'));
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = alreadyPassed ? t('重新提交', 'Resubmit') : t('提交答案', 'Submit');
                }
            }
        });
    }

    function showResult(result, slug) {
        const box = document.getElementById('sh-result');
        const quizEl = document.getElementById('sh-quiz');
        if (!box) return;

        const passed = !!result.passed;
        const everPassed = result.ever_passed != null ? !!result.ever_passed : passed;
        const bestPercent = result.best_percent != null ? result.best_percent : result.percent;
        const improved = !!result.score_improved;
        const bestNote = result.previous_best_percent != null
            ? (improved
                ? `<p class="mt-2 text-sm text-emerald-800">${t('已更新最高分：', 'Best score updated:')} ${bestPercent}%</p>`
                : `<p class="mt-2 text-sm text-slate-700">${t('本次未超過最高分，仍保留', 'This attempt did not beat your best. Keeping')} ${bestPercent}%。</p>`)
            : '';

        box.className = 'mt-6 p-6 rounded-xl border ' + (passed
            ? 'bg-emerald-50 border-emerald-200'
            : (everPassed ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'));
        const titleClass = passed
            ? 'text-emerald-900'
            : (everPassed ? 'text-slate-900' : 'text-amber-950');
        const bodyClass = passed
            ? 'text-emerald-800'
            : (everPassed ? 'text-slate-700' : 'text-amber-900');

        box.innerHTML = `
            <p class="text-2xl font-extrabold ${titleClass}">
                ${passed ? t('及格！', 'Passed!') : (everPassed ? t('已提交', 'Submitted') : t('未及格', 'Not passed'))}
            </p>
            <p class="mt-2 text-sm ${bodyClass}">
                ${t('本次得分', 'This attempt')}: ${result.score} / ${result.max_score}
                （${result.percent}%；${t('及格線', 'pass mark')} ${result.pass_percent}%）
            </p>
            <p class="mt-1 text-sm font-medium ${bodyClass}">${t('最高分數', 'Best score')}: ${bestPercent}%</p>
            ${bestNote}
            ${passed
                ? `<p class="mt-3 text-sm text-emerald-800">${t('做得好！可返回列表，或重做爭取更高分。', 'Well done! Continue with other assessments, or redo for a higher score.')}</p>`
                : (everPassed
                    ? `<p class="mt-3 text-sm text-slate-700">${t('你先前已及格；本次分數較低時不會降低最高分。', 'You already passed earlier; a lower attempt will not reduce your best score.')}</p>`
                    : `<p class="mt-3 text-sm text-amber-900">${t('未達及格線，請重讀／重看內容後再試。', 'Below the pass mark. Review the content and try again.')}</p>`)}
            <button type="button" id="sh-redo" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">${t('重新作答', 'Try again')}</button>
            <button type="button" id="sh-back-list" class="mt-4 ml-2 text-indigo-600 underline text-sm">${t('返回列表', 'Back to list')}</button>
        `;
        box.classList.remove('hidden');
        if (quizEl) quizEl.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });

        document.getElementById('sh-back-list')?.addEventListener('click', () => navigate('/summer-homework'));
        document.getElementById('sh-redo')?.addEventListener('click', () => navigate('/summer-homework/' + encodeURIComponent(slug), true));
    }

    global.AppSummerHomework = {
        renderList,
        renderItem,
    };
})(typeof window !== 'undefined' ? window : this);
