const n=window;function t(a,o){return n.AppRouter&&n.AppRouter.t?n.AppRouter.t(a,o):a}function e(a){return n.AppRouter&&n.AppRouter.escapeHtml?n.AppRouter.escapeHtml(a):String(a||"")}function y(a){return n.AppRouter&&n.AppRouter.spaHref?n.AppRouter.spaHref(a):String(a||"")}function k(){return n.ScienceApi.hasPermission("simulation.manage_any")||n.ScienceApi.hasPermission("user.manage")}function P(){const a=document.getElementById("sidebar");a&&(a.style.display="none")}async function H(a){const o=a?`?q=${encodeURIComponent(a)}`:"";return n.ScienceApi.apiFetch(`/admin/simulations/import-disk${o}`)}async function $(){P();const a=document.getElementById("page-title"),o=document.getElementById("card-container");if(a&&(a.textContent=t("磁碟模擬匯入","Import simulations from disk")),!n.ScienceApi.getUser()){n.AppRouter.navigate("/login");return}if(!k()){o.innerHTML=`<p class="text-red-600">${e(t("沒有權限。","Forbidden."))}</p>`;return}const u=new URLSearchParams(n.location.search).get("q")||"";o.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;let c;try{c=await H(u)}catch(s){o.innerHTML=`<p class="text-red-600">${e(s.message||t("載入失敗","Load failed"))}</p>`;return}const v=c.counts||{},x=Array.isArray(c.items)?c.items:[],A=n.ScienceApi.hasPermission("simulation.manage_any"),w=["unregistered","slug_exists","total"].map(s=>{const d={unregistered:t("將新建","New rows"),slug_exists:t("只補路徑","Link path only"),total:t("符合搜尋","Matching search")};return`
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500">${e(d[s]||s)}</div>
            <div class="text-2xl font-bold text-slate-900">${Number(v[s]||0)}</div>
        </div>`}).join(""),S=x.map(s=>`
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2"><input type="checkbox" class="disk-import-path rounded border-slate-300" value="${e(s.path||"")}" checked></td>
            <td class="px-3 py-2 font-mono text-xs">${e(s.path||"")}</td>
            <td class="px-3 py-2 font-mono text-xs">${e(s.proposed_slug||"")}</td>
            <td class="px-3 py-2 text-sm">${e(s.title_zh||"")}</td>
            <td class="px-3 py-2 text-xs whitespace-nowrap">${s.kind==="slug_exists"?e(t("補連結","Link")):e(t("新建","Create"))}${s.existing_sim_id?` #${Number(s.existing_sim_id)}`:""}</td>
        </tr>`).join("");o.innerHTML=`
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${e(y("/admin"))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a>
            <a href="${e(y("/admin/simulations"))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${e(t("模擬列表","Simulations"))}</a>
            <a href="../admin/import_disk_simulations.php" class="text-slate-500 hover:underline">${e(t("傳統 PHP 頁","Legacy PHP page"))}</a>
        </div>
        <p id="disk-import-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
        <p class="text-sm text-slate-600 mb-4">${e(t("列出尚未登錄 simulations 的 HTML；可批次新增或為已有 slug 補上 html_path。","Lists on-disk HTML not yet registered; batch-create or link html_path for existing slugs."))}</p>
        <div class="grid sm:grid-cols-3 gap-3 mb-4">${w}</div>
        <form id="disk-import-search" class="flex flex-wrap gap-2 mb-4 items-center">
            <input type="search" name="q" value="${e(u)}" placeholder="${e(t("路徑、slug、標題…","Path, slug, title…"))}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[16rem]">
            <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">${e(t("搜尋","Search"))}</button>
        </form>
        <div class="flex flex-wrap gap-2 mb-3 items-center">
            <label class="text-sm text-slate-600" for="disk-import-status">${e(t("狀態","Status"))}</label>
            <select id="disk-import-status" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="draft">${e(t("草稿","Draft"))}</option>
                <option value="pending_review">${e(t("待審","Pending review"))}</option>
                ${A?`<option value="published">${e(t("已發布","Published"))}</option>`:""}
            </select>
            <button type="button" id="btn-disk-import-selected" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${e(t("匯入已勾選","Import selected"))}</button>
            <button type="button" id="btn-disk-import-all" class="px-4 py-2 rounded-lg border border-indigo-400 text-indigo-900 text-sm hover:bg-indigo-50">${e(t("匯入目前列表全部","Import all in list"))}</button>
        </div>
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl mb-2">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 w-10"><input type="checkbox" id="disk-import-check-all" class="rounded border-slate-300" checked></th>
                        <th class="px-3 py-2 font-medium">${e(t("路徑","Path"))}</th>
                        <th class="px-3 py-2 font-medium">slug</th>
                        <th class="px-3 py-2 font-medium">${e(t("標題","Title"))}</th>
                        <th class="px-3 py-2 font-medium">${e(t("類型","Type"))}</th>
                    </tr>
                </thead>
                <tbody>${S||`<tr><td colspan="5" class="px-3 py-6 text-slate-500">${e(t("沒有未登錄的檔案。","No unregistered files."))}</td></tr>`}</tbody>
            </table>
        </div>`;const l=document.getElementById("disk-import-search");l&&l.addEventListener("submit",s=>{s.preventDefault();const d=(l.querySelector('[name="q"]')||{}).value||"",p=d?`/admin/import-disk-simulations?q=${encodeURIComponent(d)}`:"/admin/import-disk-simulations";n.AppRouter.navigate(p,!0)});const m=document.getElementById("disk-import-check-all"),h=()=>Array.from(document.querySelectorAll(".disk-import-path"));m&&m.addEventListener("change",()=>{h().forEach(s=>{s.checked=m.checked})});const i=document.getElementById("disk-import-flash");async function b(s){const d=s?x.map(r=>r.path).filter(Boolean):h().filter(r=>r.checked).map(r=>r.value);if(!d.length){i&&(i.className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm mb-4",i.textContent=t("請勾選至少一個檔案。","Select at least one file."),i.classList.remove("hidden"));return}if(s&&!n.confirm(t("確定匯入目前列表中的全部項目？","Import every item in the current list?")))return;const p=document.getElementById("disk-import-status"),I=p?p.value:"draft",L=l&&l.querySelector('[name="q"]')?l.querySelector('[name="q"]').value:"";i&&(i.className="rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-4 py-3 text-sm mb-4",i.textContent=t("處理中…","Working…"),i.classList.remove("hidden"));try{const r=await n.ScienceApi.apiFetch("/admin/simulations/import-disk",{method:"POST",body:{paths:s?void 0:d,import_all:s,status:I,search:L}}),_=t(`新增 ${r.created} 筆、連結 ${r.linked} 筆、略過 ${r.skipped} 筆。`,`Created ${r.created}, linked ${r.linked}, skipped ${r.skipped}.`);i&&(i.className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm mb-4",i.textContent=_),await $()}catch(r){i&&(i.className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm mb-4",i.textContent=r.message||t("匯入失敗","Import failed"))}}const g=document.getElementById("btn-disk-import-selected"),f=document.getElementById("btn-disk-import-all");g&&(g.onclick=()=>b(!1)),f&&(f.onclick=()=>b(!0))}n.AppAdmin=Object.assign(n.AppAdmin||{},{renderAdminSimDiskImport:$,canImportDiskSimulations:k});
