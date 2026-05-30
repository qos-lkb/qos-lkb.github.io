<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();
require_permission('learning_tool.manage_own', '../login.php?next=' . rawurlencode('portal/learning_tools.php'));

$pdo = db();
$u = current_user();
assert($u !== null);

$stmt = $pdo->prepare('SELECT id, slug, title_zh, title_en, status, updated_at FROM learning_tools WHERE owner_user_id = ? ORDER BY updated_at DESC');
$stmt->execute([$u['id']]);
$list = $stmt->fetchAll() ?: [];

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的學習工具 | Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white px-4 py-4">
        <div class="max-w-4xl mx-auto flex justify-between">
            <h1 class="font-bold">我的互動學習工具</h1>
            <nav class="text-sm flex gap-3">
                <a href="simulations.php" class="text-slate-300">我的模擬</a>
                <a href="articles.php" class="text-slate-300">我的文章</a>
                <a href="learning_tool_edit.php" class="text-indigo-300">新增</a>
            </nav>
        </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">
        <div class="bg-white rounded-xl border overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100"><tr><th class="p-3 text-left">標題</th><th class="p-3">狀態</th><th class="p-3"></th></tr></thead>
                <tbody>
                <?php foreach ($list as $row): ?>
                    <tr class="border-t">
                        <td class="p-3"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><a href="learning_tool_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600">編輯</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </main>
</body>
</html>
