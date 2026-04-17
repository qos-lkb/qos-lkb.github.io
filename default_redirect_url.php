<?php

declare(strict_types=1);

/**
 * 供 index.html 同步讀取 .env 的 DEFAULT_REDIRECT_URL（僅回傳此欄位，不含機密）。
 */
require_once __DIR__ . '/includes/config.php';

config_load_dotenv();

$url = trim((string) (getenv('DEFAULT_REDIRECT_URL') ?: ($_ENV['DEFAULT_REDIRECT_URL'] ?? '')));

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

echo json_encode(['url' => $url === '' ? null : $url], JSON_UNESCAPED_UNICODE);
