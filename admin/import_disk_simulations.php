<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';
require_once dirname(__DIR__) . '/includes/simulation_disk_import.php';

bootstrap_public();
$login = rtrim(admin_site_base(), '/') . '/login.php';
require_any_permission(['simulation.manage_any', 'user.manage'], $login);

$pdo = db();
$user = current_user();
if ($user === null) {
    header('Location: ' . $login);
    exit;
}

$error = '';
$notice = '';
$search = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
$statusPost = (string) ($_POST['status'] ?? 'draft');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!verify_csrf(isset($_POST['csrf']) ? (string) $_POST['csrf'] : null)) {
        $error = 'CSRF 驗證失敗，請重新整理頁面。';
    } else {
        $action = (string) ($_POST['action'] ?? '');
        $paths = [];
        if ($action === 'import_selected') {
            $paths = isset($_POST['paths']) && is_array($_POST['paths']) ? array_map('strval', $_POST['paths']) : [];
        } elseif ($action === 'import_all') {
            $scan = sim_unregistered_disk_plan($pdo, $search);
            foreach ($scan['items'] as $item) {
                if ($item['importable'] ?? false) {
                    $paths[] = (string) $item['path'];
                }
            }
        } else {
            $error = '不支援的動作。';
        }

        if ($error === '' && $paths !== []) {
            $canPublish = user_has_permission('simulation.manage_any');
            $result = sim_disk_import_execute($pdo, $paths, (int) $user['id'], $statusPost, $canPublish);
            if (!$result['ok']) {
                $error = (string) ($result['error'] ?? '匯入失敗。');
            }
            $notice = '新增 ' . (int) $result['created'] . ' 筆、連結 html_path ' . (int) $result['linked'] . ' 筆，略過 ' . (int) $result['skipped'] . ' 筆。';
            if ($result['errors'] !== []) {
                $error = ($error !== '' ? $error . ' ' : '') . '部分失敗：' . implode('；', array_slice($result['errors'], 0, 5));
            }
        } elseif ($error === '' && $paths === []) {
            $error = '沒有選取任何檔案。';
        }
    }
}

$plan = sim_unregistered_disk_plan($pdo, $search);

$labels = [
    'unregistered' => '磁碟有檔、目錄無紀錄（將新建）',
    'slug_exists' => 'slug 已存在（只補 html_path）',
    'total' => '符合搜尋',
];

admin_page_start('磁碟模擬匯入', 'import_disk_simulations', [
    'subtitle' => '搜尋科目資料夾內尚未登錄 simulations 的 HTML，批次寫入資料庫並設定 html_path。',
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

<div class="grid sm:grid-cols-3 gap-3 mb-4">
    <?php foreach ($labels as $key => $label): ?>
        <div class="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div class="text-xs text-slate-500"><?php echo htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></div>
            <div class="text-2xl font-bold text-slate-900"><?php echo (int) ($plan['counts'][$key] ?? 0); ?></div>
        </div>
    <?php endforeach; ?>
</div>

<form method="get" class="flex flex-wrap gap-2 mb-4 items-center">
    <label class="text-sm text-slate-600" for="q">搜尋</label>
    <input id="q" name="q" type="search" value="<?php echo htmlspecialchars($search, ENT_QUOTES, 'UTF-8'); ?>" placeholder="路徑、slug、標題…" class="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[16rem]">
    <button type="submit" class="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-900">搜尋</button>
    <?php if ($search !== ''): ?>
        <a href="import_disk_simulations.php" class="text-sm text-slate-600 hover:underline">清除</a>
    <?php endif; ?>
</form>

<p class="text-sm text-slate-600 mb-4">已透過 html_path 或 slug 對應的檔案不會列在下方。標題優先取自 only_sims <code>library.json</code> 或 HTML <code>&lt;title&gt;</code>。</p>

<form method="post">
    <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
    <div class="flex flex-wrap gap-2 mb-3 items-center">
        <label class="text-sm text-slate-600" for="status">匯入狀態</label>
        <select id="status" name="status" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="draft" <?php echo $statusPost === 'draft' ? 'selected' : ''; ?>>草稿</option>
            <option value="pending_review" <?php echo $statusPost === 'pending_review' ? 'selected' : ''; ?>>待審</option>
            <?php if (user_has_permission('simulation.manage_any')): ?>
                <option value="published" <?php echo $statusPost === 'published' ? 'selected' : ''; ?>>已發布</option>
            <?php endif; ?>
        </select>
        <button type="submit" name="action" value="import_selected" class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm hover:bg-indigo-800" <?php echo $plan['has_path_column'] ? '' : 'disabled'; ?>>匯入已勾選</button>
        <button type="submit" name="action" value="import_all" class="px-4 py-2 rounded-lg border border-indigo-400 text-indigo-900 text-sm hover:bg-indigo-50" <?php echo $plan['has_path_column'] ? '' : 'disabled'; ?> onclick="return confirm('確定匯入目前列表中的全部項目？');">匯入目前列表全部</button>
    </div>

    <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-slate-500">
                <tr>
                    <th class="px-3 py-2 font-medium w-10"><input type="checkbox" id="check-all" class="rounded border-slate-300"></th>
                    <th class="px-3 py-2 font-medium">路徑</th>
                    <th class="px-3 py-2 font-medium">建議 slug</th>
                    <th class="px-3 py-2 font-medium">標題</th>
                    <th class="px-3 py-2 font-medium">類型</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($plan['items'] as $item): ?>
                    <tr class="border-t border-slate-100 align-top">
                        <td class="px-3 py-2">
                            <input type="checkbox" name="paths[]" value="<?php echo htmlspecialchars((string) $item['path'], ENT_QUOTES, 'UTF-8'); ?>" class="path-check rounded border-slate-300" checked>
                        </td>
                        <td class="px-3 py-2 font-mono text-xs"><?php echo htmlspecialchars((string) $item['path'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="px-3 py-2 font-mono text-xs"><?php echo htmlspecialchars((string) $item['proposed_slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="px-3 py-2">
                            <div><?php echo htmlspecialchars((string) $item['title_zh'], ENT_QUOTES, 'UTF-8'); ?></div>
                            <?php if (($item['title_en'] ?? '') !== '' && $item['title_en'] !== $item['title_zh']): ?>
                                <div class="text-xs text-slate-500"><?php echo htmlspecialchars((string) $item['title_en'], ENT_QUOTES, 'UTF-8'); ?></div>
                            <?php endif; ?>
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap text-xs">
                            <?php echo ($item['kind'] ?? '') === 'slug_exists' ? '補連結' : '新建'; ?>
                            <?php if (!empty($item['existing_sim_id'])): ?>
                                <span class="text-slate-400">#<?php echo (int) $item['existing_sim_id']; ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
                <?php if ($plan['items'] === []): ?>
                    <tr><td colspan="5" class="px-3 py-6 text-slate-500">沒有未登錄的模擬檔案<?php echo $search !== '' ? '（請調整搜尋）' : ''; ?>。</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</form>

<script>
(function () {
    const all = document.getElementById('check-all');
    const boxes = document.querySelectorAll('.path-check');
    if (!all) return;
    all.addEventListener('change', function () {
        boxes.forEach(function (el) { el.checked = all.checked; });
    });
})();
</script>

<?php admin_page_end(); ?>