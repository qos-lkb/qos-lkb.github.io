<?php

declare(strict_types=1);

require_once __DIR__ . '/simulation_files.php';
require_once __DIR__ . '/simulations_lib.php';
require_once __DIR__ . '/simulation_save.php';

/**
 * @return array<string, true>
 */
function sim_disk_claimed_paths(PDO $pdo): array
{
    $claimed = [];
    foreach (sim_path_aliases() as $path => $slug) {
        $normalized = sim_normalize_rel_path($path);
        if ($normalized !== null) {
            $claimed[$normalized] = true;
        }
    }

    $index = sim_disk_index();
    foreach (sim_export_rows($pdo) as $row) {
        $stored = sim_normalize_rel_path((string) ($row['html_path'] ?? ''));
        if ($stored !== null) {
            $claimed[$stored] = true;
        }
        $target = sim_resolve_export_target($row, $index);
        if ($target['path'] !== null && $target['source'] !== 'ambiguous') {
            $claimed[(string) $target['path']] = true;
        }
    }

    return $claimed;
}

/**
 * @return array<string, array{id:int, slug:string, html_path:?string}>
 */
function sim_disk_slug_index(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT id, slug, html_path FROM simulations ORDER BY id ASC');
    $rows = $stmt ? $stmt->fetchAll() : [];
    $out = [];
    foreach ($rows ?: [] as $row) {
        $slug = (string) ($row['slug'] ?? '');
        if ($slug === '') {
            continue;
        }
        $out[$slug] = [
            'id' => (int) $row['id'],
            'slug' => $slug,
            'html_path' => isset($row['html_path']) && $row['html_path'] !== '' ? (string) $row['html_path'] : null,
        ];
    }
    return $out;
}

/**
 * @return array<string, array{name:string, description:string}>
 */
function sim_only_sims_library_hints(): array
{
    static $cache = null;
    if (is_array($cache)) {
        return $cache;
    }
    $cache = [];
    $path = dirname(sim_project_root()) . '/only_sims/library.json';
    if (!is_readable($path)) {
        return $cache;
    }
    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded) || !isset($decoded['sims']) || !is_array($decoded['sims'])) {
        return $cache;
    }
    foreach ($decoded['sims'] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $id = trim((string) ($row['id'] ?? ''));
        if ($id === '') {
            continue;
        }
        $cache[$id] = [
            'name' => trim((string) ($row['name'] ?? '')),
            'description' => trim((string) ($row['description'] ?? '')),
        ];
        $file = str_replace('\\', '/', trim((string) ($row['file'] ?? '')));
        if ($file !== '') {
            $base = pathinfo($file, PATHINFO_FILENAME);
            $key = sim_norm_key($base);
            if ($key !== '' && !isset($cache[$key])) {
                $cache[$key] = $cache[$id];
            }
        }
    }
    return $cache;
}

function sim_proposed_slug_for_disk_path(string $relPath): string
{
    foreach (sim_path_aliases() as $path => $slug) {
        if ($path === $relPath) {
            return $slug;
        }
    }
    $base = pathinfo($relPath, PATHINFO_FILENAME);
    return str_replace('_', '-', strtolower($base));
}

function sim_title_from_html_document(string $html): string
{
    if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m)) {
        $title = trim(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if ($title !== '') {
            return $title;
        }
    }
    return '';
}

function sim_humanize_slug_label(string $slug): string
{
    $t = str_replace(['-', '_'], ' ', $slug);
    return $t !== '' ? $t : $slug;
}

/**
 * @return array<int, array{id:int, slug:string, name_zh:string, name_en:string}>
 */
function sim_disk_import_subject_options(PDO $pdo): array
{
    $rows = sim_all_subjects($pdo);
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int) $row['id'],
            'slug' => (string) ($row['slug'] ?? ''),
            'name_zh' => (string) ($row['name_zh'] ?? ''),
            'name_en' => (string) ($row['name_en'] ?? ''),
        ];
    }
    return $out;
}

