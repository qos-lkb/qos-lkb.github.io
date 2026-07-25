<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/summer_homework_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
if (!sh_can_review(current_user())) {
    require_permission('summer_homework.manage_own', '../login.php?next=' . rawurlencode('admin/summer_homework.php'));
}

$pdo = db();
$user = current_user();
assert($user !== null);
$canManageAny = user_has_permission('summer_homework.manage_any');
$canCreate = $canManageAny || user_has_permission('summer_homework.manage_own');

// Teachers / admins reviewing: list all items.
$list = $pdo->query(
    'SELECT id, slug, title_zh, title_en, form_level, content_type, status, pass_percent, due_at, allow_late_submit, owner_user_id, updated_at
     FROM summer_homework_items ORDER BY form_level ASC, list_sort_order ASC, updated_at DESC'
)->fetchAll() ?: [];

$statusLabel = ['draft' => '草稿', 'pending_review' => '待審核', 'published' => '已發佈'];

$actions = '';
if ($canCreate) {
    $actions = admin_btn('summer_homework_edit.php', '新增習作');
}

admin_page_start('暑期功課', 'summer_homework', [
    'actions' => $actions,
    'wide' => true,
    'subtitle' => '中一／中二：教師／管理員可檢視全部習作內容、答案與呈交分析；編輯限擁有者或管理員',
]);
?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">標題</th>
                        <th class="p-3">級別</th>
                        <th class="p-3">類型</th>
                        <th class="p-3">及格%</th>
                        <th class="p-3">截止日期</th>
                        <th class="p-3">遲交</th>
                        <th class="p-3">狀態</th>
                        <th class="p-3">slug</th>
                        <th class="p-3">更新</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                <?php if ($list === []): ?>
                    <tr><td colspan="10" class="p-6 text-slate-500 text-center">尚未建立暑期功課。<?php echo $canCreate ? '請按「新增習作」。' : ''; ?></td></tr>
                <?php endif; ?>
                <?php foreach ($list as $row): ?>
                    <?php $canEdit = sh_can_manage_row($user, $row); ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3 font-medium"><?php echo htmlspecialchars($row['title_zh'] ?: $row['title_en'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3">中<?php echo $row['form_level'] === '2' ? '二' : '一'; ?></td>
                        <td class="p-3"><?php echo $row['content_type'] === 'video' ? '影片' : '閱讀'; ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) $row['pass_percent'], ENT_QUOTES, 'UTF-8'); ?>%</td>
                        <td class="p-3 text-xs whitespace-nowrap"><?php
                            echo !empty($row['due_at'])
                                ? htmlspecialchars((string) $row['due_at'], ENT_QUOTES, 'UTF-8')
                                : '—';
                        ?></td>
                        <td class="p-3"><?php
                            if (empty($row['due_at'])) {
                                echo '—';
                            } else {
                                echo !empty($row['allow_late_submit']) ? '允許' : '禁止';
                            }
                        ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($statusLabel[$row['status']] ?? $row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs text-slate-500"><?php echo htmlspecialchars((string) $row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <a class="text-indigo-600 hover:underline" href="summer_homework_view.php?id=<?php echo (int) $row['id']; ?>">內容／答案</a>
                            <a class="text-indigo-600 hover:underline ml-2" href="../app/admin/summer-homework/<?php echo (int) $row['id']; ?>/analytics">分析</a>
                            <?php if ($canEdit): ?>
                                <a class="text-indigo-600 hover:underline ml-2" href="summer_homework_edit.php?id=<?php echo (int) $row['id']; ?>">編輯</a>
                            <?php endif; ?>
                            <a class="text-slate-500 hover:underline ml-2" href="../app/summer-homework/<?php echo rawurlencode($row['slug']); ?>" target="_blank" rel="noopener">前台</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
<?php
admin_page_end();
