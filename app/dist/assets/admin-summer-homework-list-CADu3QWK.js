const s=window;function t(a,r){return s.AppRouter&&s.AppRouter.t?s.AppRouter.t(a,r):a}function e(a){return s.AppRouter&&s.AppRouter.escapeHtml?s.AppRouter.escapeHtml(a):String(a||"")}function d(a){return s.AppRouter&&s.AppRouter.spaHref?s.AppRouter.spaHref(a):String(a||"")}function v(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}function b(a){return{draft:t("草稿","Draft"),pending_review:t("待審核","Pending review"),published:t("已發佈","Published")}[a]||a}function x(){const a=s.ScienceApi;return!a||!a.getUser()?!1:a.hasPermission("summer_homework.manage_any")||a.hasPermission("summer_homework.manage_own")||a.hasPermission("class.manage_any")||a.hasPermission("class.manage_own")}function y(){const a=s.ScienceApi;return a.hasPermission("summer_homework.manage_any")||a.hasPermission("summer_homework.manage_own")}function A(a){a.querySelectorAll("[data-spa-nav]").forEach(r=>{r.addEventListener("click",m=>{m.preventDefault(),s.AppRouter.navigate(r.getAttribute("data-spa-nav"))})})}async function p(){var u;v();const a=document.getElementById("page-title"),r=document.getElementById("card-container");if(a&&(a.textContent=t("暑期功課","Summer homework")),!s.ScienceApi.getUser()){s.AppRouter.navigate("/login");return}if(!x()){r.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`;return}const m=y();r.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{const l=await s.ScienceApi.apiFetch("/admin/summer-homework"),g=(Array.isArray(l)?l:[]).map(n=>{const i=Number(n.id),o=n.title_zh||n.title_en||"—",c=String(n.form_level)==="2"?t("中二","S2"):t("中一","S1"),f=n.content_type==="video"?t("影片","Video"):t("閱讀","Reading"),w=n.due_at||"—",$=n.due_at?n.allow_late_submit?t("允許","Allowed"):t("禁止","Blocked"):"—",h=!!n.can_manage;return`<tr class="border-t border-slate-100">
                    <td class="p-3 font-medium">${e(o)}</td>
                    <td class="p-3">${e(c)}</td>
                    <td class="p-3">${e(f)}</td>
                    <td class="p-3">${e(String(n.pass_percent??""))}%</td>
                    <td class="p-3 text-xs whitespace-nowrap">${e(String(w))}</td>
                    <td class="p-3">${e($)}</td>
                    <td class="p-3">${e(b(n.status))}</td>
                    <td class="p-3 font-mono text-xs">${e(n.slug||"")}</td>
                    <td class="p-3 text-xs text-slate-500">${e(n.updated_at||"")}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        <a class="text-indigo-600 hover:underline" href="${e(d("/admin/summer-homework/"+i+"/view"))}" data-spa-nav="/admin/summer-homework/${i}/view">${e(t("內容／答案","Content / answers"))}</a>
                        <a class="text-indigo-600 hover:underline ml-2" href="${e(d("/admin/summer-homework/"+i+"/preview"))}" data-spa-nav="/admin/summer-homework/${i}/preview">${e(t("預覽","Preview"))}</a>
                        <a class="text-indigo-600 hover:underline ml-2" href="${e(d("/admin/summer-homework/"+i+"/analytics"))}" data-spa-nav="/admin/summer-homework/${i}/analytics">${e(t("分析","Analytics"))}</a>
                        ${h?`<a class="text-indigo-600 hover:underline ml-2" href="${e(d("/admin/summer-homework/"+i+"/edit"))}" data-spa-nav="/admin/summer-homework/${i}/edit">${e(t("編輯","Edit"))}</a>`:""}
                        ${h?`<button type="button" class="text-red-600 hover:underline ml-2 sh-delete" data-id="${i}">${e(t("刪除","Delete"))}</button>`:""}
                    </td>
                </tr>`}).join("");r.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(d("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                    ${m?`<a href="${e(d("/admin/summer-homework/new"))}" data-spa-nav="/admin/summer-homework/new" class="text-sm rounded-lg bg-indigo-700 text-white px-3 py-1.5 font-semibold hover:bg-indigo-800">${e(t("新增習作","New item"))}</a>`:""}
                    ${s.ScienceApi.hasPermission("summer_homework.manage_any")?`<a href="${e(d("/admin/review-queue"))}" data-spa-nav="/admin/review-queue" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${e(t("審核佇列","Review queue"))}</a>`:""}
                    <button type="button" id="admin-sh-reload" class="text-sm px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">${e(t("重新整理","Reload"))}</button>
                </div>
                <p class="text-sm text-slate-600 mb-4">${e(t("教師／管理員可檢視全部習作內容、答案與呈交分析；編輯限擁有者或管理員。","Teachers/admins can review all items; edit is limited to owners or admins."))}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${e(t("標題","Title"))}</th>
                                <th class="p-3">${e(t("級別","Form"))}</th>
                                <th class="p-3">${e(t("類型","Type"))}</th>
                                <th class="p-3">${e(t("及格%","Pass %"))}</th>
                                <th class="p-3">${e(t("截止日期","Due"))}</th>
                                <th class="p-3">${e(t("遲交","Late"))}</th>
                                <th class="p-3">${e(t("狀態","Status"))}</th>
                                <th class="p-3">slug</th>
                                <th class="p-3">${e(t("更新","Updated"))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${g||`<tr><td colspan="10" class="p-6 text-slate-500 text-center">${e(t("尚未建立暑期功課。","No summer homework yet."))}${m?e(t("請按「新增習作」。"," Use “New item”.")):""}</td></tr>`}
                        </tbody>
                    </table>
                </div>`,A(r),(u=document.getElementById("admin-sh-reload"))==null||u.addEventListener("click",()=>{p()}),r.querySelectorAll(".sh-delete").forEach(n=>{n.addEventListener("click",async()=>{const i=Number(n.getAttribute("data-id")||0);if(i<=0||!window.confirm(t("確定刪除此習作？","Delete this item?")))return;const o=document.getElementById("admin-sh-flash");try{await s.ScienceApi.apiFetch("/admin/summer-homework",{method:"DELETE",body:{id:i}}),await p()}catch(c){o&&(o.textContent=c.message||t("刪除失敗","Delete failed"),o.className="text-sm mb-3 text-red-600")}})})}catch(l){r.innerHTML=`<p class="text-red-600">${e(l.message||t("載入失敗","Load failed"))}</p>`}}s.AppAdmin=Object.assign(s.AppAdmin||{},{renderAdminSummerHomeworkList:p});
