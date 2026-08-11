const x=window;function e(r,l){return x.AppRouter&&x.AppRouter.t?x.AppRouter.t(r,l):r}function t(r){return x.AppRouter&&x.AppRouter.escapeHtml?x.AppRouter.escapeHtml(r):String(r||"")}function Q(r){return x.AppRouter&&x.AppRouter.spaHref?x.AppRouter.spaHref(r):r}function dt(){const r=document.getElementById("sidebar");r&&(r.style.display="none")}function Z(r,l){const u=String(r||"");return u.length>l?u.slice(0,l)+"…":u}function ct(r){return{mcq:e("選擇","MCQ"),fill_blank:e("填充","Fill"),true_false:e("是非","T/F"),short_answer:e("短答","Short"),long_answer:e("長答","Long")}[r]||r||"—"}function F(r){return r==null?"—":r?e("是","Yes"):e("否","No")}function tt(r){return r==null?"text-slate-400":r>=50?"text-red-700 font-semibold":r>=30?"text-orange-700":"text-emerald-700"}function et(r,l,u){const S=location.pathname.split("/app")[0]+"/app",R="/admin/summer-homework/"+r+"/analytics",w=new URLSearchParams;l>0&&w.set("user_id",String(l)),u>0&&w.set("attempt_id",String(u));const M=w.toString();history.replaceState({path:R},"",S+R+(M?"?"+M:""))}function it(r,l){return Array.isArray(r)&&r.find(u=>L(u)&&Number(u.question_id)===l)||null}function L(r){return r&&typeof r=="object"}function pt(r,l){let u=r.teacher_marks;if(!u&&r.teacher_marks_json)try{u=typeof r.teacher_marks_json=="string"?JSON.parse(r.teacher_marks_json):r.teacher_marks_json}catch{u=null}return L(u)&&(u[String(l)]||u[l])||null}async function V(r){var W;dt();const l=parseInt(r,10)||0,u=document.getElementById("page-title"),S=document.getElementById("card-container");if(u&&(u.textContent=e("呈交分析","Submission analytics")),!x.ScienceApi.getUser()){x.AppRouter.navigate("/login");return}if(l<=0){x.AppRouter.navigate("/admin/summer-homework");return}const R=new URLSearchParams(location.search);let w=parseInt(R.get("user_id")||"0",10)||0,M=parseInt(R.get("attempt_id")||"0",10)||0;S.innerHTML=`<p class="text-slate-500">${t(e("載入中…","Loading…"))}</p>`;try{const I=await x.ScienceApi.apiFetch("/admin/summer-homework/"+l+"/analytics"),U=I.item||{},B=I.analytics||{},q=I.students||[],G=I.questions||[],st=!!I.can_manage,J={};G.forEach(s=>{J[Number(s.id)]=s});let P=[];w>0&&(P=(await x.ScienceApi.apiFetch("/admin/summer-homework/"+l+"/attempts?user_id="+w)).attempts||[]);let p=null;M>0&&(p=P.find(s=>Number(s.id)===M)||null,!p&&w<=0&&(p=((await x.ScienceApi.apiFetch("/admin/summer-homework/"+l+"/attempts")).attempts||[]).find(b=>Number(b.id)===M)||null));const at=(q.find(s=>Number(s.user_id)===w)||{}).display_name||"",rt=U.title_zh||U.title_en||"#"+l,nt=String(U.form_level)==="2"?e("中二","S2"):e("中一","S1"),lt=(B.questions||[]).map((s,b)=>{const d=Number(s.question_id),h=J[d],o=h&&(h.stem_zh||h.stem_en)||"",_=s.miss_rate_percent;let c="";if(s.type==="mcq"&&Array.isArray(s.options)&&s.options.length&&(c=`<tr class="border-t border-slate-50 bg-slate-50/40"><td colspan="7" class="p-0">
                        <table class="min-w-full text-xs"><thead><tr class="text-slate-500 text-left">
                            <th class="px-3 py-2 pl-8 w-16">${t(e("選項","Opt"))}</th>
                            <th class="px-3 py-2">${t(e("內容","Text"))}</th>
                            <th class="px-3 py-2 w-20">${t(e("被選次數","Picked"))}</th>
                            <th class="px-3 py-2 w-24">${t(e("佔全部呈交","% all"))}</th>
                            <th class="px-3 py-2 w-24">${t(e("錯選佔比","% of wrong"))}</th>
                        </tr></thead><tbody>
                        ${s.options.map(a=>{const n=!!a.is_correct,$=a.text_zh||a.text_en||""||"—",f=a.select_rate_percent,v=a.wrong_select_rate_percent;return`<tr class="border-t border-slate-100/80 ${n?"text-emerald-800":Number(f||0)>=20?"text-red-800":"text-slate-700"}">
                                <td class="px-3 py-2 pl-8 font-bold">${t(String(a.label||String.fromCharCode(65+Number(a.index||0))))}${n?` <span class="ml-1 font-normal text-emerald-700">✓ ${t(e("正確","Correct"))}</span>`:""}</td>
                                <td class="px-3 py-2">${t(Z($,80))}</td>
                                <td class="px-3 py-2">${Number(a.selected_count||0)}</td>
                                <td class="px-3 py-2">${f==null?"—":t(String(f))+"%"}</td>
                                <td class="px-3 py-2">${n||v==null?"—":t(String(v))+"%"}</td>
                            </tr>`}).join("")}
                        ${Number(s.unanswered||0)>0?`<tr class="border-t border-slate-100/80 text-slate-500">
                            <td class="px-3 py-2 pl-8" colspan="2">${t(e("（未作答）","(unanswered)"))}</td>
                            <td class="px-3 py-2">${Number(s.unanswered)}</td>
                            <td class="px-3 py-2">${Number(s.attempts)>0?t(String(Math.round(Number(s.unanswered)/Number(s.attempts)*1e4)/100))+"%":"—"}</td>
                            <td class="px-3 py-2">—</td>
                        </tr>`:""}
                        </tbody></table></td></tr>`),Array.isArray(s.blanks)&&s.blanks.length&&(c+=s.blanks.map(a=>{const n=a.miss_rate_percent;return`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                            <td class="p-2 pl-8 text-slate-500" colspan="2">└ ${t(e("空格","Blank"))} ${Number(a.blank_index)}</td>
                            <td class="p-2 text-slate-500">—</td>
                            <td class="p-2">${Number(a.attempts||0)}</td>
                            <td class="p-2">${Number(a.correct||0)}</td>
                            <td class="p-2">${Number(a.incorrect||0)}</td>
                            <td class="p-2 ${tt(n)}">${n==null?"—":t(String(n))+"%"}</td>
                        </tr>`}).join("")),s.type==="true_false"){const a=s.correct_bool;c+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="3">└ ${t(e("選「是」","True"))} ${Number(s.true_count||0)}
                            · ${t(e("選「否」","False"))} ${Number(s.false_count||0)}
                            · ${t(e("正解","Answer"))}：${t(F(a))}</td>
                        <td colspan="4"></td></tr>`}if(s.type==="short_answer"&&Array.isArray(s.common_wrong_answers)&&s.common_wrong_answers.length){const a=s.common_wrong_answers.map(n=>t(String(n.answer||""))+"（"+Number(n.count||0)+"）").join("、");c+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${t(e("常見錯答","Common wrong"))}：${a||"—"}</td></tr>`}return s.type==="long_answer"&&(c+=`<tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                        <td class="p-2 pl-8 text-slate-500" colspan="7">└ ${t(e("待評","Needs mark"))} ${Number(s.needs_marking||0)}
                            · ${t(e("已評","Marked"))} ${Number(s.marked||0)}</td></tr>`),`<tr class="border-t border-slate-100 align-top">
                    <td class="p-3">${b+1}</td>
                    <td class="p-3">${t(ct(s.type))}</td>
                    <td class="p-3 max-w-md">${t(Z(o,60)||"#"+d)}</td>
                    <td class="p-3">${Number(s.attempts||0)}</td>
                    <td class="p-3">${Number(s.correct||0)}</td>
                    <td class="p-3">${Number(s.incorrect||0)}</td>
                    <td class="p-3 ${tt(_)}">${_==null?"—":t(String(_))+"%"}</td>
                </tr>${c}`}).join(""),ot=q.map(s=>{const b=Number(s.user_id),d=w===b,h=!s.passed;return`<tr class="border-t border-slate-100 ${d?"bg-indigo-50/50":h?"bg-amber-50/70":""}">
                    <td class="p-3 font-medium">${t(s.display_name||"")}</td>
                    <td class="p-3 text-xs text-slate-600">${t(s.email||"")}</td>
                    <td class="p-3">${Number(s.attempts||0)}</td>
                    <td class="p-3">${t(String(s.best_percent??"—"))}%${s.best_score!=null?` <span class="text-xs text-slate-500">（${t(String(s.best_score))}/${t(String(s.best_max_score))}）</span>`:""}</td>
                    <td class="p-3 ${h?"text-amber-900 font-semibold":"text-emerald-800"}">${t(F(!!s.passed))}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.first_passed_at?t(String(s.first_passed_at).slice(0,16)):"—"}</td>
                    <td class="p-3 text-xs whitespace-nowrap">${s.last_submitted_at?t(String(s.last_submitted_at).slice(0,16)):"—"}</td>
                    <td class="p-3"><button type="button" class="sh-filter-user text-indigo-600 hover:underline" data-user-id="${b}">${t(e("詳細","Detail"))}</button></td>
                </tr>`}).join("");let Y="";if(w>0){const s=P.length,b=P.map((d,h)=>{const o=s-h;return`<tr class="border-t border-slate-100 ${p&&Number(p.id)===Number(d.id)?"bg-amber-50":""}">
                        <td class="p-3">${o}</td>
                        <td class="p-3 text-xs whitespace-nowrap">${t(String(d.submitted_at||"").slice(0,19))}</td>
                        <td class="p-3">${t(String(d.score))} / ${t(String(d.max_score))}</td>
                        <td class="p-3">${t(String(d.percent))}%</td>
                        <td class="p-3">${t(F(!!d.passed))}</td>
                        <td class="p-3"><button type="button" class="sh-open-attempt text-indigo-600 hover:underline" data-attempt-id="${Number(d.id)}">${t(e("查看作答","View"))}</button></td>
                    </tr>`}).join("");Y=`<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
                    <div class="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                        <h2 class="font-bold text-slate-800">${t(at||e("學生","Student")+" #"+w)} — ${t(e("全部呈交","All attempts"))}（${s}）</h2>
                        <button type="button" id="sh-clear-user" class="text-sm text-slate-600 hover:underline">${t(e("清除學生篩選","Clear student filter"))}</button>
                    </div>
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left"><tr>
                            <th class="p-3">#</th><th class="p-3">${t(e("時間","Time"))}</th>
                            <th class="p-3">${t(e("分數","Score"))}</th><th class="p-3">${t(e("百分比","Percent"))}</th>
                            <th class="p-3">${t(e("及格","Passed"))}</th><th class="p-3">${t(e("明細","Detail"))}</th>
                        </tr></thead>
                        <tbody>${b||`<tr><td colspan="6" class="p-6 text-slate-500 text-center">${t(e("此學生尚無呈交。","No attempts."))}</td></tr>`}</tbody>
                    </table>
                </div>`}let K="";if(p){const s=L(p.grading)?p.grading:null,b=L(s)&&Array.isArray(s.details)?s.details:[],d=L(p.responses)?p.responses:{},h=G.map((o,_)=>{const c=Number(o.id),a=it(b,c),n=d[String(c)]??d[c]??null,$=o.stem_zh||o.stem_en||"",f=a?!!a.correct:null,v=f===null?`<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${t(e("無評分","Ungraded"))}</span>`:f?`<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${t(e("正確","Correct"))}</span>`:`<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">${t(e("錯誤","Wrong"))}</span>`;let g="";const k=String(o.question_type||""),T=(i,m)=>`<button type="button" class="sh-add-accept mt-2 inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                            ${i}>${t(m||e("批改成正確答案","Mark as correct"))}</button>
                         <span class="sh-add-accept-flash text-xs ml-2"></span>`;if(k==="mcq"||k==="multi_select"){let i=null,m=[];k==="multi_select"?a&&Array.isArray(a.selected_option_indexes)?m=a.selected_option_indexes.map(Number):n&&Array.isArray(n.selected_option_indexes)&&(m=n.selected_option_indexes.map(Number)):a&&Object.prototype.hasOwnProperty.call(a,"selected_option_index")?i=a.selected_option_index!=null?Number(a.selected_option_index):null:n&&n.selected_option_index!=null&&(i=Number(n.selected_option_index));const A=a&&a.correct_option_index!=null?Number(a.correct_option_index):null,N=a&&Array.isArray(a.correct_option_indexes)?a.correct_option_indexes.map(Number):[];g='<ul class="text-sm space-y-1">'+(o.options||[]).map((C,y)=>{const j=String.fromCharCode(65+y),O=C.text_zh||C.text_en||"",E=[],H=k==="multi_select"?m.includes(y):i!==null&&y===i,X=k==="multi_select"?N.includes(y):A!==null&&y===A;H&&E.push(e("學生選","Chosen")),X&&E.push(e("正確答案","Answer"));let D="";return X?D="text-emerald-800":H&&(D="text-red-800"),`<li class="${D}"><span class="font-bold text-indigo-600 mr-1">${j}</span>${t(O)}${E.length?` <span class="text-xs text-slate-500">（${t(E.join(" · "))}）</span>`:""}</li>`}).join("")+"</ul>",f===!1&&(k==="mcq"&&i!==null?g+=T(`data-qid="${c}" data-mode="mcq" data-selected-index="${i}"`,e("批改成正確答案","Mark as correct")):k==="multi_select"&&m.length&&(g+=T(`data-qid="${c}" data-mode="multi_select" data-selected-indexes="${t(m.join(","))}"`,e("批改成正確答案","Mark as correct"))))}else if(k==="true_false"){const i=a&&Object.prototype.hasOwnProperty.call(a,"selected_bool")?a.selected_bool:n&&Object.prototype.hasOwnProperty.call(n,"selected_bool")?n.selected_bool:null,m=a&&Object.prototype.hasOwnProperty.call(a,"correct_bool")?a.correct_bool:o.correct_bool??null;g=`<p class="text-sm">${t(e("學生","Student"))}：${t(F(i))} · ${t(e("正解","Answer"))}：${t(F(m))}</p>`,f===!1&&i!==null&&i!==void 0&&(g+=T(`data-qid="${c}" data-mode="true_false" data-selected-bool="${i?"1":"0"}"`,e("批改成正確答案","Mark as correct")))}else if(k==="short_answer"){const i=a&&a.given!=null?String(a.given):n?String(n.text||""):"",m=Array.isArray(o.acceptable_answers)?o.acceptable_answers:[],A=m.length?`<p class="text-xs text-slate-500 mt-1">${t(e("現有標準答案","Current answers"))}：${t(m.map(C=>C.acceptable_answer_zh||C.acceptable_answer_en||"").filter(Boolean).join(" / "))}</p>`:"",N=f===!1&&i.trim()!==""?T(`data-qid="${c}" data-mode="text" data-answer="${t(i)}"`,e("批改成正確答案","Mark as correct")):"";g=`<p class="text-sm font-mono">${t(i!==""?i:e("（空白）","(blank)"))}</p>${A}${N}`}else if(k==="long_answer"){const i=a&&a.given!=null?String(a.given):n?String(n.text||""):"",m=pt(p,c)||{},A=o.max_score!=null?o.max_score:5;g=`<div class="text-sm whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 mb-3">${t(i!==""?i:e("（空白）","(blank)"))}</div>
                            <form class="sh-mark-form space-y-2 text-sm" data-attempt="${Number(p.id)}" data-qid="${c}">
                                <label>${t(e("教師評分（滿分","Teacher mark (max"))} ${t(String(A))}）
                                    <input type="number" step="0.5" min="0" max="${t(String(A))}" class="mark-score border rounded px-2 py-1 w-24 ml-1" value="${t(String(m.score??""))}">
                                </label>
                                <div><label class="block text-slate-600">${t(e("評語","Comment"))}</label>
                                    <input type="text" class="mark-comment w-full border rounded px-2 py-1" value="${t(String(m.comment||""))}">
                                </div>
                                <button type="submit" class="text-indigo-600 text-sm">${t(e("儲存評分","Save mark"))}</button>
                                <span class="mark-flash text-xs text-slate-500"></span>
                            </form>`}else{const i=a&&Array.isArray(a.blanks)?a.blanks:[],m=n&&Array.isArray(n.blanks)||n&&L(n.blanks)?n.blanks:{};g=(o.blanks||[]).map((A,N)=>{const C=Number(A.blank_index??N+1),y=i.find(H=>Number(H.blank_index)===C)||null;let j=y&&y.given!=null?String(y.given):"";j||(j=m[N]!=null?String(m[N]):m[String(N)]!=null?String(m[String(N)]):"");const O=y?!!y.correct:null,E=O===!1&&j.trim()!==""?T(`data-qid="${c}" data-mode="text" data-blank="${C}" data-answer="${t(j)}"`,e("批改成正確答案","Mark as correct")):"";return`<div class="text-sm mb-2">
                                <span class="text-slate-500">${t(e("空格","Blank"))} ${C}：</span>
                                <span class="font-mono">${t(j!==""?j:e("（空白）","(blank)"))}</span>
                                ${O===!0?`<span class="text-emerald-700 text-xs ml-2">${t(e("正確","Correct"))}</span>`:""}
                                ${O===!1?`<span class="text-red-700 text-xs ml-2">${t(e("錯誤","Wrong"))}</span>`:""}
                                ${E}
                            </div>`}).join("")}return`<div class="border border-slate-200 rounded-lg p-4">
                        <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <p class="font-medium text-slate-900">${_+1}. ${t($)}</p>
                            ${v}
                        </div>
                        ${g}
                    </div>`}).join("");K=`<div id="attempt-detail" class="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 p-6">
                    <h2 class="font-bold text-slate-800 mb-1">${t(e("呈交明細","Attempt"))} #${Number(p.id)}</h2>
                    <p class="text-sm text-slate-500 mb-4">
                        ${t(p.display_name||"")}
                        · ${t(String(p.submitted_at||"").slice(0,19))}
                        · ${t(String(p.score))}/${t(String(p.max_score))}
                        （${t(String(p.percent))}%）
                        · ${t(p.passed?e("及格","Passed"):e("不及格","Failed"))}
                    </p>
                    ${!b.length&&!Object.keys(d).length?`<p class="text-slate-500 text-sm">${t(e("此筆呈交沒有可顯示的作答／評分明細。","No response/grading detail for this attempt."))}</p>`:`<div class="space-y-4">${h}</div>`}
                </div>`}S.innerHTML=`
                <div class="mb-4 flex flex-wrap gap-3 items-center">
                    <a href="${t(Q("/admin/summer-homework"))}" data-spa-nav="/admin/summer-homework" class="text-sm text-indigo-700 hover:underline">${t(e("← 習作列表","← Homework list"))}</a>
                    <a href="${t(Q("/admin/summer-homework/"+l+"/view"))}" data-spa-nav="/admin/summer-homework/${l}/view" class="text-sm text-slate-600 hover:underline">${t(e("內容／答案","Content / answers"))}</a>
                    ${st?`<a href="${t(Q("/admin/summer-homework/"+l+"/edit"))}" data-spa-nav="/admin/summer-homework/${l}/edit" class="text-sm text-slate-600 hover:underline">${t(e("編輯習作","Edit item"))}</a>`:""}
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-1">${t(rt)}</h2>
                <p class="text-sm text-slate-500 mb-4">${t(nt)} · ${t(e("每次呈交均保留；此頁顯示統計與詳細作答","All attempts kept; stats and answers below"))}</p>
                ${B.grading_json_available===!1?`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${t(e("資料庫尚未加入 grading_json，錯題率統計可能不完整。","grading_json missing; miss-rate stats may be incomplete."))}</div>`:""}
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("總呈交次數","Total attempts"))}</p><p class="text-2xl font-bold">${Number(B.total_attempts||0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("作答學生數","Students"))}</p><p class="text-2xl font-bold text-indigo-600">${Number(B.distinct_students||0)}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("人均呈交","Avg / student"))}</p><p class="text-2xl font-bold">${t(String(B.avg_attempts_per_student??"—"))}</p></div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p class="text-xs text-slate-500 uppercase">${t(e("題目數","Questions"))}</p><p class="text-2xl font-bold">${(B.questions||[]).length}</p></div>
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
                        <tbody>${lt||`<tr><td colspan="7" class="p-6 text-slate-500 text-center">${t(e("尚無題目或呈交資料。","No questions or attempts."))}</td></tr>`}</tbody>
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
                        <tbody>${ot||`<tr><td colspan="8" class="p-6 text-slate-500 text-center">${t(e("尚無呈交紀錄。","No submissions yet."))}</td></tr>`}</tbody>
                    </table>
                </div>
                ${Y}
                ${K}`;async function z(s,b){var d;et(l,s||0,b||0),await V(String(l)),b>0&&((d=document.getElementById("attempt-detail"))==null||d.scrollIntoView({behavior:"smooth",block:"start"}))}S.querySelectorAll(".sh-filter-user").forEach(s=>{s.addEventListener("click",()=>z(parseInt(s.getAttribute("data-user-id")||"0",10),0))}),(W=document.getElementById("sh-clear-user"))==null||W.addEventListener("click",()=>z(0,0)),S.querySelectorAll(".sh-open-attempt").forEach(s=>{s.addEventListener("click",()=>z(w,parseInt(s.getAttribute("data-attempt-id")||"0",10)))}),S.querySelectorAll(".sh-mark-form").forEach(s=>{s.addEventListener("submit",async b=>{b.preventDefault();const d=s.getAttribute("data-attempt"),h=s.getAttribute("data-qid"),o=s.querySelector(".mark-flash"),_={};_[h]={score:parseFloat(s.querySelector(".mark-score").value||"0"),comment:s.querySelector(".mark-comment").value||""};try{await x.ScienceApi.apiFetch("/admin/summer-homework/attempts/"+d+"/marks",{method:"POST",body:{marks:_}}),o&&(o.textContent=e("已儲存","Saved"),o.className="mark-flash text-xs text-emerald-700")}catch(c){o&&(o.textContent=c.message||e("失敗","Failed"),o.className="mark-flash text-xs text-red-600")}})}),S.querySelectorAll(".sh-add-accept").forEach(s=>{s.addEventListener("click",async()=>{var n;const b=parseInt(s.getAttribute("data-qid")||"0",10),d=s.getAttribute("data-mode")||"text",h=s.getAttribute("data-answer")||"",o=s.getAttribute("data-blank"),_=s.nextElementSibling&&s.nextElementSibling.classList.contains("sh-add-accept-flash")?s.nextElementSibling:null;if(!b)return;let c=e("將此學生答案批改成正確答案，並依新答案重算所有呈交分數？","Mark this student answer as correct and regrade all attempts?");const a={regrade:!0};if(d==="mcq"){const $=parseInt(s.getAttribute("data-selected-index")||"-1",10);if($<0)return;a.selected_option_index=$,c=e(`將學生所選「${String.fromCharCode(65+$)}」設為正確答案，並重算所有呈交？`,`Set chosen option ${String.fromCharCode(65+$)} as the correct answer and regrade all attempts?`)}else if(d==="multi_select"){const f=(s.getAttribute("data-selected-indexes")||"").split(",").map(g=>parseInt(g,10)).filter(g=>!Number.isNaN(g));if(!f.length)return;a.selected_option_indexes=f;const v=f.map(g=>String.fromCharCode(65+g)).join(", ");c=e(`將學生所選「${v}」設為正確答案組合，並重算所有呈交？`,`Set chosen options ${v} as the correct set and regrade all attempts?`)}else if(d==="true_false"){const $=s.getAttribute("data-selected-bool")==="1";a.selected_bool=$,c=e(`將「${$?"是／對":"否／錯"}」設為正確答案，並重算所有呈交？`,`Set “${$?"True":"False"}” as the correct answer and regrade all attempts?`)}else{if(!String(h).trim())return;a.answer_zh=h,a.answer_en=h,o!=null&&o!==""&&(a.blank_index=parseInt(o,10)),c=e(`將「${h}」批改成正確答案，並依新答案重算所有呈交？`,`Mark “${h}” as a correct answer and regrade all attempts?`)}if(confirm(c)){s.disabled=!0;try{const $=await x.ScienceApi.apiFetch("/admin/summer-homework/"+l+"/questions/"+b+"/acceptable-answers",{method:"POST",body:a}),f=Number($.regraded||0);_&&(_.textContent=f>0?e(`已批改為正確，並重算 ${f} 筆呈交。`,`Marked correct; regraded ${f} attempts.`):e("已批改為正確答案。","Marked as correct answer."),_.className="sh-add-accept-flash text-xs ml-2 text-emerald-700"),s.textContent=e("已批改","Done");const v=w,g=p?Number(p.id):0;et(l,v||0,g||0),await V(String(l)),(n=document.getElementById("attempt-detail"))==null||n.scrollIntoView({behavior:"smooth",block:"start"})}catch($){_&&(_.textContent=$.message||e("批改失敗","Failed"),_.className="sh-add-accept-flash text-xs ml-2 text-red-600"),s.disabled=!1}}})})}catch(I){S.innerHTML=`<p class="text-red-600">${t(I.message||e("載入失敗","Load failed"))}</p>`}}x.AppAdmin=Object.assign(x.AppAdmin||{},{renderAdminSummerAnalytics:V});
