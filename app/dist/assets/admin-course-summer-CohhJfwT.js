const c=window;function t(a,s){return c.AppRouter&&c.AppRouter.t?c.AppRouter.t(a,s):a}function e(a){return c.AppRouter&&c.AppRouter.escapeHtml?c.AppRouter.escapeHtml(a):String(a||"")}function g(a){return c.AppRouter&&c.AppRouter.spaHref?c.AppRouter.spaHref(a):String(a||"")}function ae(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}function ne(){return c.ScienceApi.getUser()?c.ScienceApi.hasPermission("class.manage_any")||c.ScienceApi.hasPermission("class.manage_own"):(c.AppRouter.navigate("/login"),!1)}function Q(a){return a==="on_time"?"bg-sky-100 text-sky-900":a==="late"?"bg-orange-100 text-orange-900":a==="overdue"?"bg-red-100 text-red-900":"bg-slate-100 text-slate-600"}function W(a){return(a.display_name||a.name_zh||a.name_en||a.email||"").trim()||"—"}function J(){return location.pathname.split("/app")[0]+"/app"}function ie(a,s){const h=new URLSearchParams;s.view&&s.view!=="matrix"&&h.set("view",s.view),s.view==="matrix"&&s.status&&h.set("status",s.status),s.view==="incomplete"&&s.kind&&s.kind!=="all"&&h.set("incomplete_kind",s.kind);const p=h.toString();return J()+"/admin/courses/"+a+"/summer"+(p?"?"+p:"")}function re(a,s,h){const p=h?t("截止日期：","Due: ")+String(h).slice(0,16):t("（未設截止日期）","(No due date)");return[t("同學你好，","Hello,"),"",t("請盡快登入平台完成暑期功課：","Please sign in and complete this summer homework:"),t("班級：","Class: ")+(a||""),t("習作：","Item: ")+(s||""),p,"",t("謝謝。","Thank you.")].join(`
`)}function le(a,s,h){const p={};s.forEach(i=>{const m=Number(i.id||i.user_id||0);m&&(p[m]=i)});const w={};a.forEach(i=>{w[Number(i.id)]=i});const x=[];return h.forEach(i=>{const m=String(i.status||"missing");if(m!=="missing"&&m!=="overdue")return;const _=Number(i.student_user_id),k=Number(i.item_id),A=p[_]||{},S=w[k]||{},N=Number(i.attempts||0);x.push({student_user_id:_,item_id:k,display_name:W(A),email:A.email||"",item_title:S.title_zh||S.title_en||"#"+k,due_at:S.due_at||null,attempts:N,percent:i.percent,status:m,kind:N<=0?"never":"retry",status_label:i.status_label||(m==="overdue"?t("欠交","Overdue"):t("未交","Missing"))})}),x.sort((i,m)=>{const _=String(i.display_name).localeCompare(String(m.display_name),"zh");return _!==0?_:String(i.item_title).localeCompare(String(m.item_title),"zh")}),x}async function X(a){var k,A,S,N,M;ae();const s=parseInt(a,10)||0,h=document.getElementById("page-title"),p=document.getElementById("card-container");if(h&&(h.textContent=t("暑期功課紀錄","Summer homework")),!ne()){c.ScienceApi.getUser()&&(p.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(s<=0){c.AppRouter.navigate("/admin/courses");return}const w=new URLSearchParams(location.search);let x=w.get("view")||"matrix";x!=="incomplete"&&(x="matrix");let i=w.get("status")||"";["","missing","overdue","on_time","late"].includes(i)||(i="");let m=w.get("incomplete_kind")||"all";["all","never","retry"].includes(m)||(m="all"),p.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let I=function(n,r){C&&(C.textContent=n,C.classList.remove("hidden","text-emerald-700","text-red-600"),C.classList.add(r?"text-red-600":"text-emerald-700"))};var _=I;const U=x==="matrix"&&i?"?status="+encodeURIComponent(i):"",E=await c.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework"+U),T=E.class||{},f=E.items||[];let L=E.students||[];const z=E.rows||[],R=E.message||null,Y=[T.form_level_label,T.course_subject_label].filter(Boolean).join(" · "),D=T.name||"",q=le(f,L,z),V=q.length,H=q.filter(n=>m==="never"?n.kind==="never":m==="retry"?n.kind==="retry":!0),v={};z.forEach(n=>{const r=Number(n.student_user_id),o=Number(n.item_id);v[r]||(v[r]={}),v[r][o]=n});const Z=`
                <div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="${e(t("檢視模式","View mode"))}">
                    <button type="button" id="sh-view-matrix" class="text-sm px-3 py-1.5 rounded-lg border ${x==="matrix"?"bg-indigo-700 text-white border-indigo-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${x==="matrix"?"true":"false"}">${e(t("矩陣","Matrix"))}</button>
                    <button type="button" id="sh-view-incomplete" class="text-sm px-3 py-1.5 rounded-lg border ${x==="incomplete"?"bg-indigo-700 text-white border-indigo-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${x==="incomplete"?"true":"false"}">${e(t("未完成清單","Incomplete list"))}（${V}）</button>
                </div>`;let j="";if(x==="incomplete"){const n=`
                    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                        <label class="text-slate-600">${e(t("未完成類型","Incomplete type"))}
                            <select id="sh-incomplete-kind" class="ml-1 border rounded-lg px-2 py-1.5">
                                <option value="all"${m==="all"?" selected":""}>${e(t("全部未完成","All incomplete"))}</option>
                                <option value="never"${m==="never"?" selected":""}>${e(t("從未作答","Never attempted"))}</option>
                                <option value="retry"${m==="retry"?" selected":""}>${e(t("已試未及格","Attempted, not passed"))}</option>
                            </select>
                        </label>
                        <span class="text-slate-400">${e(t("顯示 ","Showing "))}${H.length}${e(t(" 筆",""))}</span>
                    </div>`;let r="";if(!f.length&&!R)r=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`;else if(!L.length&&f.length)r=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`;else if(!H.length)r=`<p class="text-slate-500 text-sm">${e(V===0?t("本班目前沒有未完成習作。","No incomplete homework in this class."):t("此篩選條件下沒有項目。","No items for this filter."))}</p>`;else{const o=H.map(l=>{const d=`/admin/courses/${s}/students/${l.student_user_id}`,u=`/admin/summer-homework/${l.item_id}/analytics`,$=l.due_at?String(l.due_at).slice(0,16):"—",F=l.status==="overdue"?"bg-red-100 text-red-900":l.kind==="never"?"bg-slate-100 text-slate-700":"bg-amber-100 text-amber-900";return`<tr class="border-t border-slate-100">
                            <td class="p-3">
                                <div class="font-medium">${e(l.display_name)}</div>
                                <div class="text-xs text-slate-500">${e(l.email||"—")}</div>
                            </td>
                            <td class="p-3">
                                <div>${e(l.item_title)}</div>
                                <div class="text-xs text-slate-500 mt-0.5">${e(t("截止 ","Due ")+$)}</div>
                            </td>
                            <td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${F}">${e(l.status_label)}</span>
                            </td>
                            <td class="p-3 whitespace-nowrap">${e(String(l.percent??"—"))}%</td>
                            <td class="p-3 whitespace-nowrap">${l.attempts}</td>
                            <td class="p-3 whitespace-nowrap space-x-2">
                                <a href="${e(g(u)+"?user_id="+l.student_user_id)}" data-spa-nav="${e(u)}" data-user-id="${l.student_user_id}" class="text-indigo-600 hover:underline text-sm">${e(t("分析","Analytics"))}</a>
                                <a href="${e(g(d))}" data-spa-nav="${e(d)}" class="text-slate-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a>
                                <button type="button" class="sh-chase text-sm text-amber-700 hover:underline"
                                    data-email="${e(l.email||"")}"
                                    data-reminder="${e(re(D,l.item_title,l.due_at))}">${e(t("催交","Chase"))}</button>
                            </td>
                        </tr>`}).join("");r=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
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
                    </div>`}j=n+r}else{const n=f.map(d=>{const u=d.title_zh||d.title_en||"#"+d.id,$=d.due_at?t("截止 ","Due ")+String(d.due_at).slice(0,16):t("無截止","No due date");return`<th class="p-3 min-w-[11rem]">
                        <div class="font-semibold">
                            <a class="text-indigo-700 hover:underline" href="${e(g("/admin/summer-homework/"+Number(d.id)+"/view"))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/view">${e(u)}</a>
                        </div>
                        <div class="text-xs font-normal text-slate-500 mt-0.5">${e($)}</div>
                        <a class="text-xs text-indigo-600 hover:underline mt-1 inline-block" href="${e(g(`/admin/summer-homework/${Number(d.id)}/analytics`))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/analytics">${e(t("分析","Analytics"))}</a>
                    </th>`}).join(""),r=L.map(d=>{const u=Number(d.id||d.user_id||0);let $=!1;f.forEach(O=>{const y=v[u]&&v[u][Number(O.id)];y&&Number(y.attempts||0)>0&&!y.passed&&($=!0)});const F=$?"bg-amber-50/50":"",ee=$?"bg-amber-50":"bg-white",te=f.map(O=>{const y=Number(O.id),b=v[u]&&v[u][y];if(!b)return'<td class="p-3 text-slate-400">—</td>';const P=String(b.status||"missing"),G=Number(b.attempts||0);if(G<=0)return`<td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${Q(P)}">${e(b.status_label||t("未交","Missing"))}</span>
                            </td>`;const K=b.first_passed_at?String(b.first_passed_at).slice(0,16):"",se=b.score!=null?`<span class="text-slate-500 text-xs">（${e(String(b.score))}/${e(String(b.max_score))}）</span>`:"";return`<td class="p-3">
                            <span class="inline-block text-xs px-2 py-0.5 rounded-full ${Q(P)}">${e(b.status_label||P)}</span>
                            <div class="mt-1.5 text-slate-800">${e(String(b.percent??"—"))}% ${se}</div>
                            <div class="text-xs text-slate-500 mt-0.5">
                                ${e(K?t("首次及格 ","First pass ")+K:t("尚未及格","Not passed yet"))}
                                · <a class="text-indigo-600 hover:underline" href="${e(g(`/admin/summer-homework/${y}/analytics`)+"?user_id="+u)}" data-spa-nav="/admin/summer-homework/${y}/analytics" data-user-id="${u}">${G} ${e(t("次","tries"))}</a>
                                · ${b.passed?`<span class="text-emerald-700 font-medium">${e(t("及格","Passed"))}</span>`:`<span class="text-amber-800 font-medium">${e(t("須重做","Retry"))}</span>`}
                            </div>
                        </td>`}).join("");return`<tr class="border-t border-slate-100 align-top ${F}">
                        <td class="p-3 sticky left-0 ${ee} font-medium whitespace-nowrap z-10">
                            ${e(W(d))}
                            <div class="text-xs text-slate-500 font-normal">${e(d.email||"")}</div>
                        </td>
                        ${te}
                    </tr>`}).join("");let o="";f.length&&L.length?o=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-3 sticky left-0 bg-slate-100 z-10">${e(t("學生","Student"))}</th>
                                    ${n}
                                </tr>
                            </thead>
                            <tbody>${r}</tbody>
                        </table>
                    </div>`:!f.length&&!R?o=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`:!L.length&&f.length&&(o=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`),j=`
                    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                        <label class="text-slate-600">${e(t("篩選狀態","Filter status"))}
                            <select id="sh-status-filter" class="ml-1 border rounded-lg px-2 py-1.5">
                                <option value=""${i===""?" selected":""}>${e(t("全部","All"))}</option>
                                <option value="missing"${i==="missing"?" selected":""}>${e(t("未交","Not passed (before due)"))}</option>
                                <option value="overdue"${i==="overdue"?" selected":""}>${e(t("欠交","Not passed (after due)"))}</option>
                                <option value="on_time"${i==="on_time"?" selected":""}>${e(t("準時","On time"))}</option>
                                <option value="late"${i==="late"?" selected":""}>${e(t("遲交","Late pass"))}</option>
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
                <p class="text-xs text-slate-400 mb-4">${e(t("準時＝截止前首次及格；遲交＝截止後首次及格；未交＝截止前未及格；欠交＝截止後未及格；呈交時間＝首次及格","On time = first pass by due; late = first pass after due; missing = not passed before due; overdue = not passed after due; time = first pass"))}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                ${R?`<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(R)}</div>`:""}
                ${Z}
                ${j}`;const C=document.getElementById("admin-sh-flash");async function B(n){const r="/admin/courses/"+s+"/summer";history.replaceState({path:r},"",ie(s,n)),await X(String(s))}p.querySelectorAll("[data-spa-nav]").forEach(n=>{n.addEventListener("click",r=>{r.preventDefault();const o=n.getAttribute("data-spa-nav"),l=parseInt(n.getAttribute("data-user-id")||"0",10)||0;if(l>0&&o&&o.indexOf("/analytics")>=0){history.pushState({path:o},"",J()+o+"?user_id="+l),c.AppRouter.dispatch(o);return}c.AppRouter.navigate(o)})}),(k=document.getElementById("sh-view-matrix"))==null||k.addEventListener("click",async()=>{await B({view:"matrix",status:i})}),(A=document.getElementById("sh-view-incomplete"))==null||A.addEventListener("click",async()=>{await B({view:"incomplete",kind:m})}),(S=document.getElementById("sh-status-filter"))==null||S.addEventListener("change",async n=>{const r=n.target.value||"";await B({view:"matrix",status:r})}),(N=document.getElementById("sh-incomplete-kind"))==null||N.addEventListener("change",async n=>{const r=n.target.value||"all";await B({view:"incomplete",kind:r})}),p.querySelectorAll(".sh-chase").forEach(n=>{n.addEventListener("click",async()=>{const r=n.getAttribute("data-reminder")||"",o=n.getAttribute("data-email")||"",l=o?`${o}

${r}`:r;try{await navigator.clipboard.writeText(l),I(t("已複製催交文案到剪貼簿。","Reminder copied to clipboard."),!1)}catch{window.prompt(t("請複製以下文案：","Copy this reminder:"),l)}})}),(M=document.getElementById("sh-export-csv"))==null||M.addEventListener("click",async n=>{const r=n.currentTarget;r.disabled=!0;try{const o=await c.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework.csv",{method:"GET"});if(!(o instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const l=await o.blob(),d=URL.createObjectURL(l),u=document.createElement("a");u.href=d,u.download="summer_homework_class_"+s+".csv",document.body.appendChild(u),u.click(),u.remove(),URL.revokeObjectURL(d),I(t("已開始下載 CSV。","CSV download started."),!1)}catch(o){I(o.message||t("匯出失敗","Export failed"),!0)}finally{r.disabled=!1}})}catch(U){p.innerHTML=`<p class="text-red-600">${e(U.message||t("載入失敗","Load failed"))}</p>`}}c.AppAdmin=Object.assign(c.AppAdmin||{},{renderAdminCourseSummer:X});
