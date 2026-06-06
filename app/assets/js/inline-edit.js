(function (global) {
    'use strict';

    const { apiFetch, hasPermission } = global.ScienceApi;

    const TYPE_CONFIG = {
        note: {
            endpoint: '/admin/learning-notes',
            perms: ['learning_note.manage_any', 'user.manage'],
        },
        article: {
            endpoint: '/admin/articles',
            perms: ['article.manage_any', 'user.manage'],
        },
        worksheet: {
            endpoint: '/admin/worksheets',
            perms: ['worksheet.manage_any', 'user.manage'],
        },
    };

    let activeEditor = null;

    function t(zh, en) {
        return global.AppRouter && typeof global.AppRouter.t === 'function'
            ? global.AppRouter.t(zh, en)
            : zh;
    }

    function getLang() {
        return global.AppRouter && global.AppRouter.getLang
            ? global.AppRouter.getLang()
            : 'zh';
    }

    function canEditType(type) {
        const cfg = TYPE_CONFIG[type];
        if (!cfg || !global.ScienceApi.getUser()) return false;
        return cfg.perms.some((p) => hasPermission(p));
    }

    function showFlash(root, message, isError) {
        let el = root.querySelector('.inline-edit-flash');
        if (!el) {
            el = document.createElement('p');
            el.className = 'inline-edit-flash';
            root.prepend(el);
        }
        el.textContent = message;
        el.classList.toggle('inline-edit-flash-error', !!isError);
        el.classList.toggle('inline-edit-flash-ok', !isError);
        el.hidden = false;
        clearTimeout(el._flashTimer);
        el._flashTimer = setTimeout(() => { el.hidden = true; }, 4000);
    }

    function cancelActiveEditor() {
        if (activeEditor && activeEditor.cancel) {
            activeEditor.cancel();
        }
    }

    function attachMarkdownEditor(opts) {
        const {
            type,
            record,
            root,
            titleEl,
            bodyEl,
            buildPayload,
            onBodyUpdated,
        } = opts;

        if (!canEditType(type) || !root || !titleEl || !bodyEl || !buildPayload) {
            return;
        }

        cancelActiveEditor();

        let hint = root.querySelector('.inline-edit-admin-hint');
        if (!hint) {
            hint = document.createElement('p');
            hint.className = 'inline-edit-admin-hint';
            hint.textContent = t('管理員：雙擊標題或內文可編輯（Ctrl+Enter 儲存，Esc 取消）', 'Admin: double-click title or body to edit (Ctrl+Enter save, Esc cancel)');
            const backBtn = root.querySelector('button[id$="-back"], #note-back, #art-back, #ws-back');
            if (backBtn && backBtn.parentNode) {
                backBtn.insertAdjacentElement('afterend', hint);
            } else {
                root.prepend(hint);
            }
        }

        titleEl.classList.add('inline-edit-target');
        titleEl.setAttribute('title', t('雙擊編輯標題', 'Double-click to edit title'));
        bodyEl.classList.add('inline-edit-target');
        bodyEl.setAttribute('title', t('雙擊編輯內文（Markdown）', 'Double-click to edit body (Markdown)'));

        titleEl.addEventListener('dblclick', onTitleDblClick);
        bodyEl.addEventListener('dblclick', onBodyDblClick);

        function getTitleValue() {
            const lang = getLang();
            return lang === 'zh' ? (record.title_zh || '') : (record.title_en || '');
        }

        function getBodyValue() {
            const lang = getLang();
            return lang === 'zh' ? (record.body_zh || '') : (record.body_en || '');
        }

        function setTitleValue(val) {
            const lang = getLang();
            if (lang === 'zh') record.title_zh = val;
            else record.title_en = val;
        }

        function setBodyValue(val) {
            const lang = getLang();
            if (lang === 'zh') record.body_zh = val;
            else record.body_en = val;
        }

        async function saveField(field, value) {
            const lang = getLang();
            if (field === 'title') setTitleValue(value);
            else setBodyValue(value);

            const payload = buildPayload(record, lang, field, value);
            root.classList.add('inline-edit-saving');
            try {
                const updated = await apiFetch(TYPE_CONFIG[type].endpoint, {
                    method: 'POST',
                    body: payload,
                });
                Object.assign(record, updated);
                showFlash(root, t('已儲存', 'Saved'), false);
                return updated;
            } catch (err) {
                showFlash(root, err.message || t('儲存失敗', 'Save failed'), true);
                throw err;
            } finally {
                root.classList.remove('inline-edit-saving');
            }
        }

        function onTitleDblClick(e) {
            e.preventDefault();
            if (activeEditor) return;

            const original = getTitleValue();
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'inline-edit-input inline-edit-title';
            input.value = original;

            titleEl.replaceWith(input);
            input.focus();
            input.select();

            const editor = {
                cancel: () => {
                    if (!input.isConnected) return;
                    input.replaceWith(titleEl);
                    titleEl.textContent = getTitleValue();
                    activeEditor = null;
                },
                save: async () => {
                    if (!input.isConnected) return;
                    const next = input.value.trim();
                    if (next === original) {
                        editor.cancel();
                        return;
                    }
                    try {
                        await saveField('title', next);
                        titleEl.textContent = next;
                        editor.cancel();
                    } catch (err) {
                        input.focus();
                    }
                },
            };
            activeEditor = editor;

            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape') {
                    ev.preventDefault();
                    editor.cancel();
                } else if (ev.key === 'Enter') {
                    ev.preventDefault();
                    editor.save();
                }
            });
            input.addEventListener('blur', () => {
                setTimeout(() => {
                    if (activeEditor === editor) editor.save();
                }, 0);
            });
        }

        function onBodyDblClick(e) {
            if (e.target.closest('.mermaid')) return;
            e.preventDefault();
            if (activeEditor) return;

            const original = getBodyValue();
            const textarea = document.createElement('textarea');
            textarea.className = 'inline-edit-input inline-edit-body';
            textarea.value = original;
            textarea.spellcheck = false;

            const savedHtml = bodyEl.innerHTML;
            bodyEl.innerHTML = '';
            bodyEl.appendChild(textarea);
            bodyEl.classList.add('inline-edit-active');
            textarea.focus();

            const editor = {
                cancel: () => {
                    if (!bodyEl.classList.contains('inline-edit-active')) return;
                    bodyEl.classList.remove('inline-edit-active');
                    bodyEl.innerHTML = savedHtml;
                    activeEditor = null;
                },
                save: async () => {
                    if (!bodyEl.classList.contains('inline-edit-active')) return;
                    const next = textarea.value;
                    if (next === original) {
                        editor.cancel();
                        return;
                    }
                    try {
                        await saveField('body', next);
                        bodyEl.classList.remove('inline-edit-active');
                        activeEditor = null;
                        if (onBodyUpdated) {
                            await onBodyUpdated(bodyEl, next);
                        }
                    } catch (err) {
                        textarea.focus();
                    }
                },
            };
            activeEditor = editor;

            textarea.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape') {
                    ev.preventDefault();
                    editor.cancel();
                } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
                    ev.preventDefault();
                    editor.save();
                }
            });
            textarea.addEventListener('blur', () => {
                setTimeout(() => {
                    if (activeEditor === editor) editor.save();
                }, 0);
            });
        }
    }

    function buildNotePayload(record) {
        return {
            id: record.id,
            slug: record.slug,
            title_zh: record.title_zh,
            title_en: record.title_en,
            body_zh: record.body_zh,
            body_en: record.body_en,
            subject_id: record.subject_id,
            topic_id: record.topic_id,
            reading_time_minutes: record.reading_time_minutes,
            list_sort_order: record.list_sort_order,
            status: record.status,
        };
    }

    function buildWorksheetPayload(record) {
        return {
            id: record.id,
            slug: record.slug,
            title_zh: record.title_zh,
            title_en: record.title_en,
            description_zh: record.description_zh || '',
            description_en: record.description_en || '',
            body_zh: record.body_zh,
            body_en: record.body_en,
            subject_id: record.subject_id,
            topic_id: record.topic_id,
            list_sort_order: record.list_sort_order,
            status: record.status,
        };
    }

    function buildArticlePayload(record, questionsForSave) {
        return {
            id: record.id,
            slug: record.slug,
            title_zh: record.title_zh,
            title_en: record.title_en,
            body_zh: record.body_zh,
            body_en: record.body_en,
            subject_id: record.subject_id,
            topic_id: record.topic_id,
            reading_time_minutes: record.reading_time_minutes,
            list_sort_order: record.list_sort_order,
            status: record.status,
            questions: questionsForSave,
        };
    }

    function questionsForArticleSave(questions, answerMap) {
        if (!Array.isArray(questions) || !questions.length) return [];
        return questions.map((q) => {
            const correctIdx = answerMap && answerMap[q.id]
                ? answerMap[q.id].correct_option_index
                : null;
            return {
                sort_order: q.sort_order,
                stem_zh: q.stem_zh,
                stem_en: q.stem_en,
                explanation_zh: q.explanation_zh || '',
                explanation_en: q.explanation_en || '',
                options: (q.options || []).map((o, i) => ({
                    text_zh: o.text_zh,
                    text_en: o.text_en,
                    is_correct: correctIdx === i,
                })),
            };
        });
    }

    let subjectsCache = null;

    async function fetchSubjectsWithTopics() {
        if (subjectsCache) return subjectsCache;
        subjectsCache = await apiFetch('/subjects');
        return subjectsCache;
    }

    function subjectLabel(subject) {
        if (!subject) return '';
        return getLang() === 'zh' ? subject.name_zh : subject.name_en;
    }

    function fillTopicOptions(topicSelect, subjects, subjectId, topicId) {
        topicSelect.innerHTML = `<option value="">${t('— 請選擇 —', '— Select —')}</option>`;
        const subject = subjects.find((s) => String(s.id) === String(subjectId));
        (subject?.topics || []).forEach((tp) => {
            const opt = document.createElement('option');
            opt.value = String(tp.id);
            opt.textContent = subjectLabel(tp);
            topicSelect.appendChild(opt);
        });
        if (topicId) topicSelect.value = String(topicId);
    }

    function bindSubjectTopicCascade(modal) {
        const subjectSelect = modal.querySelector('[data-note-prop="subject_id"]');
        const topicSelect = modal.querySelector('[data-note-prop="topic_id"]');
        if (!subjectSelect || !topicSelect || subjectSelect.dataset.bound) return;
        subjectSelect.dataset.bound = '1';
        subjectSelect.addEventListener('change', () => {
            fillTopicOptions(topicSelect, subjectsCache || [], subjectSelect.value, '');
        });
    }

    function ensureNotePropsModal() {
        if (document.getElementById('note-props-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'note-props-modal';
        modal.className = 'admin-create-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="admin-create-panel" role="dialog" aria-modal="true" aria-labelledby="note-props-title">
                <div class="admin-create-header">
                    <h2 id="note-props-title" class="admin-create-heading">${t('筆記特性', 'Note properties')}</h2>
                    <button type="button" class="admin-create-close" aria-label="${t('關閉', 'Close')}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="note-props-form" class="admin-create-form">
                    <p id="note-props-error" class="admin-create-error hidden" role="alert"></p>
                    <label class="admin-create-label">
                        <span>${t('科目', 'Subject')}</span>
                        <select data-note-prop="subject_id" class="admin-create-input">
                            <option value="">${t('— 未指定 —', '— None —')}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${t('課題', 'Topic')}</span>
                        <select data-note-prop="topic_id" class="admin-create-input">
                            <option value="">${t('— 請選擇 —', '— Select —')}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${t('排序（同課題內順序）', 'Sort order (within topic)')}</span>
                        <input type="number" data-note-prop="list_sort_order" class="admin-create-input" value="0" step="1">
                    </label>
                    <label class="admin-create-label">
                        <span>${t('閱讀時間（分鐘）', 'Reading time (minutes)')}</span>
                        <input type="number" data-note-prop="reading_time_minutes" class="admin-create-input" min="1" step="1" placeholder="${t('選填', 'Optional')}">
                    </label>
                    <label class="admin-create-label">
                        <span>${t('狀態', 'Status')}</span>
                        <select data-note-prop="status" class="admin-create-input">
                            <option value="published">${t('已發佈', 'Published')}</option>
                            <option value="draft">${t('草稿', 'Draft')}</option>
                            <option value="pending_review">${t('待審核', 'Pending review')}</option>
                        </select>
                    </label>
                    <div class="admin-create-actions">
                        <button type="button" class="admin-create-btn admin-create-btn-secondary" data-cancel>${t('取消', 'Cancel')}</button>
                        <button type="submit" class="admin-create-btn admin-create-btn-primary">${t('儲存', 'Save')}</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        const form = modal.querySelector('#note-props-form');
        const errEl = modal.querySelector('#note-props-error');

        function closeModal() {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            errEl.hidden = true;
            errEl.textContent = '';
            modal._record = null;
            modal._onSaved = null;
        }

        modal.querySelector('.admin-create-close').addEventListener('click', closeModal);
        modal.querySelector('[data-cancel]').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const record = modal._record;
            if (!record || !record.id) return;

            const subjectVal = form.querySelector('[data-note-prop="subject_id"]').value;
            const topicVal = form.querySelector('[data-note-prop="topic_id"]').value;
            const sortVal = parseInt(form.querySelector('[data-note-prop="list_sort_order"]').value, 10);
            const readingVal = form.querySelector('[data-note-prop="reading_time_minutes"]').value.trim();
            const statusVal = form.querySelector('[data-note-prop="status"]').value;

            record.subject_id = subjectVal ? parseInt(subjectVal, 10) : null;
            record.topic_id = topicVal ? parseInt(topicVal, 10) : null;
            record.list_sort_order = Number.isFinite(sortVal) ? sortVal : 0;
            record.reading_time_minutes = readingVal ? parseInt(readingVal, 10) : null;
            record.status = statusVal;

            const submitBtn = form.querySelector('[type="submit"]');
            submitBtn.disabled = true;
            errEl.hidden = true;
            try {
                const updated = await apiFetch(TYPE_CONFIG.note.endpoint, {
                    method: 'POST',
                    body: buildNotePayload(record),
                });
                Object.assign(record, updated);
                closeModal();
                if (typeof modal._onSaved === 'function') {
                    await modal._onSaved(updated);
                }
            } catch (err) {
                errEl.textContent = err.message || t('儲存失敗', 'Save failed');
                errEl.hidden = false;
            } finally {
                submitBtn.disabled = false;
            }
        });

        bindSubjectTopicCascade(modal);
    }

    async function populateNotePropsForm(modal, record) {
        await fetchSubjectsWithTopics();
        const subjectSelect = modal.querySelector('[data-note-prop="subject_id"]');
        const topicSelect = modal.querySelector('[data-note-prop="topic_id"]');

        subjectSelect.innerHTML = `<option value="">${t('— 未指定 —', '— None —')}</option>`;
        (subjectsCache || []).forEach((sub) => {
            const opt = document.createElement('option');
            opt.value = String(sub.id);
            opt.textContent = subjectLabel(sub);
            subjectSelect.appendChild(opt);
        });

        subjectSelect.value = record.subject_id ? String(record.subject_id) : '';
        fillTopicOptions(topicSelect, subjectsCache || [], record.subject_id, record.topic_id);

        modal.querySelector('[data-note-prop="list_sort_order"]').value = record.list_sort_order ?? 0;
        modal.querySelector('[data-note-prop="reading_time_minutes"]').value = record.reading_time_minutes ?? '';
        modal.querySelector('[data-note-prop="status"]').value = record.status || 'published';
    }

    async function openNotePropertiesModal(record, callbacks) {
        if (!canEditType('note') || !record?.id) return;
        ensureNotePropsModal();
        const modal = document.getElementById('note-props-modal');
        modal._record = record;
        modal._onSaved = callbacks && callbacks.onSaved ? callbacks.onSaved : null;
        modal.querySelector('#note-props-error').hidden = true;
        await populateNotePropsForm(modal, record);
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modal.querySelector('[data-note-prop="subject_id"]').focus();
    }

    function attachNotePropertiesButton(root, record, onSaved) {
        if (!canEditType('note') || !root || !record?.id) return;

        let bar = root.querySelector('.inline-edit-admin-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'inline-edit-admin-bar';
            const backBtn = root.querySelector('#note-back');
            if (backBtn && backBtn.parentNode) {
                backBtn.insertAdjacentElement('afterend', bar);
            } else {
                root.prepend(bar);
            }
        }

        let btn = bar.querySelector('[data-note-props-btn]');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.notePropsBtn = '1';
            btn.className = 'inline-edit-props-btn';
            btn.textContent = t('編輯特性', 'Edit properties');
            bar.appendChild(btn);
        }
        btn.onclick = () => openNotePropertiesModal(record, { onSaved });
    }

    let createNoteModalReady = false;

    function ensureCreateNoteModal() {
        if (document.getElementById('create-note-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'create-note-modal';
        modal.className = 'admin-create-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="admin-create-panel" role="dialog" aria-modal="true" aria-labelledby="create-note-title">
                <div class="admin-create-header">
                    <h2 id="create-note-title" class="admin-create-heading">${t('新增學習筆記', 'New learning note')}</h2>
                    <button type="button" class="admin-create-close" aria-label="${t('關閉', 'Close')}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="create-note-form" class="admin-create-form">
                    <p id="create-note-error" class="admin-create-error hidden" role="alert"></p>
                    <label class="admin-create-label">
                        <span>${t('中文標題', 'Title (Chinese)')}</span>
                        <input type="text" id="create-note-title-zh" class="admin-create-input" required maxlength="500">
                    </label>
                    <label class="admin-create-label">
                        <span>${t('英文標題', 'Title (English)')}</span>
                        <input type="text" id="create-note-title-en" class="admin-create-input" maxlength="500">
                    </label>
                    <label class="admin-create-label">
                        <span>${t('狀態', 'Status')}</span>
                        <select id="create-note-status" class="admin-create-input">
                            <option value="published">${t('已發佈', 'Published')}</option>
                            <option value="draft">${t('草稿', 'Draft')}</option>
                            <option value="pending_review">${t('待審核', 'Pending review')}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${t('科目', 'Subject')}</span>
                        <select id="create-note-subject" data-note-prop="subject_id" class="admin-create-input">
                            <option value="">${t('— 未指定 —', '— None —')}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${t('課題', 'Topic')}</span>
                        <select id="create-note-topic" data-note-prop="topic_id" class="admin-create-input">
                            <option value="">${t('— 請選擇 —', '— Select —')}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${t('排序（同課題內順序）', 'Sort order (within topic)')}</span>
                        <input type="number" id="create-note-sort" class="admin-create-input" value="0" step="1">
                    </label>
                    <div class="admin-create-actions">
                        <button type="button" class="admin-create-btn admin-create-btn-secondary" data-cancel>${t('取消', 'Cancel')}</button>
                        <button type="submit" class="admin-create-btn admin-create-btn-primary">${t('建立', 'Create')}</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        const form = modal.querySelector('#create-note-form');
        const errEl = modal.querySelector('#create-note-error');

        function closeModal() {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            errEl.hidden = true;
            errEl.textContent = '';
        }

        modal.querySelector('.admin-create-close').addEventListener('click', closeModal);
        modal.querySelector('[data-cancel]').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleZh = form.querySelector('#create-note-title-zh').value.trim();
            const titleEn = form.querySelector('#create-note-title-en').value.trim();
            const status = form.querySelector('#create-note-status').value;
            const subjectVal = form.querySelector('#create-note-subject').value;
            const topicVal = form.querySelector('#create-note-topic').value;
            const sortVal = parseInt(form.querySelector('#create-note-sort').value, 10);
            if (!titleZh && !titleEn) {
                errEl.textContent = t('請至少填寫一個標題。', 'Please enter at least one title.');
                errEl.hidden = false;
                return;
            }
            const zh = titleZh || titleEn;
            const en = titleEn || titleZh;
            const submitBtn = form.querySelector('[type="submit"]');
            submitBtn.disabled = true;
            errEl.hidden = true;
            try {
                const created = await createLearningNote({
                    title_zh: zh,
                    title_en: en,
                    body_zh: `# ${zh}\n\n${t('在此撰寫筆記內容…', 'Write note content here…')}\n`,
                    body_en: `# ${en}\n\nWrite note content here…\n`,
                    status,
                    subject_id: subjectVal ? parseInt(subjectVal, 10) : null,
                    topic_id: topicVal ? parseInt(topicVal, 10) : null,
                    list_sort_order: Number.isFinite(sortVal) ? sortVal : 0,
                });
                closeModal();
                if (created && created.slug && global.AppRouter) {
                    global.AppRouter.navigate('/note/' + encodeURIComponent(created.slug));
                } else if (global.AppRouter) {
                    global.AppRouter.navigate('/learning-notes');
                }
            } catch (err) {
                errEl.textContent = err.message || t('建立失敗', 'Create failed');
                errEl.hidden = false;
            } finally {
                submitBtn.disabled = false;
            }
        });

        bindSubjectTopicCascade(modal);
        createNoteModalReady = true;
    }

    async function populateCreateNoteSubjects() {
        ensureCreateNoteModal();
        const modal = document.getElementById('create-note-modal');
        const subjectSelect = modal.querySelector('#create-note-subject');
        const topicSelect = modal.querySelector('#create-note-topic');
        await fetchSubjectsWithTopics();
        subjectSelect.innerHTML = `<option value="">${t('— 未指定 —', '— None —')}</option>`;
        (subjectsCache || []).forEach((sub) => {
            const opt = document.createElement('option');
            opt.value = String(sub.id);
            opt.textContent = subjectLabel(sub);
            subjectSelect.appendChild(opt);
        });
        fillTopicOptions(topicSelect, subjectsCache || [], '', '');
    }

    async function createLearningNote(data) {
        if (!canEditType('note')) {
            throw new Error(t('沒有權限。', 'Permission denied.'));
        }
        return apiFetch(TYPE_CONFIG.note.endpoint, {
            method: 'POST',
            body: {
                title_zh: data.title_zh,
                title_en: data.title_en,
                body_zh: data.body_zh,
                body_en: data.body_en,
                status: data.status || 'published',
                subject_id: data.subject_id ?? null,
                topic_id: data.topic_id ?? null,
                list_sort_order: data.list_sort_order || 0,
            },
        });
    }

    function openCreateNoteModal() {
        if (!canEditType('note')) return;
        ensureCreateNoteModal();
        const modal = document.getElementById('create-note-modal');
        const form = document.getElementById('create-note-form');
        form.reset();
        form.querySelector('#create-note-status').value = 'published';
        form.querySelector('#create-note-sort').value = '0';
        modal.querySelector('#create-note-error').hidden = true;
        populateCreateNoteSubjects().then(() => {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            form.querySelector('#create-note-title-zh').focus();
        });
    }

    global.AppInlineEdit = {
        canEditType,
        attachMarkdownEditor,
        attachNotePropertiesButton,
        buildNotePayload,
        buildWorksheetPayload,
        buildArticlePayload,
        questionsForArticleSave,
        cancelActiveEditor,
        createLearningNote,
        openCreateNoteModal,
        openNotePropertiesModal,
    };
})(window);
