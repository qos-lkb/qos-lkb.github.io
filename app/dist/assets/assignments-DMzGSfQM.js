const a=window,{apiFetch:u}=a.ScienceApi,{t:s,escapeHtml:r,getLang:g,navigate:m}=a.AppRouter;function h(t){return{pending:s("未開始","Not started"),submitted:s("已提交","Submitted"),graded:s("已評分","Graded"),active:s("進行中","Active"),closed:s("已結束","Closed")}[t]||t}function v(t){return t==="graded"?"bg-emerald-100 text-emerald-800":t==="submitted"?"bg-indigo-100 text-indigo-800":t==="pending"?"bg-amber-100 text-amber-800":"bg-slate-100 text-slate-700"}function y(t){if(!t)return"";const n=new Date(t.replace(" ","T"));return Number.isNaN(n.getTime())?t.slice(0,16):n.toLocaleString(g()==="zh"?"zh-HK":"en-GB",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}async function f(){var d;const t=document.getElementById("main-content");document.getElementById("sidebar").style.display="none",document.body.classList.remove("sidebar-tab-active"),t.innerHTML=`<div class="max-w-3xl mx-auto"><p class="text-slate-500">${s("載入中…","Loading…")}</p></div>`;let n;try{n=await u("/student/worksheet-assignments")}catch{t.innerHTML=`<div class="max-w-lg mx-auto text-center py-12">
                <p class="text-slate-600 mb-4">${s("請先登入以查看課程習作。","Please log in to view assignments.")}</p>
                <a href="../login.php?next=${encodeURIComponent("app/assignments")}" class="text-indigo-600 underline">${s("登入","Log in")}</a>
            </div>`;return}const i=g(),o=n.assignments||[],c=o.length?o.map(e=>{const p=i==="zh"?e.title_zh||e.worksheet_title_zh:e.title_en||e.worksheet_title_en,l=e.submission||{},x=e.due_at?`<span class="text-xs text-slate-500">${s("截止","Due")}: ${r(y(e.due_at))}</span>`:"",b=l.status==="graded"&&l.score!=null?`<span class="text-xs font-medium text-emerald-700">${l.score} / ${e.max_score}</span>`:"";return`<button type="button" class="assign-item block w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition" data-id="${e.id}">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p class="text-xs text-slate-400">${r(e.class_name||"")}</p>
                            <p class="font-semibold text-slate-900">${r(p||e.worksheet_slug)}</p>
                        </div>
                        <span class="text-xs px-2 py-0.5 rounded-full ${v(l.status)}">${h(l.status)}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-3">${x}${b}</div>
                </button>`}).join(""):`<p class="text-sm text-slate-500">${s("目前沒有派發的習作。","No assignments yet.")}</p>`;t.innerHTML=`
            <div class="max-w-3xl mx-auto space-y-6">
                <div>
                    <button type="button" id="assign-back-dash" class="text-indigo-600 text-sm mb-3 hover:underline">← ${s("我的學習","My learning")}</button>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${s("課程習作","Course assignments")}</h1>
                    <p class="text-sm text-slate-500 mt-1">${s("完成老師派發的工作紙習作，並查看評分。","Complete worksheet assignments from your teachers.")}</p>
                </div>
                <div class="space-y-3">${c}</div>
            </div>`,(d=document.getElementById("assign-back-dash"))==null||d.addEventListener("click",()=>m("/dashboard")),t.querySelectorAll(".assign-item").forEach(e=>{e.addEventListener("click",()=>m("/assignment/"+e.dataset.id))})}async function w(t){var d;const n=document.getElementById("main-content");document.getElementById("sidebar").style.display="none",document.body.classList.remove("sidebar-tab-active");let i;try{i=await u("/student/worksheet-assignments/"+t)}catch(e){n.innerHTML=`<div class="max-w-lg mx-auto py-12 text-center">
                <p class="text-slate-600 mb-4">${r(e.message||s("無法載入習作。","Could not load assignment."))}</p>
                <button type="button" id="assign-back-list" class="text-indigo-600 underline">${s("返回習作列表","Back to assignments")}</button>
            </div>`,(d=document.getElementById("assign-back-list"))==null||d.addEventListener("click",()=>m("/assignments"));return}const o=i.assignment,c=o.worksheet_slug;a.AppWorksheet&&typeof a.AppWorksheet.renderWorksheet=="function"&&await a.AppWorksheet.renderWorksheet(c,{assignmentId:parseInt(String(t),10),assignment:o,submission:i.submission})}a.AppAssignments={renderAssignmentsList:f,renderAssignment:w};
