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

function spaHref(route) {
    return global.AppRouter && global.AppRouter.spaHref
        ? global.AppRouter.spaHref(route)
        : String(route || '');
}

function canManage() {
    return global.ScienceApi.hasPermission('simulation.manage_any')
        || global.ScienceApi.hasPermission('user.manage');
}

function setShell() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

const SNAPSHOT_URL = 'https://cdn.jsdelivr.net/npm/modern-screenshot@4.5.5/+esm';
let snapshotPromise = null;
/** @type {{text:string,ok:boolean}|null} */
let lastNotice = null;

function loadSnapshot() {
    if (!snapshotPromise) {
        snapshotPromise = import(SNAPSHOT_URL).then((mod) => {
            if (!mod || typeof mod.domToBlob !== 'function') throw new Error('截圖元件載入失敗');
            return mod.domToBlob;
        });
    }
    return snapshotPromise;
}

const CAPTURE_WIDTH = 1280;
const CAPTURE_HEIGHT = 800;

function waitFrames(n) {
    return new Promise((resolve) => {
        const step = (left) => {
            if (left <= 0) {
                resolve();
                return;
            }
            requestAnimationFrame(() => step(left - 1));
        };
        step(n);
    });
}

function expandCanvasesToBitmapSize(doc) {
    const restores = [];
    if (!doc) return restores;
    doc.querySelectorAll('canvas').forEach((canvas) => {
        const bw = canvas.width;
        const bh = canvas.height;
        if (!bw || !bh) return;
        restores.push({
            el: canvas,
            width: canvas.style.width,
            height: canvas.style.height,
            maxWidth: canvas.style.maxWidth,
            maxHeight: canvas.style.maxHeight,
        });
        canvas.style.width = `${bw}px`;
        canvas.style.height = `${bh}px`;
        canvas.style.maxWidth = 'none';
        canvas.style.maxHeight = 'none';
    });
    return restores;
}

function restoreCanvases(restores) {
    restores.forEach((row) => {
        row.el.style.width = row.width;
        row.el.style.height = row.height;
        row.el.style.maxWidth = row.maxWidth;
        row.el.style.maxHeight = row.maxHeight;
    });
}

function htmlUrl(slug) {
    const base = (global.ScienceApi && global.ScienceApi.API_BASE) || '/api/v1';
    return `${base}/simulations/${encodeURIComponent(slug)}/html`;
}

function resolveAssetUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path;
    if (path.startsWith('/')) return path;
    const site = global.ScienceApi.SITE_BASE || '';
    return (site ? site.replace(/\/$/, '') : '') + '/' + path.replace(/^\.\//, '');
}

async function captureSlugToPng(slug) {
    const iframe = document.getElementById('ss-capture-frame');
    if (!iframe) throw new Error('缺少預覽框。');
    iframe.style.width = `${CAPTURE_WIDTH}px`;
    iframe.style.height = `${CAPTURE_HEIGHT}px`;
    iframe.src = 'about:blank';
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('載入逾時')), 20000);
        iframe.onload = () => {
            clearTimeout(timer);
            setTimeout(resolve, 2200);
        };
        iframe.src = htmlUrl(slug);
    });
    const innerDoc = iframe.contentDocument;
    const root = innerDoc && innerDoc.documentElement;
    if (!root) throw new Error('無法讀取模擬頁（可能被沙箱阻擋）。');

    const restores = expandCanvasesToBitmapSize(innerDoc);
    try {
        const win = iframe.contentWindow;
        if (win) {
            win.dispatchEvent(new Event('resize'));
        }
        const needW = Math.max(
            CAPTURE_WIDTH,
            root.scrollWidth || 0,
            innerDoc.body ? innerDoc.body.scrollWidth : 0
        );
        const needH = Math.max(
            CAPTURE_HEIGHT,
            root.scrollHeight || 0,
            innerDoc.body ? innerDoc.body.scrollHeight : 0
        );
        iframe.style.width = `${Math.min(needW, 1920)}px`;
        iframe.style.height = `${Math.min(needH, 1200)}px`;
        if (win) {
            win.dispatchEvent(new Event('resize'));
        }
        await waitFrames(3);
        await new Promise((r) => setTimeout(r, 250));
        const domToBlob = await loadSnapshot();
        const blob = await domToBlob(root, {
            backgroundColor: '#ffffff',
            scale: 1,
            type: 'image/png',
            features: { restoreScrollPosition: true },
        });
        if (!blob) throw new Error('無法產生圖片');
        return blob;
    } finally {
        restoreCanvases(restores);
        iframe.style.width = `${CAPTURE_WIDTH}px`;
        iframe.style.height = `${CAPTURE_HEIGHT}px`;
    }
}

