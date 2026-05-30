<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/learning_tools_lib.php';

bootstrap_public();
require_permission('learning_tool.manage_any', '../login.php?next=' . rawurlencode('admin/learning_tool_edit.php'));

$pdo = db();
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$subjects = sim_all_subjects($pdo);
$topicsJson = [];
foreach ($subjects as $s) {
    $topicsJson[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $id ? '編輯' : '新增'; ?>學習工具 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white px-4 py-4">
        <div class="max-w-3xl mx-auto"><a href="learning_tools.php" class="text-slate-300 text-sm">← 返回列表</a></div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-8">
        <p id="flash" class="text-red-600 text-sm mb-4 hidden"></p>
        <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6 shadow-sm">
            <input type="hidden" id="item-id" value="<?php echo $id; ?>">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">標題（中）</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">標題（英）</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            </div>
            <div><label class="text-sm font-medium">slug（選填）</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">描述（中）</label><textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2 mt-1" rows="2"></textarea></div>
                <div><label class="text-sm font-medium">描述（英）</label><textarea id="desc-en" class="w-full border rounded-lg px-3 py-2 mt-1" rows="2"></textarea></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">科目</label>
                    <select id="subject-id" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <option value="">—</option>
                        <?php foreach ($subjects as $s): ?>
                        <option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'], ENT_QUOTES, 'UTF-8'); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div><label class="text-sm font-medium">單元</label><select id="topic-id" class="w-full border rounded-lg px-3 py-2 mt-1"><option value="">—</option></select></div>
            </div>
            <div><label class="text-sm font-medium">狀態</label>
                <select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                    <option value="draft">草稿</option>
                    <option value="pending_review">待審核</option>
                    <option value="published">已發佈</option>
                </select>
            </div>
            <div>
                <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-medium">題目（每題四選一）</label>
                    <button type="button" id="add-q" class="text-sm text-indigo-600">+ 新增題目</button>
                </div>
                <div id="questions"></div>
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium">儲存</button>
        </form>
    </main>
    <script>
        const TOPICS = <?php echo json_encode($topicsJson, JSON_HEX_TAG | JSON_HEX_AMP); ?>;
        const EDIT_ID = <?php echo $id; ?>;
    </script>
    <script src="../assets/js/admin-api.js"></script>
    <script>
    (async function() {
        await AdminApi.initSession();
        const qBox = document.getElementById('questions');
        document.getElementById('add-q').onclick = () => AdminApi.renderQuestionBlock(AdminApi.blankQuestion(), qBox.children.length, qBox);
        document.getElementById('subject-id').onchange = function() {
            const tid = document.getElementById('topic-id');
            tid.innerHTML = '<option value="">—</option>';
            (TOPICS[this.value] || []).forEach(t => {
                const o = document.createElement('option');
                o.value = t.id; o.textContent = t.name_zh; tid.appendChild(o);
            });
        };
        if (EDIT_ID) {
            try {
                const rows = await AdminApi.apiFetch('/admin/learning-tools');
                const row = rows.find(r => r.id == EDIT_ID);
                if (row) {
                    document.getElementById('title-zh').value = row.title_zh || '';
                    document.getElementById('title-en').value = row.title_en || '';
                    document.getElementById('slug').value = row.slug || '';
                    document.getElementById('desc-zh').value = row.description_zh || '';
                    document.getElementById('desc-en').value = row.description_en || '';
                    document.getElementById('status').value = row.status || 'draft';
                    if (row.subject_id) { document.getElementById('subject-id').value = row.subject_id; document.getElementById('subject-id').dispatchEvent(new Event('change')); }
                    if (row.topic_id) document.getElementById('topic-id').value = row.topic_id;
                    const detail = await AdminApi.apiFetch('/learning-tools/' + encodeURIComponent(row.slug));
                    const ans = await AdminApi.apiFetch('/learning-tools/' + encodeURIComponent(row.slug) + '/answers').catch(() => ({ answers: [] }));
                    const map = {}; (ans.answers || []).forEach(a => { map[a.question_id] = a.correct_option_index; });
                    (detail.questions || []).forEach(q => {
                        const ci = map[q.id];
                        if (ci !== undefined && q.options) q.options.forEach((o, i) => { o.is_correct = i === ci; });
                    });
                    (detail.questions || []).forEach((q, i) => AdminApi.renderQuestionBlock(q, i, qBox));
                }
            } catch (e) { document.getElementById('flash').textContent = e.message; document.getElementById('flash').classList.remove('hidden'); }
        } else {
            AdminApi.renderQuestionBlock(AdminApi.blankQuestion(), 0, qBox);
        }
        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: parseInt(document.getElementById('item-id').value, 10) || undefined,
                title_zh: document.getElementById('title-zh').value,
                title_en: document.getElementById('title-en').value,
                slug: document.getElementById('slug').value,
                description_zh: document.getElementById('desc-zh').value,
                description_en: document.getElementById('desc-en').value,
                subject_id: document.getElementById('subject-id').value || null,
                topic_id: document.getElementById('topic-id').value || null,
                status: document.getElementById('status').value,
                questions: AdminApi.collectQuestions(qBox),
            };
            try {
                await AdminApi.apiFetch('/admin/learning-tools', { method: 'POST', body: payload });
                location.href = 'learning_tools.php';
            } catch (err) {
                document.getElementById('flash').textContent = err.message;
                document.getElementById('flash').classList.remove('hidden');
            }
        };
    })();
    </script>
</body>
</html>
