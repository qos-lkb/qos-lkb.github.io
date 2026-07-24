<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/web_base.php';
require_once __DIR__ . '/simulations_lib.php';

/** @var list<string> */
const TI_CONTENT_TYPES = ['note', 'simulation', 'worksheet', 'article', 'learning_tool', 'video', 'question_bank'];

/**
 * @return array<string, string>
 */
function ti_content_table_map(): array
{
    return [
        'note' => 'learning_notes',
        'simulation' => 'simulations',
        'worksheet' => 'worksheets',
        'article' => 'science_articles',
        'learning_tool' => 'learning_tools',
        'video' => 'learning_videos',
        'question_bank' => 'question_banks',
    ];
}

function ti_validate_content_type(string $type): bool
{
    return in_array($type, TI_CONTENT_TYPES, true);
}

/**
 * @return array<string, mixed>|null
 */
function ti_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM topic_learning_items WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function ti_fetch_for_topic(PDO $pdo, int $topicId, bool $adminView = false): array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM topic_learning_items WHERE topic_id = ? ORDER BY sort_order, id'
    );
    $stmt->execute([$topicId]);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $resolved = ti_resolve_item($pdo, $row, $adminView);
        if ($resolved !== null) {
            $out[] = $resolved;
        }
    }
    return $out;
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>|null
 */
function ti_resolve_item(PDO $pdo, array $row, bool $adminView): ?array
{
    $type = (string) $row['content_type'];
    $contentId = (int) $row['content_id'];
    $tables = ti_content_table_map();
    if (!isset($tables[$type])) {
        return null;
    }
    $table = $tables[$type];

    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ? LIMIT 1");
    $stmt->execute([$contentId]);
    $content = $stmt->fetch();
    if (!$content) {
        return $adminView ? [
            'id' => (int) $row['id'],
            'topic_id' => (int) $row['topic_id'],
            'content_type' => $type,
            'content_id' => $contentId,
            'sort_order' => (int) $row['sort_order'],
            'missing' => true,
            'title_zh' => '(已刪除)',
            'title_en' => '(deleted)',
            'slug' => '',
            'status' => 'missing',
        ] : null;
    }

    if (!$adminView && ($content['status'] ?? '') !== 'published') {
        return null;
    }

    $item = [
        'id' => (int) $row['id'],
        'topic_id' => (int) $row['topic_id'],
        'content_type' => $type,
        'content_id' => $contentId,
        'sort_order' => (int) $row['sort_order'],
        'slug' => $content['slug'],
        'title_zh' => $content['title_zh'],
        'title_en' => $content['title_en'],
        'status' => $content['status'],
    ];

    if ($type === 'note' || $type === 'article') {
        $item['reading_time_minutes'] = isset($content['reading_time_minutes']) && $content['reading_time_minutes'] !== null
            ? (int) $content['reading_time_minutes'] : null;
    }
    if ($type === 'video') {
        $item['duration_minutes'] = isset($content['duration_minutes']) && $content['duration_minutes'] !== null
            ? (int) $content['duration_minutes'] : null;
        $item['provider'] = $content['provider'];
    }
    if ($type === 'simulation') {
        $item['screenshot_path'] = $content['screenshot_path'] ?? null;
    }

    return $item;
}

/**
 * @return array<int, array<string, mixed>>
 */
function ti_fetch_available_for_topic(PDO $pdo, int $topicId, string $contentType): array
{
    if (!ti_validate_content_type($contentType)) {
        return [];
    }
    $table = ti_content_table_map()[$contentType];
    $stmt = $pdo->prepare(
        "SELECT id, slug, title_zh, title_en, status, list_sort_order
         FROM {$table}
         WHERE topic_id = ? AND status = 'published'
         ORDER BY list_sort_order, title_en"
    );
    $stmt->execute([$topicId]);
    $rows = $stmt->fetchAll() ?: [];

    $existing = $pdo->prepare(
        'SELECT content_id FROM topic_learning_items WHERE topic_id = ? AND content_type = ?'
    );
    $existing->execute([$topicId, $contentType]);
    $existingIds = array_flip(array_map('intval', $existing->fetchAll(PDO::FETCH_COLUMN) ?: []));

    $out = [];
    foreach ($rows as $row) {
        $id = (int) $row['id'];
        if (isset($existingIds[$id])) {
            continue;
        }
        $out[] = [
            'id' => $id,
            'slug' => $row['slug'],
            'title_zh' => $row['title_zh'],
            'title_en' => $row['title_en'],
            'content_type' => $contentType,
        ];
    }
    return $out;
}

