const s=window;function o(e,t){return s.AppRouter&&s.AppRouter.t?s.AppRouter.t(e,t):e}function a(e){return String(e||"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[t])}function A(){return s.ScienceApi&&typeof s.ScienceApi.SITE_BASE=="string"?s.ScienceApi.SITE_BASE:typeof s.__SITE_BASE__=="string"?s.__SITE_BASE__:""}function u(){return A()+"/science-edu"}function g(){if(document.getElementById("sci-edu-css"))return;const e=document.createElement("link");e.id="sci-edu-css",e.rel="stylesheet",e.href=u()+"/science-edu.css",document.head.appendChild(e)}async function f(e){const t=await fetch(e,{cache:"no-store",credentials:"same-origin"});if(!t.ok)throw new Error(o("讀取科學教育內容失敗","Could not load science pages"));return t.text()}async function m(){const e=await f(u()+"/nav.json"),t=JSON.parse(e),i=Array.isArray(t.pages)?t.pages.slice():[];return i.sort((c,n)=>Number(c.sort||0)-Number(n.sort||0)),{title:String(t.title||"科學教育"),lead:String(t.lead||""),pages:i}}function $(e){const t=String(e||"").replace(/src=(["'])images\//g,"src=$1"+u()+"/images/");return typeof s.DOMPurify>"u"?t:s.DOMPurify.sanitize(t,{ADD_ATTR:["target","rel","class","data-sci-slug"]})}function p(e,t){return e.pages.find(i=>i.slug===t)||null}function l(e){return s.AppRouter&&typeof s.AppRouter.spaHref=="function"?s.AppRouter.spaHref("/science/"+e):"#/science/"+e}function y(e){const t="/science/"+encodeURIComponent(e);if(s.AppRouter&&typeof s.AppRouter.navigate=="function"){s.AppRouter.navigate(t);return}location.hash="#"+t}function h(e){e.querySelectorAll("[data-sci-slug]").forEach(t=>{t.addEventListener("click",i=>{i.preventDefault();const c=t.getAttribute("data-sci-slug");c&&y(c)})})}function E(e,t){const c=e.pages.filter(n=>!n.parent).map(n=>{const d=e.pages.filter(r=>r.parent===n.slug),S=`<a href="${a(l(n.slug))}" data-sci-slug="${a(n.slug)}"${n.slug===t?' aria-current="page"':""}>${a(n.title)}</a>`,_=d.map(r=>`<a class="is-child" href="${a(l(r.slug))}" data-sci-slug="${a(r.slug)}"${r.slug===t?' aria-current="page"':""}>${a(r.title)}</a>`).join("");return S+_}).join("");return`<nav class="sci-edu-nav" aria-label="${a(o("科學教育","Science education"))}">${c}</nav>`}async function v(e){g();const t=document.getElementById("main-content");if(t){document.body.classList.remove("guest-landing"),t.innerHTML=`<p class="text-slate-500 p-6">${a(o("載入中…","Loading…"))}</p>`;try{const i=await m(),c=e&&p(i,e)?e:"home",n=p(i,c)||{slug:"home",title:i.title},d=await f(u()+"/pages/"+encodeURIComponent(n.slug)+".html");document.title=n.title+" · "+(s.__SITE_NAMES__&&s.__SITE_NAMES__.zh?s.__SITE_NAMES__.zh:"科學教育"),t.innerHTML=`
            <div class="sci-edu-shell">
                ${E(i,n.slug)}
                <article class="sci-edu-article">${$(d)}</article>
            </div>`,h(t)}catch(i){t.innerHTML=`<p class="text-red-600 p-6">${a(i&&i.message?i.message:o("載入失敗","Load failed"))}</p>`}}}async function T(e){if(e){g();try{const t=await m(),i=["讓學生認識自己及生活環境，建立對科學與自然界的基本認知。","通過科學探究，培養生活技能、學習能力與明辨思考。","運用科學知識解決真實問題，並養成終身學習的習慣。"],c=t.pages.filter(n=>n.showOnHome&&!n.parent);e.innerHTML=`
            <section class="sci-edu-home" aria-labelledby="sci-edu-home-title">
                <div class="sci-edu-home-inner">
                    <p class="sci-edu-kicker">Queen Elizabeth School Old Students' Association Secondary School</p>
                    <h2 id="sci-edu-home-title">${a(t.title)}</h2>
                    <p class="sci-edu-lead">${a(t.lead)}</p>
                    <ul class="sci-edu-ideas">
                        ${i.map(n=>`<li>${a(n)}</li>`).join("")}
                    </ul>
                    <a class="sci-edu-more" href="${a(l("home"))}" data-sci-slug="home">${a(o("閱讀課程理念","Read the curriculum ideas"))}</a>
                    <div class="sci-edu-grid">
                        ${c.map(n=>`
                            <a class="sci-edu-card" href="${a(l(n.slug))}" data-sci-slug="${a(n.slug)}">
                                <strong>${a(n.title)}</strong>
                                <span>${a(n.summary||"")}</span>
                            </a>`).join("")}
                    </div>
                </div>
            </section>`,h(e)}catch{e.innerHTML=""}}}s.AppScienceEdu={renderPage:v,mountHome:T,contentBase:u};
