<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * @return array<int, array<string, mixed>>
 */
function sim_fetch_published_for_index(PDO $pdo): array
{
    $sql = 'SELECT s.id, s.slug, s.title_zh, s.title_en, s.summary_zh, s.summary_en,
                   s.screenshot_path, s.last_updated, s.list_sort_order,
                   s.topic_id,
                   sub.name_en AS category_en, sub.name_zh AS category_zh, sub.sort_order AS sub_sort,
                   t.name_zh AS topic_name_zh, t.name_en AS topic_name_en, t.sort_order AS topic_sort
            FROM simulations s
            LEFT JOIN subjects sub ON sub.id = s.subject_id
            LEFT JOIN topics t ON t.id = s.topic_id
            WHERE s.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999) ASC, sub.name_en ASC,
                     (s.topic_id IS NULL) ASC,
                     COALESCE(t.sort_order, 999999) ASC, COALESCE(t.name_en, \'\') ASC,
                     s.list_sort_order ASC, s.title_en ASC';
    try {
        return $pdo->query($sql)->fetchAll() ?: [];
    } catch (Throwable $e) {
        // Pre-migration DBs without summary columns
        $sqlLegacy = 'SELECT s.id, s.slug, s.title_zh, s.title_en, s.screenshot_path, s.last_updated, s.list_sort_order,
                   s.topic_id,
                   sub.name_en AS category_en, sub.name_zh AS category_zh, sub.sort_order AS sub_sort,
                   t.name_zh AS topic_name_zh, t.name_en AS topic_name_en, t.sort_order AS topic_sort
            FROM simulations s
            LEFT JOIN subjects sub ON sub.id = s.subject_id
            LEFT JOIN topics t ON t.id = s.topic_id
            WHERE s.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999) ASC, sub.name_en ASC,
                     (s.topic_id IS NULL) ASC,
                     COALESCE(t.sort_order, 999999) ASC, COALESCE(t.name_en, \'\') ASC,
                     s.list_sort_order ASC, s.title_en ASC';
        return $pdo->query($sqlLegacy)->fetchAll() ?: [];
    }
}

/**
 * @return array{
 *   subjects: array<string, array{label_zh:string,label_en:string,topics:array<string, array{label_zh:string,label_en:string,items:array<int, array<string, mixed>>}>}>,
 *   categoryMap: array<string, array{zh:string,en:string}>,
 *   titleMap: array<string, array{zh:string,en:string}>
 * }
 */
function sim_build_index_structures(array $rows): array
{
    $subjects = [];
    $categoryMap = [];
    $titleMap = [];

    foreach ($rows as $r) {
        $catEn = $r['category_en'] !== null && $r['category_en'] !== '' ? $r['category_en'] : 'Other';
        $catZh = $r['category_zh'] !== null && $r['category_zh'] !== '' ? $r['category_zh'] : $catEn;

        if (!isset($categoryMap[$catEn])) {
            $categoryMap[$catEn] = ['zh' => $catZh, 'en' => $catEn];
        }

        if (!isset($subjects[$catEn])) {
            $subjects[$catEn] = [
                'label_zh' => $catZh,
                'label_en' => $catEn,
                'topics' => [],
            ];
        }

        $topicId = isset($r['topic_id']) && $r['topic_id'] !== null && $r['topic_id'] !== ''
            ? (int) $r['topic_id']
            : null;

        if ($topicId === null || $topicId <= 0) {
            $topicKey = '__none__';
            $topicLabelZh = '未分類單元';
            $topicLabelEn = 'Uncategorized';
        } else {
            $topicKey = 'topic_' . $topicId;
            $topicLabelZh = $r['topic_name_zh'] !== null && $r['topic_name_zh'] !== ''
                ? (string) $r['topic_name_zh']
                : ($r['topic_name_en'] ?? 'Topic');
            $topicLabelEn = $r['topic_name_en'] !== null && $r['topic_name_en'] !== ''
                ? (string) $r['topic_name_en']
                : $topicLabelZh;
        }

        if (!isset($subjects[$catEn]['topics'][$topicKey])) {
            $subjects[$catEn]['topics'][$topicKey] = [
                'label_zh' => $topicLabelZh,
                'label_en' => $topicLabelEn,
                'items' => [],
            ];
        }

        $slug = $r['slug'];
        $viewUrl = 'api/v1/simulations/' . rawurlencode($slug) . '/html';
        $exportUrl = 'simulation_export.php?slug=' . rawurlencode($slug);
        $titleEn = $r['title_en'] ?: $slug;
        $titleZh = $r['title_zh'] ?: $titleEn;

        $titleMap[$titleEn] = ['zh' => $titleZh, 'en' => $titleEn];

        $simId = (int) ($r['id'] ?? 0);

        $subjects[$catEn]['topics'][$topicKey]['items'][] = [
            'title' => $titleEn,
            'title_zh' => $titleZh,
            'title_en' => $titleEn,
            'url' => $viewUrl,
            'export_url' => $exportUrl,
            'screenshot' => $r['screenshot_path'] ?? '',
            'last_updated' => $r['last_updated'] ?: date('Y-m-d'),
            'slug' => $slug,
            'id' => $simId,
            'summary_zh' => (string) ($r['summary_zh'] ?? ''),
            'summary_en' => (string) ($r['summary_en'] ?? ''),
            'tags' => [],
            'topic_label_zh' => $topicLabelZh,
            'topic_label_en' => $topicLabelEn,
            'list_sort_order' => (int) ($r['list_sort_order'] ?? 0),
        ];
    }

    return ['subjects' => $subjects, 'categoryMap' => $categoryMap, 'titleMap' => $titleMap];
}

