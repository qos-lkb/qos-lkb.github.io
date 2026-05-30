<?php
/**
 * 簡單的 Markdown 閱讀器
 * 讀取並顯示 Markdown 文件
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

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

// 掃描當前目錄下的所有 .md 文件
function getMarkdownFiles($dir) {
    $files = [];
    if (is_dir($dir)) {
        $items = scandir($dir);
        foreach ($items as $item) {
            if ($item !== '.' && $item !== '..' && is_file($dir . '/' . $item)) {
                if (preg_match('/\.md$/i', $item)) {
                    $files[] = $item;
                }
            }
        }
        // 按文件名排序
        sort($files);
    }
    return $files;
}

$md_files = getMarkdownFiles(__DIR__);

// 獲取要讀取的文件（從查詢參數或預設文件）
$file = $_GET['file'] ?? 'data_dictionary.md';
$file_path = __DIR__ . '/' . basename($file);

// 安全檢查：只允許讀取當前目錄下的 .md 文件
if (!file_exists($file_path) || !preg_match('/\.md$/', $file)) {
    // 如果文件不存在，嘗試使用第一個可用的文件
    if (!empty($md_files)) {
        $file = $md_files[0];
        $file_path = __DIR__ . '/' . $file;
    } else {
        http_response_code(404);
        die('沒有找到任何 Markdown 文件');
    }
}

// 讀取 Markdown 內容
$markdown = file_get_contents($file_path);
if ($markdown === false) {
    http_response_code(500);
    die('無法讀取文件');
}

/**
 * 簡單的 Markdown 轉 HTML 轉換器
 */
function markdownToHtml($markdown) {
    $lines = explode("\n", $markdown);
    $html = [];
    $inCodeBlock = false;
    $codeBlockContent = [];
    $codeBlockLang = '';
    $inTable = false;
    $tableRows = [];
    
    foreach ($lines as $line) {
        // 處理代碼塊
        if (preg_match('/^```(\w+)?$/', $line, $matches)) {
            if ($inCodeBlock) {
                // 結束代碼塊
                $code = htmlspecialchars(implode("\n", $codeBlockContent), ENT_QUOTES, 'UTF-8');
                $lang = $codeBlockLang ? ' class="language-' . htmlspecialchars($codeBlockLang) . '"' : '';
                $html[] = '<pre><code' . $lang . '>' . $code . '</code></pre>';
                $codeBlockContent = [];
                $codeBlockLang = '';
                $inCodeBlock = false;
            } else {
                // 開始代碼塊
                $codeBlockLang = $matches[1] ?? '';
                $inCodeBlock = true;
            }
            continue;
        }
        
        if ($inCodeBlock) {
            $codeBlockContent[] = $line;
            continue;
        }
        
        // 處理表格
        if (preg_match('/^\|(.+)\|$/', $line)) {
            if (!$inTable) {
                $inTable = true;
                $tableRows = [];
            }
            $tableRows[] = $line;
            continue;
        } else {
            if ($inTable) {
                // 處理表格
                if (count($tableRows) >= 2) {
                    $html[] = processTable($tableRows);
                }
                $tableRows = [];
                $inTable = false;
            }
        }
        
        $trimmed = trim($line);
        
        // 空行
        if (empty($trimmed)) {
            $html[] = '';
            continue;
        }
        
        // 水平線
        if (preg_match('/^---+$/', $trimmed)) {
            $html[] = '<hr>';
            continue;
        }
        
        // 標題
        if (preg_match('/^(#{1,6})\s+(.+)$/', $trimmed, $matches)) {
            $level = strlen($matches[1]);
            $text = processInline($matches[2]);
            $html[] = "<h{$level}>{$text}</h{$level}>";
            continue;
        }
        
        // 無序列表
        if (preg_match('/^[-*]\s+(.+)$/', $trimmed, $matches)) {
            $html[] = '<ul><li>' . processInline($matches[1]) . '</li></ul>';
            continue;
        }
        
        // 有序列表
        if (preg_match('/^\d+\.\s+(.+)$/', $trimmed, $matches)) {
            $html[] = '<ol><li>' . processInline($matches[1]) . '</li></ol>';
            continue;
        }
        
        // 普通段落
        $html[] = '<p>' . processInline($trimmed) . '</p>';
    }
    
    // 處理剩餘的表格
    if ($inTable && count($tableRows) >= 2) {
        $html[] = processTable($tableRows);
    }
    
    // 處理剩餘的代碼塊
    if ($inCodeBlock && !empty($codeBlockContent)) {
        $code = htmlspecialchars(implode("\n", $codeBlockContent), ENT_QUOTES, 'UTF-8');
        $lang = $codeBlockLang ? ' class="language-' . htmlspecialchars($codeBlockLang) . '"' : '';
        $html[] = '<pre><code' . $lang . '>' . $code . '</code></pre>';
    }
    
    // 合併相鄰的列表項
    $result = [];
    $prevIsList = false;
    $listType = '';
    
    foreach ($html as $item) {
        if (preg_match('/^<(ul|ol)><li>(.+?)<\/li><\/\1>$/', $item, $matches)) {
            if ($prevIsList && $listType === $matches[1]) {
                // 合併到上一個列表
                $lastIndex = count($result) - 1;
                $result[$lastIndex] = preg_replace('/<\/' . $listType . '>$/', '<li>' . $matches[2] . '</li></' . $listType . '>', $result[$lastIndex]);
            } else {
                $result[] = $item;
                $prevIsList = true;
                $listType = $matches[1];
            }
        } else {
            $result[] = $item;
            $prevIsList = false;
        }
    }
    
    return implode("\n", $result);
}

