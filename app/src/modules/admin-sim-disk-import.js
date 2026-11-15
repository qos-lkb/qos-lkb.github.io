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

function canImportDiskSimulations() {
    return global.ScienceApi.hasPermission('simulation.manage_any')
        || global.ScienceApi.hasPermission('user.manage');
}

function setShell() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

async function fetchPlan(search) {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    return global.ScienceApi.apiFetch(`/admin/simulations/import-disk${q}`);
}

async function renderAdminSimDiskImport() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('磁碟模擬匯入', 'Import simulations from disk');

    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    if (!canImportDiskSimulations()) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
        return;
    }

    const searchDefault = new URLSearchParams(global.location.search).get('q') || '';
    box.innerHTML = `<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
    let plan;
    try {
        plan = await fetchPlan(searchDefault);
    } catch (err) {
        box.innerHTML = `<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
        return;
    }

    const counts = plan.counts || {};
    const items = Array.isArray(plan.items) ? plan.items : [];
    const canPublish = global.ScienceApi.hasPermission('simulation.manage_any');
    const countCards = ['unregistered', 'slug_exists', 'total'].map((key) => {
        const labels = {
            unregistered: t('將新建', 'New rows'),
            slug_exists: t('只補路徑', 'Link path only'),
            total: t('符合搜尋', 'Matching search'),
        };
        return `
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500">${escapeHtml(labels[key] || key)}</div>
            <div class="text-2xl font-bold text-slate-900">${Number(counts[key] || 0)}</div>
        </div>`;
    }).join('');

    const rows = items.map((item) => `
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2"><input type="checkbox" class="disk-import-path rounded border-slate-300" value="${escapeHtml(item.path || '')}" checked></td>
            <td class="px-3 py-2 font-mono text-xs">${escapeHtml(item.path || '')}</td>
            <td class="px-3 py-2 font-mono text-xs">${escapeHtml(item.proposed_slug || '')}</td>
            <td class="px-3 py-2 text-sm">${escapeHtml(item.title_zh || '')}</td>
            <td class="px-3 py-2 text-xs whitespace-nowrap">${item.kind === 'slug_exists'
        ? escapeHtml(t('補連結', 'Link'))
        : escapeHtml(t('新建', 'Create'))}${item.existing_sim_id ? ` #${Number(item.existing_sim_id)}` : ''}</td>
        </tr>`).join('');

    box.innerHTML = `
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
            <a href="${escapeHtml(spaHref('/admin/simulations'))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${escapeHtml(t('模擬列表', 'Simulations'))}</a>
            <a href="../admin/import_disk_simulations.php" class="text-slate-500 hover:underline">${escapeHtml(t('傳統 PHP 頁', 'Legacy PHP page'))}</a>
        </div>
        <p id="disk-import-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('列出尚未登錄 simulations 的 HTML；可批次新增或為已有 slug 補上 html_path。', 'Lists on-disk HTML not yet registered; batch-create or link html_path for existing slugs.'))}</p>
        <div class="grid sm:grid-cols-3 gap-3 mb-4">${countCards}</div>
        <form id="disk-import-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <input type="search" name="q" value="${escapeHtml(searchDefault)}" placeholder="${escapeHtml(t('路徑、slug、標題…', 'Path, slug, title…'))}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[16rem]">
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${escapeHtml(t('搜尋', 'Search'))}</button>
        </form>
        <div class="flex flex-wrap gap-2 mb-3 items-center">
            <label class="text-sm text-slate-600" for="disk-import-status">${escapeHtml(t('狀態', 'Status'))}</label>
            <select id="disk-import-status" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>
                <option value="pending_review">${escapeHtml(t('待審', 'Pending review'))}</option>
                ${canPublish ? `<option value="published">${escapeHtml(t('已發布', 'Published'))}</option>` : ''}
            </select>
            <button type="button" id="btn-disk-import-selected" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${escapeHtml(t('匯入已勾選', 'Import selected'))}</button>
            <button type="button" id="btn-disk-import-all" class="px-4 py-2 rounded-lg border border-indigo-400 text-indigo-900 text-sm hover:bg-indigo-50">${escapeHtml(t('匯入目前列表全部', 'Import all in list'))}</button>
        </div>
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl mb-2">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 w-10"><input type="checkbox" id="disk-import-check-all" class="rounded border-slate-300" checked></th>
                        <th class="px-3 py-2 font-medium">${escapeHtml(t('路徑', 'Path'))}</th>
                        <th class="px-3 py-2 font-medium">slug</th>
                        <th class="px-3 py-2 font-medium">${escapeHtml(t('標題', 'Title'))}</th>
                        <th class="px-3 py-2 font-medium">${escapeHtml(t('類型', 'Type'))}</th>
                    </tr>
                </thead>
                <tbody>${rows || `<tr><td colspan="5" class="px-3 py-6 text-slate-500">${escapeHtml(t('沒有未登錄的檔案。', 'No unregistered files.'))}</td></tr>`}</tbody>
            </table>
        </div>`;

    const searchForm = document.getElementById('disk-import-search');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = (searchForm.querySelector('[name="q"]') || {}).value || '';
            const route = q ? `/admin/import-disk-simulations?q=${encodeURIComponent(q)}` : '/admin/import-disk-simulations';
            global.AppRouter.navigate(route, true);
        });
    }

    const checkAll = document.getElementById('disk-import-check-all');
    const pathBoxes = () => Array.from(document.querySelectorAll('.disk-import-path'));
    if (checkAll) {
        checkAll.addEventListener('change', () => {
            pathBoxes().forEach((el) => { el.checked = checkAll.checked; });
        });
    }

    const flash = document.getElementById('disk-import-flash');
    async function runImport(importAll) {
        const paths = importAll
            ? items.map((i) => i.path).filter(Boolean)
            : pathBoxes().filter((el) => el.checked).map((el) => el.value);
        if (!paths.length) {
            if (flash) {
                flash.className = 'rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm mb-4';
                flash.textContent = t('請勾選至少一個檔案。', 'Select at least one file.');
                flash.classList.remove('hidden');
            }
            return;
        }
        if (importAll && !global.confirm(t('確定匯入目前列表中的全部項目？', 'Import every item in the current list?'))) {
            return;
        }
        const statusEl = document.getElementById('disk-import-status');
        const status = statusEl ? statusEl.value : 'draft';
        const search = (searchForm && searchForm.querySelector('[name="q"]')) ? searchForm.querySelector('[name="q"]').value : '';
        if (flash) {
            flash.className = 'rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-4 py-3 text-sm mb-4';
            flash.textContent = t('處理中…', 'Working…');
            flash.classList.remove('hidden');
        }
        try {
            const res = await global.ScienceApi.apiFetch('/admin/simulations/import-disk', {
                method: 'POST',
                body: { paths: importAll ? undefined : paths, import_all: importAll, status, search },
            });
            const msg = t(
                `新增 ${res.created} 筆、連結 ${res.linked} 筆、略過 ${res.skipped} 筆。`,
                `Created ${res.created}, linked ${res.linked}, skipped ${res.skipped}.`
            );
            if (flash) {
                flash.className = 'rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm mb-4';
                flash.textContent = msg;
            }
            await renderAdminSimDiskImport();
        } catch (err) {
            if (flash) {
                flash.className = 'rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm mb-4';
                flash.textContent = err.message || t('匯入失敗', 'Import failed');
            }
        }
    }

    const selBtn = document.getElementById('btn-disk-import-selected');
    const allBtn = document.getElementById('btn-disk-import-all');
    if (selBtn) selBtn.onclick = () => runImport(false);
    if (allBtn) allBtn.onclick = () => runImport(true);
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminSimDiskImport,
    canImportDiskSimulations,
});

export {};