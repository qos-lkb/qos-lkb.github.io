const o=window;function t(r,p){return o.AppRouter&&o.AppRouter.t?o.AppRouter.t(r,p):r}function i(r){return o.AppRouter&&o.AppRouter.escapeHtml?o.AppRouter.escapeHtml(r):String(r||"")}function T(r){return o.AppRouter&&o.AppRouter.spaHref?o.AppRouter.spaHref(r):String(r||"")}function C(){const r=document.getElementById("sidebar");r&&(r.style.display="none")}const $={note:()=>t("學習筆記","Learning note"),simulation:()=>t("模擬實驗","Simulation"),worksheet:()=>t("工作紙","Worksheet"),article:()=>t("科學文章","Article"),learning_tool:()=>t("互動測驗","Quiz"),video:()=>t("影片","Video")};function N(){const r=o.ScienceApi;return!r||!r.getUser()?!1:r.hasPermission("topic_item.manage_any")||r.hasPermission("user.manage")}function M(r,p,f,E){if(!r)return;let s=null;function v(a){return Array.prototype.slice.call(r.querySelectorAll(p+":not(.dragging)")).reduce((m,d)=>{const y=d.getBoundingClientRect(),h=a-y.top-y.height/2;return h<0&&h>m.offset?{offset:h,element:d}:m},{offset:Number.NEGATIVE_INFINITY,element:void 0}).element}r.addEventListener("dragenter",a=>a.preventDefault()),r.addEventListener("dragover",a=>{if(a.preventDefault(),a.dataTransfer&&(a.dataTransfer.dropEffect="move"),!s)return;const u=v(a.clientY);u==null?r.appendChild(s):r.insertBefore(s,u)}),r.addEventListener("drop",a=>a.preventDefault()),r.querySelectorAll(p).forEach(a=>{const u=a.querySelector(f);if(!u)return;const m=()=>{a.setAttribute("draggable","true"),a.dataset.sortArmed="1"};u.addEventListener("pointerdown",m),u.addEventListener("mousedown",m),a.addEventListener("dragend",()=>{a.removeAttribute("draggable"),delete a.dataset.sortArmed,a.classList.remove("dragging","opacity-60"),s===a&&(s=null,E())}),a.addEventListener("dragstart",d=>{if(a.dataset.sortArmed!=="1"){d.preventDefault();return}delete a.dataset.sortArmed,s=a,a.classList.add("dragging","opacity-60"),d.dataTransfer.effectAllowed="move";try{d.dataTransfer.setData("text/plain","sort")}catch{}})})}async function F(){C();const r=document.getElementById("page-title"),p=document.getElementById("card-container");if(r&&(r.textContent=t("自學課程編排","Course curriculum")),!o.ScienceApi.getUser()){o.AppRouter.navigate("/login");return}if(!N()){p.innerHTML=`<p class="text-red-600">${i(t("沒有權限。","Forbidden."))}</p>`;return}p.innerHTML=`<p class="text-slate-500">${i(t("載入中…","Loading…"))}</p>`;let f=[];try{f=await o.ScienceApi.apiFetch("/admin/subjects"),Array.isArray(f)||(f=[])}catch(e){p.innerHTML=`<p class="text-red-600">${i(e.message||t("載入失敗","Load failed"))}</p>`;return}const E=Object.keys($).map(e=>`<option value="${i(e)}">${i($[e]())}</option>`).join("");p.innerHTML=`
            <style>
                .curriculum-layout{display:grid;grid-template-columns:280px 1fr;gap:1rem}
                @media(max-width:768px){.curriculum-layout{grid-template-columns:1fr}}
                .topic-pick.active{background:rgb(238 242 255);border-color:rgb(129 140 248)}
                .item-row.dragging{opacity:.6}
                .type-badge{font-size:10px;padding:2px 8px;border-radius:9999px;background:#e2e8f0;color:#475569}
            </style>
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${i(T("/admin"))}" data-spa-nav="/admin" class="text-sm text-indigo-700 hover:underline">${i(t("← 管理首頁","← Admin home"))}</a>
                <a href="${i(T("/admin/subjects"))}" data-spa-nav="/admin/subjects" class="text-sm text-slate-600 hover:underline">${i(t("科目與單元","Subjects & topics"))}</a>
            </div>
            <p class="text-sm text-slate-600 mb-4">${i(t("為各課題安排混合學習內容的順序。學習者將依此順序在「自學課程」分頁學習。","Arrange mixed learning content per topic. Learners follow this order in Courses."))}</p>
            <p id="curr-flash" class="text-sm mb-3 hidden"></p>
            <div class="curriculum-layout">
                <aside class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-fit">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${i(t("科目","Subject"))}</label>
                    <select id="curr-subject" class="w-full border rounded-lg px-3 py-2 mt-1 mb-4 text-sm">
                        ${f.map(e=>`<option value="${Number(e.id)}">${i(e.name_zh||e.name_en||"")}</option>`).join("")}
                    </select>
                    <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">${i(t("課題（學習順序）","Topics (order)"))}</div>
                    <div id="curr-topic-list" class="space-y-1 max-h-[60vh] overflow-y-auto"></div>
                </aside>
                <section class="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm min-h-[420px]">
                    <div id="curr-topic-empty" class="text-slate-500 text-sm py-12 text-center">${i(t("請選擇課題以編排學習內容。","Select a topic to arrange content."))}</div>
                    <div id="curr-topic-editor" class="hidden">
                        <div class="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                            <div>
                                <h2 id="curr-editor-title" class="text-lg font-bold text-slate-900"></h2>
                                <p class="text-xs text-slate-500 mt-1">${i(t("拖曳調整學習順序；僅已發佈內容會顯示給學習者。","Drag to reorder; only published items are shown to learners."))}</p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button type="button" id="curr-import-all" class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">${i(t("從課題匯入全部","Import all from topic"))}</button>
                                <button type="button" id="curr-add-item" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">${i(t("加入內容","Add content"))}</button>
                            </div>
                        </div>
                        <ul id="curr-items-list" class="space-y-2"></ul>
                        <p id="curr-items-empty" class="text-slate-500 text-sm py-8 text-center hidden">${i(t("此課題尚無編排項目。","No items in this topic yet."))}</p>
                    </div>
                </section>
            </div>
            <dialog id="curr-add-dialog" class="rounded-xl border border-slate-200 p-0 w-full max-w-md shadow-xl backdrop:bg-slate-900/50">
                <form method="dialog" class="p-5 space-y-4">
                    <h3 class="font-bold text-lg">${i(t("加入學習內容","Add learning content"))}</h3>
                    <div>
                        <label class="text-sm font-medium">${i(t("內容類型","Content type"))}</label>
                        <select id="curr-add-type" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm">${E}</select>
                    </div>
                    <div>
                        <label class="text-sm font-medium">${i(t("選擇項目","Choose item"))}</label>
                        <select id="curr-add-content" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm"><option value="">${i(t("載入中…","Loading…"))}</option></select>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" id="curr-add-cancel" class="px-3 py-1.5 text-sm border rounded-lg">${i(t("取消","Cancel"))}</button>
                        <button type="button" id="curr-add-confirm" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg">${i(t("加入","Add"))}</button>
                    </div>
                </form>
            </dialog>`,p.querySelectorAll("[data-spa-nav]").forEach(e=>{e.addEventListener("click",n=>{n.preventDefault(),o.AppRouter.navigate(e.getAttribute("data-spa-nav"))})});const s=document.getElementById("curr-flash"),v=document.getElementById("curr-subject"),a=document.getElementById("curr-topic-list"),u=document.getElementById("curr-topic-empty"),m=document.getElementById("curr-topic-editor"),d=document.getElementById("curr-items-list"),y=document.getElementById("curr-items-empty"),h=document.getElementById("curr-editor-title"),L=document.getElementById("curr-add-dialog"),w=document.getElementById("curr-add-type"),x=document.getElementById("curr-add-content");let c=null;function b(e,n){s.textContent=e,s.className=n?"text-sm mb-3 text-red-600":"text-sm mb-3 text-emerald-700",s.classList.remove("hidden"),clearTimeout(s._t),s._t=setTimeout(()=>s.classList.add("hidden"),4e3)}function _(e){const n=f.find(l=>Number(l.id)===Number(e));return n&&n.topics||[]}function S(){const e=_(v.value);a.innerHTML=e.map((n,l)=>{const g=n.name_zh||n.name_en||"";return`<button type="button" class="topic-pick w-full text-left px-3 py-2 rounded-lg border border-transparent text-sm hover:bg-slate-50" data-topic-id="${Number(n.id)}" data-topic-name="${i(g)}">
                    <span class="text-indigo-600 font-mono text-xs mr-2">${l+1}.</span>${i(g)}
                </button>`}).join("")||`<p class="text-slate-500 text-sm px-2">${i(t("此科目尚無課題。","No topics in this subject."))}</p>`,a.querySelectorAll(".topic-pick").forEach(n=>{n.addEventListener("click",()=>B(n))}),c=null,m.classList.add("hidden"),u.classList.remove("hidden")}function B(e){a.querySelectorAll(".topic-pick").forEach(n=>n.classList.remove("active")),e.classList.add("active"),c=parseInt(e.getAttribute("data-topic-id")||"0",10),h.textContent=e.getAttribute("data-topic-name")||"",u.classList.add("hidden"),m.classList.remove("hidden"),A()}function j(e,n){const l=$[e.content_type]&&$[e.content_type]()||e.content_type,g=e.title_zh||e.title_en||t("(無標題)","(Untitled)");return`<li class="item-row flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/50${e.missing?" opacity-50":""}" data-item-id="${Number(e.id)}">
                <span class="item-drag-handle cursor-grab text-slate-400 select-none" title="${i(t("拖曳排序","Drag to sort"))}">☰</span>
                <span class="item-order-num text-xs font-mono text-indigo-600 w-6">${n+1}</span>
                <span class="type-badge">${i(l)}</span>
                <span class="flex-1 text-sm font-medium truncate">${i(g)}</span>
                <button type="button" class="text-red-600 text-xs hover:underline remove-btn" data-id="${Number(e.id)}">${i(t("移除","Remove"))}</button>
            </li>`}async function A(){if(c)try{const n=(await o.ScienceApi.apiFetch("/admin/topic-items/"+c)).items||[];d.innerHTML=n.map(j).join(""),y.classList.toggle("hidden",n.length>0),H()}catch(e){b(e.message,!0)}}function k(){d.querySelectorAll(".item-row").forEach((e,n)=>{const l=e.querySelector(".item-order-num");l&&(l.textContent=String(n+1))})}function H(){d.querySelectorAll(".remove-btn").forEach(e=>{e.onclick=async()=>{if(window.confirm(t("移除此學習項目？","Remove this item?")))try{await o.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{action:"remove",id:parseInt(e.getAttribute("data-id")||"0",10)}}),await A()}catch(n){b(n.message,!0)}}}),M(d,".item-row",".item-drag-handle",()=>{R()})}async function R(){if(!c)return;k();const e=Array.prototype.map.call(d.querySelectorAll(".item-row"),n=>parseInt(n.getAttribute("data-item-id")||"0",10)).filter(n=>n>0);if(e.length)try{await o.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{action:"reorder",topic_id:c,order:e}})}catch(n){b(n.message,!0)}}async function I(){if(!c)return;const e=w.value;x.innerHTML=`<option value="">${i(t("載入中…","Loading…"))}</option>`;try{const n=await o.ScienceApi.apiFetch("/admin/topic-items/"+c+"/available/"+encodeURIComponent(e)),l=Array.isArray(n)?n:[];if(!l.length){x.innerHTML=`<option value="">${i(t("（無可加入的已發佈項目）","(No published items available)"))}</option>`;return}x.innerHTML=l.map(g=>`<option value="${Number(g.id)}">${i(g.title_zh||g.title_en||"")}</option>`).join("")}catch{x.innerHTML=`<option value="">${i(t("載入失敗","Load failed"))}</option>`}}v.addEventListener("change",S),document.getElementById("curr-import-all").onclick=async()=>{if(!(!c||!window.confirm(t("將此課題下所有已發佈內容依類型順序加入編排？已存在的項目不會重複。","Import all published content for this topic? Existing items are skipped."))))try{const e=await o.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{action:"import_all",topic_id:c}});b(t("已加入 ","Added ")+(e.added||0)+t(" 項"," item(s)"),!1),await A()}catch(e){b(e.message,!0)}},document.getElementById("curr-add-item").onclick=()=>{c&&(I(),L.showModal())},w.onchange=()=>{I()},document.getElementById("curr-add-cancel").onclick=()=>L.close(),document.getElementById("curr-add-confirm").onclick=async()=>{const e=parseInt(x.value||"0",10);if(!e){b(t("請選擇項目","Please choose an item"),!0);return}try{await o.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{topic_id:c,content_type:w.value,content_id:e}}),L.close(),await A()}catch(n){b(n.message,!0)}},S()}o.AppAdmin=Object.assign(o.AppAdmin||{},{renderAdminCourseCurriculum:F});
