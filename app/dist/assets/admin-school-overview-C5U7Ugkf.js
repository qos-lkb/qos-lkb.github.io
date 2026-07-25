const a=window;function s(r,n){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(r,n):r}function e(r){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(r):String(r||"")}function l(r){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(r):String(r||"")}function m(){const r=document.getElementById("sidebar");r&&(r.style.display="none")}async function u(){m();const r=document.getElementById("page-title"),n=document.getElementById("card-container");if(r&&(r.textContent=s("全校概覽","School overview")),!a.ScienceApi.getUser()){a.AppRouter.navigate("/login");return}if(!a.ScienceApi.hasPermission("class.manage_any")){n.innerHTML=`<p class="text-red-600">${e(s("沒有權限。","Forbidden."))}</p>`;return}n.innerHTML=`<p class="text-slate-500">${e(s("載入中…","Loading…"))}</p>`;try{const p=((await a.ScienceApi.apiFetch("/admin/school-overview")).classes||[]).map(t=>{const d=t.worksheet_submit_rate!=null?Number(t.worksheet_submit_rate)+"%":"—",c=t.summer_completion_rate!=null?Number(t.summer_completion_rate)+"%":"—",i=t.deep_link||`/admin/courses/${t.class_id}/report`;return`<tr class="border-t border-slate-100">
                <td class="p-3">
                    <div class="font-medium">${e(t.name||"")}</div>
                    <div class="text-xs text-slate-500">${e([t.form_level_label,t.school_year].filter(Boolean).join(" · "))}</div>
                </td>
                <td class="p-3">${Number(t.active_students||0)}/${Number(t.total_students||0)}</td>
                <td class="p-3">${Number(t.minutes_week||0)}</td>
                <td class="p-3">${t.avg_mastery!=null?Number(t.avg_mastery)+"%":"—"}</td>
                <td class="p-3">${e(d)}</td>
                <td class="p-3 text-amber-700">${Number(t.worksheet_ungraded||0)}</td>
                <td class="p-3 text-red-600">${Number(t.worksheet_overdue||0)}</td>
                <td class="p-3">${e(c)}</td>
                <td class="p-3">
                    <a href="${e(l(i))}" data-spa-nav="${e(i)}" class="text-indigo-600 hover:underline text-sm">${e(s("報告","Report"))}</a>
                </td>
            </tr>`}).join("");n.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${e(l("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(s("← 儀表板","← Dashboard"))}</a>
                <a href="${e(l("/admin/inbox"))}" data-spa-nav="/admin/inbox" class="text-sm text-slate-600 hover:underline">${e(s("待批改／逾期","Inbox"))}</a>
                <a href="${e(l("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${e(s("課程","Courses"))}</a>
            </div>
            <p class="text-sm text-slate-500 mb-4">${e(s("各班活躍度、工作紙呈交與待批改摘要。","Per-class activity, worksheet submission, and grading backlog."))}</p>
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left"><tr>
                        <th class="p-3">${e(s("班級","Class"))}</th>
                        <th class="p-3">${e(s("本週活躍","Active"))}</th>
                        <th class="p-3">${e(s("分鐘","Minutes"))}</th>
                        <th class="p-3">${e(s("掌握度","Mastery"))}</th>
                        <th class="p-3">${e(s("呈交率","Submit %"))}</th>
                        <th class="p-3">${e(s("待批","Ungraded"))}</th>
                        <th class="p-3">${e(s("逾期","Overdue"))}</th>
                        <th class="p-3">${e(s("暑期%","Summer %"))}</th>
                        <th class="p-3"></th>
                    </tr></thead>
                    <tbody>${p||`<tr><td colspan="9" class="p-6 text-center text-slate-500">${e(s("尚無課程","No classes"))}</td></tr>`}</tbody>
                </table>
            </div>`,n.querySelectorAll("[data-spa-nav]").forEach(t=>{t.addEventListener("click",d=>{d.preventDefault(),a.AppRouter.navigate(t.getAttribute("data-spa-nav"))})})}catch(o){n.innerHTML=`<p class="text-red-600">${e(o.message||s("載入失敗","Load failed"))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminSchoolOverview:u});
