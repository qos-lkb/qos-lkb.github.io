const n=window;function e(s,o){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(s,o):s}function t(s){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(s):String(s||"")}function b(s){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(s):String(s||"")}function v(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function x(s){s.querySelectorAll("[data-spa-nav]").forEach(o=>{o.addEventListener("click",r=>{r.preventDefault(),n.AppRouter.navigate(o.getAttribute("data-spa-nav"))})})}function f(){const s=n.ScienceApi;return s.hasPermission("summer_homework.manage_any")||s.hasPermission("summer_homework.manage_own")}function $(s){return{mcq:e("選擇","MCQ"),fill_blank:e("填充","Fill"),true_false:e("是非","T/F"),short_answer:e("短答","Short"),long_answer:e("長答","Long")}[s]||s}function h(s){return{draft:e("草稿","Draft"),pending_review:e("待審核","Pending"),published:e("已發佈","Published")}[s]||s||"—"}function w(s,o){const r=s.stem_zh||s.stem_en||"",d=s.question_type||"";let l="";if(d==="mcq")l=`<ul class="text-sm space-y-1.5">${(s.options||[]).map((a,i)=>{const u=String.fromCharCode(65+i),c=a.text_zh||a.text_en||"",m=a.is_correct===!0||a.is_correct===1||a.is_correct==="1";return`<li class="${m?"text-emerald-800 font-medium":"text-slate-700"}">
                    <span class="font-bold text-indigo-600 mr-1">${u}</span>${t(c)}
                    ${m?`<span class="text-xs text-emerald-700 ml-1">✓ ${t(e("正確答案","Correct"))}</span>`:""}
                </li>`}).join("")}</ul>`;else if(d==="true_false"){const a=s.correct_bool===!0||s.correct_bool===1||s.correct_bool==="1";l=`<p class="text-sm text-emerald-800 font-medium">${t(e("正確答案：","Answer: "))}${t(a?e("是","True"):e("否","False"))}</p>`}else d==="short_answer"?l=`<ul class="text-sm space-y-1">${(s.acceptable_answers||[]).map(a=>!a||typeof a!="object"?"":`<li class="font-mono text-emerald-800">${t(a.acceptable_answer_zh||"")} / ${t(a.acceptable_answer_en||"")}</li>`).join("")}</ul>`:d==="long_answer"?(l=`<p class="text-sm text-slate-600">${t(e("滿分","Max"))} ${t(String(s.max_score??5))}（${t(e("教師評閱","Teacher-marked"))}）</p>`,(s.rubric_zh||s.rubric_en)&&(l+=`<div class="mt-2 text-xs text-slate-600 space-y-1">
                    ${s.rubric_zh?`<p><span class="text-slate-400">${t(e("評分指引（中）：","Rubric ZH: "))}</span>${t(s.rubric_zh)}</p>`:""}
                    ${s.rubric_en?`<p><span class="text-slate-400">${t(e("評分指引（英）：","Rubric EN: "))}</span>${t(s.rubric_en)}</p>`:""}
                </div>`)):l=(s.blanks||[]).map((a,i)=>{const u=a.acceptable_answers||[];return`<div class="text-sm mb-2">
                    <span class="text-slate-500">${t(e("空格","Blank"))} ${i+1}：</span>
                    ${u.map(c=>`<span class="font-mono text-emerald-800 mr-2">${t((c.acceptable_answer_zh||"")+" / "+(c.acceptable_answer_en||""))}</span>`).join("")}
                </div>`}).join("");return`<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p class="font-medium text-slate-900 mb-3">
                ${o+1}.
                <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mr-1">${t($(d))}</span>
                ${t(r)}
            </p>
            ${l}
        </div>`}async function y(s){v();const o=document.getElementById("page-title"),r=document.getElementById("card-container"),d=s?Number(s):0;if(o&&(o.textContent=d?e("編輯暑期功課","Edit summer homework"):e("新增暑期功課","New summer homework")),!n.ScienceApi.getUser()){n.AppRouter.navigate("/login");return}if(!f()){r.innerHTML=`<p class="text-red-600">${t(e("沒有權限。","Forbidden."))}</p>`;return}if(d)try{if((await n.ScienceApi.apiFetch("/admin/summer-homework/"+d)).can_manage===!1){n.AppRouter.navigate("/admin/summer-homework/"+d+"/view");return}}catch(i){r.innerHTML=`<p class="text-red-600">${t(i.message||e("載入失敗","Load failed"))}</p>`;return}const l=Number(new URLSearchParams(location.search).get("regraded")||0);r.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(b("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${t(e("← 返回列表","← Back to list"))}</a>
                ${d?`<a href="${t(b("/admin/summer-homework/"+d+"/view"))}" data-spa-nav="/admin/summer-homework/${d}/view" class="text-slate-600 hover:underline">${t(e("內容／答案","Content / answers"))}</a>`:""}
                ${d?`<a href="${t(b("/admin/summer-homework/"+d+"/analytics"))}" data-spa-nav="/admin/summer-homework/${d}/analytics" class="text-slate-600 hover:underline">${t(e("呈交分析","Analytics"))}</a>`:""}
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3 ${l>0?"text-emerald-700":""}">${l>0?t(e(`已儲存，並依最新答案重算 ${l} 筆呈交分數。`,`Saved; regraded ${l} attempts.`)):""}</p>
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
                <div id="passage-fields" class="space-y-3">
                    <div>
                        <label class="text-sm font-medium">${t(e("篇章（中，Markdown）","Passage (ZH, Markdown)"))}</label>
                        <p class="text-xs text-slate-500 mt-0.5">${t(e("支援公式：行內 $E=mc^2$、區塊 $$...$$","Math: inline $E=mc^2$, block $$...$$"))}</p>
                        <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="6"></textarea>
                    </div>
                    <div>
                        <label class="text-sm font-medium">${t(e("篇章（英，Markdown）","Passage (EN, Markdown)"))}</label>
                        <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="6"></textarea>
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
                        <div class="flex flex-wrap gap-x-3 gap-y-1">
                            <button type="button" id="add-mcq" class="text-sm text-indigo-600">+ ${t(e("選擇題","MCQ"))}</button>
                            <button type="button" id="add-fill" class="text-sm text-indigo-600">+ ${t(e("填充題","Fill"))}</button>
                            <button type="button" id="add-tf" class="text-sm text-indigo-600">+ ${t(e("是非題","T/F"))}</button>
                            <button type="button" id="add-short" class="text-sm text-indigo-600">+ ${t(e("短答題","Short"))}</button>
                            <button type="button" id="add-long" class="text-sm text-indigo-600">+ ${t(e("長答題","Long"))}</button>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mb-2">${t(e("題幹與選項可用 $...$／$$...$$ 寫公式。","Use $...$ / $$...$$ for math in stems and options."))}</p>
                    <div id="questions" class="space-y-4"></div>
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium">${t(e("儲存","Save"))}</button>
            </form>`,x(r);const a=document.getElementById("edit-flash");l>0&&a.classList.remove("hidden");try{await n.AppAdminSummerQBuilder.mount({editId:d,onError:i=>{a.textContent=i.message||e("載入失敗","Load failed"),a.classList.remove("hidden"),a.classList.add("text-red-600")}}),n.AppAdminSummerQBuilder.bindSubmit(),document.getElementById("edit-form").onsubmit=async i=>{i.preventDefault();const u=n.AppAdminSummerQBuilder,c={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,form_level:document.getElementById("form-level").value,content_type:document.getElementById("content-type").value,pass_percent:parseFloat(document.getElementById("pass-percent").value)||80,due_at:document.getElementById("due-at").value||"",allow_late_submit:document.getElementById("allow-late").checked?1:0,list_sort_order:parseInt(document.getElementById("list-sort").value,10)||0,status:document.getElementById("status").value,body_zh:document.getElementById("body-zh").value,body_en:document.getElementById("body-en").value,video_embed_url:document.getElementById("video-url").value,video_provider:document.getElementById("video-provider").value,questions:u.collectQuestions()};try{const m=await n.ScienceApi.apiFetch("/admin/summer-homework",{method:"POST",body:c}),p=parseInt(m.regraded_attempts||"0",10)||0,g="/admin/summer-homework/"+m.id+"/edit"+(p>0?"?regraded="+p:"");n.AppRouter.navigate("/admin/summer-homework/"+m.id+"/edit"),p>0?(history.replaceState({},"",b(g).replace(/^\.\//,"")||location.pathname+"?regraded="+p),a.textContent=e(`已儲存，並依最新答案重算 ${p} 筆呈交分數。`,`Saved; regraded ${p} attempts.`),a.classList.remove("hidden","text-red-600"),a.classList.add("text-emerald-700")):(a.textContent=e("已儲存。","Saved."),a.classList.remove("hidden","text-red-600"),a.classList.add("text-emerald-700")),document.getElementById("item-id").value=String(m.id)}catch(m){a.textContent=m.message||e("儲存失敗","Save failed"),a.classList.remove("hidden","text-emerald-700"),a.classList.add("text-red-600")}}}catch(i){a.textContent=i.message||e("載入失敗","Load failed"),a.classList.remove("hidden"),a.classList.add("text-red-600")}}async function _(s){v();const o=document.getElementById("page-title"),r=document.getElementById("card-container"),d=Number(s||0);if(!d){n.AppRouter.navigate("/admin/summer-homework");return}if(!n.ScienceApi.getUser()){n.AppRouter.navigate("/login");return}r.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const l=await n.ScienceApi.apiFetch("/admin/summer-homework/"+d),a=String(l.form_level)==="2"?e("中二","S2"):e("中一","S1"),i=l.content_type==="video"?e("影片","Video"):e("閱讀","Passage");o&&(o.textContent=e("檢視暑期功課","View summer homework")+" — "+(l.title_zh||l.title_en||""));const u=l.questions||[];let c="";l.content_type==="video"?c=`<dl class="text-sm space-y-2">
                    <div><dt class="text-slate-500">${t(e("影片嵌入 URL","Embed URL"))}</dt>
                    <dd class="font-mono break-all">${t(l.video_embed_url||"—")}</dd></div>
                </dl>`:c=`<div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div><h3 class="font-medium text-slate-700 mb-2">${t(e("篇章（中）","Passage (ZH)"))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${t(l.body_zh||"")}</pre></div>
                    <div><h3 class="font-medium text-slate-700 mb-2">${t(e("篇章（英）","Passage (EN)"))}</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800">${t(l.body_en||"")}</pre></div>
                </div>`,r.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                    <a href="${t(b("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-indigo-700 hover:underline">${t(e("← 返回列表","← Back to list"))}</a>
                    <a href="${t(b("/admin/summer-homework/"+d+"/analytics"))}" data-spa-nav="/admin/summer-homework/${d}/analytics" class="text-slate-600 hover:underline">${t(e("呈交分析","Analytics"))}</a>
                    ${l.can_manage?`<a href="${t(b("/admin/summer-homework/"+d+"/edit"))}" data-spa-nav="/admin/summer-homework/${d}/edit" class="text-indigo-700 font-medium hover:underline">${t(e("編輯","Edit"))}</a>`:""}
                </div>
                <p class="text-xs text-slate-500 mb-4">${t(a)} · ${t(i)} · ${t(h(l.status))} · ${t(e("含正確答案（教師／管理員檢視）","Includes answer key (staff view)"))}</p>
                <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-950 mb-6">
                    ${t(e("此頁顯示習作全文與正確答案，供教師／管理員檢視。學生前台不會看到答案鍵。","Full text and correct answers for staff. Students never see the answer key."))}
                </div>
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                    <h2 class="font-bold text-slate-800 mb-3">${t(e("內容","Content"))}</h2>
                    ${c}
                    <p class="text-xs text-slate-500 mt-4">
                        ${t(e("及格線","Pass"))} ${t(String(l.pass_percent))}%
                        · ${t(e("截止","Due"))} ${t(l.due_at||e("無","None"))}
                        · ${t(e("遲交","Late"))} ${l.due_at?l.allow_late_submit?e("允許","Allowed"):e("禁止","Blocked"):"—"}
                    </p>
                </div>
                <div class="space-y-4 mb-8">
                    <h2 class="font-bold text-slate-800">${t(e("題目與答案","Questions & answers"))}（${u.length}）</h2>
                    ${u.length?u.map((m,p)=>w(m,p)).join(""):`<p class="text-slate-500 text-sm">${t(e("尚無題目。","No questions yet."))}</p>`}
                </div>`,x(r)}catch(l){r.innerHTML=`<p class="text-red-600">${t(l.message||e("載入失敗","Load failed"))}</p>`}}Object.assign(n.AppAdmin||(n.AppAdmin={}),{renderAdminSummerHomeworkEdit:y,renderAdminSummerHomeworkView:_});
