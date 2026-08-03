'use strict';
const global = window;

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

    function normalizeContentRefs(item) {
        let refs = item.content_refs || item.content_refs_json || [];
        if (typeof refs === 'string') {
            try { refs = JSON.parse(refs); } catch (e) { refs = []; }
        }
        return Array.isArray(refs) ? refs.filter((r) => r && r.type && r.slug) : [];
    }

    function renderContentRefsHtml(refs) {
        if (!refs.length) return '';
        return `<div class="sh-content-refs space-y-4 mb-6">${refs.map((r) => {
            const type = r.type === 'note' || r.type === 'article' || r.type === 'video' ? r.type : '';
            if (!type) return '';
            return `<div class="content-embed content-embed-pending my-2" data-embed-type="${escapeHtml(type)}" data-embed-slug="${escapeHtml(r.slug)}"></div>`;
        }).join('')}</div>`;
    }

    function stemWithInlineBlanks(stemHtml, blankCount) {
        let idx = 0;
        let html = String(stemHtml || '');
        html = html.replace(/\{\{(\d+)\}\}/g, (_, n) => {
            const bi = Math.max(0, parseInt(n, 10) - 1);
            idx = Math.max(idx, bi + 1);
            return `<input type="text" class="sh-blank sh-blank-inline inline-block mx-1 px-2 py-0.5 border-b-2 border-indigo-400 bg-indigo-50/50 rounded w-28 align-baseline" data-blank="${bi}" autocomplete="off" aria-label="blank ${bi + 1}">`;
        });
        html = html.replace(/_{3,}/g, () => {
            const bi = idx++;
            return `<input type="text" class="sh-blank sh-blank-inline inline-block mx-1 px-2 py-0.5 border-b-2 border-indigo-400 bg-indigo-50/50 rounded w-28 align-baseline" data-blank="${bi}" autocomplete="off" aria-label="blank ${bi + 1}">`;
        });
        const hasInline = html.includes('sh-blank-inline');
        return { html, hasInline, nextIndex: Math.max(idx, blankCount || 0) };
    }

    function dueLine(item, lang) {
        if (!item.due_at) return '';
        const due = formatDue(item.due_at);
        const late = item.allow_late_submit !== false
            ? st('截止後仍可遲交', 'Late submit allowed after due', lang)
            : st('截止後不可再交', 'No submissions after due', lang);
        return `<p class="text-xs text-slate-500 mt-1">${st('截止', 'Due', lang)}: ${escapeHtml(due)} · ${late}</p>`;
    }

    /** Mirror PHP sh_normalize_fill_answer for client-side grading. */
    function normalizeFillAnswer(s) {
        let t = String(s == null ? '' : s);
        const map = {
            '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
            '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
            'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
            'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
            'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
            'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
            'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
            'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
            'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
            'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
            'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
            'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
        };
        t = t.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (ch) => map[ch] || ch);
        t = t.trim().toLowerCase().replace(/\s+/g, ' ');
        return t;
    }

    /**
     * Build client grade key from API client_grade or full questions (teacher preview).
     * @returns {Array|null}
     */
    function resolveClientGradeKey(item) {
        if (item && Array.isArray(item.client_grade) && item.client_grade.length) {
            return item.client_grade;
        }
        const questions = (item && item.questions) || [];
        if (!item || !(item.include_answers || item.can_review)) return null;
        const key = [];
        questions.forEach((q) => {
            const type = q.question_type || 'mcq';
            const entry = { id: Number(q.id), type };
            if (type === 'mcq') {
                let idx = null;
                (q.options || []).forEach((o, i) => {
                    if (idx === null && (o.is_correct === true || o.is_correct === 1 || o.is_correct === '1')) idx = i;
                });
                entry.correct_option_index = idx;
            } else if (type === 'multi_select') {
                entry.correct_option_indexes = (q.options || [])
                    .map((o, i) => ((o.is_correct === true || o.is_correct === 1 || o.is_correct === '1') ? i : -1))
                    .filter((i) => i >= 0);
            } else if (type === 'true_false') {
                entry.correct_bool = !!(q.correct_bool === true || q.correct_bool === 1 || q.correct_bool === '1');
            } else if (type === 'fill_blank') {
                entry.blanks = (q.blanks || []).map((b, bi) => {
                    const answers = Array.isArray(b.acceptable_answers) ? b.acceptable_answers : [{
                        acceptable_answer_zh: b.acceptable_answer_zh || '',
                        acceptable_answer_en: b.acceptable_answer_en || '',
                    }];
                    const accept = [];
                    answers.forEach((a) => {
                        const az = String(a.acceptable_answer_zh || '').trim();
                        const ae = String(a.acceptable_answer_en || '').trim();
                        if (az) accept.push(az);
                        if (ae && ae !== az) accept.push(ae);
                    });
                    return {
                        blank_index: Number(b.blank_index != null ? b.blank_index : (bi + 1)),
                        acceptable: accept,
                    };
                });
            } else if (type === 'short_answer') {
                const accept = [];
                (q.acceptable_answers || []).forEach((a) => {
                    const az = String(a.acceptable_answer_zh || '').trim();
                    const ae = String(a.acceptable_answer_en || '').trim();
                    if (az) accept.push(az);
                    if (ae && ae !== az) accept.push(ae);
                });
                entry.acceptable = accept;
                entry.match_mode = q.match_mode === 'contains' ? 'contains' : 'exact';
            } else if (type === 'long_answer') {
                entry.exclude_from_auto = true;
                entry.max_score = Math.max(0.5, Number(q.max_score != null ? q.max_score : 5));
            }
            key.push(entry);
        });
        return key.length ? key : null;
    }

    /**
     * Instant client-side grade (mirrors includes/summer_homework_grading.php).
     * @returns {{score:number,max_score:number,percent:number,passed:boolean,details:Array}|null}
     */
    function gradeClientResponses(gradeKey, responses, passPercent) {
        if (!Array.isArray(gradeKey) || !gradeKey.length) return null;
        const passAt = passPercent != null ? Number(passPercent) : 80;
        let score = 0;
        let max = 0;
        const details = [];
        gradeKey.forEach((q) => {
            const qid = Number(q.id);
            const type = q.type || 'mcq';
            const resp = responses[String(qid)] != null ? responses[String(qid)] : responses[qid];
            let detail = {
                question_id: qid,
                type,
                correct: false,
                score: 0,
                max: 0,
            };
            if (type === 'mcq') {
                const selected = resp && resp.selected_option_index != null ? Number(resp.selected_option_index) : null;
                const correctIdx = q.correct_option_index != null ? Number(q.correct_option_index) : null;
                const ok = correctIdx !== null && selected === correctIdx;
                detail = {
                    question_id: qid,
                    type,
                    correct: ok,
                    score: ok ? 1 : 0,
                    max: 1,
                    selected_option_index: selected,
                    correct_option_index: correctIdx,
                };
            } else if (type === 'multi_select') {
                const selected = (resp && Array.isArray(resp.selected_option_indexes)
                    ? resp.selected_option_indexes.map(Number)
                    : []).slice().sort((a, b) => a - b);
                const correct = (Array.isArray(q.correct_option_indexes) ? q.correct_option_indexes.map(Number) : [])
                    .slice().sort((a, b) => a - b);
                const ok = correct.length > 0 && selected.length === correct.length
                    && selected.every((v, i) => v === correct[i]);
                detail = {
                    question_id: qid,
                    type,
                    correct: ok,
                    score: ok ? 1 : 0,
                    max: 1,
                    selected_option_indexes: selected,
                    correct_option_indexes: correct,
                };
            } else if (type === 'true_false') {
                let selected = null;
                if (resp && Object.prototype.hasOwnProperty.call(resp, 'selected_bool')) {
                    selected = !!resp.selected_bool;
                }
                const correct = !!q.correct_bool;
                const ok = selected !== null && selected === correct;
                detail = {
                    question_id: qid,
                    type,
                    correct: ok,
                    score: ok ? 1 : 0,
                    max: 1,
                    selected_bool: selected,
                    correct_bool: correct,
                };
            } else if (type === 'fill_blank') {
                const givenBlanks = (resp && Array.isArray(resp.blanks)) ? resp.blanks : [];
                const blanksMeta = Array.isArray(q.blanks) ? q.blanks : [];
                const blankDetails = [];
                let s = 0;
                let m = 0;
                blanksMeta.forEach((blank, bi) => {
                    m += 1;
                    const given = givenBlanks[bi] != null ? String(givenBlanks[bi])
                        : (givenBlanks[String(bi)] != null ? String(givenBlanks[String(bi)]) : '');
                    const norm = normalizeFillAnswer(given);
                    const acceptList = (blank.acceptable || []).map(normalizeFillAnswer).filter(Boolean);
                    const ok = norm !== '' && acceptList.includes(norm);
                    if (ok) s += 1;
                    blankDetails.push({
                        blank_index: Number(blank.blank_index != null ? blank.blank_index : (bi + 1)),
                        given,
                        correct: ok,
                        acceptable_answers: acceptList,
                    });
                });
                detail = {
                    question_id: qid,
                    type,
                    blanks: blankDetails,
                    correct: blankDetails.length > 0 && blankDetails.every((b) => b.correct),
                    score: s,
                    max: m,
                };
            } else if (type === 'short_answer') {
                const given = resp ? String(resp.text || resp.answer || '').trim() : '';
                const norm = normalizeFillAnswer(given);
                const acceptList = (q.acceptable || []).map(normalizeFillAnswer).filter(Boolean);
                const matchMode = q.match_mode === 'contains' ? 'contains' : 'exact';
                let ok = norm !== '' && acceptList.includes(norm);
                if (!ok && matchMode === 'contains' && norm !== '') {
                    ok = acceptList.some((a) => a && norm.includes(a));
                }
                detail = {
                    question_id: qid,
                    type,
                    correct: ok,
                    score: ok ? 1 : 0,
                    max: 1,
                    given,
                    acceptable_answers: acceptList,
                    match_mode: matchMode,
                };
            } else if (type === 'long_answer') {
                const text = resp ? String(resp.text || '').trim() : '';
                detail = {
                    question_id: qid,
                    type,
                    correct: null,
                    needs_marking: true,
                    exclude_from_auto: true,
                    score: 0,
                    max: Math.max(0.5, Number(q.max_score != null ? q.max_score : 5)),
                    given: text,
                };
            }
            details.push(detail);
            if (!detail.exclude_from_auto) {
                score += Number(detail.score || 0);
                max += Number(detail.max || 0);
            }
        });
        const percent = max > 0 ? Math.round((score / max) * 10000) / 100 : 0;
        return {
            score,
            max_score: max,
            percent,
            passed: percent >= passAt,
            pass_percent: passAt,
            details,
        };
    }

    function notifyFailIfNeeded(result, lang, alreadyAlerted) {
        if (alreadyAlerted) return true;
        const passed = !!result.passed;
        const everPassed = result.ever_passed != null ? !!result.ever_passed : passed;
        if (passed || everPassed) return false;
        const pct = result.percent != null ? result.percent : 0;
        const passLine = result.pass_percent != null ? result.pass_percent : 80;
        alert(st(
            `不及格！\n本次得分 ${result.score} / ${result.max_score}（${pct}%）\n及格線：${passLine}%\n請重讀／重看內容後再次完成並提交。`,
            `Not passed!\nThis attempt: ${result.score} / ${result.max_score} (${pct}%)\nPass mark: ${passLine}%\nPlease review the content and submit again.`,
            lang
        ));
        return true;
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
        const spaHref = (route) => (global.AppRouter && global.AppRouter.spaHref
            ? global.AppRouter.spaHref(route)
            : route);
        const nav = (route, label) =>
            `<a class="text-indigo-600 hover:underline" href="${escapeHtml(spaHref(route))}" data-spa-nav="${escapeHtml(route)}">${escapeHtml(label)}</a>`;
        const cards = classes.map((c) => {
            const id = Number(c.id);
            const form = c.form_level_label || '—';
            const subject = c.course_subject_label || '—';
            return `<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div class="flex flex-wrap justify-between gap-3 items-start">
                    <div>
                        <h3 class="font-semibold text-slate-900 text-lg">${escapeHtml(c.name)}</h3>
                        <p class="text-xs text-slate-500 mt-1">${escapeHtml(c.school_year || '')} · ${escapeHtml(form)} · ${escapeHtml(subject)}
                            · ${t('學生', 'Students')} ${c.student_count != null ? c.student_count : '—'}</p>
                    </div>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        ${nav('/admin/courses/' + id + '/students', t('學生', 'Students'))}
                        ${nav('/admin/courses/' + id + '/summer', t('暑期功課', 'Summer HW'))}
                        ${nav('/admin/courses/' + id + '/report', t('學習報告', 'Reports'))}
                        ${nav('/admin/courses/' + id + '/worksheets', t('工作紙', 'Worksheets'))}
                        ${nav('/admin/courses/' + id, t('編輯', 'Edit'))}
                    </div>
                </div>
            </div>`;
        }).join('');

        const empty = `
            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p class="text-slate-700 text-sm">${escapeHtml(t('尚無任教課程。', 'No courses yet.'))}</p>
                <p class="text-slate-500 text-xs mt-2">${escapeHtml(t('可由後台新增課程，或請管理員指派任教班別。', 'Create a course in admin, or ask an admin to assign you to a class.'))}</p>
                <a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses"
                   class="inline-block mt-4 text-sm font-medium text-indigo-700 hover:underline">${escapeHtml(t('前往課程管理', 'Go to course admin'))}</a>
            </div>`;

        main.innerHTML = `
            <div class="max-w-4xl mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80">
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t('我的課程', 'My courses')}</h1>
                    <p class="text-slate-600 mt-2 text-sm">${t('查看任教課程的暑期功課呈交與學習報告。', 'View summer homework submissions and learning reports for your classes.')}</p>
                    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <a href="${escapeHtml(spaHref('/admin/courses'))}" data-spa-nav="/admin/courses" class="text-indigo-600 hover:underline">${t('課程管理', 'Course admin')}</a>
                        <a href="${escapeHtml(spaHref('/summer-homework/s1'))}" data-spa-nav="/summer-homework/s1" class="text-indigo-600 hover:underline">${t('預覽中一暑期', 'Preview S1 summer')}</a>
                        <a href="${escapeHtml(spaHref('/summer-homework/s2'))}" data-spa-nav="/summer-homework/s2" class="text-indigo-600 hover:underline">${t('預覽中二暑期', 'Preview S2 summer')}</a>
                    </div>
                </div>
                <div class="space-y-3">
                    ${cards || empty}
                </div>
            </div>`;

        main.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (global.AppRouter) global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
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
                <p class="text-sm text-slate-500 mt-2">${st('請用瀏覽器直接開啟 /api/v1/summer-homework 查看錯誤內容。若提示 schema，請確認已對「網站實際連線的那個資料庫」匯入 schema_upgrade_all.sql。', 'Open /api/v1/summer-homework in the browser to see the API error. If it mentions schema, import schema_upgrade_all.sql into the same database your site .env points to.', bootLang)}</p></div>`;
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
            ? st(`以下為你年級（${formLabel}）需要完成的暑期功課。達到各習作及格線即為及格；及格後仍可重做並保留最高分。`,
                `Summer homework for your form (${formLabel}). Reach each item’s pass mark to pass. You may redo after passing; the highest score is kept.`, lang)
            : st('專為中一、中二同學而設。完成閱讀或影片後作答；達到各習作及格線即為及格。及格後仍可重做，系統會保留最高分數。',
                'For S1 and S2 students. After the passage or video, answer the questions. Reach each item’s pass mark to pass. You may redo after passing; the highest score is kept.', lang);

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

    async function renderItem(slug, opts) {
        opts = opts || {};
        const main = opts.root || document.getElementById('main-content');
        if (!main) return;
        const bootLang = opts.forceLang || resolveSummerLang();
        main.innerHTML = `<div class="max-w-3xl mx-auto"><p class="text-slate-500">${st('載入中…', 'Loading…', bootLang)}</p></div>`;

        let item = opts.item || null;
        if (!item) {
            try {
                item = await apiFetch('/summer-homework/' + encodeURIComponent(slug));
            } catch (e) {
                main.innerHTML = `<div class="max-w-3xl mx-auto"><p class="text-red-600">${escapeHtml(e.message || '')}</p>
                    <button type="button" id="sh-back" class="mt-4 text-indigo-600 underline">${st('返回列表', 'Back to list', bootLang)}</button></div>`;
                document.getElementById('sh-back')?.addEventListener('click', () => {
                    if (typeof opts.onBack === 'function') opts.onBack();
                    else navigate('/summer-homework');
                });
                return;
            }
        }

        const preview = !!(opts.preview || (item.status && item.status !== 'published'));
        const lang = opts.forceLang || resolveSummerLang(item.content_lang);
        const title = lang === 'zh' ? (item.title_zh || item.title_en) : (item.title_en || item.title_zh);
        const questions = item.questions || [];
        const alreadyPassed = !preview && item.progress && item.progress.passed;
        const statusLabel = item.status === 'draft'
            ? st('草稿', 'Draft', lang)
            : (item.status === 'pending_review' ? st('待審核', 'Pending review', lang) : '');

        let contentHtml = '';
        const refs = normalizeContentRefs(item);
        const refsHtml = renderContentRefsHtml(refs);
        const videoRef = refs.find((r) => r.type === 'video');
        if (item.content_type === 'video') {
            if (videoRef) {
                contentHtml = refsHtml;
            } else {
                contentHtml = refsHtml + youtubeEmbed(item.video_embed_url);
            }
        } else {
            const body = lang === 'zh' ? item.body_zh : item.body_en;
            contentHtml = refsHtml
                + `<article class="prose-article max-w-none mb-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm sh-passage">${renderMarkdown(body)}</article>`;
        }

        const formLabel = item.form_level === '2' ? st('中二', 'S2', lang) : st('中一', 'S1', lang);
        const closed = !preview && !!item.submissions_closed;
        const dueMeta = item.due_at
            ? `<p class="text-sm text-slate-500 mb-2">${st('截止日期', 'Due', lang)}: ${escapeHtml(formatDue(item.due_at))}
                （${item.allow_late_submit !== false ? st('允許遲交', 'Late allowed', lang) : st('截止後不可交', 'Closed after due', lang)}）</p>`
            : '';

        const previewBanner = preview
            ? `<div class="mb-4 p-4 rounded-xl border border-sky-200 bg-sky-50 text-sm text-sky-950" role="status">
                <p class="font-semibold">${st('預覽模式', 'Preview mode', lang)}${statusLabel ? ` · ${escapeHtml(statusLabel)}` : ''}</p>
                <p class="mt-1">${st('此畫面與學生所見之已發佈習作相同；預覽不會寫入呈交紀錄。', 'Same layout as the published student page; preview does not save submissions.', lang)}</p>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="sh-preview-lang px-2.5 py-1 rounded border text-xs ${lang === 'zh' ? 'bg-sky-700 text-white border-sky-700' : 'bg-white border-sky-300'}" data-lang="zh">中文</button>
                    <button type="button" class="sh-preview-lang px-2.5 py-1 rounded border text-xs ${lang === 'en' ? 'bg-sky-700 text-white border-sky-700' : 'bg-white border-sky-300'}" data-lang="en">English</button>
                </div>
            </div>`
            : '';

        const backLabel = opts.backLabel
            || (preview ? st('← 返回後台', '← Back to admin', lang) : st('← 暑期功課', '← Summer homework', lang));

        main.innerHTML = `
            <div class="max-w-3xl mx-auto w-full">
                <button type="button" id="sh-back" class="text-sm text-indigo-600 mb-4">${escapeHtml(backLabel)}</button>
                ${previewBanner}
                <div class="mb-4 flex flex-wrap items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">${formLabel}</span>
                    ${statusLabel ? `<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">${escapeHtml(statusLabel)}</span>` : ''}
                    ${preview ? '' : progressBadge(item.progress, lang)}
                </div>
                <h1 class="text-2xl font-extrabold text-slate-900 mb-2">${escapeHtml(title)}</h1>
                <p class="text-sm text-slate-500 mb-1">${st('及格線', 'Pass mark', lang)}: ${item.pass_percent}%</p>
                ${dueMeta}
                <div class="mb-6"></div>
                ${contentHtml}
                <div id="sh-quiz" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"></div>
                <div id="sh-result" class="mt-6 hidden"></div>
            </div>`;

        document.getElementById('sh-back')?.addEventListener('click', () => {
            if (typeof opts.onBack === 'function') opts.onBack();
            else navigate('/summer-homework');
        });
        main.querySelectorAll('.sh-preview-lang').forEach((btn) => {
            btn.addEventListener('click', () => {
                const nextLang = btn.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
                void renderItem(slug, Object.assign({}, opts, { item, forceLang: nextLang, preview: true }));
            });
        });

        await enhanceMath(main);
        if (global.AppContentEmbeds && typeof AppContentEmbeds.hydrate === 'function') {
            await AppContentEmbeds.hydrate(main);
        }

        const quizEl = document.getElementById('sh-quiz');
        if (alreadyPassed) {
            const best = item.progress.percent;
            quizEl.insertAdjacentHTML('beforebegin',
                `<div class="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900" role="status">
                    ${st(`你已及格（最高 ${best}%）。仍可重做；若本次分數較低，仍保留最高分。`, `You have passed (best ${best}%). You may still redo; if this attempt is lower, your best score is kept.`, lang)}
                </div>`);
        } else if (!preview && item.progress && item.progress.attempts > 0) {
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

        // Check login for submit (preview still shows interactive UI)
        let me = null;
        try {
            me = await apiFetch('/auth/me');
        } catch (e) {
            me = null;
        }
        if (!preview && (!me || !me.id)) {
            quizEl.innerHTML = `<p class="text-amber-800">${st('請先登入後再作答。', 'Please log in to attempt this assessment.', lang)}</p>
                <a class="inline-block mt-3 text-indigo-600 underline" href="../login.php?next=${encodeURIComponent('app/summer-homework/' + slug)}">${st('登入', 'Log in', lang)}</a>`;
            return;
        }

        const showKeys = !preview && !!(item.include_answers || item.can_review);
        let html = `<h2 class="text-lg font-bold mb-4">${st('跟進題目', 'Follow-up questions', lang)}</h2>`;
        if (showKeys) {
            html = `<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${st('教師／管理員檢視模式：已顯示正確答案。', 'Teacher/admin review mode: correct answers are shown.', lang)}</div>` + html;
        }
        if (preview) {
            html = `<div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">${st('預覽作答介面（不會真正呈交）。', 'Interactive preview only — submissions are not saved.', lang)}</div>` + html;
        }
        questions.forEach((q, qi) => {
            const stem = lang === 'zh' ? q.stem_zh : q.stem_en;
            const type = q.question_type || 'mcq';
            const stemRendered = renderRichText(stem);
            let stemBlock = `<div class="font-medium text-slate-900 mb-3 prose-article sh-q-stem">${qi + 1}. ${stemRendered}</div>`;
            let fillFallback = '';
            if (type === 'fill_blank') {
                const blanks = q.blanks || [{ blank_index: 1 }];
                const inline = stemWithInlineBlanks(stemRendered, blanks.length);
                stemBlock = `<div class="font-medium text-slate-900 mb-3 prose-article sh-q-stem">${qi + 1}. ${inline.html}</div>`;
                if (!inline.hasInline) {
                    blanks.forEach((b, bi) => {
                        let ansHint = '';
                        if (showKeys) {
                            const answers = Array.isArray(b.acceptable_answers) ? b.acceptable_answers : [{
                                acceptable_answer_zh: b.acceptable_answer_zh || '',
                                acceptable_answer_en: b.acceptable_answer_en || '',
                            }];
                            const texts = answers.map((a) => ((a.acceptable_answer_zh || '') + ' / ' + (a.acceptable_answer_en || '')).trim()).filter((t) => t !== '/' && t !== '');
                            ansHint = `<p class="text-xs text-emerald-700 mt-1">${st('可接受', 'Acceptable', lang)}：${escapeHtml(texts.join('；'))}</p>`;
                        }
                        fillFallback += `<div class="mb-2">
                            <label class="text-xs text-slate-500">${st('空格', 'Blank', lang)} ${bi + 1}</label>
                            <input type="text" class="sh-blank w-full border rounded-lg px-3 py-2 mt-1" data-blank="${bi}" autocomplete="off">
                            ${ansHint}
                        </div>`;
                    });
                } else if (showKeys) {
                    blanks.forEach((b, bi) => {
                        const answers = Array.isArray(b.acceptable_answers) ? b.acceptable_answers : [];
                        const texts = answers.map((a) => ((a.acceptable_answer_zh || '') + ' / ' + (a.acceptable_answer_en || '')).trim()).filter((t) => t !== '/' && t !== '');
                        if (texts.length) {
                            fillFallback += `<p class="text-xs text-emerald-700 mb-1">${st('空格', 'Blank', lang)} ${bi + 1} ${st('可接受', 'Acceptable', lang)}：${escapeHtml(texts.join('；'))}</p>`;
                        }
                    });
                }
            }
            html += `<div class="mb-6 pb-6 border-b border-slate-100 last:border-0" data-qid="${q.id}" data-type="${type}">
                ${stemBlock}`;
            if (type === 'mcq') {
                (q.options || []).forEach((o, oi) => {
                    const text = lang === 'zh' ? o.text_zh : o.text_en;
                    const isCorrect = showKeys && !!o.is_correct;
                    html += `<label class="flex items-start gap-2 mb-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : ''}">
                        <input type="radio" name="q-${q.id}" value="${oi}" class="mt-1">
                        <span class="sh-q-opt"><span class="font-bold text-indigo-600 mr-1">${String.fromCharCode(65 + oi)}</span>${renderRichText(text)}${isCorrect ? ` <span class="text-xs text-emerald-700">${st('✓ 正確', '✓ Correct', lang)}</span>` : ''}</span>
                    </label>`;
                });
            } else if (type === 'multi_select') {
                (q.options || []).forEach((o, oi) => {
                    const text = lang === 'zh' ? o.text_zh : o.text_en;
                    const isCorrect = showKeys && !!o.is_correct;
                    html += `<label class="flex items-start gap-2 mb-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : ''}">
                        <input type="checkbox" name="q-${q.id}" value="${oi}" class="mt-1 sh-multi">
                        <span class="sh-q-opt"><span class="font-bold text-indigo-600 mr-1">${String.fromCharCode(65 + oi)}</span>${renderRichText(text)}${isCorrect ? ` <span class="text-xs text-emerald-700">${st('✓ 正確', '✓ Correct', lang)}</span>` : ''}</span>
                    </label>`;
                });
                html += `<p class="text-xs text-slate-500 mt-1">${st('請選出所有正確選項。', 'Select all correct options.', lang)}</p>`;
            } else if (type === 'true_false') {
                const correctTrue = q.correct_bool === true || q.correct_bool === 1;
                html += `<div class="flex flex-wrap gap-3">
                    <label class="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 ${showKeys && correctTrue ? 'border-emerald-400 bg-emerald-50' : ''}">
                        <input type="radio" name="q-${q.id}" value="1" class="sh-tf"> ${st('是／對', 'True', lang)}
                    </label>
                    <label class="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 ${showKeys && !correctTrue ? 'border-emerald-400 bg-emerald-50' : ''}">
                        <input type="radio" name="q-${q.id}" value="0" class="sh-tf"> ${st('否／錯', 'False', lang)}
                    </label>
                </div>`;
            } else if (type === 'short_answer') {
                let ansHint = '';
                if (showKeys && Array.isArray(q.acceptable_answers)) {
                    const texts = q.acceptable_answers.map((a) => (lang === 'zh' ? a.acceptable_answer_zh : a.acceptable_answer_en) || a.acceptable_answer_zh || a.acceptable_answer_en).filter(Boolean);
                    ansHint = `<p class="text-xs text-emerald-700 mt-1">${st('可接受', 'Acceptable', lang)}：${escapeHtml(texts.join(' / '))}</p>`;
                }
                html += `<input type="text" class="sh-short w-full border rounded-lg px-3 py-2" autocomplete="off">${ansHint}`;
            } else if (type === 'long_answer') {
                const maxS = q.max_score != null ? q.max_score : 5;
                html += `<p class="text-xs text-slate-500 mb-1">${st('長答（教師評閱，不計入自動及格分）', 'Long answer (teacher-marked; not in auto pass score)', lang)} · ${st('滿分', 'Max', lang)} ${maxS}</p>
                    <textarea class="sh-long w-full border rounded-lg px-3 py-2" rows="5"></textarea>`;
            } else if (type === 'fill_blank') {
                html += fillFallback;
            }
            const expl = lang === 'zh' ? (q.explanation_zh || '') : (q.explanation_en || q.explanation_zh || '');
            if (expl) {
                html += `<div class="sh-explanation hidden mt-3 p-3 rounded-lg bg-slate-50 border text-sm prose-article" data-expl="1">${renderRichText(expl)}</div>`;
            }
            html += '</div>';
        });
        html += `<p id="sh-unanswered" class="hidden text-sm text-amber-800 mb-3" role="alert"></p>`;
        html += `<button type="button" id="sh-submit" class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">${preview ? st('試做（不呈交）', 'Try (no submit)', lang) : (alreadyPassed ? st('重新提交', 'Resubmit', lang) : st('提交答案', 'Submit', lang))}</button>`;
        quizEl.innerHTML = html;
        await enhanceMath(quizEl);

        document.getElementById('sh-submit')?.addEventListener('click', async () => {
            const responses = {};
            const unanswered = [];
            document.querySelectorAll('#sh-quiz [data-qid]').forEach((block, qi) => {
                const qid = block.getAttribute('data-qid');
                const type = block.getAttribute('data-type');
                let empty = false;
                if (type === 'mcq') {
                    const sel = block.querySelector('input[type=radio]:checked');
                    responses[qid] = {
                        selected_option_index: sel ? parseInt(sel.value, 10) : null,
                    };
                    empty = !sel;
                } else if (type === 'multi_select') {
                    const sels = [...block.querySelectorAll('input.sh-multi:checked')].map((el) => parseInt(el.value, 10));
                    responses[qid] = { selected_option_indexes: sels };
                    empty = sels.length === 0;
                } else if (type === 'true_false') {
                    const sel = block.querySelector('input.sh-tf:checked');
                    responses[qid] = {
                        selected_bool: sel ? sel.value === '1' : null,
                    };
                    empty = !sel;
                } else if (type === 'short_answer') {
                    const text = block.querySelector('.sh-short')?.value || '';
                    responses[qid] = { text };
                    empty = !String(text).trim();
                } else if (type === 'long_answer') {
                    const text = block.querySelector('.sh-long')?.value || '';
                    responses[qid] = { text };
                    empty = !String(text).trim();
                } else {
                    const inputs = [...block.querySelectorAll('.sh-blank')];
                    const maxBi = inputs.reduce((m, inp) => Math.max(m, parseInt(inp.getAttribute('data-blank') || '0', 10)), -1);
                    const blanks = [];
                    for (let bi = 0; bi <= maxBi; bi++) {
                        const inp = inputs.find((el) => parseInt(el.getAttribute('data-blank') || '-1', 10) === bi);
                        blanks.push(inp ? inp.value : '');
                    }
                    if (!blanks.length && inputs.length) {
                        inputs.forEach((inp) => blanks.push(inp.value));
                    }
                    responses[qid] = { blanks };
                    empty = blanks.length === 0 || blanks.every((b) => !String(b).trim());
                }
                block.classList.toggle('ring-2', empty);
                block.classList.toggle('ring-amber-400', empty);
                if (empty) unanswered.push(qi + 1);
            });

            const warn = document.getElementById('sh-unanswered');
            if (unanswered.length) {
                if (warn) {
                    warn.textContent = st(`尚有未作答題目：第 ${unanswered.join('、')} 題。仍要提交嗎？`, `Unanswered: Q${unanswered.join(', Q')}. Submit anyway?`, lang);
                    warn.classList.remove('hidden');
                }
                if (!confirm(st(`尚有 ${unanswered.length} 題未作答，確定提交？`, `${unanswered.length} question(s) unanswered. Submit anyway?`, lang))) {
                    return;
                }
            } else if (warn) {
                warn.classList.add('hidden');
            }

            const gradeKey = resolveClientGradeKey(item);
            const localGraded = gradeClientResponses(gradeKey, responses, item.pass_percent);
            let failAlerted = false;

            if (preview) {
                if (localGraded) {
                    const provisional = {
                        ...localGraded,
                        ever_passed: localGraded.passed,
                        must_redo: !localGraded.passed,
                        best_percent: localGraded.percent,
                        previous_best_percent: null,
                        score_improved: true,
                        submitted_at: null,
                    };
                    document.querySelectorAll('#sh-quiz .sh-explanation').forEach((el) => el.classList.remove('hidden'));
                    showResult(provisional, slug, lang, questions, { instant: true });
                    notifyFailIfNeeded(provisional, lang, false);
                } else {
                    alert(st('預覽模式無法即時批改（缺少答案金鑰）。發佈後學生可正式提交。', 'Preview cannot auto-grade without answer keys. Students can submit after publish.', lang));
                }
                return;
            }

            const btn = document.getElementById('sh-submit');
            if (btn) {
                btn.disabled = true;
                btn.textContent = st('提交中…', 'Submitting…', lang);
            }

            // Start save immediately so network runs while we show instant grade / alert.
            const submitPromise = apiFetch('/summer-homework/' + encodeURIComponent(slug) + '/submit', {
                method: 'POST',
                body: { responses },
            });

            if (localGraded) {
                const prevBest = item.progress && item.progress.percent != null ? Number(item.progress.percent) : null;
                const provisional = {
                    ...localGraded,
                    ever_passed: alreadyPassed || localGraded.passed,
                    must_redo: !(alreadyPassed || localGraded.passed),
                    best_percent: prevBest == null ? localGraded.percent : Math.max(prevBest, localGraded.percent),
                    previous_best_percent: prevBest,
                    score_improved: prevBest == null || localGraded.percent > prevBest,
                    submitted_at: null,
                };
                document.querySelectorAll('#sh-quiz .sh-explanation').forEach((el) => el.classList.remove('hidden'));
                showResult(provisional, slug, lang, questions, { instant: true });
                failAlerted = notifyFailIfNeeded(provisional, lang, false);
            }

            try {
                const result = await submitPromise;
                document.querySelectorAll('#sh-quiz .sh-explanation').forEach((el) => el.classList.remove('hidden'));
                notifyFailIfNeeded(result, lang, failAlerted);
                showResult(result, slug, lang, questions);
            } catch (err) {
                alert(err.message || st('提交失敗', 'Submit failed', lang));
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = alreadyPassed ? st('重新提交', 'Resubmit', lang) : st('提交答案', 'Submit', lang);
                }
            }
        });
    }

    function formatDetailsHtml(details, lang, questionsById) {
        if (!Array.isArray(details) || details.length === 0) return '';
        const rows = details.map((d, i) => {
            const type = d.type || '';
            let status = '';
            if (d.needs_marking) {
                status = `<span class="text-slate-600">${st('待教師評閱', 'Awaiting teacher mark', lang)}</span>`;
            } else if (d.correct === true) {
                status = `<span class="text-emerald-700 font-medium">${st('正確', 'Correct', lang)}</span>`;
            } else if (d.correct === false) {
                status = `<span class="text-amber-800 font-medium">${st('不正確', 'Incorrect', lang)}</span>`;
            }
            let extra = '';
            if (type === 'mcq' && d.correct_option_index != null) {
                extra = `<span class="text-slate-500"> · ${st('正解', 'Answer', lang)} ${String.fromCharCode(65 + Number(d.correct_option_index))}</span>`;
            } else if (type === 'multi_select' && Array.isArray(d.correct_option_indexes)) {
                const labels = d.correct_option_indexes.map((i) => String.fromCharCode(65 + Number(i))).join(', ');
                extra = `<span class="text-slate-500"> · ${st('正解', 'Answer', lang)} ${escapeHtml(labels)}</span>`;
            } else if (type === 'true_false' && d.correct_bool != null) {
                extra = `<span class="text-slate-500"> · ${st('正解', 'Answer', lang)} ${d.correct_bool ? st('是', 'True', lang) : st('否', 'False', lang)}</span>`;
            } else if (type === 'short_answer' && Array.isArray(d.acceptable_answers) && d.acceptable_answers.length) {
                extra = `<span class="text-slate-500"> · ${st('可接受', 'Acceptable', lang)}: ${escapeHtml(d.acceptable_answers.join(' / '))}</span>`;
            } else if (type === 'fill_blank' && Array.isArray(d.blanks)) {
                const miss = d.blanks.filter((b) => !b.correct).map((b) => b.blank_index).join(', ');
                if (miss) extra = `<span class="text-slate-500"> · ${st('錯空格', 'Wrong blanks', lang)}: ${escapeHtml(miss)}</span>`;
            } else if (type === 'long_answer') {
                extra = `<span class="text-slate-500"> · ${st('已交文字', 'Submitted text', lang)} ${d.given ? st('有', 'yes', lang) : st('無', 'no', lang)}</span>`;
            }
            const pts = d.exclude_from_auto
                ? ''
                : ` <span class="text-slate-400">(${d.score != null ? d.score : 0}/${d.max != null ? d.max : 1})</span>`;
            let explHtml = '';
            if (d.explanation) {
                explHtml = `<div class="mt-1 text-xs text-slate-600 prose-article">${renderRichText(d.explanation)}</div>`;
            } else if (questionsById && questionsById[d.question_id]) {
                const q = questionsById[d.question_id];
                const expl = lang === 'zh' ? (q.explanation_zh || '') : (q.explanation_en || q.explanation_zh || '');
                if (expl) explHtml = `<div class="mt-1 text-xs text-slate-600 prose-article">${renderRichText(expl)}</div>`;
            }
            return `<li class="text-sm py-1">${st('題', 'Q', lang)} ${i + 1}: ${status}${pts}${extra}${explHtml}</li>`;
        }).join('');
        return `<div class="mt-4 pt-4 border-t border-slate-200/80">
            <p class="text-sm font-semibold text-slate-800 mb-2">${st('逐題結果', 'Per-question results', lang)}</p>
            <ul class="list-none space-y-0.5">${rows}</ul>
        </div>`;
    }

    function showResult(result, slug, lang, questions, opts) {
        const box = document.getElementById('sh-result');
        const quizEl = document.getElementById('sh-quiz');
        if (!box) return;
        lang = lang || resolveSummerLang();
        opts = opts || {};
        const questionsById = {};
        (questions || []).forEach((q) => { questionsById[q.id] = q; });

        const passed = !!result.passed;
        const everPassed = result.ever_passed != null ? !!result.ever_passed : passed;
        const bestPercent = result.best_percent != null ? result.best_percent : result.percent;
        const improved = !!result.score_improved;
        const bestNote = result.previous_best_percent != null
            ? (improved
                ? `<p class="mt-2 text-sm text-emerald-800">${st('已更新最高分：', 'Best score updated:', lang)} ${bestPercent}%</p>`
                : `<p class="mt-2 text-sm text-slate-700">${st('本次未超過最高分，仍保留', 'This attempt did not beat your best. Keeping', lang)} ${bestPercent}%。</p>`)
            : '';

        const failHard = !passed && !everPassed;
        box.className = 'mt-6 p-6 rounded-xl border ' + (passed
            ? 'bg-emerald-50 border-emerald-200'
            : (failHard ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-slate-50 border-slate-200'));
        const titleClass = passed
            ? 'text-emerald-900'
            : (failHard ? 'text-red-800' : 'text-slate-900');
        const bodyClass = passed
            ? 'text-emerald-800'
            : (failHard ? 'text-red-900' : 'text-slate-700');

        const syncNote = opts.instant
            ? `<p class="mt-2 text-xs text-slate-500">${st('正在同步呈交紀錄…', 'Saving your attempt…', lang)}</p>`
            : '';

        box.innerHTML = `
            <p class="text-2xl font-extrabold ${titleClass}" role="status" aria-live="assertive">
                ${passed ? st('及格！', 'Passed!', lang) : (everPassed ? st('已提交', 'Submitted', lang) : st('不及格', 'Not passed', lang))}
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
            ${syncNote}
            ${formatDetailsHtml(result.details, lang, questionsById)}
            ${passed
                ? `<p class="mt-3 text-sm text-emerald-800">${st('做得好！可返回列表，或重做爭取更高分。', 'Well done! Continue with other assessments, or redo for a higher score.', lang)}</p>`
                : (everPassed
                    ? `<p class="mt-3 text-sm text-slate-700">${st('你先前已及格；本次分數較低時不會降低最高分。', 'You already passed earlier; a lower attempt will not reduce your best score.', lang)}</p>`
                    : `<p class="mt-3 text-sm text-red-900 font-semibold" role="alert">${st('不及格：未達及格線，狀態為「未交」。請重讀／重看內容後再次完成並提交。', 'Not passed: below the pass mark — status is “Not completed”. Review the content and complete the assessment again.', lang)}</p>`)}
            <button type="button" id="sh-redo" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">${st('重新作答', 'Try again', lang)}</button>
            <button type="button" id="sh-back-list" class="mt-4 ml-2 text-indigo-600 underline text-sm">${st('返回列表', 'Back to list', lang)}</button>
        `;
        box.classList.remove('hidden');
        if (quizEl) quizEl.querySelectorAll('input, button, textarea').forEach((el) => { el.disabled = true; });
        try {
            box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) { /* ignore */ }

        document.getElementById('sh-back-list')?.addEventListener('click', () => navigate('/summer-homework'));
        document.getElementById('sh-redo')?.addEventListener('click', () => navigate('/summer-homework/' + encodeURIComponent(slug), true));
    }

    global.AppSummerHomework = {
        renderList,
        renderItem,
        renderHome,
        renderTeacherHome,
    };

export {};
