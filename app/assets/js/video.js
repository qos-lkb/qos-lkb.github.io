(function (global) {
    'use strict';

    const { apiFetch } = global.ScienceApi;
    const { t, escapeHtml, getLang, navigate } = global.AppRouter;

    async function renderVideo(slug) {
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

            const backRoute = global.AppCourse && global.AppCourse.isCourseMode()
                ? global.AppCourse.getBackRoute()
                : '/courses';

            main.innerHTML = `
                <div class="reading-page" id="video-page">
                    <button type="button" id="video-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回', 'Back')}</button>
                    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${escapeHtml(title)}</h1>
                    ${metaParts.length ? `<p class="text-sm text-slate-500 mb-4">${metaParts.map((p) => escapeHtml(p)).join(' · ')}</p>` : ''}
                    <div class="video-embed-wrap relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-sm" style="padding-bottom:56.25%;height:0;">
                        <iframe src="${escapeHtml(video.embed_url)}" title="${escapeHtml(title)}" class="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
                    </div>
                </div>`;

            document.getElementById('video-back').onclick = () => navigate(backRoute);

            if (global.AppCourse && global.AppCourse.isCourseMode()) {
                global.AppCourse.attachItemNav(document.getElementById('video-page'), 'video', slug);
            }
        } catch (err) {
            main.innerHTML = `
                <div class="reading-page">
                    <button type="button" id="video-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${t('返回', 'Back')}</button>
                    <p class="text-red-600">${escapeHtml(err.message || t('無法載入影片。', 'Could not load video.'))}</p>
                </div>`;
            document.getElementById('video-back').onclick = () => navigate('/courses');
        }
    }

    global.AppVideo = { renderVideo };
})(window);
