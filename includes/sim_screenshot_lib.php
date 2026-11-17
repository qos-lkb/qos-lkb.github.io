<?php

declare(strict_types=1);

require_once __DIR__ . '/simulation_files.php';
require_once __DIR__ . '/web_base.php';

const SIM_SCREENSHOT_BATCH = 5;
const SIM_SCREENSHOT_WIDTH = 1280;
const SIM_SCREENSHOT_HEIGHT = 800;

/**
 * Relative screenshot / asset path under the project root.
 */
function sim_screenshot_normalize_asset(string $rel): ?string
{
    $rel = str_replace('\\', '/', trim($rel));
    $rel = ltrim($rel, '/');
    if ($rel === '' || str_contains($rel, "\0") || str_contains($rel, '..')) {
        return null;
    }
    $parts = explode('/', $rel);
    $allowed = array_merge(sim_html_allowed_roots(), ['uploads']);
    if (!in_array($parts[0], $allowed, true)) {
        return null;
    }
    foreach ($parts as $part) {
        if ($part === '' || $part === '.' || $part === '..') {
            return null;
        }
    }
    return $rel;
}

function sim_screenshot_abs(string $rel, bool $createDir = false): ?string
{
    $rel = sim_screenshot_normalize_asset($rel);
    if ($rel === null) {
        return null;
    }
    $root = realpath(sim_project_root());
    if ($root === false) {
        return null;
    }
    $full = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    $parent = dirname($full);
    if (!is_dir($parent)) {
        if (!$createDir) {
            return is_file($full) ? $full : null;
        }
        if (!mkdir($parent, 0755, true) && !is_dir($parent)) {
            return null;
        }
    }
    $parentReal = realpath($parent);
    if ($parentReal === false || !sim_path_is_inside($root, $parentReal)) {
        return null;
    }
    return $full;
}

function sim_screenshot_file_ok(?string $rel): bool
{
    if ($rel === null || trim($rel) === '') {
        return false;
    }
    $abs = sim_screenshot_abs((string) $rel, false);
    return $abs !== null && is_file($abs);
}

function sim_screenshot_dest_rel(string $htmlRel): ?string
{
    $htmlRel = sim_normalize_rel_path($htmlRel);
    if ($htmlRel === null) {
        return null;
    }
    $root = explode('/', $htmlRel)[0];
    $stem = pathinfo($htmlRel, PATHINFO_FILENAME);
    if ($stem === '') {
        return null;
    }
    return $root . '/screenshots/' . $stem . '.png';
}

function sim_screenshot_find_existing(string $htmlRel): ?string
{
    $htmlRel = sim_normalize_rel_path($htmlRel);
    if ($htmlRel === null) {
        return null;
    }
    $root = explode('/', $htmlRel)[0];
    $stem = pathinfo($htmlRel, PATHINFO_FILENAME);
    $dir = sim_project_root() . '/' . $root . '/screenshots';
    if (!is_dir($dir) || $stem === '') {
        return null;
    }
    $exact = [$stem . '.png', $stem . '.jpg', $stem . '.jpeg', $stem . '.webp'];
    foreach ($exact as $name) {
        $full = $dir . '/' . $name;
        if (is_file($full)) {
            return $root . '/screenshots/' . $name;
        }
    }
    $matches = glob($dir . '/' . $stem . '_*.{png,jpg,jpeg,webp}', GLOB_BRACE) ?: [];
    if ($matches === []) {
        return null;
    }
    usort($matches, static fn (string $a, string $b): int => filemtime($b) <=> filemtime($a));
    return $root . '/screenshots/' . basename($matches[0]);
}

function sim_screenshot_chrome_bin(): ?string
{
    $env = trim((string) getenv('CHROME_BIN'));
    $candidates = [
        $env,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/microsoft-edge',
        '/usr/bin/microsoft-edge-stable',
    ];
    foreach ($candidates as $bin) {
        if ($bin !== '' && is_file($bin) && is_executable($bin)) {
            return $bin;
        }
    }
    foreach (['google-chrome', 'chromium', 'chromium-browser'] as $name) {
        $which = trim((string) shell_exec('command -v ' . escapeshellarg($name) . ' 2>/dev/null'));
        if ($which !== '' && is_executable($which)) {
            return $which;
        }
    }
    return null;
}

