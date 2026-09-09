const n=window;function e(s,a){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(s,a):s}function t(s){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(s):String(s||"")}function z(s){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(s):String(s||"")}function K(){return(n.ScienceApi&&typeof n.ScienceApi.SITE_BASE=="string"?n.ScienceApi.SITE_BASE:typeof n.__SITE_BASE__=="string"?n.__SITE_BASE__:"")+"/codespace/index.html"}function M(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function R(){return n.ScienceApi.getUser()?!!n.ScienceApi.hasPermission("user.manage"):(n.AppRouter.navigate("/login"),!1)}function _(s){s.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",l=>{l.preventDefault(),n.AppRouter.navigate(a.getAttribute("data-spa-nav"))})})}function p(s,a,l){s&&(s.textContent=a,s.classList.remove("hidden","text-emerald-700","text-red-600","bg-emerald-50","bg-red-50","border-emerald-200","border-red-200"),s.classList.add(l?"text-red-600":"text-emerald-700"),s.classList.contains("border")&&s.classList.add(l?"bg-red-50":"bg-emerald-50",l?"border-red-200":"border-emerald-200"))}function Y(s){const a=s.display_name||s.name_zh||s.name_en||"",l=s.email||"";return l?`${a} (${l})`:a||"#"+s.id}function G(s){let a=s.yearText||(s.yearFrom||"")+"-"+(s.yearEnd||"");return s.thisYear&&(a+=e("（本學年）"," (current)")),`${a} [${s.yearId}]`}function J(s){const a=(s.kla_name_zh||"").trim(),l=(s.kla_name_en||"").trim(),i=(s.kla_code||"").trim();let u=a||l||i||"#"+s.kla_id;return i&&u!==i&&(u+=" ["+i+"]"),u}function L(s){const a=(l,i,u)=>{const b=s===u?"text-indigo-800 font-semibold":"text-slate-600 hover:underline";return`<a href="${t(z(l))}" data-spa-nav="${t(l)}" class="${b}">${t(i)}</a>`};return`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(z("/admin"))}" data-spa-nav="/admin" class="text-indigo-700 hover:underline">${t(e("← 管理首頁","← Admin home"))}</a>
                <a href="${t(K())}" target="_blank" rel="noopener" class="text-slate-600 hover:underline">Code Space ↗</a>
                ${a("/admin/db",e("資料庫管理","Database"),"db")}
                ${a("/admin/qsis-import","QSIS","qsis")}
                ${a("/admin/data-dictionary",e("資料字典","Dictionary"),"dict")}
            </div>`}async function V(s){const a=await s.blob(),l=s.headers.get("Content-Disposition")||"",i=/filename="([^"]+)"/.exec(l),u=i?i[1]:"database_"+Date.now()+".sql",y=URL.createObjectURL(a),b=document.createElement("a");return b.href=y,b.download=u,document.body.appendChild(b),b.click(),b.remove(),URL.revokeObjectURL(y),u}function j(s){if(s=Number(s)||0,s>=1048576){const a=s/1048576;return(a>=10?a.toFixed(0):a.toFixed(1))+" MB"}return s>=1024?(s/1024).toFixed(1)+" KB":s+" B"}function q(s){return Array.from(s.querySelectorAll(".db-backup-cb:checked")).map(a=>String(a.value||"")).filter(Boolean)}async function P(){M();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("資料庫管理","Database management")),!R()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${L("db")}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,_(a);let l;try{l=await n.ScienceApi.apiFetch("/admin/db/backups")}catch(o){a.innerHTML=`${L("db")}<p class="text-red-600">${t(o.message||e("載入失敗","Load failed"))}</p>`,_(a);return}const i=!!l.wipe_allowed,u=l.confirm_phrase||"DELETE ALL TABLES",y=l.app_env||"",b=l.schema_name||"",S=l.table_count!=null?Number(l.table_count):null,T=l.upload_max_filesize||"",D=l.post_max_size||"",h="border border-slate-800 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed";function k(o){return o.length?o.map(m=>`
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="px-3 py-2 w-10">
                        <input type="checkbox" class="db-backup-cb h-4 w-4" value="${t(m.filename)}">
                    </td>
                    <td class="px-3 py-2 text-sm whitespace-nowrap">${t(m.mtime_hkt||"")}</td>
                    <td class="px-3 py-2 text-sm font-mono break-all">${t(m.filename)}</td>
                    <td class="px-3 py-2 text-sm whitespace-nowrap text-right">${t(j(m.size))}</td>
                </tr>`).join(""):`<tr><td colspan="4" class="px-4 py-8 text-center text-sm text-slate-500">${t(e("尚無備份檔。請按「立即備份」。","No backups yet. Click Backup now."))}</td></tr>`}a.innerHTML=`
            ${L("db")}
            <p id="db-manage-flash" class="text-sm rounded-lg px-4 py-3 border hidden mb-4"></p>
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div class="bg-slate-800 text-white text-center py-2.5 font-semibold tracking-wide">
                    ${t(e("資料庫管理","Database management"))}
                </div>
                <div class="px-5 py-4 space-y-4">
                    <p class="text-sm text-slate-600 leading-relaxed">
                        ${t(e("按「立即備份」將目前資料庫 SQL 存到伺服器 backup/ 資料夾。可勾選一或多個檔案下載或刪除。匯入須恰好選取一個備份檔（或上載本機檔）並輸入確認片語。","Click Backup now to save SQL into the server backup/ folder. Select one or more files to download or delete. Import requires exactly one backup (or a local upload) and the confirmation phrase."))}
                    </p>
                    <p class="text-sm text-slate-600">
                        ${b?`${t(e("目前資料庫","Current database"))} <code class="font-mono text-xs bg-slate-100 px-1 rounded">${t(b)}</code>`:""}
                        ${S!=null&&!Number.isNaN(S)?` ${t(e("約有","has about"))} <strong>${t(String(S))}</strong> ${t(e("張資料表。","tables."))}`:""}
                    </p>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" id="db-backup-now" class="${h}">${t(e("立即備份","Backup now"))}</button>
                        <button type="button" id="db-download-sel" class="${h}" disabled>${t(e("下載選取","Download selected"))}</button>
                        <button type="button" id="db-import-sel" class="${h}" disabled>${t(e("匯入選取…","Import selected…"))}</button>
                        <button type="button" id="db-delete-sel" class="${h}" disabled>${t(e("刪除選取","Delete selected"))}</button>
                        <span id="db-sel-label" class="ml-auto text-sm text-slate-500">${t(e("未選取","None selected"))}</span>
                    </div>
                    <div class="overflow-x-auto border border-slate-200 rounded-lg">
                        <table class="min-w-full">
                            <thead class="bg-slate-800 text-white text-sm">
                                <tr>
                                    <th class="px-3 py-2 w-10 text-left">
                                        <input type="checkbox" id="db-select-all" class="h-4 w-4" aria-label="${t(e("全選","Select all"))}">
                                    </th>
                                    <th class="px-3 py-2 text-left font-medium">${t(e("備份日期和時間","Backup date and time"))}</th>
                                    <th class="px-3 py-2 text-left font-medium">${t(e("檔名","File name"))}</th>
                                    <th class="px-3 py-2 text-right font-medium">${t(e("大小","Size"))}</th>
                                </tr>
                            </thead>
                            <tbody id="db-backup-tbody">${k(l.files||[])}</tbody>
                        </table>
                    </div>
                    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-4 space-y-4 ${i?"":"opacity-60"}">
                        <h3 class="font-semibold text-red-900">${t(e("匯入資料庫","Import database"))}</h3>
                        <p class="text-sm text-red-900 leading-relaxed">
                            <strong>${t(e("警告：","Warning: "))}</strong>
                            ${t(e("匯入會先刪除目前全部資料表與檢視（無法復原），再執行 SQL。必須輸入片語","Import drops all current tables and views (irreversible), then runs the SQL. Type the phrase"))}
                            <code class="font-mono text-xs">${t(u)}</code>
                            ${t(e("才能繼續。"," to continue."))}
                        </p>
                        <p class="text-sm rounded-lg px-3 py-2 border ${i?"bg-amber-50 border-amber-200 text-amber-900":"bg-red-100 border-red-300 text-red-900"}">
                            ${t(e("目前","Current"))} <code class="font-mono text-xs">APP_ENV=${t(y)}</code>。
                            ${t(i?e("此環境允許清空匯入；仍須勾選確認並輸入片語。","Wipe import is allowed; checkbox and phrase are still required."):e("生產環境預設拒絕清空匯入。緊急還原請於 .env 設 APP_ALLOW_DB_WIPE=1（用畢請移除）。","Production blocks wipe import by default. Set APP_ALLOW_DB_WIPE=1 in .env for emergency restore, then remove it."))}
                        </p>
                        <form id="db-import-form" class="space-y-4 ${i?"":"pointer-events-none"}">
                            <div>
                                <label for="sql_file" class="block text-sm font-medium text-slate-800 mb-1">${t(e("本機 SQL 檔案","Local SQL file"))}</label>
                                <input type="file" id="sql_file" name="sql_file" accept=".sql,text/plain"
                                    class="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm" ${i?"":"disabled"}>
                                <p class="text-xs text-slate-500 mt-1">${t(e("選擇本機檔會清除上方表格勾選。","Choosing a local file clears table selections."))}
                                    ${T?` PHP upload_max_filesize=${t(T)}${D?`, post_max_size=${t(D)}`:""}.`:""}</p>
                            </div>
                            <label class="flex items-start gap-2 text-sm text-slate-800">
                                <input type="checkbox" id="confirm_wipe" name="confirm_wipe" value="1" class="mt-1" ${i?"":"disabled"}>
                                <span>${t(e("我了解此操作會刪除現有全部資料表並以 SQL 取代。","I understand this deletes all existing tables and replaces them with the SQL file."))}</span>
                            </label>
                            <div>
                                <label for="confirm_phrase" class="block text-sm font-medium text-slate-800 mb-1">
                                    ${t(e("請輸入確認片語","Type confirmation phrase"))}
                                    <code class="font-mono text-xs ml-1">${t(u)}</code>
                                </label>
                                <input type="text" id="confirm_phrase" name="confirm_phrase" autocomplete="off"
                                    class="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" ${i?"":"disabled"}>
                            </div>
                            <button type="submit" class="bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-800 disabled:opacity-50" ${i?"":"disabled"}>
                                ${t(e("刪除全部資料表並匯入","Drop all tables and import"))}
                            </button>
                        </form>
                    </div>
                </div>
            </div>`,_(a);const r=document.getElementById("db-manage-flash"),Q=document.getElementById("db-backup-tbody"),C=document.getElementById("db-sel-label"),f=document.getElementById("db-select-all"),w=document.getElementById("db-backup-now"),A=document.getElementById("db-download-sel"),B=document.getElementById("db-import-sel"),d=document.getElementById("db-delete-sel"),$=document.getElementById("sql_file"),E=document.getElementById("db-import-form");function v(){const m=q(a).length;C.textContent=m===0?e("未選取","None selected"):e(`已選 ${m} 項`,`${m} selected`),A.disabled=m<1,B.disabled=!i||m!==1,d.disabled=m<1;const g=a.querySelectorAll(".db-backup-cb");f&&(f.checked=g.length>0&&m===g.length,f.indeterminate=m>0&&m<g.length)}function I(){a.querySelectorAll(".db-backup-cb").forEach(o=>{o.addEventListener("change",v)}),v()}async function c(){const o=await n.ScienceApi.apiFetch("/admin/db/backups");Q.innerHTML=k(o.files||[]),f&&(f.checked=!1,f.indeterminate=!1),I()}function F(){return i?document.getElementById("confirm_wipe").checked?String(document.getElementById("confirm_phrase").value||"").trim()!==u?(p(r,e("請在確認欄正確輸入「","Type the phrase “")+u+e("」。","”."),!0),r.classList.remove("hidden"),!1):!0:(p(r,e("請勾選確認：您了解此操作會刪除現有全部資料表。","Tick the confirmation checkbox first."),!0),r.classList.remove("hidden"),!1):(p(r,e("目前環境禁止清空匯入。","Wipe import is blocked in this environment."),!0),r.classList.remove("hidden"),!1)}I(),f&&f.addEventListener("change",()=>{a.querySelectorAll(".db-backup-cb").forEach(o=>{o.checked=f.checked}),v()}),$&&$.addEventListener("change",()=>{$.files&&$.files[0]&&(a.querySelectorAll(".db-backup-cb").forEach(o=>{o.checked=!1}),f&&(f.checked=!1,f.indeterminate=!1),v())}),w.addEventListener("click",async()=>{w.disabled=!0,p(r,e("正在備份，請稍候…","Backing up…"),!1),r.classList.remove("hidden");try{const o=await n.ScienceApi.apiFetch("/admin/db/backups",{method:"POST",body:{}});await c(),p(r,e("已寫入 ","Saved ")+(o.filename||"")+(o.size!=null?` (${j(o.size)})`:""),!1)}catch(o){p(r,o.message||e("備份失敗","Backup failed"),!0)}finally{w.disabled=!1}}),A.addEventListener("click",async()=>{const o=q(a);if(o.length){A.disabled=!0,p(r,e("正在下載…","Downloading…"),!1),r.classList.remove("hidden");try{for(const m of o){const g=await n.ScienceApi.apiFetch("/admin/db/backups/"+encodeURIComponent(m),{rawResponse:!0});await V(g)}p(r,e("已開始下載選取檔案。","Download started for selected files."),!1)}catch(m){p(r,m.message||e("下載失敗","Download failed"),!0)}finally{v()}}});async function H(o){if(!F())return;const m=E.querySelector('button[type="submit"]'),g=[w,A,B,d,m];g.forEach(x=>{x&&(x.disabled=!0)}),p(r,e("正在匯入，請稍候…","Importing…"),!1),r.classList.remove("hidden");try{let x;if(o.file){const N=new FormData;N.append("sql_file",o.file),N.append("confirm_wipe","1"),N.append("confirm_phrase",String(document.getElementById("confirm_phrase").value||"").trim()),x=await n.ScienceApi.apiFetch("/admin/db/import",{method:"POST",body:N})}else x=await n.ScienceApi.apiFetch("/admin/db/import",{method:"POST",body:{backup_filename:o.backupFilename,confirm_wipe:!0,confirm_phrase:String(document.getElementById("confirm_phrase").value||"").trim()}});const U=x.tables!=null?x.tables:"?",O=x.dropped!=null?x.dropped:"?";p(r,e(`匯入完成：刪除 ${O} 張表，現有 ${U} 張表。`,`Import done: dropped ${O}, now ${U} tables.`),!1),await c()}catch(x){p(r,x.message||e("匯入失敗","Import failed"),!0)}finally{g.forEach(x=>{x&&(x.disabled=!1)}),v()}}B.addEventListener("click",async()=>{const o=q(a);if(o.length!==1){p(r,e("匯入請恰好勾選一個備份檔。","Select exactly one backup file to import."),!0),r.classList.remove("hidden");return}await H({backupFilename:o[0]})}),d.addEventListener("click",async()=>{const o=q(a);if(!(!o.length||!window.confirm(e(`確定刪除 ${o.length} 個備份檔？此操作無法復原。`,`Delete ${o.length} backup file(s)? This cannot be undone.`)))){d.disabled=!0,p(r,e("正在刪除…","Deleting…"),!1),r.classList.remove("hidden");try{const g=await n.ScienceApi.apiFetch("/admin/db/backups/delete",{method:"POST",body:{filenames:o}}),x=g.deleted&&g.deleted.length||0;await c(),p(r,e(`已刪除 ${x} 個檔案。`,`Deleted ${x} file(s).`),!1)}catch(g){p(r,g.message||e("刪除失敗","Delete failed"),!0)}finally{v()}}}),E.addEventListener("submit",async o=>{o.preventDefault();const m=$&&$.files&&$.files[0]?$.files[0]:null,g=q(a);if(m){await H({file:m});return}if(g.length===1){await H({backupFilename:g[0]});return}p(r,e("請選擇一個本機 SQL 檔，或恰好勾選一個備份檔。","Choose a local SQL file, or select exactly one backup."),!0),r.classList.remove("hidden")})}async function X(){await P()}async function Z(){await P()}async function W(){M();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("資料字典","Data dictionary")),!R()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${L("dict")}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,_(a);let l;try{l=await n.ScienceApi.apiFetch("/admin/data-dictionary")}catch(y){a.innerHTML=`${L("dict")}<p class="text-red-600">${t(y.message||e("載入失敗","Load failed"))}</p>`,_(a);return}const i=!!l.exists;let u="";i&&n.AppMarkdown&&n.AppMarkdown.renderMarkdownToHtml?u=n.AppMarkdown.renderMarkdownToHtml(l.markdown||""):i&&(u=`<pre class="whitespace-pre-wrap text-xs">${t(l.markdown||"")}</pre>`),a.innerHTML=`
            ${L("dict")}
            <p id="dd-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="text-sm text-slate-600 space-y-1">
                    <p><strong class="text-slate-800">${t(e("來源","Source"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">schema.sql</code>
                        <span class="text-slate-400">（${t(l.schema_mtime||"—")}）</span></p>
                    <p><strong class="text-slate-800">${t(e("文件","File"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">data_dictionary.md</code>
                        ${i?`· ${Number(l.size||0).toLocaleString()} bytes · ${t(l.mtime||"")}`:`· <span class="text-amber-700">${t(e("尚未產生","Not generated"))}</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="dd-regenerate-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                        ${t(e("重新產生","Regenerate"))}
                    </button>
                </div>
            </div>
            ${i?`<article id="dd-body" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 overflow-x-auto prose prose-slate max-w-none">${u}</article>`:`<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-sm">${t(e("尚未找到 data_dictionary.md。請按「重新產生」。","data_dictionary.md missing. Click Regenerate."))}</div>`}`,_(a),document.getElementById("dd-regenerate-btn").addEventListener("click",async()=>{const y=document.getElementById("dd-regenerate-btn"),b=document.getElementById("dd-flash");y.disabled=!0,p(b,e("產生中…","Generating…"),!1),b.classList.remove("hidden");try{const S=await n.ScienceApi.apiFetch("/admin/data-dictionary/regenerate",{method:"POST",body:{}});p(b,e(`已更新（${S.table_count||0} 張資料表）。重新載入中…`,`Updated (${S.table_count||0} tables). Reloading…`),!1),await W()}catch(S){p(b,S.message||e("產生失敗","Regenerate failed"),!0),y.disabled=!1}})}async function ee(){M();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("QSIS 匯入","QSIS import")),!R()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}const l=n.ScienceApi.getUser();a.innerHTML=`${L("qsis")}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,_(a);let i;try{i=await n.ScienceApi.apiFetch("/admin/qsis/status")}catch(d){a.innerHTML=`${L("qsis")}<p class="text-red-600">${t(d.message||e("載入失敗","Load failed"))}</p>`,_(a);return}const u=i.connection||{},y=!!(i.configured&&u.ok),b=i.years||[],S=i.klas||[],T=i.teachers||[],D=String(i.current_year_id||b[0]&&b[0].yearId||""),h=String(i.suggested_year_id||D),k=String(i.local_school_year||""),r=b.map(d=>`<option value="${t(d.yearId)}" ${String(d.yearId)===h?"selected":""}>${t(G(d))}</option>`).join(""),Q=[`<option value="0">${t(e("全部 KLA","All KLAs"))}</option>`].concat(S.map(d=>`<option value="${Number(d.kla_id)}">${t(J(d))}</option>`)).join(""),C=T.map(d=>`<option value="${Number(d.id)}" ${l&&Number(d.id)===Number(l.id)?"selected":""}>${t(Y(d))}</option>`).join("");if(a.innerHTML=`
            ${L("qsis")}
            <p id="qsis-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <h2 class="text-lg font-bold text-slate-800 mb-2">${t(e("QSIS 資料庫連線","QSIS connection"))}</h2>
                ${i.configured?y?`<p class="text-sm text-emerald-700">${t(e("已連線至 QSIS 資料庫","Connected to QSIS database"))} <strong>${t(u.database||"")}</strong>。</p>`:`<p class="text-sm text-red-600">${t(e("連線失敗：","Connection failed: ")+(u.error||""))}</p>`:`<p class="text-sm text-amber-700">${t(e("請在 .env 設定 QSIS_DB_* 變數（見 .env.example）。","Configure QSIS_DB_* in .env (see .env.example)."))}</p>`}
                <p class="text-xs text-slate-500 mt-2">${t(e("此連線為唯讀用途。","Read-only connection."))}</p>
            </div>
            ${y?`
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6 space-y-4" id="qsis-panel">
                <div class="grid sm:grid-cols-2 gap-4">
                    <label class="block text-sm font-medium text-slate-700">${t(e("QSIS 學年","QSIS year"))}
                        <select id="qsis-year" class="mt-1 w-full border rounded-lg px-3 py-2">${r}</select>
                    </label>
                    <p id="qsis-year-hint" class="sm:col-span-2 text-sm"></p>
                    <label class="block text-sm font-medium text-slate-700">${t(e("學習領域（KLA）","KLA"))}
                        <select id="qsis-kla" class="mt-1 w-full border rounded-lg px-3 py-2">${Q}</select>
                    </label>
                </div>
                <label class="block text-sm font-medium text-slate-700">${t(e("預設任教老師","Default teacher"))}
                    <select id="qsis-teacher" class="mt-1 w-full border rounded-lg px-3 py-2">${C}</select>
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
                        <label class="flex items-center gap-2"><input type="checkbox" id="qsis-update"> ${t(e("更新已存在學生的姓名、年級與學號（班別）","Update existing student names, form level and class"))}</label>
                    </div>
                </div>
            </div>`:""}
            <div class="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
                <h3 class="font-semibold text-slate-800 mb-2">${t(e("說明","Notes"))}</h3>
                <ul class="list-disc pl-5 space-y-1">
                    <li>${t(e("匯入後可至課程管理檢視邀請碼與名單。","After import, review invite codes and rosters under Courses."))}</li>
                    <li>${t(e("QSIS 課程已不含任教老師欄位，匯入時一律使用上方所選的預設任教老師。","QSIS courses no longer include teacher fields; import uses the default teacher selected above."))}</li>
                    <li>${t(e("已存在同名同學年課程或同學號學生會略過，不會覆寫密碼。未勾選「更新已存在學生」時，亦不會覆寫年級／班別。","Existing same-year courses or student IDs are skipped; passwords are never overwritten. Form level and class are not overwritten unless “update existing students” is checked."))}</li>
                </ul>
            </div>`,_(a),!y)return;const f=document.getElementById("qsis-flash"),w=document.getElementById("qsis-courses");function A(){const d=document.getElementById("qsis-year-hint");if(!d)return;const $=document.getElementById("qsis-year").value;h&&$!==h?(d.className="sm:col-span-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2",d.textContent=e(`所選學年與本地課程（${k||h}）不同。QSIS 若已升班，匯入可能把學生改成新學年班別。暑期功課請選 ${h}。`,`Selected year differs from local courses (${k||h}). If QSIS has already promoted students, import may overwrite class/form. For summer homework use ${h}.`)):(d.className="sm:col-span-2 text-xs text-slate-500",d.textContent=k?e(`預設對齊本地課程學年 ${k}。`,`Defaults to local course year ${k}.`):"")}async function B(){const d=document.getElementById("qsis-year").value,$=document.getElementById("qsis-kla").value;w.innerHTML=`<p class="p-3 text-slate-500 text-sm">${t(e("載入課程…","Loading courses…"))}</p>`;try{const v=(await n.ScienceApi.apiFetch(`/admin/qsis/courses?year_id=${encodeURIComponent(d)}&kla_id=${encodeURIComponent($)}`)).courses||[];if(!v.length){w.innerHTML=`<p class="p-3 text-slate-500 text-sm">${t(e("此條件下沒有課程。","No courses for this filter."))}</p>`;return}w.innerHTML=`<ul class="divide-y divide-slate-100">${v.map(c=>`<li class="px-3 py-2 text-sm flex items-center gap-2">
                        <input type="checkbox" class="qsis-course-cb" value="${Number(c.course_id)}" checked>
                        <span class="flex-1">${t(c.name||"#"+c.course_id)}${c.class?' <span class="text-slate-500">('+t(c.class)+")</span>":""}</span>
                        <span class="text-xs text-slate-400">${c.level?"S"+Number(c.level):""}</span>
                        <span class="text-xs text-slate-400">${Number(c.student_count||0)} ${t(e("人","students"))}</span>
                        <span class="text-xs text-slate-400 font-mono">#${Number(c.course_id)}</span>
                    </li>`).join("")}</ul>`;const I=document.getElementById("qsis-select-all");I&&(I.checked=!0,I.onchange=()=>{w.querySelectorAll(".qsis-course-cb").forEach(c=>{c.checked=I.checked})})}catch(E){w.innerHTML=`<p class="p-3 text-red-600 text-sm">${t(E.message||e("載入失敗","Load failed"))}</p>`}}document.getElementById("qsis-year").addEventListener("change",()=>{A(),B()}),document.getElementById("qsis-kla").addEventListener("change",B),A(),await B(),a.querySelectorAll(".qsis-import-btn").forEach(d=>{d.addEventListener("click",async()=>{const $=d.getAttribute("data-mode"),E=Array.from(w.querySelectorAll(".qsis-course-cb:checked")).map(c=>Number(c.value)).filter(c=>c>0);if(!E.length){p(f,e("請至少勾選一門課程。","Select at least one course."),!0),f.classList.remove("hidden");return}const v=document.getElementById("qsis-year").value;if(h&&v!==h&&!window.confirm(e(`所選 QSIS 學年 [${v}] 與本地課程學年 [${k||h}] 不同。繼續可能把學生年級／班別改成升班後資料。確定匯入？`,`QSIS year [${v}] differs from local courses [${k||h}]. Continuing may overwrite students with promoted class data. Import anyway?`)))return;const I=a.querySelectorAll(".qsis-import-btn");I.forEach(c=>{c.disabled=!0}),p(f,e("匯入中…","Importing…"),!1),f.classList.remove("hidden");try{const c=await n.ScienceApi.apiFetch("/admin/qsis/import",{method:"POST",body:{mode:$,year_id:document.getElementById("qsis-year").value,course_ids:E,teacher_user_id:Number(document.getElementById("qsis-teacher").value)||0,enroll:document.getElementById("qsis-enroll").checked,update_existing:document.getElementById("qsis-update").checked}}),F=JSON.stringify(c).slice(0,400);p(f,e("匯入完成。","Import finished. ")+F,!1)}catch(c){p(f,c.message||e("匯入失敗","Import failed"),!0)}finally{I.forEach(c=>{c.disabled=!1})}})})}Object.assign(n.AppAdmin||(n.AppAdmin={}),{renderAdminDbManage:P,renderAdminDbExport:X,renderAdminDbImport:Z,renderAdminDataDictionary:W,renderAdminQsisImport:ee});
