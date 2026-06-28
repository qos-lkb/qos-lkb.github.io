<?php

declare(strict_types=1);

/**
 * 簡單的 Markdown 閱讀器（公開白名單 + 管理員可讀其他根目錄 .md）
 */

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/markdown_render_lib.php';

bootstrap_public();

$allowedPublicMd = ['README.md', 'data_dictionary.md', 'architecture.md', 'rule.md'];
$requestedFile = basename((string) ($_GET['file'] ?? 'data_dictionary.md'));
if (!in_array($requestedFile, $allowedPublicMd, true)) {
    require_login('login.php?next=' . rawurlencode('markdown_reader.php?file=' . rawurlencode($requestedFile)));
    if (!user_has_permission('user.manage')) {
        http_response_code(403);
        exit('沒有權限');
    }
}

/** @return list<string> */
function markdown_reader_list_files(string $dir): array
{
    $files = [];
    if (!is_dir($dir)) {
        return $files;
    }
    foreach (scandir($dir) ?: [] as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        if (is_file($dir . '/' . $item) && preg_match('/\.md$/i', $item)) {
            $files[] = $item;
        }
    }
    sort($files);

    return $files;
}

$mdFiles = markdown_reader_list_files(__DIR__);
$file = basename((string) ($_GET['file'] ?? 'data_dictionary.md'));
$filePath = __DIR__ . '/' . $file;

if (!file_exists($filePath) || !preg_match('/\.md$/i', $file)) {
    if ($mdFiles !== []) {
        $file = $mdFiles[0];
        $filePath = __DIR__ . '/' . $file;
    } else {
        http_response_code(404);
        exit('沒有找到任何 Markdown 文件');
    }
}

$markdown = file_get_contents($filePath);
if ($markdown === false) {
    http_response_code(500);
    exit('無法讀取文件');
}

$htmlContent = markdown_to_html($markdown);
$mdCss = markdown_reader_css();

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown 閱讀器 - <?php echo htmlspecialchars(basename($file), ENT_QUOTES, 'UTF-8'); ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft JhengHei', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .file-selector {
            background-color: #3498db;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .file-selector label { display: block; color: white; font-weight: 600; margin-bottom: 10px; }
        .file-selector select {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 1em;
        }
        .file-info {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            font-size: 0.9em;
            color: #7f8c8d;
        }
        .admin-link { margin-bottom: 16px; font-size: 0.9em; }
        .admin-link a { color: #4f46e5; }
        <?php echo $mdCss; ?>
    </style>
</head>
<body>
    <div class="container">
        <?php if (user_has_permission('user.manage')): ?>
        <p class="admin-link">
            <a href="admin/data_dictionary.php">後台資料字典閱讀器</a>
            · <a href="update_data_dictionary.php">重新產生字典</a>
        </p>
        <?php endif; ?>

        <div class="file-selector">
            <label for="file-select">選擇 Markdown 文件：</label>
            <?php if ($mdFiles !== []): ?>
            <select id="file-select" onchange="loadFile(this.value)">
                <?php foreach ($mdFiles as $mdFile): ?>
                    <option value="<?php echo htmlspecialchars($mdFile, ENT_QUOTES, 'UTF-8'); ?>"
                        <?php echo $mdFile === $file ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($mdFile, ENT_QUOTES, 'UTF-8'); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <?php else: ?>
            <div style="color:white;padding:12px;background:rgba(255,255,255,0.2);border-radius:5px;">
                當前目錄中沒有找到任何 Markdown 文件
            </div>
            <?php endif; ?>
        </div>

        <div class="file-info">
            <strong>文件：</strong><?php echo htmlspecialchars(basename($file), ENT_QUOTES, 'UTF-8'); ?> |
            <strong>大小：</strong><?php echo number_format(filesize($filePath)); ?> bytes |
            <strong>最後修改：</strong><?php echo date('Y-m-d H:i:s', filemtime($filePath)); ?>
        </div>

        <div class="markdown-reader-content">
            <?php echo $htmlContent; ?>
        </div>
    </div>
    <script>
        function loadFile(filename) {
            if (filename) {
                window.location.href = '?file=' + encodeURIComponent(filename);
            }
        }
    </script>
</body>
</html>
