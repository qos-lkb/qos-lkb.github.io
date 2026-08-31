import{_ as h}from"./index-DI4DzaH2.js";const d=window;function e(s,r){return d.AppRouter&&d.AppRouter.t?d.AppRouter.t(s,r):s}function t(s){return d.AppRouter&&d.AppRouter.escapeHtml?d.AppRouter.escapeHtml(s):String(s||"")}function v(s){return d.AppRouter&&d.AppRouter.spaHref?d.AppRouter.spaHref(s):String(s||"")}function y(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function w(s){s.querySelectorAll("[data-spa-nav]").forEach(r=>{r.addEventListener("click",i=>{i.preventDefault(),d.AppRouter.navigate(r.getAttribute("data-spa-nav"))})})}function $(){const s=d.ScienceApi;return s.hasPermission("summer_homework.manage_any")||s.hasPermission("summer_homework.manage_own")}function _(s){return{mcq:e("選擇","MCQ"),multi_select:e("多選","Multi"),fill_blank:e("填充","Fill"),true_false:e("是非","T/F"),short_answer:e("短答","Short"),long_answer:e("長答","Long")}[s]||s}function x(s,r){if(d.AppAdminSummerQBuilder&&d.AppAdminSummerQBuilder.insertAtCursor){d.AppAdminSummerQBuilder.insertAtCursor(s,r);return}const i=s.selectionStart??s.value.length,o=s.selectionEnd??i,a=s.value;s.value=a.slice(0,i)+r+a.slice(o),s.selectionStart=s.selectionEnd=i+r.length,s.focus()}async function E(s,r){const i=new FormData;return i.append("file",r),d.ScienceApi.apiFetch("/admin/summer-homework/"+s+"/media",{method:"POST",body:i})}function k(s){s.querySelectorAll("[data-md-toolbar]").forEach(i=>{const o=i.getAttribute("data-md-toolbar"),a=document.getElementById(o);a&&i.querySelectorAll("[data-md-action]").forEach(n=>{n.addEventListener("click",async()=>{var l;const m=n.getAttribute("data-md-action");if(m==="bold")x(a,"**粗體**");else if(m==="ul")x(a,`
- 項目一
- 項目二
`);else if(m==="math")x(a,"$E=mc^2$");else if(m==="video")x(a,`
::video slug="your-video-slug"
`);else if(m==="article")x(a,`
::article slug="your-article-slug"
`);else if(m==="note")x(a,`
::note slug="your-note-slug"
`);else if(m==="image"){const c=parseInt(((l=document.getElementById("item-id"))==null?void 0:l.value)||"0",10);if(!c){alert(e("請先儲存習作後再上載圖片。","Save the item first, then upload images."));return}const u=document.createElement("input");u.type="file",u.accept="image/jpeg,image/png,image/gif,image/webp",u.onchange=async()=>{const p=u.files&&u.files[0];if(p)try{const b=await E(c,p);x(a,(b.markdown||`![${p.name}](${b.url||""})`)+`
`)}catch(b){alert(b.message||e("上載失敗","Upload failed"))}},u.click()}})})}),s.querySelectorAll("[data-md-preview]").forEach(i=>{i.addEventListener("click",async()=>{const o=i.getAttribute("data-md-preview"),a=document.getElementById(o),n=document.getElementById(o+"-preview");if(!a||!n)return;n.classList.remove("hidden");const m=a.value||"";let l=d.AppMarkdown&&d.AppMarkdown.renderMarkdownToHtml?d.AppMarkdown.renderMarkdownToHtml(m):t(m).replace(/\n/g,"<br>");n.innerHTML=l,d.AppContentEmbeds&&d.AppContentEmbeds.hydrate&&await d.AppContentEmbeds.hydrate(n),d.MathJax&&d.MathJax.typesetPromise&&d.MathJax.typesetPromise([n]).catch(()=>{})})})}function I(s){var m;const r=document.getElementById("content-refs-list"),i=document.getElementById("content-refs-json");if(!r||!i)return;function o(){try{const l=i.value.trim(),c=l?JSON.parse(l):[];return Array.isArray(c)?c:[]}catch{return[]}}function a(l){i.value=JSON.stringify(l,null,2),n()}function n(){const l=o();if(!l.length){r.innerHTML=`<p class="text-xs text-slate-500">${t(e("尚未引用平台內容。","No content references yet."))}</p>`;return}r.innerHTML=l.map((c,u)=>`<div class="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 bg-slate-50">
                <span class="font-mono text-xs px-1.5 py-0.5 rounded bg-white border">${t(c.type||"")}</span>
                <span class="flex-1 font-mono text-xs truncate">${t(c.slug||"")}</span>
                <button type="button" class="text-xs text-red-600" data-ref-rm="${u}">×</button>
            </div>`).join(""),r.querySelectorAll("[data-ref-rm]").forEach(c=>{c.addEventListener("click",()=>{const u=o();u.splice(parseInt(c.getAttribute("data-ref-rm"),10),1),a(u)})})}(m=document.getElementById("content-ref-add"))==null||m.addEventListener("click",()=>{var b,g;const l=((b=document.getElementById("content-ref-type"))==null?void 0:b.value)||"note",c=(((g=document.getElementById("content-ref-slug"))==null?void 0:g.value)||"").trim();if(!c){alert(e("請輸入 slug","Enter a slug"));return}const u=o();u.push({type:l,slug:c}),a(u);const p=document.getElementById("content-ref-slug");p&&(p.value="")}),n()}function A(){var i,o;const s=document.getElementById("sh-import-qb"),r=document.getElementById("sh-import-dialog");!s||!r||(s.addEventListener("click",()=>{var n;if(!parseInt(((n=document.getElementById("item-id"))==null?void 0:n.value)||"0",10)){alert(e("請先儲存習作後再匯入題目。","Save the item first, then import questions."));return}r.classList.remove("hidden")}),(i=document.getElementById("sh-import-cancel"))==null||i.addEventListener("click",()=>{r.classList.add("hidden")}),(o=document.getElementById("sh-import-run"))==null||o.addEventListener("click",async()=>{var u,p,b;const a=parseInt(((u=document.getElementById("item-id"))==null?void 0:u.value)||"0",10),n=parseInt(((p=document.getElementById("sh-import-bank"))==null?void 0:p.value)||"0",10),l=(((b=document.getElementById("sh-import-qids"))==null?void 0:b.value)||"").trim().split(/[\s,]+/).map(g=>parseInt(g,10)).filter(g=>g>0);if(!a||!n||!l.length){alert(e("請填寫試題庫 ID 與題目 ID。","Provide bank id and question ids."));return}const c=document.getElementById("edit-flash");try{const g=await d.ScienceApi.apiFetch("/admin/summer-homework/"+a+"/import-questions",{method:"POST",body:{bank_id:n,question_ids:l}});r.classList.add("hidden"),c&&(c.textContent=e(`已匯入 ${g.imported||l.length} 題。`,`Imported ${g.imported||l.length} questions.`),c.classList.remove("hidden","text-red-600"),c.classList.add("text-emerald-700")),d.AppRouter.navigate("/admin/summer-homework/"+a+"/edit")}catch(g){alert(g.message||e("匯入失敗","Import failed"))}}))}function S(s){return{draft:e("草稿","Draft"),pending_review:e("待審核","Pending"),published:e("已發佈","Published")}[s]||s||"—"}function f(s,r,i,o){const a=String(s||"").trim(),n=String(r||"").trim();return!a&&!n?'<p class="text-sm text-slate-400">—</p>':`<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
                <p class="text-xs text-slate-400 mb-0.5">${t(i||e("中文","ZH"))}</p>
                <div class="text-slate-800 whitespace-pre-wrap">${t(a||"—")}</div>
            </div>
            <div>
                <p class="text-xs text-slate-400 mb-0.5">${t(o||e("英文","EN"))}</p>
                <div class="text-slate-800 whitespace-pre-wrap">${t(n||"—")}</div>
            </div>
        </div>`}function L(s,r){const i=s.question_type||"";let o="";if(i==="mcq"||i==="multi_select")o=`<ul class="text-sm space-y-3">${(s.options||[]).map((n,m)=>{const l=String.fromCharCode(65+m),c=n.is_correct===!0||n.is_correct===1||n.is_correct==="1";return`<li class="border rounded-lg p-3 ${c?"border-emerald-300 bg-emerald-50/60":"border-slate-100"}">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="font-bold text-indigo-600">${l}</span>
                        ${c?`<span class="text-xs text-emerald-700">✓ ${t(e("正確答案","Correct"))}</span>`:""}
                    </div>
                    ${f(n.text_zh,n.text_en,e("選項（中）","Option (ZH)"),e("選項（英）","Option (EN)"))}
                </li>`}).join("")}</ul>`;else if(i==="true_false"){const n=s.correct_bool===!0||s.correct_bool===1||s.correct_bool==="1";o=`<p class="text-sm text-emerald-800 font-medium">${t(e("正確答案：","Answer: "))}${t(n?e("是","True"):e("否","False"))}</p>`}else i==="short_answer"?(o=`<ul class="space-y-2">${(s.acceptable_answers||[]).map(n=>!n||typeof n!="object"?"":`<li class="border border-emerald-100 rounded-lg p-3 bg-emerald-50/40">${f(n.acceptable_answer_zh,n.acceptable_answer_en,e("可接受（中）","Acceptable (ZH)"),e("可接受（英）","Acceptable (EN)"))}</li>`).join("")}</ul>`,s.match_mode==="contains"&&(o=`<p class="text-xs text-slate-500 mb-2">${t(e("比對：含關鍵字","Match: contains"))}</p>`+o)):i==="long_answer"?(o=`<p class="text-sm text-slate-600 mb-2">${t(e("滿分","Max"))} ${t(String(s.max_score??5))}（${t(e("教師評閱","Teacher-marked"))}）</p>`,(s.rubric_zh||s.rubric_en)&&(o+=f(s.rubric_zh,s.rubric_en,e("評分指引（中）","Rubric (ZH)"),e("評分指引（英）","Rubric (EN)")))):o=(s.blanks||[]).map((n,m)=>{const c=(n.acceptable_answers||[]).map(u=>`<div class="border border-emerald-100 rounded-lg p-2 bg-emerald-50/40 mb-2">${f(u.acceptable_answer_zh,u.acceptable_answer_en)}</div>`).join("");return`<div class="mb-3">
                    <p class="text-xs font-semibold text-slate-600 mb-1">${t(e("空格","Blank"))} ${m+1}</p>
                    ${c||'<p class="text-sm text-slate-400">—</p>'}
                </div>`}).join("");let a="";return(s.explanation_zh||s.explanation_en)&&(a=`<div class="mt-4 pt-3 border-t border-slate-100">
                <p class="text-xs font-semibold text-slate-500 mb-2">${t(e("解釋","Explanation"))}</p>
                ${f(s.explanation_zh,s.explanation_en)}
            </div>`),`<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="font-semibold text-slate-900">${r+1}.</span>
                <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${t(_(i))}</span>
            </div>
            <div class="mb-4">
                <p class="text-xs font-semibold text-slate-500 mb-2">${t(e("題幹","Stem"))}</p>
                ${f(s.stem_zh,s.stem_en,e("題幹（中）","Stem (ZH)"),e("題幹（英）","Stem (EN)"))}
            </div>
            ${o}
            ${a}
        </div>`}async function B(s){y();const r=document.getElementById("page-title"),i=document.getElementById("card-container"),o=s?Number(s):0;if(r&&(r.textContent=o?e("編輯暑期功課","Edit summer homework"):e("新增暑期功課","New summer homework")),!d.ScienceApi.getUser()){d.AppRouter.navigate("/login");return}if(!$()){i.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`;return}if(o)try{if((await d.ScienceApi.apiFetch("/admin/summer-homework/"+o)).can_manage===!1){d.AppRouter.navigate("/admin/summer-homework/"+o+"/view");return}}catch(m){i.innerHTML=`<p class="text-red-600">${t(m.message||e("載入失敗","Load failed"))}</p>`;return}const a=Number(new URLSearchParams(location.search).get("regraded")||0);i.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(v("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${t(e("← 返回列表","← Back to list"))}</a>
                ${o?`<a href="${t(v("/admin/summer-homework/"+o+"/view"))}" data-spa-nav="/admin/summer-homework/${o}/view" class="text-slate-600 hover:underline">${t(e("內容／答案","Content / answers"))}</a>`:""}
                ${o?`<a href="${t(v("/admin/summer-homework/"+o+"/preview"))}" data-spa-nav="/admin/summer-homework/${o}/preview" class="text-indigo-700 font-medium hover:underline">${t(e("學生畫面預覽","Student preview"))}</a>`:""}
                ${o?`<a href="${t(v("/admin/summer-homework/"+o+"/analytics"))}" data-spa-nav="/admin/summer-homework/${o}/analytics" class="text-slate-600 hover:underline">${t(e("呈交分析","Analytics"))}</a>`:""}
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3 ${a>0?"text-emerald-700":""}">${a>0?t(e(`已儲存，並依最新答案重算 ${a} 筆呈交分數。`,`Saved; regraded ${a} attempts.`)):""}</p>
            <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6 shadow-sm">
                <input type="hidden" id="item-id" value="${o||""}">
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
                            <button type="button" id="sh-toggle-en" class="text-sm text-slate-600">${t(e("隱藏英文欄","Hide EN fields"))}</button>
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
            </div>`,w(i),k(i),I(),A();const n=document.getElementById("edit-flash");a>0&&n.classList.remove("hidden");try{await d.AppAdminSummerQBuilder.mount({editId:o,onError:m=>{n.textContent=m.message||e("載入失敗","Load failed"),n.classList.remove("hidden"),n.classList.add("text-red-600")}}),d.AppAdminSummerQBuilder.bindSubmit(),document.getElementById("edit-form").onsubmit=async m=>{m.preventDefault();const l=d.AppAdminSummerQBuilder,c={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,form_level:document.getElementById("form-level").value,content_type:document.getElementById("content-type").value,pass_percent:parseFloat(document.getElementById("pass-percent").value)||80,due_at:document.getElementById("due-at").value||"",allow_late_submit:document.getElementById("allow-late").checked?1:0,list_sort_order:parseInt(document.getElementById("list-sort").value,10)||0,status:document.getElementById("status").value,body_zh:document.getElementById("body-zh").value,body_en:document.getElementById("body-en").value,video_embed_url:document.getElementById("video-url").value,video_provider:document.getElementById("video-provider").value,questions:l.collectQuestions()},u=document.getElementById("content-refs-json");if(u)try{c.content_refs=u.value.trim()?JSON.parse(u.value):[]}catch{n.textContent=e("內容引用 JSON 格式錯誤","Invalid content_refs JSON"),n.classList.remove("hidden","text-emerald-700"),n.classList.add("text-red-600");return}try{const p=await d.ScienceApi.apiFetch("/admin/summer-homework",{method:"POST",body:c}),b=parseInt(p.regraded_attempts||"0",10)||0,g="/admin/summer-homework/"+p.id+"/edit"+(b>0?"?regraded="+b:"");d.AppRouter.navigate("/admin/summer-homework/"+p.id+"/edit"),b>0?(history.replaceState({},"",v(g).replace(/^\.\//,"")||location.pathname+"?regraded="+b),n.textContent=e(`已儲存，並依最新答案重算 ${b} 筆呈交分數。`,`Saved; regraded ${b} attempts.`),n.classList.remove("hidden","text-red-600"),n.classList.add("text-emerald-700")):(n.textContent=e("已儲存。","Saved."),n.classList.remove("hidden","text-red-600"),n.classList.add("text-emerald-700")),document.getElementById("item-id").value=String(p.id)}catch(p){n.textContent=p.message||e("儲存失敗","Save failed"),n.classList.remove("hidden","text-emerald-700"),n.classList.add("text-red-600")}}}catch(m){n.textContent=m.message||e("載入失敗","Load failed"),n.classList.remove("hidden"),n.classList.add("text-red-600")}}async function R(s){y();const r=document.getElementById("page-title"),i=document.getElementById("card-container"),o=Number(s||0);if(!o){d.AppRouter.navigate("/admin/summer-homework");return}if(!d.ScienceApi.getUser()){d.AppRouter.navigate("/login");return}i.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const a=await d.ScienceApi.apiFetch("/admin/summer-homework/"+o),n=String(a.form_level)==="2"?e("中二","S2"):e("中一","S1"),m=a.content_type==="video"?e("影片","Video"):e("閱讀","Passage");r&&(r.textContent=e("檢視暑期功課","View summer homework")+" — "+(a.title_zh||a.title_en||""));const l=a.questions||[];let c="";a.content_type==="video"?c=`<dl class="text-sm space-y-2">
                    <div><dt class="text-slate-500">${t(e("影片嵌入 URL","Embed URL"))}</dt>
                    <dd class="font-mono break-all">${t(a.video_embed_url||"—")}</dd></div>
                </dl>`:c=`<div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div><h3 class="font-medium text-slate-700 mb-2">${t(e("篇章（中）","Passage (ZH)"))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${t(a.body_zh||"")}</pre></div>
                    <div><h3 class="font-medium text-slate-700 mb-2">${t(e("篇章（英）","Passage (EN)"))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${t(a.body_en||"")}</pre></div>
                </div>`,i.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                    <a href="${t(v("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${t(e("← 返回列表","← Back to list"))}</a>
                    <a href="${t(v("/admin/summer-homework/"+o+"/analytics"))}" data-spa-nav="/admin/summer-homework/${o}/analytics" class="text-slate-600 hover:underline">${t(e("呈交分析","Analytics"))}</a>
                    <a href="${t(v("/admin/summer-homework/"+o+"/preview"))}" data-spa-nav="/admin/summer-homework/${o}/preview" class="text-indigo-700 font-medium hover:underline">${t(e("學生畫面預覽","Student preview"))}</a>
                    ${a.can_manage?`<a href="${t(v("/admin/summer-homework/"+o+"/edit"))}" data-spa-nav="/admin/summer-homework/${o}/edit" class="text-indigo-700 font-medium hover:underline">${t(e("編輯","Edit"))}</a>`:""}
                </div>
                <p class="text-xs text-slate-500 mb-4">${t(n)} · ${t(m)} · ${t(S(a.status))} · ${t(e("含正確答案（教師／管理員檢視）","Includes answer key (staff view)"))}</p>
                <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-950 mb-6">
                    ${t(e("此頁顯示習作全文與正確答案，供教師／管理員檢視。學生前台不會看到答案鍵。","Full text and correct answers for staff. Students never see the answer key."))}
                </div>
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                    <h2 class="font-bold text-slate-800 mb-3">${t(e("內容","Content"))}</h2>
                    ${c}
                    <p class="text-xs text-slate-500 mt-4">
                        ${t(e("及格線","Pass"))} ${t(String(a.pass_percent))}%
                        · ${t(e("截止","Due"))} ${t(a.due_at||e("無","None"))}
                        · ${t(e("遲交","Late"))} ${a.due_at?a.allow_late_submit?e("允許","Allowed"):e("禁止","Blocked"):"—"}
                    </p>
                </div>
                <div class="space-y-4 mb-8">
                    <h2 class="font-bold text-slate-800">${t(e("題目與答案","Questions & answers"))}（${l.length}）</h2>
                    ${l.length?l.map((u,p)=>L(u,p)).join(""):`<p class="text-slate-500 text-sm">${t(e("尚無題目。","No questions yet."))}</p>`}
                </div>`,w(i)}catch(a){i.innerHTML=`<p class="text-red-600">${t(a.message||e("載入失敗","Load failed"))}</p>`}}async function M(s){y();const r=document.getElementById("page-title"),i=document.getElementById("card-container"),o=Number(s||0);if(!o){d.AppRouter.navigate("/admin/summer-homework");return}if(!d.ScienceApi.getUser()){d.AppRouter.navigate("/login");return}r&&(r.textContent=e("預覽暑期功課","Preview summer homework")),i.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{await Promise.all([h(()=>import("./markdown-D3_y0rxP.js"),[],import.meta.url),h(()=>import("./content-embeds-BF_jUCgb.js"),[],import.meta.url),h(()=>import("./summer-homework-DDZhkV6T.js"),[],import.meta.url)]);const a=await d.ScienceApi.apiFetch("/admin/summer-homework/"+o),n=a.slug||String(o),m=Object.assign({},a,{include_answers:!1,can_review:!1,progress:null,submissions_closed:!1}),l=document.createElement("div");l.id="sh-admin-preview-root",i.innerHTML="",i.appendChild(l),await d.AppSummerHomework.renderItem(n,{root:l,item:m,preview:!0,forceLang:d.AppRouter.getLang?d.AppRouter.getLang():"zh",onBack:()=>d.AppRouter.navigate("/admin/summer-homework/"+o+"/edit")})}catch(a){i.innerHTML=`<p class="text-red-600">${t(a.message||e("載入失敗","Load failed"))}</p>
                <a href="${t(v("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 text-sm mt-3 inline-block">${t(e("← 返回列表","← Back to list"))}</a>`,w(i)}}Object.assign(d.AppAdmin||(d.AppAdmin={}),{renderAdminSummerHomeworkEdit:B,renderAdminSummerHomeworkView:R,renderAdminSummerHomeworkPreview:M});
