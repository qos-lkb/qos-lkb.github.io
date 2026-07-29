const t=window,{apiFetch:A,API_BASE:v,SITE_BASE:k}=t.ScienceApi,{t:s,escapeHtml:n,getLang:_,navigate:m}=t.AppRouter;function x(o){if(!o||/^https?:\/\//i.test(o)||o.startsWith("//")||o.startsWith("/"))return o;const i=k||"";return(i?i.replace(/\/$/,""):"")+"/"+o.replace(/^\.\//,"")}async function y(o){const i=document.getElementById("main-content");t.AppCatalog&&t.AppCatalog.closeModal&&t.AppCatalog.closeModal();try{const e=await A("/simulations/"+encodeURIComponent(o));t.AppLearningTracker&&t.AppLearningTracker.trackContentOpen("simulation",o,{subject_id:e.subject_id,topic_id:e.topic_id});const r=_(),g=r==="zh"?e.title_zh:e.title_en,p=r==="zh"?e.summary_zh||e.summary_en||"":e.summary_en||e.summary_zh||"",u=x(e.screenshot_path||""),h=x(e.export_url||"simulation_export.php?slug="+encodeURIComponent(o)),d=(Array.isArray(e.tags)?e.tags:[]).map(a=>`<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${n(a)}</span>`).join(" "),c=[];if(t.AppCourse&&t.AppCourse.isCourseMode()){const a=t.AppCourse.getCourseContext();if(a){const l=t.AppCourse.findTopic(a.subjectSlug,a.topicSlug);if(l){const f=r==="zh"?l.subject.name_zh:l.subject.name_en,C=r==="zh"?l.topic.name_zh:l.topic.name_en;c.push(`${f} · ${C}`)}}}c.push(s("模擬實驗","Simulation")),e.last_updated&&c.push(s("更新 ","Updated ")+e.last_updated);const b=t.AppCourse&&t.AppCourse.isCourseMode()?t.AppCourse.getBackRoute():"/simulations";i.innerHTML=`
                <div class="reading-page" id="simulation-page">
                    <button type="button" id="simulation-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${s("返回","Back")}</button>
                    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${n(g)}</h1>
                    <p class="text-sm text-slate-500 mb-3">${c.map(a=>n(a)).join(" · ")}</p>
                    ${p?`<p class="text-slate-700 mb-4 leading-relaxed">${n(p)}</p>`:""}
                    ${d?`<div class="flex flex-wrap gap-1.5 mb-5">${d}</div>`:""}
                    <button type="button" id="simulation-launch" class="course-sim-launch w-full max-w-xl text-left bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                        <div class="h-40 sm:h-48 bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center border-b border-slate-100 relative overflow-hidden">
                            ${u?`<img src="${n(u)}" alt="" class="w-full h-full object-cover">`:'<span class="text-5xl" aria-hidden="true">🔬</span>'}
                        </div>
                        <div class="p-5 flex items-center gap-4">
                            <span class="text-3xl flex-shrink-0" aria-hidden="true">🔬</span>
                            <div class="min-w-0 flex-1">
                                <p class="font-semibold text-slate-800">${s("開始模擬實驗","Start simulation")}</p>
                                <p class="text-sm text-slate-500 mt-0.5">${s("點擊以全螢幕開啟互動模擬","Click to open the interactive simulation")}</p>
                            </div>
                            <svg class="w-6 h-6 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                    </button>
                    <p class="mt-4">
                        <a href="${n(h)}" class="text-sm text-indigo-600 hover:underline" download>${n(s("下載源碼","Download source"))}</a>
                    </p>
                </div>`,document.getElementById("simulation-back").onclick=()=>m(b),document.getElementById("simulation-launch").onclick=()=>{t.AppCourse&&t.AppCourse.openSimulation?t.AppCourse.openSimulation(o):t.AppCatalog&&t.AppCatalog.openModal&&t.AppCatalog.openModal(v+"/simulations/"+encodeURIComponent(o)+"/html")},t.AppCourse&&t.AppCourse.isCourseMode()&&t.AppCourse.attachItemNav(document.getElementById("simulation-page"),"simulation",o)}catch(e){i.innerHTML=`
                <div class="reading-page">
                    <button type="button" id="simulation-back" class="text-indigo-600 text-sm mb-4 hover:underline">← ${s("返回","Back")}</button>
                    <p class="text-red-600">${n(e.message||s("無法載入模擬實驗。","Could not load simulation."))}</p>
                </div>`,document.getElementById("simulation-back").onclick=()=>m("/courses")}}t.AppSimulation={renderSimulation:y};
