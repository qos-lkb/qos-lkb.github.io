#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Copy simulation HTML from sibling only_sims into this repo.
 * Overwrites when a disk file matches by slug/filename rules or identical content; otherwise creates a new path.
 *
 * Usage:
 *   php scripts/import_from_only_sims.php [--dry-run] [--source=/path/to/only_sims]
 */

$root = dirname(__DIR__);
require_once $root . '/includes/simulation_files.php';

$dryRun = in_array('--dry-run', $argv, true);
$sourceRoot = dirname($root) . '/only_sims';
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--source=')) {
        $sourceRoot = substr($arg, strlen('--source='));
    }
}
$sourceRoot = realpath($sourceRoot);
if ($sourceRoot === false || !is_dir($sourceRoot)) {
    fwrite(STDERR, "only_sims 目錄不存在：{$sourceRoot}\n");
    exit(1);
}

/** Map only_sims top-level folder → science_sims subject dir. */
function only_sims_subject_dir(string $folder): string
{
    $map = [
        'chemistry' => 'chem',
        'physics' => 'physics',
        'biology' => 'biology',
        'science' => 'science',
        'astronomy' => 'astronomy',
    ];
    $key = strtolower(trim($folder));
    return $map[$key] ?? $key;
}

/**
 * @return list<array{file:string,id:string,folder:string}>
 */
function only_sims_catalog(string $sourceRoot): array
{
    $libPath = $sourceRoot . '/library.json';
    $fromLib = [];
    $seenFiles = [];
    if (is_readable($libPath)) {
        $decoded = json_decode((string) file_get_contents($libPath), true);
        if (is_array($decoded) && isset($decoded['sims']) && is_array($decoded['sims'])) {
            foreach ($decoded['sims'] as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $file = str_replace('\\', '/', trim((string) ($row['file'] ?? '')));
                $id = trim((string) ($row['id'] ?? ''));
                if ($file === '' || $id === '' || !str_ends_with(strtolower($file), '.html')) {
                    continue;
                }
                $parts = explode('/', $file);
                $folder = (string) ($row['folder'] ?? $parts[0]);
                $fromLib[] = ['file' => $file, 'id' => $id, 'folder' => $folder];
                $seenFiles[$file] = true;
            }
        }
    }

    $subjects = ['physics', 'chemistry', 'biology', 'science', 'astronomy'];
    foreach ($subjects as $sub) {
        $base = $sourceRoot . '/' . $sub;
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
            $rel = $sub . '/' . $file->getFilename();
            if (isset($seenFiles[$rel])) {
                continue;
            }
            $basename = pathinfo($file->getFilename(), PATHINFO_FILENAME);
            $id = strtolower(str_replace('_', '-', $basename));
            $fromLib[] = ['file' => $rel, 'id' => $id, 'folder' => $sub];
        }
    }

    usort($fromLib, static fn (array $a, array $b): int => strcmp($a['file'], $b['file']));
    return $fromLib;
}

/**
 * @param list<string> $paths
 */
function only_sims_pick_subject_match(array $paths, string $subjectDir): ?string
{
    $inSubject = array_values(array_filter(
        $paths,
        static fn (string $path): bool => str_starts_with($path, $subjectDir . '/')
    ));
    if (count($inSubject) === 1) {
        return $inSubject[0];
    }
    if (count($paths) === 1) {
        return $paths[0];
    }
    return null;
}

/**
 * @param array<string, list<string>> $contentIndex normalized body → rel paths
 */
function only_sims_match_by_content(array $contentIndex, string $html, string $subjectDir): ?string
{
    $norm = static function (string $body): string {
        return str_replace(["\r\n", "\r"], "\n", $body);
    };
    $key = $norm($html);
    $paths = $contentIndex[$key] ?? [];
    if ($paths === []) {
        return null;
    }
    return only_sims_pick_subject_match($paths, $subjectDir);
}

/**
 * @return array<string, list<string>>
 */
function only_sims_build_content_index(): array
{
    $index = [];
    foreach (sim_list_html_files() as $rel) {
        $html = sim_read_html_file($rel);
        if ($html === null) {
            continue;
        }
        $key = str_replace(["\r\n", "\r"], "\n", $html);
        $index[$key] ??= [];
        $index[$key][] = $rel;
    }
    foreach ($index as &$paths) {
        sort($paths);
        $paths = array_values(array_unique($paths));
    }
    unset($paths);
    return $index;
}

/**
 * @param list<array{path:string,key:string}> $diskIndex
 * @param array<string, list<string>> $contentIndex
 */
function only_sims_resolve_target(
    string $slug,
    string $subjectDir,
    string $sourceHtml,
    array $diskIndex,
    array $contentIndex
): string {
    $bySlug = sim_disk_matches_for_slug($diskIndex, $slug);
    $picked = only_sims_pick_subject_match($bySlug, $subjectDir);
    if ($picked !== null) {
        return $picked;
    }
    $byContent = only_sims_match_by_content($contentIndex, $sourceHtml, $subjectDir);
    if ($byContent !== null) {
        return $byContent;
    }
    return sim_new_rel_path($slug, $subjectDir);
}

sim_ensure_subject_dirs();
$diskIndex = sim_disk_index();
$contentIndex = only_sims_build_content_index();
$catalog = only_sims_catalog($sourceRoot);

$stats = [
    'written' => 0,
    'overwritten_same' => 0,
    'missing_source' => 0,
    'errors' => 0,
];

foreach ($catalog as $entry) {
    $relSource = $entry['file'];
    $srcAbs = $sourceRoot . '/' . str_replace('/', DIRECTORY_SEPARATOR, $relSource);
    if (!is_file($srcAbs)) {
        ++$stats['missing_source'];
        fwrite(STDERR, "[missing] {$relSource}\n");
        continue;
    }
    $html = (string) file_get_contents($srcAbs);
    $subjectDir = only_sims_subject_dir($entry['folder']);
    $targetRel = only_sims_resolve_target($entry['id'], $subjectDir, $html, $diskIndex, $contentIndex);
    $existing = sim_read_html_file($targetRel);
    if ($dryRun) {
        $action = $existing === null ? 'create' : 'overwrite';
        if ($existing !== null && sim_html_same($existing, $html)) {
            $action .= '_same_content';
        }
        echo "[{$action}] {$relSource} -> {$targetRel}\n";
        ++$stats['written'];
        continue;
    }
    if ($existing !== null && sim_html_same($existing, $html)) {
        ++$stats['overwritten_same'];
    }
    $result = sim_write_html_file($targetRel, $html);
    if (!$result['ok']) {
        ++$stats['errors'];
        fwrite(STDERR, '[error] ' . $relSource . ': ' . ($result['error'] ?? 'unknown') . "\n");
        continue;
    }
    ++$stats['written'];
    $key = str_replace(["\r\n", "\r"], "\n", $html);
    $contentIndex[$key] ??= [];
    if (!in_array($targetRel, $contentIndex[$key], true)) {
        $contentIndex[$key][] = $targetRel;
        sort($contentIndex[$key]);
    }
    $diskIndex[] = ['path' => $targetRel, 'key' => sim_norm_key(pathinfo($targetRel, PATHINFO_FILENAME))];
}

echo ($dryRun ? 'DRY-RUN ' : '')
    . 'written=' . $stats['written']
    . ' overwritten_same=' . $stats['overwritten_same']
    . ' missing_source=' . $stats['missing_source']
    . ' errors=' . $stats['errors']
    . PHP_EOL;

exit($stats['errors'] > 0 ? 1 : 0);