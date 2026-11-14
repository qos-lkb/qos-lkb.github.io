'use strict';
const global = window;

const SNAPSHOT_URL = 'https://cdn.jsdelivr.net/npm/modern-screenshot@4.5.5/+esm';

let currentModalUrl = '';
let modalFullscreen = false;
let captureArm = 0;
let snapshotPromise = null;

function lang() {
    return global.AppRouter && AppRouter.getLang ? AppRouter.getLang() : 'zh';
}

function t(zh, en) {
    return lang() === 'zh' ? zh : en;
}

function loadSnapshot() {
    if (!snapshotPromise) {
        snapshotPromise = import(SNAPSHOT_URL).then((mod) => {
            if (!mod || typeof mod.domToBlob !== 'function') throw new Error('截圖元件載入失敗');
            return mod.domToBlob;
        });
    }
    return snapshotPromise;
}

async function captureFrameToPng(frame) {
    const target = frame.contentDocument && frame.contentDocument.documentElement;
    if (!target) throw new Error('預覽尚未載入，請稍候再試');
    const domToBlob = await loadSnapshot();
    const blob = await domToBlob(target, {
        backgroundColor: '#ffffff',
        scale: Math.min(window.devicePixelRatio || 1, 2),
        type: 'image/png',
        features: { restoreScrollPosition: true },
    });
    if (!blob) throw new Error('無法產生圖片');
    return blob;
}

function getFormattedTimestamp() {
    const tz = (typeof window !== 'undefined' && window.__APP_TIMEZONE__) || 'Asia/Hong_Kong';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(new Date());
    const get = type => (parts.find(p => p.type === type) || {}).value || '';
    return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

function getFileNameFromUrl(url) {
    if (!url) return 'simulation';
    try {
        const urlObj = new URL(url, window.location.origin);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const htmlAt = parts.lastIndexOf('html');
        const raw = htmlAt > 0
            ? decodeURIComponent(parts[htmlAt - 1])
            : (urlObj.searchParams.get('slug') || parts[parts.length - 1] || 'simulation');
        return raw.replace(/\.html?$/i, '').replace(/[^\w.-]+/g, '_') || 'simulation';
    } catch (e) {
        return 'simulation';
    }
}

function downloadPngBlob(blob, baseName) {
    const safe = String(baseName || 'simulation').replace(/[^\w\u4e00-\u9fff.-]+/g, '_') || 'simulation';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safe + '_' + getFormattedTimestamp() + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function updateFullscreenButtonUI() {
    const btn = document.getElementById('sim-modal-fullscreen');
    const expandIcon = document.getElementById('sim-modal-fullscreen-expand');
    const compressIcon = document.getElementById('sim-modal-fullscreen-compress');
    if (!btn || !expandIcon || !compressIcon) return;
    if (modalFullscreen) {
        btn.setAttribute('aria-label', t('退出全螢幕', 'Exit fullscreen'));
        btn.title = t('退出全螢幕', 'Exit fullscreen');
        expandIcon.classList.add('hidden');
        compressIcon.classList.remove('hidden');
    } else {
        btn.setAttribute('aria-label', t('全螢幕', 'Fullscreen'));
        btn.title = t('顯示成全螢幕', 'Enter fullscreen');
        expandIcon.classList.remove('hidden');
        compressIcon.classList.add('hidden');
    }
}

function setModalFullscreen(enabled) {
    const modal = document.getElementById('sim-modal');
    if (!modal) return;
    modalFullscreen = !!enabled;
    modal.classList.toggle('fullscreen-mode', modalFullscreen);
    updateFullscreenButtonUI();
}

function toggleModalFullscreen() {
    setModalFullscreen(!modalFullscreen);
}

function onModalOpen(url) {
    currentModalUrl = url;
    setModalFullscreen(false);
    const captureBtn = document.getElementById('sim-modal-capture');
    const iframe = document.getElementById('sim-modal-iframe');
    const token = ++captureArm;
    if (captureBtn) captureBtn.disabled = true;
    if (!iframe) return;
    const arm = () => {
        if (token !== captureArm) return;
        if (captureBtn) captureBtn.disabled = false;
    };
    iframe.onload = () => setTimeout(arm, 300);
    setTimeout(arm, 3000);
}

function onModalClose() {
    captureArm += 1;
    setModalFullscreen(false);
    currentModalUrl = '';
    const captureBtn = document.getElementById('sim-modal-capture');
    if (captureBtn) captureBtn.disabled = true;
}

async function captureModal() {
    const captureBtn = document.getElementById('sim-modal-capture');
    const iframe = document.getElementById('sim-modal-iframe');
    if (!iframe || !iframe.src || iframe.src === 'about:blank') {
        alert(t('無法截圖：內容尚未載入', 'Cannot capture: Content not loaded'));
        return;
    }
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.setAttribute('aria-busy', 'true');
    }
    try {
        const blob = await captureFrameToPng(iframe);
        const fileName = getFileNameFromUrl(currentModalUrl) || 'simulation';
        downloadPngBlob(blob, fileName);
    } catch (error) {
        console.error('Capture failed:', error);
        alert(t('截圖失敗，請稍後再試', 'Capture failed, please try again'));
    } finally {
        if (captureBtn) {
            captureBtn.disabled = false;
            captureBtn.removeAttribute('aria-busy');
        }
    }
}

function init() {
    document.getElementById('sim-modal-fullscreen')?.addEventListener('click', e => {
        e.stopPropagation();
        toggleModalFullscreen();
    });
    document.getElementById('sim-modal-capture')?.addEventListener('click', e => {
        e.stopPropagation();
        captureModal();
    });

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const modal = document.getElementById('sim-modal');
        if (!modal || !modal.classList.contains('active')) return;
        if (modalFullscreen) {
            setModalFullscreen(false);
            return;
        }
        global.AppCatalog?.closeModal();
    });

    document.addEventListener('langchange', () => updateFullscreenButtonUI());
}

global.SimModal = {
    init,
    onOpen: onModalOpen,
    onClose: onModalClose,
    toggleModalFullscreen,
    captureModal,
    setModalFullscreen,
};

export {};