/**
 * @return array{ok:bool,error?:string,id?:int}
 */
function ti_add_item(PDO $pdo, int $topicId, string $contentType, int $contentId): array
{
    if (!ti_validate_content_type($contentType)) {
        return ['ok' => false, 'error' => '無效的內容類型。'];
    }
    if ($topicId <= 0 || $contentId <= 0) {
        return ['ok' => false, 'error' => '課題或內容 ID 無效。'];
    }

    $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ? LIMIT 1');
    $chk->execute([$topicId]);
    if (!$chk->fetch()) {
        return ['ok' => false, 'error' => '找不到課題。'];
    }

    $table = ti_content_table_map()[$contentType];
    $cStmt = $pdo->prepare("SELECT id, status FROM {$table} WHERE id = ? LIMIT 1");
    $cStmt->execute([$contentId]);
    $content = $cStmt->fetch();
    if (!$content) {
        return ['ok' => false, 'error' => '找不到內容。'];
    }
    if (($content['status'] ?? '') !== 'published') {
        return ['ok' => false, 'error' => '只能加入已發佈的內容。'];
    }

    $dup = $pdo->prepare(
        'SELECT id FROM topic_learning_items WHERE topic_id = ? AND content_type = ? AND content_id = ? LIMIT 1'
    );
    $dup->execute([$topicId, $contentType, $contentId]);
    if ($dup->fetch()) {
        return ['ok' => false, 'error' => '此內容已在課題中。'];
    }

    $mx = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM topic_learning_items WHERE topic_id = ?');
    $mx->execute([$topicId]);
    $sort = (int) $mx->fetchColumn();

    $ins = $pdo->prepare(
        'INSERT INTO topic_learning_items (topic_id, content_type, content_id, sort_order) VALUES (?,?,?,?)'
    );
    $ins->execute([$topicId, $contentType, $contentId, $sort]);
    return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
}

function ti_remove_item(PDO $pdo, int $itemId): void
{
    $pdo->prepare('DELETE FROM topic_learning_items WHERE id = ?')->execute([$itemId]);
}

/**
 * @param list<int> $orderedIds
 * @return array{ok:bool,error?:string}
 */
function ti_reorder_items(PDO $pdo, int $topicId, array $orderedIds): array
{
    $stmt = $pdo->prepare('SELECT id FROM topic_learning_items WHERE topic_id = ? ORDER BY sort_order, id');
    $stmt->execute([$topicId]);
    $allIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    $ordered = array_values(array_filter(array_map('intval', $orderedIds), static fn (int $x): bool => $x > 0));

    if (count($ordered) !== count($allIds)) {
        return ['ok' => false, 'error' => '排序資料無效。'];
    }

    $allSet = array_flip($allIds);
    foreach ($ordered as $id) {
        if (!isset($allSet[$id])) {
            return ['ok' => false, 'error' => '排序資料無效。'];
        }
    }

    $pdo->beginTransaction();
    $u = $pdo->prepare('UPDATE topic_learning_items SET sort_order = ? WHERE id = ? AND topic_id = ?');
    foreach ($ordered as $i => $id) {
        $u->execute([$i, $id, $topicId]);
    }
    $pdo->commit();
    return ['ok' => true];
}

/**
 * @return array{ok:bool,error?:string,added?:int}
 */
