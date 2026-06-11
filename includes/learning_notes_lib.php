<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

function ln_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'learning-note';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM learning_notes WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM learning_notes WHERE slug = ? AND id <> ? LIMIT 1');
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
 * @return array<string, mixed>|null
 */
function ln_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM learning_notes WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function ln_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM learning_notes WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function ln_fetch_published(PDO $pdo): array
{
    $sql = 'SELECT ln.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en
            FROM learning_notes ln
            LEFT JOIN subjects sub ON sub.id = ln.subject_id
            LEFT JOIN topics t ON t.id = ln.topic_id
            WHERE ln.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999), ln.list_sort_order, ln.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

function ln_public_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title_zh' => $row['title_zh'],
        'title_en' => $row['title_en'],
        'body_zh' => $row['body_zh'],
        'body_en' => $row['body_en'],
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'topic_id' => $row['topic_id'] !== null ? (int) $row['topic_id'] : null,
        'subject_zh' => $row['subject_zh'] ?? null,
        'subject_en' => $row['subject_en'] ?? null,
        'topic_zh' => $row['topic_zh'] ?? null,
        'topic_en' => $row['topic_en'] ?? null,
        'reading_time_minutes' => $row['reading_time_minutes'] !== null ? (int) $row['reading_time_minutes'] : null,
        'list_sort_order' => (int) $row['list_sort_order'],
        'status' => $row['status'],
        'updated_at' => $row['updated_at'],
    ];
}

