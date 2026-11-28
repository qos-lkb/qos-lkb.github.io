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

export function userCanManage(catalog) {
    if (catalog && catalog.can_manage) return true;
    const api = global.ScienceApi;
    return !!(api && (api.hasPermission('explanation.manage') || api.hasPermission('user.manage')));
}

export async function loadExplanationBank() {
    return global.ScienceApi.apiFetch('/admin/explanations/bank');
}

function lines(list) {
    return (Array.isArray(list) ? list : []).join('\n');
}

function field(label, html) {
    return `<label class="block text-sm mb-3"><span class="font-medium text-slate-700">${escapeHtml(label)}</span>${html}</label>`;
}

function input(name, value, extra = '') {
    return `<input name="${escapeHtml(name)}" value="${escapeHtml(value)}" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm" ${extra}>`;
}

function textarea(name, value, rows = 4) {
    return `<textarea name="${escapeHtml(name)}" rows="${rows}" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${escapeHtml(value)}</textarea>`;
}

export function manageToolbarHtml() {
    return `<div class="rounded-2xl border border-brand-200 bg-brand-50/60 p-3 sm:p-4 mb-4">
        <p class="text-sm font-semibold text-brand-900 mb-2">${escapeHtml(t('你有權限管理題目', 'You can edit these questions'))}</p>
        <div class="flex flex-wrap gap-2" id="explain-manage-bar">
            <button type="button" id="explain-add-subject" class="px-3 py-1.5 rounded-lg bg-white border border-brand-300 text-brand-800 text-sm font-semibold">${escapeHtml(t('新增科目', 'Add subject'))}</button>
            <button type="button" id="explain-edit-subject" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm">${escapeHtml(t('編輯本科', 'Edit subject'))}</button>
            <button type="button" id="explain-add-question" class="px-3 py-1.5 rounded-lg bg-brand-700 text-white text-sm font-semibold">${escapeHtml(t('新增問題', 'Add question'))}</button>
            <button type="button" id="explain-edit-question" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm">${escapeHtml(t('編輯本題', 'Edit this question'))}</button>
            <button type="button" id="explain-delete-question" class="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-sm">${escapeHtml(t('刪除本題', 'Delete this question'))}</button>
            <a href="${escapeHtml(spaHref('/admin/explanations'))}" data-spa-nav="/admin/explanations" class="px-3 py-1.5 rounded-lg text-sm text-brand-800 underline">${escapeHtml(t('後台題庫與作答', 'Admin bank and scores'))}</a>
        </div>
        <div id="explain-manage-panel" class="hidden mt-3 bg-white border border-slate-200 rounded-xl p-4"></div>
    </div>`;
}

function subjectFormHtml(item) {
    return `<form id="explain-subject-form">
        <input type="hidden" name="id" value="${item && item.id ? escapeHtml(String(item.id)) : ''}">
        <h3 class="font-semibold text-slate-900 mb-3">${escapeHtml(item && item.id ? t('編輯科目', 'Edit subject') : t('新增科目', 'New subject'))}</h3>
        ${field(t('代碼', 'Key'), input('key', item ? item.key : '', 'required'))}
        ${field(t('中文名稱', 'Chinese name'), input('label_zh', item ? item.label_zh : '', 'required'))}
        ${field(t('英文名稱', 'English name'), input('label_en', item ? item.label_en : '', 'required'))}
        ${field(t('排序', 'Order'), input('sort_order', item ? String(item.sort_order || 0) : '0', 'type="number"'))}
        <label class="flex items-center gap-2 text-sm mb-3"><input type="checkbox" name="published"${!item || item.published ? ' checked' : ''}> ${escapeHtml(t('公開給學生', 'Visible to students'))}</label>
        <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('儲存科目', 'Save subject'))}</button>
        <button type="button" data-close-panel class="ml-2 text-sm text-slate-600">${escapeHtml(t('取消', 'Cancel'))}</button>
    </form>`;
}

function questionFormHtml(item, subjects) {
    const options = (subjects || []).map((sub) => {
        const sel = item && item.subject === sub.key ? ' selected' : '';
        return `<option value="${escapeHtml(sub.key)}"${sel}>${escapeHtml(sub.label_zh || sub.key)}</option>`;
    }).join('');
    return `<form id="explain-question-form">
        <input type="hidden" name="id" value="${item && item.id ? escapeHtml(String(item.id)) : ''}">
        <h3 class="font-semibold text-slate-900 mb-3">${escapeHtml(item && item.id ? t('編輯問題與答案', 'Edit question and answers') : t('新增問題與答案', 'New question and answers'))}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${field(t('代碼', 'Key'), input('key', item ? item.key : '', 'required'))}
            ${field(t('科目', 'Subject'), `<select name="subject" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${options}</select>`)}
            ${field(t('中文標題', 'Chinese title'), input('title_zh', item ? item.title_zh : '', 'required'))}
            ${field(t('英文標題', 'English title'), input('title_en', item ? item.title_en : '', 'required'))}
        </div>
        ${field(t('中文題目', 'Chinese prompt'), textarea('prompt_zh', item ? item.prompt_zh : '', 3))}
        ${field(t('英文題目', 'English prompt'), textarea('prompt_en', item ? item.prompt_en : '', 3))}
        ${field(t('中文評分要點／答案（一行一點）', 'Chinese key points / answers (one per line)'), textarea('points_zh', item ? lines(item.points_zh) : '', 5))}
        ${field(t('英文評分要點／答案（一行一點）', 'English key points / answers (one per line)'), textarea('points_en', item ? lines(item.points_en) : '', 5))}
        ${field(t('常見錯誤（一行一項）', 'Misconceptions (one per line)'), textarea('misconceptions_zh', item ? lines(item.misconceptions_zh) : '', 3))}
        <div class="flex flex-wrap items-center gap-4">
            ${field(t('排序', 'Order'), input('sort_order', item ? String(item.sort_order || 0) : '0', 'type="number"'))}
            <label class="flex items-center gap-2 text-sm mt-5"><input type="checkbox" name="published"${!item || item.published !== false ? ' checked' : ''}> ${escapeHtml(t('公開給學生', 'Visible to students'))}</label>
        </div>
        <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${escapeHtml(t('儲存問題', 'Save question'))}</button>
        <button type="button" data-close-panel class="ml-2 text-sm text-slate-600">${escapeHtml(t('取消', 'Cancel'))}</button>
    </form>`;
}