async function uploadPng(simId, blob) {
    const fd = new FormData();
    fd.append('sim_id', String(simId));
    fd.append('file', blob, 'shot.png');
    return global.ScienceApi.apiFetch('/admin/simulations/screenshots', { method: 'POST', body: fd });
}

async function fetchPlan(search, filter) {
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (filter) p.set('filter', filter);
    const q = p.toString() ? `?${p}` : '';
    return global.ScienceApi.apiFetch(`/admin/simulations/screenshots${q}`);
}

async function renderAdminSimScreenshots() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('模擬截圖', 'Simulation screenshots');

    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    if (!canManage()) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
        return;
    }

    const params = new URLSearchParams(global.location.search);
    const searchDefault = params.get('q') || '';
    const filterDefault = params.get('filter') === 'missing' ? 'missing' : 'all';
    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;

    let plan;
    try {
        plan = await fetchPlan(searchDefault, filterDefault);
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        return;
    }

    const items = Array.isArray(plan.items) ? plan.items : [];
    const counts = plan.counts || {};
    const chromeOk = !!plan.chrome_available;

    const rows = items.map((item) => {
        const kindLabel = item.kind === 'ok'
            ? t('已有截圖', 'Has screenshot')
            : (item.kind === 'broken' ? t('檔案遺失', 'File missing') : t('尚未截圖', 'No screenshot'));
        const kindClass = item.kind === 'ok' ? 'text-emerald-700' : (item.kind === 'broken' ? 'text-amber-700' : 'text-slate-600');
        const thumb = item.screenshot_ok
            ? `<img src="${escapeHtml(resolveAssetUrl(item.screenshot_path))}" alt="" class="w-24 h-14 object-cover rounded border border-slate-200">`
            : `<span class="w-24 h-14 inline-flex items-center justify-center bg-slate-100 text-slate-400 text-xs rounded">${escapeHtml(t('無', 'None'))}</span>`;
        return `<tr class="border-t border-slate-100 align-middle">
            <td class="px-3 py-2"><input type="checkbox" class="ss-check rounded border-slate-300" value="${item.id}" data-slug="${escapeHtml(item.slug)}" ${item.kind !== 'ok' ? 'checked' : ''}></td>
            <td class="px-3 py-2">${thumb}</td>
            <td class="px-3 py-2">
                <div class="font-medium">${escapeHtml(item.title_zh || item.slug)}</div>
                <div class="font-mono text-[11px] text-slate-400">${escapeHtml(item.slug)}</div>
            </td>
            <td class="px-3 py-2 text-xs ${kindClass}">${escapeHtml(kindLabel)}</td>
            <td class="px-3 py-2 font-mono text-[11px] text-slate-500">${escapeHtml(item.screenshot_path || item.disk_match || '—')}</td>
        </tr>`;
    }).join('');

    box.innerHTML = `
        <div class="mb-4 flex flex-wrap gap-3 items-center">
            <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
            <a href="${escapeHtml(spaHref('/admin/simulations'))}" data-spa-nav="/admin/simulations" class="text-sm text-slate-500 hover:underline">${escapeHtml(t('模擬程式', 'Simulations'))}</a>
        </div>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('為模擬產生或補上預覽截圖，並寫入 screenshot_path。可先連結科目資料夾已有的 PNG；沒有檔案時用 Chrome 或瀏覽器擷取。', 'Add preview screenshots and save screenshot_path. Link existing PNGs first; otherwise capture with Chrome or this browser.'))}</p>
        <p id="ss-flash" class="${lastNotice ? '' : 'hidden'} rounded-lg border px-4 py-3 text-sm mb-4 ${lastNotice && lastNotice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}">${lastNotice ? escapeHtml(lastNotice.text) : ''}</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-4">
            ${[
                { k: 'total', zh: '全部', en: 'Total' },
                { k: 'ok', zh: '已有截圖', en: 'Has file' },
                { k: 'missing', zh: '尚未截圖', en: 'Missing' },
                { k: 'broken', zh: '路徑失效', en: 'Broken path' },
            ].map((c) => `<div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div class="text-xs text-slate-500">${escapeHtml(t(c.zh, c.en))}</div>
                <div class="text-2xl font-bold text-slate-900">${Number(counts[c.k] || 0)}</div>
            </div>`).join('')}
        </div>
        <p class="text-xs text-slate-500 mb-3">${chromeOk
            ? escapeHtml(t('已偵測到 Chrome，伺服器可直接截圖。', 'Chrome found; server-side capture is available.'))
            : escapeHtml(t('未偵測到 Chrome。將改用本頁 iframe 擷取，或只連結磁碟已有檔案。', 'Chrome not found. This page can capture in an iframe, or only link existing files.'))}</p>
        <form id="ss-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <label class="text-sm text-slate-600" for="ss-q">${escapeHtml(t('搜尋', 'Search'))}</label>
            <input id="ss-q" type="search" value="${escapeHtml(searchDefault)}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[14rem]">
            <select id="ss-filter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="all" ${filterDefault === 'all' ? 'selected' : ''}>${escapeHtml(t('顯示全部', 'Show all'))}</option>
                <option value="missing" ${filterDefault === 'missing' ? 'selected' : ''}>${escapeHtml(t('僅缺截圖', 'Missing only'))}</option>
            </select>
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${escapeHtml(t('套用', 'Apply'))}</button>
        </form>
        <div class="flex flex-wrap gap-2 mb-3 items-center">
            <button type="button" id="btn-ss-missing" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${escapeHtml(t('更新未有截圖的', 'Update missing screenshots'))}</button>
            <button type="button" id="btn-ss-all" class="px-4 py-2 rounded-lg border border-indigo-400 text-indigo-900 text-sm hover:bg-indigo-50">${escapeHtml(t('更新所有模擬截圖', 'Update all screenshots'))}</button>
            <button type="button" id="btn-ss-selected" class="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">${escapeHtml(t('重拍已勾選（含已有截圖）', 'Recapture selected'))}</button>
            <label class="text-sm text-slate-600 flex items-center gap-1"><input type="checkbox" id="ss-check-all" class="rounded border-slate-300"> ${escapeHtml(t('全選', 'Select all'))}</label>
        </div>
        <p id="ss-progress" class="text-sm text-slate-600 mb-2 hidden"></p>
        <div id="ss-capture-wrap" class="h-48 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 mb-3 relative">
            <iframe id="ss-capture-frame" title="${escapeHtml(t('截圖預覽', 'Capture preview'))}" class="absolute top-0 left-0 border-0 bg-white origin-top-left" style="width:${CAPTURE_WIDTH}px;height:${CAPTURE_HEIGHT}px" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
        </div>
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 w-10"></th>
                        <th class="px-3 py-2">${escapeHtml(t('預覽', 'Preview'))}</th>
                        <th class="px-3 py-2">${escapeHtml(t('模擬', 'Simulation'))}</th>
                        <th class="px-3 py-2">${escapeHtml(t('狀態', 'Status'))}</th>
                        <th class="px-3 py-2">${escapeHtml(t('路徑', 'Path'))}</th>
                    </tr>
                </thead>
                <tbody>${rows || `<tr><td colspan="5" class="px-3 py-6 text-slate-500">${escapeHtml(t('沒有符合的模擬。', 'No matching simulations.'))}</td></tr>`}</tbody>
            </table>
        </div>
    `;

    (function scaleCapturePreview() {
        const wrap = document.getElementById('ss-capture-wrap');
        const frame = document.getElementById('ss-capture-frame');
        if (!wrap || !frame) return;
        const box = wrap.getBoundingClientRect();
        const s = Math.min(box.width / CAPTURE_WIDTH, box.height / CAPTURE_HEIGHT, 1);
        frame.style.transform = `scale(${s})`;
    }());

    const flash = document.getElementById('ss-flash');
    const progress = document.getElementById('ss-progress');
    lastNotice = null;
    function showFlash(msg, ok) {
        if (!flash) return;
        flash.textContent = msg;
        flash.className = ok
            ? 'rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm mb-4'
            : 'rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm mb-4';
    }

    document.getElementById('ss-search')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = document.getElementById('ss-q')?.value || '';
        const filter = document.getElementById('ss-filter')?.value || 'all';
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (filter === 'missing') p.set('filter', 'missing');
        const route = '/admin/sim-screenshots' + (p.toString() ? `?${p}` : '');
        history.replaceState(null, '', spaHref(route));
        await renderAdminSimScreenshots();
    });

    document.getElementById('ss-check-all')?.addEventListener('change', (e) => {
        document.querySelectorAll('.ss-check').forEach((el) => { el.checked = e.target.checked; });
    });

    function selectedRows() {
        return Array.from(document.querySelectorAll('.ss-check:checked')).map((el) => ({
            id: Number(el.value),
            slug: el.getAttribute('data-slug') || '',
        })).filter((r) => r.id > 0);
    }

    async function captureOne(row) {
        if (!row || !row.slug) {
            throw new Error(t('缺少 slug。', 'Missing slug.'));
        }
        const blob = await captureSlugToPng(row.slug);
        await uploadPng(row.id, blob);
    }

    async function processQueue(mode, queue) {
        let totalUpdated = 0;
        const totalErr = [];
        let pending = queue.slice();

        if (mode === 'missing' && pending.length) {
            const ids = pending.map((r) => r.id);
            while (ids.length) {
                const batchIds = ids.splice(0, 5);
                const res = await global.ScienceApi.apiFetch('/admin/simulations/screenshots', {
                    method: 'POST',
                    body: {
                        action: 'link',
                        mode: 'missing',
                        ids: batchIds,
                        search: document.getElementById('ss-q')?.value || '',
                    },
                });
                totalUpdated += Number(res.updated || 0);
                totalErr.push(...(res.errors || []));
                const done = new Set(
                    (res.results || [])
                        .filter((r) => r.status === 'linked' || r.status === 'skipped')
                        .map((r) => Number(r.id))
                );
                pending = pending.filter((r) => !done.has(r.id));
            }
        }

        for (let i = 0; i < pending.length; i++) {
            const row = pending[i];
            if (progress) {
                progress.classList.remove('hidden');
                progress.textContent = t(
                    `擷取中 ${i + 1}／${pending.length}：${row.slug}`,
                    `Capturing ${i + 1}/${pending.length}: ${row.slug}`
                );
            }
            try {
                await captureOne(row);
                totalUpdated++;
            } catch (err) {
                totalErr.push('#' + row.id + ' ' + (err.message || t('擷取失敗', 'Capture failed')));
            }
        }
        return { totalUpdated, totalErr };
    }

    async function run(mode, selectedOnly) {
        const rows = selectedOnly
            ? selectedRows()
            : items.filter((it) => mode === 'all' || it.kind !== 'ok').map((it) => ({ id: it.id, slug: it.slug }));
        if (!rows.length) {
            showFlash(t('沒有可更新的項目。請勾選列，或改按「更新所有模擬截圖」。', 'Nothing to update. Select rows, or use Update all.'), false);
            return;
        }
        if (mode === 'all' && !selectedOnly && !window.confirm(t('將覆寫所有模擬截圖，確定？', 'Overwrite all simulation screenshots?'))) {
            return;
        }
        if (progress) {
            progress.classList.remove('hidden');
            progress.textContent = t('處理中…', 'Working…');
        }
        try {
            const result = await processQueue(mode, rows);
            lastNotice = {
                text: t(`已更新 ${result.totalUpdated} 筆。`, `Updated ${result.totalUpdated}.`)
                    + (result.totalErr.length ? ' ' + result.totalErr.slice(0, 4).join('；') : ''),
                ok: result.totalErr.length === 0,
            };
            await renderAdminSimScreenshots();
        } catch (err) {
            showFlash(err.message || t('更新失敗', 'Update failed'), false);
        }
    }

    document.getElementById('btn-ss-missing')?.addEventListener('click', () => run('missing', false));
    document.getElementById('btn-ss-all')?.addEventListener('click', () => run('all', false));
    document.getElementById('btn-ss-selected')?.addEventListener('click', () => run('all', true));
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminSimScreenshots,
});
