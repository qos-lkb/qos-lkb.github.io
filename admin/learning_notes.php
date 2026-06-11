<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/learning_notes_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('learning_note.manage_any', '../login.php?next=' . rawurlencode('admin/learning_notes.php'));

$pdo = db();
$rows = ln_fetch_admin_list($pdo);

/** @var array<string, array{label:string,subject_id:?int,topic_id:?int,items:list<array<string,mixed>>}> */
$groups = [];
foreach ($rows as $row) {
    $subjectId = $row['subject_id'] !== null ? (int) $row['subject_id'] : null;
    $topicId = $row['topic_id'] !== null ? (int) $row['topic_id'] : null;
    if ($topicId !== null) {
        $key = 't' . $topicId;
        $subLabel = (string) ($row['subject_zh'] ?: $row['subject_en'] ?: '未分類科目');
        $topLabel = (string) ($row['topic_zh'] ?: $row['topic_en'] ?: '未分類課題');
        $label = $subLabel . ' · ' . $topLabel;
    } elseif ($subjectId !== null) {
        $key = 's' . $subjectId . '_loose';
        $label = (string) ($row['subject_zh'] ?: $row['subject_en'] ?: '未分類科目') . ' · 一般';
    } else {
        $key = 'uncategorized';
        $label = '未分類';
    }
    if (!isset($groups[$key])) {
        $groups[$key] = [
            'label' => $label,
            'subject_id' => $subjectId,
            'topic_id' => $topicId,
            'items' => [],
        ];
    }
    $groups[$key]['items'][] = $row;
}

admin_page_start('學習筆記', 'learning_notes', [
    'actions' => admin_btn('learning_note_edit.php', '新增') . admin_btn('review_queue.php', '審核佇列', 'secondary'),
    'subtitle' => '拖曳 ⠿ 可調整同一課題內的顯示順序（影響前台學習筆記列表）。',
    'wide' => true,
]);
?>
        <p id="flash" class="text-sm hidden"></p>
        <?php if ($groups === []): ?>
            <div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 shadow-sm">尚無學習筆記。</div>
        <?php else: ?>
            <div class="space-y-6">
                <?php foreach ($groups as $group): ?>
                    <section class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div class="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <h2 class="text-sm font-semibold text-slate-800"><?php echo htmlspecialchars($group['label'], ENT_QUOTES, 'UTF-8'); ?></h2>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full text-sm">
                                <thead class="bg-slate-100/80">
                                    <tr>
                                        <th class="p-3 w-10" aria-label="排序"></th>
                                        <th class="p-3 text-left">標題</th>
                                        <th class="p-3">slug</th>
                                        <th class="p-3">狀態</th>
                                        <th class="p-3">排序</th>
                                        <th class="p-3">更新</th>
                                        <th class="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody class="note-sort-group"
                                       data-subject-id="<?php echo $group['subject_id'] !== null ? (int) $group['subject_id'] : ''; ?>"
                                       data-topic-id="<?php echo $group['topic_id'] !== null ? (int) $group['topic_id'] : ''; ?>">
                                    <?php foreach ($group['items'] as $row): ?>
                                        <tr class="note-sort-item border-t border-slate-100" data-note-id="<?php echo (int) $row['id']; ?>">
                                            <td class="p-3">
                                                <button type="button" class="note-drag-handle w-8 h-8 flex items-center justify-center rounded border border-dashed border-slate-300 text-slate-500 cursor-grab active:cursor-grabbing select-none text-xs" title="拖曳排序" aria-label="拖曳排序">⠿</button>
                                            </td>
                                            <td class="p-3"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td class="p-3"><?php echo htmlspecialchars($row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td class="p-3 font-mono text-xs note-sort-order"><?php echo (int) $row['list_sort_order']; ?></td>
                                            <td class="p-3 text-xs"><?php echo htmlspecialchars((string) $row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td class="p-3"><a href="learning_note_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600 hover:underline">編輯</a></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </section>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
<?php
admin_page_end([
    'scripts' => '<script src="../assets/js/admin-api.js"></script>'
        . '<script src="assets/js/list-reorder.js"></script>'
        . '<script src="assets/js/learning-notes-list.js"></script>',
]);
