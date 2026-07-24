'use strict';
const global = window;

    function t(zh, en) {
        return global.AppRouter && global.AppRouter.t ? global.AppRouter.t(zh, en) : zh;
    }

    function escapeHtml(s) {
        return global.AppRouter && global.AppRouter.escapeHtml
            ? global.AppRouter.escapeHtml(s)
            : String(s || '');
    }

    async function renderLogin() {
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
        if (title) title.textContent = t('登入', 'Sign in');

        const user = global.ScienceApi && global.ScienceApi.getUser ? global.ScienceApi.getUser() : null;
        if (user) {
            global.AppRouter.navigate('/', true);
            return;
        }

        box.innerHTML = `
            <form id="spa-login-form" class="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <p class="text-sm text-slate-600">${escapeHtml(t('使用 QSIS 帳戶名與密碼登入。', 'Sign in with your QSIS username and password.'))}</p>
                <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('帳戶名', 'Username'))}
                    <input name="email" type="text" autocomplete="username" required
                        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                </label>
                <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('密碼', 'Password'))}
                    <input name="password" type="password" autocomplete="current-password" required
                        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                </label>
                <p id="spa-login-error" class="hidden text-sm text-red-600" role="alert"></p>
                <button type="submit" class="w-full rounded-lg bg-indigo-700 text-white py-2.5 text-sm font-semibold hover:bg-indigo-800">
                    ${escapeHtml(t('登入', 'Sign in'))}
                </button>
            </form>`;

        const form = document.getElementById('spa-login-form');
        const errEl = document.getElementById('spa-login-error');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errEl.classList.add('hidden');
            const fd = new FormData(form);
            try {
                await global.ScienceApi.login(String(fd.get('email') || ''), String(fd.get('password') || ''));
                if (global.AppAuth && global.AppAuth.updateAuthNav) {
                    await global.AppAuth.updateAuthNav();
                }
                global.AppRouter.navigate('/');
            } catch (err) {
                errEl.textContent = err.message || t('登入失敗', 'Sign-in failed');
                errEl.classList.remove('hidden');
            }
        });
    }

    global.AppLogin = { renderLogin };

export {};
