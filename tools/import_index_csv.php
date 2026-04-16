<?php

declare(strict_types=1);

/**
 * 將 index.csv 與對應 HTML 檔匯入資料庫（一次性）。
 * CLI: php tools/import_index_csv.php
 * 瀏覽器：需以管理員登入後開啟（或暫時允許 CLI 同等保護）。
 */

$root = dirname(__DIR__);
chdir($root);

require_once $root . '/includes/bootstrap.php';
require_once $root . '/includes/simulations_lib.php';

function import_url_to_slug(string $url): string
{
    $u = str_replace('\\', '/', trim($url));
    $u = preg_replace('#\.html?$#i', '', $u);
    $slug = strtolower(preg_replace('#/+#', '-', $u));
    $slug = preg_replace('/[^a-z0-9_-]+/', '-', $slug);
    $slug = preg_replace('/-+/', '-', trim($slug, '-'));
    return substr($slug, 0, 190) ?: 'sim';
}

function import_upsert_subject(PDO $pdo, string $slug, string $nameZh, string $nameEn, int &$sortCounter): int
{
    $stmt = $pdo->prepare('SELECT id FROM subjects WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $id = $stmt->fetchColumn();
    if ($id) {
        return (int) $id;
    }
    $ins = $pdo->prepare('INSERT INTO subjects (slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, ?)');
    $ins->execute([$slug, $nameZh, $nameEn, $sortCounter++]);
    return (int) $pdo->lastInsertId();
}

function import_upsert_topic(PDO $pdo, int $subjectId, string $slug, string $nameZh, string $nameEn, int $sortOrder): int
{
    $stmt = $pdo->prepare('SELECT id FROM topics WHERE subject_id = ? AND slug = ? LIMIT 1');
    $stmt->execute([$subjectId, $slug]);
    $id = $stmt->fetchColumn();
    if ($id) {
        return (int) $id;
    }
    $ins = $pdo->prepare('INSERT INTO topics (subject_id, slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, ?, ?)');
    $ins->execute([$subjectId, $slug, $nameZh, $nameEn, $sortOrder]);
    return (int) $pdo->lastInsertId();
}

$cli = php_sapi_name() === 'cli';

try {
    $pdo = db();
} catch (Throwable $e) {
    $msg = '資料庫未設定或無法連線。';
    if ($cli) {
        fwrite(STDERR, $msg . PHP_EOL);
        exit(1);
    }
    http_response_code(500);
    exit($msg);
}

if (!$cli) {
    bootstrap_public();
    if (!current_user() || !user_has_permission('simulation.manage_any')) {
        http_response_code(403);
        exit('需要管理員權限。請先登入。');
    }
    header('Content-Type: text/plain; charset=utf-8');
}

$sysStmt = $pdo->query("SELECT id FROM users WHERE email = 'system@science-sims.internal' LIMIT 1");
$systemUserId = $sysStmt->fetchColumn();
if (!$systemUserId) {
    $err = '請先匯入 sql/001_initial.sql（缺少 system 使用者）。';
    echo $cli ? ($err . PHP_EOL) : $err;
    exit(1);
}
$systemUserId = (int) $systemUserId;

$existing = (int) $pdo->query('SELECT COUNT(*) FROM simulations')->fetchColumn();
if ($existing > 0) {
    $err = '資料庫已有模擬資料。若要重新匯入，請先手動清空 simulations／simulation_tags／topics／subjects 等相關表。';
    echo $cli ? ($err . PHP_EOL) : $err;
    exit(1);
}

$csvFile = $root . '/index.csv';
if (!is_readable($csvFile)) {
    $err = '找不到 index.csv';
    echo $cli ? ($err . PHP_EOL) : $err;
    exit(1);
}

$handle = fopen($csvFile, 'r');
if ($handle === false) {
    exit(1);
}
$header = fgetcsv($handle);
$sortSubject = 0;
$topicSortBySubject = [];

$imported = 0;
$skipped = 0;

while (($row = fgetcsv($handle)) !== false) {
    if (count($row) < 3) {
        continue;
    }
    $category = $row[0] ?? '';
    $title = $row[1] ?? '';
    $url = $row[2] ?? '';
    $screenshot = $row[3] ?? '';
    $categoryZh = $row[4] ?? $category;
    $categoryEn = $row[5] ?? $category;
    $titleZh = $row[6] ?? $title;
    $titleEn = $row[7] ?? $title;
    $lastUpdated = $row[8] ?? date('Y-m-d');

    if ($url === '') {
        $skipped++;
        continue;
    }

    $subjectSlug = sim_slugify($categoryEn !== '' ? $categoryEn : $category);
    $subjectSlug = substr($subjectSlug, 0, 128) ?: 'subject';
    $subjectId = import_upsert_subject($pdo, $subjectSlug, $categoryZh, $categoryEn, $sortSubject);

    $dir = trim(str_replace('\\', '/', dirname($url)), '/');
    $topicSlug = $dir !== '' ? sim_slugify(str_replace('/', '-', $dir)) : 'general';
    $topicSlug = substr($topicSlug, 0, 160) ?: 'general';
    if (!isset($topicSortBySubject[$subjectId])) {
        $topicSortBySubject[$subjectId] = 0;
    }
    $topicSort = $topicSortBySubject[$subjectId]++;
    $topicLabel = $dir !== '' ? $dir : 'General';
    $topicId = import_upsert_topic($pdo, $subjectId, $topicSlug, $topicLabel, $topicLabel, $topicSort);

    $path = $root . '/' . $url;
    if (!is_readable($path)) {
        $skipped++;
        continue;
    }
    $html = file_get_contents($path);
    if ($html === false) {
        $skipped++;
        continue;
    }

    $baseSlug = import_url_to_slug($url);
    $slug = sim_ensure_unique_slug($pdo, $baseSlug);

    $ins = $pdo->prepare(
        'INSERT INTO simulations (owner_user_id, slug, title_zh, title_en, html, screenshot_path, subject_id, topic_id, status, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'published\', ?)'
    );
    $ins->execute([
        $systemUserId,
        $slug,
        $titleZh,
        $titleEn,
        $html,
        $screenshot !== '' ? $screenshot : null,
        $subjectId,
        $topicId,
        preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $lastUpdated) ? $lastUpdated : date('Y-m-d'),
    ]);
    $imported++;
}
fclose($handle);

$summary = "完成：匯入 {$imported} 筆，略過 {$skipped} 筆。\n";
echo $summary;
