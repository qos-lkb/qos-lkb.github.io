#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Sync simulation HTML from disk folders into simulations.html (DB).
 * Disk is the source of truth for HTML body; metadata (title/status) is left unchanged
 * unless --create-missing is passed (creates draft rows).
 *
 * Usage:
 *   php scripts/sync_simulations_to_db.php
 *   php scripts/sync_simulations_to_db.php --dry-run
 *   php scripts/sync_simulations_to_db.php --create-missing
 */

$root = dirname(__DIR__);
require_once $root . '/vendor/autoload.php';
require_once $root . '/includes/db.php';
require_once $root . '/includes/simulations_lib.php';
require_once $root . '/scripts/sim_path_aliases.php';

$dryRun = in_array('--dry-run', $argv, true);
$createMissing = in_array('--create-missing', $argv, true);

$subjectDirs = ['physics', 'chem', 'biology', 'science', 'astronomy', 'other', 'geography', 'music', 's4_physics'];
$pathAliases = sim_path_aliases();

try {
    $pdo = db();
} catch (Throwable $e) {
    fwrite(STDERR, 'DB connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

$updated = 0;
$created = 0;
$skipped = 0;
$missing = 0;

foreach ($subjectDirs as $dir) {
    $base = $root . '/' . $dir;
    if (!is_dir($base)) {
        continue;
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS)
    );
    /** @var SplFileInfo $file */
    foreach ($iterator as $file) {
        if (!$file->isFile() || strtolower($file->getExtension()) !== 'html') {
            continue;
        }
        $rel = substr($file->getPathname(), strlen($root) + 1);
        $rel = str_replace('\\', '/', $rel);
        $basename = pathinfo($rel, PATHINFO_FILENAME);
        $slugCandidate = sim_slugify($basename);
        if ($slugCandidate === '' || $slugCandidate === 'tag') {
            $skipped++;
            continue;
        }

        $html = file_get_contents($file->getPathname());
        if ($html === false) {
            fwrite(STDERR, "Cannot read {$rel}\n");
            continue;
        }

        $row = null;
        if (isset($pathAliases[$rel])) {
            $stmt = $pdo->prepare('SELECT id, slug, html FROM simulations WHERE slug = ? LIMIT 1');
            $stmt->execute([$pathAliases[$rel]]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        if (!$row) {
            // Prefer exact slug match; also try matching by source path in screenshot or title heuristics.
            $stmt = $pdo->prepare('SELECT id, slug, html FROM simulations WHERE slug = ? LIMIT 1');
            $stmt->execute([$slugCandidate]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        if (!$row) {
            // Fuzzy: slug contains basename slug
            $stmt = $pdo->prepare('SELECT id, slug, html FROM simulations WHERE slug LIKE ? ORDER BY id ASC LIMIT 5');
            $stmt->execute(['%' . $slugCandidate . '%']);
            $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $row = count($candidates) === 1 ? $candidates[0] : null;
        }

        if ($row) {
            if ((string) $row['html'] === $html) {
                $skipped++;
                continue;
            }
            if ($dryRun) {
                echo "[update] {$row['slug']} <- {$rel}\n";
                $updated++;
                continue;
            }
            $upd = $pdo->prepare('UPDATE simulations SET html = ?, last_updated = CURDATE() WHERE id = ?');
            $upd->execute([$html, (int) $row['id']]);
            echo "[updated] {$row['slug']} <- {$rel}\n";
            $updated++;
            continue;
        }

        $missing++;
        if (!$createMissing) {
            echo "[missing] no DB row for {$rel} (slug~{$slugCandidate}); pass --create-missing\n";
            continue;
        }
        if ($dryRun) {
            echo "[create] {$slugCandidate} <- {$rel}\n";
            $created++;
            continue;
        }
        $slug = sim_ensure_unique_slug($pdo, $slugCandidate);
        $ins = $pdo->prepare(
            'INSERT INTO simulations (slug, title_zh, title_en, html, status, last_updated, list_sort_order)
             VALUES (?, ?, ?, ?, \'draft\', CURDATE(), 0)'
        );
        $title = $basename;
        $ins->execute([$slug, $title, $title, $html]);
        echo "[created] {$slug} <- {$rel}\n";
        $created++;
    }
}

echo "\nDone. updated={$updated} created={$created} skipped={$skipped} unmatched={$missing}\n";
exit(0);
