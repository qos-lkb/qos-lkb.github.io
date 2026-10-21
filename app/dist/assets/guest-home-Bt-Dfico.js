const t=window;function o(e,n){return t.AppRouter&&typeof t.AppRouter.t=="function"?t.AppRouter.t(e,n):(localStorage.getItem("science_sims_ui_lang")||"zh")==="zh"?e:n}function i(e){return String(e||"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[n])}function l(){var a,s;const e=t.__SITE_NAMES__||{};return((((s=(a=t.AppRouter)==null?void 0:a.getLang)==null?void 0:s.call(a))||"zh")==="zh"?e.zh:e.en)||e.zh||"伊中中科學學習平台"}function c(){return(t.ScienceApi&&ScienceApi.SITE_BASE||t.__SITE_BASE__||"")+"/login.php?next="+encodeURIComponent("app/")}function u(e){if(t.AppRouter&&typeof t.AppRouter.navigate=="function"){t.AppRouter.navigate(e);return}location.hash="#"+e}function p(){const e=document.getElementById("main-content");if(!e)return;const n=i(l()),a=i(c());e.innerHTML=`
            <div class="guest-home guest-home-bleed w-full">
                <section class="guest-hero" aria-label="${i(o("歡迎","Welcome"))}">
                    <div class="guest-hero-glow" aria-hidden="true"></div>
                    <div class="relative z-10 max-w-2xl mx-auto w-full px-2 sm:px-6">
                        <p class="guest-hero-brand text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                            ${n}
                        </p>
                        <p class="guest-hero-tagline mt-5 text-base sm:text-lg leading-relaxed max-w-xl">
                            ${o("中學科學互動學習空間：模擬實驗、自學課程與筆記，隨時探索。","An interactive science space for secondary learners: simulations, self-study courses and notes.")}
                        </p>
                        <div class="guest-hero-ctas mt-8 flex flex-wrap gap-3">
                            <a href="${a}" class="guest-cta-primary inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-sm shadow-sm">
                                ${o("登入開始學習","Sign in to learn")}
                            </a>
                            <button type="button" data-nav="/simulations" class="guest-cta-secondary inline-flex items-center justify-center px-6 py-3 rounded-lg border font-medium text-sm">
                                ${o("瀏覽模擬程式","Browse simulations")}
                            </button>
                        </div>
                    </div>
                </section>
            </div>`,e.querySelectorAll("[data-nav]").forEach(s=>{s.addEventListener("click",r=>{r.preventDefault(),u(s.getAttribute("data-nav"))})})}window.AppGuestHome={renderGuestHome:p};
