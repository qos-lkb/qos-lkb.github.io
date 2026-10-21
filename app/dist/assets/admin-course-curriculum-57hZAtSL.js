const s=window;function t(i,u){return s.AppRouter&&s.AppRouter.t?s.AppRouter.t(i,u):i}function r(i){return s.AppRouter&&s.AppRouter.escapeHtml?s.AppRouter.escapeHtml(i):String(i||"")}function T(i){return s.AppRouter&&s.AppRouter.spaHref?s.AppRouter.spaHref(i):String(i||"")}function C(){const i=document.getElementById("sidebar");i&&(i.style.display="none")}const $={note:()=>t("學習筆記","Learning note"),simulation:()=>t("模擬實驗","Simulation"),worksheet:()=>t("工作紙","Worksheet"),article:()=>t("科學文章","Article"),learning_tool:()=>t("互動測驗","Quiz"),question_bank:()=>t("試題庫","Question bank"),flashcard_set:()=>t("閃卡","Flashcards"),video:()=>t("影片","Video")};function N(){const i=s.ScienceApi;return!i||!i.getUser()?!1:i.hasPermission("topic_item.manage_any")||i.hasPermission("user.manage")}function F(i,u,b,E){if(!i)return;let o=null;function v(a){return Array.prototype.slice.call(i.querySelectorAll(u+":not(.dragging)")).reduce((m,d)=>{const y=d.getBoundingClientRect(),h=a-y.top-y.height/2;return h<0&&h>m.offset?{offset:h,element:d}:m},{offset:Number.NEGATIVE_INFINITY,element:void 0}).element}i.addEventListener("dragenter",a=>a.preventDefault()),i.addEventListener("dragover",a=>{if(a.preventDefault(),a.dataTransfer&&(a.dataTransfer.dropEffect="move"),!o)return;const p=v(a.clientY);p==null?i.appendChild(o):i.insertBefore(o,p)}),i.addEventListener("drop",a=>a.preventDefault()),i.querySelectorAll(u).forEach(a=>{const p=a.querySelector(b);if(!p)return;const m=()=>{a.setAttribute("draggable","true"),a.dataset.sortArmed="1"};p.addEventListener("pointerdown",m),p.addEventListener("mousedown",m),a.addEventListener("dragend",()=>{a.removeAttribute("draggable"),delete a.dataset.sortArmed,a.classList.remove("dragging","opacity-60"),o===a&&(o=null,E())}),a.addEventListener("dragstart",d=>{if(a.dataset.sortArmed!=="1"){d.preventDefault();return}delete a.dataset.sortArmed,o=a,a.classList.add("dragging","opacity-60"),d.dataTransfer.effectAllowed="move";try{d.dataTransfer.setData("text/plain","sort")}catch{}})})}async function M(){C();const i=document.getElementById("page-title"),u=document.getElementById("card-container");if(i&&(i.textContent=t("自學課程編排","Course curriculum")),!s.ScienceApi.getUser()){s.AppRouter.navigate("/login");return}if(!N()){u.innerHTML=`<p class="text-red-600">${r(t("沒有權限。","Forbidden."))}</p>`;return}u.innerHTML=`<p class="text-slate-500">${r(t("載入中…","Loading…"))}</p>`;let b=[];try{b=await s.ScienceApi.apiFetch("/admin/subjects"),Array.isArray(b)||(b=[])}catch(e){u.innerHTML=`<p class="text-red-600">${r(e.message||t("載入失敗","Load failed"))}</p>`;return}const E=Object.keys($).map(e=>`<option value="${r(e)}">${r($[e]())}</option>`).join("");u.innerHTML=`
            <style>
                .curriculum-layout{display:grid;grid-template-columns:280px 1fr;gap:1rem}
                @media(max-width:768px){.curriculum-layout{grid-template-columns:1fr}}
                .topic-pick.active{background:rgb(238 242 255);border-color:rgb(129 140 248)}
                .item-row.dragging{opacity:.6}
                .type-badge{font-size:10px;padding:2px 8px;border-radius:9999px;background:#e2e8f0;color:#475569}
            </style>
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <a href="${r(T("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${r(t("← 管理首頁","← Admin home"))}</a>
                <a href="${r(T("/admin/subjects"))}" data-spa-nav="/admin/subjects" class="text-sm text-slate-600 hover:underline">${r(t("科目與單元","Subjects & topics"))}</a>
            </div>
            <p class="text-sm text-slate-600 mb-4">${r(t("為各課題安排混合學習內容的順序。學習者將依此順序在「自學課程」分頁學習。","Arrange mixed learning content per topic. Learners follow this order in Courses."))}</p>
            <p id="curr-flash" class="text-sm mb-3 hidden"></p>
            <div class="curriculum-layout">
                <aside class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-fit">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${r(t("科目","Subject"))}</label>
                    <select id="curr-subject" class="w-full border rounded-lg px-3 py-2 mt-1 mb-4 text-sm">
                        ${b.map(e=>`<option value="${Number(e.id)}">${r(e.name_zh||e.name_en||"")}</option>`).join("")}
                    </select>
                    <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">${r(t("課題（學習順序）","Topics (order)"))}</div>
                    <div id="curr-topic-list" class="space-y-1 max-h-[60vh] overflow-y-auto"></div>
                </aside>
                <section class="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm min-h-[420px]">
                    <div id="curr-topic-empty" class="text-slate-500 text-sm py-12 text-center">${r(t("請選擇課題以編排學習內容。","Select a topic to arrange content."))}</div>
                    <div id="curr-topic-editor" class="hidden">
                        <div class="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                            <div>
                                <h2 id="curr-editor-title" class="text-lg font-bold text-slate-900"></h2>
                                <p class="text-xs text-slate-500 mt-1">${r(t("拖曳調整學習順序；僅已發佈內容會顯示給學習者。","Drag to reorder; only published items are shown to learners."))}</p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button type="button" id="curr-import-all" class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">${r(t("從課題匯入全部","Import all from topic"))}</button>
                                <button type="button" id="curr-add-item" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">${r(t("加入內容","Add content"))}</button>
                            </div>
                        </div>
                        <ul id="curr-items-list" class="space-y-2"></ul>
                        <p id="curr-items-empty" class="text-slate-500 text-sm py-8 text-center hidden">${r(t("此課題尚無編排項目。","No items in this topic yet."))}</p>
                    </div>
                </section>
            </div>
            <dialog id="curr-add-dialog" class="rounded-xl border border-slate-200 p-0 w-full max-w-md shadow-xl backdrop:bg-slate-900/50">
                <form method="dialog" class="p-5 space-y-4">
                    <h3 class="font-bold text-lg">${r(t("加入學習內容","Add learning content"))}</h3>
                    <div>
                        <label class="text-sm font-medium">${r(t("內容類型","Content type"))}</label>
                        <select id="curr-add-type" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm">${E}</select>
                    </div>
                    <div>
                        <label class="text-sm font-medium">${r(t("選擇項目","Choose item"))}</label>
                        <select id="curr-add-content" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm"><option value="">${r(t("載入中…","Loading…"))}</option></select>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" id="curr-add-cancel" class="px-3 py-1.5 text-sm border rounded-lg">${r(t("取消","Cancel"))}</button>
                        <button type="button" id="curr-add-confirm" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg">${r(t("加入","Add"))}</button>
                    </div>
                </form>
            </dialog>`,u.querySelectorAll("[data-spa-nav]").forEach(e=>{e.addEventListener("click",n=>{n.preventDefault(),s.AppRouter.navigate(e.getAttribute("data-spa-nav"))})});const o=document.getElementById("curr-flash"),v=document.getElementById("curr-subject"),a=document.getElementById("curr-topic-list"),p=document.getElementById("curr-topic-empty"),m=document.getElementById("curr-topic-editor"),d=document.getElementById("curr-items-list"),y=document.getElementById("curr-items-empty"),h=document.getElementById("curr-editor-title"),L=document.getElementById("curr-add-dialog"),w=document.getElementById("curr-add-type"),x=document.getElementById("curr-add-content");let c=null;function f(e,n){o.textContent=e,o.className=n?"text-sm mb-3 text-red-600":"text-sm mb-3 text-emerald-700",o.classList.remove("hidden"),clearTimeout(o._t),o._t=setTimeout(()=>o.classList.add("hidden"),4e3)}function _(e){const n=b.find(l=>Number(l.id)===Number(e));return n&&n.topics||[]}function S(){const e=_(v.value);a.innerHTML=e.map((n,l)=>{const g=n.name_zh||n.name_en||"";return`<button type="button" class="topic-pick w-full text-left px-3 py-2 rounded-lg border border-transparent text-sm hover:bg-slate-50" data-topic-id="${Number(n.id)}" data-topic-name="${r(g)}">
                    <span class="text-brand-600 font-mono text-xs mr-2">${l+1}.</span>${r(g)}
                </button>`}).join("")||`<p class="text-slate-500 text-sm px-2">${r(t("此科目尚無課題。","No topics in this subject."))}</p>`,a.querySelectorAll(".topic-pick").forEach(n=>{n.addEventListener("click",()=>k(n))}),c=null,m.classList.add("hidden"),p.classList.remove("hidden")}function k(e){a.querySelectorAll(".topic-pick").forEach(n=>n.classList.remove("active")),e.classList.add("active"),c=parseInt(e.getAttribute("data-topic-id")||"0",10),h.textContent=e.getAttribute("data-topic-name")||"",p.classList.add("hidden"),m.classList.remove("hidden"),A()}function B(e,n){const l=$[e.content_type]&&$[e.content_type]()||e.content_type,g=e.title_zh||e.title_en||t("(無標題)","(Untitled)");return`<li class="item-row flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/50${e.missing?" opacity-50":""}" data-item-id="${Number(e.id)}">
                <span class="item-drag-handle cursor-grab text-slate-400 select-none" title="${r(t("拖曳排序","Drag to sort"))}">☰</span>
                <span class="item-order-num text-xs font-mono text-brand-600 w-6">${n+1}</span>
                <span class="type-badge">${r(l)}</span>
                <span class="flex-1 text-sm font-medium truncate">${r(g)}</span>
                <button type="button" class="text-red-600 text-xs hover:underline remove-btn" data-id="${Number(e.id)}">${r(t("移除","Remove"))}</button>
            </li>`}async function A(){if(c)try{const n=(await s.ScienceApi.apiFetch("/admin/topic-items/"+c)).items||[];d.innerHTML=n.map(B).join(""),y.classList.toggle("hidden",n.length>0),H()}catch(e){f(e.message,!0)}}function j(){d.querySelectorAll(".item-row").forEach((e,n)=>{const l=e.querySelector(".item-order-num");l&&(l.textContent=String(n+1))})}function H(){d.querySelectorAll(".remove-btn").forEach(e=>{e.onclick=async()=>{if(window.confirm(t("移除此學習項目？","Remove this item?")))try{await s.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{action:"remove",id:parseInt(e.getAttribute("data-id")||"0",10)}}),await A()}catch(n){f(n.message,!0)}}}),F(d,".item-row",".item-drag-handle",()=>{R()})}async function R(){if(!c)return;j();const e=Array.prototype.map.call(d.querySelectorAll(".item-row"),n=>parseInt(n.getAttribute("data-item-id")||"0",10)).filter(n=>n>0);if(e.length)try{await s.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{action:"reorder",topic_id:c,order:e}})}catch(n){f(n.message,!0)}}async function I(){if(!c)return;const e=w.value;x.innerHTML=`<option value="">${r(t("載入中…","Loading…"))}</option>`;try{const n=await s.ScienceApi.apiFetch("/admin/topic-items/"+c+"/available/"+encodeURIComponent(e)),l=Array.isArray(n)?n:[];if(!l.length){x.innerHTML=`<option value="">${r(t("（無可加入的已發佈項目）","(No published items available)"))}</option>`;return}x.innerHTML=l.map(g=>`<option value="${Number(g.id)}">${r(g.title_zh||g.title_en||"")}</option>`).join("")}catch{x.innerHTML=`<option value="">${r(t("載入失敗","Load failed"))}</option>`}}v.addEventListener("change",S),document.getElementById("curr-import-all").onclick=async()=>{if(!(!c||!window.confirm(t("將此課題下所有已發佈內容依類型順序加入編排？已存在的項目不會重複。","Import all published content for this topic? Existing items are skipped."))))try{const e=await s.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{action:"import_all",topic_id:c}});f(t("已加入 ","Added ")+(e.added||0)+t(" 項"," item(s)"),!1),await A()}catch(e){f(e.message,!0)}},document.getElementById("curr-add-item").onclick=()=>{c&&(I(),L.showModal())},w.onchange=()=>{I()},document.getElementById("curr-add-cancel").onclick=()=>L.close(),document.getElementById("curr-add-confirm").onclick=async()=>{const e=parseInt(x.value||"0",10);if(!e){f(t("請選擇項目","Please choose an item"),!0);return}try{await s.ScienceApi.apiFetch("/admin/topic-items",{method:"POST",body:{topic_id:c,content_type:w.value,content_id:e}}),L.close(),await A()}catch(n){f(n.message,!0)}},S()}s.AppAdmin=Object.assign(s.AppAdmin||{},{renderAdminCourseCurriculum:M});
