'use strict';
const global = window;

    function t(zh, en) {
        if (global.AppRouter && typeof global.AppRouter.t === 'function') {
            return global.AppRouter.t(zh, en);
        }
        const lang = localStorage.getItem('science_sims_ui_lang') || 'zh';
        return lang === 'zh' ? zh : en;
    }

    function escapeHtml(text) {
        return String(text || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        }[m]));
    }

    function siteName() {
        const names = global.__SITE_NAMES__ || {};
        const lang = global.AppRouter?.getLang?.() || 'zh';
        return (lang === 'zh' ? names.zh : names.en) || names.zh || '伊中中科學學習平台';
    }

    function loginUrl() {
        const base = (global.ScienceApi && ScienceApi.SITE_BASE) || global.__SITE_BASE__ || '';
        return base + '/login.php?next=' + encodeURIComponent('app/');
    }

    function navigate(path) {
        if (global.AppRouter && typeof global.AppRouter.navigate === 'function') {
            global.AppRouter.navigate(path);
            return;
        }
        location.hash = '#' + path;
    }

    function renderGuestHome() {
        const main = document.getElementById('main-content');
        if (!main) return;

        document.body.classList.add('guest-landing');

        const brand = escapeHtml(siteName());
        const login = escapeHtml(loginUrl());

        main.innerHTML = `
            <div class="guest-home guest-home-bleed w-full">
                <section class="guest-hero" aria-label="${escapeHtml(t('歡迎', 'Welcome'))}">
                    <div class="guest-hero-glow" aria-hidden="true"></div>
                    <div class="relative z-10 max-w-2xl mx-auto w-full px-2 sm:px-6">
                        <p class="guest-hero-brand text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                            ${brand}
                        </p>
                        <p class="guest-hero-tagline mt-5 text-base sm:text-lg leading-relaxed max-w-xl">
                            ${t(
                                '中學科學互動學習空間：模擬實驗、自學課程與筆記，隨時探索。',
                                'An interactive science space for secondary learners: simulations, self-study courses and notes.'
                            )}
                        </p>
                        <div class="guest-hero-ctas mt-8 flex flex-wrap gap-3">
                            <a href="${login}" class="guest-cta-primary inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-sm shadow-sm">
                                ${t('登入開始學習', 'Sign in to learn')}
                            </a>
                            <button type="button" data-nav="/simulations" class="guest-cta-secondary inline-flex items-center justify-center px-6 py-3 rounded-lg border font-medium text-sm">
                                ${t('瀏覽模擬程式', 'Browse simulations')}
                            </button>
                        </div>
                    </div>
                </section>
            </div>`;

        main.querySelectorAll('[data-nav]').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                navigate(el.getAttribute('data-nav'));
            });
        });
    }

    window.AppGuestHome = {
        renderGuestHome,
    };

export {};
