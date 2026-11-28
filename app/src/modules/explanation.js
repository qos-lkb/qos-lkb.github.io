'use strict';
const global = window;

import { audioPlayerHtml, bindDeferredAudio } from './audio-playback.js';

const { apiFetch } = global.ScienceApi;
const { t, escapeHtml, getLang } = global.AppRouter;

let catalog = null;
let subject = 'all';
let questionKey = '';
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
let history = [];
let historyFor = '';

function maxSeconds() {
    const n = catalog && Number(catalog.max_seconds);
    return n > 0 ? n : 90;
}

function passScore() {
    const n = catalog && Number(catalog.pass_score);
    return n > 0 ? n : 70;
}

function audioUrl(id) {
    const base = (global.ScienceApi && ScienceApi.API_BASE) || '/api/v1';
    return base + '/explain/attempts/' + encodeURIComponent(String(id)) + '/audio';
}

async function loadHistory(key) {
    const user = global.ScienceApi.getUser && ScienceApi.getUser();
    if (!user || !key) {
        history = [];
        historyFor = key || '';
        return;
    }
    try {
        const data = await apiFetch('/explain/attempts?question_key=' + encodeURIComponent(key));
        if (key !== questionKey) return;
        history = data.attempts || [];
        historyFor = key;
    } catch (_e) {
        if (key !== questionKey) return;
        history = [];
        historyFor = key;
    }
}

