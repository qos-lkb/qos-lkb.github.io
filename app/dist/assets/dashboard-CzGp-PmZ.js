const $=window,{apiFetch:v}=$.ScienceApi,{t,escapeHtml:a,getLang:Q,navigate:y}=$.AppRouter;function V(i){return i<60?"bg-red-500":i>80?"bg-emerald-500":"bg-amber-500"}function J(i){return i==="weak"?t("薄弱","Needs work"):i==="mastered"?t("已掌握","Mastered"):t("進行中","In progress")}async function T(){var L,S,j,N,H;const i=document.getElementById("main-content");document.getElementById("sidebar").style.display="none",document.body.classList.remove("sidebar-tab-active"),i.innerHTML=`<div class="max-w-5xl mx-auto"><p class="text-slate-500">${t("載入中…","Loading…")}</p></div>`;let r;try{r=await v("/learning/dashboard")}catch{const s=$.ScienceApi&&ScienceApi.SITE_BASE||"",o=a(s+"/login.php?next="+encodeURIComponent("app/dashboard"));i.innerHTML=`<div class="max-w-lg mx-auto text-center py-12">
                <p class="text-slate-600 mb-4">${t("請先登入以查看學習儀表板。","Please log in to view your learning dashboard.")}</p>
                <a href="${o}" class="text-indigo-600 underline">${t("登入","Log in")}</a>
            </div>`;return}const f=r.summary||{},c=r.goal,_=r.continue_learning||[],k=r.mastery||[],m=r.recommendations||{},b=r.streak||null,z=r.badges||[],x=r.bookmarks||[],B=r.worksheet_assignments||[],n=Q();let l=null;try{const s=(await v("/student/classes")).classes||[],o=s[0]?Number(s[0].id):0;o&&(l=await v(`/learning/class-leaderboard?class_id=${encodeURIComponent(o)}&limit=5`))}catch{l=null}let E="";c&&(E=`<p class="text-sm text-indigo-100">${c.goal_type==="weekly_items"?t("本週完成項目","Weekly items"):t("本週學習分鐘","Weekly minutes")}：${c.target_value}</p>`);const A=_.length?_.map(e=>{const s=n==="zh"?e.title_zh:e.title_en;return`<button type="button" class="dash-continue block w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${a(e.route)}">
                    <span class="text-xs text-slate-400 uppercase">${a(e.content_type)}</span>
                    <span class="block font-medium text-slate-800">${a(s)}</span>
                </button>`}).join(""):`<p class="text-sm text-slate-500">${t("暫無未完成項目","No items in progress")}</p>`,M=k.length?k.slice(0,12).map(e=>{const s=n==="zh"?e.name_zh:e.name_en,o=parseFloat(e.mastery_score)||0,g=e.status||(o<60?"weak":o>80?"mastered":"in_progress");return`<div class="mb-3">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-700 truncate pr-2">${a(s)}</span>
                        <span class="text-slate-500 flex-shrink-0">${Math.round(o)}% · ${J(g)}</span>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full ${V(o)} rounded-full" style="width:${Math.min(100,o)}%"></div>
                    </div>
                </div>`}).join(""):`<p class="text-sm text-slate-500">${t("完成測驗後將顯示掌握度","Complete quizzes to see mastery")}</p>`;let h="";const I=m.weak_topics||[];if(I.length)h=I.map(e=>{const s=n==="zh"?e.name_zh:e.name_en,o=(e.suggested_items||[]).slice(0,2).map(g=>{const w=n==="zh"?g.title_zh:g.title_en;return`<button type="button" class="dash-suggest text-left text-indigo-600 text-sm hover:underline block" data-route="${a(g.route)}">${a(w)}</button>`}).join("");return`<div class="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-2">
                    <p class="font-medium text-amber-900 text-sm">${a(s)} (${Math.round(e.mastery)}%)</p>
                    ${o}
                </div>`}).join("");else if(m.next_course_item){const e=m.next_course_item,s=n==="zh"?e.title_zh:e.title_en;h=`<button type="button" class="dash-suggest block w-full text-left p-4 rounded-xl bg-indigo-50 border border-indigo-100" data-route="${a(e.route)}">
                <p class="text-sm text-indigo-600">${t("建議下一步","Suggested next")}</p>
                <p class="font-bold text-indigo-900">${a(s)}</p>
            </button>`}else h=`<p class="text-sm text-slate-500">${t("繼續探索課程內容","Keep exploring course content")}</p>`;function C(e){const s=n==="zh"?e.label_zh||"":e.label_en||"";return s?`<span class="inline-flex items-center px-2 py-1 rounded-full border border-slate-200 bg-white text-xs text-slate-700">${a(s)}</span>`:""}const R=b?`<div>
                <p class="text-xs text-slate-400 uppercase tracking-wide">${t("連續學習","Streak")}</p>
                <p class="text-3xl font-bold text-indigo-600 mt-1">${Number(b.current_streak_days||0)} <span class="text-lg font-normal">${t("天","days")}</span></p>
                <p class="text-sm text-slate-500 mt-1">${t("最佳連續","Best")}：${Number(b.best_streak_days||0)} ${t("天","days")}</p>
            </div>`:`<p class="text-sm text-slate-500">${t("完成小測後顯示連續學習。","Streak will appear after you complete quizzes.")}</p>`,W=z.length?`<div class="flex flex-wrap gap-2 mt-3">${z.slice(0,8).map(C).filter(Boolean).join("")}</div>`:`<p class="text-sm text-slate-500 mt-3">${t("完成內容後將解鎖徽章。","Badges unlock as you complete content.")}</p>`,q={note:{zh:"筆記",en:"Note"},worksheet:{zh:"工作紙",en:"Worksheet"},article:{zh:"文章",en:"Article"},learning_tool:{zh:"互動測驗",en:"Quiz"},question_bank:{zh:"試題庫",en:"Question bank"},video:{zh:"影片",en:"Video"},simulation:{zh:"模擬",en:"Simulation"}};function O(e){const s=q[e]||{zh:e,en:e};return n==="zh"?s.zh:s.en}const P=x.length?`<div class="space-y-2">${x.slice(0,6).map(e=>{const s=n==="zh"?e.title_zh||e.title_en||"":e.title_en||e.title_zh||"",o=O(e.content_type||"");return`<button type="button" class="w-full text-left px-3 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${a(e.route||"")}">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-xs text-slate-500">${a(o)}</span>
                        <span class="text-sm font-medium text-slate-800 truncate flex-1">${a(s)}</span>
                    </div>
                </button>`}).join("")}</div>`:`<p class="text-sm text-slate-500">${t("收藏內容以便稍後回看。","Bookmark items to review later.")}</p>`,D=l?`<div>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-xs text-slate-400 uppercase tracking-wide">${t("同班排行榜","Class leaderboard")}</p>
                        <p class="text-sm font-bold text-slate-900 mt-1">
                            ${l.my_rank?t("你目前排名","Your current rank")+"：#"+Number(l.my_rank):t("Top N 本週表現","Top N this week")}
                        </p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 uppercase tracking-wide">${t("本週挑戰","Weekly challenge")}</p>
                        <p class="text-sm font-bold text-indigo-700 mt-1">
                            ${l.weekly_champion?a(l.weekly_champion.display_name||""):"—"}
                        </p>
                        <p class="text-xs text-slate-500">${l.weekly_champion?Number(l.weekly_champion.minutes_week||0):0} ${t("分鐘","min")}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    ${l.leaders&&l.leaders.length?l.leaders.map((e,s)=>{const o=e.display_name||"",g=Number(e.avg_mastery||0),w=Number(e.minutes_week||0);return`
                                <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                                    <span class="text-sm font-medium text-slate-800">${s+1}. ${a(o)}</span>
                                    <span class="text-xs text-slate-600">${g}% · ${w} ${t("分鐘","min")}</span>
                                </div>`}).join(""):`<p class="text-sm text-slate-500">${t("尚無排行榜資料。","No leaderboard data yet.")}</p>`}
                </div>
            </div>`:`<p class="text-sm text-slate-500">${t("加入班別後顯示排行榜。","Join a class to see leaderboard.")}</p>`,K=e=>e==="submitted"?t("已提交","Submitted"):t("待完成","To do"),U=B.length?B.map(e=>{const s=n==="zh"?e.title_zh:e.title_en,o=e.due_at?` · ${t("截止","Due")} ${String(e.due_at).slice(0,10)}`:"";return`<button type="button" class="dash-assign block w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${a(e.route)}">
                    <span class="text-xs text-slate-400">${a(e.class_name||"")}${o}</span>
                    <span class="block font-medium text-slate-800">${a(s)}</span>
                    <span class="text-xs text-amber-700">${K(e.submission_status)}</span>
                </button>`}).join(""):`<p class="text-sm text-slate-500">${t("沒有待完成習作","No pending assignments")}</p>`;let p="",u=[];const d=(m.weak_topics||[])[0];if(d){const e=n==="zh"?d.name_zh||"":d.name_en||"",s=(d.suggested_items||[])[0];if(p=t(`你在「${e}」較弱（約 ${Math.round(Number(d.mastery||0))}%）。建議先補相關內容。`,`“${e}” looks weak (~${Math.round(Number(d.mastery||0))}%). Review related material first.`),s&&s.route){const o=n==="zh"?s.title_zh||"":s.title_en||"";u.push({label:t("先完成：","Start: ")+o,route:s.route})}else d.subject_slug&&d.topic_slug&&u.push({label:t("前往課題","Open topic"),route:"/course/"+encodeURIComponent(d.subject_slug)+"/"+encodeURIComponent(d.topic_slug)})}else if(m.next_course_item&&m.next_course_item.route){const e=m.next_course_item,s=n==="zh"?e.title_zh||"":e.title_en||"";p=t(`建議下一步：完成「${s}」。`,`Suggested next: complete “${s}”.`),u.push({label:t("繼續學習","Continue"),route:e.route})}else if(!b||Number(b.current_streak_days||0)===0)p=t("今天還沒有學習紀錄——打開自學課程開始吧。","No learning yet today — open a self-study course to begin."),u.push({label:t("瀏覽自學課程","Browse courses"),route:"/courses"});else if(!c)p=t("設定每週學習目標，教練會依此提醒你。","Set a weekly goal so the coach can keep you on track."),u.push({label:t("設定目標","Set goal"),action:"focus-goal"});else if(x.length){const e=x[0],s=n==="zh"?e.title_zh||e.title_en||"":e.title_en||e.title_zh||"";p=t(`你收藏了「${s}」——現在回看一次吧。`,`You bookmarked “${s}” — revisit it now.`),e.route&&u.push({label:t("打開收藏","Open bookmark"),route:e.route})}else p=t("保持節奏！繼續完成課程內容或適性小測。","Keep going — continue course items or try an adaptive quiz."),u.push({label:t("瀏覽自學課程","Browse courses"),route:"/courses"});const F=u.map((e,s)=>e.action==="focus-goal"?`<button type="button" id="dash-coach-goal" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">${a(e.label)}</button>`:`<button type="button" class="px-3 py-1.5 text-sm ${s===0?"bg-indigo-600 text-white hover:bg-indigo-700":"border border-indigo-200 text-indigo-700 hover:bg-indigo-50"} rounded-lg" data-route="${a(e.route||"")}">${a(e.label)}</button>`).join(""),Y=`
            <section class="bg-indigo-50 rounded-2xl border border-indigo-100 p-6 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h2 class="text-lg font-bold text-indigo-900">${t("學習教練","Learning coach")}</h2>
                    <span class="text-xs text-indigo-700">${t("規則式建議","Rule-based tips")}</span>
                </div>
                <p class="text-sm text-indigo-950 mb-4">${a(p)}</p>
                <div class="flex flex-wrap gap-2">${F}</div>
            </section>`;if(i.innerHTML=`
            <div class="max-w-5xl mx-auto space-y-8">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${t("我的學習","My Learning")}</h1>
                        <p class="text-sm text-slate-500 mt-1">${t("自主規劃學習路徑，追蹤進度與掌握度。","Plan your path and track progress.")}</p>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <button type="button" id="dash-goto-summer" class="text-indigo-600 hover:underline">${t("暑期功課","Summer homework")} →</button>
                        <button type="button" id="dash-goto-courses" class="text-indigo-600 hover:underline">${t("瀏覽自學課程","Browse courses")} →</button>
                    </div>
                </div>

                ${Y}

                <div class="grid sm:grid-cols-3 gap-4">
                    <div class="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 shadow-lg">
                        <p class="text-xs uppercase tracking-wide text-indigo-200">${t("今日學習","Today")}</p>
                        <p class="text-3xl font-bold mt-1">${f.minutes_today||0} <span class="text-lg font-normal">${t("分鐘","min")}</span></p>
                        ${E}
                    </div>
                    <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-slate-400">${t("本週學習","This week")}</p>
                        <p class="text-3xl font-bold text-slate-900 mt-1">${f.minutes_week||0} <span class="text-lg font-normal text-slate-500">${t("分鐘","min")}</span></p>
                    </div>
                    <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-slate-400">${t("今日完成","Completed today")}</p>
                        <p class="text-3xl font-bold text-emerald-600 mt-1">${f.completions_today||0}</p>
                    </div>
                </div>

                <div class="grid lg:grid-cols-2 gap-6">
                    <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div class="flex items-center justify-between gap-2 mb-4">
                            <h2 class="text-lg font-bold text-slate-900">${t("課程習作","Assignments")}</h2>
                            <button type="button" id="dash-goto-assignments" class="text-sm text-indigo-600 hover:underline">${t("全部","All")} →</button>
                        </div>
                        <div class="space-y-2">${U}</div>
                    </section>
                    <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h2 class="text-lg font-bold text-slate-900 mb-4">${t("繼續學習","Continue learning")}</h2>
                        <div class="space-y-2">${A}</div>
                    </section>
                </div>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${t("建議學習","Recommendations")}</h2>
                    ${h}
                </section>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${t("課題掌握度","Topic mastery")}</h2>
                    ${M}
                </section>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-2">${t("連續學習 / 徽章 / 收藏","Streak / Badges / Bookmarks")}</h2>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            ${R}
                            <div class="mt-5">
                                <p class="text-sm font-bold text-slate-800">${t("徽章","Badges")}</p>
                                ${W}
                            </div>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-800 mb-2">${t("我的收藏","My bookmarks")}</p>
                            ${P}
                        </div>
                    </div>
                </section>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${t("同班排行榜 / 本週挑戰","Class leaderboard / Weekly challenge")}</h2>
                    ${D}
                </section>

                <section class="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                    <h2 class="text-lg font-bold text-slate-900 mb-2">${t("每週學習目標","Weekly goal")}</h2>
                    <form id="goal-form" class="flex flex-wrap gap-3 items-end">
                        <div>
                            <label class="block text-xs text-slate-500 mb-1">${t("目標類型","Type")}</label>
                            <select id="goal-type" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="weekly_minutes">${t("學習分鐘","Minutes")}</option>
                                <option value="weekly_items">${t("完成項目","Items")}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-slate-500 mb-1">${t("目標值","Target")}</label>
                            <input type="number" id="goal-value" min="1" max="999" value="${c?c.target_value:60}" class="border rounded-lg px-3 py-2 text-sm w-24">
                        </div>
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${t("儲存","Save")}</button>
                    </form>
                    <p class="text-xs text-slate-400 mt-3">${t("本平台記錄學習活動以提供個人化建議；詳見私隱說明。","Learning activity is recorded to personalize recommendations.")}</p>
                </section>
            </div>`,c){const e=document.getElementById("goal-type");e&&(e.value=c.goal_type)}(L=document.getElementById("dash-goto-courses"))==null||L.addEventListener("click",()=>y("/courses")),(S=document.getElementById("dash-goto-summer"))==null||S.addEventListener("click",()=>y("/summer-homework")),(j=document.getElementById("dash-goto-assignments"))==null||j.addEventListener("click",()=>y("/assignments")),(N=document.getElementById("dash-coach-goal"))==null||N.addEventListener("click",()=>{var s;const e=document.getElementById("goal-form");e&&(e.scrollIntoView({behavior:"smooth",block:"center"}),(s=document.getElementById("goal-value"))==null||s.focus())}),i.querySelectorAll("[data-route]").forEach(e=>{e.addEventListener("click",()=>y(e.getAttribute("data-route")))}),(H=document.getElementById("goal-form"))==null||H.addEventListener("submit",async e=>{e.preventDefault();try{await v("/learning/goals",{method:"POST",body:{goal_type:document.getElementById("goal-type").value,target_value:parseInt(document.getElementById("goal-value").value,10)||60}}),await T()}catch(s){alert(s.message||"Failed")}})}$.AppDashboard={renderDashboard:T};
