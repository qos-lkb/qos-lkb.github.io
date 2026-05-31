<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/user_admin.php';

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

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>使用者 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white shadow">
        <div class="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 class="font-bold">使用者</h1>
            <nav class="flex gap-3 text-sm">
                <a href="index.php" class="text-slate-300 hover:text-white">後台</a>
                <a href="permissions.php" class="text-slate-300 hover:text-white">更改權限</a>
                <a href="user_edit.php" class="text-indigo-300 hover:text-white">新增</a>
            </nav>
        </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">
        <?php if ($flash !== ''): ?>
            <p class="mb-4 text-sm text-slate-700"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
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
                        <td class="p-3 text-slate-600"><?php echo htmlspecialchars((string) ($r['role_names'] ?? ''), ENT_QUOTES, 'UTF-8') ?: '—'; ?></td>
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
    </main>
</body>
</html>
