const a=window;function t(i,l){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(i,l):i}function e(i){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(i):String(i||"")}function A(i){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(i):String(i||"")}function L(){const i=document.getElementById("sidebar");i&&(i.style.display="none")}function N(){return a.ScienceApi.getUser()?!!a.ScienceApi.hasPermission("user.manage"):(a.AppRouter.navigate("/login"),!1)}async function _(){var m;L();const i=document.getElementById("page-title"),l=document.getElementById("card-container");if(i&&(i.textContent=t("使用者","Users")),!N()){a.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let p=function(s,n){g&&(g.textContent=s,g.classList.remove("hidden","text-emerald-700","text-red-600"),g.classList.add(n?"text-red-600":"text-emerald-700"))};var w=p;const b=await a.ScienceApi.apiFetch("/admin/users"),v=b.users||[],y=b.roles||[],$=!!b.can_impersonate,x=a.ScienceApi.getUser(),f=x&&x.id?Number(x.id):0,o=y.map(s=>`<label class="inline-flex items-center gap-1.5 text-xs mr-3 mb-1">
                    <input type="checkbox" name="roles" value="${Number(s.id)}" class="rounded border-slate-300">
                    ${e(s.label||s.slug)}
                </label>`).join(""),E=v.map(s=>{if(s.is_system)return`<tr class="border-t border-slate-100 text-slate-400">
                        <td class="p-3">${Number(s.id)}</td>
                        <td class="p-3">${e(s.email)}</td>
                        <td class="p-3" colspan="3">${e(t("系統帳號","System account"))}</td>
                        <td class="p-3">—</td>
                    </tr>`;const n=s.is_active?e(t("是","Yes")):e(t("否","No")),d=$&&Number(s.id)!==f?`<button type="button" class="admin-impersonate text-amber-700 hover:underline ml-2" data-id="${Number(s.id)}" data-label="${e(s.name_zh||s.name_en||s.email)}">${e(t("模仿","Impersonate"))}</button>`:"";return`<tr class="border-t border-slate-100">
                    <td class="p-3">${Number(s.id)}</td>
                    <td class="p-3">${e(s.email)}</td>
                    <td class="p-3">${e(s.name_zh||"")}</td>
                    <td class="p-3">${e(s.name_en||"")}</td>
                    <td class="p-3 text-slate-600">${e(s.role_names||"—")}</td>
                    <td class="p-3">${n}</td>
                    <td class="p-3 whitespace-nowrap">
                        <a class="text-indigo-700 hover:underline" href="${e(A(`/admin/users/${Number(s.id)}`))}" data-spa-nav="/admin/users/${Number(s.id)}">${e(t("編輯","Edit"))}</a>
                        ${d}
                        <button type="button" class="admin-user-delete text-red-600 hover:underline ml-2" data-id="${Number(s.id)}">${e(t("刪除","Delete"))}</button>
                    </td>
                </tr>`}).join("");l.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(A("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                    <a href="${e(A("/admin/permissions"))}" data-spa-nav="/admin/permissions" class="text-sm text-slate-600 hover:underline">${e(t("角色權限","Permissions"))}</a>
                </div>
                <p id="admin-users-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-user-create" class="mb-6 space-y-3 bg-white border border-slate-200 rounded-xl p-4">
                    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <label class="text-sm sm:col-span-2">${e(t("帳戶名稱／電郵","Login / email"))}
                            <input name="email" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" autocomplete="username">
                        </label>
                        <label class="text-sm">${e(t("中文名","Name ZH"))}
                            <input name="name_zh" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" maxlength="120">
                        </label>
                        <label class="text-sm">${e(t("英文名","Name EN"))}
                            <input name="name_en" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" maxlength="120">
                        </label>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-slate-700 mb-1">${e(t("角色","Roles"))}</p>
                        <div>${o||`<span class="text-xs text-slate-400">${e(t("尚無角色","No roles"))}</span>`}</div>
                    </div>
                    <div class="flex flex-wrap items-center gap-4">
                        <label class="text-sm inline-flex items-center gap-2">
                            <input type="checkbox" name="is_active" checked class="rounded border-slate-300">
                            ${e(t("啟用帳戶","Active"))}
                        </label>
                        <button type="submit" class="rounded-lg bg-indigo-700 text-white px-3 py-2 text-sm font-semibold">${e(t("新增使用者","Create user"))}</button>
                    </div>
                    <p class="text-xs text-slate-500">${e(t("密碼由 QSIS 驗證；本站不儲存密碼。","Passwords are verified via QSIS; none are stored here."))}</p>
                </form>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">ID</th>
                                <th class="p-3">${e(t("電郵","Email"))}</th>
                                <th class="p-3">${e(t("中文名","Name ZH"))}</th>
                                <th class="p-3">${e(t("英文名","Name EN"))}</th>
                                <th class="p-3">${e(t("角色","Roles"))}</th>
                                <th class="p-3">${e(t("啟用","Active"))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>${E}</tbody>
                    </table>
                </div>`;const g=document.getElementById("admin-users-flash");l.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",n=>{n.preventDefault(),a.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),(m=document.getElementById("admin-user-create"))==null||m.addEventListener("submit",async s=>{var u;s.preventDefault();const n=s.target,d=new FormData(n),r=Array.from(n.querySelectorAll('input[name="roles"]:checked')).map(c=>parseInt(c.value,10)).filter(c=>c>0);try{const c=await a.ScienceApi.apiFetch("/admin/users",{method:"POST",body:{email:String(d.get("email")||"").trim(),name_zh:String(d.get("name_zh")||"").trim(),name_en:String(d.get("name_en")||"").trim(),is_active:!!((u=n.querySelector('input[name="is_active"]'))!=null&&u.checked),roles:r}}),S=c.user&&c.user.id?Number(c.user.id):0;if(S>0){a.AppRouter.navigate("/admin/users/"+S);return}p(t("已新增使用者。","User created."),!1),await _()}catch(c){p(c.message||t("儲存失敗","Save failed"),!0)}}),l.querySelectorAll(".admin-user-delete").forEach(s=>{s.addEventListener("click",async()=>{const n=parseInt(s.getAttribute("data-id")||"0",10);if(!(!n||!confirm(t("確定刪除？","Delete this user?"))))try{await a.ScienceApi.apiFetch("/admin/users",{method:"DELETE",body:{id:n}}),p(t("已刪除。","Deleted."),!1),await _()}catch(d){p(d.message||t("刪除失敗","Delete failed"),!0)}})}),l.querySelectorAll(".admin-impersonate").forEach(s=>{s.addEventListener("click",async()=>{const n=parseInt(s.getAttribute("data-id")||"0",10),d=s.getAttribute("data-label")||"";if(!(!n||!confirm(t("確定以「"+d+"」的身分瀏覽前台？","Impersonate “"+d+"”?"))))try{await a.ScienceApi.apiFetch("/admin/users/"+n+"/impersonate",{method:"POST",body:{}}),location.href=(a.ScienceApi&&a.ScienceApi.SITE_BASE||"")+"/app/"}catch(r){p(r.message||t("模仿失敗","Impersonation failed"),!0)}})})}catch(b){l.innerHTML=`<p class="text-red-600">${e(b.message||t("載入失敗","Load failed"))}</p>`}}async function k(i){var v,y,$,x;L();const l=parseInt(i,10)||0,w=document.getElementById("page-title"),m=document.getElementById("card-container");if(w&&(w.textContent=t("編輯使用者","Edit user")),!N()){a.ScienceApi.getUser()&&(m.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(l<=0){a.AppRouter.navigate("/admin/users");return}m.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let d=function(r,u){n&&(n.textContent=r,n.classList.remove("hidden","text-emerald-700","text-red-600"),n.classList.add(u?"text-red-600":"text-emerald-700"))};var b=d;const f=await a.ScienceApi.apiFetch("/admin/users/"+l),o=f.user,E=f.roles||[];if(!o){m.innerHTML=`<p class="text-red-600">${e(t("找不到使用者。","User not found."))}</p>`;return}const g=new Set((o.role_ids||[]).map(r=>Number(r))),p=E.map(r=>`<label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="roles" value="${Number(r.id)}" class="rounded border-slate-300"${g.has(Number(r.id))?" checked":""}>
                    ${e(r.label||r.slug)}
                    <span class="text-xs text-slate-400 font-mono">${e(r.slug||"")}</span>
                </label>`).join(""),s=o.is_system?" readonly":"";m.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(A("/admin/users"))}" data-spa-nav="/admin/users" class="text-sm text-indigo-700 hover:underline">${e(t("← 使用者列表","← Users"))}</a>
                </div>
                <p id="admin-user-edit-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-user-edit" class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm max-w-2xl">
                    <label class="block text-sm font-medium text-slate-700">${e(t("帳戶名稱／電郵","Login / email"))}
                        <input name="email" required value="${e(o.email)}" class="mt-1 w-full border rounded-lg px-3 py-2"${s} autocomplete="username">
                    </label>
                    <p class="text-xs text-slate-500 -mt-2">${e(t("學校帳戶請填 QSIS 帳戶名；外部可填完整電郵。","Use QSIS username for school accounts; full email for external."))}</p>
                    <div class="grid sm:grid-cols-2 gap-4">
                        <label class="block text-sm font-medium text-slate-700">${e(t("中文名","Name ZH"))}
                            <input name="name_zh" value="${e(o.name_zh||"")}" maxlength="120" class="mt-1 w-full border rounded-lg px-3 py-2">
                        </label>
                        <label class="block text-sm font-medium text-slate-700">${e(t("英文名","Name EN"))}
                            <input name="name_en" value="${e(o.name_en||"")}" maxlength="120" class="mt-1 w-full border rounded-lg px-3 py-2">
                        </label>
                    </div>
                    <p class="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">${e(t("登入密碼由 QSIS 驗證；本站不儲存密碼。","Passwords are verified via QSIS; none are stored here."))}</p>
                    <label class="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" name="is_active" class="rounded border-slate-300"${o.is_active?" checked":""}>
                        ${e(t("啟用帳戶","Active"))}
                    </label>
                    <fieldset>
                        <legend class="text-sm font-medium text-slate-700 mb-2">${e(t("角色","Roles"))}</legend>
                        <div class="space-y-2">${p}</div>
                    </fieldset>
                    <div class="flex flex-wrap gap-3 items-center">
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">${e(t("儲存","Save"))}</button>
                        <button type="button" id="admin-user-edit-cancel" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${e(t("取消","Cancel"))}</button>
                        ${o.is_system?"":`<button type="button" id="admin-user-edit-delete" class="text-red-600 hover:underline text-sm ml-auto">${e(t("刪除使用者","Delete user"))}</button>`}
                    </div>
                </form>`;const n=document.getElementById("admin-user-edit-flash");(v=m.querySelector('[data-spa-nav="/admin/users"]'))==null||v.addEventListener("click",r=>{r.preventDefault(),a.AppRouter.navigate("/admin/users")}),(y=document.getElementById("admin-user-edit-cancel"))==null||y.addEventListener("click",()=>{a.AppRouter.navigate("/admin/users")}),($=document.getElementById("admin-user-edit"))==null||$.addEventListener("submit",async r=>{var I;r.preventDefault();const u=r.target,c=new FormData(u),S=Array.from(u.querySelectorAll('input[name="roles"]:checked')).map(h=>parseInt(h.value,10)).filter(h=>h>0);try{await a.ScienceApi.apiFetch("/admin/users/"+l,{method:"PUT",body:{email:String(c.get("email")||"").trim(),name_zh:String(c.get("name_zh")||"").trim(),name_en:String(c.get("name_en")||"").trim(),is_active:!!((I=u.querySelector('input[name="is_active"]'))!=null&&I.checked),roles:S}}),d(t("已儲存。","Saved."),!1),await k(String(l))}catch(h){d(h.message||t("儲存失敗","Save failed"),!0)}}),(x=document.getElementById("admin-user-edit-delete"))==null||x.addEventListener("click",async()=>{if(confirm(t("確定刪除？","Delete this user?")))try{await a.ScienceApi.apiFetch("/admin/users/"+l,{method:"DELETE",body:{}}),a.AppRouter.navigate("/admin/users")}catch(r){d(r.message||t("刪除失敗","Delete failed"),!0)}})}catch(f){m.innerHTML=`<p class="text-red-600">${e(f.message||t("載入失敗","Load failed"))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminUsers:_,renderAdminUserEdit:k});
