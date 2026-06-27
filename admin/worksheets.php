<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_any_permission(['worksheet.manage_any', 'worksheet.manage_own'], '../login.php?next=' . rawurlencode('admin/worksheets.php'));

$pdo = db();
$user = current_user();
assert($user !== null);
$canAny = user_has_permission('worksheet.manage_any');

if ($canAny) {
    $list = $pdo->query('SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id FROM worksheets ORDER BY updated_at DESC')->fetchAll() ?: [];
} else {
    $stmt = $pdo->prepare('SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id FROM worksheets WHERE owner_user_id = ? ORDER BY updated_at DESC');
    $stmt->execute([$user['id']]);
    $list = $stmt->fetchAll() ?: [];
}

$statusLabels = [
    'draft' => '草稿',
    'pending_review' => '待審核',
    'published' => '已發佈',
];

$actions = admin_btn('worksheet_edit.php', '新增工作紙');
if ($canAny) {
    $actions .= admin_btn('review_queue.php', '審核佇列', 'secondary');
}
if (user_has_permission('class.manage_own') || user_has_permission('class.manage_any')) {
    $actions .= admin_btn('courses.php', '課程派發', 'secondary');
}

admin_page_start($canAny ? '工作紙' : '我的工作紙', 'worksheets', [
    'actions' => $actions,
    'wide' => true,
]);
?>
        <?php if (!$canAny): ?>
        <p class="text-sm text-slate-600 mb-4">在此設計工作紙內容（可嵌入試題庫題目、模擬實驗等），完成後到「<a href="courses.php" class="text-indigo-600 hover:underline">課程管理</a>」→「習作」派發給學生並評分。提交「待審核」後，管理員可發佈至全站工作紙列表。</p>
        <?php endif; ?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100"><tr><th class="p-3 text-left">標題</th><th class="p-3">slug</th><th class="p-3">狀態</th><th class="p-3">更新</th><th class="p-3"></th></tr></thead>
                <tbody>
                <?php foreach ($list as $row): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($statusLabels[$row['status']] ?? $row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs"><?php echo htmlspecialchars((string) $row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <a href="worksheet_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600 hover:underline">編輯</a>
                            <a href="../app/worksheet/<?php echo rawurlencode((string) $row['slug']); ?>" class="text-slate-600 hover:underline ml-2" target="_blank" rel="noopener">預覽</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$list): ?>
                    <tr><td colspan="5" class="p-6 text-center text-slate-500">尚無工作紙。<a href="worksheet_edit.php" class="text-indigo-600 hover:underline">新增第一份工作紙</a></td></tr>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
<?php
admin_page_end();
