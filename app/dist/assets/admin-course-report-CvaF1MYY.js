const a=window;function s(n,r){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(n,r):n}function e(n){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(n):String(n||"")}function u(n){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(n):String(n||"")}function R(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function L(){return a.ScienceApi.getUser()?a.ScienceApi.hasPermission("class.manage_any")||a.ScienceApi.hasPermission("class.manage_own"):(a.AppRouter.navigate("/login"),!1)}function x(n,r,l){return`<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p class="text-xs text-slate-500 uppercase">${e(n)}</p>
            <p class="text-2xl font-bold ${l||"text-slate-900"}">${r}</p>
        </div>`}async function E(n){var f;R();const r=parseInt(n,10)||0,l=document.getElementById("page-title"),d=document.getElementById("card-container");if(l&&(l.textContent=s("課程學習報告","Course learning report")),!L()){a.ScienceApi.getUser()&&(d.innerHTML=`<p class="text-red-600">${e(s("沒有權限。","Forbidden."))}</p>`);return}if(r<=0){a.AppRouter.navigate("/admin/courses");return}d.innerHTML=`<p class="text-slate-500">${e(s("載入中…","Loading…"))}</p>`;try{let $=function(t,c){p&&(p.textContent=t,p.classList.remove("hidden","text-emerald-700","text-red-600"),p.classList.add(c?"text-red-600":"text-emerald-700"))};var C=$;const A=(await a.ScienceApi.apiFetch("/admin/classes/"+r)).class||{},b=await a.ScienceApi.apiFetch("/teacher/classes/"+r+"/report"),i=b.summary||{},h=b.weak_topics||[],w=b.students||[],y=h.length?`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                    <h2 class="font-bold text-amber-900 mb-2">${e(s("全班薄弱課題 TOP ","Weak topics TOP ")+h.length)}</h2>
                    <ul class="text-sm text-amber-800 space-y-1">
                        ${h.map(t=>`<li>${e(t.name_zh||"")} — ${e(s("平均","avg"))} ${Number(t.avg_mastery)}%（${Number(t.student_count)} ${e(s("人","students"))}）</li>`).join("")}
                    </ul>
                </div>`:"",_=w.map(t=>{const c=Number(t.avg_mastery||0),m=c<60?"text-red-600":c>80?"text-emerald-600":"text-amber-600",o=String(t.form_class||""),g=t.class_no!=null&&t.class_no!==""?Number(t.class_no):0,S=o||g?`<span class="block text-xs text-slate-500">${e(o+(g>0?" #"+g:""))}</span>`:"",k=t.last_attempt?Number(t.last_attempt.score)+"/"+Number(t.last_attempt.max_score):"—";return`<tr class="border-t border-slate-100">
                    <td class="p-3">
                        <span class="font-medium">${e(t.display_name||"")}</span>
                        <span class="block text-xs text-slate-400">${e(t.email||"")}</span>
                        ${S}
                    </td>
                    <td class="p-3"><span class="${m} font-medium">${c}%</span></td>
                    <td class="p-3">${Number(t.minutes_week||0)}</td>
                    <td class="p-3 text-xs">${t.last_active_at?e(t.last_active_at):"—"}</td>
                    <td class="p-3">${e(k)}</td>
                </tr>`}).join("");d.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(u(`/admin/courses/${r}`))}" data-spa-nav="/admin/courses/${r}" class="text-sm text-indigo-700 hover:underline">${e(s("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(u(`/admin/courses/${r}/students`))}" data-spa-nav="/admin/courses/${r}/students" class="text-sm text-slate-600 hover:underline">${e(s("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e(u(`/admin/courses/${r}/summer`))}" data-spa-nav="/admin/courses/${r}/summer" class="text-sm text-slate-600 hover:underline">${e(s("暑期功課","Summer HW"))}</a>
                    <a href="${e(u(`/admin/courses/${r}/worksheets`))}" data-spa-nav="/admin/courses/${r}/worksheets" class="text-sm text-slate-600 hover:underline">${e(s("工作紙派發","Worksheets"))}</a>
                    <button type="button" id="report-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${e(s("匯出 CSV","Export CSV"))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-4">${e(A.name||s("課程","Course"))}</h2>
                <p id="admin-course-report-flash" class="text-sm mb-3 hidden"></p>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    ${x(s("學生人數","Students"),String(Number(i.total_students||0)))}
                    ${x(s("本週活躍","Active this week"),String(Number(i.active_students||0)),"text-indigo-600")}
                    ${x(s("本週學習（分鐘）","Minutes this week"),String(Number(i.minutes_week||0)))}
                    ${x(s("平均掌握度","Avg mastery"),e(String(i.avg_mastery??"—"))+"%","text-emerald-600")}
                </div>
                ${y}
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${e(s("學生","Student"))}</th>
                                <th class="p-3">${e(s("平均掌握度","Avg mastery"))}</th>
                                <th class="p-3">${e(s("本週分鐘","Min / week"))}</th>
                                <th class="p-3">${e(s("最後上線","Last active"))}</th>
                                <th class="p-3">${e(s("最近測驗","Last quiz"))}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${_||`<tr><td colspan="5" class="p-6 text-slate-500 text-center">${e(s("尚無學生資料","No student data"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;const p=document.getElementById("admin-course-report-flash");d.querySelectorAll("[data-spa-nav]").forEach(t=>{t.addEventListener("click",c=>{c.preventDefault(),a.AppRouter.navigate(t.getAttribute("data-spa-nav"))})}),(f=document.getElementById("report-export-csv"))==null||f.addEventListener("click",async()=>{try{const t=await a.ScienceApi.apiFetch("/teacher/classes/"+r+"/report.csv",{method:"GET"});if(!(t instanceof Response))throw new Error(s("匯出回應格式錯誤","Unexpected export response"));const c=await t.blob(),m=URL.createObjectURL(c),o=document.createElement("a");o.href=m,o.download="class-"+r+"-report.csv",document.body.appendChild(o),o.click(),o.remove(),URL.revokeObjectURL(m),$(s("已開始下載 CSV。","CSV download started."),!1)}catch(t){$(t.message||s("匯出失敗","Export failed"),!0)}})}catch(v){d.innerHTML=`<p class="text-red-600">${e(v.message||s("載入失敗","Load failed"))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminCourseReport:E});
