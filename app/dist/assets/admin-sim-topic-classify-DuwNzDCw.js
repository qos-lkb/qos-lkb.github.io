const n=window;function s(a,i){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(a,i):a}function e(a){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(a):String(a||"")}function S(a){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(a):String(a||"")}function z(){return n.ScienceApi.hasPermission("simulation.manage_any")||n.ScienceApi.hasPermission("user.manage")}function U(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}const h={};let u=null;function F(a,i){const o=h[i.id]||{},r=o.subject_id!=null?o.subject_id:i.subject_id,g=o.topic_id!=null?o.topic_id:"",I=[`<option value="">${e(s("選擇科目","Subject"))}</option>`].concat((a||[]).map(l=>{const b=Number(r)===Number(l.id)?" selected":"";return`<option value="${Number(l.id)}"${b}>${e(l.name_zh||l.slug)}</option>`})),f=(a||[]).find(l=>Number(l.id)===Number(r)),j=f?f.topics||[]:[],v=[`<option value="">${e(s("選擇課題","Topic"))}</option>`].concat(j.map(l=>{const b=Number(g)===Number(l.id)?" selected":"";return`<option value="${Number(l.id)}"${b}>${e(l.name_zh||l.name_en||l.slug)}</option>`})),_=o.is_new_topic?`new:${o.topic_name_zh||""}|${o.topic_name_en||""}|${o.topic_slug||""}`:"";return o.is_new_topic&&!g&&v.push(`<option value="${e(_)}" selected>${e(s("新建：","New: ")+(o.topic_name_zh||o.topic_name_en))}</option>`),`
        <select class="tc-subject border border-slate-300 rounded px-2 py-1 text-xs bg-white max-w-[9rem]" data-id="${i.id}">${I.join("")}</select>
        <select class="tc-topic border border-slate-300 rounded px-2 py-1 text-xs bg-white max-w-[12rem]" data-id="${i.id}">${v.join("")}</select>
    `}async function O(a){const i=a?`?q=${encodeURIComponent(a)}`:"";return n.ScienceApi.apiFetch(`/admin/simulations/topic-classify${i}`)}async function $(){var q,R,L,B;U();const a=document.getElementById("page-title"),i=document.getElementById("card-container");if(a&&(a.textContent=s("模擬課題分類","Classify simulation topics")),!n.ScienceApi.getUser()){n.AppRouter.navigate("/login");return}if(!z()){i.innerHTML=`<p class="text-red-600">${e(s("沒有權限。","Forbidden."))}</p>`;return}const o=new URLSearchParams(n.location.search).get("q")||"";i.innerHTML=`<p class="text-slate-500">${e(s("載入中…","Loading…"))}</p>`;let r;try{r=await O(o)}catch(t){i.innerHTML=`<p class="text-red-600">${e(t.message||s("載入失敗","Load failed"))}</p>`;return}const g=Array.isArray(r.items)?r.items:[],I=r.subjects||[],f=Array.isArray(r.models)?r.models:[],j=r.default_model||f[0]||"",v=!!r.xai_configured,_=r.counts||{},l=g.map(t=>{const c=h[t.id],p=c?c.confidence:"";return`<tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2"><input type="checkbox" class="tc-check rounded border-slate-300" value="${t.id}" checked></td>
            <td class="px-3 py-2">
                <div class="font-medium">${e(t.title_zh||t.slug)}</div>
                <div class="text-xs text-slate-500">${e(t.title_en||"")}</div>
                <div class="font-mono text-[11px] text-slate-400">${e(t.slug)}</div>
            </td>
            <td class="px-3 py-2 font-mono text-xs">${e(t.html_path||"—")}</td>
            <td class="px-3 py-2"><div class="flex flex-wrap gap-1">${F(I,t)}</div>
                ${c?`<p class="text-[11px] text-violet-700 mt-1">${e((c.is_new_topic?s("建議新建","Suggest new"):s("建議","Suggest"))+(p?" · "+p:""))}</p>`:""}
            </td>
        </tr>`}).join("");i.innerHTML=`
        <div class="mb-4 flex flex-wrap gap-3 items-center">
            <a href="${e(S("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${e(s("← 管理首頁","← Admin home"))}</a>
            <a href="${e(S("/admin/simulations"))}" data-spa-nav="/admin/simulations" class="text-sm text-slate-500 hover:underline">${e(s("模擬程式","Simulations"))}</a>
            <a href="${e(S("/admin/subjects"))}" data-spa-nav="/admin/subjects" class="text-sm text-slate-500 hover:underline">${e(s("科目與單元","Subjects"))}</a>
        </div>
        <p class="text-sm text-slate-600 mb-4">${e(s("列出尚未指定課題的模擬。可用 xAI 建議課題；若目錄沒有該課題，寫入時會自動新建。","List simulations without a topic. xAI can suggest a unit; missing topics are created when you save."))}</p>
        <p id="tc-flash" class="${u?"":"hidden"} rounded-lg border px-4 py-3 text-sm mb-4 ${u&&u.ok?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-red-200 bg-red-50 text-red-800"}">${u?e(u.text):""}</p>
        <div class="grid sm:grid-cols-2 gap-3 mb-4">
            <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div class="text-xs text-slate-500">${e(s("未分類","Unclassified"))}</div>
                <div class="text-2xl font-bold text-slate-900">${Number(_.unclassified||g.length)}</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div class="text-xs text-slate-500">${e(s("現有課題","Existing topics"))}</div>
                <div class="text-2xl font-bold text-slate-900">${Number(_.topics||0)}</div>
            </div>
        </div>
        <form id="tc-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <label class="text-sm text-slate-600" for="tc-q">${e(s("搜尋","Search"))}</label>
            <input id="tc-q" type="search" value="${e(o)}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[16rem]" placeholder="${e(s("標題、slug、路徑…","Title, slug, path…"))}">
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${e(s("搜尋","Search"))}</button>
        </form>
        <div class="flex flex-wrap gap-2 mb-3 items-center">
            ${v?`
                <label class="text-sm text-slate-600" for="tc-model">${e(s("模型","Model"))}</label>
                <select id="tc-model" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    ${f.map(t=>`<option value="${e(t)}"${t===j?" selected":""}>${e(t)}</option>`).join("")}
                </select>
                <button type="button" id="btn-tc-classify" class="px-4 py-2 rounded-lg border border-violet-400 text-violet-900 text-sm hover:bg-violet-50">${e(s("AI 分類已勾選","AI classify selected"))}</button>
            `:`<p class="text-sm text-amber-800">${e(s("尚未設定 XAI_API_KEY，無法自動分類。","XAI_API_KEY is not set."))}</p>`}
            <button type="button" id="btn-tc-apply" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${e(s("寫入資料庫","Save to database"))}</button>
            <label class="text-sm text-slate-600 flex items-center gap-1"><input type="checkbox" id="tc-check-all" class="rounded border-slate-300" checked> ${e(s("全選","Select all"))}</label>
        </div>
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 w-10"></th>
                        <th class="px-3 py-2">${e(s("模擬","Simulation"))}</th>
                        <th class="px-3 py-2">${e(s("路徑","Path"))}</th>
                        <th class="px-3 py-2">${e(s("科目／課題","Subject / topic"))}</th>
                    </tr>
                </thead>
                <tbody>${l||`<tr><td colspan="4" class="px-3 py-6 text-slate-500">${e(s("沒有未分類的模擬。","No unclassified simulations."))}</td></tr>`}</tbody>
            </table>
        </div>
    `;const b=u;u=null;const A=document.getElementById("tc-flash");function x(t,c){A&&(A.textContent=t,A.className=c?"rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm mb-4":"rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm mb-4")}b&&A&&x(b.text,b.ok),(q=document.getElementById("tc-search"))==null||q.addEventListener("submit",async t=>{var m;t.preventDefault();const c=((m=document.getElementById("tc-q"))==null?void 0:m.value)||"",p=c?`/admin/classify-sim-topics?q=${encodeURIComponent(c)}`:"/admin/classify-sim-topics";history.replaceState(null,"",S(p)),await $()}),(R=document.getElementById("tc-check-all"))==null||R.addEventListener("change",t=>{document.querySelectorAll(".tc-check").forEach(c=>{c.checked=t.target.checked})}),i.querySelectorAll(".tc-subject").forEach(t=>{t.addEventListener("change",()=>{const c=Number(t.getAttribute("data-id")),p=h[c]||{};h[c]={...p,subject_id:Number(t.value)||null,topic_id:null,is_new_topic:!1},$()})});function k(){return Array.from(document.querySelectorAll(".tc-check:checked")).map(t=>Number(t.value)).filter(Boolean)}(L=document.getElementById("btn-tc-classify"))==null||L.addEventListener("click",async()=>{var c;const t=k();if(!t.length){x(s("請先勾選模擬。","Select simulations first."),!1);return}if(t.length>8){x(s("一次最多分類 8 個。","At most 8 at a time."),!1);return}try{((await n.ScienceApi.apiFetch("/admin/simulations/topic-classify",{method:"POST",body:{action:"classify",ids:t,model:((c=document.getElementById("tc-model"))==null?void 0:c.value)||""}})).items||[]).forEach(m=>{h[m.sim_id]=m}),u={text:s("已填入 AI 建議，請核對後寫入。","Suggestions filled. Review, then save."),ok:!0},await $()}catch(p){x(p.message||s("分類失敗","Classify failed"),!1)}}),(B=document.getElementById("btn-tc-apply"))==null||B.addEventListener("click",async()=>{var c,p,m;const t=[];if(k().forEach(d=>{const y=i.querySelector(`.tc-subject[data-id="${d}"]`),E=i.querySelector(`.tc-topic[data-id="${d}"]`),w=Number((y==null?void 0:y.value)||0),N=String((E==null?void 0:E.value)||"");if(N.startsWith("new:")){const T=N.slice(4),[P,C,M]=T.split("|");t.push({sim_id:d,subject_id:w,create_topic:{subject_id:w,name_zh:P||"",name_en:C||P||"",slug:M||""}});return}const H=Number(N);w&&H&&t.push({sim_id:d,subject_id:w,topic_id:H})}),!t.length){x(s("已勾選列尚未指定課題。","Selected rows still need a topic."),!1);return}try{const d=await n.ScienceApi.apiFetch("/admin/simulations/topic-classify",{method:"POST",body:{action:"apply",items:t,search:((c=document.getElementById("tc-q"))==null?void 0:c.value)||""}});t.forEach(y=>{delete h[y.sim_id]}),u={text:s(`已更新 ${d.updated} 筆，新建課題 ${d.created_topics} 個。`,`Updated ${d.updated}, created ${d.created_topics} topic(s).`)+((p=d.errors)!=null&&p.length?" "+d.errors.slice(0,3).join("；"):""),ok:!((m=d.errors)!=null&&m.length)},await $()}catch(d){x(d.message||s("寫入失敗","Save failed"),!1)}})}n.AppAdmin=Object.assign(n.AppAdmin||{},{renderAdminSimTopicClassify:$});
