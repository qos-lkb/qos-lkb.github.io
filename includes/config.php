<?php

declare(strict_types=1);

/**
 * 讀取專案根目錄 .env（KEY=value，# 為註解），寫入 putenv／$_ENV。
 */
function config_load_dotenv(?string $path = null): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $path ??= dirname(__DIR__) . '/.env';
    if (!is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v);
        if ($k === '') {
            continue;
        }
        if ($v !== '' && ($v[0] === '"' || $v[0] === "'") && str_ends_with($v, $v[0])) {
            $v = substr($v, 1, -1);
        }
        putenv($k . '=' . $v);
        $_ENV[$k] = $v;
    }
}

/**
 * 自環境變數組出 db 設定；若未設定資料庫相關變數則回傳 null。
 *
 * @return array{dsn: string, user: string, pass: string, unix_socket: string}|null
 */
function config_db_from_env(): ?array
{
    $dsn = (string) (getenv('DB_DSN') ?: '');
    $host = (string) (getenv('DB_HOST') ?: '');
    $name = (string) (getenv('DB_NAME') ?: '');
    $charset = (string) (getenv('DB_CHARSET') ?: 'utf8mb4');
    $port = (string) (getenv('DB_PORT') ?: '');

    if ($dsn === '' && ($host === '' || $name === '')) {
        return null;
    }

    if ($dsn === '') {
        $portPart = $port !== '' ? ';port=' . (int) $port : '';
        $dsn = sprintf('mysql:host=%s%s;dbname=%s;charset=%s', $host, $portPart, $name, $charset);
    }

    return [
        'dsn' => $dsn,
        'user' => (string) (getenv('DB_USER') ?: ''),
        'pass' => (string) (getenv('DB_PASS') ?: ''),
        'unix_socket' => trim((string) (getenv('DB_UNIX_SOCKET') ?: '')),
    ];
}

/**
 * @return array<string, mixed>
 */
function app_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }

    config_load_dotenv();

    $defaults = [
        'db' => [
            'dsn' => '',
            'user' => '',
            'pass' => '',
            'unix_socket' => '',
        ],
        'session_name' => 'SCI_SIM_SESSID',
        'session_cookie_secure' => false,
        'session_cookie_samesite' => 'Lax',
    ];

    $local = [];
    $localPath = __DIR__ . '/config.local.php';
    if (is_readable($localPath)) {
        $loaded = include $localPath;
        if (is_array($loaded)) {
            $local = $loaded;
        }
    }

    $cfg = array_replace_recursive($defaults, $local);
    $envDb = config_db_from_env();
    if ($envDb !== null) {
        $cfg['db'] = array_replace($cfg['db'], $envDb);
    }

    return $cfg;
}
