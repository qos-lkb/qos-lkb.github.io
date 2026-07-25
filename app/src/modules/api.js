'use strict';
const global = window;

    const meta = document.querySelector('meta[name="api-base"]');

    function detectSiteBase() {
        if (typeof window.__SITE_BASE__ === 'string') {
            return window.__SITE_BASE__;
        }
        const path = location.pathname || '/';
        const idx = path.indexOf('/app');
        if (idx >= 0) {
            return path.slice(0, idx);
        }
        return '';
    }

    const SITE_BASE = detectSiteBase();
    const API_BASE = (meta && meta.content && !meta.content.startsWith('.'))
        ? meta.content.replace(/\/$/, '')
        : (SITE_BASE + '/api/v1');

    let csrfToken = '';
    let currentUser = null;

    async function apiFetch(path, options = {}) {
        const url = path.startsWith('http') ? path : API_BASE + path;
        const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
        const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
        if (options.body && typeof options.body === 'object' && !isForm) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        if (csrfToken && options.method && options.method !== 'GET') {
            headers['X-CSRF-Token'] = csrfToken;
        }
        const res = await fetch(url, Object.assign({ credentials: 'same-origin' }, options, { headers }));
        if (options.rawResponse) {
            if (!res.ok) {
                const text = await res.text();
                let msg = 'Request failed';
                try {
                    const json = JSON.parse(text);
                    msg = (json.error && json.error.message) || msg;
                } catch (e) {
                    msg = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240) || msg;
                }
                throw new Error(msg);
            }
            return res;
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            if (!res.ok) throw new Error('Request failed: ' + res.status);
            return res;
        }
        const json = await res.json();
        if (!res.ok) {
            const msg = json.error && json.error.message ? json.error.message : 'Request failed';
            const err = new Error(msg);
            err.code = json.error && json.error.code;
            err.status = res.status;
            throw err;
        }
        return json.data !== undefined ? json.data : json;
    }

    async function loadSession() {
        try {
            const me = await apiFetch('/auth/me');
            currentUser = me;
            csrfToken = me.csrf_token || '';
            return me;
        } catch (e) {
            if (e.status === 401) {
                currentUser = null;
                csrfToken = '';
                return null;
            }
            throw e;
        }
    }

    async function login(email, password) {
        const me = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
        currentUser = me;
        csrfToken = me.csrf_token || '';
        return me;
    }

    async function logout() {
        await apiFetch('/auth/logout', { method: 'POST', body: { csrf: csrfToken } });
        currentUser = null;
        csrfToken = '';
    }

    function hasPermission(name) {
        return currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes(name);
    }

    global.ScienceApi = {
        SITE_BASE,
        API_BASE,
        apiFetch,
        loadSession,
        login,
        logout,
        getUser: () => currentUser,
        getCsrf: () => csrfToken,
        hasPermission,
    };

export {};
