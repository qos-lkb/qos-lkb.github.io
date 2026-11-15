#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * 檢查 simulations.html_path 是否指向科目資料夾內的 HTML 檔。
 * 不再把磁碟 HTML 寫入資料庫。匯出請用後台 admin/export_sim_html.php。
 *
 * Usage:
 *   php scripts/sync_simulations_to_db.php
 */

$root = dirname(__DIR__);
require_once $root . '/vendor/autoload.php';
require_once $root . '/includes/db.php';
require_once $root . '/includes/simulation_files.php';

try {
    $pdo = db();
} catch (Throwable $e) {
    fwrite(STDERR, 'DB connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

if (!sim_db_has_column($pdo, 'simulations', 'html_path')) {
    fwrite(STDERR, "simulations.html_path 不存在。請先執行 php scripts/apply_schema.php\n");
    exit(1);
}

$plan = sim_export_plan($pdo);
$counts = $plan['counts'];
echo 'ready=' . (int) $counts['ready']
    . ' same=' . (int) $counts['same']
    . ' create=' . (int) $counts['create']
    . ' differ=' . (int) $counts['differ']
    . ' disk_only=' . (int) $counts['disk_only']
    . ' empty=' . (int) $counts['empty']
    . ' ambiguous=' . (int) $counts['ambiguous']
    . PHP_EOL;

if (!$plan['ready']) {
    fwrite(STDERR, "尚未全部對應到 HTML 檔。請用後台「模擬 HTML 匯出」處理，不要把內容寫回資料庫。\n");
    foreach ($plan['items'] as $item) {
        if ($item['status'] === 'ready') {
            continue;
        }
        echo '[' . $item['status'] . '] ' . $item['slug'] . ' ' . ($item['path'] ?? '') . PHP_EOL;
    }
    exit(1);
}

echo "OK. 每一列的 html_path 都有對應檔案。\n";
exit(0);
