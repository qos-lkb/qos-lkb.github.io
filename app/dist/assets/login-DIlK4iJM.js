const e=window;function n(t,o){return e.AppRouter&&e.AppRouter.t?e.AppRouter.t(t,o):t}function r(t){return e.AppRouter&&e.AppRouter.escapeHtml?e.AppRouter.escapeHtml(t):String(t||"")}async function u(){const t=document.getElementById("page-title"),o=document.getElementById("card-container"),a=document.getElementById("sidebar");if(a&&(a.style.display="none"),t&&(t.textContent=n("登入","Sign in")),e.ScienceApi&&e.ScienceApi.getUser?e.ScienceApi.getUser():null){e.AppRouter.navigate("/",!0);return}o.innerHTML=`
            <form id="spa-login-form" class="max-w-md mx-auto bg-white rounded-2xl shadow-shell border border-slate-200/80 p-6 sm:p-8 space-y-4">
                <p class="text-sm text-slate-600">${r(n("使用 QSIS 帳戶名與密碼登入。","Sign in with your QSIS username and password."))}</p>
                <label class="block text-sm font-medium text-slate-700">${r(n("帳戶名","Username"))}
                    <input name="email" type="text" autocomplete="username" required
                        class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600">
                </label>
                <label class="block text-sm font-medium text-slate-700">${r(n("密碼","Password"))}
                    <input name="password" type="password" autocomplete="current-password" required
                        class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600">
                </label>
                <p id="spa-login-error" class="hidden text-sm text-red-600" role="alert"></p>
                <button type="submit" class="w-full rounded-lg bg-accent-500 text-amber-950 py-2.5 text-sm font-semibold hover:bg-accent-600 min-h-[44px]">
                    ${r(n("登入","Sign in"))}
                </button>
            </form>`;const i=document.getElementById("spa-login-form"),s=document.getElementById("spa-login-error");i.addEventListener("submit",async d=>{d.preventDefault(),s.classList.add("hidden");const l=new FormData(i);try{await e.ScienceApi.login(String(l.get("email")||""),String(l.get("password")||"")),e.AppAuth&&e.AppAuth.updateAuthNav&&await e.AppAuth.updateAuthNav(),e.AppRouter.navigate("/")}catch(p){s.textContent=p.message||n("登入失敗","Sign-in failed"),s.classList.remove("hidden")}})}e.AppLogin={renderLogin:u};
