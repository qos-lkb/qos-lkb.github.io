const c=window;function t(n,s){return c.AppRouter&&c.AppRouter.t?c.AppRouter.t(n,s):n}function e(n){return c.AppRouter&&c.AppRouter.escapeHtml?c.AppRouter.escapeHtml(n):String(n||"")}function g(n){return c.AppRouter&&c.AppRouter.spaHref?c.AppRouter.spaHref(n):String(n||"")}function ae(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function ne(){return c.ScienceApi.getUser()?c.ScienceApi.hasPermission("class.manage_any")||c.ScienceApi.hasPermission("class.manage_own"):(c.AppRouter.navigate("/login"),!1)}function Q(n){return n==="on_time"?"bg-sky-100 text-sky-900":n==="late"?"bg-orange-100 text-orange-900":"bg-slate-100 text-slate-600"}function W(n){return(n.display_name||n.name_zh||n.name_en||n.email||"").trim()||"—"}function J(){return location.pathname.split("/app")[0]+"/app"}function ie(n,s){const h=new URLSearchParams;s.view&&s.view!=="matrix"&&h.set("view",s.view),s.view==="matrix"&&s.status&&h.set("status",s.status),s.view==="incomplete"&&s.kind&&s.kind!=="all"&&h.set("incomplete_kind",s.kind);const p=h.toString();return J()+"/admin/courses/"+n+"/summer"+(p?"?"+p:"")}function le(n,s,h){const p=h?t("截止日期：","Due: ")+String(h).slice(0,16):t("（未設截止日期）","(No due date)");return[t("同學你好，","Hello,"),"",t("請盡快登入平台完成暑期功課：","Please sign in and complete this summer homework:"),t("班級：","Class: ")+(n||""),t("習作：","Item: ")+(s||""),p,"",t("謝謝。","Thank you.")].join(`
`)}function re(n,s,h){const p={};s.forEach(l=>{const u=Number(l.id||l.user_id||0);u&&(p[u]=l)});const w={};n.forEach(l=>{w[Number(l.id)]=l});const x=[];return h.forEach(l=>{if(String(l.status||"missing")!=="missing")return;const _=Number(l.student_user_id),k=Number(l.item_id),E=p[_]||{},S=w[k]||{},A=Number(l.attempts||0);x.push({student_user_id:_,item_id:k,display_name:W(E),email:E.email||"",item_title:S.title_zh||S.title_en||"#"+k,due_at:S.due_at||null,attempts:A,percent:l.percent,kind:A<=0?"never":"retry",status_label:A<=0?t("未交","Missing"):t("須重做","Retry")})}),x.sort((l,u)=>{const _=String(l.display_name).localeCompare(String(u.display_name),"zh");return _!==0?_:String(l.item_title).localeCompare(String(u.item_title),"zh")}),x}async function X(n){var k,E,S,A,O;ae();const s=parseInt(n,10)||0,h=document.getElementById("page-title"),p=document.getElementById("card-container");if(h&&(h.textContent=t("暑期功課紀錄","Summer homework")),!ne()){c.ScienceApi.getUser()&&(p.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(s<=0){c.AppRouter.navigate("/admin/courses");return}const w=new URLSearchParams(location.search);let x=w.get("view")||"matrix";x!=="incomplete"&&(x="matrix");let l=w.get("status")||"";["","missing","on_time","late"].includes(l)||(l="");let u=w.get("incomplete_kind")||"all";["all","never","retry"].includes(u)||(u="all"),p.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let I=function(a,i){C&&(C.textContent=a,C.classList.remove("hidden","text-emerald-700","text-red-600"),C.classList.add(i?"text-red-600":"text-emerald-700"))};var _=I;const U=x==="matrix"&&l?"?status="+encodeURIComponent(l):"",N=await c.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework"+U),T=N.class||{},$=N.items||[];let R=N.students||[];const z=N.rows||[],L=N.message||null,Y=[T.form_level_label,T.course_subject_label].filter(Boolean).join(" · "),D=T.name||"",q=re($,R,z),V=q.length,H=q.filter(a=>u==="never"?a.kind==="never":u==="retry"?a.kind==="retry":!0),f={};z.forEach(a=>{const i=Number(a.student_user_id),o=Number(a.item_id);f[i]||(f[i]={}),f[i][o]=a});const Z=`
                <div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="${e(t("檢視模式","View mode"))}">
                    <button type="button" id="sh-view-matrix" class="text-sm px-3 py-1.5 rounded-lg border ${x==="matrix"?"bg-indigo-700 text-white border-indigo-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${x==="matrix"?"true":"false"}">${e(t("矩陣","Matrix"))}</button>
                    <button type="button" id="sh-view-incomplete" class="text-sm px-3 py-1.5 rounded-lg border ${x==="incomplete"?"bg-indigo-700 text-white border-indigo-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${x==="incomplete"?"true":"false"}">${e(t("未完成清單","Incomplete list"))}（${V}）</button>
                </div>`;let M="";if(x==="incomplete"){const a=`
                    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                        <label class="text-slate-600">${e(t("未完成類型","Incomplete type"))}
                            <select id="sh-incomplete-kind" class="ml-1 border rounded-lg px-2 py-1.5">
                                <option value="all"${u==="all"?" selected":""}>${e(t("全部未完成","All incomplete"))}</option>
                                <option value="never"${u==="never"?" selected":""}>${e(t("從未作答","Never attempted"))}</option>
                                <option value="retry"${u==="retry"?" selected":""}>${e(t("已試未及格","Attempted, not passed"))}</option>
                            </select>
                        </label>
                        <span class="text-slate-400">${e(t("顯示 ","Showing "))}${H.length}${e(t(" 筆",""))}</span>
                    </div>`;let i="";if(!$.length&&!L)i=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`;else if(!R.length&&$.length)i=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`;else if(!H.length)i=`<p class="text-slate-500 text-sm">${e(V===0?t("本班目前沒有未完成習作。","No incomplete homework in this class."):t("此篩選條件下沒有項目。","No items for this filter."))}</p>`;else{const o=H.map(r=>{const d=`/admin/courses/${s}/students/${r.student_user_id}`,m=`/admin/summer-homework/${r.item_id}/analytics`,v=r.due_at?String(r.due_at).slice(0,16):"—",j=r.kind==="never"?"bg-slate-100 text-slate-700":"bg-amber-100 text-amber-900";return`<tr class="border-t border-slate-100">
                            <td class="p-3">
                                <div class="font-medium">${e(r.display_name)}</div>
                                <div class="text-xs text-slate-500">${e(r.email||"—")}</div>
                            </td>
                            <td class="p-3">
                                <div>${e(r.item_title)}</div>
                                <div class="text-xs text-slate-500 mt-0.5">${e(t("截止 ","Due ")+v)}</div>
                            </td>
                            <td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${j}">${e(r.status_label)}</span>
                            </td>
                            <td class="p-3 whitespace-nowrap">${e(String(r.percent??"—"))}%</td>
                            <td class="p-3 whitespace-nowrap">${r.attempts}</td>
                            <td class="p-3 whitespace-nowrap space-x-2">
                                <a href="${e(g(m)+"?user_id="+r.student_user_id)}" data-spa-nav="${e(m)}" data-user-id="${r.student_user_id}" class="text-indigo-600 hover:underline text-sm">${e(t("分析","Analytics"))}</a>
                                <a href="${e(g(d))}" data-spa-nav="${e(d)}" class="text-slate-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a>
                                <button type="button" class="sh-chase text-sm text-amber-700 hover:underline"
                                    data-email="${e(r.email||"")}"
                                    data-reminder="${e(le(D,r.item_title,r.due_at))}">${e(t("催交","Chase"))}</button>
                            </td>
                        </tr>`}).join("");i=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-3">${e(t("學生","Student"))}</th>
                                    <th class="p-3">${e(t("習作","Item"))}</th>
                                    <th class="p-3">${e(t("狀態","Status"))}</th>
                                    <th class="p-3">${e(t("最高％","Best %"))}</th>
                                    <th class="p-3">${e(t("次數","Tries"))}</th>
                                    <th class="p-3">${e(t("操作","Actions"))}</th>
                                </tr>
                            </thead>
                            <tbody>${o}</tbody>
                        </table>
                    </div>`}M=a+i}else{const a=$.map(d=>{const m=d.title_zh||d.title_en||"#"+d.id,v=d.due_at?t("截止 ","Due ")+String(d.due_at).slice(0,16):t("無截止","No due date");return`<th class="p-3 min-w-[11rem]">
                        <div class="font-semibold">
                            <a class="text-indigo-700 hover:underline" href="${e(g("/admin/summer-homework/"+Number(d.id)+"/view"))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/view">${e(m)}</a>
                        </div>
                        <div class="text-xs font-normal text-slate-500 mt-0.5">${e(v)}</div>
                        <a class="text-xs text-indigo-600 hover:underline mt-1 inline-block" href="${e(g(`/admin/summer-homework/${Number(d.id)}/analytics`))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/analytics">${e(t("分析","Analytics"))}</a>
                    </th>`}).join(""),i=R.map(d=>{const m=Number(d.id||d.user_id||0);let v=!1;$.forEach(F=>{const y=f[m]&&f[m][Number(F.id)];y&&Number(y.attempts||0)>0&&!y.passed&&(v=!0)});const j=v?"bg-amber-50/50":"",ee=v?"bg-amber-50":"bg-white",te=$.map(F=>{const y=Number(F.id),b=f[m]&&f[m][y];if(!b)return'<td class="p-3 text-slate-400">—</td>';const P=String(b.status||"missing"),G=Number(b.attempts||0);if(G<=0)return`<td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${Q(P)}">${e(b.status_label||t("未交","Missing"))}</span>
                                <div class="mt-1.5 text-xs text-slate-400">${e(t("未交","Missing"))}</div>
                            </td>`;const K=b.first_passed_at?String(b.first_passed_at).slice(0,16):"",se=b.score!=null?`<span class="text-slate-500 text-xs">（${e(String(b.score))}/${e(String(b.max_score))}）</span>`:"";return`<td class="p-3">
                            <span class="inline-block text-xs px-2 py-0.5 rounded-full ${Q(P)}">${e(b.status_label||P)}</span>
                            <div class="mt-1.5 text-slate-800">${e(String(b.percent??"—"))}% ${se}</div>
                            <div class="text-xs text-slate-500 mt-0.5">
                                ${e(K?t("首次及格 ","First pass ")+K:t("尚未及格","Not passed yet"))}
                                · <a class="text-indigo-600 hover:underline" href="${e(g(`/admin/summer-homework/${y}/analytics`)+"?user_id="+m)}" data-spa-nav="/admin/summer-homework/${y}/analytics" data-user-id="${m}">${G} ${e(t("次","tries"))}</a>
                                · ${b.passed?`<span class="text-emerald-700 font-medium">${e(t("及格","Passed"))}</span>`:`<span class="text-amber-800 font-medium">${e(t("須重做","Retry"))}</span>`}
                            </div>
                        </td>`}).join("");return`<tr class="border-t border-slate-100 align-top ${j}">
                        <td class="p-3 sticky left-0 ${ee} font-medium whitespace-nowrap z-10">
                            ${e(W(d))}
                            <div class="text-xs text-slate-500 font-normal">${e(d.email||"")}</div>
                        </td>
                        ${te}
                    </tr>`}).join("");let o="";$.length&&R.length?o=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-3 sticky left-0 bg-slate-100 z-10">${e(t("學生","Student"))}</th>
                                    ${a}
                                </tr>
                            </thead>
                            <tbody>${i}</tbody>
                        </table>
                    </div>`:!$.length&&!L?o=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`:!R.length&&$.length&&(o=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`),M=`
                    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                        <label class="text-slate-600">${e(t("篩選狀態","Filter status"))}
                            <select id="sh-status-filter" class="ml-1 border rounded-lg px-2 py-1.5">
                                <option value=""${l===""?" selected":""}>${e(t("全部","All"))}</option>
                                <option value="missing"${l==="missing"?" selected":""}>${e(t("未交","Missing"))}</option>
                                <option value="on_time"${l==="on_time"?" selected":""}>${e(t("準時","On time"))}</option>
                                <option value="late"${l==="late"?" selected":""}>${e(t("欠交","Late"))}</option>
                            </select>
                        </label>
                        <span class="text-slate-400">${e(t("顯示至少一項符合該狀態的學生","Show students with at least one matching cell"))}</span>
                    </div>`+o}p.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(g(`/admin/courses/${s}`))}" data-spa-nav="/admin/courses/${s}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(g(`/admin/courses/${s}/students`))}" data-spa-nav="/admin/courses/${s}/students" class="text-sm text-slate-600 hover:underline">${e(t("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e(g(`/admin/courses/${s}/report`))}" data-spa-nav="/admin/courses/${s}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e(g(`/admin/courses/${s}/worksheets`))}" data-spa-nav="/admin/courses/${s}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                    <a href="${e(g("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-slate-600 hover:underline">${e(t("設計習作","Design items"))}</a>
                    <button type="button" id="sh-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${e(t("匯出 CSV","Export CSV"))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${e(D)}</h2>
                <p class="text-sm text-slate-500 mb-2">${e(Y)}</p>
                <p class="text-xs text-slate-400 mb-4">${e(t("未完成＝未交；截止後才及格＝欠交；呈交時間＝首次及格","Missing = not submitted; late = passed after due; time = first pass"))}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                ${L?`<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(L)}</div>`:""}
                ${Z}
                ${M}`;const C=document.getElementById("admin-sh-flash");async function B(a){const i="/admin/courses/"+s+"/summer";history.replaceState({path:i},"",ie(s,a)),await X(String(s))}p.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",i=>{i.preventDefault();const o=a.getAttribute("data-spa-nav"),r=parseInt(a.getAttribute("data-user-id")||"0",10)||0;if(r>0&&o&&o.indexOf("/analytics")>=0){history.pushState({path:o},"",J()+o+"?user_id="+r),c.AppRouter.dispatch(o);return}c.AppRouter.navigate(o)})}),(k=document.getElementById("sh-view-matrix"))==null||k.addEventListener("click",async()=>{await B({view:"matrix",status:l})}),(E=document.getElementById("sh-view-incomplete"))==null||E.addEventListener("click",async()=>{await B({view:"incomplete",kind:u})}),(S=document.getElementById("sh-status-filter"))==null||S.addEventListener("change",async a=>{const i=a.target.value||"";await B({view:"matrix",status:i})}),(A=document.getElementById("sh-incomplete-kind"))==null||A.addEventListener("change",async a=>{const i=a.target.value||"all";await B({view:"incomplete",kind:i})}),p.querySelectorAll(".sh-chase").forEach(a=>{a.addEventListener("click",async()=>{const i=a.getAttribute("data-reminder")||"",o=a.getAttribute("data-email")||"",r=o?`${o}

${i}`:i;try{await navigator.clipboard.writeText(r),I(t("已複製催交文案到剪貼簿。","Reminder copied to clipboard."),!1)}catch{window.prompt(t("請複製以下文案：","Copy this reminder:"),r)}})}),(O=document.getElementById("sh-export-csv"))==null||O.addEventListener("click",async a=>{const i=a.currentTarget;i.disabled=!0;try{const o=await c.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework.csv",{method:"GET"});if(!(o instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const r=await o.blob(),d=URL.createObjectURL(r),m=document.createElement("a");m.href=d,m.download="summer_homework_class_"+s+".csv",document.body.appendChild(m),m.click(),m.remove(),URL.revokeObjectURL(d),I(t("已開始下載 CSV。","CSV download started."),!1)}catch(o){I(o.message||t("匯出失敗","Export failed"),!0)}finally{i.disabled=!1}})}catch(U){p.innerHTML=`<p class="text-red-600">${e(U.message||t("載入失敗","Load failed"))}</p>`}}c.AppAdmin=Object.assign(c.AppAdmin||{},{renderAdminCourseSummer:X});