function ti_import_all_from_topic(PDO $pdo, int $topicId): array
{
    if ($topicId <= 0) {
        return ['ok' => false, 'error' => '課題 ID 無效。'];
    }
    $added = 0;
    $typeOrder = ['note', 'video', 'simulation', 'worksheet', 'article', 'question_bank', 'learning_tool'];
    $mx = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) FROM topic_learning_items WHERE topic_id = ?');
    $mx->execute([$topicId]);
    $sort = (int) $mx->fetchColumn() + 1;

    foreach ($typeOrder as $type) {
        $table = ti_content_table_map()[$type];
        $sortCol = 'list_sort_order';
        if ($type === 'video') {
            $sql = "SELECT id FROM {$table} WHERE topic_id = ? AND status = 'published' ORDER BY title_en";
        } else {
            $sql = "SELECT id FROM {$table} WHERE topic_id = ? AND status = 'published' ORDER BY {$sortCol}, title_en";
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$topicId]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);

        foreach ($ids as $contentId) {
            $dup = $pdo->prepare(
                'SELECT id FROM topic_learning_items WHERE topic_id = ? AND content_type = ? AND content_id = ? LIMIT 1'
            );
            $dup->execute([$topicId, $type, $contentId]);
            if ($dup->fetch()) {
                continue;
            }
            $ins = $pdo->prepare(
                'INSERT INTO topic_learning_items (topic_id, content_type, content_id, sort_order) VALUES (?,?,?,?)'
            );
            $ins->execute([$topicId, $type, $contentId, $sort]);
            $sort++;
            $added++;
        }
    }
    return ['ok' => true, 'added' => $added];
}

/**
 * @return array{subjects:list<array<string,mixed>>}
 */
function ti_build_courses_tree(PDO $pdo, ?string $subjectSlug = null): array
{
    $subjects = sim_all_subjects($pdo);
    $out = [];

    foreach ($subjects as $sub) {
        if ($subjectSlug !== null && $sub['slug'] !== $subjectSlug) {
            continue;
        }
        $topics = sim_topics_for_subject($pdo, (int) $sub['id']);
        $topicOut = [];
        foreach ($topics as $top) {
            $items = ti_fetch_for_topic($pdo, (int) $top['id'], false);
            $topicOut[] = [
                'id' => (int) $top['id'],
                'slug' => $top['slug'],
                'name_zh' => $top['name_zh'],
                'name_en' => $top['name_en'],
                'sort_order' => (int) ($top['sort_order'] ?? 0),
                'item_count' => count($items),
                'items' => array_map(static function (array $item): array {
                    $pub = [
                        'id' => $item['id'],
                        'content_type' => $item['content_type'],
                        'content_id' => $item['content_id'],
                        'sort_order' => $item['sort_order'],
                        'slug' => $item['slug'],
                        'title_zh' => $item['title_zh'],
                        'title_en' => $item['title_en'],
                    ];
                    if (isset($item['reading_time_minutes'])) {
                        $pub['reading_time_minutes'] = $item['reading_time_minutes'];
                    }
                    if (isset($item['duration_minutes'])) {
                        $pub['duration_minutes'] = $item['duration_minutes'];
                    }
                    if (isset($item['provider'])) {
                        $pub['provider'] = $item['provider'];
                    }
                    if (isset($item['screenshot_path']) && $item['screenshot_path']) {
                        $pub['screenshot_path'] = web_resolve_path((string) $item['screenshot_path']);
                    }
                    return $pub;
                }, $items),
            ];
        }

        $totalItems = array_sum(array_map(static fn (array $t): int => count($t['items']), $topicOut));
        $out[] = [
            'id' => (int) $sub['id'],
            'slug' => $sub['slug'],
            'name_zh' => $sub['name_zh'],
            'name_en' => $sub['name_en'],
            'sort_order' => (int) ($sub['sort_order'] ?? 0),
            'topic_count' => count($topicOut),
            'item_count' => $totalItems,
            'topics' => $topicOut,
        ];
    }

    return ['subjects' => $out];
}
