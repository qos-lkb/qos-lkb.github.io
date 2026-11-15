<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';
require_once dirname(__DIR__) . '/includes/simulation_files.php';

bootstrap_public();
$login = rtrim(admin_site_base(), '/') . '/login.php';
require_any_permission(['simulation.manage_any', 'user.manage'], $login);

$pdo = db();
$error = '';
$notice = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!verify_csrf(isset($_POST['csrf']) ? (string) $_POST['csrf'] : null)) {
        $error = 'CSRF 驗證失敗，請重新整理頁面。';
        $plan = sim_export_plan($pdo);
    } else {
        $mode = (string) ($_POST['mode'] ?? '');
        $result = sim_export_execute($pdo, $mode);
        $plan = $result['plan'];
        if (!$result['ok']) {
            $error = (string) ($result['error'] ?? '匯出失敗。');
        } else {
            $notice = '已寫入 ' . (int) $result['written'] . ' 個檔案，記錄路徑 ' . (int) $result['linked'] . ' 筆，略過 ' . (int) $result['skipped'] . ' 筆。';
        }
    }
} else {
    $plan = sim_export_plan($pdo);
}

$labels = [
    'ready' => '已對應',
    'same' => '內容相同（待記錄路徑）',
    'create' => '將新建檔案',
    'differ' => '內容不同（預設略過）',
    'disk_only' => '僅磁碟有檔（待採用）',
    'empty' => 'HTML 空白',
    'ambiguous' => '多於一個檔案',
];

admin_page_start('模擬 HTML 匯出', 'export_sim_html', [
    'subtitle' => '把資料庫裡的 HTML 寫回科目資料夾，並記入 html_path。目錄、狀態與標籤仍留在 simulations。',
    'wide' => true,
]);
?>
<?php if ($error !== ''): ?>
    <p class="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
<?php endif; ?>
<?php if ($notice !== ''): ?>
    <p class="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm"><?php echo htmlspecialchars($notice, ENT_QUOTES, 'UTF-8'); ?></p>
<?php endif; ?>

<?php if (!$plan['has_path_column']): ?>
    <p class="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">資料庫尚未有 html_path。請先執行 <code>php scripts/apply_schema.php</code>。</p>
<?php endif; ?>

<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <?php foreach ($labels as $key => $label): ?>
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500"><?php echo htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></div>
            <div class="text-2xl font-bold text-slate-900"><?php echo (int) ($plan['counts'][$key] ?? 0); ?></div>
        </div>
    <?php endforeach; ?>
</div>

<?php if ($plan['created_dirs'] !== []): ?>
    <p class="text-sm text-slate-600">已建立缺少的科目資料夾：<?php echo htmlspecialchars(implode('、', $plan['created_dirs']), ENT_QUOTES, 'UTF-8'); ?></p>
<?php endif; ?>

<p class="text-sm text-slate-600">資料庫有紀錄時，以資料庫的 HTML 覆蓋原有模擬檔；沒有檔才新建。內容相同只補路徑。HTML 空白不會產生檔案。</p>

<form method="post" class="flex flex-wrap gap-2">
    <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
    <button type="submit" name="mode" value="apply" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800" <?php echo $plan['has_path_column'] ? '' : 'disabled'; ?>>以資料庫覆蓋原有 HTML</button>
    <button type="submit" name="mode" value="overwrite" class="px-4 py-2 rounded-lg border border-amber-400 text-amber-900 text-sm hover:bg-amber-50" <?php echo $plan['has_path_column'] ? '' : 'disabled'; ?>>只覆蓋內容不同的檔</button>
    <button type="submit" name="mode" value="adopt" class="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50" <?php echo $plan['has_path_column'] ? '' : 'disabled'; ?>>採用磁碟版（只記錄路徑）</button>
</form>

<?php if ($plan['ready']): ?>
    <p class="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm">每一列都有對應檔案。確認無誤後可執行 <code>php scripts/drop_simulations_html_column.php</code> 刪除 html 欄。</p>
<?php else: ?>
    <p class="text-sm text-slate-500">尚有未完成項目時，不要刪除 html 欄。</p>
<?php endif; ?>

<div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
    <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
            <tr>
                <th class="px-3 py-2 font-medium">ID</th>
                <th class="px-3 py-2 font-medium">標題</th>
                <th class="px-3 py-2 font-medium">狀態</th>
                <th class="px-3 py-2 font-medium">路徑</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($plan['items'] as $item): ?>
                <tr class="border-t border-slate-100 align-top">
                    <td class="px-3 py-2 font-mono text-xs"><?php echo (int) $item['id']; ?></td>
                    <td class="px-3 py-2">
                        <div><?php echo htmlspecialchars((string) $item['title'], ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="text-xs text-slate-400 font-mono"><?php echo htmlspecialchars((string) $item['slug'], ENT_QUOTES, 'UTF-8'); ?></div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap"><?php echo htmlspecialchars($labels[$item['status']] ?? (string) $item['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                    <td class="px-3 py-2 font-mono text-xs">
                        <?php echo htmlspecialchars((string) ($item['path'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                        <?php if (($item['candidates'] ?? []) !== [] && $item['status'] === 'ambiguous'): ?>
                            <div class="mt-1 text-amber-800">
                                <?php echo htmlspecialchars(implode('、', $item['candidates']), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            <?php if ($plan['items'] === []): ?>
                <tr><td colspan="4" class="px-3 py-6 text-slate-500">沒有模擬紀錄。</td></tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>
<?php
admin_page_end();
