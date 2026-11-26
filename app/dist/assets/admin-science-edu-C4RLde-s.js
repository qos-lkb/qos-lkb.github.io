const i=window;function a(e,t){return i.AppRouter&&i.AppRouter.t?i.AppRouter.t(e,t):e}function s(e){return i.AppRouter&&i.AppRouter.escapeHtml?i.AppRouter.escapeHtml(e):String(e||"")}let u={title:"",lead:"",pages:[]},l="",y="visual";function $(){return(i.__SITE_BASE__||"")+"/science-edu"}function E(e){return String(e||"").replace(/src=(["'])images\//g,"src=$1"+$()+"/images/")}function A(e){const t=$().replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return String(e||"").replace(new RegExp(`src=(["'])`+t+"/images/","g"),"src=$1images/")}function w(e){const t=document.getElementById("sci-edu-visual"),n=document.getElementById("sci-edu-html");!t||!n||(e==="html"&&y!=="html"&&(n.value=A(t.innerHTML).trim()),e==="visual"&&y==="html"&&(t.innerHTML=typeof i.DOMPurify>"u"?E(n.value):i.DOMPurify.sanitize(E(n.value),{ADD_ATTR:["target","rel","class","data-sci-slug"]})),y=e,t.hidden=e!=="visual",n.hidden=e!=="html",document.querySelectorAll("[data-admin-mode]").forEach(c=>{const o=c.getAttribute("data-admin-mode")===e;c.classList.toggle("is-on",o),c.setAttribute("aria-pressed",o?"true":"false")}))}function k(){const e=document.getElementById("sci-edu-visual"),t=document.getElementById("sci-edu-html");return y==="html"?t?t.value:"":A(e?e.innerHTML:"").trim()}function T(e){const t=document.getElementById("sci-edu-html");t&&(t.value=e||""),y="html",w("visual")}function I(){return u.pages.slice().sort((e,t)=>Number(e.sort||0)-Number(t.sort||0))}function B(e){return u.pages.find(t=>t.slug===e)||null}async function H(){u=await i.ScienceApi.apiFetch("/admin/science-edu"),u.pages||(u.pages=[])}async function C(){u=await i.ScienceApi.apiFetch("/admin/science-edu",{method:"PUT",body:u})}function r(e,t){const n=document.getElementById("sci-edu-admin-status");n&&(n.textContent=e||"",n.className=t?"text-sm text-red-600":"text-sm text-emerald-700")}function D(){return I().map(t=>{const n=t.slug===l?" bg-teal-50 border-teal-300":" bg-white border-slate-200",c=t.parent?" pl-6":"";return`<button type="button" class="sci-edu-admin-pick w-full text-left px-3 py-2 rounded-lg border text-sm${n}${c}" data-slug="${s(t.slug)}">
            <span class="font-medium">${s(t.title)}</span>
            <span class="block text-xs text-slate-500">${s(t.slug)}</span>
        </button>`}).join("")}function M(e){const t=[`<option value="">${s(a("（頂層）","(Top level)"))}</option>`];return I().forEach(n=>{if(e&&n.slug===e.slug)return;const c=e&&e.parent===n.slug?" selected":"";t.push(`<option value="${s(n.slug)}"${c}>${s(n.title)}</option>`)}),t.join("")}function R(){const e=B(l);return e?`
        <div class="space-y-3">
            <label class="block text-sm">
                <span class="text-slate-600">${s(a("標題","Title"))}</span>
                <input id="sci-edu-title" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${s(e.title)}">
            </label>
            <label class="block text-sm">
                <span class="text-slate-600">${s(a("首頁摘要","Home summary"))}</span>
                <input id="sci-edu-summary" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${s(e.summary||"")}">
            </label>
            <div class="grid sm:grid-cols-2 gap-3">
                <label class="block text-sm">
                    <span class="text-slate-600">${s(a("父頁","Parent"))}</span>
                    <select id="sci-edu-parent" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${M(e)}</select>
                </label>
                <label class="flex items-end gap-2 text-sm pb-2">
                    <input id="sci-edu-home" type="checkbox"${e.showOnHome?" checked":""}>
                    <span>${s(a("在訪客首頁顯示為卡片","Show as a card on the guest home"))}</span>
                </label>
            </div>
            <div class="flex items-center justify-between gap-2">
                <span class="text-sm text-slate-600">${s(a("正文","Body"))}</span>
                <div class="sci-edu-mode" role="group">
                    <button type="button" data-admin-mode="visual" class="is-on" aria-pressed="true">${s(a("視覺","Visual"))}</button>
                    <button type="button" data-admin-mode="html" aria-pressed="false">HTML</button>
                </div>
            </div>
            <div class="sci-edu-rte-bar">
                <button type="button" data-admin-cmd="formatBlock" data-value="<h1>">H1</button>
                <button type="button" data-admin-cmd="formatBlock" data-value="<h2>">H2</button>
                <button type="button" data-admin-cmd="formatBlock" data-value="<p>">${s(a("內文","Text"))}</button>
                <button type="button" data-admin-cmd="bold" title="${s(a("粗體","Bold"))}"><strong>B</strong></button>
                <button type="button" data-admin-cmd="italic" title="${s(a("斜體","Italic"))}"><em>I</em></button>
                <button type="button" data-admin-cmd="underline" title="${s(a("底線","Underline"))}"><span style="text-decoration:underline">U</span></button>
                <button type="button" data-admin-cmd="justifyLeft">${s(a("置左","Left"))}</button>
                <button type="button" data-admin-cmd="justifyCenter">${s(a("置中","Center"))}</button>
                <button type="button" data-admin-cmd="justifyRight">${s(a("置右","Right"))}</button>
                <button type="button" data-admin-cmd="insertUnorderedList">${s(a("清單","List"))}</button>
                <button type="button" data-admin-cmd="insertOrderedList">1.</button>
                <button type="button" data-admin-cmd="createLink">${s(a("連結","Link"))}</button>
            </div>
            <div id="sci-edu-visual" class="sci-edu-visual sci-edu-article" contenteditable="true"></div>
            <textarea id="sci-edu-html" class="sci-edu-source w-full" rows="16" hidden></textarea>
            <div class="flex flex-wrap gap-2">
                <button type="button" id="sci-edu-save" class="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium">${s(a("儲存此頁","Save page"))}</button>
                <button type="button" id="sci-edu-preview" class="px-4 py-2 rounded-lg border border-slate-300 text-sm">${s(a("預覽","Preview"))}</button>
                <label class="px-4 py-2 rounded-lg border border-slate-300 text-sm cursor-pointer">
                    ${s(a("上傳圖片","Upload image"))}
                    <input id="sci-edu-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden">
                </label>
                <button type="button" id="sci-edu-delete" class="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm">${s(a("刪除","Delete"))}</button>
            </div>
            <div id="sci-edu-preview-box" class="sci-edu-article hidden"></div>
        </div>`:`<p class="text-sm text-slate-500">${s(a("請選擇左側頁面，或新增一頁。","Choose a page, or add one."))}</p>`}function v(){const e=document.getElementById("card-container"),t=document.getElementById("page-title");t&&(t.textContent=a("科學教育網頁","Science pages")),e&&(e.innerHTML=`
        <p class="text-sm text-slate-500">${s(a("內容寫入 science-edu/ 靜態檔，不會進入資料庫。","Content is saved as static files under science-edu/, not in the database."))}</p>
        <p id="sci-edu-admin-status" class="text-sm text-emerald-700" role="status"></p>
        <label class="block text-sm max-w-3xl">
            <span class="text-slate-600">${s(a("首頁導言","Home lead"))}</span>
            <input id="sci-edu-lead" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value="${s(u.lead||"")}">
        </label>
        <div class="flex flex-wrap gap-2">
            <button type="button" id="sci-edu-save-lead" class="px-4 py-2 rounded-lg border border-slate-300 text-sm">${s(a("儲存導言","Save lead"))}</button>
            <button type="button" id="sci-edu-up" class="px-3 py-2 rounded-lg border border-slate-300 text-sm">${s(a("上移","Up"))}</button>
            <button type="button" id="sci-edu-down" class="px-3 py-2 rounded-lg border border-slate-300 text-sm">${s(a("下移","Down"))}</button>
        </div>
        <div class="grid lg:grid-cols-[16rem_1fr] gap-4 items-start">
            <div class="space-y-2">
                <div id="sci-edu-list" class="space-y-1">${D()}</div>
                <form id="sci-edu-new" class="space-y-2 border border-dashed border-slate-300 rounded-lg p-3">
                    <p class="text-xs font-medium text-slate-500">${s(a("新增頁面","New page"))}</p>
                    <input name="title" required placeholder="${s(a("標題","Title"))}" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="slug" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <button type="submit" class="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">${s(a("加入","Add"))}</button>
                </form>
            </div>
            <div id="sci-edu-editor">${R()}</div>
        </div>`,U())}async function h(e){if(l=e,v(),!!document.getElementById("sci-edu-html"))try{const n=await i.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(e));T(n.html||"")}catch(n){r(n.message||a("讀取失敗","Load failed"),!0)}}function P(){const e=B(l);if(!e)return;const t=document.getElementById("sci-edu-title"),n=document.getElementById("sci-edu-summary"),c=document.getElementById("sci-edu-parent"),o=document.getElementById("sci-edu-home");t&&(e.title=t.value.trim()),n&&(e.summary=n.value.trim()),c&&(e.parent=c.value),o&&(e.showOnHome=o.checked)}async function O(){if(!l||!document.getElementById("sci-edu-visual"))return;const e=k();P();const t=B(l);r(a("儲存中…","Saving…"),!1);try{const n=await i.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(l),{method:"PUT",body:{html:e,title:t.title,summary:t.summary,parent:t.parent,showOnHome:t.showOnHome,sort:t.sort}});n.nav&&(u=n.nav),r(a("已寫入靜態檔。","Saved to static files."),!1),v(),T(e)}catch(n){r(n.message||a("儲存失敗","Save failed"),!0)}}function S(e){const t=I(),n=t.findIndex(b=>b.slug===l),c=n+e;if(n<0||c<0||c>=t.length)return;const o=t[n],g=t[c],x=o.sort;o.sort=g.sort,g.sort=x,o.sort===g.sort&&(o.sort=n+e,g.sort=n),u.pages=t,C().then(async()=>{l?await h(l):v(),r(a("次序已更新。","Order updated."),!1)}).catch(b=>r(b.message||a("儲存失敗","Save failed"),!0))}function _(e){if(y==="html"){const n=document.getElementById("sci-edu-html");if(!n)return;const c=n.selectionStart||0,o=n.selectionEnd||0;n.value=n.value.slice(0,c)+e+n.value.slice(o),n.focus();return}const t=document.getElementById("sci-edu-visual");t&&(t.focus(),document.execCommand("insertHTML",!1,e.replace(/src=(["'])images\//g,"src=$1"+$()+"/images/")))}function U(){var e,t,n,c,o,g,x,b;(e=document.getElementById("sci-edu-save-lead"))==null||e.addEventListener("click",async()=>{const d=document.getElementById("sci-edu-lead");u.lead=d?d.value.trim():u.lead;try{await C(),r(a("導言已儲存。","Lead saved."),!1)}catch(m){r(m.message||a("儲存失敗","Save failed"),!0)}}),(t=document.getElementById("sci-edu-up"))==null||t.addEventListener("click",()=>S(-1)),(n=document.getElementById("sci-edu-down"))==null||n.addEventListener("click",()=>S(1)),document.querySelectorAll(".sci-edu-admin-pick").forEach(d=>{d.addEventListener("click",()=>h(d.getAttribute("data-slug")||""))}),(c=document.getElementById("sci-edu-new"))==null||c.addEventListener("submit",async d=>{d.preventDefault();const m=d.currentTarget,p={title:m.title.value.trim(),slug:m.slug.value.trim().toLowerCase()};try{u=await i.ScienceApi.apiFetch("/admin/science-edu/pages",{method:"POST",body:p}),r(a("已新增頁面。","Page added."),!1),await h(p.slug)}catch(f){r(f.message||a("新增失敗","Could not add"),!0)}}),(o=document.getElementById("sci-edu-save"))==null||o.addEventListener("click",O),document.querySelectorAll("[data-admin-mode]").forEach(d=>{d.addEventListener("click",()=>w(d.getAttribute("data-admin-mode")))}),document.querySelectorAll("[data-admin-cmd]").forEach(d=>{d.addEventListener("click",()=>{const m=document.getElementById("sci-edu-visual");if(!m)return;w("visual"),m.focus();const p=d.getAttribute("data-admin-cmd");if(p==="createLink"){const L=window.prompt(a("連結網址","Link URL"),"https://");L&&document.execCommand("createLink",!1,L);return}const f=d.getAttribute("data-value");document.execCommand(p,!1,f||void 0)})}),(g=document.getElementById("sci-edu-preview"))==null||g.addEventListener("click",()=>{const d=document.getElementById("sci-edu-preview-box");if(!d)return;d.classList.remove("hidden");const m=E(k());d.innerHTML=typeof i.DOMPurify>"u"?m:i.DOMPurify.sanitize(m,{ADD_ATTR:["target","rel","class"]})}),(x=document.getElementById("sci-edu-file"))==null||x.addEventListener("change",async d=>{const m=d.target.files&&d.target.files[0];if(d.target.value="",!m||!l)return;const p=new FormData;p.append("slug",l),p.append("file",m);try{const f=await i.ScienceApi.apiFetch("/admin/science-edu/images",{method:"POST",body:p});_(`
<figure class="sci-edu-figure"><img src="${f.path}" alt=""></figure>
`),r(a("圖片已插入，記得儲存此頁。","Image inserted. Save the page."),!1)}catch(f){r(f.message||a("上傳失敗","Upload failed"),!0)}}),(b=document.getElementById("sci-edu-delete"))==null||b.addEventListener("click",async()=>{if(l&&window.confirm(a("刪除此頁及以它命名的圖片？","Delete this page and images named for it?")))try{await i.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(l),{method:"DELETE"}),l="",await H(),r(a("已刪除。","Deleted."),!1),v()}catch(d){r(d.message||a("刪除失敗","Delete failed"),!0)}})}async function F(){if(!document.getElementById("sci-edu-css")){const n=document.createElement("link");n.id="sci-edu-css",n.rel="stylesheet",n.href=(i.__SITE_BASE__||"")+"/science-edu/science-edu.css",document.head.appendChild(n)}const e=document.getElementById("page-title");e&&(e.textContent=a("科學教育網頁","Science pages"));const t=document.getElementById("card-container");t&&(t.innerHTML=`<p class="text-slate-500">${s(a("載入中…","Loading…"))}</p>`);try{await H(),!l&&u.pages[0]&&(l=u.pages[0].slug),l?await h(l):v()}catch(n){t&&(t.innerHTML=`<p class="text-red-600">${s(n.message||a("載入失敗","Load failed"))}</p>`)}}i.AppScienceEduAdmin={render:F};
