const n=window;function t(l,a){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(l,a):l}function e(l){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(l):String(l||"")}function m(l){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(l):String(l||"")}function C(){const l=document.getElementById("sidebar");l&&(l.style.display="none")}function L(l,a){const _=Object.entries(l||{});return'<option value="">'+e(t("請選擇","Select"))+"</option>"+_.map(([i,p])=>`<option value="${e(i)}"${String(i)===String(a||"")?" selected":""}>${e(p)}</option>`).join("")}function H(l){const a=String(l||"").toUpperCase();return a==="E"?t("英文 (E)","English (E)"):a==="C"?t("中文 (C)","Chinese (C)"):"—"}function R(){if(!n.ScienceApi.getUser())return n.AppRouter.navigate("/login"),!1;const l=n.ScienceApi.hasPermission("class.manage_any"),a=n.ScienceApi.hasPermission("class.manage_own");return l||a}async function N(){var i;C();const l=document.getElementById("page-title"),a=document.getElementById("card-container");if(l&&(l.textContent=t("課程管理","Courses")),!R()){n.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let f=function(s,d){h&&(h.textContent=s,h.classList.remove("hidden","text-emerald-700","text-red-600"),h.classList.add(d?"text-red-600":"text-emerald-700"))};var _=f;const p=await n.ScienceApi.apiFetch("/admin/classes"),y=p.classes||[],w=p.form_level_options||{},S=p.course_subject_options||{},c=p.teacher_options||[],o=n.ScienceApi.hasPermission("class.manage_any"),g=n.ScienceApi.getUser(),j=(()=>{const s=new Date().getFullYear();return s+"-"+(s+1)})(),A=o&&c.length?`<label class="text-sm">${e(t("任教老師","Teacher"))}
                    <select name="teacher_user_id" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                        ${c.map(s=>`<option value="${Number(s.id)}"${Number(s.id)===Number(g.id)?" selected":""}>${e(s.label||s.display_name||s.email)}</option>`).join("")}
                    </select>
                </label>`:`<input type="hidden" name="teacher_user_id" value="${Number(g.id)}">`,E=y.map(s=>{const d=s.is_active?`<span class="text-emerald-700 text-xs">${e(t("啟用","Active"))}</span>`:`<span class="text-slate-400 text-xs">${e(t("停用","Inactive"))}</span>`;return`<tr class="border-t border-slate-100">
                    <td class="p-3 font-medium">${e(s.name)}</td>
                    <td class="p-3 text-sm">${e(s.form_level_label||"—")}</td>
                    <td class="p-3 text-sm">${e(s.course_subject_label||"—")}</td>
                    <td class="p-3 text-sm">${e(s.school_year||"")}</td>
                    <td class="p-3 text-sm">${e(s.teacher_name||"")}</td>
                    <td class="p-3 text-sm">${Number(s.student_count||0)}</td>
                    <td class="p-3 font-mono text-xs">${e(s.invite_code||"")}</td>
                    <td class="p-3">${d}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        <a class="text-indigo-700 hover:underline" href="${e(m(`/admin/courses/${Number(s.id)}`))}" data-spa-nav="/admin/courses/${Number(s.id)}">${e(t("編輯","Edit"))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${e(m(`/admin/courses/${Number(s.id)}/students`))}" data-spa-nav="/admin/courses/${Number(s.id)}/students">${e(t("學生","Students"))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${e(m(`/admin/courses/${Number(s.id)}/report`))}" data-spa-nav="/admin/courses/${Number(s.id)}/report">${e(t("報告","Report"))}</a>
                        <button type="button" class="admin-course-delete text-red-600 hover:underline ml-2" data-id="${Number(s.id)}">${e(t("刪除","Delete"))}</button>
                    </td>
                </tr>`}).join("");a.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(m("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                </div>
                <p id="admin-courses-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-course-create" class="mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end bg-white border border-slate-200 rounded-xl p-4">
                    <label class="text-sm sm:col-span-2 lg:col-span-1">${e(t("課程名稱","Course name"))}
                        <input name="name" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${e(t("學年","School year"))}
                        <input name="school_year" value="${e(j)}" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${e(t("年級","Form"))}
                        <select name="form_level" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${L(w)}</select>
                    </label>
                    <label class="text-sm">${e(t("科目","Subject"))}
                        <select name="course_subject" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${L(S)}</select>
                    </label>
                    ${A}
                    <label class="text-sm flex items-center gap-2 mt-6">
                        <input type="checkbox" name="is_active" checked class="rounded border-slate-300">
                        ${e(t("啟用","Active"))}
                    </label>
                    <button type="submit" class="rounded-lg bg-indigo-700 text-white px-3 py-2 text-sm font-semibold">${e(t("新增課程","Create course"))}</button>
                </form>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${e(t("課程","Course"))}</th>
                                <th class="p-3">${e(t("年級","Form"))}</th>
                                <th class="p-3">${e(t("科目","Subject"))}</th>
                                <th class="p-3">${e(t("學年","Year"))}</th>
                                <th class="p-3">${e(t("任教老師","Teacher"))}</th>
                                <th class="p-3">${e(t("學生","Students"))}</th>
                                <th class="p-3">${e(t("邀請碼","Invite"))}</th>
                                <th class="p-3">${e(t("狀態","Status"))}</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${E||`<tr><td colspan="9" class="p-6 text-center text-slate-500">${e(t("尚無課程","No courses"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;const h=document.getElementById("admin-courses-flash");a.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",d=>{d.preventDefault(),n.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),(i=document.getElementById("admin-course-create"))==null||i.addEventListener("submit",async s=>{s.preventDefault();const d=new FormData(s.target);try{const b=await n.ScienceApi.apiFetch("/admin/classes",{method:"POST",body:{name:String(d.get("name")||""),school_year:String(d.get("school_year")||""),form_level:String(d.get("form_level")||""),course_subject:String(d.get("course_subject")||""),teacher_user_id:parseInt(String(d.get("teacher_user_id")||g.id),10)||g.id,is_active:d.get("is_active")==="on"||d.get("is_active")==="1"}}),$=b.class&&b.class.id?Number(b.class.id):0;if($>0){n.AppRouter.navigate("/admin/courses/"+$);return}f(t("已新增課程。","Course created."),!1),await N()}catch(b){f(b.message||t("儲存失敗","Save failed"),!0)}}),a.querySelectorAll(".admin-course-delete").forEach(s=>{s.addEventListener("click",async()=>{const d=parseInt(s.getAttribute("data-id")||"0",10);if(!(!d||!confirm(t("確定刪除此課程？","Delete this course?"))))try{await n.ScienceApi.apiFetch("/admin/classes/"+d,{method:"DELETE",body:{}}),f(t("已刪除。","Deleted."),!1),await N()}catch(b){f(b.message||t("刪除失敗","Delete failed"),!0)}})})}catch(p){a.innerHTML=`<p class="text-red-600">${e(p.message||t("載入失敗","Load failed"))}</p>`}}async function k(l){var y,w,S;C();const a=parseInt(l,10)||0,_=document.getElementById("page-title"),i=document.getElementById("card-container");if(_&&(_.textContent=t("編輯課程","Edit course")),!R()){n.ScienceApi.getUser()&&(i.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(a<=0){n.AppRouter.navigate("/admin/courses");return}i.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let v=function(r,u){$&&($.textContent=r,$.classList.remove("hidden","text-emerald-700","text-red-600"),$.classList.add(u?"text-red-600":"text-emerald-700"))};var p=v;const c=await n.ScienceApi.apiFetch("/admin/classes/"+a),o=c.class;if(!o){i.innerHTML=`<p class="text-red-600">${e(t("找不到課程。","Course not found."))}</p>`;return}const g=c.form_level_options||{},j=c.course_subject_options||{},A=c.teacher_options||[],E=c.students||[],h=!!c.can_edit_students,f=n.ScienceApi.hasPermission("class.manage_any"),s=n.ScienceApi.getUser(),d=f&&A.length?`<label class="block text-sm font-medium text-slate-700">${e(t("任教老師","Teacher"))}
                    <select name="teacher_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
                        ${A.map(r=>`<option value="${Number(r.id)}"${Number(r.id)===Number(o.teacher_user_id||s.id)?" selected":""}>${e(r.label||"")}</option>`).join("")}
                    </select>
                </label>`:`<input type="hidden" name="teacher_user_id" value="${Number(o.teacher_user_id||s.id)}">`,b=E.map(r=>{const u=Number(r.id),x=`/admin/courses/${a}/students/${u}`;return`<tr class="border-t border-slate-100">
                <td class="p-3">${e(r.name_zh||"")}</td>
                <td class="p-3">${e(r.name_en||"")}</td>
                <td class="p-3">${e(r.email||"")}</td>
                <td class="p-3">${e(r.student_number||"—")}</td>
                <td class="p-3">${e(r.form_class||"—")}</td>
                <td class="p-3">${r.class_no!=null&&r.class_no!==""?Number(r.class_no):"—"}</td>
                <td class="p-3">${e(H(r.moi))}</td>
                <td class="p-3">${e(r.joined_at||"")}</td>
                <td class="p-3"><a href="${e(m(x))}" data-spa-nav="${e(x)}" class="text-indigo-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a></td>
            </tr>`}).join("");i.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(m("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-indigo-700 hover:underline">${e(t("← 課程列表","← Courses"))}</a>
                    <a href="${e(m(`/admin/courses/${a}/students`))}" data-spa-nav="/admin/courses/${a}/students" class="text-sm text-slate-600 hover:underline">${e(h?t("學生與修讀語言","Students & MOI"):t("查看學生","View students"))}</a>
                    <a href="${e(m(`/admin/courses/${a}/report`))}" data-spa-nav="/admin/courses/${a}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e(m(`/admin/courses/${a}/summer`))}" data-spa-nav="/admin/courses/${a}/summer" class="text-sm text-slate-600 hover:underline">${e(t("暑期功課","Summer HW"))}</a>
                    <a href="${e(m(`/admin/courses/${a}/worksheets`))}" data-spa-nav="/admin/courses/${a}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                </div>
                ${c.has_form_subject_columns===!1?`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(t("資料庫尚未加入年級／科目欄位，儲存會失敗。","DB missing form/subject columns; save will fail."))}</div>`:""}
                <p id="admin-course-edit-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-course-edit" class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm mb-6 max-w-2xl">
                    <label class="block text-sm font-medium text-slate-700">${e(t("課程名稱","Course name"))}
                        <input name="name" required value="${e(o.name||"")}" class="mt-1 w-full border rounded-lg px-3 py-2">
                    </label>
                    <label class="block text-sm font-medium text-slate-700">${e(t("學年","School year"))}
                        <input name="school_year" value="${e(o.school_year||"")}" class="mt-1 w-full border rounded-lg px-3 py-2" placeholder="2025-2026">
                    </label>
                    <div class="grid sm:grid-cols-2 gap-4">
                        <label class="block text-sm font-medium text-slate-700">${e(t("年級","Form"))} <span class="text-red-500">*</span>
                            <select name="form_level" required class="mt-1 w-full border rounded-lg px-3 py-2">${L(g,o.form_level)}</select>
                        </label>
                        <label class="block text-sm font-medium text-slate-700">${e(t("科目","Subject"))} <span class="text-red-500">*</span>
                            <select name="course_subject" required class="mt-1 w-full border rounded-lg px-3 py-2">${L(j,o.course_subject)}</select>
                        </label>
                    </div>
                    ${d}
                    <label class="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" name="is_active" class="rounded border-slate-300"${o.is_active?" checked":""}>
                        ${e(t("啟用","Active"))}
                    </label>
                    <p class="text-sm text-slate-600">${e(t("邀請碼","Invite code"))}：
                        <code id="course-invite-code" class="bg-slate-100 px-2 py-1 rounded font-mono text-xs">${e(o.invite_code||"")}</code>
                    </p>
                    <div class="flex flex-wrap items-center gap-3">
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">${e(t("儲存","Save"))}</button>
                        <button type="button" id="course-reset-invite" class="text-sm text-indigo-600 hover:underline">${e(t("重設邀請碼","Reset invite"))}</button>
                        <button type="button" id="course-edit-delete" class="text-red-600 hover:underline text-sm ml-auto">${e(t("刪除課程","Delete course"))}</button>
                    </div>
                </form>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-4">
                    <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                        <h2 class="font-bold text-slate-800">${e(t("學生名單","Students"))}（${E.length}）</h2>
                        <a href="${e(m(`/admin/courses/${a}/students`))}" data-spa-nav="/admin/courses/${a}/students" class="text-sm text-indigo-600 hover:underline">${e(h?t("編輯學生與修讀語言","Edit students & MOI"):t("查看學生與修讀語言","View students & MOI"))}</a>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3">${e(t("中文名","Name ZH"))}</th>
                                <th class="p-3">${e(t("英文名","Name EN"))}</th>
                                <th class="p-3">${e(t("電郵","Email"))}</th>
                                <th class="p-3">${e(t("學號","Student no."))}</th>
                                <th class="p-3">${e(t("班別","Class"))}</th>
                                <th class="p-3">${e(t("班號","No."))}</th>
                                <th class="p-3">MOI</th>
                                <th class="p-3">${e(t("加入日期","Joined"))}</th>
                                <th class="p-3">${e(t("操作","Actions"))}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${b||`<tr><td colspan="9" class="p-6 text-slate-500 text-center">${e(t("尚無學生","No students"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>
                ${h?"":`<p class="text-sm text-slate-500">${e(t("加入／移出學生與修改修讀語言僅限管理員操作。","Only admins can enroll/remove students or edit MOI."))}</p>`}`;const $=document.getElementById("admin-course-edit-flash");i.querySelectorAll("[data-spa-nav]").forEach(r=>{r.addEventListener("click",u=>{u.preventDefault(),n.AppRouter.navigate(r.getAttribute("data-spa-nav"))})}),(y=document.getElementById("admin-course-edit"))==null||y.addEventListener("submit",async r=>{var I;r.preventDefault();const u=r.target,x=new FormData(u);try{await n.ScienceApi.apiFetch("/admin/classes/"+a,{method:"PUT",body:{name:String(x.get("name")||"").trim(),school_year:String(x.get("school_year")||"").trim(),form_level:String(x.get("form_level")||""),course_subject:String(x.get("course_subject")||""),teacher_user_id:parseInt(String(x.get("teacher_user_id")||s.id),10)||s.id,is_active:!!((I=u.querySelector('input[name="is_active"]'))!=null&&I.checked)}}),v(t("已儲存。","Saved."),!1),await k(String(a))}catch(D){v(D.message||t("儲存失敗","Save failed"),!0)}}),(w=document.getElementById("course-reset-invite"))==null||w.addEventListener("click",async()=>{if(confirm(t("重設邀請碼？舊碼將失效。","Reset invite code? Old code will stop working.")))try{const r=await n.ScienceApi.apiFetch("/admin/classes/"+a+"/invite",{method:"POST",body:{}}),u=document.getElementById("course-invite-code");u&&r.invite_code&&(u.textContent=r.invite_code),v(t("新邀請碼：","New invite: ")+(r.invite_code||""),!1)}catch(r){v(r.message||t("重設失敗","Reset failed"),!0)}}),(S=document.getElementById("course-edit-delete"))==null||S.addEventListener("click",async()=>{if(confirm(t("確定刪除此課程？學生選課紀錄將一併移除。","Delete this course? Enrollments will be removed.")))try{await n.ScienceApi.apiFetch("/admin/classes/"+a,{method:"DELETE",body:{}}),n.AppRouter.navigate("/admin/courses")}catch(r){v(r.message||t("刪除失敗","Delete failed"),!0)}})}catch(c){i.innerHTML=`<p class="text-red-600">${e(c.message||t("載入失敗","Load failed"))}</p>`}}n.AppAdmin=Object.assign(n.AppAdmin||{},{renderAdminCourses:N,renderAdminCourseEdit:k});
