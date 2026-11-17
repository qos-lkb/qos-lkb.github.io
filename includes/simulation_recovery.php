<?php

declare(strict_types=1);

require_once __DIR__ . '/simulation_disk_import.php';
require_once __DIR__ . '/simulation_files.php';
require_once __DIR__ . '/config.php';

/**
 * @return array<string, true>
 */
function sim_recovery_issue_statuses(): array
{
    return [
        'same' => true,
        'disk_only' => true,
        'ambiguous' => true,
        'empty' => true,
        'create' => true,
        'differ' => true,
    ];
}

function sim_recovery_item_matches_search(array $fields, string $needle): bool
{
    if ($needle === '') {
        return true;
    }
    $hay = strtolower(implode(' ', array_map('strval', $fields)));

    return str_contains($hay, $needle);
}

/**
 * @return array{
 *   ai_configured:bool,
 *   has_path_column:bool,
 *   search:string,
 *   subjects:list<array{id:int,slug:string,name_zh:string,name_en:string}>,
 *   counts:array<string,int>,
 *   disk_items:list<array<string,mixed>>,
 *   db_items:list<array<string,mixed>>,
 *   missing_items:list<array<string,mixed>>
 * }
 */
function sim_recovery_plan(PDO $pdo, string $search = ''): array
{
    $needle = strtolower(trim($search));
    $diskPlan = sim_unregistered_disk_plan($pdo, $search);
    $exportPlan = sim_export_plan($pdo);
    $issueStatuses = sim_recovery_issue_statuses();

    $dbItems = [];
    foreach ($exportPlan['items'] as $item) {
        $status = (string) ($item['status'] ?? '');
        if (!isset($issueStatuses[$status])) {
            continue;
        }
        if (!sim_recovery_item_matches_search([
            (string) ($item['slug'] ?? ''),
            (string) ($item['title'] ?? ''),
            (string) ($item['path'] ?? ''),
            $status,
            implode(' ', $item['candidates'] ?? []),
        ], $needle)) {
            continue;
        }
        $dbItems[] = [
            'id' => (int) ($item['id'] ?? 0),
            'slug' => (string) ($item['slug'] ?? ''),
            'title' => (string) ($item['title'] ?? ''),
            'path' => $item['path'] !== null ? (string) $item['path'] : null,
            'status' => $status,
            'source' => (string) ($item['source'] ?? ''),
            'candidates' => array_values(array_map('strval', $item['candidates'] ?? [])),
            'linkable' => $item['path'] !== null && $item['path'] !== '',
        ];
    }

    $missingItems = [];
    foreach (sim_export_rows($pdo) as $row) {
        $stored = sim_normalize_rel_path((string) ($row['html_path'] ?? ''));
        if ($stored === null) {
            continue;
        }
        if (sim_read_html_file($stored) !== null) {
            continue;
        }
        $title = (string) (($row['title_zh'] ?? '') !== '' ? $row['title_zh'] : ($row['title_en'] ?? ''));
        if (!sim_recovery_item_matches_search([
            (string) ($row['slug'] ?? ''),
            $title,
            $stored,
        ], $needle)) {
            continue;
        }
        $missingItems[] = [
            'id' => (int) $row['id'],
            'slug' => (string) ($row['slug'] ?? ''),
            'title' => $title,
            'html_path' => $stored,
        ];
    }

    $counts = [
        'disk_unregistered' => (int) ($diskPlan['counts']['total'] ?? 0),
        'db_issues' => count($dbItems),
        'missing_files' => count($missingItems),
        'catalog_ready' => (int) ($exportPlan['counts']['ready'] ?? 0),
        'catalog_total' => count($exportPlan['items']),
    ];

    return [
        'ai_configured' => config_xai_api_key() !== '',
        'has_path_column' => (bool) ($diskPlan['has_path_column'] ?? false),
        'search' => $search,
        'subjects' => sim_disk_import_subject_options($pdo),
        'counts' => $counts,
        'disk_items' => $diskPlan['items'],
        'db_items' => $dbItems,
        'missing_items' => $missingItems,
    ];
}

/**
 * @param list<array{sim_id:int, path:string}> $links
 * @return array{ok:bool, linked:int, skipped:int, errors:list<string>}
 */
function sim_recovery_link_paths(PDO $pdo, array $links): array
{
    if (!sim_db_has_column($pdo, 'simulations', 'html_path')) {
        return ['ok' => false, 'linked' => 0, 'skipped' => 0, 'errors' => ['資料庫尚未有 html_path 欄。']];
    }

    $upd = $pdo->prepare('UPDATE simulations SET html_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $linked = 0;
    $skipped = 0;
    $errors = [];

    foreach ($links as $entry) {
        if (!is_array($entry)) {
            $skipped++;
            continue;
        }
        $simId = (int) ($entry['sim_id'] ?? 0);
        $path = sim_normalize_rel_path((string) ($entry['path'] ?? ''));
        if ($simId < 1 || $path === null || sim_read_html_file($path) === null) {
            $skipped++;
            continue;
        }
        try {
            $upd->execute([$path, $simId]);
            $linked++;
        } catch (Throwable $e) {
            $errors[] = '#' . $simId . ': ' . $e->getMessage();
        }
    }

    return ['ok' => $errors === [], 'linked' => $linked, 'skipped' => $skipped, 'errors' => $errors];
}