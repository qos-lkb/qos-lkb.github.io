const u=window;function e(r,n){return u.AppRouter&&u.AppRouter.t?u.AppRouter.t(r,n):r}function t(r){return u.AppRouter&&u.AppRouter.escapeHtml?u.AppRouter.escapeHtml(r):String(r||"")}function st(){const r=document.getElementById("sidebar");r&&(r.style.display="none")}function V(r,n){const c=String(r||"");return c.length>n?c.slice(0,n)+"…":c}function at(r){return{mcq:e("選擇","MCQ"),fill_blank:e("填充","Fill"),true_false:e("是非","T/F"),short_answer:e("短答","Short"),long_answer:e("長答","Long")}[r]||r||"—"}function T(r){return r==null?"—":r?e("是","Yes"):e("否","No")}function G(r){return r==null?"text-slate-400":r>=50?"text-red-700 font-semibold":r>=30?"text-orange-700":"text-emerald-700"}function rt(r,n,c){const f=location.pathname.split("/app")[0]+"/app",L="/admin/summer-homework/"+r+"/analytics",h=new URLSearchParams;n>0&&h.set("user_id",String(n)),c>0&&h.set("attempt_id",String(c));const A=h.toString();history.replaceState({path:L},"",f+L+(A?"?"+A:""))}function lt(r,n){return Array.isArray(r)&&r.find(c=>B(c)&&Number(c.question_id)===n)||null}function B(r){return r&&typeof r=="object"}function nt(r,n){let c=r.teacher_marks;if(!c&&r.teacher_marks_json)try{c=typeof r.teacher_marks_json=="string"?JSON.parse(r.teacher_marks_json):r.teacher_marks_json}catch{c=null}return B(c)&&(c[String(n)]||c[n])||null}async function J(r){var H;st();const n=parseInt(r,10)||0,c=document.getElementById("page-title"),f=document.getElementById("card-container");if(c&&(c.textContent=e("呈交分析","Submission analytics")),!u.ScienceApi.getUser()){u.AppRouter.navigate("/login");return}if(n<=0){u.AppRouter.navigate("/admin/summer-homework");return}const L=new URLSearchParams(location.search);let h=parseInt(L.get("user_id")||"0",10)||0,A=parseInt(L.get("attempt_id")||"0",10)||0;f.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const w=await u.ScienceApi.apiFetch("/admin/summer-homework/"+n+"/analytics"),P=w.item||{},N=w.analytics||{},U=w.students||[],D=w.questions||[],Y=!!w.can_manage,z={};D.forEach(s=>{z[Number(s.id)]=s});let E=[];h>0&&(E=(await u.ScienceApi.apiFetch("/admin/summer-homework/"+n+"/attempts?user_id="+h)).attempts||[]);let i=null;A>0&&(i=E.find(s=>Number(s.id)===A)||null,!i&&h<=0&&(i=((await u.ScienceApi.apiFetch("/admin/summer-homework/"+n+"/attempts")).attempts||[]).find(p=>Number(p.id)===A)||null));const K=(U.find(s=>Number(s.user_id)===h)||{}).display_name||"",X=P.title_zh||P.title_en||"#"+n,Z=String(P.form_level)==="2"?e("中二","S2"):e("中一","S1"),q=(N.questions||[]).map((s,p)=>{const o=Number(s.question_id),$=z[o],d=$&&($.stem_zh||$.stem_en)||"",_=s.miss_rate_percent;let b="";if(s.type==="mcq"&&Array.isArray(s.options)&&s.options.length&&(b=`<tr class="border-t border-slate-50 bg-slate-50/40"><td colspan="7" class="p-0">
                        <table class="min-w-full text-xs"><thead><tr class="text-slate-500 text-left">
                            <th class="px-3 py-2 pl-8 w-16">${t(e("選項","Opt"))}</th>
                            <th class="px-3 py-2">${t(e("內容","Text"))}</th>
                            <th class="px-3 py-2 w-20">${t(e("被選次數","Picked"))}</th>
                            <th class="px-3 py-2 w-24">${t(e("佔全部呈交","% all"))}</th>
                            <th class="px-3 py-2 w-24">${t(e("錯選佔比","% of wrong"))}</th>
                        </tr></thead><tbody>
                        ${s.options.map(a=>{const l=!!a.is_correct,M=a.text_zh||a.text_en||""||"—",j=a.select_rate_percent,I=a.wrong_select_rate_percent;return`<tr class="border-t border-slate-100/80 ${l?"text-emerald-800":Number(j||0)>=20?"text-red-800":"text-slate-700"}">
                                <td class="px-3 py-2 pl-8 font-bold">${t(String(a.label||String.fromCharCode(65+Number(a.index||0))))}${l?` <span class="ml-1 font-normal text-emerald-700">✓ ${t(e("正確","Correct"))}</span>`:""}</td>
                                <td class="px-3 py-2">${t(V(M,80))}</td>
                                <td class="px-3 py-2">${Number(a.selected_count||0)}</td>
                                <td class="px-3 py-2">${j==null?"—":t(String(j))+"%"}</td>
                                <td class="px-3 py-2">${l||I==null?"—":t(String(I))+"%"}</td>
                            </tr>`}).join("")}
                        ${Number(s.unanswered||0)>0?`<tr class="border-t border-slate-100/80 text-slate-500">
                            <td class="px-3 py-2 pl-8" colspan="2">${t(e("（未作答）","(unanswered)"))}</td>
                            <td class="px-3 py-2">${Number(s.unanswered)}</td>
                            <td class="px-3 py-2">${Number(s.attempts)>0?t(String(Math.round(Number(s.unanswered)/Number(s.attempts)*1e4)/100))+"%":"—"}</td>
                            <td class="px-3 py-2">—</td>
                        </tr>`:""}
                        </tbody></table></td></tr>`),Array.isArray(s.blanks)&&s.blanks.length&&(b+=s.blanks.map(a=>{const l=a.miss_rate_percent;return`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                            <td class="p-2 pl-8 text-slate-500" colspan="2">└ ${t(e("空格","Blank"))} ${Number(a.blank_index)}</td>
                            <td class="p-2 text-slate-500">—</td>
                            <td class="p-2">${Number(a.attempts||0)}</td>
                            <td class="p-2">${Number(a.correct||0)}</td>
                            <td class="p-2">${Number(a.incorrect||0)}</td>
                            <td class="p-2 ${G(l)}">${l==null?"—":t(String(l))+"%"}</td>
                        </tr>`}).join("")),s.type==="true_false"){const a=s.correct_bool;b+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="3">└ ${t(e("選「是」","True"))} ${Number(s.true_count||0)}
                            · ${t(e("選「否」","False"))} ${Number(s.false_count||0)}
                            · ${t(e("正解","Answer"))}：${t(T(a))}</td>
                        <td colspan="4"></td></tr>`}if(s.type==="short_answer"&&Array.isArray(s.common_wrong_answers)&&s.common_wrong_answers.length){const a=s.common_wrong_answers.map(l=>t(String(l.answer||""))+"（"+Number(l.count||0)+"）").join("、");b+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${t(e("常見錯答","Common wrong"))}：${a||"—"}</td></tr>`}return s.type==="long_answer"&&(b+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${t(e("待評","Needs mark"))} ${Number(s.needs_marking||0)}
                            · ${t(e("已評","Marked"))} ${Number(s.marked||0)}</td></tr>`),`<tr class="border-t border-slate-100 align-top">
                    <td class="p-3">${p+1}</td>
                    <td class="p-3">${t(at(s.type))}</td>
                    <td class="p-3 max-w-md">${t(V(d,60)||"#"+o)}</td>
                    <td class="p-3">${Number(s.attempts||0)}</td>
                    <td class="p-3">${Number(s.correct||0)}</td>
                    <td class="p-3">${Number(s.incorrect||0)}</td>
                    <td class="p-3 ${G(_)}">${_==null?"—":t(String(_))+"%"}</td>
                </tr>${b}`}).join(""),tt=U.map(s=>{const p=Number(s.user_id),o=h===p,$=!s.passed;return`<tr class="border-t border-slate-100 ${o?"bg-indigo-50/50":$?"bg-amber-50/70":""}">
                    <td class="p-3 font-medium">${t(s.display_name||"")}</td>
                    <td class="p-3 text-xs text-slate-600">${t(s.email||"")}</td>
                    <td class="p-3">${Number(s.attempts||0)}</td>
                    <td class="p-3">${t(String(s.best_percent??"—"))}%${s.best_score!=null?` <span class="text-xs text-slate-500">（${t(String(s.best_score))}/${t(String(s.best_max_score))}）</span>`:""}</td>
                    <td class="p-3 ${$?"text-amber-900 font-semibold":"text-emerald-800"}">${t(T(!!s.passed))}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.first_passed_at?t(String(s.first_passed_at).slice(0,16)):"—"}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.last_submitted_at?t(String(s.last_submitted_at).slice(0,16)):"—"}</td>
                    <td class="p-3"><button type="button" class="sh-filter-user text-indigo-600 hover:underline" data-user-id="${p}">${t(e("詳細","Detail"))}</button></td>
                </tr>`}).join("");let Q="";if(h>0){const s=E.length,p=E.map((o,$)=>{const d=s-$;return`<tr class="border-t border-slate-100 ${i&&Number(i.id)===Number(o.id)?"bg-amber-50":""}">
                        <td class="p-3">${d}</td>
                        <td class="p-3 text-xs whitespace-nowrap">${t(String(o.submitted_at||"").slice(0,19))}</td>
                        <td class="p-3">${t(String(o.score))} / ${t(String(o.max_score))}</td>
                        <td class="p-3">${t(String(o.percent))}%</td>
                        <td class="p-3">${t(T(!!o.passed))}</td>
                        <td class="p-3"><button type="button" class="sh-open-attempt text-indigo-600 hover:underline" data-attempt-id="${Number(o.id)}">${t(e("查看作答","View"))}</button></td>
                    </tr>`}).join("");Q=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                        <h2 class="font-bold text-slate-800">${t(K||e("學生","Student")+" #"+h)} — ${t(e("全部呈交","All attempts"))}（${s}）</h2>
                        <button type="button" id="sh-clear-user" class="text-sm text-slate-600 hover:underline">${t(e("清除學生篩選","Clear student filter"))}</button>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">#</th><th class="p-3">${t(e("時間","Time"))}</th>
                            <th class="p-3">${t(e("分數","Score"))}</th><th class="p-3">${t(e("百分比","Percent"))}</th>
                            <th class="p-3">${t(e("及格","Passed"))}</th><th class="p-3">${t(e("明細","Detail"))}</th>
                        </tr></thead>
                        <tbody>${p||`<tr><td colspan="6" class="p-6 text-slate-500 text-center">${t(e("此學生尚無呈交。","No attempts."))}</td></tr>`}</tbody>
                    </table>
                </div>`}let W="";if(i){const s=B(i.grading)?i.grading:null,p=B(s)&&Array.isArray(s.details)?s.details:[],o=B(i.responses)?i.responses:{},$=D.map((d,_)=>{const b=Number(d.id),a=lt(p,b),l=o[String(b)]??o[b]??null,M=d.stem_zh||d.stem_en||"",j=a?!!a.correct:null,I=j===null?`<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${t(e("無評分","Ungraded"))}</span>`:j?`<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${t(e("正確","Correct"))}</span>`:`<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">${t(e("錯誤","Wrong"))}</span>`;let v="";const O=String(d.question_type||"");if(O==="mcq"){let m=null;a&&Object.prototype.hasOwnProperty.call(a,"selected_option_index")?m=a.selected_option_index!=null?Number(a.selected_option_index):null:l&&l.selected_option_index!=null&&(m=Number(l.selected_option_index));const x=a&&a.correct_option_index!=null?Number(a.correct_option_index):null;v='<ul class="text-sm space-y-1">'+(d.options||[]).map((S,g)=>{const R=String.fromCharCode(65+g),k=S.text_zh||S.text_en||"",y=[];m!==null&&g===m&&y.push(e("學生選","Chosen")),x!==null&&g===x&&y.push(e("正確答案","Answer"));let C="";return x!==null&&g===x?C="text-emerald-800":m!==null&&g===m&&(C="text-red-800"),`<li class="${C}"><span class="font-bold text-indigo-600 mr-1">${R}</span>${t(k)}${y.length?` <span class="text-xs text-slate-500">（${t(y.join(" · "))}）</span>`:""}</li>`}).join("")+"</ul>"}else if(O==="true_false"){const m=a&&Object.prototype.hasOwnProperty.call(a,"selected_bool")?a.selected_bool:l&&Object.prototype.hasOwnProperty.call(l,"selected_bool")?l.selected_bool:null,x=a&&Object.prototype.hasOwnProperty.call(a,"correct_bool")?a.correct_bool:d.correct_bool??null;v=`<p class="text-sm">${t(e("學生","Student"))}：${t(T(m))} · ${t(e("正解","Answer"))}：${t(T(x))}</p>`}else if(O==="short_answer"){const m=a&&a.given!=null?String(a.given):l?String(l.text||""):"";v=`<p class="text-sm font-mono">${t(m!==""?m:e("（空白）","(blank)"))}</p>`}else if(O==="long_answer"){const m=a&&a.given!=null?String(a.given):l?String(l.text||""):"",x=nt(i,b)||{},S=d.max_score!=null?d.max_score:5;v=`<div class="text-sm whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 mb-3">${t(m!==""?m:e("（空白）","(blank)"))}</div>
                            <form class="sh-mark-form space-y-2 text-sm" data-attempt="${Number(i.id)}" data-qid="${b}">
                                <label>${t(e("教師評分（滿分","Teacher mark (max"))} ${t(String(S))}）
                                    <input type="number" step="0.5" min="0" max="${t(String(S))}" class="mark-score border rounded px-2 py-1 w-24 ml-1" value="${t(String(x.score??""))}">
                                </label>
                                <div><label class="block text-slate-600">${t(e("評語","Comment"))}</label>
                                    <input type="text" class="mark-comment w-full border rounded px-2 py-1" value="${t(String(x.comment||""))}">
                                </div>
                                <button type="submit" class="text-indigo-600 text-sm">${t(e("儲存評分","Save mark"))}</button>
                                <span class="mark-flash text-xs text-slate-500"></span>
                            </form>`}else{const m=a&&Array.isArray(a.blanks)?a.blanks:[],x=l&&Array.isArray(l.blanks)||l&&B(l.blanks)?l.blanks:{};v=(d.blanks||[]).map((S,g)=>{const R=Number(S.blank_index??g+1),k=m.find(et=>Number(et.blank_index)===R)||null;let y=k&&k.given!=null?String(k.given):"";y||(y=x[g]!=null?String(x[g]):x[String(g)]!=null?String(x[String(g)]):"");const C=k?!!k.correct:null;return`<div class="text-sm mb-2">
                                <span class="text-slate-500">${t(e("空格","Blank"))} ${R}：</span>
                                <span class="font-mono">${t(y!==""?y:e("（空白）","(blank)"))}</span>
                                ${C===!0?`<span class="text-emerald-700 text-xs ml-2">${t(e("正確","Correct"))}</span>`:""}
                                ${C===!1?`<span class="text-red-700 text-xs ml-2">${t(e("錯誤","Wrong"))}</span>`:""}
                            </div>`}).join("")}return`<div class="border border-slate-200 rounded-lg p-4">
                        <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <p class="font-medium text-slate-900">${_+1}. ${t(M)}</p>
                            ${I}
                        </div>
                        ${v}
                    </div>`}).join("");W=`<div id="attempt-detail" class="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 p-6">
                    <h2 class="font-bold text-slate-800 mb-1">${t(e("呈交明細","Attempt"))} #${Number(i.id)}</h2>
                    <p class="text-sm text-slate-500 mb-4">
                        ${t(i.display_name||"")}
                        · ${t(String(i.submitted_at||"").slice(0,19))}
                        · ${t(String(i.score))}/${t(String(i.max_score))}
                        （${t(String(i.percent))}%）
                        · ${t(i.passed?e("及格","Passed"):e("不及格","Failed"))}
                    </p>
                    ${!p.length&&!Object.keys(o).length?`<p class="text-slate-500 text-sm">${t(e("此筆呈交沒有可顯示的作答／評分明細。","No response/grading detail for this attempt."))}</p>`:`<div class="space-y-4">${$}</div>`}
                </div>`}f.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${t(spaHref("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-indigo-700 hover:underline">${t(e("← 習作列表","← Homework list"))}</a>
                    <a href="${t(spaHref("/admin/summer-homework/"+n+"/view"))}" data-spa-nav="/admin/summer-homework/${n}/view" class="text-sm text-slate-600 hover:underline">${t(e("內容／答案","Content / answers"))}</a>
                    ${Y?`<a href="${t(spaHref("/admin/summer-homework/"+n+"/edit"))}" data-spa-nav="/admin/summer-homework/${n}/edit" class="text-sm text-slate-600 hover:underline">${t(e("編輯習作","Edit item"))}</a>`:""}
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${t(X)}</h2>
                <p class="text-sm text-slate-500 mb-4">${t(Z)} · ${t(e("每次呈交均保留；此頁顯示統計與詳細作答","All attempts kept; stats and answers below"))}</p>
                ${N.grading_json_available===!1?`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${t(e("資料庫尚未加入 grading_json，錯題率統計可能不完整。","grading_json missing; miss-rate stats may be incomplete."))}</div>`:""}
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("總呈交次數","Total attempts"))}</p><p class="text-2xl font-bold">${Number(N.total_attempts||0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("作答學生數","Students"))}</p><p class="text-2xl font-bold text-indigo-600">${Number(N.distinct_students||0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("人均呈交","Avg / student"))}</p><p class="text-2xl font-bold">${t(String(N.avg_attempts_per_student??"—"))}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("題目數","Questions"))}</p><p class="text-2xl font-bold">${(N.questions||[]).length}</p></div>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b">
                        <h2 class="font-bold text-slate-800">${t(e("錯題與選項分析","Miss & option analysis"))}</h2>
                        <p class="text-xs text-slate-500 mt-1">${t(e("依所有呈交次數統計（非僅最高分）。","Based on all attempts, not best only."))}</p>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${t(e("題號","Q#"))}</th><th class="p-3">${t(e("類型","Type"))}</th>
                            <th class="p-3">${t(e("題幹摘要","Stem"))}</th><th class="p-3">${t(e("評分次數","Graded"))}</th>
                            <th class="p-3">${t(e("答對","Correct"))}</th><th class="p-3">${t(e("答錯","Wrong"))}</th>
                            <th class="p-3">${t(e("錯題率","Miss %"))}</th>
                        </tr></thead>
                        <tbody>${q||`<tr><td colspan="7" class="p-6 text-slate-500 text-center">${t(e("尚無題目或呈交資料。","No questions or attempts."))}</td></tr>`}</tbody>
                    </table>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b"><h2 class="font-bold text-slate-800">${t(e("學生呈交摘要","Student summary"))}</h2>
                        <p class="text-xs text-slate-500 mt-1">${t(e("點學生可查看該生每一次呈交與作答內容。","Open a student to view each attempt."))}</p>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">${t(e("學生","Student"))}</th><th class="p-3">${t(e("電郵","Email"))}</th>
                            <th class="p-3">${t(e("次數","Tries"))}</th><th class="p-3">${t(e("最高分","Best"))}</th>
                            <th class="p-3">${t(e("及格","Passed"))}</th><th class="p-3">${t(e("首次及格","First pass"))}</th>
                            <th class="p-3">${t(e("最近呈交","Last submit"))}</th><th class="p-3"></th>
                        </tr></thead>
                        <tbody>${tt||`<tr><td colspan="8" class="p-6 text-slate-500 text-center">${t(e("尚無呈交紀錄。","No submissions yet."))}</td></tr>`}</tbody>
                    </table>
                </div>
                ${Q}
                ${W}`;async function F(s,p){var o;rt(n,s||0,p||0),await J(String(n)),p>0&&((o=document.getElementById("attempt-detail"))==null||o.scrollIntoView({behavior:"smooth",block:"start"}))}f.querySelectorAll(".sh-filter-user").forEach(s=>{s.addEventListener("click",()=>F(parseInt(s.getAttribute("data-user-id")||"0",10),0))}),(H=document.getElementById("sh-clear-user"))==null||H.addEventListener("click",()=>F(0,0)),f.querySelectorAll(".sh-open-attempt").forEach(s=>{s.addEventListener("click",()=>F(h,parseInt(s.getAttribute("data-attempt-id")||"0",10)))}),f.querySelectorAll(".sh-mark-form").forEach(s=>{s.addEventListener("submit",async p=>{p.preventDefault();const o=s.getAttribute("data-attempt"),$=s.getAttribute("data-qid"),d=s.querySelector(".mark-flash"),_={};_[$]={score:parseFloat(s.querySelector(".mark-score").value||"0"),comment:s.querySelector(".mark-comment").value||""};try{await u.ScienceApi.apiFetch("/admin/summer-homework/attempts/"+o+"/marks",{method:"POST",body:{marks:_}}),d&&(d.textContent=e("已儲存","Saved"),d.className="mark-flash text-xs text-emerald-700")}catch(b){d&&(d.textContent=b.message||e("失敗","Failed"),d.className="mark-flash text-xs text-red-600")}})})}catch(w){f.innerHTML=`<p class="text-red-600">${t(w.message||e("載入失敗","Load failed"))}</p>`}}u.AppAdmin=Object.assign(u.AppAdmin||{},{renderAdminSummerAnalytics:J});
