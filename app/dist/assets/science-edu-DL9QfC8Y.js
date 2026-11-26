const o=window;function c(e,t){return o.AppRouter&&o.AppRouter.t?o.AppRouter.t(e,t):e}function s(e){return String(e||"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}function R(){return o.ScienceApi&&typeof o.ScienceApi.SITE_BASE=="string"?o.ScienceApi.SITE_BASE:typeof o.__SITE_BASE__=="string"?o.__SITE_BASE__:""}function l(){return R()+"/science-edu"}function S(){if(document.getElementById("sci-edu-css"))return;const e=document.createElement("link");e.id="sci-edu-css",e.rel="stylesheet",e.href=l()+"/science-edu.css",document.head.appendChild(e)}async function _(e){const t=await fetch(e,{cache:"no-store",credentials:"same-origin"});if(!t.ok)throw new Error(c("讀取科學教育內容失敗","Could not load science pages"));return t.text()}async function $(){const e=await _(l()+"/nav.json"),t=JSON.parse(e),a=Array.isArray(t.pages)?t.pages.slice():[];return a.sort((n,i)=>Number(n.sort||0)-Number(i.sort||0)),{title:String(t.title||"科學教育"),lead:String(t.lead||""),pages:a}}function b(e){const t=String(e||"").replace(/src=(["'])images\//g,"src=$1"+l()+"/images/");return typeof o.DOMPurify>"u"?t:o.DOMPurify.sanitize(t,{ADD_ATTR:["target","rel","class","data-sci-slug"]})}function E(e,t){return e.pages.find(a=>a.slug===t)||null}function y(e){return o.AppRouter&&typeof o.AppRouter.spaHref=="function"?o.AppRouter.spaHref("/science/"+e):"#/science/"+e}function x(e){const t="/science/"+encodeURIComponent(e);if(o.AppRouter&&typeof o.AppRouter.navigate=="function"){o.AppRouter.navigate(t);return}location.hash="#"+t}function A(e){e.querySelectorAll("[data-sci-slug]").forEach(t=>{t.addEventListener("click",a=>{a.preventDefault();const n=t.getAttribute("data-sci-slug");n&&x(n)})})}function w(){const e=o.ScienceApi;return!e||typeof e.getUser!="function"||!e.getUser()||typeof e.hasPermission!="function"?!1:e.hasPermission("article.manage_any")||e.hasPermission("user.manage")}function C(){return w()?`<div class="sci-edu-toolbar"><button type="button" class="sci-edu-edit" data-sci-admin="1">${s(c("編輯學科網頁","Edit subject pages"))}</button></div>`:""}function L(e){return String(e||"").replace(/src=(["'])images\//g,"src=$1"+l()+"/images/")}function H(e){const t=l().replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return String(e||"").replace(new RegExp(`src=(["'])`+t+"/images/","g"),"src=$1images/")}let u="",f="visual",p=null;function h(){return document.getElementById("sci-edu-modal")}function r(e,t){const a=document.getElementById("sci-edu-modal-status");a&&(a.textContent=e||"",a.className="sci-edu-modal-status"+(t?" is-error":""))}function k(e){var n;const t=document.getElementById("sci-edu-visual"),a=document.getElementById("sci-edu-source");!t||!a||(e==="html"&&f!=="html"?a.value=H(t.innerHTML).trim():e==="visual"&&f==="html"&&(t.innerHTML=b(L(a.value))),f=e,t.hidden=e!=="visual",a.hidden=e!=="html",(n=h())==null||n.querySelectorAll("[data-editor-mode]").forEach(i=>{const d=i.getAttribute("data-editor-mode")===e;i.classList.toggle("is-on",d),i.setAttribute("aria-pressed",d?"true":"false")}))}function I(){const e=document.getElementById("sci-edu-visual"),t=document.getElementById("sci-edu-source");return f==="html"?t?t.value:"":H(e?e.innerHTML:"").trim()}function P(e){const t=document.getElementById("sci-edu-visual"),a=document.getElementById("sci-edu-source"),n=String(e||"");a&&(a.value=n),t&&(t.innerHTML=b(L(n))),f="html",k("visual")}function B(e,t){const a=document.getElementById("sci-edu-visual");a&&(a.focus(),document.execCommand(e,!1,t))}function N(){var t,a,n;if(h())return;const e=document.createElement("div");e.id="sci-edu-modal",e.className="sci-edu-modal",e.hidden=!0,e.innerHTML=`
        <div class="sci-edu-modal-backdrop" data-sci-close="1"></div>
        <div class="sci-edu-modal-panel" role="dialog" aria-modal="true" aria-labelledby="sci-edu-modal-title">
            <header class="sci-edu-modal-head">
                <h2 id="sci-edu-modal-title">${s(c("編輯學科網頁","Edit subject pages"))}</h2>
                <button type="button" class="sci-edu-modal-close" data-sci-close="1" aria-label="${s(c("關閉","Close"))}">×</button>
            </header>
            <div class="sci-edu-modal-tools">
                <label class="sci-edu-modal-page">
                    <span>${s(c("頁面","Page"))}</span>
                    <select id="sci-edu-modal-page"></select>
                </label>
                <div class="sci-edu-mode" role="group" aria-label="${s(c("編輯方式","Editor mode"))}">
                    <button type="button" data-editor-mode="visual" class="is-on" aria-pressed="true">${s(c("視覺","Visual"))}</button>
                    <button type="button" data-editor-mode="html" aria-pressed="false">HTML</button>
                </div>
            </div>
            <div class="sci-edu-rte-bar" data-rte-bar="1">
                <button type="button" data-cmd="formatBlock" data-value="<h1>">H1</button>
                <button type="button" data-cmd="formatBlock" data-value="<h2>">H2</button>
                <button type="button" data-cmd="formatBlock" data-value="<p>">${s(c("內文","Text"))}</button>
                <button type="button" data-cmd="bold"><strong>B</strong></button>
                <button type="button" data-cmd="italic"><em>I</em></button>
                <button type="button" data-cmd="insertUnorderedList">${s(c("清單","List"))}</button>
                <button type="button" data-cmd="insertOrderedList">1.</button>
                <button type="button" data-cmd="createLink">${s(c("連結","Link"))}</button>
                <label class="sci-edu-upload">${s(c("圖片","Image"))}<input id="sci-edu-modal-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
            </div>
            <div id="sci-edu-visual" class="sci-edu-visual sci-edu-article" contenteditable="true" role="textbox" aria-multiline="true"></div>
            <textarea id="sci-edu-source" class="sci-edu-source" hidden spellcheck="false" aria-label="HTML"></textarea>
            <footer class="sci-edu-modal-foot">
                <p id="sci-edu-modal-status" class="sci-edu-modal-status" role="status"></p>
                <button type="button" id="sci-edu-modal-save" class="sci-edu-edit">${s(c("儲存","Save"))}</button>
            </footer>
        </div>`,document.body.appendChild(e),e.addEventListener("click",i=>{i.target.closest("[data-sci-close]")&&T()}),e.querySelectorAll("[data-editor-mode]").forEach(i=>{i.addEventListener("click",()=>k(i.getAttribute("data-editor-mode")))}),e.querySelectorAll("[data-cmd]").forEach(i=>{i.addEventListener("click",()=>{const d=i.getAttribute("data-cmd");if(d==="createLink"){const v=window.prompt(c("連結網址","Link URL"),"https://");v&&B("createLink",v);return}const m=i.getAttribute("data-value");B(d,m||void 0)})}),(t=document.getElementById("sci-edu-modal-page"))==null||t.addEventListener("change",i=>{M(i.target.value)}),(a=document.getElementById("sci-edu-modal-save"))==null||a.addEventListener("click",j),(n=document.getElementById("sci-edu-modal-file"))==null||n.addEventListener("change",O),document.addEventListener("keydown",i=>{i.key==="Escape"&&h()&&!h().hidden&&T()})}function q(){const e=document.getElementById("sci-edu-modal-page");!e||!p||(e.innerHTML=p.pages.map(t=>`<option value="${s(t.slug)}"${t.slug===u?" selected":""}>${s(t.title)}</option>`).join(""))}async function M(e){u=e,r(c("載入中…","Loading…"),!1);try{const t=await o.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(e));P(t.html||""),r("",!1)}catch(t){r(t.message||c("讀取失敗","Load failed"),!0)}}async function U(e){var a;if(!w())return;S(),N();const t=h();p=await $(),u=E(p,e)?e:p.pages[0]&&p.pages[0].slug||"home",q(),t.hidden=!1,document.body.classList.add("sci-edu-modal-open"),(a=t.querySelector(".sci-edu-modal-close"))==null||a.focus(),await M(u)}function T(){const e=h();e&&(e.hidden=!0),document.body.classList.remove("sci-edu-modal-open")}async function j(){var e;if(u){r(c("儲存中…","Saving…"),!1);try{await o.ScienceApi.apiFetch("/admin/science-edu/pages/"+encodeURIComponent(u),{method:"PUT",body:{html:I()}});const t=document.querySelector(".sci-edu-article:not(.sci-edu-visual)"),a=(e=document.querySelector('.sci-edu-nav [aria-current="page"]'))==null?void 0:e.getAttribute("data-sci-slug");t&&a===u&&(t.innerHTML=b(L(I())),A(t)),r(c("已儲存。","Saved."),!1)}catch(t){r(t.message||c("儲存失敗","Save failed"),!0)}}}async function O(e){var n;const t=e.target.files&&e.target.files[0];if(e.target.value="",!t||!u)return;const a=new FormData;a.append("slug",u),a.append("file",t);try{const i=await o.ScienceApi.apiFetch("/admin/science-edu/images",{method:"POST",body:a}),d=`<figure class="sci-edu-figure"><img src="${l()}/${i.path}" alt=""></figure>`;if(f==="html"){const m=document.getElementById("sci-edu-source");m&&(m.value+=`
