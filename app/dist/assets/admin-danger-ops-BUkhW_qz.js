const n=window;function e(s,a){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(s,a):s}function t(s){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(s):String(s||"")}function A(s){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(s):String(s||"")}function R(){return(n.ScienceApi&&typeof n.ScienceApi.SITE_BASE=="string"?n.ScienceApi.SITE_BASE:typeof n.__SITE_BASE__=="string"?n.__SITE_BASE__:"")+"/codespace/index.html"}function q(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function B(){return n.ScienceApi.getUser()?!!n.ScienceApi.hasPermission("user.manage"):(n.AppRouter.navigate("/login"),!1)}function f(s){s.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",o=>{o.preventDefault(),n.AppRouter.navigate(a.getAttribute("data-spa-nav"))})})}function u(s,a,o){s&&(s.textContent=a,s.classList.remove("hidden","text-emerald-700","text-red-600","bg-emerald-50","bg-red-50","border-emerald-200","border-red-200"),s.classList.add(o?"text-red-600":"text-emerald-700"),s.classList.contains("border")&&s.classList.add(o?"bg-red-50":"bg-emerald-50",o?"border-red-200":"border-emerald-200"))}function C(s){const a=s.display_name||s.name_zh||s.name_en||"",o=s.email||"";return o?`${a} (${o})`:a||"#"+s.id}function D(s){let a=s.yearText||(s.yearFrom||"")+"-"+(s.yearEnd||"");return s.thisYear&&(a+=e("（本學年）"," (current)")),`${a} [${s.yearId}]`}function N(s){const a=(s.kla_name_zh||"").trim(),o=(s.kla_name_en||"").trim(),r=(s.kla_code||"").trim();let l=a||o||r||"#"+s.kla_id;return r&&l!==r&&(l+=" ["+r+"]"),l}function x(){return`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(A("/admin"))}" data-spa-nav="/admin" class="text-indigo-700 hover:underline">${t(e("← 管理首頁","← Admin home"))}</a>
                <a href="${t(R())}" target="_blank" rel="noopener" class="text-slate-600 hover:underline">Code Space ↗</a>
                <a href="${t(A("/admin/db-export"))}" data-spa-nav="/admin/db-export" class="text-slate-600 hover:underline">${t(e("匯出","Export"))}</a>
                <a href="${t(A("/admin/db-import"))}" data-spa-nav="/admin/db-import" class="text-slate-600 hover:underline">${t(e("匯入","Import"))}</a>
                <a href="${t(A("/admin/qsis-import"))}" data-spa-nav="/admin/qsis-import" class="text-slate-600 hover:underline">QSIS</a>
                <a href="${t(A("/admin/data-dictionary"))}" data-spa-nav="/admin/data-dictionary" class="text-slate-600 hover:underline">${t(e("資料字典","Dictionary"))}</a>
            </div>`}async function F(s){const a=await s.blob(),o=s.headers.get("Content-Disposition")||"",r=/filename="([^"]+)"/.exec(o),l=r?r[1]:"database_"+Date.now()+".sql",m=URL.createObjectURL(a),c=document.createElement("a");return c.href=m,c.download=l,document.body.appendChild(c),c.click(),c.remove(),URL.revokeObjectURL(m),l}async function U(){q();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("匯出資料庫","Export database")),!B()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`
            ${x()}
            <p id="db-export-flash" class="text-sm mb-4 hidden"></p>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">
                ${t(e("下載目前 .env 所連線之整個 MySQL 資料庫結構與資料（僅一般資料表，不含 VIEW）。檔案可能含敏感資料，請妥善保管。","Download a full SQL dump of the database configured in .env (base tables only, no views). Treat the file as sensitive."))}
            </p>
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <button type="button" id="db-export-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    ${t(e("一鍵下載 SQL 備份","Download SQL backup"))}
                </button>
            </div>`,f(a);const o=document.getElementById("db-export-btn"),r=document.getElementById("db-export-flash");o.addEventListener("click",async()=>{o.disabled=!0,u(r,e("正在匯出，請稍候…","Exporting…"),!1),r.classList.remove("hidden");try{const l=await n.ScienceApi.apiFetch("/admin/db/export",{method:"POST",body:{},rawResponse:!0}),m=await F(l);u(r,e("已開始下載 ","Download started: ")+m,!1)}catch(l){u(r,l.message||e("匯出失敗","Export failed"),!0)}finally{o.disabled=!1}})}async function P(){q();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("匯入資料庫","Import database")),!B()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${x()}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,f(a);let o;try{o=await n.ScienceApi.apiFetch("/admin/db/import-status")}catch(w){a.innerHTML=`${x()}<p class="text-red-600">${t(w.message||e("載入失敗","Load failed"))}</p>`,f(a);return}const r=!!o.wipe_allowed,l=o.confirm_phrase||"DELETE ALL TABLES",m=o.app_env||"",c=o.schema_name||"";a.innerHTML=`
            ${x()}
            <p class="text-sm text-slate-600 leading-relaxed mb-3">
                ${t(e("將上載的 SQL 匯入目前 .env 資料庫","Import uploaded SQL into the .env database"))}
                ${c?` <strong>${t(c)}</strong>`:""}。
                ${t(e("匯入前會先刪除該庫內所有現有資料表，無法復原。建議先匯出備份。","All existing tables are dropped first. This cannot be undone. Export a backup first."))}
            </p>
            <p class="text-sm rounded-lg px-4 py-3 border mb-4 ${r?"bg-amber-50 border-amber-200 text-amber-900":"bg-red-50 border-red-200 text-red-800"}">
                ${t(e("目前","Current"))} <code class="font-mono text-xs">APP_ENV=${t(m)}</code>。
                ${r?t(e("此環境允許清空匯入；仍須勾選確認並輸入片語 ","Wipe import allowed; still require checkbox and phrase "))+`<code class="font-mono text-xs">${t(l)}</code>。`:t(e("生產環境預設拒絕清空匯入。緊急還原請於 .env 設 APP_ALLOW_DB_WIPE=1（用畢請移除）。","Production blocks wipe import by default. Set APP_ALLOW_DB_WIPE=1 in .env for emergency restore, then remove it."))}
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
                        <code class="font-mono text-xs ml-1">${t(l)}</code>
                    </label>
                    <input type="text" id="confirm_phrase" name="confirm_phrase" autocomplete="off"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" ${r?"":"disabled"}>
                </div>
                <button type="submit" class="bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-800" ${r?"":"disabled"}>
                    ${t(e("清空並匯入","Wipe and import"))}
                </button>
            </form>`,f(a);const g=document.getElementById("db-import-form"),$=document.getElementById("db-import-flash");g.addEventListener("submit",async w=>{if(w.preventDefault(),!r)return;const p=document.getElementById("sql_file"),h=document.getElementById("confirm_wipe").checked,T=String(document.getElementById("confirm_phrase").value||"").trim();if(!p.files||!p.files[0]){u($,e("請選擇 SQL 檔案。","Choose an SQL file."),!0),$.classList.remove("hidden");return}const S=new FormData;S.append("sql_file",p.files[0]),h&&S.append("confirm_wipe","1"),S.append("confirm_phrase",T);const k=g.querySelector('button[type="submit"]');k.disabled=!0,u($,e("正在匯入，請稍候…","Importing…"),!1),$.classList.remove("hidden");try{const b=await n.ScienceApi.apiFetch("/admin/db/import",{method:"POST",body:S}),y=b.tables!=null?b.tables:"?",L=b.dropped!=null?b.dropped:"?";u($,e(`匯入完成：刪除 ${L} 張表，現有 ${y} 張表。`,`Import done: dropped ${L}, now ${y} tables.`),!1)}catch(b){u($,b.message||e("匯入失敗","Import failed"),!0)}finally{k.disabled=!1}})}async function H(){q();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("資料字典","Data dictionary")),!B()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`${x()}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,f(a);let o;try{o=await n.ScienceApi.apiFetch("/admin/data-dictionary")}catch(m){a.innerHTML=`${x()}<p class="text-red-600">${t(m.message||e("載入失敗","Load failed"))}</p>`,f(a);return}const r=!!o.exists;let l="";r&&n.AppMarkdown&&n.AppMarkdown.renderMarkdownToHtml?l=n.AppMarkdown.renderMarkdownToHtml(o.markdown||""):r&&(l=`<pre class="whitespace-pre-wrap text-xs">${t(o.markdown||"")}</pre>`),a.innerHTML=`
            ${x()}
            <p id="dd-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="text-sm text-slate-600 space-y-1">
                    <p><strong class="text-slate-800">${t(e("來源","Source"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">schema.sql</code>
                        <span class="text-slate-400">（${t(o.schema_mtime||"—")}）</span></p>
                    <p><strong class="text-slate-800">${t(e("文件","File"))}：</strong><code class="text-xs bg-slate-100 px-1 rounded">data_dictionary.md</code>
                        ${r?`· ${Number(o.size||0).toLocaleString()} bytes · ${t(o.mtime||"")}`:`· <span class="text-amber-700">${t(e("尚未產生","Not generated"))}</span>`}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="dd-regenerate-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                        ${t(e("重新產生","Regenerate"))}
                    </button>
                </div>
            </div>
            ${r?`<article id="dd-body" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 overflow-x-auto prose prose-slate max-w-none">${l}</article>`:`<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-sm">${t(e("尚未找到 data_dictionary.md。請按「重新產生」。","data_dictionary.md missing. Click Regenerate."))}</div>`}`,f(a),document.getElementById("dd-regenerate-btn").addEventListener("click",async()=>{const m=document.getElementById("dd-regenerate-btn"),c=document.getElementById("dd-flash");m.disabled=!0,u(c,e("產生中…","Generating…"),!1),c.classList.remove("hidden");try{const g=await n.ScienceApi.apiFetch("/admin/data-dictionary/regenerate",{method:"POST",body:{}});u(c,e(`已更新（${g.table_count||0} 張資料表）。重新載入中…`,`Updated (${g.table_count||0} tables). Reloading…`),!1),await H()}catch(g){u(c,g.message||e("產生失敗","Regenerate failed"),!0),m.disabled=!1}})}async function O(){q();const s=document.getElementById("page-title"),a=document.getElementById("card-container");if(s&&(s.textContent=e("QSIS 匯入","QSIS import")),!B()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}const o=n.ScienceApi.getUser();a.innerHTML=`${x()}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,f(a);let r;try{r=await n.ScienceApi.apiFetch("/admin/qsis/status")}catch(i){a.innerHTML=`${x()}<p class="text-red-600">${t(i.message||e("載入失敗","Load failed"))}</p>`,f(a);return}const l=r.connection||{},m=!!(r.configured&&l.ok),c=r.years||[],g=r.klas||[],$=r.teachers||[],w=String(r.current_year_id||c[0]&&c[0].yearId||""),p=String(r.suggested_year_id||w),h=String(r.local_school_year||""),T=c.map(i=>`<option value="${t(i.yearId)}" ${String(i.yearId)===p?"selected":""}>${t(D(i))}</option>`).join(""),S=[`<option value="0">${t(e("全部 KLA","All KLAs"))}</option>`].concat(g.map(i=>`<option value="${Number(i.kla_id)}">${t(N(i))}</option>`)).join(""),k=$.map(i=>`<option value="${Number(i.id)}" ${o&&Number(i.id)===Number(o.id)?"selected":""}>${t(C(i))}</option>`).join("");if(a.innerHTML=`
            ${x()}
            <p id="qsis-flash" class="text-sm mb-4 hidden"></p>
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <h2 class="text-lg font-bold text-slate-800 mb-2">${t(e("QSIS 資料庫連線","QSIS connection"))}</h2>
                ${r.configured?m?`<p class="text-sm text-emerald-700">${t(e("已連線至 QSIS 資料庫","Connected to QSIS database"))} <strong>${t(l.database||"")}</strong>。</p>`:`<p class="text-sm text-red-600">${t(e("連線失敗：","Connection failed: ")+(l.error||""))}</p>`:`<p class="text-sm text-amber-700">${t(e("請在 .env 設定 QSIS_DB_* 變數（見 .env.example）。","Configure QSIS_DB_* in .env (see .env.example)."))}</p>`}
                <p class="text-xs text-slate-500 mt-2">${t(e("此連線為唯讀用途。","Read-only connection."))}</p>
            </div>
            ${m?`
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6 space-y-4" id="qsis-panel">
                <div class="grid sm:grid-cols-2 gap-4">
                    <label class="block text-sm font-medium text-slate-700">${t(e("QSIS 學年","QSIS year"))}
                        <select id="qsis-year" class="mt-1 w-full border rounded-lg px-3 py-2">${T}</select>
                    </label>
                    <p id="qsis-year-hint" class="sm:col-span-2 text-sm"></p>
                    <label class="block text-sm font-medium text-slate-700">${t(e("學習領域（KLA）","KLA"))}
                        <select id="qsis-kla" class="mt-1 w-full border rounded-lg px-3 py-2">${S}</select>
                    </label>
                </div>
                <label class="block text-sm font-medium text-slate-700">${t(e("預設任教老師","Default teacher"))}
                    <select id="qsis-teacher" class="mt-1 w-full border rounded-lg px-3 py-2">${k}</select>
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
            </div>`,f(a),!m)return;const b=document.getElementById("qsis-flash"),y=document.getElementById("qsis-courses");function L(){const i=document.getElementById("qsis-year-hint");if(!i)return;const _=document.getElementById("qsis-year").value;p&&_!==p?(i.className="sm:col-span-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2",i.textContent=e(`所選學年與本地課程（${h||p}）不同。QSIS 若已升班，匯入可能把學生改成新學年班別。暑期功課請選 ${p}。`,`Selected year differs from local courses (${h||p}). If QSIS has already promoted students, import may overwrite class/form. For summer homework use ${p}.`)):(i.className="sm:col-span-2 text-xs text-slate-500",i.textContent=h?e(`預設對齊本地課程學年 ${h}。`,`Defaults to local course year ${h}.`):"")}async function Q(){const i=document.getElementById("qsis-year").value,_=document.getElementById("qsis-kla").value;y.innerHTML=`<p class="p-3 text-slate-500 text-sm">${t(e("載入課程…","Loading courses…"))}</p>`;try{const I=(await n.ScienceApi.apiFetch(`/admin/qsis/courses?year_id=${encodeURIComponent(i)}&kla_id=${encodeURIComponent(_)}`)).courses||[];if(!I.length){y.innerHTML=`<p class="p-3 text-slate-500 text-sm">${t(e("此條件下沒有課程。","No courses for this filter."))}</p>`;return}y.innerHTML=`<ul class="divide-y divide-slate-100">${I.map(d=>`<li class="px-3 py-2 text-sm flex items-center gap-2">
                        <input type="checkbox" class="qsis-course-cb" value="${Number(d.course_id)}" checked>
                        <span class="flex-1">${t(d.name||"#"+d.course_id)}${d.class?' <span class="text-slate-500">('+t(d.class)+")</span>":""}</span>
                        <span class="text-xs text-slate-400">${d.level?"S"+Number(d.level):""}</span>
                        <span class="text-xs text-slate-400">${Number(d.student_count||0)} ${t(e("人","students"))}</span>
                        <span class="text-xs text-slate-400 font-mono">#${Number(d.course_id)}</span>
                    </li>`).join("")}</ul>`;const v=document.getElementById("qsis-select-all");v&&(v.checked=!0,v.onchange=()=>{y.querySelectorAll(".qsis-course-cb").forEach(d=>{d.checked=v.checked})})}catch(E){y.innerHTML=`<p class="p-3 text-red-600 text-sm">${t(E.message||e("載入失敗","Load failed"))}</p>`}}document.getElementById("qsis-year").addEventListener("change",()=>{L(),Q()}),document.getElementById("qsis-kla").addEventListener("change",Q),L(),await Q(),a.querySelectorAll(".qsis-import-btn").forEach(i=>{i.addEventListener("click",async()=>{const _=i.getAttribute("data-mode"),E=Array.from(y.querySelectorAll(".qsis-course-cb:checked")).map(d=>Number(d.value)).filter(d=>d>0);if(!E.length){u(b,e("請至少勾選一門課程。","Select at least one course."),!0),b.classList.remove("hidden");return}const I=document.getElementById("qsis-year").value;if(p&&I!==p&&!window.confirm(e(`所選 QSIS 學年 [${I}] 與本地課程學年 [${h||p}] 不同。繼續可能把學生年級／班別改成升班後資料。確定匯入？`,`QSIS year [${I}] differs from local courses [${h||p}]. Continuing may overwrite students with promoted class data. Import anyway?`)))return;const v=a.querySelectorAll(".qsis-import-btn");v.forEach(d=>{d.disabled=!0}),u(b,e("匯入中…","Importing…"),!1),b.classList.remove("hidden");try{const d=await n.ScienceApi.apiFetch("/admin/qsis/import",{method:"POST",body:{mode:_,year_id:document.getElementById("qsis-year").value,course_ids:E,teacher_user_id:Number(document.getElementById("qsis-teacher").value)||0,enroll:document.getElementById("qsis-enroll").checked,update_existing:document.getElementById("qsis-update").checked}}),M=JSON.stringify(d).slice(0,400);u(b,e("匯入完成。","Import finished. ")+M,!1)}catch(d){u(b,d.message||e("匯入失敗","Import failed"),!0)}finally{v.forEach(d=>{d.disabled=!1})}})})}Object.assign(n.AppAdmin||(n.AppAdmin={}),{renderAdminDbExport:U,renderAdminDbImport:P,renderAdminDataDictionary:H,renderAdminQsisImport:O});
