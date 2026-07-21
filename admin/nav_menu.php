<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';
require_once dirname(__DIR__) . '/includes/spa_nav_lib.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/nav_menu.php'));

$pdo = db();
$error = '';
$ok = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $error = 'CSRF 驗證失敗。';
    } else {
        $vis = isset($_POST['vis']) && is_array($_POST['vis']) ? $_POST['vis'] : [];
        $r = spa_nav_save_matrix($pdo, $vis);
        if ($r['ok']) {
            $ok = '已更新前台上方選單可見性。';
        } else {
            $error = $r['error'] ?? '儲存失敗。';
        }
    }
}

$matrix = spa_nav_get_matrix($pdo);
$items = spa_nav_item_defs();
$audiences = spa_nav_audience_defs();
$tableOk = spa_nav_table_exists($pdo);

admin_page_start('前台選單可見性', 'nav_menu', [
    'subtitle' => '依訪客／學生／教師／管理員控制 SPA 上方選單顯示項目。',
]);
?>

<?php if ($ok !== ''): ?>
    <div class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><?php echo htmlspecialchars($ok, ENT_QUOTES, 'UTF-8'); ?></div>
<?php endif; ?>
<?php if ($error !== ''): ?>
    <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
<?php endif; ?>

<?php if (!$tableOk): ?>
    <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        尚未建立資料表 <code class="font-mono">spa_nav_visibility</code>。請在資料庫執行：
        <code class="block mt-2 font-mono text-xs">mysql … &lt; schema_spa_nav_visibility.sql</code>
        （或重新匯入完整 <code class="font-mono">schema.sql</code>）。目前前台仍會顯示全部選單項目。
    </div>
<?php endif; ?>

<div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-slate-100">
        <h2 class="font-bold text-slate-900">上方選單矩陣</h2>
        <p class="text-sm text-slate-600 mt-1">勾選表示該類使用者可在前台看到該選單。同一使用者若兼具多個角色，只要其中一個角色勾選即顯示。</p>
    </div>
    <form method="post" class="p-4 md:p-5 overflow-x-auto">
        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
        <table class="min-w-full text-sm border-collapse">
            <thead>
                <tr class="bg-slate-50 text-left">
                    <th class="p-3 border-b border-slate-200 font-semibold text-slate-700 sticky left-0 bg-slate-50">選單項目</th>
                    <?php foreach ($audiences as $aud): ?>
                        <th class="p-3 border-b border-slate-200 font-semibold text-slate-700 text-center whitespace-nowrap">
                            <?php echo htmlspecialchars($aud['label_zh'], ENT_QUOTES, 'UTF-8'); ?>
                        </th>
                    <?php endforeach; ?>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($items as $item): ?>
                    <tr class="border-b border-slate-100 hover:bg-slate-50/80">
                        <td class="p-3 sticky left-0 bg-white font-medium text-slate-900 whitespace-nowrap">
                            <?php echo htmlspecialchars($item['label_zh'], ENT_QUOTES, 'UTF-8'); ?>
                            <span class="block text-xs font-normal text-slate-500"><?php echo htmlspecialchars($item['label_en'], ENT_QUOTES, 'UTF-8'); ?></span>
                        </td>
                        <?php foreach ($audiences as $aud):
                            $checked = !empty($matrix[$item['key']][$aud['key']]);
                            $id = 'vis_' . $item['key'] . '_' . $aud['key'];
                            ?>
                            <td class="p-3 text-center">
                                <label class="inline-flex items-center justify-center cursor-pointer" for="<?php echo htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); ?>">
                                    <input
                                        type="checkbox"
                                        id="<?php echo htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); ?>"
                                        name="vis[<?php echo htmlspecialchars($item['key'], ENT_QUOTES, 'UTF-8'); ?>][<?php echo htmlspecialchars($aud['key'], ENT_QUOTES, 'UTF-8'); ?>]"
                                        value="1"
                                        class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        <?php echo $checked ? 'checked' : ''; ?>
                                        <?php echo $tableOk ? '' : 'disabled'; ?>
                                    >
                                </label>
                            </td>
                        <?php endforeach; ?>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <div class="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" class="admin-action-btn admin-action-btn-primary" <?php echo $tableOk ? '' : 'disabled'; ?>>儲存設定</button>
            <button type="button" id="nav-check-all" class="admin-action-btn admin-action-btn-secondary" <?php echo $tableOk ? '' : 'disabled'; ?>>全部勾選</button>
            <button type="button" id="nav-uncheck-all" class="admin-action-btn admin-action-btn-secondary" <?php echo $tableOk ? '' : 'disabled'; ?>>全部取消</button>
        </div>
    </form>
</div>

<script>
(function () {
    const form = document.querySelector('form');
    if (!form) return;
    document.getElementById('nav-check-all')?.addEventListener('click', () => {
        form.querySelectorAll('input[type=checkbox]').forEach((el) => { el.checked = true; });
    });
    document.getElementById('nav-uncheck-all')?.addEventListener('click', () => {
        form.querySelectorAll('input[type=checkbox]').forEach((el) => { el.checked = false; });
    });
})();
</script>

<?php
admin_page_end();