<figure class="sci-edu-figure"><img src="${i.path}" alt=""></figure>
`)}else(n=document.getElementById("sci-edu-visual"))==null||n.focus(),document.execCommand("insertHTML",!1,d);r(c("圖片已插入，記得儲存。","Image inserted. Remember to save."),!1)}catch(i){r(i.message||c("上傳失敗","Upload failed"),!0)}}function D(e){e.querySelectorAll("[data-sci-admin]").forEach(t=>{t.addEventListener("click",()=>{var n;const a=((n=e.querySelector('.sci-edu-nav [aria-current="page"]'))==null?void 0:n.getAttribute("data-sci-slug"))||"home";U(a)})})}function z(e,t){const n=e.pages.filter(i=>!i.parent).map(i=>{const d=e.pages.filter(g=>g.parent===i.slug),m=`<a href="${s(y(i.slug))}" data-sci-slug="${s(i.slug)}"${i.slug===t?' aria-current="page"':""}>${s(i.title)}</a>`,v=d.map(g=>`<a class="is-child" href="${s(y(g.slug))}" data-sci-slug="${s(g.slug)}"${g.slug===t?' aria-current="page"':""}>${s(g.title)}</a>`).join("");return m+v}).join("");return`<nav class="sci-edu-nav" aria-label="${s(c("科學教育","Science education"))}">${n}</nav>`}async function F(e){S();const t=document.getElementById("main-content");if(t){document.body.classList.remove("guest-landing"),t.innerHTML=`<p class="text-slate-500 p-6">${s(c("載入中…","Loading…"))}</p>`;try{const a=await $(),n=e&&E(a,e)?e:"home",i=E(a,n)||{slug:"home",title:a.title},d=await _(l()+"/pages/"+encodeURIComponent(i.slug)+".html");document.title=i.title+" · "+(o.__SITE_NAMES__&&o.__SITE_NAMES__.zh?o.__SITE_NAMES__.zh:"科學教育"),t.innerHTML=`
            <div class="sci-edu-shell">
                ${z(a,i.slug)}
                <div class="sci-edu-main">
                    ${C()}
                    <article class="sci-edu-article">${b(d)}</article>
                </div>
            </div>`,A(t),D(t)}catch(a){t.innerHTML=`<p class="text-red-600 p-6">${s(a&&a.message?a.message:c("載入失敗","Load failed"))}</p>`}}}async function J(e){if(e){S();try{const t=await $(),a=["讓學生認識自己及生活環境，建立對科學與自然界的基本認知。","通過科學探究，培養生活技能、學習能力與明辨思考。","運用科學知識解決真實問題，並養成終身學習的習慣。"],n=t.pages.filter(i=>i.showOnHome&&!i.parent);e.innerHTML=`
            <section class="sci-edu-home" aria-labelledby="sci-edu-home-title">
                <div class="sci-edu-home-inner">
                    <p class="sci-edu-kicker">Queen Elizabeth School Old Students' Association Secondary School</p>
                    <h2 id="sci-edu-home-title">${s(t.title)}</h2>
                    <p class="sci-edu-lead">${s(t.lead)}</p>
                    <ul class="sci-edu-ideas">
                        ${a.map(i=>`<li>${s(i)}</li>`).join("")}
                    </ul>
                    <a class="sci-edu-more" href="${s(y("home"))}" data-sci-slug="home">${s(c("閱讀課程理念","Read the curriculum ideas"))}</a>
                    <div class="sci-edu-grid">
                        ${n.map(i=>`
                            <a class="sci-edu-card" href="${s(y(i.slug))}" data-sci-slug="${s(i.slug)}">
                                <strong>${s(i.title)}</strong>
                                <span>${s(i.summary||"")}</span>
                            </a>`).join("")}
                    </div>
                </div>
            </section>`,A(e)}catch{e.innerHTML=""}}}o.AppScienceEdu={renderPage:F,mountHome:J,contentBase:l};
