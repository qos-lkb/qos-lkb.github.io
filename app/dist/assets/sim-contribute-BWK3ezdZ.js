const x=window,{apiFetch:h,setCsrf:y}=x.ScienceApi,{t,escapeHtml:e,navigate:w,spaHref:L}=x.AppRouter;function T(i,r,c,s){i.innerHTML='<option value="">—</option>',(r[String(c)]||r[Number(c)]||[]).forEach(o=>{const u=document.createElement("option");u.value=String(o.id),u.textContent=o.name_zh||o.name_en||"#"+o.id,i.appendChild(u)})}async function B(){const i=document.getElementById("main-content"),r=document.getElementById("sidebar");r&&(r.style.display="none");const c=document.getElementById("page-title");c&&(c.textContent=t("投稿模擬程式","Contribute a simulation")),i.innerHTML=`<div class="reading-page max-w-3xl"><p class="text-slate-500">${e(t("載入中…","Loading…"))}</p></div>`;let s;try{s=await h("/simulations/contribute")}catch(l){i.innerHTML=`<div class="reading-page max-w-3xl"><p class="text-red-600">${e(l.message||t("無法載入表單。","Could not load form."))}</p></div>`;return}s.csrf_token&&y&&y(s.csrf_token);const o=Array.isArray(s.subjects)?s.subjects:[],u=s.topics_by_subject||{},d=s.user,$=o.map(l=>`<option value="${Number(l.id)}">${e((l.name_zh||"")+" / "+(l.name_en||""))}</option>`).join(""),E="allow-scripts allow-forms allow-popups allow-modals allow-downloads";i.innerHTML=`
            <div class="reading-page max-w-3xl space-y-6" id="sim-contribute-page">
                <button type="button" id="contribute-back" class="text-indigo-600 text-sm hover:underline">← ${e(t("返回模擬程式","Back to simulations"))}</button>
                <div>
                    <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">${e(t("投稿模擬程式","Contribute a simulation"))}</h1>
                    <p class="mt-2 text-sm text-slate-600">${e(t("提交後會進入待審核，管理員核准後才會公開顯示。","Submissions enter pending review and appear publicly only after an admin approves them."))}</p>
                </div>
                <form id="contribute-form" class="space-y-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <input type="text" name="website" value="" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true">
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${e(t("姓名","Name"))} *</label>
                            <input name="submitter_name" required class="mt-1 w-full border rounded-lg px-3 py-2" value="${e(d&&d.display_name?d.display_name:"")}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${e(t("電郵","Email"))} *</label>
                            <input type="email" name="submitter_email" required class="mt-1 w-full border rounded-lg px-3 py-2" value="${e(d&&d.email?d.email:"")}">
                        </div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${e(t("中文標題","Title (ZH)"))}</label><input name="title_zh" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${e(t("英文標題","Title (EN)"))}</label><input name="title_en" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium text-slate-700">${e(t("中文摘要","Summary (ZH)"))}</label><input name="summary_zh" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                        <div><label class="block text-sm font-medium text-slate-700">${e(t("英文摘要","Summary (EN)"))}</label><input name="summary_en" maxlength="500" class="mt-1 w-full border rounded-lg px-3 py-2"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${e(t("科目","Subject"))}</label>
                            <select name="subject_id" id="c-subject" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option>${$}</select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700">${e(t("單元","Topic"))}</label>
                            <select name="topic_id" id="c-topic" class="mt-1 w-full border rounded-lg px-3 py-2"><option value="">—</option></select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${e(t("標籤（逗號分隔）","Tags (comma-separated)"))}</label>
                        <input name="tags" class="mt-1 w-full border rounded-lg px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${e(t("HTML 內容","HTML content"))} *</label>
                        <div class="mt-1 flex flex-wrap gap-2 items-center mb-2">
                            <input type="file" id="c-html-file" accept=".html,.htm,text/html" class="text-sm">
                            <button type="button" id="c-load-html" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">${e(t("載入 HTML 檔","Load HTML file"))}</button>
                            <button type="button" id="c-preview" class="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700">${e(t("更新預覽","Refresh preview"))}</button>
                        </div>
                        <textarea name="html" id="c-html" rows="12" required class="w-full border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${e(t("截圖（選填）","Screenshot (optional)"))}</label>
                        <input type="file" name="screenshot" id="c-screenshot" accept="image/jpeg,image/png,image/gif,image/webp" class="mt-1 text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">${e(t("備註（選填）","Note (optional)"))}</label>
                        <textarea name="submitter_note" rows="2" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm"></textarea>
                    </div>
                    <iframe id="c-preview-frame" title="preview" sandbox="${E}" class="w-full h-64 border rounded-lg bg-slate-50"></iframe>
                    <p id="c-error" class="text-sm text-red-600 hidden"></p>
                    <button type="submit" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium">${e(t("送出審核","Submit for review"))}</button>
                </form>
            </div>`,document.getElementById("contribute-back").onclick=()=>w("/simulations");const g=document.getElementById("c-subject"),_=document.getElementById("c-topic"),v=document.getElementById("c-html"),k=document.getElementById("c-preview-frame"),p=document.getElementById("c-error");g.addEventListener("change",()=>T(_,u,g.value));function f(){const l=new Blob([v.value||""],{type:"text/html"}),a=URL.createObjectURL(l);k.src=a,setTimeout(()=>URL.revokeObjectURL(a),6e4)}document.getElementById("c-preview").onclick=()=>f(),document.getElementById("c-load-html").onclick=async()=>{const l=document.getElementById("c-html-file").files[0];if(!l)return;const a=await l.text();v.value=a;const b=a.match(/<title[^>]*>(.*?)<\/title>/is);if(b){const n=b[1].replace(/<[^>]+>/g,"").trim(),m=document.getElementById("contribute-form");!m.title_zh.value&&!m.title_en.value&&n&&(m.title_zh.value=n,m.title_en.value=n)}f()},document.getElementById("contribute-form").addEventListener("submit",async l=>{l.preventDefault(),p.classList.add("hidden");const a=l.target;if(!a.title_zh.value.trim()&&!a.title_en.value.trim()){p.textContent=t("請至少填寫中文或英文標題。","Please enter a Chinese or English title."),p.classList.remove("hidden");return}const b=new FormData(a);b.set("csrf",x.ScienceApi.getCsrf());try{await h("/simulations/contribute",{method:"POST",body:b}),i.innerHTML=`
                    <div class="reading-page max-w-xl space-y-4">
                        <h1 class="text-2xl font-bold text-slate-900">${e(t("已送出審核","Submitted for review"))}</h1>
                        <p class="text-slate-600">${e(t("感謝投稿！管理員審核通過後，模擬程式才會出現在公開目錄。","Thanks! Your simulation will appear in the public catalogue after an admin approves it."))}</p>
                        <a href="${e(L("/simulations"))}" data-spa="/simulations" class="inline-flex text-indigo-600 hover:underline">${e(t("返回模擬程式","Back to simulations"))}</a>
                    </div>`;const n=i.querySelector("[data-spa]");n&&(n.onclick=m=>{m.preventDefault(),w("/simulations")})}catch(n){p.textContent=n.message||t("投稿失敗","Submit failed"),p.classList.remove("hidden")}})}x.AppSimContribute={renderContribute:B};
