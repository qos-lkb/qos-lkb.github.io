const l=window;function s(o,a){return l.AppRouter&&l.AppRouter.t?l.AppRouter.t(o,a):o}function t(o){return l.AppRouter&&l.AppRouter.escapeHtml?l.AppRouter.escapeHtml(o):String(o||"")}function f(o){return l.AppRouter&&l.AppRouter.spaHref?l.AppRouter.spaHref(o):String(o||"")}function R(){const o=document.getElementById("sidebar");o&&(o.style.display="none")}function L(o){const a=String(o||"").toUpperCase();return a==="E"?s("英文 (E)","English (E)"):a==="C"?s("中文 (C)","Chinese (C)"):"—"}function k(o){return(o.display_name||o.name_zh||o.name_en||o.email||"").trim()||"—"}function B(){return l.ScienceApi.getUser()?l.ScienceApi.hasPermission("class.manage_any")||l.ScienceApi.hasPermission("class.manage_own"):(l.AppRouter.navigate("/login"),!1)}let m=null;async function b(o){var y,E,S,A;R();const a=parseInt(o,10)||0,g=document.getElementById("page-title"),c=document.getElementById("card-container");if(g&&(g.textContent=s("學生與修讀語言","Students & MOI")),!B()){l.ScienceApi.getUser()&&(c.innerHTML=`<p class="text-red-600">${t(s("沒有權限。","Forbidden."))}</p>`);return}if(a<=0){l.AppRouter.navigate("/admin/courses");return}c.innerHTML=`<p class="text-slate-500">${t(s("載入中…","Loading…"))}</p>`;try{let u=function(e,r){x&&(x.textContent=e,x.classList.remove("hidden","text-emerald-700","text-red-600"),x.classList.add(r?"text-red-600":"text-emerald-700"))},w=function(){return Array.from(c.querySelectorAll(".course-student-cb:checked")).map(e=>parseInt(e.value,10)).filter(e=>e>0)},$=function(){const e=document.getElementById("course-students-select-all"),r=c.querySelectorAll(".course-student-cb"),n=c.querySelectorAll(".course-student-cb:checked");e&&(e.checked=r.length>0&&n.length===r.length,e.indeterminate=n.length>0&&n.length<r.length);const d=document.getElementById("course-students-bulk-remove");d&&(d.disabled=n.length===0)};var q=u,H=w,M=$;const p=await l.ScienceApi.apiFetch("/admin/classes/"+a),h=p.class;if(!h){c.innerHTML=`<p class="text-red-600">${t(s("找不到課程。","Course not found."))}</p>`;return}const i=!!p.can_edit_students,v=p.students||[],I=[h.form_level_label,h.course_subject_label,h.school_year].filter(Boolean).join(" · "),C=v.map(e=>{const r=Number(e.id),n=String(e.moi||"").toUpperCase(),d=k(e);return i?`<tr class="border-t border-slate-100 align-middle" data-user-id="${r}">
                    <td class="p-3 w-10">
                        <input type="checkbox" class="course-student-cb rounded border-slate-300" value="${r}" aria-label="${t(s("選取","Select")+" "+d)}">
                    </td>
                    <td class="p-3">
                        <div class="font-medium">${t(d)}</div>
                        <div class="text-xs text-slate-500">${t(_(e.name_zh,e.name_en))}</div>
                    </td>
                    <td class="p-3">${t(e.email||"")}</td>
                    <td class="p-3">${t(e.student_number||"—")}</td>
                    <td class="p-3">
                        <input type="text" class="student-form-class w-24 border rounded-lg px-2 py-1.5" maxlength="32"
                            value="${t(e.form_class||"")}" placeholder="1A">
                    </td>
                    <td class="p-3">
                        <input type="number" class="student-class-no w-20 border rounded-lg px-2 py-1.5" min="1" max="99"
                            value="${e.class_no!=null&&e.class_no!==""?Number(e.class_no):""}" placeholder="—">
                    </td>
                    <td class="p-3">
                        <select class="student-moi border rounded-lg px-2 py-1.5">
                            <option value=""${n!=="E"&&n!=="C"?" selected":""}>—</option>
                            <option value="E"${n==="E"?" selected":""}>${t(s("英文 (E)","English (E)"))}</option>
                            <option value="C"${n==="C"?" selected":""}>${t(s("中文 (C)","Chinese (C)"))}</option>
                        </select>
                    </td>
                    <td class="p-3 whitespace-nowrap">
                        <a href="${t(f(`/admin/courses/${a}/students/${r}`))}" data-spa-nav="/admin/courses/${a}/students/${r}" class="text-indigo-600 hover:underline text-xs mr-2">${t(s("課業","Dossier"))}</a>
                        <button type="button" class="course-remove-student text-red-600 hover:underline text-xs" data-user-id="${r}">${t(s("移出","Remove"))}</button>
                    </td>
                </tr>`:`<tr class="border-t border-slate-100">
                        <td class="p-3">
                            <div class="font-medium">${t(d)}</div>
                            <div class="text-xs text-slate-500">${t(_(e.name_zh,e.name_en))}</div>
                        </td>
                        <td class="p-3">${t(e.email||"")}</td>
                        <td class="p-3">${t(e.student_number||"—")}</td>
                        <td class="p-3">${t(e.form_class||"—")}</td>
                        <td class="p-3">${e.class_no!=null&&e.class_no!==""?Number(e.class_no):"—"}</td>
                        <td class="p-3">${t(L(n))}</td>
                        <td class="p-3">
                            <a href="${t(f(`/admin/courses/${a}/students/${r}`))}" data-spa-nav="/admin/courses/${a}/students/${r}" class="text-indigo-600 hover:underline text-sm">${t(s("課業","Dossier"))}</a>
                        </td>
                    </tr>`}).join("");c.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${t(f(`/admin/courses/${a}`))}" data-spa-nav="/admin/courses/${a}" class="text-sm text-indigo-700 hover:underline">${t(s("← 編輯課程","← Edit course"))}</a>
                    <a href="${t(f("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${t(s("課程列表","Courses"))}</a>
                    <a href="${t(f(`/admin/courses/${a}/report`))}" data-spa-nav="/admin/courses/${a}/report" class="text-sm text-slate-600 hover:underline">${t(s("學習報告","Report"))}</a>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${t(h.name)}</h2>
                <p class="text-sm text-slate-500 mb-4">${t(I)}</p>
                <p id="admin-course-students-flash" class="text-sm mb-4 hidden"></p>
                ${i?"":`<div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">${t(s("此頁僅供檢視。班內學生與 MOI 由管理員編輯。","View only. Admins edit enrollments and MOI."))}</div>`}
                ${i?`
                <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
                    <h3 class="font-bold text-slate-800 mb-3">${t(s("加入學生（帳戶名稱）","Enroll students (login id)"))}</h3>
                    <form id="course-enroll-form" class="space-y-3">
                        <textarea name="emails" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="${t(s("多個帳戶名以逗號或換行分隔（須已存在）","Comma or newline separated existing accounts"))}"></textarea>
                        <button type="submit" class="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm">${t(s("加入課程","Enroll"))}</button>
                    </form>
                </div>`:""}
                <form id="course-students-form">
                    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                            <h3 class="font-bold text-slate-800">${t(s("學生名單","Students"))}（${v.length}）</h3>
                            <div class="flex flex-wrap items-center gap-2">
                                ${i&&v.length?`<button type="button" id="course-students-bulk-remove" class="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40">${t(s("移出所選","Remove selected"))}</button>`:""}
                                ${i?`<button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${t(s("儲存班別／班號／修讀語言","Save class / no. / MOI"))}</button>`:""}
                            </div>
                        </div>
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    ${i?`<th class="p-3 w-10">${v.length?`<input type="checkbox" id="course-students-select-all" class="rounded border-slate-300" aria-label="${t(s("全選","Select all"))}">`:""}</th>`:""}
                                    <th class="p-3">${t(s("姓名","Name"))}</th>
                                    <th class="p-3">${t(s("帳戶","Login"))}</th>
                                    <th class="p-3">${t(s("學號","Student no."))}</th>
                                    <th class="p-3">${t(s("班別","Class"))}</th>
                                    <th class="p-3">${t(s("班號","No."))}</th>
                                    <th class="p-3">${t(s("修讀語言（MOI）","MOI"))}</th>
                                    <th class="p-3">${t(s("操作","Actions"))}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${C||`<tr><td colspan="${i?8:7}" class="p-6 text-slate-500 text-center">${t(s("尚無學生","No students"))}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </form>`;const x=document.getElementById("admin-course-students-flash");if(m&&(u(m.msg,m.isError),m=null),c.querySelectorAll("[data-spa-nav]").forEach(e=>{e.addEventListener("click",r=>{r.preventDefault(),l.AppRouter.navigate(e.getAttribute("data-spa-nav"))})}),!i)return;c.querySelectorAll(".course-student-cb").forEach(e=>{e.addEventListener("change",$)}),(y=document.getElementById("course-students-select-all"))==null||y.addEventListener("change",e=>{const r=!!e.target.checked;c.querySelectorAll(".course-student-cb").forEach(n=>{n.checked=r}),$()}),$(),(E=document.getElementById("course-enroll-form"))==null||E.addEventListener("submit",async e=>{e.preventDefault();const n=String(new FormData(e.target).get("emails")||"").trim().split(/[\s,;]+/).map(d=>d.trim()).filter(Boolean);if(!n.length){u(s("請輸入至少一個帳戶名稱。","Enter at least one login id."),!0);return}try{const d=await l.ScienceApi.apiFetch("/admin/classes/"+a+"/students",{method:"POST",body:{action:"enroll",emails:n}});m={msg:s("已加入 ","Enrolled ")+(d.enrolled||0)+s(" 位學生。"," student(s)."),isError:!1},await b(String(a))}catch(d){u(d.message||s("加入失敗","Enroll failed"),!0)}}),(S=document.getElementById("course-students-form"))==null||S.addEventListener("submit",async e=>{e.preventDefault();const r=[];document.querySelectorAll("#course-students-form tr[data-user-id]").forEach(n=>{const d=parseInt(n.getAttribute("data-user-id")||"0",10);d&&r.push({user_id:d,form_class:(n.querySelector(".student-form-class")||{}).value||"",class_no:(n.querySelector(".student-class-no")||{}).value||"",moi:(n.querySelector(".student-moi")||{}).value||""})});try{const n=await l.ScienceApi.apiFetch("/admin/classes/"+a+"/students",{method:"POST",body:{action:"batch_update",rows:r}});m={msg:s("已更新 ","Updated ")+(n.updated||0)+s(" 位學生。"," student(s)."),isError:!1},await b(String(a))}catch(n){u(n.message||s("儲存失敗","Save failed"),!0)}}),(A=document.getElementById("course-students-bulk-remove"))==null||A.addEventListener("click",async()=>{const e=w();if(!e.length){u(s("請至少勾選一位學生。","Select at least one student."),!0);return}if(confirm(s("確定將所選的 "+e.length+" 位學生移出本課程？","Remove "+e.length+" selected student(s) from this course?")))try{const r=await l.ScienceApi.apiFetch("/admin/classes/"+a+"/students",{method:"POST",body:{action:"remove_bulk",user_ids:e}}),n=Number(r.removed||e.length);m={msg:s("已移出 "+n+" 位學生。","Removed "+n+" student(s)."),isError:!1},await b(String(a))}catch(r){u(r.message||s("移出失敗","Remove failed"),!0)}}),c.querySelectorAll(".course-remove-student").forEach(e=>{e.addEventListener("click",async()=>{const r=parseInt(e.getAttribute("data-user-id")||"0",10);if(!(!r||!confirm(s("確定將此學生移出本課程？","Remove this student from the course?"))))try{await l.ScienceApi.apiFetch("/admin/classes/"+a+"/students/"+r,{method:"DELETE",body:{}}),m={msg:s("已移出學生。","Student removed."),isError:!1},await b(String(a))}catch(n){u(n.message||s("移出失敗","Remove failed"),!0)}})})}catch(p){c.innerHTML=`<p class="text-red-600">${t(p.message||s("載入失敗","Load failed"))}</p>`}}function _(o,a){return[o,a].map(g=>String(g||"").trim()).filter(Boolean).join(" / ")}l.AppAdmin=Object.assign(l.AppAdmin||{},{renderAdminCourseStudents:b});
