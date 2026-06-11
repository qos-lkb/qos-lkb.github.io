<?php

declare(strict_types=1);

/**
 * SPA 入口：自 .env 的 SITE_NAME／SITE_NAME_EN 注入網站名稱至 index.html。
 */
require_once dirname(__DIR__) . '/includes/config.php';

$templatePath = __DIR__ . '/index.html';
$html = is_readable($templatePath) ? file_get_contents($templatePath) : false;
if ($html === false) {
    http_response_code(500);
    exit('Template missing');
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
