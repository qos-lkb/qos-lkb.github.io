<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/question_bank_lib.php';
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
        <p id="flash" class="text-sm hidden"></p>
        <form id="edit-form" class="space-y-6">
            <input type="hidden" id="item-id" value="<?php echo $id; ?>">

            <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h2 class="text-sm font-semibold text-slate-800">試題集（question_banks）</h2>
                    <p class="text-xs text-slate-500 mt-0.5">預設科目／課題會套用到新加入的題目；各題仍可個別覆寫。</p>
                </div>
                <div class="p-4 overflow-x-auto">
                    <table class="qb-form-table w-full min-w-[640px] text-sm">
                        <tbody>
                            <tr>
                                <th>標題（中）</th>
                                <td><input id="title-zh" class="w-full border rounded-lg px-3 py-2"></td>
                                <th>標題（英）</th>
                                <td><input id="title-en" class="w-full border rounded-lg px-3 py-2"></td>
                            </tr>
                            <tr>
                                <th>slug</th>
                                <td colspan="3"><input id="slug" class="w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="留空則依標題自動產生"></td>
                            </tr>
                            <tr>
                                <th>描述（中）</th>
                                <td><textarea id="desc-zh" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea></td>
                                <th>描述（英）</th>
                                <td><textarea id="desc-en" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea></td>
                            </tr>
                            <tr>
                                <th>預設科目</th>
                                <td>
                                    <select id="subject-id" class="w-full border rounded-lg px-3 py-2">
                                        <option value="">—</option>
                                        <?php foreach ($subjects as $s): ?>
                                        <option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'], ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </td>
                                <th>預設課題</th>
                                <td><select id="topic-id" class="w-full border rounded-lg px-3 py-2"><option value="">—</option></select></td>
                            </tr>
                            <tr>
                                <th>列表排序</th>
                                <td><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2"></td>
                                <th>狀態</th>
                                <td>
                                    <select id="status" class="w-full border rounded-lg px-3 py-2">
                                        <option value="draft">草稿</option>
                                        <option value="pending_review">待審核</option>
                                        <option value="published">已發佈</option>
                                    </select>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h2 class="text-sm font-semibold text-slate-800">題目（qb_questions）</h2>
                        <p class="text-xs text-slate-500 mt-0.5">題幹支援 MathJax（<code>$...$</code>）及上載圖片（需先儲存試題集）。</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <?php foreach (['mcq' => '四選一', 'short_answer' => '短答', 'long_answer' => '長答', 'fill_blank' => '填充', 'true_false' => '是非'] as $tval => $tlabel): ?>
                        <button type="button" class="add-q-type text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50" data-type="<?php echo htmlspecialchars($tval, ENT_QUOTES, 'UTF-8'); ?>">+ <?php echo htmlspecialchars($tlabel, ENT_QUOTES, 'UTF-8'); ?></button>
                        <?php endforeach; ?>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="qb-questions-table min-w-full text-sm border-collapse">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-2 w-10">#</th>
                                <th class="p-2 min-w-[7rem]">題目代號</th>
                                <th class="p-2 min-w-[6rem]">題型</th>
                                <th class="p-2 min-w-[7rem]">科目</th>
                                <th class="p-2 min-w-[7rem]">課題</th>
                                <th class="p-2 w-16">難度</th>
                                <th class="p-2 min-w-[8rem]">來源</th>
                                <th class="p-2 w-24">操作</th>
                            </tr>
                        </thead>
                        <tbody id="questions"></tbody>
                    </table>
                </div>
                <p id="questions-empty" class="hidden p-6 text-center text-slate-500 text-sm">尚無題目，請按上方按鈕新增。</p>
            </section>

            <div class="flex gap-3">
                <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">儲存</button>
                <?php if ($id): ?><button type="button" id="btn-delete" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">刪除試題集</button><?php endif; ?>
            </div>
        </form>
<?php
$subjectsJson = array_map(static fn(array $s): array => [
    'id' => (int) $s['id'],
    'name_zh' => $s['name_zh'],
    'name_en' => $s['name_en'] ?? '',
], $subjects);

admin_page_end([
    'scripts' => '<script>window.MathJax={tex:{inlineMath:[[\'$\',\'$\'],[\'\\\\(\',\'\\\\)\']],displayMath:[[\'$$\',\'$$\'],[\'\\\\[\',\'\\\\]\']]},options:{skipHtmlTags:[\'script\',\'noscript\',\'style\',\'textarea\',\'pre\',\'code\']}};</script>'
        . '<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>'
        . '<script>window.TOPICS=' . json_encode($topicsJson, JSON_HEX_TAG | JSON_HEX_AMP)
        . ';window.QB_SUBJECTS=' . json_encode($subjectsJson, JSON_HEX_TAG | JSON_HEX_AMP)
        . ';window.EDIT_ID=' . $id . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . '<script src="../assets/js/admin-question-bank.js"></script>'
        . <<<'HTML'
    <script>
    (async function() {
        await AdminApi.initSession();
        const qBox = document.getElementById('questions');
        const qEmpty = document.getElementById('questions-empty');
        const flash = document.getElementById('flash');

        function syncEmptyState() {
            const has = qBox.querySelectorAll(':scope > tr.q-meta-row').length > 0;
            qEmpty.classList.toggle('hidden', has);
        }

        function addQuestion(type) {
            QbAdmin.renderQuestionBlock(QbAdmin.blankQuestion(type), qBox.querySelectorAll(':scope > tr.q-meta-row').length, qBox);
            QbAdmin.renumberQuestions(qBox);
            syncEmptyState();
        }

        document.querySelectorAll('.add-q-type').forEach(btn => {
            btn.onclick = () => addQuestion(btn.dataset.type);
        });

        document.getElementById('subject-id').onchange = function() {
            const tid = document.getElementById('topic-id');
            tid.innerHTML = '<option value="">—</option>';
            (window.TOPICS[this.value] || []).forEach(t => {
                const o = document.createElement('option');
                o.value = t.id;
                o.textContent = t.name_zh;
                tid.appendChild(o);
            });
        };

        if (window.EDIT_ID) {
            try {
                const detail = await AdminApi.apiFetch('/admin/question-banks/' + window.EDIT_ID);
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
                syncEmptyState();
            } catch (e) {
                flash.textContent = e.message;
                flash.classList.remove('hidden');
                flash.classList.add('text-red-600');
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
                const saved = await AdminApi.apiFetch('/admin/question-banks', { method: 'POST', body: payload });
                QbAdmin.applySavedQuestionIds(qBox, saved.questions || []);
                document.getElementById('item-id').value = saved.id;
                if (!window.EDIT_ID) {
                    history.replaceState(null, '', 'question_bank_edit.php?id=' + saved.id);
                    window.EDIT_ID = saved.id;
                }
                flash.textContent = '已儲存。現在可上載題目圖片。';
                flash.classList.remove('hidden');
                flash.classList.remove('text-red-600');
                flash.classList.add('text-green-700');
            } catch (err) {
                flash.textContent = err.message;
                flash.classList.remove('hidden');
                flash.classList.add('text-red-600');
                flash.classList.remove('text-green-700');
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
                    flash.classList.add('text-red-600');
                }
            };
        }
    })();
    </script>
HTML,
]);
