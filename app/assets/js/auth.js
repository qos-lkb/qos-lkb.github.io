(function (global) {
    'use strict';

    const { loadSession, getUser, hasPermission } = global.ScienceApi;
    const { t } = global.AppRouter;

    function updateAuthNav() {
        const user = getUser();
        const el = document.getElementById('auth-nav');
        if (!el) return;

        if (user) {
            let links = `<span class="hidden sm:inline text-indigo-200 text-xs">${escapeHtml(user.display_name || user.email)}</span>`;
            links += `<a href="../portal/simulations.php" class="hidden sm:inline px-2 py-1 text-xs text-indigo-200 hover:text-white">${t('我的模擬', 'My sims')}</a>`;
            if (hasPermission('simulation.manage_any') || hasPermission('user.manage')) {
                links += `<a href="../admin/index.php" class="hidden sm:inline px-2 py-1 text-xs text-amber-200 hover:text-white">${t('管理', 'Admin')}</a>`;
            }
            links += `<button type="button" id="btn-logout" class="hidden sm:inline px-2 py-1 text-xs text-indigo-200 hover:text-white">${t('登出', 'Logout')}</button>`;
            el.innerHTML = links;
            document.getElementById('btn-logout')?.addEventListener('click', async () => {
                await global.ScienceApi.logout();
                updateAuthNav();
            });
        } else {
            el.innerHTML = `<a href="../login.php?next=${encodeURIComponent('app/')}" class="hidden sm:inline px-2 py-1 text-xs text-indigo-200 hover:text-white">${t('登入', 'Login')}</a>`;
        }
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    async function initAuth() {
        try {
            await loadSession();
        } catch (e) {
            console.warn('Session load failed', e);
        }
        updateAuthNav();
    }

    global.AppAuth = { initAuth, updateAuthNav };
})(window);
