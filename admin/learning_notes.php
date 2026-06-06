<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('learning_note.manage_any', '../login.php?next=' . rawurlencode('admin/learning_notes.php'));

$pdo = db();
$list = $pdo->query('SELECT id, slug, title_zh, title_en, status, updated_at FROM learning_notes ORDER BY updated_at DESC')->fetchAll() ?: [];

admin_page_start('學習筆記', 'learning_notes', [
    'actions' => admin_btn('learning_note_edit.php', '新增') . admin_btn('review_queue.php', '審核佇列', 'secondary'),
    'wide' => true,
]);
?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100"><tr><th class="p-3 text-left">標題</th><th class="p-3">slug</th><th class="p-3">狀態</th><th class="p-3">更新</th><th class="p-3"></th></tr></thead>
                <tbody>
                <?php foreach ($list as $row): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs"><?php echo htmlspecialchars((string) $row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><a href="learning_note_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600 hover:underline">編輯</a></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$list): ?>
                    <tr><td colspan="5" class="p-6 text-center text-slate-500">尚無學習筆記。</td></tr>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
<?php
admin_page_end();
