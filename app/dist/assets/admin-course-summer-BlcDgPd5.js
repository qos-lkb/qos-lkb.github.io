const n=window;function t(a,o){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(a,o):a}function e(a){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(a):String(a||"")}function h(a){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(a):String(a||"")}function F(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}function P(a){return(n.ScienceApi&&n.ScienceApi.SITE_BASE||"")+"/admin/"+a}function V(){return n.ScienceApi.getUser()?n.ScienceApi.hasPermission("class.manage_any")||n.ScienceApi.hasPermission("class.manage_own"):(n.AppRouter.navigate("/login"),!1)}function I(a){return a==="on_time"?"bg-sky-100 text-sky-900":a==="late"?"bg-orange-100 text-orange-900":"bg-slate-100 text-slate-600"}function q(a){return(a.display_name||a.name_zh||a.name_en||a.email||"").trim()||"—"}async function H(a){var L,N;F();const o=parseInt(a,10)||0,E=document.getElementById("page-title"),f=document.getElementById("card-container");if(E&&(E.textContent=t("暑期功課紀錄","Summer homework")),!V()){n.ScienceApi.getUser()&&(f.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(o<=0){n.AppRouter.navigate("/admin/courses");return}let c=new URLSearchParams(location.search).get("status")||"";["","missing","on_time","late"].includes(c)||(c=""),f.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let S=function(s,r){v&&(v.textContent=s,v.classList.remove("hidden","text-emerald-700","text-red-600"),v.classList.add(r?"text-red-600":"text-emerald-700"))};var D=S;const y=c?"?status="+encodeURIComponent(c):"",g=await n.ScienceApi.apiFetch("/admin/classes/"+o+"/summer-homework"+y),w=g.class||{},b=g.items||[];let _=g.students||[];const U=g.rows||[],A=g.message||null,M=[w.form_level_label,w.course_subject_label].filter(Boolean).join(" · "),p={};U.forEach(s=>{const r=Number(s.student_user_id),i=Number(s.item_id);p[r]||(p[r]={}),p[r][i]=s});const j=b.map(s=>{const r=s.title_zh||s.title_en||"#"+s.id,i=s.due_at?t("截止 ","Due ")+String(s.due_at).slice(0,16):t("無截止","No due date");return`<th class="p-3 min-w-[11rem]">
                    <div class="font-semibold">
                        <a class="text-indigo-700 hover:underline" href="${e(P("summer_homework_view.php?id="+s.id))}">${e(r)}</a>
                    </div>
                    <div class="text-xs font-normal text-slate-500 mt-0.5">${e(i)}</div>
                    <a class="text-xs text-indigo-600 hover:underline mt-1 inline-block" href="${e(h(`/admin/summer-homework/${Number(s.id)}/analytics`))}" data-spa-nav="/admin/summer-homework/${Number(s.id)}/analytics">${e(t("分析","Analytics"))}</a>
                </th>`}).join(""),T=_.map(s=>{const r=Number(s.id||s.user_id||0);let i=!1;b.forEach(k=>{const x=p[r]&&p[r][Number(k.id)];x&&Number(x.attempts||0)>0&&!x.passed&&(i=!0)});const d=i?"bg-amber-50/50":"",m=i?"bg-amber-50":"bg-white",u=b.map(k=>{const x=Number(k.id),l=p[r]&&p[r][x];if(!l)return'<td class="p-3 text-slate-400">—</td>';const R=String(l.status||"missing"),B=Number(l.attempts||0);if(B<=0)return`<td class="p-3">
                            <span class="inline-block text-xs px-2 py-0.5 rounded-full ${I(R)}">${e(l.status_label||t("未交","Missing"))}</span>
                            <div class="mt-1.5 text-xs text-slate-400">${e(t("未交","Missing"))}</div>
                        </td>`;const C=l.first_passed_at?String(l.first_passed_at).slice(0,16):"",O=l.score!=null?`<span class="text-slate-500 text-xs">（${e(String(l.score))}/${e(String(l.max_score))}）</span>`:"";return`<td class="p-3">
                        <span class="inline-block text-xs px-2 py-0.5 rounded-full ${I(R)}">${e(l.status_label||R)}</span>
                        <div class="mt-1.5 text-slate-800">${e(String(l.percent??"—"))}% ${O}</div>
                        <div class="text-xs text-slate-500 mt-0.5">
                            ${e(C?t("首次及格 ","First pass ")+C:t("尚未及格","Not passed yet"))}
                            · <a class="text-indigo-600 hover:underline" href="${e(h(`/admin/summer-homework/${x}/analytics`)+"?user_id="+r)}" data-spa-nav="/admin/summer-homework/${x}/analytics" data-user-id="${r}">${B} ${e(t("次","tries"))}</a>
                            · ${l.passed?`<span class="text-emerald-700 font-medium">${e(t("及格","Passed"))}</span>`:`<span class="text-amber-800 font-medium">${e(t("須重做","Retry"))}</span>`}
                        </div>
                    </td>`}).join("");return`<tr class="border-t border-slate-100 align-top ${d}">
                    <td class="p-3 sticky left-0 ${m} font-medium whitespace-nowrap z-10">
                        ${e(q(s))}
                        <div class="text-xs text-slate-500 font-normal">${e(s.email||"")}</div>
                    </td>
                    ${u}
                </tr>`}).join("");let $="";b.length&&_.length?$=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3 sticky left-0 bg-slate-100 z-10">${e(t("學生","Student"))}</th>
                                ${j}
                            </tr>
                        </thead>
                        <tbody>${T}</tbody>
                    </table>
                </div>`:!b.length&&!A?$=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`:!_.length&&b.length&&($=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`),f.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(h(`/admin/courses/${o}`))}" data-spa-nav="/admin/courses/${o}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(h(`/admin/courses/${o}/students`))}" data-spa-nav="/admin/courses/${o}/students" class="text-sm text-slate-600 hover:underline">${e(t("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e(h(`/admin/courses/${o}/report`))}" data-spa-nav="/admin/courses/${o}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e(h(`/admin/courses/${o}/worksheets`))}" data-spa-nav="/admin/courses/${o}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                    <a href="${e(h("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-slate-600 hover:underline">${e(t("設計習作","Design items"))}</a>
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
                ${$}`;const v=document.getElementById("admin-sh-flash");f.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",r=>{r.preventDefault();const i=s.getAttribute("data-spa-nav"),d=parseInt(s.getAttribute("data-user-id")||"0",10)||0;if(d>0&&i&&i.indexOf("/analytics")>=0){const m=location.pathname.split("/app")[0]+"/app";history.pushState({path:i},"",m+i+"?user_id="+d),n.AppRouter.dispatch(i);return}n.AppRouter.navigate(i)})}),(L=document.getElementById("sh-status-filter"))==null||L.addEventListener("change",async s=>{const r=s.target.value||"",i=location.pathname.split("/app")[0]+"/app",d="/admin/courses/"+o+"/summer",m=i+d+(r?"?status="+encodeURIComponent(r):"");history.replaceState({path:d},"",m),await H(String(o))}),(N=document.getElementById("sh-export-csv"))==null||N.addEventListener("click",async s=>{const r=s.currentTarget;r.disabled=!0;try{const i=await n.ScienceApi.apiFetch("/admin/classes/"+o+"/summer-homework.csv",{method:"GET"});if(!(i instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const d=await i.blob(),m=URL.createObjectURL(d),u=document.createElement("a");u.href=m,u.download="summer_homework_class_"+o+".csv",document.body.appendChild(u),u.click(),u.remove(),URL.revokeObjectURL(m),S(t("已開始下載 CSV。","CSV download started."),!1)}catch(i){S(i.message||t("匯出失敗","Export failed"),!0)}finally{r.disabled=!1}})}catch(y){f.innerHTML=`<p class="text-red-600">${e(y.message||t("載入失敗","Load failed"))}</p>`}}n.AppAdmin=Object.assign(n.AppAdmin||{},{renderAdminCourseSummer:H});
