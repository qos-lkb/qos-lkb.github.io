const n=window;function t(s,a){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(s,a):s}function e(s){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(s):String(s||"")}function _(s){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(s):String(s||"")}function T(){return(n.ScienceApi&&typeof n.ScienceApi.SITE_BASE=="string"?n.ScienceApi.SITE_BASE:typeof n.__SITE_BASE__=="string"?n.__SITE_BASE__:"")+"/codespace/index.html"}function A(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function E(){return n.ScienceApi.getUser()?!!n.ScienceApi.hasPermission("user.manage"):(n.AppRouter.navigate("/login"),!1)}function x(s){s.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",r=>{r.preventDefault(),n.AppRouter.navigate(a.getAttribute("data-spa-nav"))})})}function m(s,a,r){s&&(s.textContent=a,s.classList.remove("hidden","text-emerald-700","text-red-600","bg-emerald-50","bg-red-50","border-emerald-200","border-red-200"),s.classList.add(r?"text-red-600":"text-emerald-700"),s.classList.contains("border")&&s.classList.add(r?"bg-red-50":"bg-emerald-50",r?"border-red-200":"border-emerald-200"))}function Q(s){const a=s.display_name||s.name_zh||s.name_en||"",r=s.email||"";return r?`${a} (${r})`:a||"#"+s.id}function H(s){let a=s.yearText||(s.yearFrom||"")+"-"+(s.yearEnd||"");return s.thisYear&&(a+=t("（本學年）"," (current)")),`${a} [${s.yearId}]`}function M(s){const a=(s.kla_name_zh||"").trim(),r=(s.kla_name_en||"").trim(),o=(s.kla_code||"").trim();let d=a||r||o||"#"+s.kla_id;return o&&d!==o&&(d+=" ["+o+"]"),d}function g(){return`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${e(_("/admin"))}" data-spa-nav="/admin" class="text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                <a href="${e(T())}" target="_blank" rel="noopener" class="text-slate-600 hover:underline">Code Space ↗</a>
                <a href="${e(_("/admin/db-export"))}" data-spa-nav="/admin/db-export" class="text-slate-600 hover:underline">${e(t("匯出","Export"))}</a>
                <a href="${e(_("/admin/db-import"))}" data-spa-nav="/admin/db-import" class="text-slate-600 hover:underline">${e(t("匯入","Import"))}</a>
                <a href="${e(_("/admin/qsis-import"))}" data-spa-nav="/admin/qsis-import" class="text-slate-600 hover:underline">QSIS</a>
                <a href="${e(_("/admin/data-dictionary"))}" data-spa-nav="/admin/data-dictionary" class="text-slate-600 hover:underline">${e(t("資料字典","Dictionary"))}</a>
            </div>`}async function R(s){const a=await s.blob(),r=s.headers.get("Content-Disposition")||"",o=/filename="([^"]+)"/.exec(r),d=o?o[1]:"database_"+Date.now()+".sql",p=URL.createObjectURL(a),l=document.createElement("a");return l.href=p,l.download=d,document.body.appendChild(l),l.click(),l.remove(),URL.revokeObjectURL(p),d}async function D(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("匯出資料庫","Export database")),!E()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`
            ${g()}
            <p id="db-export-flash" class="text-sm mb-4 hidden"></p>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">
                ${e(t("下載目前 .env 所連線之整個 MySQL 資料庫結構與資料（僅一般資料表，不含 VIEW）。檔案可能含敏感資料，請妥善保管。","Download a full SQL dump of the database configured in .env (base tables only, no views). Treat the file as sensitive."))}
            </p>
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <button type="button" id="db-export-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    ${e(t("一鍵下載 SQL 備份","Download SQL backup"))}
                </button>
            </div>`,x(a);const r=document.getElementById("db-export-btn"),o=document.getElementById("db-export-flash");r.addEventListener("click",async()=>{r.disabled=!0,m(o,t("正在匯出，請稍候…","Exporting…"),!1),o.classList.remove("hidden");try{const d=await n.ScienceApi.apiFetch("/admin/db/export",{method:"POST",body:{},rawResponse:!0}),p=await R(d);m(o,t("已開始下載 ","Download started: ")+p,!1)}catch(d){m(o,d.message||t("匯出失敗","Export failed"),!0)}finally{r.disabled=!1}})}async function C(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("匯入資料庫","Import database")),!E()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${g()}<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`,x(a);let r;try{r=await n.ScienceApi.apiFetch("/admin/db/import-status")}catch(S){a.innerHTML=`${g()}<p class="text-red-600">${e(S.message||t("載入失敗","Load failed"))}</p>`,x(a);return}const o=!!r.wipe_allowed,d=r.confirm_phrase||"DELETE ALL TABLES",p=r.app_env||"",l=r.schema_name||"";a.innerHTML=`
            ${g()}
            <p class="text-sm text-slate-600 leading-relaxed mb-3">
                ${e(t("將上載的 SQL 匯入目前 .env 資料庫","Import uploaded SQL into the .env database"))}
                ${l?` <strong>${e(l)}</strong>`:""}。
                ${e(t("匯入前會先刪除該庫內所有現有資料表，無法復原。建議先匯出備份。","All existing tables are dropped first. This cannot be undone. Export a backup first."))}
            </p>
            <p class="text-sm rounded-lg px-4 py-3 border mb-4 ${o?"bg-amber-50 border-amber-200 text-amber-900":"bg-red-50 border-red-200 text-red-800"}">
                ${e(t("目前","Current"))} <code class="font-mono text-xs">APP_ENV=${e(p)}</code>。
                ${o?e(t("此環境允許清空匯入；仍須勾選確認並輸入片語 ","Wipe import allowed; still require checkbox and phrase "))+`<code class="font-mono text-xs">${e(d)}</code>。`:e(t("生產環境預設拒絕清空匯入。緊急還原請於 .env 設 APP_ALLOW_DB_WIPE=1（用畢請移除）。","Production blocks wipe import by default. Set APP_ALLOW_DB_WIPE=1 in .env for emergency restore, then remove it."))}
            </p>
            <p id="db-import-flash" class="text-sm rounded-lg px-4 py-3 border hidden mb-4"></p>
            <form id="db-import-form" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 ${o?"":"opacity-60 pointer-events-none"}">
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
                        <code class="font-mono text-xs ml-1">${e(d)}</code>
                    </label>
                    <input type="text" id="confirm_phrase" name="confirm_phrase" autocomplete="off"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" ${o?"":"disabled"}>
                </div>
                <button type="submit" class="bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-800" ${o?"":"disabled"}>
                    ${e(t("清空並匯入","Wipe and import"))}
                </button>
            </form>`,x(a);const h=document.getElementById("db-import-form"),$=document.getElementById("db-import-flash");h.addEventListener("submit",async S=>{if(S.preventDefault(),!o)return;const I=document.getElementById("sql_file"),k=document.getElementById("confirm_wipe").checked,q=String(document.getElementById("confirm_phrase").value||"").trim();if(!I.files||!I.files[0]){m($,t("請選擇 SQL 檔案。","Choose an SQL file."),!0),$.classList.remove("hidden");return}const b=new FormData;b.append("sql_file",I.files[0]),k&&b.append("confirm_wipe","1"),b.append("confirm_phrase",q);const y=h.querySelector('button[type="submit"]');y.disabled=!0,m($,t("正在匯入，請稍候…","Importing…"),!1),$.classList.remove("hidden");try{const f=await n.ScienceApi.apiFetch("/admin/db/import",{method:"POST",body:b}),i=f.tables!=null?f.tables:"?",v=f.dropped!=null?f.dropped:"?";m($,t(`匯入完成：刪除 ${v} 張表，現有 ${i} 張表。`,`Import done: dropped ${v}, now ${i} tables.`),!1)}catch(f){m($,f.message||t("匯入失敗","Import failed"),!0)}finally{y.disabled=!1}})}async function B(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("資料字典","Data dictionary")),!E()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${g()}<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`,x(a);let r;try{r=await n.ScienceApi.apiFetch("/admin/data-dictionary")}catch(p){a.innerHTML=`${g()}<p class="text-red-600">${e(p.message||t("載入失敗","Load failed"))}</p>`,x(a);return}const o=!!r.exists;let d="";o&&n.AppMarkdown&&n.AppMarkdown.renderMarkdownToHtml?d=n.AppMarkdown.renderMarkdownToHtml(r.markdown||""):o&&(d=`<pre class="whitespace-pre-wrap text-xs">${e(r.markdown||"")}</pre>`),a.innerHTML=`
            ${g()}
            <p id="dd-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="text-sm text-slate-600 space-y-1">
                    <p><strong class="text-slate-800">${e(t("來源","Source"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">schema.sql</code>
                        <span class="text-slate-400">（${e(r.schema_mtime||"—")}）</span></p>
                    <p><strong class="text-slate-800">${e(t("文件","File"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">data_dictionary.md</code>
                        ${o?`· ${Number(r.size||0).toLocaleString()} bytes · ${e(r.mtime||"")}`:`· <span class="text-amber-700">${e(t("尚未產生","Not generated"))}</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="dd-regenerate-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                        ${e(t("重新產生","Regenerate"))}
                    </button>
                </div>
            </div>
            ${o?`<article id="dd-body" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 overflow-x-auto prose prose-slate max-w-none">${d}</article>`:`<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-sm">${e(t("尚未找到 data_dictionary.md。請按「重新產生」。","data_dictionary.md missing. Click Regenerate."))}</div>`}`,x(a),document.getElementById("dd-regenerate-btn").addEventListener("click",async()=>{const p=document.getElementById("dd-regenerate-btn"),l=document.getElementById("dd-flash");p.disabled=!0,m(l,t("產生中…","Generating…"),!1),l.classList.remove("hidden");try{const h=await n.ScienceApi.apiFetch("/admin/data-dictionary/regenerate",{method:"POST",body:{}});m(l,t(`已更新（${h.table_count||0} 張資料表）。重新載入中…`,`Updated (${h.table_count||0} tables). Reloading…`),!1),await B()}catch(h){m(l,h.message||t("產生失敗","Regenerate failed"),!0),p.disabled=!1}})}async function N(){A();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=t("QSIS 匯入","QSIS import")),!E()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}const r=n.ScienceApi.getUser();a.innerHTML=`${g()}<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`,x(a);let o;try{o=await n.ScienceApi.apiFetch("/admin/qsis/status")}catch(i){a.innerHTML=`${g()}<p class="text-red-600">${e(i.message||t("載入失敗","Load failed"))}</p>`,x(a);return}const d=o.connection||{},p=!!(o.configured&&d.ok),l=o.years||[],h=o.klas||[],$=o.teachers||[],S=String(o.current_year_id||l[0]&&l[0].yearId||""),I=l.map(i=>`<option value="${e(i.yearId)}" ${String(i.yearId)===S?"selected":""}>${e(H(i))}</option>`).join(""),k=[`<option value="0">${e(t("全部 KLA","All KLAs"))}</option>`].concat(h.map(i=>`<option value="${Number(i.kla_id)}">${e(M(i))}</option>`)).join(""),q=$.map(i=>`<option value="${Number(i.id)}" ${r&&Number(i.id)===Number(r.id)?"selected":""}>${e(Q(i))}</option>`).join("");if(a.innerHTML=`
            ${g()}
            <p id="qsis-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <h2 class="text-lg font-bold text-slate-800 mb-2">${e(t("QSIS 資料庫連線","QSIS connection"))}</h2>
                ${o.configured?p?`<p class="text-sm text-emerald-700">${e(t("已連線至 QSIS 資料庫","Connected to QSIS database"))} <strong>${e(d.database||"")}</strong>。</p>`:`<p class="text-sm text-red-600">${e(t("連線失敗：","Connection failed: ")+(d.error||""))}</p>`:`<p class="text-sm text-amber-700">${e(t("請在 .env 設定 QSIS_DB_* 變數（見 .env.example）。","Configure QSIS_DB_* in .env (see .env.example)."))}</p>`}
                <p class="text-xs text-slate-500 mt-2">${e(t("此連線為唯讀用途。","Read-only connection."))}</p>
            </div>
            ${p?`
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6 space-y-4" id="qsis-panel">
                <div class="grid sm:grid-cols-2 gap-4">
                    <label class="block text-sm font-medium text-slate-700">${e(t("QSIS 學年","QSIS year"))}
                        <select id="qsis-year" class="mt-1 w-full border rounded-lg px-3 py-2">${I}</select>
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
                    <li>${e(t("QSIS 課程已不含任教老師欄位，匯入時一律使用上方所選的預設任教老師。","QSIS courses no longer include teacher fields; import uses the default teacher selected above."))}</li>
                    <li>${e(t("已存在同名同學年課程或同學號學生會略過，不會覆寫密碼。","Existing same-year courses or student IDs are skipped; passwords are never overwritten."))}</li>
                </ul>
            </div>`,x(a),!p)return;const b=document.getElementById("qsis-flash"),y=document.getElementById("qsis-courses");async function f(){const i=document.getElementById("qsis-year").value,v=document.getElementById("qsis-kla").value;y.innerHTML=`<p class="p-3 text-slate-500 text-sm">${e(t("載入課程…","Loading courses…"))}</p>`;try{const w=(await n.ScienceApi.apiFetch(`/admin/qsis/courses?year_id=${encodeURIComponent(i)}&kla_id=${encodeURIComponent(v)}`)).courses||[];if(!w.length){y.innerHTML=`<p class="p-3 text-slate-500 text-sm">${e(t("此條件下沒有課程。","No courses for this filter."))}</p>`;return}y.innerHTML=`<ul class="divide-y divide-slate-100">${w.map(u=>`<li class="px-3 py-2 text-sm flex items-center gap-2">
                        <input type="checkbox" class="qsis-course-cb" value="${Number(u.course_id)}" checked>
                        <span class="flex-1">${e(u.name||"#"+u.course_id)}${u.class?' <span class="text-slate-500">('+e(u.class)+")</span>":""}</span>
                        <span class="text-xs text-slate-400">${u.level?"S"+Number(u.level):""}</span>
                        <span class="text-xs text-slate-400">${Number(u.student_count||0)} ${e(t("人","students"))}</span>
                        <span class="text-xs text-slate-400 font-mono">#${Number(u.course_id)}</span>
                    </li>`).join("")}</ul>`;const c=document.getElementById("qsis-select-all");c&&(c.checked=!0,c.onchange=()=>{y.querySelectorAll(".qsis-course-cb").forEach(u=>{u.checked=c.checked})})}catch(L){y.innerHTML=`<p class="p-3 text-red-600 text-sm">${e(L.message||t("載入失敗","Load failed"))}</p>`}}document.getElementById("qsis-year").addEventListener("change",f),document.getElementById("qsis-kla").addEventListener("change",f),await f(),a.querySelectorAll(".qsis-import-btn").forEach(i=>{i.addEventListener("click",async()=>{const v=i.getAttribute("data-mode"),L=Array.from(y.querySelectorAll(".qsis-course-cb:checked")).map(c=>Number(c.value)).filter(c=>c>0);if(!L.length){m(b,t("請至少勾選一門課程。","Select at least one course."),!0),b.classList.remove("hidden");return}const w=a.querySelectorAll(".qsis-import-btn");w.forEach(c=>{c.disabled=!0}),m(b,t("匯入中…","Importing…"),!1),b.classList.remove("hidden");try{const c=await n.ScienceApi.apiFetch("/admin/qsis/import",{method:"POST",body:{mode:v,year_id:document.getElementById("qsis-year").value,course_ids:L,teacher_user_id:Number(document.getElementById("qsis-teacher").value)||0,enroll:document.getElementById("qsis-enroll").checked,update_existing:document.getElementById("qsis-update").checked}}),u=JSON.stringify(c).slice(0,400);m(b,t("匯入完成。","Import finished. ")+u,!1)}catch(c){m(b,c.message||t("匯入失敗","Import failed"),!0)}finally{w.forEach(c=>{c.disabled=!1})}})})}Object.assign(n.AppAdmin||(n.AppAdmin={}),{renderAdminDbExport:D,renderAdminDbImport:C,renderAdminDataDictionary:B,renderAdminQsisImport:N});
