<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

bootstrap_public();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        http_response_code(403);
        exit('CSRF validation failed');
    }
    logout_user();
    header('Location: app/');
    exit;
}

http_response_code(405);
header('Content-Type: text/html; charset=utf-8');
header('Allow: POST');
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <title>登出</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
    <form method="post" class="bg-white rounded-xl shadow p-8 max-w-sm w-full text-center">
        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
        <p class="mb-4 text-slate-700">確定要登出嗎？</p>
        <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg">登出</button>
        <p class="mt-4 text-sm"><a href="app/" class="text-indigo-600">取消，返回首頁</a></p>
    </form>
</body>
</html>