function loginUrl() {
    const base = (global.ScienceApi && ScienceApi.SITE_BASE) || '';
    return base + '/login.php?next=' + encodeURIComponent('app/explain');
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

function filteredQuestions() {
    const questions = (catalog && catalog.questions) || [];
    if (subject === 'all') return questions;
    return questions.filter((item) => item.subject === subject);
}

function currentQuestion() {
    const questions = filteredQuestions();
    return questions.find((item) => item.key === questionKey) || questions[0] || null;
}

function scoreClass(score) {
    if (score >= passScore()) return 'text-emerald-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-rose-600';
}

function clock(seconds) {
    const n = Math.max(0, seconds);
    const m = Math.floor(n / 60);
    const s = n % 60;
    return m + ':' + String(s).padStart(2, '0');
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

function subjectLabel(key) {
    const lang = getLang();
    const found = ((catalog && catalog.subjects) || []).find((item) => item.key === key);
    if (!found) return '';
    return lang === 'zh' ? found.label_zh : found.label_en;
}

function selectQuestion(key) {
    if (phase === 'recording' || phase === 'scoring') return;
    cleanup();
    revokePlayback();
    questionKey = key;
    phase = 'idle';
    result = null;
    errorMsg = '';
    elapsed = 0;
    paint();
    void loadHistory(key).then(() => {
        if (key === questionKey && phase !== 'recording') paint();
    });
}

function nextQuestion() {
    const questions = filteredQuestions();
    if (!questions.length) return;
    const index = questions.findIndex((item) => item.key === (currentQuestion() && currentQuestion().key));
    const next = questions[(index + 1) % questions.length];
    phase = 'idle';
    selectQuestion(next.key);
}

async function submit(blob, mime) {
    const question = currentQuestion();
    if (!question) return;
    phase = 'scoring';
    errorMsg = '';
    paint();
    const body = new FormData();
    body.append('question_key', question.key);
    body.append('audio', blob, 'explanation.' + fileExt(mime));
    try {
        const data = await apiFetch('/explain/attempts', { method: 'POST', body });
        result = data;
        phase = 'result';
        const row = (catalog.questions || []).find((item) => item.key === question.key);
        if (row) {
            row.best_score = data.best_score;
            row.attempt_count = data.attempt_count;
        }
        await loadHistory(question.key);
    } catch (e) {
        phase = 'idle';
        errorMsg = e.message || t('評分失敗，請再試一次。', 'Scoring failed. Try again.');
    }
    if (phase !== 'recording') paint();
}

async function beginRecord() {
    const user = global.ScienceApi.getUser && ScienceApi.getUser();
    if (!user) return;
    if (!catalog || !catalog.configured) return;
    if (phase === 'recording' || phase === 'scoring') return;
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
            errorMsg = t('錄音太短，請用自己的話說出原因。', 'That was too short. Explain the reason in your own words.');
            paint();
            return;
        }
        void submit(blob, usedMime);
    };
    recorder.start();
    phase = 'recording';
    elapsed = 0;
    paint();
    const limit = maxSeconds();
    timerId = setInterval(() => {
        elapsed += 1;
        const el = document.getElementById('explain-elapsed');
        if (el) el.textContent = clock(elapsed);
        if (elapsed >= limit && recorder && recorder.state === 'recording') {
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
    const question = currentQuestion();
    if (question && question.key !== questionKey) questionKey = question.key;
    const user = global.ScienceApi.getUser && ScienceApi.getUser();
    const subjects = catalog.subjects || [];
    const questions = filteredQuestions();
    const feedback = result
        ? (lang === 'zh' ? (result.feedback_zh || result.feedback_en) : (result.feedback_en || result.feedback_zh))
        : '';
    const points = result
        ? ((lang === 'zh' ? result.key_points_zh : result.key_points_en) || [])
        : [];
    const prompt = question
        ? (lang === 'zh' ? question.prompt_zh : question.prompt_en)
        : '';
    const title = question
        ? (lang === 'zh' ? question.title_zh : question.title_en)
        : '';

    const chips = [
        `<button type="button" data-subject="all" class="px-3 py-1.5 rounded-full text-sm border ${subject === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-200'}">${escapeHtml(t('全部', 'All'))}</button>`,
    ].concat(subjects.map((item) => {
        const label = lang === 'zh' ? item.label_zh : item.label_en;
        const on = subject === item.key;
        return `<button type="button" data-subject="${escapeHtml(item.key)}" class="px-3 py-1.5 rounded-full text-sm border ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-200'}">${escapeHtml(label)}</button>`;
    })).join('');

    const grid = questions.map((item) => {
        const on = question && item.key === question.key;
        const label = lang === 'zh' ? item.title_zh : item.title_en;
        const badge = item.best_score == null
            ? ''
            : `<span class="ml-2 text-xs font-semibold ${scoreClass(item.best_score)}">${item.best_score}</span>`;
        return `<button type="button" data-question="${escapeHtml(item.key)}" class="text-left px-3 py-2 rounded-xl border text-sm ${on ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'}">
            <span class="font-semibold text-slate-900">${escapeHtml(label)}</span>${badge}
            <span class="block text-xs text-slate-500 mt-0.5">${escapeHtml(subjectLabel(item.subject))}</span>
        </button>`;
    }).join('');

    let action = '';
    if (!user) {
        action = `<a href="${escapeHtml(loginUrl())}" class="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-brand-600 text-white font-semibold">${escapeHtml(t('登入後開始錄音', 'Log in to record'))}</a>`;
    } else if (!catalog.configured) {
        action = `<p class="text-sm text-amber-700">${escapeHtml(t('尚未設定 XAI_API_KEY，暫時不能評分。仍可先看題目。', 'XAI_API_KEY is not set, so scoring is unavailable. You can still read the questions.'))}</p>`;
    } else if (phase === 'recording') {
        action = `<button type="button" id="explain-stop" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-semibold">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse" aria-hidden="true"></span>
            ${escapeHtml(t('停止並評分', 'Stop and score'))}
            <span id="explain-elapsed" class="tabular-nums">${escapeHtml(clock(elapsed))}</span>
        </button>`;
    } else if (phase === 'scoring') {
        action = `<p class="text-sm text-slate-600" role="status">${escapeHtml(t('正在把錄音交給 xAI 分析…', 'Sending the recording to xAI…'))}</p>`;
    } else {
        action = `<button type="button" id="explain-record" class="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-brand-600 text-white font-semibold">${escapeHtml(t('開始錄音', 'Record'))}</button>`;
    }

    const pointHtml = points.length
        ? `<div class="mt-4">
            <p class="text-sm font-semibold text-slate-700">${escapeHtml(t('參考要點', 'Key points'))}</p>
            <ul class="mt-1 list-disc pl-5 text-sm text-slate-700 space-y-1">${points.map((point) => `<li>${escapeHtml(String(point))}</li>`).join('')}</ul>
           </div>`
        : '';

    const replaySrc = result
        ? ((result.has_audio && result.id) ? audioUrl(result.id) : playbackUrl)
        : '';
    const player = replaySrc
        ? `<p class="text-sm font-semibold text-slate-700 mt-4">${escapeHtml(t('重聽這次錄音', 'Replay this recording'))}</p>
           ${audioPlayerHtml(replaySrc, {
               className: 'mt-1',
               fallbackText: t('無法播放這段錄音。', 'Could not play this recording.'),
           })}`
        : '';
    const resultHtml = result ? `
        <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
            <p class="text-xs uppercase tracking-wide text-slate-500">${escapeHtml(t('分數', 'Score'))}</p>
            <p class="text-5xl font-extrabold tabular-nums ${scoreClass(result.score)}">${result.score}</p>
            <p class="text-slate-800 mt-3">${escapeHtml(feedback)}</p>
            <p class="text-sm text-slate-500 mt-2">${escapeHtml(t('xAI 聽到：', 'xAI heard: '))}${escapeHtml(result.transcript || t('（沒有辨識到說話）', '(no speech detected)'))}</p>
            ${player}
            ${pointHtml}
            <div class="flex flex-wrap gap-2 mt-4">
                <button type="button" id="explain-again" class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm">${escapeHtml(t('再解釋一次', 'Try again'))}</button>
                <button type="button" id="explain-next" class="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm">${escapeHtml(t('下一題', 'Next question'))}</button>
            </div>
        </div>` : '';

    main.innerHTML = `
        <div class="max-w-5xl mx-auto w-full">
            <div class="mb-6 pb-4 border-b border-slate-200">
                <p class="text-xs uppercase tracking-wide text-brand-600 font-semibold">${escapeHtml(t('學習', 'Learn'))}</p>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${escapeHtml(t('口述解釋', 'Explain aloud'))}</h1>
                <p class="text-slate-600 mt-2 max-w-2xl">${escapeHtml(t(
                    '用廣東話或普通話解釋科學問題。錄音會即時送到 xAI 轉成文字，再按科學要點判斷是否準確。' + passScore() + ' 分或以上代表主要解釋正確。錄音和分數會保存，你可以稍後重聽。參考要點在評分後才顯示。',
                    'Explain a science question in Cantonese or Mandarin. The recording is sent to xAI, turned into text, and checked against the science. ' + passScore() + ' or above means the main explanation is sound. The recording and score are kept so you can play them back. Key points appear only after scoring.'
                ))}</p>
            </div>
            ${errorMsg ? `<p class="mb-4 text-sm text-rose-700" role="alert">${escapeHtml(errorMsg)}</p>` : ''}
            <div class="flex flex-wrap gap-2 mb-4" role="group" aria-label="${escapeHtml(t('科目', 'Subject'))}">${chips}</div>
            <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-4">
                <section class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
                    ${question ? `
                        <p class="text-sm text-slate-500">${escapeHtml(subjectLabel(question.subject))} · ${escapeHtml(title)}</p>
                        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 leading-snug">${escapeHtml(prompt)}</h2>
                        <p class="mt-3 text-sm text-slate-600">${escapeHtml(t('用自己的話說原因，大約 30 至 60 秒，不必背定義。', 'Explain the reason in your own words, about 30 to 60 seconds. A memorised definition is not required.'))}</p>
                        ${question.best_score != null ? `<p class="text-sm text-slate-500 mt-2">${escapeHtml(t('最佳', 'Best'))} ${question.best_score} · ${question.attempt_count} ${escapeHtml(t('次', 'tries'))}</p>` : ''}
                        <div class="flex flex-wrap items-center gap-2 mt-5">
                            ${action}
                        </div>
                        ${phase === 'recording' ? `<p class="text-xs text-slate-500 mt-2">${escapeHtml(t('最長 ' + maxSeconds() + ' 秒，時間到會自動送出。', 'Stops automatically after ' + maxSeconds() + ' seconds.'))}</p>` : ''}
                        ${resultHtml}
                        ${historyHtml(lang, question)}
                    ` : `<p class="text-slate-500">${escapeHtml(t('這個科目還沒有題目。', 'No questions in this subject.'))}</p>`}
                </section>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 content-start" role="list">${grid}</div>
            </div>
        </div>`;

    main.querySelectorAll('[data-subject]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (phase === 'recording' || phase === 'scoring') return;
            const nextSubject = btn.getAttribute('data-subject') || 'all';
            if (nextSubject === subject) return;
            subject = nextSubject;
            const still = filteredQuestions().some((item) => item.key === questionKey);
            const first = filteredQuestions()[0];
            selectQuestion(still ? questionKey : (first ? first.key : ''));
        });
    });
    main.querySelectorAll('[data-question]').forEach((btn) => {
        btn.addEventListener('click', () => selectQuestion(btn.getAttribute('data-question') || ''));
    });
    const record = document.getElementById('explain-record');
    if (record) record.addEventListener('click', () => { void beginRecord(); });
    const stop = document.getElementById('explain-stop');
    if (stop) stop.addEventListener('click', () => stopRecord());
    const again = document.getElementById('explain-again');
    if (again) {
        again.addEventListener('click', () => {
            result = null;
            errorMsg = '';
            phase = 'idle';
            paint();
        });
    }
    const next = document.getElementById('explain-next');
    if (next) next.addEventListener('click', () => nextQuestion());
    bindDeferredAudio(main);
}

