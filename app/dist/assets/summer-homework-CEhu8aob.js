const w=window,{apiFetch:z}=w.ScienceApi,{t:x,escapeHtml:c,getLang:Y,navigate:E}=w.AppRouter;function V(e){if(!e)return"";if(e.includes("youtube.com/embed/")||e.includes("youtu.be/")||e.includes("youtube-nocookie.com")){let a=e;return e.includes("youtu.be/")?a="https://www.youtube-nocookie.com/embed/"+e.split("youtu.be/")[1].split(/[?&]/)[0]:e.includes("watch?v=")&&(a="https://www.youtube-nocookie.com/embed/"+new URL(e).searchParams.get("v")),`<div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-6">
                <iframe class="w-full h-full" src="${c(a)}" title="video" allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
            </div>`}return`<div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-6">
            <iframe class="w-full h-full" src="${c(e)}" title="video" allowfullscreen></iframe>
        </div>`}function G(e){return w.AppMarkdown&&AppMarkdown.renderMarkdownToHtml?AppMarkdown.renderMarkdownToHtml(e||""):w.marked&&w.DOMPurify?DOMPurify.sanitize(marked.parse(e||"")):"<p>"+c(e||"")+"</p>"}function F(e){return w.AppMarkdown&&AppMarkdown.renderPlainWithMathToHtml?AppMarkdown.renderPlainWithMathToHtml(e||""):c(e||"")}async function N(e){!e||!w.AppMarkdown||(typeof AppMarkdown.enhanceMarkdown=="function"?await AppMarkdown.enhanceMarkdown(e):typeof AppMarkdown.typesetMath=="function"&&await AppMarkdown.typesetMath(e))}function M(e){return e?String(e).replace("T"," ").slice(0,16):""}function R(){return w.ScienceApi&&ScienceApi.getUser?ScienceApi.getUser():null}function q(e){return!!(e&&e.is_teacher)}function P(e){if(!e||q(e))return null;if(e.summer_form_level==="1"||e.summer_form_level==="2")return e.summer_form_level;const a=e.profile&&e.profile.form_level;if(a==="1"||a==="2")return a;const o=e.classes||[];for(let s=0;s<o.length;s++){const r=o[s].form_level;if(r==="1"||r==="2")return r}return null}function T(e){if(e==="zh"||e==="en")return e;const a=R();if(a&&!q(a)&&a.is_student){if(a.summer_content_lang==="zh"||a.summer_content_lang==="en")return a.summer_content_lang;if(a.summer_moi==="E")return"en";if(a.summer_moi==="C")return"zh";const o=a.classes||[],s=P(a);let r=null,d=-1;if(o.forEach(i=>{if(i.moi!=="E"&&i.moi!=="C")return;let n=0;s&&i.form_level===s&&(n+=100),(i.form_level==="1"||i.form_level==="2")&&(n+=20),i.course_subject==="integrated_science"&&(n+=10),n>d&&(d=n,r=i.moi)}),r==="E")return"en";if(r==="C")return"zh"}return Y()}function t(e,a,o){return(o||T())==="zh"?e:a}function K(e,a){if(!e.due_at)return"";const o=M(e.due_at),s=e.allow_late_submit!==!1?t("截止後仍可遲交","Late submit allowed after due",a):t("截止後不可再交","No submissions after due",a);return`<p class="text-xs text-slate-500 mt-1">${t("截止","Due",a)}: ${c(o)} · ${s}</p>`}function U(e,a){if(!e||!e.passed){const d=e&&e.percent!=null?`<span class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">${t("最高","Best",a)} ${e.percent}%</span>`:"";return`<span class="inline-flex flex-wrap gap-1 justify-end">
                <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">${t("未交","Not completed",a)}</span>
                ${e&&e.attempts>0?`<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-950">${t("未及格，請再次完成","Not passed — please redo",a)}</span>`:""}
                ${d}
            </span>`}const o=e.submission_status;let s="";o==="late"?s=`<span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-900">${t("欠交","Overdue completion",a)}</span>`:o==="on_time"&&(s=`<span class="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-900">${t("準時","On time",a)}</span>`);const r=e.first_passed_at?`<span class="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">${t("首次及格","First pass",a)} ${c(M(e.first_passed_at))}</span>`:"";return`<span class="inline-flex flex-wrap gap-1 justify-end">
            <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${t("及格","Passed",a)} · ${t("最高","Best",a)} ${e.percent}%</span>
            ${s}
            ${r}
        </span>`}async function D(){const e=document.getElementById("main-content");e.innerHTML=`<div class="max-w-4xl mx-auto w-full"><p class="text-slate-500">${x("載入中…","Loading…")}</p></div>`;let a;try{a=await z("/teacher/classes")}catch(n){const m=(w.ScienceApi.SITE_BASE||"")+"/login.php?next="+encodeURIComponent("app/");e.innerHTML=`<div class="max-w-4xl mx-auto w-full">
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">${x("我的課程","My courses")}</h1>
                <p class="text-red-600">${c(n.message||x("載入失敗","Failed to load"))}</p>
                <p class="text-sm text-slate-500 mt-2">${x("請確認已登入且具課程管理權限。","Please sign in with course management permission.")}
                    <a class="text-indigo-600 underline ml-1" href="${m}">${x("登入","Log in")}</a>
                </p>
            </div>`;return}const o=a.classes||[],s=n=>w.AppRouter&&w.AppRouter.spaHref?w.AppRouter.spaHref(n):n,r=(n,m)=>`<a class="text-indigo-600 hover:underline" href="${c(s(n))}" data-spa-nav="${c(n)}">${c(m)}</a>`,d=o.map(n=>{const m=Number(n.id),k=n.form_level_label||"—",v=n.course_subject_label||"—";return`<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div class="flex flex-wrap justify-between gap-3 items-start">
                    <div>
                        <h3 class="font-semibold text-slate-900 text-lg">${c(n.name)}</h3>
                        <p class="text-xs text-slate-500 mt-1">${c(n.school_year||"")} · ${c(k)} · ${c(v)}
                            · ${x("學生","Students")} ${n.student_count!=null?n.student_count:"—"}</p>
                    </div>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        ${r("/admin/courses/"+m+"/students",x("學生","Students"))}
                        ${r("/admin/courses/"+m+"/summer",x("暑期功課","Summer HW"))}
                        ${r("/admin/courses/"+m+"/report",x("學習報告","Reports"))}
                        ${r("/admin/courses/"+m+"/worksheets",x("工作紙","Worksheets"))}
                        ${r("/admin/courses/"+m,x("編輯","Edit"))}
                    </div>
                </div>
            </div>`}).join(""),i=`
            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p class="text-slate-700 text-sm">${c(x("尚無任教課程。","No courses yet."))}</p>
                <p class="text-slate-500 text-xs mt-2">${c(x("可由後台新增課程，或請管理員指派任教班別。","Create a course in admin, or ask an admin to assign you to a class."))}</p>
                <a href="${c(s("/admin/courses"))}" data-spa-nav="/admin/courses"
                   class="inline-block mt-4 text-sm font-medium text-indigo-700 hover:underline">${c(x("前往課程管理","Go to course admin"))}</a>
            </div>`;e.innerHTML=`
            <div class="max-w-4xl mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80">
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${x("我的課程","My courses")}</h1>
                    <p class="text-slate-600 mt-2 text-sm">${x("查看任教課程的暑期功課呈交與學習報告。","View summer homework submissions and learning reports for your classes.")}</p>
                    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <a href="${c(s("/admin/courses"))}" data-spa-nav="/admin/courses" class="text-indigo-600 hover:underline">${x("課程管理","Course admin")}</a>
                        <a href="${c(s("/summer-homework/s1"))}" data-spa-nav="/summer-homework/s1" class="text-indigo-600 hover:underline">${x("預覽中一暑期","Preview S1 summer")}</a>
                        <a href="${c(s("/summer-homework/s2"))}" data-spa-nav="/summer-homework/s2" class="text-indigo-600 hover:underline">${x("預覽中二暑期","Preview S2 summer")}</a>
                    </div>
                </div>
                <div class="space-y-3">
                    ${d||i}
                </div>
            </div>`,e.querySelectorAll("[data-spa-nav]").forEach(n=>{n.addEventListener("click",m=>{m.preventDefault(),w.AppRouter&&w.AppRouter.navigate(n.getAttribute("data-spa-nav"))})})}async function Q(){const e=R();if(q(e)){await D();return}const a=P(e);await O(a)}async function O(e){const a=document.getElementById("main-content"),o=T();a.innerHTML=`<div class="max-w-4xl mx-auto w-full"><p class="text-slate-500">${t("載入中…","Loading…",o)}</p></div>`;const s=R(),r=!!(s&&!q(s)&&s.is_student);let d=e;if(r){const p=P(s);p&&(d=p)}let i;try{const p=d?"?form="+encodeURIComponent(d):"";i=await z("/summer-homework"+p)}catch(p){a.innerHTML=`<div class="max-w-4xl mx-auto"><p class="text-red-600">${c(p.message||t("載入失敗","Failed to load",o))}</p>
                <p class="text-sm text-slate-500 mt-2">${t("請用瀏覽器直接開啟 /api/v1/summer-homework 查看錯誤內容。若提示 schema，請確認已對「網站實際連線的那個資料庫」匯入 schema_upgrade_all.sql。","Open /api/v1/summer-homework in the browser to see the API error. If it mentions schema, import schema_upgrade_all.sql into the same database your site .env points to.",o)}</p></div>`;return}const n=T(i.content_lang),m=i.items||[],k=!!(i.form_locked||r),v=i.student_form_level||d,L=m.filter(p=>p.form_level==="1"),g=m.filter(p=>p.form_level==="2");if(i.message&&m.length===0){a.innerHTML=`
                <div class="max-w-4xl mx-auto w-full">
                    <div class="mb-6 pb-6 border-b border-slate-200/80">
                        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t("暑期功課","Summer Homework",n)}</h1>
                    </div>
                    <p class="text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">${c(i.message)}</p>
                </div>`;return}function A(p,l,S){if(d&&d!==S)return"";const $=l.map(u=>{const b=n==="zh"?u.title_zh:u.title_en,f=u.content_type==="video"?t("影片","Video",n):t("閱讀","Passage",n);return`<a href="#" data-slug="${c(u.slug)}" class="sh-card block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition">
                    <div class="flex justify-between gap-3 items-start">
                        <div>
                            <h3 class="font-semibold text-slate-900">${c(b)}</h3>
                            <p class="text-xs text-slate-500 mt-1">${f} · ${t("及格線","Pass mark",n)} ${u.pass_percent}%</p>
                            ${K(u,n)}
                        </div>
                        ${U(u.progress,n)}
                    </div>
                </a>`}).join("");return`<section class="mb-10">
                <h2 class="text-xl font-bold text-slate-900 mb-3">${p}</h2>
                <div class="space-y-3">${$||`<p class="text-slate-500 text-sm">${t("暫無習作。","No assessments yet.",n)}</p>`}</div>
            </section>`}const h=v==="2"?t("中二","S2",n):v==="1"?t("中一","S1",n):"",B=k&&(v==="1"||v==="2")?t(`以下為你年級（${h}）需要完成的暑期功課。達到各習作及格線即為及格；及格後仍可重做並保留最高分。`,`Summer homework for your form (${h}). Reach each item’s pass mark to pass. You may redo after passing; the highest score is kept.`,n):t("專為中一、中二同學而設。完成閱讀或影片後作答；達到各習作及格線即為及格。及格後仍可重做，系統會保留最高分數。","For S1 and S2 students. After the passage or video, answer the questions. Reach each item’s pass mark to pass. You may redo after passing; the highest score is kept.",n),C=r&&(i.summer_moi==="E"||i.summer_moi==="C")?`<p class="text-xs text-slate-500 mt-2">${t("習作語言依你修讀該科的語言（"+(i.summer_moi==="E"?"英文":"中文")+"），不受上方中／EN 切換影響。","Content language follows your subject MOI ("+(i.summer_moi==="E"?"English":"Chinese")+"), not the 中/EN toggle.",n)}</p>`:"",I=k?`<p class="text-sm text-indigo-800 mt-3">${t("已依你的年級顯示習作。","Showing assessments for your form level.",n)}</p>${C}`:`<div class="flex flex-wrap gap-2 mt-4">
                <button type="button" data-form="" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${d?"bg-white":"bg-indigo-600 text-white border-indigo-600"}">${t("全部","All",n)}</button>
                <button type="button" data-form="1" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${d==="1"?"bg-indigo-600 text-white border-indigo-600":"bg-white"}">${t("中一","S1",n)}</button>
                <button type="button" data-form="2" class="sh-filter px-3 py-1.5 rounded-lg text-sm border ${d==="2"?"bg-indigo-600 text-white border-indigo-600":"bg-white"}">${t("中二","S2",n)}</button>
            </div>`;a.innerHTML=`
            <div class="max-w-4xl mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80">
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t("暑期功課","Summer Homework",n)}</h1>
                    <p class="text-slate-600 mt-2 text-sm">${B}</p>
                    ${I}
                </div>
                ${A(t("中一 (S1)","Form 1 (S1)",n),L,"1")}
                ${A(t("中二 (S2)","Form 2 (S2)",n),g,"2")}
            </div>`,document.querySelectorAll(".sh-filter").forEach(p=>{p.addEventListener("click",()=>{const l=p.getAttribute("data-form");E(l==="1"?"/summer-homework/s1":l==="2"?"/summer-homework/s2":"/summer-homework")})}),document.querySelectorAll(".sh-card").forEach(p=>{p.addEventListener("click",l=>{l.preventDefault(),E("/summer-homework/"+encodeURIComponent(p.getAttribute("data-slug")))})})}async function J(e){var B,C,I,p;const a=document.getElementById("main-content"),o=T();a.innerHTML=`<div class="max-w-3xl mx-auto"><p class="text-slate-500">${t("載入中…","Loading…",o)}</p></div>`;let s;try{s=await z("/summer-homework/"+encodeURIComponent(e))}catch(l){a.innerHTML=`<div class="max-w-3xl mx-auto"><p class="text-red-600">${c(l.message||"")}</p>
                <button type="button" id="sh-back" class="mt-4 text-indigo-600 underline">${t("返回列表","Back to list",o)}</button></div>`,(B=document.getElementById("sh-back"))==null||B.addEventListener("click",()=>E("/summer-homework"));return}const r=T(s.content_lang),d=r==="zh"?s.title_zh:s.title_en,i=s.questions||[],n=s.progress&&s.progress.passed;let m="";if(s.content_type==="video")m=V(s.video_embed_url);else{const l=r==="zh"?s.body_zh:s.body_en;m=`<article class="prose-article max-w-none mb-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">${G(l)}</article>`}const k=s.form_level==="2"?t("中二","S2",r):t("中一","S1",r),v=!!s.submissions_closed,L=s.due_at?`<p class="text-sm text-slate-500 mb-2">${t("截止日期","Due",r)}: ${c(M(s.due_at))}
                （${s.allow_late_submit!==!1?t("允許遲交","Late allowed",r):t("截止後不可交","Closed after due",r)}）</p>`:"";a.innerHTML=`
            <div class="max-w-3xl mx-auto w-full">
                <button type="button" id="sh-back" class="text-sm text-indigo-600 mb-4">${t("← 暑期功課","← Summer homework",r)}</button>
                <div class="mb-4 flex flex-wrap items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">${k}</span>
                    ${U(s.progress,r)}
                </div>
                <h1 class="text-2xl font-extrabold text-slate-900 mb-2">${c(d)}</h1>
                <p class="text-sm text-slate-500 mb-1">${t("及格線","Pass mark",r)}: ${s.pass_percent}%</p>
                ${L}
                <div class="mb-6"></div>
                ${m}
                <div id="sh-quiz" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"></div>
                <div id="sh-result" class="mt-6 hidden"></div>
            </div>`,(C=document.getElementById("sh-back"))==null||C.addEventListener("click",()=>E("/summer-homework")),await N(a);const g=document.getElementById("sh-quiz");if(n){const l=s.progress.percent;g.insertAdjacentHTML("beforebegin",`<div class="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900" role="status">
                    ${t(`你已及格（最高 ${l}%）。仍可重做；若本次分數較低，仍保留最高分。`,`You have passed (best ${l}%). You may still redo; if this attempt is lower, your best score is kept.`,r)}
                </div>`)}else if(s.progress&&s.progress.attempts>0){const l=s.progress.percent;g.insertAdjacentHTML("beforebegin",`<div class="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-sm text-amber-950" role="alert">
                    <p class="font-semibold">${t("尚未及格，請再次完成此習作。","Not yet passed — please complete this assessment again.",r)}</p>
                    <p class="mt-1">${t(`目前最高 ${l}%（及格線 ${s.pass_percent}%）。請重讀／重看內容後再提交。`,`Best so far: ${l}% (pass mark ${s.pass_percent}%). Review the content and submit again.`,r)}</p>
                </div>`)}if(v){g.innerHTML=`<p class="text-amber-900 font-medium">${t("已過呈交截止日期，無法再提交。","The due date has passed; submissions are closed.",r)}</p>
                <button type="button" id="sh-back2" class="mt-4 text-indigo-600 underline">${t("返回列表","Back to list",r)}</button>`,(I=document.getElementById("sh-back2"))==null||I.addEventListener("click",()=>E("/summer-homework"));return}if(!i.length){g.innerHTML=`<p class="text-slate-500">${t("此習作尚未設定題目。","No questions yet.",r)}</p>`;return}let A=null;try{A=await z("/auth/me")}catch{A=null}if(!A||!A.id){g.innerHTML=`<p class="text-amber-800">${t("請先登入後再作答。","Please log in to attempt this assessment.",r)}</p>
                <a class="inline-block mt-3 text-indigo-600 underline" href="../login.php?next=${encodeURIComponent("app/summer-homework/"+e)}">${t("登入","Log in",r)}</a>`;return}let h=`<h2 class="text-lg font-bold mb-4">${t("跟進題目","Follow-up questions",r)}</h2>`;(s.include_answers||s.can_review)&&(h=`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">${t("教師／管理員檢視模式：已顯示正確答案。","Teacher/admin review mode: correct answers are shown.",r)}</div>`+h),i.forEach((l,S)=>{const $=r==="zh"?l.stem_zh:l.stem_en,u=l.question_type||"mcq";if(h+=`<div class="mb-6 pb-6 border-b border-slate-100 last:border-0" data-qid="${l.id}" data-type="${u}">
                <div class="font-medium text-slate-900 mb-3 prose-article sh-q-stem">${S+1}. ${F($)}</div>`,u==="mcq")(l.options||[]).forEach((b,f)=>{const y=r==="zh"?b.text_zh:b.text_en,_=!!(s.include_answers||s.can_review)&&!!b.is_correct;h+=`<label class="flex items-start gap-2 mb-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${_?"border-emerald-400 bg-emerald-50":""}">
                        <input type="radio" name="q-${l.id}" value="${f}" class="mt-1">
                        <span class="sh-q-opt"><span class="font-bold text-indigo-600 mr-1">${String.fromCharCode(65+f)}</span>${F(y)}${_?` <span class="text-xs text-emerald-700">${t("✓ 正確","✓ Correct",r)}</span>`:""}</span>
                    </label>`});else if(u==="true_false"){const b=!!(s.include_answers||s.can_review),f=l.correct_bool===!0||l.correct_bool===1;h+=`<div class="flex flex-wrap gap-3">
                    <label class="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 ${b&&f?"border-emerald-400 bg-emerald-50":""}">
                        <input type="radio" name="q-${l.id}" value="1" class="sh-tf"> ${t("是／對","True",r)}
                    </label>
                    <label class="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 ${b&&!f?"border-emerald-400 bg-emerald-50":""}">
                        <input type="radio" name="q-${l.id}" value="0" class="sh-tf"> ${t("否／錯","False",r)}
                    </label>
                </div>`}else if(u==="short_answer"){let b="";if((s.include_answers||s.can_review)&&Array.isArray(l.acceptable_answers)){const f=l.acceptable_answers.map(y=>(r==="zh"?y.acceptable_answer_zh:y.acceptable_answer_en)||y.acceptable_answer_zh||y.acceptable_answer_en).filter(Boolean);b=`<p class="text-xs text-emerald-700 mt-1">${t("可接受","Acceptable",r)}：${c(f.join(" / "))}</p>`}h+=`<input type="text" class="sh-short w-full border rounded-lg px-3 py-2" autocomplete="off">${b}`}else if(u==="long_answer"){const b=l.max_score!=null?l.max_score:5;h+=`<p class="text-xs text-slate-500 mb-1">${t("長答（教師評閱，不計入自動及格分）","Long answer (teacher-marked; not in auto pass score)",r)} · ${t("滿分","Max",r)} ${b}</p>
                    <textarea class="sh-long w-full border rounded-lg px-3 py-2" rows="5"></textarea>`}else(l.blanks||[{blank_index:1}]).forEach((f,y)=>{let _="";if(s.include_answers||s.can_review){const W=(Array.isArray(f.acceptable_answers)?f.acceptable_answers:[{acceptable_answer_zh:f.acceptable_answer_zh||"",acceptable_answer_en:f.acceptable_answer_en||""}]).map(H=>((H.acceptable_answer_zh||"")+" / "+(H.acceptable_answer_en||"")).trim()).filter(H=>H!=="/"&&H!=="");_=`<p class="text-xs text-emerald-700 mt-1">${t("可接受","Acceptable",r)}：${c(W.join("；"))}</p>`}h+=`<div class="mb-2">
                        <label class="text-xs text-slate-500">${t("空格","Blank",r)} ${y+1}</label>
                        <input type="text" class="sh-blank w-full border rounded-lg px-3 py-2 mt-1" data-blank="${y}" autocomplete="off">
                        ${_}
                    </div>`});h+="</div>"}),h+=`<button type="button" id="sh-submit" class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">${n?t("重新提交","Resubmit",r):t("提交答案","Submit",r)}</button>`,g.innerHTML=h,await N(g),(p=document.getElementById("sh-submit"))==null||p.addEventListener("click",async()=>{const l={};document.querySelectorAll("#sh-quiz [data-qid]").forEach($=>{var f,y;const u=$.getAttribute("data-qid"),b=$.getAttribute("data-type");if(b==="mcq"){const _=$.querySelector("input[type=radio]:checked");l[u]={selected_option_index:_?parseInt(_.value,10):null}}else if(b==="true_false"){const _=$.querySelector("input.sh-tf:checked");l[u]={selected_bool:_?_.value==="1":null}}else if(b==="short_answer")l[u]={text:((f=$.querySelector(".sh-short"))==null?void 0:f.value)||""};else if(b==="long_answer")l[u]={text:((y=$.querySelector(".sh-long"))==null?void 0:y.value)||""};else{const _=[...$.querySelectorAll(".sh-blank")].map(j=>j.value);l[u]={blanks:_}}});const S=document.getElementById("sh-submit");S&&(S.disabled=!0,S.textContent=t("提交中…","Submitting…",r));try{const $=await z("/summer-homework/"+encodeURIComponent(e)+"/submit",{method:"POST",body:{responses:l}});Z($,e,r)}catch($){alert($.message||t("提交失敗","Submit failed",r)),S&&(S.disabled=!1,S.textContent=n?t("重新提交","Resubmit",r):t("提交答案","Submit",r))}})}function X(e,a){if(!Array.isArray(e)||e.length===0)return"";const o=e.map((s,r)=>{const d=s.type||"";let i="";s.needs_marking?i=`<span class="text-slate-600">${t("待教師評閱","Awaiting teacher mark",a)}</span>`:s.correct===!0?i=`<span class="text-emerald-700 font-medium">${t("正確","Correct",a)}</span>`:s.correct===!1&&(i=`<span class="text-amber-800 font-medium">${t("不正確","Incorrect",a)}</span>`);let n="";if(d==="mcq"&&s.correct_option_index!=null)n=`<span class="text-slate-500"> · ${t("正解","Answer",a)} ${String.fromCharCode(65+Number(s.correct_option_index))}</span>`;else if(d==="true_false"&&s.correct_bool!=null)n=`<span class="text-slate-500"> · ${t("正解","Answer",a)} ${s.correct_bool?t("是","True",a):t("否","False",a)}</span>`;else if(d==="short_answer"&&Array.isArray(s.acceptable_answers)&&s.acceptable_answers.length)n=`<span class="text-slate-500"> · ${t("可接受","Acceptable",a)}: ${c(s.acceptable_answers.join(" / "))}</span>`;else if(d==="fill_blank"&&Array.isArray(s.blanks)){const k=s.blanks.filter(v=>!v.correct).map(v=>v.blank_index).join(", ");k&&(n=`<span class="text-slate-500"> · ${t("錯空格","Wrong blanks",a)}: ${c(k)}</span>`)}else d==="long_answer"&&(n=`<span class="text-slate-500"> · ${t("已交文字","Submitted text",a)} ${s.given?t("有","yes",a):t("無","no",a)}</span>`);const m=s.exclude_from_auto?"":` <span class="text-slate-400">(${s.score!=null?s.score:0}/${s.max!=null?s.max:1})</span>`;return`<li class="text-sm py-1">${t("題","Q",a)} ${r+1}: ${i}${m}${n}</li>`}).join("");return`<div class="mt-4 pt-4 border-t border-slate-200/80">
            <p class="text-sm font-semibold text-slate-800 mb-2">${t("逐題結果","Per-question results",a)}</p>
            <ul class="list-none space-y-0.5">${o}</ul>
        </div>`}function Z(e,a,o){var g,A;const s=document.getElementById("sh-result"),r=document.getElementById("sh-quiz");if(!s)return;o=o||T();const d=!!e.passed,i=e.ever_passed!=null?!!e.ever_passed:d,n=e.best_percent!=null?e.best_percent:e.percent,m=!!e.score_improved,k=e.previous_best_percent!=null?m?`<p class="mt-2 text-sm text-emerald-800">${t("已更新最高分：","Best score updated:",o)} ${n}%</p>`:`<p class="mt-2 text-sm text-slate-700">${t("本次未超過最高分，仍保留","This attempt did not beat your best. Keeping",o)} ${n}%。</p>`:"";s.className="mt-6 p-6 rounded-xl border "+(d?"bg-emerald-50 border-emerald-200":i?"bg-slate-50 border-slate-200":"bg-amber-50 border-amber-200");const v=d?"text-emerald-900":i?"text-slate-900":"text-amber-950",L=d?"text-emerald-800":i?"text-slate-700":"text-amber-900";s.innerHTML=`
            <p class="text-2xl font-extrabold ${v}">
                ${d?t("及格！","Passed!",o):i?t("已提交","Submitted",o):t("未及格","Not passed",o)}
            </p>
            <p class="mt-2 text-sm ${L}">
                ${t("本次得分","This attempt",o)}: ${e.score} / ${e.max_score}
                （${e.percent}%；${t("及格線","pass mark",o)} ${e.pass_percent}%）
            </p>
            ${e.submitted_at?`<p class="mt-1 text-sm ${L}">${t("本次呈交時間","Submitted at",o)}: ${c(M(e.submitted_at))}</p>`:""}
            <p class="mt-1 text-sm font-medium ${L}">${t("最高分數","Best score",o)}: ${n}%
                ${e.best_submitted_at?` · ${t("最高分呈交時間","Best attempt at",o)}: ${c(M(e.best_submitted_at))}`:""}
            </p>
            ${e.is_late&&i?`<p class="mt-2 text-sm text-orange-800 font-medium">${t("首次及格時間在截止日期之後，狀態為「欠交」。","First pass was after the due date — status is “Overdue completion”.",o)}</p>`:""}
            ${i&&e.first_passed_at?`<p class="mt-1 text-sm ${L}">${t("首次及格時間","First passed at",o)}: ${c(M(e.first_passed_at))}</p>`:""}
            ${k}
            ${X(e.details,o)}
            ${d?`<p class="mt-3 text-sm text-emerald-800">${t("做得好！可返回列表，或重做爭取更高分。","Well done! Continue with other assessments, or redo for a higher score.",o)}</p>`:i?`<p class="mt-3 text-sm text-slate-700">${t("你先前已及格；本次分數較低時不會降低最高分。","You already passed earlier; a lower attempt will not reduce your best score.",o)}</p>`:`<p class="mt-3 text-sm text-amber-950 font-medium" role="alert">${t("未達及格線，狀態為「未交」。請重讀／重看內容後再次完成並提交。","Below the pass mark — status is “Not completed”. Review the content and complete the assessment again.",o)}</p>`}
            <button type="button" id="sh-redo" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">${t("重新作答","Try again",o)}</button>
            <button type="button" id="sh-back-list" class="mt-4 ml-2 text-indigo-600 underline text-sm">${t("返回列表","Back to list",o)}</button>
        `,s.classList.remove("hidden"),r&&r.querySelectorAll("input, button").forEach(h=>{h.disabled=!0}),(g=document.getElementById("sh-back-list"))==null||g.addEventListener("click",()=>E("/summer-homework")),(A=document.getElementById("sh-redo"))==null||A.addEventListener("click",()=>E("/summer-homework/"+encodeURIComponent(a),!0))}w.AppSummerHomework={renderList:O,renderItem:J,renderHome:Q,renderTeacherHome:D};
