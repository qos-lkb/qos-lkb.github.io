#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Migrate learning_tools + quiz_* → question_banks + qb_* (MCQ).
 *
 * Usage:
 *   php scripts/migrate_learning_tools_to_question_banks.php
 *   php scripts/migrate_learning_tools_to_question_banks.php --dry-run
 *   php scripts/migrate_learning_tools_to_question_banks.php --drop-legacy
 */

$root = dirname(__DIR__);
require_once $root . '/vendor/autoload.php';
require_once $root . '/includes/db.php';
require_once $root . '/includes/lt_qb_migrate_lib.php';

$dryRun = in_array('--dry-run', $argv, true);
$dropLegacy = in_array('--drop-legacy', $argv, true);

try {
    $pdo = db();
} catch (Throwable $e) {
    fwrite(STDERR, 'DB connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

if (class_exists(\ScienceSims\Schema\MigrationRunner::class)) {
    $runner = new \ScienceSims\Schema\MigrationRunner($pdo, $root);
    $runner->applyPending();
}

$result = lt_qb_migrate_all($pdo, $dryRun);
echo sprintf(
    "migrate: ok=%s migrated=%d skipped=%d errors=%d%s\n",
    $result['ok'] ? 'yes' : 'no',
    $result['migrated'],
    $result['skipped'],
    count($result['errors']),
    $dryRun ? ' (dry-run)' : ''
);
foreach ($result['errors'] as $err) {
    fwrite(STDERR, "  - {$err}\n");
}

if ($dropLegacy && !$dryRun) {
    $ltLeft = (int) $pdo->query('SELECT COUNT(*) FROM learning_tools')->fetchColumn();
    $unmapped = 0;
    if ($ltLeft > 0) {
        $unmapped = (int) $pdo->query(
            'SELECT COUNT(*) FROM learning_tools lt
             LEFT JOIN legacy_learning_tool_map m ON m.old_tool_id = lt.id
             WHERE m.old_tool_id IS NULL'
        )->fetchColumn();
    }
    $tli = 0;
    try {
        $tli = (int) $pdo->query(
            "SELECT COUNT(*) FROM topic_learning_items WHERE content_type = 'learning_tool'"
        )->fetchColumn();
    } catch (Throwable) {
    }
    $att = (int) $pdo->query(
        "SELECT COUNT(*) FROM learning_attempts WHERE source_type = 'learning_tool'"
    )->fetchColumn();

    if ($unmapped > 0 || $tli > 0 || $att > 0) {
        fwrite(STDERR, "Refuse --drop-legacy: unmapped_tools={$unmapped} tli_learning_tool={$tli} attempts={$att}\n");
        exit(1);
    }

    // Delete mapped tools then drop tables.
    $pdo->exec('DELETE FROM quiz_options');
    $pdo->exec('DELETE FROM quiz_questions');
    $pdo->exec('DELETE FROM learning_tools');
    $dropSql = file_get_contents($root . '/schema_drop_quiz_legacy.sql');
    if (is_string($dropSql)) {
        foreach (array_filter(array_map('trim', explode(';', $dropSql))) as $stmt) {
            if ($stmt === '' || str_starts_with($stmt, '--') || stripos($stmt, 'SET ') === 0) {
                continue;
            }
            $pdo->exec($stmt);
        }
    }
    echo "Dropped quiz_options, quiz_questions, learning_tools.\n";
}

exit($result['ok'] ? 0 : 1);
