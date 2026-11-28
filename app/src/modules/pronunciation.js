'use strict';
const global = window;

const { apiFetch } = global.ScienceApi;
const { t, escapeHtml, getLang } = global.AppRouter;

const MAX_SECONDS = 8;

let catalog = null;
let subject = 'all';
let termKey = '';
let phase = 'idle';
let elapsed = 0;
let result = null;
let errorMsg = '';
let playbackUrl = '';
let mediaStream = null;
let recorder = null;
let timerId = null;
let chunks = [];
let recordGen = 0;

function loginUrl() {
    const base = (global.ScienceApi && ScienceApi.SITE_BASE) || '';
    return base + '/login.php?next=' + encodeURIComponent('app/pronunciation');
}

function stopTracks() {
    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
    }
}

function clearTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
}

function revokePlayback() {
    if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
        playbackUrl = '';
    }
}

function cleanup() {
    clearTimer();
    recordGen += 1;
    const active = recorder;
    recorder = null;
    const stream = mediaStream;
    mediaStream = null;
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }
    if (active && active.state === 'recording') {
        try {
            active.stop();
        } catch (_e) {
            /* already stopped with the tracks */
        }
    }
}

function filteredTerms() {
    const terms = (catalog && catalog.terms) || [];
    if (subject === 'all') return terms;
    return terms.filter((term) => term.subject === subject);
}

function currentTerm() {
    const terms = filteredTerms();
    return terms.find((term) => term.key === termKey) || terms[0] || null;
}

function scoreClass(score) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
}

function clock(seconds) {
    const n = Math.max(0, seconds);
    return '0:' + String(n).padStart(2, '0');
}

function pickMime() {
    if (!global.MediaRecorder) return '';
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function fileExt(mime) {
    if (mime.indexOf('mp4') >= 0) return 'm4a';
    if (mime.indexOf('mpeg') >= 0) return 'mp3';
    if (mime.indexOf('wav') >= 0) return 'wav';
    if (mime.indexOf('ogg') >= 0) return 'ogg';
    return 'webm';
}

function speak(term) {
    if (!global.speechSynthesis || !term) return;
    const utter = new SpeechSynthesisUtterance(term.term);
    utter.lang = 'en-GB';
    utter.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
}

function selectTerm(key) {
    cleanup();
    revokePlayback();
    termKey = key;
    phase = 'idle';
    result = null;
    errorMsg = '';
    elapsed = 0;
    paint();
}

function nextTerm() {
    const terms = filteredTerms();
    if (!terms.length) return;
    const index = terms.findIndex((term) => term.key === (currentTerm() && currentTerm().key));
    const next = terms[(index + 1) % terms.length];
    selectTerm(next.key);
}

async function submit(blob, mime) {
    const term = currentTerm();
    if (!term) return;
    phase = 'scoring';
    errorMsg = '';
    paint();
    const body = new FormData();
    body.append('term_key', term.key);
    body.append('audio', blob, 'recording.' + fileExt(mime));
    try {
        const data = await apiFetch('/pronunciation/attempts', { method: 'POST', body });
        result = data;
        phase = 'result';
        const row = (catalog.terms || []).find((item) => item.key === term.key);
        if (row) {
            row.best_score = data.best_score;
            row.attempt_count = data.attempt_count;
        }
    } catch (e) {
        phase = 'idle';
        errorMsg = e.message || t('評分失敗，請再試一次。', 'Scoring failed. Try again.');
    }
    paint();
}

async function beginRecord() {
    const user = global.ScienceApi.getUser && ScienceApi.getUser();
    if (!user) return;
    if (!catalog || !catalog.configured) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !global.MediaRecorder) {
        errorMsg = t('這個瀏覽器不能錄音。請改用電腦版 Chrome、Edge 或 Safari。', 'This browser cannot record. Use desktop Chrome, Edge, or Safari.');
        paint();
        return;
    }
    cleanup();
    const gen = recordGen;
    revokePlayback();
    result = null;
    errorMsg = '';
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
        });
    } catch (_e) {
        if (gen !== recordGen) return;
        errorMsg = t('未能使用麥克風。請允許瀏覽器錄音後再試。', 'Microphone access was blocked. Allow it and try again.');
        phase = 'idle';
        paint();
        return;
    }
    if (gen !== recordGen) {
        stopTracks();
        return;
    }
    const mime = pickMime();
    chunks = [];
    try {
        recorder = mime ? new MediaRecorder(mediaStream, { mimeType: mime }) : new MediaRecorder(mediaStream);
    } catch (_e) {
        stopTracks();
        errorMsg = t('這個瀏覽器不能錄音。', 'This browser cannot record.');
        paint();
        return;
    }
    const usedMime = recorder.mimeType || mime || 'audio/webm';
    const active = recorder;
    active.ondataavailable = (event) => {
        if (gen !== recordGen) return;
        if (event.data && event.data.size) chunks.push(event.data);
    };
    active.onstop = () => {
        if (gen !== recordGen) return;
        clearTimer();
        stopTracks();
        if (recorder === active) recorder = null;
        const blob = new Blob(chunks, { type: usedMime });
        chunks = [];
        revokePlayback();
        playbackUrl = URL.createObjectURL(blob);
        if (blob.size < 1500) {
            phase = 'idle';
            errorMsg = t('錄音太短，請清楚讀出整個詞語。', 'That was too short. Say the whole word.');
            paint();
            return;
        }
        void submit(blob, usedMime);
    };
    recorder.start();
    phase = 'recording';
    elapsed = 0;
    paint();
    timerId = setInterval(() => {
        elapsed += 1;
        const el = document.getElementById('pron-elapsed');
        if (el) el.textContent = clock(elapsed);
        if (elapsed >= MAX_SECONDS && recorder && recorder.state === 'recording') {
            recorder.stop();
        }
    }, 1000);
}

