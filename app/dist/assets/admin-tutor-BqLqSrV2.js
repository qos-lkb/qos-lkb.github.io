import{_ as S}from"./index-i6tbiR0K.js";const a=window;function e(n,r){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(n,r):n}function t(n){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(n):String(n||"")}function g(n){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(n):String(n||"")}function b(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function T(){return a.ScienceApi&&a.ScienceApi.hasPermission("user.manage")}async function H(n,r){if(n.innerHTML="",!r.length){n.innerHTML=`<p class="text-slate-500">${t(e("這段對話還沒有內容。","This chat is empty."))}</p>`;return}for(const l of r){const s=document.createElement("div");s.className="science-tutor-msg "+(l.role==="user"?"science-tutor-msg-user":"science-tutor-msg-assistant");const o=String(l.content||"");l.role==="assistant"&&a.AppMarkdown&&typeof AppMarkdown.renderMarkdownToHtml=="function"?(s.classList.add("is-rich"),s.innerHTML=AppMarkdown.renderMarkdownToHtml(o),typeof AppMarkdown.typesetMath=="function"&&await AppMarkdown.typesetMath(s)):s.textContent=o,n.appendChild(s)}}async function x(){var p;b();const n=document.getElementById("page-title"),r=document.getElementById("card-container");if(n&&(n.textContent=e("科學助教紀錄","Science tutor history")),!a.ScienceApi.getUser()){a.AppRouter.navigate("/login");return}const l=new URLSearchParams(location.search);let s=T()&&l.get("all")!=="0",o=l.get("q")||"";r.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const d="/tutor/conversations"+(s?"?all=1":"")+(o?(s?"&":"?")+"q="+encodeURIComponent(o):""),m=await a.ScienceApi.apiFetch(d),w=m.conversations||[],h=!!m.can_view_all,$=h?`
            <form id="admin-tutor-filter" class="flex flex-wrap gap-2 items-end mb-4">
                <label class="text-sm">${t(e("搜尋","Search"))}
                    <input name="q" value="${t(o)}" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm min-w-[12rem]" placeholder="${t(e("姓名、帳戶或標題","Name, login or title"))}">
                </label>
                <label class="text-sm inline-flex items-center gap-2 pb-1.5">
                    <input type="checkbox" name="all" ${s?"checked":""} class="rounded border-slate-300">
                    ${t(e("顯示全部同學","Show all students"))}
                </label>
                <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${t(e("套用","Apply"))}</button>
            </form>`:"",A=w.map(i=>{const c=s?`<td class="p-3">${t(i.user_name||"")}<div class="text-xs text-slate-500">${t(i.user_email||"")}</div></td>`:"";return`<tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="p-3">${Number(i.id)}</td>
                ${c}
                <td class="p-3">${t(i.title||e("新對話","New chat"))}</td>
                <td class="p-3 text-slate-500 whitespace-nowrap">${t(i.updated_at||"")}</td>
                <td class="p-3"><a href="${t(g("/admin/tutor/"+i.id))}" data-spa-nav="/admin/tutor/${Number(i.id)}" class="text-brand-700 hover:underline">${t(e("查看","View"))}</a></td>
            </tr>`}).join("");r.innerHTML=`
            <p class="text-slate-600 text-sm mb-4">${t(s?e("管理員可查看全校科學助教對話。","Admins can read every science-tutor conversation."):e("以下是你自己的科學助教對話。","These are your own science-tutor chats."))}</p>
            ${$}
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left">
                        <tr>
                            <th class="p-3">ID</th>
                            ${s?`<th class="p-3">${t(e("學生","Student"))}</th>`:""}
                            <th class="p-3">${t(e("標題","Title"))}</th>
                            <th class="p-3">${t(e("最近活動","Updated"))}</th>
                            <th class="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${A||`<tr><td class="p-3 text-slate-500" colspan="${s?5:4}">${t(e("尚無對話。","No chats yet."))}</td></tr>`}
                    </tbody>
                </table>
            </div>`,(p=r.querySelector("#admin-tutor-filter"))==null||p.addEventListener("submit",i=>{i.preventDefault();const c=i.target,f=c.q&&c.q.value?c.q.value.trim():"",v=!!(c.all&&c.all.checked),u=[];h&&u.push("all="+(v?"1":"0")),f&&u.push("q="+encodeURIComponent(f));const y="/admin/tutor"+(u.length?"?"+u.join("&"):""),M=location.pathname.split("/app")[0]+"/app";history.pushState({path:"/admin/tutor"},"",M+y),x()})}catch(d){r.innerHTML=`<p class="text-red-600">${t(d.message||e("載入失敗。","Failed to load."))}</p>`}}async function _(n){b();const r=document.getElementById("page-title"),l=document.getElementById("card-container");if(r&&(r.textContent=e("科學助教對話","Science tutor chat")),!a.ScienceApi.getUser()){a.AppRouter.navigate("/login");return}l.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{a.AppMarkdown||await S(()=>import("./markdown-D3_y0rxP.js"),[],import.meta.url);const s=await a.ScienceApi.apiFetch("/tutor/conversations/"+encodeURIComponent(n)),o=s.conversation||{},p=s.messages||[],d=o.user_name?`<p class="text-sm text-slate-600">${t(o.user_name)} · ${t(o.user_email||"")}</p>`:"";l.innerHTML=`
            <p class="mb-4"><a href="${t(g("/admin/tutor"))}" data-spa-nav="/admin/tutor" class="text-sm text-brand-700 hover:underline">${t(e("← 返回列表","← Back to list"))}</a></p>
            <h2 class="text-lg font-bold text-slate-900">${t(o.title||e("新對話","New chat"))}</h2>
            ${d}
            <p class="text-xs text-slate-500 mb-4">${t(o.updated_at||"")}</p>
            <div id="admin-tutor-log" class="science-tutor-log science-tutor-log-static rounded-xl border border-slate-200"></div>`,await H(l.querySelector("#admin-tutor-log"),p)}catch(s){l.innerHTML=`<p class="text-red-600">${t(s.message||e("載入失敗。","Failed to load."))}</p>`}}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminTutor:x,renderAdminTutorThread:_});