/**
 * Attach tag names onto index items (by simulation id).
 *
 * @param array{
 *   subjects: array<string, array{label_zh:string,label_en:string,topics:array<string, array{label_zh:string,label_en:string,items:array<int, array<string, mixed>>}>}>,
 *   categoryMap: array<string, array{zh:string,en:string}>,
 *   titleMap: array<string, array{zh:string,en:string}>
 * } $struct
 * @return array{
 *   subjects: array<string, array{label_zh:string,label_en:string,topics:array<string, array{label_zh:string,label_en:string,items:array<int, array<string, mixed>>}>}>,
 *   categoryMap: array<string, array{zh:string,en:string}>,
 *   titleMap: array<string, array{zh:string,en:string}>
 * }
 */
function sim_attach_tags_to_index(PDO $pdo, array $struct): array
{
    $ids = [];
    foreach ($struct['subjects'] as $sub) {
        foreach ($sub['topics'] as $topic) {
            foreach ($topic['items'] as $item) {
                $id = (int) ($item['id'] ?? 0);
                if ($id > 0) {
                    $ids[$id] = true;
                }
            }
        }
    }
    if ($ids === []) {
        return $struct;
    }

    $idList = array_keys($ids);
    $placeholders = implode(',', array_fill(0, count($idList), '?'));
    $stmt = $pdo->prepare(
        "SELECT st.simulation_id, t.name
         FROM simulation_tags st
         INNER JOIN tags t ON t.id = st.tag_id
         WHERE st.simulation_id IN ($placeholders)
         ORDER BY t.name"
    );
    $stmt->execute($idList);
    $bySim = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $sid = (int) $row['simulation_id'];
        $bySim[$sid][] = (string) $row['name'];
    }

    foreach ($struct['subjects'] as $catEn => $sub) {
        foreach ($sub['topics'] as $topicKey => $topic) {
            foreach ($topic['items'] as $i => $item) {
                $sid = (int) ($item['id'] ?? 0);
                $struct['subjects'][$catEn]['topics'][$topicKey]['items'][$i]['tags'] = $bySim[$sid] ?? [];
            }
        }
    }

    return $struct;
}

function sim_slugify(string $text): string
{
    $t = strtolower(trim($text));
    $t = preg_replace('/[^a-z0-9\x{4e00}-\x{9fff}]+/u', '-', $t);
    $t = preg_replace('/-+/', '-', $t);
    return trim((string) $t, '-') ?: 'tag';
}

function sim_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr($base, 0, 190);
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM simulations WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM simulations WHERE slug = ? AND id <> ? LIMIT 1');
            $stmt->execute([$candidate, $exceptId]);
        }
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $suffix = '-' . $n;
        $candidate = substr($slug, 0, 190 - strlen($suffix)) . $suffix;
        $n++;
    }
}

/**
 * @return array<int, array<string, mixed>>
 */
function sim_all_subjects(PDO $pdo): array
{
    return $pdo->query('SELECT id, slug, name_zh, name_en, sort_order FROM subjects ORDER BY sort_order, name_en')->fetchAll() ?: [];
}

/**
 * @return array<int, array<string, mixed>>
 */
function sim_topics_for_subject(PDO $pdo, int $subjectId): array
{
    $stmt = $pdo->prepare('SELECT id, slug, name_zh, name_en, sort_order FROM topics WHERE subject_id = ? ORDER BY sort_order, name_en');
    $stmt->execute([$subjectId]);
    return $stmt->fetchAll() ?: [];
}

/**
 * @return array<string, mixed>|null
 */
