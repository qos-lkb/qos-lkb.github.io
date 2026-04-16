<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulation_save.php';

bootstrap_public();
require_permission('simulation.manage_any', '../login.php?next=' . rawurlencode('admin/simulations.php'));

$pdo = db();
$u = current_user();
assert($u !== null);

$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    $r = simulation_delete_from_request($pdo, $u, $_POST, true);
    $flash = $r['ok'] ? '已刪除。' : ($r['error'] ?? '錯誤');
}

$list = $pdo->query(
    'SELECT s.id, s.slug, s.title_zh, s.title_en, s.status, s.updated_at, s.list_sort_order,
            sub.name_zh AS subject_zh, sub.name_en AS subject_en,
            t.name_zh AS topic_zh, t.name_en AS topic_en,
            u.email AS owner_email
     FROM simulations s
     LEFT JOIN users u ON u.id = s.owner_user_id
     LEFT JOIN subjects sub ON sub.id = s.subject_id
     LEFT JOIN topics t ON t.id = s.topic_id
     ORDER BY COALESCE(sub.sort_order, 999999) ASC, sub.name_en ASC,
              COALESCE(t.sort_order, 999999) ASC, t.name_en ASC,
              s.list_sort_order ASC, s.updated_at DESC'
)->fetchAll() ?: [];

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全部模擬 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white shadow">
        <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-2">
            <h1 class="font-bold">全部模擬</h1>
            <nav class="flex gap-3 text-sm">
                <a href="index.php" class="text-slate-300 hover:text-white">後台</a>
                <a href="simulation_edit.php" class="text-indigo-300 hover:text-white">新增</a>
            </nav>
        </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 py-8">
        <?php if ($flash !== ''): ?>
            <p class="mb-4 text-sm text-slate-700"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">標題</th>
                        <th class="p-3">slug</th>
                        <th class="p-3">科目</th>
                        <th class="p-3">單元</th>
                        <th class="p-3">列表排序</th>
                        <th class="p-3">擁有者</th>
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
                        <td class="p-3 text-xs text-slate-600"><?php
                            $szh = trim((string) ($row['subject_zh'] ?? ''));
                            $sen = trim((string) ($row['subject_en'] ?? ''));
                            $sout = ($szh === '' && $sen === '') ? '—' : ($szh === '' ? $sen : ($sen !== '' ? $szh . ' / ' . $sen : $szh));
                            echo htmlspecialchars($sout, ENT_QUOTES, 'UTF-8');
                        ?></td>
                        <td class="p-3 text-xs text-slate-600"><?php
                            $tzh = trim((string) ($row['topic_zh'] ?? ''));
                            $ten = trim((string) ($row['topic_en'] ?? ''));
                            $tout = ($tzh === '' && $ten === '') ? '—' : ($tzh === '' ? $ten : ($ten !== '' ? $tzh . ' / ' . $ten : $tzh));
                            echo htmlspecialchars($tout, ENT_QUOTES, 'UTF-8');
                        ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo (int) ($row['list_sort_order'] ?? 0); ?></td>
                        <td class="p-3 text-xs"><?php echo htmlspecialchars((string) $row['owner_email'], ENT_QUOTES, 'UTF-8'); ?></td>
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
                </tbody>
            </table>
        </div>
    </main>
</body>
</html>
