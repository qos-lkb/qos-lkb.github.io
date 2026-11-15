#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Drop simulations.html after every row has an on-disk file.
 *
 * Usage:
 *   php scripts/drop_simulations_html_column.php
 *   php scripts/drop_simulations_html_column.php --dry-run
 */

$root = dirname(__DIR__);
require_once $root . '/vendor/autoload.php';
require_once $root . '/includes/db.php';
require_once $root . '/includes/simulation_files.php';

$dryRun = in_array('--dry-run', $argv, true);

try {
    $pdo = db();
} catch (Throwable $e) {
    fwrite(STDERR, 'DB connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

if (!sim_db_has_column($pdo, 'simulations', 'html')) {
    echo "simulations.html 已經不存在。\n";
    exit(0);
}

if (!sim_db_has_column($pdo, 'simulations', 'html_path')) {
    fwrite(STDERR, "尚未有 html_path，不能刪除 html。\n");
    exit(1);
}

$plan = sim_export_plan($pdo);
if (!$plan['ready']) {
    fwrite(STDERR, "仍有模擬沒有對應 HTML 檔，已拒絕刪除 html 欄。\n");
    foreach ($plan['counts'] as $status => $count) {
        if ($status === 'ready' || $count === 0) {
            continue;
        }
        fwrite(STDERR, "  {$status}={$count}\n");
    }
    exit(1);
}

if ($dryRun) {
    echo "可以刪除 simulations.html（" . count($plan['items']) . " 列都有檔案）。\n";
    exit(0);
}

$pdo->exec('ALTER TABLE simulations DROP COLUMN html');
echo "已刪除 simulations.html。\n";
exit(0);
