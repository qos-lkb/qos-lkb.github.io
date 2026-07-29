const d=window;function e(n,i){return d.AppRouter&&d.AppRouter.t?d.AppRouter.t(n,i):n}function t(n){return d.AppRouter&&d.AppRouter.escapeHtml?d.AppRouter.escapeHtml(n):String(n||"")}function B(n){return String(n||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function O(n){return d.AppRouter&&d.AppRouter.spaHref?d.AppRouter.spaHref(n):String(n||"")}function S(){const n=document.getElementById("sidebar");n&&(n.style.display="none")}function h(n){n.querySelectorAll("[data-spa-nav]").forEach(i=>{i.addEventListener("click",l=>{l.preventDefault(),d.AppRouter.navigate(i.getAttribute("data-spa-nav"))})})}function A(n,i){return d.ScienceApi.getUser()?!(!d.ScienceApi.hasPermission(n)&&!(i&&d.ScienceApi.hasPermission(i))):(d.AppRouter.navigate("/login"),!1)}function z(n,i){let l=`<option value="draft">${t(e("草稿","Draft"))}</option>`;return l+=`<option value="pending_review">${t(e("待審核","Pending review"))}</option>`,i&&(l+=`<option value="published">${t(e("已發佈","Published"))}</option>`),l}async function j(){const n={},i=[],l=await d.ScienceApi.apiFetch("/admin/subjects");return(Array.isArray(l)?l:[]).forEach(o=>{i.push(o),n[Number(o.id)]=o.topics||[]}),{subjects:i,topicsBySubject:n}}function M(n,i,l,o){n.innerHTML='<option value="">—</option>',(i[Number(l)]||[]).forEach(r=>{const u=document.createElement("option");u.value=String(r.id),u.textContent=r.name_zh||r.name_en||"#"+r.id,o&&Number(r.id)===Number(o)&&(u.selected=!0),n.appendChild(u)})}function k(n,i,l,o,r){n.addEventListener("change",()=>{M(i,l,n.value,"")}),o&&(n.value=String(o),M(i,l,o,r||""))}function q(){return{stem_zh:"",stem_en:"",explanation_zh:"",explanation_en:"",options:[{text_zh:"",text_en:"",is_correct:!0},{text_zh:"",text_en:"",is_correct:!1},{text_zh:"",text_en:"",is_correct:!1},{text_zh:"",text_en:"",is_correct:!1}]}}function R(n,i,l){const o=document.createElement("div");o.className="border rounded-xl p-4 mb-4 bg-slate-50",o.innerHTML=`
            <div class="flex justify-between mb-2">
                <strong>${t(e("第","Q"))} ${i+1} ${t(e("題",""))}</strong>
                <button type="button" class="text-red-600 text-sm remove-q">${t(e("移除","Remove"))}</button>
            </div>
            <label class="block text-sm mb-1">${t(e("題幹（中）","Stem (ZH)"))}</label>
            <textarea class="stem-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${B(n.stem_zh)}</textarea>
            <label class="block text-sm mb-1">${t(e("題幹（英）","Stem (EN)"))}</label>
            <textarea class="stem-en w-full border rounded p-2 mb-2 text-sm" rows="2">${B(n.stem_en)}</textarea>
            <div class="options space-y-2"></div>
            <label class="block text-sm mt-2 mb-1">${t(e("解析（中）","Explanation (ZH)"))}</label>
            <textarea class="expl-zh w-full border rounded p-2 text-sm" rows="2">${B(n.explanation_zh||"")}</textarea>
            <label class="block text-sm mt-2 mb-1">${t(e("解析（英）","Explanation (EN)"))}</label>
            <textarea class="expl-en w-full border rounded p-2 text-sm" rows="2">${B(n.explanation_en||"")}</textarea>`;const r=o.querySelector(".options");(n.options||q().options).forEach((u,s)=>{const a=document.createElement("div");a.className="flex gap-2 items-start flex-wrap",a.innerHTML=`
                <span class="text-xs font-bold pt-2 w-4">${String.fromCharCode(65+s)}</span>
                <input type="radio" name="correct-${i}" class="correct mt-2" ${u.is_correct?"checked":""}>
                <input class="opt-zh flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="${B(e("選項（中）","Option ZH"))}" value="${B(u.text_zh)}">
                <input class="opt-en flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="Option EN" value="${B(u.text_en)}">`,r.appendChild(a)}),o.querySelector(".remove-q").onclick=()=>o.remove(),l.appendChild(o)}function U(n){return Array.from(n.querySelectorAll(":scope > div")).map((i,l)=>{const o=Array.from(i.querySelectorAll(".correct")).findIndex(s=>s.checked),r=i.querySelectorAll(".options > div"),u=Array.from(r).map((s,a)=>({text_zh:s.querySelector(".opt-zh").value,text_en:s.querySelector(".opt-en").value,is_correct:a===o,sort_order:a}));return{sort_order:l,stem_zh:i.querySelector(".stem-zh").value,stem_en:i.querySelector(".stem-en").value,explanation_zh:i.querySelector(".expl-zh").value,explanation_en:i.querySelector(".expl-en").value,options:u}})}async function P(n,i){try{const l=await d.ScienceApi.apiFetch("/articles/"+encodeURIComponent(n)+"/answers"),o={};(l.answers||[]).forEach(r=>{o[r.question_id]=r.correct_option_index}),i.forEach(r=>{const u=o[r.id];u!==void 0&&r.options&&r.options.forEach((s,a)=>{s.is_correct=a===u})})}catch{}return i}function w(n,i){return`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(O(n))}" data-spa-nav="${t(n)}" class="text-indigo-700 hover:underline">${t(i)}</a>
            </div>
            <p id="edit-flash" class="text-red-600 text-sm hidden mb-3"></p>`}function x(n){const i=document.getElementById("edit-flash");i&&(i.textContent=n,i.classList.remove("hidden"))}async function L(n,i){const l=await d.ScienceApi.apiFetch(n);return(Array.isArray(l)?l:l.items||[]).find(r=>Number(r.id)===Number(i))||null}async function Z(n){S();const i=document.getElementById("page-title"),l=document.getElementById("card-container"),o=n?Number(n):0;if(i&&(i.textContent=o?e("編輯學習影片","Edit video"):e("新增學習影片","New video")),!A("learning_video.manage_any","learning_video.manage_own")){d.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`${w("/admin/learning-videos",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,h(l);let r={},u=[],s=null;try{const v=await j();if(u=v.subjects,r=v.topicsBySubject,o&&(s=await L("/admin/learning-videos",o),!s))throw new Error(e("找不到影片。","Video not found."))}catch(v){l.innerHTML=`${w("/admin/learning-videos",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(v.message)}</p>`,h(l);return}const a=u.map(v=>`<option value="${Number(v.id)}">${t(v.name_zh||v.name_en)}</option>`).join("");l.innerHTML=`
            ${w("/admin/learning-videos",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${o||""}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("標題（中）","Title (ZH)"))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${t(e("標題（英）","Title (EN)"))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div>
                    <label class="text-sm font-medium">${t(e("影片連結（中文版本）","Video URL (ZH)"))}</label>
                    <input id="source-url-zh" type="url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/watch?v=...">
                </div>
                <div>
                    <label class="text-sm font-medium">${t(e("影片連結（英文版本）","Video URL (EN)"))}</label>
                    <input id="source-url-en" type="url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/watch?v=...">
                    <p class="text-xs text-slate-500 mt-1">${t(e("至少填寫其中一個語言版本。","Provide at least one language version."))}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("科目","Subject"))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${a}</select></div>
                    <div><label class="text-sm font-medium">${t(e("課題","Topic"))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${t(e("片長（分鐘，選填）","Duration (minutes)"))}</label><input type="number" id="duration" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("狀態","Status"))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${z(!0,!0)}</select></div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg">${t(e("儲存","Save"))}</button>
                    ${o?`<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">${t(e("刪除","Delete"))}</button>`:""}
                </div>
            </form>`,h(l);const p=document.getElementById("subject-id"),_=document.getElementById("topic-id");k(p,_,r,s&&s.subject_id,s&&s.topic_id),s&&(document.getElementById("title-zh").value=s.title_zh||"",document.getElementById("title-en").value=s.title_en||"",document.getElementById("slug").value=s.slug||"",document.getElementById("source-url-zh").value=s.embed_url_zh||s.embed_url||"",document.getElementById("source-url-en").value=s.embed_url_en||"",document.getElementById("status").value=s.status||"draft",document.getElementById("duration").value=s.duration_minutes||""),document.getElementById("edit-form").onsubmit=async v=>{v.preventDefault();const g={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,source_url_zh:document.getElementById("source-url-zh").value,source_url_en:document.getElementById("source-url-en").value,subject_id:document.getElementById("subject-id").value||null,topic_id:document.getElementById("topic-id").value||null,duration_minutes:document.getElementById("duration").value||null,status:document.getElementById("status").value};try{await d.ScienceApi.apiFetch("/admin/learning-videos",{method:"POST",body:g}),d.AppRouter.navigate("/admin/learning-videos")}catch(m){x(m.message||e("儲存失敗","Save failed"))}};const $=document.getElementById("btn-delete");$&&($.onclick=async()=>{if(confirm(e("確定刪除此影片？","Delete this video?")))try{await d.ScienceApi.apiFetch("/admin/learning-videos",{method:"DELETE",body:{id:o}}),d.AppRouter.navigate("/admin/learning-videos")}catch(v){x(v.message||e("刪除失敗","Delete failed"))}})}async function Q(n){S();const i=document.getElementById("page-title"),l=document.getElementById("card-container"),o=n?Number(n):0;if(i&&(i.textContent=o?e("編輯文章","Edit article"):e("新增文章","New article")),!A("article.manage_any","article.manage_own")){d.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`${w("/admin/articles",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,h(l);let r={},u=[],s=null,a=[];try{const g=await j();if(u=g.subjects,r=g.topicsBySubject,o){if(s=await L("/admin/articles",o),!s)throw new Error(e("找不到文章。","Article not found."));const m=await d.ScienceApi.apiFetch("/articles/"+encodeURIComponent(s.slug));a=await P(s.slug,m.questions||[])}}catch(g){l.innerHTML=`${w("/admin/articles",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(g.message)}</p>`,h(l);return}const p=u.map(g=>`<option value="${Number(g.id)}">${t(g.name_zh||g.name_en)}</option>`).join("");l.innerHTML=`
            ${w("/admin/articles",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${o||""}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("標題（中）","Title (ZH)"))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${t(e("標題（英）","Title (EN)"))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div><label class="text-sm font-medium">${t(e("內容（中，Markdown）","Body (ZH, Markdown)"))}</label><textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
                <div><label class="text-sm font-medium">${t(e("內容（英，Markdown）","Body (EN, Markdown)"))}</label><textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("科目","Subject"))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${p}</select></div>
                    <div><label class="text-sm font-medium">${t(e("單元","Topic"))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${t(e("閱讀時間（分鐘）","Reading time (min)"))}</label><input type="number" id="reading-time" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("狀態","Status"))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${z(!0,!0)}</select></div>
                <div>
                    <div class="flex justify-between mb-2">
                        <label class="text-sm font-medium">${t(e("閱讀理解題（選填）","Comprehension questions"))}</label>
                        <button type="button" id="add-q" class="text-sm text-indigo-600">+ ${t(e("新增","Add"))}</button>
                    </div>
                    <div id="questions"></div>
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg">${t(e("儲存","Save"))}</button>
            </form>`,h(l);const _=document.getElementById("questions");document.getElementById("add-q").onclick=()=>R(q(),_.children.length,_),a.forEach((g,m)=>R(g,m,_));const $=document.getElementById("subject-id"),v=document.getElementById("topic-id");k($,v,r,s&&s.subject_id,s&&s.topic_id),s&&(document.getElementById("title-zh").value=s.title_zh||"",document.getElementById("title-en").value=s.title_en||"",document.getElementById("slug").value=s.slug||"",document.getElementById("body-zh").value=s.body_zh||"",document.getElementById("body-en").value=s.body_en||"",document.getElementById("status").value=s.status||"draft",document.getElementById("reading-time").value=s.reading_time_minutes||""),document.getElementById("edit-form").onsubmit=async g=>{g.preventDefault();const m={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,body_zh:document.getElementById("body-zh").value,body_en:document.getElementById("body-en").value,subject_id:document.getElementById("subject-id").value||null,topic_id:document.getElementById("topic-id").value||null,reading_time_minutes:document.getElementById("reading-time").value||null,status:document.getElementById("status").value,questions:U(_)};try{await d.ScienceApi.apiFetch("/admin/articles",{method:"POST",body:m}),d.AppRouter.navigate("/admin/articles")}catch(I){x(I.message||e("儲存失敗","Save failed"))}}}async function V(n){S();const i=document.getElementById("page-title"),l=document.getElementById("card-container"),o=n?Number(n):0,r=d.ScienceApi.hasPermission("learning_note.manage_any"),u=d.ScienceApi.hasPermission("question_bank.manage_any")||d.ScienceApi.hasPermission("question_bank.manage_own");if(i&&(i.textContent=o?e("編輯學習筆記","Edit note"):e("新增學習筆記","New note")),!A("learning_note.manage_any","learning_note.manage_own")){d.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`${w("/admin/learning-notes",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,h(l);let s={},a=[],p=null;try{const m=await j();if(a=m.subjects,s=m.topicsBySubject,o&&(p=await L("/admin/learning-notes",o),!p))throw new Error(e("找不到筆記。","Note not found."))}catch(m){l.innerHTML=`${w("/admin/learning-notes",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(m.message)}</p>`,h(l);return}const _=a.map(m=>`<option value="${Number(m.id)}">${t(m.name_zh||m.name_en)}</option>`).join("");if(l.innerHTML=`
            ${w("/admin/learning-notes",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${o||""}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("標題（中）","Title (ZH)"))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${t(e("標題（英）","Title (EN)"))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div>
                    <label class="text-sm font-medium">${t(e("內容（中，Markdown）","Body (ZH, Markdown)"))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-content-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ ${t(e("影片","Video"))}</button>
                        <button type="button" data-content-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ ${t(e("模擬","Sim"))}</button>
                        ${u?`<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ ${t(e("題庫題目","Question"))}</button>`:""}
                    </div>
                    <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                    <p class="text-xs text-slate-500 mt-1">${t(e("可用 ::video / ::simulation / ::question 短碼嵌入內容；亦可用上方按鈕插入。","Use ::video / ::simulation / ::question shortcodes, or the buttons above."))}</p>
                </div>
                <div>
                    <label class="text-sm font-medium">${t(e("內容（英，Markdown）","Body (EN, Markdown)"))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-content-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Video</button>
                        <button type="button" data-content-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Sim</button>
                        ${u?'<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ Question</button>':""}
                    </div>
                    <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("科目","Subject"))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${_}</select></div>
                    <div><label class="text-sm font-medium">${t(e("單元","Topic"))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${t(e("閱讀時間（分鐘）","Reading time (min)"))}</label><input type="number" id="reading-time" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("排序","Sort order"))}</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("狀態","Status"))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${z(!0,r)}</select></div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg">${t(e("儲存","Save"))}</button>
                    ${o?`<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">${t(e("刪除","Delete"))}</button>`:""}
                </div>
            </form>`,h(l),d.AdminContentEmbed){const m=u?["video","simulation","question"]:["video","simulation"];d.AdminContentEmbed.init(["body-zh","body-en"],{tabs:m})}const $=document.getElementById("subject-id"),v=document.getElementById("topic-id");k($,v,s,p&&p.subject_id,p&&p.topic_id),p&&(document.getElementById("title-zh").value=p.title_zh||"",document.getElementById("title-en").value=p.title_en||"",document.getElementById("slug").value=p.slug||"",document.getElementById("body-zh").value=p.body_zh||"",document.getElementById("body-en").value=p.body_en||"",document.getElementById("status").value=p.status||"draft",document.getElementById("reading-time").value=p.reading_time_minutes||"",document.getElementById("list-sort").value=p.list_sort_order||0),document.getElementById("edit-form").onsubmit=async m=>{m.preventDefault();const I={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,body_zh:document.getElementById("body-zh").value,body_en:document.getElementById("body-en").value,subject_id:document.getElementById("subject-id").value||null,topic_id:document.getElementById("topic-id").value||null,reading_time_minutes:document.getElementById("reading-time").value||null,list_sort_order:parseInt(document.getElementById("list-sort").value,10)||0,status:document.getElementById("status").value};try{await d.ScienceApi.apiFetch("/admin/learning-notes",{method:"POST",body:I}),d.AppRouter.navigate("/admin/learning-notes")}catch(b){x(b.message||e("儲存失敗","Save failed"))}};const g=document.getElementById("btn-delete");g&&(g.onclick=async()=>{if(confirm(e("確定刪除此學習筆記？","Delete this note?")))try{await d.ScienceApi.apiFetch("/admin/learning-notes",{method:"DELETE",body:{id:o}}),d.AppRouter.navigate("/admin/learning-notes")}catch(m){x(m.message||e("刪除失敗","Delete failed"))}})}async function G(n){S();const i=document.getElementById("page-title"),l=document.getElementById("card-container"),o=n?Number(n):0,r=d.ScienceApi.hasPermission("simulation.manage_any");if(i&&(i.textContent=o?e("編輯模擬","Edit simulation"):e("新增模擬","New simulation")),!A("simulation.manage_any","simulation.manage_own")){d.ScienceApi.getUser()&&(l.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}l.innerHTML=`${w("/admin/simulations",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,h(l);let u={},s=[],a=null,p=[];try{const c=await j();if(s=c.subjects,u=c.topicsBySubject,o&&(a=await d.ScienceApi.apiFetch("/admin/simulations?id="+o),!a||!a.id))throw new Error(e("找不到模擬。","Simulation not found."));if(r)try{const y=await d.ScienceApi.apiFetch("/admin/users");p=Array.isArray(y)?y:y.users||y.items||[]}catch{p=[]}}catch(c){l.innerHTML=`${w("/admin/simulations",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(c.message)}</p>`,h(l);return}const _=d.ScienceApi.getUser(),$=a?a.owner_user_id:_&&_.id,v=Array.isArray(a&&a.tags)?a.tags.join(", "):"",g=s.map(c=>`<option value="${Number(c.id)}">${t((c.name_zh||"")+" / "+(c.name_en||""))}</option>`).join(""),m=p.map(c=>`<option value="${Number(c.id)}" ${Number(c.id)===Number($)?"selected":""}>${t((c.email||"")+" — "+(c.display_name||""))}</option>`).join(""),I="allow-scripts allow-forms allow-popups allow-modals allow-downloads";l.innerHTML=`
            ${w("/admin/simulations",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-6">
                <input type="hidden" name="id" value="${o||0}">
                <section class="bg-white rounded-xl border p-6 space-y-4">
                    <h2 class="text-sm font-semibold text-slate-800">${t(e("基本資料","Metadata"))}</h2>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("中文標題","Title (ZH)"))}</label><input name="title_zh" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("英文標題","Title (EN)"))}</label><input name="title_en" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("中文摘要","Summary (ZH)"))}</label><input name="summary_zh" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("英文摘要","Summary (EN)"))}</label><input name="summary_en" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div><label class="block text-sm font-medium text-slate-700">${t(e("網址 slug（留空則依標題自動產生）","Slug (auto from title if empty)"))}</label><input name="slug" class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"></div>
                    ${r?`<div><label class="block text-sm font-medium text-slate-700">${t(e("擁有者","Owner"))}</label><select name="owner_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">${m}</select></div>`:""}
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("科目","Subject"))}</label><select name="subject_id" id="field-subject" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option>${g}</select></div>
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("單元（課題）","Topic"))}</label><select name="topic_id" id="field-topic" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option></select></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("列表排序","List sort"))}</label><input type="number" name="list_sort_order" min="0" step="1" class="mt-1 w-full border rounded-lg px-3 py-2" value="0"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${t(e("標籤（逗號分隔）","Tags (comma-separated)"))}</label><input name="tags" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${t(e("截圖","Screenshot"))}</label>
                        <div class="mt-1 flex flex-wrap gap-2 items-center">
                            <input type="file" id="screenshot-file" accept="image/jpeg,image/png,image/gif,image/webp" class="text-sm">
                            <button type="button" id="btn-upload-screenshot" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${t(e("上載截圖","Upload"))}</button>
                        </div>
                        <input name="screenshot_path" class="mt-2 w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="uploads/…">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${t(e("狀態","Status"))}</label>
                        <select name="status" class="mt-1 w-full border rounded-lg px-3 py-2 md:w-48">${z(!0,r)}</select>
                        ${r?"":`<p class="mt-1 text-xs text-slate-500">${t(e("貢獻者可存草稿或送審；管理員審核後才會公開。","Contributors may save as draft or submit for review; admins publish."))}</p>`}
                    </div>
                    <div><label class="block text-sm font-medium text-slate-700">${t(e("投稿備註（選填）","Submitter note (optional)"))}</label><textarea name="submitter_note" rows="2" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></textarea></div>
                </section>
                <section class="bg-white rounded-xl border p-6 space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h2 class="text-sm font-semibold text-slate-800">${t(e("HTML 內容","HTML content"))}</h2>
                        <div class="flex flex-wrap gap-2 items-center">
                            <input type="file" id="html-file" accept=".html,.htm,text/html" class="text-sm">
                            <button type="button" id="btn-load-html" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${t(e("載入 HTML 檔","Load HTML file"))}</button>
                            <button type="button" id="btn-preview-html" class="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700">${t(e("更新預覽","Refresh preview"))}</button>
                        </div>
                    </div>
                    <textarea name="html" id="field-html" rows="16" required class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
                </section>
                <section class="bg-white rounded-xl border p-6 space-y-3">
                    <h2 class="text-sm font-semibold text-slate-800">${t(e("沙盒預覽","Sandbox preview"))}</h2>
                    <iframe id="sim-edit-preview" title="preview" sandbox="${I}" class="w-full h-80 border rounded-lg bg-slate-50"></iframe>
                </section>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">${t(e("儲存","Save"))}</button>
            </form>`,h(l);const b=document.getElementById("edit-form"),F=document.getElementById("field-subject"),C=document.getElementById("field-topic"),H=document.getElementById("field-html"),N=document.getElementById("sim-edit-preview");k(F,C,u,a&&a.subject_id,a&&a.topic_id);function T(){if(!N)return;const c=new Blob([H.value||""],{type:"text/html"}),y=URL.createObjectURL(c);N.src=y,setTimeout(()=>URL.revokeObjectURL(y),6e4)}a&&(b.title_zh.value=a.title_zh||"",b.title_en.value=a.title_en||"",b.summary_zh.value=a.summary_zh||"",b.summary_en.value=a.summary_en||"",b.slug.value=a.slug||"",b.list_sort_order.value=a.list_sort_order||0,b.tags.value=v,b.screenshot_path.value=a.screenshot_path||"",b.status.value=a.status||"draft",b.html.value=a.html||"",b.submitter_note.value=a.submitter_note||""),T(),document.getElementById("btn-preview-html").onclick=()=>T(),document.getElementById("btn-load-html").onclick=async()=>{const c=document.getElementById("html-file"),y=c&&c.files&&c.files[0];if(!y){x(e("請先選擇 HTML 檔。","Choose an HTML file first."));return}try{const f=new FormData;f.append("file",y);const E=await d.ScienceApi.apiFetch("/admin/simulations/upload-html",{method:"POST",body:f});H.value=E.html||"",!b.title_zh.value&&!b.title_en.value&&E.suggested_title&&(b.title_zh.value=E.suggested_title,b.title_en.value=E.suggested_title),T(),x(e("已載入 HTML。","HTML loaded."))}catch(f){x(f.message||e("上載失敗","Upload failed"))}},document.getElementById("btn-upload-screenshot").onclick=async()=>{const c=document.getElementById("screenshot-file"),y=c&&c.files&&c.files[0];if(!y){x(e("請先選擇截圖檔。","Choose a screenshot first."));return}try{const f=new FormData;f.append("file",y);const E=await d.ScienceApi.apiFetch("/admin/simulations/upload-screenshot",{method:"POST",body:f});b.screenshot_path.value=E.path||"",x(e("截圖已上載。","Screenshot uploaded."))}catch(f){x(f.message||e("上載失敗","Upload failed"))}},b.addEventListener("submit",async c=>{c.preventDefault();const y=new FormData(b),f={};y.forEach((E,D)=>{f[D]=E}),f.id=o||parseInt(f.id||"0",10)||0;try{await d.ScienceApi.apiFetch("/admin/simulations",{method:"POST",body:f}),d.AppRouter.navigate("/admin/simulations")}catch(E){x(E.message||e("儲存失敗","Save failed"))}})}Object.assign(d.AppAdmin||(d.AppAdmin={}),{renderAdminLearningVideoEdit:Z,renderAdminArticleEdit:Q,renderAdminLearningNoteEdit:V,renderAdminSimulationEdit:G});
