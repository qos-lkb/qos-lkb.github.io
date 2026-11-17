<?php

declare(strict_types=1);

/**
 * Runtime schema helpers. New feature tables must be created here so production
 * does not depend on someone running SQL or apply_schema.php.
 */

function schema_runtime_ident(string $name): string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
        throw new InvalidArgumentException('Invalid SQL identifier.');
    }

    return $name;
}

function schema_runtime_table_exists(PDO $pdo, string $table): bool
{
    $table = schema_runtime_ident($table);
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1'
    );
    $stmt->execute([$table]);

    return $stmt->fetchColumn() !== false;
}

function schema_runtime_column_exists(PDO $pdo, string $table, string $column): bool
{
    $table = schema_runtime_ident($table);
    $column = schema_runtime_ident($column);
    $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}` LIKE " . $pdo->quote($column));
    if ($stmt === false) {
        return false;
    }

    return $stmt->fetch() !== false;
}

function schema_runtime_ensure_table(PDO $pdo, string $createSql): void
{
    $pdo->exec($createSql);
}

function schema_runtime_ensure_column(PDO $pdo, string $table, string $column, string $addColumnSql): void
{
    schema_runtime_ident($table);
    schema_runtime_ident($column);
    if (schema_runtime_table_exists($pdo, $table) && !schema_runtime_column_exists($pdo, $table, $column)) {
        $pdo->exec($addColumnSql);
    }
}
