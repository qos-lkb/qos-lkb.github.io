const u=window,{apiFetch:z,hasPermission:R}=u.ScienceApi,j={note:{endpoint:"/admin/learning-notes",perms:["learning_note.manage_any","learning_note.manage_own","user.manage"]},article:{endpoint:"/admin/articles",perms:["article.manage_any","user.manage"]},worksheet:{endpoint:"/admin/worksheets",perms:["worksheet.manage_any","worksheet.manage_own","user.manage"]}};let m=null;function i(e,t){return u.AppRouter&&typeof u.AppRouter.t=="function"?u.AppRouter.t(e,t):e}function k(){return u.AppRouter&&u.AppRouter.getLang?u.AppRouter.getLang():"zh"}function w(e){const t=j[e];return!t||!u.ScienceApi.getUser()?!1:t.perms.some(n=>R(n))}function x(e,t,n){let a=e.querySelector(".inline-edit-flash");a||(a=document.createElement("p"),a.className="inline-edit-flash",e.prepend(a)),a.textContent=t,a.classList.toggle("inline-edit-flash-error",!!n),a.classList.toggle("inline-edit-flash-ok",!n),a.hidden=!1,clearTimeout(a._flashTimer),a._flashTimer=setTimeout(()=>{a.hidden=!0},4e3)}function A(){m&&m.cancel&&m.cancel()}function V(e){const{type:t,record:n,root:a,titleEl:o,bodyEl:l,buildPayload:d,onBodyUpdated:g}=e;if(!w(t)||!a||!o||!l||!d)return;A();let p=a.querySelector(".inline-edit-admin-hint");if(!p){p=document.createElement("p"),p.className="inline-edit-admin-hint",p.textContent=t==="note"?i("雙擊標題或內文可編輯（Ctrl+Enter 儲存，Esc 取消）。內文可用 ::video、::simulation、::question 嵌入影片、模擬與試題。","Double-click title or body to edit (Ctrl+Enter save, Esc cancel). Use ::video, ::simulation, ::question shortcodes to embed content."):i("管理員：雙擊標題或內文可編輯（Ctrl+Enter 儲存，Esc 取消）","Admin: double-click title or body to edit (Ctrl+Enter save, Esc cancel)");const c=a.querySelector('button[id$="-back"], #note-back, #art-back, #ws-back');c&&c.parentNode?c.insertAdjacentElement("afterend",p):a.prepend(p)}o.classList.add("inline-edit-target"),o.setAttribute("title",i("雙擊編輯標題","Double-click to edit title")),l.classList.add("inline-edit-target"),l.setAttribute("title",i("雙擊編輯內文（Markdown）","Double-click to edit body (Markdown)")),o.addEventListener("dblclick",E),l.addEventListener("dblclick",D);function v(){return k()==="zh"?n.title_zh||"":n.title_en||""}function L(){return k()==="zh"?n.body_zh||"":n.body_en||""}function S(c){k()==="zh"?n.title_zh=c:n.title_en=c}function f(c){k()==="zh"?n.body_zh=c:n.body_en=c}async function C(c,b){const s=k();c==="title"?S(b):f(b);const _=d(n,s,c,b);a.classList.add("inline-edit-saving");try{const r=await z(j[t].endpoint,{method:"POST",body:_});return Object.assign(n,r),x(a,i("已儲存","Saved"),!1),r}catch(r){throw x(a,r.message||i("儲存失敗","Save failed"),!0),r}finally{a.classList.remove("inline-edit-saving")}}function E(c){if(c.preventDefault(),m)return;const b=v(),s=document.createElement("input");s.type="text",s.className="inline-edit-input inline-edit-title",s.value=b,o.replaceWith(s),s.focus(),s.select();const _={cancel:()=>{s.isConnected&&(s.replaceWith(o),o.textContent=v(),m=null)},save:async()=>{if(!s.isConnected)return;const r=s.value.trim();if(r===b){_.cancel();return}try{await C("title",r),o.textContent=r,_.cancel()}catch{s.focus()}}};m=_,s.addEventListener("keydown",r=>{r.key==="Escape"?(r.preventDefault(),_.cancel()):r.key==="Enter"&&(r.preventDefault(),_.save())}),s.addEventListener("blur",()=>{setTimeout(()=>{m===_&&_.save()},0)})}function D(c){if(c.target.closest(".mermaid")||(c.preventDefault(),m))return;const b=L(),s=document.createElement("textarea");s.className="inline-edit-input inline-edit-body",s.value=b,s.spellcheck=!1;const _=l.innerHTML;l.innerHTML="",l.appendChild(s),l.classList.add("inline-edit-active"),s.focus();const r={cancel:()=>{l.classList.contains("inline-edit-active")&&(l.classList.remove("inline-edit-active"),l.innerHTML=_,m=null)},save:async()=>{if(!l.classList.contains("inline-edit-active"))return;const y=s.value;if(y===b){r.cancel();return}try{await C("body",y),l.classList.remove("inline-edit-active"),m=null,g&&await g(l,y)}catch{s.focus()}}};m=r,s.addEventListener("keydown",y=>{y.key==="Escape"?(y.preventDefault(),r.cancel()):y.key==="Enter"&&(y.ctrlKey||y.metaKey)&&(y.preventDefault(),r.save())}),s.addEventListener("blur",()=>{setTimeout(()=>{m===r&&r.save()},0)})}}function T(e){return{id:e.id,slug:e.slug,title_zh:e.title_zh,title_en:e.title_en,body_zh:e.body_zh,body_en:e.body_en,subject_id:e.subject_id,topic_id:e.topic_id,reading_time_minutes:e.reading_time_minutes,list_sort_order:e.list_sort_order,status:e.status}}function H(e){return{id:e.id,slug:e.slug,title_zh:e.title_zh,title_en:e.title_en,description_zh:e.description_zh||"",description_en:e.description_en||"",body_zh:e.body_zh,body_en:e.body_en,subject_id:e.subject_id,topic_id:e.topic_id,list_sort_order:e.list_sort_order,status:e.status}}function F(e,t){return{id:e.id,slug:e.slug,title_zh:e.title_zh,title_en:e.title_en,body_zh:e.body_zh,body_en:e.body_en,subject_id:e.subject_id,topic_id:e.topic_id,reading_time_minutes:e.reading_time_minutes,list_sort_order:e.list_sort_order,status:e.status,questions:t}}function O(e,t){return!Array.isArray(e)||!e.length?[]:e.map(n=>{const a=t&&t[n.id]?t[n.id].correct_option_index:null;return{sort_order:n.sort_order,stem_zh:n.stem_zh,stem_en:n.stem_en,explanation_zh:n.explanation_zh||"",explanation_en:n.explanation_en||"",options:(n.options||[]).map((o,l)=>({text_zh:o.text_zh,text_en:o.text_en,is_correct:a===l}))}})}let h=null;async function N(){return h||(h=await z("/subjects"),h)}function q(e){return e?k()==="zh"?e.name_zh:e.name_en:""}function $(e,t,n,a){e.innerHTML=`<option value="">${i("— 請選擇 —","— Select —")}</option>`;const o=t.find(l=>String(l.id)===String(n));((o==null?void 0:o.topics)||[]).forEach(l=>{const d=document.createElement("option");d.value=String(l.id),d.textContent=q(l),e.appendChild(d)}),a&&(e.value=String(a))}function P(e){const t=e.querySelector('[data-note-prop="subject_id"]'),n=e.querySelector('[data-note-prop="topic_id"]');!t||!n||t.dataset.bound||(t.dataset.bound="1",t.addEventListener("change",()=>{$(n,h||[],t.value,"")}))}function W(){if(document.getElementById("note-props-modal"))return;const e=document.createElement("div");e.id="note-props-modal",e.className="admin-create-modal",e.setAttribute("aria-hidden","true"),e.innerHTML=`
            <div class="admin-create-panel" role="dialog" aria-modal="true" aria-labelledby="note-props-title">
                <div class="admin-create-header">
                    <h2 id="note-props-title" class="admin-create-heading">${i("筆記特性","Note properties")}</h2>
                    <button type="button" class="admin-create-close" aria-label="${i("關閉","Close")}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="note-props-form" class="admin-create-form">
                    <p id="note-props-error" class="admin-create-error hidden" role="alert"></p>
                    <label class="admin-create-label">
                        <span>${i("科目","Subject")}</span>
                        <select data-note-prop="subject_id" class="admin-create-input">
                            <option value="">${i("— 未指定 —","— None —")}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${i("課題","Topic")}</span>
                        <select data-note-prop="topic_id" class="admin-create-input">
                            <option value="">${i("— 請選擇 —","— Select —")}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${i("排序（同課題內順序）","Sort order (within topic)")}</span>
                        <input type="number" data-note-prop="list_sort_order" class="admin-create-input" value="0" step="1">
                    </label>
                    <label class="admin-create-label">
                        <span>${i("閱讀時間（分鐘）","Reading time (minutes)")}</span>
                        <input type="number" data-note-prop="reading_time_minutes" class="admin-create-input" min="1" step="1" placeholder="${i("選填","Optional")}">
                    </label>
                    <label class="admin-create-label">
                        <span>${i("狀態","Status")}</span>
                        <select data-note-prop="status" class="admin-create-input">
                            <option value="published">${i("已發佈","Published")}</option>
                            <option value="draft">${i("草稿","Draft")}</option>
                            <option value="pending_review">${i("待審核","Pending review")}</option>
                        </select>
                    </label>
                    <div class="admin-create-actions">
                        <button type="button" class="admin-create-btn admin-create-btn-secondary" data-cancel>${i("取消","Cancel")}</button>
                        <button type="submit" class="admin-create-btn admin-create-btn-primary">${i("儲存","Save")}</button>
                    </div>
                </form>
            </div>`,document.body.appendChild(e);const t=e.querySelector("#note-props-form"),n=e.querySelector("#note-props-error");function a(){e.classList.remove("active"),e.setAttribute("aria-hidden","true"),document.body.style.overflow="",n.hidden=!0,n.textContent="",e._record=null,e._onSaved=null}e.querySelector(".admin-create-close").addEventListener("click",a),e.querySelector("[data-cancel]").addEventListener("click",a),e.addEventListener("click",o=>{o.target===e&&a()}),document.addEventListener("keydown",o=>{o.key==="Escape"&&e.classList.contains("active")&&a()}),t.addEventListener("submit",async o=>{o.preventDefault();const l=e._record;if(!l||!l.id)return;const d=t.querySelector('[data-note-prop="subject_id"]').value,g=t.querySelector('[data-note-prop="topic_id"]').value,p=parseInt(t.querySelector('[data-note-prop="list_sort_order"]').value,10),v=t.querySelector('[data-note-prop="reading_time_minutes"]').value.trim(),L=t.querySelector('[data-note-prop="status"]').value;l.subject_id=d?parseInt(d,10):null,l.topic_id=g?parseInt(g,10):null,l.list_sort_order=Number.isFinite(p)?p:0,l.reading_time_minutes=v?parseInt(v,10):null,l.status=L;const S=t.querySelector('[type="submit"]');S.disabled=!0,n.hidden=!0;try{const f=await z(j.note.endpoint,{method:"POST",body:T(l)});Object.assign(l,f),a(),typeof e._onSaved=="function"&&await e._onSaved(f)}catch(f){n.textContent=f.message||i("儲存失敗","Save failed"),n.hidden=!1}finally{S.disabled=!1}}),P(e)}async function U(e,t){await N();const n=e.querySelector('[data-note-prop="subject_id"]'),a=e.querySelector('[data-note-prop="topic_id"]');n.innerHTML=`<option value="">${i("— 未指定 —","— None —")}</option>`,(h||[]).forEach(o=>{const l=document.createElement("option");l.value=String(o.id),l.textContent=q(o),n.appendChild(l)}),n.value=t.subject_id?String(t.subject_id):"",$(a,h||[],t.subject_id,t.topic_id),e.querySelector('[data-note-prop="list_sort_order"]').value=t.list_sort_order??0,e.querySelector('[data-note-prop="reading_time_minutes"]').value=t.reading_time_minutes??"",e.querySelector('[data-note-prop="status"]').value=t.status||"published"}async function M(e,t){if(!w("note")||!(e!=null&&e.id))return;W();const n=document.getElementById("note-props-modal");n._record=e,n._onSaved=t&&t.onSaved?t.onSaved:null,n.querySelector("#note-props-error").hidden=!0,await U(n,e),n.classList.add("active"),n.setAttribute("aria-hidden","false"),document.body.style.overflow="hidden",n.querySelector('[data-note-prop="subject_id"]').focus()}function K(e,t,n){if(!w("note")||!e||!(t!=null&&t.id))return;let a=e.querySelector(".inline-edit-admin-bar");if(!a){a=document.createElement("div"),a.className="inline-edit-admin-bar";const l=e.querySelector("#note-back");l&&l.parentNode?l.insertAdjacentElement("afterend",a):e.prepend(a)}let o=a.querySelector("[data-note-props-btn]");o||(o=document.createElement("button"),o.type="button",o.dataset.notePropsBtn="1",o.className="inline-edit-props-btn",o.textContent=i("編輯特性","Edit properties"),a.appendChild(o)),o.onclick=()=>M(t,{onSaved:n})}function B(){if(document.getElementById("create-note-modal"))return;const e=document.createElement("div");e.id="create-note-modal",e.className="admin-create-modal",e.setAttribute("aria-hidden","true"),e.innerHTML=`
            <div class="admin-create-panel" role="dialog" aria-modal="true" aria-labelledby="create-note-title">
                <div class="admin-create-header">
                    <h2 id="create-note-title" class="admin-create-heading">${i("新增學習筆記","New learning note")}</h2>
                    <button type="button" class="admin-create-close" aria-label="${i("關閉","Close")}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="create-note-form" class="admin-create-form">
                    <p id="create-note-error" class="admin-create-error hidden" role="alert"></p>
                    <label class="admin-create-label">
                        <span>${i("中文標題","Title (Chinese)")}</span>
                        <input type="text" id="create-note-title-zh" class="admin-create-input" required maxlength="500">
                    </label>
                    <label class="admin-create-label">
                        <span>${i("英文標題","Title (English)")}</span>
                        <input type="text" id="create-note-title-en" class="admin-create-input" maxlength="500">
                    </label>
                    <label class="admin-create-label">
                        <span>${i("狀態","Status")}</span>
                        <select id="create-note-status" class="admin-create-input">
                            <option value="published">${i("已發佈","Published")}</option>
                            <option value="draft">${i("草稿","Draft")}</option>
                            <option value="pending_review">${i("待審核","Pending review")}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${i("科目","Subject")}</span>
                        <select id="create-note-subject" data-note-prop="subject_id" class="admin-create-input">
                            <option value="">${i("— 未指定 —","— None —")}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${i("課題","Topic")}</span>
                        <select id="create-note-topic" data-note-prop="topic_id" class="admin-create-input">
                            <option value="">${i("— 請選擇 —","— Select —")}</option>
                        </select>
                    </label>
                    <label class="admin-create-label">
                        <span>${i("排序（同課題內順序）","Sort order (within topic)")}</span>
                        <input type="number" id="create-note-sort" class="admin-create-input" value="0" step="1">
                    </label>
                    <div class="admin-create-actions">
                        <button type="button" class="admin-create-btn admin-create-btn-secondary" data-cancel>${i("取消","Cancel")}</button>
                        <button type="submit" class="admin-create-btn admin-create-btn-primary">${i("建立","Create")}</button>
                    </div>
                </form>
            </div>`,document.body.appendChild(e);const t=e.querySelector("#create-note-form"),n=e.querySelector("#create-note-error");function a(){e.classList.remove("active"),e.setAttribute("aria-hidden","true"),document.body.style.overflow="",n.hidden=!0,n.textContent=""}e.querySelector(".admin-create-close").addEventListener("click",a),e.querySelector("[data-cancel]").addEventListener("click",a),e.addEventListener("click",o=>{o.target===e&&a()}),document.addEventListener("keydown",o=>{o.key==="Escape"&&e.classList.contains("active")&&a()}),t.addEventListener("submit",async o=>{o.preventDefault();const l=t.querySelector("#create-note-title-zh").value.trim(),d=t.querySelector("#create-note-title-en").value.trim(),g=t.querySelector("#create-note-status").value,p=t.querySelector("#create-note-subject").value,v=t.querySelector("#create-note-topic").value,L=parseInt(t.querySelector("#create-note-sort").value,10);if(!l&&!d){n.textContent=i("請至少填寫一個標題。","Please enter at least one title."),n.hidden=!1;return}const S=l||d,f=d||l,C=t.querySelector('[type="submit"]');C.disabled=!0,n.hidden=!0;try{const E=await I({title_zh:S,title_en:f,body_zh:`# ${S}

${i("在此撰寫筆記內容…","Write note content here…")}
`,body_en:`# ${f}

Write note content here…
`,status:g,subject_id:p?parseInt(p,10):null,topic_id:v?parseInt(v,10):null,list_sort_order:Number.isFinite(L)?L:0});a(),E&&E.slug&&u.AppRouter?u.AppRouter.navigate("/note/"+encodeURIComponent(E.slug)):u.AppRouter&&u.AppRouter.navigate("/learning-notes")}catch(E){n.textContent=E.message||i("建立失敗","Create failed"),n.hidden=!1}finally{C.disabled=!1}}),P(e)}async function G(){B();const e=document.getElementById("create-note-modal"),t=e.querySelector("#create-note-subject"),n=e.querySelector("#create-note-topic");await N(),t.innerHTML=`<option value="">${i("— 未指定 —","— None —")}</option>`,(h||[]).forEach(a=>{const o=document.createElement("option");o.value=String(a.id),o.textContent=q(a),t.appendChild(o)}),$(n,h||[],"","")}async function I(e){if(!w("note"))throw new Error(i("沒有權限。","Permission denied."));return z(j.note.endpoint,{method:"POST",body:{title_zh:e.title_zh,title_en:e.title_en,body_zh:e.body_zh,body_en:e.body_en,status:e.status||"published",subject_id:e.subject_id??null,topic_id:e.topic_id??null,list_sort_order:e.list_sort_order||0}})}function Y(){if(!w("note"))return;B();const e=document.getElementById("create-note-modal"),t=document.getElementById("create-note-form");t.reset(),t.querySelector("#create-note-status").value="published",t.querySelector("#create-note-sort").value="0",e.querySelector("#create-note-error").hidden=!0,G().then(()=>{e.classList.add("active"),e.setAttribute("aria-hidden","false"),document.body.style.overflow="hidden",t.querySelector("#create-note-title-zh").focus()})}u.AppInlineEdit={canEditType:w,attachMarkdownEditor:V,attachNotePropertiesButton:K,buildNotePayload:T,buildWorksheetPayload:H,buildArticlePayload:F,questionsForArticleSave:O,cancelActiveEditor:A,createLearningNote:I,openCreateNoteModal:Y,openNotePropertiesModal:M};
