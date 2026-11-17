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

function canRecoverSims() {
    return global.ScienceApi.hasPermission('simulation.manage_any')
        || global.ScienceApi.hasPermission('user.manage');
}

function setShell() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

const DB_STATUS = {
    same: { zh: '內容相同（待記錄路徑）', en: 'Same content (link pending)' },
    disk_only: { zh: '僅磁碟有檔', en: 'Disk only' },
    ambiguous: { zh: '多於一個候選', en: 'Ambiguous' },
    empty: { zh: 'HTML 空白', en: 'Empty HTML' },
    create: { zh: '將新建檔案', en: 'Will create file' },
    differ: { zh: '內容不同', en: 'Content differs' },
};

function dbStatusLabel(key) {
    const row = DB_STATUS[key] || { zh: key, en: key };
    return t(row.zh, row.en);
}

/** @type {Record<string, object>} */
const overrideStore = {};

function subjectOptions(subjects, selectedId) {
    const blank = `<option value="">${escapeHtml(t('（依資料夾推測）', '(from folder)'))}</option>`;
    const opts = (subjects || []).map((s) => {
        const sel = Number(selectedId) === Number(s.id) ? ' selected' : '';
        return `<option value="${Number(s.id)}"${sel}>${escapeHtml(s.name_zh || s.slug)}</option>`;
    }).join('');
    return blank + opts;
}

async function fetchPlan(search) {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    return global.ScienceApi.apiFetch(`/admin/simulations/recovery${q}`);
}

