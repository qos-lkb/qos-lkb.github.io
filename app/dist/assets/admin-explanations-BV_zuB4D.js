const a=window;function n(s,r){return a.AppRouter&&a.AppRouter.t?a.AppRouter.t(s,r):s}function e(s){return a.AppRouter&&a.AppRouter.escapeHtml?a.AppRouter.escapeHtml(s):String(s||"")}function v(s){return a.AppRouter&&a.AppRouter.spaHref?a.AppRouter.spaHref(s):String(s)}function w(s){return(a.ScienceApi&&ScienceApi.API_BASE||"/api/v1")+"/explain/attempts/"+encodeURIComponent(String(s))+"/audio"}function R(){const s=document.getElementById("sidebar");s&&(s.style.display="none")}function k(s){return s>=70?"text-emerald-700":s>=40?"text-amber-700":"text-rose-700"}async function f(){var h;R();const s=document.getElementById("page-title"),r=document.getElementById("card-container");if(s&&(s.textContent=n("口述解釋","Oral explanations")),!r)return;if(!a.ScienceApi.getUser()){a.AppRouter.navigate("/login");return}if(!a.ScienceApi.hasPermission("user.manage")){r.innerHTML=`<p class="text-red-600">${e(n("沒有權限查看各人的作答。","You cannot review these answers."))}</p>`;return}const x=new URLSearchParams(location.search),d=x.get("q")||"",u=x.get("question_key")||"",m=a.AppRouter&&AppRouter.getLang?AppRouter.getLang():"zh";r.innerHTML=`<p class="text-slate-500">${e(n("載入中…","Loading…"))}</p>`;try{const l=[];d&&l.push("q="+encodeURIComponent(d)),u&&l.push("question_key="+encodeURIComponent(u));const b=await a.ScienceApi.apiFetch("/admin/explanations"+(l.length?"?"+l.join("&"):"")),$=b.attempts||[],g=b.questions||[],y=[`<option value="">${e(n("全部題目","All questions"))}</option>`].concat(g.map(t=>{const o=m==="zh"?t.title_zh:t.title_en,p=t.key===u?" selected":"";return`<option value="${e(t.key)}"${p}>${e(o)}</option>`})).join(""),A=$.map(t=>{const o=m==="zh"?t.feedback_zh||t.feedback_en:t.feedback_en||t.feedback_zh,p=m==="zh"?t.title_zh||t.question_key:t.title_en||t.question_key,i=t.has_audio?`<audio controls preload="none" src="${e(w(t.id))}" class="w-full min-w-[12rem]"></audio>`:`<span class="text-slate-400">${e(n("沒有錄音","No audio"))}</span>`;return`<tr class="border-t border-slate-100 align-top">
                <td class="p-3 whitespace-nowrap text-slate-500">${e(t.created_at||"")}</td>
                <td class="p-3">${e(t.user_name||"")}<div class="text-xs text-slate-500">${e(t.user_email||"")}</div></td>
                <td class="p-3">${e(p)}</td>
                <td class="p-3 font-semibold tabular-nums ${k(Number(t.score)||0)}">${Number(t.score)||0}</td>
                <td class="p-3 min-w-[16rem]">${i}</td>
                <td class="p-3 max-w-xs"><p>${e(t.transcript||"")}</p><p class="text-xs text-slate-500 mt-1">${e(o||"")}</p></td>
            </tr>`}).join("");r.innerHTML=`
            <p class="mb-4"><a href="${e(v("/admin"))}" data-spa-nav="/admin" class="text-sm text-brand-700 hover:underline">${e(n("← 管理首頁","← Admin home"))}</a></p>
            <h2 class="text-lg font-bold text-slate-900 mb-1">${e(n("口述解釋作答","Spoken explanations"))}</h2>
            <p class="text-sm text-slate-600 mb-4">${e(n("查看各使用者的錄音、轉寫、分數和評語。","Review each user's recording, transcript, score, and feedback."))}</p>
            <form id="admin-explain-filter" class="flex flex-wrap gap-2 items-end mb-4">
                <label class="text-sm">${e(n("學生","Student"))}
                    <input name="q" value="${e(d)}" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm min-w-[12rem]" placeholder="${e(n("姓名或帳戶","Name or login"))}">
                </label>
                <label class="text-sm">${e(n("題目","Question"))}
                    <select name="question_key" class="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm">${y}</select>
                </label>
                <button type="submit" class="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-semibold">${e(n("套用","Apply"))}</button>
            </form>
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left">
                        <tr>
                            <th class="p-3">${e(n("時間","Time"))}</th>
                            <th class="p-3">${e(n("學生","Student"))}</th>
                            <th class="p-3">${e(n("題目","Question"))}</th>
                            <th class="p-3">${e(n("分數","Score"))}</th>
                            <th class="p-3">${e(n("錄音","Recording"))}</th>
                            <th class="p-3">${e(n("轉寫與評語","Transcript and feedback"))}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${A||`<tr><td class="p-3 text-slate-500" colspan="6">${e(n("還沒有作答。","No attempts yet."))}</td></tr>`}
                    </tbody>
                </table>
            </div>`,(h=r.querySelector("#admin-explain-filter"))==null||h.addEventListener("submit",t=>{t.preventDefault();const o=t.target,p=o.q&&o.q.value?o.q.value.trim():"",i=o.question_key&&o.question_key.value?o.question_key.value:"",c=[];p&&c.push("q="+encodeURIComponent(p)),i&&c.push("question_key="+encodeURIComponent(i));const q="/admin/explanations"+(c.length?"?"+c.join("&"):""),_=location.pathname.split("/app")[0]+"/app";history.pushState({path:"/admin/explanations"},"",_+q),f()})}catch(l){r.innerHTML=`<p class="text-red-600">${e(l.message||n("載入失敗。","Failed to load."))}</p>`}}a.AppAdmin=a.AppAdmin||{};a.AppAdmin.renderAdminExplanations=f;
