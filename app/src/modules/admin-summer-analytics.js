'use strict';
const global = window;

    function t(zh, en) {
        return global.AppRouter && global.AppRouter.t ? global.AppRouter.t(zh, en) : zh;
    }

    function escapeHtml(s) {
        return global.AppRouter && global.AppRouter.escapeHtml
            ? global.AppRouter.escapeHtml(s)
            : String(s || '');
    }

    function setShell() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }


    function truncate(s, n) {
        const str = String(s || '');
        return str.length > n ? str.slice(0, n) + '…' : str;
    }

    function typeLabel(type) {
        return {
            mcq: t('選擇', 'MCQ'),
            fill_blank: t('填充', 'Fill'),
            true_false: t('是非', 'T/F'),
            short_answer: t('短答', 'Short'),
            long_answer: t('長答', 'Long'),
        }[type] || type || '—';
    }

    function boolLabel(v) {
        if (v === null || v === undefined) return '—';
        return v ? t('是', 'Yes') : t('否', 'No');
    }

    function missClass(miss) {
        if (miss === null || miss === undefined) return 'text-slate-400';
        if (miss >= 50) return 'text-red-700 font-semibold';
        if (miss >= 30) return 'text-orange-700';
        return 'text-emerald-700';
    }

    function setAnalyticsUrl(itemId, userId, attemptId) {
        const appBase = location.pathname.split('/app')[0] + '/app';
        const path = '/admin/summer-homework/' + itemId + '/analytics';
        const q = new URLSearchParams();
        if (userId > 0) q.set('user_id', String(userId));
        if (attemptId > 0) q.set('attempt_id', String(attemptId));
        const qs = q.toString();
        history.replaceState({ path }, '', appBase + path + (qs ? '?' + qs : ''));
    }

    function findDetail(details, qid) {
        if (!Array.isArray(details)) return null;
        return details.find((d) => isArrayish(d) && Number(d.question_id) === qid) || null;
    }

    function isArrayish(v) {
        return v && typeof v === 'object';
    }

    function teacherMark(attempt, qid) {
        let marks = attempt.teacher_marks;
        if (!marks && attempt.teacher_marks_json) {
            try {
                marks = typeof attempt.teacher_marks_json === 'string'
                    ? JSON.parse(attempt.teacher_marks_json)
                    : attempt.teacher_marks_json;
            } catch (e) {
                marks = null;
            }
        }
        if (!isArrayish(marks)) return null;
        return marks[String(qid)] || marks[qid] || null;
    }

    async function renderAdminSummerAnalytics(idRaw) {
        setShell();
        const itemId = parseInt(idRaw, 10) || 0;
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('呈交分析', 'Submission analytics');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (itemId <= 0) {
            global.AppRouter.navigate('/admin/summer-homework');
            return;
        }

        const params = new URLSearchParams(location.search);
        let filterUserId = parseInt(params.get('user_id') || '0', 10) || 0;
        let attemptId = parseInt(params.get('attempt_id') || '0', 10) || 0;

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const data = await global.ScienceApi.apiFetch('/admin/summer-homework/' + itemId + '/analytics');
            const item = data.item || {};
            const analytics = data.analytics || {};
            const students = data.students || [];
            const questions = data.questions || [];
            const canManage = !!data.can_manage;
            const qById = {};
            questions.forEach((q) => { qById[Number(q.id)] = q; });

            let studentAttempts = [];
            if (filterUserId > 0) {
                const att = await global.ScienceApi.apiFetch(
                    '/admin/summer-homework/' + itemId + '/attempts?user_id=' + filterUserId
                );
                studentAttempts = att.attempts || [];
            }

            let selectedAttempt = null;
            if (attemptId > 0) {
                selectedAttempt = studentAttempts.find((a) => Number(a.id) === attemptId) || null;
                if (!selectedAttempt && filterUserId <= 0) {
                    const allAtt = await global.ScienceApi.apiFetch('/admin/summer-homework/' + itemId + '/attempts');
                    selectedAttempt = (allAtt.attempts || []).find((a) => Number(a.id) === attemptId) || null;
                }
            }

            const filterStudentName = (students.find((s) => Number(s.user_id) === filterUserId) || {}).display_name || '';
            const itemTitle = item.title_zh || item.title_en || ('#' + itemId);
            const formLabel = String(item.form_level) === '2' ? t('中二', 'S2') : t('中一', 'S1');

            const qRows = (analytics.questions || []).map((qs, qi) => {
                const qid = Number(qs.question_id);
                const qrow = qById[qid];
                const stem = qrow ? (qrow.stem_zh || qrow.stem_en || '') : '';
                const miss = qs.miss_rate_percent;
                let extra = '';
                if (qs.type === 'mcq' && Array.isArray(qs.options) && qs.options.length) {
                    extra = `<tr class="border-t border-slate-50 bg-slate-50/40"><td colspan="7" class="p-0">
                        <table class="min-w-full text-xs"><thead><tr class="text-slate-500 text-left">
                            <th class="px-3 py-2 pl-8 w-16">${escapeHtml(t('選項', 'Opt'))}</th>
                            <th class="px-3 py-2">${escapeHtml(t('內容', 'Text'))}</th>
                            <th class="px-3 py-2 w-20">${escapeHtml(t('被選次數', 'Picked'))}</th>
                            <th class="px-3 py-2 w-24">${escapeHtml(t('佔全部呈交', '% all'))}</th>
                            <th class="px-3 py-2 w-24">${escapeHtml(t('錯選佔比', '% of wrong'))}</th>
                        </tr></thead><tbody>
                        ${qs.options.map((opt) => {
                            const isCorrect = !!opt.is_correct;
                            const optText = (opt.text_zh || opt.text_en || '') || '—';
                            const selRate = opt.select_rate_percent;
                            const wrongRate = opt.wrong_select_rate_percent;
                            const tone = isCorrect ? 'text-emerald-800' : ((Number(selRate || 0) >= 20) ? 'text-red-800' : 'text-slate-700');
                            return `<tr class="border-t border-slate-100/80 ${tone}">
                                <td class="px-3 py-2 pl-8 font-bold">${escapeHtml(String(opt.label || String.fromCharCode(65 + Number(opt.index || 0))))}${isCorrect ? ` <span class="ml-1 font-normal text-emerald-700">✓ ${escapeHtml(t('正確', 'Correct'))}</span>` : ''}</td>
                                <td class="px-3 py-2">${escapeHtml(truncate(optText, 80))}</td>
                                <td class="px-3 py-2">${Number(opt.selected_count || 0)}</td>
                                <td class="px-3 py-2">${selRate == null ? '—' : escapeHtml(String(selRate)) + '%'}</td>
                                <td class="px-3 py-2">${isCorrect ? '—' : (wrongRate == null ? '—' : escapeHtml(String(wrongRate)) + '%')}</td>
                            </tr>`;
                        }).join('')}
                        ${Number(qs.unanswered || 0) > 0 ? `<tr class="border-t border-slate-100/80 text-slate-500">
                            <td class="px-3 py-2 pl-8" colspan="2">${escapeHtml(t('（未作答）', '(unanswered)'))}</td>
                            <td class="px-3 py-2">${Number(qs.unanswered)}</td>
                            <td class="px-3 py-2">${Number(qs.attempts) > 0 ? escapeHtml(String(Math.round((Number(qs.unanswered) / Number(qs.attempts)) * 10000) / 100)) + '%' : '—'}</td>
                            <td class="px-3 py-2">—</td>
                        </tr>` : ''}
                        </tbody></table></td></tr>`;
                }
                if (Array.isArray(qs.blanks) && qs.blanks.length) {
                    extra += qs.blanks.map((blank) => {
                        const bMiss = blank.miss_rate_percent;
                        return `<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                            <td class="p-2 pl-8 text-slate-500" colspan="2">└ ${escapeHtml(t('空格', 'Blank'))} ${Number(blank.blank_index)}</td>
                            <td class="p-2 text-slate-500">—</td>
                            <td class="p-2">${Number(blank.attempts || 0)}</td>
                            <td class="p-2">${Number(blank.correct || 0)}</td>
                            <td class="p-2">${Number(blank.incorrect || 0)}</td>
                            <td class="p-2 ${missClass(bMiss)}">${bMiss == null ? '—' : escapeHtml(String(bMiss)) + '%'}</td>
                        </tr>`;
                    }).join('');
                }
                if (qs.type === 'true_false') {
                    const cb = qs.correct_bool;
                    extra += `<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="3">└ ${escapeHtml(t('選「是」', 'True'))} ${Number(qs.true_count || 0)}
                            · ${escapeHtml(t('選「否」', 'False'))} ${Number(qs.false_count || 0)}
                            · ${escapeHtml(t('正解', 'Answer'))}：${escapeHtml(boolLabel(cb))}</td>
                        <td colspan="4"></td></tr>`;
                }
                if (qs.type === 'short_answer' && Array.isArray(qs.common_wrong_answers) && qs.common_wrong_answers.length) {
                    const parts = qs.common_wrong_answers.map((wa) =>
                        escapeHtml(String(wa.answer || '')) + '（' + Number(wa.count || 0) + '）'
                    ).join('、');
                    extra += `<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${escapeHtml(t('常見錯答', 'Common wrong'))}：${parts || '—'}</td></tr>`;
                }
                if (qs.type === 'long_answer') {
                    extra += `<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${escapeHtml(t('待評', 'Needs mark'))} ${Number(qs.needs_marking || 0)}
                            · ${escapeHtml(t('已評', 'Marked'))} ${Number(qs.marked || 0)}</td></tr>`;
                }

                return `<tr class="border-t border-slate-100 align-top">
                    <td class="p-3">${qi + 1}</td>
                    <td class="p-3">${escapeHtml(typeLabel(qs.type))}</td>
                    <td class="p-3 max-w-md">${escapeHtml(truncate(stem, 60) || ('#' + qid))}</td>
                    <td class="p-3">${Number(qs.attempts || 0)}</td>
                    <td class="p-3">${Number(qs.correct || 0)}</td>
                    <td class="p-3">${Number(qs.incorrect || 0)}</td>
                    <td class="p-3 ${missClass(miss)}">${miss == null ? '—' : escapeHtml(String(miss)) + '%'}</td>
                </tr>${extra}`;
            }).join('');

            const studentRows = students.map((s) => {
                const uid = Number(s.user_id);
                const active = filterUserId === uid;
                const notPassed = !s.passed;
                const rowTone = active ? 'bg-indigo-50/50' : (notPassed ? 'bg-amber-50/70' : '');
                return `<tr class="border-t border-slate-100 ${rowTone}">
                    <td class="p-3 font-medium">${escapeHtml(s.display_name || '')}</td>
                    <td class="p-3 text-xs text-slate-600">${escapeHtml(s.email || '')}</td>
                    <td class="p-3">${Number(s.attempts || 0)}</td>
                    <td class="p-3">${escapeHtml(String(s.best_percent ?? '—'))}%${s.best_score != null ? ` <span class="text-xs text-slate-500">（${escapeHtml(String(s.best_score))}/${escapeHtml(String(s.best_max_score))}）</span>` : ''}</td>
                    <td class="p-3 ${notPassed ? 'text-amber-900 font-semibold' : 'text-emerald-800'}">${escapeHtml(boolLabel(!!s.passed))}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.first_passed_at ? escapeHtml(String(s.first_passed_at).slice(0, 16)) : '—'}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.last_submitted_at ? escapeHtml(String(s.last_submitted_at).slice(0, 16)) : '—'}</td>
                    <td class="p-3"><button type="button" class="sh-filter-user text-indigo-600 hover:underline" data-user-id="${uid}">${escapeHtml(t('詳細', 'Detail'))}</button></td>
                </tr>`;
            }).join('');

            let attemptsBlock = '';
            if (filterUserId > 0) {
                const n = studentAttempts.length;
                const rows = studentAttempts.map((a, i) => {
                    const seq = n - i;
                    const isSel = selectedAttempt && Number(selectedAttempt.id) === Number(a.id);
                    return `<tr class="border-t border-slate-100 ${isSel ? 'bg-amber-50' : ''}">
                        <td class="p-3">${seq}</td>
                        <td class="p-3 text-xs whitespace-nowrap">${escapeHtml(String(a.submitted_at || '').slice(0, 19))}</td>
                        <td class="p-3">${escapeHtml(String(a.score))} / ${escapeHtml(String(a.max_score))}</td>
                        <td class="p-3">${escapeHtml(String(a.percent))}%</td>
                        <td class="p-3">${escapeHtml(boolLabel(!!a.passed))}</td>
                        <td class="p-3"><button type="button" class="sh-open-attempt text-indigo-600 hover:underline" data-attempt-id="${Number(a.id)}">${escapeHtml(t('查看作答', 'View'))}</button></td>
                    </tr>`;
                }).join('');
                attemptsBlock = `<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                        <h2 class="font-bold text-slate-800">${escapeHtml(filterStudentName || (t('學生', 'Student') + ' #' + filterUserId))} — ${escapeHtml(t('全部呈交', 'All attempts'))}（${n}）</h2>
                        <button type="button" id="sh-clear-user" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('清除學生篩選', 'Clear student filter'))}</button>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">#</th><th class="p-3">${escapeHtml(t('時間', 'Time'))}</th>
                            <th class="p-3">${escapeHtml(t('分數', 'Score'))}</th><th class="p-3">${escapeHtml(t('百分比', 'Percent'))}</th>
                            <th class="p-3">${escapeHtml(t('及格', 'Passed'))}</th><th class="p-3">${escapeHtml(t('明細', 'Detail'))}</th>
                        </tr></thead>
                        <tbody>${rows || `<tr><td colspan="6" class="p-6 text-slate-500 text-center">${escapeHtml(t('此學生尚無呈交。', 'No attempts.'))}</td></tr>`}</tbody>
                    </table>
                </div>`;
            }

            let detailBlock = '';
            if (selectedAttempt) {
                const grading = isArrayish(selectedAttempt.grading) ? selectedAttempt.grading : null;
                const details = isArrayish(grading) && Array.isArray(grading.details) ? grading.details : [];
                const responses = isArrayish(selectedAttempt.responses) ? selectedAttempt.responses : {};
                const qCards = questions.map((q, di) => {
                    const qid = Number(q.id);
                    const detail = findDetail(details, qid);
                    const resp = responses[String(qid)] ?? responses[qid] ?? null;
                    const stem = q.stem_zh || q.stem_en || '';
                    const ok = detail ? !!detail.correct : null;
                    const badge = ok === null
                        ? `<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${escapeHtml(t('無評分', 'Ungraded'))}</span>`
                        : (ok
                            ? `<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${escapeHtml(t('正確', 'Correct'))}</span>`
                            : `<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">${escapeHtml(t('錯誤', 'Wrong'))}</span>`);
                    let body = '';
                    const qtype = String(q.question_type || '');
                    if (qtype === 'mcq') {
                        let selectedIdx = null;
                        if (detail && Object.prototype.hasOwnProperty.call(detail, 'selected_option_index')) {
                            selectedIdx = detail.selected_option_index != null ? Number(detail.selected_option_index) : null;
                        } else if (resp && resp.selected_option_index != null) {
                            selectedIdx = Number(resp.selected_option_index);
                        }
                        const correctIdx = detail && detail.correct_option_index != null ? Number(detail.correct_option_index) : null;
                        body = '<ul class="text-sm space-y-1">' + (q.options || []).map((opt, oi) => {
                            const label = String.fromCharCode(65 + oi);
                            const text = opt.text_zh || opt.text_en || '';
                            const marks = [];
                            if (selectedIdx !== null && oi === selectedIdx) marks.push(t('學生選', 'Chosen'));
                            if (correctIdx !== null && oi === correctIdx) marks.push(t('正確答案', 'Answer'));
                            let rowClass = '';
                            if (correctIdx !== null && oi === correctIdx) rowClass = 'text-emerald-800';
                            else if (selectedIdx !== null && oi === selectedIdx) rowClass = 'text-red-800';
                            return `<li class="${rowClass}"><span class="font-bold text-indigo-600 mr-1">${label}</span>${escapeHtml(text)}${marks.length ? ` <span class="text-xs text-slate-500">（${escapeHtml(marks.join(' · '))}）</span>` : ''}</li>`;
                        }).join('') + '</ul>';
                    } else if (qtype === 'true_false') {
                        const selB = detail && Object.prototype.hasOwnProperty.call(detail, 'selected_bool')
                            ? detail.selected_bool
                            : (resp && Object.prototype.hasOwnProperty.call(resp, 'selected_bool') ? resp.selected_bool : null);
                        const corB = detail && Object.prototype.hasOwnProperty.call(detail, 'correct_bool')
                            ? detail.correct_bool
                            : (q.correct_bool ?? null);
                        body = `<p class="text-sm">${escapeHtml(t('學生', 'Student'))}：${escapeHtml(boolLabel(selB))} · ${escapeHtml(t('正解', 'Answer'))}：${escapeHtml(boolLabel(corB))}</p>`;
                    } else if (qtype === 'short_answer') {
                        const given = detail && detail.given != null ? String(detail.given) : (resp ? String(resp.text || '') : '');
                        body = `<p class="text-sm font-mono">${given !== '' ? escapeHtml(given) : escapeHtml(t('（空白）', '(blank)'))}</p>`;
                    } else if (qtype === 'long_answer') {
                        const given = detail && detail.given != null ? String(detail.given) : (resp ? String(resp.text || '') : '');
                        const tm = teacherMark(selectedAttempt, qid) || {};
                        const maxScore = q.max_score != null ? q.max_score : 5;
                        body = `<div class="text-sm whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 mb-3">${given !== '' ? escapeHtml(given) : escapeHtml(t('（空白）', '(blank)'))}</div>
                            <form class="sh-mark-form space-y-2 text-sm" data-attempt="${Number(selectedAttempt.id)}" data-qid="${qid}">
                                <label>${escapeHtml(t('教師評分（滿分', 'Teacher mark (max'))} ${escapeHtml(String(maxScore))}）
                                    <input type="number" step="0.5" min="0" max="${escapeHtml(String(maxScore))}" class="mark-score border rounded px-2 py-1 w-24 ml-1" value="${escapeHtml(String(tm.score ?? ''))}">
                                </label>
                                <div><label class="block text-slate-600">${escapeHtml(t('評語', 'Comment'))}</label>
                                    <input type="text" class="mark-comment w-full border rounded px-2 py-1" value="${escapeHtml(String(tm.comment || ''))}">
                                </div>
                                <button type="submit" class="text-indigo-600 text-sm">${escapeHtml(t('儲存評分', 'Save mark'))}</button>
                                <span class="mark-flash text-xs text-slate-500"></span>
                            </form>`;
                    } else {
                        const blankDetails = detail && Array.isArray(detail.blanks) ? detail.blanks : [];
                        const givenBlanks = resp && Array.isArray(resp.blanks) ? resp.blanks : (resp && isArrayish(resp.blanks) ? resp.blanks : {});
                        body = (q.blanks || []).map((blank, bi) => {
                            const bIdx = Number(blank.blank_index ?? (bi + 1));
                            const bd = blankDetails.find((x) => Number(x.blank_index) === bIdx) || null;
                            let given = bd && bd.given != null ? String(bd.given) : '';
                            if (!given) {
                                given = givenBlanks[bi] != null ? String(givenBlanks[bi])
                                    : (givenBlanks[String(bi)] != null ? String(givenBlanks[String(bi)]) : '');
                            }
                            const blankOk = bd ? !!bd.correct : null;
                            return `<div class="text-sm mb-2">
                                <span class="text-slate-500">${escapeHtml(t('空格', 'Blank'))} ${bIdx}：</span>
                                <span class="font-mono">${given !== '' ? escapeHtml(given) : escapeHtml(t('（空白）', '(blank)'))}</span>
                                ${blankOk === true ? `<span class="text-emerald-700 text-xs ml-2">${escapeHtml(t('正確', 'Correct'))}</span>` : ''}
                                ${blankOk === false ? `<span class="text-red-700 text-xs ml-2">${escapeHtml(t('錯誤', 'Wrong'))}</span>` : ''}
                            </div>`;
                        }).join('');
                    }

                    return `<div class="border border-slate-200 rounded-lg p-4">
                        <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <p class="font-medium text-slate-900">${di + 1}. ${escapeHtml(stem)}</p>
                            ${badge}
                        </div>
                        ${body}
                    </div>`;
                }).join('');

                detailBlock = `<div id="attempt-detail" class="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 p-6">
                    <h2 class="font-bold text-slate-800 mb-1">${escapeHtml(t('呈交明細', 'Attempt'))} #${Number(selectedAttempt.id)}</h2>
                    <p class="text-sm text-slate-500 mb-4">
                        ${escapeHtml(selectedAttempt.display_name || '')}
                        · ${escapeHtml(String(selectedAttempt.submitted_at || '').slice(0, 19))}
                        · ${escapeHtml(String(selectedAttempt.score))}/${escapeHtml(String(selectedAttempt.max_score))}
                        （${escapeHtml(String(selectedAttempt.percent))}%）
                        · ${escapeHtml(selectedAttempt.passed ? t('及格', 'Passed') : t('不及格', 'Failed'))}
                    </p>
                    ${(!details.length && !Object.keys(responses).length)
                        ? `<p class="text-slate-500 text-sm">${escapeHtml(t('此筆呈交沒有可顯示的作答／評分明細。', 'No response/grading detail for this attempt.'))}</p>`
                        : `<div class="space-y-4">${qCards}</div>`}
                </div>`;
            }

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${escapeHtml(spaHref('/admin/summer-homework'))}" data-spa-nav="/admin/summer-homework" class="text-sm text-indigo-700 hover:underline">${escapeHtml(t('← 習作列表', '← Homework list'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/summer-homework/' + itemId + '/view'))}" data-spa-nav="/admin/summer-homework/${itemId}/view" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('內容／答案', 'Content / answers'))}</a>
                    ${canManage ? `<a href="${escapeHtml(spaHref('/admin/summer-homework/' + itemId + '/edit'))}" data-spa-nav="/admin/summer-homework/${itemId}/edit" class="text-sm text-slate-600 hover:underline">${escapeHtml(t('編輯習作', 'Edit item'))}</a>` : ''}
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${escapeHtml(itemTitle)}</h2>
                <p class="text-sm text-slate-500 mb-4">${escapeHtml(formLabel)} · ${escapeHtml(t('每次呈交均保留；此頁顯示統計與詳細作答', 'All attempts kept; stats and answers below'))}</p>
                ${analytics.grading_json_available === false
                    ? `<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${escapeHtml(t('資料庫尚未加入 grading_json，錯題率統計可能不完整。', 'grading_json missing; miss-rate stats may be incomplete.'))}</div>`
                    : ''}
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${escapeHtml(t('總呈交次數', 'Total attempts'))}</p><p class="text-2xl font-bold">${Number(analytics.total_attempts || 0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${escapeHtml(t('作答學生數', 'Students'))}</p><p class="text-2xl font-bold text-indigo-600">${Number(analytics.distinct_students || 0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${escapeHtml(t('人均呈交', 'Avg / student'))}</p><p class="text-2xl font-bold">${escapeHtml(String(analytics.avg_attempts_per_student ?? '—'))}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${escapeHtml(t('題目數', 'Questions'))}</p><p class="text-2xl font-bold">${(analytics.questions || []).length}</p></div>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b">
                        <h2 class="font-bold text-slate-800">${escapeHtml(t('錯題與選項分析', 'Miss & option analysis'))}</h2>
                        <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('依所有呈交次數統計（非僅最高分）。', 'Based on all attempts, not best only.'))}</p>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${escapeHtml(t('題號', 'Q#'))}</th><th class="p-3">${escapeHtml(t('類型', 'Type'))}</th>
                            <th class="p-3">${escapeHtml(t('題幹摘要', 'Stem'))}</th><th class="p-3">${escapeHtml(t('評分次數', 'Graded'))}</th>
                            <th class="p-3">${escapeHtml(t('答對', 'Correct'))}</th><th class="p-3">${escapeHtml(t('答錯', 'Wrong'))}</th>
                            <th class="p-3">${escapeHtml(t('錯題率', 'Miss %'))}</th>
                        </tr></thead>
                        <tbody>${qRows || `<tr><td colspan="7" class="p-6 text-slate-500 text-center">${escapeHtml(t('尚無題目或呈交資料。', 'No questions or attempts.'))}</td></tr>`}</tbody>
                    </table>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b"><h2 class="font-bold text-slate-800">${escapeHtml(t('學生呈交摘要', 'Student summary'))}</h2>
                        <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('點學生可查看該生每一次呈交與作答內容。', 'Open a student to view each attempt.'))}</p>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${escapeHtml(t('學生', 'Student'))}</th><th class="p-3">${escapeHtml(t('電郵', 'Email'))}</th>
                            <th class="p-3">${escapeHtml(t('次數', 'Tries'))}</th><th class="p-3">${escapeHtml(t('最高分', 'Best'))}</th>
                            <th class="p-3">${escapeHtml(t('及格', 'Passed'))}</th><th class="p-3">${escapeHtml(t('首次及格', 'First pass'))}</th>
                            <th class="p-3">${escapeHtml(t('最近呈交', 'Last submit'))}</th><th class="p-3"></th>
                        </tr></thead>
                        <tbody>${studentRows || `<tr><td colspan="8" class="p-6 text-slate-500 text-center">${escapeHtml(t('尚無呈交紀錄。', 'No submissions yet.'))}</td></tr>`}</tbody>
                    </table>
                </div>
                ${attemptsBlock}
                ${detailBlock}`;

            async function go(userId, attId) {
                setAnalyticsUrl(itemId, userId || 0, attId || 0);
                await renderAdminSummerAnalytics(String(itemId));
                if (attId > 0) {
                    document.getElementById('attempt-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }

            box.querySelectorAll('.sh-filter-user').forEach((btn) => {
                btn.addEventListener('click', () => go(parseInt(btn.getAttribute('data-user-id') || '0', 10), 0));
            });
            document.getElementById('sh-clear-user')?.addEventListener('click', () => go(0, 0));
            box.querySelectorAll('.sh-open-attempt').forEach((btn) => {
                btn.addEventListener('click', () => go(filterUserId, parseInt(btn.getAttribute('data-attempt-id') || '0', 10)));
            });

            box.querySelectorAll('.sh-mark-form').forEach((form) => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const aid = form.getAttribute('data-attempt');
                    const qid = form.getAttribute('data-qid');
                    const flash = form.querySelector('.mark-flash');
                    const marks = {};
                    marks[qid] = {
                        score: parseFloat(form.querySelector('.mark-score').value || '0'),
                        comment: form.querySelector('.mark-comment').value || '',
                    };
                    try {
                        await global.ScienceApi.apiFetch('/admin/summer-homework/attempts/' + aid + '/marks', {
                            method: 'POST',
                            body: { marks },
                        });
                        if (flash) {
                            flash.textContent = t('已儲存', 'Saved');
                            flash.className = 'mark-flash text-xs text-emerald-700';
                        }
                    } catch (err) {
                        if (flash) {
                            flash.textContent = err.message || t('失敗', 'Failed');
                            flash.className = 'mark-flash text-xs text-red-600';
                        }
                    }
                });
            });
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminSummerAnalytics,
    });

export {};
