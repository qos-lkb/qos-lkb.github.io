const a=window;function s(t,n){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(t,n):t}function e(t){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(t):String(t||"")}function o(t){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(t):String(t||"")}function f(){const t=document.getElementById("sidebar");t&&(t.style.display="none")}function b(t){return{draft:s("草稿","Draft"),pending_review:s("待審核","Pending review"),published:s("已發佈","Published")}[t]||t}function w(){const t=a.ScienceApi;return!t||!t.getUser()?!1:t.hasPermission("worksheet.manage_any")||t.hasPermission("worksheet.manage_own")}function x(t){const n=a.ScienceApi,i=n.getUser();return i?n.hasPermission("worksheet.manage_any")?!0:Number(t.owner_user_id||0)===Number(i.id):!1}function v(t){t.querySelectorAll("[data-spa-nav]").forEach(n=>{n.addEventListener("click",i=>{i.preventDefault(),a.AppRouter.navigate(n.getAttribute("data-spa-nav"))})})}async function p(){var u;f();const t=document.getElementById("page-title"),n=document.getElementById("card-container"),i=a.ScienceApi.hasPermission("worksheet.manage_any");if(t&&(t.textContent=i?s("工作紙","Worksheets"):s("我的工作紙","My worksheets")),!a.ScienceApi.getUser()){a.AppRouter.navigate("/login");return}if(!w()){n.innerHTML=`<p class="text-red-600">${e(s("沒有權限。","Forbidden."))}</p>`;return}const m=a.ScienceApi.hasPermission("class.manage_any")||a.ScienceApi.hasPermission("class.manage_own");n.innerHTML=`<p class="text-slate-500">${e(s("載入中…","Loading…"))}</p>`;try{const c=await a.ScienceApi.apiFetch("/admin/worksheets"),h=(Array.isArray(c)?c:[]).map(r=>{const d=Number(r.id),l=x(r);return`<tr class="border-t border-slate-100">
                    <td class="p-3">${e(r.title_zh||r.title_en||"—")}</td>
                    <td class="p-3 font-mono text-xs">${e(r.slug||"")}</td>
                    <td class="p-3">${e(b(r.status))}</td>
                    <td class="p-3 text-xs">${e(r.updated_at||"")}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        ${l?`<a href="${e(o("/admin/worksheets/"+d+"/edit"))}" data-spa-nav="/admin/worksheets/${d}/edit" class="text-indigo-600 hover:underline">${e(s("編輯","Edit"))}</a>`:""}
                        <a href="${e(o("/worksheet/"+encodeURIComponent(r.slug||"")))}" class="text-slate-600 hover:underline ml-2" target="_blank" rel="noopener">${e(s("預覽","Preview"))}</a>
                        ${l?`<button type="button" class="text-red-600 hover:underline ml-2 ws-delete" data-id="${d}">${e(s("刪除","Delete"))}</button>`:""}
                    </td>
                </tr>`}).join("");n.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(o("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(s("← 管理首頁","← Admin home"))}</a>
                    <a href="${e(o("/admin/worksheets/new"))}" data-spa-nav="/admin/worksheets/new" class="text-sm rounded-lg bg-indigo-700 text-white px-3 py-1.5 font-semibold hover:bg-indigo-800">${e(s("新增工作紙","New worksheet"))}</a>
                    ${i?`<a href="${e(o("/admin/review-queue"))}" data-spa-nav="/admin/review-queue" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${e(s("審核佇列","Review queue"))}</a>`:""}
                    ${m?`<a href="${e(o("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${e(s("課程派發","Course assign"))}</a>`:""}
                    <button type="button" id="admin-ws-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${e(s("重新整理","Reload"))}</button>
                </div>
                ${i?"":`<p class="text-sm text-slate-600 mb-4">${e(s("在此設計工作紙內容；完成後到「課程管理」派發給學生。提交「待審核」後，管理員可發佈至全站列表。","Design worksheets here; assign from Courses. Submit for review to publish site-wide."))}</p>`}
                <p id="admin-ws-flash" class="text-sm mb-3 hidden"></p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100">
                            <tr>
                                <th class="p-3 text-left">${e(s("標題","Title"))}</th>
                                <th class="p-3">slug</th>
                                <th class="p-3">${e(s("狀態","Status"))}</th>
                                <th class="p-3">${e(s("更新","Updated"))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${h||`<tr><td colspan="5" class="p-6 text-center text-slate-500">${e(s("尚無工作紙。","No worksheets yet."))} <a href="${e(o("/admin/worksheets/new"))}" data-spa-nav="/admin/worksheets/new" class="text-indigo-600 hover:underline">${e(s("新增第一份工作紙","Create the first worksheet"))}</a></td></tr>`}
                        </tbody>
                    </table>
                </div>`,v(n),(u=document.getElementById("admin-ws-reload"))==null||u.addEventListener("click",()=>{p()}),n.querySelectorAll(".ws-delete").forEach(r=>{r.addEventListener("click",async()=>{const d=Number(r.getAttribute("data-id")||0);if(d<=0||!window.confirm(s("確定刪除此工作紙？","Delete this worksheet?")))return;const l=document.getElementById("admin-ws-flash");try{await a.ScienceApi.apiFetch("/admin/worksheets",{method:"DELETE",body:{id:d}}),await p()}catch(g){l&&(l.textContent=g.message||s("刪除失敗","Delete failed"),l.className="text-sm mb-3 text-red-600")}})})}catch(c){n.innerHTML=`<p class="text-red-600">${e(c.message||s("載入失敗","Load failed"))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminWorksheetsList:p});
