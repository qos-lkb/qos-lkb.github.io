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

    function renderRichText(text) {
        if (global.AppMarkdown && AppMarkdown.renderPlainWithMathToHtml) {
            return AppMarkdown.renderPlainWithMathToHtml(text || '');
        }
        return escapeHtml(text || '');
    }

    async function enhanceMath(root) {
        if (!root || !global.AppMarkdown) return;
        if (typeof AppMarkdown.enhanceMarkdown === 'function') {
            await AppMarkdown.enhanceMarkdown(root);
        } else if (typeof AppMarkdown.typesetMath === 'function') {
            await AppMarkdown.typesetMath(root);
        }
    }

    function formatDue(dueAt) {
        if (!dueAt) return '';
        return String(dueAt).replace('T', ' ').slice(0, 16);
    }

    function getUser() {
        return global.ScienceApi && ScienceApi.getUser ? ScienceApi.getUser() : null;
    }

    function isTeacherUser(user) {
        return !!(user && user.is_teacher);
    }

    function resolveStudentForm(user) {
        if (!user || isTeacherUser(user)) return null;
        if (user.summer_form_level === '1' || user.summer_form_level === '2') {
            return user.summer_form_level;
        }
        const p = user.profile && user.profile.form_level;
        if (p === '1' || p === '2') return p;
        const classes = user.classes || [];
        for (let i = 0; i < classes.length; i++) {
            const fl = classes[i].form_level;
            if (fl === '1' || fl === '2') return fl;
        }
        return null;
    }

    /**
     * Students: content language follows course MOI (E→en, C→zh), ignoring UI lang toggle.
     * Teachers/guests: follow AppRouter language.
     */
    function resolveSummerLang(apiHint) {
        if (apiHint === 'zh' || apiHint === 'en') {
            return apiHint;
        }
        const user = getUser();
        if (user && !isTeacherUser(user) && user.is_student) {
            if (user.summer_content_lang === 'zh' || user.summer_content_lang === 'en') {
                return user.summer_content_lang;
            }
            if (user.summer_moi === 'E') return 'en';
            if (user.summer_moi === 'C') return 'zh';
            const classes = user.classes || [];
            const form = resolveStudentForm(user);
            let best = null;
            let bestScore = -1;
            classes.forEach((c) => {
                if (c.moi !== 'E' && c.moi !== 'C') return;
                let score = 0;
                if (form && c.form_level === form) score += 100;
                if (c.form_level === '1' || c.form_level === '2') score += 20;
                if (c.course_subject === 'integrated_science') score += 10;
                if (score > bestScore) {
                    bestScore = score;
                    best = c.moi;
                }
            });
            if (best === 'E') return 'en';
            if (best === 'C') return 'zh';
        }
        return getLang();
    }

    function st(zh, en, lang) {
        return (lang || resolveSummerLang()) === 'zh' ? zh : en;
    }

    function dueLine(item, lang) {
        if (!item.due_at) return '';
        const due = formatDue(item.due_at);
        const late = item.allow_late_submit !== false
            ? st('截止後仍可遲交', 'Late submit allowed after due', lang)
            : st('截止後不可再交', 'No submissions after due', lang);
        return `<p class="text-xs text-slate-500 mt-1">${st('截止', 'Due', lang)}: ${escapeHtml(due)} · ${late}</p>`;
    }

    function progressBadge(progress, lang) {
        if (!progress || !progress.passed) {
            const best = progress && progress.percent != null
                ? `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">${st('最高', 'Best', lang)} ${progress.percent}%</span>`
                : '';
            return `<span class="inline-flex flex-wrap gap-1 justify-end">
                <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">${st('未交', 'Not completed', lang)}</span>
                ${progress && progress.attempts > 0
                    ? `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-950">${st('未及格，請再次完成', 'Not passed — please redo', lang)}</span>`
                    : ''}
                ${best}
            </span>`;
        }
        const status = progress.submission_status;
        let statusBadge = '';
        if (status === 'late') {
            statusBadge = `<span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-900">${st('欠交', 'Overdue completion', lang)}</span>`;
        } else if (status === 'on_time') {
            statusBadge = `<span class="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-900">${st('準時', 'On time', lang)}</span>`;
        }
        const passAt = progress.first_passed_at
            ? `<span class="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">${st('首次及格', 'First pass', lang)} ${escapeHtml(formatDue(progress.first_passed_at))}</span>`
            : '';
        return `<span class="inline-flex flex-wrap gap-1 justify-end">
            <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${st('及格', 'Passed', lang)} · ${st('最高', 'Best', lang)} ${progress.percent}%</span>
            ${statusBadge}
            ${passAt}
        </span>`;
    }

    async function renderTeacherHome() {
        const main = document.getElementById('main-content');
        main.innerHTML = `<div class="max-w-4xl mx-auto w-full"><p class="text-slate-500">${t('載入中…', 'Loading…')}</p></div>`;

        let data;
        try {
            data = await apiFetch('/teacher/classes');
        } catch (e) {
            const loginUrl = (global.ScienceApi.SITE_BASE || '') + '/login.php?next=' + encodeURIComponent('app/');
            main.innerHTML = `<div class="max-w-4xl mx-auto w-full">
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">${t('我的課程', 'My courses')}</h1>
                <p class="text-red-600">${escapeHtml(e.message || t('載入失敗', 'Failed to load'))}</p>
                <p class="text-sm text-slate-500 mt-2">${t('請確認已登入且具課程管理權限。', 'Please sign in with course management permission.')}
                    <a class="text-indigo-600 underline ml-1" href="${loginUrl}">${t('登入', 'Log in')}</a>
                </p>
            </div>`;
            return;
        }

        const classes = data.classes || [];
        const site = global.ScienceApi.SITE_BASE || '';
        const cards = classes.map((c) => {
            const form = c.form_level_label || '—';
            const subject = c.course_subject_label || '—';
            const shUrl = site + '/admin/course_summer_homework.php?id=' + encodeURIComponent(c.id);
            const studentsUrl = site + '/admin/course_students.php?id=' + encodeURIComponent(c.id);
            const reportUrl = site + '/admin/course_reports.php?id=' + encodeURIComponent(c.id);
            const editUrl = site + '/admin/course_edit.php?id=' + encodeURIComponent(c.id);
            const wsUrl = site + '/admin/course_worksheets.php?id=' + encodeURIComponent(c.id);
            return `<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div class="flex flex-wrap justify-between gap-3 items-start">
                    <div>
                        <h3 class="font-semibold text-slate-900 text-lg">${escapeHtml(c.name)}</h3>
                        <p class="text-xs text-slate-500 mt-1">${escapeHtml(c.school_year || '')} · ${escapeHtml(form)} · ${escapeHtml(subject)}
                            · ${t('學生', 'Students')} ${c.student_count != null ? c.student_count : '—'}</p>
                    </div>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        <a class="text-indigo-600 hover:underline" href="${escapeHtml(studentsUrl)}">${t('學生', 'Students')}</a>
                        <a class="text-indigo-600 hover:underline" href="${escapeHtml(shUrl)}">${t('暑期功課', 'Summer HW')}</a>
                        <a class="text-indigo-600 hover:underline" href="${escapeHtml(reportUrl)}">${t('學習報告', 'Reports')}</a>
                        <a class="text-indigo-600 hover:underline" href="${escapeHtml(wsUrl)}">${t('工作紙', 'Worksheets')}</a>
                        <a class="text-indigo-600 hover:underline" href="${escapeHtml(editUrl)}">${t('編輯', 'Edit')}</a>
                    </div>
                </div>
            </div>`;
        }).join('');

        const adminList = site + '/admin/courses.php';
        main.innerHTML = `
            <div class="max-w-4xl mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80">
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t('我的課程', 'My courses')}</h1>
                    <p class="text-slate-600 mt-2 text-sm">${t('查看任教課程的暑期功課呈交與學習報告。', 'View summer homework submissions and learning reports for your classes.')}</p>
                    <a href="${escapeHtml(adminList)}" class="inline-block mt-3 text-sm text-indigo-600 hover:underline">${t('開啟後台課程管理', 'Open course admin')}</a>
                </div>
                <div class="space-y-3">
                    ${cards || `<p class="text-slate-500 text-sm">${t('尚無任教課程。', 'No courses yet.')}</p>`}
                </div>
            </div>`;
    }

    async function renderHome() {
        const user = getUser();
        if (isTeacherUser(user)) {
            await renderTeacherHome();
            return;
        }
        const form = resolveStudentForm(user);
        await renderList(form);
    }

    async function renderList(formFilter) {
        const main = document.getElementById('main-content');
        const bootLang = resolveSummerLang();
        main.innerHTML = `<div class="max-w-4xl mx-auto w-full"><p class="text-slate-500">${st('載入中…', 'Loading…', bootLang)}</p></div>`;

        const user = getUser();
        const studentLocked = !!(user && !isTeacherUser(user) && user.is_student);
        let effectiveForm = formFilter;
        if (studentLocked) {
            const resolved = resolveStudentForm(user);
            if (resolved) effectiveForm = resolved;
        }

        let data;
        try {
            const q = effectiveForm ? ('?form=' + encodeURIComponent(effectiveForm)) : '';
            data = await apiFetch('/summer-homework' + q);
        } catch (e) {
            main.innerHTML = `<div class="max-w-4xl mx-auto"><p class="text-red-600">${escapeHtml(e.message || st('載入失敗', 'Failed to load', bootLang))}</p>
                <p class="text-sm text-slate-500 mt-2">${st('若為新功能，請先匯入 schema_summer_homework.sql。', 'If this is a new install, import schema_summer_homework.sql first.', bootLang)}</p></div>`;
            return;
        }

        const lang = resolveSummerLang(data.content_lang);
        const items = data.items || [];
        const formLocked = !!(data.form_locked || studentLocked);
        const lockedForm = data.student_form_level || effectiveForm;
        const s1 = items.filter((i) => i.form_level === '1');
        const s2 = items.filter((i) => i.form_level === '2');

        if (data.message && items.length === 0) {
            main.innerHTML = `
                <div class="max-w-4xl mx-auto w-full">
                    <div class="mb-6 pb-6 border-b border-slate-200/80">
                        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${st('暑期功課', 'Summer Homework', lang)}</h1>
                    </div>
                    <p class="text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">${escapeHtml(data.message)}</p>
                </div>`;
            return;
        }

        function section(title, list, formKey) {
            if (effectiveForm && effectiveForm !== formKey) return '';
            const cards = list.map((item) => {
                const titleText = lang === 'zh' ? item.title_zh : item.title_en;
                const type = item.content_type === 'video' ? st('影片', 'Video', lang) : st('閱讀', 'Passage', lang);
                return `<a href="#" data-slug="${escapeHtml(item.slug)}" class="sh-card block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition">
                    <div class="flex justify-between gap-3 items-start">
                        <div>
                            <h3 class="font-semibold text-slate-900">${escapeHtml(titleText)}</h3>
                            <p class="text-xs text-slate-500 mt-1">${type} · ${st('及格線', 'Pass mark', lang)} ${item.pass_percent}%</p>
                            ${dueLine(item, lang)}
                        </div>
                        ${progressBadge(item.progress, lang)}
                    </div>
                </a>`;
            }).join('');
            return `<section class="mb-10">
                <h2 class="text-xl font-bold text-slate-900 mb-3">${title}</h2>
                <div class="space-y-3">${cards || `<p class="text-slate-500 text-sm">${st('暫無習作。', 'No assessments yet.', lang)}</p>`}</div>
            </section>`;
        }

        const formLabel = lockedForm === '2'
            ? st('中二', 'S2', lang)
            : (lockedForm === '1' ? st('中一', 'S1', lang) : '');
        const intro = formLocked && (lockedForm === '1' || lockedForm === '2')
            ? st(`以下為你年級（${formLabel}）需要完成的暑期功課。達 80% 或以上為及格；及格後仍可重做並保留最高分。`,
                `Summer homework for your form (${formLabel}). Score ≥ 80% to pass. You may redo after passing; the highest score is kept.`, lang)
            : st('專為中一、中二同學而設。完成閱讀或影片後作答；達 80% 或以上為及格。及格後仍可重做，系統會保留最高分數。',
                'For S1 and S2 students. After the passage or video, answer the questions. Score ≥ 80% to pass. You may redo after passing; the highest score is kept.', lang);

        const moiHint = (studentLocked && (data.summer_moi === 'E' || data.summer_moi === 'C'))
            ? `<p class="text-xs text-slate-500 mt-2">${st(
                '習作語言依你修讀該科的語言（' + (data.summer_moi === 'E' ? '英文' : '中文') + '），不受上方中／EN 切換影響。',
                'Content language follows your subject MOI (' + (data.summer_moi === 'E' ? 'English' : 'Chinese') + '), not the 中/EN toggle.',
                lang
            )}</p>`
            : '';

        const filters = formLocked
            ? `<p class="text-sm text-indigo-800 mt-3">${st('已依你的年級顯示習作。', 'Showing assessments for your form level.', lang)}</p>${moiHint}`
            : `<div class="flex flex-wrap gap-2 mt-4">
                <button type="button" data-form="" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${!effectiveForm ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}">${st('全部', 'All', lang)}</button>
                <button type="button" data-form="1" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${effectiveForm === '1' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}">${st('中一', 'S1', lang)}</button>
                <button type="button" data-form="2" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${effectiveForm === '2' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}">${st('中二', 'S2', lang)}</button>
            </div>`;

        main.innerHTML = `
            <div class="max-w-4xl mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80">
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${st('暑期功課', 'Summer Homework', lang)}</h1>
                    <p class="text-slate-600 mt-2 text-sm">${intro}</p>
                    ${filters}
                </div>
                ${section(st('中一 (S1)', 'Form 1 (S1)', lang), s1, '1')}
                ${section(st('中二 (S2)', 'Form 2 (S2)', lang), s2, '2')}
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
        const bootLang = resolveSummerLang();
        main.innerHTML = `<div class="max-w-3xl mx-auto"><p class="text-slate-500">${st('載入中…', 'Loading…', bootLang)}</p></div>`;

        let item;
        try {
            item = await apiFetch('/summer-homework/' + encodeURIComponent(slug));
        } catch (e) {
            main.innerHTML = `<div class="max-w-3xl mx-auto"><p class="text-red-600">${escapeHtml(e.message || '')}</p>
                <button type="button" id="sh-back" class="mt-4 text-indigo-600 underline">${st('返回列表', 'Back to list', bootLang)}</button></div>`;
            document.getElementById('sh-back')?.addEventListener('click', () => navigate('/summer-homework'));
            return;
        }

        const lang = resolveSummerLang(item.content_lang);
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

        const formLabel = item.form_level === '2' ? st('中二', 'S2', lang) : st('中一', 'S1', lang);
        const closed = !!item.submissions_closed;
        const dueMeta = item.due_at
            ? `<p class="text-sm text-slate-500 mb-2">${st('截止日期', 'Due', lang)}: ${escapeHtml(formatDue(item.due_at))}
                （${item.allow_late_submit !== false ? st('允許遲交', 'Late allowed', lang) : st('截止後不可交', 'Closed after due', lang)}）</p>`
            : '';

        main.innerHTML = `
            <div class="max-w-3xl mx-auto w-full">
                <button type="button" id="sh-back" class="text-sm text-indigo-600 mb-4">${st('← 暑期功課', '← Summer homework', lang)}</button>
                <div class="mb-4 flex flex-wrap items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">${formLabel}</span>
                    ${progressBadge(item.progress, lang)}
                </div>
                <h1 class="text-2xl font-extrabold text-slate-900 mb-2">${escapeHtml(title)}</h1>
                <p class="text-sm text-slate-500 mb-1">${st('及格線', 'Pass mark', lang)}: ${item.pass_percent}%</p>
                ${dueMeta}
                <div class="mb-6"></div>
                ${contentHtml}
                <div id="sh-quiz" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"></div>
                <div id="sh-result" class="mt-6 hidden"></div>
            </div>`;

        document.getElementById('sh-back')?.addEventListener('click', () => navigate('/summer-homework'));

        await enhanceMath(main);

        const quizEl = document.getElementById('sh-quiz');
        if (alreadyPassed) {
            const best = item.progress.percent;
            quizEl.insertAdjacentHTML('beforebegin',
                `<div class="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900" role="status">
                    ${st(`你已及格（最高 ${best}%）。仍可重做；若本次分數較低，仍保留最高分。`, `You have passed (best ${best}%). You may still redo; if this attempt is lower, your best score is kept.`, lang)}
                </div>`);
        } else if (item.progress && item.progress.attempts > 0) {
            const best = item.progress.percent;
            quizEl.insertAdjacentHTML('beforebegin',
                `<div class="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-sm text-amber-950" role="alert">
                    <p class="font-semibold">${st('尚未及格，請再次完成此習作。', 'Not yet passed — please complete this assessment again.', lang)}</p>
                    <p class="mt-1">${st(`目前最高 ${best}%（及格線 ${item.pass_percent}%）。請重讀／重看內容後再提交。`, `Best so far: ${best}% (pass mark ${item.pass_percent}%). Review the content and submit again.`, lang)}</p>
                </div>`);
        }

        if (closed) {
            quizEl.innerHTML = `<p class="text-amber-900 font-medium">${st('已過呈交截止日期，無法再提交。', 'The due date has passed; submissions are closed.', lang)}</p>
                <button type="button" id="sh-back2" class="mt-4 text-indigo-600 underline">${st('返回列表', 'Back to list', lang)}</button>`;
            document.getElementById('sh-back2')?.addEventListener('click', () => navigate('/summer-homework'));
            return;
        }

        if (!questions.length) {
            quizEl.innerHTML = `<p class="text-slate-500">${st('此習作尚未設定題目。', 'No questions yet.', lang)}</p>`;
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
            quizEl.innerHTML = `<p class="text-amber-800">${st('請先登入後再作答。', 'Please log in to attempt this assessment.', lang)}</p>
                <a class="inline-block mt-3 text-indigo-600 underline" href="../login.php?next=${encodeURIComponent('app/summer-homework/' + slug)}">${st('登入', 'Log in', lang)}</a>`;
            return;
        }

        let html = `<h2 class="text-lg font-bold mb-4">${st('跟進題目', 'Follow-up questions', lang)}</h2>`;
        if (item.include_answers || item.can_review) {
            html = `<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${st('教師／管理員檢視模式：已顯示正確答案。', 'Teacher/admin review mode: correct answers are shown.', lang)}</div>` + html;
        }
        questions.forEach((q, qi) => {
            const stem = lang === 'zh' ? q.stem_zh : q.stem_en;
            html += `<div class="mb-6 pb-6 border-b border-slate-100 last:border-0" data-qid="${q.id}" data-type="${q.question_type}">
                <div class="font-medium text-slate-900 mb-3 prose-article sh-q-stem">${qi + 1}. ${renderRichText(stem)}</div>`;
            if (q.question_type === 'mcq') {
                (q.options || []).forEach((o, oi) => {
                    const text = lang === 'zh' ? o.text_zh : o.text_en;
                    const isCorrect = !!(item.include_answers || item.can_review) && !!o.is_correct;
                    html += `<label class="flex items-start gap-2 mb-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : ''}">
                        <input type="radio" name="q-${q.id}" value="${oi}" class="mt-1">
                        <span class="sh-q-opt"><span class="font-bold text-indigo-600 mr-1">${String.fromCharCode(65 + oi)}</span>${renderRichText(text)}${isCorrect ? ` <span class="text-xs text-emerald-700">${st('✓ 正確', '✓ Correct', lang)}</span>` : ''}</span>
                    </label>`;
                });
            } else {
                const blanks = q.blanks || [{ blank_index: 1 }];
                blanks.forEach((b, bi) => {
                    const ansHint = (item.include_answers || item.can_review)
                        ? `<p class="text-xs text-emerald-700 mt-1">${st('可接受', 'Acceptable', lang)}：${escapeHtml((b.acceptable_answer_zh || '') + ' / ' + (b.acceptable_answer_en || ''))}</p>`
                        : '';
                    html += `<div class="mb-2">
                        <label class="text-xs text-slate-500">${st('空格', 'Blank', lang)} ${bi + 1}</label>
                        <input type="text" class="sh-blank w-full border rounded-lg px-3 py-2 mt-1" data-blank="${bi}" autocomplete="off">
                        ${ansHint}
                    </div>`;
                });
            }
            html += '</div>';
        });
        html += `<button type="button" id="sh-submit" class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">${alreadyPassed ? st('重新提交', 'Resubmit', lang) : st('提交答案', 'Submit', lang)}</button>`;
        quizEl.innerHTML = html;
        await enhanceMath(quizEl);

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
                btn.textContent = st('提交中…', 'Submitting…', lang);
            }
            try {
                const result = await apiFetch('/summer-homework/' + encodeURIComponent(slug) + '/submit', {
                    method: 'POST',
                    body: { responses },
                });
                showResult(result, slug, lang);
            } catch (err) {
                alert(err.message || st('提交失敗', 'Submit failed', lang));
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = alreadyPassed ? st('重新提交', 'Resubmit', lang) : st('提交答案', 'Submit', lang);
                }
            }
        });
    }

    function showResult(result, slug, lang) {
        const box = document.getElementById('sh-result');
        const quizEl = document.getElementById('sh-quiz');
        if (!box) return;
        lang = lang || resolveSummerLang();

        const passed = !!result.passed;
        const everPassed = result.ever_passed != null ? !!result.ever_passed : passed;
        const bestPercent = result.best_percent != null ? result.best_percent : result.percent;
        const improved = !!result.score_improved;
        const bestNote = result.previous_best_percent != null
            ? (improved
                ? `<p class="mt-2 text-sm text-emerald-800">${st('已更新最高分：', 'Best score updated:', lang)} ${bestPercent}%</p>`
                : `<p class="mt-2 text-sm text-slate-700">${st('本次未超過最高分，仍保留', 'This attempt did not beat your best. Keeping', lang)} ${bestPercent}%。</p>`)
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
                ${passed ? st('及格！', 'Passed!', lang) : (everPassed ? st('已提交', 'Submitted', lang) : st('未及格', 'Not passed', lang))}
            </p>
            <p class="mt-2 text-sm ${bodyClass}">
                ${st('本次得分', 'This attempt', lang)}: ${result.score} / ${result.max_score}
                （${result.percent}%；${st('及格線', 'pass mark', lang)} ${result.pass_percent}%）
            </p>
            ${result.submitted_at ? `<p class="mt-1 text-sm ${bodyClass}">${st('本次呈交時間', 'Submitted at', lang)}: ${escapeHtml(formatDue(result.submitted_at))}</p>` : ''}
            <p class="mt-1 text-sm font-medium ${bodyClass}">${st('最高分數', 'Best score', lang)}: ${bestPercent}%
                ${result.best_submitted_at ? ` · ${st('最高分呈交時間', 'Best attempt at', lang)}: ${escapeHtml(formatDue(result.best_submitted_at))}` : ''}
            </p>
            ${result.is_late && everPassed ? `<p class="mt-2 text-sm text-orange-800 font-medium">${st('首次及格時間在截止日期之後，狀態為「欠交」。', 'First pass was after the due date — status is “Overdue completion”.', lang)}</p>` : ''}
            ${everPassed && result.first_passed_at ? `<p class="mt-1 text-sm ${bodyClass}">${st('首次及格時間', 'First passed at', lang)}: ${escapeHtml(formatDue(result.first_passed_at))}</p>` : ''}
            ${bestNote}
            ${passed
                ? `<p class="mt-3 text-sm text-emerald-800">${st('做得好！可返回列表，或重做爭取更高分。', 'Well done! Continue with other assessments, or redo for a higher score.', lang)}</p>`
                : (everPassed
                    ? `<p class="mt-3 text-sm text-slate-700">${st('你先前已及格；本次分數較低時不會降低最高分。', 'You already passed earlier; a lower attempt will not reduce your best score.', lang)}</p>`
                    : `<p class="mt-3 text-sm text-amber-950 font-medium" role="alert">${st('未達及格線，狀態為「未交」。請重讀／重看內容後再次完成並提交。', 'Below the pass mark — status is “Not completed”. Review the content and complete the assessment again.', lang)}</p>`)}
            <button type="button" id="sh-redo" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">${st('重新作答', 'Try again', lang)}</button>
            <button type="button" id="sh-back-list" class="mt-4 ml-2 text-indigo-600 underline text-sm">${st('返回列表', 'Back to list', lang)}</button>
        `;
        box.classList.remove('hidden');
        if (quizEl) quizEl.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });

        document.getElementById('sh-back-list')?.addEventListener('click', () => navigate('/summer-homework'));
        document.getElementById('sh-redo')?.addEventListener('click', () => navigate('/summer-homework/' + encodeURIComponent(slug), true));
    }

    global.AppSummerHomework = {
        renderList,
        renderItem,
        renderHome,
        renderTeacherHome,
    };
})(typeof window !== 'undefined' ? window : this);