function ln_enrich_row_labels(PDO $pdo, array $row): array
{
    if (!isset($row['subject_zh']) && !empty($row['subject_id'])) {
        $stmt = $pdo->prepare('SELECT name_zh, name_en FROM subjects WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $row['subject_id']]);
        $sub = $stmt->fetch();
        if ($sub) {
            $row['subject_zh'] = $sub['name_zh'];
            $row['subject_en'] = $sub['name_en'];
        }
    }
    if (!isset($row['topic_zh']) && !empty($row['topic_id'])) {
        $stmt = $pdo->prepare('SELECT name_zh, name_en FROM topics WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $row['topic_id']]);
        $top = $stmt->fetch();
        if ($top) {
            $row['topic_zh'] = $top['name_zh'];
            $row['topic_en'] = $top['name_en'];
        }
    }
    return $row;
}

function ln_delete_by_id(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM learning_notes WHERE id = ?')->execute([$id]);
}

/**
 * @return array<int, array<string, mixed>>
 */
function ln_fetch_admin_list(PDO $pdo): array
{
    $sql = 'SELECT ln.id, ln.slug, ln.title_zh, ln.title_en, ln.status, ln.updated_at,
                   ln.list_sort_order, ln.subject_id, ln.topic_id,
                   sub.name_zh AS subject_zh, sub.name_en AS subject_en, sub.sort_order AS sub_sort,
                   t.name_zh AS topic_zh, t.name_en AS topic_en, t.sort_order AS topic_sort
            FROM learning_notes ln
            LEFT JOIN subjects sub ON sub.id = ln.subject_id
            LEFT JOIN topics t ON t.id = ln.topic_id
            ORDER BY COALESCE(sub.sort_order, 999999), COALESCE(t.sort_order, 999999),
                     ln.list_sort_order, ln.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

/**
 * @param list<int> $orderedIds
 * @return array{ok:bool,error?:string}
 */
function ln_reorder_in_scope(PDO $pdo, ?int $subjectId, ?int $topicId, array $orderedIds): array
{
    $orderedIds = array_values(array_filter(array_map('intval', $orderedIds), static fn (int $x): bool => $x > 0));
    if ($orderedIds === []) {
        return ['ok' => false, 'error' => '排序資料無效。'];
    }

    if ($topicId !== null && $topicId > 0) {
        $stmt = $pdo->prepare('SELECT id FROM learning_notes WHERE topic_id = ? ORDER BY list_sort_order, id');
        $stmt->execute([$topicId]);
    } elseif ($subjectId !== null && $subjectId > 0) {
        $stmt = $pdo->prepare(
            'SELECT id FROM learning_notes WHERE subject_id = ? AND topic_id IS NULL ORDER BY list_sort_order, id'
        );
        $stmt->execute([$subjectId]);
    } else {
        $stmt = $pdo->query(
            'SELECT id FROM learning_notes WHERE subject_id IS NULL AND topic_id IS NULL ORDER BY list_sort_order, id'
        );
    }

    $allIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    sort($allIds);
    $sorted = $orderedIds;
    sort($sorted);
    if ($sorted !== $allIds) {
        return ['ok' => false, 'error' => '排序資料無效。'];
    }

    $pdo->beginTransaction();
    $u = $pdo->prepare('UPDATE learning_notes SET list_sort_order = ? WHERE id = ?');
    foreach ($orderedIds as $i => $id) {
        $u->execute([$i, $id]);
    }
    $pdo->commit();
    return ['ok' => true];
}

/**
 * @param array{id:int,email:string,display_name:string} $user
 * @param array<string, mixed> $fields
 * @return array{ok:bool,error?:string,id?:int}
 */
function ln_patch_note(PDO $pdo, array $user, int $id, array $fields, bool $canAny): array
{
    if ($id <= 0) {
        return ['ok' => false, 'error' => '無效的 ID。'];
    }
    $row = ln_get_by_id($pdo, $id);
    if (!$row) {
        return ['ok' => false, 'error' => '找不到學習筆記。'];
    }
    if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
        return ['ok' => false, 'error' => '無權編輯。'];
    }

    $sets = [];
    $params = [];

    if (array_key_exists('title_zh', $fields)) {
        $titleZh = trim((string) $fields['title_zh']);
        if ($titleZh === '') {
            return ['ok' => false, 'error' => '標題不可為空。'];
        }
        $sets[] = 'title_zh=?';
        $params[] = $titleZh;
    }

    if (array_key_exists('slug', $fields)) {
        $slugIn = trim((string) $fields['slug']);
        if ($slugIn === '') {
            return ['ok' => false, 'error' => 'slug 不可為空。'];
        }
        $slug = ln_ensure_unique_slug($pdo, sim_slugify($slugIn), $id);
        $sets[] = 'slug=?';
        $params[] = $slug;
    }

    if (array_key_exists('status', $fields)) {
        $status = ln_resolve_status((string) $fields['status'], $canAny);
        $sets[] = 'status=?';
        $params[] = $status;
    }

    if ($sets === []) {
        return ['ok' => false, 'error' => '無欄位可更新。'];
    }

    $params[] = $id;
    $pdo->prepare(
        'UPDATE learning_notes SET ' . implode(', ', $sets) . ', updated_at=CURRENT_TIMESTAMP WHERE id=?'
    )->execute($params);

    return ['ok' => true, 'id' => $id];
}

function ln_resolve_status(string $requested, bool $canPublishAny): string
{
    if (!in_array($requested, ['draft', 'pending_review', 'published'], true)) {
        $requested = 'draft';
    }
    if ($canPublishAny) {
        return $requested;
    }
    if ($requested === 'published') {
        return 'pending_review';
    }
    return in_array($requested, ['draft', 'pending_review'], true) ? $requested : 'draft';
}

/**
 * @param array{id:int,email:string,display_name:string} $user
 * @return array{ok:bool,error?:string,id?:int}
 */
function ln_save_from_payload(PDO $pdo, array $user, array $payload, bool $canPublishAny, bool $isAdmin): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    $bodyZh = (string) ($payload['body_zh'] ?? '');
    $bodyEn = (string) ($payload['body_en'] ?? '');
    $subjectId = isset($payload['subject_id']) && $payload['subject_id'] !== '' ? (int) $payload['subject_id'] : null;
    $topicId = isset($payload['topic_id']) && $payload['topic_id'] !== '' ? (int) $payload['topic_id'] : null;
    $readingTime = isset($payload['reading_time_minutes']) && $payload['reading_time_minutes'] !== ''
        ? (int) $payload['reading_time_minutes'] : null;
    $listSort = (int) ($payload['list_sort_order'] ?? 0);
    $status = ln_resolve_status((string) ($payload['status'] ?? 'draft'), $canPublishAny);
    $slugInput = trim((string) ($payload['slug'] ?? ''));

    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請至少填寫中文或英文標題。'];
    }
    if ($titleEn === '') {
        $titleEn = $titleZh;
    }
    if ($titleZh === '') {
        $titleZh = $titleEn;
    }
    if (trim($bodyZh) === '' && trim($bodyEn) === '') {
        return ['ok' => false, 'error' => '請填寫筆記內容。'];
    }
    if (trim($bodyEn) === '') {
        $bodyEn = $bodyZh;
    }
    if (trim($bodyZh) === '') {
        $bodyZh = $bodyEn;
    }

    $ownerUserId = $user['id'];
    if ($isAdmin && isset($payload['owner_user_id']) && $payload['owner_user_id'] !== '') {
        $ownerUserId = (int) $payload['owner_user_id'];
    }

    if ($id > 0) {
        $row = ln_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到學習筆記。'];
        }
        if (!$canPublishAny && ((int) ($row['owner_user_id'] ?? 0) !== $user['id'])) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        if (!$canPublishAny) {
            $ownerUserId = (int) $row['owner_user_id'];
        }

        $slug = $slugInput !== '' ? sim_slugify($slugInput) : $row['slug'];
        $slug = ln_ensure_unique_slug($pdo, $slug, $id);

        $upd = $pdo->prepare(
            'UPDATE learning_notes SET slug=?, title_zh=?, title_en=?, body_zh=?, body_en=?,
             subject_id=?, topic_id=?, reading_time_minutes=?, list_sort_order=?, status=?, owner_user_id=?,
             updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn, $bodyZh, $bodyEn,
            $subjectId, $topicId, $readingTime, $listSort, $status, $ownerUserId, $id,
        ]);
        return ['ok' => true, 'id' => $id];
    }

    $slug = ln_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO learning_notes (slug, title_zh, title_en, body_zh, body_en,
         subject_id, topic_id, reading_time_minutes, list_sort_order, status, owner_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn, $bodyZh, $bodyEn,
        $subjectId, $topicId, $readingTime, $listSort, $status, $ownerUserId,
    ]);
    return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
}
