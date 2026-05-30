<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

bootstrap_public();

if (current_user() !== null) {
    header('Location: app/');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $error = '工作階段逾期，請重試。';
    } else {
        $email = trim((string) ($_POST['email'] ?? ''));
        $pass = (string) ($_POST['password'] ?? '');
        if (!attempt_login($email, $pass)) {
            $error = '登入失敗，請檢查電郵與密碼。';
        } else {
            $next = $_GET['next'] ?? 'app/';
            if (!is_string($next) || str_contains($next, '://') || str_starts_with($next, '//')) {
                $next = 'app/';
            }
            header('Location: ' . $next);
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登入 | Science Sims</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        <h1 class="text-xl font-bold text-slate-800 mb-4">登入</h1>
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm mb-4"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <form method="post" class="space-y-4">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <div>
                <label class="block text-sm font-medium text-slate-700">電郵</label>
                <input type="email" name="email" required class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="username">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">密碼</label>
                <input type="password" name="password" required class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="current-password">
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">登入</button>
        </form>
        <p class="mt-4 text-sm text-slate-500"><a href="app/" class="text-indigo-600 underline">返回首頁</a></p>
    </div>
</body>
</html>
