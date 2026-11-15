#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Register on-disk simulation HTML rows not yet in simulations (CLI).
 *
 * Usage:
 *   php scripts/import_disk_simulations_to_db.php [--dry-run] [--q=keyword] [--all]
 *   php scripts/import_disk_simulations_to_db.php path/to/file.html ...
 */

$root = dirname(__DIR__);
require_once $root . '/vendor/autoload.php';
require_once $root . '/includes/db.php';
require_once $root . '/includes/auth.php';
require_once $root . '/includes/simulation_disk_import.php';

$dryRun = in_array('--dry-run', $argv, true);
$importAll = in_array('--all', $argv, true);
$search = '';
$pathsArg = [];
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--q=')) {
        $search = substr($arg, strlen('--q='));
    } elseif (!str_starts_with($arg, '--') && $arg !== $argv[0] && str_ends_with(strtolower($arg), '.html')) {
        $pathsArg[] = $arg;
    }
}

try {
    $pdo = db();
} catch (Throwable $e) {
    fwrite(STDERR, 'DB connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

$ownerId = 1;
$row = $pdo->query('SELECT id FROM users WHERE role = \'admin\' ORDER BY id ASC LIMIT 1')->fetch();
if ($row) {
    $ownerId = (int) $row['id'];
}

$plan = sim_unregistered_disk_plan($pdo, $search);
$paths = $pathsArg;
if ($paths === [] && $importAll) {
    foreach ($plan['items'] as $item) {
        if ($item['importable'] ?? false) {
            $paths[] = (string) $item['path'];
        }
    }
}

if ($paths === []) {
    echo 'unregistered=' . (int) ($plan['counts']['unregistered'] ?? 0)
        . ' slug_exists=' . (int) ($plan['counts']['slug_exists'] ?? 0)
        . ' matching=' . (int) ($plan['counts']['total'] ?? 0) . PHP_EOL;
    foreach ($plan['items'] as $item) {
        echo (string) $item['path'] . ' [' . (string) $item['kind'] . '] ' . (string) $item['proposed_slug'] . PHP_EOL;
    }
    fwrite(STDERR, "請加上 --all 或指定 .html 路徑。\n");
    exit($plan['items'] === [] ? 0 : 1);
}

if ($dryRun) {
    foreach ($paths as $path) {
        echo "[dry-run] {$path}\n";
    }
    exit(0);
}

$result = sim_disk_import_execute($pdo, $paths, $ownerId, 'draft', true);
echo 'created=' . (int) $result['created']
    . ' linked=' . (int) $result['linked']
    . ' skipped=' . (int) $result['skipped'] . PHP_EOL;
if (!$result['ok']) {
    fwrite(STDERR, (string) ($result['error'] ?? 'failed') . PHP_EOL);
    exit(1);
}
exit(0);