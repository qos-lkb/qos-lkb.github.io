<?php

declare(strict_types=1);

/**
 * SPA 入口：優先服務 Vite 建置產物（dist/），否則退回 index.legacy.html。
 * 自 .env 注入 SITE_NAME／SITE_NAME_EN。
 */
require_once dirname(__DIR__) . '/includes/config.php';

$distPath = __DIR__ . '/dist/index.html';
$legacyPath = __DIR__ . '/index.legacy.html';
$srcPath = __DIR__ . '/index.html';

if (is_readable($distPath)) {
    $templatePath = $distPath;
} elseif (is_readable($legacyPath)) {
    $templatePath = $legacyPath;
} else {
    $templatePath = $srcPath;
}

$html = file_get_contents($templatePath);
if ($html === false) {
    http_response_code(500);
    exit('Template missing');
}

// dist/index.html uses ./assets/… relative to dist/; PHP serves from /app/ so rewrite.
if ($templatePath === $distPath) {
    $html = str_replace(
        [
            'src="./assets/',
            'href="./assets/',
            'src="vendor/',
            "src='./assets/",
            "href='./assets/",
        ],
        [
            'src="./dist/assets/',
            'href="./dist/assets/',
            'src="./dist/vendor/',
            "src='./dist/assets/",
            "href='./dist/assets/",
        ],
        $html
    );
}

$siteNameZh = htmlspecialchars(config_site_name(), ENT_QUOTES, 'UTF-8');
$siteNameEn = htmlspecialchars(config_site_name_en(), ENT_QUOTES, 'UTF-8');
$defaultZh = htmlspecialchars(CONFIG_DEFAULT_SITE_NAME, ENT_QUOTES, 'UTF-8');
$defaultEn = htmlspecialchars(CONFIG_DEFAULT_SITE_NAME_EN, ENT_QUOTES, 'UTF-8');
$bilingualTitle = $siteNameZh . ' | ' . $siteNameEn;

$namesScript = '<script>window.__SITE_NAMES__='
    . json_encode(['zh' => config_site_name(), 'en' => config_site_name_en()], JSON_UNESCAPED_UNICODE)
    . ';window.__APP_TIMEZONE__=' . json_encode(config_timezone(), JSON_UNESCAPED_UNICODE) . ';</script>';

$html = preg_replace('/<head>/', '<head>' . "\n    " . $namesScript, $html, 1);
$html = preg_replace('/<title>.*?<\/title>/', '<title>' . $bilingualTitle . '</title>', $html, 1);
$html = preg_replace(
    '/(<a href="\\." id="site-brand" class="font-bold text-base sm:text-lg truncate">)' . preg_quote($defaultZh, '/') . '(<\/a>)/',
    '$1' . $siteNameZh . '$2',
    $html,
    1
);
$html = str_replace($defaultEn, $siteNameEn, $html);

header('Content-Type: text/html; charset=utf-8');
echo $html;
