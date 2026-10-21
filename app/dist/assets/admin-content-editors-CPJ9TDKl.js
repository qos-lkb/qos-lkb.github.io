const a=window;function e(l,i){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(l,i):l}function t(l){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(l):String(l||"")}function B(l){return String(l||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function O(l){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(l):String(l||"")}function S(){const l=document.getElementById("sidebar");l&&(l.style.display="none")}function w(l){l.querySelectorAll("[data-spa-nav]").forEach(i=>{i.addEventListener("click",n=>{n.preventDefault(),a.AppRouter.navigate(i.getAttribute("data-spa-nav"))})})}function A(l,i){return a.ScienceApi.getUser()?!(!a.ScienceApi.hasPermission(l)&&!(i&&a.ScienceApi.hasPermission(i))):(a.AppRouter.navigate("/login"),!1)}function z(l,i){let n=`<option value="draft">${t(e("草稿","Draft"))}</option>`;return n+=`<option value="pending_review">${t(e("待審核","Pending review"))}</option>`,i&&(n+=`<option value="published">${t(e("已發佈","Published"))}</option>`),n}async function j(){const l={},i=[];let n;try{n=await a.ScienceApi.apiFetch("/admin/subjects")}catch{n=await a.ScienceApi.apiFetch("/subjects")}return(Array.isArray(n)?n:[]).forEach(s=>{i.push(s),l[Number(s.id)]=s.topics||[]}),{subjects:i,topicsBySubject:l}}function M(l,i,n,s){l.innerHTML='<option value="">—</option>',(i[Number(n)]||[]).forEach(r=>{const c=document.createElement("option");c.value=String(r.id),c.textContent=r.name_zh||r.name_en||"#"+r.id,s&&Number(r.id)===Number(s)&&(c.selected=!0),l.appendChild(c)})}function k(l,i,n,s,r){l.addEventListener("change",()=>{M(i,n,l.value,"")}),s&&(l.value=String(s),M(i,n,s,r||""))}function q(){return{stem_zh:"",stem_en:"",explanation_zh:"",explanation_en:"",options:[{text_zh:"",text_en:"",is_correct:!0},{text_zh:"",text_en:"",is_correct:!1},{text_zh:"",text_en:"",is_correct:!1},{text_zh:"",text_en:"",is_correct:!1}]}}function R(l,i,n){const s=document.createElement("div");s.className="border rounded-xl p-4 mb-4 bg-slate-50",s.innerHTML=`
            <div class="flex justify-between mb-2">
                <strong>${t(e("第","Q"))} ${i+1} ${t(e("題",""))}</strong>
                <button type="button" class="text-red-600 text-sm remove-q">${t(e("移除","Remove"))}</button>
            </div>
            <label class="block text-sm mb-1">${t(e("題幹（中）","Stem (ZH)"))}</label>
            <textarea class="stem-zh w-full border rounded p-2 mb-2 text-sm" rows="2">${B(l.stem_zh)}</textarea>
            <label class="block text-sm mb-1">${t(e("題幹（英）","Stem (EN)"))}</label>
            <textarea class="stem-en w-full border rounded p-2 mb-2 text-sm" rows="2">${B(l.stem_en)}</textarea>
            <div class="options space-y-2"></div>
            <label class="block text-sm mt-2 mb-1">${t(e("解析（中）","Explanation (ZH)"))}</label>
            <textarea class="expl-zh w-full border rounded p-2 text-sm" rows="2">${B(l.explanation_zh||"")}</textarea>
            <label class="block text-sm mt-2 mb-1">${t(e("解析（英）","Explanation (EN)"))}</label>
            <textarea class="expl-en w-full border rounded p-2 text-sm" rows="2">${B(l.explanation_en||"")}</textarea>`;const r=s.querySelector(".options");(l.options||q().options).forEach((c,o)=>{const d=document.createElement("div");d.className="flex gap-2 items-start flex-wrap",d.innerHTML=`
                <span class="text-xs font-bold pt-2 w-4">${String.fromCharCode(65+o)}</span>
                <input type="radio" name="correct-${i}" class="correct mt-2" ${c.is_correct?"checked":""}>
                <input class="opt-zh flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="${B(e("選項（中）","Option ZH"))}" value="${B(c.text_zh)}">
                <input class="opt-en flex-1 border rounded p-1 text-sm min-w-[120px]" placeholder="Option EN" value="${B(c.text_en)}">`,r.appendChild(d)}),s.querySelector(".remove-q").onclick=()=>s.remove(),n.appendChild(s)}function U(l){return Array.from(l.querySelectorAll(":scope > div")).map((i,n)=>{const s=Array.from(i.querySelectorAll(".correct")).findIndex(o=>o.checked),r=i.querySelectorAll(".options > div"),c=Array.from(r).map((o,d)=>({text_zh:o.querySelector(".opt-zh").value,text_en:o.querySelector(".opt-en").value,is_correct:d===s,sort_order:d}));return{sort_order:n,stem_zh:i.querySelector(".stem-zh").value,stem_en:i.querySelector(".stem-en").value,explanation_zh:i.querySelector(".expl-zh").value,explanation_en:i.querySelector(".expl-en").value,options:c}})}async function P(l,i){try{const n=await a.ScienceApi.apiFetch("/articles/"+encodeURIComponent(l)+"/answers"),s={};(n.answers||[]).forEach(r=>{s[r.question_id]=r.correct_option_index}),i.forEach(r=>{const c=s[r.id];c!==void 0&&r.options&&r.options.forEach((o,d)=>{o.is_correct=d===c})})}catch{}return i}function _(l,i){return`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(O(l))}" data-spa-nav="${t(l)}" class="text-brand-700 hover:underline">${t(i)}</a>
            </div>
            <p id="edit-flash" class="text-red-600 text-sm hidden mb-3"></p>`}function h(l){const i=document.getElementById("edit-flash");i&&(i.textContent=l,i.classList.remove("hidden"))}async function L(l,i){const n=await a.ScienceApi.apiFetch(l);return(Array.isArray(n)?n:n.items||[]).find(r=>Number(r.id)===Number(i))||null}async function Z(l){S();const i=document.getElementById("page-title"),n=document.getElementById("card-container"),s=l?Number(l):0;if(i&&(i.textContent=s?e("編輯學習影片","Edit video"):e("新增學習影片","New video")),!A("learning_video.manage_any","learning_video.manage_own")){a.ScienceApi.getUser()&&(n.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}n.innerHTML=`${_("/admin/learning-videos",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,w(n);let r={},c=[],o=null;try{const v=await j();if(c=v.subjects,r=v.topicsBySubject,s&&(o=await L("/admin/learning-videos",s),!o))throw new Error(e("找不到影片。","Video not found."))}catch(v){n.innerHTML=`${_("/admin/learning-videos",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(v.message)}</p>`,w(n);return}const d=c.map(v=>`<option value="${Number(v.id)}">${t(v.name_zh||v.name_en)}</option>`).join("");n.innerHTML=`
            ${_("/admin/learning-videos",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${s||""}">
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
                    <div><label class="text-sm font-medium">${t(e("科目","Subject"))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${d}</select></div>
                    <div><label class="text-sm font-medium">${t(e("課題","Topic"))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${t(e("片長（分鐘，選填）","Duration (minutes)"))}</label><input type="number" id="duration" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("狀態","Status"))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${z(!0,!0)}</select></div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-brand-600 text-white py-2 rounded-lg">${t(e("儲存","Save"))}</button>
                    ${s?`<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">${t(e("刪除","Delete"))}</button>`:""}
                </div>
            </form>`,w(n);const m=document.getElementById("subject-id"),E=document.getElementById("topic-id");k(m,E,r,o&&o.subject_id,o&&o.topic_id),o&&(document.getElementById("title-zh").value=o.title_zh||"",document.getElementById("title-en").value=o.title_en||"",document.getElementById("slug").value=o.slug||"",document.getElementById("source-url-zh").value=o.embed_url_zh||o.embed_url||"",document.getElementById("source-url-en").value=o.embed_url_en||"",document.getElementById("status").value=o.status||"draft",document.getElementById("duration").value=o.duration_minutes||""),document.getElementById("edit-form").onsubmit=async v=>{v.preventDefault();const g={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,source_url_zh:document.getElementById("source-url-zh").value,source_url_en:document.getElementById("source-url-en").value,subject_id:document.getElementById("subject-id").value||null,topic_id:document.getElementById("topic-id").value||null,duration_minutes:document.getElementById("duration").value||null,status:document.getElementById("status").value};try{await a.ScienceApi.apiFetch("/admin/learning-videos",{method:"POST",body:g}),a.AppRouter.navigate("/admin/learning-videos")}catch(p){h(p.message||e("儲存失敗","Save failed"))}};const x=document.getElementById("btn-delete");x&&(x.onclick=async()=>{if(confirm(e("確定刪除此影片？","Delete this video?")))try{await a.ScienceApi.apiFetch("/admin/learning-videos",{method:"DELETE",body:{id:s}}),a.AppRouter.navigate("/admin/learning-videos")}catch(v){h(v.message||e("刪除失敗","Delete failed"))}})}async function Q(l){S();const i=document.getElementById("page-title"),n=document.getElementById("card-container"),s=l?Number(l):0;if(i&&(i.textContent=s?e("編輯文章","Edit article"):e("新增文章","New article")),!A("article.manage_any","article.manage_own")){a.ScienceApi.getUser()&&(n.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}n.innerHTML=`${_("/admin/articles",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,w(n);let r={},c=[],o=null,d=[];try{const g=await j();if(c=g.subjects,r=g.topicsBySubject,s){if(o=await L("/admin/articles",s),!o)throw new Error(e("找不到文章。","Article not found."));const p=await a.ScienceApi.apiFetch("/articles/"+encodeURIComponent(o.slug));d=await P(o.slug,p.questions||[])}}catch(g){n.innerHTML=`${_("/admin/articles",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(g.message)}</p>`,w(n);return}const m=c.map(g=>`<option value="${Number(g.id)}">${t(g.name_zh||g.name_en)}</option>`).join("");n.innerHTML=`
            ${_("/admin/articles",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${s||""}">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("標題（中）","Title (ZH)"))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${t(e("標題（英）","Title (EN)"))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div><label class="text-sm font-medium">${t(e("內容（中，Markdown）","Body (ZH, Markdown)"))}</label><textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
                <div><label class="text-sm font-medium">${t(e("內容（英，Markdown）","Body (EN, Markdown)"))}</label><textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("科目","Subject"))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${m}</select></div>
                    <div><label class="text-sm font-medium">${t(e("單元","Topic"))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${t(e("閱讀時間（分鐘）","Reading time (min)"))}</label><input type="number" id="reading-time" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("狀態","Status"))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${z(!0,!0)}</select></div>
                <div>
                    <div class="flex justify-between mb-2">
                        <label class="text-sm font-medium">${t(e("閱讀理解題（選填）","Comprehension questions"))}</label>
                        <button type="button" id="add-q" class="text-sm text-brand-600">+ ${t(e("新增","Add"))}</button>
                    </div>
                    <div id="questions"></div>
                </div>
                <button type="submit" class="w-full bg-brand-600 text-white py-2 rounded-lg">${t(e("儲存","Save"))}</button>
            </form>`,w(n);const E=document.getElementById("questions");document.getElementById("add-q").onclick=()=>R(q(),E.children.length,E),d.forEach((g,p)=>R(g,p,E));const x=document.getElementById("subject-id"),v=document.getElementById("topic-id");k(x,v,r,o&&o.subject_id,o&&o.topic_id),o&&(document.getElementById("title-zh").value=o.title_zh||"",document.getElementById("title-en").value=o.title_en||"",document.getElementById("slug").value=o.slug||"",document.getElementById("body-zh").value=o.body_zh||"",document.getElementById("body-en").value=o.body_en||"",document.getElementById("status").value=o.status||"draft",document.getElementById("reading-time").value=o.reading_time_minutes||""),document.getElementById("edit-form").onsubmit=async g=>{g.preventDefault();const p={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,body_zh:document.getElementById("body-zh").value,body_en:document.getElementById("body-en").value,subject_id:document.getElementById("subject-id").value||null,topic_id:document.getElementById("topic-id").value||null,reading_time_minutes:document.getElementById("reading-time").value||null,status:document.getElementById("status").value,questions:U(E)};try{await a.ScienceApi.apiFetch("/admin/articles",{method:"POST",body:p}),a.AppRouter.navigate("/admin/articles")}catch(I){h(I.message||e("儲存失敗","Save failed"))}}}async function V(l){S();const i=document.getElementById("page-title"),n=document.getElementById("card-container"),s=l?Number(l):0,r=a.ScienceApi.hasPermission("learning_note.manage_any"),c=a.ScienceApi.hasPermission("question_bank.manage_any")||a.ScienceApi.hasPermission("question_bank.manage_own");if(i&&(i.textContent=s?e("編輯學習筆記","Edit note"):e("新增學習筆記","New note")),!A("learning_note.manage_any","learning_note.manage_own")){a.ScienceApi.getUser()&&(n.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}n.innerHTML=`${_("/admin/learning-notes",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,w(n);let o={},d=[],m=null;try{const p=await j();if(d=p.subjects,o=p.topicsBySubject,s&&(m=await L("/admin/learning-notes",s),!m))throw new Error(e("找不到筆記。","Note not found."))}catch(p){n.innerHTML=`${_("/admin/learning-notes",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(p.message)}</p>`,w(n);return}const E=d.map(p=>`<option value="${Number(p.id)}">${t(p.name_zh||p.name_en)}</option>`).join("");if(n.innerHTML=`
            ${_("/admin/learning-notes",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
                <input type="hidden" id="item-id" value="${s||""}">
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
                        ${c?`<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-brand-300 text-brand-700 hover:bg-brand-50">+ ${t(e("題庫題目","Question"))}</button>`:""}
                    </div>
                    <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                    <p class="text-xs text-slate-500 mt-1">${t(e("可用 ::video / ::simulation / ::question 短碼嵌入內容；亦可用上方按鈕插入。","Use ::video / ::simulation / ::question shortcodes, or the buttons above."))}</p>
                </div>
                <div>
                    <label class="text-sm font-medium">${t(e("內容（英，Markdown）","Body (EN, Markdown)"))}</label>
                    <div class="flex flex-wrap gap-2 mb-1">
                        <button type="button" data-content-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Video</button>
                        <button type="button" data-content-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Sim</button>
                        ${c?'<button type="button" data-content-embed="question" class="text-xs px-2 py-1 rounded border border-brand-300 text-brand-700 hover:bg-brand-50">+ Question</button>':""}
                    </div>
                    <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("科目","Subject"))}</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>${E}</select></div>
                    <div><label class="text-sm font-medium">${t(e("單元","Topic"))}</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
                </div>
                <div><label class="text-sm font-medium">${t(e("閱讀時間（分鐘）","Reading time (min)"))}</label><input type="number" id="reading-time" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("排序","Sort order"))}</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">${t(e("狀態","Status"))}</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">${z(!0,r)}</select></div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-brand-600 text-white py-2 rounded-lg">${t(e("儲存","Save"))}</button>
                    ${s?`<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">${t(e("刪除","Delete"))}</button>`:""}
                </div>
            </form>`,w(n),a.AdminContentEmbed){const p=c?["video","simulation","question"]:["video","simulation"];a.AdminContentEmbed.init(["body-zh","body-en"],{tabs:p})}const x=document.getElementById("subject-id"),v=document.getElementById("topic-id");k(x,v,o,m&&m.subject_id,m&&m.topic_id),m&&(document.getElementById("title-zh").value=m.title_zh||"",document.getElementById("title-en").value=m.title_en||"",document.getElementById("slug").value=m.slug||"",document.getElementById("body-zh").value=m.body_zh||"",document.getElementById("body-en").value=m.body_en||"",document.getElementById("status").value=m.status||"draft",document.getElementById("reading-time").value=m.reading_time_minutes||"",document.getElementById("list-sort").value=m.list_sort_order||0),document.getElementById("edit-form").onsubmit=async p=>{p.preventDefault();const I={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,body_zh:document.getElementById("body-zh").value,body_en:document.getElementById("body-en").value,subject_id:document.getElementById("subject-id").value||null,topic_id:document.getElementById("topic-id").value||null,reading_time_minutes:document.getElementById("reading-time").value||null,list_sort_order:parseInt(document.getElementById("list-sort").value,10)||0,status:document.getElementById("status").value};try{await a.ScienceApi.apiFetch("/admin/learning-notes",{method:"POST",body:I}),a.AppRouter.navigate("/admin/learning-notes")}catch(b){h(b.message||e("儲存失敗","Save failed"))}};const g=document.getElementById("btn-delete");g&&(g.onclick=async()=>{if(confirm(e("確定刪除此學習筆記？","Delete this note?")))try{await a.ScienceApi.apiFetch("/admin/learning-notes",{method:"DELETE",body:{id:s}}),a.AppRouter.navigate("/admin/learning-notes")}catch(p){h(p.message||e("刪除失敗","Delete failed"))}})}async function G(l){S();const i=document.getElementById("page-title"),n=document.getElementById("card-container"),s=l?Number(l):0,r=a.ScienceApi.hasPermission("simulation.manage_any");if(i&&(i.textContent=s?e("編輯模擬","Edit simulation"):e("新增模擬","New simulation")),!A("simulation.manage_any","simulation.manage_own")){a.ScienceApi.getUser()&&(n.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`);return}n.innerHTML=`${_("/admin/simulations",e("← 返回列表","← Back to list"))}<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`,w(n);let c={},o=[],d=null,m=[];try{const u=await j();if(o=u.subjects,c=u.topicsBySubject,s&&(d=await a.ScienceApi.apiFetch("/admin/simulations?id="+s),!d||!d.id))throw new Error(e("找不到模擬。","Simulation not found."));if(r)try{const y=await a.ScienceApi.apiFetch("/admin/simulations?assignable_owners=1");m=Array.isArray(y)?y:[]}catch{m=[]}}catch(u){n.innerHTML=`${_("/admin/simulations",e("← 返回列表","← Back to list"))}<p class="text-red-600">${t(u.message)}</p>`,w(n);return}const E=a.ScienceApi.getUser(),x=d?d.owner_user_id:E&&E.id;x&&!m.some(u=>Number(u.id)===Number(x))&&(m=[{id:x,email:"",display_name:"#"+x}].concat(m));const v=Array.isArray(d&&d.tags)?d.tags.join(", "):"",g=o.map(u=>`<option value="${Number(u.id)}">${t((u.name_zh||"")+" / "+(u.name_en||""))}</option>`).join(""),p=m.map(u=>`<option value="${Number(u.id)}" ${Number(u.id)===Number(x)?"selected":""}>${t((u.email||"")+" — "+(u.display_name||""))}</option>`).join(""),I="allow-scripts allow-forms allow-popups allow-modals allow-downloads";n.innerHTML=`
            ${_("/admin/simulations",e("← 返回列表","← Back to list"))}
            <form id="edit-form" class="space-y-6">
                <input type="hidden" name="id" value="${s||0}">
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
                    ${r?`<div><label class="block text-sm font-medium text-slate-700">${t(e("擁有者","Owner"))}</label><select name="owner_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">${p}</select><p class="mt-1 text-xs text-slate-500">${t(e("僅可指定管理員或教師。","Admins or teachers only."))}</p></div>`:""}
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
                <button type="submit" class="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">${t(e("儲存","Save"))}</button>
            </form>`,w(n);const b=document.getElementById("edit-form"),F=document.getElementById("field-subject"),C=document.getElementById("field-topic"),H=document.getElementById("field-html"),N=document.getElementById("sim-edit-preview");k(F,C,c,d&&d.subject_id,d&&d.topic_id);function T(){if(!N)return;const u=new Blob([H.value||""],{type:"text/html"}),y=URL.createObjectURL(u);N.src=y,setTimeout(()=>URL.revokeObjectURL(y),6e4)}d&&(b.title_zh.value=d.title_zh||"",b.title_en.value=d.title_en||"",b.summary_zh.value=d.summary_zh||"",b.summary_en.value=d.summary_en||"",b.slug.value=d.slug||"",b.list_sort_order.value=d.list_sort_order||0,b.tags.value=v,b.screenshot_path.value=d.screenshot_path||"",b.status.value=d.status||"draft",b.html.value=d.html||"",b.submitter_note.value=d.submitter_note||""),T(),document.getElementById("btn-preview-html").onclick=()=>T(),document.getElementById("btn-load-html").onclick=async()=>{const u=document.getElementById("html-file"),y=u&&u.files&&u.files[0];if(!y){h(e("請先選擇 HTML 檔。","Choose an HTML file first."));return}try{const f=new FormData;f.append("file",y);const $=await a.ScienceApi.apiFetch("/admin/simulations/upload-html",{method:"POST",body:f});H.value=$.html||"",!b.title_zh.value&&!b.title_en.value&&$.suggested_title&&(b.title_zh.value=$.suggested_title,b.title_en.value=$.suggested_title),T(),h(e("已載入 HTML。","HTML loaded."))}catch(f){h(f.message||e("上載失敗","Upload failed"))}},document.getElementById("btn-upload-screenshot").onclick=async()=>{const u=document.getElementById("screenshot-file"),y=u&&u.files&&u.files[0];if(!y){h(e("請先選擇截圖檔。","Choose a screenshot first."));return}try{const f=new FormData;f.append("file",y);const $=await a.ScienceApi.apiFetch("/admin/simulations/upload-screenshot",{method:"POST",body:f});b.screenshot_path.value=$.path||"",h(e("截圖已上載。","Screenshot uploaded."))}catch(f){h(f.message||e("上載失敗","Upload failed"))}},b.addEventListener("submit",async u=>{u.preventDefault();const y=new FormData(b),f={};y.forEach(($,D)=>{f[D]=$}),f.id=s||parseInt(f.id||"0",10)||0;try{await a.ScienceApi.apiFetch("/admin/simulations",{method:"POST",body:f}),a.AppRouter.navigate("/admin/simulations")}catch($){h($.message||e("儲存失敗","Save failed"))}})}Object.assign(a.AppAdmin||(a.AppAdmin={}),{renderAdminLearningVideoEdit:Z,renderAdminArticleEdit:Q,renderAdminLearningNoteEdit:V,renderAdminSimulationEdit:G});
