<?php

declare(strict_types=1);

require_once __DIR__ . '/simulations_lib.php';
require_once dirname(__DIR__) . '/scripts/sim_path_aliases.php';

/**
 * Subject folders that may hold simulation HTML (relative to the project root).
 *
 * @return list<string>
 */
function sim_html_allowed_roots(): array
{
    return ['physics', 'chem', 'biology', 'science', 'astronomy', 'geography', 'music', 'other', 's4_physics'];
}

function sim_project_root(): string
{
    return dirname(__DIR__);
}

/**
 * Create any missing subject folder. Does not move or overwrite HTML files.
 *
 * @return list<string> directories created
 */
function sim_ensure_subject_dirs(): array
{
    $created = [];
    $root = sim_project_root();
    foreach (sim_html_allowed_roots() as $dir) {
        $path = $root . '/' . $dir;
        if (is_dir($path)) {
            continue;
        }
        if (mkdir($path, 0755, true) || is_dir($path)) {
            $created[] = $dir;
        }
    }
    return $created;
}

function sim_db_has_column(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $key = $table . '.' . $column;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    $cache[$key] = ((int) $stmt->fetchColumn()) > 0;
    return $cache[$key];
}

/**
 * @return non-empty-string|null
 */
function sim_normalize_rel_path(string $rel): ?string
{
    $rel = str_replace('\\', '/', trim($rel));
    $rel = ltrim($rel, '/');
    if ($rel === '' || str_contains($rel, "\0") || str_contains($rel, '..')) {
        return null;
    }
    if (!str_ends_with(strtolower($rel), '.html')) {
        return null;
    }
    $parts = explode('/', $rel);
    if (!in_array($parts[0], sim_html_allowed_roots(), true)) {
        return null;
    }
    foreach ($parts as $part) {
        if ($part === '' || $part === '.' || $part === '..') {
            return null;
        }
    }
    return $rel;
}

function sim_alias_path_for_slug(string $slug): ?string
{
    foreach (sim_path_aliases() as $path => $aliasSlug) {
        if ($aliasSlug === $slug) {
            $normalized = sim_normalize_rel_path($path);
            if ($normalized !== null) {
                return $normalized;
            }
        }
    }
    return null;
}

function sim_subject_dir_from_meta(?string $slug, ?string $nameEn, ?string $nameZh): string
{
    $blob = strtolower(trim(($slug ?? '') . ' ' . ($nameEn ?? '') . ' ' . ($nameZh ?? '')));
    $slugKey = strtolower(str_replace([' ', '-'], '_', trim((string) $slug)));
    $map = [
        'physics' => 'physics',
        'chem' => 'chem',
        'chemistry' => 'chem',
        'biology' => 'biology',
        'bio' => 'biology',
        'science' => 'science',
        'integrated_science' => 'science',
        'astronomy' => 'astronomy',
        'geography' => 'geography',
        'music' => 'music',
        'other' => 'other',
        's4_physics' => 's4_physics',
        's4physics' => 's4_physics',
    ];
    if (isset($map[$slugKey])) {
        return $map[$slugKey];
    }
    if (in_array($slugKey, sim_html_allowed_roots(), true)) {
        return $slugKey;
    }
    if (str_contains($blob, 's4') && (str_contains($blob, 'phys') || str_contains($blob, '物理'))) {
        return 's4_physics';
    }
    if (str_contains($blob, 'chem') || str_contains($blob, '化學')) {
        return 'chem';
    }
    if (str_contains($blob, 'bio') || str_contains($blob, '生物')) {
        return 'biology';
    }
    if (str_contains($blob, 'astro') || str_contains($blob, '天文')) {
        return 'astronomy';
    }
    if (str_contains($blob, 'geo') || str_contains($blob, '地理')) {
        return 'geography';
    }
    if (str_contains($blob, 'music') || str_contains($blob, '音樂')) {
        return 'music';
    }
    if (str_contains($blob, 'phys') || str_contains($blob, '物理')) {
        return 'physics';
    }
    if (str_contains($blob, 'science') || str_contains($blob, '科學')) {
        return 'science';
    }
    return 'other';
}

/**
 * Curriculum filenames land in physics/0X, physics/e0X, or s4_physics/.
 */
