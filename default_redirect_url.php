<?php

declare(strict_types=1);

/**
 * 供 index.html 同步讀取 .env 的 DEFAULT_REDIRECT_URL（僅回傳此欄位，不含機密）。
 * @deprecated Prefer app/ as main entry; redirect URLs are validated against REDIRECT_URL_WHITELIST.
 */
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/security_url.php';

config_load_dotenv();

$raw = trim((string) (getenv('DEFAULT_REDIRECT_URL') ?: ($_ENV['DEFAULT_REDIRECT_URL'] ?? '')));
$url = security_is_allowed_redirect_url($raw) ? $raw : null;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

echo json_encode(['url' => $url], JSON_UNESCAPED_UNICODE);
