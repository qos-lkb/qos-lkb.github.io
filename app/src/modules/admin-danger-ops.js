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

    function codespaceUrl() {
        const base = (global.ScienceApi && typeof global.ScienceApi.SITE_BASE === 'string')
            ? global.ScienceApi.SITE_BASE
            : (typeof global.__SITE_BASE__ === 'string' ? global.__SITE_BASE__ : '');
        return base + '/codespace/index.html';
    }

    function setShell() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    function requireUserManage() {
        if (!global.ScienceApi.getUser()) {
            global.AppRouter.navigate('/login');
            return false;
        }
        if (!global.ScienceApi.hasPermission('user.manage')) {
            return false;
        }
        return true;
    }

    function bindSpaNav(root) {
        root.querySelectorAll('[data-spa-nav]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                global.AppRouter.navigate(a.getAttribute('data-spa-nav'));
            });
        });
    }

    function showMsg(el, msg, isError) {
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden', 'text-emerald-700', 'text-red-600', 'bg-emerald-50', 'bg-red-50', 'border-emerald-200', 'border-red-200');
        el.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
        if (el.classList.contains('border')) {
            el.classList.add(isError ? 'bg-red-50' : 'bg-emerald-50', isError ? 'border-red-200' : 'border-emerald-200');
        }
    }

    function teacherLabel(row) {
        const name = row.display_name || row.name_zh || row.name_en || '';
        const email = row.email || '';
        return email ? `${name} (${email})` : name || ('#' + row.id);
    }

    function yearLabel(year) {
        let label = year.yearText || ((year.yearFrom || '') + '-' + (year.yearEnd || ''));
        if (year.thisYear) label += t('（本學年）', ' (current)');
        return `${label} [${year.yearId}]`;
    }

    function klaLabel(kla) {
        const zh = (kla.kla_name_zh || '').trim();
        const en = (kla.kla_name_en || '').trim();
        const code = (kla.kla_code || '').trim();
        let label = zh || en || code || ('#' + kla.kla_id);
        if (code && label !== code) label += ' [' + code + ']';
        return label;
    }

    function opsNav() {
        return `
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${escapeHtml(spaHref('/admin'))}" data-spa-nav="/admin" class="text-indigo-700 hover:underline">${escapeHtml(t('← 管理首頁', '← Admin home'))}</a>
                <a href="${escapeHtml(codespaceUrl())}" target="_blank" rel="noopener" class="text-slate-600 hover:underline">Code Space ↗</a>
                <a href="${escapeHtml(spaHref('/admin/db-export'))}" data-spa-nav="/admin/db-export" class="text-slate-600 hover:underline">${escapeHtml(t('匯出', 'Export'))}</a>
                <a href="${escapeHtml(spaHref('/admin/db-import'))}" data-spa-nav="/admin/db-import" class="text-slate-600 hover:underline">${escapeHtml(t('匯入', 'Import'))}</a>
                <a href="${escapeHtml(spaHref('/admin/qsis-import'))}" data-spa-nav="/admin/qsis-import" class="text-slate-600 hover:underline">QSIS</a>
                <a href="${escapeHtml(spaHref('/admin/data-dictionary'))}" data-spa-nav="/admin/data-dictionary" class="text-slate-600 hover:underline">${escapeHtml(t('資料字典', 'Dictionary'))}</a>
            </div>`;
    }

    async function downloadExportBlob(res) {
        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition') || '';
        const m = /filename="([^"]+)"/.exec(cd);
        const filename = m ? m[1] : ('database_' + Date.now() + '.sql');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return filename;
    }

    async function renderAdminDbExport() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('匯出資料庫', 'Export database');

        if (!requireUserManage()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `
            ${opsNav()}
            <p id="db-export-flash" class="text-sm mb-4 hidden"></p>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">
                ${escapeHtml(t('下載目前 .env 所連線之整個 MySQL 資料庫結構與資料（僅一般資料表，不含 VIEW）。檔案可能含敏感資料，請妥善保管。', 'Download a full SQL dump of the database configured in .env (base tables only, no views). Treat the file as sensitive.'))}
            </p>
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <button type="button" id="db-export-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    ${escapeHtml(t('一鍵下載 SQL 備份', 'Download SQL backup'))}
                </button>
            </div>`;
        bindSpaNav(box);

        const btn = document.getElementById('db-export-btn');
        const flash = document.getElementById('db-export-flash');
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            showMsg(flash, t('正在匯出，請稍候…', 'Exporting…'), false);
            flash.classList.remove('hidden');
            try {
                const res = await global.ScienceApi.apiFetch('/admin/db/export', {
                    method: 'POST',
                    body: {},
                    rawResponse: true,
                });
                const filename = await downloadExportBlob(res);
                showMsg(flash, t('已開始下載 ', 'Download started: ') + filename, false);
            } catch (err) {
                showMsg(flash, err.message || t('匯出失敗', 'Export failed'), true);
            } finally {
                btn.disabled = false;
            }
        });
    }

    async function renderAdminDbImport() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('匯入資料庫', 'Import database');

        if (!requireUserManage()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `${opsNav()}<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        bindSpaNav(box);

        let status;
        try {
            status = await global.ScienceApi.apiFetch('/admin/db/import-status');
        } catch (err) {
            box.innerHTML = `${opsNav()}<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
            bindSpaNav(box);
            return;
        }

        const wipeAllowed = !!status.wipe_allowed;
        const phrase = status.confirm_phrase || 'DELETE ALL TABLES';
        const appEnv = status.app_env || '';
        const schema = status.schema_name || '';

        box.innerHTML = `
            ${opsNav()}
            <p class="text-sm text-slate-600 leading-relaxed mb-3">
                ${escapeHtml(t('將上載的 SQL 匯入目前 .env 資料庫', 'Import uploaded SQL into the .env database'))}
                ${schema ? ` <strong>${escapeHtml(schema)}</strong>` : ''}。
                ${escapeHtml(t('匯入前會先刪除該庫內所有現有資料表，無法復原。建議先匯出備份。', 'All existing tables are dropped first. This cannot be undone. Export a backup first.'))}
            </p>
            <p class="text-sm rounded-lg px-4 py-3 border mb-4 ${wipeAllowed ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-800'}">
                ${escapeHtml(t('目前', 'Current'))} <code class="font-mono text-xs">APP_ENV=${escapeHtml(appEnv)}</code>。
                ${wipeAllowed
                    ? escapeHtml(t('此環境允許清空匯入；仍須勾選確認並輸入片語 ', 'Wipe import allowed; still require checkbox and phrase ')) + `<code class="font-mono text-xs">${escapeHtml(phrase)}</code>。`
                    : escapeHtml(t('生產環境預設拒絕清空匯入。緊急還原請於 .env 設 APP_ALLOW_DB_WIPE=1（用畢請移除）。', 'Production blocks wipe import by default. Set APP_ALLOW_DB_WIPE=1 in .env for emergency restore, then remove it.'))}
            </p>
            <p id="db-import-flash" class="text-sm rounded-lg px-4 py-3 border hidden mb-4"></p>
            <form id="db-import-form" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 ${wipeAllowed ? '' : 'opacity-60 pointer-events-none'}">
                <div>
                    <label for="sql_file" class="block text-sm font-medium text-slate-700 mb-1">${escapeHtml(t('SQL 檔案', 'SQL file'))}</label>
                    <input type="file" id="sql_file" name="sql_file" accept=".sql,text/plain" required
                        class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm">
                </div>
                <label class="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" id="confirm_wipe" name="confirm_wipe" value="1" class="mt-1">
                    <span>${escapeHtml(t('我了解此操作會刪除現有全部資料表並以 SQL 取代。', 'I understand this deletes all existing tables and replaces them with the SQL file.'))}</span>
                </label>
                <div>
                    <label for="confirm_phrase" class="block text-sm font-medium text-slate-700 mb-1">
                        ${escapeHtml(t('請輸入確認片語', 'Type confirmation phrase'))}
                        <code class="font-mono text-xs ml-1">${escapeHtml(phrase)}</code>
                    </label>
                    <input type="text" id="confirm_phrase" name="confirm_phrase" autocomplete="off"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" ${wipeAllowed ? '' : 'disabled'}>
                </div>
                <button type="submit" class="bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-800" ${wipeAllowed ? '' : 'disabled'}>
                    ${escapeHtml(t('清空並匯入', 'Wipe and import'))}
                </button>
            </form>`;
        bindSpaNav(box);

        const form = document.getElementById('db-import-form');
        const flash = document.getElementById('db-import-flash');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!wipeAllowed) return;
            const fileInput = document.getElementById('sql_file');
            const confirmWipe = document.getElementById('confirm_wipe').checked;
            const confirmPhrase = String(document.getElementById('confirm_phrase').value || '').trim();
            if (!fileInput.files || !fileInput.files[0]) {
                showMsg(flash, t('請選擇 SQL 檔案。', 'Choose an SQL file.'), true);
                flash.classList.remove('hidden');
                return;
            }
            const fd = new FormData();
            fd.append('sql_file', fileInput.files[0]);
            if (confirmWipe) fd.append('confirm_wipe', '1');
            fd.append('confirm_phrase', confirmPhrase);
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            showMsg(flash, t('正在匯入，請稍候…', 'Importing…'), false);
            flash.classList.remove('hidden');
            try {
                const data = await global.ScienceApi.apiFetch('/admin/db/import', { method: 'POST', body: fd });
                const tables = data.tables != null ? data.tables : '?';
                const dropped = data.dropped != null ? data.dropped : '?';
                showMsg(flash, t(`匯入完成：刪除 ${dropped} 張表，現有 ${tables} 張表。`, `Import done: dropped ${dropped}, now ${tables} tables.`), false);
            } catch (err) {
                showMsg(flash, err.message || t('匯入失敗', 'Import failed'), true);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    async function renderAdminDataDictionary() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('資料字典', 'Data dictionary');

        if (!requireUserManage()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        box.innerHTML = `${opsNav()}<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        bindSpaNav(box);

        let data;
        try {
            data = await global.ScienceApi.apiFetch('/admin/data-dictionary');
        } catch (err) {
            box.innerHTML = `${opsNav()}<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
            bindSpaNav(box);
            return;
        }

        const exists = !!data.exists;
        let bodyHtml = '';
        if (exists && global.AppMarkdown && global.AppMarkdown.renderMarkdownToHtml) {
            bodyHtml = global.AppMarkdown.renderMarkdownToHtml(data.markdown || '');
        } else if (exists) {
            bodyHtml = `<pre class="whitespace-pre-wrap text-xs">${escapeHtml(data.markdown || '')}</pre>`;
        }

        box.innerHTML = `
            ${opsNav()}
            <p id="dd-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="text-sm text-slate-600 space-y-1">
                    <p><strong class="text-slate-800">${escapeHtml(t('來源', 'Source'))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">schema.sql</code>
                        <span class="text-slate-400">（${escapeHtml(data.schema_mtime || '—')}）</span></p>
                    <p><strong class="text-slate-800">${escapeHtml(t('文件', 'File'))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">data_dictionary.md</code>
                        ${exists
                            ? `· ${Number(data.size || 0).toLocaleString()} bytes · ${escapeHtml(data.mtime || '')}`
                            : `· <span class="text-amber-700">${escapeHtml(t('尚未產生', 'Not generated'))}</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="dd-regenerate-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                        ${escapeHtml(t('重新產生', 'Regenerate'))}
                    </button>
                </div>
            </div>
            ${exists
                ? `<article id="dd-body" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 overflow-x-auto prose prose-slate max-w-none">${bodyHtml}</article>`
                : `<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-sm">${escapeHtml(t('尚未找到 data_dictionary.md。請按「重新產生」。', 'data_dictionary.md missing. Click Regenerate.'))}</div>`}`;
        bindSpaNav(box);

        document.getElementById('dd-regenerate-btn').addEventListener('click', async () => {
            const btn = document.getElementById('dd-regenerate-btn');
            const flash = document.getElementById('dd-flash');
            btn.disabled = true;
            showMsg(flash, t('產生中…', 'Generating…'), false);
            flash.classList.remove('hidden');
            try {
                const result = await global.ScienceApi.apiFetch('/admin/data-dictionary/regenerate', {
                    method: 'POST',
                    body: {},
                });
                showMsg(flash, t(`已更新（${result.table_count || 0} 張資料表）。重新載入中…`, `Updated (${result.table_count || 0} tables). Reloading…`), false);
                await renderAdminDataDictionary();
            } catch (err) {
                showMsg(flash, err.message || t('產生失敗', 'Regenerate failed'), true);
                btn.disabled = false;
            }
        });
    }

    async function renderAdminQsisImport() {
        setShell();
        const title = document.getElementById('page-title');
        const box = document.getElementById('card-container');
        if (title) title.textContent = t('QSIS 匯入', 'QSIS import');

        if (!requireUserManage()) {
            if (global.ScienceApi.getUser()) {
                box.innerHTML = `<p class="text-red-600">${escapeHtml(t('沒有權限。', 'Forbidden.'))}</p>`;
            }
            return;
        }

        const me = global.ScienceApi.getUser();
        box.innerHTML = `${opsNav()}<p class="text-slate-500">${escapeHtml(t('載入中…', 'Loading…'))}</p>`;
        bindSpaNav(box);

        let status;
        try {
            status = await global.ScienceApi.apiFetch('/admin/qsis/status');
        } catch (err) {
            box.innerHTML = `${opsNav()}<p class="text-red-600">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
            bindSpaNav(box);
            return;
        }

        const conn = status.connection || {};
        const connected = !!(status.configured && conn.ok);
        const years = status.years || [];
        const klas = status.klas || [];
        const teachers = status.teachers || [];
        const currentYear = String(status.current_year_id || (years[0] && years[0].yearId) || '');
        const suggestedYear = String(status.suggested_year_id || currentYear);
        const localSchoolYear = String(status.local_school_year || '');

        const yearOpts = years.map((y) =>
            `<option value="${escapeHtml(y.yearId)}" ${String(y.yearId) === suggestedYear ? 'selected' : ''}>${escapeHtml(yearLabel(y))}</option>`
        ).join('');
        const klaOpts = [`<option value="0">${escapeHtml(t('全部 KLA', 'All KLAs'))}</option>`]
            .concat(klas.map((k) => `<option value="${Number(k.kla_id)}">${escapeHtml(klaLabel(k))}</option>`))
            .join('');
        const teacherOpts = teachers.map((row) =>
            `<option value="${Number(row.id)}" ${me && Number(row.id) === Number(me.id) ? 'selected' : ''}>${escapeHtml(teacherLabel(row))}</option>`
        ).join('');

        box.innerHTML = `
            ${opsNav()}
            <p id="qsis-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <h2 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(t('QSIS 資料庫連線', 'QSIS connection'))}</h2>
                ${!status.configured
                    ? `<p class="text-sm text-amber-700">${escapeHtml(t('請在 .env 設定 QSIS_DB_* 變數（見 .env.example）。', 'Configure QSIS_DB_* in .env (see .env.example).'))}</p>`
                    : connected
                        ? `<p class="text-sm text-emerald-700">${escapeHtml(t('已連線至 QSIS 資料庫', 'Connected to QSIS database'))} <strong>${escapeHtml(conn.database || '')}</strong>。</p>`
                        : `<p class="text-sm text-red-600">${escapeHtml(t('連線失敗：', 'Connection failed: ') + (conn.error || ''))}</p>`}
                <p class="text-xs text-slate-500 mt-2">${escapeHtml(t('此連線為唯讀用途。', 'Read-only connection.'))}</p>
            </div>
            ${connected ? `
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6 space-y-4" id="qsis-panel">
                <div class="grid sm:grid-cols-2 gap-4">
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('QSIS 學年', 'QSIS year'))}
                        <select id="qsis-year" class="mt-1 w-full border rounded-lg px-3 py-2">${yearOpts}</select>
                    </label>
                    <p id="qsis-year-hint" class="sm:col-span-2 text-sm"></p>
                    <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('學習領域（KLA）', 'KLA'))}
                        <select id="qsis-kla" class="mt-1 w-full border rounded-lg px-3 py-2">${klaOpts}</select>
                    </label>
                </div>
                <label class="block text-sm font-medium text-slate-700">${escapeHtml(t('預設任教老師', 'Default teacher'))}
                    <select id="qsis-teacher" class="mt-1 w-full border rounded-lg px-3 py-2">${teacherOpts}</select>
                </label>
                <div class="pt-4 border-t border-slate-100">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 class="text-lg font-bold text-slate-800">${escapeHtml(t('QSIS 課程', 'QSIS courses'))}</h2>
                        <label class="text-sm text-slate-600"><input type="checkbox" id="qsis-select-all" class="mr-1" checked> ${escapeHtml(t('全選', 'Select all'))}</label>
                    </div>
                    <div id="qsis-courses" class="max-h-72 overflow-y-auto border border-slate-100 rounded-lg mb-4">
                        <p class="p-3 text-slate-500 text-sm">${escapeHtml(t('載入課程…', 'Loading courses…'))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3 items-center mb-4">
                        <button type="button" data-mode="all" class="qsis-import-btn bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">${escapeHtml(t('一鍵匯入課程＋學生', 'Import courses + students'))}</button>
                        <button type="button" data-mode="courses" class="qsis-import-btn bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800">${escapeHtml(t('只匯入課程', 'Courses only'))}</button>
                        <button type="button" data-mode="students" class="qsis-import-btn bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">${escapeHtml(t('只匯入學生', 'Students only'))}</button>
                    </div>
                    <div class="space-y-2 text-sm text-slate-600">
                        <label class="flex items-center gap-2"><input type="checkbox" id="qsis-enroll" checked> ${escapeHtml(t('匯入學生時自動加入對應本地課程', 'Auto-enroll students into matching local courses'))}</label>
                        <label class="flex items-center gap-2"><input type="checkbox" id="qsis-update"> ${escapeHtml(t('更新已存在學生的姓名、年級與學號（班別）', 'Update existing student names, form level and class'))}</label>
                    </div>
                </div>
            </div>` : ''}
            <div class="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
                <h3 class="font-semibold text-slate-800 mb-2">${escapeHtml(t('說明', 'Notes'))}</h3>
                <ul class="list-disc pl-5 space-y-1">
                    <li>${escapeHtml(t('匯入後可至課程管理檢視邀請碼與名單。', 'After import, review invite codes and rosters under Courses.'))}</li>
                    <li>${escapeHtml(t('QSIS 課程已不含任教老師欄位，匯入時一律使用上方所選的預設任教老師。', 'QSIS courses no longer include teacher fields; import uses the default teacher selected above.'))}</li>
                    <li>${escapeHtml(t('已存在同名同學年課程或同學號學生會略過，不會覆寫密碼。未勾選「更新已存在學生」時，亦不會覆寫年級／班別。', 'Existing same-year courses or student IDs are skipped; passwords are never overwritten. Form level and class are not overwritten unless “update existing students” is checked.'))}</li>
                </ul>
            </div>`;
        bindSpaNav(box);

        if (!connected) return;

        const flash = document.getElementById('qsis-flash');
        const coursesBox = document.getElementById('qsis-courses');

        function updateYearHint() {
            const hint = document.getElementById('qsis-year-hint');
            if (!hint) return;
            const yearId = document.getElementById('qsis-year').value;
            if (suggestedYear && yearId !== suggestedYear) {
                hint.className = 'sm:col-span-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2';
                hint.textContent = t(
                    `所選學年與本地課程（${localSchoolYear || suggestedYear}）不同。QSIS 若已升班，匯入可能把學生改成新學年班別。暑期功課請選 ${suggestedYear}。`,
                    `Selected year differs from local courses (${localSchoolYear || suggestedYear}). If QSIS has already promoted students, import may overwrite class/form. For summer homework use ${suggestedYear}.`
                );
            } else {
                hint.className = 'sm:col-span-2 text-xs text-slate-500';
                hint.textContent = localSchoolYear
                    ? t(`預設對齊本地課程學年 ${localSchoolYear}。`, `Defaults to local course year ${localSchoolYear}.`)
                    : '';
            }
        }

        async function loadCourses() {
            const yearId = document.getElementById('qsis-year').value;
            const klaId = document.getElementById('qsis-kla').value;
            coursesBox.innerHTML = `<p class="p-3 text-slate-500 text-sm">${escapeHtml(t('載入課程…', 'Loading courses…'))}</p>`;
            try {
                const data = await global.ScienceApi.apiFetch(
                    `/admin/qsis/courses?year_id=${encodeURIComponent(yearId)}&kla_id=${encodeURIComponent(klaId)}`
                );
                const courses = data.courses || [];
                if (!courses.length) {
                    coursesBox.innerHTML = `<p class="p-3 text-slate-500 text-sm">${escapeHtml(t('此條件下沒有課程。', 'No courses for this filter.'))}</p>`;
                    return;
                }
                coursesBox.innerHTML = `<ul class="divide-y divide-slate-100">${courses.map((c) =>
                    `<li class="px-3 py-2 text-sm flex items-center gap-2">
                        <input type="checkbox" class="qsis-course-cb" value="${Number(c.course_id)}" checked>
                        <span class="flex-1">${escapeHtml(c.name || ('#' + c.course_id))}${c.class ? ' <span class="text-slate-500">(' + escapeHtml(c.class) + ')</span>' : ''}</span>
                        <span class="text-xs text-slate-400">${c.level ? ('S' + Number(c.level)) : ''}</span>
                        <span class="text-xs text-slate-400">${Number(c.student_count || 0)} ${escapeHtml(t('人', 'students'))}</span>
                        <span class="text-xs text-slate-400 font-mono">#${Number(c.course_id)}</span>
                    </li>`
                ).join('')}</ul>`;
                const master = document.getElementById('qsis-select-all');
                if (master) {
                    master.checked = true;
                    master.onchange = () => {
                        coursesBox.querySelectorAll('.qsis-course-cb').forEach((cb) => {
                            cb.checked = master.checked;
                        });
                    };
                }
            } catch (err) {
                coursesBox.innerHTML = `<p class="p-3 text-red-600 text-sm">${escapeHtml(err.message || t('載入失敗', 'Load failed'))}</p>`;
            }
        }

        document.getElementById('qsis-year').addEventListener('change', () => {
            updateYearHint();
            loadCourses();
        });
        document.getElementById('qsis-kla').addEventListener('change', loadCourses);
        updateYearHint();
        await loadCourses();

        box.querySelectorAll('.qsis-import-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const mode = btn.getAttribute('data-mode');
                const courseIds = Array.from(coursesBox.querySelectorAll('.qsis-course-cb:checked'))
                    .map((cb) => Number(cb.value))
                    .filter((id) => id > 0);
                if (!courseIds.length) {
                    showMsg(flash, t('請至少勾選一門課程。', 'Select at least one course.'), true);
                    flash.classList.remove('hidden');
                    return;
                }
                const yearId = document.getElementById('qsis-year').value;
                if (suggestedYear && yearId !== suggestedYear) {
                    const ok = window.confirm(t(
                        `所選 QSIS 學年 [${yearId}] 與本地課程學年 [${localSchoolYear || suggestedYear}] 不同。繼續可能把學生年級／班別改成升班後資料。確定匯入？`,
                        `QSIS year [${yearId}] differs from local courses [${localSchoolYear || suggestedYear}]. Continuing may overwrite students with promoted class data. Import anyway?`
                    ));
                    if (!ok) return;
                }
                const buttons = box.querySelectorAll('.qsis-import-btn');
                buttons.forEach((b) => { b.disabled = true; });
                showMsg(flash, t('匯入中…', 'Importing…'), false);
                flash.classList.remove('hidden');
                try {
                    const result = await global.ScienceApi.apiFetch('/admin/qsis/import', {
                        method: 'POST',
                        body: {
                            mode,
                            year_id: document.getElementById('qsis-year').value,
                            course_ids: courseIds,
                            teacher_user_id: Number(document.getElementById('qsis-teacher').value) || 0,
                            enroll: document.getElementById('qsis-enroll').checked,
                            update_existing: document.getElementById('qsis-update').checked,
                        },
                    });
                    const summary = JSON.stringify(result).slice(0, 400);
                    showMsg(flash, t('匯入完成。', 'Import finished. ') + summary, false);
                } catch (err) {
                    showMsg(flash, err.message || t('匯入失敗', 'Import failed'), true);
                } finally {
                    buttons.forEach((b) => { b.disabled = false; });
                }
            });
        });
    }

    Object.assign(global.AppAdmin || (global.AppAdmin = {}), {
        renderAdminDbExport,
        renderAdminDbImport,
        renderAdminDataDictionary,
        renderAdminQsisImport,
    });