function sim_screenshot_public_url(string $htmlRel): ?string
{
    $htmlRel = sim_normalize_rel_path($htmlRel);
    if ($htmlRel === null) {
        return null;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ((string) ($_SERVER['SERVER_PORT'] ?? '') === '443');
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($host === '') {
        $host = '127.0.0.1';
    }
    $scheme = $https ? 'https' : 'http';
    return $scheme . '://' . $host . web_resolve_path($htmlRel);
}

/**
 * @return array{ok:bool,error?:string}
 */
function sim_screenshot_run_chrome(string $url, string $absOut): array
{
    $bin = sim_screenshot_chrome_bin();
    if ($bin === null) {
        return ['ok' => false, 'error' => '找不到 Chrome／Chromium，無法伺服器截圖。'];
    }
    $cmd = implode(' ', [
        escapeshellarg($bin),
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--window-size=' . SIM_SCREENSHOT_WIDTH . ',' . SIM_SCREENSHOT_HEIGHT,
        '--virtual-time-budget=8000',
        '--timeout=25000',
        '--default-background-color=ffffffff',
        '--screenshot=' . escapeshellarg($absOut),
        escapeshellarg($url),
    ]);
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = proc_open($cmd, $descriptors, $pipes, sim_project_root());
    if (!is_resource($proc)) {
        return ['ok' => false, 'error' => '無法啟動瀏覽器。'];
    }
    fclose($pipes[0]);
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    $deadline = microtime(true) + 35;
    while (true) {
        $status = proc_get_status($proc);
        if (!$status['running']) {
            break;
        }
        if (microtime(true) > $deadline) {
            proc_terminate($proc, 9);
            break;
        }
        usleep(150000);
    }
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);
    if (!is_file($absOut) || filesize($absOut) < 100) {
        return ['ok' => false, 'error' => '瀏覽器未產生截圖。'];
    }
    $fh = fopen($absOut, 'rb');
    $magic = $fh ? (string) fread($fh, 8) : '';
    if ($fh) {
        fclose($fh);
    }
    if ($magic !== "\x89PNG\r\n\x1a\n") {
        @unlink($absOut);
        return ['ok' => false, 'error' => '截圖不是有效 PNG。'];
    }
    return ['ok' => true];
}

function sim_screenshot_set_path(PDO $pdo, int $id, string $path): array
{
    if (!sim_db_has_column($pdo, 'simulations', 'screenshot_path')) {
        return ['ok' => false, 'error' => '資料庫沒有 screenshot_path 欄。'];
    }
    $path = sim_screenshot_normalize_asset($path);
    if ($path === null) {
        return ['ok' => false, 'error' => '截圖路徑無效。'];
    }
    $stmt = $pdo->prepare('UPDATE simulations SET screenshot_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $stmt->execute([$path, $id]);
    return ['ok' => true, 'path' => $path];
}

/**
 * @return array<string, mixed>
 */
function sim_screenshot_plan(PDO $pdo, string $search = '', string $filter = 'all'): array
{
    $hasShot = sim_db_has_column($pdo, 'simulations', 'screenshot_path');
    $hasPath = sim_db_has_column($pdo, 'simulations', 'html_path');
    $sql = 'SELECT id, slug, title_zh, title_en, status'
        . ($hasPath ? ', html_path' : '')
        . ($hasShot ? ', screenshot_path' : '')
        . ' FROM simulations ORDER BY id ASC';
    $rows = $pdo->query($sql)->fetchAll() ?: [];
    $needle = mb_strtolower(trim($search), 'UTF-8');
    $items = [];
    $counts = ['ok' => 0, 'missing' => 0, 'broken' => 0, 'total' => 0, 'disk_ready' => 0];
    foreach ($rows as $row) {
        $htmlPath = $hasPath ? (string) ($row['html_path'] ?? '') : '';
        $shotPath = $hasShot ? trim((string) ($row['screenshot_path'] ?? '')) : '';
        $shotOk = $shotPath !== '' && sim_screenshot_file_ok($shotPath);
        $diskMatch = $htmlPath !== '' ? sim_screenshot_find_existing($htmlPath) : null;
        $kind = 'ok';
        if ($shotPath === '') {
            $kind = 'missing';
        } elseif (!$shotOk) {
            $kind = 'broken';
        }
        $counts[$kind]++;
        $counts['total']++;
        if ($diskMatch !== null && !$shotOk) {
            $counts['disk_ready']++;
        }
        if ($filter === 'missing' && $kind === 'ok') {
            continue;
        }
        if ($needle !== '') {
            $hay = mb_strtolower(implode(' ', [
                (string) $row['slug'],
                (string) ($row['title_zh'] ?? ''),
                (string) ($row['title_en'] ?? ''),
                $htmlPath,
                $shotPath,
            ]), 'UTF-8');
            if (!str_contains($hay, $needle)) {
                continue;
            }
        }
        $items[] = [
            'id' => (int) $row['id'],
            'slug' => (string) $row['slug'],
            'title_zh' => (string) ($row['title_zh'] ?? ''),
            'title_en' => (string) ($row['title_en'] ?? ''),
            'status' => (string) ($row['status'] ?? ''),
            'html_path' => $htmlPath,
            'screenshot_path' => $shotPath !== '' ? $shotPath : null,
            'screenshot_ok' => $shotOk,
            'kind' => $kind,
            'disk_match' => $diskMatch,
            'html_ok' => $htmlPath !== '' && sim_absolute_html_file($htmlPath) !== null,
        ];
    }

    return [
        'items' => $items,
        'counts' => $counts,
        'chrome_available' => sim_screenshot_chrome_bin() !== null,
        'chrome_bin' => sim_screenshot_chrome_bin(),
        'batch_size' => SIM_SCREENSHOT_BATCH,
    ];
}

/**
 * @param list<int> $ids
 * @return array{ok:bool,updated:int,skipped:int,errors:list<string>,results:list<array<string,mixed>>}
 */
function sim_screenshot_process(PDO $pdo, array $ids, string $mode, bool $allowChrome): array
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn (int $id): bool => $id > 0)));
    if (count($ids) > SIM_SCREENSHOT_BATCH) {
        $ids = array_slice($ids, 0, SIM_SCREENSHOT_BATCH);
    }
    $updated = 0;
    $skipped = 0;
    $errors = [];
    $results = [];
    foreach ($ids as $id) {
        $row = sim_get_by_id($pdo, $id);
        if ($row === null) {
            $skipped++;
            $errors[] = '#' . $id . ' 找不到模擬。';
            continue;
        }
        $htmlPath = (string) ($row['html_path'] ?? '');
        $shotPath = trim((string) ($row['screenshot_path'] ?? ''));
        $shotOk = $shotPath !== '' && sim_screenshot_file_ok($shotPath);
        if ($mode !== 'all' && $shotOk) {
            $skipped++;
            $results[] = ['id' => $id, 'status' => 'skipped', 'path' => $shotPath];
            continue;
        }
        if ($htmlPath === '' || sim_absolute_html_file($htmlPath) === null) {
            $skipped++;
            $errors[] = '#' . $id . ' 沒有可用的 html_path。';
            continue;
        }

        if ($mode !== 'all') {
            $existing = sim_screenshot_find_existing($htmlPath);
            if ($existing !== null) {
                $set = sim_screenshot_set_path($pdo, $id, $existing);
                if ($set['ok']) {
                    $updated++;
                    $results[] = ['id' => $id, 'status' => 'linked', 'path' => $existing];
                    continue;
                }
            }
        }

        if (!$allowChrome) {
            $skipped++;
            $results[] = ['id' => $id, 'status' => 'needs_capture', 'slug' => (string) $row['slug']];
            continue;
        }

        $destRel = sim_screenshot_dest_rel($htmlPath);
        $abs = $destRel !== null ? sim_screenshot_abs($destRel, true) : null;
        $url = sim_screenshot_public_url($htmlPath);
        if ($destRel === null || $abs === null || $url === null) {
            $skipped++;
            $errors[] = '#' . $id . ' 無法決定截圖路徑。';
            continue;
        }
        $cap = sim_screenshot_run_chrome($url, $abs);
        if (!$cap['ok']) {
            $errors[] = '#' . $id . ' ' . ($cap['error'] ?? '截圖失敗');
            $results[] = ['id' => $id, 'status' => 'error', 'error' => $cap['error'] ?? ''];
            continue;
        }
        $set = sim_screenshot_set_path($pdo, $id, $destRel);
        if (!$set['ok']) {
            $errors[] = '#' . $id . ' ' . ($set['error'] ?? '寫入資料庫失敗');
            continue;
        }
        $updated++;
        $results[] = ['id' => $id, 'status' => 'captured', 'path' => $destRel];
    }

    return [
        'ok' => $errors === [] || $updated > 0,
        'updated' => $updated,
        'skipped' => $skipped,
        'errors' => $errors,
        'results' => $results,
    ];
}

