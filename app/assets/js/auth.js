(function (global) {
    'use strict';

    const { loadSession, getUser } = global.ScienceApi;
    const { t } = global.AppRouter;

    async function updateAuthNav() {
        if (global.AppUserMenu) {
            global.AppUserMenu.updateAuthNav('auth-nav');
            return;
        }

        const user = getUser();
        const el = document.getElementById('auth-nav');
        if (!el) return;

        if (user) {
            el.innerHTML = `<span class="hidden sm:inline text-indigo-200 text-xs">${escapeHtml(user.display_name || user.email)}</span>`;
        } else {
            el.innerHTML = `<a href="../login.php?next=${encodeURIComponent('app/')}" class="user-menu-login">${t('登入', 'Login')}</a>`;
        }
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
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
        updateAuthNav();
    }

    global.AppAuth = { initAuth, updateAuthNav };
})(window);
