const m=window;function t(r,s){return m.AppRouter&&m.AppRouter.t?m.AppRouter.t(r,s):r}function e(r){return m.AppRouter&&m.AppRouter.escapeHtml?m.AppRouter.escapeHtml(r):String(r||"")}function g(r){return m.AppRouter&&m.AppRouter.spaHref?m.AppRouter.spaHref(r):String(r||"")}function ue(){const r=document.getElementById("sidebar");r&&(r.style.display="none")}function pe(){return m.ScienceApi.getUser()?m.ScienceApi.hasPermission("class.manage_any")||m.ScienceApi.hasPermission("class.manage_own"):(m.AppRouter.navigate("/login"),!1)}function ee(r){return r==="on_time"?"bg-sky-100 text-sky-900":r==="late"?"bg-orange-100 text-orange-900":r==="overdue"?"bg-red-100 text-red-900":"bg-slate-100 text-slate-600"}function te(r){return(r.display_name||r.name_zh||r.name_en||r.email||"").trim()||"—"}function se(){return location.pathname.split("/app")[0]+"/app"}function he(r,s){const p=new URLSearchParams;s.cohort==="previous"&&p.set("cohort","previous"),s.view&&s.view!=="matrix"&&p.set("view",s.view),s.view==="matrix"&&s.status&&p.set("status",s.status),s.view==="incomplete"&&s.kind&&s.kind!=="all"&&p.set("incomplete_kind",s.kind);const h=p.toString();return se()+"/admin/courses/"+r+"/summer"+(h?"?"+h:"")}function be(r,s,p){const h=p?t("截止日期：","Due: ")+String(p).slice(0,16):t("（未設截止日期）","(No due date)");return[t("同學你好，","Hello,"),"",t("請盡快登入平台完成暑期功課：","Please sign in and complete this summer homework:"),t("班級：","Class: ")+(r||""),t("習作：","Item: ")+(s||""),h,"",t("謝謝。","Thank you.")].join(`
`)}function xe(r,s,p){const h={};s.forEach(a=>{const c=Number(a.id||a.user_id||0);c&&(h[c]=a)});const y={};r.forEach(a=>{y[Number(a.id)]=a});const b=[];return p.forEach(a=>{const c=String(a.status||"missing");if(c!=="missing"&&c!=="overdue")return;const u=Number(a.student_user_id),C=Number(a.item_id),A=h[u]||{},E=y[C]||{},R=Number(a.attempts||0);b.push({student_user_id:u,item_id:C,display_name:te(A),email:A.email||"",prev_form_class:A.prev_form_class||"",item_title:E.title_zh||E.title_en||"#"+C,due_at:E.due_at||null,attempts:R,percent:a.percent,status:c,kind:R<=0?"never":"retry",status_label:a.status_label||(c==="overdue"?t("欠交","Overdue"):t("未交","Missing"))})}),b.sort((a,c)=>{const u=String(a.display_name).localeCompare(String(c.display_name),"zh");return u!==0?u:String(a.item_title).localeCompare(String(c.item_title),"zh")}),b}async function ae(r){var A,E,R,M,q,z,D;ue();const s=parseInt(r,10)||0,p=document.getElementById("page-title"),h=document.getElementById("card-container");if(p&&(p.textContent=t("暑期功課紀錄","Summer homework")),!pe()){m.ScienceApi.getUser()&&(h.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(s<=0){m.AppRouter.navigate("/admin/courses");return}const y=new URLSearchParams(location.search);let b=y.get("view")||"matrix";b!=="incomplete"&&(b="matrix");let a=y.get("status")||"";["","missing","overdue","on_time","late"].includes(a)||(a="");let c=y.get("incomplete_kind")||"all";["all","never","retry"].includes(c)||(c="all");let u=y.get("cohort")||"current";u!=="previous"&&(u="current"),h.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let U=function(i,l){T&&(T.textContent=i,T.classList.remove("hidden","text-emerald-700","text-red-600"),T.classList.add(l?"text-red-600":"text-emerald-700"))};var C=U;const L=new URLSearchParams;u==="previous"&&L.set("cohort","previous"),b==="matrix"&&a&&L.set("status",a);const ne=L.toString()?"?"+L.toString():"",_=await m.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework"+ne),w=_.class||{},$=_.items||[];let I=_.students||[];const V=_.rows||[],B=_.message||null,Q=_.cohort_note||null,G=_.items_form_level_label||"",re=!!(w.can_chase_previous_summer||w.form_level==="2"||w.form_level==="3");u==="previous"&&p&&(p.textContent=t("上學年暑期追收","Last-year summer chase"));const K=[w.form_level_label,w.course_subject_label,w.school_year].filter(Boolean);u==="previous"&&G&&K.push(t("習作：","Items: ")+G);const ie=K.join(" · "),W=w.name||"",J=xe($,I,V),X=J.length,H=J.filter(i=>c==="never"?i.kind==="never":c==="retry"?i.kind==="retry":!0),k={};V.forEach(i=>{const l=Number(i.student_user_id),o=Number(i.item_id);k[l]||(k[l]={}),k[l][o]=i});const le=re?`
                <div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="${e(t("習作學年","Homework year"))}">
                    <button type="button" id="sh-cohort-current" class="text-sm px-3 py-1.5 rounded-lg border ${u!=="previous"?"bg-indigo-700 text-white border-indigo-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${u!=="previous"?"true":"false"}">${e(t("本學年習作","This year"))}</button>
                    <button type="button" id="sh-cohort-previous" class="text-sm px-3 py-1.5 rounded-lg border ${u==="previous"?"bg-amber-700 text-white border-amber-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${u==="previous"?"true":"false"}">${e(t("上學年追收","Last-year chase"))}</button>
                </div>`:"",oe=`
                <div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="${e(t("檢視模式","View mode"))}">
                    <button type="button" id="sh-view-matrix" class="text-sm px-3 py-1.5 rounded-lg border ${b==="matrix"?"bg-indigo-700 text-white border-indigo-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${b==="matrix"?"true":"false"}">${e(t("矩陣","Matrix"))}</button>
                    <button type="button" id="sh-view-incomplete" class="text-sm px-3 py-1.5 rounded-lg border ${b==="incomplete"?"bg-indigo-700 text-white border-indigo-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${b==="incomplete"?"true":"false"}">${e(t("未完成清單","Incomplete list"))}（${X}）</button>
                </div>`;let j="";if(b==="incomplete"){const i=`
                    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                        <label class="text-slate-600">${e(t("未完成類型","Incomplete type"))}
                            <select id="sh-incomplete-kind" class="ml-1 border rounded-lg px-2 py-1.5">
                                <option value="all"${c==="all"?" selected":""}>${e(t("全部未完成","All incomplete"))}</option>
                                <option value="never"${c==="never"?" selected":""}>${e(t("從未作答","Never attempted"))}</option>
                                <option value="retry"${c==="retry"?" selected":""}>${e(t("已試未及格","Attempted, not passed"))}</option>
                            </select>
                        </label>
                        <span class="text-slate-400">${e(t("顯示 ","Showing "))}${H.length}${e(t(" 筆",""))}</span>
                    </div>`;let l="";if(!$.length&&!B)l=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`;else if(!I.length&&$.length)l=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`;else if(!H.length)l=`<p class="text-slate-500 text-sm">${e(X===0?t("本班目前沒有未完成習作。","No incomplete homework in this class."):t("此篩選條件下沒有項目。","No items for this filter."))}</p>`;else{const o=H.map(n=>{const d=`/admin/courses/${s}/students/${n.student_user_id}`,x=`/admin/summer-homework/${n.item_id}/analytics`,v=n.due_at?String(n.due_at).slice(0,16):"—",F=n.status==="overdue"?"bg-red-100 text-red-900":n.kind==="never"?"bg-slate-100 text-slate-700":"bg-amber-100 text-amber-900";return`<tr class="border-t border-slate-100">
                            <td class="p-3">
                                <div class="font-medium">${e(n.display_name)}</div>
                                <div class="text-xs text-slate-500">${e(n.email||"—")}</div>
                                ${n.prev_form_class?`<div class="text-xs text-amber-800 mt-0.5">${e(t("上學年 ","Last year ")+n.prev_form_class)}</div>`:""}
                            </td>
                            <td class="p-3">
                                <div>${e(n.item_title)}</div>
                                <div class="text-xs text-slate-500 mt-0.5">${e(t("截止 ","Due ")+v)}</div>
                            </td>
                            <td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${F}">${e(n.status_label)}</span>
                            </td>
                            <td class="p-3 whitespace-nowrap">${e(String(n.percent??"—"))}%</td>
                            <td class="p-3 whitespace-nowrap">${n.attempts}</td>
                            <td class="p-3 whitespace-nowrap space-x-2">
                                <a href="${e(g(x)+"?user_id="+n.student_user_id)}" data-spa-nav="${e(x)}" data-user-id="${n.student_user_id}" class="text-indigo-600 hover:underline text-sm">${e(t("分析","Analytics"))}</a>
                                <a href="${e(g(d))}" data-spa-nav="${e(d)}" class="text-slate-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a>
                                <button type="button" class="sh-chase text-sm text-amber-700 hover:underline"
                                    data-email="${e(n.email||"")}"
                                    data-reminder="${e(be(W,n.item_title,n.due_at))}">${e(t("催交","Chase"))}</button>
                            </td>
                        </tr>`}).join("");l=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
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
                    </div>`}j=i+l}else{const i=$.map(d=>{const x=d.title_zh||d.title_en||"#"+d.id,v=d.due_at?t("截止 ","Due ")+String(d.due_at).slice(0,16):t("無截止","No due date");return`<th class="p-3 min-w-[11rem]">
                        <div class="font-semibold">
                            <a class="text-indigo-700 hover:underline" href="${e(g("/admin/summer-homework/"+Number(d.id)+"/view"))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/view">${e(x)}</a>
                        </div>
                        <div class="text-xs font-normal text-slate-500 mt-0.5">${e(v)}</div>
                        <a class="text-xs text-indigo-600 hover:underline mt-1 inline-block" href="${e(g(`/admin/summer-homework/${Number(d.id)}/analytics`))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/analytics">${e(t("分析","Analytics"))}</a>
                    </th>`}).join(""),l=I.map(d=>{const x=Number(d.id||d.user_id||0);let v=!1;$.forEach(P=>{const S=k[x]&&k[x][Number(P.id)];S&&Number(S.attempts||0)>0&&!S.passed&&(v=!0)});const F=v?"bg-amber-50/50":"",de=v?"bg-amber-50":"bg-white",ce=$.map(P=>{const S=Number(P.id),f=k[x]&&k[x][S];if(!f)return'<td class="p-3 text-slate-400">—</td>';const O=String(f.status||"missing"),Y=Number(f.attempts||0);if(Y<=0)return`<td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${ee(O)}">${e(f.status_label||t("未交","Missing"))}</span>
                            </td>`;const Z=f.first_passed_at?String(f.first_passed_at).slice(0,16):"",me=f.score!=null?`<span class="text-slate-500 text-xs">（${e(String(f.score))}/${e(String(f.max_score))}）</span>`:"";return`<td class="p-3">
                            <span class="inline-block text-xs px-2 py-0.5 rounded-full ${ee(O)}">${e(f.status_label||O)}</span>
                            <div class="mt-1.5 text-slate-800">${e(String(f.percent??"—"))}% ${me}</div>
                            <div class="text-xs text-slate-500 mt-0.5">
                                ${e(Z?t("首次及格 ","First pass ")+Z:t("尚未及格","Not passed yet"))}
                                · <a class="text-indigo-600 hover:underline" href="${e(g(`/admin/summer-homework/${S}/analytics`)+"?user_id="+x)}" data-spa-nav="/admin/summer-homework/${S}/analytics" data-user-id="${x}">${Y} ${e(t("次","tries"))}</a>
                                · ${f.passed?`<span class="text-emerald-700 font-medium">${e(t("及格","Passed"))}</span>`:`<span class="text-amber-800 font-medium">${e(t("須重做","Retry"))}</span>`}
                            </div>
                        </td>`}).join("");return`<tr class="border-t border-slate-100 align-top ${F}">
                        <td class="p-3 sticky left-0 ${de} font-medium whitespace-nowrap z-10">
                            ${e(te(d))}
                            <div class="text-xs text-slate-500 font-normal">${e(d.email||"")}</div>
                            ${d.prev_form_class?`<div class="text-xs text-amber-800 font-normal mt-0.5">${e(t("上學年 ","Last year ")+d.prev_form_class)}</div>`:""}
                        </td>
                        ${ce}
                    </tr>`}).join("");let o="";$.length&&I.length?o=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-3 sticky left-0 bg-slate-100 z-10">${e(t("學生","Student"))}</th>
                                    ${i}
                                </tr>
                            </thead>
                            <tbody>${l}</tbody>
                        </table>
                    </div>`:!$.length&&!B?o=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`:!I.length&&$.length&&(o=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`),j=`
                    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                        <label class="text-slate-600">${e(t("篩選狀態","Filter status"))}
                            <select id="sh-status-filter" class="ml-1 border rounded-lg px-2 py-1.5">
                                <option value=""${a===""?" selected":""}>${e(t("全部","All"))}</option>
                                <option value="missing"${a==="missing"?" selected":""}>${e(t("未交","Not passed (before due)"))}</option>
                                <option value="overdue"${a==="overdue"?" selected":""}>${e(t("欠交","Not passed (after due)"))}</option>
                                <option value="on_time"${a==="on_time"?" selected":""}>${e(t("準時","On time"))}</option>
                                <option value="late"${a==="late"?" selected":""}>${e(t("遲交","Late pass"))}</option>
                            </select>
                        </label>
                        <span class="text-slate-400">${e(t("顯示至少一項符合該狀態的學生","Show students with at least one matching cell"))}</span>
                    </div>`+o}h.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(g(`/admin/courses/${s}`))}" data-spa-nav="/admin/courses/${s}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(g(`/admin/courses/${s}/students`))}" data-spa-nav="/admin/courses/${s}/students" class="text-sm text-slate-600 hover:underline">${e(t("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e(g(`/admin/courses/${s}/report`))}" data-spa-nav="/admin/courses/${s}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e(g(`/admin/courses/${s}/worksheets`))}" data-spa-nav="/admin/courses/${s}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                    <a href="${e(g("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-slate-600 hover:underline">${e(t("設計習作","Design items"))}</a>
                    <button type="button" id="sh-export-csv" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">${e(t("匯出 CSV","Export CSV"))}</button>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${e(W)}</h2>
                <p class="text-sm text-slate-500 mb-2">${e(ie)}</p>
                ${Q?`<div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(Q)}</div>`:""}
                <p class="text-xs text-slate-400 mb-4">${e(t("準時＝截止前首次及格；遲交＝截止後首次及格；未交＝截止前未及格；欠交＝截止後未及格；呈交時間＝首次及格","On time = first pass by due; late = first pass after due; missing = not passed before due; overdue = not passed after due; time = first pass"))}</p>
                <p id="admin-sh-flash" class="text-sm mb-3 hidden"></p>
                ${B?`<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(B)}</div>`:""}
                ${le}
                ${oe}
                ${j}`;const T=document.getElementById("admin-sh-flash");async function N(i){const l="/admin/courses/"+s+"/summer",o=Object.assign({cohort:u},i);history.replaceState({path:l},"",he(s,o)),await ae(String(s))}h.querySelectorAll("[data-spa-nav]").forEach(i=>{i.addEventListener("click",l=>{l.preventDefault();const o=i.getAttribute("data-spa-nav"),n=parseInt(i.getAttribute("data-user-id")||"0",10)||0;if(n>0&&o&&o.indexOf("/analytics")>=0){history.pushState({path:o},"",se()+o+"?user_id="+n),m.AppRouter.dispatch(o);return}m.AppRouter.navigate(o)})}),(A=document.getElementById("sh-view-matrix"))==null||A.addEventListener("click",async()=>{await N({view:"matrix",status:a})}),(E=document.getElementById("sh-view-incomplete"))==null||E.addEventListener("click",async()=>{await N({view:"incomplete",kind:c})}),(R=document.getElementById("sh-cohort-current"))==null||R.addEventListener("click",async()=>{await N({cohort:"current",view:b,status:a,kind:c})}),(M=document.getElementById("sh-cohort-previous"))==null||M.addEventListener("click",async()=>{await N({cohort:"previous",view:b,status:a,kind:c})}),(q=document.getElementById("sh-status-filter"))==null||q.addEventListener("change",async i=>{const l=i.target.value||"";await N({view:"matrix",status:l})}),(z=document.getElementById("sh-incomplete-kind"))==null||z.addEventListener("change",async i=>{const l=i.target.value||"all";await N({view:"incomplete",kind:l})}),h.querySelectorAll(".sh-chase").forEach(i=>{i.addEventListener("click",async()=>{const l=i.getAttribute("data-reminder")||"",o=i.getAttribute("data-email")||"",n=o?`${o}

${l}`:l;try{await navigator.clipboard.writeText(n),U(t("已複製催交文案到剪貼簿。","Reminder copied to clipboard."),!1)}catch{window.prompt(t("請複製以下文案：","Copy this reminder:"),n)}})}),(D=document.getElementById("sh-export-csv"))==null||D.addEventListener("click",async i=>{const l=i.currentTarget;l.disabled=!0;try{const o=u==="previous"?"?cohort=previous":"",n=await m.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework.csv"+o,{method:"GET"});if(!(n instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const d=await n.blob(),x=URL.createObjectURL(d),v=document.createElement("a");v.href=x,v.download="summer_homework_class_"+s+(u==="previous"?"_previous":"")+".csv",document.body.appendChild(v),v.click(),v.remove(),URL.revokeObjectURL(x),U(t("已開始下載 CSV。","CSV download started."),!1)}catch(o){U(o.message||t("匯出失敗","Export failed"),!0)}finally{l.disabled=!1}})}catch(L){h.innerHTML=`<p class="text-red-600">${e(L.message||t("載入失敗","Load failed"))}</p>`}}m.AppAdmin=Object.assign(m.AppAdmin||{},{renderAdminCourseSummer:ae});
