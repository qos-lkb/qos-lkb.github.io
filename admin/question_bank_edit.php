<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('question_bank.manage_any', '../login.php?next=' . rawurlencode('admin/question_bank_edit.php'));

$pdo = db();
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$subjects = sim_all_subjects($pdo);
$topicsJson = [];
foreach ($subjects as $s) {
    $topicsJson[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

admin_page_start($id ? '編輯試題庫' : '新增試題庫', 'question_banks', [
    'actions' => admin_btn('question_banks.php', '返回列表', 'secondary'),
]);
?>
        <p id="flash" class="text-red-600 text-sm hidden"></p>
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
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">排序</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">狀態</label>
                    <select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <option value="draft">草稿</option>
                        <option value="pending_review">待審核</option>
                        <option value="published">已發佈</option>
                    </select>
                </div>
            </div>
            <div>
                <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
                    <label class="text-sm font-medium">題目</label>
                    <div class="flex flex-wrap gap-2">
                        <?php foreach (['mcq' => '四選一', 'short_answer' => '短答', 'long_answer' => '長答', 'fill_blank' => '填充', 'true_false' => '是非'] as $tval => $tlabel): ?>
                        <button type="button" class="add-q-type text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50" data-type="<?php echo htmlspecialchars($tval, ENT_QUOTES, 'UTF-8'); ?>">+ <?php echo htmlspecialchars($tlabel, ENT_QUOTES, 'UTF-8'); ?></button>
                        <?php endforeach; ?>
                    </div>
                </div>
                <div id="questions"></div>
            </div>
            <div class="flex gap-3">
                <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium">儲存</button>
                <?php if ($id): ?><button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg">刪除</button><?php endif; ?>
            </div>
        </form>
<?php
admin_page_end([
    'scripts' => '<script>const TOPICS=' . json_encode($topicsJson, JSON_HEX_TAG | JSON_HEX_AMP) . ';const EDIT_ID=' . $id . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . '<script src="../assets/js/admin-question-bank.js"></script>'
        . <<<'HTML'
    <script>
    (async function() {
        await AdminApi.initSession();
        const qBox = document.getElementById('questions');
        const flash = document.getElementById('flash');

        function addQuestion(type) {
            QbAdmin.renderQuestionBlock(QbAdmin.blankQuestion(type), qBox.children.length, qBox);
            QbAdmin.renumberQuestions(qBox);
        }

        document.querySelectorAll('.add-q-type').forEach(btn => {
            btn.onclick = () => addQuestion(btn.dataset.type);
        });

        document.getElementById('subject-id').onchange = function() {
            const tid = document.getElementById('topic-id');
            tid.innerHTML = '<option value="">—</option>';
            (TOPICS[this.value] || []).forEach(t => {
                const o = document.createElement('option');
                o.value = t.id;
                o.textContent = t.name_zh;
                tid.appendChild(o);
            });
        };

        if (EDIT_ID) {
            try {
                const detail = await AdminApi.apiFetch('/admin/question-banks/' + EDIT_ID);
                document.getElementById('title-zh').value = detail.title_zh || '';
                document.getElementById('title-en').value = detail.title_en || '';
                document.getElementById('slug').value = detail.slug || '';
                document.getElementById('desc-zh').value = detail.description_zh || '';
                document.getElementById('desc-en').value = detail.description_en || '';
                document.getElementById('status').value = detail.status || 'draft';
                document.getElementById('list-sort').value = detail.list_sort_order || 0;
                if (detail.subject_id) {
                    document.getElementById('subject-id').value = detail.subject_id;
                    document.getElementById('subject-id').dispatchEvent(new Event('change'));
                }
                if (detail.topic_id) document.getElementById('topic-id').value = detail.topic_id;
                (detail.questions || []).forEach((q, i) => QbAdmin.renderQuestionBlock(q, i, qBox));
            } catch (e) {
                flash.textContent = e.message;
                flash.classList.remove('hidden');
            }
        } else {
            addQuestion('mcq');
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
                list_sort_order: parseInt(document.getElementById('list-sort').value, 10) || 0,
                status: document.getElementById('status').value,
                questions: QbAdmin.collectQuestions(qBox),
            };
            try {
                await AdminApi.apiFetch('/admin/question-banks', { method: 'POST', body: payload });
                location.href = 'question_banks.php';
            } catch (err) {
                flash.textContent = err.message;
                flash.classList.remove('hidden');
            }
        };

        const delBtn = document.getElementById('btn-delete');
        if (delBtn) {
            delBtn.onclick = async () => {
                if (!confirm('確定刪除此試題庫？所有題目將一併刪除。')) return;
                try {
                    await AdminApi.apiFetch('/admin/question-banks', {
                        method: 'DELETE',
                        body: { id: parseInt(document.getElementById('item-id').value, 10) },
                    });
                    location.href = 'question_banks.php';
                } catch (err) {
                    flash.textContent = err.message;
                    flash.classList.remove('hidden');
                }
            };
        }
    })();
    </script>
HTML,
]);
