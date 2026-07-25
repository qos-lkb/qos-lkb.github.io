const r=window;function t(n,a){return r.AppRouter&&r.AppRouter.t?r.AppRouter.t(n,a):n}function e(n){return r.AppRouter&&r.AppRouter.escapeHtml?r.AppRouter.escapeHtml(n):String(n||"")}function f(n){return r.AppRouter&&r.AppRouter.spaHref?r.AppRouter.spaHref(n):String(n||"")}function S(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function _(n){const a=String(n||"").toUpperCase();return a==="E"?t("英文 (E)","English (E)"):a==="C"?t("中文 (C)","Chinese (C)"):"—"}function y(n){return(n.display_name||n.name_zh||n.name_en||n.email||"").trim()||"—"}function C(){return r.ScienceApi.getUser()?r.ScienceApi.hasPermission("class.manage_any")||r.ScienceApi.hasPermission("class.manage_own"):(r.AppRouter.navigate("/login"),!1)}async function x(n){var g,$;S();const a=parseInt(n,10)||0,h=document.getElementById("page-title"),c=document.getElementById("card-container");if(h&&(h.textContent=t("學生與修讀語言","Students & MOI")),!C()){r.ScienceApi.getUser()&&(c.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(a<=0){r.AppRouter.navigate("/admin/courses");return}c.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let l=function(s,o){b&&(b.textContent=s,b.classList.remove("hidden","text-emerald-700","text-red-600"),b.classList.add(o?"text-red-600":"text-emerald-700"))};var I=l;const u=await r.ScienceApi.apiFetch("/admin/classes/"+a),p=u.class;if(!p){c.innerHTML=`<p class="text-red-600">${e(t("找不到課程。","Course not found."))}</p>`;return}const m=!!u.can_edit_students,v=u.students||[],w=[p.form_level_label,p.course_subject_label,p.school_year].filter(Boolean).join(" · "),E=v.map(s=>{const o=Number(s.id),d=String(s.moi||"").toUpperCase();return m?`<tr class="border-t border-slate-100 align-middle" data-user-id="${o}">
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
                            <option value=""${d!=="E"&&d!=="C"?" selected":""}>—</option>
                            <option value="E"${d==="E"?" selected":""}>${e(t("英文 (E)","English (E)"))}</option>
                            <option value="C"${d==="C"?" selected":""}>${e(t("中文 (C)","Chinese (C)"))}</option>
                        </select>
                    </td>
                    <td class="p-3 whitespace-nowrap">
                        <a href="${e(f(`/admin/courses/${a}/students/${o}`))}" data-spa-nav="/admin/courses/${a}/students/${o}" class="text-indigo-600 hover:underline text-xs mr-2">${e(t("課業","Dossier"))}</a>
                        <button type="button" class="course-remove-student text-red-600 hover:underline text-xs" data-user-id="${o}">${e(t("移出","Remove"))}</button>
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
                        <td class="p-3">${e(_(d))}</td>
                        <td class="p-3">
                            <a href="${e(f(`/admin/courses/${a}/students/${o}`))}" data-spa-nav="/admin/courses/${a}/students/${o}" class="text-indigo-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a>
                        </td>
                    </tr>`}).join("");c.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(f(`/admin/courses/${a}`))}" data-spa-nav="/admin/courses/${a}" class="text-sm text-indigo-700 hover:underline">${e(t("← 編輯課程","← Edit course"))}</a>
                    <a href="${e(f("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${e(t("課程列表","Courses"))}</a>
                    <a href="${e(f(`/admin/courses/${a}/report`))}" data-spa-nav="/admin/courses/${a}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${e(p.name)}</h2>
                <p class="text-sm text-slate-500 mb-4">${e(w)}</p>
                <p id="admin-course-students-flash" class="text-sm mb-4 hidden"></p>
                ${m?"":`<div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">${e(t("此頁僅供檢視。班內學生與 MOI 由管理員編輯。","View only. Admins edit enrollments and MOI."))}</div>`}
                ${m?`
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
                            <h3 class="font-bold text-slate-800">${e(t("學生名單","Students"))}（${v.length}）</h3>
                            ${m?`<button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${e(t("儲存班別／班號／修讀語言","Save class / no. / MOI"))}</button>`:""}
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
                                    <th class="p-3">${e(t("操作","Actions"))}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${E||`<tr><td colspan="7" class="p-6 text-slate-500 text-center">${e(t("尚無學生","No students"))}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </form>`;const b=document.getElementById("admin-course-students-flash");if(c.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault(),r.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),!m)return;(g=document.getElementById("course-enroll-form"))==null||g.addEventListener("submit",async s=>{s.preventDefault();const d=String(new FormData(s.target).get("emails")||"").trim().split(/[\s,;]+/).map(i=>i.trim()).filter(Boolean);if(!d.length){l(t("請輸入至少一個帳戶名稱。","Enter at least one login id."),!0);return}try{const i=await r.ScienceApi.apiFetch("/admin/classes/"+a+"/students",{method:"POST",body:{action:"enroll",emails:d}});l(t("已加入 ","Enrolled ")+(i.enrolled||0)+t(" 位學生。"," student(s)."),!1),await x(String(a))}catch(i){l(i.message||t("加入失敗","Enroll failed"),!0)}}),($=document.getElementById("course-students-form"))==null||$.addEventListener("submit",async s=>{s.preventDefault();const o=[];document.querySelectorAll("#course-students-form tr[data-user-id]").forEach(d=>{const i=parseInt(d.getAttribute("data-user-id")||"0",10);i&&o.push({user_id:i,form_class:(d.querySelector(".student-form-class")||{}).value||"",class_no:(d.querySelector(".student-class-no")||{}).value||"",moi:(d.querySelector(".student-moi")||{}).value||""})});try{const d=await r.ScienceApi.apiFetch("/admin/classes/"+a+"/students",{method:"POST",body:{action:"batch_update",rows:o}});l(t("已更新 ","Updated ")+(d.updated||0)+t(" 位學生。"," student(s)."),!1),await x(String(a))}catch(d){l(d.message||t("儲存失敗","Save failed"),!0)}}),c.querySelectorAll(".course-remove-student").forEach(s=>{s.addEventListener("click",async()=>{const o=parseInt(s.getAttribute("data-user-id")||"0",10);if(!(!o||!confirm(t("確定將此學生移出本課程？","Remove this student from the course?"))))try{await r.ScienceApi.apiFetch("/admin/classes/"+a+"/students/"+o,{method:"DELETE",body:{}}),l(t("已移出學生。","Student removed."),!1),await x(String(a))}catch(d){l(d.message||t("移出失敗","Remove failed"),!0)}})})}catch(u){c.innerHTML=`<p class="text-red-600">${e(u.message||t("載入失敗","Load failed"))}</p>`}}function A(n,a){return[n,a].map(h=>String(h||"").trim()).filter(Boolean).join(" / ")}r.AppAdmin=Object.assign(r.AppAdmin||{},{renderAdminCourseStudents:x});
