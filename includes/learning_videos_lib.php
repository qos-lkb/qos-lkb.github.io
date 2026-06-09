<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

/**
 * @return array{ok:bool,embed_url?:string,provider?:string,error?:string}
 */
function lv_normalize_embed_url(string $url): array
{
    $url = trim($url);
    if ($url === '') {
        return ['ok' => false, 'error' => '請填寫影片連結。'];
    }

    if (!preg_match('#^https://#i', $url)) {
        if (preg_match('#^//([^/]+/.+)$#', $url, $m)) {
            $url = 'https://' . $m[1];
        } else {
            return ['ok' => false, 'error' => '影片連結須為 HTTPS。'];
        }
    }

    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    $host = preg_replace('/^www\./', '', $host) ?? $host;

    if (in_array($host, ['youtube.com', 'youtube-nocookie.com', 'm.youtube.com'], true)
        || $host === 'youtu.be') {
        $videoId = null;
        if ($host === 'youtu.be') {
            $videoId = ltrim((string) parse_url($url, PHP_URL_PATH), '/');
        } elseif (preg_match('#/embed/([a-zA-Z0-9_-]{6,})#', $url, $m)) {
            $videoId = $m[1];
        } else {
            parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
            $videoId = $q['v'] ?? null;
        }
        if (!$videoId || !preg_match('/^[a-zA-Z0-9_-]{6,}$/', $videoId)) {
            return ['ok' => false, 'error' => '無法解析 YouTube 影片 ID。'];
        }
        return [
            'ok' => true,
            'embed_url' => 'https://www.youtube-nocookie.com/embed/' . $videoId,
            'provider' => 'youtube',
        ];
    }

    if ($host === 'vimeo.com' || $host === 'player.vimeo.com') {
        if (preg_match('#/(?:video/)?(\d+)#', $url, $m)) {
            return [
                'ok' => true,
                'embed_url' => 'https://player.vimeo.com/video/' . $m[1],
                'provider' => 'vimeo',
            ];
        }
        return ['ok' => false, 'error' => '無法解析 Vimeo 影片 ID。'];
    }

    return ['ok' => false, 'error' => '僅支援 YouTube 或 Vimeo 連結。'];
}

function lv_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'learning-video';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM learning_videos WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM learning_videos WHERE slug = ? AND id <> ? LIMIT 1');
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
function lv_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM learning_videos WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function lv_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM learning_videos WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function lv_fetch_published(PDO $pdo): array
{
    $sql = 'SELECT lv.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en
            FROM learning_videos lv
            LEFT JOIN subjects sub ON sub.id = lv.subject_id
            LEFT JOIN topics t ON t.id = lv.topic_id
            WHERE lv.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999), lv.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

function lv_public_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title_zh' => $row['title_zh'],
        'title_en' => $row['title_en'],
        'embed_url' => $row['embed_url'],
        'provider' => $row['provider'],
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'topic_id' => $row['topic_id'] !== null ? (int) $row['topic_id'] : null,
        'subject_zh' => $row['subject_zh'] ?? null,
        'subject_en' => $row['subject_en'] ?? null,
        'topic_zh' => $row['topic_zh'] ?? null,
        'topic_en' => $row['topic_en'] ?? null,
        'duration_minutes' => $row['duration_minutes'] !== null ? (int) $row['duration_minutes'] : null,
        'status' => $row['status'],
        'updated_at' => $row['updated_at'],
    ];
}

function lv_enrich_row_labels(PDO $pdo, array $row): array
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

function lv_delete_by_id(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM learning_videos WHERE id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM topic_learning_items WHERE content_type = \'video\' AND content_id = ?')->execute([$id]);
}

function lv_resolve_status(string $requested, bool $canPublishAny): string
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
function lv_save_from_payload(PDO $pdo, array $user, array $payload, bool $canPublishAny, bool $isAdmin): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    $sourceUrl = trim((string) ($payload['source_url'] ?? $payload['embed_url'] ?? ''));
    $subjectId = isset($payload['subject_id']) && $payload['subject_id'] !== '' ? (int) $payload['subject_id'] : null;
    $topicId = isset($payload['topic_id']) && $payload['topic_id'] !== '' ? (int) $payload['topic_id'] : null;
    $duration = isset($payload['duration_minutes']) && $payload['duration_minutes'] !== ''
        ? (int) $payload['duration_minutes'] : null;
    $status = lv_resolve_status((string) ($payload['status'] ?? 'draft'), $canPublishAny);
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

    $norm = lv_normalize_embed_url($sourceUrl);
    if (!$norm['ok']) {
        return ['ok' => false, 'error' => $norm['error'] ?? '影片連結無效。'];
    }

    $ownerUserId = $user['id'];
    if ($isAdmin && isset($payload['owner_user_id']) && $payload['owner_user_id'] !== '') {
        $ownerUserId = (int) $payload['owner_user_id'];
    }

    if ($id > 0) {
        $row = lv_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到影片。'];
        }
        if (!$canPublishAny && ((int) ($row['owner_user_id'] ?? 0) !== $user['id'])) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        if (!$canPublishAny) {
            $ownerUserId = (int) $row['owner_user_id'];
        }

        $slug = $slugInput !== '' ? sim_slugify($slugInput) : $row['slug'];
        $slug = lv_ensure_unique_slug($pdo, $slug, $id);

        $upd = $pdo->prepare(
            'UPDATE learning_videos SET slug=?, title_zh=?, title_en=?, embed_url=?, provider=?,
             subject_id=?, topic_id=?, duration_minutes=?, status=?, owner_user_id=?,
             updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn, $norm['embed_url'], $norm['provider'],
            $subjectId, $topicId, $duration, $status, $ownerUserId, $id,
        ]);
        return ['ok' => true, 'id' => $id];
    }

    $slug = lv_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO learning_videos (slug, title_zh, title_en, embed_url, provider,
         subject_id, topic_id, duration_minutes, status, owner_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn, $norm['embed_url'], $norm['provider'],
        $subjectId, $topicId, $duration, $status, $ownerUserId,
    ]);
    return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
}
