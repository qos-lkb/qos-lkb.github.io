const i=window;function s(o,c){return i.AppRouter&&i.AppRouter.t?i.AppRouter.t(o,c):o}function t(o){return i.AppRouter&&i.AppRouter.escapeHtml?i.AppRouter.escapeHtml(o):String(o||"")}function x(o){return i.AppRouter&&i.AppRouter.spaHref?i.AppRouter.spaHref(o):String(o||"")}function I(){return i.ScienceApi.hasPermission("simulation.manage_any")||i.ScienceApi.hasPermission("user.manage")}function M(){const o=document.getElementById("sidebar");o&&(o.style.display="none")}const O={same:{zh:"內容相同（待記錄路徑）",en:"Same content (link pending)"},disk_only:{zh:"僅磁碟有檔",en:"Disk only"},ambiguous:{zh:"多於一個候選",en:"Ambiguous"},empty:{zh:"HTML 空白",en:"Empty HTML"},create:{zh:"將新建檔案",en:"Will create file"},differ:{zh:"內容不同",en:"Content differs"}};function F(o){const c=O[o]||{zh:o,en:o};return s(c.zh,c.en)}const y={};function U(o,c){const f=`<option value="">${t(s("（依資料夾推測）","(from folder)"))}</option>`,d=(o||[]).map(b=>{const v=Number(c)===Number(b.id)?" selected":"";return`<option value="${Number(b.id)}"${v}>${t(b.name_zh||b.slug)}</option>`}).join("");return f+d}async function K(o){const c=o?`?q=${encodeURIComponent(o)}`:"";return i.ScienceApi.apiFetch(`/admin/simulations/recovery${c}`)}async function g(){var w,_,S;M();const o=document.getElementById("page-title"),c=document.getElementById("card-container");if(o&&(o.textContent=s("失散模擬找回","Recover lost simulations")),!i.ScienceApi.getUser()){i.AppRouter.navigate("/login");return}if(!I()){c.innerHTML=`<p class="text-red-600">${t(s("沒有權限。","Forbidden."))}</p>`;return}const f=new URLSearchParams(i.location.search).get("q")||"";c.innerHTML=`<p class="text-slate-500">${t(s("載入中…","Loading…"))}</p>`;let d;try{d=await K(f)}catch(e){c.innerHTML=`<p class="text-red-600">${t(e.message||s("載入失敗","Load failed"))}</p>`;return}const b=d.counts||{},v=Array.isArray(d.disk_items)?d.disk_items:[],L=Array.isArray(d.db_items)?d.db_items:[],E=Array.isArray(d.missing_items)?d.missing_items:[],j=d.subjects||[],q=i.ScienceApi.hasPermission("simulation.manage_any"),A=Array.isArray(d.models)?d.models:[],z=d.default_model||A[0]||"",R=[{key:"disk_unregistered",zh:"磁碟未登錄",en:"Unregistered on disk"},{key:"db_issues",zh:"資料庫待修",en:"DB needs fix"},{key:"missing_files",zh:"路徑失效",en:"Broken path"},{key:"catalog_ready",zh:"已對應",en:"Linked OK"}].map(e=>`
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500">${t(s(e.zh,e.en))}</div>
            <div class="text-2xl font-bold text-slate-900">${Number(b[e.key]||0)}</div>
        </div>`).join(""),T=v.map(e=>{const n=e.path||"",a=y[n]||{},r=a.subject_id!=null?a.subject_id:e.subject_id||"",l=a.title_zh!=null?a.title_zh:e.title_zh||"";return`
        <tr class="border-t border-slate-100 align-top" data-disk-path="${t(n)}">
            <td class="px-3 py-2"><input type="checkbox" class="disk-row-check rounded border-slate-300" value="${t(n)}" checked></td>
            <td class="px-3 py-2 font-mono text-xs">${t(n)}</td>
            <td class="px-3 py-2 font-mono text-xs">${t(e.proposed_slug||"")}</td>
            <td class="px-3 py-2"><input type="text" class="disk-title-zh w-full border border-slate-300 rounded px-2 py-1 text-sm" value="${t(l)}"></td>
            <td class="px-3 py-2">
                <select class="disk-subject w-full border border-slate-300 rounded px-2 py-1 text-sm">${U(j,r)}</select>
            </td>
            <td class="px-3 py-2 text-xs whitespace-nowrap">${e.kind==="slug_exists"?t(s("補連結","Link"))+(e.existing_sim_id?` #${Number(e.existing_sim_id)}`:""):t(s("新建","Create"))}</td>
        </tr>`}).join(""),B=L.map(e=>{const n=e.path||"",a=Array.isArray(e.candidates)?e.candidates:[],r=e.status==="ambiguous"&&a.length?`<select class="db-path-pick mt-1 w-full border border-amber-300 rounded px-2 py-1 text-xs" data-sim-id="${Number(e.id)}">
                ${a.map(l=>`<option value="${t(l)}"${l===n?" selected":""}>${t(l)}</option>`).join("")}
               </select>`:`<span class="font-mono text-xs">${t(n)}</span>`;return`
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2"><input type="checkbox" class="db-row-check rounded border-slate-300" data-sim-id="${Number(e.id)}" data-path="${t(n)}" ${e.linkable?"checked":""} ${e.linkable?"":"disabled"}></td>
            <td class="px-3 py-2 font-mono text-xs">${Number(e.id)}</td>
            <td class="px-3 py-2">
                <div>${t(e.title||"")}</div>
                <div class="text-xs text-slate-400 font-mono">${t(e.slug||"")}</div>
            </td>
            <td class="px-3 py-2 text-sm whitespace-nowrap">${t(F(e.status))}</td>
            <td class="px-3 py-2">${r}</td>
        </tr>`}).join(""),N=E.map(e=>`
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2 font-mono text-xs">${Number(e.id)}</td>
            <td class="px-3 py-2">${t(e.title||"")}</td>
            <td class="px-3 py-2 font-mono text-xs text-red-700">${t(e.html_path||"")}</td>
            <td class="px-3 py-2"><a href="${t(x(`/admin/simulations/${Number(e.id)}/edit`))}" data-spa-nav="/admin/simulations/${Number(e.id)}/edit" class="text-brand-700 hover:underline text-sm">${t(s("編輯","Edit"))}</a></td>
        </tr>`).join("");c.innerHTML=`
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${t(x("/admin"))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${t(s("← 管理首頁","← Admin home"))}</a>
            <a href="${t(x("/admin/simulations"))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${t(s("模擬列表","Simulations"))}</a>
            <a href="${t(x("/admin/import-disk-simulations"))}" data-spa-nav="/admin/import-disk-simulations" class="text-slate-500 hover:underline">${t(s("僅磁碟匯入","Disk import only"))}</a>
            <a href="${t(x("/admin/export-sim-html"))}" data-spa-nav="/admin/export-sim-html" class="text-slate-500 hover:underline">${t(s("HTML 匯出對照","HTML export"))}</a>
        </div>
        <p id="sim-recovery-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
        <p class="text-sm text-slate-600 mb-4">${t(s("掃描倉庫內模擬 HTML，找出未登錄檔案、資料庫未連結列，以及 html_path 指向不存在檔案的紀錄。可選用 xAI 建議科目與標題後寫入資料庫。","Scan repo HTML for unregistered files, broken DB links, and missing paths. Optionally use xAI to suggest subject and titles before import."))}</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">${R}</div>
        ${d.ai_configured?"":`<p class="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm mb-4">${t(s("未設定 XAI_API_KEY 時，AI 分類按鈕會停用；仍可依資料夾手動匯入。","Without XAI_API_KEY, AI classify is disabled; folder-based import still works."))}</p>`}
        <form id="recovery-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <input type="search" name="q" value="${t(f)}" placeholder="${t(s("路徑、slug、標題…","Path, slug, title…"))}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[16rem]">
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${t(s("搜尋","Search"))}</button>
        </form>

        <section class="mb-8">
            <h2 class="text-lg font-bold text-slate-800 mb-2">${t(s("磁碟未登錄","Unregistered on disk"))}</h2>
            <div class="flex flex-wrap gap-2 mb-3 items-center">
                <label class="text-sm text-slate-600" for="recovery-status">${t(s("寫入狀態","Status"))}</label>
                <select id="recovery-status" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="draft">${t(s("草稿","Draft"))}</option>
                    <option value="pending_review">${t(s("待審","Pending review"))}</option>
                    ${q?`<option value="published">${t(s("已發布","Published"))}</option>`:""}
                </select>
                ${d.ai_configured?`
                <select id="recovery-model" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    ${A.map(e=>`<option value="${t(e)}"${e===z?" selected":""}>${t(e)}</option>`).join("")}
                </select>
                <button type="button" id="btn-recovery-classify" class="px-4 py-2 rounded-lg border border-violet-400 text-violet-900 text-sm hover:bg-violet-50">${t(s("AI 分類已勾選","AI classify selected"))}</button>`:""}
                <button type="button" id="btn-recovery-import" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${t(s("匯入已勾選","Import selected"))}</button>
            </div>
            <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-left text-slate-500">
                        <tr>
                            <th class="px-3 py-2 w-10"><input type="checkbox" id="disk-check-all" class="rounded border-slate-300" checked></th>
                            <th class="px-3 py-2">${t(s("路徑","Path"))}</th>
                            <th class="px-3 py-2">slug</th>
                            <th class="px-3 py-2">${t(s("標題","Title"))}</th>
                            <th class="px-3 py-2">${t(s("科目","Subject"))}</th>
                            <th class="px-3 py-2">${t(s("類型","Type"))}</th>
                        </tr>
                    </thead>
                    <tbody>${T||`<tr><td colspan="6" class="px-3 py-6 text-slate-500">${t(s("沒有未登錄檔案。","No unregistered files."))}</td></tr>`}</tbody>
                </table>
            </div>
        </section>

        <section class="mb-8">
            <h2 class="text-lg font-bold text-slate-800 mb-2">${t(s("資料庫待連結","DB rows to link"))}</h2>
            <div class="flex flex-wrap gap-2 mb-3">
                <button type="button" id="btn-recovery-link" class="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800">${t(s("連結已勾選路徑","Link selected paths"))}</button>
            </div>
            <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-left text-slate-500">
                        <tr>
                            <th class="px-3 py-2 w-10"></th>
                            <th class="px-3 py-2">ID</th>
                            <th class="px-3 py-2">${t(s("標題","Title"))}</th>
                            <th class="px-3 py-2">${t(s("狀態","Status"))}</th>
                            <th class="px-3 py-2">${t(s("路徑","Path"))}</th>
                        </tr>
                    </thead>
                    <tbody>${B||`<tr><td colspan="5" class="px-3 py-6 text-slate-500">${t(s("沒有待修列。","Nothing to fix."))}</td></tr>`}</tbody>
                </table>
            </div>
        </section>

        <section>
            <h2 class="text-lg font-bold text-slate-800 mb-2">${t(s("html_path 檔案遺失","Missing html_path file"))}</h2>
            <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-left text-slate-500">
                        <tr>
                            <th class="px-3 py-2">ID</th>
                            <th class="px-3 py-2">${t(s("標題","Title"))}</th>
                            <th class="px-3 py-2">${t(s("記錄路徑","Stored path"))}</th>
                            <th class="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>${N||`<tr><td colspan="4" class="px-3 py-6 text-slate-500">${t(s("沒有失效路徑。","No broken paths."))}</td></tr>`}</tbody>
                </table>
            </div>
        </section>`;const h=document.getElementById("sim-recovery-flash"),u=document.getElementById("recovery-search");u&&u.addEventListener("submit",e=>{e.preventDefault();const n=(u.querySelector('[name="q"]')||{}).value||"",a=n?`/admin/recover-simulations?q=${encodeURIComponent(n)}`:"/admin/recover-simulations";i.AppRouter.navigate(a,!0)});const $=document.getElementById("disk-check-all"),k=()=>Array.from(document.querySelectorAll(".disk-row-check"));$&&$.addEventListener("change",()=>{k().forEach(e=>{e.checked=$.checked})});function H(){const e={};return document.querySelectorAll("[data-disk-path]").forEach(n=>{const a=n.getAttribute("data-disk-path")||"";if(!a)return;const r=n.querySelector(".disk-title-zh"),l=n.querySelector(".disk-subject"),m={};r&&r.value.trim()&&(m.title_zh=r.value.trim()),l&&l.value&&(m.subject_id=Number(l.value)),Object.keys(m).length&&(e[a]=m)}),Object.assign(y,e),{...y,...e}}function p(e,n){h&&(h.className="rounded-lg border px-4 py-3 text-sm mb-4",e==="error"?h.classList.add("border-red-200","bg-red-50","text-red-800"):e==="ok"?h.classList.add("border-emerald-200","bg-emerald-50","text-emerald-900"):h.classList.add("border-slate-200","bg-slate-50","text-slate-600"),h.textContent=n,h.classList.remove("hidden"))}async function P(){const e=k().filter(r=>r.checked).map(r=>r.value);if(!e.length){p("error",s("請勾選至少一個磁碟檔案。","Select at least one file."));return}const n=document.getElementById("recovery-status"),a=u&&u.querySelector('[name="q"]')?u.querySelector('[name="q"]').value:"";p("info",s("匯入中…","Importing…"));try{const r=await i.ScienceApi.apiFetch("/admin/simulations/recovery",{method:"POST",body:{action:"import",paths:e,status:n?n.value:"draft",search:a,overrides:H()}});p("ok",s(`新增 ${r.created} 筆、連結 ${r.linked} 筆、略過 ${r.skipped} 筆。`,`Created ${r.created}, linked ${r.linked}, skipped ${r.skipped}.`)),await g()}catch(r){p("error",r.message||s("匯入失敗","Import failed"))}}async function C(){const e=k().filter(a=>a.checked).map(a=>a.value);if(!e.length){p("error",s("請勾選要分類的檔案。","Select files to classify."));return}const n=document.getElementById("recovery-model");p("info",s("AI 分類中…","Classifying…"));try{((await i.ScienceApi.apiFetch("/admin/simulations/recovery",{method:"POST",body:{action:"classify",paths:e,model:n?n.value:""}})).items||[]).forEach(r=>{const l=r.path;l&&(y[l]=Object.assign(y[l]||{},{subject_id:r.subject_id!=null?r.subject_id:null,title_zh:r.title_zh||"",title_en:r.title_en||"",summary_zh:r.summary_zh||""}))}),p("ok",s("已套用 AI 建議到表格（請檢查後再匯入）。","Applied AI suggestions to the table (review before import).")),await g()}catch(a){p("error",a.message||s("分類失敗","Classify failed"))}}async function D(){const e=[];if(document.querySelectorAll(".db-row-check:checked").forEach(a=>{const r=Number(a.getAttribute("data-sim-id"));let l=a.getAttribute("data-path")||"";const m=document.querySelector(`.db-path-pick[data-sim-id="${r}"]`);m&&m.value&&(l=m.value),r>0&&l&&e.push({sim_id:r,path:l})}),!e.length){p("error",s("請勾選可連結的資料庫列。","Select linkable DB rows."));return}const n=u&&u.querySelector('[name="q"]')?u.querySelector('[name="q"]').value:"";p("info",s("連結中…","Linking…"));try{const a=await i.ScienceApi.apiFetch("/admin/simulations/recovery",{method:"POST",body:{action:"link",links:e,search:n}});p("ok",s(`已連結 ${a.linked} 筆，略過 ${a.skipped} 筆。`,`Linked ${a.linked}, skipped ${a.skipped}.`)),await g()}catch(a){p("error",a.message||s("連結失敗","Link failed"))}}(w=document.getElementById("btn-recovery-import"))==null||w.addEventListener("click",P),(_=document.getElementById("btn-recovery-classify"))==null||_.addEventListener("click",C),(S=document.getElementById("btn-recovery-link"))==null||S.addEventListener("click",D),document.querySelectorAll(".db-path-pick").forEach(e=>{e.addEventListener("change",()=>{const n=e.getAttribute("data-sim-id"),a=document.querySelector(`.db-row-check[data-sim-id="${n}"]`);a&&a.setAttribute("data-path",e.value)})})}i.AppAdmin=Object.assign(i.AppAdmin||{},{renderAdminSimRecovery:g,canRecoverSims:I});
