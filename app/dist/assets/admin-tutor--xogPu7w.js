import{_ as C}from"./index-CstcfXf4.js";const o=window;function e(s,l){return o.AppRouter&&o.AppRouter.t?o.AppRouter.t(s,l):s}function t(s){return o.AppRouter&&o.AppRouter.escapeHtml?o.AppRouter.escapeHtml(s):String(s||"")}function h(s){return o.AppRouter&&o.AppRouter.spaHref?o.AppRouter.spaHref(s):String(s||"")}function y(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function $(){return o.ScienceApi&&o.ScienceApi.hasPermission("user.manage")}async function H(s,l){if(s.innerHTML="",!l.length){s.innerHTML=`<p class="text-slate-500">${t(e("這段對話還沒有內容。","This chat is empty."))}</p>`;return}for(const n of l){const a=document.createElement("div");a.className="science-tutor-msg "+(n.role==="user"?"science-tutor-msg-user":"science-tutor-msg-assistant");const r=String(n.content||"");n.role==="assistant"&&o.AppMarkdown&&typeof AppMarkdown.renderMarkdownToHtml=="function"?(a.classList.add("is-rich"),a.innerHTML=AppMarkdown.renderMarkdownToHtml(r),typeof AppMarkdown.typesetMath=="function"&&await AppMarkdown.typesetMath(a)):a.textContent=r,s.appendChild(a)}}function I(s){const l=s.models||[],n=[`<option value="">${t(e("跟隨伺服器 .env","Follow server .env"))} (${t(s.env_model||"grok-4.6")})</option>`].concat(l.map(p=>{const m=s.model===p?" selected":"";return`<option value="${t(p)}"${m}>${t(p)}</option>`})).join(""),a=s.reasoning_effort||"",r=[["",e("跟隨伺服器 .env","Follow server .env")],["none",e("不指定","API default")],["low","low"],["medium","medium"],["high","high"],["xhigh","xhigh"]].map(([p,m])=>`<option value="${t(p)}"${a===p?" selected":""}>${t(m)}</option>`).join(""),c=!!s.has_api_key,d=!!s.live,b=s.stats||{};return`
        <section class="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900 mb-1">${t(e("Chatbot 設定","Chatbot settings"))}</h2>
            <p class="text-sm text-slate-600 mb-4">${t(e("控制右下角科學助教是否開放、使用哪個模型，以及系統提示。API 金鑰只放伺服器 .env。","Control whether the science tutor is on, which model it uses, and the system prompt. The API key stays in server .env."))}</p>
            <div class="flex flex-wrap gap-3 mb-4 text-sm">
                <span class="rounded-full px-3 py-1 ${d?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-900"}">${t(d?e("目前：已對學生開放","Status: available to students"):e("目前：未對學生開放","Status: not available to students"))}</span>
                <span class="rounded-full px-3 py-1 ${c?"bg-slate-100 text-slate-700":"bg-red-50 text-red-800"}">${t(c?e("API 金鑰已設定","API key is set"):e("尚未設定 XAI_API_KEY","XAI_API_KEY is missing"))}</span>
            </div>
            <dl class="grid grid-cols-3 gap-3 mb-5 text-center">
                <div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs text-slate-500">${t(e("對話","Chats"))}</dt><dd class="text-xl font-semibold">${Number(b.conversations||0)}</dd></div>
                <div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs text-slate-500">${t(e("訊息","Messages"))}</dt><dd class="text-xl font-semibold">${Number(b.messages||0)}</dd></div>
                <div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs text-slate-500">${t(e("使用者","Users"))}</dt><dd class="text-xl font-semibold">${Number(b.users||0)}</dd></div>
            </dl>
            <form id="admin-tutor-settings" class="space-y-4">
                <label class="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="enabled" class="rounded border-slate-300" ${s.enabled?"checked":""}>
                    ${t(e("開放給已登入使用者","Enable for logged-in users"))}
                </label>
                <label class="block text-sm">${t(e("模型","Model"))}
                    <select name="model" class="mt-1 block w-full max-w-md rounded border border-slate-300 px-2 py-1.5 text-sm">${n}</select>
                </label>
                <label class="block text-sm">${t(e("推理深度","Reasoning effort"))}
                    <select name="reasoning_effort" class="mt-1 block w-full max-w-md rounded border border-slate-300 px-2 py-1.5 text-sm">${r}</select>
                </label>
                <label class="block text-sm">${t(e("系統提示","System prompt"))}
                    <textarea name="system_prompt" rows="8" maxlength="8000" class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono" placeholder="${t(e("留空則使用預設提示","Leave blank to use the default prompt"))}">${t(s.system_prompt||"")}</textarea>
                </label>
                <div class="flex flex-wrap gap-2">
                    <button type="submit" class="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-semibold">${t(e("儲存設定","Save settings"))}</button>
                    <button type="button" id="admin-tutor-reset-prompt" class="rounded-lg border border-slate-300 px-4 py-2 text-sm">${t(e("還原預設提示","Restore default prompt"))}</button>
                </div>
                <p id="admin-tutor-settings-msg" class="text-sm" hidden></p>
            </form>
        </section>`}function L(s,l){var r;const n=s.querySelector("#admin-tutor-settings");if(!n)return;const a=s.querySelector("#admin-tutor-settings-msg");(r=n.querySelector("#admin-tutor-reset-prompt"))==null||r.addEventListener("click",()=>{n.system_prompt.value=l.default_system_prompt||""}),n.addEventListener("submit",async c=>{c.preventDefault(),a&&(a.hidden=!1,a.className="text-sm text-slate-500",a.textContent=e("儲存中…","Saving…"));try{await o.ScienceApi.apiFetch("/tutor/settings",{method:"PUT",body:{enabled:!!(n.enabled&&n.enabled.checked),model:n.model?n.model.value:"",reasoning_effort:n.reasoning_effort?n.reasoning_effort.value:"",system_prompt:n.system_prompt?n.system_prompt.value:""}}),o.ScienceTutor&&typeof ScienceTutor.mount=="function"&&ScienceTutor.mount(),await f()}catch(d){a&&(a.hidden=!1,a.className="text-sm text-red-600",a.textContent=d.message||e("儲存失敗。","Could not save."))}})}async function f(){var c;y();const s=document.getElementById("page-title"),l=document.getElementById("card-container");if(s&&(s.textContent=e("Chatbot 管理","Chatbot admin")),!o.ScienceApi.getUser()){o.AppRouter.navigate("/login");return}const n=new URLSearchParams(location.search);let a=$()&&n.get("all")!=="0",r=n.get("q")||"";l.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const d="/tutor/conversations"+(a?"?all=1":"")+(r?(a?"&":"?")+"q="+encodeURIComponent(r):""),b=[o.ScienceApi.apiFetch(d)];$()&&b.push(o.ScienceApi.apiFetch("/tutor/settings"));const[p,m]=await Promise.all(b),w=p.conversations||[],g=!!p.can_view_all,A=m?I(m):"",_=g?`
            <form id="admin-tutor-filter" class="flex flex-wrap gap-2 items-end mb-4">
                <label class="text-sm">${t(e("搜尋","Search"))}
                    <input name="q" value="${t(r)}" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm min-w-[12rem]" placeholder="${t(e("姓名、帳戶或標題","Name, login or title"))}">
                </label>
                <label class="text-sm inline-flex items-center gap-2 pb-1.5">
                    <input type="checkbox" name="all" ${a?"checked":""} class="rounded border-slate-300">
                    ${t(e("顯示全部同學","Show all students"))}
                </label>
                <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${t(e("套用","Apply"))}</button>
            </form>`:"",S=w.map(i=>{const u=a?`<td class="p-3">${t(i.user_name||"")}<div class="text-xs text-slate-500">${t(i.user_email||"")}</div></td>`:"";return`<tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="p-3">${Number(i.id)}</td>
                ${u}
                <td class="p-3">${t(i.title||e("新對話","New chat"))}</td>
                <td class="p-3 text-slate-500 whitespace-nowrap">${t(i.updated_at||"")}</td>
                <td class="p-3"><a href="${t(h("/admin/tutor/"+i.id))}" data-spa-nav="/admin/tutor/${Number(i.id)}" class="text-brand-700 hover:underline">${t(e("查看","View"))}</a></td>
            </tr>`}).join("");l.innerHTML=`
            <p class="mb-4"><a href="${t(h("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${t(e("← 管理首頁","← Admin home"))}</a></p>
            ${A}
            <h2 class="text-lg font-bold text-slate-900 mb-2">${t(e("對話紀錄","Chat history"))}</h2>
            <p class="text-slate-600 text-sm mb-4">${t(a?e("管理員可查看全校科學助教對話。","Admins can read every science-tutor conversation."):e("以下是你自己的科學助教對話。","These are your own science-tutor chats."))}</p>
            ${_}
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left">
                        <tr>
                            <th class="p-3">ID</th>
                            ${a?`<th class="p-3">${t(e("學生","Student"))}</th>`:""}
                            <th class="p-3">${t(e("標題","Title"))}</th>
                            <th class="p-3">${t(e("最近活動","Updated"))}</th>
                            <th class="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${S||`<tr><td class="p-3 text-slate-500" colspan="${a?5:4}">${t(e("尚無對話。","No chats yet."))}</td></tr>`}
                    </tbody>
                </table>
            </div>`,m&&L(l,m),(c=l.querySelector("#admin-tutor-filter"))==null||c.addEventListener("submit",i=>{i.preventDefault();const u=i.target,v=u.q&&u.q.value?u.q.value.trim():"",k=!!(u.all&&u.all.checked),x=[];g&&x.push("all="+(k?"1":"0")),v&&x.push("q="+encodeURIComponent(v));const T="/admin/tutor"+(x.length?"?"+x.join("&"):""),M=location.pathname.split("/app")[0]+"/app";history.pushState({path:"/admin/tutor"},"",M+T),f()})}catch(d){l.innerHTML=`<p class="text-red-600">${t(d.message||e("載入失敗。","Failed to load."))}</p>`}}async function R(s){y();const l=document.getElementById("page-title"),n=document.getElementById("card-container");if(l&&(l.textContent=e("Chatbot 對話","Chatbot thread")),!o.ScienceApi.getUser()){o.AppRouter.navigate("/login");return}n.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{o.AppMarkdown||await C(()=>import("./markdown-D3_y0rxP.js"),[],import.meta.url);const a=await o.ScienceApi.apiFetch("/tutor/conversations/"+encodeURIComponent(s)),r=a.conversation||{},c=a.messages||[],d=r.user_name?`<p class="text-sm text-slate-600">${t(r.user_name)} · ${t(r.user_email||"")}</p>`:"";n.innerHTML=`
            <p class="mb-4"><a href="${t(h("/admin/tutor"))}" data-spa-nav="/admin/tutor" class="text-sm text-brand-700 hover:underline">${t(e("← 返回 Chatbot 管理","← Back to chatbot admin"))}</a></p>
            <h2 class="text-lg font-bold text-slate-900">${t(r.title||e("新對話","New chat"))}</h2>
            ${d}
            <p class="text-xs text-slate-500 mb-4">${t(r.updated_at||"")}</p>
            <div id="admin-tutor-log" class="science-tutor-log science-tutor-log-static rounded-xl border border-slate-200"></div>`,await H(n.querySelector("#admin-tutor-log"),c)}catch(a){n.innerHTML=`<p class="text-red-600">${t(a.message||e("載入失敗。","Failed to load."))}</p>`}}o.AppAdmin=Object.assign(o.AppAdmin||{},{renderAdminTutor:f,renderAdminTutorThread:R});
