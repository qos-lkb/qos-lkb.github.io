const u=window,{apiFetch:k}=u.ScienceApi,{t:e,escapeHtml:a,getLang:A,navigate:m}=u.AppRouter;function T(o){return o<60?"bg-red-500":o>80?"bg-emerald-500":"bg-amber-500"}function H(o){return o==="weak"?e("薄弱","Needs work"):o==="mastered"?e("已掌握","Mastered"):e("進行中","In progress")}async function E(){var $,f,w,_;const o=document.getElementById("main-content");document.getElementById("sidebar").style.display="none",document.body.classList.remove("sidebar-tab-active"),o.innerHTML=`<div class="max-w-5xl mx-auto"><p class="text-slate-500">${e("載入中…","Loading…")}</p></div>`;let l;try{l=await k("/learning/dashboard")}catch{const s=u.ScienceApi&&ScienceApi.SITE_BASE||"",n=a(s+"/login.php?next="+encodeURIComponent("app/dashboard"));o.innerHTML=`<div class="max-w-lg mx-auto text-center py-12">
                <p class="text-slate-600 mb-4">${e("請先登入以查看學習儀表板。","Please log in to view your learning dashboard.")}</p>
                <a href="${n}" class="text-indigo-600 underline">${e("登入","Log in")}</a>
            </div>`;return}const p=l.summary||{},i=l.goal,x=l.continue_learning||[],b=l.mastery||[],g=l.recommendations||{},h=l.worksheet_assignments||[],d=A();let v="";i&&(v=`<p class="text-sm text-indigo-100">${i.goal_type==="weekly_items"?e("本週完成項目","Weekly items"):e("本週學習分鐘","Weekly minutes")}：${i.target_value}</p>`);const L=x.length?x.map(t=>{const s=d==="zh"?t.title_zh:t.title_en;return`<button type="button" class="dash-continue block w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${a(t.route)}">
                    <span class="text-xs text-slate-400 uppercase">${a(t.content_type)}</span>
                    <span class="block font-medium text-slate-800">${a(s)}</span>
                </button>`}).join(""):`<p class="text-sm text-slate-500">${e("暫無未完成項目","No items in progress")}</p>`,z=b.length?b.slice(0,12).map(t=>{const s=d==="zh"?t.name_zh:t.name_en,n=parseFloat(t.mastery_score)||0,r=t.status||(n<60?"weak":n>80?"mastered":"in_progress");return`<div class="mb-3">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-700 truncate pr-2">${a(s)}</span>
                        <span class="text-slate-500 flex-shrink-0">${Math.round(n)}% · ${H(r)}</span>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full ${T(n)} rounded-full" style="width:${Math.min(100,n)}%"></div>
                    </div>
                </div>`}).join(""):`<p class="text-sm text-slate-500">${e("完成測驗後將顯示掌握度","Complete quizzes to see mastery")}</p>`;let c="";const y=g.weak_topics||[];if(y.length)c=y.map(t=>{const s=d==="zh"?t.name_zh:t.name_en,n=(t.suggested_items||[]).slice(0,2).map(r=>{const B=d==="zh"?r.title_zh:r.title_en;return`<button type="button" class="dash-suggest text-left text-indigo-600 text-sm hover:underline block" data-route="${a(r.route)}">${a(B)}</button>`}).join("");return`<div class="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-2">
                    <p class="font-medium text-amber-900 text-sm">${a(s)} (${Math.round(t.mastery)}%)</p>
                    ${n}
                </div>`}).join("");else if(g.next_course_item){const t=g.next_course_item,s=d==="zh"?t.title_zh:t.title_en;c=`<button type="button" class="dash-suggest block w-full text-left p-4 rounded-xl bg-indigo-50 border border-indigo-100" data-route="${a(t.route)}">
                <p class="text-sm text-indigo-600">${e("建議下一步","Suggested next")}</p>
                <p class="font-bold text-indigo-900">${a(s)}</p>
            </button>`}else c=`<p class="text-sm text-slate-500">${e("繼續探索課程內容","Keep exploring course content")}</p>`;const I=t=>t==="submitted"?e("已提交","Submitted"):e("待完成","To do"),S=h.length?h.map(t=>{const s=d==="zh"?t.title_zh:t.title_en,n=t.due_at?` · ${e("截止","Due")} ${String(t.due_at).slice(0,10)}`:"";return`<button type="button" class="dash-assign block w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition" data-route="${a(t.route)}">
                    <span class="text-xs text-slate-400">${a(t.class_name||"")}${n}</span>
                    <span class="block font-medium text-slate-800">${a(s)}</span>
                    <span class="text-xs text-amber-700">${I(t.submission_status)}</span>
                </button>`}).join(""):`<p class="text-sm text-slate-500">${e("沒有待完成習作","No pending assignments")}</p>`;if(o.innerHTML=`
            <div class="max-w-5xl mx-auto space-y-8">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${e("我的學習","My Learning")}</h1>
                        <p class="text-sm text-slate-500 mt-1">${e("自主規劃學習路徑，追蹤進度與掌握度。","Plan your path and track progress.")}</p>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <button type="button" id="dash-goto-summer" class="text-indigo-600 hover:underline">${e("暑期功課","Summer homework")} →</button>
                        <button type="button" id="dash-goto-courses" class="text-indigo-600 hover:underline">${e("瀏覽自學課程","Browse courses")} →</button>
                    </div>
                </div>

                <div class="grid sm:grid-cols-3 gap-4">
                    <div class="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 shadow-lg">
                        <p class="text-xs uppercase tracking-wide text-indigo-200">${e("今日學習","Today")}</p>
                        <p class="text-3xl font-bold mt-1">${p.minutes_today||0} <span class="text-lg font-normal">${e("分鐘","min")}</span></p>
                        ${v}
                    </div>
                    <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-slate-400">${e("本週學習","This week")}</p>
                        <p class="text-3xl font-bold text-slate-900 mt-1">${p.minutes_week||0} <span class="text-lg font-normal text-slate-500">${e("分鐘","min")}</span></p>
                    </div>
                    <div class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-slate-400">${e("今日完成","Completed today")}</p>
                        <p class="text-3xl font-bold text-emerald-600 mt-1">${p.completions_today||0}</p>
                    </div>
                </div>

                <div class="grid lg:grid-cols-2 gap-6">
                    <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div class="flex items-center justify-between gap-2 mb-4">
                            <h2 class="text-lg font-bold text-slate-900">${e("課程習作","Assignments")}</h2>
                            <button type="button" id="dash-goto-assignments" class="text-sm text-indigo-600 hover:underline">${e("全部","All")} →</button>
                        </div>
                        <div class="space-y-2">${S}</div>
                    </section>
                    <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h2 class="text-lg font-bold text-slate-900 mb-4">${e("繼續學習","Continue learning")}</h2>
                        <div class="space-y-2">${L}</div>
                    </section>
                </div>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${e("建議學習","Recommendations")}</h2>
                    ${c}
                </section>

                <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-4">${e("課題掌握度","Topic mastery")}</h2>
                    ${z}
                </section>

                <section class="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                    <h2 class="text-lg font-bold text-slate-900 mb-2">${e("每週學習目標","Weekly goal")}</h2>
                    <form id="goal-form" class="flex flex-wrap gap-3 items-end">
                        <div>
                            <label class="block text-xs text-slate-500 mb-1">${e("目標類型","Type")}</label>
                            <select id="goal-type" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="weekly_minutes">${e("學習分鐘","Minutes")}</option>
                                <option value="weekly_items">${e("完成項目","Items")}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-slate-500 mb-1">${e("目標值","Target")}</label>
                            <input type="number" id="goal-value" min="1" max="999" value="${i?i.target_value:60}" class="border rounded-lg px-3 py-2 text-sm w-24">
                        </div>
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">${e("儲存","Save")}</button>
                    </form>
                    <p class="text-xs text-slate-400 mt-3">${e("本平台記錄學習活動以提供個人化建議；詳見私隱說明。","Learning activity is recorded to personalize recommendations.")}</p>
                </section>
            </div>`,i){const t=document.getElementById("goal-type");t&&(t.value=i.goal_type)}($=document.getElementById("dash-goto-courses"))==null||$.addEventListener("click",()=>m("/courses")),(f=document.getElementById("dash-goto-summer"))==null||f.addEventListener("click",()=>m("/summer-homework")),(w=document.getElementById("dash-goto-assignments"))==null||w.addEventListener("click",()=>m("/assignments")),o.querySelectorAll("[data-route]").forEach(t=>{t.addEventListener("click",()=>m(t.getAttribute("data-route")))}),(_=document.getElementById("goal-form"))==null||_.addEventListener("submit",async t=>{t.preventDefault();try{await k("/learning/goals",{method:"POST",body:{goal_type:document.getElementById("goal-type").value,target_value:parseInt(document.getElementById("goal-value").value,10)||60}}),await E()}catch(s){alert(s.message||"Failed")}})}u.AppDashboard={renderDashboard:E};
