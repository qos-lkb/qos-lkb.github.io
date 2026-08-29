const l=window;function t(c,a){return l.AppRouter&&l.AppRouter.t?l.AppRouter.t(c,a):c}function e(c){return l.AppRouter&&l.AppRouter.escapeHtml?l.AppRouter.escapeHtml(c):String(c||"")}function b(c){return l.AppRouter&&l.AppRouter.spaHref?l.AppRouter.spaHref(c):String(c||"")}function R(){const c=document.getElementById("sidebar");c&&(c.style.display="none")}function k(c,a){const v=Object.entries(c||{});return'<option value="">'+e(t("請選擇","Select"))+"</option>"+v.map(([h,L])=>`<option value="${e(h)}"${String(h)===String(a||"")?" selected":""}>${e(L)}</option>`).join("")}function B(c){const a=String(c||"").toUpperCase();return a==="E"?t("英文 (E)","English (E)"):a==="C"?t("中文 (C)","Chinese (C)"):"—"}function H(){if(!l.ScienceApi.getUser())return l.AppRouter.navigate("/login"),!1;const c=l.ScienceApi.hasPermission("class.manage_any"),a=l.ScienceApi.hasPermission("class.manage_own");return c||a}async function I(){var y,_,p;R();const c=document.getElementById("page-title"),a=document.getElementById("card-container");if(c&&(c.textContent=t("課程管理","Courses")),!H()){l.ScienceApi.getUser()&&(a.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}a.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let i=function(s,n){g&&(g.textContent=s,g.classList.remove("hidden","text-emerald-700","text-red-600"),g.classList.add(n?"text-red-600":"text-emerald-700"))},r=function(s,n){try{sessionStorage.setItem("admin-courses-flash",JSON.stringify({msg:s,err:!!n}))}catch{}},u=function(){return Array.from(a.querySelectorAll(".admin-course-cb:checked")).map(s=>parseInt(s.value,10)).filter(s=>s>0)},m=function(){const s=document.getElementById("admin-courses-select-all"),n=a.querySelectorAll(".admin-course-cb"),d=a.querySelectorAll(".admin-course-cb:checked");s&&(s.checked=n.length>0&&d.length===n.length,s.indeterminate=d.length>0&&d.length<n.length);const A=document.getElementById("admin-courses-bulk-delete");A&&(A.disabled=d.length===0)};var v=i,h=r,L=u,N=m;const o=await l.ScienceApi.apiFetch("/admin/classes"),f=o.classes||[],j=o.form_level_options||{},E=o.course_subject_options||{},S=o.teacher_options||[],w=l.ScienceApi.hasPermission("class.manage_any"),x=l.ScienceApi.getUser(),$=(()=>{const s=new Date().getFullYear();return s+"-"+(s+1)})(),C=w&&S.length?`<label class="text-sm">${e(t("任教老師","Teacher"))}
                    <select name="teacher_user_id" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                        ${S.map(s=>`<option value="${Number(s.id)}"${Number(s.id)===Number(x.id)?" selected":""}>${e(s.label||s.display_name||s.email)}</option>`).join("")}
                    </select>
                </label>`:`<input type="hidden" name="teacher_user_id" value="${Number(x.id)}">`,D=f.map(s=>{const n=s.is_active?`<span class="text-emerald-700 text-xs">${e(t("啟用","Active"))}</span>`:`<span class="text-slate-400 text-xs">${e(t("停用","Inactive"))}</span>`,d=String(s.name||"");return`<tr class="border-t border-slate-100">
                    <td class="p-3 w-10">
                        <input type="checkbox" class="admin-course-cb rounded border-slate-300" value="${Number(s.id)}" aria-label="${e(t("選取","Select")+" "+d)}">
                    </td>
                    <td class="p-3 font-medium">${e(s.name)}</td>
                    <td class="p-3 text-sm">${e(s.form_level_label||"—")}</td>
                    <td class="p-3 text-sm">${e(s.course_subject_label||"—")}</td>
                    <td class="p-3 text-sm">${e(s.school_year||"")}</td>
                    <td class="p-3 text-sm">${e(s.teacher_name||"")}</td>
                    <td class="p-3 text-sm">${Number(s.student_count||0)}</td>
                    <td class="p-3 font-mono text-xs">${e(s.invite_code||"")}</td>
                    <td class="p-3">${n}</td>
                    <td class="p-3 whitespace-nowrap text-sm">
                        <a class="text-indigo-700 hover:underline" href="${e(b(`/admin/courses/${Number(s.id)}`))}" data-spa-nav="/admin/courses/${Number(s.id)}">${e(t("編輯","Edit"))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${e(b(`/admin/courses/${Number(s.id)}/students`))}" data-spa-nav="/admin/courses/${Number(s.id)}/students">${e(t("學生","Students"))}</a>
                        <a class="text-indigo-700 hover:underline ml-2" href="${e(b(`/admin/courses/${Number(s.id)}/report`))}" data-spa-nav="/admin/courses/${Number(s.id)}/report">${e(t("報告","Report"))}</a>
                        <button type="button" class="admin-course-delete text-red-600 hover:underline ml-2" data-id="${Number(s.id)}">${e(t("刪除","Delete"))}</button>
                    </td>
                </tr>`}).join("");a.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(b("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
                </div>
                <p id="admin-courses-flash" class="text-sm mb-3 hidden"></p>
                <form id="admin-course-create" class="mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end bg-white border border-slate-200 rounded-xl p-4">
                    <label class="text-sm sm:col-span-2 lg:col-span-1">${e(t("課程名稱","Course name"))}
                        <input name="name" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${e(t("學年","School year"))}
                        <input name="school_year" value="${e($)}" class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="text-sm">${e(t("年級","Form"))}
                        <select name="form_level" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${k(j)}</select>
                    </label>
                    <label class="text-sm">${e(t("科目","Subject"))}
                        <select name="course_subject" required class="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${k(E)}</select>
                    </label>
                    ${C}
                    <label class="text-sm flex items-center gap-2 mt-6">
                        <input type="checkbox" name="is_active" checked class="rounded border-slate-300">
                        ${e(t("啟用","Active"))}
                    </label>
                    <button type="submit" class="rounded-lg bg-indigo-700 text-white px-3 py-2 text-sm font-semibold">${e(t("新增課程","Create course"))}</button>
                </form>
                ${f.length?`
                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-slate-600">${f.length} ${e(t("門課程","courses"))}</p>
                    <button type="button" id="admin-courses-bulk-delete" class="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40">${e(t("刪除所選","Delete selected"))}</button>
                </div>`:""}
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3 w-10">
                                    ${f.length?`<input type="checkbox" id="admin-courses-select-all" class="rounded border-slate-300" aria-label="${e(t("全選","Select all"))}">`:""}
                                </th>
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
                            ${D||`<tr><td colspan="10" class="p-6 text-center text-slate-500">${e(t("尚無課程","No courses"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>`;const g=document.getElementById("admin-courses-flash");try{const s=sessionStorage.getItem("admin-courses-flash");if(s){sessionStorage.removeItem("admin-courses-flash");const n=JSON.parse(s);n&&n.msg&&i(n.msg,!!n.err)}}catch{}a.querySelectorAll("[data-spa-nav]").forEach(s=>{s.addEventListener("click",n=>{n.preventDefault(),l.AppRouter.navigate(s.getAttribute("data-spa-nav"))})}),(y=document.getElementById("admin-course-create"))==null||y.addEventListener("submit",async s=>{s.preventDefault();const n=new FormData(s.target);try{const d=await l.ScienceApi.apiFetch("/admin/classes",{method:"POST",body:{name:String(n.get("name")||""),school_year:String(n.get("school_year")||""),form_level:String(n.get("form_level")||""),course_subject:String(n.get("course_subject")||""),teacher_user_id:parseInt(String(n.get("teacher_user_id")||x.id),10)||x.id,is_active:n.get("is_active")==="on"||n.get("is_active")==="1"}}),A=d.class&&d.class.id?Number(d.class.id):0;if(A>0){l.AppRouter.navigate("/admin/courses/"+A);return}i(t("已新增課程。","Course created."),!1),await I()}catch(d){i(d.message||t("儲存失敗","Save failed"),!0)}}),a.querySelectorAll(".admin-course-cb").forEach(s=>{s.addEventListener("change",m)}),(_=document.getElementById("admin-courses-select-all"))==null||_.addEventListener("change",s=>{const n=!!s.target.checked;a.querySelectorAll(".admin-course-cb").forEach(d=>{d.checked=n}),m()}),m(),(p=document.getElementById("admin-courses-bulk-delete"))==null||p.addEventListener("click",async()=>{const s=u();if(!s.length){i(t("請至少勾選一門課程。","Select at least one course."),!0);return}if(confirm(t("確定刪除所選的 "+s.length+" 門課程？","Delete "+s.length+" selected course(s)?")))try{const n=await l.ScienceApi.apiFetch("/admin/classes",{method:"POST",body:{action:"delete_bulk",ids:s}}),d=Number(n.deleted||s.length);r(n.message||t("已刪除 "+d+" 門課程。","Deleted "+d+" course(s)."),!1),await I()}catch(n){i(n.message||t("刪除失敗","Delete failed"),!0)}}),a.querySelectorAll(".admin-course-delete").forEach(s=>{s.addEventListener("click",async()=>{const n=parseInt(s.getAttribute("data-id")||"0",10);if(!(!n||!confirm(t("確定刪除此課程？","Delete this course?"))))try{await l.ScienceApi.apiFetch("/admin/classes/"+n,{method:"DELETE",body:{}}),r(t("已刪除。","Deleted."),!1),await I()}catch(d){i(d.message||t("刪除失敗","Delete failed"),!0)}})})}catch(o){a.innerHTML=`<p class="text-red-600">${e(o.message||t("載入失敗","Load failed"))}</p>`}}async function T(c){var N,y,_;R();const a=parseInt(c,10)||0,v=document.getElementById("page-title"),h=document.getElementById("card-container");if(v&&(v.textContent=t("編輯課程","Edit course")),!H()){l.ScienceApi.getUser()&&(h.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}if(a<=0){l.AppRouter.navigate("/admin/courses");return}h.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let i=function(r,u){g&&(g.textContent=r,g.classList.remove("hidden","text-emerald-700","text-red-600"),g.classList.add(u?"text-red-600":"text-emerald-700"))};var L=i;const p=await l.ScienceApi.apiFetch("/admin/classes/"+a),o=p.class;if(!o){h.innerHTML=`<p class="text-red-600">${e(t("找不到課程。","Course not found."))}</p>`;return}const f=p.form_level_options||{},j=p.course_subject_options||{},E=p.teacher_options||[],S=p.students||[],w=!!p.can_edit_students,x=l.ScienceApi.hasPermission("class.manage_any"),$=l.ScienceApi.getUser(),C=x&&E.length?`<label class="block text-sm font-medium text-slate-700">${e(t("任教老師","Teacher"))}
                    <select name="teacher_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
                        ${E.map(r=>`<option value="${Number(r.id)}"${Number(r.id)===Number(o.teacher_user_id||$.id)?" selected":""}>${e(r.label||"")}</option>`).join("")}
                    </select>
                </label>`:`<input type="hidden" name="teacher_user_id" value="${Number(o.teacher_user_id||$.id)}">`,D=S.map(r=>{const u=Number(r.id),m=`/admin/courses/${a}/students/${u}`;return`<tr class="border-t border-slate-100">
                <td class="p-3">${e(r.name_zh||"")}</td>
                <td class="p-3">${e(r.name_en||"")}</td>
                <td class="p-3">${e(r.email||"")}</td>
                <td class="p-3">${e(r.student_number||"—")}</td>
                <td class="p-3">${e(r.form_class||"—")}</td>
                <td class="p-3">${r.class_no!=null&&r.class_no!==""?Number(r.class_no):"—"}</td>
                <td class="p-3">${e(B(r.moi))}</td>
                <td class="p-3">${e(r.joined_at||"")}</td>
                <td class="p-3"><a href="${e(b(m))}" data-spa-nav="${e(m)}" class="text-indigo-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a></td>
            </tr>`}).join("");h.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${e(b("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-indigo-700 hover:underline">${e(t("← 課程列表","← Courses"))}</a>
                    <a href="${e(b(`/admin/courses/${a}/students`))}" data-spa-nav="/admin/courses/${a}/students" class="text-sm text-slate-600 hover:underline">${e(w?t("學生與修讀語言","Students & MOI"):t("查看學生","View students"))}</a>
                    <a href="${e(b(`/admin/courses/${a}/report`))}" data-spa-nav="/admin/courses/${a}/report" class="text-sm text-slate-600 hover:underline">${e(t("學習報告","Report"))}</a>
                    <a href="${e(b(`/admin/courses/${a}/summer`))}" data-spa-nav="/admin/courses/${a}/summer" class="text-sm text-slate-600 hover:underline">${e(t("暑期功課","Summer HW"))}</a>
                    <a href="${e(b(`/admin/courses/${a}/worksheets`))}" data-spa-nav="/admin/courses/${a}/worksheets" class="text-sm text-slate-600 hover:underline">${e(t("工作紙派發","Worksheets"))}</a>
                </div>
                ${p.has_form_subject_columns===!1?`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${e(t("資料庫尚未加入年級／科目欄位，儲存會失敗。","DB missing form/subject columns; save will fail."))}</div>`:""}
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
                            <select name="form_level" required class="mt-1 w-full border rounded-lg px-3 py-2">${k(f,o.form_level)}</select>
                        </label>
                        <label class="block text-sm font-medium text-slate-700">${e(t("科目","Subject"))} <span class="text-red-500">*</span>
                            <select name="course_subject" required class="mt-1 w-full border rounded-lg px-3 py-2">${k(j,o.course_subject)}</select>
                        </label>
                    </div>
                    ${C}
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
                        <h2 class="font-bold text-slate-800">${e(t("學生名單","Students"))}（${S.length}）</h2>
                        <a href="${e(b(`/admin/courses/${a}/students`))}" data-spa-nav="/admin/courses/${a}/students" class="text-sm text-indigo-600 hover:underline">${e(w?t("編輯學生與修讀語言","Edit students & MOI"):t("查看學生與修讀語言","View students & MOI"))}</a>
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
                            ${D||`<tr><td colspan="9" class="p-6 text-slate-500 text-center">${e(t("尚無學生","No students"))}</td></tr>`}
                        </tbody>
                    </table>
                </div>
                ${w?"":`<p class="text-sm text-slate-500">${e(t("加入／移出學生與修改修讀語言僅限管理員操作。","Only admins can enroll/remove students or edit MOI."))}</p>`}`;const g=document.getElementById("admin-course-edit-flash");h.querySelectorAll("[data-spa-nav]").forEach(r=>{r.addEventListener("click",u=>{u.preventDefault(),l.AppRouter.navigate(r.getAttribute("data-spa-nav"))})}),(N=document.getElementById("admin-course-edit"))==null||N.addEventListener("submit",async r=>{var s;r.preventDefault();const u=r.target,m=new FormData(u);try{await l.ScienceApi.apiFetch("/admin/classes/"+a,{method:"PUT",body:{name:String(m.get("name")||"").trim(),school_year:String(m.get("school_year")||"").trim(),form_level:String(m.get("form_level")||""),course_subject:String(m.get("course_subject")||""),teacher_user_id:parseInt(String(m.get("teacher_user_id")||$.id),10)||$.id,is_active:!!((s=u.querySelector('input[name="is_active"]'))!=null&&s.checked)}}),i(t("已儲存。","Saved."),!1),await T(String(a))}catch(n){i(n.message||t("儲存失敗","Save failed"),!0)}}),(y=document.getElementById("course-reset-invite"))==null||y.addEventListener("click",async()=>{if(confirm(t("重設邀請碼？舊碼將失效。","Reset invite code? Old code will stop working.")))try{const r=await l.ScienceApi.apiFetch("/admin/classes/"+a+"/invite",{method:"POST",body:{}}),u=document.getElementById("course-invite-code");u&&r.invite_code&&(u.textContent=r.invite_code),i(t("新邀請碼：","New invite: ")+(r.invite_code||""),!1)}catch(r){i(r.message||t("重設失敗","Reset failed"),!0)}}),(_=document.getElementById("course-edit-delete"))==null||_.addEventListener("click",async()=>{if(confirm(t("確定刪除此課程？學生選課紀錄將一併移除。","Delete this course? Enrollments will be removed.")))try{await l.ScienceApi.apiFetch("/admin/classes/"+a,{method:"DELETE",body:{}}),l.AppRouter.navigate("/admin/courses")}catch(r){i(r.message||t("刪除失敗","Delete failed"),!0)}})}catch(p){h.innerHTML=`<p class="text-red-600">${e(p.message||t("載入失敗","Load failed"))}</p>`}}l.AppAdmin=Object.assign(l.AppAdmin||{},{renderAdminCourses:I,renderAdminCourseEdit:T});
