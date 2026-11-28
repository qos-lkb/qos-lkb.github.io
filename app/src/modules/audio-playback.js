'use strict';

function escapeAttr(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;');
}

/**
 * Defer setting src until the user tries to play, so failed or duplicate
 * requests do not paint the browser's pink media error chrome across the page.
 */
export function audioPlayerHtml(src, options = {}) {
    const extraClass = options.className ? ` ${options.className}` : '';
    if (!src) return '';
    const safeSrc = escapeAttr(src);
    const fallback = escapeAttr(options.fallbackText || 'Could not play this recording.');
    return `<div class="audio-playback-shell${extraClass}">
            <audio controls preload="none" playsinline class="audio-playback w-full" data-audio-src="${safeSrc}"></audio>
            <p class="audio-playback-fallback hidden text-xs text-slate-500 mt-1" role="status">${fallback}</p>
        </div>`;
}

export function bindDeferredAudio(root) {
    if (!root) return;
    root.querySelectorAll('audio[data-audio-src]:not([data-audio-bound])').forEach((el) => {
        el.dataset.audioBound = '1';
        const src = el.getAttribute('data-audio-src') || '';
        if (!src) return;
        const shell = el.closest('.audio-playback-shell');
        const fallback = shell && shell.querySelector('.audio-playback-fallback');
        let attached = false;
        const attachSrc = () => {
            if (attached) return;
            attached = true;
            el.setAttribute('src', src);
        };
        el.addEventListener('pointerdown', attachSrc, { passive: true });
        el.addEventListener('focus', attachSrc);
        el.addEventListener('keydown', (event) => {
            if (event.key === ' ' || event.key === 'Enter') attachSrc();
        });
        el.addEventListener('error', () => {
            el.classList.add('hidden');
            if (fallback) fallback.classList.remove('hidden');
        }, { once: true });
    });
}