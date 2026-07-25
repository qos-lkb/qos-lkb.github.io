const r=window;function e(a,c){return r.AppRouter&&r.AppRouter.t?r.AppRouter.t(a,c):a}function t(a){return r.AppRouter&&r.AppRouter.escapeHtml?r.AppRouter.escapeHtml(a):String(a||"")}function m(a){return r.AppRouter&&r.AppRouter.spaHref?r.AppRouter.spaHref(a):String(a||"")}function L(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}function M(){return r.ScienceApi.getUser()?r.ScienceApi.hasPermission("class.manage_any")||r.ScienceApi.hasPermission("class.manage_own"):(r.AppRouter.navigate("/login"),!1)}function i(a,c,n){return`<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <p class="text-xs text-slate-500 uppercase">${t(a)}</p>
        <p class="text-2xl font-bold ${n||"text-slate-900"}">${c}</p>
    </div>`}function T(a){return{missing:e("未交","Missing"),pending:e("未開始","Pending"),submitted:e("已提交","Submitted"),graded:e("已評分","Graded")}[a]||a}function B(a){a.querySelectorAll("[data-spa-nav]").forEach(c=>{c.addEventListener("click",n=>{n.preventDefault(),r.AppRouter.navigate(c.getAttribute("data-spa-nav"))})})}async function E(a,c){L();const n=parseInt(a,10)||0,b=parseInt(c,10)||0,x=document.getElementById("page-title"),p=document.getElementById("card-container");if(x&&(x.textContent=e("學生課業總覽","Student coursework")),!M()){r.ScienceApi.getUser()&&(p.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}if(n<=0||b<=0){r.AppRouter.navigate("/admin/courses");return}p.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const l=await r.ScienceApi.apiFetch("/teacher/classes/"+n+"/students/"+b),f=l.class||{},o=l.student||{},d=l.kpis||{},v=l.worksheets||[],_=l.summer_homework||[],$=l.detail||{},w=$.mastery||[],y=$.attempts||[],S=l.recent_events||[],k=(o.display_name||o.email||"").trim()||"—",g=[o.form_class||"",o.class_no!=null?"#"+o.class_no:"",o.moi?"MOI "+o.moi:"",o.student_number?e("學號","No.")+" "+o.student_number:""].filter(Boolean).join(" · "),A=v.map(s=>{const u=String(s.submission_status||"missing"),h=s.score!=null?String(s.score):s.auto_score!=null?String(s.auto_score):"—",j=s.overdue?`<span class="ml-1 text-xs text-red-600">${t(e("逾期","Overdue"))}</span>`:"";return`<tr class="border-t border-slate-100">
                <td class="p-3">
                    <span class="font-medium">${t(s.title_zh||s.title_en||"")}</span>
                    ${j}
                </td>
                <td class="p-3">${t(T(u))}</td>
                <td class="p-3 text-xs">${s.due_at?t(s.due_at):"—"}</td>
                <td class="p-3">${t(h)}${s.max_score!=null?" / "+Number(s.max_score):""}</td>
                <td class="p-3">
                    <a href="${t(m(s.deep_link||`/admin/courses/${n}/worksheets`))}"
                       data-spa-nav="${t(s.deep_link||`/admin/courses/${n}/worksheets`)}"
                       class="text-indigo-600 hover:underline text-xs">${t(e("開啟","Open"))}</a>
                </td>
            </tr>`}).join(""),N=_.map(s=>`<tr class="border-t border-slate-100">
            <td class="p-3 font-medium">${t(s.title_zh||s.title_en||"")}</td>
            <td class="p-3">${t(s.status_label||s.status||"")}</td>
            <td class="p-3">${s.percent!=null?Number(s.percent)+"%":"—"}</td>
            <td class="p-3">${Number(s.attempts||0)}</td>
            <td class="p-3">
                <a href="${t(m(s.deep_link||"#"))}"
                   data-spa-nav="${t(s.deep_link||"")}"
                   class="text-indigo-600 hover:underline text-xs">${t(e("分析","Analytics"))}</a>
            </td>
        </tr>`).join(""),R=w.slice(0,12).map(s=>{const u=Number(s.mastery_score||0),h=u<60?"text-red-600":u>80?"text-emerald-600":"text-amber-600";return`<tr class="border-t border-slate-100">
                <td class="p-3">${t(s.name_zh||s.name_en||s.topic_id||"")}</td>
                <td class="p-3 ${h} font-medium">${u}%</td>
            </tr>`}).join(""),H=y.slice(0,10).map(s=>`<tr class="border-t border-slate-100">
            <td class="p-3 text-xs">${t(s.source_type||s.content_type||"")}</td>
            <td class="p-3">${Number(s.score||0)}/${Number(s.max_score||0)}</td>
            <td class="p-3 text-xs">${s.submitted_at?t(s.submitted_at):"—"}</td>
        </tr>`).join(""),I=S.slice(0,12).map(s=>`<tr class="border-t border-slate-100">
            <td class="p-3 text-xs">${t(s.event_type||"")}</td>
            <td class="p-3 text-xs">${t([s.content_type,s.content_id].filter(Boolean).join(" / ")||"—")}</td>
            <td class="p-3 text-xs">${s.created_at?t(s.created_at):"—"}</td>
        </tr>`).join("");p.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${t(m(`/admin/courses/${n}/students`))}" data-spa-nav="/admin/courses/${n}/students" class="text-sm text-indigo-700 hover:underline">${t(e("← 學生名單","← Students"))}</a>
                <a href="${t(m(`/admin/courses/${n}/report`))}" data-spa-nav="/admin/courses/${n}/report" class="text-sm text-slate-600 hover:underline">${t(e("學習報告","Report"))}</a>
                <a href="${t(m(`/admin/courses/${n}/worksheets`))}" data-spa-nav="/admin/courses/${n}/worksheets" class="text-sm text-slate-600 hover:underline">${t(e("工作紙派發","Worksheets"))}</a>
            </div>
            <h2 class="text-xl font-bold text-slate-900">${t(k)}</h2>
            <p class="text-sm text-slate-500 mb-1">${t(o.email||"")}</p>
            <p class="text-sm text-slate-500 mb-6">${t((f.name||"")+(g?" · "+g:""))}</p>

            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                ${i(e("工作紙已交","WS submitted"),`${Number(d.worksheets_submitted||0)}/${Number(d.worksheets_assigned||0)}`)}
                ${i(e("待批改","Ungraded"),String(Number(d.worksheets_ungraded||0)),"text-amber-600")}
                ${i(e("逾期未交","Overdue"),String(Number(d.worksheets_overdue||0)),"text-red-600")}
                ${i(e("暑期通過","Summer passed"),`${Number(d.summer_passed||0)}/${Number(d.summer_total||0)}`)}
                ${i(e("平均掌握度","Avg mastery"),d.avg_mastery!=null?Number(d.avg_mastery)+"%":"—","text-emerald-600")}
                ${i(e("本週分鐘","Min / week"),String(Number(d.minutes_week||0)))}
            </div>

            <section class="mb-8">
                <h3 class="font-bold text-slate-800 mb-3">${t(e("工作紙","Worksheets"))}</h3>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${t(e("標題","Title"))}</th>
                            <th class="p-3">${t(e("狀態","Status"))}</th>
                            <th class="p-3">${t(e("截止","Due"))}</th>
                            <th class="p-3">${t(e("分數","Score"))}</th>
                            <th class="p-3"></th>
                        </tr></thead>
                        <tbody>${A||`<tr><td colspan="5" class="p-6 text-center text-slate-500">${t(e("尚無工作紙派發","No worksheet assignments"))}</td></tr>`}</tbody>
                    </table>
                </div>
            </section>

            <section class="mb-8">
                <h3 class="font-bold text-slate-800 mb-3">${t(e("暑期功課","Summer homework"))}</h3>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${t(e("習作","Item"))}</th>
                            <th class="p-3">${t(e("狀態","Status"))}</th>
                            <th class="p-3">${t(e("最佳%","Best %"))}</th>
                            <th class="p-3">${t(e("次數","Tries"))}</th>
                            <th class="p-3"></th>
                        </tr></thead>
                        <tbody>${N||`<tr><td colspan="5" class="p-6 text-center text-slate-500">${t(e("無對應暑期功課","No summer homework"))}</td></tr>`}</tbody>
                    </table>
                </div>
            </section>

            <div class="grid lg:grid-cols-2 gap-6 mb-8">
                <section>
                    <h3 class="font-bold text-slate-800 mb-3">${t(e("課題掌握度","Topic mastery"))}</h3>
                    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left"><tr>
                                <th class="p-3">${t(e("課題","Topic"))}</th>
                                <th class="p-3">${t(e("掌握度","Mastery"))}</th>
                            </tr></thead>
                            <tbody>${R||`<tr><td colspan="2" class="p-6 text-center text-slate-500">${t(e("尚無資料","No data"))}</td></tr>`}</tbody>
                        </table>
                    </div>
                </section>
                <section>
                    <h3 class="font-bold text-slate-800 mb-3">${t(e("最近測驗","Recent quizzes"))}</h3>
                    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left"><tr>
                                <th class="p-3">${t(e("來源","Source"))}</th>
                                <th class="p-3">${t(e("分數","Score"))}</th>
                                <th class="p-3">${t(e("時間","When"))}</th>
                            </tr></thead>
                            <tbody>${H||`<tr><td colspan="3" class="p-6 text-center text-slate-500">${t(e("尚無資料","No data"))}</td></tr>`}</tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section>
                <h3 class="font-bold text-slate-800 mb-3">${t(e("最近活動","Recent activity"))}</h3>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${t(e("事件","Event"))}</th>
                            <th class="p-3">${t(e("內容","Content"))}</th>
                            <th class="p-3">${t(e("時間","When"))}</th>
                        </tr></thead>
                        <tbody>${I||`<tr><td colspan="3" class="p-6 text-center text-slate-500">${t(e("尚無資料","No data"))}</td></tr>`}</tbody>
                    </table>
                </div>
            </section>`,B(p)}catch(l){p.innerHTML=`<p class="text-red-600">${t(l.message||e("載入失敗","Load failed"))}</p>`}}r.AppAdmin=Object.assign(r.AppAdmin||{},{renderAdminStudentDossier:E});
