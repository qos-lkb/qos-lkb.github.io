const a=window;function t(n,l){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(n,l):n}function e(n){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(n):String(n||"")}function g(n){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(n):String(n||"")}function S(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function E(){return a.ScienceApi.getUser()?!!a.ScienceApi.hasPermission("user.manage"):(a.AppRouter.navigate("/login"),!1)}function L(n){n.querySelectorAll("[data-spa-nav]").forEach(l=>{l.addEventListener("click",k=>{k.preventDefault(),a.AppRouter.navigate(l.getAttribute("data-spa-nav"))})})}async function H(){var u,p;S();const n=document.getElementById("page-title"),l=document.getElementById("card-container");if(n&&(n.textContent=t("前台選單可見性","Front nav visibility")),!E()){a.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let o=function(s,d){r.textContent=s,r.className="mb-4 rounded-lg px-4 py-3 text-sm border "+(d?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-900")};var k=o;const c=await a.ScienceApi.apiFetch("/admin/nav-menu"),A=c.items||[],x=c.audiences||[],$=c.matrix||{},f=!!c.table_ready,v=x.map(s=>`<th class="p-3 border-b border-slate-200 font-semibold text-slate-700 text-center whitespace-nowrap">${e(s.label_zh||s.key)}</th>`).join(""),w=A.map(s=>{const d=x.map(i=>{const m=!!($[s.key]&&$[s.key][i.key]),h="vis_"+s.key+"_"+i.key;return`<td class="p-3 text-center">
                        <label class="inline-flex items-center justify-center cursor-pointer" for="${e(h)}">
                            <input type="checkbox" id="${e(h)}" data-item="${e(s.key)}" data-audience="${e(i.key)}"
                                class="nav-vis-cb h-4 w-4 rounded border-slate-300 text-indigo-600" ${m?"checked":""} ${f?"":"disabled"}>
                        </label>
                    </td>`}).join("");return`<tr class="border-b border-slate-100 hover:bg-slate-50/80">
                    <td class="p-3 sticky left-0 bg-white font-medium text-slate-900 whitespace-nowrap">
                        ${e(s.label_zh||s.key)}
                        <span class="block text-xs font-normal text-slate-500">${e(s.label_en||"")}</span>
                    </td>
                    ${d}
                </tr>`}).join("");l.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(g("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                    <a href="${e(g("/admin/users"))}" data-spa-nav="/admin/users" class="text-sm text-slate-600 hover:underline">${e(t("使用者","Users"))}</a>
                    <a href="${e(g("/admin/permissions"))}" data-spa-nav="/admin/permissions" class="text-sm text-slate-600 hover:underline">${e(t("角色權限","Permissions"))}</a>
                </div>
                <p class="text-sm text-slate-600 mb-4">${e(t("依訪客／學生／教師／管理員控制 SPA 上方選單顯示項目。","Control which top-nav items guests, students, teachers, and admins see."))}</p>
                <p id="nav-flash" class="mb-4 hidden rounded-lg px-4 py-3 text-sm border"></p>
                ${f?"":`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(t("尚未建立 spa_nav_visibility 資料表；目前無法儲存。","spa_nav_visibility table missing; save is disabled."))}</div>`}
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-100">
                        <h2 class="font-bold text-slate-900">${e(t("上方選單矩陣","Top nav matrix"))}</h2>
                        <p class="text-sm text-slate-600 mt-1">${e(t("勾選表示該類使用者可在前台看到該選單。","Checked = visible for that audience."))}</p>
                    </div>
                    <form id="nav-menu-form" class="p-4 md:p-5 overflow-x-auto">
                        <table class="min-w-full text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-50 text-left">
                                    <th class="p-3 border-b border-slate-200 font-semibold text-slate-700 sticky left-0 bg-slate-50">${e(t("選單項目","Menu item"))}</th>
                                    ${v}
                                </tr>
                            </thead>
                            <tbody>${w}</tbody>
                        </table>
                        <div class="mt-5 flex flex-wrap items-center gap-3">
                            <button type="submit" class="rounded-lg bg-indigo-700 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-800" ${f?"":"disabled"}>${e(t("儲存設定","Save"))}</button>
                            <button type="button" id="nav-check-all" class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" ${f?"":"disabled"}>${e(t("全部勾選","Check all"))}</button>
                            <button type="button" id="nav-uncheck-all" class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" ${f?"":"disabled"}>${e(t("全部取消","Uncheck all"))}</button>
                        </div>
                    </form>
                </div>`,L(l);const b=document.getElementById("nav-menu-form"),r=document.getElementById("nav-flash");(u=document.getElementById("nav-check-all"))==null||u.addEventListener("click",()=>{b.querySelectorAll("input.nav-vis-cb").forEach(s=>{s.checked=!0})}),(p=document.getElementById("nav-uncheck-all"))==null||p.addEventListener("click",()=>{b.querySelectorAll("input.nav-vis-cb").forEach(s=>{s.checked=!1})}),b.addEventListener("submit",async s=>{s.preventDefault();const d={};b.querySelectorAll("input.nav-vis-cb").forEach(i=>{const m=i.getAttribute("data-item"),h=i.getAttribute("data-audience");!m||!h||(d[m]||(d[m]={}),d[m][h]=i.checked?"1":"")});try{await a.ScienceApi.apiFetch("/admin/nav-menu",{method:"POST",body:{matrix:d}}),o(t("已更新前台上方選單可見性。","Front nav visibility updated."),!1)}catch(i){o(i.message||t("儲存失敗","Save failed"),!0)}})}catch(c){l.innerHTML=`<p class="text-red-600">${e(c.message||t("載入失敗","Load failed"))}</p>`}}async function j(){S();const n=document.getElementById("page-title"),l=document.getElementById("card-container");if(n&&(n.textContent=t("角色權限","Role permissions")),!E()){a.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let b=function(r,o){w.textContent=r,w.className="rounded-lg border px-4 py-3 text-sm mb-4 "+(o?"border-red-200 bg-red-50 text-red-700":"border-emerald-200 bg-emerald-50 text-emerald-800")};var k=b;const u=await a.ScienceApi.apiFetch("/admin/permissions"),p=u.roles||[],c=u.groups||{},A=Array.isArray(c)?c:Object.values(c),x={};p.forEach(r=>{x[r.id]={},(r.permission_ids||[]).forEach(o=>{x[r.id][Number(o)]=!0})});const $=p.map(r=>`<th class="p-3 text-center font-semibold text-slate-700 min-w-[7rem]" title="${e(r.description||"")}">
                    <span class="block">${e(r.label||r.slug)}</span>
                    <span class="block text-xs font-normal font-mono text-slate-400 mt-0.5">${e(r.slug||"")}</span>
                </th>`).join(""),f=A.map(r=>{const o=r.permissions||[];if(!o.length)return"";const s=`<tr>
                    <td class="p-2 pl-3 font-semibold text-slate-600 text-xs uppercase tracking-wide bg-indigo-50/60 border-y border-indigo-100" colspan="${p.length+1}">
                        ${e(r.label||"")}
                    </td>
                </tr>`,d=o.map(i=>{const m=Number(i.id),h=p.map(y=>{const R=!!(x[y.id]&&x[y.id][m]);return`<td class="p-3 text-center align-middle">
                            <label class="inline-flex items-center justify-center w-full min-h-[2.5rem] cursor-pointer rounded-lg hover:bg-indigo-50/50">
                                <input type="checkbox" class="perm-matrix-checkbox w-4 h-4 accent-indigo-600"
                                    data-role-id="${Number(y.id)}" value="${m}" ${R?"checked":""}
                                    aria-label="${e((y.label||y.slug)+" — "+(i.label||i.name))}">
                            </label>
                        </td>`}).join("");return`<tr class="border-b border-slate-100 hover:bg-slate-50/80">
                        <td class="p-3 align-middle bg-white sticky left-0">
                            <span class="block text-slate-800 leading-snug">${e(i.label||i.name)}</span>
                            ${i.description?`<span class="block text-xs text-slate-500 mt-0.5">${e(i.description)}</span>`:""}
                            <span class="block text-xs font-mono text-slate-400 mt-0.5">${e(i.name||"")}</span>
                        </td>
                        ${h}
                    </tr>`}).join("");return s+d}).join("");l.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(g("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                    <a href="${e(g("/admin/users"))}" data-spa-nav="/admin/users" class="text-sm text-slate-600 hover:underline">${e(t("使用者","Users"))}</a>
                    <a href="${e(g("/admin/nav-menu"))}" data-spa-nav="/admin/nav-menu" class="text-sm text-slate-600 hover:underline">${e(t("前台選單","Front nav"))}</a>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
                    <p class="text-sm text-slate-600 leading-relaxed">${e(t("橫列為角色、直欄為權限；勾選後按儲存。變更個別使用者角色請至使用者管理。","Rows are permissions, columns are roles. Save after editing. Assign user roles under Users."))}</p>
                </div>
                <p id="perm-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
                ${p.length?`
                <form id="perm-matrix-form" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-100 border-b border-slate-200">
                                    <th class="p-3 text-left font-semibold text-slate-700 min-w-[14rem] sticky left-0 bg-slate-100">${e(t("權限","Permission"))}</th>
                                    ${$}
                                </tr>
                            </thead>
                            <tbody>${f}</tbody>
                        </table>
                    </div>
                    <div class="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                        <p class="text-xs text-slate-500">${e(t("若移除自己角色的「管理使用者與角色」權限，系統會阻止儲存。","Saving is blocked if you remove your own user.manage permission."))}</p>
                        <button type="submit" class="rounded-lg bg-indigo-700 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-800">${e(t("儲存全部角色權限","Save all role permissions"))}</button>
                    </div>
                </form>`:`<p class="text-slate-500 text-sm">${e(t("尚無角色資料。","No roles found."))}</p>`}`,L(l);const v=document.getElementById("perm-matrix-form"),w=document.getElementById("perm-flash");if(!v)return;v.addEventListener("submit",async r=>{r.preventDefault();const o={};v.querySelectorAll(".perm-matrix-checkbox").forEach(s=>{const d=s.getAttribute("data-role-id");d&&(o[d]||(o[d]=[]),s.checked&&o[d].push(parseInt(s.value,10)))});try{await a.ScienceApi.apiFetch("/admin/permissions",{method:"PUT",body:{role_perms:o}}),b(t("已更新所有角色權限。","All role permissions updated."),!1)}catch(s){b(s.message||t("儲存失敗","Save failed"),!0)}})}catch(u){l.innerHTML=`<p class="text-red-600">${e(u.message||t("載入失敗","Load failed"))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminNavMenu:H,renderAdminPermissions:j});
