const n=window;function t(r,l){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(r,l):r}function e(r){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(r):String(r||"")}function A(r){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(r):String(r||"")}function j(){const r=document.getElementById("sidebar");r&&(r.style.display="none")}function q(){return n.ScienceApi.getUser()?!!n.ScienceApi.hasPermission("user.manage"):(n.AppRouter.navigate("/login"),!1)}function N(r){r.querySelectorAll("[data-spa-nav]").forEach(l=>{l.addEventListener("click",R=>{R.preventDefault(),n.AppRouter.navigate(l.getAttribute("data-spa-nav"))})})}async function D(){var L,v;j();const r=document.getElementById("page-title"),l=document.getElementById("card-container");if(r&&(r.textContent=t("主選單管理","Main menu management")),!q()){n.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let h=function(a,p){E.textContent=a,E.className="mb-4 rounded-lg px-4 py-3 text-sm border "+(p?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-900")},x=function(){return Array.from(d.querySelectorAll(".nav-item-row")).map(a=>a.getAttribute("data-item-key")).filter(Boolean)},S=function(){const a={};return m.querySelectorAll("input.nav-vis-cb").forEach(p=>{const s=p.getAttribute("data-item"),u=p.getAttribute("data-audience");!s||!u||(a[s]||(a[s]={}),a[s][u]=p.checked?"1":"")}),a},T=function(){if(!i||!d)return;let a=null;function p(s){return Array.prototype.slice.call(d.querySelectorAll(".nav-item-row:not(.dragging)")).reduce((c,B)=>{const H=B.getBoundingClientRect(),M=s-H.top-H.height/2;return M<0&&M>c.offset?{offset:M,element:B}:c},{offset:Number.NEGATIVE_INFINITY,element:null}).element}d.addEventListener("dragenter",s=>s.preventDefault()),d.addEventListener("dragover",s=>{if(s.preventDefault(),!a)return;const u=p(s.clientY);u==null?d.appendChild(a):d.insertBefore(a,u)}),d.querySelectorAll(".nav-item-row").forEach(s=>{const u=s.querySelector(".nav-drag-handle");u&&(u.addEventListener("mousedown",()=>{s.setAttribute("draggable","true")}),s.addEventListener("dragend",async()=>{s.removeAttribute("draggable"),s.classList.remove("dragging","opacity-60"),a===s&&(a=null);try{await n.ScienceApi.apiFetch("/admin/nav-menu",{method:"POST",body:{matrix:S(),order:x()}}),h(t("已更新選單次序。","Menu order updated."),!1)}catch(c){h(c.message||t("儲存排序失敗","Failed to save order"),!0)}}),s.addEventListener("dragstart",c=>{if(!s.getAttribute("draggable")){c.preventDefault();return}a=s,s.classList.add("dragging","opacity-60"),c.dataTransfer&&(c.dataTransfer.effectAllowed="move",c.dataTransfer.setData("text/plain",s.getAttribute("data-item-key")||""))}))})};var R=h,k=x,y=S,_=T;const b=await n.ScienceApi.apiFetch("/admin/nav-menu"),I=b.items||[],$=b.audiences||[],w=b.matrix||{},g=!!b.table_ready,i=!!b.order_table_ready,o=$.map(a=>`<th class="p-3 border-b border-slate-200 font-semibold text-slate-700 text-center whitespace-nowrap">${e(a.label_zh||a.key)}</th>`).join(""),f=I.map(a=>{const p=$.map(s=>{const u=!!(w[a.key]&&w[a.key][s.key]),c="vis_"+a.key+"_"+s.key;return`<td class="p-3 text-center">
                        <label class="inline-flex items-center justify-center cursor-pointer" for="${e(c)}">
                            <input type="checkbox" id="${e(c)}" data-item="${e(a.key)}" data-audience="${e(s.key)}"
                                class="nav-vis-cb h-4 w-4 rounded border-slate-300 text-indigo-600" ${u?"checked":""} ${g?"":"disabled"}>
                        </label>
                    </td>`}).join("");return`<tr class="nav-item-row border-b border-slate-100 hover:bg-slate-50/80" data-item-key="${e(a.key)}">
                    <td class="p-3 sticky left-0 bg-white whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <span class="nav-drag-handle cursor-grab select-none text-slate-400 hover:text-slate-600 ${i?"":"opacity-40 pointer-events-none"}" title="${e(t("拖曳排序","Drag to reorder"))}" aria-label="${e(t("拖曳排序","Drag to reorder"))}">⠿</span>
                            <span>
                                <span class="font-medium text-slate-900">${e(a.label_zh||a.key)}</span>
                                <span class="block text-xs font-normal text-slate-500">${e(a.label_en||"")}</span>
                            </span>
                        </div>
                    </td>
                    ${p}
                </tr>`}).join("");l.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(A("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                    <a href="${e(A("/admin/users"))}" data-spa-nav="/admin/users" class="text-sm text-slate-600 hover:underline">${e(t("使用者","Users"))}</a>
                    <a href="${e(A("/admin/permissions"))}" data-spa-nav="/admin/permissions" class="text-sm text-slate-600 hover:underline">${e(t("角色權限","Permissions"))}</a>
                </div>
                <p class="text-sm text-slate-600 mb-4">${e(t("管理 SPA 上方主選單：拖曳調整顯示次序，並依訪客／學生／教師／管理員設定可見性。","Manage the SPA top menu: drag to reorder, and set visibility per guest / student / teacher / admin."))}</p>
                <p id="nav-flash" class="mb-4 hidden rounded-lg px-4 py-3 text-sm border"></p>
                ${g?"":`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(t("尚未建立 spa_nav_visibility 資料表；目前無法儲存可見性。","spa_nav_visibility table missing; visibility save is disabled."))}</div>`}
                ${i?"":`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(t("尚未建立 spa_nav_order 資料表；請執行 schema_spa_nav_order.sql 以啟用拖曳排序。","spa_nav_order table missing; run schema_spa_nav_order.sql to enable drag reorder."))}</div>`}
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-100">
                        <h2 class="font-bold text-slate-900">${e(t("主選單項目","Main menu items"))}</h2>
                        <p class="text-sm text-slate-600 mt-1">${e(t("左側 ⠿ 拖曳排序；勾選表示該類使用者可在前台看到該選單。","Drag ⠿ to reorder; checked = visible for that audience."))}</p>
                    </div>
                    <form id="nav-menu-form" class="p-4 md:p-5 overflow-x-auto">
                        <table class="min-w-full text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-50 text-left">
                                    <th class="p-3 border-b border-slate-200 font-semibold text-slate-700 sticky left-0 bg-slate-50">${e(t("選單項目","Menu item"))}</th>
                                    ${o}
                                </tr>
                            </thead>
                            <tbody id="nav-item-tbody">${f}</tbody>
                        </table>
                        <div class="mt-5 flex flex-wrap items-center gap-3">
                            <button type="submit" class="rounded-lg bg-indigo-700 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-800" ${g?"":"disabled"}>${e(t("儲存設定","Save"))}</button>
                            <button type="button" id="nav-check-all" class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" ${g?"":"disabled"}>${e(t("全部勾選","Check all"))}</button>
                            <button type="button" id="nav-uncheck-all" class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" ${g?"":"disabled"}>${e(t("全部取消","Uncheck all"))}</button>
                        </div>
                    </form>
                </div>`,N(l);const m=document.getElementById("nav-menu-form"),d=document.getElementById("nav-item-tbody"),E=document.getElementById("nav-flash");(L=document.getElementById("nav-check-all"))==null||L.addEventListener("click",()=>{m.querySelectorAll("input.nav-vis-cb").forEach(a=>{a.checked=!0})}),(v=document.getElementById("nav-uncheck-all"))==null||v.addEventListener("click",()=>{m.querySelectorAll("input.nav-vis-cb").forEach(a=>{a.checked=!1})}),m.addEventListener("submit",async a=>{a.preventDefault();try{await n.ScienceApi.apiFetch("/admin/nav-menu",{method:"POST",body:{matrix:S(),order:x()}}),h(t("已更新主選單設定。","Main menu settings updated."),!1)}catch(p){h(p.message||t("儲存失敗","Save failed"),!0)}}),T()}catch(b){l.innerHTML=`<p class="text-red-600">${e(b.message||t("載入失敗","Load failed"))}</p>`}}async function P(){j();const r=document.getElementById("page-title"),l=document.getElementById("card-container");if(r&&(r.textContent=t("角色權限","Role permissions")),!q()){n.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let g=function(i,o){w.textContent=i,w.className="rounded-lg border px-4 py-3 text-sm mb-4 "+(o?"border-red-200 bg-red-50 text-red-700":"border-emerald-200 bg-emerald-50 text-emerald-800")};var R=g;const k=await n.ScienceApi.apiFetch("/admin/permissions"),y=k.roles||[],_=k.groups||{},L=Array.isArray(_)?_:Object.values(_),v={};y.forEach(i=>{v[i.id]={},(i.permission_ids||[]).forEach(o=>{v[i.id][Number(o)]=!0})});const b=y.map(i=>`<th class="p-3 text-center font-semibold text-slate-700 min-w-[7rem]" title="${e(i.description||"")}">
                    <span class="block">${e(i.label||i.slug)}</span>
                    <span class="block text-xs font-normal font-mono text-slate-400 mt-0.5">${e(i.slug||"")}</span>
                </th>`).join(""),I=L.map(i=>{const o=i.permissions||[];if(!o.length)return"";const f=`<tr>
                    <td class="p-2 pl-3 font-semibold text-slate-600 text-xs uppercase tracking-wide bg-indigo-50/60 border-y border-indigo-100" colspan="${y.length+1}">
                        ${e(i.label||"")}
                    </td>
                </tr>`,m=o.map(d=>{const E=Number(d.id),h=y.map(x=>{const S=!!(v[x.id]&&v[x.id][E]);return`<td class="p-3 text-center align-middle">
                            <label class="inline-flex items-center justify-center w-full min-h-[2.5rem] cursor-pointer rounded-lg hover:bg-indigo-50/50">
                                <input type="checkbox" class="perm-matrix-checkbox w-4 h-4 accent-indigo-600"
                                    data-role-id="${Number(x.id)}" value="${E}" ${S?"checked":""}
                                    aria-label="${e((x.label||x.slug)+" — "+(d.label||d.name))}">
                            </label>
                        </td>`}).join("");return`<tr class="border-b border-slate-100 hover:bg-slate-50/80">
                        <td class="p-3 align-middle bg-white sticky left-0">
                            <span class="block text-slate-800 leading-snug">${e(d.label||d.name)}</span>
                            ${d.description?`<span class="block text-xs text-slate-500 mt-0.5">${e(d.description)}</span>`:""}
                            <span class="block text-xs font-mono text-slate-400 mt-0.5">${e(d.name||"")}</span>
                        </td>
                        ${h}
                    </tr>`}).join("");return f+m}).join("");l.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(A("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                    <a href="${e(A("/admin/users"))}" data-spa-nav="/admin/users" class="text-sm text-slate-600 hover:underline">${e(t("使用者","Users"))}</a>
                    <a href="${e(A("/admin/nav-menu"))}" data-spa-nav="/admin/nav-menu" class="text-sm text-slate-600 hover:underline">${e(t("主選單管理","Main menu"))}</a>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
                    <p class="text-sm text-slate-600 leading-relaxed">${e(t("橫列為角色、直欄為權限；勾選後按儲存。變更個別使用者角色請至使用者管理。","Rows are permissions, columns are roles. Save after editing. Assign user roles under Users."))}</p>
                </div>
                <p id="perm-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
                ${y.length?`
                <form id="perm-matrix-form" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-100 border-b border-slate-200">
                                    <th class="p-3 text-left font-semibold text-slate-700 min-w-[14rem] sticky left-0 bg-slate-100">${e(t("權限","Permission"))}</th>
                                    ${b}
                                </tr>
                            </thead>
                            <tbody>${I}</tbody>
                        </table>
                    </div>
                    <div class="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                        <p class="text-xs text-slate-500">${e(t("若移除自己角色的「管理使用者與角色」權限，系統會阻止儲存。","Saving is blocked if you remove your own user.manage permission."))}</p>
                        <button type="submit" class="rounded-lg bg-indigo-700 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-800">${e(t("儲存全部角色權限","Save all role permissions"))}</button>
                    </div>
                </form>`:`<p class="text-slate-500 text-sm">${e(t("尚無角色資料。","No roles found."))}</p>`}`,N(l);const $=document.getElementById("perm-matrix-form"),w=document.getElementById("perm-flash");if(!$)return;$.addEventListener("submit",async i=>{i.preventDefault();const o={};$.querySelectorAll(".perm-matrix-checkbox").forEach(f=>{const m=f.getAttribute("data-role-id");m&&(o[m]||(o[m]=[]),f.checked&&o[m].push(parseInt(f.value,10)))});try{await n.ScienceApi.apiFetch("/admin/permissions",{method:"PUT",body:{role_perms:o}}),g(t("已更新所有角色權限。","All role permissions updated."),!1)}catch(f){g(f.message||t("儲存失敗","Save failed"),!0)}})}catch(k){l.innerHTML=`<p class="text-red-600">${e(k.message||t("載入失敗","Load failed"))}</p>`}}n.AppAdmin=Object.assign(n.AppAdmin||{},{renderAdminNavMenu:D,renderAdminPermissions:P});
