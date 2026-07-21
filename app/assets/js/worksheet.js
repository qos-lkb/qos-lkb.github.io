(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;
    const { renderMarkdownToHtml, enhanceMarkdown } = global.AppMarkdown;
    const { attachMarkdownEditor, buildWorksheetPayload } = global.AppInlineEdit;

    function assignmentStatusLabel(status) {
        const map = {
            pending: t('未開始', 'Not started'),
            submitted: t('已提交', 'Submitted'),
            graded: t('已評分', 'Graded'),
        };
        return map[status] || status;
    }

    function buildAssignmentBanner(assignment, submission, lang, opts) {
        opts = opts || {};
        const forceRedo = !!opts.forceRedo;
        const title = lang === 'zh'
            ? (assignment.title_zh || assignment.worksheet_title_zh)
            : (assignment.title_en || assignment.worksheet_title_en);
        const instructions = lang === 'zh' ? assignment.instructions_zh : assignment.instructions_en;
        const sub = submission || {};
        const due = assignment.due_at
            ? `<p class="text-xs text-slate-500 mt-1">${t('截止', 'Due')}: ${escapeHtml(String(assignment.due_at).slice(0, 16).replace('T', ' '))}</p>`
            : '';
        let scoreHtml = '';
        if (sub.status === 'graded' && sub.score != null) {
            const feedback = lang === 'zh' ? sub.feedback_zh : sub.feedback_en;
            scoreHtml = `<div class="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p class="font-semibold text-emerald-900">${t('最高分數', 'Best score')}: ${sub.score} / ${assignment.max_score}</p>
                ${sub.auto_score != null ? `<p class="text-xs text-emerald-800 mt-1">${t('選擇題自動計分（最高）', 'Best auto MCQ score')}: ${sub.auto_score}</p>` : ''}
                ${feedback ? `<p class="text-sm text-emerald-800 mt-1">${escapeHtml(feedback)}</p>` : ''}
                ${!forceRedo ? `<p class="text-xs text-emerald-800 mt-2">${t('可重做爭取更高分；低於最高分時不會降低紀錄。', 'You may redo for a higher score; a lower attempt will not reduce your record.')}</p>` : ''}
            </div>`;
        } else if (sub.status === 'submitted') {
            const autoHint = sub.auto_score != null
                ? ` ${t('（選擇題自動計分', ' (Auto MCQ score')}: ${sub.auto_score}）`
                : '';
            scoreHtml = `<p class="mt-3 text-sm text-indigo-700">${t('已提交，等候老師評分。', 'Submitted — awaiting teacher grading.')}${autoHint}</p>`;
        }

        const canSubmit = assignment.status === 'active'
            && (sub.status === 'pending' || sub.status === 'submitted' || (sub.status === 'graded' && forceRedo));
        const showRedoBtn = assignment.status === 'active' && sub.status === 'graded' && !forceRedo;

        let submitBlock = '';
        if (showRedoBtn) {
            submitBlock = `<div class="mt-4 pt-4 border-t border-indigo-100">
                <button type="button" id="ws-redo-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${t('重做習作', 'Redo assignment')}</button>
            </div>`;
        } else if (canSubmit) {
            const submitLabel = sub.status === 'graded'
                ? t('提交重做結果', 'Submit redo')
                : (sub.status === 'submitted' ? t('重新提交', 'Resubmit') : t('提交習作', 'Submit assignment'));
            submitBlock = `<div class="mt-4 pt-4 border-t border-indigo-100">
                <label class="block text-xs text-slate-500 mb-1">${t('備註（選填）', 'Note (optional)')}</label>
                <textarea id="ws-submit-comment" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm mb-2">${escapeHtml(sub.student_comment || '')}</textarea>
                <button type="button" id="ws-submit-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${submitLabel}</button>
                <p id="ws-submit-msg" class="text-xs mt-2 hidden"></p>
                ${sub.status === 'graded' ? `<p class="text-xs text-slate-500 mt-2">${t('重做後若分數較高會更新最高分；較低則保留原最高分。', 'If the redo scores higher, the best score is updated; otherwise the previous best is kept.')}</p>` : ''}
            </div>`;
        }

        return `<div id="ws-assignment-banner" class="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p class="text-xs text-indigo-600 uppercase tracking-wide">${escapeHtml(assignment.class_name || t('課程習作', 'Course assignment'))}</p>
                    <p class="font-bold text-indigo-950">${escapeHtml(title || '')}</p>
                    ${due}
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white text-indigo-800 border border-indigo-200">${assignmentStatusLabel(sub.status || 'pending')}</span>
            </div>
            ${instructions ? `<p class="text-sm text-slate-700 mt-3 whitespace-pre-wrap">${escapeHtml(instructions)}</p>` : ''}
            ${scoreHtml}
            ${submitBlock}
        </div>`;
    }

    async function renderWorksheet(slug, opts) {
        opts = opts || {};
        const assignmentId = opts.assignmentId || null;
        const main = document.getElementById('main-content');
        const ws = await apiFetch('/worksheets/' + encodeURIComponent(slug));
        const lang = getLang();
        const title = lang === 'zh' ? ws.title_zh : ws.title_en;
        const desc = lang === 'zh' ? (ws.description_zh || '') : (ws.description_en || '');
        const body = lang === 'zh' ? ws.body_zh : ws.body_en;

        let assignment = opts.assignment || null;
        let submission = opts.submission || null;
        const forceRedo = !!opts.forceRedo;
        if (assignmentId && !assignment) {
            const ad = await apiFetch('/student/worksheet-assignments/' + assignmentId);
            assignment = ad.assignment;
            submission = ad.submission;
        }

        const backLabel = assignmentId
            ? t('返回習作列表', 'Back to assignments')
            : t('返回工作紙列表', 'Back to worksheets');
        const backRoute = assignmentId ? '/assignments' : (
            global.AppCourse && global.AppCourse.isCourseMode()
                ? global.AppCourse.getBackRoute()
                : '/worksheets'
        );

        const bannerHtml = assignment ? buildAssignmentBanner(assignment, submission, lang, { forceRedo }) : '';
        const langKey = lang === 'zh' ? 'zh' : 'en';
        const qSummary = ws['question_summary_' + langKey] || ws.question_summary_zh;
        const summaryHint = qSummary && qSummary.question_count > 0
            ? `<p class="text-xs text-slate-500 mb-4">${t('本工作紙含', 'This worksheet has')} ${qSummary.question_count} ${t('道試題', 'questions')}${qSummary.total_score > 0 ? ` · ${t('試題共', 'Questions total')} ${qSummary.total_score} ${t('分', 'pts')}` : ''}</p>`
            : '';

        main.innerHTML = `
            <div class="reading-page" id="ws-page">
                <button type="button" id="ws-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${backLabel}</button>
                ${bannerHtml}
                ${summaryHint}
                <h1 id="ws-title" class="text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                ${desc ? `<p class="text-slate-600 mb-6">${escapeHtml(desc)}</p>` : ''}
                <article id="ws-body" class="prose-article bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">${renderMarkdownToHtml(body)}</article>
            </div>`;

        document.getElementById('ws-back').onclick = () => navigate(backRoute);

        if (assignmentId && global.AppContentEmbeds && global.AppContentEmbeds.setWorksheetContext) {
            const subStatus = submission?.status || 'pending';
            let wsState = 'editable';
            if (subStatus === 'graded' && !forceRedo) wsState = 'graded';
            else if (subStatus === 'submitted') wsState = 'submitted';
            else if (subStatus === 'graded' && forceRedo) wsState = 'editable';
            global.AppContentEmbeds.setWorksheetContext({
                state: wsState,
                savedResponses: forceRedo ? [] : (submission?.responses || []),
            });
        } else if (global.AppContentEmbeds?.setWorksheetContext) {
            global.AppContentEmbeds.setWorksheetContext(null);
        }

        await enhanceMarkdown(main);

        if (assignmentId && assignment) {
            const redoBtn = document.getElementById('ws-redo-btn');
            if (redoBtn) {
                redoBtn.onclick = () => {
                    renderWorksheet(slug, {
                        assignmentId,
                        assignment,
                        submission,
                        forceRedo: true,
                    });
                };
            }
            const submitBtn = document.getElementById('ws-submit-btn');
            if (submitBtn) {
                submitBtn.onclick = async () => {
                    const msg = document.getElementById('ws-submit-msg');
                    const commentEl = document.getElementById('ws-submit-comment');
                    const responses = global.AppContentEmbeds && global.AppContentEmbeds.collectAnswers
                        ? global.AppContentEmbeds.collectAnswers(main)
                        : [];
                    if (!responses.length && !confirm(t('尚未作答任何題目，確定要提交？', 'No answers recorded. Submit anyway?'))) {
                        return;
                    }
                    const confirmMsg = submission?.status === 'graded'
                        ? t('確定提交重做結果？分數較高會更新最高分，較低則保留原最高分。', 'Submit this redo? A higher score updates your best; a lower one keeps the previous best.')
                        : t('確定提交習作？提交後仍可修改並重新提交，直至老師評分。', 'Submit this assignment? You can resubmit until graded.');
                    if (!confirm(confirmMsg)) {
                        return;
                    }
                    try {
                        const r = await apiFetch('/student/worksheet-assignments/' + assignmentId + '/submit', {
                            method: 'POST',
                            body: {
                                student_comment: commentEl ? commentEl.value : '',
                                responses,
                            },
                        });
                        await renderWorksheet(slug, {
                            assignmentId,
                            assignment,
                            submission: r.submission,
                            forceRedo: false,
                        });
                    } catch (err) {
                        if (msg) {
                            msg.textContent = err.message || t('提交失敗', 'Submit failed');
                            msg.className = 'text-xs mt-2 text-red-600';
                            msg.classList.remove('hidden');
                        }
                    }
                };
            }
        }

        if (global.AppLearningTracker) {
            global.AppLearningTracker.trackContentOpen('worksheet', slug, {
                subject_id: ws.subject_id,
                topic_id: ws.topic_id,
            });
            const bodyEl = document.getElementById('ws-body');
            if (bodyEl) global.AppLearningTracker.bindScrollComplete(bodyEl, 'worksheet', slug, {
                subject_id: ws.subject_id,
                topic_id: ws.topic_id,
            });
        }

        const wsPage = document.getElementById('ws-page');
        if (global.AppCourse && global.AppCourse.isCourseMode() && !assignmentId) {
            global.AppCourse.attachItemNav(wsPage, 'worksheet', slug);
        }

        if (!assignmentId) {
            attachMarkdownEditor({
                type: 'worksheet',
                record: ws,
                root: wsPage,
                titleEl: document.getElementById('ws-title'),
                bodyEl: document.getElementById('ws-body'),
                buildPayload: (rec) => buildWorksheetPayload(rec),
                onBodyUpdated: async (bodyEl, markdown) => {
                    bodyEl.innerHTML = renderMarkdownToHtml(markdown);
                    await enhanceMarkdown(main);
                },
            });
        }
    }

    global.AppWorksheet = { renderWorksheet };
})(window);
