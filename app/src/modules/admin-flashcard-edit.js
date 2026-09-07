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

    function requireFcPerm() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        if (!global.ScienceApi.hasPermission('flashcard_set.manage_any')
            && !global.ScienceApi.hasPermission('flashcard_set.manage_own')) {
            return false;
        }
        return true;
    }

    async function loadSubjectsMeta() {
        let list;
        try {
            list = await global.ScienceApi.apiFetch('/admin/subjects');
        } catch (_err) {
            list = await global.ScienceApi.apiFetch('/subjects');
        }
        const subjects = [];
        const topicsBySubject = {};
        (Array.isArray(list) ? list : []).forEach((s) => {
            subjects.push({
                id: Number(s.id),
                name_zh: s.name_zh || s.name_en || '',
                name_en: s.name_en || '',
            });
            topicsBySubject[Number(s.id)] = (s.topics || []).map((tp) => ({
                id: Number(tp.id),
                name_zh: tp.name_zh || tp.name_en || '',
                name_en: tp.name_en || '',
            }));
        });
        return { subjects, topicsBySubject };
    }

    function emptyCard() {
        return {
            id: 0,
            front_zh: '',
            front_en: '',
            back_zh: '',
            back_en: '',
            hint_zh: '',
            hint_en: '',
        };
    }

    function cardBlockHtml(card, idx) {
        const cid = Number(card.id || 0);
        return `<article class="fc-card-block border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3" data-card-id="${cid}">
            <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-mono text-indigo-600 fc-card-num">${idx + 1}</span>
                <div class="flex gap-2 text-xs">
                    <button type="button" class="fc-move-up px-2 py-1 border rounded-lg hover:bg-white">${escapeHtml(t('上移', 'Up'))}</button>
                    <button type="button" class="fc-move-down px-2 py-1 border rounded-lg hover:bg-white">${escapeHtml(t('下移', 'Down'))}</button>
                    <button type="button" class="fc-remove text-red-600 hover:underline">${escapeHtml(t('刪除', 'Remove'))}</button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label class="text-sm">${escapeHtml(t('正面（中）', 'Front (ZH)'))}
                    <textarea class="fc-front-zh w-full border rounded-lg px-3 py-2 mt-1" rows="3">${escapeHtml(card.front_zh || '')}</textarea>
                </label>
                <label class="text-sm">${escapeHtml(t('正面（英）', 'Front (EN)'))}
                    <textarea class="fc-front-en w-full border rounded-lg px-3 py-2 mt-1" rows="3">${escapeHtml(card.front_en || '')}</textarea>
                </label>
                <label class="text-sm">${escapeHtml(t('背面（中）', 'Back (ZH)'))}
                    <textarea class="fc-back-zh w-full border rounded-lg px-3 py-2 mt-1" rows="3">${escapeHtml(card.back_zh || '')}</textarea>
                </label>
                <label class="text-sm">${escapeHtml(t('背面（英）', 'Back (EN)'))}
                    <textarea class="fc-back-en w-full border rounded-lg px-3 py-2 mt-1" rows="3">${escapeHtml(card.back_en || '')}</textarea>
                </label>
                <label class="text-sm">${escapeHtml(t('提示（中，可選）', 'Hint (ZH, optional)'))}
                    <input class="fc-hint-zh w-full border rounded-lg px-3 py-2 mt-1" value="${escapeHtml(card.hint_zh || '')}">
                </label>
                <label class="text-sm">${escapeHtml(t('提示（英，可選）', 'Hint (EN, optional)'))}
                    <input class="fc-hint-en w-full border rounded-lg px-3 py-2 mt-1" value="${escapeHtml(card.hint_en || '')}">
                </label>
            </div>
        </article>`;
    }

    function collectCards(listEl) {
        return Array.from(listEl.querySelectorAll('.fc-card-block')).map((el) => {
            const id = Number(el.getAttribute('data-card-id') || 0);
            const card = {
                front_zh: el.querySelector('.fc-front-zh').value,
                front_en: el.querySelector('.fc-front-en').value,
                back_zh: el.querySelector('.fc-back-zh').value,
                back_en: el.querySelector('.fc-back-en').value,
                hint_zh: el.querySelector('.fc-hint-zh').value,
                hint_en: el.querySelector('.fc-hint-en').value,
            };
            if (id > 0) card.id = id;
            return card;
        });
    }

    function renumber(listEl) {
        listEl.querySelectorAll('.fc-card-num').forEach((el, i) => {
            el.textContent = String(i + 1);
        });
    }

    async function renderAdminFlashcardSetEdit(idArg) {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        let editId = idArg ? Number(idArg) : 0;
        if (title) title.textContent = editId ? t('編輯閃卡組', 'Edit flashcard set') : t('新增閃卡組', 'New flashcard set');

        if (!requireFcPerm()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

        let subjects = [];
        let topicsBySubject = {};
        try {
            const meta = await loadSubjectsMeta();
            subjects = meta.subjects;
            topicsBySubject = meta.topicsBySubject;
        } catch (err) {
            box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
            return;
        }

        const canPublish = global.ScienceApi.hasPermission('flashcard_set.manage_any');
        const subOpts = subjects.map((s) =>
            `<option value="${Number(s.id)}">${escapeHtml(s.name_zh)}</option>`
        ).join('');

        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${escapeHtml(spaHref('/admin/flashcard-sets'))}" data-spa-nav="/admin/flashcard-sets" class="text-indigo-700 hover:underline">${escapeHtml(t('← 返回列表', '← Back to list'))}</a>
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3"></p>
            <form id="edit-form" class="space-y-6">
                <input type="hidden" id="item-id" value="${editId || ''}">
                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h2 class="text-sm font-semibold text-slate-800">${escapeHtml(t('閃卡組', 'Flashcard set'))}</h2>
                        <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(t('可連接科目與課題；發佈後可加入自學課程。', 'Link a subject and topic; published sets can join self-study courses.'))}</p>
                    </div>
                    <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <label>${escapeHtml(t('標題（中）', 'Title (ZH)'))}
                            <input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </label>
                        <label>${escapeHtml(t('標題（英）', 'Title (EN)'))}
                            <input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </label>
                        <label class="md:col-span-2">slug
                            <input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" placeholder="${escapeHtml(t('留空則依標題自動產生', 'Auto from title if empty'))}">
                        </label>
                        <label>${escapeHtml(t('描述（中）', 'Description (ZH)'))}
                            <textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2 mt-1" rows="2"></textarea>
                        </label>
                        <label>${escapeHtml(t('描述（英）', 'Description (EN)'))}
                            <textarea id="desc-en" class="w-full border rounded-lg px-3 py-2 mt-1" rows="2"></textarea>
                        </label>
                        <label>${escapeHtml(t('科目', 'Subject'))}
                            <select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1">
                                <option value="">—</option>${subOpts}
                            </select>
                        </label>
                        <label>${escapeHtml(t('課題', 'Topic'))}
                            <select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select>
                        </label>
                        <label>${escapeHtml(t('列表排序', 'List sort'))}
                            <input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </label>
                        <label>${escapeHtml(t('狀態', 'Status'))}
                            <select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                                <option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>
                                <option value="pending_review">${escapeHtml(t('待審核', 'Pending review'))}</option>
                                ${canPublish ? `<option value="published">${escapeHtml(t('已發佈', 'Published'))}</option>` : ''}
                            </select>
                        </label>
                    </div>
                </section>
                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <h2 class="text-sm font-semibold text-slate-800">${escapeHtml(t('卡片', 'Cards'))}</h2>
                            <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(t('正面／背面支援 Markdown 與 MathJax（$...$）。', 'Front/back support Markdown and MathJax ($...$).'))}</p>
                        </div>
                        <button type="button" id="btn-add-card" class="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">${escapeHtml(t('+ 新增卡片', '+ Add card'))}</button>
                    </div>
                    <div id="cards-list" class="p-4 space-y-4"></div>
                    <p id="cards-empty" class="hidden p-6 text-center text-slate-500 text-sm">${escapeHtml(t('尚無卡片，請新增第一張。', 'No cards yet. Add the first one.'))}</p>
                </section>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">${escapeHtml(t('儲存', 'Save'))}</button>
                    ${editId ? `<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">${escapeHtml(t('刪除閃卡組', 'Delete set'))}</button>` : ''}
                </div>
            </form>`;
        bindSpaNav(box);

        const listEl = document.getElementById('cards-list');
        const emptyEl = document.getElementById('cards-empty');
        const flash = document.getElementById('edit-flash');

        function syncEmpty() {
            emptyEl.classList.toggle('hidden', listEl.querySelectorAll('.fc-card-block').length > 0);
            renumber(listEl);
        }

        function bindCard(el) {
            el.querySelector('.fc-remove').onclick = () => {
                el.remove();
                syncEmpty();
            };
            el.querySelector('.fc-move-up').onclick = () => {
                if (el.previousElementSibling) listEl.insertBefore(el, el.previousElementSibling);
                renumber(listEl);
            };
            el.querySelector('.fc-move-down').onclick = () => {
                if (el.nextElementSibling) listEl.insertBefore(el.nextElementSibling, el);
                renumber(listEl);
            };
        }

        function addCard(card) {
            listEl.insertAdjacentHTML('beforeend', cardBlockHtml(card || emptyCard(), listEl.children.length));
            bindCard(listEl.lastElementChild);
            syncEmpty();
        }

        document.getElementById('btn-add-card').onclick = () => addCard(emptyCard());

        document.getElementById('subject-id').onchange = function () {
            const tid = document.getElementById('topic-id');
            tid.innerHTML = '<option value="">—</option>';
            (topicsBySubject[this.value] || topicsBySubject[Number(this.value)] || []).forEach((tp) => {
                const o = document.createElement('option');
                o.value = tp.id;
                o.textContent = tp.name_zh;
                tid.appendChild(o);
            });
        };

        function showFlash(msg, isError) {
            flash.textContent = msg;
            flash.className = isError ? 'text-sm mb-3 text-red-600' : 'text-sm mb-3 text-emerald-700';
            flash.classList.remove('hidden');
        }

        if (editId) {
            try {
                const detail = await global.ScienceApi.apiFetch('/admin/flashcard-sets/' + editId);
                document.getElementById('title-zh').value = detail.title_zh || '';
                document.getElementById('title-en').value = detail.title_en || '';
                document.getElementById('slug').value = detail.slug || '';
                document.getElementById('desc-zh').value = detail.description_zh || '';
                document.getElementById('desc-en').value = detail.description_en || '';
                document.getElementById('status').value = detail.status || 'draft';
                document.getElementById('list-sort').value = detail.list_sort_order || 0;
                if (detail.subject_id) {
                    document.getElementById('subject-id').value = String(detail.subject_id);
                    document.getElementById('subject-id').dispatchEvent(new Event('change'));
                    if (detail.topic_id) document.getElementById('topic-id').value = String(detail.topic_id);
                }
                (detail.cards || []).forEach((c) => addCard(c));
                if (!(detail.cards || []).length) addCard(emptyCard());
            } catch (err) {
                showFlash(err.message || t('載入失敗', 'Load failed'), true);
            }
        } else {
            addCard(emptyCard());
        }
        syncEmpty();

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                description_zh: document.getElementById('desc-zh').value,
                description_en: document.getElementById('desc-en').value,
                subject_id: document.getElementById('subject-id').value,
                topic_id: document.getElementById('topic-id').value,
                list_sort_order: parseInt(document.getElementById('list-sort').value || '0', 10),
                status: document.getElementById('status').value,
                cards: collectCards(listEl),
            };
            if (editId) payload.id = editId;
            try {
                const saved = await global.ScienceApi.apiFetch('/admin/flashcard-sets', { method: 'POST', body: payload });
                editId = Number(saved.id || editId);
                document.getElementById('item-id').value = String(editId);
                if (saved.slug) document.getElementById('slug').value = saved.slug;
                showFlash(t('已儲存。', 'Saved.'), false);
                if (!idArg && editId) {
                    global.AppRouter.navigate('/admin/flashcard-sets/' + editId + '/edit');
                }
            } catch (err) {
                showFlash(err.message || t('儲存失敗', 'Save failed'), true);
            }
        };

        const delBtn = document.getElementById('btn-delete');
        if (delBtn) {
            delBtn.onclick = async () => {
                if (!confirm(t('確定刪除此閃卡組？', 'Delete this flashcard set?'))) return;
                try {
                    await global.ScienceApi.apiFetch('/admin/flashcard-sets', { method: 'DELETE', body: { id: editId } });
                    global.AppRouter.navigate('/admin/flashcard-sets');
                } catch (err) {
                    showFlash(err.message || t('刪除失敗', 'Delete failed'), true);
                }
            };
        }
    }

    global.AppAdmin = Object.assign(global.AppAdmin || {}, {
        renderAdminFlashcardSetEdit,
    });

export {};
