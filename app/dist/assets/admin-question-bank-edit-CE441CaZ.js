const s=window;function e(d,a){return s.AppRouter&&s.AppRouter.t?s.AppRouter.t(d,a):d}function n(d){return s.AppRouter&&s.AppRouter.escapeHtml?s.AppRouter.escapeHtml(d):String(d||"")}function $(d){return s.AppRouter&&s.AppRouter.spaHref?s.AppRouter.spaHref(d):String(d)}function I(){const d=document.getElementById("sidebar");d&&(d.style.display="none")}function _(d){d.querySelectorAll("[data-spa-nav]").forEach(a=>{a.addEventListener("click",o=>{o.preventDefault(),s.AppRouter.navigate(a.getAttribute("data-spa-nav"))})})}function q(){return s.ScienceApi.getUser()?!(!s.ScienceApi.hasPermission("question_bank.manage_any")&&!s.ScienceApi.hasPermission("question_bank.manage_own")):(s.AppRouter.navigate("/login"),!1)}async function S(){const d=await s.ScienceApi.apiFetch("/admin/subjects"),a=[],o={};return(Array.isArray(d)?d:[]).forEach(i=>{a.push({id:Number(i.id),name_zh:i.name_zh||i.name_en||"",name_en:i.name_en||""}),o[Number(i.id)]=(i.topics||[]).map(u=>({id:Number(u.id),name_zh:u.name_zh||u.name_en||"",name_en:u.name_en||""}))}),{subjects:a,topicsBySubject:o}}function w(d,a){const o=d.querySelectorAll(":scope > tr.q-meta-row").length>0;a.classList.toggle("hidden",o)}async function A(d){I();const a=document.getElementById("page-title"),o=document.getElementById("card-container");let i=d?Number(d):0;if(a&&(a.textContent=i?e("編輯試題庫","Edit question bank"):e("新增試題庫","New question bank")),!q()){s.ScienceApi.getUser()&&(o.innerHTML=`<p class="text-red-600">${n(e("沒有權限。","Forbidden."))}</p>`);return}if(!s.QbAdmin){o.innerHTML=`<p class="text-red-600">${n(e("題目建構器未載入。","Question builder not loaded."))}</p>`;return}o.innerHTML=`<p class="text-slate-500">${n(e("載入中…","Loading…"))}</p>`;let u=[],h={};try{const t=await S();u=t.subjects,h=t.topicsBySubject}catch(t){o.innerHTML=`<p class="text-red-600">${n(t.message||e("載入失敗","Load failed"))}</p>`;return}s.QB_SUBJECTS=u,s.TOPICS=h,s.EDIT_ID=i;const E=u.map(t=>`<option value="${Number(t.id)}">${n(t.name_zh)}</option>`).join(""),B=[["mcq",e("四選一","MCQ")],["short_answer",e("短答","Short")],["long_answer",e("長答","Long")],["fill_blank",e("填充","Fill")],["true_false",e("是非","T/F")]].map(([t,c])=>`<button type="button" class="add-q-type text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50" data-type="${t}">+ ${n(c)}</button>`).join("");o.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${n($("/admin/question-banks"))}" data-spa-nav="/admin/question-banks" class="text-indigo-700 hover:underline">${n(e("← 返回列表","← Back to list"))}</a>
            </div>
            <p id="edit-flash" class="text-sm hidden mb-3"></p>
            <form id="edit-form" class="space-y-6">
                <input type="hidden" id="item-id" value="${i||""}">
                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h2 class="text-sm font-semibold text-slate-800">${n(e("試題集","Question bank"))}</h2>
                        <p class="text-xs text-slate-500 mt-0.5">${n(e("預設科目／課題會套用到新加入的題目；各題仍可個別覆寫。","Default subject/topic apply to new questions; each question can override."))}</p>
                    </div>
                    <div class="p-4 overflow-x-auto">
                        <table class="qb-form-table w-full min-w-[640px] text-sm">
                            <tbody>
                                <tr>
                                    <th>${n(e("標題（中）","Title (ZH)"))}</th>
                                    <td><input id="title-zh" class="w-full border rounded-lg px-3 py-2"></td>
                                    <th>${n(e("標題（英）","Title (EN)"))}</th>
                                    <td><input id="title-en" class="w-full border rounded-lg px-3 py-2"></td>
                                </tr>
                                <tr>
                                    <th>slug</th>
                                    <td colspan="3"><input id="slug" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="${n(e("留空則依標題自動產生","Auto from title if empty"))}"></td>
                                </tr>
                                <tr>
                                    <th>${n(e("描述（中）","Description (ZH)"))}</th>
                                    <td><textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea></td>
                                    <th>${n(e("描述（英）","Description (EN)"))}</th>
                                    <td><textarea id="desc-en" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea></td>
                                </tr>
                                <tr>
                                    <th>${n(e("預設科目","Default subject"))}</th>
                                    <td>
                                        <select id="subject-id" class="w-full border rounded-lg px-3 py-2">
                                            <option value="">—</option>${E}
                                        </select>
                                    </td>
                                    <th>${n(e("預設課題","Default topic"))}</th>
                                    <td><select id="topic-id" class="w-full border rounded-lg px-3 py-2"><option value="">—</option></select></td>
                                </tr>
                                <tr>
                                    <th>${n(e("列表排序","List sort"))}</th>
                                    <td><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2"></td>
                                    <th>${n(e("狀態","Status"))}</th>
                                    <td>
                                        <select id="status" class="w-full border rounded-lg px-3 py-2">
                                            <option value="draft">${n(e("草稿","Draft"))}</option>
                                            <option value="pending_review">${n(e("待審核","Pending review"))}</option>
                                            <option value="published">${n(e("已發佈","Published"))}</option>
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <h2 class="text-sm font-semibold text-slate-800">${n(e("題目","Questions"))}</h2>
                            <p class="text-xs text-slate-500 mt-0.5">${n(e("題幹支援 MathJax（$...$）及上載圖片（需先儲存試題集）。","Stems support MathJax ($...$) and image upload (save bank first)."))}</p>
                        </div>
                        <div class="flex flex-wrap gap-2">${B}</div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="qb-questions-table min-w-full text-sm border-collapse">
                            <thead class="bg-slate-100 text-left">
                                <tr>
                                    <th class="p-2 w-10">#</th>
                                    <th class="p-2 min-w-[7rem]">${n(e("題目代號","Code"))}</th>
                                    <th class="p-2 min-w-[6rem]">${n(e("題型","Type"))}</th>
                                    <th class="p-2 min-w-[7rem]">${n(e("科目","Subject"))}</th>
                                    <th class="p-2 min-w-[7rem]">${n(e("課題","Topic"))}</th>
                                    <th class="p-2 w-16">${n(e("難度","Diff."))}</th>
                                    <th class="p-2 w-16">${n(e("分數","Score"))}</th>
                                    <th class="p-2 min-w-[8rem]">${n(e("來源","Source"))}</th>
                                    <th class="p-2 w-24">${n(e("操作","Actions"))}</th>
                                </tr>
                            </thead>
                            <tbody id="questions"></tbody>
                        </table>
                    </div>
                    <p id="questions-empty" class="hidden p-6 text-center text-slate-500 text-sm">${n(e("尚無題目，請按上方按鈕新增。","No questions yet. Add one above."))}</p>
                </section>

                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">${n(e("儲存","Save"))}</button>
                    ${i?`<button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">${n(e("刪除試題集","Delete bank"))}</button>`:""}
                </div>
            </form>`,_(o);const p=document.getElementById("questions"),g=document.getElementById("questions-empty"),l=document.getElementById("edit-flash"),m=s.QbAdmin;function y(t){m.renderQuestionBlock(m.blankQuestion(t),p.querySelectorAll(":scope > tr.q-meta-row").length,p),m.renumberQuestions(p),w(p,g)}if(o.querySelectorAll(".add-q-type").forEach(t=>{t.onclick=()=>y(t.dataset.type)}),document.getElementById("subject-id").onchange=function(){const t=document.getElementById("topic-id");t.innerHTML='<option value="">—</option>',(h[this.value]||h[Number(this.value)]||[]).forEach(c=>{const r=document.createElement("option");r.value=c.id,r.textContent=c.name_zh,t.appendChild(r)})},i)try{const t=await s.ScienceApi.apiFetch("/admin/question-banks/"+i);document.getElementById("title-zh").value=t.title_zh||"",document.getElementById("title-en").value=t.title_en||"",document.getElementById("slug").value=t.slug||"",document.getElementById("desc-zh").value=t.description_zh||"",document.getElementById("desc-en").value=t.description_en||"",document.getElementById("status").value=t.status||"draft",document.getElementById("list-sort").value=t.list_sort_order||0,t.subject_id&&(document.getElementById("subject-id").value=t.subject_id,document.getElementById("subject-id").dispatchEvent(new Event("change"))),t.topic_id&&(document.getElementById("topic-id").value=t.topic_id),(t.questions||[]).forEach((c,r)=>m.renderQuestionBlock(c,r,p)),w(p,g)}catch(t){l.textContent=t.message||e("載入失敗","Load failed"),l.classList.remove("hidden"),l.classList.add("text-red-600")}else y("mcq");document.getElementById("edit-form").onsubmit=async t=>{t.preventDefault();const c={id:parseInt(document.getElementById("item-id").value,10)||void 0,title_zh:document.getElementById("title-zh").value,title_en:document.getElementById("title-en").value,slug:document.getElementById("slug").value,description_zh:document.getElementById("desc-zh").value,description_en:document.getElementById("desc-en").value,subject_id:document.getElementById("subject-id").value||null,topic_id:document.getElementById("topic-id").value||null,list_sort_order:parseInt(document.getElementById("list-sort").value,10)||0,status:document.getElementById("status").value,questions:m.collectQuestions(p)};try{const r=await s.ScienceApi.apiFetch("/admin/question-banks",{method:"POST",body:c});if(m.applySavedQuestionIds(p,r.questions||[]),document.getElementById("item-id").value=r.id,s.EDIT_ID=r.id,i=Number(r.id),!d||Number(d)!==i){s.AppRouter.navigate("/admin/question-banks/"+i+"/edit");return}if(!document.getElementById("btn-delete")){const x=document.querySelector("#edit-form .flex.gap-3");if(x){const b=document.createElement("button");b.type="button",b.id="btn-delete",b.className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50",b.textContent=e("刪除試題集","Delete bank"),x.appendChild(b),f(b)}}l.textContent=e("已儲存。現在可上載題目圖片。","Saved. You can upload question images now."),l.classList.remove("hidden","text-red-600"),l.classList.add("text-emerald-700")}catch(r){l.textContent=r.message||e("儲存失敗","Save failed"),l.classList.remove("hidden","text-emerald-700"),l.classList.add("text-red-600")}};function f(t){t.onclick=async()=>{if(confirm(e("確定刪除此試題庫？所有題目將一併刪除。","Delete this bank and all questions?")))try{await s.ScienceApi.apiFetch("/admin/question-banks",{method:"DELETE",body:{id:parseInt(document.getElementById("item-id").value,10)}}),s.AppRouter.navigate("/admin/question-banks")}catch(c){l.textContent=c.message||e("刪除失敗","Delete failed"),l.classList.remove("hidden","text-emerald-700"),l.classList.add("text-red-600")}}}const v=document.getElementById("btn-delete");v&&f(v)}Object.assign(s.AppAdmin||(s.AppAdmin={}),{renderAdminQuestionBankEdit:A});
