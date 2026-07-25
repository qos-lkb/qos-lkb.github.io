const d=window;function t(s,a){return d.AppRouter&&d.AppRouter.t?d.AppRouter.t(s,a):s}function e(s){return d.AppRouter&&d.AppRouter.escapeHtml?d.AppRouter.escapeHtml(s):String(s||"")}function _(s){return d.AppRouter&&d.AppRouter.spaHref?d.AppRouter.spaHref(s):String(s||"")}function A(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function E(){return d.ScienceApi.getUser()?!!d.ScienceApi.hasPermission("user.manage"):(d.AppRouter.navigate("/login"),!1)}function x(s){s.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",n=>{n.preventDefault(),d.AppRouter.navigate(a.getAttribute("data-spa-nav"))})})}function p(s,a,n){s&&(s.textContent=a,s.classList.remove("hidden","text-emerald-700","text-red-600","bg-emerald-50","bg-red-50","border-emerald-200","border-red-200"),s.classList.add(n?"text-red-600":"text-emerald-700"),s.classList.contains("border")&&s.classList.add(n?"bg-red-50":"bg-emerald-50",n?"border-red-200":"border-emerald-200"))}function T(s){const a=s.display_name||s.name_zh||s.name_en||"",n=s.email||"";return n?`${a} (${n})`:a||"#"+s.id}function H(s){let a=s.yearText||(s.yearFrom||"")+"-"+(s.yearEnd||"");return s.thisYear&&(a+=t("（本學年）"," (current)")),`${a} [${s.yearId}]`}function M(s){const a=(s.kla_name_zh||"").trim(),n=(s.kla_name_en||"").trim(),r=(s.kla_code||"").trim();let o=a||n||r||"#"+s.kla_id;return r&&o!==r&&(o+=" ["+r+"]"),o}function g(){return`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${e(_("/admin"))}" data-spa-nav="/admin" class="text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                <a href="${e(_("/admin/db-export"))}" data-spa-nav="/admin/db-export" class="text-slate-600 hover:underline">${e(t("匯出","Export"))}</a>
                <a href="${e(_("/admin/db-import"))}" data-spa-nav="/admin/db-import" class="text-slate-600 hover:underline">${e(t("匯入","Import"))}</a>
                <a href="${e(_("/admin/qsis-import"))}" data-spa-nav="/admin/qsis-import" class="text-slate-600 hover:underline">QSIS</a>
                <a href="${e(_("/admin/data-dictionary"))}" data-spa-nav="/admin/data-dictionary" class="text-slate-600 hover:underline">${e(t("資料字典","Dictionary"))}</a>
            </div>`}async function Q(s){const a=await s.blob(),n=s.headers.get("Content-Disposition")||"",r=/filename="([^"]+)"/.exec(n),o=r?r[1]:"database_"+Date.now()+".sql",u=URL.createObjectURL(a),l=document.createElement("a");return l.href=u,l.download=o,document.body.appendChild(l),l.click(),l.remove(),URL.revokeObjectURL(u),o}async function R(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("匯出資料庫","Export database")),!E()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`
            ${g()}
            <p id="db-export-flash" class="text-sm mb-4 hidden"></p>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">
                ${e(t("下載目前 .env 所連線之整個 MySQL 資料庫結構與資料（僅一般資料表，不含 VIEW）。檔案可能含敏感資料，請妥善保管。","Download a full SQL dump of the database configured in .env (base tables only, no views). Treat the file as sensitive."))}
            </p>
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <button type="button" id="db-export-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    ${e(t("一鍵下載 SQL 備份","Download SQL backup"))}
                </button>
            </div>`,x(a);const n=document.getElementById("db-export-btn"),r=document.getElementById("db-export-flash");n.addEventListener("click",async()=>{n.disabled=!0,p(r,t("正在匯出，請稍候…","Exporting…"),!1),r.classList.remove("hidden");try{const o=await d.ScienceApi.apiFetch("/admin/db/export",{method:"POST",body:{},rawResponse:!0}),u=await Q(o);p(r,t("已開始下載 ","Download started: ")+u,!1)}catch(o){p(r,o.message||t("匯出失敗","Export failed"),!0)}finally{n.disabled=!1}})}async function D(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("匯入資料庫","Import database")),!E()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${g()}<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`,x(a);let n;try{n=await d.ScienceApi.apiFetch("/admin/db/import-status")}catch(w){a.innerHTML=`${g()}<p class="text-red-600">${e(w.message||t("載入失敗","Load failed"))}</p>`,x(a);return}const r=!!n.wipe_allowed,o=n.confirm_phrase||"DELETE ALL TABLES",u=n.app_env||"",l=n.schema_name||"";a.innerHTML=`
            ${g()}
            <p class="text-sm text-slate-600 leading-relaxed mb-3">
                ${e(t("將上載的 SQL 匯入目前 .env 資料庫","Import uploaded SQL into the .env database"))}
                ${l?` <strong>${e(l)}</strong>`:""}。
                ${e(t("匯入前會先刪除該庫內所有現有資料表，無法復原。建議先匯出備份。","All existing tables are dropped first. This cannot be undone. Export a backup first."))}
            </p>
            <p class="text-sm rounded-lg px-4 py-3 border mb-4 ${r?"bg-amber-50 border-amber-200 text-amber-900":"bg-red-50 border-red-200 text-red-800"}">
                ${e(t("目前","Current"))} <code class="font-mono text-xs">APP_ENV=${e(u)}</code>。
                ${r?e(t("此環境允許清空匯入；仍須勾選確認並輸入片語 ","Wipe import allowed; still require checkbox and phrase "))+`<code class="font-mono text-xs">${e(o)}</code>。`:e(t("生產環境預設拒絕清空匯入。緊急還原請於 .env 設 APP_ALLOW_DB_WIPE=1（用畢請移除）。","Production blocks wipe import by default. Set APP_ALLOW_DB_WIPE=1 in .env for emergency restore, then remove it."))}
            </p>
            <p id="db-import-flash" class="text-sm rounded-lg px-4 py-3 border hidden mb-4"></p>
            <form id="db-import-form" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 ${r?"":"opacity-60 pointer-events-none"}">
                <div>
                    <label for="sql_file" class="block text-sm font-medium text-slate-700 mb-1">${e(t("SQL 檔案","SQL file"))}</label>
                    <input type="file" id="sql_file" name="sql_file" accept=".sql,text/plain" required
                        class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm">
                </div>
                <label class="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" id="confirm_wipe" name="confirm_wipe" value="1" class="mt-1">
                    <span>${e(t("我了解此操作會刪除現有全部資料表並以 SQL 取代。","I understand this deletes all existing tables and replaces them with the SQL file."))}</span>
                </label>
                <div>
                    <label for="confirm_phrase" class="block text-sm font-medium text-slate-700 mb-1">
                        ${e(t("請輸入確認片語","Type confirmation phrase"))}
                        <code class="font-mono text-xs ml-1">${e(o)}</code>
                    </label>
                    <input type="text" id="confirm_phrase" name="confirm_phrase" autocomplete="off"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" ${r?"":"disabled"}>
                </div>
                <button type="submit" class="bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-800" ${r?"":"disabled"}>
                    ${e(t("清空並匯入","Wipe and import"))}
                </button>
            </form>`,x(a);const h=document.getElementById("db-import-form"),m=document.getElementById("db-import-flash");h.addEventListener("submit",async w=>{if(w.preventDefault(),!r)return;const L=document.getElementById("sql_file"),k=document.getElementById("confirm_wipe").checked,q=String(document.getElementById("confirm_phrase").value||"").trim();if(!L.files||!L.files[0]){p(m,t("請選擇 SQL 檔案。","Choose an SQL file."),!0),m.classList.remove("hidden");return}const b=new FormData;b.append("sql_file",L.files[0]),k&&b.append("confirm_wipe","1"),b.append("confirm_phrase",q);const y=h.querySelector('button[type="submit"]');y.disabled=!0,p(m,t("正在匯入，請稍候…","Importing…"),!1),m.classList.remove("hidden");try{const f=await d.ScienceApi.apiFetch("/admin/db/import",{method:"POST",body:b}),i=f.tables!=null?f.tables:"?",v=f.dropped!=null?f.dropped:"?";p(m,t(`匯入完成：刪除 ${v} 張表，現有 ${i} 張表。`,`Import done: dropped ${v}, now ${i} tables.`),!1)}catch(f){p(m,f.message||t("匯入失敗","Import failed"),!0)}finally{y.disabled=!1}})}async function B(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("資料字典","Data dictionary")),!E()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${g()}<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`,x(a);let n;try{n=await d.ScienceApi.apiFetch("/admin/data-dictionary")}catch(l){a.innerHTML=`${g()}<p class="text-red-600">${e(l.message||t("載入失敗","Load failed"))}</p>`,x(a);return}const r=!!n.exists;let o="";r&&d.AppMarkdown&&d.AppMarkdown.renderMarkdownToHtml?o=d.AppMarkdown.renderMarkdownToHtml(n.markdown||""):r&&(o=`<pre class="whitespace-pre-wrap text-xs">${e(n.markdown||"")}</pre>`);const u="../"+(n.reader_url||"markdown_reader.php?file=data_dictionary.md");a.innerHTML=`
            ${g()}
            <p id="dd-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="text-sm text-slate-600 space-y-1">
                    <p><strong class="text-slate-800">${e(t("來源","Source"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">schema.sql</code>
                        <span class="text-slate-400">（${e(n.schema_mtime||"—")}）</span></p>
                    <p><strong class="text-slate-800">${e(t("文件","File"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">data_dictionary.md</code>
                        ${r?`· ${Number(n.size||0).toLocaleString()} bytes · ${e(n.mtime||"")}`:`· <span class="text-amber-700">${e(t("尚未產生","Not generated"))}</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="dd-regenerate-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                        ${e(t("重新產生","Regenerate"))}
                    </button>
                    ${r?`<a href="${e(u)}" target="_blank" rel="noopener" class="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">${e(t("公開閱讀器","Public reader"))}</a>`:""}
                </div>
            </div>
            ${r?`<article id="dd-body" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 overflow-x-auto prose prose-slate max-w-none">${o}</article>`:`<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-sm">${e(t("尚未找到 data_dictionary.md。請按「重新產生」，或於本機執行 php update_data_dictionary.php。","data_dictionary.md missing. Regenerate, or run php update_data_dictionary.php locally."))}</div>`}`,x(a),document.getElementById("dd-regenerate-btn").addEventListener("click",async()=>{const l=document.getElementById("dd-regenerate-btn"),h=document.getElementById("dd-flash");l.disabled=!0,p(h,t("產生中…","Generating…"),!1),h.classList.remove("hidden");try{const m=await d.ScienceApi.apiFetch("/admin/data-dictionary/regenerate",{method:"POST",body:{}});p(h,t(`已更新（${m.table_count||0} 張資料表）。重新載入中…`,`Updated (${m.table_count||0} tables). Reloading…`),!1),await B()}catch(m){p(h,m.message||t("產生失敗","Regenerate failed"),!0),l.disabled=!1}})}async function C(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("QSIS 匯入","QSIS import")),!E()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}const n=d.ScienceApi.getUser();a.innerHTML=`${g()}<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`,x(a);let r;try{r=await d.ScienceApi.apiFetch("/admin/qsis/status")}catch(i){a.innerHTML=`${g()}<p class="text-red-600">${e(i.message||t("載入失敗","Load failed"))}</p>`,x(a);return}const o=r.connection||{},u=!!(r.configured&&o.ok),l=r.years||[],h=r.klas||[],m=r.teachers||[],w=r.current_year_id||l[0]&&l[0].yearId||"",L=l.map(i=>`<option value="${e(i.yearId)}" ${i.yearId===w?"selected":""}>${e(H(i))}</option>`).join(""),k=[`<option value="0">${e(t("全部 KLA","All KLAs"))}</option>`].concat(h.map(i=>`<option value="${Number(i.kla_id)}">${e(M(i))}</option>`)).join(""),q=m.map(i=>`<option value="${Number(i.id)}" ${n&&Number(i.id)===Number(n.id)?"selected":""}>${e(T(i))}</option>`).join("");if(a.innerHTML=`
            ${g()}
            <p id="qsis-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <h2 class="text-lg font-bold text-slate-800 mb-2">${e(t("QSIS 資料庫連線","QSIS connection"))}</h2>
                ${r.configured?u?`<p class="text-sm text-emerald-700">${e(t("已連線至 QSIS 資料庫","Connected to QSIS database"))} <strong>${e(o.database||"")}</strong>。</p>`:`<p class="text-sm text-red-600">${e(t("連線失敗：","Connection failed: ")+(o.error||""))}</p>`:`<p class="text-sm text-amber-700">${e(t("請在 .env 設定 QSIS_DB_* 變數（見 .env.example）。","Configure QSIS_DB_* in .env (see .env.example)."))}</p>`}
                <p class="text-xs text-slate-500 mt-2">${e(t("此連線為唯讀用途。","Read-only connection."))}</p>
            </div>
            ${u?`
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6 space-y-4" id="qsis-panel">
                <div class="grid sm:grid-cols-2 gap-4">
                    <label class="block text-sm font-medium text-slate-700">${e(t("QSIS 學年","QSIS year"))}
                        <select id="qsis-year" class="mt-1 w-full border rounded-lg px-3 py-2">${L}</select>
                    </label>
                    <label class="block text-sm font-medium text-slate-700">${e(t("學習領域（KLA）","KLA"))}
                        <select id="qsis-kla" class="mt-1 w-full border rounded-lg px-3 py-2">${k}</select>
                    </label>
                </div>
                <label class="block text-sm font-medium text-slate-700">${e(t("預設任教老師","Default teacher"))}
                    <select id="qsis-teacher" class="mt-1 w-full border rounded-lg px-3 py-2">${q}</select>
                </label>
                <div class="pt-4 border-t border-slate-100">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 class="text-lg font-bold text-slate-800">${e(t("QSIS 課程","QSIS courses"))}</h2>
                        <label class="text-sm text-slate-600"><input type="checkbox" id="qsis-select-all" class="mr-1" checked> ${e(t("全選","Select all"))}</label>
                    </div>
                    <div id="qsis-courses" class="max-h-72 overflow-y-auto border border-slate-100 rounded-lg mb-4">
                        <p class="p-3 text-slate-500 text-sm">${e(t("載入課程…","Loading courses…"))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3 items-center mb-4">
                        <button type="button" data-mode="all" class="qsis-import-btn bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">${e(t("一鍵匯入課程＋學生","Import courses + students"))}</button>
                        <button type="button" data-mode="courses" class="qsis-import-btn bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800">${e(t("只匯入課程","Courses only"))}</button>
                        <button type="button" data-mode="students" class="qsis-import-btn bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">${e(t("只匯入學生","Students only"))}</button>
                    </div>
                    <div class="space-y-2 text-sm text-slate-600">
                        <label class="flex items-center gap-2"><input type="checkbox" id="qsis-enroll" checked> ${e(t("匯入學生時自動加入對應本地課程","Auto-enroll students into matching local courses"))}</label>
                        <label class="flex items-center gap-2"><input type="checkbox" id="qsis-update"> ${e(t("更新已存在學生的中英文名","Update existing student names"))}</label>
                    </div>
                </div>
            </div>`:""}
            <div class="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
                <h3 class="font-semibold text-slate-800 mb-2">${e(t("說明","Notes"))}</h3>
                <ul class="list-disc pl-5 space-y-1">
                    <li>${e(t("匯入後可至課程管理檢視邀請碼與名單。","After import, review invite codes and rosters under Courses."))}</li>
                    <li>${e(t("已存在同名同學年課程或同學號學生會略過，不會覆寫密碼。","Existing same-year courses or student IDs are skipped; passwords are never overwritten."))}</li>
                </ul>
            </div>`,x(a),!u)return;const b=document.getElementById("qsis-flash"),y=document.getElementById("qsis-courses");async function f(){const i=document.getElementById("qsis-year").value,v=document.getElementById("qsis-kla").value;y.innerHTML=`<p class="p-3 text-slate-500 text-sm">${e(t("載入課程…","Loading courses…"))}</p>`;try{const I=(await d.ScienceApi.apiFetch(`/admin/qsis/courses?year_id=${encodeURIComponent(i)}&kla_id=${encodeURIComponent(v)}`)).courses||[];if(!I.length){y.innerHTML=`<p class="p-3 text-slate-500 text-sm">${e(t("此條件下沒有課程。","No courses for this filter."))}</p>`;return}y.innerHTML=`<ul class="divide-y divide-slate-100">${I.map($=>`<li class="px-3 py-2 text-sm flex items-center gap-2">
                        <input type="checkbox" class="qsis-course-cb" value="${Number($.course_id)}" checked>
                        <span>${e($.name||"#"+$.course_id)}</span>
                        <span class="text-xs text-slate-400 font-mono">#${Number($.course_id)}</span>
                    </li>`).join("")}</ul>`;const c=document.getElementById("qsis-select-all");c&&(c.checked=!0,c.onchange=()=>{y.querySelectorAll(".qsis-course-cb").forEach($=>{$.checked=c.checked})})}catch(S){y.innerHTML=`<p class="p-3 text-red-600 text-sm">${e(S.message||t("載入失敗","Load failed"))}</p>`}}document.getElementById("qsis-year").addEventListener("change",f),document.getElementById("qsis-kla").addEventListener("change",f),await f(),a.querySelectorAll(".qsis-import-btn").forEach(i=>{i.addEventListener("click",async()=>{const v=i.getAttribute("data-mode"),S=Array.from(y.querySelectorAll(".qsis-course-cb:checked")).map(c=>Number(c.value)).filter(c=>c>0);if(!S.length){p(b,t("請至少勾選一門課程。","Select at least one course."),!0),b.classList.remove("hidden");return}const I=a.querySelectorAll(".qsis-import-btn");I.forEach(c=>{c.disabled=!0}),p(b,t("匯入中…","Importing…"),!1),b.classList.remove("hidden");try{const c=await d.ScienceApi.apiFetch("/admin/qsis/import",{method:"POST",body:{mode:v,year_id:document.getElementById("qsis-year").value,course_ids:S,teacher_user_id:Number(document.getElementById("qsis-teacher").value)||0,enroll:document.getElementById("qsis-enroll").checked,update_existing:document.getElementById("qsis-update").checked}}),$=JSON.stringify(c).slice(0,400);p(b,t("匯入完成。","Import finished. ")+$,!1)}catch(c){p(b,c.message||t("匯入失敗","Import failed"),!0)}finally{I.forEach(c=>{c.disabled=!1})}})})}Object.assign(d.AppAdmin||(d.AppAdmin={}),{renderAdminDbExport:R,renderAdminDbImport:D,renderAdminDataDictionary:B,renderAdminQsisImport:C});
