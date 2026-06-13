<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/user_admin.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/users.php'));

$pdo = db();
$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    $acting = current_user();
    assert($acting !== null);
    $r = admin_delete_user($pdo, $_POST, $acting['id']);
    $flash = $r['ok'] ? '已刪除使用者。' : ($r['error'] ?? '錯誤');
}

$rows = $pdo->query(
    'SELECT u.id, u.email, u.display_name, u.is_active,
            GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ", ") AS role_names
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id, u.email, u.display_name, u.is_active
     ORDER BY u.id ASC'
)->fetchAll() ?: [];

admin_page_start('使用者', 'users', [
    'actions' => admin_btn('user_edit.php', '新增'),
    'wide' => true,
]);
?>
        <?php if ($flash !== ''): ?>
            <p class="text-sm text-slate-700"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">ID</th>
                        <th class="p-3">電郵</th>
                        <th class="p-3">名稱</th>
                        <th class="p-3">角色</th>
                        <th class="p-3">啟用</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rows as $r): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3"><?php echo (int) $r['id']; ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($r['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($r['display_name'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-slate-600"><?php
                            $roleDisplay = admin_format_role_names((string) ($r['role_names'] ?? ''));
                            echo htmlspecialchars($roleDisplay !== '' ? $roleDisplay : '—', ENT_QUOTES, 'UTF-8');
                        ?></td>
                        <td class="p-3"><?php echo (int) $r['is_active'] ? '是' : '否'; ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <?php if ($r['email'] !== 'system@science-sims.internal'): ?>
                            <a href="user_edit.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline">編輯</a>
                            <?php else: ?>
                            <span class="text-slate-400">—</span>
                            <?php endif; ?>
                            <?php if ($r['email'] !== 'system@science-sims.internal'): ?>
                            <form method="post" class="inline ml-2" onsubmit="return confirm('確定刪除？');">
                                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="text-red-600 hover:underline">刪除</button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
<?php
admin_page_end();
