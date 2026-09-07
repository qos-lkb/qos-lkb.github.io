const l=window;function n(a,d){return l.AppRouter&&l.AppRouter.t?l.AppRouter.t(a,d):a}function t(a){return l.AppRouter&&l.AppRouter.escapeHtml?l.AppRouter.escapeHtml(a):String(a||"")}function $(a){return l.AppRouter&&l.AppRouter.spaHref?l.AppRouter.spaHref(a):String(a)}function S(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}function B(a){a.querySelectorAll("[data-spa-nav]").forEach(d=>{d.addEventListener("click",i=>{i.preventDefault(),l.AppRouter.navigate(d.getAttribute("data-spa-nav"))})})}function A(){return l.ScienceApi.getUser()?!(!l.ScienceApi.hasPermission("flashcard_set.manage_any")&&!l.ScienceApi.hasPermission("flashcard_set.manage_own")):(l.AppRouter.navigate("/login"),!1)}async function I(){let a;try{a=await l.ScienceApi.apiFetch("/admin/subjects")}catch{a=await l.ScienceApi.apiFetch("/subjects")}const d=[],i={};return(Array.isArray(a)?a:[]).forEach(s=>{d.push({id:Number(s.id),name_zh:s.name_zh||s.name_en||"",name_en:s.name_en||""}),i[Number(s.id)]=(s.topics||[]).map(u=>({id:Number(u.id),name_zh:u.name_zh||u.name_en||"",name_en:u.name_en||""}))}),{subjects:d,topicsBySubject:i}}function b(){return{id:0,front_zh:"",front_en:"",back_zh:"",back_en:"",hint_zh:"",hint_en:""}}function z(a,d){return`<article class="fc-card-block border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3" data-card-id="${Number(a.id||0)}">
            <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-mono text-indigo-600 fc-card-num">${d+1}</span>
                <div class="flex gap-2 text-xs">
                    <button type="button" class="fc-move-up px-2 py-1 border rounded-lg hover:bg-white">${t(n("上移","Up"))}</button>
                    <button type="button" class="fc-move-down px-2 py-1 border rounded-lg hover:bg-white">${t(n("下移","Down"))}</button>
                    <button type="button" class="fc-remove text-red-600 hover:underline">${t(n("刪除","Remove"))}</button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label class="text-sm">${t(n("正面（中）","Front (ZH)"))}
                    <textarea class="fc-front-zh w-full border rounded-lg px-3 py-2 mt-1" rows="3">${t(a.front_zh||"")}</textarea>
                </label>
                <label class="text-sm">${t(n("正面（英）","Front (EN)"))}
                    <textarea class="fc-front-en w-full border rounded-lg px-3 py-2 mt-1" rows="3">${t(a.front_en||"")}</textarea>
                </label>
                <label class="text-sm">${t(n("背面（中）","Back (ZH)"))}
                    <textarea class="fc-back-zh w-full border rounded-lg px-3 py-2 mt-1" rows="3">${t(a.back_zh||"")}</textarea>
                </label>
                <label class="text-sm">${t(n("背面（英）","Back (EN)"))}
                    <textarea class="fc-back-en w-full border rounded-lg px-3 py-2 mt-1" rows="3">${t(a.back_en||"")}</textarea>
                </label>
                <label class="text-sm">${t(n("提示（中，可選）","Hint (ZH, optional)"))}
                    <input class="fc-hint-zh w-full border rounded-lg px-3 py-2 mt-1" value="${t(a.hint_zh||"")}">
                </label>
                <label class="text-sm">${t(n("提示（英，可選）","Hint (EN, optional)"))}
                    <input class="fc-hint-en w-full border rounded-lg px-3 py-2 mt-1" value="${t(a.hint_en||"")}">
                </label>
            </div>
        </article>`}function k(a){return Array.from(a.querySelectorAll(".fc-card-block")).map(d=>{const i=Number(d.getAttribute("data-card-id")||0),s={front_zh:d.querySelector(".fc-front-zh").value,front_en:d.querySelector(".fc-front-en").value,back_zh:d.querySelector(".fc-back-zh").value,back_en:d.querySelector(".fc-back-en").value,hint_zh:d.querySelector(".fc-hint-zh").value,hint_en:d.querySelector(".fc-hint-en").value};return i>0&&(s.id=i),s})}function y(a){a.querySelectorAll(".fc-card-num").forEach((d,i)=>{d.textContent=String(i+1)})}async function j(a){S();const d=document.getElementById("page-title"),i=document.getElementById("card-container");let s=a?Number(a):0;if(d&&(d.textContent=s?n("編輯閃卡組","Edit flashcard set"):n("新增閃卡組","New flashcard set")),!A()){l.ScienceApi.getUser()&&(i.innerHTML=`<p class="text-red-600">${t(n("沒有權限。","Forbidden."))}</p>`);return}i.innerHTML=`<p class="text-slate-500">${t(n("載入中…","Loading…"))}</p>`;let u=[],f={};try{const e=await I();u=e.subjects,f=e.topicsBySubject}catch(e){i.innerHTML=`<p class="text-red-600">${t(e.message||n("載入失敗","Load failed"))}</p>`;return}const x=l.ScienceApi.hasPermission("flashcard_set.manage_any"),E=u.map(e=>`<option value="${Number(e.id)}">${t(e.name_zh)}</option>`).join("");i.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t($("/admin/flashcard-sets"))}" data-spa-nav="/admin/flashcard-sets" class="text-indigo-700 hover:underline">${t(n("← 返回列表","← Back to list"))}</a>
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3"></p>
            <form id="edit-form" class="space-y-6">
                <input type="hidden" id="item-id" value="${s||""}">
                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h2 class="text-sm font-semibold text-slate-800">${t(n("閃卡組","Flashcard set"))}</h2>
                        <p class="text-xs text-slate-500 mt-0.5">${t(n("可連接科目與課題；發佈後可加入自學課程。","Link a subject and topic; published sets can join self-study courses."))}</p>
                    </div>
                    <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <label>${t(n("標題（中）","Title (ZH)"))}
                            <input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </label>
                        <label>${t(n("標題（英）","Title (EN)"))}
                            <input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </label>
                        <label class="md:col-span-2">slug
                            <input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" placeholder="${t(n("留空則依標題自動產生","Auto from title if empty"))}">
                        </label>
                        <label>${t(n("描述（中）","Description (ZH)"))}
                            <textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2 mt-1" rows="2"></textarea>
                        </label>
                        <label>${t(n("描述（英）","Description (EN)"))}
                            <textarea id="desc-en" class="w-full border rounded-lg px-3 py-2 mt-1" rows="2"></textarea>
                        </label>
                        <label>${t(n("科目","Subject"))}
                            <select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1">
                                <option value="">—</option>${E}
                            </select>
                        </label>
                        <label>${t(n("課題","Topic"))}
                            <select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select>
                        </label>
                        <label>${t(n("列表排序","List sort"))}
                            <input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </label>
                        <label>${t(n("狀態","Status"))}
                            <select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                                <option value="draft">${t(n("草稿","Draft"))}</option>
                                <option value="pending_review">${t(n("待審核","Pending review"))}</option>
                                ${x?`<option value="published">${t(n("已發佈","Published"))}</option>`:""}
                            </select>
                        </label>
                    </div>
                </section>
                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <h2 class="text-sm font-semibold text-slate-800">${t(n("卡片","Cards"))}</h2>
                            <p class="text-xs text-slate-500 mt-0.5">${t(n("正面／背面支援 Markdown 與 MathJax（$...$）。","Front/back support Markdown and MathJax ($...$)."))}</p>
                        </div>
                        <button type="button" id="btn-add-card" class="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">${t(n("+ 新增卡片","+ Add card"))}</button>
                    </div>
                    <div id="cards-list" class="p-4 space-y-4"></div>
                    <p id="cards-empty" class="hidden p-6 text-center text-slate-500 text-sm">${t(n("尚無卡片，請新增第一張。","No cards yet. Add the first one."))}</p>
                </section>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">${t(n("儲存","Save"))}</button>
                    ${s?`<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">${t(n("刪除閃卡組","Delete set"))}</button>`:""}
                </div>
            </form>`,B(i);const r=document.getElementById("cards-list"),_=document.getElementById("cards-empty"),g=document.getElementById("edit-flash");function h(){_.classList.toggle("hidden",r.querySelectorAll(".fc-card-block").length>0),y(r)}function w(e){e.querySelector(".fc-remove").onclick=()=>{e.remove(),h()},e.querySelector(".fc-move-up").onclick=()=>{e.previousElementSibling&&r.insertBefore(e,e.previousElementSibling),y(r)},e.querySelector(".fc-move-down").onclick=()=>{e.nextElementSibling&&r.insertBefore(e.nextElementSibling,e),y(r)}}function p(e){r.insertAdjacentHTML("beforeend",z(e||b(),r.children.length)),w(r.lastElementChild),h()}document.getElementById("btn-add-card").onclick=()=>p(b()),document.getElementById("subject-id").onchange=function(){const e=document.getElementById("topic-id");e.innerHTML='<option value="">—</option>',(f[this.value]||f[Number(this.value)]||[]).forEach(o=>{const c=document.createElement("option");c.value=o.id,c.textContent=o.name_zh,e.appendChild(c)})};function m(e,o){g.textContent=e,g.className=o?"text-sm mb-3 text-red-600":"text-sm mb-3 text-emerald-700",g.classList.remove("hidden")}if(s)try{const e=await l.ScienceApi.apiFetch("/admin/flashcard-sets/"+s);document.getElementById("title-zh").value=e.title_zh||"",document.getElementById("title-en").value=e.title_en||"",document.getElementById("slug").value=e.slug||"",document.getElementById("desc-zh").value=e.description_zh||"",document.getElementById("desc-en").value=e.description_en||"",document.getElementById("status").value=e.status||"draft",document.getElementById("list-sort").value=e.list_sort_order||0,e.subject_id&&(document.getElementById("subject-id").value=String(e.subject_id),document.getElementById("subject-id").dispatchEvent(new Event("change")),e.topic_id&&(document.getElementById("topic-id").value=String(e.topic_id))),(e.cards||[]).forEach(o=>p(o)),(e.cards||[]).length||p(b())}catch(e){m(e.message||n("載入失敗","Load failed"),!0)}else p(b());h(),document.getElementById("edit-form").onsubmit=async e=>{e.preventDefault();const o={title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,description_zh:document.getElementById("desc-zh").value,description_en:document.getElementById("desc-en").value,subject_id:document.getElementById("subject-id").value,topic_id:document.getElementById("topic-id").value,list_sort_order:parseInt(document.getElementById("list-sort").value||"0",10),status:document.getElementById("status").value,cards:k(r)};s&&(o.id=s);try{const c=await l.ScienceApi.apiFetch("/admin/flashcard-sets",{method:"POST",body:o});s=Number(c.id||s),document.getElementById("item-id").value=String(s),c.slug&&(document.getElementById("slug").value=c.slug),m(n("已儲存。","Saved."),!1),!a&&s&&l.AppRouter.navigate("/admin/flashcard-sets/"+s+"/edit")}catch(c){m(c.message||n("儲存失敗","Save failed"),!0)}};const v=document.getElementById("btn-delete");v&&(v.onclick=async()=>{if(confirm(n("確定刪除此閃卡組？","Delete this flashcard set?")))try{await l.ScienceApi.apiFetch("/admin/flashcard-sets",{method:"DELETE",body:{id:s}}),l.AppRouter.navigate("/admin/flashcard-sets")}catch(e){m(e.message||n("刪除失敗","Delete failed"),!0)}})}l.AppAdmin=Object.assign(l.AppAdmin||{},{renderAdminFlashcardSetEdit:j});
