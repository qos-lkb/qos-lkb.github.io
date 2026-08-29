<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function qsis_is_configured(): bool
{
    $c = app_config()['qsis_db'];
    return trim((string) ($c['dsn'] ?? '')) !== '';
}

/**
 * @return array{ok:bool,error?:string,database?:string}
 */
function qsis_test_connection(): array
{
    if (!qsis_is_configured()) {
        return ['ok' => false, 'error' => '尚未設定 QSIS 資料庫（請在 .env 填入 QSIS_DB_*）。'];
    }

    try {
        $pdo = qsis_db();
        $dbName = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
        return ['ok' => true, 'database' => $dbName];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    }
}

function qsis_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c = app_config()['qsis_db'];
    if (trim((string) ($c['dsn'] ?? '')) === '') {
        throw new RuntimeException('QSIS 資料庫尚未設定：請在 .env 填入 QSIS_DB_NAME、QSIS_DB_USER 等。');
    }

    $dsn = (string) $c['dsn'];
    $socket = trim((string) ($c['unix_socket'] ?? ''));
    if ($socket !== '') {
        $dsn .= ';unix_socket=' . $socket;
    }

    // Do not force utf8mb4_unicode_ci: QSIS tables mix general_ci / unicode_ci.
    // Forcing a connection collation makes yearId / subject_id joins fail with
    // "Illegal mix of collations", which previously emptied the course list.
    $initSql = sprintf(
        "SET NAMES utf8mb4, time_zone = '%s'",
        config_mysql_time_zone()
    );

    $pdo = new PDO($dsn, (string) $c['user'], (string) $c['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => $initSql,
    ]);

    return $pdo;
}
