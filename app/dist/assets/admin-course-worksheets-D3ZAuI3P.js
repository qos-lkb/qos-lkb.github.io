const r=window;function e(n,i){return r.AppRouter&&r.AppRouter.t?r.AppRouter.t(n,i):n}function t(n){return r.AppRouter&&r.AppRouter.escapeHtml?r.AppRouter.escapeHtml(n):String(n||"")}function b(n){return r.AppRouter&&r.AppRouter.spaHref?r.AppRouter.spaHref(n):String(n||"")}function P(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function A(n){return{draft:e("草稿","Draft"),active:e("進行中","Active"),closed:e("已結束","Closed"),pending:e("未開始","Pending"),submitted:e("已提交","Submitted"),graded:e("已評分","Graded"),pending_review:e("待審","Pending review"),published:e("已發佈","Published")}[n]||n}function N(n){if(!n)return"—";if(n.question_type==="mcq"||n.question_type==="true_false"){const i=["A","B","C","D"],d=n.selected_option_index;return n.question_type==="true_false"?d===0?e("是","Yes"):d===1?e("否","No"):"—":i[d]!=null?i[d]:String(d+1)}return n.question_type==="short_answer"?n.response_text||e("（空白）","(blank)"):n.question_type==="long_answer"&&n.parts?n.parts.map(i=>"("+String.fromCharCode(97+i.part_index)+") "+i.text).join(" / ")||e("（空白）","(blank)"):n.question_type==="fill_blank"&&n.blanks?n.blanks.map(i=>"["+(i.blank_index+1)+"] "+i.text).join(" ")||e("（空白）","(blank)"):"—"}function M(){return r.ScienceApi.getUser()?r.ScienceApi.hasPermission("worksheet.assign_own")||r.ScienceApi.hasPermission("class.manage_any")||r.ScienceApi.hasPermission("worksheet.manage_any")||r.ScienceApi.hasPermission("worksheet.manage_own"):(r.AppRouter.navigate("/login"),!1)}async function F(n){var E,I,L;P();const i=parseInt(n,10)||0,d=document.getElementById("page-title"),h=document.getElementById("card-container");if(d&&(d.textContent=e("工作紙派發","Worksheet assignments")),!M()){r.ScienceApi.getUser()&&(h.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}if(i<=0){r.AppRouter.navigate("/admin/courses");return}const S=r.ScienceApi.hasPermission("worksheet.manage_any")||r.ScienceApi.hasPermission("worksheet.manage_own");h.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{let m=function(l,o){x&&(x.textContent=l,x.classList.remove("hidden"),x.className="text-sm mb-4 "+(o?"text-red-600":"text-emerald-700"))},v=function(){const l=document.getElementById("student-pick-wrap"),o=document.getElementById("assign-all").checked;l.classList.toggle("hidden",o),!o&&(l.innerHTML=q.map(s=>`<label class="flex items-center gap-2"><input type="checkbox" class="stu-pick" value="${Number(s.id)}"> ${t(s.name_zh||s.display_name||s.email)}</label>`).join(""))};var j=m,D=v;const f=(await r.ScienceApi.apiFetch("/admin/classes/"+i)).class||{};h.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${t(b(`/admin/courses/${i}`))}" data-spa-nav="/admin/courses/${i}" class="text-sm text-indigo-700 hover:underline">${t(e("← 編輯課程","← Edit course"))}</a>
                    <a href="${t(b(`/admin/courses/${i}/report`))}" data-spa-nav="/admin/courses/${i}/report" class="text-sm text-slate-600 hover:underline">${t(e("學習報告","Report"))}</a>
                    <a href="${t(b(`/admin/courses/${i}/summer`))}" data-spa-nav="/admin/courses/${i}/summer" class="text-sm text-slate-600 hover:underline">${t(e("暑期功課","Summer HW"))}</a>
                    ${f.can_chase_previous_summer||f.form_level==="2"||f.form_level==="3"?`<a href="${t(b(`/admin/courses/${i}/summer?cohort=previous`))}" data-spa-nav="/admin/courses/${i}/summer?cohort=previous" class="text-sm text-amber-800 hover:underline">${t(e("上學年追收","Last-year chase"))}</a>`:""}
                    ${S?`<a href="${t(b("/admin/worksheets"))}" data-spa-nav="/admin/worksheets" class="text-sm text-slate-600 hover:underline">${t(e("設計工作紙","Design worksheets"))}</a>`:""}
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-2">${t(f.name||"")}</h2>
                <p id="admin-ws-flash" class="text-sm mb-4 hidden"></p>
                ${S?`<p class="text-sm text-slate-600 mb-4">${t(e("選擇工作紙、設定派發對象與截止日期，學生提交後可在此評分。","Assign worksheets, set due dates, then grade submissions."))}</p>`:""}
                <div class="grid lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 class="font-bold text-slate-800 mb-3">${t(e("新增派發","New assignment"))}</h3>
                        <form id="assign-form" class="space-y-3 text-sm">
                            <label class="block font-medium">${t(e("工作紙","Worksheet"))}
                                <select id="worksheet-id" required class="w-full border rounded-lg px-3 py-2 mt-1"></select>
                            </label>
                            <label class="block font-medium">${t(e("習作標題（選填）","Title (optional)"))}
                                <input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="${t(e("中文標題","Chinese title"))}">
                                <input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="English title">
                            </label>
                            <label class="block font-medium">${t(e("說明（選填）","Instructions (optional)"))}
                                <textarea id="instructions-zh" rows="2" class="w-full border rounded-lg px-3 py-2 mt-1"></textarea>
                            </label>
                            <div class="grid grid-cols-2 gap-2">
                                <label class="block font-medium">${t(e("滿分","Max score"))}
                                    <input type="number" id="max-score" value="100" min="1" step="0.5" class="w-full border rounded-lg px-3 py-2 mt-1">
                                </label>
                                <label class="block font-medium">${t(e("截止（選填）","Due (optional)"))}
                                    <input type="datetime-local" id="due-at" class="w-full border rounded-lg px-3 py-2 mt-1">
                                </label>
                            </div>
                            <label class="inline-flex items-center gap-2">
                                <input type="checkbox" id="assign-all" checked>
                                <span>${t(e("派發給全班學生","Assign to all students"))}</span>
                            </label>
                            <div id="student-pick-wrap" class="hidden border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1"></div>
                            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">${t(e("建立派發","Create assignment"))}</button>
                        </form>
                    </div>
                    <div class="lg:col-span-3 space-y-4">
                        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <h3 class="font-bold text-slate-800 mb-3">${t(e("派發紀錄","Assignments"))}</h3>
                            <div id="assign-list" class="text-sm text-slate-500">${t(e("載入中…","Loading…"))}</div>
                        </div>
                        <div id="grade-panel" class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hidden">
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h3 class="font-bold text-slate-800" id="grade-title">${t(e("評分","Grading"))}</h3>
                                <button type="button" id="close-grade" class="text-sm text-slate-500 hover:underline">${t(e("關閉","Close"))}</button>
                            </div>
                            <div id="grade-table-wrap" class="overflow-x-auto"></div>
                        </div>
                    </div>
                </div>`;const x=document.getElementById("admin-ws-flash"),$=document.getElementById("assign-list"),H=document.getElementById("grade-panel"),z=document.getElementById("grade-title"),w=document.getElementById("grade-table-wrap");let q=[];async function C(){const l=await r.ScienceApi.apiFetch("/teacher/worksheets"),o=document.getElementById("worksheet-id");if(!l||!l.length){o.innerHTML=`<option value="">${t(e("— 請先設計工作紙 —","— Create a worksheet first —"))}</option>`;return}o.innerHTML=l.map(s=>{const u=s.is_mine?e("（我的）"," (mine)"):"",a=s.status==="published"?"":" ["+A(s.status)+"]";return`<option value="${Number(s.id)}">${t((s.title_zh||s.title_en||"")+u+a)}</option>`}).join("")}async function _(){const l=await r.ScienceApi.apiFetch("/teacher/classes/"+i+"/worksheet-assignments");q=l.students||[];const o=l.assignments||[];if(v(),!o.length){$.innerHTML=`<p class="text-slate-500">${t(e("尚無派發紀錄。","No assignments yet."))}</p>`;return}$.innerHTML='<div class="space-y-2">'+o.map(s=>{const u=s.title_zh||s.worksheet_title_zh||s.worksheet_slug,a=s.due_at?" · "+e("截止 ","Due ")+String(s.due_at).replace("T"," ").slice(0,16):"";return`<button type="button" class="assign-row w-full text-left border rounded-lg px-3 py-2 hover:border-indigo-300" data-id="${Number(s.id)}">
                        <span class="font-medium">${t(u)}</span>
                        <span class="block text-xs text-slate-500">${t(A(s.status))} · ${t(e("已提交","Submitted"))} ${Number(s.submitted_count)}/${Number(s.student_count)} · ${t(e("已評分","Graded"))} ${Number(s.graded_count)}${t(a)}</span>
                    </button>`}).join("")+"</div>",$.querySelectorAll(".assign-row").forEach(s=>{s.addEventListener("click",()=>R(parseInt(s.getAttribute("data-id")||"0",10)))})}async function R(l){if(!l)return;const o=await r.ScienceApi.apiFetch("/teacher/worksheet-assignments/"+l),s=o.assignment;z.textContent=(s.title_zh||s.worksheet_title_zh||e("習作","Assignment"))+" — "+e("評分","Grading");const u=o.submissions||[];w.innerHTML=`<table class="min-w-full text-sm"><thead class="bg-slate-50"><tr>
                    <th class="p-2 text-left">${t(e("學生","Student"))}</th>
                    <th class="p-2">${t(e("狀態","Status"))}</th>
                    <th class="p-2">${t(e("提交","Submitted"))}</th>
                    <th class="p-2">${t(e("分數","Score"))}</th>
                    <th class="p-2">${t(e("評語","Feedback"))}</th>
                    <th class="p-2">${t(e("自動","Auto"))}</th>
                    <th class="p-2"></th></tr></thead><tbody>`+u.map(a=>{const c=(a.responses||[]).map((p,y)=>{const k=p.auto_gradable&&p.is_correct!=null?` <span class="${p.is_correct?"text-emerald-600":"text-red-600"}">${p.is_correct?"✓":"✗"}</span>`:"";return`<tr class="border-t bg-slate-50/50"><td class="p-2 pl-6 text-xs text-slate-500" colspan="2">${t(e("題","Q")+" "+(y+1))}</td><td class="p-2 text-xs" colspan="5">${t(N(p))}${k}</td></tr>`}).join(""),g=a.score!=null?a.score:a.auto_score!=null?a.auto_score:"";return`<tr class="border-t" data-sub-id="${Number(a.id)}">
                            <td class="p-2">${t(a.student_name||"#"+a.user_id)}</td>
                            <td class="p-2 text-center">${t(A(a.status))}</td>
                            <td class="p-2 text-center text-xs">${a.submitted_at?t(String(a.submitted_at).slice(0,16)):"—"}</td>
                            <td class="p-2"><input type="number" class="grade-score w-20 border rounded px-2 py-1" min="0" max="${Number(s.max_score)}" step="0.5" value="${t(String(g))}"></td>
                            <td class="p-2"><input type="text" class="grade-feedback w-full border rounded px-2 py-1" value="${t(a.feedback_zh||"")}" placeholder="${t(e("評語","Feedback"))}"></td>
                            <td class="p-2 text-center text-xs text-slate-500">${a.auto_score!=null?t(String(a.auto_score)):"—"}
                                ${a.auto_score!=null?` <button type="button" class="btn-use-auto text-indigo-600 hover:underline" data-auto="${t(String(a.auto_score))}">${t(e("採用","Use"))}</button>`:""}
                            </td>
                            <td class="p-2"><button type="button" class="btn-save-grade text-indigo-600 hover:underline">${t(e("儲存","Save"))}</button></td>
                        </tr>${c}`}).join("")+"</tbody></table>",H.classList.remove("hidden"),w.querySelectorAll(".btn-use-auto").forEach(a=>{a.addEventListener("click",()=>{const c=a.closest("tr"),g=c&&c.querySelector(".grade-score");g&&a.getAttribute("data-auto")&&(g.value=a.getAttribute("data-auto"))})}),w.querySelectorAll(".btn-save-grade").forEach(a=>{a.addEventListener("click",async()=>{const c=a.closest("tr"),g=parseInt(c.getAttribute("data-sub-id")||"0",10),p=c.querySelector(".grade-score").value,y=c.querySelector(".grade-feedback").value;try{await r.ScienceApi.apiFetch("/teacher/worksheet-submissions/"+g+"/grade",{method:"POST",body:{score:p,feedback_zh:y,feedback_en:y}}),m(e("已儲存評分","Grade saved"),!1),await _()}catch(k){m(k.message||e("儲存失敗","Save failed"),!0)}})})}h.querySelectorAll("[data-spa-nav]").forEach(l=>{l.addEventListener("click",o=>{o.preventDefault(),r.AppRouter.navigate(l.getAttribute("data-spa-nav"))})}),(E=document.getElementById("assign-all"))==null||E.addEventListener("change",v),(I=document.getElementById("close-grade"))==null||I.addEventListener("click",()=>H.classList.add("hidden")),(L=document.getElementById("assign-form"))==null||L.addEventListener("submit",async l=>{l.preventDefault();const o=document.getElementById("assign-all").checked,s=o?[]:Array.from(document.querySelectorAll(".stu-pick:checked")).map(a=>parseInt(a.value,10));if(!o&&!s.length){m(e("請至少選擇一位學生","Select at least one student"),!0);return}const u=document.getElementById("due-at").value;try{await r.ScienceApi.apiFetch("/teacher/classes/"+i+"/worksheet-assignments",{method:"POST",body:{worksheet_id:parseInt(document.getElementById("worksheet-id").value,10),title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,instructions_zh:document.getElementById("instructions-zh").value,max_score:parseFloat(document.getElementById("max-score").value)||100,due_at:u||null,assign_all:o,student_ids:s,status:"active"}}),m(e("已建立派發","Assignment created"),!1),l.target.reset(),document.getElementById("assign-all").checked=!0,document.getElementById("max-score").value="100",v(),await _()}catch(a){m(a.message||e("建立失敗","Create failed"),!0)}}),await C(),await _();const T=parseInt(new URLSearchParams(location.search).get("assignment")||"0",10);T>0&&await R(T)}catch(B){h.innerHTML=`<p class="text-red-600">${t(B.message||e("載入失敗","Load failed"))}</p>`}}r.AppAdmin=Object.assign(r.AppAdmin||{},{renderAdminCourseWorksheets:F});
