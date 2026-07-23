<?php

declare(strict_types=1);

const CONFIG_DEFAULT_SITE_NAME = '伊中中科學學習平台';
const CONFIG_DEFAULT_SITE_NAME_EN = 'QESOSASS Science Learning Platform';
const CONFIG_DEFAULT_TIMEZONE = 'Asia/Hong_Kong';

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

function config_site_name(): string
{
    config_load_dotenv();
    $name = trim((string) (getenv('SITE_NAME') ?: ($_ENV['SITE_NAME'] ?? '')));

    return $name !== '' ? $name : CONFIG_DEFAULT_SITE_NAME;
}

function config_site_name_en(): string
{
    config_load_dotenv();
    $name = trim((string) (getenv('SITE_NAME_EN') ?: ($_ENV['SITE_NAME_EN'] ?? '')));

    return $name !== '' ? $name : CONFIG_DEFAULT_SITE_NAME_EN;
}

function config_site_title_bilingual(): string
{
    return config_site_name() . ' | ' . config_site_name_en();
}

function config_timezone(): string
{
    static $resolved = null;
    if ($resolved !== null) {
        return $resolved;
    }

    config_load_dotenv();
    $candidate = trim((string) (getenv('APP_TIMEZONE') ?: ($_ENV['APP_TIMEZONE'] ?? '')));
    if ($candidate === '') {
        $candidate = trim((string) (app_config()['timezone'] ?? CONFIG_DEFAULT_TIMEZONE));
    }
    if ($candidate === '') {
        $candidate = CONFIG_DEFAULT_TIMEZONE;
    }

    try {
        new DateTimeZone($candidate);
        $resolved = $candidate;
    } catch (Exception) {
        $resolved = CONFIG_DEFAULT_TIMEZONE;
    }

    return $resolved;
}

function config_apply_timezone(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    date_default_timezone_set(config_timezone());
}

function config_mysql_time_zone(): string
{
    $tz = new DateTimeZone(config_timezone());
    $offset = $tz->getOffset(new DateTime('now', $tz));
    $sign = $offset >= 0 ? '+' : '-';
    $offset = abs($offset);

    return sprintf('%s%02d:%02d', $sign, intdiv($offset, 3600), intdiv($offset % 3600, 60));
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
 * 自環境變數組出 QSIS（校本系統）唯讀資料庫設定；未設定 QSIS_DB_NAME 時回傳 null。
 *
 * @return array{dsn: string, user: string, pass: string, unix_socket: string}|null
 */
function config_qsis_db_from_env(): ?array
{
    config_load_dotenv();

    $name = trim((string) (getenv('QSIS_DB_NAME') ?: ''));
    if ($name === '') {
        return null;
    }

    $host = trim((string) (getenv('QSIS_DB_HOST') ?: 'localhost'));
    $charset = trim((string) (getenv('QSIS_DB_CHARSET') ?: 'utf8mb4'));
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $host, $name, $charset);

    return [
        'dsn' => $dsn,
        'user' => (string) (getenv('QSIS_DB_USER') ?: ''),
        'pass' => (string) (getenv('QSIS_DB_PASS') ?: ''),
        'unix_socket' => trim((string) (getenv('QSIS_DB_UNIX_SOCKET') ?: '')),
    ];
}

/**
 * 學校帳戶網域（僅用於辨識／剝離舊版 users.email 中的 @網域；登入與儲存改用 QSIS username）。
 */
function config_qsis_student_email_domain(): string
{
    config_load_dotenv();
    $domain = trim((string) (getenv('QSIS_STUDENT_EMAIL_DOMAIN') ?: ''));
    $domain = ltrim($domain, '@');

    return $domain;
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
        'qsis_db' => [
            'dsn' => '',
            'user' => '',
            'pass' => '',
            'unix_socket' => '',
        ],
        'session_name' => 'SCI_SIM_SESSID',
        'session_cookie_secure' => false,
        'session_cookie_samesite' => 'Lax',
        'timezone' => CONFIG_DEFAULT_TIMEZONE,
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

    $envQsisDb = config_qsis_db_from_env();
    if ($envQsisDb !== null) {
        $cfg['qsis_db'] = array_replace($cfg['qsis_db'], $envQsisDb);
    }

    return $cfg;
}

config_apply_timezone();
