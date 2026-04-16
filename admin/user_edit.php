<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/user_admin.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/user_edit.php'));

$pdo = db();
$acting = current_user();
assert($acting !== null);

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$row = null;
$roleIds = [];
if ($id > 0) {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        exit;
    }
    $rs = $pdo->prepare('SELECT role_id FROM user_roles WHERE user_id = ?');
    $rs->execute([$id]);
    $roleIds = array_map('intval', $rs->fetchAll(PDO::FETCH_COLUMN) ?: []);
}

$allRoles = $pdo->query('SELECT id, name FROM roles ORDER BY name')->fetchAll() ?: [];

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $res = admin_save_user_from_post($pdo, $_POST, $acting['id']);
    if ($res['ok']) {
        header('Location: users.php');
        exit;
    }
    $error = $res['error'] ?? '儲存失敗';
    $row = [
        'id' => (int) ($_POST['id'] ?? 0),
        'email' => $_POST['email'] ?? '',
        'display_name' => $_POST['display_name'] ?? '',
        'is_active' => isset($_POST['is_active']) ? 1 : 0,
    ];
    $roleIds = isset($_POST['roles']) && is_array($_POST['roles']) ? array_map('intval', $_POST['roles']) : [];
}

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $id ? '編輯使用者' : '新增使用者'; ?> | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white shadow">
        <div class="max-w-xl mx-auto px-4 py-4 flex justify-between">
            <h1 class="font-bold"><?php echo $id ? '編輯使用者' : '新增使用者'; ?></h1>
            <a href="users.php" class="text-sm text-slate-300 hover:text-white">返回</a>
        </div>
    </header>
    <main class="max-w-xl mx-auto px-4 py-8">
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm mb-4"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <form method="post" class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="id" value="<?php echo (int) ($row['id'] ?? 0); ?>">
            <div>
                <label class="block text-sm font-medium text-slate-700">電郵</label>
                <input type="email" name="email" required value="<?php echo htmlspecialchars((string) ($row['email'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2" <?php echo ($row['email'] ?? '') === 'system@science-sims.internal' ? 'readonly' : ''; ?>>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">顯示名稱</label>
                <input type="text" name="display_name" required value="<?php echo htmlspecialchars((string) ($row['display_name'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">密碼<?php echo $id ? '（留空則不變更）' : '（至少 8 字元）'; ?></label>
                <input type="password" name="password" class="mt-1 w-full border rounded-lg px-3 py-2" <?php echo $id ? '' : 'required minlength="8"'; ?> autocomplete="new-password">
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" name="is_active" id="is_active" value="1" <?php echo !isset($row['is_active']) || (int) $row['is_active'] ? 'checked' : ''; ?> <?php echo ($row['email'] ?? '') === 'system@science-sims.internal' ? 'disabled' : ''; ?>>
                <label for="is_active" class="text-sm text-slate-700">啟用</label>
            </div>
            <?php if (($row['email'] ?? '') === 'system@science-sims.internal'): ?>
                <input type="hidden" name="is_active" value="1">
            <?php endif; ?>
            <div>
                <span class="block text-sm font-medium text-slate-700 mb-2">角色</span>
                <?php foreach ($allRoles as $ar): ?>
                    <label class="flex items-center gap-2 mb-1">
                        <input type="checkbox" name="roles[]" value="<?php echo (int) $ar['id']; ?>" <?php echo in_array((int) $ar['id'], $roleIds, true) ? 'checked' : ''; ?>>
                        <span class="text-sm"><?php echo htmlspecialchars($ar['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                    </label>
                <?php endforeach; ?>
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
        </form>
    </main>
</body>
</html>
