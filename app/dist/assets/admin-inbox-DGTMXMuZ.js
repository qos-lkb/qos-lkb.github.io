const r=window;function t(s,d){return r.AppRouter&&r.AppRouter.t?r.AppRouter.t(s,d):s}function e(s){return r.AppRouter&&r.AppRouter.escapeHtml?r.AppRouter.escapeHtml(s):String(s||"")}function x(s){return r.AppRouter&&r.AppRouter.spaHref?r.AppRouter.spaHref(s):String(s||"")}function L(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function E(){return r.ScienceApi.getUser()?r.ScienceApi.hasPermission("class.manage_any")||r.ScienceApi.hasPermission("class.manage_own"):(r.AppRouter.navigate("/login"),!1)}function R(s){return s==="ungraded"?t("待批改","Ungraded"):s==="overdue_missing"?t("逾期未交","Overdue"):s}function H(s){const d=s.due_at?String(s.due_at):t("（無截止日期）","(no due date)");return t(`同學你好，請盡快完成「${s.title}」（截止：${d}）。如有困難請聯絡老師。`,`Please complete "${s.title}" soon (due: ${d}). Contact your teacher if you need help.`)}async function I(){var v,f;L();const s=document.getElementById("page-title"),d=document.getElementById("card-container");if(s&&(s.textContent=t("待批改／逾期","Grading inbox")),!E()){r.ScienceApi.getUser()&&(d.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`);return}d.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{let $=function(){return w.filter(a=>!(u&&String(a.class_id)!==String(u)||o&&String(a.status)!==String(o)))},p=function(){const a=$().map(n=>{const m=n.status==="overdue_missing"?"bg-red-50 text-red-700 border-red-200":"bg-amber-50 text-amber-800 border-amber-200",l=`/admin/courses/${n.class_id}/students/${n.student_user_id}`;return`<tr class="border-t border-slate-100 align-top">
                    <td class="p-3">
                        <span class="inline-block text-xs px-2 py-0.5 rounded border ${m}">${e(R(n.status))}</span>
                        <div class="font-medium mt-1">${e(n.title||"")}</div>
                        <div class="text-xs text-slate-500">${e(n.class_name||"")}</div>
                    </td>
                    <td class="p-3">
                        <div class="font-medium">${e(n.student_name||"")}</div>
                        <div class="text-xs text-slate-500">${e(n.student_email||"")}</div>
                    </td>
                    <td class="p-3 text-xs">${n.due_at?e(n.due_at):"—"}</td>
                    <td class="p-3 whitespace-nowrap space-x-2">
                        <a href="${e(x(n.deep_link||l))}" data-spa-nav="${e(n.deep_link||l)}"
                           class="text-indigo-600 hover:underline text-sm">${e(n.status==="ungraded"?t("批改","Grade"):t("檢視","View"))}</a>
                        <a href="${e(x(l))}" data-spa-nav="${e(l)}"
                           class="text-slate-600 hover:underline text-sm">${e(t("課業","Dossier"))}</a>
                        ${n.status==="overdue_missing"?`<button type="button" class="inbox-chase text-sm text-amber-700 hover:underline" data-email="${e(n.student_email||"")}" data-reminder="${e(H(n))}">${e(t("催交","Chase"))}</button>`:""}
                    </td>
                </tr>`}).join(""),i=document.getElementById("inbox-tbody");i&&(i.innerHTML=a||`<tr><td colspan="4" class="p-6 text-center text-slate-500">${e(t("目前沒有項目。","Inbox is empty."))}</td></tr>`),g(),A()},g=function(){d.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",i=>{i.preventDefault(),r.AppRouter.navigate(a.getAttribute("data-spa-nav"))})})},A=function(){d.querySelectorAll(".inbox-chase").forEach(a=>{a.addEventListener("click",async()=>{const i=a.getAttribute("data-reminder")||"",n=a.getAttribute("data-email")||"",m=n?`${n}

${i}`:i;try{await navigator.clipboard.writeText(m);const l=document.getElementById("inbox-flash");l&&(l.textContent=t("已複製催交文案到剪貼簿。","Reminder copied to clipboard."),l.classList.remove("hidden","text-red-600"),l.classList.add("text-emerald-700"))}catch{window.prompt(t("請複製以下文案：","Copy this reminder:"),m)}})})};var C=$,B=p,T=g,U=A;const[c,y]=await Promise.all([r.ScienceApi.apiFetch("/teacher/inbox"),r.ScienceApi.apiFetch("/teacher/classes").catch(()=>({classes:[]}))]),w=c.items||[],b=c.count||{},_=y.classes||[],h=new URLSearchParams(location.search);let u=h.get("class_id")||"",o=h.get("status")||"";const S=_.map(a=>`<option value="${Number(a.id)}"${String(u)===String(a.id)?" selected":""}>${e(a.name||"")}</option>`).join("");d.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${e(x("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${e(t("← 儀表板","← Dashboard"))}</a>
                <a href="${e(x("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-sm text-slate-600 hover:underline">${e(t("課程","Courses"))}</a>
            </div>
            <div class="grid sm:grid-cols-3 gap-4 mb-6">
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p class="text-xs text-slate-500">${e(t("待批改","Ungraded"))}</p>
                    <p class="text-2xl font-bold text-amber-600">${Number(b.ungraded||0)}</p>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p class="text-xs text-slate-500">${e(t("逾期未交","Overdue"))}</p>
                    <p class="text-2xl font-bold text-red-600">${Number(b.overdue_missing||0)}</p>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p class="text-xs text-slate-500">${e(t("合計","Total"))}</p>
                    <p class="text-2xl font-bold text-slate-900">${Number(b.total||0)}</p>
                </div>
            </div>
            <p id="inbox-flash" class="text-sm mb-3 hidden"></p>
            <div class="flex flex-wrap gap-3 mb-4">
                <label class="text-sm text-slate-600">${e(t("班級","Class"))}
                    <select id="inbox-class" class="ml-2 border rounded-lg px-2 py-1.5">
                        <option value="">${e(t("全部","All"))}</option>
                        ${S}
                    </select>
                </label>
                <label class="text-sm text-slate-600">${e(t("狀態","Status"))}
                    <select id="inbox-status" class="ml-2 border rounded-lg px-2 py-1.5">
                        <option value="">${e(t("全部","All"))}</option>
                        <option value="ungraded"${o==="ungraded"?" selected":""}>${e(t("待批改","Ungraded"))}</option>
                        <option value="overdue_missing"${o==="overdue_missing"?" selected":""}>${e(t("逾期未交","Overdue"))}</option>
                    </select>
                </label>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left"><tr>
                        <th class="p-3">${e(t("項目","Item"))}</th>
                        <th class="p-3">${e(t("學生","Student"))}</th>
                        <th class="p-3">${e(t("截止","Due"))}</th>
                        <th class="p-3">${e(t("操作","Actions"))}</th>
                    </tr></thead>
                    <tbody id="inbox-tbody"></tbody>
                </table>
            </div>`,(v=document.getElementById("inbox-class"))==null||v.addEventListener("change",a=>{u=a.target.value,p()}),(f=document.getElementById("inbox-status"))==null||f.addEventListener("change",a=>{o=a.target.value,p()}),p(),g()}catch(c){d.innerHTML=`<p class="text-red-600">${e(c.message||t("載入失敗","Load failed"))}</p>`}}r.AppAdmin=Object.assign(r.AppAdmin||{},{renderAdminInbox:I});
