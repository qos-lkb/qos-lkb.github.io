<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_any_permission(['worksheet.manage_any', 'worksheet.manage_own'], '../login.php?next=' . rawurlencode('admin/worksheet_edit.php'));

$pdo = db();
$user = current_user();
assert($user !== null);
$canAny = user_has_permission('worksheet.manage_any');
$canQuestionBank = user_has_permission('question_bank.manage_any') || user_has_permission('question_bank.manage_own');

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$subjects = sim_all_subjects($pdo);
$topicsJson = [];
foreach ($subjects as $s) {
    $topicsJson[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

$actions = admin_btn('worksheets.php', '返回列表', 'secondary');
if ($canQuestionBank) {
    $actions .= admin_btn('question_banks.php', '試題庫', 'secondary');
}
if (user_has_permission('class.manage_own') || user_has_permission('class.manage_any')) {
    $actions .= admin_btn('courses.php', '課程派發', 'secondary');
}

admin_page_start($id ? '編輯工作紙' : '新增工作紙', 'worksheets', [
    'actions' => $actions,
]);
?>
        <?php if (!$canAny): ?>
        <p class="text-sm text-slate-600 mb-4">使用 Markdown 撰寫工作紙，並以「+ 題庫題目」嵌入試題供學生作答。儲存後可直接在課程中派發；選「待審核」可申請發佈至全站。</p>
        <?php endif; ?>
        <p id="flash" class="text-red-600 text-sm hidden"></p>
        <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
            <input type="hidden" id="item-id" value="<?php echo $id; ?>">
            <div class="grid md:grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">標題（中）</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">標題（英）</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            </div>
            <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
            <div><label class="text-sm font-medium">簡介（中）</label><textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm" rows="2"></textarea></div>
            <div><label class="text-sm font-medium">簡介（英）</label><textarea id="desc-en" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm" rows="2"></textarea></div>
            <div><label class="text-sm font-medium">內容（中，Markdown）</label>
                <div class="flex flex-wrap gap-2 mb-1">
                    <button type="button" data-ws-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ 影片</button>
                    <button type="button" data-ws-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ 模擬</button>
                    <button type="button" data-ws-embed="article" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ 文章</button>
                    <button type="button" data-ws-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ 題庫題目</button>
                </div>
                <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
                <p class="text-xs text-slate-500 mt-1">可用 <code>::video slug="…"</code>、<code>::simulation slug="…"</code>、<code>::article slug="…"</code>、<code>::question bank="…" id="12" score="5"</code> 嵌入內容；亦可用上方按鈕插入。</p>
                <div id="ws-structure-preview" class="hidden mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600"></div>
            </div>
            <div><label class="text-sm font-medium">內容（英，Markdown）</label>
                <div class="flex flex-wrap gap-2 mb-1">
                    <button type="button" data-ws-embed="video" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Video</button>
                    <button type="button" data-ws-embed="simulation" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Sim</button>
                    <button type="button" data-ws-embed="article" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+ Article</button>
                    <button type="button" data-ws-embed="question" class="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">+ Question</button>
                </div>
                <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="12"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">科目</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>
                    <?php foreach ($subjects as $s): ?><option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'], ENT_QUOTES, 'UTF-8'); ?></option><?php endforeach; ?>
                </select></div>
                <div><label class="text-sm font-medium">單元</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
            </div>
            <div><label class="text-sm font-medium">排序</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            <div><label class="text-sm font-medium">狀態</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                <option value="draft">草稿</option>
                <option value="pending_review">待審核</option>
                <?php if ($canAny): ?><option value="published">已發佈</option><?php endif; ?>
            </select></div>
            <div class="flex gap-3">
                <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg">儲存</button>
                <?php if ($id): ?><button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">刪除</button><?php endif; ?>
            </div>
        </form>
<?php
admin_page_end([
    'scripts' => '<script>const TOPICS=' . json_encode($topicsJson, JSON_HEX_TAG | JSON_HEX_AMP) . ';const EDIT_ID=' . $id . ';const CAN_ANY=' . ($canAny ? 'true' : 'false') . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . '<script src="../assets/js/admin-content-embed.js"></script>'
        . <<<'HTML'
    <script>
    (async function(){
        await AdminApi.initSession();
        if (window.AdminContentEmbed) AdminContentEmbed.init(['body-zh', 'body-en']);
        function updateStructurePreview(){
            const body=document.getElementById('body-zh').value||'';
            const box=document.getElementById('ws-structure-preview');
            if(!box) return;
            const lines=body.split(/\r?\n/).filter(l=>/^::(video|simulation|sim|article|question)\s+/.test(l));
            if(!lines.length){box.classList.add('hidden');return;}
            const labels={video:'影片',simulation:'模擬',sim:'模擬',article:'文章',question:'試題'};
            let qScore=0,qCount=0;
            const items=lines.map(l=>{
                const m=l.match(/^::(\w+)\s+(.+)$/);
                if(!m) return '';
                const type=m[1]==='sim'?'simulation':m[1];
                const score=(l.match(/score="([^"]+)"/)||[])[1];
                if(type==='question'){qCount++;if(score) qScore+=parseFloat(score)||0;}
                return (labels[m[1]]||m[1])+(score?(' · '+score+'分'):'');
            });
            box.innerHTML='<strong>內容結構：</strong> '+items.join(' → ')+(qCount?(' · 試題 '+qCount+' 題'+(qScore?('，共 '+qScore+' 分'):'')):'');
            box.classList.remove('hidden');
        }
        ['body-zh','body-en'].forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener('input',updateStructurePreview);}});
        const flash=document.getElementById('flash');
        document.getElementById('subject-id').onchange=function(){const t=document.getElementById('topic-id');t.innerHTML='<option value="">—</option>';(TOPICS[this.value]||[]).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name_zh;t.appendChild(o);});};
        if(EDIT_ID){
            const rows=await AdminApi.apiFetch('/admin/worksheets');
            const row=rows.find(r=>r.id==EDIT_ID);
            if(row){
                document.getElementById('title-zh').value=row.title_zh||'';
                document.getElementById('title-en').value=row.title_en||'';
                document.getElementById('slug').value=row.slug||'';
                document.getElementById('desc-zh').value=row.description_zh||'';
                document.getElementById('desc-en').value=row.description_en||'';
                document.getElementById('body-zh').value=row.body_zh||'';
                document.getElementById('body-en').value=row.body_en||'';
                document.getElementById('status').value=row.status||'draft';
                document.getElementById('list-sort').value=row.list_sort_order||0;
                if(row.subject_id){document.getElementById('subject-id').value=row.subject_id;document.getElementById('subject-id').dispatchEvent(new Event('change'));}
                if(row.topic_id) document.getElementById('topic-id').value=row.topic_id;
                updateStructurePreview();
            }
        }
        document.getElementById('edit-form').onsubmit=async(e)=>{
            e.preventDefault();
            const payload={id:parseInt(document.getElementById('item-id').value,10)||undefined,title_zh:document.getElementById('title-zh').value,title_en:document.getElementById('title-en').value,slug:document.getElementById('slug').value,description_zh:document.getElementById('desc-zh').value,description_en:document.getElementById('desc-en').value,body_zh:document.getElementById('body-zh').value,body_en:document.getElementById('body-en').value,subject_id:document.getElementById('subject-id').value||null,topic_id:document.getElementById('topic-id').value||null,list_sort_order:parseInt(document.getElementById('list-sort').value,10)||0,status:document.getElementById('status').value};
            try{await AdminApi.apiFetch('/admin/worksheets',{method:'POST',body:payload});location.href='worksheets.php';}catch(err){flash.textContent=err.message;flash.classList.remove('hidden');}
        };
        const delBtn=document.getElementById('btn-delete');
        if(delBtn) delBtn.onclick=async()=>{
            if(!confirm('確定刪除此工作紙？')) return;
            try{await AdminApi.apiFetch('/admin/worksheets',{method:'DELETE',body:{id:EDIT_ID}});location.href='worksheets.php';}catch(err){flash.textContent=err.message;flash.classList.remove('hidden');}
        };
    })();
    </script>
HTML,
]);
?>
