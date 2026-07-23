<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_any_permission(['worksheet.assign_own', 'class.manage_any'], '../login.php?next=' . rawurlencode('admin/course_worksheets.php'));

$pdo = db();
$user = current_user();
assert($user !== null);

$classId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($classId <= 0) {
    header('Location: courses.php');
    exit;
}

$class = classes_fetch_by_id($pdo, $classId);
if (!$class || !classes_can_manage($pdo, $class, $user)) {
    http_response_code(403);
    exit('沒有權限。');
}

$canDesignWs = user_has_permission('worksheet.manage_any') || user_has_permission('worksheet.manage_own');
$wsActions = $canDesignWs
    ? admin_btn('worksheets.php', '設計工作紙', 'secondary') . admin_btn('worksheet_edit.php', '新增工作紙', 'secondary')
    : '';

admin_page_start('工作紙派發 — ' . (string) $class['name'], 'course_worksheets', [
    'actions' => $wsActions
        . admin_btn('courses.php', '返回課程', 'secondary')
        . admin_btn('course_reports.php?id=' . $classId, '學習報告', 'secondary')
        . admin_btn('course_summer_homework.php?id=' . $classId, '暑期功課', 'secondary'),
    'wide' => true,
]);
?>
        <p id="flash" class="text-sm mb-4 hidden"></p>
        <?php if ($canDesignWs): ?>
        <p class="text-sm text-slate-600 mb-4">選擇工作紙、設定派發對象與截止日期，學生提交後可在此評分。草稿或待審核的工作紙也可直接派發給本課程學生。</p>
        <?php endif; ?>

        <div class="grid lg:grid-cols-5 gap-6">
            <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 class="font-bold text-slate-800 mb-3">新增派發</h2>
                <form id="assign-form" class="space-y-3 text-sm">
                    <div>
                        <label class="font-medium">工作紙</label>
                        <select id="worksheet-id" required class="w-full border rounded-lg px-3 py-2 mt-1"></select>
                    </div>
                    <div>
                        <label class="font-medium">習作標題（選填，預設用工作紙標題）</label>
                        <input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="中文標題">
                        <input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="English title">
                    </div>
                    <div>
                        <label class="font-medium">說明（選填）</label>
                        <textarea id="instructions-zh" rows="2" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="給學生的指示（中）"></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="font-medium">滿分</label>
                            <input type="number" id="max-score" value="100" min="1" step="0.5" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </div>
                        <div>
                            <label class="font-medium">截止（選填）</label>
                            <input type="datetime-local" id="due-at" class="w-full border rounded-lg px-3 py-2 mt-1">
                        </div>
                    </div>
                    <div>
                        <label class="inline-flex items-center gap-2">
                            <input type="checkbox" id="assign-all" checked>
                            <span>派發給全班學生</span>
                        </label>
                    </div>
                    <div id="student-pick-wrap" class="hidden border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1"></div>
                    <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">建立派發</button>
                </form>
            </div>

            <div class="lg:col-span-3 space-y-4">
                <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h2 class="font-bold text-slate-800 mb-3">派發紀錄</h2>
                    <div id="assign-list" class="text-sm text-slate-500">載入中…</div>
                </div>
                <div id="grade-panel" class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hidden">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h2 class="font-bold text-slate-800" id="grade-title">評分</h2>
                        <button type="button" id="close-grade" class="text-sm text-slate-500 hover:underline">關閉</button>
                    </div>
                    <div id="grade-table-wrap" class="overflow-x-auto"></div>
                </div>
            </div>
        </div>
