const l=window;function a(t,e){return l.AppRouter&&l.AppRouter.t?l.AppRouter.t(t,e):t}function n(t){return l.AppRouter&&l.AppRouter.escapeHtml?l.AppRouter.escapeHtml(t):String(t||"")}let r={title:"",lead:"",pages:[]},d="";function h(){return r.pages.slice().sort((t,e)=>Number(t.sort||0)-Number(e.sort||0))}function w(t){return r.pages.find(e=>e.slug===t)||null}async function $(){r=await l.ScienceApi.apiFetch("/admin/science-edu"),r.pages||(r.pages=[])}async function I(){r=await l.ScienceApi.apiFetch("/admin/science-edu",{method:"PUT",body:r})}function o(t,e){const s=document.getElementById("sci-edu-admin-status");s&&(s.textContent=t||"",s.className=e?"text-sm text-red-600":"text-sm text-emerald-700")}function S(){return h().map(e=>{const s=e.slug===d?" bg-teal-50 border-teal-300":" bg-white border-slate-200",i=e.parent?" pl-6":"";return`<button type="button" class="sci-edu-admin-pick w-full text-left px-3 py-2 rounded-lg border text-sm${s}${i}" data-slug="${n(e.slug)}">
            <span class="font-medium">${n(e.title)}</span>
            <span class="block text-xs text-slate-500">${n(e.slug)}</span>
        </button>`}).join("")}function B(t){const e=[`<option value="">${n(a("（頂層）","(Top level)"))}</option>`];return h().forEach(s=>{if(t&&s.slug===t.slug)return;const i=t&&t.parent===s.slug?" selected":"";e.push(`<option value="${n(s.slug)}"${i}>${n(s.title)}</option>`)}),e.join("")}function A(){const t=w(d);return t?`
        <div class="space-y-3">
            <label class="block text-sm">
                <span class="text-slate-600">${n(a("標題","Title"))}</span>
                <input id="sci-edu-title" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${n(t.title)}">
            </label>
            <label class="block text-sm">
                <span class="text-slate-600">${n(a("首頁摘要","Home summary"))}</span>
                <input id="sci-edu-summary" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${n(t.summary||"")}">
            </label>
            <div class="grid sm:grid-cols-2 gap-3">
                <label class="block text-sm">
                    <span class="text-slate-600">${n(a("父頁","Parent"))}</span>
                    <select id="sci-edu-parent" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${B(t)}</select>
                </label>
                <label class="flex items-end gap-2 text-sm pb-2">
                    <input id="sci-edu-home" type="checkbox"${t.showOnHome?" checked":""}>
                    <span>${n(a("在訪客首頁顯示為卡片","Show as a card on the guest home"))}</span>
                </label>
            </div>
            <label class="block text-sm">
                <span class="text-slate-600">${n(a("HTML 正文","HTML body"))}</span>
                <textarea id="sci-edu-html" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" rows="16"></textarea>
            </label>
            <div class="flex flex-wrap gap-2">
                <button type="button" id="sci-edu-save" class="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium">${n(a("儲存此頁","Save page"))}</button>
                <button type="button" id="sci-edu-preview" class="px-4 py-2 rounded-lg border border-slate-300 text-sm">${n(a("預覽","Preview"))}</button>
                <label class="px-4 py-2 rounded-lg border border-slate-300 text-sm cursor-pointer">
                    ${n(a("上傳圖片","Upload image"))}
                    <input id="sci-edu-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden">
                </label>
                <button type="button" id="sci-edu-delete" class="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm">${n(a("刪除","Delete"))}</button>
            </div>
            <div id="sci-edu-preview-box" class="sci-edu-article hidden"></div>
        </div>`:`<p class="text-sm text-slate-500">${n(a("請選擇左側頁面，或新增一頁。","Choose a page, or add one."))}</p>`}function y(){const t=document.getElementById("card-container"),e=document.getElementById("page-title");e&&(e.textContent=a("科學教育網頁","Science pages")),t&&(t.innerHTML=`
        <p class="text-sm text-slate-500">${n(a("內容寫入 science-edu/ 靜態檔，不會進入資料庫。","Content is saved as static files under science-edu/, not in the database."))}</p>
        <p id="sci-edu-admin-status" class="text-sm text-emerald-700" role="status"></p>
        <label class="block text-sm max-w-3xl">
            <span class="text-slate-600">${n(a("首頁導言","Home lead"))}</span>
            <input id="sci-edu-lead" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${n(r.lead||"")}">
        </label>
        <div class="flex flex-wrap gap-2">
            <button type="button" id="sci-edu-save-lead" class="px-4 py-2 rounded-lg border border-slate-300 text-sm">${n(a("儲存導言","Save lead"))}</button>
            <button type="button" id="sci-edu-up" class="px-3 py-2 rounded-lg border border-slate-300 text-sm">${n(a("上移","Up"))}</button>
            <button type="button" id="sci-edu-down" class="px-3 py-2 rounded-lg border border-slate-300 text-sm">${n(a("下移","Down"))}</button>
        </div>
        <div class="grid lg:grid-cols-[16rem_1fr] gap-4 items-start">
            <div class="space-y-2">
                <div id="sci-edu-list" class="space-y-1">${S()}</div>
                <form id="sci-edu-new" class="space-y-2 border border-dashed border-slate-300 rounded-lg p-3">
                    <p class="text-xs font-medium text-slate-500">${n(a("新增頁面","New page"))}</p>
                    <input name="title" required placeholder="${n(a("標題","Title"))}" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="slug" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <button type="submit" class="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">${n(a("加入","Add"))}</button>
                </form>
            </div>
            <div id="sci-edu-editor">${A()}</div>
        </div>`,H())}async function v(t){d=t,y();const e=document.getElementById("sci-edu-html");if(e)try{const s=await l.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(t));e.value=s.html||""}catch(s){o(s.message||a("讀取失敗","Load failed"),!0)}}function L(){const t=w(d);if(!t)return;const e=document.getElementById("sci-edu-title"),s=document.getElementById("sci-edu-summary"),i=document.getElementById("sci-edu-parent"),p=document.getElementById("sci-edu-home");e&&(t.title=e.value.trim()),s&&(t.summary=s.value.trim()),i&&(t.parent=i.value),p&&(t.showOnHome=p.checked)}async function k(){const t=document.getElementById("sci-edu-html");if(!d||!t)return;L();const e=w(d);o(a("儲存中…","Saving…"),!1);try{const s=await l.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(d),{method:"PUT",body:{html:t.value,title:e.title,summary:e.summary,parent:e.parent,showOnHome:e.showOnHome,sort:e.sort}});s.nav&&(r=s.nav),o(a("已寫入靜態檔。","Saved to static files."),!1),y();const i=document.getElementById("sci-edu-html");i&&(i.value=t.value)}catch(s){o(s.message||a("儲存失敗","Save failed"),!0)}}function E(t){const e=h(),s=e.findIndex(b=>b.slug===d),i=s+t;if(s<0||i<0||i>=e.length)return;const p=e[s],f=e[i],x=p.sort;p.sort=f.sort,f.sort=x,p.sort===f.sort&&(p.sort=s+t,f.sort=s),r.pages=e,I().then(async()=>{d?await v(d):y(),o(a("次序已更新。","Order updated."),!1)}).catch(b=>o(b.message||a("儲存失敗","Save failed"),!0))}function T(t){const e=document.getElementById("sci-edu-html");if(!e)return;const s=e.selectionStart||0,i=e.selectionEnd||0;e.value=e.value.slice(0,s)+t+e.value.slice(i),e.focus()}function H(){var t,e,s,i,p,f,x,b;(t=document.getElementById("sci-edu-save-lead"))==null||t.addEventListener("click",async()=>{const c=document.getElementById("sci-edu-lead");r.lead=c?c.value.trim():r.lead;try{await I(),o(a("導言已儲存。","Lead saved."),!1)}catch(u){o(u.message||a("儲存失敗","Save failed"),!0)}}),(e=document.getElementById("sci-edu-up"))==null||e.addEventListener("click",()=>E(-1)),(s=document.getElementById("sci-edu-down"))==null||s.addEventListener("click",()=>E(1)),document.querySelectorAll(".sci-edu-admin-pick").forEach(c=>{c.addEventListener("click",()=>v(c.getAttribute("data-slug")||""))}),(i=document.getElementById("sci-edu-new"))==null||i.addEventListener("submit",async c=>{c.preventDefault();const u=c.currentTarget,m={title:u.title.value.trim(),slug:u.slug.value.trim().toLowerCase()};try{r=await l.ScienceApi.apiFetch("/admin/science-edu/pages",{method:"POST",body:m}),o(a("已新增頁面。","Page added."),!1),await v(m.slug)}catch(g){o(g.message||a("新增失敗","Could not add"),!0)}}),(p=document.getElementById("sci-edu-save"))==null||p.addEventListener("click",k),(f=document.getElementById("sci-edu-preview"))==null||f.addEventListener("click",()=>{const c=document.getElementById("sci-edu-html"),u=document.getElementById("sci-edu-preview-box");if(!c||!u)return;u.classList.remove("hidden");const m=(l.__SITE_BASE__||"")+"/science-edu",g=c.value.replace(/src=(["'])images\//g,"src=$1"+m+"/images/");u.innerHTML=typeof l.DOMPurify>"u"?g:l.DOMPurify.sanitize(g,{ADD_ATTR:["target","rel","class"]})}),(x=document.getElementById("sci-edu-file"))==null||x.addEventListener("change",async c=>{const u=c.target.files&&c.target.files[0];if(c.target.value="",!u||!d)return;const m=new FormData;m.append("slug",d),m.append("file",u);try{const g=await l.ScienceApi.apiFetch("/admin/science-edu/images",{method:"POST",body:m});T(`
<figure class="sci-edu-figure"><img src="${g.path}" alt=""></figure>
`),o(a("圖片已插入，記得儲存此頁。","Image inserted. Save the page."),!1)}catch(g){o(g.message||a("上傳失敗","Upload failed"),!0)}}),(b=document.getElementById("sci-edu-delete"))==null||b.addEventListener("click",async()=>{if(d&&window.confirm(a("刪除此頁及以它命名的圖片？","Delete this page and images named for it?")))try{await l.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(d),{method:"DELETE"}),d="",await $(),o(a("已刪除。","Deleted."),!1),y()}catch(c){o(c.message||a("刪除失敗","Delete failed"),!0)}})}async function C(){if(!document.getElementById("sci-edu-css")){const s=document.createElement("link");s.id="sci-edu-css",s.rel="stylesheet",s.href=(l.__SITE_BASE__||"")+"/science-edu/science-edu.css",document.head.appendChild(s)}const t=document.getElementById("page-title");t&&(t.textContent=a("科學教育網頁","Science pages"));const e=document.getElementById("card-container");e&&(e.innerHTML=`<p class="text-slate-500">${n(a("載入中…","Loading…"))}</p>`);try{await $(),!d&&r.pages[0]&&(d=r.pages[0].slug),d?await v(d):y()}catch(s){e&&(e.innerHTML=`<p class="text-red-600">${n(s.message||a("載入失敗","Load failed"))}</p>`)}}l.AppScienceEduAdmin={render:C};
