const n=window;function o(e,t){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(e,t):e}function a(e){return String(e||"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}function y(){return n.ScienceApi&&typeof n.ScienceApi.SITE_BASE=="string"?n.ScienceApi.SITE_BASE:typeof n.__SITE_BASE__=="string"?n.__SITE_BASE__:""}function u(){return y()+"/science-edu"}function f(){if(document.getElementById("sci-edu-css"))return;const e=document.createElement("link");e.id="sci-edu-css",e.rel="stylesheet",e.href=u()+"/science-edu.css",document.head.appendChild(e)}async function g(e){const t=await fetch(e,{cache:"no-store",credentials:"same-origin"});if(!t.ok)throw new Error(o("讀取科學教育內容失敗","Could not load science pages"));return t.text()}async function m(){const e=await g(u()+"/nav.json"),t=JSON.parse(e),s=Array.isArray(t.pages)?t.pages.slice():[];return s.sort((c,i)=>Number(c.sort||0)-Number(i.sort||0)),{title:String(t.title||"科學教育"),lead:String(t.lead||""),pages:s}}function _(e){const t=String(e||"").replace(/src=(["'])images\//g,"src=$1"+u()+"/images/");return typeof n.DOMPurify>"u"?t:n.DOMPurify.sanitize(t,{ADD_ATTR:["target","rel","class","data-sci-slug"]})}function p(e,t){return e.pages.find(s=>s.slug===t)||null}function l(e){return n.AppRouter&&typeof n.AppRouter.spaHref=="function"?n.AppRouter.spaHref("/science/"+e):"#/science/"+e}function $(e){const t="/science/"+encodeURIComponent(e);if(n.AppRouter&&typeof n.AppRouter.navigate=="function"){n.AppRouter.navigate(t);return}location.hash="#"+t}function h(e){e.querySelectorAll("[data-sci-slug]").forEach(t=>{t.addEventListener("click",s=>{s.preventDefault();const c=t.getAttribute("data-sci-slug");c&&$(c)})})}function v(){const e=n.ScienceApi;return!e||typeof e.getUser!="function"||!e.getUser()||typeof e.hasPermission!="function"?!1:e.hasPermission("article.manage_any")||e.hasPermission("user.manage")}function E(){if(!v())return"";const e=n.AppRouter&&typeof n.AppRouter.spaHref=="function"?n.AppRouter.spaHref("/admin/science-edu"):"#/admin/science-edu";return`<div class="sci-edu-toolbar"><a class="sci-edu-edit" href="${a(e)}" data-sci-admin="1">${a(o("編輯學科網頁","Edit subject pages"))}</a></div>`}function R(e){e.querySelectorAll("[data-sci-admin]").forEach(t=>{t.addEventListener("click",s=>{s.preventDefault(),n.AppRouter&&typeof n.AppRouter.navigate=="function"&&n.AppRouter.navigate("/admin/science-edu")})})}function H(e,t){const c=e.pages.filter(i=>!i.parent).map(i=>{const d=e.pages.filter(r=>r.parent===i.slug),A=`<a href="${a(l(i.slug))}" data-sci-slug="${a(i.slug)}"${i.slug===t?' aria-current="page"':""}>${a(i.title)}</a>`,S=d.map(r=>`<a class="is-child" href="${a(l(r.slug))}" data-sci-slug="${a(r.slug)}"${r.slug===t?' aria-current="page"':""}>${a(r.title)}</a>`).join("");return A+S}).join("");return`<nav class="sci-edu-nav" aria-label="${a(o("科學教育","Science education"))}">${c}</nav>`}async function T(e){f();const t=document.getElementById("main-content");if(t){document.body.classList.remove("guest-landing"),t.innerHTML=`<p class="text-slate-500 p-6">${a(o("載入中…","Loading…"))}</p>`;try{const s=await m(),c=e&&p(s,e)?e:"home",i=p(s,c)||{slug:"home",title:s.title},d=await g(u()+"/pages/"+encodeURIComponent(i.slug)+".html");document.title=i.title+" · "+(n.__SITE_NAMES__&&n.__SITE_NAMES__.zh?n.__SITE_NAMES__.zh:"科學教育"),t.innerHTML=`
            <div class="sci-edu-shell">
                ${H(s,i.slug)}
                <div class="sci-edu-main">
                    ${E()}
                    <article class="sci-edu-article">${_(d)}</article>
                </div>
            </div>`,h(t),R(t)}catch(s){t.innerHTML=`<p class="text-red-600 p-6">${a(s&&s.message?s.message:o("載入失敗","Load failed"))}</p>`}}}async function b(e){if(e){f();try{const t=await m(),s=["讓學生認識自己及生活環境，建立對科學與自然界的基本認知。","通過科學探究，培養生活技能、學習能力與明辨思考。","運用科學知識解決真實問題，並養成終身學習的習慣。"],c=t.pages.filter(i=>i.showOnHome&&!i.parent);e.innerHTML=`
            <section class="sci-edu-home" aria-labelledby="sci-edu-home-title">
                <div class="sci-edu-home-inner">
                    <p class="sci-edu-kicker">Queen Elizabeth School Old Students' Association Secondary School</p>
                    <h2 id="sci-edu-home-title">${a(t.title)}</h2>
                    <p class="sci-edu-lead">${a(t.lead)}</p>
                    <ul class="sci-edu-ideas">
                        ${s.map(i=>`<li>${a(i)}</li>`).join("")}
                    </ul>
                    <a class="sci-edu-more" href="${a(l("home"))}" data-sci-slug="home">${a(o("閱讀課程理念","Read the curriculum ideas"))}</a>
                    <div class="sci-edu-grid">
                        ${c.map(i=>`
                            <a class="sci-edu-card" href="${a(l(i.slug))}" data-sci-slug="${a(i.slug)}">
                                <strong>${a(i.title)}</strong>
                                <span>${a(i.summary||"")}</span>
                            </a>`).join("")}
                    </div>
                </div>
            </section>`,h(e)}catch{e.innerHTML=""}}}n.AppScienceEdu={renderPage:T,mountHome:b,contentBase:u};
