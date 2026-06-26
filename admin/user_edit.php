<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/user_admin.php';
require_once dirname(__DIR__) . '/includes/user_names_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

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

$allRoles = admin_fetch_roles_with_permissions($pdo);

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
        'name_zh' => $_POST['name_zh'] ?? '',
        'name_en' => $_POST['name_en'] ?? '',
        'is_active' => isset($_POST['is_active']) ? 1 : 0,
    ];
    $roleIds = isset($_POST['roles']) && is_array($_POST['roles']) ? array_map('intval', $_POST['roles']) : [];
}

admin_page_start($id ? '編輯使用者' : '新增使用者', 'users', [
    'actions' => admin_btn('users.php', '返回列表', 'secondary'),
]);
?>
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <form method="post" class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="id" value="<?php echo (int) ($row['id'] ?? 0); ?>">
            <div>
                <label class="block text-sm font-medium text-slate-700">電郵</label>
                <input type="email" name="email" required value="<?php echo htmlspecialchars((string) ($row['email'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2" <?php echo ($row['email'] ?? '') === 'system@science-sims.internal' ? 'readonly' : ''; ?>>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700">中文名</label>
                    <input type="text" name="name_zh" value="<?php echo htmlspecialchars((string) ($row['name_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2" maxlength="120">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">英文名</label>
                    <input type="text" name="name_en" value="<?php echo htmlspecialchars((string) ($row['name_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2" maxlength="120">
                </div>
            </div>
            <p class="text-xs text-slate-500 -mt-2">至少填寫中文名或英文名其中一項。</p>
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
                <div class="grid sm:grid-cols-2 gap-2">
                <?php foreach ($allRoles as $ar): ?>
                    <label class="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                        <input type="checkbox" name="roles[]" value="<?php echo (int) $ar['id']; ?>" <?php echo in_array((int) $ar['id'], $roleIds, true) ? 'checked' : ''; ?>>
                        <span class="text-sm">
                            <span class="text-slate-800"><?php echo htmlspecialchars(admin_role_display_name((string) $ar['name']), ENT_QUOTES, 'UTF-8'); ?></span>
                            <span class="block text-xs text-slate-400 font-mono"><?php echo htmlspecialchars((string) $ar['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                        </span>
                    </label>
                <?php endforeach; ?>
                </div>
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
        </form>
<?php
admin_page_end();
