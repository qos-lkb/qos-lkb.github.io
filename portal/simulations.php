<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/simulation_save.php';

bootstrap_public();
require_permission('simulation.manage_own', '../login.php?next=' . rawurlencode('portal/simulations.php'));

$pdo = db();
$u = current_user();
assert($u !== null);

$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    $r = simulation_delete_from_request($pdo, $u, $_POST, false);
    $flash = $r['ok'] ? '已刪除。' : ($r['error'] ?? '錯誤');
}

$stmt = $pdo->prepare(
    'SELECT s.id, s.slug, s.title_zh, s.title_en, s.status, s.updated_at
     FROM simulations s
     WHERE s.owner_user_id = ?
     ORDER BY s.updated_at DESC'
);
$stmt->execute([$u['id']]);
$list = $stmt->fetchAll() ?: [];

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的模擬 | <?php echo htmlspecialchars(config_site_title_bilingual(), ENT_QUOTES, 'UTF-8'); ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-indigo-900 text-white shadow">
        <div class="max-w-5xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-2">
            <h1 class="font-bold text-lg">我的模擬</h1>
            <nav class="flex gap-3 text-sm">
                <a href="../index.php" class="text-indigo-200 hover:text-white">首頁</a>
                <a href="simulation_edit.php" class="text-indigo-200 hover:text-white">新增</a>
                <?php if (user_has_permission('user.manage')): ?>
                    <a href="../admin/index.php" class="text-amber-300 hover:text-white">管理後台</a>
                <?php endif; ?>
                <a href="../logout.php" class="text-indigo-200 hover:text-white">登出</a>
            </nav>
        </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">
        <?php if ($flash !== ''): ?>
            <p class="mb-4 text-sm <?php echo str_contains($flash, '錯誤') || str_contains($flash, '無權') ? 'text-red-600' : 'text-green-700'; ?>"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <a href="simulation_edit.php" class="inline-block mb-6 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">新增模擬</a>
        <div class="bg-white rounded-xl shadow border border-slate-200 overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">標題</th>
                        <th class="p-3">slug</th>
                        <th class="p-3">狀態</th>
                        <th class="p-3">更新</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($list as $row): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-slate-500"><?php echo htmlspecialchars($row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <a href="simulation_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600 hover:underline">編輯</a>
                            <form method="post" class="inline ml-2" onsubmit="return confirm('確定刪除？');">
                                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo (int) $row['id']; ?>">
                                <button type="submit" class="text-red-600 hover:underline">刪除</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (count($list) === 0): ?>
                    <tr><td colspan="5" class="p-6 text-slate-500">尚無模擬，請新增。</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </main>
</body>
</html>
