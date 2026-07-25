'use strict';
const global = window;

    const { loadSession, getUser } = global.ScienceApi;
    const { t } = global.AppRouter;

    let resolveAuthReady;
    const authReadyPromise = new Promise((resolve) => {
        resolveAuthReady = resolve;
    });
    let authStarted = false;

    function userLang() {
        return localStorage.getItem('science_sims_ui_lang') || (global.AppRouter?.getLang?.() || 'zh');
    }

    function userName(user) {
        const zh = (user.name_zh || '').trim();
        const en = (user.name_en || '').trim();
        const legacy = (user.display_name || '').trim();
        const pick = userLang();
        if (pick === 'en') {
            return en || zh || legacy || user.email || '?';
        }
        return zh || en || legacy || user.email || '?';
    }

    function updateAuthNav() {
        if (global.AppUserMenu) {
            global.AppUserMenu.updateAuthNav('auth-nav');
        } else {
            const user = getUser();
            const el = document.getElementById('auth-nav');
            if (!el) return;

            if (user) {
                el.innerHTML = `<span class="hidden sm:inline text-indigo-200 text-xs">${escapeHtml(userName(user))}</span>`;
            } else {
                el.innerHTML = `<a href="../login.php?next=${encodeURIComponent('app/')}" class="user-menu-login">${t('登入', 'Login')}</a>`;
            }
        }
        // Nav visibility is refreshed from boot() — never block first paint on /nav-menu.
        if (global.AppNav && typeof global.AppNav.refresh === 'function') {
            void global.AppNav.refresh().catch(() => {});
        }
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
    }

    function whenReady() {
        return authReadyPromise;
    }

    async function initAuth() {
        if (authStarted) {
            return authReadyPromise;
        }
        authStarted = true;
        if (global.AppUserMenu) {
            global.AppUserMenu.init();
        }
        try {
            await loadSession();
        } catch (e) {
            console.warn('Session load failed', e);
        }
        updateAuthNav();
        resolveAuthReady();
        return authReadyPromise;
    }

    global.AppAuth = { initAuth, updateAuthNav, whenReady };

export {};
