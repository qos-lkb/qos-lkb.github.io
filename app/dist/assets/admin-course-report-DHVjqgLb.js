const a=window;function t(n,r){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(n,r):n}function e(n){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(n):String(n||"")}function l(n){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(n):String(n||"")}function U(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function M(){return a.ScienceApi.getUser()?a.ScienceApi.hasPermission("class.manage_any")||a.ScienceApi.hasPermission("class.manage_own"):(a.AppRouter.navigate("/login"),!1)}function d(n,r,u){return`<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p class="text-xs text-slate-500 uppercase">${e(n)}</p>
            <p class="text-2xl font-bold ${u||"text-slate-900"}">${r}</p>
        </div>`}async function O(n){var _;U();const r=parseInt(n,10)||0,u=document.getElementById("page-title"),m=document.getElementById("card-container");if(u&&(u.textContent=t("課程學習報告","Course learning report")),!M()){a.ScienceApi.getUser()&&(m.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(r<=0){a.AppRouter.navigate("/admin/courses");return}m.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let v=function(s,o){x&&(x.textContent=s,x.classList.remove("hidden","text-emerald-700","text-red-600"),x.classList.add(o?"text-red-600":"text-emerald-700"))};var T=v;const k=(await a.ScienceApi.apiFetch("/admin/classes/"+r)).class||{},p=await a.ScienceApi.apiFetch("/teacher/classes/"+r+"/report"),b=p.summary||{},i=p.coursework||{},g=p.weak_topics||[],y=p.students||[],N=g.length?`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                    <h2 class="font-bold text-amber-900 mb-2">${e(t("全班薄弱課題 TOP ","Weak topics TOP ")+g.length)}</h2>
                    <ul class="text-sm text-amber-800 space-y-1">
                        ${g.map(s=>`<li>${e(s.name_zh||"")} — ${e(t("平均","avg"))} ${Number(s.avg_mastery)}%（${Number(s.student_count)} ${e(t("人","students"))}）</li>`).join("")}
                    </ul>
                </div>`:"",R=y.map(s=>{const o=Number(s.avg_mastery||0),$=o<60?"text-red-600":o>80?"text-emerald-600":"text-amber-600",c=String(s.form_class||""),f=s.class_no!=null&&s.class_no!==""?Number(s.class_no):0,C=c||f?`<span class="block text-xs text-slate-500">${e(c+(f>0?" #"+f:""))}</span>`:"",H=s.last_attempt?Number(s.last_attempt.score)+"/"+Number(s.last_attempt.max_score):"—",h=s.worksheets||{},A=s.summer||{},I=Number(s.user_id),S=`/admin/courses/${r}/students/${I}`;return`<tr class="border-t border-slate-100">
                    <td class="p-3">
                        <a href="${e(l(S))}" data-spa-nav="${e(S)}" class="font-medium text-indigo-700 hover:underline">${e(s.display_name||"")}</a>
                        <span class="block text-xs text-slate-400">${e(s.email||"")}</span>
                        ${C}
                    </td>
                    <td class="p-3"><span class="${$} font-medium">${o}%</span></td>
                    <td class="p-3">${Number(s.minutes_week||0)}</td>
                    <td class="p-3 text-xs">${Number(h.submitted||0)}/${Number(h.assigned||0)}${Number(h.overdue||0)>0?` <span class="text-red-600">(${Number(h.overdue)} ${e(t("逾期","od"))})</span>`:""}</td>
                    <td class="p-3 text-xs">${Number(A.passed||0)}/${Number(A.total||0)}</td>
                    <td class="p-3 text-xs">${s.last_active_at?e(s.last_active_at):"—"}</td>
                    <td class="p-3">${e(H)}</td>
                </tr>`}).join(""),L=i.worksheet_submit_rate!=null?Number(i.worksheet_submit_rate)+"%":"—",E=i.summer_completion_rate!=null?Number(i.summer_completion_rate)+"%":"—";m.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(l(`/admin/courses/${r}`))}" data-spa-nav="/admin/courses/${r}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(l(`/admin/courses/${r}/students`))}" data-spa-nav="/admin/courses/${r}/students" class="text-sm text-slate-600 hover:underline">${e(t("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e(l(`/admin/courses/${r}/summer`))}" data-spa-nav="/admin/courses/${r}/summer" class="text-sm text-slate-600 hover:underline">${e(t("暑期功課","Summer HW"))}</a>
                    <a href="${e(l(`/admin/courses/${r}/worksheets`))}" data-spa-nav="/admin/courses/${r}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                    <a href="${e(l("/admin/inbox")+"?class_id="+r)}" data-spa-nav="/admin/inbox?class_id=${r}" class="text-sm text-slate-600 hover:underline">${e(t("待批改／逾期","Inbox"))}</a>
                    <button type="button" id="report-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${e(t("匯出 CSV","Export CSV"))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-4">${e(k.name||t("課程","Course"))}</h2>
                <p id="admin-course-report-flash" class="text-sm mb-3 hidden"></p>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    ${d(t("學生人數","Students"),String(Number(b.total_students||0)))}
                    ${d(t("本週活躍","Active this week"),String(Number(b.active_students||0)),"text-indigo-600")}
                    ${d(t("本週學習（分鐘）","Minutes this week"),String(Number(b.minutes_week||0)))}
                    ${d(t("平均掌握度","Avg mastery"),e(String(b.avg_mastery??"—"))+"%","text-emerald-600")}
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    ${d(t("工作紙呈交率","WS submit rate"),e(L),"text-indigo-700")}
                    ${d(t("待批改","Ungraded"),String(Number(i.worksheet_ungraded||0)),"text-amber-600")}
                    ${d(t("逾期未交","Overdue"),String(Number(i.worksheet_overdue||0)),"text-red-600")}
                    ${d(t("暑期完成率","Summer done"),e(E))}
                </div>
                ${N}
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${e(t("學生","Student"))}</th>
                                <th class="p-3">${e(t("平均掌握度","Avg mastery"))}</th>
                                <th class="p-3">${e(t("本週分鐘","Min / week"))}</th>
                                <th class="p-3">${e(t("工作紙","Worksheets"))}</th>
                                <th class="p-3">${e(t("暑期","Summer"))}</th>
                                <th class="p-3">${e(t("最後上線","Last active"))}</th>
                                <th class="p-3">${e(t("最近測驗","Last quiz"))}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${R||`<tr><td colspan="7" class="p-6 text-slate-500 text-center">${e(t("尚無學生資料","No student data"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;const x=document.getElementById("admin-course-report-flash");m.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault(),a.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),(_=document.getElementById("report-export-csv"))==null||_.addEventListener("click",async()=>{try{const s=await a.ScienceApi.apiFetch("/teacher/classes/"+r+"/report.csv",{method:"GET"});if(!(s instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const o=await s.blob(),$=URL.createObjectURL(o),c=document.createElement("a");c.href=$,c.download="class-"+r+"-report.csv",document.body.appendChild(c),c.click(),c.remove(),URL.revokeObjectURL($),v(t("已開始下載 CSV。","CSV download started."),!1)}catch(s){v(s.message||t("匯出失敗","Export failed"),!0)}})}catch(w){m.innerHTML=`<p class="text-red-600">${e(w.message||t("載入失敗","Load failed"))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminCourseReport:O});
