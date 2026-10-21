<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/api_rate_limit.php';
require_once __DIR__ . '/includes/qsis_auth_lib.php';

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
        $identity = auth_normalize_login_identity($email);
        $pdo = db();
        $rate = api_auth_rate_limit_begin($pdo, 'login', $identity !== '' ? $identity : $email);
        if (!$rate['ok']) {
            $error = '登入嘗試過於頻繁，請稍後再試。';
        } elseif (!attempt_login($email, $pass)) {
            $error = '登入失敗，請檢查帳戶名稱與密碼。';
        } else {
            api_rate_limit_reset($pdo, $rate['key']);
            $next = $_GET['next'] ?? 'app/';
            if (!is_string($next) || str_contains($next, '://') || str_starts_with($next, '//')) {
                $next = 'app/';
            }
            header('Location: ' . $next);
            exit;
        }
    }
}
$siteTitle = htmlspecialchars(config_site_title_bilingual(), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登入 | <?php echo $siteTitle; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&family=Noto+Serif+TC:wght@700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 50:'#f0fdfa',100:'#ccfbf1',600:'#0d9488',700:'#0f766e',800:'#115e59',900:'#134e4a',950:'#042f2e' },
            accent: { 500:'#f59e0b', 600:'#d97706' }
          },
          fontFamily: {
            sans: ['"Noto Sans TC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            display: ['"Noto Serif TC"', '"Noto Sans TC"', 'serif']
          }
        }
      }
    };
    </script>
</head>
<body class="min-h-screen flex items-center justify-center p-4 font-sans antialiased"
      style="background: radial-gradient(ellipse 80% 60% at 70% 10%, rgba(45,212,191,0.18) 0%, transparent 55%), linear-gradient(160deg, #042f2e 0%, #134e4a 40%, #0f172a 100%);">
    <div class="bg-white/95 backdrop-blur rounded-2xl shadow-xl max-w-md w-full p-8 border border-white/20">
        <p class="font-display text-xl font-bold text-brand-900 tracking-tight"><?php echo $siteTitle; ?></p>
        <h1 class="text-lg font-semibold text-slate-800 mt-2 mb-4">登入</h1>
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm mb-4"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <form method="post" class="space-y-4">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <div>
                <label class="block text-sm font-medium text-slate-700">帳戶名稱</label>
                <input type="text" name="email" required class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600" autocomplete="username" placeholder="例如 s20171060" spellcheck="false">
                <p class="mt-1 text-xs text-slate-500">請輸入與 QSIS 相同的帳戶名（學號／教師代碼），無需 <code class="font-mono">@qos.edu.hk</code>。</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">密碼</label>
                <input type="password" name="password" required class="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600" autocomplete="current-password">
                <p class="mt-1 text-xs text-slate-500">使用校本 QSIS 密碼登入。</p>
            </div>
            <button type="submit" class="w-full bg-accent-500 hover:bg-accent-600 text-amber-950 py-2.5 rounded-lg font-semibold min-h-[44px] transition">登入</button>
        </form>
        <p class="mt-4 text-sm text-slate-500">
            <a href="register.php" class="text-brand-700 font-medium underline underline-offset-2">學生註冊</a>
            · <a href="app/" class="text-brand-700 font-medium underline underline-offset-2">返回首頁</a>
        </p>
    </div>
</body>
</html>
