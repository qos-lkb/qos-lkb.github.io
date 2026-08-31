const r=window;function t(d,a){return r.AppRouter&&r.AppRouter.t?r.AppRouter.t(d,a):d}function e(d){return r.AppRouter&&r.AppRouter.escapeHtml?r.AppRouter.escapeHtml(d):String(d||"")}function i(d){return r.AppRouter&&r.AppRouter.spaHref?r.AppRouter.spaHref(d):String(d||"")}function F(){const d=document.getElementById("sidebar");d&&(d.style.display="none")}function P(){return r.ScienceApi.getUser()?r.ScienceApi.hasPermission("class.manage_any")||r.ScienceApi.hasPermission("class.manage_own"):(r.AppRouter.navigate("/login"),!1)}function c(d,a,$){return`<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p class="text-xs text-slate-500 uppercase">${e(d)}</p>
            <p class="text-2xl font-bold ${$||"text-slate-900"}">${a}</p>
        </div>`}async function V(d){var N;F();const a=parseInt(d,10)||0,$=document.getElementById("page-title"),u=document.getElementById("card-container");if($&&($.textContent=t("課程學習報告","Course learning report")),!P()){r.ScienceApi.getUser()&&(u.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(a<=0){r.AppRouter.navigate("/admin/courses");return}u.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let k=function(s,n){_&&(_.textContent=s,_.classList.remove("hidden","text-emerald-700","text-red-600"),_.classList.add(n?"text-red-600":"text-emerald-700"))};var q=k;const g=(await r.ScienceApi.apiFetch("/admin/classes/"+a)).class||{},p=await r.ScienceApi.apiFetch("/teacher/classes/"+a+"/report"),v=p.summary||{},m=p.coursework||{},w=p.weak_topics||[],y=p.students||[],H=w.length?`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                    <h2 class="font-bold text-amber-900 mb-2">${e(t("全班薄弱課題 TOP ","Weak topics TOP ")+w.length)}</h2>
                    <ul class="text-sm text-amber-800 space-y-1">
                        ${w.map(s=>`<li>${e(s.name_zh||"")} — ${e(t("平均","avg"))} ${Number(s.avg_mastery)}%（${Number(s.student_count)} ${e(t("人","students"))}）</li>`).join("")}
                    </ul>
                </div>`:"",T=y.map(s=>{const n=Number(s.avg_mastery||0),l=n<60?"text-red-600":n>80?"text-emerald-600":"text-amber-600",o=String(s.form_class||""),x=s.class_no!=null&&s.class_no!==""?Number(s.class_no):0,U=o||x?`<span class="block text-xs text-slate-500">${e(o+(x>0?" #"+x:""))}</span>`:"",O=s.last_attempt?Number(s.last_attempt.score)+"/"+Number(s.last_attempt.max_score):"—",f=s.worksheets||{},C=s.summer||{},W=Number(s.user_id),E=`/admin/courses/${a}/students/${W}`;return`<tr class="border-t border-slate-100">
                    <td class="p-3">
                        <a href="${e(i(E))}" data-spa-nav="${e(E)}" class="font-medium text-indigo-700 hover:underline">${e(s.display_name||"")}</a>
                        <span class="block text-xs text-slate-400">${e(s.email||"")}</span>
                        ${U}
                    </td>
                    <td class="p-3"><span class="${l} font-medium">${n}%</span></td>
                    <td class="p-3">${Number(s.minutes_week||0)}</td>
                    <td class="p-3 text-xs">${Number(f.submitted||0)}/${Number(f.assigned||0)}${Number(f.overdue||0)>0?` <span class="text-red-600">(${Number(f.overdue)} ${e(t("逾期","od"))})</span>`:""}</td>
                    <td class="p-3 text-xs">${Number(C.passed||0)}/${Number(C.total||0)}</td>
                    <td class="p-3 text-xs">${s.last_active_at?e(s.last_active_at):"—"}</td>
                    <td class="p-3">${e(O)}</td>
                </tr>`}).join(""),A=y.slice().sort((s,n)=>{const l=Number(s.avg_mastery||0),o=Number(n.avg_mastery||0);return o!==l?o-l:Number(n.minutes_week||0)-Number(s.minutes_week||0)}).slice(0,3),h=y.slice().sort((s,n)=>Number(n.minutes_week||0)-Number(s.minutes_week||0))[0]||null,j=A.length?`<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h3 class="font-bold text-indigo-900">${e(t("Top N 同班排行榜","Top N class leaderboard"))}</h3>
                        <div class="text-right">
                            <p class="text-xs text-indigo-700 uppercase tracking-wide">${e(t("本週挑戰（分鐘）","Weekly challenge (minutes)"))}</p>
                            <p class="text-sm font-bold text-indigo-900">${e(h?h.display_name||"":"—")}</p>
                            <p class="text-xs text-indigo-700">${h?Number(h.minutes_week||0):0} ${e(t("分鐘","min"))}</p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${A.map((s,n)=>{const l=s.display_name||"",o=Number(s.avg_mastery||0),x=Number(s.minutes_week||0);return`<div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-indigo-100 rounded-lg">
                                <span class="text-sm font-medium text-slate-800">${n+1}. ${e(l)}</span>
                                <span class="text-xs text-slate-600">${o}% · ${x} ${e(t("分鐘","min"))}</span>
                            </div>`}).join("")}
                    </div>
                </div>`:"",b=p.achievements_summary||{},R=b.top_streaks||[],L=b.badge_unlock_counts||[],M=`
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <h3 class="font-bold text-emerald-900 mb-3">${e(t("連續學習／徽章摘要","Streak / badges summary"))}</h3>
                    <div class="grid sm:grid-cols-3 gap-3 mb-4 text-sm">
                        <div class="bg-white rounded-lg border border-emerald-100 p-3">
                            <p class="text-xs text-slate-500">${e(t("平均連續天數","Avg streak"))}</p>
                            <p class="text-xl font-bold text-emerald-700">${Number(b.avg_current_streak||0)}</p>
                        </div>
                        <div class="bg-white rounded-lg border border-emerald-100 p-3">
                            <p class="text-xs text-slate-500">${e(t("連續 ≥3 天人數","Students with streak ≥3"))}</p>
                            <p class="text-xl font-bold text-emerald-700">${Number(b.students_with_streak_ge_3||0)}</p>
                        </div>
                        <div class="bg-white rounded-lg border border-emerald-100 p-3">
                            <p class="text-xs text-slate-500">${e(t("抽樣學生數","Students sampled"))}</p>
                            <p class="text-xl font-bold text-slate-700">${Number(b.students_sampled||0)}</p>
                        </div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs font-medium text-emerald-900 mb-2">${e(t("連續天數 Top 3","Top 3 streaks"))}</p>
                            ${R.length?`<ul class="text-sm space-y-1">${R.map((s,n)=>`<li>${n+1}. ${e(s.display_name||"")} — ${Number(s.current_streak_days||0)} ${e(t("天","days"))}</li>`).join("")}</ul>`:`<p class="text-sm text-slate-500">${e(t("尚無資料","No data"))}</p>`}
                        </div>
                        <div>
                            <p class="text-xs font-medium text-emerald-900 mb-2">${e(t("徽章解鎖次數","Badge unlocks"))}</p>
                            ${L.length?`<ul class="text-sm space-y-1">${L.slice(0,5).map(s=>`<li>${e(s.label_zh||s.badge_id||"")} × ${Number(s.count||0)}</li>`).join("")}</ul>`:`<p class="text-sm text-slate-500">${e(t("尚無徽章","No badges yet"))}</p>`}
                        </div>
                    </div>
                </div>`,B=m.worksheet_submit_rate!=null?Number(m.worksheet_submit_rate)+"%":"—",I=m.summer_completion_rate!=null?Number(m.summer_completion_rate)+"%":"—";u.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(i(`/admin/courses/${a}`))}" data-spa-nav="/admin/courses/${a}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(i(`/admin/courses/${a}/students`))}" data-spa-nav="/admin/courses/${a}/students" class="text-sm text-slate-600 hover:underline">${e(t("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e(i(`/admin/courses/${a}/summer`))}" data-spa-nav="/admin/courses/${a}/summer" class="text-sm text-slate-600 hover:underline">${e(t("暑期功課","Summer HW"))}</a>
                    ${g.can_chase_previous_summer||g.form_level==="2"||g.form_level==="3"?`<a href="${e(i(`/admin/courses/${a}/summer?cohort=previous`))}" data-spa-nav="/admin/courses/${a}/summer?cohort=previous" class="text-sm text-amber-800 hover:underline">${e(t("上學年追收","Last-year chase"))}</a>`:""}
                    <a href="${e(i(`/admin/courses/${a}/summer`)+"?view=incomplete")}" data-spa-nav="/admin/courses/${a}/summer?view=incomplete" class="text-sm text-amber-700 hover:underline">${e(t("暑期催收","Summer chase"))}</a>
                    <a href="${e(i(`/admin/courses/${a}/worksheets`))}" data-spa-nav="/admin/courses/${a}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                    <a href="${e(i("/admin/inbox")+"?class_id="+a)}" data-spa-nav="/admin/inbox?class_id=${a}" class="text-sm text-slate-600 hover:underline">${e(t("待批改／逾期","Inbox"))}</a>
                    <a href="${e(i(`/admin/courses/${a}/discussions`))}" data-spa-nav="/admin/courses/${a}/discussions" class="text-sm text-slate-600 hover:underline">${e(t("討論審核","Discussions"))}</a>
                    <button type="button" id="report-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${e(t("匯出 CSV","Export CSV"))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-4">${e(g.name||t("課程","Course"))}</h2>
                <p id="admin-course-report-flash" class="text-sm mb-3 hidden"></p>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    ${c(t("學生人數","Students"),String(Number(v.total_students||0)))}
                    ${c(t("本週活躍","Active this week"),String(Number(v.active_students||0)),"text-indigo-600")}
                    ${c(t("本週學習（分鐘）","Minutes this week"),String(Number(v.minutes_week||0)))}
                    ${c(t("平均掌握度","Avg mastery"),e(String(v.avg_mastery??"—"))+"%","text-emerald-600")}
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    ${c(t("工作紙呈交率","WS submit rate"),e(B),"text-indigo-700")}
                    ${c(t("待批改","Ungraded"),String(Number(m.worksheet_ungraded||0)),"text-amber-600")}
                    ${c(t("逾期未交","Overdue"),String(Number(m.worksheet_overdue||0)),"text-red-600")}
                    ${c(t("暑期完成率","Summer done"),e(I))}
                </div>
                ${H}
                ${M}
                ${j}
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
                            ${T||`<tr><td colspan="7" class="p-6 text-slate-500 text-center">${e(t("尚無學生資料","No student data"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;const _=document.getElementById("admin-course-report-flash");u.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",n=>{n.preventDefault(),r.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),(N=document.getElementById("report-export-csv"))==null||N.addEventListener("click",async()=>{try{const s=await r.ScienceApi.apiFetch("/teacher/classes/"+a+"/report.csv",{method:"GET"});if(!(s instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const n=await s.blob(),l=URL.createObjectURL(n),o=document.createElement("a");o.href=l,o.download="class-"+a+"-report.csv",document.body.appendChild(o),o.click(),o.remove(),URL.revokeObjectURL(l),k(t("已開始下載 CSV。","CSV download started."),!1)}catch(s){k(s.message||t("匯出失敗","Export failed"),!0)}})}catch(S){u.innerHTML=`<p class="text-red-600">${e(S.message||t("載入失敗","Load failed"))}</p>`}}r.AppAdmin=Object.assign(r.AppAdmin||{},{renderAdminCourseReport:V});
