<?php

declare(strict_types=1);

/**
 * Legacy impersonation form endpoint — retired.
 * Use REST: POST /api/v1/admin/users/{id}/impersonate
 *           POST /api/v1/auth/stop-impersonation
 */
require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();

$next = '../app/admin/users';
if (isset($_GET['next']) && is_string($_GET['next']) && str_starts_with($_GET['next'], '../')) {
    $next = $_GET['next'];
}

http_response_code(410);
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>模仿模式 API 已遷移</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 p-8">
    <div class="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
        <h1 class="text-lg font-bold">此入口已停用（410）</h1>
        <p class="text-sm text-slate-600">模仿模式請改用 REST API：</p>
        <ul class="text-sm list-disc pl-5 space-y-1 font-mono text-xs">
            <li>POST /api/v1/admin/users/{id}/impersonate</li>
            <li>POST /api/v1/auth/stop-impersonation</li>
        </ul>
        <p class="text-sm">
            <a class="text-indigo-700 hover:underline" href="<?php echo htmlspecialchars($next, ENT_QUOTES, 'UTF-8'); ?>">返回使用者管理</a>
            ·
            <a class="text-indigo-700 hover:underline" href="users.php">PHP 使用者列表</a>
        </p>
    </div>
</body>
</html>