/**
 * 處理行內格式（粗體、斜體、代碼）
 */
function processInline($text) {
    // 先轉義 HTML
    $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    
    // 處理代碼（先處理，避免被其他格式影響）
    $text = preg_replace('/`([^`]+)`/', '<code>$1</code>', $text);
    
    // 處理粗體（**text** 或 __text__）
    $text = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $text);
    $text = preg_replace('/__([^_]+)__/', '<strong>$1</strong>', $text);
    
    // 處理斜體（*text*，但不在粗體或代碼內）
    // 使用更簡單的方法：只處理單個 * 且不在 ** 內的情況
    $parts = preg_split('/(<code>.*?<\/code>|<strong>.*?<\/strong>)/', $text, -1, PREG_SPLIT_DELIM_CAPTURE);
    $result = '';
    foreach ($parts as $part) {
        if (preg_match('/^<(code|strong)>/', $part)) {
            $result .= $part; // 保留代碼和粗體標籤
        } else {
            // 在普通文本中處理斜體
            $part = preg_replace('/\*([^*]+)\*/', '<em>$1</em>', $part);
            $part = preg_replace('/(?<!_)_([^_]+)_(?!_)/', '<em>$1</em>', $part);
            $result .= $part;
        }
    }
    
    return $result;
}

/**
 * 處理表格
 */
function processTable($rows) {
    if (count($rows) < 2) return '';
    
    $header = array_map('trim', explode('|', $rows[0]));
    $header = array_filter($header, function($cell) { return !empty($cell); });
    $header = array_values($header);
    
    $html = '<table><thead><tr>';
    foreach ($header as $cell) {
        $html .= '<th>' . processInline($cell) . '</th>';
    }
    $html .= '</tr></thead><tbody>';
    
    // 跳過分隔行（第二行）
    for ($i = 2; $i < count($rows); $i++) {
        $cells = array_map('trim', explode('|', $rows[$i]));
        $cells = array_filter($cells, function($cell) { return !empty($cell); });
        $cells = array_values($cells);
        
        if (empty($cells)) continue;
        
        $html .= '<tr>';
        foreach ($cells as $cell) {
            $html .= '<td>' . processInline($cell) . '</td>';
        }
        $html .= '</tr>';
    }
    
    $html .= '</tbody></table>';
    return $html;
}

