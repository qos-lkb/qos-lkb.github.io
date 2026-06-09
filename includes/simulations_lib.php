<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * @return array<int, array<string, mixed>>
 */
function sim_fetch_published_for_index(PDO $pdo): array
{
    $sql = 'SELECT s.slug, s.title_zh, s.title_en, s.screenshot_path, s.last_updated, s.list_sort_order,
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
    return $pdo->query($sql)->fetchAll() ?: [];
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
        $viewUrl = 'simulation_view.php?slug=' . rawurlencode($slug);
        $exportUrl = 'simulation_export.php?slug=' . rawurlencode($slug);
        $titleEn = $r['title_en'] ?: $slug;
        $titleZh = $r['title_zh'] ?: $titleEn;

        $titleMap[$titleEn] = ['zh' => $titleZh, 'en' => $titleEn];

        $subjects[$catEn]['topics'][$topicKey]['items'][] = [
            'title' => $titleEn,
            'url' => $viewUrl,
            'export_url' => $exportUrl,
            'screenshot' => $r['screenshot_path'] ?? '',
            'last_updated' => $r['last_updated'] ?: date('Y-m-d'),
            'slug' => $slug,
            'topic_label_zh' => $topicLabelZh,
            'topic_label_en' => $topicLabelEn,
            'list_sort_order' => (int) ($r['list_sort_order'] ?? 0),
        ];
    }

    return ['subjects' => $subjects, 'categoryMap' => $categoryMap, 'titleMap' => $titleMap];
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
