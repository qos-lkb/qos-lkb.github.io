const t=window,{apiFetch:g,API_BASE:x,SITE_BASE:f}=t.ScienceApi,{t:n,escapeHtml:l,getLang:C,navigate:u}=t.AppRouter;function A(e){if(!e||/^https?:\/\//i.test(e)||e.startsWith("//")||e.startsWith("/"))return e;const i=f||"";return(i?i.replace(/\/$/,""):"")+"/"+e.replace(/^\.\//,"")}async function v(e){const i=document.getElementById("main-content");t.AppCatalog&&t.AppCatalog.closeModal&&t.AppCatalog.closeModal();try{const o=await g("/simulations/"+encodeURIComponent(e));t.AppLearningTracker&&t.AppLearningTracker.trackContentOpen("simulation",e,{subject_id:o.subject_id,topic_id:o.topic_id});const r=C(),d=r==="zh"?o.title_zh:o.title_en,p=A(o.screenshot_path||""),c=[];if(t.AppCourse&&t.AppCourse.isCourseMode()){const s=t.AppCourse.getCourseContext();if(s){const a=t.AppCourse.findTopic(s.subjectSlug,s.topicSlug);if(a){const b=r==="zh"?a.subject.name_zh:a.subject.name_en,h=r==="zh"?a.topic.name_zh:a.topic.name_en;c.push(`${b} · ${h}`)}}}c.push(n("模擬實驗","Simulation"));const m=t.AppCourse&&t.AppCourse.isCourseMode()?t.AppCourse.getBackRoute():"/simulations";i.innerHTML=`
                <div class="reading-page" id="simulation-page">
                    <button type="button" id="simulation-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${n("返回","Back")}</button>
                    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${l(d)}</h1>
                    <p class="text-sm text-slate-500 mb-6">${c.map(s=>l(s)).join(" · ")}</p>
                    <button type="button" id="simulation-launch" class="course-sim-launch w-full max-w-xl text-left bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                        <div class="h-40 sm:h-48 bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                            ${p?`<img src="${l(p)}" alt="" class="w-full h-full object-cover">`:'<span class="text-5xl" aria-hidden="true">🔬</span>'}
                        </div>
                        <div class="p-5 flex items-center gap-4">
                            <span class="text-3xl flex-shrink-0" aria-hidden="true">🔬</span>
                            <div class="min-w-0 flex-1">
                                <p class="font-semibold text-slate-800">${n("開始模擬實驗","Start simulation")}</p>
                                <p class="text-sm text-slate-500 mt-0.5">${n("點擊以全螢幕開啟互動模擬","Click to open the interactive simulation")}</p>
                            </div>
                            <svg class="w-6 h-6 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                    </button>
                </div>`,document.getElementById("simulation-back").onclick=()=>u(m),document.getElementById("simulation-launch").onclick=()=>{t.AppCourse&&t.AppCourse.openSimulation?t.AppCourse.openSimulation(e):t.AppCatalog&&t.AppCatalog.openModal&&t.AppCatalog.openModal(x+"/simulations/"+encodeURIComponent(e)+"/html")},t.AppCourse&&t.AppCourse.isCourseMode()&&t.AppCourse.attachItemNav(document.getElementById("simulation-page"),"simulation",e)}catch(o){i.innerHTML=`
                <div class="reading-page">
                    <button type="button" id="simulation-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${n("返回","Back")}</button>
                    <p class="text-red-600">${l(o.message||n("無法載入模擬實驗。","Could not load simulation."))}</p>
                </div>`,document.getElementById("simulation-back").onclick=()=>u("/courses")}}t.AppSimulation={renderSimulation:v};