function sim_curriculum_rel_path(string $basename): ?string
{
    $base = strtolower(str_replace('-', '_', $basename));
    $base = preg_replace('/[^a-z0-9_]+/', '_', $base) ?? '';
    $base = trim($base, '_');
    if ($base === '') {
        return null;
    }
    if (preg_match('/^(0[1-5])[0-9]{2}_/', $base, $m)) {
        return 'physics/' . $m[1] . '/' . $base . '.html';
    }
    if (preg_match('/^e(0[1-9])[0-9]{2}_/', $base, $m)) {
        return 'physics/e' . $m[1] . '/' . $base . '.html';
    }
    if (preg_match('/^4a[0-9]{2}_/', $base)) {
        return 's4_physics/' . $base . '.html';
    }
    return null;
}

function sim_new_rel_path(string $slug, string $subjectDir): string
{
    $base = strtolower(str_replace('-', '_', $slug));
    $base = preg_replace('/[^a-z0-9_]+/', '_', $base) ?? '';
    $base = trim($base, '_');
    if ($base === '' || $base === 'tag') {
        $base = 'simulation';
    }
    $curriculum = sim_curriculum_rel_path($base);
    if ($curriculum !== null) {
        return $curriculum;
    }
    if (!in_array($subjectDir, sim_html_allowed_roots(), true)) {
        $subjectDir = 'other';
    }
    return $subjectDir . '/' . $base . '.html';
}

function sim_html_same(string $a, string $b): bool
{
    if ($a === $b) {
        return true;
    }
    $norm = static function (string $html): string {
        return str_replace(["\r\n", "\r"], "\n", $html);
    };
    return $norm($a) === $norm($b);
}

/**
 * @return list<string> relative paths
 */
function sim_list_html_files(): array
{
    $root = sim_project_root();
    $rootPrefix = rtrim(str_replace('\\', '/', $root), '/') . '/';
    $out = [];
    foreach (sim_html_allowed_roots() as $dir) {
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
            $full = str_replace('\\', '/', $file->getPathname());
            if (!str_starts_with($full, $rootPrefix)) {
                continue;
            }
            $rel = substr($full, strlen($rootPrefix));
            if (preg_match('#(^|/)screenshots/#', $rel)) {
                continue;
            }
            $normalized = sim_normalize_rel_path($rel);
            if ($normalized !== null) {
                $out[] = $normalized;
            }
        }
    }
    sort($out);
    return $out;
}

function sim_match_prefix_allowed(string $prefix): bool
{
    if ($prefix === '') {
        return true;
    }
    if (in_array($prefix, ['physics', 'chem', 'chemistry', 'biology', 'bio', 'science', 'astronomy', 'geography', 'music', 'other', 's4-physics', 's4'], true)) {
        return true;
    }
    if (preg_match('/^(?:0[1-5]|e0[1-9]|e[0-9]{4}|4a[0-9]{2}|[0-9]{2,4})$/', $prefix)) {
        return true;
    }
    return preg_match(
        '/^(?:physics|chem|biology|science|astronomy|geography|music|other|s4-physics)(?:-(?:0[1-5]|e0[1-9]|03a|03b|04a|04b|05))?$/',
        $prefix
    ) === 1;
}

function sim_norm_key(string $value): string
{
    $value = strtolower(str_replace('_', '-', $value));
    $value = preg_replace('/[^a-z0-9-]+/', '-', $value) ?? '';
    $value = preg_replace('/-+/', '-', $value) ?? '';
    return trim($value, '-');
}

/**
 * @return list<array{path:string,key:string}>
 */
function sim_disk_index(): array
{
    $index = [];
    foreach (sim_list_html_files() as $rel) {
        $key = sim_norm_key(pathinfo($rel, PATHINFO_FILENAME));
        if ($key === '' || $key === 'tag' || strlen($key) < 3) {
            continue;
        }
        $index[] = ['path' => $rel, 'key' => $key];
    }
    return $index;
}

/**
 * Match a catalogue slug to an existing file.
 * Slugs often carry a subject prefix (`physics-01-0101_…`) while the filename does not,
 * and curriculum files often carry a code prefix (`0301_laws_of_reflection`).
 * The longest matching name wins.
 *
 * @param list<array{path:string,key:string}> $index
 * @return list<string>
 */
