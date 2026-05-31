<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();
require_permission('worksheet.manage_any', '../login.php?next=' . rawurlencode('admin/worksheets.php'));

$pdo = db();
$list = $pdo->query('SELECT id, slug, title_zh, title_en, status, updated_at FROM worksheets ORDER BY updated_at DESC')->fetchAll() ?: [];

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>工作紙 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white shadow px-4 py-4">
        <div class="max-w-5xl mx-auto flex justify-between">
            <h1 class="font-bold">工作紙</h1>
            <nav class="text-sm flex gap-3">
                <a href="index.php" class="text-slate-300">後台</a>
                <a href="worksheet_edit.php" class="text-indigo-300">新增</a>
                <a href="review_queue.php" class="text-amber-300">審核佇列</a>
            </nav>
        </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">
        <div class="bg-white rounded-xl border overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100"><tr><th class="p-3 text-left">標題</th><th class="p-3">slug</th><th class="p-3">狀態</th><th class="p-3">更新</th><th class="p-3"></th></tr></thead>
                <tbody>
                <?php foreach ($list as $row): ?>
                    <tr class="border-t">
                        <td class="p-3"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs"><?php echo htmlspecialchars((string) $row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><a href="worksheet_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600">編輯</a></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$list): ?>
                    <tr><td colspan="5" class="p-6 text-center text-slate-500">尚無工作紙。</td></tr>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
    </main>
</body>
</html>
