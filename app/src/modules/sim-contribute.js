'use strict';
const global = window;

    const { apiFetch, setCsrf } = global.ScienceApi;
    const { t, escapeHtml, navigate, spaHref } = global.AppRouter;

    function fillTopics(topicEl, topicsBySubject, subjectId, selected) {
        topicEl.innerHTML = '<option value="">—</option>';
        (topicsBySubject[String(subjectId)] || topicsBySubject[Number(subjectId)] || []).forEach((tp) => {
            const o = document.createElement('option');
            o.value = String(tp.id);
            o.textContent = tp.name_zh || tp.name_en || ('#' + tp.id);
            if (selected && Number(tp.id) === Number(selected)) o.selected = true;
            topicEl.appendChild(o);
        });
    }

    async function renderContribute() {
        const main = document.getElementById('main-content');
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
        const title = document.getElementById('page-title');
        if (title) title.textContent = t('投稿模擬程式', 'Contribute a simulation');

        main.innerHTML = `<div class="reading-page max-w-3xl"><p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p></div>`;

        let meta;
        try {
            meta = await apiFetch('/simulations/contribute');
        } catch (err) {
            main.innerHTML = `<div class="reading-page max-w-3xl"><p class="text-red-600">${escapeHtml(err.message || t('無法載入表單。', 'Could not load form.'))}</p></div>`;
            return;
        }

        if (meta.csrf_token && setCsrf) setCsrf(meta.csrf_token);

        const subjects = Array.isArray(meta.subjects) ? meta.subjects : [];
        const topicsBySubject = meta.topics_by_subject || {};
        const user = meta.user;
        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml((s.name_zh || '') + ' / ' + (s.name_en || ''))}</option>`
        ).join('');
        const sandbox = 'allow-scripts allow-forms allow-popups allow-modals allow-downloads';

        main.innerHTML = `
            <div class="reading-page max-w-3xl space-y-6" id="sim-contribute-page">
                <button type="button" id="contribute-back" class="text-indigo-600 text-sm hover:underline">← ${escapeHtml(t('返回模擬程式', 'Back to simulations'))}</button>
                <div>
                    <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">${escapeHtml(t('投稿模擬程式', 'Contribute a simulation'))}</h1>
                    <p class="mt-2 text-sm text-slate-600">${escapeHtml(t('提交後會進入待審核，管理員核准後才會公開顯示。', 'Submissions enter pending review and appear publicly only after an admin approves them.'))}</p>
                </div>
                <form id="contribute-form" class="space-y-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <input type="text" name="website" value="" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true">
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('姓名', 'Name'))} *</label>
                            <input name="submitter_name" required class="mt-1 w-full border rounded-lg px-3 py-2" value="${escapeHtml(user && user.display_name ? user.display_name : '')}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('電郵', 'Email'))} *</label>
                            <input type="email" name="submitter_email" required class="mt-1 w-full border rounded-lg px-3 py-2" value="${escapeHtml(user && user.email ? user.email : '')}">
                        </div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('中文標題', 'Title (ZH)'))}</label><input name="title_zh" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('英文標題', 'Title (EN)'))}</label><input name="title_en" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('中文摘要', 'Summary (ZH)'))}</label><input name="summary_zh" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${escapeHtml(t('英文摘要', 'Summary (EN)'))}</label><input name="summary_en" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('科目', 'Subject'))}</label>
                            <select name="subject_id" id="c-subject" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option>${subOpts}</select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('單元', 'Topic'))}</label>
                            <select name="topic_id" id="c-topic" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option></select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('標籤（逗號分隔）', 'Tags (comma-separated)'))}</label>
                        <input name="tags" class="mt-1 w-full border rounded-lg px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('HTML 內容', 'HTML content'))} *</label>
                        <div class="mt-1 flex flex-wrap gap-2 items-center mb-2">
                            <input type="file" id="c-html-file" accept=".html,.htm,text/html" class="text-sm">
                            <button type="button" id="c-load-html" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${escapeHtml(t('載入 HTML 檔', 'Load HTML file'))}</button>
                            <button type="button" id="c-preview" class="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700">${escapeHtml(t('更新預覽', 'Refresh preview'))}</button>
                        </div>
                        <textarea name="html" id="c-html" rows="12" required class="w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('截圖（選填）', 'Screenshot (optional)'))}</label>
                        <input type="file" name="screenshot" id="c-screenshot" accept="image/jpeg,image/png,image/gif,image/webp" class="mt-1 text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('備註（選填）', 'Note (optional)'))}</label>
                        <textarea name="submitter_note" rows="2" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></textarea>
                    </div>
                    <iframe id="c-preview-frame" title="preview" sandbox="${sandbox}" class="w-full h-64 border rounded-lg bg-slate-50"></iframe>
                    <p id="c-error" class="text-sm text-red-600 hidden"></p>
                    <button type="submit" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium">${escapeHtml(t('送出審核', 'Submit for review'))}</button>
                </form>
            </div>`;

        document.getElementById('contribute-back').onclick = () => navigate('/simulations');

        const subjectEl = document.getElementById('c-subject');
        const topicEl = document.getElementById('c-topic');
        const htmlEl = document.getElementById('c-html');
        const preview = document.getElementById('c-preview-frame');
        const errEl = document.getElementById('c-error');

        subjectEl.addEventListener('change', () => fillTopics(topicEl, topicsBySubject, subjectEl.value, null));

        function refreshPreview() {
            const blob = new Blob([htmlEl.value || ''], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            preview.src = url;
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        }

        document.getElementById('c-preview').onclick = () => refreshPreview();

        document.getElementById('c-load-html').onclick = async () => {
            const file = document.getElementById('c-html-file').files[0];
            if (!file) return;
            const text = await file.text();
            htmlEl.value = text;
            const m = text.match(/<title[^>]*>(.*?)<\/title>/is);
            if (m) {
                const titleText = m[1].replace(/<[^>]+>/g, '').trim();
                const form = document.getElementById('contribute-form');
                if (!form.title_zh.value && !form.title_en.value && titleText) {
                    form.title_zh.value = titleText;
                    form.title_en.value = titleText;
                }
            }
            refreshPreview();
        };

        document.getElementById('contribute-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            errEl.classList.add('hidden');
            const form = e.target;
            if (!form.title_zh.value.trim() && !form.title_en.value.trim()) {
                errEl.textContent = t('請至少填寫中文或英文標題。', 'Please enter a Chinese or English title.');
                errEl.classList.remove('hidden');
                return;
            }
            const fd = new FormData(form);
            // Ensure csrf header path works; also put in body for multipart
            fd.set('csrf', global.ScienceApi.getCsrf());
            try {
                await apiFetch('/simulations/contribute', { method: 'POST', body: fd });
                main.innerHTML = `
                    <div class="reading-page max-w-xl space-y-4">
                        <h1 class="text-2xl font-bold text-slate-900">${escapeHtml(t('已送出審核', 'Submitted for review'))}</h1>
                        <p class="text-slate-600">${escapeHtml(t('感謝投稿！管理員審核通過後，模擬程式才會出現在公開目錄。', 'Thanks! Your simulation will appear in the public catalogue after an admin approves it.'))}</p>
                        <a href="${escapeHtml(spaHref('/simulations'))}" data-spa="/simulations" class="inline-flex text-indigo-600 hover:underline">${escapeHtml(t('返回模擬程式', 'Back to simulations'))}</a>
                    </div>`;
                const a = main.querySelector('[data-spa]');
                if (a) a.onclick = (ev) => { ev.preventDefault(); navigate('/simulations'); };
            } catch (err) {
                errEl.textContent = err.message || t('投稿失敗', 'Submit failed');
                errEl.classList.remove('hidden');
            }
        });
    }

    global.AppSimContribute = { renderContribute };

export {};
