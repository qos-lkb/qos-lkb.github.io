(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;

    const PROVIDER_LABELS = {
        youtube: 'YouTube',
        vimeo: 'Vimeo',
        brightcove: 'Brightcove',
        dailymotion: 'Dailymotion',
        facebook: 'Facebook',
        instagram: 'Instagram',
    };

    function providerLabel(provider) {
        return PROVIDER_LABELS[provider] || provider || '';
    }

    function bindVideoComplete(slug, durationMinutes, meta) {
        if (!global.AppLearningTracker || !global.AppLearningTracker.canTrack()) return;
        const minSeconds = durationMinutes ? Math.max(30, Math.round(durationMinutes * 60 * 0.7)) : 60;
        const timer = setTimeout(() => {
            global.AppLearningTracker.trackContentComplete('video', slug, meta);
        }, minSeconds * 1000);
        const page = document.getElementById('video-page');
        if (!page) return;
        page._videoCompleteTimer = timer;
    }

    function clearVideoCompleteTimer() {
        const page = document.getElementById('video-page');
        if (page && page._videoCompleteTimer) {
            clearTimeout(page._videoCompleteTimer);
            page._videoCompleteTimer = null;
        }
    }

    function pickVideoEmbed(video, lang) {
        const isEn = lang === 'en';
        return {
            embedUrl: isEn
                ? (video.embed_url_en || video.embed_url_zh || video.embed_url)
                : (video.embed_url_zh || video.embed_url_en || video.embed_url),
            provider: isEn
                ? (video.provider_en || video.provider_zh || video.provider)
                : (video.provider_zh || video.provider_en || video.provider),
        };
    }

    async function renderVideo(slug) {
        clearVideoCompleteTimer();
        const main = document.getElementById('main-content');
        try {
            const video = await apiFetch('/learning-videos/' + encodeURIComponent(slug));
            const lang = getLang();
            const title = lang === 'zh' ? video.title_zh : video.title_en;
            const metaParts = [];
            const sub = lang === 'zh' ? video.subject_zh : video.subject_en;
            const top = lang === 'zh' ? video.topic_zh : video.topic_en;
            if (sub && top) metaParts.push(`${sub} · ${top}`);
            else if (sub) metaParts.push(sub);
            if (video.duration_minutes) {
                metaParts.push(`${video.duration_minutes}${t(' 分鐘', ' min')}`);
            }
            const { embedUrl, provider } = pickVideoEmbed(video, lang);
            if (!embedUrl) {
                throw new Error(t('此語言版本尚未提供影片。', 'No video available for this language.'));
            }
            const providerName = providerLabel(provider);
            if (providerName) metaParts.push(providerName);

            const inCourse = global.AppCourse && global.AppCourse.isCourseMode();
            const backRoute = inCourse
                ? global.AppCourse.getBackRoute()
                : '/learning-videos';
            const backLabel = inCourse
                ? t('返回課題', 'Back to topic')
                : t('返回影片列表', 'Back to videos');

            const providerKey = provider || '';
            const iframeAllow = providerKey === 'facebook'
                ? 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
                : 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            const iframeExtra = providerKey === 'instagram' ? ' scrolling="no"' : '';

            const trackMeta = {
                subject_id: video.subject_id,
                topic_id: video.topic_id,
                provider: providerKey || null,
            };
            if (global.AppLearningTracker) {
                global.AppLearningTracker.trackContentOpen('video', slug, trackMeta);
            }

            main.innerHTML = `
                <div class="reading-page" id="video-page">
                    <button type="button" id="video-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${escapeHtml(backLabel)}</button>
                    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                    ${metaParts.length ? `<p class="text-sm text-slate-500 mb-4">${metaParts.map((p) => escapeHtml(p)).join(' · ')}</p>` : ''}
                    <div class="video-embed-wrap relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-sm" style="padding-bottom:56.25%;height:0;">
                        <iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(title)}" class="absolute inset-0 w-full h-full" allow="${iframeAllow}" allowfullscreen loading="lazy"${iframeExtra}></iframe>
                    </div>
                    <p class="text-xs text-slate-400 mt-3">${t('若影片無法播放，可能是平台限制嵌入或影片未設為公開。', 'If playback fails, the host may block embedding or the video may not be public.')}</p>
                </div>`;

            document.getElementById('video-back').onclick = () => navigate(backRoute);
            bindVideoComplete(slug, video.duration_minutes, trackMeta);

            if (inCourse) {
                global.AppCourse.attachItemNav(document.getElementById('video-page'), 'video', slug);
            }
        } catch (err) {
            main.innerHTML = `
                <div class="reading-page">
                    <button type="button" id="video-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回', 'Back')}</button>
                    <p class="text-red-600">${escapeHtml(err.message || t('無法載入影片。', 'Could not load video.'))}</p>
                </div>`;
            document.getElementById('video-back').onclick = () => navigate('/learning-videos');
        }
    }

    global.AppVideo = { renderVideo };
})(window);