<?php
admin_page_end([
    'scripts' => '<script>const CLASS_ID=' . $classId . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . <<<'HTML'
    <script>
    (async function(){
        await AdminApi.initSession();
        const flash=document.getElementById('flash');
        const assignList=document.getElementById('assign-list');
        const gradePanel=document.getElementById('grade-panel');
        const gradeTitle=document.getElementById('grade-title');
        const gradeWrap=document.getElementById('grade-table-wrap');
        let students=[];
        let assignments=[];

        function showFlash(msg,err){flash.textContent=msg;flash.className='text-sm mb-4 '+(err?'text-red-600':'text-emerald-700');flash.classList.remove('hidden');}

        function statusLabel(s){
            return {draft:'草稿',active:'進行中',closed:'已結束',pending:'未開始',submitted:'已提交',graded:'已評分'}[s]||s;
        }

        function renderStudentPick(){
            const wrap=document.getElementById('student-pick-wrap');
            const all=document.getElementById('assign-all').checked;
            wrap.classList.toggle('hidden',all);
            if(all) return;
            wrap.innerHTML=students.map(s=>'<label class="flex items-center gap-2"><input type="checkbox" class="stu-pick" value="'+s.id+'"> '+escapeHtml(s.name_zh||s.display_name||s.email)+'</label>').join('');
        }

        function escapeHtml(t){return String(t).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

        async function loadWorksheets(){
            const list=await AdminApi.apiFetch('/teacher/worksheets');
            const sel=document.getElementById('worksheet-id');
            if(!list||!list.length){
                sel.innerHTML='<option value="">— 請先設計工作紙 —</option>';
                return;
            }
            sel.innerHTML=list.map(w=>{
                const mine=w.is_mine?'（我的）':'';
                const st=w.status==='published'?'':(' ['+( {draft:'草稿',pending_review:'待審',published:'已發佈'}[w.status]||w.status)+']');
                return '<option value="'+w.id+'">'+escapeHtml((w.title_zh||w.title_en)+mine+st)+'</option>';
            }).join('');
        }

        async function loadAssignments(){
            const data=await AdminApi.apiFetch('/teacher/classes/'+CLASS_ID+'/worksheet-assignments');
            students=data.students||[];
            assignments=data.assignments||[];
            renderStudentPick();
            if(!assignments.length){
                assignList.innerHTML='<p class="text-slate-500">尚無派發紀錄。</p>';
                return;
            }
            assignList.innerHTML='<div class="space-y-2">'+assignments.map(a=>{
                const title=a.title_zh||a.worksheet_title_zh||a.worksheet_slug;
                const due=a.due_at?(' · 截止 '+a.due_at.replace('T',' ').slice(0,16)):'';
                return '<button type="button" class="assign-row w-full text-left border rounded-lg px-3 py-2 hover:border-indigo-300" data-id="'+a.id+'">'+
                    '<span class="font-medium">'+escapeHtml(title)+'</span>'+
                    '<span class="block text-xs text-slate-500">'+statusLabel(a.status)+' · 已提交 '+a.submitted_count+'/'+a.student_count+' · 已評分 '+a.graded_count+ due +'</span></button>';
            }).join('')+'</div>';
            assignList.querySelectorAll('.assign-row').forEach(btn=>{
                btn.onclick=()=>openGrade(parseInt(btn.dataset.id,10));
            });
        }

        function formatResponse(r){
            if(!r) return '—';
            if(r.question_type==='mcq'||r.question_type==='true_false'){
                const labels=['A','B','C','D'];
                const idx=r.selected_option_index;
                if(r.question_type==='true_false') return idx===0?'是':idx===1?'否':'—';
                return labels[idx]!=null?labels[idx]:String(idx+1);
            }
            if(r.question_type==='short_answer') return r.response_text||'（空白）';
            if(r.question_type==='long_answer'&&r.parts) return r.parts.map(p=>'('+String.fromCharCode(97+p.part_index)+') '+p.text).join(' / ')||'（空白）';
            if(r.question_type==='fill_blank'&&r.blanks) return r.blanks.map(b=>'['+(b.blank_index+1)+'] '+b.text).join(' ')||'（空白）';
            return '—';
        }

        async function openGrade(id){
            const data=await AdminApi.apiFetch('/teacher/worksheet-assignments/'+id);
            const a=data.assignment;
            gradeTitle.textContent=(a.title_zh||a.worksheet_title_zh||'習作')+' — 評分';
            const subs=data.submissions||[];
            gradeWrap.innerHTML='<table class="min-w-full text-sm"><thead class="bg-slate-50"><tr>'+
                '<th class="p-2 text-left">學生</th><th class="p-2">狀態</th><th class="p-2">提交</th>'+
                '<th class="p-2">分數</th><th class="p-2">評語</th><th class="p-2">自動</th><th class="p-2"></th></tr></thead><tbody>'+
                subs.map(s=>{
                    const respRows=(s.responses||[]).map((r,i)=>'<tr class="border-t bg-slate-50/50"><td class="p-2 pl-6 text-xs text-slate-500" colspan="2">題 '+(i+1)+'</td><td class="p-2 text-xs" colspan="5">'+escapeHtml(formatResponse(r))+(r.auto_gradable&&r.is_correct!=null?' <span class="'+(r.is_correct?'text-emerald-600':'text-red-600')+'">'+(r.is_correct?'✓':'✗')+'</span>':'')+'</td></tr>').join('');
                    const defaultScore=s.score!=null?s.score:(s.auto_score!=null?s.auto_score:'');
                    return '<tr class="border-t" data-sub-id="'+s.id+'">'+
                '<td class="p-2">'+escapeHtml(s.student_name||('#'+s.user_id))+'</td>'+
                '<td class="p-2 text-center">'+statusLabel(s.status)+'</td>'+
                '<td class="p-2 text-center text-xs">'+(s.submitted_at?s.submitted_at.slice(0,16):'—')+'</td>'+
                '<td class="p-2"><input type="number" class="grade-score w-20 border rounded px-2 py-1" min="0" max="'+a.max_score+'" step="0.5" value="'+defaultScore+'"></td>'+
                '<td class="p-2"><input type="text" class="grade-feedback w-full border rounded px-2 py-1" value="'+escapeHtml(s.feedback_zh||'')+'" placeholder="評語"></td>'+
                '<td class="p-2 text-center text-xs text-slate-500">'+(s.auto_score!=null?s.auto_score:'—')+
                (s.auto_score!=null?' <button type="button" class="btn-use-auto text-indigo-600 hover:underline" data-auto="'+s.auto_score+'">採用</button>':'')+'</td>'+
                '<td class="p-2"><button type="button" class="btn-save-grade text-indigo-600 hover:underline">儲存</button></td></tr>'+respRows;
                }).join('')+
                '</tbody></table>';
            gradePanel.classList.remove('hidden');
            gradeWrap.querySelectorAll('.btn-use-auto').forEach(btn=>{
                btn.onclick=()=>{
                    const row=btn.closest('tr');
                    const scoreInp=row?.querySelector('.grade-score');
                    if(scoreInp&&btn.dataset.auto) scoreInp.value=btn.dataset.auto;
                };
            });
            gradeWrap.querySelectorAll('.btn-save-grade').forEach(btn=>{
                btn.onclick=async()=>{
                    const row=btn.closest('tr');
                    const subId=parseInt(row.dataset.subId,10);
                    const score=row.querySelector('.grade-score').value;
                    const feedback=row.querySelector('.grade-feedback').value;
                    try{
                        await AdminApi.apiFetch('/teacher/worksheet-submissions/'+subId+'/grade',{method:'POST',body:{score,feedback_zh:feedback,feedback_en:feedback}});
                        showFlash('已儲存評分',false);
                        await loadAssignments();
                    }catch(e){showFlash(e.message,true);}
                };
            });
        }

        document.getElementById('assign-all').onchange=renderStudentPick;
        document.getElementById('close-grade').onclick=()=>gradePanel.classList.add('hidden');

        document.getElementById('assign-form').onsubmit=async(e)=>{
            e.preventDefault();
            const assignAll=document.getElementById('assign-all').checked;
            const studentIds=assignAll?[]:Array.from(document.querySelectorAll('.stu-pick:checked')).map(c=>parseInt(c.value,10));
            if(!assignAll&&!studentIds.length){showFlash('請至少選擇一位學生',true);return;}
            const due=document.getElementById('due-at').value;
            try{
                await AdminApi.apiFetch('/teacher/classes/'+CLASS_ID+'/worksheet-assignments',{
                    method:'POST',
                    body:{
                        worksheet_id:parseInt(document.getElementById('worksheet-id').value,10),
                        title_zh:document.getElementById('title-zh').value,
                        title_en:document.getElementById('title-en').value,
                        instructions_zh:document.getElementById('instructions-zh').value,
                        max_score:parseFloat(document.getElementById('max-score').value)||100,
                        due_at:due||null,
                        assign_all:assignAll,
                        student_ids:studentIds,
                        status:'active',
                    }
                });
                showFlash('已建立派發',false);
                e.target.reset();
                document.getElementById('assign-all').checked=true;
                document.getElementById('max-score').value='100';
                renderStudentPick();
                await loadAssignments();
            }catch(err){showFlash(err.message,true);}
        };

        await loadWorksheets();
        await loadAssignments();
    })();
    </script>
HTML,
]);
?>
