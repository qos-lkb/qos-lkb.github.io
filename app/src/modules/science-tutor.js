'use strict';
const global = window;

    let root = null;
    let panel = null;
    let log = null;
    let input = null;
    let sendBtn = null;
    let fab = null;
    let resumeList = null;
    let turns = [];
    let chats = [];
    let conversationId = 0;
    let busy = false;
    let abort = null;

    function lang() {
        return global.AppRouter && typeof AppRouter.getLang === 'function' && AppRouter.getLang() === 'en'
            ? 'en'
            : 'zh';
    }

    function t(zh, en) {
        return lang() === 'en' ? en : zh;
    }

    function storageKey() {
        const user = global.ScienceApi && ScienceApi.getUser ? ScienceApi.getUser() : null;
        const id = user && user.id ? String(user.id) : '0';
        return 'science_tutor_cid_' + id;
    }

    function savedConversationId() {
        try {
            return parseInt(sessionStorage.getItem(storageKey()) || '0', 10) || 0;
        } catch (e) {
            return 0;
        }
    }

    function rememberConversationId(id) {
        conversationId = id > 0 ? id : 0;
        try {
            if (conversationId) sessionStorage.setItem(storageKey(), String(conversationId));
            else sessionStorage.removeItem(storageKey());
        } catch (e) { /* ignore */ }
    }

    function pageContext() {
        const path = global.AppRouter && typeof AppRouter.getPath === 'function'
            ? AppRouter.getPath()
            : (location.pathname || '/');
        return {
            title: document.title || '',
            path: String(path || '').slice(0, 200),
        };
    }

    function refreshLabels() {
        if (!root) return;
        const title = root.querySelector('.science-tutor-title');
        const sub = root.querySelector('.science-tutor-sub');
        const closeBtn = root.querySelector('.science-tutor-close');
        const empty = root.querySelector('.science-tutor-empty');
        const newBtn = root.querySelector('[data-tutor-new]');
        const resumeBtn = root.querySelector('[data-tutor-resume]');
        if (title) title.textContent = t('科學助教', 'Science tutor');
        if (sub) sub.textContent = t('物理、化學、生物', 'Physics, chemistry, biology');
        if (closeBtn) closeBtn.setAttribute('aria-label', t('關閉', 'Close'));
        if (fab) fab.setAttribute('aria-label', t('開啟科學助教', 'Open science tutor'));
        if (input) input.placeholder = t('問一題科學問題…', 'Ask a science question…');
        if (sendBtn) sendBtn.textContent = busy ? t('回答中', '…') : t('送出', 'Send');
        if (empty) empty.textContent = t('問我物理、化學或生物問題。公式會用數學式顯示。', 'Ask a physics, chemistry, or biology question. Formulas are shown as math.');
        if (newBtn) newBtn.textContent = t('新對話', 'New chat');
        if (resumeBtn) resumeBtn.textContent = t('繼續對話', 'Resume chat');
    }

    function scrollLog() {
        if (log) log.scrollTop = log.scrollHeight;
    }

    function setBusy(next) {
        busy = next;
        if (input) input.disabled = next;
        if (sendBtn) sendBtn.disabled = next;
        refreshLabels();
    }

    function clearLog() {
        turns = [];
        if (log) log.innerHTML = '';
        showEmpty();
    }

    function appendBubble(className) {
        const empty = log.querySelector('.science-tutor-empty');
        if (empty) empty.remove();
        const el = document.createElement('div');
        el.className = 'science-tutor-msg ' + className;
        log.appendChild(el);
        scrollLog();
        return el;
    }

    function showEmpty() {
        if (!log || log.childElementCount > 0) return;
        const el = document.createElement('p');
        el.className = 'science-tutor-empty';
        log.appendChild(el);
        refreshLabels();
    }

    async function renderRich(el, text) {
        el.classList.add('is-rich');
        if (!global.AppMarkdown) {
            try {
                await import('./markdown.js');
            } catch (e) {
                console.warn('Markdown load failed', e);
            }
        }
        if (global.AppMarkdown && typeof AppMarkdown.renderMarkdownToHtml === 'function') {
            el.innerHTML = AppMarkdown.renderMarkdownToHtml(text);
            if (typeof AppMarkdown.typesetMath === 'function') {
                await AppMarkdown.typesetMath(el);
            }
        } else {
            el.textContent = text;
        }
        scrollLog();
    }

    function consumeSse(buffer, onEvent) {
        const restSource = buffer.replace(/\r\n/g, '\n');
        let rest = restSource;
        let idx = rest.indexOf('\n\n');
        while (idx !== -1) {
            const block = rest.slice(0, idx);
            rest = rest.slice(idx + 2);
            let event = 'message';
            const data = [];
            block.split('\n').forEach((line) => {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
            });
            if (data.length) {
                let payload = {};
                try {
                    payload = JSON.parse(data.join('\n'));
                } catch (e) {
                    payload = {};
                }
                onEvent(event, payload);
            }
            idx = rest.indexOf('\n\n');
        }
        return rest;
    }

    async function readSse(res, onEvent) {
        const reader = res.body && res.body.getReader ? res.body.getReader() : null;
        if (!reader) return;
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
            const step = await reader.read();
            if (step.done) break;
            buf += decoder.decode(step.value, { stream: true });
            buf = consumeSse(buf, onEvent);
        }
        buf += decoder.decode();
        consumeSse(buf + '\n\n', onEvent);
    }

    function closeResume() {
        if (resumeList) resumeList.hidden = true;
    }

    function closePanel() {
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        closeResume();
        if (fab) {
            fab.setAttribute('aria-expanded', 'false');
            fab.focus();
        }
        if (abort) abort.abort();
    }

    function openPanel() {
        if (!panel) return;
        panel.hidden = false;
        if (fab) fab.setAttribute('aria-expanded', 'true');
        refreshLabels();
        showEmpty();
        if (input) input.focus();
        void refreshChatList();
    }

    function paintMessages(messages) {
        if (!log) return;
        log.innerHTML = '';
        turns = [];
        if (!messages.length) {
            showEmpty();
            return;
        }
        const jobs = [];
        for (const msg of messages) {
            if (!msg || (msg.role !== 'user' && msg.role !== 'assistant')) continue;
            const content = String(msg.content || '');
            if (!content) continue;
            turns.push({ role: msg.role, content });
            const el = appendBubble(msg.role === 'user' ? 'science-tutor-msg-user' : 'science-tutor-msg-assistant');
            if (msg.role === 'assistant') jobs.push(renderRich(el, content));
            else el.textContent = content;
        }
        return Promise.all(jobs);
    }

    async function refreshChatList() {
        if (!global.ScienceApi) return;
        try {
            const data = await ScienceApi.apiFetch('/tutor/conversations');
            chats = data.conversations || [];
        } catch (e) {
            chats = [];
        }
        renderResumeList();
    }

    function renderResumeList() {
        if (!resumeList) return;
        if (!chats.length) {
            resumeList.innerHTML = `<p class="science-tutor-resume-empty">${t('還沒有可繼續的對話。', 'No previous chats yet.')}</p>`;
            return;
        }
        resumeList.innerHTML = chats.map((c) => {
            const active = Number(c.id) === conversationId ? ' is-active' : '';
            const label = c.title || t('新對話', 'New chat');
            return `<button type="button" class="science-tutor-resume-item${active}" data-cid="${Number(c.id)}">${label.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</button>`;
        }).join('');
        resumeList.querySelectorAll('[data-cid]').forEach((btn) => {
            btn.addEventListener('click', () => {
                void resumeChat(parseInt(btn.getAttribute('data-cid') || '0', 10));
            });
        });
    }

    async function resumeChat(id) {
        if (!id) return;
        closeResume();
        rememberConversationId(id);
        try {
            const data = await ScienceApi.apiFetch('/tutor/conversations/' + encodeURIComponent(id));
            await paintMessages(data.messages || []);
        } catch (e) {
            appendBubble('science-tutor-msg-error').textContent = e.message || t('無法載入對話。', 'Could not load that chat.');
        }
    }

    async function startNewChat() {
        closeResume();
        if (abort) abort.abort();
        try {
            const data = await ScienceApi.apiFetch('/tutor/conversations', {
                method: 'POST',
                body: { context: pageContext() },
            });
            const id = data && data.conversation ? Number(data.conversation.id) : 0;
            rememberConversationId(id);
            clearLog();
            await refreshChatList();
            if (input) input.focus();
        } catch (e) {
            appendBubble('science-tutor-msg-error').textContent = e.message || t('無法開始新對話。', 'Could not start a new chat.');
        }
    }

    async function send() {
        if (!input || busy) return;
        const text = input.value.trim();
        if (!text) return;
        turns.push({ role: 'user', content: text });
        if (turns.length > 12) turns = turns.slice(-12);
        input.value = '';
        appendBubble('science-tutor-msg-user').textContent = text;
        const assistantEl = appendBubble('science-tutor-msg-assistant');
        assistantEl.textContent = t('回答中…', 'Thinking…');
        setBusy(true);
        abort = new AbortController();
        let acc = '';
        let failed = '';
        let aborted = false;
        try {
            const res = await global.ScienceApi.apiFetch('/tutor/chat', {
                method: 'POST',
                body: {
                    messages: turns.slice(-12),
                    context: pageContext(),
                    conversation_id: conversationId || undefined,
                },
                rawResponse: true,
                signal: abort.signal,
            });
            await readSse(res, (event, payload) => {
                if (event === 'delta' && payload && typeof payload.text === 'string' && payload.text !== '') {
                    if (!acc) assistantEl.textContent = '';
                    acc += payload.text;
                    assistantEl.textContent = acc;
                    scrollLog();
                } else if (event === 'done' && payload && payload.conversation_id) {
                    rememberConversationId(Number(payload.conversation_id) || conversationId);
                } else if (event === 'error') {
                    failed = (payload && payload.message) || t('助教暫時無法回答，請稍後再試。', 'The tutor cannot answer right now. Try again shortly.');
                }
            });
        } catch (e) {
            aborted = e && e.name === 'AbortError';
            if (!aborted) {
                failed = (e && e.message) || t('暫時無法回答，請再試一次。', 'Could not answer. Please try again.');
            }
        }
        if (acc) {
            turns.push({ role: 'assistant', content: acc });
            if (turns.length > 12) turns = turns.slice(-12);
            await renderRich(assistantEl, acc);
            void refreshChatList();
        } else if (assistantEl.isConnected) {
            assistantEl.remove();
        }
        if (failed && !aborted) {
            appendBubble('science-tutor-msg-error').textContent = failed;
        }
        abort = null;
        setBusy(false);
        scrollLog();
    }

    async function loadHistory() {
        if (!log || !global.ScienceApi) return;
        await refreshChatList();
        const wanted = savedConversationId();
        const fallback = chats.length ? Number(chats[0].id) : 0;
        const id = (wanted && chats.some((c) => Number(c.id) === wanted)) ? wanted : fallback;
        if (!id) {
            showEmpty();
            return;
        }
        rememberConversationId(id);
        try {
            const data = await ScienceApi.apiFetch('/tutor/conversations/' + encodeURIComponent(id));
            if (turns.length) return;
            await paintMessages(data.messages || []);
        } catch (e) {
            if (!turns.length) showEmpty();
        }
    }

    function mount() {
        if (root) return;
        if (!global.ScienceApi || typeof ScienceApi.getUser !== 'function' || !ScienceApi.getUser()) return;

        root = document.createElement('div');
        root.className = 'science-tutor';
        root.innerHTML = `
            <section class="science-tutor-panel" hidden role="dialog" aria-modal="false" aria-labelledby="science-tutor-title">
                <div class="science-tutor-head">
                    <div>
                        <h2 id="science-tutor-title" class="science-tutor-title"></h2>
                        <p class="science-tutor-sub"></p>
                    </div>
                    <button type="button" class="science-tutor-close" aria-label="關閉">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-width="2" d="M6 6l12 12M18 6L6 18"></path>
                        </svg>
                    </button>
                </div>
                <div class="science-tutor-toolbar">
                    <button type="button" class="science-tutor-tool" data-tutor-new></button>
                    <button type="button" class="science-tutor-tool" data-tutor-resume aria-expanded="false"></button>
                </div>
                <div class="science-tutor-resume" hidden></div>
                <div class="science-tutor-log" role="log" aria-live="polite"></div>
                <form class="science-tutor-form">
                    <textarea class="science-tutor-input" rows="2" maxlength="4000"></textarea>
                    <button type="submit" class="science-tutor-send"></button>
                </form>
            </section>
            <button type="button" class="science-tutor-fab" aria-expanded="false" aria-controls="science-tutor-title">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v7a2.5 2.5 0 01-2.5 2.5H9.2L4.8 19.2c-.4.35-1 .07-1-.45V15H6.5A2.5 2.5 0 014 12.5v-7z"></path>
                </svg>
            </button>
        `;
        document.body.appendChild(root);
        panel = root.querySelector('.science-tutor-panel');
        log = root.querySelector('.science-tutor-log');
        input = root.querySelector('.science-tutor-input');
        sendBtn = root.querySelector('.science-tutor-send');
        fab = root.querySelector('.science-tutor-fab');
        resumeList = root.querySelector('.science-tutor-resume');
        refreshLabels();
        showEmpty();
        void loadHistory();

        fab.addEventListener('click', () => {
            if (panel.hidden) openPanel();
            else closePanel();
        });
        root.querySelector('.science-tutor-close').addEventListener('click', () => closePanel());
        root.querySelector('[data-tutor-new]').addEventListener('click', () => void startNewChat());
        root.querySelector('[data-tutor-resume]').addEventListener('click', () => {
            if (!resumeList) return;
            const open = resumeList.hidden;
            resumeList.hidden = !open;
            root.querySelector('[data-tutor-resume]').setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                renderResumeList();
                void refreshChatList();
            }
        });
        root.querySelector('.science-tutor-form').addEventListener('submit', (e) => {
            e.preventDefault();
            void send();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel && !panel.hidden) {
                if (resumeList && !resumeList.hidden) {
                    closeResume();
                    e.stopPropagation();
                    return;
                }
                e.stopPropagation();
                closePanel();
            }
        }, true);
        document.getElementById('btn-lang')?.addEventListener('click', () => refreshLabels());

        global.ScienceTutor = Object.assign(global.ScienceTutor || {}, { mount, refreshLabels });
    }

    global.ScienceTutor = { mount, refreshLabels };

export {};
