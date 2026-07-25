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

    function spaHref(route) {
        return global.AppRouter && global.AppRouter.spaHref
            ? global.AppRouter.spaHref(route)
            : String(route || '');
    }

    function setShell() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    function canCreateSummer() {
        const api = global.ScienceApi;
        return api.hasPermission('summer_homework.manage_any')
            || api.hasPermission('summer_homework.manage_own');
    }

    function typeLabel(type) {
        const map = {
            mcq: t('選擇', 'MCQ'),
            fill_blank: t('填充', 'Fill'),
            true_false: t('是非', 'T/F'),
            short_answer: t('短答', 'Short'),
            long_answer: t('長答', 'Long'),
        };
        return map[type] || type;
    }

    function statusLabel(status) {
        const map = {
            draft: t('草稿', 'Draft'),
            pending_review: t('待審核', 'Pending'),
            published: t('已發佈', 'Published'),
        };
        return map[status] || status || '—';
    }

    function renderQuestionAnswers(q, index) {
        const stem = q.stem_zh || q.stem_en || '';
        const type = q.question_type || '';
        let body = '';
        if (type === 'mcq') {
            body = `<ul class="text-sm space-y-1.5">${(q.options || []).map((opt, oi) => {
                const label = String.fromCharCode(65 + oi);
                const text = opt.text_zh || opt.text_en || '';
                const ok = !!(opt.is_correct === true || opt.is_correct === 1 || opt.is_correct === '1');
                return `<li class="${ok ? 'text-emerald-800 font-medium' : 'text-slate-700'}">
                    <span class="font-bold text-indigo-600 mr-1">${label}</span>${escapeHtml(text)}
                    ${ok ? `<span class="text-xs text-emerald-700 ml-1">✓ ${escapeHtml(t('正確答案', 'Correct'))}</span>` : ''}
                </li>`;
            }).join('')}</ul>`;
        } else if (type === 'true_false') {
            const yes = !!(q.correct_bool === true || q.correct_bool === 1 || q.correct_bool === '1');
            body = `<p class="text-sm text-emerald-800 font-medium">${escapeHtml(t('正確答案：', 'Answer: '))}${escapeHtml(yes ? t('是', 'True') : t('否', 'False'))}</p>`;
        } else if (type === 'short_answer') {
            body = `<ul class="text-sm space-y-1">${(q.acceptable_answers || []).map((ans) => {
                if (!ans || typeof ans !== 'object') return '';
                return `<li class="font-mono text-emerald-800">${escapeHtml(ans.acceptable_answer_zh || '')} / ${escapeHtml(ans.acceptable_answer_en || '')}</li>`;
            }).join('')}</ul>`;
        } else if (type === 'long_answer') {
            body = `<p class="text-sm text-slate-600">${escapeHtml(t('滿分', 'Max'))} ${escapeHtml(String(q.max_score ?? 5))}（${escapeHtml(t('教師評閱', 'Teacher-marked'))}）</p>`;
            if (q.rubric_zh || q.rubric_en) {
                body += `<div class="mt-2 text-xs text-slate-600 space-y-1">
                    ${q.rubric_zh ? `<p><span class="text-slate-400">${escapeHtml(t('評分指引（中）：', 'Rubric ZH: '))}</span>${escapeHtml(q.rubric_zh)}</p>` : ''}
                    ${q.rubric_en ? `<p><span class="text-slate-400">${escapeHtml(t('評分指引（英）：', 'Rubric EN: '))}</span>${escapeHtml(q.rubric_en)}</p>` : ''}
                </div>`;
            }
        } else {
            body = (q.blanks || []).map((blank, bi) => {
                const answers = blank.acceptable_answers || [];
                return `<div class="text-sm mb-2">
                    <span class="text-slate-500">${escapeHtml(t('空格', 'Blank'))} ${bi + 1}：</span>
                    ${answers.map((a) => `<span class="font-mono text-emerald-800 mr-2">${escapeHtml((a.acceptable_answer_zh || '') + ' / ' + (a.acceptable_answer_en || ''))}</span>`).join('')}
                </div>`;
            }).join('');
        }
        return `<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p class="font-medium text-slate-900 mb-3">
                ${index + 1}.
                <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mr-1">${escapeHtml(typeLabel(type))}</span>
                ${escapeHtml(stem)}
            </p>
            ${body}
        </div>`;
    }

    async function renderAdminSummerHomeworkEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const editId = idArg ? Number(idArg) : 0;
        if (title) title.textContent = editId ? t('編輯暑期功課', 'Edit summer homework') : t('新增暑期功課', 'New summer homework');

        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }
        if (!canCreateSummer()) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            return;
        }

        if (editId) {
            try {
                const detail = await global.ScienceApi.apiFetch('/admin/summer-homework/' + editId);
                if (detail.can_manage === false) {
                    global.AppRouter.navigate('/admin/summer-homework/' + editId + '/view');
                    return;
                }
            } catch (err) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
                return;
            }
        }

        const regraded = Number(new URLSearchParams(location.search).get('regraded') || 0);

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${escapeHtml(spaHref('/admin/summer-homework'))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${escapeHtml(t('← 返回列表', '← Back to list'))}</a>
                ${editId ? `<a href="${escapeHtml(spaHref('/admin/summer-homework/' + editId + '/view'))}" data-spa-nav="/admin/summer-homework/${editId}/view" class="text-slate-600 hover:underline">${escapeHtml(t('內容／答案', 'Content / answers'))}</a>` : ''}
                ${editId ? `<a href="${escapeHtml(spaHref('/admin/summer-homework/' + editId + '/analytics'))}" data-spa-nav="/admin/summer-homework/${editId}/analytics" class="text-slate-600 hover:underline">${escapeHtml(t('呈交分析', 'Analytics'))}</a>` : ''}
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3 ${regraded > 0 ? 'text-emerald-700' : ''}">${regraded > 0 ? escapeHtml(t(`已儲存，並依最新答案重算 ${regraded} 筆呈交分數。`, `Saved; regraded ${regraded} attempts.`)) : ''}</p>
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6 shadow-sm">
                <input type="hidden" id="item-id" value="${editId || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（中）', 'Title (ZH)'))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1" required></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('標題（英）', 'Title (EN)'))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label class="text-sm font-medium">slug（${escapeHtml(t('選填', 'optional'))}）</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('級別', 'Level'))}</label>
                        <select id="form-level" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="1">${escapeHtml(t('中一 (S1)', 'S1'))}</option>
                            <option value="2">${escapeHtml(t('中二 (S2)', 'S2'))}</option>
                        </select>
                    </div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('內容類型', 'Content type'))}</label>
                        <select id="content-type" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="passage">${escapeHtml(t('閱讀篇章', 'Passage'))}</option>
                            <option value="video">${escapeHtml(t('影片', 'Video'))}</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label class="text-sm font-medium">${escapeHtml(t('及格百分比', 'Pass %'))}</label><input type="number" id="pass-percent" min="1" max="100" step="1" value="80" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('排序', 'Sort'))}</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('狀態', 'Status'))}</label>
                        <select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>
                            <option value="pending_review">${escapeHtml(t('待審核', 'Pending review'))}</option>
                            <option value="published">${escapeHtml(t('已發佈', 'Published'))}</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm font-medium">${escapeHtml(t('呈交截止日期', 'Due date'))}</label>
                        <input type="datetime-local" id="due-at" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('留空表示不設截止。時區：香港', 'Leave empty for no deadline. Timezone: Hong Kong'))}</p>
                    </div>
                    <div class="flex items-end pb-1">
                        <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" id="allow-late" value="1" checked class="rounded border-slate-300 text-indigo-600">
                            ${escapeHtml(t('截止後仍允許呈交（遲交）', 'Allow late submit'))}
                        </label>
                    </div>
                </div>
                <div id="passage-fields" class="space-y-3">
                    <div>
                        <label class="text-sm font-medium">${escapeHtml(t('篇章（中，Markdown）', 'Passage (ZH, Markdown)'))}</label>
                        <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(t('支援公式：行內 $E=mc^2$、區塊 $$...$$', 'Math: inline $E=mc^2$, block $$...$$'))}</p>
                        <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="6"></textarea>
                    </div>
                    <div>
                        <label class="text-sm font-medium">${escapeHtml(t('篇章（英，Markdown）', 'Passage (EN, Markdown)'))}</label>
                        <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="6"></textarea>
                    </div>
                </div>
                <div id="video-fields" class="space-y-3 hidden">
                    <div><label class="text-sm font-medium">${escapeHtml(t('影片嵌入 URL', 'Video embed URL'))}</label><input id="video-url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/embed/..."></div>
                    <div><label class="text-sm font-medium">${escapeHtml(t('平台', 'Provider'))}</label>
                        <select id="video-provider" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="youtube">YouTube</option>
                            <option value="vimeo">Vimeo</option>
                            <option value="other">${escapeHtml(t('其他', 'Other'))}</option>
                        </select>
                    </div>
                </div>
                <div>
                    <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
                        <label class="text-sm font-medium">${escapeHtml(t('跟進題目', 'Follow-up questions'))}</label>
                        <div class="flex flex-wrap gap-x-3 gap-y-1">
                            <button type="button" id="add-mcq" class="text-sm text-indigo-600">+ ${escapeHtml(t('選擇題', 'MCQ'))}</button>
                            <button type="button" id="add-fill" class="text-sm text-indigo-600">+ ${escapeHtml(t('填充題', 'Fill'))}</button>
                            <button type="button" id="add-tf" class="text-sm text-indigo-600">+ ${escapeHtml(t('是非題', 'T/F'))}</button>
                            <button type="button" id="add-short" class="text-sm text-indigo-600">+ ${escapeHtml(t('短答題', 'Short'))}</button>
                            <button type="button" id="add-long" class="text-sm text-indigo-600">+ ${escapeHtml(t('長答題', 'Long'))}</button>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mb-2">${escapeHtml(t('題幹與選項可用 $...$／$$...$$ 寫公式。', 'Use $...$ / $$...$$ for math in stems and options.'))}</p>
                    <div id="questions" class="space-y-4"></div>
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium">${escapeHtml(t('儲存', 'Save'))}</button>
            </form>`;
        bindSpaNav(box);

        const flash = document.getElementById('edit-flash');
        if (regraded > 0) flash.classList.remove('hidden');

        try {
            await global.AppAdminSummerQBuilder.mount({
                editId,
                onError: (err) => {
                    flash.textContent = err.message || t('載入失敗', 'Load failed');
                    flash.classList.remove('hidden');
                    flash.classList.add('text-red-600');
                },
            });
            global.AppAdminSummerQBuilder.bindSubmit();
            // Re-bind submit with SPA navigation
            document.getElementById('edit-form').onsubmit = async (e) => {
                e.preventDefault();
                // Trigger via qbuilder collect by reusing bindSubmit logic — call POST ourselves
                const qb = global.AppAdminSummerQBuilder;
                const payload = {
                    id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                    title_zh: document.getElementById('title-zh').value,
                    title_en: document.getElementById('title-en').value,
                    slug: document.getElementById('slug').value,
                    form_level: document.getElementById('form-level').value,
                    content_type: document.getElementById('content-type').value,
                    pass_percent: parseFloat(document.getElementById('pass-percent').value) || 80,
                    due_at: document.getElementById('due-at').value || '',
                    allow_late_submit: document.getElementById('allow-late').checked ? 1 : 0,
                    list_sort_order: parseInt(document.getElementById('list-sort').value, 10) || 0,
                    status: document.getElementById('status').value,
                    body_zh: document.getElementById('body-zh').value,
                    body_en: document.getElementById('body-en').value,
                    video_embed_url: document.getElementById('video-url').value,
                    video_provider: document.getElementById('video-provider').value,
                    questions: qb.collectQuestions(),
                };
                try {
                    const saved = await global.ScienceApi.apiFetch('/admin/summer-homework', {
                        method: 'POST',
                        body: payload,
                    });
                    const rg = parseInt(saved.regraded_attempts || '0', 10) || 0;
                    const route = '/admin/summer-homework/' + saved.id + '/edit'
                        + (rg > 0 ? ('?regraded=' + rg) : '');
                    // Update URL query for regraded flash without full reload if same id
                    global.AppRouter.navigate('/admin/summer-homework/' + saved.id + '/edit');
                    if (rg > 0) {
                        history.replaceState({}, '', spaHref(route).replace(/^\.\//, '') || location.pathname + '?regraded=' + rg);
                        flash.textContent = t(`已儲存，並依最新答案重算 ${rg} 筆呈交分數。`, `Saved; regraded ${rg} attempts.`);
                        flash.classList.remove('hidden', 'text-red-600');
                        flash.classList.add('text-emerald-700');
                    } else {
                        flash.textContent = t('已儲存。', 'Saved.');
                        flash.classList.remove('hidden', 'text-red-600');
                        flash.classList.add('text-emerald-700');
                    }
                    document.getElementById('item-id').value = String(saved.id);
                } catch (err) {
                    flash.textContent = err.message || t('儲存失敗', 'Save failed');
                    flash.classList.remove('hidden', 'text-emerald-700');
                    flash.classList.add('text-red-600');
                }
            };
        } catch (err) {
            flash.textContent = err.message || t('載入失敗', 'Load failed');
            flash.classList.remove('hidden');
            flash.classList.add('text-red-600');
        }
    }

    async function renderAdminSummerHomeworkView(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const itemId = Number(idArg || 0);
        if (!itemId) {
            global.AppRouter.navigate('/admin/summer-homework');
            return;
        }
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        try {
            const detail = await global.ScienceApi.apiFetch('/admin/summer-homework/' + itemId);
            const formLabel = String(detail.form_level) === '2' ? t('中二', 'S2') : t('中一', 'S1');
            const contentType = detail.content_type === 'video' ? t('影片', 'Video') : t('閱讀', 'Passage');
            if (title) title.textContent = t('檢視暑期功課', 'View summer homework') + ' — ' + (detail.title_zh || detail.title_en || '');

            const questions = detail.questions || [];
            let contentHtml = '';
            if (detail.content_type === 'video') {
                contentHtml = `<dl class="text-sm space-y-2">
                    <div><dt class="text-slate-500">${escapeHtml(t('影片嵌入 URL', 'Embed URL'))}</dt>
                    <dd class="font-mono break-all">${escapeHtml(detail.video_embed_url || '—')}</dd></div>
                </dl>`;
            } else {
                contentHtml = `<div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div><h3 class="font-medium text-slate-700 mb-2">${escapeHtml(t('篇章（中）', 'Passage (ZH)'))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${escapeHtml(detail.body_zh || '')}</pre></div>
                    <div><h3 class="font-medium text-slate-700 mb-2">${escapeHtml(t('篇章（英）', 'Passage (EN)'))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${escapeHtml(detail.body_en || '')}</pre></div>
                </div>`;
            }

            box.innerHTML = `
                <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                    <a href="${escapeHtml(spaHref('/admin/summer-homework'))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${escapeHtml(t('← 返回列表', '← Back to list'))}</a>
                    <a href="${escapeHtml(spaHref('/admin/summer-homework/' + itemId + '/analytics'))}" data-spa-nav="/admin/summer-homework/${itemId}/analytics" class="text-slate-600 hover:underline">${escapeHtml(t('呈交分析', 'Analytics'))}</a>
                    ${detail.can_manage ? `<a href="${escapeHtml(spaHref('/admin/summer-homework/' + itemId + '/edit'))}" data-spa-nav="/admin/summer-homework/${itemId}/edit" class="text-indigo-700 font-medium hover:underline">${escapeHtml(t('編輯', 'Edit'))}</a>` : ''}
                </div>
                <p class="text-xs text-slate-500 mb-4">${escapeHtml(formLabel)} · ${escapeHtml(contentType)} · ${escapeHtml(statusLabel(detail.status))} · ${escapeHtml(t('含正確答案（教師／管理員檢視）', 'Includes answer key (staff view)'))}</p>
                <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-950 mb-6">
                    ${escapeHtml(t('此頁顯示習作全文與正確答案，供教師／管理員檢視。學生前台不會看到答案鍵。', 'Full text and correct answers for staff. Students never see the answer key.'))}
                </div>
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                    <h2 class="font-bold text-slate-800 mb-3">${escapeHtml(t('內容', 'Content'))}</h2>
                    ${contentHtml}
                    <p class="text-xs text-slate-500 mt-4">
                        ${escapeHtml(t('及格線', 'Pass'))} ${escapeHtml(String(detail.pass_percent))}%
                        · ${escapeHtml(t('截止', 'Due'))} ${escapeHtml(detail.due_at || t('無', 'None'))}
                        · ${escapeHtml(t('遲交', 'Late'))} ${!detail.due_at ? '—' : (detail.allow_late_submit ? t('允許', 'Allowed') : t('禁止', 'Blocked'))}
                    </p>
                </div>
                <div class="space-y-4 mb-8">
                    <h2 class="font-bold text-slate-800">${escapeHtml(t('題目與答案', 'Questions & answers'))}（${questions.length}）</h2>
                    ${questions.length
                        ? questions.map((q, i) => renderQuestionAnswers(q, i)).join('')
                        : `<p class="text-slate-500 text-sm">${escapeHtml(t('尚無題目。', 'No questions yet.'))}</p>`}
                </div>`;
            bindSpaNav(box);
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        }
    }

    Object.assign(global.AppAdmin || (global.AppAdmin = {}), {
        renderAdminSummerHomeworkEdit,
        renderAdminSummerHomeworkView,
    });

export {};
