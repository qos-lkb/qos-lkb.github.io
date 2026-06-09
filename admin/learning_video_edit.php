<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('learning_video.manage_any', '../login.php?next=' . rawurlencode('admin/learning_video_edit.php'));

$pdo = db();
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$subjects = sim_all_subjects($pdo);
$topicsJson = [];
foreach ($subjects as $s) {
    $topicsJson[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

admin_page_start($id ? '編輯學習影片' : '新增學習影片', 'learning_videos', [
    'actions' => admin_btn('learning_videos.php', '返回列表', 'secondary'),
]);
?>
        <p id="flash" class="text-red-600 text-sm hidden"></p>
        <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
            <input type="hidden" id="item-id" value="<?php echo $id; ?>">
            <div class="grid md:grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">標題（中）</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">標題（英）</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            </div>
            <div><label class="text-sm font-medium">slug</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
            <div>
                <label class="text-sm font-medium">YouTube / Vimeo 連結</label>
                <input id="source-url" type="url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/watch?v=...">
                <p class="text-xs text-slate-500 mt-1">儲存時會轉換為安全嵌入網址。</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">科目</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>
                    <?php foreach ($subjects as $s): ?><option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'], ENT_QUOTES, 'UTF-8'); ?></option><?php endforeach; ?>
                </select></div>
                <div><label class="text-sm font-medium">課題</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
            </div>
            <div><label class="text-sm font-medium">片長（分鐘，選填）</label><input type="number" id="duration" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            <div><label class="text-sm font-medium">狀態</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                <option value="draft">草稿</option><option value="pending_review">待審核</option><option value="published">已發佈</option>
            </select></div>
            <div class="flex gap-3">
                <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg">儲存</button>
                <?php if ($id): ?><button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">刪除</button><?php endif; ?>
            </div>
        </form>
<?php
admin_page_end([
    'scripts' => '<script>const TOPICS=' . json_encode($topicsJson, JSON_HEX_TAG | JSON_HEX_AMP) . ';const EDIT_ID=' . $id . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . <<<'HTML'
    <script>
    (async function(){
        await AdminApi.initSession();
        const flash=document.getElementById('flash');
        document.getElementById('subject-id').onchange=function(){const t=document.getElementById('topic-id');t.innerHTML='<option value="">—</option>';(TOPICS[this.value]||[]).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name_zh;t.appendChild(o);});};
        if(EDIT_ID){
            const rows=await AdminApi.apiFetch('/admin/learning-videos');
            const row=rows.find(r=>r.id==EDIT_ID);
            if(row){
                document.getElementById('title-zh').value=row.title_zh||'';
                document.getElementById('title-en').value=row.title_en||'';
                document.getElementById('slug').value=row.slug||'';
                document.getElementById('source-url').value=row.embed_url||'';
                document.getElementById('status').value=row.status||'draft';
                document.getElementById('duration').value=row.duration_minutes||'';
                if(row.subject_id){document.getElementById('subject-id').value=row.subject_id;document.getElementById('subject-id').dispatchEvent(new Event('change'));}
                if(row.topic_id) document.getElementById('topic-id').value=row.topic_id;
            }
        }
        document.getElementById('edit-form').onsubmit=async(e)=>{
            e.preventDefault();
            const payload={id:parseInt(document.getElementById('item-id').value,10)||undefined,title_zh:document.getElementById('title-zh').value,title_en:document.getElementById('title-en').value,slug:document.getElementById('slug').value,source_url:document.getElementById('source-url').value,subject_id:document.getElementById('subject-id').value||null,topic_id:document.getElementById('topic-id').value||null,duration_minutes:document.getElementById('duration').value||null,status:document.getElementById('status').value};
            try{await AdminApi.apiFetch('/admin/learning-videos',{method:'POST',body:payload});location.href='learning_videos.php';}catch(err){flash.textContent=err.message;flash.classList.remove('hidden');}
        };
        const delBtn=document.getElementById('btn-delete');
        if(delBtn) delBtn.onclick=async()=>{
            if(!confirm('確定刪除此影片？')) return;
            try{await AdminApi.apiFetch('/admin/learning-videos',{method:'DELETE',body:{id:EDIT_ID}});location.href='learning_videos.php';}catch(err){flash.textContent=err.message;flash.classList.remove('hidden');}
        };
    })();
    </script>
HTML,
]);
