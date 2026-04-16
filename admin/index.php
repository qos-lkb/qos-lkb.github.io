<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();

if (current_user() === null) {
    header('Location: ../login.php?next=' . rawurlencode('admin/index.php'));
    exit;
}

$u = user_has_permission('user.manage');
$s = user_has_permission('simulation.manage_any');
if (!$u && !$s) {
    http_response_code(403);
    exit('沒有權限');
}

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理後台 | Science Sims</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white shadow">
        <div class="max-w-3xl mx-auto px-4 py-6">
            <h1 class="text-xl font-bold">管理後台</h1>
            <p class="text-slate-400 text-sm mt-1"><a href="../index.php" class="underline hover:text-white">首頁</a> · <a href="../portal/simulations.php" class="underline hover:text-white">我的模擬</a> · <a href="../logout.php" class="underline hover:text-white">登出</a></p>
        </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-8 space-y-3">
        <?php if ($u): ?>
            <a href="users.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">使用者與角色</a>
            <a href="subjects.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">科目與課題</a>
        <?php endif; ?>
        <?php if ($s): ?>
            <a href="simulations.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">全部模擬</a>
            <a href="../tools/import_index_csv.php" class="block bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">從 index.csv 匯入（僅限空庫）</a>
        <?php endif; ?>
    </main>
</body>
</html>
