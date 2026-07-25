const o=window;function e(s,l){return o.AppRouter&&o.AppRouter.t?o.AppRouter.t(s,l):s}function t(s){return o.AppRouter&&o.AppRouter.escapeHtml?o.AppRouter.escapeHtml(s):String(s||"")}function v(s){return o.AppRouter&&o.AppRouter.spaHref?o.AppRouter.spaHref(s):String(s||"")}function f(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function h(s){s.querySelectorAll("[data-spa-nav]").forEach(l=>{l.addEventListener("click",i=>{i.preventDefault(),o.AppRouter.navigate(l.getAttribute("data-spa-nav"))})})}function y(){const s=o.ScienceApi;return s.hasPermission("summer_homework.manage_any")||s.hasPermission("summer_homework.manage_own")}function w(s){return{mcq:e("選擇","MCQ"),multi_select:e("多選","Multi"),fill_blank:e("填充","Fill"),true_false:e("是非","T/F"),short_answer:e("短答","Short"),long_answer:e("長答","Long")}[s]||s}function x(s,l){if(o.AppAdminSummerQBuilder&&o.AppAdminSummerQBuilder.insertAtCursor){o.AppAdminSummerQBuilder.insertAtCursor(s,l);return}const i=s.selectionStart??s.value.length,d=s.selectionEnd??i,n=s.value;s.value=n.slice(0,i)+l+n.slice(d),s.selectionStart=s.selectionEnd=i+l.length,s.focus()}async function $(s,l){const i=new FormData;return i.append("file",l),o.ScienceApi.apiFetch("/admin/summer-homework/"+s+"/media",{method:"POST",body:i})}function _(s){s.querySelectorAll("[data-md-toolbar]").forEach(i=>{const d=i.getAttribute("data-md-toolbar"),n=document.getElementById(d);n&&i.querySelectorAll("[data-md-action]").forEach(a=>{a.addEventListener("click",async()=>{var m;const c=a.getAttribute("data-md-action");if(c==="bold")x(n,"**粗體**");else if(c==="ul")x(n,`
- 項目一
- 項目二
`);else if(c==="math")x(n,"$E=mc^2$");else if(c==="video")x(n,`
::video slug="your-video-slug"
`);else if(c==="article")x(n,`
::article slug="your-article-slug"
`);else if(c==="note")x(n,`
::note slug="your-note-slug"
`);else if(c==="image"){const r=parseInt(((m=document.getElementById("item-id"))==null?void 0:m.value)||"0",10);if(!r){alert(e("請先儲存習作後再上載圖片。","Save the item first, then upload images."));return}const u=document.createElement("input");u.type="file",u.accept="image/jpeg,image/png,image/gif,image/webp",u.onchange=async()=>{const p=u.files&&u.files[0];if(p)try{const b=await $(r,p);x(n,(b.markdown||`![${p.name}](${b.url||""})`)+`
`)}catch(b){alert(b.message||e("上載失敗","Upload failed"))}},u.click()}})})}),s.querySelectorAll("[data-md-preview]").forEach(i=>{i.addEventListener("click",async()=>{const d=i.getAttribute("data-md-preview"),n=document.getElementById(d),a=document.getElementById(d+"-preview");if(!n||!a)return;a.classList.remove("hidden");const c=n.value||"";let m=o.AppMarkdown&&o.AppMarkdown.renderMarkdownToHtml?o.AppMarkdown.renderMarkdownToHtml(c):t(c).replace(/\n/g,"<br>");a.innerHTML=m,o.AppContentEmbeds&&o.AppContentEmbeds.hydrate&&await o.AppContentEmbeds.hydrate(a),o.MathJax&&o.MathJax.typesetPromise&&o.MathJax.typesetPromise([a]).catch(()=>{})})})}function I(s){var c;const l=document.getElementById("content-refs-list"),i=document.getElementById("content-refs-json");if(!l||!i)return;function d(){try{const m=i.value.trim(),r=m?JSON.parse(m):[];return Array.isArray(r)?r:[]}catch{return[]}}function n(m){i.value=JSON.stringify(m,null,2),a()}function a(){const m=d();if(!m.length){l.innerHTML=`<p class="text-xs text-slate-500">${t(e("尚未引用平台內容。","No content references yet."))}</p>`;return}l.innerHTML=m.map((r,u)=>`<div class="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 bg-slate-50">
                <span class="font-mono text-xs px-1.5 py-0.5 rounded bg-white border">${t(r.type||"")}</span>
                <span class="flex-1 font-mono text-xs truncate">${t(r.slug||"")}</span>
                <button type="button" class="text-xs text-red-600" data-ref-rm="${u}">×</button>
            </div>`).join(""),l.querySelectorAll("[data-ref-rm]").forEach(r=>{r.addEventListener("click",()=>{const u=d();u.splice(parseInt(r.getAttribute("data-ref-rm"),10),1),n(u)})})}(c=document.getElementById("content-ref-add"))==null||c.addEventListener("click",()=>{var b,g;const m=((b=document.getElementById("content-ref-type"))==null?void 0:b.value)||"note",r=(((g=document.getElementById("content-ref-slug"))==null?void 0:g.value)||"").trim();if(!r){alert(e("請輸入 slug","Enter a slug"));return}const u=d();u.push({type:m,slug:r}),n(u);const p=document.getElementById("content-ref-slug");p&&(p.value="")}),a()}function E(){var i,d;const s=document.getElementById("sh-import-qb"),l=document.getElementById("sh-import-dialog");!s||!l||(s.addEventListener("click",()=>{var a;if(!parseInt(((a=document.getElementById("item-id"))==null?void 0:a.value)||"0",10)){alert(e("請先儲存習作後再匯入題目。","Save the item first, then import questions."));return}l.classList.remove("hidden")}),(i=document.getElementById("sh-import-cancel"))==null||i.addEventListener("click",()=>{l.classList.add("hidden")}),(d=document.getElementById("sh-import-run"))==null||d.addEventListener("click",async()=>{var u,p,b;const n=parseInt(((u=document.getElementById("item-id"))==null?void 0:u.value)||"0",10),a=parseInt(((p=document.getElementById("sh-import-bank"))==null?void 0:p.value)||"0",10),m=(((b=document.getElementById("sh-import-qids"))==null?void 0:b.value)||"").trim().split(/[\s,]+/).map(g=>parseInt(g,10)).filter(g=>g>0);if(!n||!a||!m.length){alert(e("請填寫試題庫 ID 與題目 ID。","Provide bank id and question ids."));return}const r=document.getElementById("edit-flash");try{const g=await o.ScienceApi.apiFetch("/admin/summer-homework/"+n+"/import-questions",{method:"POST",body:{bank_id:a,question_ids:m}});l.classList.add("hidden"),r&&(r.textContent=e(`已匯入 ${g.imported||m.length} 題。`,`Imported ${g.imported||m.length} questions.`),r.classList.remove("hidden","text-red-600"),r.classList.add("text-emerald-700")),o.AppRouter.navigate("/admin/summer-homework/"+n+"/edit")}catch(g){alert(g.message||e("匯入失敗","Import failed"))}}))}function k(s){return{draft:e("草稿","Draft"),pending_review:e("待審核","Pending"),published:e("已發佈","Published")}[s]||s||"—"}function A(s,l){const i=s.stem_zh||s.stem_en||"",d=s.question_type||"";let n="";if(d==="mcq"||d==="multi_select")n=`<ul class="text-sm space-y-1.5">${(s.options||[]).map((a,c)=>{const m=String.fromCharCode(65+c),r=a.text_zh||a.text_en||"",u=a.is_correct===!0||a.is_correct===1||a.is_correct==="1";return`<li class="${u?"text-emerald-800 font-medium":"text-slate-700"}">
                    <span class="font-bold text-indigo-600 mr-1">${m}</span>${t(r)}
                    ${u?`<span class="text-xs text-emerald-700 ml-1">✓ ${t(e("正確答案","Correct"))}</span>`:""}
                </li>`}).join("")}</ul>`;else if(d==="true_false"){const a=s.correct_bool===!0||s.correct_bool===1||s.correct_bool==="1";n=`<p class="text-sm text-emerald-800 font-medium">${t(e("正確答案：","Answer: "))}${t(a?e("是","True"):e("否","False"))}</p>`}else d==="short_answer"?n=`<ul class="text-sm space-y-1">${(s.acceptable_answers||[]).map(a=>!a||typeof a!="object"?"":`<li class="font-mono text-emerald-800">${t(a.acceptable_answer_zh||"")} / ${t(a.acceptable_answer_en||"")}</li>`).join("")}</ul>`:d==="long_answer"?(n=`<p class="text-sm text-slate-600">${t(e("滿分","Max"))} ${t(String(s.max_score??5))}（${t(e("教師評閱","Teacher-marked"))}）</p>`,(s.rubric_zh||s.rubric_en)&&(n+=`<div class="mt-2 text-xs text-slate-600 space-y-1">
                    ${s.rubric_zh?`<p><span class="text-slate-400">${t(e("評分指引（中）：","Rubric ZH: "))}</span>${t(s.rubric_zh)}</p>`:""}
                    ${s.rubric_en?`<p><span class="text-slate-400">${t(e("評分指引（英）：","Rubric EN: "))}</span>${t(s.rubric_en)}</p>`:""}
                </div>`)):n=(s.blanks||[]).map((a,c)=>{const m=a.acceptable_answers||[];return`<div class="text-sm mb-2">
                    <span class="text-slate-500">${t(e("空格","Blank"))} ${c+1}：</span>
                    ${m.map(r=>`<span class="font-mono text-emerald-800 mr-2">${t((r.acceptable_answer_zh||"")+" / "+(r.acceptable_answer_en||""))}</span>`).join("")}
                </div>`}).join("");return`<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p class="font-medium text-slate-900 mb-3">
                ${l+1}.
                <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mr-1">${t(w(d))}</span>
                ${t(i)}
            </p>
            ${n}
        </div>`}async function S(s){f();const l=document.getElementById("page-title"),i=document.getElementById("card-container"),d=s?Number(s):0;if(l&&(l.textContent=d?e("編輯暑期功課","Edit summer homework"):e("新增暑期功課","New summer homework")),!o.ScienceApi.getUser()){o.AppRouter.navigate("/login");return}if(!y()){i.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`;return}if(d)try{if((await o.ScienceApi.apiFetch("/admin/summer-homework/"+d)).can_manage===!1){o.AppRouter.navigate("/admin/summer-homework/"+d+"/view");return}}catch(c){i.innerHTML=`<p class="text-red-600">${t(c.message||e("載入失敗","Load failed"))}</p>`;return}const n=Number(new URLSearchParams(location.search).get("regraded")||0);i.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(v("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${t(e("← 返回列表","← Back to list"))}</a>
                ${d?`<a href="${t(v("/admin/summer-homework/"+d+"/view"))}" data-spa-nav="/admin/summer-homework/${d}/view" class="text-slate-600 hover:underline">${t(e("內容／答案","Content / answers"))}</a>`:""}
                ${d?`<a href="${t(v("/admin/summer-homework/"+d+"/analytics"))}" data-spa-nav="/admin/summer-homework/${d}/analytics" class="text-slate-600 hover:underline">${t(e("呈交分析","Analytics"))}</a>`:""}
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3 ${n>0?"text-emerald-700":""}">${n>0?t(e(`已儲存，並依最新答案重算 ${n} 筆呈交分數。`,`Saved; regraded ${n} attempts.`)):""}</p>
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6 shadow-sm">
                <input type="hidden" id="item-id" value="${d||""}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="text-sm font-medium">${t(e("標題（中）","Title (ZH)"))}</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1" required></div>
                    <div><label class="text-sm font-medium">${t(e("標題（英）","Title (EN)"))}</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label class="text-sm font-medium">slug（${t(e("選填","optional"))}）</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                    <div><label class="text-sm font-medium">${t(e("級別","Level"))}</label>
                        <select id="form-level" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="1">${t(e("中一 (S1)","S1"))}</option>
                            <option value="2">${t(e("中二 (S2)","S2"))}</option>
                        </select>
                    </div>
                    <div><label class="text-sm font-medium">${t(e("內容類型","Content type"))}</label>
                        <select id="content-type" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="passage">${t(e("閱讀篇章","Passage"))}</option>
                            <option value="video">${t(e("影片","Video"))}</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label class="text-sm font-medium">${t(e("及格百分比","Pass %"))}</label><input type="number" id="pass-percent" min="1" max="100" step="1" value="80" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${t(e("排序","Sort"))}</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                    <div><label class="text-sm font-medium">${t(e("狀態","Status"))}</label>
                        <select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="draft">${t(e("草稿","Draft"))}</option>
                            <option value="pending_review">${t(e("待審核","Pending review"))}</option>
                            <option value="published">${t(e("已發佈","Published"))}</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm font-medium">${t(e("呈交截止日期","Due date"))}</label>
                        <input type="datetime-local" id="due-at" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <p class="text-xs text-slate-500 mt-1">${t(e("留空表示不設截止。時區：香港","Leave empty for no deadline. Timezone: Hong Kong"))}</p>
                    </div>
                    <div class="flex items-end pb-1">
                        <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" id="allow-late" value="1" checked class="rounded border-slate-300 text-indigo-600">
                            ${t(e("截止後仍允許呈交（遲交）","Allow late submit"))}
                        </label>
                    </div>
                </div>
                <div class="border rounded-xl p-4 bg-slate-50/80 space-y-3">
                    <div class="flex flex-wrap justify-between items-center gap-2">
                        <label class="text-sm font-medium">${t(e("引用平台內容","Cite platform content"))}</label>
                        <p class="text-xs text-slate-500">${t(e("學生頁會先顯示引用，再顯示下方 Markdown。","Refs render before the Markdown body."))}</p>
                    </div>
                    <textarea id="content-refs-json" class="hidden" aria-hidden="true">[]</textarea>
                    <div id="content-refs-list" class="space-y-2"></div>
                    <div class="flex flex-wrap gap-2 items-end">
                        <div>
                            <label class="text-xs text-slate-500">type</label>
                            <select id="content-ref-type" class="block border rounded-lg px-2 py-1.5 text-sm mt-0.5">
                                <option value="note">${t(e("筆記","Note"))}</option>
                                <option value="article">${t(e("文章","Article"))}</option>
                                <option value="video">${t(e("影片","Video"))}</option>
                            </select>
                        </div>
                        <div class="flex-1 min-w-[10rem]">
                            <label class="text-xs text-slate-500">slug</label>
                            <input id="content-ref-slug" class="w-full border rounded-lg px-2 py-1.5 text-sm mt-0.5 font-mono" placeholder="slug">
                        </div>
                        <button type="button" id="content-ref-add" class="px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-slate-50">${t(e("加入引用","Add ref"))}</button>
                    </div>
                </div>
                <div id="passage-fields" class="space-y-3">
                    <div>
                        <label class="text-sm font-medium">${t(e("篇章（中，Markdown）","Passage (ZH, Markdown)"))}</label>
                        <div class="flex flex-wrap gap-1 mt-1 mb-1" data-md-toolbar="body-zh">
                            <button type="button" data-md-action="bold" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("粗體","Bold"))}</button>
                            <button type="button" data-md-action="ul" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("清單","List"))}</button>
                            <button type="button" data-md-action="math" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("公式","Math"))}</button>
                            <button type="button" data-md-action="image" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("插入圖片","Image"))}</button>
                            <button type="button" data-md-action="video" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">::video</button>
                            <button type="button" data-md-action="article" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">::article</button>
                            <button type="button" data-md-action="note" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">::note</button>
                            <button type="button" data-md-preview="body-zh" class="text-xs px-2 py-1 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">${t(e("預覽","Preview"))}</button>
                        </div>
                        <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" rows="6"></textarea>
                        <div id="body-zh-preview" class="hidden mt-2 p-4 border rounded-lg bg-white prose-article text-sm"></div>
                    </div>
                    <div>
                        <label class="text-sm font-medium">${t(e("篇章（英，Markdown）","Passage (EN, Markdown)"))}</label>
                        <div class="flex flex-wrap gap-1 mt-1 mb-1" data-md-toolbar="body-en">
                            <button type="button" data-md-action="bold" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("粗體","Bold"))}</button>
                            <button type="button" data-md-action="ul" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("清單","List"))}</button>
                            <button type="button" data-md-action="math" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("公式","Math"))}</button>
                            <button type="button" data-md-action="image" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">${t(e("插入圖片","Image"))}</button>
                            <button type="button" data-md-action="note" class="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">::note</button>
                            <button type="button" data-md-preview="body-en" class="text-xs px-2 py-1 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">${t(e("預覽","Preview"))}</button>
                        </div>
                        <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" rows="6"></textarea>
                        <div id="body-en-preview" class="hidden mt-2 p-4 border rounded-lg bg-white prose-article text-sm"></div>
                    </div>
                </div>
                <div id="video-fields" class="space-y-3 hidden">
                    <div><label class="text-sm font-medium">${t(e("影片嵌入 URL","Video embed URL"))}</label><input id="video-url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/embed/..."></div>
                    <div><label class="text-sm font-medium">${t(e("平台","Provider"))}</label>
                        <select id="video-provider" class="w-full border rounded-lg px-3 py-2 mt-1">
                            <option value="youtube">YouTube</option>
                            <option value="vimeo">Vimeo</option>
                            <option value="other">${t(e("其他","Other"))}</option>
                        </select>
                    </div>
                </div>
                <div>
                    <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
                        <label class="text-sm font-medium">${t(e("跟進題目","Follow-up questions"))}</label>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                            <button type="button" id="sh-toggle-en" class="text-sm text-slate-600">${t(e("展開英文欄","Show EN fields"))}</button>
                            <button type="button" id="sh-import-qb" class="text-sm text-slate-600">${t(e("從試題庫匯入","Import from bank"))}</button>
                            <button type="button" id="add-mcq" class="text-sm text-indigo-600">+ ${t(e("選擇題","MCQ"))}</button>
                            <button type="button" id="add-multi" class="text-sm text-indigo-600">+ ${t(e("多選題","Multi"))}</button>
                            <button type="button" id="add-fill" class="text-sm text-indigo-600">+ ${t(e("填充題","Fill"))}</button>
                            <button type="button" id="add-tf" class="text-sm text-indigo-600">+ ${t(e("是非題","T/F"))}</button>
                            <button type="button" id="add-short" class="text-sm text-indigo-600">+ ${t(e("短答題","Short"))}</button>
                            <button type="button" id="add-long" class="text-sm text-indigo-600">+ ${t(e("長答題","Long"))}</button>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mb-2">${t(e("題幹與選項可用 $...$／$$...$$ 寫公式；可用 ↑↓ 重排、下拉換型。","Math with $...$; reorder with ↑↓; change type via dropdown."))}</p>
                    <div id="questions" class="space-y-4"></div>
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium">${t(e("儲存","Save"))}</button>
            </form>
            <div id="sh-import-dialog" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-3">
                    <h3 class="font-bold text-slate-900">${t(e("從試題庫匯入","Import from question bank"))}</h3>
                    <div>
                        <label class="text-xs text-slate-500">${t(e("試題庫 ID","Bank ID"))}</label>
                        <input id="sh-import-bank" type="number" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm" min="1">
                    </div>
                    <div>
                        <label class="text-xs text-slate-500">${t(e("題目 ID（逗號或空白分隔）","Question IDs (comma/space separated)"))}</label>
                        <input id="sh-import-qids" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm font-mono" placeholder="12, 15, 18">
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" id="sh-import-cancel" class="px-3 py-1.5 text-sm border rounded-lg">${t(e("取消","Cancel"))}</button>
                        <button type="button" id="sh-import-run" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg">${t(e("匯入","Import"))}</button>
                    </div>
                </div>
            </div>`,h(i),_(i),I(),E();const a=document.getElementById("edit-flash");n>0&&a.classList.remove("hidden");try{await o.AppAdminSummerQBuilder.mount({editId:d,onError:c=>{a.textContent=c.message||e("載入失敗","Load failed"),a.classList.remove("hidden"),a.classList.add("text-red-600")}}),o.AppAdminSummerQBuilder.bindSubmit(),document.getElementById("edit-form").onsubmit=async c=>{c.preventDefault();const m=o.AppAdminSummerQBuilder,r={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,form_level:document.getElementById("form-level").value,content_type:document.getElementById("content-type").value,pass_percent:parseFloat(document.getElementById("pass-percent").value)||80,due_at:document.getElementById("due-at").value||"",allow_late_submit:document.getElementById("allow-late").checked?1:0,list_sort_order:parseInt(document.getElementById("list-sort").value,10)||0,status:document.getElementById("status").value,body_zh:document.getElementById("body-zh").value,body_en:document.getElementById("body-en").value,video_embed_url:document.getElementById("video-url").value,video_provider:document.getElementById("video-provider").value,questions:m.collectQuestions()},u=document.getElementById("content-refs-json");if(u)try{r.content_refs=u.value.trim()?JSON.parse(u.value):[]}catch{a.textContent=e("內容引用 JSON 格式錯誤","Invalid content_refs JSON"),a.classList.remove("hidden","text-emerald-700"),a.classList.add("text-red-600");return}try{const p=await o.ScienceApi.apiFetch("/admin/summer-homework",{method:"POST",body:r}),b=parseInt(p.regraded_attempts||"0",10)||0,g="/admin/summer-homework/"+p.id+"/edit"+(b>0?"?regraded="+b:"");o.AppRouter.navigate("/admin/summer-homework/"+p.id+"/edit"),b>0?(history.replaceState({},"",v(g).replace(/^\.\//,"")||location.pathname+"?regraded="+b),a.textContent=e(`已儲存，並依最新答案重算 ${b} 筆呈交分數。`,`Saved; regraded ${b} attempts.`),a.classList.remove("hidden","text-red-600"),a.classList.add("text-emerald-700")):(a.textContent=e("已儲存。","Saved."),a.classList.remove("hidden","text-red-600"),a.classList.add("text-emerald-700")),document.getElementById("item-id").value=String(p.id)}catch(p){a.textContent=p.message||e("儲存失敗","Save failed"),a.classList.remove("hidden","text-emerald-700"),a.classList.add("text-red-600")}}}catch(c){a.textContent=c.message||e("載入失敗","Load failed"),a.classList.remove("hidden"),a.classList.add("text-red-600")}}async function B(s){f();const l=document.getElementById("page-title"),i=document.getElementById("card-container"),d=Number(s||0);if(!d){o.AppRouter.navigate("/admin/summer-homework");return}if(!o.ScienceApi.getUser()){o.AppRouter.navigate("/login");return}i.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const n=await o.ScienceApi.apiFetch("/admin/summer-homework/"+d),a=String(n.form_level)==="2"?e("中二","S2"):e("中一","S1"),c=n.content_type==="video"?e("影片","Video"):e("閱讀","Passage");l&&(l.textContent=e("檢視暑期功課","View summer homework")+" — "+(n.title_zh||n.title_en||""));const m=n.questions||[];let r="";n.content_type==="video"?r=`<dl class="text-sm space-y-2">
                    <div><dt class="text-slate-500">${t(e("影片嵌入 URL","Embed URL"))}</dt>
                    <dd class="font-mono break-all">${t(n.video_embed_url||"—")}</dd></div>
                </dl>`:r=`<div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div><h3 class="font-medium text-slate-700 mb-2">${t(e("篇章（中）","Passage (ZH)"))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${t(n.body_zh||"")}</pre></div>
                    <div><h3 class="font-medium text-slate-700 mb-2">${t(e("篇章（英）","Passage (EN)"))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${t(n.body_en||"")}</pre></div>
                </div>`,i.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                    <a href="${t(v("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${t(e("← 返回列表","← Back to list"))}</a>
                    <a href="${t(v("/admin/summer-homework/"+d+"/analytics"))}" data-spa-nav="/admin/summer-homework/${d}/analytics" class="text-slate-600 hover:underline">${t(e("呈交分析","Analytics"))}</a>
                    ${n.can_manage?`<a href="${t(v("/admin/summer-homework/"+d+"/edit"))}" data-spa-nav="/admin/summer-homework/${d}/edit" class="text-indigo-700 font-medium hover:underline">${t(e("編輯","Edit"))}</a>`:""}
                </div>
                <p class="text-xs text-slate-500 mb-4">${t(a)} · ${t(c)} · ${t(k(n.status))} · ${t(e("含正確答案（教師／管理員檢視）","Includes answer key (staff view)"))}</p>
                <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-950 mb-6">
                    ${t(e("此頁顯示習作全文與正確答案，供教師／管理員檢視。學生前台不會看到答案鍵。","Full text and correct answers for staff. Students never see the answer key."))}
                </div>
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                    <h2 class="font-bold text-slate-800 mb-3">${t(e("內容","Content"))}</h2>
                    ${r}
                    <p class="text-xs text-slate-500 mt-4">
                        ${t(e("及格線","Pass"))} ${t(String(n.pass_percent))}%
                        · ${t(e("截止","Due"))} ${t(n.due_at||e("無","None"))}
                        · ${t(e("遲交","Late"))} ${n.due_at?n.allow_late_submit?e("允許","Allowed"):e("禁止","Blocked"):"—"}
                    </p>
                </div>
                <div class="space-y-4 mb-8">
                    <h2 class="font-bold text-slate-800">${t(e("題目與答案","Questions & answers"))}（${m.length}）</h2>
                    ${m.length?m.map((u,p)=>A(u,p)).join(""):`<p class="text-slate-500 text-sm">${t(e("尚無題目。","No questions yet."))}</p>`}
                </div>`,h(i)}catch(n){i.innerHTML=`<p class="text-red-600">${t(n.message||e("載入失敗","Load failed"))}</p>`}}Object.assign(o.AppAdmin||(o.AppAdmin={}),{renderAdminSummerHomeworkEdit:S,renderAdminSummerHomeworkView:B});
