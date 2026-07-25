const a=window;function t(l,n){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(l,n):l}function e(l){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(l):String(l||"")}function u(l){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(l):String(l||"")}function C(){const l=document.getElementById("sidebar");l&&(l.style.display="none")}function T(l){return(a.ScienceApi&&a.ScienceApi.SITE_BASE||"")+"/admin/"+l}function L(l,n){const v=Object.entries(l||{});return'<option value="">'+e(t("請選擇","Select"))+"</option>"+v.map(([c,m])=>`<option value="${e(c)}"${String(c)===String(n||"")?" selected":""}>${e(m)}</option>`).join("")}function D(l){const n=String(l||"").toUpperCase();return n==="E"?t("英文 (E)","English (E)"):n==="C"?t("中文 (C)","Chinese (C)"):"—"}function R(){if(!a.ScienceApi.getUser())return a.AppRouter.navigate("/login"),!1;const l=a.ScienceApi.hasPermission("class.manage_any"),n=a.ScienceApi.hasPermission("class.manage_own");return l||n}async function I(){var c;C();const l=document.getElementById("page-title"),n=document.getElementById("card-container");if(l&&(l.textContent=t("課程管理","Courses")),!R()){a.ScienceApi.getUser()&&(n.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}n.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let x=function(s,i){h&&(h.textContent=s,h.classList.remove("hidden","text-emerald-700","text-red-600"),h.classList.add(i?"text-red-600":"text-emerald-700"))};var v=x;const m=await a.ScienceApi.apiFetch("/admin/classes"),y=m.classes||[],S=m.form_level_options||{},w=m.course_subject_options||{},d=m.teacher_options||[],o=a.ScienceApi.hasPermission("class.manage_any"),$=a.ScienceApi.getUser(),j=(()=>{const s=new Date().getFullYear();return s+"-"+(s+1)})(),A=o&&d.length?`<label class="text-sm">${e(t("任教老師","Teacher"))}
                    <select name="teacher_user_id" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                        ${d.map(s=>`<option value="${Number(s.id)}"${Number(s.id)===Number($.id)?" selected":""}>${e(s.label||s.display_name||s.email)}</option>`).join("")}
                    </select>
                </label>`:`<input type="hidden" name="teacher_user_id" value="${Number($.id)}">`,E=y.map(s=>{const i=s.is_active?`<span class="text-emerald-700 text-xs">${e(t("啟用","Active"))}</span>`:`<span class="text-slate-400 text-xs">${e(t("停用","Inactive"))}</span>`;return`<tr class="border-t border-slate-100">
                    <td class="p-3 font-medium">${e(s.name)}</td>
                    <td class="p-3 text-sm">${e(s.form_level_label||"—")}</td>
                    <td class="p-3 text-sm">${e(s.course_subject_label||"—")}</td>
                    <td class="p-3 text-sm">${e(s.school_year||"")}</td>
                    <td class="p-3 text-sm">${e(s.teacher_name||"")}</td>
                    <td class="p-3 text-sm">${Number(s.student_count||0)}</td>
                    <td class="p-3 font-mono text-xs">${e(s.invite_code||"")}</td>
                    <td class="p-3">${i}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        <a class="text-indigo-700 hover:underline" href="${e(u(`/admin/courses/${Number(s.id)}`))}" data-spa-nav="/admin/courses/${Number(s.id)}">${e(t("編輯","Edit"))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${e(u(`/admin/courses/${Number(s.id)}/students`))}" data-spa-nav="/admin/courses/${Number(s.id)}/students">${e(t("學生","Students"))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${e(u(`/admin/courses/${Number(s.id)}/report`))}" data-spa-nav="/admin/courses/${Number(s.id)}/report">${e(t("報告","Report"))}</a>
                        <button type="button" class="admin-course-delete text-red-600 hover:underline ml-2" data-id="${Number(s.id)}">${e(t("刪除","Delete"))}</button>
                    </td>
                </tr>`}).join("");n.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(u("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                    <a href="${e(T("courses.php"))}" class="text-sm text-slate-600 hover:underline">${e(t("完整 PHP 列表","Full PHP list"))}</a>
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
                        <select name="form_level" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${L(S)}</select>
                    </label>
                    <label class="text-sm">${e(t("科目","Subject"))}
                        <select name="course_subject" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${L(w)}</select>
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
                </div>`;const h=document.getElementById("admin-courses-flash");n.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",i=>{i.preventDefault(),a.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),(c=document.getElementById("admin-course-create"))==null||c.addEventListener("submit",async s=>{s.preventDefault();const i=new FormData(s.target);try{const p=await a.ScienceApi.apiFetch("/admin/classes",{method:"POST",body:{name:String(i.get("name")||""),school_year:String(i.get("school_year")||""),form_level:String(i.get("form_level")||""),course_subject:String(i.get("course_subject")||""),teacher_user_id:parseInt(String(i.get("teacher_user_id")||$.id),10)||$.id,is_active:i.get("is_active")==="on"||i.get("is_active")==="1"}}),f=p.class&&p.class.id?Number(p.class.id):0;if(f>0){a.AppRouter.navigate("/admin/courses/"+f);return}x(t("已新增課程。","Course created."),!1),await I()}catch(p){x(p.message||t("儲存失敗","Save failed"),!0)}}),n.querySelectorAll(".admin-course-delete").forEach(s=>{s.addEventListener("click",async()=>{const i=parseInt(s.getAttribute("data-id")||"0",10);if(!(!i||!confirm(t("確定刪除此課程？","Delete this course?"))))try{await a.ScienceApi.apiFetch("/admin/classes/"+i,{method:"DELETE",body:{}}),x(t("已刪除。","Deleted."),!1),await I()}catch(p){x(p.message||t("刪除失敗","Delete failed"),!0)}})})}catch(m){n.innerHTML=`<p class="text-red-600">${e(m.message||t("載入失敗","Load failed"))}</p>`}}async function H(l){var y,S,w;C();const n=parseInt(l,10)||0,v=document.getElementById("page-title"),c=document.getElementById("card-container");if(v&&(v.textContent=t("編輯課程","Edit course")),!R()){a.ScienceApi.getUser()&&(c.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(n<=0){a.AppRouter.navigate("/admin/courses");return}c.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let g=function(r,b){f&&(f.textContent=r,f.classList.remove("hidden","text-emerald-700","text-red-600"),f.classList.add(b?"text-red-600":"text-emerald-700"))};var m=g;const d=await a.ScienceApi.apiFetch("/admin/classes/"+n),o=d.class;if(!o){c.innerHTML=`<p class="text-red-600">${e(t("找不到課程。","Course not found."))}</p>`;return}const $=d.form_level_options||{},j=d.course_subject_options||{},A=d.teacher_options||[],E=d.students||[],h=!!d.can_edit_students,x=a.ScienceApi.hasPermission("class.manage_any"),s=a.ScienceApi.getUser(),i=x&&A.length?`<label class="block text-sm font-medium text-slate-700">${e(t("任教老師","Teacher"))}
                    <select name="teacher_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
                        ${A.map(r=>`<option value="${Number(r.id)}"${Number(r.id)===Number(o.teacher_user_id||s.id)?" selected":""}>${e(r.label||"")}</option>`).join("")}
                    </select>
                </label>`:`<input type="hidden" name="teacher_user_id" value="${Number(o.teacher_user_id||s.id)}">`,p=E.map(r=>`<tr class="border-t border-slate-100">
                <td class="p-3">${e(r.name_zh||"")}</td>
                <td class="p-3">${e(r.name_en||"")}</td>
                <td class="p-3">${e(r.email||"")}</td>
                <td class="p-3">${e(r.student_number||"—")}</td>
                <td class="p-3">${e(r.form_class||"—")}</td>
                <td class="p-3">${r.class_no!=null&&r.class_no!==""?Number(r.class_no):"—"}</td>
                <td class="p-3">${e(D(r.moi))}</td>
                <td class="p-3">${e(r.joined_at||"")}</td>
            </tr>`).join("");c.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(u("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-indigo-700 hover:underline">${e(t("← 課程列表","← Courses"))}</a>
                    <a href="${e(u(`/admin/courses/${n}/students`))}" data-spa-nav="/admin/courses/${n}/students" class="text-sm text-slate-600 hover:underline">${e(h?t("學生與修讀語言","Students & MOI"):t("查看學生","View students"))}</a>
                    <a href="${e(u(`/admin/courses/${n}/report`))}" data-spa-nav="/admin/courses/${n}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e(u(`/admin/courses/${n}/summer`))}" data-spa-nav="/admin/courses/${n}/summer" class="text-sm text-slate-600 hover:underline">${e(t("暑期功課","Summer HW"))}</a>
                    <a href="${e(u(`/admin/courses/${n}/worksheets`))}" data-spa-nav="/admin/courses/${n}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                </div>
                ${d.has_form_subject_columns===!1?`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(t("資料庫尚未加入年級／科目欄位，儲存會失敗。","DB missing form/subject columns; save will fail."))}</div>`:""}
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
                            <select name="form_level" required class="mt-1 w-full border rounded-lg px-3 py-2">${L($,o.form_level)}</select>
                        </label>
                        <label class="block text-sm font-medium text-slate-700">${e(t("科目","Subject"))} <span class="text-red-500">*</span>
                            <select name="course_subject" required class="mt-1 w-full border rounded-lg px-3 py-2">${L(j,o.course_subject)}</select>
                        </label>
                    </div>
                    ${i}
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
                        <a href="${e(u(`/admin/courses/${n}/students`))}" data-spa-nav="/admin/courses/${n}/students" class="text-sm text-indigo-600 hover:underline">${e(h?t("編輯學生與修讀語言","Edit students & MOI"):t("查看學生與修讀語言","View students & MOI"))}</a>
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
                            </tr>
                        </thead>
                        <tbody>
                            ${p||`<tr><td colspan="8" class="p-6 text-slate-500 text-center">${e(t("尚無學生","No students"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>
                ${h?"":`<p class="text-sm text-slate-500">${e(t("加入／移出學生與修改修讀語言僅限管理員操作。","Only admins can enroll/remove students or edit MOI."))}</p>`}`;const f=document.getElementById("admin-course-edit-flash");c.querySelectorAll("[data-spa-nav]").forEach(r=>{r.addEventListener("click",b=>{b.preventDefault(),a.AppRouter.navigate(r.getAttribute("data-spa-nav"))})}),(y=document.getElementById("admin-course-edit"))==null||y.addEventListener("submit",async r=>{var N;r.preventDefault();const b=r.target,_=new FormData(b);try{await a.ScienceApi.apiFetch("/admin/classes/"+n,{method:"PUT",body:{name:String(_.get("name")||"").trim(),school_year:String(_.get("school_year")||"").trim(),form_level:String(_.get("form_level")||""),course_subject:String(_.get("course_subject")||""),teacher_user_id:parseInt(String(_.get("teacher_user_id")||s.id),10)||s.id,is_active:!!((N=b.querySelector('input[name="is_active"]'))!=null&&N.checked)}}),g(t("已儲存。","Saved."),!1),await H(String(n))}catch(k){g(k.message||t("儲存失敗","Save failed"),!0)}}),(S=document.getElementById("course-reset-invite"))==null||S.addEventListener("click",async()=>{if(confirm(t("重設邀請碼？舊碼將失效。","Reset invite code? Old code will stop working.")))try{const r=await a.ScienceApi.apiFetch("/admin/classes/"+n+"/invite",{method:"POST",body:{}}),b=document.getElementById("course-invite-code");b&&r.invite_code&&(b.textContent=r.invite_code),g(t("新邀請碼：","New invite: ")+(r.invite_code||""),!1)}catch(r){g(r.message||t("重設失敗","Reset failed"),!0)}}),(w=document.getElementById("course-edit-delete"))==null||w.addEventListener("click",async()=>{if(confirm(t("確定刪除此課程？學生選課紀錄將一併移除。","Delete this course? Enrollments will be removed.")))try{await a.ScienceApi.apiFetch("/admin/classes/"+n,{method:"DELETE",body:{}}),a.AppRouter.navigate("/admin/courses")}catch(r){g(r.message||t("刪除失敗","Delete failed"),!0)}})}catch(d){c.innerHTML=`<p class="text-red-600">${e(d.message||t("載入失敗","Load failed"))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminCourses:I,renderAdminCourseEdit:H});
