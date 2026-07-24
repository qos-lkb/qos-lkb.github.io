#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Apply pending schema_*.sql upgrades and record them in schema_migrations.
 *
 * Usage:
 *   php scripts/apply_schema.php
 *   php scripts/apply_schema.php --dry-run
 *   php scripts/apply_schema.php --status
 */

$root = dirname(__DIR__);
require_once $root . '/vendor/autoload.php';
require_once $root . '/includes/db.php';

use ScienceSims\Schema\MigrationRunner;

$dryRun = in_array('--dry-run', $argv, true);
$statusOnly = in_array('--status', $argv, true);

try {
    $pdo = db();
} catch (Throwable $e) {
    fwrite(STDERR, 'DB connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

$runner = new MigrationRunner($pdo, $root);
$runner->ensureMigrationsTable();

if ($statusOnly) {
    $applied = $runner->appliedFilenames();
    $pending = array_values(array_diff(MigrationRunner::defaultManifest(), $applied));
    echo "Applied (" . count($applied) . "):\n";
    foreach ($applied as $f) {
        echo "  ✓ {$f}\n";
    }
    echo "Pending (" . count($pending) . "):\n";
    foreach ($pending as $f) {
        echo "  · {$f}\n";
    }
    exit(0);
}

try {
    $result = $runner->applyPending(null, $dryRun);
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}

$label = $dryRun ? 'Would apply' : 'Applied';
echo $label . ' (' . count($result['applied']) . "):\n";
foreach ($result['applied'] as $f) {
    echo "  + {$f}\n";
}
echo 'Skipped already applied (' . count($result['skipped']) . "):\n";
foreach ($result['skipped'] as $f) {
    echo "  = {$f}\n";
}

exit(0);
