<?php

declare(strict_types=1);

require_once __DIR__ . '/db_export_sql.php';

/**
 * 刪除目前 schema 內所有一般資料表（不含 VIEW）。
 *
 * @return int 已刪除的資料表數量
 */
function db_import_drop_all_tables(PDO $pdo): int
{
    $db = db_export_schema_name();
    if (!preg_match('/^[A-Za-z0-9$_-]+$/', $db)) {
        throw new RuntimeException('資料庫名稱含有不允許的字元。');
    }

    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

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
        $pdo->exec('DROP TABLE IF EXISTS ' . $qTable);
    }

    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

    return count($tables);
}

/**
 * @return list<string>
 */
function db_import_split_statements(string $sql): array
{
    if (str_starts_with($sql, "\xEF\xBB\xBF")) {
        $sql = substr($sql, 3);
    }

    $statements = [];
    $len = strlen($sql);
    $buf = '';
    $inSingle = false;
    $inDouble = false;
    $inBacktick = false;
    $inLineComment = false;
    $inBlockComment = false;

    for ($i = 0; $i < $len; $i++) {
        $ch = $sql[$i];
        $next = $i + 1 < $len ? $sql[$i + 1] : '';

        if ($inLineComment) {
            if ($ch === "\n" || $ch === "\r") {
                $inLineComment = false;
            }
            continue;
        }

        if ($inBlockComment) {
            if ($ch === '*' && $next === '/') {
                $inBlockComment = false;
                $i++;
            }
            continue;
        }

        if (!$inSingle && !$inDouble && !$inBacktick) {
            if ($ch === '-' && $next === '-') {
                $inLineComment = true;
                $i++;
                continue;
            }
            if ($ch === '#') {
                $inLineComment = true;
                continue;
            }
            if ($ch === '/' && $next === '*') {
                $inBlockComment = true;
                $i++;
                continue;
            }
        }

        if ($ch === '\\' && ($inSingle || $inDouble)) {
            $buf .= $ch;
            if ($i + 1 < $len) {
                $buf .= $sql[++$i];
            }
            continue;
        }

        if ($ch === "'" && !$inDouble && !$inBacktick) {
            $inSingle = !$inSingle;
        } elseif ($ch === '"' && !$inSingle && !$inBacktick) {
            $inDouble = !$inDouble;
        } elseif ($ch === '`' && !$inSingle && !$inDouble) {
            $inBacktick = !$inBacktick;
        }

        if ($ch === ';' && !$inSingle && !$inDouble && !$inBacktick) {
            $trimmed = trim($buf);
            if ($trimmed !== '') {
                $statements[] = $trimmed;
            }
            $buf = '';
            continue;
        }

        $buf .= $ch;
    }

    $trimmed = trim($buf);
    if ($trimmed !== '') {
        $statements[] = $trimmed;
    }

    return $statements;
}

function db_import_should_skip_statement(string $stmt): bool
{
    return (bool) preg_match('/^\s*(USE|CREATE\s+DATABASE|DROP\s+DATABASE)\b/i', $stmt);
}

/**
 * 執行 SQL 字串（已停用外鍵檢查；略過 USE / CREATE DATABASE / DROP DATABASE）。
 *
 * @return array{executed:int, skipped:int}
 */
function db_import_execute_sql(PDO $pdo, string $sql): array
{
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    $pdo->exec("SET NAMES utf8mb4");
    $pdo->exec("SET time_zone = '" . config_mysql_time_zone() . "'");

    $executed = 0;
    $skipped = 0;

    foreach (db_import_split_statements($sql) as $stmt) {
        if (db_import_should_skip_statement($stmt)) {
            $skipped++;
            continue;
        }
        $pdo->exec($stmt);
        $executed++;
    }

    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

    return ['executed' => $executed, 'skipped' => $skipped];
}

function db_import_count_tables(PDO $pdo): int
{
    $db = db_export_schema_name();
    $stmt = $pdo->query(
        "SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = " . $pdo->quote($db) . " AND TABLE_TYPE = 'BASE TABLE'"
    );
    return (int) ($stmt ? $stmt->fetchColumn() : 0);
}

/**
 * 先刪除所有資料表，再匯入 SQL 檔案內容。
 *
 * @return array{dropped:int, executed:int, skipped:int, tables:int}
 */
function db_import_from_sql(PDO $pdo, string $sql): array
{
    $dropped = db_import_drop_all_tables($pdo);
    $run = db_import_execute_sql($pdo, $sql);

    return [
        'dropped' => $dropped,
        'executed' => $run['executed'],
        'skipped' => $run['skipped'],
        'tables' => db_import_count_tables($pdo),
    ];
}