function sim_subject_id_for_disk_folder(PDO $pdo, string $folder): ?int
{
    $folder = strtolower(trim($folder));
    $candidates = match ($folder) {
        'physics', 's4_physics' => ['physics', 's4-physics', 's4_physics'],
        'chem' => ['chem', 'chemistry'],
        'biology' => ['biology', 'bio'],
        'science' => ['science', 'integrated_science', 'integrated-science'],
        'astronomy' => ['astronomy'],
        'geography' => ['geography'],
        'music' => ['music'],
        'other' => ['other', 'science'],
        default => [$folder],
    };
    $stmt = $pdo->prepare('SELECT id FROM subjects WHERE slug = ? LIMIT 1');
    foreach ($candidates as $slug) {
        $stmt->execute([$slug]);
        $id = $stmt->fetchColumn();
        if ($id !== false) {
            return (int) $id;
        }
    }
    return null;
}

/**
 * @return array{
 *   has_path_column:bool,
 *   items:list<array<string, mixed>>,
 *   counts:array<string, int>,
 *   search:string
 * }
 */
function sim_unregistered_disk_plan(PDO $pdo, string $search = ''): array
{
    $hasPath = sim_db_has_column($pdo, 'simulations', 'html_path');
    $claimed = sim_disk_claimed_paths($pdo);
    $slugIndex = sim_disk_slug_index($pdo);
    $hints = sim_only_sims_library_hints();
    $needle = strtolower(trim($search));

    $items = [];
    $counts = [
        'unregistered' => 0,
        'slug_exists' => 0,
        'total' => 0,
    ];

    foreach (sim_list_html_files() as $rel) {
        if (isset($claimed[$rel])) {
            continue;
        }

        $proposedSlug = sim_proposed_slug_for_disk_path($rel);
        $fileKey = sim_norm_key(pathinfo($rel, PATHINFO_FILENAME));
        $hint = $hints[$proposedSlug] ?? ($hints[$fileKey] ?? null);

        $html = sim_read_html_file($rel) ?? '';
        $titleFromDoc = sim_title_from_html_document($html);
        $titleZh = $hint['name'] ?? ($titleFromDoc !== '' ? $titleFromDoc : sim_humanize_slug_label($proposedSlug));
        $titleEn = $titleFromDoc !== '' ? $titleFromDoc : ($hint['name'] ?? sim_humanize_slug_label($proposedSlug));
        $summaryZh = $hint['description'] ?? '';
        $summaryEn = $summaryZh;

        $folder = explode('/', $rel)[0] ?? 'other';
        $subjectId = sim_subject_id_for_disk_folder($pdo, $folder);

        $existing = $slugIndex[$proposedSlug] ?? null;
        $kind = $existing !== null ? 'slug_exists' : 'unregistered';
        $importable = true;
        $existingId = null;
        if ($existing !== null) {
            $existingId = $existing['id'];
            $stored = $existing['html_path'];
            if ($stored !== null && sim_normalize_rel_path($stored) === $rel) {
                continue;
            }
            $kind = 'slug_exists';
            $counts['slug_exists']++;
        } else {
            $counts['unregistered']++;
        }

        if ($needle !== '') {
            $hay = strtolower(implode(' ', [$rel, $proposedSlug, $titleZh, $titleEn, $folder]));
            if (!str_contains($hay, $needle)) {
                continue;
            }
        }

        $counts['total']++;
        $items[] = [
            'path' => $rel,
            'proposed_slug' => $proposedSlug,
            'title_zh' => $titleZh,
            'title_en' => $titleEn,
            'summary_zh' => $summaryZh,
            'summary_en' => $summaryEn,
            'subject_id' => $subjectId,
            'subject_folder' => $folder,
            'kind' => $kind,
            'importable' => $importable,
            'existing_sim_id' => $existingId,
        ];
    }

    usort($items, static fn (array $a, array $b): int => strcmp((string) $a['path'], (string) $b['path']));

    return [
        'has_path_column' => $hasPath,
        'items' => $items,
        'counts' => $counts,
        'search' => $search,
    ];
}

