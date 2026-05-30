<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();
require_permission('article.manage_own', '../login.php?next=' . rawurlencode('portal/article_edit.php'));

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $id ? '編輯' : '新增'; ?>文章 | Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white px-4 py-4"><a href="articles.php" class="text-slate-300 text-sm">← 返回</a></header>
    <main class="max-w-3xl mx-auto px-4 py-8">
        <p id="flash" class="text-red-600 text-sm mb-4 hidden"></p>
        <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6">
            <input type="hidden" id="item-id" value="<?php echo $id; ?>">
            <div><label class="text-sm font-medium">標題（中）</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1" required></div>
            <div><label class="text-sm font-medium">標題（英）</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            <div><label class="text-sm font-medium">內容（中，Markdown）</label><textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="10" required></textarea></div>
            <div><label class="text-sm font-medium">內容（英）</label><textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="10"></textarea></div>
            <div><label class="text-sm font-medium">狀態</label><select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                <option value="draft">草稿</option><option value="pending_review">提交審核</option>
            </select></div>
            <div><div class="flex justify-between mb-2"><label class="text-sm font-medium">閱讀理解題</label><button type="button" id="add-q" class="text-sm text-indigo-600">+ 新增</button></div><div id="questions"></div></div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg">儲存</button>
        </form>
    </main>
    <script>const EDIT_ID=<?php echo $id; ?>;</script>
    <script src="../assets/js/admin-api.js"></script>
    <script>
    (async function(){
        await AdminApi.initSession();
        const qBox=document.getElementById('questions');
        document.getElementById('add-q').onclick=()=>AdminApi.renderQuestionBlock(AdminApi.blankQuestion(),qBox.children.length,qBox);
        if(EDIT_ID){
            const rows=await AdminApi.apiFetch('/admin/articles');
            const row=rows.find(r=>r.id==EDIT_ID);
            if(row){
                document.getElementById('title-zh').value=row.title_zh||'';
                document.getElementById('title-en').value=row.title_en||'';
                document.getElementById('body-zh').value=row.body_zh||'';
                document.getElementById('body-en').value=row.body_en||'';
                document.getElementById('status').value=row.status==='published'?'pending_review':row.status;
                const detail=await AdminApi.apiFetch('/articles/'+encodeURIComponent(row.slug));
                const ans=await AdminApi.apiFetch('/articles/'+encodeURIComponent(row.slug)+'/answers').catch(()=>({answers:[]}));
                const map={};(ans.answers||[]).forEach(a=>{map[a.question_id]=a.correct_option_index;});
                (detail.questions||[]).forEach(q=>{const ci=map[q.id];if(ci!==undefined&&q.options)q.options.forEach((o,i)=>{o.is_correct=i===ci;});});
                (detail.questions||[]).forEach((q,i)=>AdminApi.renderQuestionBlock(q,i,qBox));
            }
        }
        document.getElementById('edit-form').onsubmit=async(e)=>{
            e.preventDefault();
            try{
                await AdminApi.apiFetch('/admin/articles',{method:'POST',body:{
                    id:parseInt(document.getElementById('item-id').value,10)||undefined,
                    title_zh:document.getElementById('title-zh').value,title_en:document.getElementById('title-en').value,
                    body_zh:document.getElementById('body-zh').value,body_en:document.getElementById('body-en').value,
                    status:document.getElementById('status').value,questions:AdminApi.collectQuestions(qBox)
                }});
                location.href='articles.php';
            }catch(err){document.getElementById('flash').textContent=err.message;document.getElementById('flash').classList.remove('hidden');}
        };
    })();
    </script>
</body>
</html>
