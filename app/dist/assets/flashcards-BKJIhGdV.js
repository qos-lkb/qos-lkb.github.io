const o=window,{apiFetch:$}=o.ScienceApi,{t:n,escapeHtml:t,getLang:N}=o.AppRouter;function k(r){return o.AppMarkdown&&typeof o.AppMarkdown.renderMarkdownToHtml=="function"?o.AppMarkdown.renderMarkdownToHtml(r||""):t(r||"").replace(/\n/g,"<br>")}async function L(r){o.AppMarkdown&&typeof o.AppMarkdown.enhanceMarkdown=="function"&&await o.AppMarkdown.enhanceMarkdown(r)}function h(r,m,a){return N()==="zh"?r[m]||r[a]||"":r[a]||r[m]||""}async function q(r){const m=document.getElementById("main-content");let a;try{a=await $("/flashcard-sets/"+encodeURIComponent(r)+"?mode=study")}catch(p){m.innerHTML=`<p class="text-red-600">${t(p.message||n("找不到閃卡組。","Flashcard set not found."))}</p>`;return}o.AppLearningTracker&&o.AppLearningTracker.trackContentOpen("flashcard_set",r,{subject_id:a.subject_id,topic_id:a.topic_id});const A=h(a,"title_zh","title_en"),z=h(a,"description_zh","description_en"),_=Array.isArray(a.cards)?a.cards.slice():[],M=o.ScienceApi.getUser&&o.ScienceApi.getUser();let E=[];if(M)try{E=(await $("/flashcard-sets/"+encodeURIComponent(r)+"/reviews")).reviews||[]}catch{E=[]}const w={};E.forEach(p=>{w[Number(p.card_id)]=p}),m.innerHTML=`
            <div class="max-w-3xl mx-auto w-full">
                <div id="fc-item-nav"></div>
                <div class="mb-6 pb-4 border-b border-slate-200">
                    <p class="text-xs uppercase tracking-wide text-brand-600 font-semibold">${t(n("閃卡","Flashcards"))}</p>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${t(A)}</h1>
                    ${z?`<p class="text-slate-600 mt-2">${t(z)}</p>`:""}
                    <p class="text-sm text-slate-500 mt-2">${_.length} ${t(n("張卡片","cards"))}</p>
                </div>
                <div id="fc-root"></div>
            </div>`,o.AppCourse&&o.AppCourse.attachItemNav&&o.AppCourse.attachItemNav(document.getElementById("fc-item-nav"),"flashcard_set",r);const l=document.getElementById("fc-root");if(!_.length){l.innerHTML=`<p class="text-slate-500">${t(n("此閃卡組尚無卡片。","This set has no cards yet."))}</p>`;return}I();function I(){const p=_.filter(c=>{const i=w[Number(c.id)];return!i||i.is_due}).length;l.innerHTML=`
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button type="button" id="fc-mode-study" class="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand-300 hover:shadow-md transition">
                        <p class="text-lg font-bold text-slate-900">${t(n("翻卡複習","Flip & review"))}</p>
                        <p class="text-sm text-slate-600 mt-1">${t(n("看正面、翻背面，再評「再來／記得／容易」。","See the front, flip, then rate Again / Good / Easy."))}</p>
                        ${M?`<p class="text-xs text-brand-600 mt-3">${p} ${t(n("張到期","due"))}</p>`:""}
                    </button>
                    <button type="button" id="fc-mode-quiz" class="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand-300 hover:shadow-md transition">
                        <p class="text-lg font-bold text-slate-900">${t(n("測驗模式","Quiz mode"))}</p>
                        <p class="text-sm text-slate-600 mt-1">${t(n("四選一或短答，完成後顯示分數。","Multiple choice or short answer, then see your score."))}</p>
                    </button>
                </div>`,document.getElementById("fc-mode-study").onclick=()=>B(),document.getElementById("fc-mode-quiz").onclick=()=>S()}function B(){const p=M&&_.some(e=>{const d=w[Number(e.id)];return!d||d.is_due});let c=_.slice();if(p){const e=_.filter(d=>{const f=w[Number(d.id)];return!f||f.is_due});e.length&&(c=e)}j(c);let i=0,u=!1,v=0;function T(){const e=c[i];if(!e){o.AppLearningTracker&&o.AppLearningTracker.trackContentComplete("flashcard_set",r,{subject_id:a.subject_id,topic_id:a.topic_id}),l.innerHTML=`
                        <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                            <p class="text-xl font-bold text-slate-900">${t(n("本輪複習完成","Review round complete"))}</p>
                            <p class="text-slate-600 mt-2">${v} ${t(n("張已評等","rated"))}</p>
                            <button type="button" id="fc-back-modes" class="mt-6 px-4 py-2 rounded-lg bg-brand-600 text-white">${t(n("返回","Back"))}</button>
                        </div>`,document.getElementById("fc-back-modes").onclick=()=>{y=!1,document.removeEventListener("keydown",b),I()};return}u=!1;const d=h(e,"front_zh","front_en"),f=h(e,"back_zh","back_en"),g=h(e,"hint_zh","hint_en");l.innerHTML=`
                    <p class="text-sm text-slate-500 mb-3">${i+1} / ${c.length}</p>
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[220px] p-6">
                        <p class="text-xs uppercase text-slate-400 mb-2">${t(n("正面","Front"))}</p>
                        <div id="fc-front" class="prose max-w-none text-lg text-slate-900">${k(d)}</div>
                        ${g?`<p class="text-xs text-slate-500 mt-3">${t(n("提示：","Hint: "))} ${t(g)}</p>`:""}
                        <div id="fc-back-wrap" class="hidden mt-6 pt-4 border-t border-slate-100">
                            <p class="text-xs uppercase text-slate-400 mb-2">${t(n("背面","Back"))}</p>
                            <div id="fc-back" class="prose max-w-none text-lg text-slate-900">${k(f)}</div>
                        </div>
                    </div>
                    <div id="fc-actions" class="mt-4 flex flex-wrap gap-2 justify-center">
                        <button type="button" id="fc-reveal" class="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium">${t(n("顯示背面（空白鍵）","Show back (Space)"))}</button>
                    </div>`,L(l),document.getElementById("fc-reveal").onclick=s}function s(){u||(u=!0,document.getElementById("fc-back-wrap").classList.remove("hidden"),document.getElementById("fc-actions").innerHTML=`
                    <button type="button" data-rate="again" class="px-4 py-2 rounded-lg bg-rose-100 text-rose-800 font-medium">1 · ${t(n("再來","Again"))}</button>
                    <button type="button" data-rate="good" class="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 font-medium">2 · ${t(n("記得","Good"))}</button>
                    <button type="button" data-rate="easy" class="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 font-medium">3 · ${t(n("容易","Easy"))}</button>`,document.getElementById("fc-actions").querySelectorAll("[data-rate]").forEach(e=>{e.onclick=()=>x(e.getAttribute("data-rate"))}))}async function x(e){const d=c[i];if(v++,M)try{const f=await $("/flashcard-sets/"+encodeURIComponent(r)+"/reviews",{method:"POST",body:{card_id:d.id,rating:e}});w[Number(d.id)]=f}catch{}i++,T()}let y=!0;function b(e){if(!y||!l.isConnected){document.removeEventListener("keydown",b);return}e.key===" "||e.key==="Spacebar"?(e.preventDefault(),u||s()):u&&(e.key==="1"||e.key==="2"||e.key==="3")&&(e.preventDefault(),x(e.key==="1"?"again":e.key==="2"?"good":"easy"))}document.addEventListener("keydown",b),T()}async function S(){let p;try{p=await $("/flashcard-sets/"+encodeURIComponent(r)+"?mode=quiz")}catch(s){l.innerHTML=`<p class="text-red-600">${t(s.message)}</p>`;return}const c=Array.isArray(p.cards)?p.cards:[];if(!c.length){l.innerHTML=`<p class="text-slate-500">${t(n("沒有可測驗的卡片。","No cards to quiz."))}</p>`;return}let i=0;const u={};function v(){const s=c[i];if(!s){T();return}const x=h(s,"front_zh","front_en");let y="";if(s.question_type==="mcq")y=(s.options||[]).map((e,d)=>{const f=h(e,"text_zh","text_en");return`<button type="button" class="quiz-opt w-full text-left border-2 ${u[s.card_id]&&u[s.card_id].selected_card_id===e.id?"border-brand-500 bg-brand-50":"border-slate-200"} rounded-xl p-4 mb-2" data-opt-id="${Number(e.id)}">
                            <span class="font-bold text-brand-600 mr-2">${String.fromCharCode(65+d)}</span>
                            <span class="fc-opt-md">${k(f)}</span>
                        </button>`}).join("");else{const e=u[s.card_id]&&u[s.card_id].response_text||"";y=`<input id="fc-short" class="w-full border rounded-xl px-3 py-3" value="${t(e)}" placeholder="${t(n("輸入答案","Type the answer"))}">`}l.innerHTML=`
                    <p class="text-sm text-slate-500 mb-3">${i+1} / ${c.length}</p>
                    <div class="bg-white rounded-2xl border border-slate-200 p-6">
                        <div class="prose max-w-none text-lg mb-4">${k(x)}</div>
                        <div id="fc-quiz-body">${y}</div>
                    </div>
                    <div class="mt-4 flex justify-between">
                        <button type="button" id="fc-prev" class="px-3 py-2 border rounded-lg" ${i===0?"disabled":""}>${t(n("上一題","Previous"))}</button>
                        <button type="button" id="fc-next" class="px-4 py-2 bg-brand-600 text-white rounded-lg">${t(i===c.length-1?n("交卷","Submit"):n("下一題","Next"))}</button>
                    </div>`,L(l),l.querySelectorAll(".quiz-opt").forEach(e=>{e.onclick=()=>{u[s.card_id]={card_id:s.card_id,selected_card_id:Number(e.getAttribute("data-opt-id"))},v()}});const b=document.getElementById("fc-short");b&&(b.oninput=()=>{u[s.card_id]={card_id:s.card_id,response_text:b.value}}),document.getElementById("fc-prev").onclick=()=>{i>0&&(i--,v())},document.getElementById("fc-next").onclick=()=>{s.question_type==="short_answer"&&b&&(u[s.card_id]={card_id:s.card_id,response_text:b.value}),i++,v()}}async function T(){const s=c.map(d=>u[d.card_id]||{card_id:d.card_id,response_text:""});let x;try{x=await $("/flashcard-sets/"+encodeURIComponent(r)+"/attempts",{method:"POST",body:{responses:s}})}catch(d){l.innerHTML=`<p class="text-red-600">${t(d.message)}</p>`;return}o.AppLearningTracker&&o.AppLearningTracker.trackContentComplete("flashcard_set",r,{subject_id:a.subject_id,topic_id:a.topic_id});const y=Number(x.score||0),b=Number(x.max_score||c.length),e={};(x.results||[]).forEach(d=>{e[Number(d.card_id)]=d}),l.innerHTML=`
                    <div class="bg-white rounded-2xl border border-slate-200 p-6">
                        <p class="text-xl font-bold text-slate-900">${t(n("得分","Score"))}：${y} / ${b}</p>
                        <ul class="mt-4 space-y-3">${c.map((d,f)=>{const g=e[Number(d.card_id)],C=g&&g.is_correct,H=g?h(g,"back_zh","back_en"):"";return`<li class="border rounded-lg p-3 ${C?"border-emerald-200 bg-emerald-50":"border-rose-200 bg-rose-50"}">
                                <p class="text-xs text-slate-500">${f+1}. ${t(C?n("正確","Correct"):n("不正確","Incorrect"))}</p>
                                <div class="text-sm mt-1">${k(h(d,"front_zh","front_en"))}</div>
                                <p class="text-sm mt-1">${t(n("答案：","Answer: "))} ${t(H)}</p>
                            </li>`}).join("")}</ul>
                        <button type="button" id="fc-back-modes" class="mt-6 px-4 py-2 rounded-lg bg-brand-600 text-white">${t(n("返回","Back"))}</button>
                    </div>`,L(l),document.getElementById("fc-back-modes").onclick=I}v()}}function j(r){for(let m=r.length-1;m>0;m--){const a=Math.floor(Math.random()*(m+1)),A=r[m];r[m]=r[a],r[a]=A}return r}o.AppFlashcards={renderFlashcardsSet:q};