/**
 * @param list<string> $paths
 * @param array<string, array{subject_id?:int|null,title_zh?:string,title_en?:string,summary_zh?:string,summary_en?:string,slug?:string}> $overrides
 * @return array{ok:bool, error?:string, created:int, linked:int, skipped:int, errors:list<string>}
 */
function sim_disk_import_execute(
    PDO $pdo,
    array $paths,
    int $ownerUserId,
    string $status,
    bool $canPublishAny,
    array $overrides = []
): array {
    if (!sim_db_has_column($pdo, 'simulations', 'html_path')) {
        return [
            'ok' => false,
            'error' => '資料庫尚未有 html_path 欄。請先執行 php scripts/apply_schema.php。',
            'created' => 0,
            'linked' => 0,
            'skipped' => 0,
            'errors' => [],
        ];
    }

    $status = sim_resolve_status($status, $canPublishAny);
    $plan = sim_unregistered_disk_plan($pdo, '');
    $byPath = [];
    foreach ($plan['items'] as $item) {
        if (!($item['importable'] ?? false)) {
            continue;
        }
        $byPath[(string) $item['path']] = $item;
    }

    $htmlCol = sim_db_has_column($pdo, 'simulations', 'html') ? 'html, ' : '';
    $htmlVal = sim_db_has_column($pdo, 'simulations', 'html') ? 'NULL, ' : '';

    $created = 0;
    $linked = 0;
    $skipped = 0;
    $errors = [];

    $linkStmt = $pdo->prepare('UPDATE simulations SET html_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $insStmt = $pdo->prepare(
        'INSERT INTO simulations (
            owner_user_id, slug, title_zh, title_en, summary_zh, summary_en, ' . $htmlCol . 'html_path, screenshot_path,
            subject_id, topic_id, list_sort_order, status, submitter_name, submitter_email, submitter_note,
            submission_source, last_updated
         ) VALUES (?, ?, ?, ?, ?, ?, ' . $htmlVal . '?, NULL, ?, NULL, 0, ?, NULL, NULL, NULL, \'editor\', CURDATE())'
    );

    foreach ($paths as $raw) {
        $rel = sim_normalize_rel_path((string) $raw);
        if ($rel === null || sim_read_html_file($rel) === null) {
            $skipped++;
            continue;
        }
        $item = $byPath[$rel] ?? null;
        if ($item === null) {
            $skipped++;
            continue;
        }

        $ov = isset($overrides[$rel]) && is_array($overrides[$rel]) ? $overrides[$rel] : [];

        $existingId = $item['existing_sim_id'] ?? null;
        if ($existingId !== null) {
            $linkStmt->execute([$rel, (int) $existingId]);
            $linked++;
            continue;
        }

        $baseSlug = substr((string) ($ov['slug'] ?? $item['proposed_slug']), 0, 190);
        $slug = sim_ensure_unique_slug($pdo, $baseSlug);
        $titleZh = (string) ($ov['title_zh'] ?? $item['title_zh'] ?? $slug);
        $titleEn = (string) ($ov['title_en'] ?? $item['title_en'] ?? $titleZh);
        $summaryZh = (string) ($ov['summary_zh'] ?? $item['summary_zh'] ?? '');
        $summaryEn = (string) ($ov['summary_en'] ?? $item['summary_en'] ?? '');
        $subjectId = array_key_exists('subject_id', $ov) ? $ov['subject_id'] : ($item['subject_id'] ?? null);

        try {
            $insStmt->execute([
                $ownerUserId,
                $slug,
                $titleZh,
                $titleEn,
                $summaryZh,
                $summaryEn,
                $rel,
                $subjectId,
                $status,
            ]);
            $created++;
        } catch (Throwable $e) {
            $errors[] = $rel . ': ' . $e->getMessage();
        }
    }

    return [
        'ok' => $errors === [],
        'error' => $errors !== [] ? implode('；', array_slice($errors, 0, 3)) : null,
        'created' => $created,
        'linked' => $linked,
        'skipped' => $skipped,
        'errors' => $errors,
    ];
}