function sim_disk_matches_for_slug(array $index, string $slug): array
{
    $slugKey = sim_norm_key($slug);
    if ($slugKey === '' || $slugKey === 'tag') {
        return [];
    }
    $bestLen = 0;
    $best = [];
    foreach ($index as $item) {
        $fileKey = $item['key'];
        if ($fileKey === '') {
            continue;
        }
        $matched = false;
        if ($slugKey === $fileKey) {
            $matched = true;
        } elseif (str_ends_with($slugKey, '-' . $fileKey)) {
            $prefix = substr($slugKey, 0, -strlen($fileKey) - 1);
            $matched = sim_match_prefix_allowed($prefix);
        } elseif (str_ends_with($fileKey, '-' . $slugKey)) {
            $prefix = substr($fileKey, 0, -strlen($slugKey) - 1);
            $matched = sim_match_prefix_allowed($prefix);
        }
        if (!$matched) {
            continue;
        }
        $len = strlen($fileKey);
        if ($len > $bestLen) {
            $bestLen = $len;
            $best = [$item['path']];
        } elseif ($len === $bestLen) {
            $best[] = $item['path'];
        }
    }
    $best = array_values(array_unique($best));
    sort($best);
    return $best;
}

function sim_absolute_html_file(string $rel): ?string
{
    $rel = sim_normalize_rel_path($rel);
    if ($rel === null) {
        return null;
    }
    $root = realpath(sim_project_root());
    if ($root === false) {
        return null;
    }
    $full = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    if (!is_file($full)) {
        return null;
    }
    $real = realpath($full);
    if ($real === false || !sim_path_is_inside($root, $real)) {
        return null;
    }
    return $real;
}

function sim_path_is_inside(string $rootReal, string $candidateReal): bool
{
    $rootReal = rtrim(str_replace('\\', '/', $rootReal), '/');
    $candidateReal = str_replace('\\', '/', $candidateReal);
    return $candidateReal === $rootReal || str_starts_with($candidateReal, $rootReal . '/');
}

function sim_read_html_file(string $rel): ?string
{
    $abs = sim_absolute_html_file($rel);
    if ($abs === null) {
        return null;
    }
    $html = file_get_contents($abs);
    return $html === false ? null : $html;
}

/**
 * @return array{ok:bool, error?:string, path?:string}
 */
function sim_write_html_file(string $rel, string $html): array
{
    $rel = sim_normalize_rel_path($rel);
    if ($rel === null) {
        return ['ok' => false, 'error' => '路徑不在允許的科目資料夾內。'];
    }
    $root = realpath(sim_project_root());
    if ($root === false) {
        return ['ok' => false, 'error' => '找不到專案目錄。'];
    }
    $full = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    $dir = dirname($full);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => '無法建立資料夾。'];
    }
    $dirReal = realpath($dir);
    if ($dirReal === false || !sim_path_is_inside($root, $dirReal)) {
        return ['ok' => false, 'error' => '路徑越出專案目錄。'];
    }
    if (file_put_contents($full, $html) === false) {
        return ['ok' => false, 'error' => '無法寫入 HTML 檔。'];
    }
    $written = realpath($full);
    if ($written === false || !sim_path_is_inside($root, $written)) {
        @unlink($full);
        return ['ok' => false, 'error' => '寫入後的路徑越出專案目錄。'];
    }
    return ['ok' => true, 'path' => $rel];
}

/**
 * @param array<string, mixed> $row
 * @param list<array{path:string,key:string}> $index
 * @return array{path:?string, source:string, candidates:list<string>}
 */