function sim_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM simulations WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function sim_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM simulations WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return list<string> 標籤顯示名稱（供編輯表單）
 */
function sim_get_tag_slugs(PDO $pdo, int $simulationId): array
{
    $stmt = $pdo->prepare(
        'SELECT t.name FROM tags t
         INNER JOIN simulation_tags st ON st.tag_id = t.id
         WHERE st.simulation_id = ?
         ORDER BY t.name'
    );
    $stmt->execute([$simulationId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
}

/**
 * @param list<string> $tagSlugs
 */
function sim_sync_tags(PDO $pdo, int $simulationId, array $tagSlugs): void
{
    $pdo->prepare('DELETE FROM simulation_tags WHERE simulation_id = ?')->execute([$simulationId]);

    foreach ($tagSlugs as $raw) {
        $name = trim($raw);
        if ($name === '') {
            continue;
        }
        $slug = sim_slugify($name);
        $slug = substr($slug, 0, 160);
        if ($slug === '') {
            continue;
        }

        $stmt = $pdo->prepare('SELECT id FROM tags WHERE slug = ? LIMIT 1');
        $stmt->execute([$slug]);
        $id = $stmt->fetchColumn();
        if (!$id) {
            $ins = $pdo->prepare('INSERT INTO tags (name, slug) VALUES (?, ?)');
            $ins->execute([mb_substr($name, 0, 128), $slug]);
            $id = (int) $pdo->lastInsertId();
        } else {
            $id = (int) $id;
        }

        $pdo->prepare('INSERT IGNORE INTO simulation_tags (simulation_id, tag_id) VALUES (?, ?)')->execute([$simulationId, $id]);
    }
}

/** Max HTML body size for contribute / save (bytes). */
function sim_html_max_bytes(): int
{
    return 1_500_000;
}

/**
 * @return array{ok:bool,error?:string}
 */
function sim_validate_html_content(string $html): array
{
    if (trim($html) === '') {
        return ['ok' => false, 'error' => '請提供 HTML 內容。'];
    }
    if (strlen($html) > sim_html_max_bytes()) {
        return ['ok' => false, 'error' => 'HTML 內容過大（上限約 1.5 MB）。'];
    }
    return ['ok' => true];
}

/**
 * Extract <title> text from HTML (best-effort).
 */
function sim_extract_title_from_html(string $html): string
{
    if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m)) {
        $t = trim(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        return mb_substr($t, 0, 512);
    }
    return '';
}

function sim_uploads_root(): string
{
    return dirname(__DIR__) . '/uploads/simulations';
}

/**
 * @param array<string, mixed> $file $_FILES entry
 * @return array{ok:bool,error?:string,path?:string,html?:string,suggested_title?:string}
 */
function sim_store_html_upload(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'HTML 上載失敗。'];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => '無效的上載檔案。'];
    }
    if ((int) ($file['size'] ?? 0) > sim_html_max_bytes()) {
        return ['ok' => false, 'error' => 'HTML 不可超過 1.5 MB。'];
    }
    $name = strtolower((string) ($file['name'] ?? ''));
    if (!preg_match('/\.(html?|xhtml)$/', $name)) {
        return ['ok' => false, 'error' => '僅接受 .html / .htm 檔。'];
    }
    $html = file_get_contents($tmp);
    if ($html === false) {
        return ['ok' => false, 'error' => '無法讀取上載檔案。'];
    }
    $check = sim_validate_html_content($html);
    if (!$check['ok']) {
        return $check;
    }
    return [
        'ok' => true,
        'html' => $html,
        'suggested_title' => sim_extract_title_from_html($html),
    ];
}

/**
 * @param array<string, mixed> $file $_FILES entry
 * @return array{ok:bool,error?:string,path?:string}
 */
function sim_store_screenshot_upload(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => '截圖上載失敗。'];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => '無效的上載檔案。'];
    }
    if ((int) ($file['size'] ?? 0) > 2 * 1024 * 1024) {
        return ['ok' => false, 'error' => '截圖不可超過 2 MB。'];
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp) ?: '';
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
    if (!isset($allowed[$mime])) {
        return ['ok' => false, 'error' => '截圖僅接受 JPEG／PNG／GIF／WebP。'];
    }
    $dir = sim_uploads_root() . '/screenshots';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => '無法建立上載目錄。'];
    }
    $basename = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    $dest = $dir . '/' . $basename;
    if (!move_uploaded_file($tmp, $dest)) {
        return ['ok' => false, 'error' => '儲存截圖失敗。'];
    }
    return ['ok' => true, 'path' => 'uploads/simulations/screenshots/' . $basename];
}