// 轉換 Markdown 為 HTML
$html_content = markdownToHtml($markdown);

?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown 閱讀器 - <?php echo htmlspecialchars(basename($file)); ?></title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft JhengHei', 'Helvetica Neue', Arial, sans-serif;
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
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        h2 {
            color: #34495e;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        
        h3 {
            color: #555;
            margin-top: 25px;
            margin-bottom: 12px;
        }
        
        h4, h5, h6 {
            color: #666;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        p {
            margin-bottom: 15px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        table thead {
            background-color: #3498db;
            color: white;
        }
        
        table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        table td {
            padding: 10px 12px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        table tbody tr:hover {
            background-color: #f8f9fa;
        }
        
        table tbody tr:nth-child(even) {
            background-color: #fafafa;
        }
        
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #e74c3c;
        }
        
        pre {
            background-color: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 20px 0;
        }
        
        pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 5px 0;
        }
        
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }
        
        strong {
            font-weight: 600;
            color: #2c3e50;
        }
        
        em {
            font-style: italic;
            color: #555;
        }
        
        .file-info {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            font-size: 0.9em;
            color: #7f8c8d;
        }
        
        .file-info strong {
            color: #34495e;
        }
        
        .file-selector {
            background-color: #3498db;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .file-selector label {
            display: block;
            color: white;
            font-weight: 600;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        
        .file-selector select {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 1em;
            background-color: white;
            color: #333;
            cursor: pointer;
            transition: box-shadow 0.3s;
        }
        
        .file-selector select:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .file-selector select:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
        }
        
        .file-list {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.3);
        }
        
        .file-list-title {
            color: white;
            font-size: 0.9em;
            margin-bottom: 8px;
            opacity: 0.9;
        }
        
        .file-list-items {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .file-list-item {
            background-color: rgba(255,255,255,0.2);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 0.85em;
            color: white;
            text-decoration: none;
            transition: background-color 0.2s;
        }
        
        .file-list-item:hover {
            background-color: rgba(255,255,255,0.3);
        }
        
        .file-list-item.current {
            background-color: rgba(255,255,255,0.4);
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="file-selector">
            <label for="file-select">選擇 Markdown 文件：</label>
            <?php if (!empty($md_files)): ?>
            <select id="file-select" onchange="loadFile(this.value)">
                <?php foreach ($md_files as $md_file): ?>
                    <option value="<?php echo htmlspecialchars($md_file); ?>" 
                            <?php echo ($md_file === $file) ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($md_file); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <?php else: ?>
            <div style="color: white; padding: 12px; background-color: rgba(255,255,255,0.2); border-radius: 5px;">
                當前目錄中沒有找到任何 Markdown 文件
            </div>
            <?php endif; ?>
            
            <?php if (count($md_files) > 1): ?>
            <div class="file-list">
                <div class="file-list-title">快速選擇：</div>
                <div class="file-list-items">
                    <?php foreach ($md_files as $md_file): ?>
                        <a href="?file=<?php echo urlencode($md_file); ?>" 
                           class="file-list-item <?php echo ($md_file === $file) ? 'current' : ''; ?>">
                            <?php echo htmlspecialchars($md_file); ?>
                        </a>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
        </div>
        
        <div class="file-info">
            <strong>文件：</strong><?php echo htmlspecialchars(basename($file)); ?> | 
            <strong>大小：</strong><?php echo number_format(filesize($file_path)) . ' bytes'; ?> | 
            <strong>最後修改：</strong><?php echo date('Y-m-d H:i:s', filemtime($file_path)); ?>
        </div>
        
        <div class="markdown-content">
            <?php echo $html_content; ?>
        </div>
    </div>
    
    <script>
        function loadFile(filename) {
            if (filename) {
                window.location.href = '?file=' + encodeURIComponent(filename);
            }
        }
        
        // 添加鍵盤快捷鍵支持
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K 聚焦到文件選擇器
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('file-select').focus();
            }
        });
    </script>
</body>
</html>

