<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c = app_config()['db'];
    if ($c['dsn'] === '') {
        throw new RuntimeException('資料庫尚未設定：請複製 .env.example 為 .env，或依 includes/config.example.php 建立 includes/config.local.php');
    }

    $dsn = $c['dsn'];
    $socket = trim((string) ($c['unix_socket'] ?? ''));
    if ($socket !== '') {
        $dsn .= ';unix_socket=' . $socket;
    }

    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ]);

    return $pdo;
}
