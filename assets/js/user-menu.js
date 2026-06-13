(function (global) {
    'use strict';

    const LANG_KEY = 'science_sims_ui_lang';
    let csrfToken = '';
    let menuOpen = false;
    let modalOpen = false;
    let activeSettingsTab = 'profile';

    function t(zh, en) {
        if (global.AppRouter && typeof global.AppRouter.t === 'function') {
            return global.AppRouter.t(zh, en);
        }
        const lang = localStorage.getItem(LANG_KEY) || 'zh';
        return lang === 'zh' ? zh : en;
    }

    function escapeHtml(text) {
        return String(text || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
        }[m]));
    }

    function siteBase() {
        if (global.ScienceApi && global.ScienceApi.SITE_BASE !== undefined) {
            return global.ScienceApi.SITE_BASE;
        }
        const path = location.pathname || '/';
        const adminIdx = path.indexOf('/admin');
        if (adminIdx >= 0) return path.slice(0, adminIdx);
        const appIdx = path.indexOf('/app');
        if (appIdx >= 0) return path.slice(0, appIdx);
        return '';
    }

    function apiBase() {
        if (global.ScienceApi && global.ScienceApi.API_BASE) {
            return global.ScienceApi.API_BASE;
        }
        return siteBase() + '/api/v1';
    }

    async function apiFetch(path, options = {}) {
        if (global.ScienceApi && typeof global.ScienceApi.apiFetch === 'function') {
            return global.ScienceApi.apiFetch(path, options);
        }
        const url = apiBase() + path;
        const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
        if (options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        if (csrfToken && options.method && options.method !== 'GET') {
            headers['X-CSRF-Token'] = csrfToken;
        }
        const res = await fetch(url, Object.assign({ credentials: 'same-origin' }, options, { headers }));
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error?.message || 'Request failed');
        }
        return json.data !== undefined ? json.data : json;
    }

    async function ensureSession() {
        if (global.ScienceApi && global.ScienceApi.getUser()) {
            csrfToken = global.ScienceApi.getCsrf() || '';
            return global.ScienceApi.getUser();
        }
        try {
            const me = await apiFetch('/auth/me');
            csrfToken = me.csrf_token || '';
            return me;
        } catch (e) {
            return null;
        }
    }

    function userInitial(user) {
        const name = (user.display_name || user.email || '?').trim();
        return escapeHtml(name.charAt(0).toUpperCase());
    }

    function closeMenu() {
        menuOpen = false;
        const root = document.querySelector('.user-menu');
        const btn = root?.querySelector('.user-menu-trigger');
        const panel = root?.querySelector('.user-menu-dropdown');
        if (panel) panel.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
        menuOpen = !menuOpen;
        const root = document.querySelector('.user-menu');
        const btn = root?.querySelector('.user-menu-trigger');
        const panel = root?.querySelector('.user-menu-dropdown');
        if (!panel || !btn) return;
        panel.hidden = !menuOpen;
        btn.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
    }

    function settingsModalHtml(user) {
        const lang = localStorage.getItem(LANG_KEY) || (global.AppRouter?.getLang?.() || 'zh');
        return `
        <div id="account-settings-modal" class="account-modal" aria-hidden="false">
            <div class="account-modal-backdrop" data-close="1"></div>
            <div class="account-modal-panel" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
                <div class="account-modal-header">
                    <h2 id="account-modal-title" class="account-modal-title">${t('帳號設定', 'Account settings')}</h2>
                    <button type="button" class="account-modal-close" data-close="1" aria-label="${t('關閉', 'Close')}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="account-modal-body">
                    <nav class="account-modal-tabs" role="tablist">
                        <button type="button" class="account-tab ${activeSettingsTab === 'profile' ? 'active' : ''}" data-tab="profile">${t('個人資料', 'Profile')}</button>
                        <button type="button" class="account-tab ${activeSettingsTab === 'password' ? 'active' : ''}" data-tab="password">${t('更改密碼', 'Password')}</button>
                        <button type="button" class="account-tab ${activeSettingsTab === 'prefs' ? 'active' : ''}" data-tab="prefs">${t('偏好設定', 'Preferences')}</button>
                    </nav>
                    <p id="account-modal-flash" class="account-modal-flash hidden"></p>
                    <div class="account-tab-panel ${activeSettingsTab === 'profile' ? '' : 'hidden'}" data-panel="profile">
                        <form id="account-profile-form" class="account-form space-y-3">
                            <div>
                                <label class="account-label">${t('電郵', 'Email')}</label>
                                <input type="email" class="account-input bg-slate-100" value="${escapeHtml(user.email)}" readonly disabled>
                            </div>
                            <div>
                                <label class="account-label" for="account-display-name">${t('顯示名稱', 'Display name')}</label>
                                <input id="account-display-name" name="display_name" type="text" class="account-input" required maxlength="120" value="${escapeHtml(user.display_name || '')}">
                            </div>
                            <button type="submit" class="account-btn-primary">${t('儲存個人資料', 'Save profile')}</button>
                        </form>
                    </div>
                    <div class="account-tab-panel ${activeSettingsTab === 'password' ? '' : 'hidden'}" data-panel="password">
                        <form id="account-password-form" class="account-form space-y-3">
                            <div>
                                <label class="account-label" for="account-current-pw">${t('目前密碼', 'Current password')}</label>
                                <input id="account-current-pw" type="password" class="account-input" required autocomplete="current-password">
                            </div>
                            <div>
                                <label class="account-label" for="account-new-pw">${t('新密碼', 'New password')}</label>
                                <input id="account-new-pw" type="password" class="account-input" required minlength="8" autocomplete="new-password">
                                <p class="account-hint">${t('至少 8 字元', 'At least 8 characters')}</p>
                            </div>
                            <div>
                                <label class="account-label" for="account-confirm-pw">${t('確認新密碼', 'Confirm new password')}</label>
                                <input id="account-confirm-pw" type="password" class="account-input" required minlength="8" autocomplete="new-password">
                            </div>
                            <button type="submit" class="account-btn-primary">${t('更新密碼', 'Update password')}</button>
                        </form>
                    </div>
                    <div class="account-tab-panel ${activeSettingsTab === 'prefs' ? '' : 'hidden'}" data-panel="prefs">
                        <form id="account-prefs-form" class="account-form space-y-3">
                            <div>
                                <label class="account-label" for="account-ui-lang">${t('介面語言', 'Interface language')}</label>
                                <select id="account-ui-lang" class="account-input">
                                    <option value="zh" ${lang === 'zh' ? 'selected' : ''}>中文</option>
                                    <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
                                </select>
                            </div>
                            <button type="submit" class="account-btn-primary">${t('儲存偏好', 'Save preferences')}</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function showFlash(msg, isError) {
        const el = document.getElementById('account-modal-flash');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden', 'account-flash-ok', 'account-flash-err');
        el.classList.add(isError ? 'account-flash-err' : 'account-flash-ok');
    }

    function closeSettingsModal() {
        modalOpen = false;
        document.getElementById('account-settings-modal')?.remove();
        document.body.classList.remove('account-modal-open');
    }

    function bindSettingsModal(user) {
        const modal = document.getElementById('account-settings-modal');
        if (!modal) return;

        modal.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', closeSettingsModal);
        });

        modal.querySelectorAll('.account-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                activeSettingsTab = btn.dataset.tab || 'profile';
                modal.querySelectorAll('.account-tab').forEach(b => b.classList.toggle('active', b === btn));
                modal.querySelectorAll('.account-tab-panel').forEach(p => {
                    p.classList.toggle('hidden', p.dataset.panel !== activeSettingsTab);
                });
            });
        });

        modal.querySelector('#account-profile-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayName = modal.querySelector('#account-display-name')?.value?.trim() || '';
            try {
                const me = await apiFetch('/auth/profile', { method: 'POST', body: { display_name: displayName } });
                csrfToken = me.csrf_token || csrfToken;
                if (global.ScienceApi && typeof global.ScienceApi.loadSession === 'function') {
                    await global.ScienceApi.loadSession();
                }
                showFlash(t('已更新個人資料。', 'Profile updated.'), false);
                if (global.AppAuth) global.AppAuth.updateAuthNav();
            } catch (err) {
                showFlash(err.message, true);
            }
        });

        modal.querySelector('#account-password-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const current = modal.querySelector('#account-current-pw')?.value || '';
            const newer = modal.querySelector('#account-new-pw')?.value || '';
            const confirm = modal.querySelector('#account-confirm-pw')?.value || '';
            if (newer !== confirm) {
                showFlash(t('兩次輸入的新密碼不一致。', 'New passwords do not match.'), true);
                return;
            }
            try {
                await apiFetch('/auth/change-password', {
                    method: 'POST',
                    body: { current_password: current, new_password: newer },
                });
                e.target.reset();
                showFlash(t('密碼已更新。', 'Password updated.'), false);
            } catch (err) {
                showFlash(err.message, true);
            }
        });

        modal.querySelector('#account-prefs-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const lang = modal.querySelector('#account-ui-lang')?.value || 'zh';
            localStorage.setItem(LANG_KEY, lang);
            if (global.AppRouter) {
                global.AppRouter.setLang(lang);
                document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
            }
            showFlash(t('偏好已儲存。', 'Preferences saved.'), false);
        });
    }

    function openSettings(tab) {
        closeMenu();
        activeSettingsTab = tab || 'profile';
        ensureSession().then(user => {
            if (!user) return;
            closeSettingsModal();
            document.body.insertAdjacentHTML('beforeend', settingsModalHtml(user));
            document.body.classList.add('account-modal-open');
            modalOpen = true;
            bindSettingsModal(user);
        });
    }

    function renderMenu(user, container) {
        const base = siteBase();
        const name = escapeHtml(user.display_name || user.email);
        const email = escapeHtml(user.email);
        const perms = user.permissions || [];
        const canAdmin = perms.includes('simulation.manage_any') || perms.includes('user.manage');
        const canPortal = perms.includes('simulation.manage_own') || canAdmin;

        container.innerHTML = `
        <div class="user-menu">
            <button type="button" class="user-menu-trigger" aria-haspopup="true" aria-expanded="false" aria-label="${t('帳號選單', 'Account menu')}">
                <span class="user-menu-avatar" aria-hidden="true">${userInitial(user)}</span>
                <span class="user-menu-name hidden sm:inline max-w-[7rem] truncate">${name}</span>
                <svg class="user-menu-chevron w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div class="user-menu-dropdown" hidden role="menu">
                <div class="user-menu-dropdown-head">
                    <div class="user-menu-dropdown-name">${name}</div>
                    <div class="user-menu-dropdown-email">${email}</div>
                </div>
                <button type="button" class="user-menu-item" data-action="settings-profile" role="menuitem">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    ${t('個人資料', 'Profile')}
                </button>
                <button type="button" class="user-menu-item" data-action="settings-password" role="menuitem">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    ${t('更改密碼', 'Change password')}
                </button>
                <button type="button" class="user-menu-item" data-action="settings-prefs" role="menuitem">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    ${t('偏好設定', 'Preferences')}
                </button>
                <div class="user-menu-divider"></div>
                ${canPortal ? `<a href="${base}/portal/simulations.php" class="user-menu-item" role="menuitem">${t('我的模擬', 'My simulations')}</a>` : ''}
                ${canAdmin ? `<a href="${base}/admin/index.php" class="user-menu-item" role="menuitem">${t('管理後台', 'Admin')}</a>` : ''}
                ${(canPortal || canAdmin) ? '<div class="user-menu-divider"></div>' : ''}
                <a href="${base}/app/" class="user-menu-item sm:hidden" role="menuitem">${t('前台首頁', 'Home')}</a>
                <button type="button" class="user-menu-item user-menu-item-danger" data-action="logout" role="menuitem">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    ${t('登出', 'Log out')}
                </button>
            </div>
        </div>`;

        const root = container.querySelector('.user-menu');
        root.querySelector('.user-menu-trigger')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        root.querySelector('[data-action="settings-profile"]')?.addEventListener('click', () => openSettings('profile'));
        root.querySelector('[data-action="settings-password"]')?.addEventListener('click', () => openSettings('password'));
        root.querySelector('[data-action="settings-prefs"]')?.addEventListener('click', () => openSettings('prefs'));

        root.querySelector('[data-action="logout"]')?.addEventListener('click', async () => {
            closeMenu();
            try {
                if (global.ScienceApi && typeof global.ScienceApi.logout === 'function') {
                    await global.ScienceApi.logout();
                } else {
                    await apiFetch('/auth/logout', { method: 'POST', body: { csrf: csrfToken } });
                }
                location.href = base + '/login.php';
            } catch (e) {
                location.href = base + '/logout.php';
            }
        });
    }

    function renderGuest(container) {
        const base = siteBase();
        container.innerHTML = `<a href="${base}/login.php?next=${encodeURIComponent(location.pathname + location.search)}" class="user-menu-login">${t('登入', 'Login')}</a>`;
    }

    function updateAuthNav(containerId) {
        const container = document.getElementById(containerId || 'auth-nav');
        if (!container) return;

        const user = global.ScienceApi?.getUser?.();
        if (user) {
            csrfToken = global.ScienceApi.getCsrf() || csrfToken;
            renderMenu(user, container);
            return;
        }

        ensureSession().then(me => {
            if (me) renderMenu(me, container);
            else renderGuest(container);
        });
    }

    function init() {
        document.addEventListener('click', () => {
            if (menuOpen) closeMenu();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (modalOpen) closeSettingsModal();
                if (menuOpen) closeMenu();
            }
        });
        const savedLang = localStorage.getItem(LANG_KEY);
        if (savedLang && (savedLang === 'zh' || savedLang === 'en') && global.AppRouter) {
            global.AppRouter.setLang(savedLang);
        }
    }

    global.AppUserMenu = {
        init,
        updateAuthNav,
        openSettings,
        LANG_KEY,
    };
})(window);
