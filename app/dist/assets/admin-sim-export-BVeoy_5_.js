const a=window;function e(s,r){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(s,r):s}function t(s){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(s):String(s||"")}function l(s){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(s):String(s||"")}function b(){return a.ScienceApi.hasPermission("simulation.manage_any")||a.ScienceApi.hasPermission("user.manage")}function $(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}const w={ready:{zh:"已對應",en:"Linked"},same:{zh:"內容相同（待記錄路徑）",en:"Same content (link pending)"},create:{zh:"將新建檔案",en:"Will create file"},differ:{zh:"內容不同",en:"Content differs"},disk_only:{zh:"僅磁碟有檔",en:"Disk only"},empty:{zh:"HTML 空白",en:"Empty HTML"},ambiguous:{zh:"多於一個檔案",en:"Ambiguous"}};function x(s){const r=w[s]||{zh:s,en:s};return e(r.zh,r.en)}async function g(){$();const s=document.getElementById("page-title"),r=document.getElementById("card-container");if(s&&(s.textContent=e("模擬 HTML 匯出","Export simulation HTML")),!a.ScienceApi.getUser()){a.AppRouter.navigate("/login");return}if(!b()){r.innerHTML=`<p class="text-red-600">${t(e("沒有權限（需 simulation.manage_any 或 user.manage）。","Forbidden (requires simulation.manage_any or user.manage)."))}</p>`;return}r.innerHTML=`
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${t(l("/admin"))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${t(e("← 管理首頁","← Admin home"))}</a>
            <a href="${t(l("/admin/simulations"))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${t(e("模擬列表","Simulations"))}</a>
        </div>
        <p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;let d;try{d=await a.ScienceApi.apiFetch("/admin/simulations/export-html")}catch(n){r.innerHTML=`
            <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
                <a href="${t(l("/admin"))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${t(e("← 管理首頁","← Admin home"))}</a>
            </div>
            <p class="text-red-600">${t(n.message||e("載入失敗","Load failed"))}</p>`;return}const f=d.counts||{},h=Array.isArray(d.items)?d.items:[],y=["ready","same","create","differ","disk_only","empty","ambiguous"].map(n=>`
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500">${t(x(n))}</div>
            <div class="text-2xl font-bold text-slate-900">${Number(f[n]||0)}</div>
        </div>`).join(""),v=h.map(n=>`
        <tr class="border-t border-slate-100 align-top">
            <td class="px-3 py-2 font-mono text-xs">${Number(n.id)}</td>
            <td class="px-3 py-2">
                <div>${t(n.title||"")}</div>
                <div class="text-xs text-slate-400 font-mono">${t(n.slug||"")}</div>
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-sm">${t(x(n.status))}</td>
            <td class="px-3 py-2 font-mono text-xs">
                ${t(n.path||"")}
                ${(n.candidates||[]).length&&n.status==="ambiguous"?`<div class="mt-1 text-amber-800 text-xs">${t((n.candidates||[]).join("、"))}</div>`:""}
            </td>
        </tr>`).join("");r.innerHTML=`
        <div class="mb-4 flex flex-wrap gap-3 items-center text-sm">
            <a href="${t(l("/admin"))}" data-spa-nav="/admin" class="text-brand-700 hover:underline">${t(e("← 管理首頁","← Admin home"))}</a>
            <a href="${t(l("/admin/simulations"))}" data-spa-nav="/admin/simulations" class="text-slate-600 hover:underline">${t(e("模擬列表","Simulations"))}</a>
        </div>
        <p id="sim-export-flash" class="hidden rounded-lg border px-4 py-3 text-sm mb-4"></p>
        <p class="text-sm text-slate-600 mb-4">${t(e("資料庫有紀錄時，以資料庫 HTML 覆蓋原有模擬檔；沒有檔才新建。","When a DB row exists, overwrite the on-disk HTML; create a file only when missing."))}</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">${y}</div>
        <div class="flex flex-wrap gap-2 mb-4">
            <button type="button" id="btn-sim-export-apply" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800">${t(e("以資料庫覆蓋原有 HTML","Overwrite with database HTML"))}</button>
            <button type="button" id="btn-sim-export-overwrite" class="px-4 py-2 rounded-lg border border-amber-400 text-amber-900 text-sm hover:bg-amber-50">${t(e("只覆蓋內容不同的檔","Overwrite differing files only"))}</button>
            <button type="button" id="btn-sim-export-adopt" class="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">${t(e("採用磁碟版（只記錄路徑）","Adopt disk (link only)"))}</button>
        </div>
        ${d.ready?`<p class="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm mb-4">${t(e("每一列都有對應檔案。","Every row has a matching file."))}</p>`:""}
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-500">
                    <tr>
                        <th class="px-3 py-2 font-medium">ID</th>
                        <th class="px-3 py-2 font-medium">${t(e("標題","Title"))}</th>
                        <th class="px-3 py-2 font-medium">${t(e("狀態","Status"))}</th>
                        <th class="px-3 py-2 font-medium">${t(e("路徑","Path"))}</th>
                    </tr>
                </thead>
                <tbody>${v||`<tr><td colspan="4" class="px-3 py-6 text-slate-500">${t(e("沒有模擬紀錄。","No simulations."))}</td></tr>`}</tbody>
            </table>
        </div>`;const i=document.getElementById("sim-export-flash");async function p(n){i&&(i.classList.remove("hidden","text-red-600","text-emerald-800","bg-red-50","bg-emerald-50","border-red-200","border-emerald-200"),i.classList.add("text-slate-600","border-slate-200","bg-slate-50"),i.textContent=e("處理中…","Working…"));try{const o=await a.ScienceApi.apiFetch("/admin/simulations/export-html",{method:"POST",body:{mode:n}});await g(),i&&(i.textContent=e(`已寫入 ${o.written} 個檔案，記錄路徑 ${o.linked} 筆，略過 ${o.skipped} 筆。`,`Wrote ${o.written} file(s), linked ${o.linked}, skipped ${o.skipped}.`))}catch(o){i&&(i.classList.remove("text-slate-600","bg-slate-50","border-slate-200"),i.classList.add("text-red-600","bg-red-50","border-red-200"),i.textContent=o.message||e("匯出失敗","Export failed"))}}const m=document.getElementById("btn-sim-export-apply"),c=document.getElementById("btn-sim-export-overwrite"),u=document.getElementById("btn-sim-export-adopt");m&&(m.onclick=()=>p("apply")),c&&(c.onclick=()=>p("overwrite")),u&&(u.onclick=()=>p("adopt"))}a.AppAdmin=Object.assign(a.AppAdmin||{},{renderAdminSimHtmlExport:g,canExportSimHtml:b});
