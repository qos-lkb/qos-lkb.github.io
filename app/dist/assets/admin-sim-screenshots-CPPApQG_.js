const o=window;function s(t,a){return o.AppRouter&&o.AppRouter.t?o.AppRouter.t(t,a):t}function n(t){return o.AppRouter&&o.AppRouter.escapeHtml?o.AppRouter.escapeHtml(t):String(t||"")}function E(t){return o.AppRouter&&o.AppRouter.spaHref?o.AppRouter.spaHref(t):String(t||"")}function F(){return o.ScienceApi.hasPermission("simulation.manage_any")||o.ScienceApi.hasPermission("user.manage")}function M(){const t=document.getElementById("sidebar");t&&(t.style.display="none")}const D="https://cdn.jsdelivr.net/npm/modern-screenshot@4.5.5/+esm";let B=null,m=null;function z(){return B||(B=import(D).then(t=>{if(!t||typeof t.domToBlob!="function")throw new Error("截圖元件載入失敗");return t.domToBlob})),B}function O(t){return`${o.ScienceApi&&o.ScienceApi.API_BASE||"/api/v1"}/simulations/${encodeURIComponent(t)}/html`}function W(t){if(!t)return"";if(/^https?:\/\//i.test(t)||t.startsWith("//")||t.startsWith("/"))return t;const a=o.ScienceApi.SITE_BASE||"";return(a?a.replace(/\/$/,""):"")+"/"+t.replace(/^\.\//,"")}async function G(t){const a=document.getElementById("ss-capture-frame");if(!a)throw new Error("缺少預覽框。");await new Promise((d,y)=>{const $=setTimeout(()=>y(new Error("載入逾時")),2e4);a.onload=()=>{clearTimeout($),setTimeout(d,2200)},a.src=O(t)});const i=a.contentDocument&&a.contentDocument.documentElement;if(!i)throw new Error("無法讀取模擬頁（可能被沙箱阻擋）。");const h=await(await z())(i,{backgroundColor:"#ffffff",scale:1,type:"image/png",features:{restoreScrollPosition:!0}});if(!h)throw new Error("無法產生圖片");return h}async function Q(t,a){const i=new FormData;return i.append("sim_id",String(t)),i.append("file",a,"shot.png"),o.ScienceApi.apiFetch("/admin/simulations/screenshots",{method:"POST",body:i})}async function J(t,a){const i=new URLSearchParams;t&&i.set("q",t),i.set("filter",a);const x=i.toString()?`?${i}`:"";return o.ScienceApi.apiFetch(`/admin/simulations/screenshots${x}`)}async function L(){var I,R,U,C,_;M();const t=document.getElementById("page-title"),a=document.getElementById("card-container");if(t&&(t.textContent=s("模擬截圖","Simulation screenshots")),!o.ScienceApi.getUser()){o.AppRouter.navigate("/login");return}if(!F()){a.innerHTML=`<p class="text-red-600">${n(s("沒有權限。","Forbidden."))}</p>`;return}const i=new URLSearchParams(o.location.search),x=i.get("q")||"",h=i.get("filter")==="missing"?"missing":"all";a.innerHTML=`<p class="text-slate-500">${n(s("載入中…","Loading…"))}</p>`;let d;try{d=await J(x,h)}catch(e){a.innerHTML=`<p class="text-red-600">${n(e.message||s("載入失敗","Load failed"))}</p>`;return}const y=Array.isArray(d.items)?d.items:[],$=d.counts||{},P=!!d.chrome_available,H=y.map(e=>{const l=e.kind==="ok"?s("已有截圖","Has screenshot"):e.kind==="broken"?s("檔案遺失","File missing"):s("尚未截圖","No screenshot"),c=e.kind==="ok"?"text-emerald-700":e.kind==="broken"?"text-amber-700":"text-slate-600",r=e.screenshot_ok?`<img src="${n(W(e.screenshot_path))}" alt="" class="w-24 h-14 object-cover rounded border border-slate-200">`:`<span class="w-24 h-14 inline-flex items-center justify-center bg-slate-100 text-slate-400 text-xs rounded">${n(s("無","None"))}</span>`;return`<tr class="border-t border-slate-100 align-middle">
            <td class="px-3 py-2"><input type="checkbox" class="ss-check rounded border-slate-300" value="${e.id}" data-slug="${n(e.slug)}" ${e.kind!=="ok"?"checked":""}></td>
            <td class="px-3 py-2">${r}</td>
            <td class="px-3 py-2">
                <div class="font-medium">${n(e.title_zh||e.slug)}</div>
                <div class="font-mono text-[11px] text-slate-400">${n(e.slug)}</div>
            </td>
            <td class="px-3 py-2 text-xs ${c}">${n(l)}</td>
            <td class="px-3 py-2 font-mono text-[11px] text-slate-500">${n(e.screenshot_path||e.disk_match||"—")}</td>
        </tr>`}).join("");a.innerHTML=`
        <div class="mb-4 flex flex-wrap gap-3 items-center">
            <a href="${n(E("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${n(s("← 管理首頁","← Admin home"))}</a>
            <a href="${n(E("/admin/simulations"))}" data-spa-nav="/admin/simulations" class="text-sm text-slate-500 hover:underline">${n(s("模擬程式","Simulations"))}</a>
        </div>
        <p class="text-sm text-slate-600 mb-4">${n(s("為模擬產生或補上預覽截圖，並寫入 screenshot_path。可先連結科目資料夾已有的 PNG；沒有檔案時用 Chrome 或瀏覽器擷取。","Add preview screenshots and save screenshot_path. Link existing PNGs first; otherwise capture with Chrome or this browser."))}</p>
        <p id="ss-flash" class="${m?"":"hidden"} rounded-lg border px-4 py-3 text-sm mb-4 ${m&&m.ok?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-red-200 bg-red-50 text-red-800"}">${m?n(m.text):""}</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-4">
            ${[{k:"total",zh:"全部",en:"Total"},{k:"ok",zh:"已有截圖",en:"Has file"},{k:"missing",zh:"尚未截圖",en:"Missing"},{k:"broken",zh:"路徑失效",en:"Broken path"}].map(e=>`<div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div class="text-xs text-slate-500">${n(s(e.zh,e.en))}</div>
                <div class="text-2xl font-bold text-slate-900">${Number($[e.k]||0)}</div>
            </div>`).join("")}
        </div>
        <p class="text-xs text-slate-500 mb-3">${n(P?s("已偵測到 Chrome，伺服器可直接截圖。","Chrome found; server-side capture is available."):s("未偵測到 Chrome。將改用本頁 iframe 擷取，或只連結磁碟已有檔案。","Chrome not found. This page can capture in an iframe, or only link existing files."))}</p>
        <form id="ss-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <label class="text-sm text-slate-600" for="ss-q">${n(s("搜尋","Search"))}</label>
            <input id="ss-q" type="search" value="${n(x)}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[14rem]">
            <select id="ss-filter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="all" ${h==="all"?"selected":""}>${n(s("顯示全部","Show all"))}</option>
                <option value="missing" ${h==="missing"?"selected":""}>${n(s("僅缺截圖","Missing only"))}</option>
            </select>
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${n(s("套用","Apply"))}</button>
        </form>
        <div class="flex flex-wrap gap-2 mb-3 items-center">
            <button type="button" id="btn-ss-missing" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${n(s("更新未有截圖的","Update missing screenshots"))}</button>
            <button type="button" id="btn-ss-all" class="px-4 py-2 rounded-lg border border-indigo-400 text-indigo-900 text-sm hover:bg-indigo-50">${n(s("更新所有模擬截圖","Update all screenshots"))}</button>
            <button type="button" id="btn-ss-selected" class="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">${n(s("更新已勾選","Update selected"))}</button>
            <label class="text-sm text-slate-600 flex items-center gap-1"><input type="checkbox" id="ss-check-all" class="rounded border-slate-300"> ${n(s("全選","Select all"))}</label>
        </div>
        <p id="ss-progress" class="text-sm text-slate-600 mb-2 hidden"></p>
        <iframe id="ss-capture-frame" title="${n(s("截圖預覽","Capture preview"))}" class="w-full h-48 border border-slate-200 rounded-xl bg-white mb-3" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 w-10"></th>
                        <th class="px-3 py-2">${n(s("預覽","Preview"))}</th>
                        <th class="px-3 py-2">${n(s("模擬","Simulation"))}</th>
                        <th class="px-3 py-2">${n(s("狀態","Status"))}</th>
                        <th class="px-3 py-2">${n(s("路徑","Path"))}</th>
                    </tr>
                </thead>
                <tbody>${H||`<tr><td colspan="5" class="px-3 py-6 text-slate-500">${n(s("沒有符合的模擬。","No matching simulations."))}</td></tr>`}</tbody>
            </table>
        </div>
    `;const k=document.getElementById("ss-flash"),g=document.getElementById("ss-progress");m=null;function T(e,l){k&&(k.textContent=e,k.className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm mb-4")}(I=document.getElementById("ss-search"))==null||I.addEventListener("submit",async e=>{var w,p;e.preventDefault();const l=((w=document.getElementById("ss-q"))==null?void 0:w.value)||"",c=((p=document.getElementById("ss-filter"))==null?void 0:p.value)||"all",r=new URLSearchParams;l&&r.set("q",l),c==="missing"&&r.set("filter","missing");const f="/admin/sim-screenshots"+(r.toString()?`?${r}`:"");history.replaceState(null,"",E(f)),await L()}),(R=document.getElementById("ss-check-all"))==null||R.addEventListener("change",e=>{document.querySelectorAll(".ss-check").forEach(l=>{l.checked=e.target.checked})});function N(){return Array.from(document.querySelectorAll(".ss-check:checked")).map(e=>({id:Number(e.value),slug:e.getAttribute("data-slug")||""})).filter(e=>e.id>0)}async function q(e,l){var w;let c=0;const r=[],f=l.slice();for(;f.length;){const p=f.splice(0,5);g&&(g.classList.remove("hidden"),g.textContent=s(`處理中，尚餘 ${f.length+p.length}…`,`Working, ${f.length+p.length} left…`));const A=await o.ScienceApi.apiFetch("/admin/simulations/screenshots",{method:"POST",body:{action:P?"capture":"link",mode:e,ids:p.map(b=>b.id),search:((w=document.getElementById("ss-q"))==null?void 0:w.value)||""}});c+=Number(A.updated||0),r.push(...A.errors||[]);const j=(A.results||[]).filter(b=>b.status==="needs_capture");for(const b of j){const v=p.find(u=>u.id===b.id)||y.find(u=>u.id===b.id);if(!(!v||!v.slug))try{const u=await G(v.slug);await Q(v.id,u),c++}catch(u){r.push("#"+v.id+" "+(u.message||"擷取失敗"))}}}return{totalUpdated:c,totalErr:r}}async function S(e,l){const c=l?N():y.filter(r=>e==="all"||r.kind!=="ok").map(r=>({id:r.id,slug:r.slug}));if(!c.length){T(s("沒有可更新的項目。","Nothing to update."));return}if(!(e==="all"&&!l&&!window.confirm(s("將覆寫所有模擬截圖，確定？","Overwrite all simulation screenshots?")))){g&&(g.classList.remove("hidden"),g.textContent=s("處理中…","Working…"));try{const r=await q(e,c);m={text:s(`已更新 ${r.totalUpdated} 筆。`,`Updated ${r.totalUpdated}.`)+(r.totalErr.length?" "+r.totalErr.slice(0,4).join("；"):""),ok:r.totalErr.length===0},await L()}catch(r){T(r.message||s("更新失敗","Update failed"))}}}(U=document.getElementById("btn-ss-missing"))==null||U.addEventListener("click",()=>S("missing",!1)),(C=document.getElementById("btn-ss-all"))==null||C.addEventListener("click",()=>S("all",!1)),(_=document.getElementById("btn-ss-selected"))==null||_.addEventListener("click",()=>S("missing",!0))}o.AppAdmin=Object.assign(o.AppAdmin||{},{renderAdminSimScreenshots:L});
