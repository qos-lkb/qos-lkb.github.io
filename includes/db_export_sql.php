<?php

declare(strict_types=1);

/**
 * 自 app 設定取得目前連線的 MySQL 資料庫名稱（供匯出用）。
 */
function db_export_schema_name(): string
{
    $name = trim((string) (getenv('DB_NAME') ?: ''));
    if ($name !== '') {
        return $name;
    }
    $dsn = (string) (app_config()['db']['dsn'] ?? '');
    if (preg_match('/dbname=([^;]+)/i', $dsn, $m)) {
        return trim($m[1], " \t\n\r\0\x0B`'\"");
    }
    throw new RuntimeException('無法從 DSN 或 DB_NAME 判斷資料庫名稱。');
}

/**
 * 將目前 schema 內所有資料表結構與資料以 SQL 寫入（逐行 echo／callback，避免一次載入整庫到記憶體）。
 *
 * @param callable(string):void $write
 */
function db_export_stream_full_sql(PDO $pdo, callable $write): void
{
    $db = db_export_schema_name();
    if (!preg_match('/^[A-Za-z0-9$_-]+$/', $db)) {
        throw new RuntimeException('資料庫名稱含有不允許的字元。');
    }

    $write("-- Science Sims 資料庫匯出\n");
    $write('-- 產生時間: ' . gmdate('Y-m-d H:i:s') . " UTC\n");
    $write("SET NAMES utf8mb4;\n");
    $write("SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';\n");
    $write("SET FOREIGN_KEY_CHECKS=0;\n\n");

    $stmt = $pdo->query(
        "SELECT TABLE_NAME FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = " . $pdo->quote($db) . " AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME"
    );
    $tables = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN) : [];
    if ($tables === false) {
        $tables = [];
    }

    foreach ($tables as $table) {
        $table = (string) $table;
        if (!preg_match('/^[A-Za-z0-9$_]+$/', $table)) {
            continue;
        }
        $qTable = '`' . str_replace('`', '``', $table) . '`';

        $write("\n-- ----------------------------\n");
        $write('-- Table structure for ' . $table . "\n");
        $write("-- ----------------------------\n");
        $createRow = $pdo->query('SHOW CREATE TABLE ' . $qTable)->fetch(PDO::FETCH_ASSOC);
        if (!$createRow || empty($createRow['Create Table'])) {
            continue;
        }
        $write('DROP TABLE IF EXISTS ' . $qTable . ";\n");
        $write($createRow['Create Table'] . ";\n\n");

        $write("-- Records of {$table}\n");
        $sel = $pdo->query('SELECT * FROM ' . $qTable);
        if (!$sel) {
            continue;
        }
        $cols = null;
        while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
            if ($cols === null) {
                $cols = array_keys($row);
                $colList = implode(', ', array_map(static function (string $c): string {
                    return '`' . str_replace('`', '``', $c) . '`';
                }, $cols));
            }
            $vals = [];
            foreach ($cols as $c) {
                $v = $row[$c] ?? null;
                if ($v === null) {
                    $vals[] = 'NULL';
                } elseif (is_int($v) || is_float($v)) {
                    $vals[] = (string) $v;
                } else {
                    $vals[] = $pdo->quote((string) $v);
                }
            }
            $write('INSERT INTO ' . $qTable . ' (' . $colList . ') VALUES (' . implode(', ', $vals) . ");\n");
        }
    }

    $write("\nSET FOREIGN_KEY_CHECKS=1;\n");
}
