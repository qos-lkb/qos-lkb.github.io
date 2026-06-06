<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('article.manage_any', '../login.php?next=' . rawurlencode('admin/article_edit.php'));

$pdo = db();
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$subjects = sim_all_subjects($pdo);
$topicsJson = [];
foreach ($subjects as $s) {
    $topicsJson[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

admin_page_start($id ? '編輯文章' : '新增文章', 'articles', [
    'actions' => admin_btn('articles.php', '返回列表', 'secondary'),
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
            <div><label class="text-sm font-medium">內容（中，Markdown）</label><textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
            <div><label class="text-sm font-medium">內容（英，Markdown）</label><textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="8"></textarea></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">科目</label><select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option>
                    <?php foreach ($subjects as $s): ?><option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'], ENT_QUOTES, 'UTF-8'); ?></option><?php endforeach; ?>
                </select></div>
                <div><label class="text-sm font-medium">單元</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
            </div>
            <div><label class="text-sm font-medium">閱讀時間（分鐘）</label><input type="number" id="reading-time" min="1" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            <div><label class="text-sm font-medium">狀態</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                <option value="draft">草稿</option><option value="pending_review">待審核</option><option value="published">已發佈</option>
            </select></div>
            <div>
                <div class="flex justify-between mb-2"><label class="text-sm font-medium">閱讀理解題（選填）</label><button type="button" id="add-q" class="text-sm text-indigo-600">+ 新增</button></div>
                <div id="questions"></div>
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg">儲存</button>
        </form>
<?php
admin_page_end([
    'scripts' => '<script>const TOPICS=' . json_encode($topicsJson, JSON_HEX_TAG | JSON_HEX_AMP) . ';const EDIT_ID=' . $id . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . <<<'HTML'
    <script>
    (async function(){
        await AdminApi.initSession();
        const qBox=document.getElementById('questions');
        document.getElementById('add-q').onclick=()=>AdminApi.renderQuestionBlock(AdminApi.blankQuestion(),qBox.children.length,qBox);
        document.getElementById('subject-id').onchange=function(){const t=document.getElementById('topic-id');t.innerHTML='<option value="">—</option>';(TOPICS[this.value]||[]).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name_zh;t.appendChild(o);});};
        async function mergeAnswers(slug, questions) {
            try {
                const ans = await AdminApi.apiFetch('/articles/'+encodeURIComponent(slug)+'/answers');
                const map = {}; (ans.answers||[]).forEach(a=>{map[a.question_id]=a.correct_option_index;});
                questions.forEach(q=>{const ci=map[q.id]; if(ci!==undefined&&q.options) q.options.forEach((o,i)=>{o.is_correct=i===ci;});});
            } catch(e){}
            return questions;
        }
        if(EDIT_ID){
            const rows=await AdminApi.apiFetch('/admin/articles');
            const row=rows.find(r=>r.id==EDIT_ID);
            if(row){
                document.getElementById('title-zh').value=row.title_zh||'';
                document.getElementById('title-en').value=row.title_en||'';
                document.getElementById('slug').value=row.slug||'';
                document.getElementById('body-zh').value=row.body_zh||'';
                document.getElementById('body-en').value=row.body_en||'';
                document.getElementById('status').value=row.status||'draft';
                document.getElementById('reading-time').value=row.reading_time_minutes||'';
                if(row.subject_id){document.getElementById('subject-id').value=row.subject_id;document.getElementById('subject-id').dispatchEvent(new Event('change'));}
                if(row.topic_id) document.getElementById('topic-id').value=row.topic_id;
                let detail=await AdminApi.apiFetch('/articles/'+encodeURIComponent(row.slug));
                let qs=await mergeAnswers(row.slug,detail.questions||[]);
                qs.forEach((q,i)=>AdminApi.renderQuestionBlock(q,i,qBox));
            }
        }
        document.getElementById('edit-form').onsubmit=async(e)=>{
            e.preventDefault();
            const payload={id:parseInt(document.getElementById('item-id').value,10)||undefined,title_zh:document.getElementById('title-zh').value,title_en:document.getElementById('title-en').value,slug:document.getElementById('slug').value,body_zh:document.getElementById('body-zh').value,body_en:document.getElementById('body-en').value,subject_id:document.getElementById('subject-id').value||null,topic_id:document.getElementById('topic-id').value||null,reading_time_minutes:document.getElementById('reading-time').value||null,status:document.getElementById('status').value,questions:AdminApi.collectQuestions(qBox)};
            try{await AdminApi.apiFetch('/admin/articles',{method:'POST',body:payload});location.href='articles.php';}catch(err){document.getElementById('flash').textContent=err.message;document.getElementById('flash').classList.remove('hidden');}
        };
    })();
    </script>
HTML,
]);
