<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

bootstrap_public();

if (current_user() !== null) {
    header('Location: app/');
    exit;
}

$error = '';
$success = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $error = '工作階段逾期，請重試。';
    } else {
        $pdo = db();
        require_once __DIR__ . '/includes/classes_lib.php';
        $r = classes_register_student(
            $pdo,
            trim((string) ($_POST['email'] ?? '')),
            (string) ($_POST['password'] ?? ''),
            trim((string) ($_POST['name_zh'] ?? '')),
            trim((string) ($_POST['name_en'] ?? '')),
            trim((string) ($_POST['invite_code'] ?? ''))
        );
        if (!$r['ok']) {
            $error = $r['error'] ?? '註冊失敗。';
        } elseif (attempt_login(trim((string) $_POST['email']), (string) $_POST['password'])) {
            header('Location: app/');
            exit;
        } else {
            $success = '帳戶已建立，請登入。';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>學生註冊 | <?php echo htmlspecialchars(config_site_title_bilingual(), ENT_QUOTES, 'UTF-8'); ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        <h1 class="text-xl font-bold text-slate-800 mb-2">學生註冊</h1>
        <p class="text-sm text-slate-500 mb-4">請向任教老師索取課程邀請碼。註冊即表示同意平台記錄學習活動以協助學習分析。</p>
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm mb-4"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php if ($success !== ''): ?>
            <p class="text-emerald-600 text-sm mb-4"><?php echo htmlspecialchars($success, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <form method="post" class="space-y-4">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <div>
                <label class="block text-sm font-medium text-slate-700">帳戶名稱</label>
                <input type="text" name="email" required class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="username" placeholder="例如 s20171060" spellcheck="false">
                <p class="mt-1 text-xs text-slate-500">請填 QSIS 帳戶名（學號），無需 @qos.edu.hk。</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">中文名</label>
                <input type="text" name="name_zh" class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="name">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">英文名</label>
                <input type="text" name="name_en" class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="additional-name">
            </div>
            <p class="text-xs text-slate-500 -mt-2">至少填寫中文名或英文名其中一項。</p>
            <div>
                <label class="block text-sm font-medium text-slate-700">QSIS 密碼</label>
                <input type="password" name="password" required class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="current-password">
                <p class="mt-1 text-xs text-slate-500">使用校本 QSIS 密碼驗證身分；本站不會儲存密碼。</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">課程邀請碼</label>
                <input type="text" name="invite_code" required class="mt-1 w-full border rounded-lg px-3 py-2 uppercase" placeholder="例如 AB12CD34" autocomplete="off">
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">註冊並登入</button>
        </form>
        <p class="mt-4 text-sm text-slate-500">
            <a href="login.php" class="text-indigo-600 underline">已有帳戶？登入</a>
            · <a href="app/" class="text-indigo-600 underline">返回首頁</a>
        </p>
    </div>
</body>
</html>
