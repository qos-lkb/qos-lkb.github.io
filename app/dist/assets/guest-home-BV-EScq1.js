const t=window;function s(e,n){return t.AppRouter&&typeof t.AppRouter.t=="function"?t.AppRouter.t(e,n):(localStorage.getItem("science_sims_ui_lang")||"zh")==="zh"?e:n}function u(e){return String(e||"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[n])}function g(){var o,i;const e=t.__SITE_NAMES__||{};return((((i=(o=t.AppRouter)==null?void 0:o.getLang)==null?void 0:i.call(o))||"zh")==="zh"?e.zh:e.en)||e.zh||"伊中中科學學習平台"}function p(){return(t.ScienceApi&&ScienceApi.SITE_BASE||t.__SITE_BASE__||"")+"/login.php?next="+encodeURIComponent("app/")}function h(e){if(t.AppRouter&&typeof t.AppRouter.navigate=="function"){t.AppRouter.navigate(e);return}location.hash="#"+e}function r(e,n,o,i,a){return`
            <div class="guest-feature flex gap-4 items-start">
                <div class="guest-feature-icon flex-shrink-0 w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center" aria-hidden="true">
                    ${e}
                </div>
                <div>
                    <h2 class="font-semibold text-slate-900 text-base">${s(n,o)}</h2>
                    <p class="text-sm text-slate-600 mt-1 leading-relaxed">${s(i,a)}</p>
                </div>
            </div>`}function x(){const e=document.getElementById("main-content");if(!e)return;const n=u(g()),o=u(p()),i='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>',a='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>',d='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>',m='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';e.innerHTML=`
            <div class="guest-home max-w-5xl mx-auto w-full">
                <section class="guest-hero relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white px-6 sm:px-10 py-12 sm:py-16 mb-10">
                    <div class="guest-hero-glow" aria-hidden="true"></div>
                    <div class="relative z-10 max-w-2xl">
                        <p class="guest-hero-brand text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                            ${n}
                        </p>
                        <p class="mt-4 sm:mt-5 text-indigo-100 text-base sm:text-lg leading-relaxed">
                            ${s("中學科學互動學習空間：模擬實驗、自學課程、筆記與暑期功課，隨時探索。","An interactive science space for secondary learners: simulations, self-study courses, notes, and summer homework.")}
                        </p>
                        <div class="mt-8 flex flex-wrap gap-3">
                            <a href="${o}" class="guest-cta-primary inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-indigo-950 font-semibold text-sm shadow-sm hover:bg-indigo-50 transition">
                                ${s("登入開始學習","Sign in to learn")}
                            </a>
                            <button type="button" data-nav="/simulations" class="guest-cta-secondary inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-white/30 bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition">
                                ${s("瀏覽模擬程式","Browse simulations")}
                            </button>
                            <button type="button" data-nav="/courses" class="guest-cta-secondary inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-white/30 bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition">
                                ${s("自學課程","Self-study courses")}
                            </button>
                            <button type="button" data-nav="/summer-homework" class="guest-cta-secondary inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-white/30 bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition">
                                ${s("暑期功課","Summer homework")}
                            </button>
                        </div>
                    </div>
                </section>

                <section class="guest-features space-y-8 px-1 sm:px-2" aria-label="${s("平台功能","What you can explore")}">
                    <p class="text-sm font-semibold text-slate-500 tracking-wide uppercase">${s("你可以探索","Explore")}</p>
                    ${r(i,"模擬程式","Simulations","互動物理、化學、生物與更多實驗，無需安裝即可操作。","Interactive physics, chemistry, biology and more — run in the browser.")}
                    ${r(a,"自學課程與筆記","Courses and notes","依課題編排的筆記、工作紙與影片，按自己的節奏學習。","Topic-based notes, worksheets and videos at your own pace.")}
                    ${r(d,"暑期功課","Summer homework","中一／中二閱讀或影片習作；訪客可預覽內容，登入後作答呈交。","S1/S2 reading or video tasks — preview as a guest, submit after signing in.")}
                    ${r(m,"登入後完整功能","Full access after sign-in","儲存進度、呈交暑期功課與檢視學習紀錄。學校帳戶請使用 QSIS 帳戶名登入。","Save progress, submit summer homework and view your learning record. Use your QSIS username to sign in.")}
                </section>
            </div>`,e.querySelectorAll("[data-nav]").forEach(l=>{l.addEventListener("click",()=>{const c=l.getAttribute("data-nav");c&&h(c)})})}t.AppGuestHome={renderGuestHome:x};
