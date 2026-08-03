const u=window;function e(r,o){return u.AppRouter&&u.AppRouter.t?u.AppRouter.t(r,o):r}function t(r){return u.AppRouter&&u.AppRouter.escapeHtml?u.AppRouter.escapeHtml(r):String(r||"")}function M(r){return u.AppRouter&&u.AppRouter.spaHref?u.AppRouter.spaHref(r):r}function nt(){const r=document.getElementById("sidebar");r&&(r.style.display="none")}function J(r,o){const i=String(r||"");return i.length>o?i.slice(0,o)+"…":i}function lt(r){return{mcq:e("選擇","MCQ"),fill_blank:e("填充","Fill"),true_false:e("是非","T/F"),short_answer:e("短答","Short"),long_answer:e("長答","Long")}[r]||r||"—"}function R(r){return r==null?"—":r?e("是","Yes"):e("否","No")}function Y(r){return r==null?"text-slate-400":r>=50?"text-red-700 font-semibold":r>=30?"text-orange-700":"text-emerald-700"}function K(r,o,i){const _=location.pathname.split("/app")[0]+"/app",I="/admin/summer-homework/"+r+"/analytics",$=new URLSearchParams;o>0&&$.set("user_id",String(o)),i>0&&$.set("attempt_id",String(i));const j=$.toString();history.replaceState({path:I},"",_+I+(j?"?"+j:""))}function ot(r,o){return Array.isArray(r)&&r.find(i=>B(i)&&Number(i.question_id)===o)||null}function B(r){return r&&typeof r=="object"}function dt(r,o){let i=r.teacher_marks;if(!i&&r.teacher_marks_json)try{i=typeof r.teacher_marks_json=="string"?JSON.parse(r.teacher_marks_json):r.teacher_marks_json}catch{i=null}return B(i)&&(i[String(o)]||i[o])||null}async function U(r){var z;nt();const o=parseInt(r,10)||0,i=document.getElementById("page-title"),_=document.getElementById("card-container");if(i&&(i.textContent=e("呈交分析","Submission analytics")),!u.ScienceApi.getUser()){u.AppRouter.navigate("/login");return}if(o<=0){u.AppRouter.navigate("/admin/summer-homework");return}const I=new URLSearchParams(location.search);let $=parseInt(I.get("user_id")||"0",10)||0,j=parseInt(I.get("attempt_id")||"0",10)||0;_.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const k=await u.ScienceApi.apiFetch("/admin/summer-homework/"+o+"/analytics"),F=k.item||{},C=k.analytics||{},D=k.students||[],Q=k.questions||[],X=!!k.can_manage,V={};Q.forEach(s=>{V[Number(s.id)]=s});let T=[];$>0&&(T=(await u.ScienceApi.apiFetch("/admin/summer-homework/"+o+"/attempts?user_id="+$)).attempts||[]);let c=null;j>0&&(c=T.find(s=>Number(s.id)===j)||null,!c&&$<=0&&(c=((await u.ScienceApi.apiFetch("/admin/summer-homework/"+o+"/attempts")).attempts||[]).find(p=>Number(p.id)===j)||null));const Z=(D.find(s=>Number(s.user_id)===$)||{}).display_name||"",q=F.title_zh||F.title_en||"#"+o,tt=String(F.form_level)==="2"?e("中二","S2"):e("中一","S1"),et=(C.questions||[]).map((s,p)=>{const d=Number(s.question_id),h=V[d],l=h&&(h.stem_zh||h.stem_en)||"",f=s.miss_rate_percent;let m="";if(s.type==="mcq"&&Array.isArray(s.options)&&s.options.length&&(m=`<tr class="border-t border-slate-50 bg-slate-50/40"><td colspan="7" class="p-0">
                        <table class="min-w-full text-xs"><thead><tr class="text-slate-500 text-left">
                            <th class="px-3 py-2 pl-8 w-16">${t(e("選項","Opt"))}</th>
                            <th class="px-3 py-2">${t(e("內容","Text"))}</th>
                            <th class="px-3 py-2 w-20">${t(e("被選次數","Picked"))}</th>
                            <th class="px-3 py-2 w-24">${t(e("佔全部呈交","% all"))}</th>
                            <th class="px-3 py-2 w-24">${t(e("錯選佔比","% of wrong"))}</th>
                        </tr></thead><tbody>
                        ${s.options.map(a=>{const n=!!a.is_correct,L=a.text_zh||a.text_en||""||"—",S=a.select_rate_percent,O=a.wrong_select_rate_percent;return`<tr class="border-t border-slate-100/80 ${n?"text-emerald-800":Number(S||0)>=20?"text-red-800":"text-slate-700"}">
                                <td class="px-3 py-2 pl-8 font-bold">${t(String(a.label||String.fromCharCode(65+Number(a.index||0))))}${n?` <span class="ml-1 font-normal text-emerald-700">✓ ${t(e("正確","Correct"))}</span>`:""}</td>
                                <td class="px-3 py-2">${t(J(L,80))}</td>
                                <td class="px-3 py-2">${Number(a.selected_count||0)}</td>
                                <td class="px-3 py-2">${S==null?"—":t(String(S))+"%"}</td>
                                <td class="px-3 py-2">${n||O==null?"—":t(String(O))+"%"}</td>
                            </tr>`}).join("")}
                        ${Number(s.unanswered||0)>0?`<tr class="border-t border-slate-100/80 text-slate-500">
                            <td class="px-3 py-2 pl-8" colspan="2">${t(e("（未作答）","(unanswered)"))}</td>
                            <td class="px-3 py-2">${Number(s.unanswered)}</td>
                            <td class="px-3 py-2">${Number(s.attempts)>0?t(String(Math.round(Number(s.unanswered)/Number(s.attempts)*1e4)/100))+"%":"—"}</td>
                            <td class="px-3 py-2">—</td>
                        </tr>`:""}
                        </tbody></table></td></tr>`),Array.isArray(s.blanks)&&s.blanks.length&&(m+=s.blanks.map(a=>{const n=a.miss_rate_percent;return`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                            <td class="p-2 pl-8 text-slate-500" colspan="2">└ ${t(e("空格","Blank"))} ${Number(a.blank_index)}</td>
                            <td class="p-2 text-slate-500">—</td>
                            <td class="p-2">${Number(a.attempts||0)}</td>
                            <td class="p-2">${Number(a.correct||0)}</td>
                            <td class="p-2">${Number(a.incorrect||0)}</td>
                            <td class="p-2 ${Y(n)}">${n==null?"—":t(String(n))+"%"}</td>
                        </tr>`}).join("")),s.type==="true_false"){const a=s.correct_bool;m+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="3">└ ${t(e("選「是」","True"))} ${Number(s.true_count||0)}
                            · ${t(e("選「否」","False"))} ${Number(s.false_count||0)}
                            · ${t(e("正解","Answer"))}：${t(R(a))}</td>
                        <td colspan="4"></td></tr>`}if(s.type==="short_answer"&&Array.isArray(s.common_wrong_answers)&&s.common_wrong_answers.length){const a=s.common_wrong_answers.map(n=>t(String(n.answer||""))+"（"+Number(n.count||0)+"）").join("、");m+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${t(e("常見錯答","Common wrong"))}：${a||"—"}</td></tr>`}return s.type==="long_answer"&&(m+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${t(e("待評","Needs mark"))} ${Number(s.needs_marking||0)}
                            · ${t(e("已評","Marked"))} ${Number(s.marked||0)}</td></tr>`),`<tr class="border-t border-slate-100 align-top">
                    <td class="p-3">${p+1}</td>
                    <td class="p-3">${t(lt(s.type))}</td>
                    <td class="p-3 max-w-md">${t(J(l,60)||"#"+d)}</td>
                    <td class="p-3">${Number(s.attempts||0)}</td>
                    <td class="p-3">${Number(s.correct||0)}</td>
                    <td class="p-3">${Number(s.incorrect||0)}</td>
                    <td class="p-3 ${Y(f)}">${f==null?"—":t(String(f))+"%"}</td>
                </tr>${m}`}).join(""),st=D.map(s=>{const p=Number(s.user_id),d=$===p,h=!s.passed;return`<tr class="border-t border-slate-100 ${d?"bg-indigo-50/50":h?"bg-amber-50/70":""}">
                    <td class="p-3 font-medium">${t(s.display_name||"")}</td>
                    <td class="p-3 text-xs text-slate-600">${t(s.email||"")}</td>
                    <td class="p-3">${Number(s.attempts||0)}</td>
                    <td class="p-3">${t(String(s.best_percent??"—"))}%${s.best_score!=null?` <span class="text-xs text-slate-500">（${t(String(s.best_score))}/${t(String(s.best_max_score))}）</span>`:""}</td>
                    <td class="p-3 ${h?"text-amber-900 font-semibold":"text-emerald-800"}">${t(R(!!s.passed))}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.first_passed_at?t(String(s.first_passed_at).slice(0,16)):"—"}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.last_submitted_at?t(String(s.last_submitted_at).slice(0,16)):"—"}</td>
                    <td class="p-3"><button type="button" class="sh-filter-user text-indigo-600 hover:underline" data-user-id="${p}">${t(e("詳細","Detail"))}</button></td>
                </tr>`}).join("");let W="";if($>0){const s=T.length,p=T.map((d,h)=>{const l=s-h;return`<tr class="border-t border-slate-100 ${c&&Number(c.id)===Number(d.id)?"bg-amber-50":""}">
                        <td class="p-3">${l}</td>
                        <td class="p-3 text-xs whitespace-nowrap">${t(String(d.submitted_at||"").slice(0,19))}</td>
                        <td class="p-3">${t(String(d.score))} / ${t(String(d.max_score))}</td>
                        <td class="p-3">${t(String(d.percent))}%</td>
                        <td class="p-3">${t(R(!!d.passed))}</td>
                        <td class="p-3"><button type="button" class="sh-open-attempt text-indigo-600 hover:underline" data-attempt-id="${Number(d.id)}">${t(e("查看作答","View"))}</button></td>
                    </tr>`}).join("");W=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                        <h2 class="font-bold text-slate-800">${t(Z||e("學生","Student")+" #"+$)} — ${t(e("全部呈交","All attempts"))}（${s}）</h2>
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
                </div>`}let G="";if(c){const s=B(c.grading)?c.grading:null,p=B(s)&&Array.isArray(s.details)?s.details:[],d=B(c.responses)?c.responses:{},h=Q.map((l,f)=>{const m=Number(l.id),a=ot(p,m),n=d[String(m)]??d[m]??null,L=l.stem_zh||l.stem_en||"",S=a?!!a.correct:null,O=S===null?`<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${t(e("無評分","Ungraded"))}</span>`:S?`<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${t(e("正確","Correct"))}</span>`:`<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">${t(e("錯誤","Wrong"))}</span>`;let A="";const P=String(l.question_type||"");if(P==="mcq"){let b=null;a&&Object.prototype.hasOwnProperty.call(a,"selected_option_index")?b=a.selected_option_index!=null?Number(a.selected_option_index):null:n&&n.selected_option_index!=null&&(b=Number(n.selected_option_index));const x=a&&a.correct_option_index!=null?Number(a.correct_option_index):null;A='<ul class="text-sm space-y-1">'+(l.options||[]).map((y,g)=>{const v=String.fromCharCode(65+g),N=y.text_zh||y.text_en||"",w=[];b!==null&&g===b&&w.push(e("學生選","Chosen")),x!==null&&g===x&&w.push(e("正確答案","Answer"));let E="";return x!==null&&g===x?E="text-emerald-800":b!==null&&g===b&&(E="text-red-800"),`<li class="${E}"><span class="font-bold text-indigo-600 mr-1">${v}</span>${t(N)}${w.length?` <span class="text-xs text-slate-500">（${t(w.join(" · "))}）</span>`:""}</li>`}).join("")+"</ul>"}else if(P==="true_false"){const b=a&&Object.prototype.hasOwnProperty.call(a,"selected_bool")?a.selected_bool:n&&Object.prototype.hasOwnProperty.call(n,"selected_bool")?n.selected_bool:null,x=a&&Object.prototype.hasOwnProperty.call(a,"correct_bool")?a.correct_bool:l.correct_bool??null;A=`<p class="text-sm">${t(e("學生","Student"))}：${t(R(b))} · ${t(e("正解","Answer"))}：${t(R(x))}</p>`}else if(P==="short_answer"){const b=a&&a.given!=null?String(a.given):n?String(n.text||""):"",x=Array.isArray(l.acceptable_answers)?l.acceptable_answers:[],y=x.length?`<p class="text-xs text-slate-500 mt-1">${t(e("現有標準答案","Current answers"))}：${t(x.map(v=>v.acceptable_answer_zh||v.acceptable_answer_en||"").filter(Boolean).join(" / "))}</p>`:"",g=b.trim()!==""?`<button type="button" class="sh-add-accept mt-2 text-xs text-indigo-700 hover:underline"
                                data-qid="${m}" data-answer="${t(b)}">${t(e("將學生答案加入標準答案","Add student answer as acceptable"))}</button>
                               <span class="sh-add-accept-flash text-xs ml-2"></span>`:"";A=`<p class="text-sm font-mono">${t(b!==""?b:e("（空白）","(blank)"))}</p>${y}${g}`}else if(P==="long_answer"){const b=a&&a.given!=null?String(a.given):n?String(n.text||""):"",x=dt(c,m)||{},y=l.max_score!=null?l.max_score:5;A=`<div class="text-sm whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 mb-3">${t(b!==""?b:e("（空白）","(blank)"))}</div>
                            <form class="sh-mark-form space-y-2 text-sm" data-attempt="${Number(c.id)}" data-qid="${m}">
                                <label>${t(e("教師評分（滿分","Teacher mark (max"))} ${t(String(y))}）
                                    <input type="number" step="0.5" min="0" max="${t(String(y))}" class="mark-score border rounded px-2 py-1 w-24 ml-1" value="${t(String(x.score??""))}">
                                </label>
                                <div><label class="block text-slate-600">${t(e("評語","Comment"))}</label>
                                    <input type="text" class="mark-comment w-full border rounded px-2 py-1" value="${t(String(x.comment||""))}">
                                </div>
                                <button type="submit" class="text-indigo-600 text-sm">${t(e("儲存評分","Save mark"))}</button>
                                <span class="mark-flash text-xs text-slate-500"></span>
                            </form>`}else{const b=a&&Array.isArray(a.blanks)?a.blanks:[],x=n&&Array.isArray(n.blanks)||n&&B(n.blanks)?n.blanks:{};A=(l.blanks||[]).map((y,g)=>{const v=Number(y.blank_index??g+1),N=b.find(rt=>Number(rt.blank_index)===v)||null;let w=N&&N.given!=null?String(N.given):"";w||(w=x[g]!=null?String(x[g]):x[String(g)]!=null?String(x[String(g)]):"");const E=N?!!N.correct:null,at=w.trim()!==""?`<button type="button" class="sh-add-accept ml-2 text-xs text-indigo-700 hover:underline"
                                    data-qid="${m}" data-blank="${v}" data-answer="${t(w)}">${t(e("加入標準答案","Add as answer"))}</button>
                                   <span class="sh-add-accept-flash text-xs ml-1"></span>`:"";return`<div class="text-sm mb-2">
                                <span class="text-slate-500">${t(e("空格","Blank"))} ${v}：</span>
                                <span class="font-mono">${t(w!==""?w:e("（空白）","(blank)"))}</span>
                                ${E===!0?`<span class="text-emerald-700 text-xs ml-2">${t(e("正確","Correct"))}</span>`:""}
                                ${E===!1?`<span class="text-red-700 text-xs ml-2">${t(e("錯誤","Wrong"))}</span>`:""}
                                ${at}
                            </div>`}).join("")}return`<div class="border border-slate-200 rounded-lg p-4">
                        <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <p class="font-medium text-slate-900">${f+1}. ${t(L)}</p>
                            ${O}
                        </div>
                        ${A}
                    </div>`}).join("");G=`<div id="attempt-detail" class="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 p-6">
                    <h2 class="font-bold text-slate-800 mb-1">${t(e("呈交明細","Attempt"))} #${Number(c.id)}</h2>
                    <p class="text-sm text-slate-500 mb-4">
                        ${t(c.display_name||"")}
                        · ${t(String(c.submitted_at||"").slice(0,19))}
                        · ${t(String(c.score))}/${t(String(c.max_score))}
                        （${t(String(c.percent))}%）
                        · ${t(c.passed?e("及格","Passed"):e("不及格","Failed"))}
                    </p>
                    ${!p.length&&!Object.keys(d).length?`<p class="text-slate-500 text-sm">${t(e("此筆呈交沒有可顯示的作答／評分明細。","No response/grading detail for this attempt."))}</p>`:`<div class="space-y-4">${h}</div>`}
                </div>`}_.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${t(M("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-indigo-700 hover:underline">${t(e("← 習作列表","← Homework list"))}</a>
                    <a href="${t(M("/admin/summer-homework/"+o+"/view"))}" data-spa-nav="/admin/summer-homework/${o}/view" class="text-sm text-slate-600 hover:underline">${t(e("內容／答案","Content / answers"))}</a>
                    ${X?`<a href="${t(M("/admin/summer-homework/"+o+"/edit"))}" data-spa-nav="/admin/summer-homework/${o}/edit" class="text-sm text-slate-600 hover:underline">${t(e("編輯習作","Edit item"))}</a>`:""}
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${t(q)}</h2>
                <p class="text-sm text-slate-500 mb-4">${t(tt)} · ${t(e("每次呈交均保留；此頁顯示統計與詳細作答","All attempts kept; stats and answers below"))}</p>
                ${C.grading_json_available===!1?`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${t(e("資料庫尚未加入 grading_json，錯題率統計可能不完整。","grading_json missing; miss-rate stats may be incomplete."))}</div>`:""}
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("總呈交次數","Total attempts"))}</p><p class="text-2xl font-bold">${Number(C.total_attempts||0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("作答學生數","Students"))}</p><p class="text-2xl font-bold text-indigo-600">${Number(C.distinct_students||0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("人均呈交","Avg / student"))}</p><p class="text-2xl font-bold">${t(String(C.avg_attempts_per_student??"—"))}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("題目數","Questions"))}</p><p class="text-2xl font-bold">${(C.questions||[]).length}</p></div>
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
                        <tbody>${et||`<tr><td colspan="7" class="p-6 text-slate-500 text-center">${t(e("尚無題目或呈交資料。","No questions or attempts."))}</td></tr>`}</tbody>
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
                        <tbody>${st||`<tr><td colspan="8" class="p-6 text-slate-500 text-center">${t(e("尚無呈交紀錄。","No submissions yet."))}</td></tr>`}</tbody>
                    </table>
                </div>
                ${W}
                ${G}`;async function H(s,p){var d;K(o,s||0,p||0),await U(String(o)),p>0&&((d=document.getElementById("attempt-detail"))==null||d.scrollIntoView({behavior:"smooth",block:"start"}))}_.querySelectorAll(".sh-filter-user").forEach(s=>{s.addEventListener("click",()=>H(parseInt(s.getAttribute("data-user-id")||"0",10),0))}),(z=document.getElementById("sh-clear-user"))==null||z.addEventListener("click",()=>H(0,0)),_.querySelectorAll(".sh-open-attempt").forEach(s=>{s.addEventListener("click",()=>H($,parseInt(s.getAttribute("data-attempt-id")||"0",10)))}),_.querySelectorAll(".sh-mark-form").forEach(s=>{s.addEventListener("submit",async p=>{p.preventDefault();const d=s.getAttribute("data-attempt"),h=s.getAttribute("data-qid"),l=s.querySelector(".mark-flash"),f={};f[h]={score:parseFloat(s.querySelector(".mark-score").value||"0"),comment:s.querySelector(".mark-comment").value||""};try{await u.ScienceApi.apiFetch("/admin/summer-homework/attempts/"+d+"/marks",{method:"POST",body:{marks:f}}),l&&(l.textContent=e("已儲存","Saved"),l.className="mark-flash text-xs text-emerald-700")}catch(m){l&&(l.textContent=m.message||e("失敗","Failed"),l.className="mark-flash text-xs text-red-600")}})}),_.querySelectorAll(".sh-add-accept").forEach(s=>{s.addEventListener("click",async()=>{var m;const p=parseInt(s.getAttribute("data-qid")||"0",10),d=s.getAttribute("data-answer")||"",h=s.getAttribute("data-blank"),l=s.nextElementSibling&&s.nextElementSibling.classList.contains("sh-add-accept-flash")?s.nextElementSibling:null;if(!p||!String(d).trim()||!confirm(e(`將「${d}」加入標準答案，並依新答案重算所有呈交？`,`Add “${d}” as an acceptable answer and regrade all attempts?`)))return;s.disabled=!0;const f={answer_zh:d,answer_en:d,regrade:!0};h!=null&&h!==""&&(f.blank_index=parseInt(h,10));try{const a=await u.ScienceApi.apiFetch("/admin/summer-homework/"+o+"/questions/"+p+"/acceptable-answers",{method:"POST",body:f}),n=Number(a.regraded||0);l&&(l.textContent=n>0?e(`已加入，並重算 ${n} 筆呈交。`,`Added; regraded ${n} attempts.`):e("已加入標準答案。","Added as acceptable answer."),l.className="sh-add-accept-flash text-xs ml-2 text-emerald-700"),s.textContent=e("已加入","Added");const L=$,S=c?Number(c.id):0;K(o,L||0,S||0),await U(String(o)),(m=document.getElementById("attempt-detail"))==null||m.scrollIntoView({behavior:"smooth",block:"start"})}catch(a){l&&(l.textContent=a.message||e("加入失敗","Failed"),l.className="sh-add-accept-flash text-xs ml-2 text-red-600"),s.disabled=!1}})})}catch(k){_.innerHTML=`<p class="text-red-600">${t(k.message||e("載入失敗","Load failed"))}</p>`}}u.AppAdmin=Object.assign(u.AppAdmin||{},{renderAdminSummerAnalytics:U});
