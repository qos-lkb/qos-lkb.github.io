const n=window;function t(a,r){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(a,r):a}function e(a){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(a):String(a||"")}function g(a){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(a):String(a||"")}function S(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}function _(a){const r=String(a||"").toUpperCase();return r==="E"?t("英文 (E)","English (E)"):r==="C"?t("中文 (C)","Chinese (C)"):"—"}function y(a){return(a.display_name||a.name_zh||a.name_en||a.email||"").trim()||"—"}function C(){return n.ScienceApi.getUser()?n.ScienceApi.hasPermission("class.manage_any")||n.ScienceApi.hasPermission("class.manage_own"):(n.AppRouter.navigate("/login"),!1)}async function b(a){var x,v;S();const r=parseInt(a,10)||0,f=document.getElementById("page-title"),c=document.getElementById("card-container");if(f&&(f.textContent=t("學生與修讀語言","Students & MOI")),!C()){n.ScienceApi.getUser()&&(c.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(r<=0){n.AppRouter.navigate("/admin/courses");return}c.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let d=function(s,l){h&&(h.textContent=s,h.classList.remove("hidden","text-emerald-700","text-red-600"),h.classList.add(l?"text-red-600":"text-emerald-700"))};var I=d;const p=await n.ScienceApi.apiFetch("/admin/classes/"+r),m=p.class;if(!m){c.innerHTML=`<p class="text-red-600">${e(t("找不到課程。","Course not found."))}</p>`;return}const u=!!p.can_edit_students,$=p.students||[],w=[m.form_level_label,m.course_subject_label,m.school_year].filter(Boolean).join(" · "),E=$.map(s=>{const l=Number(s.id),o=String(s.moi||"").toUpperCase();return u?`<tr class="border-t border-slate-100 align-middle" data-user-id="${l}">
                    <td class="p-3">
                        <div class="font-medium">${e(y(s))}</div>
                        <div class="text-xs text-slate-500">${e(A(s.name_zh,s.name_en))}</div>
                    </td>
                    <td class="p-3">${e(s.email||"")}</td>
                    <td class="p-3">${e(s.student_number||"—")}</td>
                    <td class="p-3">
                        <input type="text" class="student-form-class w-24 border rounded-lg px-2 py-1.5" maxlength="32"
                            value="${e(s.form_class||"")}" placeholder="1A">
                    </td>
                    <td class="p-3">
                        <input type="number" class="student-class-no w-20 border rounded-lg px-2 py-1.5" min="1" max="99"
                            value="${s.class_no!=null&&s.class_no!==""?Number(s.class_no):""}" placeholder="—">
                    </td>
                    <td class="p-3">
                        <select class="student-moi border rounded-lg px-2 py-1.5">
                            <option value=""${o!=="E"&&o!=="C"?" selected":""}>—</option>
                            <option value="E"${o==="E"?" selected":""}>${e(t("英文 (E)","English (E)"))}</option>
                            <option value="C"${o==="C"?" selected":""}>${e(t("中文 (C)","Chinese (C)"))}</option>
                        </select>
                    </td>
                    <td class="p-3 whitespace-nowrap">
                        <button type="button" class="course-remove-student text-red-600 hover:underline text-xs" data-user-id="${l}">${e(t("移出","Remove"))}</button>
                    </td>
                </tr>`:`<tr class="border-t border-slate-100">
                        <td class="p-3">
                            <div class="font-medium">${e(y(s))}</div>
                            <div class="text-xs text-slate-500">${e(A(s.name_zh,s.name_en))}</div>
                        </td>
                        <td class="p-3">${e(s.email||"")}</td>
                        <td class="p-3">${e(s.student_number||"—")}</td>
                        <td class="p-3">${e(s.form_class||"—")}</td>
                        <td class="p-3">${s.class_no!=null&&s.class_no!==""?Number(s.class_no):"—"}</td>
                        <td class="p-3">${e(_(o))}</td>
                    </tr>`}).join("");c.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(g(`/admin/courses/${r}`))}" data-spa-nav="/admin/courses/${r}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(g("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${e(t("課程列表","Courses"))}</a>
                    <a href="${e(g(`/admin/courses/${r}/report`))}" data-spa-nav="/admin/courses/${r}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${e(m.name)}</h2>
                <p class="text-sm text-slate-500 mb-4">${e(w)}</p>
                <p id="admin-course-students-flash" class="text-sm mb-4 hidden"></p>
                ${u?"":`<div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">${e(t("此頁僅供檢視。班內學生與 MOI 由管理員編輯。","View only. Admins edit enrollments and MOI."))}</div>`}
                ${u?`
                <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
                    <h3 class="font-bold text-slate-800 mb-3">${e(t("加入學生（帳戶名稱）","Enroll students (login id)"))}</h3>
                    <form id="course-enroll-form" class="space-y-3">
                        <textarea name="emails" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="${e(t("多個帳戶名以逗號或換行分隔（須已存在）","Comma or newline separated existing accounts"))}"></textarea>
                        <button type="submit" class="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm">${e(t("加入課程","Enroll"))}</button>
                    </form>
                </div>`:""}
                <form id="course-students-form">
                    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                        <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                            <h3 class="font-bold text-slate-800">${e(t("學生名單","Students"))}（${$.length}）</h3>
                            ${u?`<button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${e(t("儲存班別／班號／修讀語言","Save class / no. / MOI"))}</button>`:""}
                        </div>
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-3">${e(t("姓名","Name"))}</th>
                                    <th class="p-3">${e(t("帳戶","Login"))}</th>
                                    <th class="p-3">${e(t("學號","Student no."))}</th>
                                    <th class="p-3">${e(t("班別","Class"))}</th>
                                    <th class="p-3">${e(t("班號","No."))}</th>
                                    <th class="p-3">${e(t("修讀語言（MOI）","MOI"))}</th>
                                    ${u?`<th class="p-3">${e(t("操作","Actions"))}</th>`:""}
                                </tr>
                            </thead>
                            <tbody>
                                ${E||`<tr><td colspan="${u?7:6}" class="p-6 text-slate-500 text-center">${e(t("尚無學生","No students"))}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </form>`;const h=document.getElementById("admin-course-students-flash");if(c.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",l=>{l.preventDefault(),n.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),!u)return;(x=document.getElementById("course-enroll-form"))==null||x.addEventListener("submit",async s=>{s.preventDefault();const o=String(new FormData(s.target).get("emails")||"").trim().split(/[\s,;]+/).map(i=>i.trim()).filter(Boolean);if(!o.length){d(t("請輸入至少一個帳戶名稱。","Enter at least one login id."),!0);return}try{const i=await n.ScienceApi.apiFetch("/admin/classes/"+r+"/students",{method:"POST",body:{action:"enroll",emails:o}});d(t("已加入 ","Enrolled ")+(i.enrolled||0)+t(" 位學生。"," student(s)."),!1),await b(String(r))}catch(i){d(i.message||t("加入失敗","Enroll failed"),!0)}}),(v=document.getElementById("course-students-form"))==null||v.addEventListener("submit",async s=>{s.preventDefault();const l=[];document.querySelectorAll("#course-students-form tr[data-user-id]").forEach(o=>{const i=parseInt(o.getAttribute("data-user-id")||"0",10);i&&l.push({user_id:i,form_class:(o.querySelector(".student-form-class")||{}).value||"",class_no:(o.querySelector(".student-class-no")||{}).value||"",moi:(o.querySelector(".student-moi")||{}).value||""})});try{const o=await n.ScienceApi.apiFetch("/admin/classes/"+r+"/students",{method:"POST",body:{action:"batch_update",rows:l}});d(t("已更新 ","Updated ")+(o.updated||0)+t(" 位學生。"," student(s)."),!1),await b(String(r))}catch(o){d(o.message||t("儲存失敗","Save failed"),!0)}}),c.querySelectorAll(".course-remove-student").forEach(s=>{s.addEventListener("click",async()=>{const l=parseInt(s.getAttribute("data-user-id")||"0",10);if(!(!l||!confirm(t("確定將此學生移出本課程？","Remove this student from the course?"))))try{await n.ScienceApi.apiFetch("/admin/classes/"+r+"/students/"+l,{method:"DELETE",body:{}}),d(t("已移出學生。","Student removed."),!1),await b(String(r))}catch(o){d(o.message||t("移出失敗","Remove failed"),!0)}})})}catch(p){c.innerHTML=`<p class="text-red-600">${e(p.message||t("載入失敗","Load failed"))}</p>`}}function A(a,r){return[a,r].map(f=>String(f||"").trim()).filter(Boolean).join(" / ")}n.AppAdmin=Object.assign(n.AppAdmin||{},{renderAdminCourseStudents:b});
