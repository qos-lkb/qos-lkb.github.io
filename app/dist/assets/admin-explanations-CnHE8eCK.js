import{a as z,b as E}from"./audio-playback-DYnoGEoT.js";const d=window;function t(s,o){return d.AppRouter&&d.AppRouter.t?d.AppRouter.t(s,o):s}function e(s){return d.AppRouter&&d.AppRouter.escapeHtml?d.AppRouter.escapeHtml(s):String(s||"")}function q(s){return d.AppRouter&&d.AppRouter.spaHref?d.AppRouter.spaHref(s):String(s)}function R(s){return(d.ScienceApi&&ScienceApi.API_BASE||"/api/v1")+"/explain/attempts/"+encodeURIComponent(String(s))+"/audio"}function L(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function T(s){return s>=70?"text-emerald-700":s>=40?"text-amber-700":"text-rose-700"}function N(){const s=new URLSearchParams(location.search).get("view")||"questions";return s==="subjects"||s==="attempts"?s:"questions"}function j(s){const o=new URLSearchParams(s),i="/admin/explanations"+(o.toString()?"?"+o.toString():""),b=location.pathname.split("/app")[0]+"/app";history.pushState({path:"/admin/explanations"},"",b+i),v()}function k(s){const o=[["questions",t("問題","Questions")],["subjects",t("科目","Subjects")],["attempts",t("作答","Answers")]];return`<nav class="flex flex-wrap gap-2 mb-4" aria-label="${e(t("口述解釋管理","Explanation admin"))}">
        ${o.map(([i,b])=>`<button type="button" data-view="${i}" class="px-3 py-1.5 rounded-full text-sm border ${s===i?"bg-brand-600 text-white border-brand-600":"bg-white text-slate-700 border-slate-200"}">${e(b)}</button>`).join("")}
    </nav>`}function A(s){s.querySelectorAll("[data-view]").forEach(o=>{o.addEventListener("click",()=>{const i=o.getAttribute("data-view")||"questions";j(i==="questions"?{}:{view:i})})})}function _(s){return(Array.isArray(s)?s:[]).join(`
`)}function p(s,o){return`<label class="block text-sm mb-3"><span class="font-medium text-slate-700">${e(s)}</span>${o}</label>`}function f(s,o,i=""){return`<input name="${e(s)}" value="${e(o)}" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm" ${i}>`}function g(s,o,i=4){return`<textarea name="${e(s)}" rows="${i}" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${e(o)}</textarea>`}async function U(s){var $;const o=await d.ScienceApi.apiFetch("/admin/explanations/bank"),i=o.subjects||[],b=o.questions||[],m={};b.forEach(a=>{m[a.subject]=(m[a.subject]||0)+1});const x=i.map(a=>`<tr class="border-t border-slate-100">
        <td class="p-3 font-mono text-xs">${e(a.key)}</td>
        <td class="p-3">${e(a.label_zh)} / ${e(a.label_en)}</td>
        <td class="p-3">${a.published?e(t("公開","Published")):e(t("草稿","Draft"))}</td>
        <td class="p-3 tabular-nums">${m[a.key]||0}</td>
        <td class="p-3 whitespace-nowrap">
            <button type="button" class="text-brand-700 text-sm hover:underline" data-edit-subject="${a.id}">${e(t("編輯","Edit"))}</button>
            <button type="button" class="text-rose-700 text-sm hover:underline ml-2" data-del-subject="${a.id}">${e(t("刪除","Delete"))}</button>
        </td>
    </tr>`).join("");s.innerHTML=`
        <p class="mb-4"><a href="${e(q("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a></p>
        ${k("subjects")}
        <h2 class="text-lg font-bold text-slate-900 mb-1">${e(t("口述解釋科目","Explanation subjects"))}</h2>
        <p class="text-sm text-slate-600 mb-4">${e(t("科目存在資料庫。公開科目才會出現在學生的解釋練習。","Subjects are stored in the database. Only published subjects appear in student practice."))}</p>
        <form id="admin-subject-form" class="bg-white border border-slate-200 rounded-xl p-4 mb-4 max-w-xl">
            <input type="hidden" name="id" value="">
            ${p(t("代碼","Key"),f("key","","required"))}
            ${p(t("中文名稱","Chinese name"),f("label_zh","","required"))}
            ${p(t("英文名稱","English name"),f("label_en","","required"))}
            ${p(t("排序","Order"),f("sort_order","0",'type="number"'))}
            <label class="flex items-center gap-2 text-sm mb-3"><input type="checkbox" name="published" checked> ${e(t("公開","Published"))}</label>
            <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${e(t("儲存科目","Save subject"))}</button>
            <button type="button" id="admin-subject-reset" class="ml-2 text-sm text-slate-600">${e(t("新增另一個","New"))}</button>
        </form>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left"><tr>
                    <th class="p-3">${e(t("代碼","Key"))}</th>
                    <th class="p-3">${e(t("名稱","Name"))}</th>
                    <th class="p-3">${e(t("狀態","Status"))}</th>
                    <th class="p-3">${e(t("題數","Questions"))}</th>
                    <th class="p-3">${e(t("操作","Actions"))}</th>
                </tr></thead>
                <tbody>${x||`<tr><td class="p-3 text-slate-500" colspan="5">${e(t("還沒有科目。","No subjects yet."))}</td></tr>`}</tbody>
            </table>
        </div>`,A(s);const c=s.querySelector("#admin-subject-form"),l=a=>{c.id.value=a&&a.id?String(a.id):"",c.key.value=a?a.key:"",c.label_zh.value=a?a.label_zh:"",c.label_en.value=a?a.label_en:"",c.sort_order.value=a?String(a.sort_order||0):"0",c.published.checked=a?!!a.published:!0};c.addEventListener("submit",async a=>{a.preventDefault();const n=c.id.value,u={key:c.key.value.trim(),label_zh:c.label_zh.value.trim(),label_en:c.label_en.value.trim(),sort_order:Number(c.sort_order.value)||0,published:c.published.checked};try{n?await d.ScienceApi.apiFetch("/admin/explanations/subjects/"+encodeURIComponent(n),{method:"PUT",body:u}):await d.ScienceApi.apiFetch("/admin/explanations/subjects",{method:"POST",body:u}),v()}catch(r){window.alert(r.message||t("儲存失敗。","Save failed."))}}),($=s.querySelector("#admin-subject-reset"))==null||$.addEventListener("click",()=>l(null)),s.querySelectorAll("[data-edit-subject]").forEach(a=>{a.addEventListener("click",()=>{const n=Number(a.getAttribute("data-edit-subject"));l(i.find(u=>u.id===n)||null),c.scrollIntoView({behavior:"smooth",block:"start"})})}),s.querySelectorAll("[data-del-subject]").forEach(a=>{a.addEventListener("click",async()=>{if(window.confirm(t("確定刪除這個科目？","Delete this subject?")))try{await d.ScienceApi.apiFetch("/admin/explanations/subjects/"+encodeURIComponent(a.getAttribute("data-del-subject")),{method:"DELETE"}),v()}catch(n){window.alert(n.message||t("刪除失敗。","Delete failed."))}})})}async function C(s){var a;const o=await d.ScienceApi.apiFetch("/admin/explanations/bank"),i=o.subjects||[],b=o.questions||[],m=d.AppRouter&&AppRouter.getLang?AppRouter.getLang():"zh",x=i.map(n=>{const u=m==="zh"?n.label_zh:n.label_en;return`<option value="${e(n.key)}">${e(u)} (${e(n.key)})</option>`}).join(""),c=b.map(n=>{const u=m==="zh"?n.title_zh:n.title_en;return`<tr class="border-t border-slate-100 align-top">
            <td class="p-3 font-mono text-xs">${e(n.key)}</td>
            <td class="p-3">${e(n.subject)}</td>
            <td class="p-3">${e(u)}</td>
            <td class="p-3">${n.published?e(t("公開","Published")):e(t("草稿","Draft"))}</td>
            <td class="p-3 whitespace-nowrap">
                <button type="button" class="text-brand-700 text-sm hover:underline" data-edit-question="${n.id}">${e(t("編輯","Edit"))}</button>
                <button type="button" class="text-rose-700 text-sm hover:underline ml-2" data-del-question="${n.id}">${e(t("刪除","Delete"))}</button>
            </td>
        </tr>`}).join("");s.innerHTML=`
        <p class="mb-4"><a href="${e(q("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a></p>
        ${k("questions")}
        <h2 class="text-lg font-bold text-slate-900 mb-1">${e(t("口述解釋問題","Explanation questions"))}</h2>
        <p class="text-sm text-slate-600 mb-4">${e(t("題目與評分答案存在資料庫。評分要點只在評分後顯示給學生，不要寫進公開題幹。","Questions and scoring answers are stored in the database. Key points appear to students only after scoring."))}</p>
        <form id="admin-question-form" class="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <input type="hidden" name="id" value="">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${p(t("代碼","Key"),f("key","","required"))}
                ${p(t("科目","Subject"),`<select name="subject" class="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">${x}</select>`)}
                ${p(t("中文標題","Chinese title"),f("title_zh","","required"))}
                ${p(t("英文標題","English title"),f("title_en","","required"))}
            </div>
            ${p(t("中文題目","Chinese prompt"),g("prompt_zh","",3))}
            ${p(t("英文題目","English prompt"),g("prompt_en","",3))}
            ${p(t("中文評分要點／答案（一行一點）","Chinese key points / answers (one per line)"),g("points_zh","",5))}
            ${p(t("英文評分要點／答案（一行一點）","English key points / answers (one per line)"),g("points_en","",5))}
            ${p(t("常見錯誤（一行一項，評分時扣分）","Misconceptions (one per line)"),g("misconceptions_zh","",3))}
            <div class="flex flex-wrap items-center gap-4 mb-3">
                ${p(t("排序","Order"),f("sort_order","0",'type="number"'))}
                <label class="flex items-center gap-2 text-sm mt-5"><input type="checkbox" name="published" checked> ${e(t("公開","Published"))}</label>
            </div>
            <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${e(t("儲存問題","Save question"))}</button>
            <button type="button" id="admin-question-reset" class="ml-2 text-sm text-slate-600">${e(t("新增另一題","New"))}</button>
        </form>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left"><tr>
                    <th class="p-3">${e(t("代碼","Key"))}</th>
                    <th class="p-3">${e(t("科目","Subject"))}</th>
                    <th class="p-3">${e(t("標題","Title"))}</th>
                    <th class="p-3">${e(t("狀態","Status"))}</th>
                    <th class="p-3">${e(t("操作","Actions"))}</th>
                </tr></thead>
                <tbody>${c||`<tr><td class="p-3 text-slate-500" colspan="5">${e(t("還沒有問題。","No questions yet."))}</td></tr>`}</tbody>
            </table>
        </div>`,A(s);const l=s.querySelector("#admin-question-form"),$=n=>{l.id.value=n&&n.id?String(n.id):"",l.key.value=n?n.key:"",l.subject.value=n?n.subject:i[0]?i[0].key:"",l.title_zh.value=n?n.title_zh:"",l.title_en.value=n?n.title_en:"",l.prompt_zh.value=n?n.prompt_zh:"",l.prompt_en.value=n?n.prompt_en:"",l.points_zh.value=n?_(n.points_zh):"",l.points_en.value=n?_(n.points_en):"",l.misconceptions_zh.value=n?_(n.misconceptions_zh):"",l.sort_order.value=n?String(n.sort_order||0):"0",l.published.checked=n?!!n.published:!0};l.addEventListener("submit",async n=>{n.preventDefault();const u=l.id.value,r={key:l.key.value.trim(),subject:l.subject.value,title_zh:l.title_zh.value.trim(),title_en:l.title_en.value.trim(),prompt_zh:l.prompt_zh.value.trim(),prompt_en:l.prompt_en.value.trim(),points_zh:l.points_zh.value,points_en:l.points_en.value,misconceptions_zh:l.misconceptions_zh.value,sort_order:Number(l.sort_order.value)||0,published:l.published.checked};try{u?await d.ScienceApi.apiFetch("/admin/explanations/questions/"+encodeURIComponent(u),{method:"PUT",body:r}):await d.ScienceApi.apiFetch("/admin/explanations/questions",{method:"POST",body:r}),v()}catch(h){window.alert(h.message||t("儲存失敗。","Save failed."))}}),(a=s.querySelector("#admin-question-reset"))==null||a.addEventListener("click",()=>$(null)),s.querySelectorAll("[data-edit-question]").forEach(n=>{n.addEventListener("click",()=>{const u=Number(n.getAttribute("data-edit-question"));$(b.find(r=>r.id===u)||null),l.scrollIntoView({behavior:"smooth",block:"start"})})}),s.querySelectorAll("[data-del-question]").forEach(n=>{n.addEventListener("click",async()=>{if(window.confirm(t("確定刪除這條問題？已有作答紀錄會保留。","Delete this question? Existing attempts are kept.")))try{await d.ScienceApi.apiFetch("/admin/explanations/questions/"+encodeURIComponent(n.getAttribute("data-del-question")),{method:"DELETE"}),v()}catch(u){window.alert(u.message||t("刪除失敗。","Delete failed."))}})})}async function D(s){var u;const o=new URLSearchParams(location.search),i=o.get("q")||"",b=o.get("question_key")||"",m=d.AppRouter&&AppRouter.getLang?AppRouter.getLang():"zh",x=[];i&&x.push("q="+encodeURIComponent(i)),b&&x.push("question_key="+encodeURIComponent(b));const c=await d.ScienceApi.apiFetch("/admin/explanations"+(x.length?"?"+x.join("&"):"")),l=c.attempts||[],$=c.questions||[],a=[`<option value="">${e(t("全部題目","All questions"))}</option>`].concat($.map(r=>{const h=m==="zh"?r.title_zh:r.title_en,y=r.key===b?" selected":"";return`<option value="${e(r.key)}"${y}>${e(h)}</option>`})).join(""),n=l.map(r=>{const h=m==="zh"?r.feedback_zh||r.feedback_en:r.feedback_en||r.feedback_zh,y=m==="zh"?r.title_zh||r.question_key:r.title_en||r.question_key,w=r.has_audio?z(R(r.id),{className:"min-w-[12rem]",fallbackText:t("無法播放錄音","Could not play the recording")}):`<span class="text-slate-400">${e(t("沒有錄音","No audio"))}</span>`;return`<tr class="border-t border-slate-100 align-top">
            <td class="p-3 whitespace-nowrap text-slate-500">${e(r.created_at||"")}</td>
            <td class="p-3">${e(r.user_name||"")}<div class="text-xs text-slate-500">${e(r.user_email||"")}</div></td>
            <td class="p-3">${e(y)}</td>
            <td class="p-3 font-semibold tabular-nums ${T(Number(r.score)||0)}">${Number(r.score)||0}</td>
            <td class="p-3 min-w-[16rem]">${w}</td>
            <td class="p-3 max-w-xs"><p>${e(r.transcript||"")}</p><p class="text-xs text-slate-500 mt-1">${e(h||"")}</p></td>
        </tr>`}).join("");s.innerHTML=`
        <p class="mb-4"><a href="${e(q("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${e(t("← 管理首頁","← Admin home"))}</a></p>
        ${k("attempts")}
        <h2 class="text-lg font-bold text-slate-900 mb-1">${e(t("口述解釋作答","Spoken explanations"))}</h2>
        <p class="text-sm text-slate-600 mb-4">${e(t("查看各使用者的錄音、轉寫、分數和評語。","Review each user's recording, transcript, score, and feedback."))}</p>
        <form id="admin-explain-filter" class="flex flex-wrap gap-2 items-end mb-4">
            <label class="text-sm">${e(t("學生","Student"))}
                <input name="q" value="${e(i)}" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm min-w-[12rem]" placeholder="${e(t("姓名或帳戶","Name or login"))}">
            </label>
            <label class="text-sm">${e(t("題目","Question"))}
                <select name="question_key" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm">${a}</select>
            </label>
            <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${e(t("套用","Apply"))}</button>
        </form>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">${e(t("時間","Time"))}</th>
                        <th class="p-3">${e(t("學生","Student"))}</th>
                        <th class="p-3">${e(t("題目","Question"))}</th>
                        <th class="p-3">${e(t("分數","Score"))}</th>
                        <th class="p-3">${e(t("錄音","Recording"))}</th>
                        <th class="p-3">${e(t("轉寫與評語","Transcript and feedback"))}</th>
                    </tr>
                </thead>
                <tbody>
                    ${n||`<tr><td class="p-3 text-slate-500" colspan="6">${e(t("還沒有作答。","No attempts yet."))}</td></tr>`}
                </tbody>
            </table>
        </div>`,A(s),E(s),(u=s.querySelector("#admin-explain-filter"))==null||u.addEventListener("submit",r=>{r.preventDefault();const h=r.target,y={view:"attempts"},w=h.q&&h.q.value?h.q.value.trim():"",S=h.question_key&&h.question_key.value?h.question_key.value:"";w&&(y.q=w),S&&(y.question_key=S),j(y)})}async function v(){L();const s=document.getElementById("page-title"),o=document.getElementById("card-container");if(s&&(s.textContent=t("口述解釋","Oral explanations")),!!o){if(!d.ScienceApi.getUser()){d.AppRouter.navigate("/login");return}if(!d.ScienceApi.hasPermission("user.manage")){o.innerHTML=`<p class="text-red-600">${e(t("沒有權限管理口述解釋。","You cannot manage oral explanations."))}</p>`;return}o.innerHTML=`<p class="text-slate-500">${e(t("載入中…","Loading…"))}</p>`;try{const i=N();i==="subjects"?await U(o):i==="attempts"?await D(o):await C(o)}catch(i){o.innerHTML=`<p class="text-red-600">${e(i.message||t("載入失敗。","Failed to load."))}</p>`}}}d.AppAdmin=d.AppAdmin||{};d.AppAdmin.renderAdminExplanations=v;
