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

function canExportSimHtml() {
    return global.ScienceApi.hasPermission('simulation.manage_any')
        || global.ScienceApi.hasPermission('user.manage');
}

function setShell() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

const STATUS_LABELS = {
    ready: { zh: '已對應', en: 'Linked' },
    same: { zh: '內容相同（待記錄路徑）', en: 'Same content (link pending)' },
    create: { zh: '將新建檔案', en: 'Will create file' },
    differ: { zh: '內容不同', en: 'Content differs' },
    disk_only: { zh: '僅磁碟有檔', en: 'Disk only' },
    empty: { zh: 'HTML 空白', en: 'Empty HTML' },
    ambiguous: { zh: '多於一個檔案', en: 'Ambiguous' },
};

function statusLabel(key) {
    const item = STATUS_LABELS[key] || { zh: key, en: key };
    return t(item.zh, item.en);
}

async function renderAdminSimHtmlExport() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('模擬 HTML 匯出', 'Export simulation HTML');

    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    if (!canExportSimHtml()) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限（需 simulation.manage_any 或 user.manage）。', 'Forbidden (requires simulation.manage_any or user.manage).'))}</p>`;
        return;
    }

    box.innerHTML = `
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
            <a href="${escapeHtml(spaHref('/admin/simulations'))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${escapeHtml(t('模擬列表', 'Simulations'))}</a>
        </div>
        <p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    let plan;
    try {
        plan = await global.ScienceApi.apiFetch('/admin/simulations/export-html');
    } catch (err) {
        box.innerHTML = `
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
            </div>
            <p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        return;
    }

    const counts = plan.counts || {};
    const items = Array.isArray(plan.items) ? plan.items : [];
    const countCards = ['ready', 'same', 'create', 'differ', 'disk_only', 'empty', 'ambiguous'].map((key) => `
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500">${escapeHtml(statusLabel(key))}</div>
            <div class="text-2xl font-bold text-slate-900">${Number(counts[key] || 0)}</div>
        </div>`).join('');

    const rows = items.map((item) => `
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2 font-mono text-xs">${Number(item.id)}</td>
            <td class="px-3 py-2">
                <div>${escapeHtml(item.title || '')}</div>
                <div class="text-xs text-slate-400 font-mono">${escapeHtml(item.slug || '')}</div>
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-sm">${escapeHtml(statusLabel(item.status))}</td>
            <td class="px-3 py-2 font-mono text-xs">
                ${escapeHtml(item.path || '')}
                ${(item.candidates || []).length && item.status === 'ambiguous'
        ? `<div class="mt-1 text-amber-800 text-xs">${escapeHtml((item.candidates || []).join('、'))}</div>` : ''}
            </td>
        </tr>`).join('');

    box.innerHTML = `
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
            <a href="${escapeHtml(spaHref('/admin/simulations'))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${escapeHtml(t('模擬列表', 'Simulations'))}</a>
        </div>
        <p id="sim-export-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('資料庫有紀錄時，以資料庫 HTML 覆蓋原有模擬檔；沒有檔才新建。', 'When a DB row exists, overwrite the on-disk HTML; create a file only when missing.'))}</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">${countCards}</div>
        <div class="flex flex-wrap gap-2 mb-4">
            <button type="button" id="btn-sim-export-apply" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${escapeHtml(t('以資料庫覆蓋原有 HTML', 'Overwrite with database HTML'))}</button>
            <button type="button" id="btn-sim-export-overwrite" class="px-4 py-2 rounded-lg border border-amber-400 text-amber-900 text-sm hover:bg-amber-50">${escapeHtml(t('只覆蓋內容不同的檔', 'Overwrite differing files only'))}</button>
            <button type="button" id="btn-sim-export-adopt" class="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">${escapeHtml(t('採用磁碟版（只記錄路徑）', 'Adopt disk (link only)'))}</button>
        </div>
        ${plan.ready ? `<p class="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm mb-4">${escapeHtml(t('每一列都有對應檔案。', 'Every row has a matching file.'))}</p>` : ''}
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 font-medium">ID</th>
                        <th class="px-3 py-2 font-medium">${escapeHtml(t('標題', 'Title'))}</th>
                        <th class="px-3 py-2 font-medium">${escapeHtml(t('狀態', 'Status'))}</th>
                        <th class="px-3 py-2 font-medium">${escapeHtml(t('路徑', 'Path'))}</th>
                    </tr>
                </thead>
                <tbody>${rows || `<tr><td colspan="4" class="px-3 py-6 text-slate-500">${escapeHtml(t('沒有模擬紀錄。', 'No simulations.'))}</td></tr>`}</tbody>
            </table>
        </div>`;
    const flash = document.getElementById('sim-export-flash');
    async function runExport(mode) {
        if (flash) {
            flash.classList.remove('hidden', 'text-red-600', 'text-emerald-800', 'bg-red-50', 'bg-emerald-50', 'border-red-200', 'border-emerald-200');
            flash.classList.add('text-slate-600', 'border-slate-200', 'bg-slate-50');
            flash.textContent = t('處理中…', 'Working…');
        }
        try {
            const res = await global.ScienceApi.apiFetch('/admin/simulations/export-html', { method: 'POST', body: { mode } });
            await renderAdminSimHtmlExport();
            if (flash) {
                flash.textContent = t(
                    `已寫入 ${res.written} 個檔案，記錄路徑 ${res.linked} 筆，略過 ${res.skipped} 筆。`,
                    `Wrote ${res.written} file(s), linked ${res.linked}, skipped ${res.skipped}.`
                );
            }
        } catch (err) {
            if (flash) {
                flash.classList.remove('text-slate-600', 'bg-slate-50', 'border-slate-200');
                flash.classList.add('text-red-600', 'bg-red-50', 'border-red-200');
                flash.textContent = err.message || t('匯出失敗', 'Export failed');
            }
        }
    }

    const applyBtn = document.getElementById('btn-sim-export-apply');
    const overBtn = document.getElementById('btn-sim-export-overwrite');
    const adoptBtn = document.getElementById('btn-sim-export-adopt');
    if (applyBtn) applyBtn.onclick = () => runExport('apply');
    if (overBtn) overBtn.onclick = () => runExport('overwrite');
    if (adoptBtn) adoptBtn.onclick = () => runExport('adopt');
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminSimHtmlExport,
    canExportSimHtml,
});

export {};