/**
 * Store an uploaded PNG onto the conventional subject screenshot path and update DB.
 *
 * @param array<string, mixed> $file
 */
function sim_screenshot_store_upload_for_sim(PDO $pdo, int $id, array $file): array
{
    $row = sim_get_by_id($pdo, $id);
    if ($row === null) {
        return ['ok' => false, 'error' => '找不到模擬。'];
    }
    $htmlPath = (string) ($row['html_path'] ?? '');
    $destRel = $htmlPath !== '' ? sim_screenshot_dest_rel($htmlPath) : null;
    if ($destRel === null) {
        $up = sim_store_screenshot_upload($file);
        if (!$up['ok']) {
            return $up;
        }
        $set = sim_screenshot_set_path($pdo, $id, (string) $up['path']);
        if (!$set['ok']) {
            return $set;
        }
        return ['ok' => true, 'path' => $set['path']];
    }
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => '截圖上載失敗。'];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => '無效的上載檔案。'];
    }
    if ((int) ($file['size'] ?? 0) > 4 * 1024 * 1024) {
        return ['ok' => false, 'error' => '截圖不可超過 4 MB。'];
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp) ?: '';
    if ($mime !== 'image/png') {
        return ['ok' => false, 'error' => '請上載 PNG。'];
    }
    $abs = sim_screenshot_abs($destRel, true);
    if ($abs === null) {
        return ['ok' => false, 'error' => '無法寫入截圖目錄。'];
    }
    if (!move_uploaded_file($tmp, $abs)) {
        return ['ok' => false, 'error' => '儲存截圖失敗。'];
    }
    return sim_screenshot_set_path($pdo, $id, $destRel);
}