function stopRecord() {
    if (recorder && recorder.state === 'recording') {
        recorder.stop();
    }
}

function paint() {
    const main = document.getElementById('main-content');
    if (!main || !catalog) return;
    const lang = getLang();
    const term = currentTerm();
    if (term && term.key !== termKey) termKey = term.key;
    const user = global.ScienceApi.getUser && ScienceApi.getUser();
    const subjects = catalog.subjects || [];
    const terms = filteredTerms();
    const feedback = result
        ? (lang === 'zh' ? (result.feedback_zh || result.feedback_en) : (result.feedback_en || result.feedback_zh))
        : '';

    const chips = [
        `<button type="button" data-subject="all" class="px-3 py-1.5 rounded-full text-sm border ${subject === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-200'}">${escapeHtml(t('全部', 'All'))}</button>`,
    ].concat(subjects.map((item) => {
        const label = lang === 'zh' ? item.label_zh : item.label_en;
        const on = subject === item.key;
        return `<button type="button" data-subject="${escapeHtml(item.key)}" class="px-3 py-1.5 rounded-full text-sm border ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-200'}">${escapeHtml(label)}</button>`;
    })).join('');

    const grid = terms.map((item) => {
        const on = term && item.key === term.key;
        const badge = item.best_score == null
            ? ''
            : `<span class="ml-2 text-xs font-semibold ${scoreClass(item.best_score)}">${item.best_score}</span>`;
        return `<button type="button" data-term="${escapeHtml(item.key)}" class="text-left px-3 py-2 rounded-xl border text-sm ${on ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'}">
            <span class="font-semibold text-slate-900">${escapeHtml(item.term)}</span>${badge}
            <span class="block text-xs text-slate-500 mt-0.5">${escapeHtml(item.term_zh)}</span>
        </button>`;
    }).join('');

    let action = '';
    if (!user) {
        action = `<a href="${escapeHtml(loginUrl())}" class="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-brand-600 text-white font-semibold">${escapeHtml(t('登入後開始錄音', 'Log in to record'))}</a>`;
    } else if (!catalog.configured) {
        action = `<p class="text-sm text-amber-700">${escapeHtml(t('尚未設定 XAI_API_KEY，暫時不能評分。仍可先聽讀音。', 'XAI_API_KEY is not set, so scoring is unavailable. You can still listen.'))}</p>`;
    } else if (phase === 'recording') {
        action = `<button type="button" id="pron-stop" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-semibold">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse" aria-hidden="true"></span>
            ${escapeHtml(t('停止並評分', 'Stop and score'))}
            <span id="pron-elapsed" class="tabular-nums">${escapeHtml(clock(elapsed))}</span>
        </button>`;
    } else if (phase === 'scoring') {
        action = `<p class="text-sm text-slate-600" role="status">${escapeHtml(t('正在把錄音交給 xAI 評分…', 'Sending the recording to xAI…'))}</p>`;
    } else {
        action = `<button type="button" id="pron-record" class="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-brand-600 text-white font-semibold">${escapeHtml(t('開始錄音', 'Record'))}</button>`;
    }

    const resultHtml = result ? `
        <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
            <p class="text-xs uppercase tracking-wide text-slate-500">${escapeHtml(t('分數', 'Score'))}</p>
            <p class="text-5xl font-extrabold tabular-nums ${scoreClass(result.score)}">${result.score}</p>
            <p class="text-slate-800 mt-3">${escapeHtml(feedback)}</p>
            <p class="text-sm text-slate-500 mt-2">${escapeHtml(t('xAI 聽到：', 'xAI heard: '))}${escapeHtml(result.transcript || t('（沒有辨識到說話）', '(no speech detected)'))}</p>
            <div class="flex flex-wrap gap-2 mt-4">
                ${playbackUrl ? `<button type="button" id="pron-replay" class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm">${escapeHtml(t('重聽自己的錄音', 'Replay mine'))}</button>` : ''}
                <button type="button" id="pron-again" class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm">${escapeHtml(t('再練一次', 'Try again'))}</button>
                <button type="button" id="pron-next" class="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm">${escapeHtml(t('下一詞', 'Next word'))}</button>
            </div>
        </div>` : '';

    main.innerHTML = `
        <div class="max-w-5xl mx-auto w-full">
            <div class="mb-6 pb-4 border-b border-slate-200">
                <p class="text-xs uppercase tracking-wide text-brand-600 font-semibold">${escapeHtml(t('學習', 'Learn'))}</p>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${escapeHtml(t('科學詞語讀音', 'Science pronunciation'))}</h1>
                <p class="text-slate-600 mt-2 max-w-2xl">${escapeHtml(t(
                    '對着麥克風讀出英文科學詞語。錄音會即時送到 xAI 轉成文字，再與正確詞語比對給分。80 分或以上代表聽得清楚。聲音檔不會保存。',
                    'Say the English science term into the microphone. The recording is sent to xAI, turned into text, and scored against the word. 80 or above means it was clear. The audio file is not kept.'
                ))}</p>
            </div>
            ${errorMsg ? `<p class="mb-4 text-sm text-rose-700" role="alert">${escapeHtml(errorMsg)}</p>` : ''}
            <div class="flex flex-wrap gap-2 mb-4" role="group" aria-label="${escapeHtml(t('科目', 'Subject'))}">${chips}</div>
            <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-4">
                <section class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
                    ${term ? `
                        <p class="text-sm text-slate-500">${escapeHtml(term.term_zh)}</p>
                        <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">${escapeHtml(term.term)}</h2>
                        <p class="mt-2 text-slate-600"><span class="text-slate-400">${escapeHtml(t('讀音提示', 'Say it like'))}</span> ${escapeHtml(term.phonetic)}</p>
                        ${term.best_score != null ? `<p class="text-sm text-slate-500 mt-2">${escapeHtml(t('最佳', 'Best'))} ${term.best_score} · ${term.attempt_count} ${escapeHtml(t('次', 'tries'))}</p>` : ''}
                        <div class="flex flex-wrap items-center gap-2 mt-5">
                            <button type="button" id="pron-listen" class="px-4 py-2.5 rounded-lg border border-slate-300 bg-white font-medium" ${phase === 'recording' || phase === 'scoring' ? 'disabled' : ''}>${escapeHtml(t('聽讀音', 'Listen'))}</button>
                            ${action}
                        </div>
                        ${phase === 'recording' ? `<p class="text-xs text-slate-500 mt-2">${escapeHtml(t('最長 8 秒，時間到會自動送出。', 'Stops automatically after 8 seconds.'))}</p>` : ''}
                        ${resultHtml}
                    ` : `<p class="text-slate-500">${escapeHtml(t('這個科目還沒有詞語。', 'No words in this subject.'))}</p>`}
                </section>
                <div class="grid grid-cols-2 lg:grid-cols-1 gap-2 content-start">${grid}</div>
            </div>
        </div>`;

    main.querySelectorAll('[data-subject]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const nextSubject = btn.getAttribute('data-subject') || 'all';
            if (nextSubject === subject) return;
            subject = nextSubject;
            const still = filteredTerms().some((item) => item.key === termKey);
            const first = filteredTerms()[0];
            selectTerm(still ? termKey : (first ? first.key : ''));
        });
    });
    main.querySelectorAll('[data-term]').forEach((btn) => {
        btn.addEventListener('click', () => selectTerm(btn.getAttribute('data-term') || ''));
    });
    const listen = document.getElementById('pron-listen');
    if (listen) listen.addEventListener('click', () => speak(currentTerm()));
    const record = document.getElementById('pron-record');
    if (record) record.addEventListener('click', () => { void beginRecord(); });
    const stop = document.getElementById('pron-stop');
    if (stop) stop.addEventListener('click', () => stopRecord());
    const again = document.getElementById('pron-again');
    if (again) {
        again.addEventListener('click', () => {
            result = null;
            errorMsg = '';
            phase = 'idle';
            paint();
        });
    }
    const next = document.getElementById('pron-next');
    if (next) next.addEventListener('click', () => nextTerm());
    const replay = document.getElementById('pron-replay');
    if (replay) {
        replay.addEventListener('click', () => {
            if (!playbackUrl) return;
            const audio = new Audio(playbackUrl);
            void audio.play();
        });
    }
}

async function renderPronunciation() {
    cleanup();
    revokePlayback();
    phase = 'idle';
    result = null;
    errorMsg = '';
    elapsed = 0;
    const main = document.getElementById('main-content');
    main.innerHTML = `<p class="text-slate-500">${escapeHtml(t('正在載入讀音練習…', 'Loading pronunciation practice…'))}</p>`;
    try {
        catalog = await apiFetch('/pronunciation');
    } catch (e) {
        main.innerHTML = `<p class="text-rose-700">${escapeHtml(e.message || t('無法載入讀音練習。', 'Could not load pronunciation practice.'))}</p>`;
        return;
    }
    if (!termKey && catalog.terms && catalog.terms[0]) {
        termKey = catalog.terms[0].key;
    }
    paint();
}

global.AppPronunciation = {
    renderPronunciation,
};

export {};
