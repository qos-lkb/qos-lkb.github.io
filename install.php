<?php

declare(strict_types=1);

/**
 * 首次安裝：建立第一位管理員（僅在尚無「真人」使用者時可用）。
 * 使用步驟：1) 匯入 sql/001_initial.sql  2) 設定 .env（或 includes/config.local.php） 3) 瀏覽本頁一次。
 */

require_once __DIR__ . '/includes/db.php';

$error = '';
$alreadyInstalled = false;
$justCreated = false;

try {
    $pdo = db();
} catch (Throwable $e) {
    http_response_code(500);
    echo '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>設定錯誤</title></head><body><p>無法連線資料庫。請先複製 .env.example 為 .env 並填入連線，或建立 includes/config.local.php。</p></body></html>';
    exit;
}

$stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE email <> 'system@science-sims.internal'");
$humanCount = (int) $stmt->fetchColumn();

if ($humanCount > 0) {
    $alreadyInstalled = true;
}

if (!$alreadyInstalled && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim((string) ($_POST['email'] ?? ''));
    $name = trim((string) ($_POST['display_name'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    $pass2 = (string) ($_POST['password2'] ?? '');

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = '請輸入有效電郵。';
    } elseif ($name === '') {
        $error = '請輸入顯示名稱。';
    } elseif (strlen($pass) < 8) {
        $error = '密碼至少 8 字元。';
    } elseif ($pass !== $pass2) {
        $error = '兩次密碼不一致。';
    } else {
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare('INSERT INTO users (email, password_hash, display_name, is_active) VALUES (?, ?, ?, 1)');
            $ins->execute([$email, $hash, $name]);
            $uid = (int) $pdo->lastInsertId();
            $rid = (int) $pdo->query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1")->fetchColumn();
            $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$uid, $rid]);
            $pdo->commit();
            $justCreated = true;
            $alreadyInstalled = true;
        } catch (Throwable $e) {
            $pdo->rollBack();
            $error = '建立失敗（可能電郵已存在）。';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>首次安裝 | Science Sims</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        <h1 class="text-xl font-bold text-slate-800 mb-2">Science Sims 安裝</h1>
        <?php if ($justCreated): ?>
            <p class="text-green-700 mb-4">管理員已建立。請 <a class="text-indigo-600 underline font-medium" href="login.php">登入</a>，並儘速刪除或限制存取 install.php。</p>
        <?php elseif ($alreadyInstalled): ?>
            <p class="text-slate-600 mb-4">已安裝。請使用 <a class="text-indigo-600 underline" href="login.php">登入</a>。</p>
        <?php else: ?>
            <p class="text-slate-600 text-sm mb-4">建立第一位管理員帳號（將自動指派 admin 角色）。</p>
            <?php if ($error !== ''): ?>
                <p class="text-red-600 text-sm mb-4"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
            <?php endif; ?>
            <form method="post" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700">電郵</label>
                    <input type="email" name="email" required class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="username">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">顯示名稱</label>
                    <input type="text" name="display_name" required class="mt-1 w-full border rounded-lg px-3 py-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">密碼（至少 8 字元）</label>
                    <input type="password" name="password" required minlength="8" class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="new-password">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">確認密碼</label>
                    <input type="password" name="password2" required minlength="8" class="mt-1 w-full border rounded-lg px-3 py-2" autocomplete="new-password">
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">建立管理員</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
