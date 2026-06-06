<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/user_admin.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/permissions.php'));

$pdo = db();
$acting = current_user();
assert($acting !== null);

$permissions = admin_fetch_permissions($pdo);
$roles = admin_fetch_roles_with_permissions($pdo);

$error = '';
$ok = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $res = admin_save_role_permissions_from_post($pdo, $_POST, $acting['id']);
    if ($res['ok']) {
        $ok = '已更新角色權限。';
        $roles = admin_fetch_roles_with_permissions($pdo);
    } else {
        $error = $res['error'] ?? '儲存失敗。';
    }
}

$roleLabels = [
    'admin' => '管理員',
    'user' => '一般使用者',
    'contributor' => '貢獻者',
];

function admin_role_display_name(string $name, array $roleLabels): string
{
    $key = strtolower($name);
    return $roleLabels[$key] ?? $name;
}

admin_page_start('角色權限', 'permissions');
?>
        <p class="text-sm text-slate-600">
            在此調整各<strong>角色</strong>擁有的權限。使用者的實際權限由其被指派的角色決定；若要變更個別使用者的角色，請至
            <a href="users.php" class="text-indigo-600 hover:underline">使用者管理</a>。
        </p>

        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php if ($ok !== ''): ?>
            <p class="text-green-700 text-sm"><?php echo htmlspecialchars($ok, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>

        <?php if ($roles === []): ?>
            <p class="text-slate-500 text-sm">尚無角色資料。</p>
        <?php endif; ?>

        <?php foreach ($roles as $role): ?>
            <form method="post" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="role_id" value="<?php echo (int) $role['id']; ?>">
                <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
                    <h2 class="text-lg font-semibold text-slate-900">
                        <?php echo htmlspecialchars(admin_role_display_name($role['name'], $roleLabels), ENT_QUOTES, 'UTF-8'); ?>
                    </h2>
                    <span class="text-xs font-mono text-slate-400"><?php echo htmlspecialchars($role['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
                <div class="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    <?php foreach ($permissions as $perm): ?>
                        <label class="flex items-start gap-2 py-1">
                            <input type="checkbox"
                                name="permissions[]"
                                value="<?php echo (int) $perm['id']; ?>"
                                class="mt-1"
                                <?php echo in_array((int) $perm['id'], $role['permission_ids'], true) ? 'checked' : ''; ?>>
                            <span class="text-sm">
                                <span class="text-slate-800"><?php echo htmlspecialchars($perm['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                                <span class="block text-xs text-slate-400 font-mono"><?php echo htmlspecialchars($perm['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                            </span>
                        </label>
                    <?php endforeach; ?>
                </div>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
                    儲存此角色權限
                </button>
            </form>
        <?php endforeach; ?>
<?php
admin_page_end();
