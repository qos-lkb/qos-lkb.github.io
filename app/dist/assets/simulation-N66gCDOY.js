const t=window,{apiFetch:C,API_BASE:A,SITE_BASE:_}=t.ScienceApi,{t:o,escapeHtml:n,getLang:$,navigate:m}=t.AppRouter;function b(s){if(!s||/^https?:\/\//i.test(s)||s.startsWith("//")||s.startsWith("/"))return s;const i=_||"";return(i?i.replace(/\/$/,""):"")+"/"+s.replace(/^\.\//,"")}async function k(s){const i=document.getElementById("main-content");t.AppCatalog&&t.AppCatalog.closeModal&&t.AppCatalog.closeModal();try{const e=await C("/simulations/"+encodeURIComponent(s));t.AppLearningTracker&&t.AppLearningTracker.trackContentOpen("simulation",s,{subject_id:e.subject_id,topic_id:e.topic_id});const r=$(),x=r==="zh"?e.title_zh:e.title_en,p=r==="zh"?e.summary_zh||e.summary_en||"":e.summary_en||e.summary_zh||"",u=b(e.screenshot_path||""),g=b(e.export_url||"simulation_export.php?slug="+encodeURIComponent(s)),d=(Array.isArray(e.tags)?e.tags:[]).map(a=>`<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${n(a)}</span>`).join(" "),c=[];if(t.AppCourse&&t.AppCourse.isCourseMode()){const a=t.AppCourse.getCourseContext();if(a){const l=t.AppCourse.findTopic(a.subjectSlug,a.topicSlug);if(l){const f=r==="zh"?l.subject.name_zh:l.subject.name_en,v=r==="zh"?l.topic.name_zh:l.topic.name_en;c.push(`${f} · ${v}`)}}}c.push(o("模擬實驗","Simulation")),e.last_updated&&c.push(o("更新 ","Updated ")+e.last_updated);const h=t.AppCourse&&t.AppCourse.isCourseMode()?t.AppCourse.getBackRoute():"/simulations";i.innerHTML=`
                <div class="reading-page" id="simulation-page">
                    <button type="button" id="simulation-back" class="text-brand-600 text-sm mb-4 hover:underline">← ${o("返回","Back")}</button>
                    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${n(x)}</h1>
                    <p class="text-sm text-slate-500 mb-3">${c.map(a=>n(a)).join(" · ")}</p>
                    ${p?`<p class="text-slate-700 mb-4 leading-relaxed">${n(p)}</p>`:""}
                    ${d?`<div class="flex flex-wrap gap-1.5 mb-5">${d}</div>`:""}
                    <button type="button" id="simulation-launch" class="course-sim-launch w-full max-w-xl text-left bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col hover:border-brand-300 hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40">
                        <div class="h-40 sm:h-48 bg-gradient-to-br from-slate-100 to-brand-50/50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                            ${u?`<img src="${n(u)}" alt="" class="w-full h-full object-cover">`:`<span class="text-slate-400 text-sm">${o("[實驗影像]","[Preview]")}</span>`}
                        </div>
                        <div class="p-5 flex items-center gap-4 min-h-[4.5rem]">
                            <div class="min-w-0 flex-1">
                                <p class="font-semibold text-slate-800">${o("開始模擬實驗","Start simulation")}</p>
                                <p class="text-sm text-slate-500 mt-0.5">${o("點擊開啟互動模擬","Open the interactive simulation")}</p>
                            </div>
                            <span class="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-accent-500 text-amber-950 text-sm font-semibold flex-shrink-0">${o("開始","Start")}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></span>
                        </div>
                    </button>
                    <p class="mt-4">
                        <a href="${n(g)}" class="text-sm text-brand-600 hover:underline" download>${n(o("下載源碼","Download source"))}</a>
                    </p>
                </div>`,document.getElementById("simulation-back").onclick=()=>m(h),document.getElementById("simulation-launch").onclick=()=>{t.AppCourse&&t.AppCourse.openSimulation?t.AppCourse.openSimulation(s):t.AppCatalog&&t.AppCatalog.openModal&&t.AppCatalog.openModal(A+"/simulations/"+encodeURIComponent(s)+"/html")},t.AppCourse&&t.AppCourse.isCourseMode()&&t.AppCourse.attachItemNav(document.getElementById("simulation-page"),"simulation",s)}catch(e){i.innerHTML=`
                <div class="reading-page">
                    <button type="button" id="simulation-back" class="text-brand-600 text-sm mb-4 hover:underline">← ${o("返回","Back")}</button>
                    <p class="text-red-600">${n(e.message||o("無法載入模擬實驗。","Could not load simulation."))}</p>
                </div>`,document.getElementById("simulation-back").onclick=()=>m("/courses")}}t.AppSimulation={renderSimulation:k};