function historyHtml(lang, question) {
    const user = global.ScienceApi.getUser && ScienceApi.getUser();
    if (!user || !question) return '';
    if (historyFor !== question.key) {
        return `<p class="mt-6 text-sm text-slate-500">${escapeHtml(t('正在載入之前的錄音…', 'Loading earlier recordings…'))}</p>`;
    }
    if (!history.length) {
        return `<p class="mt-6 text-sm text-slate-500">${escapeHtml(t('這題還沒有已保存的錄音。', 'No saved recordings for this question yet.'))}</p>`;
    }
    const items = history.map((item) => {
        const note = lang === 'zh' ? (item.feedback_zh || item.feedback_en) : (item.feedback_en || item.feedback_zh);
        const clip = item.has_audio
            ? audioPlayerHtml(audioUrl(item.id), {
                className: 'mt-2',
                fallbackText: t('無法播放這段錄音。', 'Could not play this recording.'),
            })
            : `<p class="text-xs text-slate-500 mt-2">${escapeHtml(t('這次沒有保存到錄音檔。', 'No audio was saved for this try.'))}</p>`;
        return `<article class="rounded-xl border border-slate-200 p-3">
            <div class="flex items-baseline justify-between gap-3">
                <p class="text-2xl font-extrabold tabular-nums ${scoreClass(Number(item.score) || 0)}">${Number(item.score) || 0}</p>
                <time class="text-xs text-slate-500">${escapeHtml(item.created_at || '')}</time>
            </div>
            ${clip}
            <p class="text-sm text-slate-800 mt-2">${escapeHtml(note || '')}</p>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(t('聽到：', 'Heard: '))}${escapeHtml(item.transcript || t('（沒有辨識到說話）', '(no speech detected)'))}</p>
        </article>`;
    }).join('');
    return `<div class="mt-6 pt-5 border-t border-slate-200">
        <h3 class="text-sm font-semibold text-slate-800">${escapeHtml(t('之前的錄音與分數', 'Earlier recordings and scores'))}</h3>
        <div class="mt-3 space-y-3">${items}</div>
    </div>`;
}

async function renderExplanation() {
    cleanup();
    revokePlayback();
    phase = 'idle';
    result = null;
    errorMsg = '';
    elapsed = 0;
    const main = document.getElementById('main-content');
    main.innerHTML = `<p class="text-slate-500">${escapeHtml(t('正在載入口述解釋…', 'Loading oral explanations…'))}</p>`;
    try {
        catalog = await apiFetch('/explain');
    } catch (e) {
        main.innerHTML = `<p class="text-rose-700">${escapeHtml(e.message || t('無法載入口述解釋。', 'Could not load oral explanations.'))}</p>`;
        return;
    }
    if (!questionKey && catalog.questions && catalog.questions[0]) {
        questionKey = catalog.questions[0].key;
    }
    paint();
    const initialKey = questionKey;
    void loadHistory(initialKey).then(() => {
        if (initialKey === questionKey) paint();
    });
}

global.AppExplanation = {
    renderExplanation,
};

export {};