function sim_resolve_export_target(array $row, array $index): array
{
    $slug = (string) ($row['slug'] ?? '');
    $stored = sim_normalize_rel_path((string) ($row['html_path'] ?? ''));
    if ($stored !== null) {
        return ['path' => $stored, 'source' => 'stored', 'candidates' => []];
    }
    $alias = sim_alias_path_for_slug($slug);
    if ($alias !== null) {
        return ['path' => $alias, 'source' => 'alias', 'candidates' => []];
    }
    $matches = sim_disk_matches_for_slug($index, $slug);
    if (count($matches) === 1) {
        return ['path' => $matches[0], 'source' => 'filename', 'candidates' => $matches];
    }
    if (count($matches) > 1) {
        $subjectDir = sim_subject_dir_from_meta(
            isset($row['subject_slug']) ? (string) $row['subject_slug'] : null,
            isset($row['subject_name_en']) ? (string) $row['subject_name_en'] : null,
            isset($row['subject_name_zh']) ? (string) $row['subject_name_zh'] : null
        );
        $inSubject = array_values(array_filter(
            $matches,
            static fn (string $path): bool => str_starts_with($path, $subjectDir . '/')
        ));
        if (count($inSubject) === 1) {
            return ['path' => $inSubject[0], 'source' => 'filename', 'candidates' => $matches];
        }
        return ['path' => null, 'source' => 'ambiguous', 'candidates' => $matches];
    }
    $subjectDir = sim_subject_dir_from_meta(
        isset($row['subject_slug']) ? (string) $row['subject_slug'] : null,
        isset($row['subject_name_en']) ? (string) $row['subject_name_en'] : null,
        isset($row['subject_name_zh']) ? (string) $row['subject_name_zh'] : null
    );
    return [
        'path' => sim_new_rel_path($slug, $subjectDir),
        'source' => 'new',
        'candidates' => [],
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function sim_export_rows(PDO $pdo): array
{
    $hasHtml = sim_db_has_column($pdo, 'simulations', 'html');
    $hasPath = sim_db_has_column($pdo, 'simulations', 'html_path');
    $htmlCol = $hasHtml ? 's.html' : 'NULL AS html';
    $pathCol = $hasPath ? 's.html_path' : 'NULL AS html_path';
    $sql = "SELECT s.id, s.slug, s.title_zh, s.title_en, s.subject_id, {$htmlCol}, {$pathCol},
                   sub.slug AS subject_slug, sub.name_en AS subject_name_en, sub.name_zh AS subject_name_zh
            FROM simulations s
            LEFT JOIN subjects sub ON sub.id = s.subject_id
            ORDER BY s.id ASC";
    return $pdo->query($sql)->fetchAll() ?: [];
}

/**
 * @return array{
 *   created_dirs:list<string>,
 *   has_html_column:bool,
 *   has_path_column:bool,
 *   items:list<array<string, mixed>>,
 *   counts:array<string, int>,
 *   ready:bool
 * }
 */
function sim_export_plan(PDO $pdo): array
{
    $created = sim_ensure_subject_dirs();
    $hasHtml = sim_db_has_column($pdo, 'simulations', 'html');
    $hasPath = sim_db_has_column($pdo, 'simulations', 'html_path');
    $index = sim_disk_index();
    $items = [];
    $counts = [
        'ready' => 0,
        'same' => 0,
        'create' => 0,
        'differ' => 0,
        'disk_only' => 0,
        'empty' => 0,
        'ambiguous' => 0,
    ];

    foreach (sim_export_rows($pdo) as $row) {
        $target = sim_resolve_export_target($row, $index);
        $path = $target['path'];
        $fileHtml = $path !== null ? sim_read_html_file($path) : null;
        $dbHtml = $row['html'] !== null ? (string) $row['html'] : '';
        $dbEmpty = trim($dbHtml) === '';
        $stored = trim((string) ($row['html_path'] ?? ''));

        if ($target['source'] === 'ambiguous' || $path === null) {
            $status = 'ambiguous';
        } elseif ($fileHtml === null && $dbEmpty) {
            $status = 'empty';
        } elseif ($fileHtml === null) {
            $status = 'create';
        } elseif ($dbEmpty) {
            $status = $stored !== '' ? 'ready' : 'disk_only';
        } elseif (sim_html_same($fileHtml, $dbHtml)) {
            $status = $stored !== '' ? 'ready' : 'same';
        } else {
            $status = 'differ';
        }

        $counts[$status] = ($counts[$status] ?? 0) + 1;
        $items[] = [
            'id' => (int) $row['id'],
            'slug' => (string) $row['slug'],
            'title' => (string) (($row['title_zh'] ?? '') !== '' ? $row['title_zh'] : ($row['title_en'] ?? '')),
            'path' => $path,
            'source' => $target['source'],
            'status' => $status,
            'candidates' => $target['candidates'],
        ];
    }

    $blocking = $counts['same'] + $counts['create'] + $counts['differ'] + $counts['disk_only'] + $counts['empty'] + $counts['ambiguous'];
    return [
        'created_dirs' => $created,
        'has_html_column' => $hasHtml,
        'has_path_column' => $hasPath,
        'items' => $items,
        'counts' => $counts,
        'ready' => $hasPath && $blocking === 0,
    ];
}

/**
 * @param 'apply'|'overwrite'|'adopt' $mode
 * @return array{ok:bool, error?:string, written:int, linked:int, skipped:int, plan:array<string, mixed>}
 */
function sim_export_execute(PDO $pdo, string $mode): array
{
    if (!sim_db_has_column($pdo, 'simulations', 'html_path')) {
        return [
            'ok' => false,
            'error' => '資料庫尚未有 html_path 欄。請先執行 php scripts/apply_schema.php。',
            'written' => 0,
            'linked' => 0,
            'skipped' => 0,
            'plan' => sim_export_plan($pdo),
        ];
    }
    if (!in_array($mode, ['apply', 'overwrite', 'adopt'], true)) {
        return ['ok' => false, 'error' => '不支援的匯出動作。', 'written' => 0, 'linked' => 0, 'skipped' => 0, 'plan' => sim_export_plan($pdo)];
    }

    $plan = sim_export_plan($pdo);
    $rowsById = [];
    foreach (sim_export_rows($pdo) as $row) {
        $rowsById[(int) $row['id']] = $row;
    }

    $written = 0;
    $linked = 0;
    $skipped = 0;
    $upd = $pdo->prepare('UPDATE simulations SET html_path = ? WHERE id = ?');

    foreach ($plan['items'] as $item) {
        $status = (string) $item['status'];
        $path = $item['path'] !== null ? (string) $item['path'] : '';
        $id = (int) $item['id'];
        $row = $rowsById[$id] ?? null;
        if ($row === null || $path === '') {
            $skipped++;
            continue;
        }

        $doWrite = ($mode === 'apply' && in_array($status, ['create', 'differ'], true))
            || ($mode === 'overwrite' && $status === 'differ');
        $doLink = ($mode === 'apply' && $status === 'same')
            || ($mode === 'adopt' && in_array($status, ['differ', 'disk_only'], true));

        if ($doWrite) {
            $html = $row['html'] !== null ? (string) $row['html'] : '';
            if (trim($html) === '') {
                $skipped++;
                continue;
            }
            $saved = sim_write_html_file($path, $html);
            if (!$saved['ok']) {
                return [
                    'ok' => false,
                    'error' => ($saved['error'] ?? '寫入失敗') . '（' . $path . '）',
                    'written' => $written,
                    'linked' => $linked,
                    'skipped' => $skipped,
                    'plan' => sim_export_plan($pdo),
                ];
            }
            $upd->execute([$saved['path'], $id]);
            $written++;
            continue;
        }

        if ($doLink) {
            $upd->execute([$path, $id]);
            $linked++;
            continue;
        }

        $skipped++;
    }

    return [
        'ok' => true,
        'written' => $written,
        'linked' => $linked,
        'skipped' => $skipped,
        'plan' => sim_export_plan($pdo),
    ];
}

/**
 * Write HTML for a catalogue row and return the relative path to store.
 *
 * @return array{ok:bool, error?:string, path?:string}
 */
function sim_commit_html_body(PDO $pdo, string $slug, ?int $subjectId, ?string $currentPath, string $html): array
{
    if (!sim_db_has_column($pdo, 'simulations', 'html_path')) {
        return ['ok' => false, 'error' => '資料庫尚未有 html_path 欄。請先執行 php scripts/apply_schema.php。'];
    }
    sim_ensure_subject_dirs();
    $stored = sim_normalize_rel_path((string) $currentPath);
    if ($stored !== null) {
        return sim_write_html_file($stored, $html);
    }

    $subjectSlug = null;
    $subjectEn = null;
    $subjectZh = null;
    if ($subjectId !== null && $subjectId > 0) {
        $stmt = $pdo->prepare('SELECT slug, name_en, name_zh FROM subjects WHERE id = ? LIMIT 1');
        $stmt->execute([$subjectId]);
        $subject = $stmt->fetch();
        if ($subject) {
            $subjectSlug = (string) ($subject['slug'] ?? '');
            $subjectEn = (string) ($subject['name_en'] ?? '');
            $subjectZh = (string) ($subject['name_zh'] ?? '');
        }
    }
    $row = [
        'slug' => $slug,
        'html_path' => '',
        'subject_slug' => $subjectSlug,
        'subject_name_en' => $subjectEn,
        'subject_name_zh' => $subjectZh,
    ];
    $target = sim_resolve_export_target($row, sim_disk_index());
    if ($target['path'] === null) {
        return ['ok' => false, 'error' => '多個 HTML 檔對應此 slug，請先在匯出頁指定路徑。'];
    }
    return sim_write_html_file($target['path'], $html);
}

/**
 * HTML body for iframe / editor: file first, then leftover DB column.
 *
 * @param array<string, mixed> $sim
 */
function sim_body_from_row(array $sim): string
{
    $path = trim((string) ($sim['html_path'] ?? ''));
    if ($path !== '') {
        $file = sim_read_html_file($path);
        if ($file !== null) {
            return $file;
        }
    }
    if (array_key_exists('html', $sim) && $sim['html'] !== null && trim((string) $sim['html']) !== '') {
        return (string) $sim['html'];
    }
    return '';
}
