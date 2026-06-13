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

$permissionGroups = admin_permissions_grouped($pdo);
$roles = admin_fetch_roles_with_permissions($pdo);
$roleDescriptions = admin_role_descriptions();
$roleCount = count($roles);

$error = '';
$ok = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $res = admin_save_all_role_permissions_from_post($pdo, $_POST, $acting['id']);
    if ($res['ok']) {
        $ok = '已更新所有角色權限。';
        $roles = admin_fetch_roles_with_permissions($pdo);
    } else {
        $error = $res['error'] ?? '儲存失敗。';
    }
}

$checked = [];
foreach ($roles as $role) {
    $rid = (int) $role['id'];
    $checked[$rid] = [];
    foreach ($role['permission_ids'] as $pid) {
        $checked[$rid][(int) $pid] = true;
    }
}

admin_page_start('角色權限', 'permissions', ['wide' => true]);
?>
        <div class="perm-page space-y-4">
            <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p class="text-sm text-slate-600 leading-relaxed">
                    橫列為<strong>角色</strong>、直欄為<strong>權限</strong>；勾選後按儲存。若要變更個別使用者的角色，請至
                    <a href="users.php" class="text-indigo-600 hover:underline">使用者管理</a>。
                </p>
            </div>

            <?php if ($error !== ''): ?>
                <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>
            <?php if ($ok !== ''): ?>
                <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><?php echo htmlspecialchars($ok, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>

            <?php if ($roles === []): ?>
                <p class="text-slate-500 text-sm">尚無角色資料。</p>
            <?php else: ?>
            <form method="post" class="perm-matrix-form bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">

                <div class="perm-matrix-scroll overflow-x-auto">
                    <table class="perm-matrix min-w-full text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-100 border-b border-slate-200">
                                <th class="perm-matrix-sticky-col perm-matrix-perm-head p-3 text-left font-semibold text-slate-700 min-w-[14rem]">
                                    權限
                                </th>
                                <?php foreach ($roles as $role): ?>
                                    <?php $slug = (string) $role['name']; ?>
                                    <th class="perm-matrix-role-head p-3 text-center font-semibold text-slate-700 min-w-[7rem]"
                                        title="<?php echo htmlspecialchars($roleDescriptions[$slug] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
                                        <span class="block"><?php echo htmlspecialchars(admin_role_display_name($slug), ENT_QUOTES, 'UTF-8'); ?></span>
                                        <span class="block text-xs font-normal font-mono text-slate-400 mt-0.5"><?php echo htmlspecialchars($slug, ENT_QUOTES, 'UTF-8'); ?></span>
                                    </th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($permissionGroups as $group): ?>
                                <?php if ($group['permissions'] === []) {
                                    continue;
                                } ?>
                                <tr class="perm-matrix-group-row">
                                    <td class="perm-matrix-sticky-col perm-matrix-group-cell p-2 pl-3 font-semibold text-slate-600 text-xs uppercase tracking-wide bg-indigo-50/60 border-y border-indigo-100" colspan="<?php echo $roleCount + 1; ?>">
                                        <?php echo htmlspecialchars($group['label'], ENT_QUOTES, 'UTF-8'); ?>
                                    </td>
                                </tr>
                                <?php foreach ($group['permissions'] as $perm): ?>
                                    <?php
                                    $pid = (int) $perm['id'];
                                    $permLabel = (string) $perm['label'];
                                    $permName = (string) $perm['name'];
                                    ?>
                                    <tr class="perm-matrix-row border-b border-slate-100 hover:bg-slate-50/80">
                                        <td class="perm-matrix-sticky-col perm-matrix-perm-cell p-3 align-middle bg-white">
                                            <span class="block text-slate-800 leading-snug"><?php echo htmlspecialchars($permLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                                            <?php if (!empty($perm['description'])): ?>
                                                <span class="block text-xs text-slate-500 mt-0.5 leading-snug"><?php echo htmlspecialchars((string) $perm['description'], ENT_QUOTES, 'UTF-8'); ?></span>
                                            <?php endif; ?>
                                            <span class="block text-xs font-mono text-slate-400 mt-0.5"><?php echo htmlspecialchars($permName, ENT_QUOTES, 'UTF-8'); ?></span>
                                        </td>
                                        <?php foreach ($roles as $role): ?>
                                            <?php
                                            $rid = (int) $role['id'];
                                            $isChecked = !empty($checked[$rid][$pid]);
                                            $ariaLabel = admin_role_display_name((string) $role['name']) . ' — ' . $permLabel;
                                            ?>
                                            <td class="perm-matrix-check-cell p-3 text-center align-middle">
                                                <label class="perm-matrix-check-label inline-flex items-center justify-center w-full min-h-[2.5rem] cursor-pointer rounded-lg hover:bg-indigo-50/50">
                                                    <input type="checkbox"
                                                        class="perm-matrix-checkbox w-4 h-4 accent-indigo-600"
                                                        name="role_perms[<?php echo $rid; ?>][]"
                                                        value="<?php echo $pid; ?>"
                                                        <?php echo $isChecked ? 'checked' : ''; ?>
                                                        aria-label="<?php echo htmlspecialchars($ariaLabel, ENT_QUOTES, 'UTF-8'); ?>">
                                                </label>
                                            </td>
                                        <?php endforeach; ?>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <div class="perm-matrix-foot px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                    <p class="text-xs text-slate-500">若移除自己所屬角色在「管理使用者與角色」的勾選，系統會阻止儲存。</p>
                    <button type="submit" class="admin-action-btn admin-action-btn-primary">儲存全部角色權限</button>
                </div>
            </form>
            <?php endif; ?>
        </div>
<?php
admin_page_end();
