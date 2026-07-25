const i=window;function t(n,o){return i.AppRouter&&i.AppRouter.t?i.AppRouter.t(n,o):n}function e(n){return i.AppRouter&&i.AppRouter.escapeHtml?i.AppRouter.escapeHtml(n):String(n||"")}function p(n){return i.AppRouter&&i.AppRouter.spaHref?i.AppRouter.spaHref(n):String(n||"")}function F(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function P(){return i.ScienceApi.getUser()?i.ScienceApi.hasPermission("class.manage_any")||i.ScienceApi.hasPermission("class.manage_own"):(i.AppRouter.navigate("/login"),!1)}function I(n){return n==="on_time"?"bg-sky-100 text-sky-900":n==="late"?"bg-orange-100 text-orange-900":"bg-slate-100 text-slate-600"}function V(n){return(n.display_name||n.name_zh||n.name_en||n.email||"").trim()||"—"}async function H(n){var L,N;F();const o=parseInt(n,10)||0,E=document.getElementById("page-title"),f=document.getElementById("card-container");if(E&&(E.textContent=t("暑期功課紀錄","Summer homework")),!P()){i.ScienceApi.getUser()&&(f.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(o<=0){i.AppRouter.navigate("/admin/courses");return}let c=new URLSearchParams(location.search).get("status")||"";["","missing","on_time","late"].includes(c)||(c=""),f.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let S=function(s,a){v&&(v.textContent=s,v.classList.remove("hidden","text-emerald-700","text-red-600"),v.classList.add(a?"text-red-600":"text-emerald-700"))};var z=S;const y=c?"?status="+encodeURIComponent(c):"",g=await i.ScienceApi.apiFetch("/admin/classes/"+o+"/summer-homework"+y),w=g.class||{},b=g.items||[];let _=g.students||[];const U=g.rows||[],A=g.message||null,M=[w.form_level_label,w.course_subject_label].filter(Boolean).join(" · "),u={};U.forEach(s=>{const a=Number(s.student_user_id),r=Number(s.item_id);u[a]||(u[a]={}),u[a][r]=s});const j=b.map(s=>{const a=s.title_zh||s.title_en||"#"+s.id,r=s.due_at?t("截止 ","Due ")+String(s.due_at).slice(0,16):t("無截止","No due date");return`<th class="p-3 min-w-[11rem]">
                    <div class="font-semibold">
                        <a class="text-indigo-700 hover:underline" href="${e(p("/admin/summer-homework/"+Number(s.id)+"/view"))}" data-spa-nav="/admin/summer-homework/${Number(s.id)}/view">${e(a)}</a>
                    </div>
                    <div class="text-xs font-normal text-slate-500 mt-0.5">${e(r)}</div>
                    <a class="text-xs text-indigo-600 hover:underline mt-1 inline-block" href="${e(p(`/admin/summer-homework/${Number(s.id)}/analytics`))}" data-spa-nav="/admin/summer-homework/${Number(s.id)}/analytics">${e(t("分析","Analytics"))}</a>
                </th>`}).join(""),O=_.map(s=>{const a=Number(s.id||s.user_id||0);let r=!1;b.forEach(k=>{const h=u[a]&&u[a][Number(k.id)];h&&Number(h.attempts||0)>0&&!h.passed&&(r=!0)});const d=r?"bg-amber-50/50":"",m=r?"bg-amber-50":"bg-white",x=b.map(k=>{const h=Number(k.id),l=u[a]&&u[a][h];if(!l)return'<td class="p-3 text-slate-400">—</td>';const R=String(l.status||"missing"),C=Number(l.attempts||0);if(C<=0)return`<td class="p-3">
                            <span class="inline-block text-xs px-2 py-0.5 rounded-full ${I(R)}">${e(l.status_label||t("未交","Missing"))}</span>
                            <div class="mt-1.5 text-xs text-slate-400">${e(t("未交","Missing"))}</div>
                        </td>`;const B=l.first_passed_at?String(l.first_passed_at).slice(0,16):"",T=l.score!=null?`<span class="text-slate-500 text-xs">（${e(String(l.score))}/${e(String(l.max_score))}）</span>`:"";return`<td class="p-3">
                        <span class="inline-block text-xs px-2 py-0.5 rounded-full ${I(R)}">${e(l.status_label||R)}</span>
                        <div class="mt-1.5 text-slate-800">${e(String(l.percent??"—"))}% ${T}</div>
                        <div class="text-xs text-slate-500 mt-0.5">
                            ${e(B?t("首次及格 ","First pass ")+B:t("尚未及格","Not passed yet"))}
                            · <a class="text-indigo-600 hover:underline" href="${e(p(`/admin/summer-homework/${h}/analytics`)+"?user_id="+a)}" data-spa-nav="/admin/summer-homework/${h}/analytics" data-user-id="${a}">${C} ${e(t("次","tries"))}</a>
                            · ${l.passed?`<span class="text-emerald-700 font-medium">${e(t("及格","Passed"))}</span>`:`<span class="text-amber-800 font-medium">${e(t("須重做","Retry"))}</span>`}
                        </div>
                    </td>`}).join("");return`<tr class="border-t border-slate-100 align-top ${d}">
                    <td class="p-3 sticky left-0 ${m} font-medium whitespace-nowrap z-10">
                        ${e(V(s))}
                        <div class="text-xs text-slate-500 font-normal">${e(s.email||"")}</div>
                    </td>
                    ${x}
                </tr>`}).join("");let $="";b.length&&_.length?$=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3 sticky left-0 bg-slate-100 z-10">${e(t("學生","Student"))}</th>
                                ${j}
                            </tr>
                        </thead>
                        <tbody>${O}</tbody>
                    </table>
                </div>`:!b.length&&!A?$=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`:!_.length&&b.length&&($=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`),f.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(p(`/admin/courses/${o}`))}" data-spa-nav="/admin/courses/${o}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(p(`/admin/courses/${o}/students`))}" data-spa-nav="/admin/courses/${o}/students" class="text-sm text-slate-600 hover:underline">${e(t("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e(p(`/admin/courses/${o}/report`))}" data-spa-nav="/admin/courses/${o}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e(p(`/admin/courses/${o}/worksheets`))}" data-spa-nav="/admin/courses/${o}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                    <a href="${e(p("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-slate-600 hover:underline">${e(t("設計習作","Design items"))}</a>
                    <button type="button" id="sh-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${e(t("匯出 CSV","Export CSV"))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${e(w.name||"")}</h2>
                <p class="text-sm text-slate-500 mb-2">${e(M)}</p>
                <p class="text-xs text-slate-400 mb-4">${e(t("未完成＝未交；截止後才及格＝欠交；呈交時間＝首次及格","Missing = not submitted; late = passed after due; time = first pass"))}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                ${A?`<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(A)}</div>`:""}
                <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                    <label class="text-slate-600">${e(t("篩選狀態","Filter status"))}
                        <select id="sh-status-filter" class="ml-1 border rounded-lg px-2 py-1.5">
                            <option value=""${c===""?" selected":""}>${e(t("全部","All"))}</option>
                            <option value="missing"${c==="missing"?" selected":""}>${e(t("未交","Missing"))}</option>
                            <option value="on_time"${c==="on_time"?" selected":""}>${e(t("準時","On time"))}</option>
                            <option value="late"${c==="late"?" selected":""}>${e(t("欠交","Late"))}</option>
                        </select>
                    </label>
                    <span class="text-slate-400">${e(t("顯示至少一項符合該狀態的學生","Show students with at least one matching cell"))}</span>
                </div>
                ${$}`;const v=document.getElementById("admin-sh-flash");f.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",a=>{a.preventDefault();const r=s.getAttribute("data-spa-nav"),d=parseInt(s.getAttribute("data-user-id")||"0",10)||0;if(d>0&&r&&r.indexOf("/analytics")>=0){const m=location.pathname.split("/app")[0]+"/app";history.pushState({path:r},"",m+r+"?user_id="+d),i.AppRouter.dispatch(r);return}i.AppRouter.navigate(r)})}),(L=document.getElementById("sh-status-filter"))==null||L.addEventListener("change",async s=>{const a=s.target.value||"",r=location.pathname.split("/app")[0]+"/app",d="/admin/courses/"+o+"/summer",m=r+d+(a?"?status="+encodeURIComponent(a):"");history.replaceState({path:d},"",m),await H(String(o))}),(N=document.getElementById("sh-export-csv"))==null||N.addEventListener("click",async s=>{const a=s.currentTarget;a.disabled=!0;try{const r=await i.ScienceApi.apiFetch("/admin/classes/"+o+"/summer-homework.csv",{method:"GET"});if(!(r instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const d=await r.blob(),m=URL.createObjectURL(d),x=document.createElement("a");x.href=m,x.download="summer_homework_class_"+o+".csv",document.body.appendChild(x),x.click(),x.remove(),URL.revokeObjectURL(m),S(t("已開始下載 CSV。","CSV download started."),!1)}catch(r){S(r.message||t("匯出失敗","Export failed"),!0)}finally{a.disabled=!1}})}catch(y){f.innerHTML=`<p class="text-red-600">${e(y.message||t("載入失敗","Load failed"))}</p>`}}i.AppAdmin=Object.assign(i.AppAdmin||{},{renderAdminCourseSummer:H});