async function renderAdminSimRecovery() {
    setShell();
    const title = document.getElementById('page-title');
    const box = document.getElementById('card-container');
    if (title) title.textContent = t('失散模擬找回', 'Recover lost simulations');

    if (!global.ScienceApi.getUser()) {
        global.AppRouter.navigate('/login');
        return;
    }
    if (!canRecoverSims()) {
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
    const diskItems = Array.isArray(plan.disk_items) ? plan.disk_items : [];
    const dbItems = Array.isArray(plan.db_items) ? plan.db_items : [];
    const missingItems = Array.isArray(plan.missing_items) ? plan.missing_items : [];
    const subjects = plan.subjects || [];
    const canPublish = global.ScienceApi.hasPermission('simulation.manage_any');
    const models = Array.isArray(plan.models) ? plan.models : [];
    const defaultModel = plan.default_model || (models[0] || '');

    const summaryCards = [
        { key: 'disk_unregistered', zh: '磁碟未登錄', en: 'Unregistered on disk' },
        { key: 'db_issues', zh: '資料庫待修', en: 'DB needs fix' },
        { key: 'missing_files', zh: '路徑失效', en: 'Broken path' },
        { key: 'catalog_ready', zh: '已對應', en: 'Linked OK' },
    ].map((card) => `
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500">${escapeHtml(t(card.zh, card.en))}</div>
            <div class="text-2xl font-bold text-slate-900">${Number(counts[card.key] || 0)}</div>
        </div>`).join('');

    const diskRows = diskItems.map((item) => {
        const path = item.path || '';
        const ov = overrideStore[path] || {};
        const subjectId = ov.subject_id != null ? ov.subject_id : (item.subject_id || '');
        const titleZh = ov.title_zh != null ? ov.title_zh : (item.title_zh || '');
        return `
        <tr class="border-t border-slate-100 align-top" data-disk-path="${escapeHtml(path)}">
            <td class="px-3 py-2"><input type="checkbox" class="disk-row-check rounded border-slate-300" value="${escapeHtml(path)}" checked></td>
            <td class="px-3 py-2 font-mono text-xs">${escapeHtml(path)}</td>
            <td class="px-3 py-2 font-mono text-xs">${escapeHtml(item.proposed_slug || '')}</td>
            <td class="px-3 py-2"><input type="text" class="disk-title-zh w-full border border-slate-300 rounded px-2 py-1 text-sm" value="${escapeHtml(titleZh)}"></td>
            <td class="px-3 py-2">
                <select class="disk-subject w-full border border-slate-300 rounded px-2 py-1 text-sm">${subjectOptions(subjects, subjectId)}</select>
            </td>
            <td class="px-3 py-2 text-xs whitespace-nowrap">${item.kind === 'slug_exists'
        ? escapeHtml(t('補連結', 'Link')) + (item.existing_sim_id ? ` #${Number(item.existing_sim_id)}` : '')
        : escapeHtml(t('新建', 'Create'))}</td>
        </tr>`;
    }).join('');

    const dbRows = dbItems.map((item) => {
        const path = item.path || '';
        const candidates = Array.isArray(item.candidates) ? item.candidates : [];
        const candSelect = item.status === 'ambiguous' && candidates.length
            ? `<select class="db-path-pick mt-1 w-full border border-amber-300 rounded px-2 py-1 text-xs" data-sim-id="${Number(item.id)}">
                ${candidates.map((c) => `<option value="${escapeHtml(c)}"${c === path ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
               </select>`
            : `<span class="font-mono text-xs">${escapeHtml(path)}</span>`;
        return `
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2"><input type="checkbox" class="db-row-check rounded border-slate-300" data-sim-id="${Number(item.id)}" data-path="${escapeHtml(path)}" ${item.linkable ? 'checked' : ''} ${item.linkable ? '' : 'disabled'}></td>
            <td class="px-3 py-2 font-mono text-xs">${Number(item.id)}</td>
            <td class="px-3 py-2">
                <div>${escapeHtml(item.title || '')}</div>
                <div class="text-xs text-slate-400 font-mono">${escapeHtml(item.slug || '')}</div>
            </td>
            <td class="px-3 py-2 text-sm whitespace-nowrap">${escapeHtml(dbStatusLabel(item.status))}</td>
            <td class="px-3 py-2">${candSelect}</td>
        </tr>`;
    }).join('');

    const missingRows = missingItems.map((item) => `
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2 font-mono text-xs">${Number(item.id)}</td>
            <td class="px-3 py-2">${escapeHtml(item.title || '')}</td>
            <td class="px-3 py-2 font-mono text-xs text-red-700">${escapeHtml(item.html_path || '')}</td>
            <td class="px-3 py-2"><a href="${escapeHtml(spaHref(`/admin/simulations/${Number(item.id)}/edit`))}" data-spa-nav="/admin/simulations/${Number(item.id)}/edit" class="text-brand-700 hover:underline text-sm">${escapeHtml(t('編輯', 'Edit'))}</a></td>
        </tr>`).join('');

    box.innerHTML = `
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
            <a href="${escapeHtml(spaHref('/admin/simulations'))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${escapeHtml(t('模擬列表', 'Simulations'))}</a>
            <a href="${escapeHtml(spaHref('/admin/import-disk-simulations'))}" data-spa-nav="/admin/import-disk-simulations" class="text-slate-500 hover:underline">${escapeHtml(t('僅磁碟匯入', 'Disk import only'))}</a>
            <a href="${escapeHtml(spaHref('/admin/export-sim-html'))}" data-spa-nav="/admin/export-sim-html" class="text-slate-500 hover:underline">${escapeHtml(t('HTML 匯出對照', 'HTML export'))}</a>
        </div>
        <p id="sim-recovery-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
        <p class="text-sm text-slate-600 mb-4">${escapeHtml(t('掃描倉庫內模擬 HTML，找出未登錄檔案、資料庫未連結列，以及 html_path 指向不存在檔案的紀錄。可選用 xAI 建議科目與標題後寫入資料庫。', 'Scan repo HTML for unregistered files, broken DB links, and missing paths. Optionally use xAI to suggest subject and titles before import.'))}</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">${summaryCards}</div>
        ${!plan.ai_configured ? `<p class="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm mb-4">${escapeHtml(t('未設定 XAI_API_KEY 時，AI 分類按鈕會停用；仍可依資料夾手動匯入。', 'Without XAI_API_KEY, AI classify is disabled; folder-based import still works.'))}</p>` : ''}
        <form id="recovery-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <input type="search" name="q" value="${escapeHtml(searchDefault)}" placeholder="${escapeHtml(t('路徑、slug、標題…', 'Path, slug, title…'))}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[16rem]">
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${escapeHtml(t('搜尋', 'Search'))}</button>
        </form>

        <section class="mb-8">
            <h2 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(t('磁碟未登錄', 'Unregistered on disk'))}</h2>
            <div class="flex flex-wrap gap-2 mb-3 items-center">
                <label class="text-sm text-slate-600" for="recovery-status">${escapeHtml(t('寫入狀態', 'Status'))}</label>
                <select id="recovery-status" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="draft">${escapeHtml(t('草稿', 'Draft'))}</option>
                    <option value="pending_review">${escapeHtml(t('待審', 'Pending review'))}</option>
                    ${canPublish ? `<option value="published">${escapeHtml(t('已發布', 'Published'))}</option>` : ''}
                </select>
                ${plan.ai_configured ? `
                <select id="recovery-model" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    ${models.map((m) => `<option value="${escapeHtml(m)}"${m === defaultModel ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}
                </select>
                <button type="button" id="btn-recovery-classify" class="px-4 py-2 rounded-lg border border-violet-400 text-violet-900 text-sm hover:bg-violet-50">${escapeHtml(t('AI 分類已勾選', 'AI classify selected'))}</button>` : ''}
                <button type="button" id="btn-recovery-import" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${escapeHtml(t('匯入已勾選', 'Import selected'))}</button>
            </div>
            <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-left text-slate-500">
                        <tr>
                            <th class="px-3 py-2 w-10"><input type="checkbox" id="disk-check-all" class="rounded border-slate-300" checked></th>
                            <th class="px-3 py-2">${escapeHtml(t('路徑', 'Path'))}</th>
                            <th class="px-3 py-2">slug</th>
                            <th class="px-3 py-2">${escapeHtml(t('標題', 'Title'))}</th>
                            <th class="px-3 py-2">${escapeHtml(t('科目', 'Subject'))}</th>
                            <th class="px-3 py-2">${escapeHtml(t('類型', 'Type'))}</th>
                        </tr>
                    </thead>
                    <tbody>${diskRows || `<tr><td colspan="6" class="px-3 py-6 text-slate-500">${escapeHtml(t('沒有未登錄檔案。', 'No unregistered files.'))}</td></tr>`}</tbody>
                </table>
            </div>
        </section>

        <section class="mb-8">
            <h2 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(t('資料庫待連結', 'DB rows to link'))}</h2>
            <div class="flex flex-wrap gap-2 mb-3">
                <button type="button" id="btn-recovery-link" class="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800">${escapeHtml(t('連結已勾選路徑', 'Link selected paths'))}</button>
            </div>
            <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-left text-slate-500">
                        <tr>
                            <th class="px-3 py-2 w-10"></th>
                            <th class="px-3 py-2">ID</th>
                            <th class="px-3 py-2">${escapeHtml(t('標題', 'Title'))}</th>
                            <th class="px-3 py-2">${escapeHtml(t('狀態', 'Status'))}</th>
                            <th class="px-3 py-2">${escapeHtml(t('路徑', 'Path'))}</th>
                        </tr>
                    </thead>
                    <tbody>${dbRows || `<tr><td colspan="5" class="px-3 py-6 text-slate-500">${escapeHtml(t('沒有待修列。', 'Nothing to fix.'))}</td></tr>`}</tbody>
                </table>
            </div>
        </section>

        <section>
            <h2 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(t('html_path 檔案遺失', 'Missing html_path file'))}</h2>
            <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-left text-slate-500">
                        <tr>
                            <th class="px-3 py-2">ID</th>
                            <th class="px-3 py-2">${escapeHtml(t('標題', 'Title'))}</th>
                            <th class="px-3 py-2">${escapeHtml(t('記錄路徑', 'Stored path'))}</th>
                            <th class="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>${missingRows || `<tr><td colspan="4" class="px-3 py-6 text-slate-500">${escapeHtml(t('沒有失效路徑。', 'No broken paths.'))}</td></tr>`}</tbody>
                </table>
            </div>
        </section>`;

    const flash = document.getElementById('sim-recovery-flash');
    const searchForm = document.getElementById('recovery-search');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = (searchForm.querySelector('[name="q"]') || {}).value || '';
            const route = q ? `/admin/recover-simulations?q=${encodeURIComponent(q)}` : '/admin/recover-simulations';
            global.AppRouter.navigate(route, true);
        });
    }

    const diskCheckAll = document.getElementById('disk-check-all');
    const diskChecks = () => Array.from(document.querySelectorAll('.disk-row-check'));
    if (diskCheckAll) {
        diskCheckAll.addEventListener('change', () => {
            diskChecks().forEach((el) => { el.checked = diskCheckAll.checked; });
        });
    }

    function collectOverridesFromDom() {
        const overrides = {};
        document.querySelectorAll('[data-disk-path]').forEach((row) => {
            const path = row.getAttribute('data-disk-path') || '';
            if (!path) return;
            const titleEl = row.querySelector('.disk-title-zh');
            const subjEl = row.querySelector('.disk-subject');
            const patch = {};
            if (titleEl && titleEl.value.trim()) patch.title_zh = titleEl.value.trim();
            if (subjEl && subjEl.value) patch.subject_id = Number(subjEl.value);
            if (Object.keys(patch).length) overrides[path] = patch;
        });
        Object.assign(overrideStore, overrides);
        return { ...overrideStore, ...overrides };
    }

    function showFlash(kind, message) {
        if (!flash) return;
        flash.className = 'rounded-lg border px-4 py-3 text-sm mb-4';
        if (kind === 'error') {
            flash.classList.add('border-red-200', 'bg-red-50', 'text-red-800');
        } else if (kind === 'ok') {
            flash.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-900');
        } else {
            flash.classList.add('border-slate-200', 'bg-slate-50', 'text-slate-600');
        }
        flash.textContent = message;
        flash.classList.remove('hidden');
    }

    async function runImport() {
        const paths = diskChecks().filter((el) => el.checked).map((el) => el.value);
        if (!paths.length) {
            showFlash('error', t('請勾選至少一個磁碟檔案。', 'Select at least one file.'));
            return;
        }
        const statusEl = document.getElementById('recovery-status');
        const search = (searchForm && searchForm.querySelector('[name="q"]')) ? searchForm.querySelector('[name="q"]').value : '';
        showFlash('info', t('匯入中…', 'Importing…'));
        try {
            const res = await global.ScienceApi.apiFetch('/admin/simulations/recovery', {
                method: 'POST',
                body: {
                    action: 'import',
                    paths,
                    status: statusEl ? statusEl.value : 'draft',
                    search,
                    overrides: collectOverridesFromDom(),
                },
            });
            showFlash('ok', t(
                `新增 ${res.created} 筆、連結 ${res.linked} 筆、略過 ${res.skipped} 筆。`,
                `Created ${res.created}, linked ${res.linked}, skipped ${res.skipped}.`
            ));
            await renderAdminSimRecovery();
        } catch (err) {
            showFlash('error', err.message || t('匯入失敗', 'Import failed'));
        }
    }

    async function runClassify() {
        const paths = diskChecks().filter((el) => el.checked).map((el) => el.value);
        if (!paths.length) {
            showFlash('error', t('請勾選要分類的檔案。', 'Select files to classify.'));
            return;
        }
        const modelEl = document.getElementById('recovery-model');
        showFlash('info', t('AI 分類中…', 'Classifying…'));
        try {
            const res = await global.ScienceApi.apiFetch('/admin/simulations/recovery', {
                method: 'POST',
                body: { action: 'classify', paths, model: modelEl ? modelEl.value : '' },
            });
            (res.items || []).forEach((item) => {
                const path = item.path;
                if (!path) return;
                overrideStore[path] = Object.assign(overrideStore[path] || {}, {
                    subject_id: item.subject_id != null ? item.subject_id : null,
                    title_zh: item.title_zh || '',
                    title_en: item.title_en || '',
                    summary_zh: item.summary_zh || '',
                });
            });
            showFlash('ok', t('已套用 AI 建議到表格（請檢查後再匯入）。', 'Applied AI suggestions to the table (review before import).'));
            await renderAdminSimRecovery();
        } catch (err) {
            showFlash('error', err.message || t('分類失敗', 'Classify failed'));
        }
    }

    async function runLink() {
        const links = [];
        document.querySelectorAll('.db-row-check:checked').forEach((el) => {
            const simId = Number(el.getAttribute('data-sim-id'));
            let path = el.getAttribute('data-path') || '';
            const pick = document.querySelector(`.db-path-pick[data-sim-id="${simId}"]`);
            if (pick && pick.value) path = pick.value;
            if (simId > 0 && path) links.push({ sim_id: simId, path });
        });
        if (!links.length) {
            showFlash('error', t('請勾選可連結的資料庫列。', 'Select linkable DB rows.'));
            return;
        }
        const search = (searchForm && searchForm.querySelector('[name="q"]')) ? searchForm.querySelector('[name="q"]').value : '';
        showFlash('info', t('連結中…', 'Linking…'));
        try {
            const res = await global.ScienceApi.apiFetch('/admin/simulations/recovery', {
                method: 'POST',
                body: { action: 'link', links, search },
            });
            showFlash('ok', t(
                `已連結 ${res.linked} 筆，略過 ${res.skipped} 筆。`,
                `Linked ${res.linked}, skipped ${res.skipped}.`
            ));
            await renderAdminSimRecovery();
        } catch (err) {
            showFlash('error', err.message || t('連結失敗', 'Link failed'));
        }
    }

    document.getElementById('btn-recovery-import')?.addEventListener('click', runImport);
    document.getElementById('btn-recovery-classify')?.addEventListener('click', runClassify);
    document.getElementById('btn-recovery-link')?.addEventListener('click', runLink);

    document.querySelectorAll('.db-path-pick').forEach((sel) => {
        sel.addEventListener('change', () => {
            const simId = sel.getAttribute('data-sim-id');
            const check = document.querySelector(`.db-row-check[data-sim-id="${simId}"]`);
            if (check) check.setAttribute('data-path', sel.value);
        });
    });
}

global.AppAdmin = Object.assign(global.AppAdmin || {}, {
    renderAdminSimRecovery,
    canRecoverSims,
});

export {};