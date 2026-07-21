(function (global) {
    'use strict';

    const { loadSession, getUser } = global.ScienceApi;
    const { t } = global.AppRouter;

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

    async function updateAuthNav() {
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
        if (global.AppNav && typeof global.AppNav.refresh === 'function') {
            try {
                await global.AppNav.refresh();
            } catch (e) {
                /* ignore */
            }
        }
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
    }

    async function initAuth() {
        if (global.AppUserMenu) {
            global.AppUserMenu.init();
        }
        try {
            await loadSession();
        } catch (e) {
            console.warn('Session load failed', e);
        }
        await updateAuthNav();
    }

    global.AppAuth = { initAuth, updateAuthNav };
})(window);
