const d=window;function e(s,a){return d.AppRouter&&d.AppRouter.t?d.AppRouter.t(s,a):s}function t(s){return d.AppRouter&&d.AppRouter.escapeHtml?d.AppRouter.escapeHtml(s):String(s||"")}function A(s){return d.AppRouter&&d.AppRouter.spaHref?d.AppRouter.spaHref(s):String(s||"")}function E(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function _(){return d.ScienceApi.getUser()?!!d.ScienceApi.hasPermission("user.manage"):(d.AppRouter.navigate("/login"),!1)}function f(s){s.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",n=>{n.preventDefault(),d.AppRouter.navigate(a.getAttribute("data-spa-nav"))})})}function m(s,a,n){s&&(s.textContent=a,s.classList.remove("hidden","text-emerald-700","text-red-600","bg-emerald-50","bg-red-50","border-emerald-200","border-red-200"),s.classList.add(n?"text-red-600":"text-emerald-700"),s.classList.contains("border")&&s.classList.add(n?"bg-red-50":"bg-emerald-50",n?"border-red-200":"border-emerald-200"))}function T(s){const a=s.display_name||s.name_zh||s.name_en||"",n=s.email||"";return n?`${a} (${n})`:a||"#"+s.id}function H(s){let a=s.yearText||(s.yearFrom||"")+"-"+(s.yearEnd||"");return s.thisYear&&(a+=e("（本學年）"," (current)")),`${a} [${s.yearId}]`}function M(s){const a=(s.kla_name_zh||"").trim(),n=(s.kla_name_en||"").trim(),r=(s.kla_code||"").trim();let o=a||n||r||"#"+s.kla_id;return r&&o!==r&&(o+=" ["+r+"]"),o}function x(){return`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(A("/admin"))}" data-spa-nav="/admin" class="text-indigo-700 hover:underline">${t(e("← 管理首頁","← Admin home"))}</a>
                <a href="${t(A("/admin/db-export"))}" data-spa-nav="/admin/db-export" class="text-slate-600 hover:underline">${t(e("匯出","Export"))}</a>
                <a href="${t(A("/admin/db-import"))}" data-spa-nav="/admin/db-import" class="text-slate-600 hover:underline">${t(e("匯入","Import"))}</a>
                <a href="${t(A("/admin/qsis-import"))}" data-spa-nav="/admin/qsis-import" class="text-slate-600 hover:underline">QSIS</a>
                <a href="${t(A("/admin/data-dictionary"))}" data-spa-nav="/admin/data-dictionary" class="text-slate-600 hover:underline">${t(e("資料字典","Dictionary"))}</a>
            </div>`}async function Q(s){const a=await s.blob(),n=s.headers.get("Content-Disposition")||"",r=/filename="([^"]+)"/.exec(n),o=r?r[1]:"database_"+Date.now()+".sql",p=URL.createObjectURL(a),l=document.createElement("a");return l.href=p,l.download=o,document.body.appendChild(l),l.click(),l.remove(),URL.revokeObjectURL(p),o}async function R(){E();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("匯出資料庫","Export database")),!_()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`
            ${x()}
            <p id="db-export-flash" class="text-sm mb-4 hidden"></p>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">
                ${t(e("下載目前 .env 所連線之整個 MySQL 資料庫結構與資料（僅一般資料表，不含 VIEW）。檔案可能含敏感資料，請妥善保管。","Download a full SQL dump of the database configured in .env (base tables only, no views). Treat the file as sensitive."))}
            </p>
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <button type="button" id="db-export-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    ${t(e("一鍵下載 SQL 備份","Download SQL backup"))}
                </button>
            </div>`,f(a);const n=document.getElementById("db-export-btn"),r=document.getElementById("db-export-flash");n.addEventListener("click",async()=>{n.disabled=!0,m(r,e("正在匯出，請稍候…","Exporting…"),!1),r.classList.remove("hidden");try{const o=await d.ScienceApi.apiFetch("/admin/db/export",{method:"POST",body:{},rawResponse:!0}),p=await Q(o);m(r,e("已開始下載 ","Download started: ")+p,!1)}catch(o){m(r,o.message||e("匯出失敗","Export failed"),!0)}finally{n.disabled=!1}})}async function D(){E();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("匯入資料庫","Import database")),!_()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${x()}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,f(a);let n;try{n=await d.ScienceApi.apiFetch("/admin/db/import-status")}catch(L){a.innerHTML=`${x()}<p class="text-red-600">${t(L.message||e("載入失敗","Load failed"))}</p>`,f(a);return}const r=!!n.wipe_allowed,o=n.confirm_phrase||"DELETE ALL TABLES",p=n.app_env||"",l=n.schema_name||"";a.innerHTML=`
            ${x()}
            <p class="text-sm text-slate-600 leading-relaxed mb-3">
                ${t(e("將上載的 SQL 匯入目前 .env 資料庫","Import uploaded SQL into the .env database"))}
                ${l?` <strong>${t(l)}</strong>`:""}。
                ${t(e("匯入前會先刪除該庫內所有現有資料表，無法復原。建議先匯出備份。","All existing tables are dropped first. This cannot be undone. Export a backup first."))}
            </p>
            <p class="text-sm rounded-lg px-4 py-3 border mb-4 ${r?"bg-amber-50 border-amber-200 text-amber-900":"bg-red-50 border-red-200 text-red-800"}">
                ${t(e("目前","Current"))} <code class="font-mono text-xs">APP_ENV=${t(p)}</code>。
                ${r?t(e("此環境允許清空匯入；仍須勾選確認並輸入片語 ","Wipe import allowed; still require checkbox and phrase "))+`<code class="font-mono text-xs">${t(o)}</code>。`:t(e("生產環境預設拒絕清空匯入。緊急還原請於 .env 設 APP_ALLOW_DB_WIPE=1（用畢請移除）。","Production blocks wipe import by default. Set APP_ALLOW_DB_WIPE=1 in .env for emergency restore, then remove it."))}
            </p>
            <p id="db-import-flash" class="text-sm rounded-lg px-4 py-3 border hidden mb-4"></p>
            <form id="db-import-form" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 ${r?"":"opacity-60 pointer-events-none"}">
                <div>
                    <label for="sql_file" class="block text-sm font-medium text-slate-700 mb-1">${t(e("SQL 檔案","SQL file"))}</label>
                    <input type="file" id="sql_file" name="sql_file" accept=".sql,text/plain" required
                        class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm">
                </div>
                <label class="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" id="confirm_wipe" name="confirm_wipe" value="1" class="mt-1">
                    <span>${t(e("我了解此操作會刪除現有全部資料表並以 SQL 取代。","I understand this deletes all existing tables and replaces them with the SQL file."))}</span>
                </label>
                <div>
                    <label for="confirm_phrase" class="block text-sm font-medium text-slate-700 mb-1">
                        ${t(e("請輸入確認片語","Type confirmation phrase"))}
                        <code class="font-mono text-xs ml-1">${t(o)}</code>
                    </label>
                    <input type="text" id="confirm_phrase" name="confirm_phrase" autocomplete="off"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" ${r?"":"disabled"}>
                </div>
                <button type="submit" class="bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-800" ${r?"":"disabled"}>
                    ${t(e("清空並匯入","Wipe and import"))}
                </button>
            </form>`,f(a);const g=document.getElementById("db-import-form"),y=document.getElementById("db-import-flash");g.addEventListener("submit",async L=>{if(L.preventDefault(),!r)return;const S=document.getElementById("sql_file"),k=document.getElementById("confirm_wipe").checked,q=String(document.getElementById("confirm_phrase").value||"").trim();if(!S.files||!S.files[0]){m(y,e("請選擇 SQL 檔案。","Choose an SQL file."),!0),y.classList.remove("hidden");return}const u=new FormData;u.append("sql_file",S.files[0]),k&&u.append("confirm_wipe","1"),u.append("confirm_phrase",q);const h=g.querySelector('button[type="submit"]');h.disabled=!0,m(y,e("正在匯入，請稍候…","Importing…"),!1),y.classList.remove("hidden");try{const b=await d.ScienceApi.apiFetch("/admin/db/import",{method:"POST",body:u}),i=b.tables!=null?b.tables:"?",v=b.dropped!=null?b.dropped:"?";m(y,e(`匯入完成：刪除 ${v} 張表，現有 ${i} 張表。`,`Import done: dropped ${v}, now ${i} tables.`),!1)}catch(b){m(y,b.message||e("匯入失敗","Import failed"),!0)}finally{h.disabled=!1}})}async function B(){E();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("資料字典","Data dictionary")),!_()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${x()}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,f(a);let n;try{n=await d.ScienceApi.apiFetch("/admin/data-dictionary")}catch(p){a.innerHTML=`${x()}<p class="text-red-600">${t(p.message||e("載入失敗","Load failed"))}</p>`,f(a);return}const r=!!n.exists;let o="";r&&d.AppMarkdown&&d.AppMarkdown.renderMarkdownToHtml?o=d.AppMarkdown.renderMarkdownToHtml(n.markdown||""):r&&(o=`<pre class="whitespace-pre-wrap text-xs">${t(n.markdown||"")}</pre>`),a.innerHTML=`
            ${x()}
            <p id="dd-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="text-sm text-slate-600 space-y-1">
                    <p><strong class="text-slate-800">${t(e("來源","Source"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">schema.sql</code>
                        <span class="text-slate-400">（${t(n.schema_mtime||"—")}）</span></p>
                    <p><strong class="text-slate-800">${t(e("文件","File"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">data_dictionary.md</code>
                        ${r?`· ${Number(n.size||0).toLocaleString()} bytes · ${t(n.mtime||"")}`:`· <span class="text-amber-700">${t(e("尚未產生","Not generated"))}</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="dd-regenerate-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                        ${t(e("重新產生","Regenerate"))}
                    </button>
                </div>
            </div>
            ${r?`<article id="dd-body" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 overflow-x-auto prose prose-slate max-w-none">${o}</article>`:`<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-sm">${t(e("尚未找到 data_dictionary.md。請按「重新產生」。","data_dictionary.md missing. Click Regenerate."))}</div>`}`,f(a),document.getElementById("dd-regenerate-btn").addEventListener("click",async()=>{const p=document.getElementById("dd-regenerate-btn"),l=document.getElementById("dd-flash");p.disabled=!0,m(l,e("產生中…","Generating…"),!1),l.classList.remove("hidden");try{const g=await d.ScienceApi.apiFetch("/admin/data-dictionary/regenerate",{method:"POST",body:{}});m(l,e(`已更新（${g.table_count||0} 張資料表）。重新載入中…`,`Updated (${g.table_count||0} tables). Reloading…`),!1),await B()}catch(g){m(l,g.message||e("產生失敗","Regenerate failed"),!0),p.disabled=!1}})}async function C(){E();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("QSIS 匯入","QSIS import")),!_()){d.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}const n=d.ScienceApi.getUser();a.innerHTML=`${x()}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,f(a);let r;try{r=await d.ScienceApi.apiFetch("/admin/qsis/status")}catch(i){a.innerHTML=`${x()}<p class="text-red-600">${t(i.message||e("載入失敗","Load failed"))}</p>`,f(a);return}const o=r.connection||{},p=!!(r.configured&&o.ok),l=r.years||[],g=r.klas||[],y=r.teachers||[],L=r.current_year_id||l[0]&&l[0].yearId||"",S=l.map(i=>`<option value="${t(i.yearId)}" ${i.yearId===L?"selected":""}>${t(H(i))}</option>`).join(""),k=[`<option value="0">${t(e("全部 KLA","All KLAs"))}</option>`].concat(g.map(i=>`<option value="${Number(i.kla_id)}">${t(M(i))}</option>`)).join(""),q=y.map(i=>`<option value="${Number(i.id)}" ${n&&Number(i.id)===Number(n.id)?"selected":""}>${t(T(i))}</option>`).join("");if(a.innerHTML=`
            ${x()}
            <p id="qsis-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <h2 class="text-lg font-bold text-slate-800 mb-2">${t(e("QSIS 資料庫連線","QSIS connection"))}</h2>
                ${r.configured?p?`<p class="text-sm text-emerald-700">${t(e("已連線至 QSIS 資料庫","Connected to QSIS database"))} <strong>${t(o.database||"")}</strong>。</p>`:`<p class="text-sm text-red-600">${t(e("連線失敗：","Connection failed: ")+(o.error||""))}</p>`:`<p class="text-sm text-amber-700">${t(e("請在 .env 設定 QSIS_DB_* 變數（見 .env.example）。","Configure QSIS_DB_* in .env (see .env.example)."))}</p>`}
                <p class="text-xs text-slate-500 mt-2">${t(e("此連線為唯讀用途。","Read-only connection."))}</p>
            </div>
            ${p?`
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6 space-y-4" id="qsis-panel">
                <div class="grid sm:grid-cols-2 gap-4">
                    <label class="block text-sm font-medium text-slate-700">${t(e("QSIS 學年","QSIS year"))}
                        <select id="qsis-year" class="mt-1 w-full border rounded-lg px-3 py-2">${S}</select>
                    </label>
                    <label class="block text-sm font-medium text-slate-700">${t(e("學習領域（KLA）","KLA"))}
                        <select id="qsis-kla" class="mt-1 w-full border rounded-lg px-3 py-2">${k}</select>
                    </label>
                </div>
                <label class="block text-sm font-medium text-slate-700">${t(e("預設任教老師","Default teacher"))}
                    <select id="qsis-teacher" class="mt-1 w-full border rounded-lg px-3 py-2">${q}</select>
                </label>
                <div class="pt-4 border-t border-slate-100">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 class="text-lg font-bold text-slate-800">${t(e("QSIS 課程","QSIS courses"))}</h2>
                        <label class="text-sm text-slate-600"><input type="checkbox" id="qsis-select-all" class="mr-1" checked> ${t(e("全選","Select all"))}</label>
                    </div>
                    <div id="qsis-courses" class="max-h-72 overflow-y-auto border border-slate-100 rounded-lg mb-4">
                        <p class="p-3 text-slate-500 text-sm">${t(e("載入課程…","Loading courses…"))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3 items-center mb-4">
                        <button type="button" data-mode="all" class="qsis-import-btn bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">${t(e("一鍵匯入課程＋學生","Import courses + students"))}</button>
                        <button type="button" data-mode="courses" class="qsis-import-btn bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800">${t(e("只匯入課程","Courses only"))}</button>
                        <button type="button" data-mode="students" class="qsis-import-btn bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">${t(e("只匯入學生","Students only"))}</button>
                    </div>
                    <div class="space-y-2 text-sm text-slate-600">
                        <label class="flex items-center gap-2"><input type="checkbox" id="qsis-enroll" checked> ${t(e("匯入學生時自動加入對應本地課程","Auto-enroll students into matching local courses"))}</label>
                        <label class="flex items-center gap-2"><input type="checkbox" id="qsis-update"> ${t(e("更新已存在學生的中英文名","Update existing student names"))}</label>
                    </div>
                </div>
            </div>`:""}
            <div class="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
                <h3 class="font-semibold text-slate-800 mb-2">${t(e("說明","Notes"))}</h3>
                <ul class="list-disc pl-5 space-y-1">
                    <li>${t(e("匯入後可至課程管理檢視邀請碼與名單。","After import, review invite codes and rosters under Courses."))}</li>
                    <li>${t(e("已存在同名同學年課程或同學號學生會略過，不會覆寫密碼。","Existing same-year courses or student IDs are skipped; passwords are never overwritten."))}</li>
                </ul>
            </div>`,f(a),!p)return;const u=document.getElementById("qsis-flash"),h=document.getElementById("qsis-courses");async function b(){const i=document.getElementById("qsis-year").value,v=document.getElementById("qsis-kla").value;h.innerHTML=`<p class="p-3 text-slate-500 text-sm">${t(e("載入課程…","Loading courses…"))}</p>`;try{const I=(await d.ScienceApi.apiFetch(`/admin/qsis/courses?year_id=${encodeURIComponent(i)}&kla_id=${encodeURIComponent(v)}`)).courses||[];if(!I.length){h.innerHTML=`<p class="p-3 text-slate-500 text-sm">${t(e("此條件下沒有課程。","No courses for this filter."))}</p>`;return}h.innerHTML=`<ul class="divide-y divide-slate-100">${I.map($=>`<li class="px-3 py-2 text-sm flex items-center gap-2">
                        <input type="checkbox" class="qsis-course-cb" value="${Number($.course_id)}" checked>
                        <span>${t($.name||"#"+$.course_id)}</span>
                        <span class="text-xs text-slate-400 font-mono">#${Number($.course_id)}</span>
                    </li>`).join("")}</ul>`;const c=document.getElementById("qsis-select-all");c&&(c.checked=!0,c.onchange=()=>{h.querySelectorAll(".qsis-course-cb").forEach($=>{$.checked=c.checked})})}catch(w){h.innerHTML=`<p class="p-3 text-red-600 text-sm">${t(w.message||e("載入失敗","Load failed"))}</p>`}}document.getElementById("qsis-year").addEventListener("change",b),document.getElementById("qsis-kla").addEventListener("change",b),await b(),a.querySelectorAll(".qsis-import-btn").forEach(i=>{i.addEventListener("click",async()=>{const v=i.getAttribute("data-mode"),w=Array.from(h.querySelectorAll(".qsis-course-cb:checked")).map(c=>Number(c.value)).filter(c=>c>0);if(!w.length){m(u,e("請至少勾選一門課程。","Select at least one course."),!0),u.classList.remove("hidden");return}const I=a.querySelectorAll(".qsis-import-btn");I.forEach(c=>{c.disabled=!0}),m(u,e("匯入中…","Importing…"),!1),u.classList.remove("hidden");try{const c=await d.ScienceApi.apiFetch("/admin/qsis/import",{method:"POST",body:{mode:v,year_id:document.getElementById("qsis-year").value,course_ids:w,teacher_user_id:Number(document.getElementById("qsis-teacher").value)||0,enroll:document.getElementById("qsis-enroll").checked,update_existing:document.getElementById("qsis-update").checked}}),$=JSON.stringify(c).slice(0,400);m(u,e("匯入完成。","Import finished. ")+$,!1)}catch(c){m(u,c.message||e("匯入失敗","Import failed"),!0)}finally{I.forEach(c=>{c.disabled=!1})}})})}Object.assign(d.AppAdmin||(d.AppAdmin={}),{renderAdminDbExport:R,renderAdminDbImport:D,renderAdminDataDictionary:B,renderAdminQsisImport:C});
