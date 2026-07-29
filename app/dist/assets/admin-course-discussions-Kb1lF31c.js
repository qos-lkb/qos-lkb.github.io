const t=window;function a(s,o){return t.AppRouter&&t.AppRouter.t?t.AppRouter.t(s,o):s}function n(s){return t.AppRouter&&t.AppRouter.escapeHtml?t.AppRouter.escapeHtml(s):String(s||"")}function _(s){return t.AppRouter&&t.AppRouter.spaHref?t.AppRouter.spaHref(s):String(s||"")}function $(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function y(){const s=t.ScienceApi;return!s||!s.getUser()?!1:s.hasPermission("class.manage_any")||s.hasPermission("class.manage_own")}async function x(s){$();const o=parseInt(s,10)||0,c=document.getElementById("card-container"),l=document.getElementById("page-title");if(l&&(l.textContent=a("課程討論審核","Course discussions moderation")),o<=0){t.AppRouter.navigate("/admin/courses");return}if(!y()){t.ScienceApi&&t.ScienceApi.getUser()&&(c.innerHTML=`<p class="text-red-600">${n(a("沒有權限。","Forbidden."))}</p>`);return}c.innerHTML=`<p class="text-slate-500">${n(a("載入中…","Loading…"))}</p>`;try{let b=function(e){return e?String(e).slice(0,16).replace("T"," "):"—"};var w=b;const h=(await t.ScienceApi.apiFetch("/admin/classes/"+o)).class||{},p=(await t.ScienceApi.apiFetch("/admin/course-discussions/pending?class_id="+encodeURIComponent(o))).pending_posts||[],m=new Map;try{((await t.ScienceApi.apiFetch("/courses")).subjects||[]).forEach(r=>{(r.topics||[]).forEach(i=>{m.set(Number(i.id),{name_zh:i.name_zh||"",name_en:i.name_en||""})})})}catch{}const g=t.AppRouter&&t.AppRouter.getLang?t.AppRouter.getLang():"zh",f=e=>{const r=m.get(Number(e));return r?g==="zh"?r.name_zh:r.name_en:"Topic #"+Number(e)},A=p.length?p.map(e=>{const r=g==="zh"?e.message_zh||e.message_en||"":e.message_en||e.message_zh||"",i=f(e.topic_id),d=e.parent_post_id?`<div class="mb-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2">
                        <span class="font-medium">${n(a("回覆至","Reply to"))}</span>
                        ${e.parent_display_name?` <span class="text-indigo-700">${n(e.parent_display_name)}</span>`:""}
                        ${e.parent_excerpt?`：${n(e.parent_excerpt)}`:" #"+Number(e.parent_post_id)}
                       </div>`:"";return`
                    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4" data-post-id="${Number(e.id)}">
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-slate-900 truncate">${n(i)}</p>
                                <p class="text-xs text-slate-500">${n(e.display_name||"")} · ${n(b(e.created_at))}</p>
                            </div>
                            <span class="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900">${a("待審核","Pending")}</span>
                        </div>
                        ${d}
                        <div class="whitespace-pre-wrap text-sm text-slate-800 border border-slate-100 rounded-xl bg-slate-50 p-3 mb-3">
                            ${n(r)}
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700 course-discussion-approve" data-action="publish">
                                ${a("發布","Publish")}
                            </button>
                            <button type="button" class="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-rose-700 course-discussion-reject" data-action="reject">
                                ${a("退回","Reject")}
                            </button>
                        </div>
                    </div>`}).join(""):`<p class="text-sm text-slate-500">${n(a("目前沒有待審核的討論留言。","No pending discussion posts."))}</p>`;c.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${n(_("/admin/courses/"+o+"/report"))}" data-spa-nav="/admin/courses/${o}/report" class="text-sm text-indigo-600 hover:underline">${n(a("← 返回報告","← Back to report"))}</a>
            </div>
            <h2 class="text-lg font-bold text-slate-800 mb-3">${n(h.name||a("課程","Course"))}</h2>

            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <h3 class="text-base font-bold text-slate-900 mb-3">${n(a("待審核留言","Pending posts"))} (${Number(p.length)})</h3>
                ${A}
            </div>`,c.querySelectorAll("[data-spa-nav]").forEach(e=>{e.addEventListener("click",r=>{r.preventDefault(),t.AppRouter.navigate(e.getAttribute("data-spa-nav"))})}),c.querySelectorAll(".course-discussion-approve, .course-discussion-reject").forEach(e=>{e.addEventListener("click",async()=>{const r=e.closest("[data-post-id]"),i=r?parseInt(r.getAttribute("data-post-id")||"0",10):0,d=e.getAttribute("data-action")||"";if(i)try{await t.ScienceApi.apiFetch("/admin/course-discussions/posts/"+i+"/moderate",{method:"POST",body:{action:d}}),await x(String(o))}catch(v){alert(v.message||a("審核失敗。","Moderation failed."))}})})}catch(u){c.innerHTML=`<p class="text-red-600">${n(u.message||a("載入失敗","Load failed"))}</p>`}}t.AppAdmin=Object.assign(t.AppAdmin||{},{renderAdminCourseDiscussions:x});
