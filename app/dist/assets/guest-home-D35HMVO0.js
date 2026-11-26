const t=window;function s(e,n){return t.AppRouter&&typeof t.AppRouter.t=="function"?t.AppRouter.t(e,n):(localStorage.getItem("science_sims_ui_lang")||"zh")==="zh"?e:n}function a(e){return String(e||"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[n])}function l(){var o,i;const e=t.__SITE_NAMES__||{};return((((i=(o=t.AppRouter)==null?void 0:o.getLang)==null?void 0:i.call(o))||"zh")==="zh"?e.zh:e.en)||e.zh||"伊中中科學學習平台"}function r(){return(t.ScienceApi&&ScienceApi.SITE_BASE||t.__SITE_BASE__||"")+"/login.php?next="+encodeURIComponent("app/")}function u(e){if(t.AppRouter&&typeof t.AppRouter.navigate=="function"){t.AppRouter.navigate(e);return}location.hash="#"+e}function d(){const e=document.getElementById("main-content");if(!e)return;document.body.classList.add("guest-landing");const n=a(l()),o=a(r());e.innerHTML=`
            <div class="guest-home guest-home-bleed guest-home-with-science w-full">
                <section class="guest-hero" aria-label="${a(s("歡迎","Welcome"))}">
                    <div class="guest-hero-glow" aria-hidden="true"></div>
                    <div class="relative z-10 max-w-2xl mx-auto w-full px-2 sm:px-6">
                        <p class="guest-hero-brand text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                            ${n}
                        </p>
                        <p class="guest-hero-tagline mt-5 text-base sm:text-lg leading-relaxed max-w-xl">
                            ${s("中學科學互動學習空間：模擬實驗、自學課程與筆記，隨時探索。","An interactive science space for secondary learners: simulations, self-study courses and notes.")}
                        </p>
                        <div class="guest-hero-ctas mt-8 flex flex-wrap gap-3">
                            <a href="${o}" class="guest-cta-primary inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-sm shadow-sm">
                                ${s("登入開始學習","Sign in to learn")}
                            </a>
                            <button type="button" data-nav="/simulations" class="guest-cta-secondary inline-flex items-center justify-center px-6 py-3 rounded-lg border font-medium text-sm">
                                ${s("瀏覽模擬程式","Browse simulations")}
                            </button>
                        </div>
                    </div>
                </section>
                <div id="sci-edu-home-slot"></div>
            </div>`,t.AppScienceEdu&&typeof t.AppScienceEdu.mountHome=="function"&&t.AppScienceEdu.mountHome(document.getElementById("sci-edu-home-slot")),e.querySelectorAll("[data-nav]").forEach(i=>{i.addEventListener("click",c=>{c.preventDefault(),u(i.getAttribute("data-nav"))})})}window.AppGuestHome={renderGuestHome:d};
