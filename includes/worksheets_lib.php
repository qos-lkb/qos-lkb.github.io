<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

function ws_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'worksheet';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM worksheets WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM worksheets WHERE slug = ? AND id <> ? LIMIT 1');
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
function ws_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM worksheets WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function ws_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM worksheets WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function ws_fetch_published(PDO $pdo): array
{
    $sql = 'SELECT ws.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en
            FROM worksheets ws
            LEFT JOIN subjects sub ON sub.id = ws.subject_id
            LEFT JOIN topics t ON t.id = ws.topic_id
            WHERE ws.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999), ws.list_sort_order, ws.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

function ws_public_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title_zh' => $row['title_zh'],
        'title_en' => $row['title_en'],
        'description_zh' => $row['description_zh'],
        'description_en' => $row['description_en'],
        'body_zh' => (string) ($row['body_zh'] ?? ''),
        'body_en' => (string) ($row['body_en'] ?? ''),
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'topic_id' => $row['topic_id'] !== null ? (int) $row['topic_id'] : null,
        'subject_zh' => $row['subject_zh'] ?? null,
        'subject_en' => $row['subject_en'] ?? null,
        'topic_zh' => $row['topic_zh'] ?? null,
        'topic_en' => $row['topic_en'] ?? null,
        'list_sort_order' => (int) $row['list_sort_order'],
        'status' => $row['status'],
        'updated_at' => $row['updated_at'],
    ];
}

function ws_delete_by_id(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM worksheets WHERE id = ?')->execute([$id]);
}

function ws_resolve_status(string $requested, bool $canPublishAny): string
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
function ws_save_from_payload(PDO $pdo, array $user, array $payload, bool $canPublishAny, bool $isAdmin): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    $descZh = trim((string) ($payload['description_zh'] ?? ''));
    $descEn = trim((string) ($payload['description_en'] ?? ''));
    $bodyZh = (string) ($payload['body_zh'] ?? '');
    $bodyEn = (string) ($payload['body_en'] ?? '');
    $subjectId = isset($payload['subject_id']) && $payload['subject_id'] !== '' ? (int) $payload['subject_id'] : null;
    $topicId = isset($payload['topic_id']) && $payload['topic_id'] !== '' ? (int) $payload['topic_id'] : null;
    $listSort = (int) ($payload['list_sort_order'] ?? 0);
    $status = ws_resolve_status((string) ($payload['status'] ?? 'draft'), $canPublishAny);
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
    if ($descEn === '' && $descZh !== '') {
        $descEn = $descZh;
    }
    if ($descZh === '' && $descEn !== '') {
        $descZh = $descEn;
    }
    if (trim($bodyZh) === '' && trim($bodyEn) === '') {
        return ['ok' => false, 'error' => '請填寫工作紙內容（Markdown）。'];
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
        $row = ws_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到工作紙。'];
        }
        if (!$canPublishAny && ((int) ($row['owner_user_id'] ?? 0) !== $user['id'])) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        if (!$canPublishAny) {
            $ownerUserId = (int) $row['owner_user_id'];
        }

        $slug = $slugInput !== '' ? sim_slugify($slugInput) : $row['slug'];
        $slug = ws_ensure_unique_slug($pdo, $slug, $id);

        $upd = $pdo->prepare(
            'UPDATE worksheets SET slug=?, title_zh=?, title_en=?, description_zh=?, description_en=?,
             body_zh=?, body_en=?, subject_id=?, topic_id=?, list_sort_order=?, status=?, owner_user_id=?,
             updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn,
            $descZh !== '' ? $descZh : null,
            $descEn !== '' ? $descEn : null,
            $bodyZh, $bodyEn,
            $subjectId, $topicId, $listSort, $status, $ownerUserId, $id,
        ]);
        return ['ok' => true, 'id' => $id];
    }

    $slug = ws_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO worksheets (slug, title_zh, title_en, description_zh, description_en, body_zh, body_en,
         subject_id, topic_id, list_sort_order, status, owner_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn,
        $descZh !== '' ? $descZh : null,
        $descEn !== '' ? $descEn : null,
        $bodyZh, $bodyEn,
        $subjectId, $topicId, $listSort, $status, $ownerUserId,
    ]);
    return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
}
