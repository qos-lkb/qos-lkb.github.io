#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * 自 schema.sql 產生 data_dictionary.md
 *
 * CLI:  php update_data_dictionary.php [--output=path]
 * Web:  需 user.manage 權限；POST 重新產生，GET 顯示表單
 */

require_once __DIR__ . '/includes/data_dictionary_lib.php';

function dd_cli_main(array $argv): int
{
    $output = dd_output_path();
    foreach (array_slice($argv, 1) as $arg) {
        if (str_starts_with($arg, '--output=')) {
            $output = substr($arg, 9);
        } elseif ($arg === '--help' || $arg === '-h') {
            echo "用法: php update_data_dictionary.php [--output=path]\n";
            echo "Web:  以具 user.manage 權限帳戶開啟 update_data_dictionary.php\n";
            return 0;
        }
    }

    $result = dd_generate($output);
    if (!$result['ok']) {
        fwrite(STDERR, ($result['error'] ?? '產生失敗。') . "\n");
        return 1;
    }

    echo '已寫入 ' . $result['output'] . '（' . (int) ($result['table_count'] ?? 0) . " 張資料表）\n";
    return 0;
}

function dd_web_handle(): void
{
    require_once __DIR__ . '/includes/bootstrap.php';

    bootstrap_public();
    require_permission('user.manage', 'login.php?next=' . rawurlencode('update_data_dictionary.php'));

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!verify_csrf($_POST['csrf'] ?? null)) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'CSRF 驗證失敗。';
            exit;
        }

        $result = dd_generate();
        $wantsJson = str_contains(strtolower($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json')
            || ($_POST['format'] ?? '') === 'json';

        if ($wantsJson) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;
        }

        $q = $result['ok']
            ? 'ok=1&tables=' . (int) ($result['table_count'] ?? 0)
            : 'error=' . rawurlencode($result['error'] ?? '產生失敗');
        require_once __DIR__ . '/includes/spa_redirect.php';
        header('Location: ' . spa_app_path('/admin/data-dictionary') . '?' . $q, true, 302);
        exit;
    }

    $csrf = csrf_token();
    $schemaPath = dd_schema_path();
    $outputPath = dd_output_path();
    $schemaMtime = is_readable($schemaPath) ? date('Y-m-d H:i:s', filemtime($schemaPath)) : '—';
    $outputMtime = is_readable($outputPath) ? date('Y-m-d H:i:s', filemtime($outputPath)) : '（尚未產生）';
    require_once __DIR__ . '/includes/spa_redirect.php';
    $adminReader = spa_app_path('/admin/data-dictionary');
    $adminHome = spa_app_path('/admin');
    ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>更新資料字典</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen antialiased">
    <div class="max-w-xl mx-auto px-4 py-10">
        <h1 class="text-2xl font-bold text-indigo-950 mb-2">更新資料字典</h1>
        <p class="text-sm text-slate-600 mb-6 leading-relaxed">
            自 <code class="bg-slate-100 px-1 rounded">schema.sql</code> 重新產生
            <code class="bg-slate-100 px-1 rounded">data_dictionary.md</code>。
        </p>

        <dl class="text-sm bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-2">
            <div class="flex justify-between gap-4"><dt class="text-slate-500">schema.sql</dt><dd><?php echo htmlspecialchars($schemaMtime, ENT_QUOTES, 'UTF-8'); ?></dd></div>
            <div class="flex justify-between gap-4"><dt class="text-slate-500">data_dictionary.md</dt><dd><?php echo htmlspecialchars($outputMtime, ENT_QUOTES, 'UTF-8'); ?></dd></div>
        </dl>

        <form method="post" class="space-y-4">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm">
                重新產生 data_dictionary.md
            </button>
        </form>

        <p class="mt-6 text-sm text-slate-600">
            <a href="<?php echo htmlspecialchars($adminReader, ENT_QUOTES, 'UTF-8'); ?>" class="text-indigo-600 underline">後台資料字典</a>
            · <a href="<?php echo htmlspecialchars($adminHome, ENT_QUOTES, 'UTF-8'); ?>" class="text-indigo-600 underline">管理後台</a>
        </p>
    </div>
</body>
</html>
    <?php
}

if (PHP_SAPI === 'cli') {
    exit(dd_cli_main($argv));
}

dd_web_handle();
