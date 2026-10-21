const m=window;function t(n,s){return m.AppRouter&&m.AppRouter.t?m.AppRouter.t(n,s):n}function e(n){return m.AppRouter&&m.AppRouter.escapeHtml?m.AppRouter.escapeHtml(n):String(n||"")}function $(n){return m.AppRouter&&m.AppRouter.spaHref?m.AppRouter.spaHref(n):String(n||"")}function ue(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function pe(){return m.ScienceApi.getUser()?m.ScienceApi.hasPermission("class.manage_any")||m.ScienceApi.hasPermission("class.manage_own"):(m.AppRouter.navigate("/login"),!1)}function ee(n){return n==="on_time"?"bg-sky-100 text-sky-900":n==="late"?"bg-orange-100 text-orange-900":n==="overdue"?"bg-red-100 text-red-900":"bg-slate-100 text-slate-600"}function te(n){return(n.display_name||n.name_zh||n.name_en||n.email||"").trim()||"—"}function se(){return location.pathname.split("/app")[0]+"/app"}function be(n,s){const p=new URLSearchParams;s.cohort==="previous"&&p.set("cohort","previous"),s.view&&s.view!=="matrix"&&p.set("view",s.view),s.view==="matrix"&&s.status&&p.set("status",s.status),s.view==="incomplete"&&s.kind&&s.kind!=="all"&&p.set("incomplete_kind",s.kind);const b=p.toString();return se()+"/admin/courses/"+n+"/summer"+(b?"?"+b:"")}function he(n,s,p){const b=p?t("截止日期：","Due: ")+String(p).slice(0,16):t("（未設截止日期）","(No due date)");return[t("同學你好，","Hello,"),"",t("請盡快登入平台完成暑期功課：","Please sign in and complete this summer homework:"),t("班級：","Class: ")+(n||""),t("習作：","Item: ")+(s||""),b,"",t("謝謝。","Thank you.")].join(`
`)}function xe(n,s,p){const b={};s.forEach(a=>{const c=Number(a.id||a.user_id||0);c&&(b[c]=a)});const y={};n.forEach(a=>{y[Number(a.id)]=a});const h=[];return p.forEach(a=>{const c=String(a.status||"missing");if(c!=="missing"&&c!=="overdue")return;const u=Number(a.student_user_id),C=Number(a.item_id),A=b[u]||{},E=y[C]||{},R=Number(a.attempts||0);h.push({student_user_id:u,item_id:C,display_name:te(A),email:A.email||"",prev_form_class:A.prev_form_class||"",item_title:E.title_zh||E.title_en||"#"+C,due_at:E.due_at||null,attempts:R,percent:a.percent,status:c,kind:R<=0?"never":"retry",status_label:a.status_label||(c==="overdue"?t("欠交","Overdue"):t("未交","Missing"))})}),h.sort((a,c)=>{const u=String(a.display_name).localeCompare(String(c.display_name),"zh");return u!==0?u:String(a.item_title).localeCompare(String(c.item_title),"zh")}),h}async function ae(n){var A,E,R,M,q,z,D;ue();const s=parseInt(n,10)||0,p=document.getElementById("page-title"),b=document.getElementById("card-container");if(p&&(p.textContent=t("暑期功課紀錄","Summer homework")),!pe()){m.ScienceApi.getUser()&&(b.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(s<=0){m.AppRouter.navigate("/admin/courses");return}const y=new URLSearchParams(location.search);let h=y.get("view")||"matrix";h!=="incomplete"&&(h="matrix");let a=y.get("status")||"";["","missing","overdue","on_time","late"].includes(a)||(a="");let c=y.get("incomplete_kind")||"all";["all","never","retry"].includes(c)||(c="all");let u=y.get("cohort")||"current";u!=="previous"&&(u="current"),b.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let U=function(i,l){T&&(T.textContent=i,T.classList.remove("hidden","text-emerald-700","text-red-600"),T.classList.add(l?"text-red-600":"text-emerald-700"))};var C=U;const L=new URLSearchParams;u==="previous"&&L.set("cohort","previous"),h==="matrix"&&a&&L.set("status",a);const re=L.toString()?"?"+L.toString():"",_=await m.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework"+re),w=_.class||{},g=_.items||[];let I=_.students||[];const V=_.rows||[],B=_.message||null,Q=_.cohort_note||null,G=_.items_form_level_label||"",ne=!!(w.can_chase_previous_summer||w.form_level==="2"||w.form_level==="3");u==="previous"&&p&&(p.textContent=t("上學年暑期追收","Last-year summer chase"));const K=[w.form_level_label,w.course_subject_label,w.school_year].filter(Boolean);u==="previous"&&G&&K.push(t("習作：","Items: ")+G);const ie=K.join(" · "),W=w.name||"",J=xe(g,I,V),X=J.length,H=J.filter(i=>c==="never"?i.kind==="never":c==="retry"?i.kind==="retry":!0),k={};V.forEach(i=>{const l=Number(i.student_user_id),o=Number(i.item_id);k[l]||(k[l]={}),k[l][o]=i});const le=ne?`
                <div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="${e(t("習作學年","Homework year"))}">
                    <button type="button" id="sh-cohort-current" class="text-sm px-3 py-1.5 rounded-lg border ${u!=="previous"?"bg-brand-700 text-white border-brand-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${u!=="previous"?"true":"false"}">${e(t("本學年習作","This year"))}</button>
                    <button type="button" id="sh-cohort-previous" class="text-sm px-3 py-1.5 rounded-lg border ${u==="previous"?"bg-amber-700 text-white border-amber-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${u==="previous"?"true":"false"}">${e(t("上學年追收","Last-year chase"))}</button>
                </div>`:"",oe=`
                <div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="${e(t("檢視模式","View mode"))}">
                    <button type="button" id="sh-view-matrix" class="text-sm px-3 py-1.5 rounded-lg border ${h==="matrix"?"bg-brand-700 text-white border-brand-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${h==="matrix"?"true":"false"}">${e(t("矩陣","Matrix"))}</button>
                    <button type="button" id="sh-view-incomplete" class="text-sm px-3 py-1.5 rounded-lg border ${h==="incomplete"?"bg-brand-700 text-white border-brand-700":"border-slate-300 text-slate-700 hover:bg-slate-50"}" role="tab" aria-selected="${h==="incomplete"?"true":"false"}">${e(t("未完成清單","Incomplete list"))}（${X}）</button>
                </div>`;let j="";if(h==="incomplete"){const i=`
                    <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                        <label class="text-slate-600">${e(t("未完成類型","Incomplete type"))}
                            <select id="sh-incomplete-kind" class="ml-1 border rounded-lg px-2 py-1.5">
                                <option value="all"${c==="all"?" selected":""}>${e(t("全部未完成","All incomplete"))}</option>
                                <option value="never"${c==="never"?" selected":""}>${e(t("從未作答","Never attempted"))}</option>
                                <option value="retry"${c==="retry"?" selected":""}>${e(t("已試未及格","Attempted, not passed"))}</option>
                            </select>
                        </label>
                        <span class="text-slate-400">${e(t("顯示 ","Showing "))}${H.length}${e(t(" 筆",""))}</span>
                    </div>`;let l="";if(!g.length&&!B)l=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`;else if(!I.length&&g.length)l=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`;else if(!H.length)l=`<p class="text-slate-500 text-sm">${e(X===0?t("本班目前沒有未完成習作。","No incomplete homework in this class."):t("此篩選條件下沒有項目。","No items for this filter."))}</p>`;else{const o=H.map(r=>{const d=`/admin/courses/${s}/students/${r.student_user_id}`,x=`/admin/summer-homework/${r.item_id}/analytics`,v=r.due_at?String(r.due_at).slice(0,16):"—",F=r.status==="overdue"?"bg-red-100 text-red-900":r.kind==="never"?"bg-slate-100 text-slate-700":"bg-amber-100 text-amber-900";return`<tr class="border-t border-slate-100">
                            <td class="p-3">
                                <div class="font-medium">${e(r.display_name)}</div>
                                <div class="text-xs text-slate-500">${e(r.email||"—")}</div>
                                ${r.prev_form_class?`<div class="text-xs text-amber-800 mt-0.5">${e(t("上學年 ","Last year ")+r.prev_form_class)}</div>`:""}
                            </td>
                            <td class="p-3">
                                <div>${e(r.item_title)}</div>
                                <div class="text-xs text-slate-500 mt-0.5">${e(t("截止 ","Due ")+v)}</div>
                            </td>
                            <td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${F}">${e(r.status_label)}</span>
                            </td>
                            <td class="p-3 whitespace-nowrap">${e(String(r.percent??"—"))}%</td>
                            <td class="p-3 whitespace-nowrap">${r.attempts}</td>
                            <td class="p-3 whitespace-nowrap space-x-2">
                                <a href="${e($(x)+"?user_id="+r.student_user_id)}" data-spa-nav="${e(x)}" data-user-id="${r.student_user_id}" class="text-brand-600 hover:underline text-sm">${e(t("分析","Analytics"))}</a>
                                <a href="${e($(d))}" data-spa-nav="${e(d)}" class="text-slate-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a>
                                <button type="button" class="sh-chase text-sm text-amber-700 hover:underline"
                                    data-email="${e(r.email||"")}"
                                    data-reminder="${e(he(W,r.item_title,r.due_at))}">${e(t("催交","Chase"))}</button>
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
                    </div>`}j=i+l}else{const i=g.map(d=>{const x=d.title_zh||d.title_en||"#"+d.id,v=d.due_at?t("截止 ","Due ")+String(d.due_at).slice(0,16):t("無截止","No due date");return`<th class="p-3 min-w-[11rem]">
                        <div class="font-semibold">
                            <a class="text-brand-700 hover:underline" href="${e($("/admin/summer-homework/"+Number(d.id)+"/view"))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/view">${e(x)}</a>
                        </div>
                        <div class="text-xs font-normal text-slate-500 mt-0.5">${e(v)}</div>
                        <a class="text-xs text-brand-600 hover:underline mt-1 inline-block" href="${e($(`/admin/summer-homework/${Number(d.id)}/analytics`))}" data-spa-nav="/admin/summer-homework/${Number(d.id)}/analytics">${e(t("分析","Analytics"))}</a>
                    </th>`}).join(""),l=I.map(d=>{const x=Number(d.id||d.user_id||0);let v=!1;g.forEach(P=>{const S=k[x]&&k[x][Number(P.id)];S&&Number(S.attempts||0)>0&&!S.passed&&(v=!0)});const F=v?"bg-amber-50/50":"",de=v?"bg-amber-50":"bg-white",ce=g.map(P=>{const S=Number(P.id),f=k[x]&&k[x][S];if(!f)return'<td class="p-3 text-slate-400">—</td>';const O=String(f.status||"missing"),Y=Number(f.attempts||0);if(Y<=0)return`<td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full ${ee(O)}">${e(f.status_label||t("未交","Missing"))}</span>
                            </td>`;const Z=f.first_passed_at?String(f.first_passed_at).slice(0,16):"",me=f.score!=null?`<span class="text-slate-500 text-xs">（${e(String(f.score))}/${e(String(f.max_score))}）</span>`:"";return`<td class="p-3">
                            <span class="inline-block text-xs px-2 py-0.5 rounded-full ${ee(O)}">${e(f.status_label||O)}</span>
                            <div class="mt-1.5 text-slate-800">${e(String(f.percent??"—"))}% ${me}</div>
                            <div class="text-xs text-slate-500 mt-0.5">
                                ${e(Z?t("首次及格 ","First pass ")+Z:t("尚未及格","Not passed yet"))}
                                · <a class="text-brand-600 hover:underline" href="${e($(`/admin/summer-homework/${S}/analytics`)+"?user_id="+x)}" data-spa-nav="/admin/summer-homework/${S}/analytics" data-user-id="${x}">${Y} ${e(t("次","tries"))}</a>
                                · ${f.passed?`<span class="text-emerald-700 font-medium">${e(t("及格","Passed"))}</span>`:`<span class="text-amber-800 font-medium">${e(t("須重做","Retry"))}</span>`}
                            </div>
                        </td>`}).join("");return`<tr class="border-t border-slate-100 align-top ${F}">
                        <td class="p-3 sticky left-0 ${de} font-medium whitespace-nowrap z-10">
                            ${e(te(d))}
                            <div class="text-xs text-slate-500 font-normal">${e(d.email||"")}</div>
                            ${d.prev_form_class?`<div class="text-xs text-amber-800 font-normal mt-0.5">${e(t("上學年 ","Last year ")+d.prev_form_class)}</div>`:""}
                        </td>
                        ${ce}
                    </tr>`}).join("");let o="";g.length&&I.length?o=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-3 sticky left-0 bg-slate-100 z-10">${e(t("學生","Student"))}</th>
                                    ${i}
                                </tr>
                            </thead>
                            <tbody>${l}</tbody>
                        </table>
                    </div>`:!g.length&&!B?o=`<p class="text-slate-500 text-sm">${e(t("尚無習作資料。","No homework items."))}</p>`:!I.length&&g.length&&(o=`<p class="text-slate-500 text-sm">${e(t("此課程尚無在籍學生。","No enrolled students."))}</p>`),j=`
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
                    </div>`+o}b.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e($(`/admin/courses/${s}`))}" data-spa-nav="/admin/courses/${s}" class="text-sm text-brand-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e($(`/admin/courses/${s}/students`))}" data-spa-nav="/admin/courses/${s}/students" class="text-sm text-slate-600 hover:underline">${e(t("學生與修讀語言","Students & MOI"))}</a>
                    <a href="${e($(`/admin/courses/${s}/report`))}" data-spa-nav="/admin/courses/${s}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e($(`/admin/courses/${s}/worksheets`))}" data-spa-nav="/admin/courses/${s}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                    <a href="${e($("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-slate-600 hover:underline">${e(t("設計習作","Design items"))}</a>
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
                ${j}`;const T=document.getElementById("admin-sh-flash");async function N(i){const l="/admin/courses/"+s+"/summer",o=Object.assign({cohort:u},i);history.replaceState({path:l},"",be(s,o)),await ae(String(s))}b.querySelectorAll("[data-spa-nav]").forEach(i=>{i.addEventListener("click",l=>{l.preventDefault();const o=i.getAttribute("data-spa-nav"),r=parseInt(i.getAttribute("data-user-id")||"0",10)||0;if(r>0&&o&&o.indexOf("/analytics")>=0){history.pushState({path:o},"",se()+o+"?user_id="+r),m.AppRouter.dispatch(o);return}m.AppRouter.navigate(o)})}),(A=document.getElementById("sh-view-matrix"))==null||A.addEventListener("click",async()=>{await N({view:"matrix",status:a})}),(E=document.getElementById("sh-view-incomplete"))==null||E.addEventListener("click",async()=>{await N({view:"incomplete",kind:c})}),(R=document.getElementById("sh-cohort-current"))==null||R.addEventListener("click",async()=>{await N({cohort:"current",view:h,status:a,kind:c})}),(M=document.getElementById("sh-cohort-previous"))==null||M.addEventListener("click",async()=>{await N({cohort:"previous",view:h,status:a,kind:c})}),(q=document.getElementById("sh-status-filter"))==null||q.addEventListener("change",async i=>{const l=i.target.value||"";await N({view:"matrix",status:l})}),(z=document.getElementById("sh-incomplete-kind"))==null||z.addEventListener("change",async i=>{const l=i.target.value||"all";await N({view:"incomplete",kind:l})}),b.querySelectorAll(".sh-chase").forEach(i=>{i.addEventListener("click",async()=>{const l=i.getAttribute("data-reminder")||"",o=i.getAttribute("data-email")||"",r=o?`${o}

${l}`:l;try{await navigator.clipboard.writeText(r),U(t("已複製催交文案到剪貼簿。","Reminder copied to clipboard."),!1)}catch{window.prompt(t("請複製以下文案：","Copy this reminder:"),r)}})}),(D=document.getElementById("sh-export-csv"))==null||D.addEventListener("click",async i=>{const l=i.currentTarget;l.disabled=!0;try{const o=u==="previous"?"?cohort=previous":"",r=await m.ScienceApi.apiFetch("/admin/classes/"+s+"/summer-homework.csv"+o,{method:"GET"});if(!(r instanceof Response))throw new Error(t("匯出回應格式錯誤","Unexpected export response"));const d=await r.blob(),x=URL.createObjectURL(d),v=document.createElement("a");v.href=x,v.download="summer_homework_class_"+s+(u==="previous"?"_previous":"")+".csv",document.body.appendChild(v),v.click(),v.remove(),URL.revokeObjectURL(x),U(t("已開始下載 CSV。","CSV download started."),!1)}catch(o){U(o.message||t("匯出失敗","Export failed"),!0)}finally{l.disabled=!1}})}catch(L){b.innerHTML=`<p class="text-red-600">${e(L.message||t("載入失敗","Load failed"))}</p>`}}m.AppAdmin=Object.assign(m.AppAdmin||{},{renderAdminCourseSummer:ae});