function showPanel(root, html) {
    const panel = root.querySelector('#explain-manage-panel');
    if (!panel) return;
    panel.innerHTML = html;
    panel.classList.remove('hidden');
    panel.querySelector('[data-close-panel]')?.addEventListener('click', () => {
        panel.classList.add('hidden');
        panel.innerHTML = '';
    });
}

export function bindManageBar(root, ctx) {
    const bar = root.querySelector('#explain-manage-bar');
    if (!bar) return;
    const { currentQuestion, currentSubject, bank, onSaved } = ctx;
    const subjects = (bank && bank.subjects) || [];
    const questions = (bank && bank.questions) || [];
    const question = currentQuestion
        ? questions.find((item) => item.key === currentQuestion.key) || currentQuestion
        : null;
    const subject = currentSubject
        ? subjects.find((item) => item.key === currentSubject) || null
        : (question ? subjects.find((item) => item.key === question.subject) : null);

    const saveThen = async (work) => {
        try {
            const savedKey = await work();
            if (onSaved) await onSaved(typeof savedKey === 'string' ? savedKey : '');
        } catch (err) {
            window.alert(err.message || t('儲存失敗。', 'Save failed.'));
        }
    };

    root.querySelector('#explain-add-subject')?.addEventListener('click', () => {
        showPanel(root, subjectFormHtml(null));
        bindSubjectForm(root, null, saveThen);
    });
    root.querySelector('#explain-edit-subject')?.addEventListener('click', () => {
        if (!subject) {
            window.alert(t('請先選擇一個科目。', 'Choose a subject first.'));
            return;
        }
        showPanel(root, subjectFormHtml(subject));
        bindSubjectForm(root, subject, saveThen);
    });
    root.querySelector('#explain-add-question')?.addEventListener('click', () => {
        if (!subjects.length) {
            window.alert(t('請先新增科目。', 'Add a subject first.'));
            return;
        }
        const blank = currentSubject ? { subject: currentSubject, published: true } : { published: true };
        showPanel(root, questionFormHtml(blank, subjects));
        bindQuestionForm(root, blank, saveThen);
    });
    root.querySelector('#explain-edit-question')?.addEventListener('click', () => {
        if (!question) {
            window.alert(t('請先選擇一題。', 'Choose a question first.'));
            return;
        }
        showPanel(root, questionFormHtml(question, subjects));
        bindQuestionForm(root, question, saveThen);
    });
    root.querySelector('#explain-delete-question')?.addEventListener('click', () => {
        if (!question || !question.id) {
            window.alert(t('請先選擇一題。', 'Choose a question first.'));
            return;
        }
        if (!window.confirm(t('確定刪除這條問題？已有作答紀錄會保留。', 'Delete this question? Existing attempts are kept.'))) return;
        void saveThen(async () => {
            await global.ScienceApi.apiFetch('/admin/explanations/questions/' + encodeURIComponent(String(question.id)), { method: 'DELETE' });
        });
    });
}

function bindSubjectForm(root, item, saveThen) {
    const form = root.querySelector('#explain-subject-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = form.id.value;
        const body = {
            key: form.key.value.trim(),
            label_zh: form.label_zh.value.trim(),
            label_en: form.label_en.value.trim(),
            sort_order: Number(form.sort_order.value) || 0,
            published: form.published.checked,
        };
        void saveThen(async () => {
            if (id) {
                await global.ScienceApi.apiFetch('/admin/explanations/subjects/' + encodeURIComponent(id), { method: 'PUT', body });
            } else {
                await global.ScienceApi.apiFetch('/admin/explanations/subjects', { method: 'POST', body });
            }
        });
    });
}

function bindQuestionForm(root, item, saveThen) {
    const form = root.querySelector('#explain-question-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = form.id.value;
        const body = {
            key: form.key.value.trim(),
            subject: form.subject.value,
            title_zh: form.title_zh.value.trim(),
            title_en: form.title_en.value.trim(),
            prompt_zh: form.prompt_zh.value.trim(),
            prompt_en: form.prompt_en.value.trim(),
            points_zh: form.points_zh.value,
            points_en: form.points_en.value,
            misconceptions_zh: form.misconceptions_zh.value,
            sort_order: Number(form.sort_order.value) || 0,
            published: form.published.checked,
        };
        void saveThen(async () => {
            if (id) {
                await global.ScienceApi.apiFetch('/admin/explanations/questions/' + encodeURIComponent(id), { method: 'PUT', body });
            } else {
                const data = await global.ScienceApi.apiFetch('/admin/explanations/questions', { method: 'POST', body });
                return data && data.question && data.question.key ? data.question.key : body.key;
            }
        });
    });
}
