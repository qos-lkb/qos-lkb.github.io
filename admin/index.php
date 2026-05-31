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
            <p class="text-slate-400 text-sm mt-1"><a href="../app/" class="underline hover:text-white">首頁</a> · <a href="../codespace/index.html" class="underline hover:text-white" target="_blank" rel="noopener">Code Space</a> · <a href="../portal/simulations.php" class="underline hover:text-white">我的模擬</a> · <a href="../logout.php" class="underline hover:text-white">登出</a></p>
        </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-8 space-y-3">
        <a href="../codespace/index.html" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-sky-300 transition" target="_blank" rel="noopener">
            <span class="font-medium text-slate-900">Code Space</span>
            <span class="block text-sm text-slate-500 mt-1">HTML 即時編輯與預覽（codespace/index.html），於新分頁開啟。</span>
        </a>
        <?php if ($u): ?>
            <a href="users.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">
                <span class="font-medium text-slate-900">使用者與角色</span>
                <span class="block text-sm text-slate-500 mt-1">新增、編輯使用者並指派角色。</span>
            </a>
            <a href="permissions.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">
                <span class="font-medium text-slate-900">更改權限</span>
                <span class="block text-sm text-slate-500 mt-1">調整管理員、一般使用者等角色的系統權限。</span>
            </a>
            <a href="subjects.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">科目與單元</a>
            <a href="db_export.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-amber-300 transition">匯出資料庫（SQL 備份）</a>
        <?php endif; ?>
        <?php if ($s): ?>
            <a href="simulations.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">全部模擬</a>
            <a href="learning_tools.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">互動學習工具</a>
            <a href="articles.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">科學文章</a>
            <a href="learning_notes.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">學習筆記</a>
            <a href="worksheets.php" class="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition">工作紙</a>
            <a href="review_queue.php" class="block bg-white border border-amber-200 rounded-xl p-4 shadow-sm hover:border-amber-300 transition">審核佇列</a>
        <?php endif; ?>
    </main>
</body>
</html>
