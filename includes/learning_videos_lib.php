<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

function lv_is_valid_brightcove_video_id(string $videoId): bool
{
    return (bool) preg_match('/^(?:ref:[\w-]+|\d+)$/', $videoId);
}

/**
 * @return array{ok:true,embed_url:string,provider:string}|null
 */
function lv_normalize_brightcove_url(string $url): ?array
{
    $path = (string) parse_url($url, PHP_URL_PATH);
    parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
    $videoId = isset($q['videoId']) ? trim((string) $q['videoId']) : '';
    if ($videoId === '' || !lv_is_valid_brightcove_video_id($videoId)) {
        return null;
    }

    if (preg_match('#/pages/v1/index\.html$#', $path)) {
        $accountId = trim((string) ($q['accountId'] ?? ''));
        $playerId = trim((string) ($q['playerId'] ?? ''));
        if ($accountId === '' || $playerId === '') {
            return null;
        }
        return [
            'ok' => true,
            'embed_url' => 'https://players.brightcove.net/pages/v1/index.html?accountId='
                . rawurlencode($accountId) . '&playerId=' . rawurlencode($playerId)
                . '&videoId=' . rawurlencode($videoId),
            'provider' => 'brightcove',
        ];
    }

    if (preg_match('#^/(\d+)/([^/]+)/(?:default_)?index(?:\.min)?\.html$#', $path, $m)) {
        return [
            'ok' => true,
            'embed_url' => 'https://players.brightcove.net/' . $m[1] . '/' . $m[2]
                . '/index.html?videoId=' . rawurlencode($videoId),
            'provider' => 'brightcove',
        ];
    }

    return null;
}

function lv_save_pdo_error(PDOException $e): array
{
    $msg = $e->getMessage();
    if (preg_match('/provider|Data truncated|1265|22001/i', $msg)) {
        return [
            'ok' => false,
            'error' => '資料庫結構不完整，請重新匯入根目錄 schema.sql 後再試。',
        ];
    }
    return ['ok' => false, 'error' => '儲存影片時發生資料庫錯誤。'];
}

function lv_follow_short_url(string $url): string
{
    if (!function_exists('curl_init')) {
        return $url;
    }
    $ch = curl_init($url);
    if ($ch === false) {
        return $url;
    }
    curl_setopt_array($ch, [
        CURLOPT_NOBODY => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_USERAGENT => 'ScienceSims/1.0',
    ]);
    curl_exec($ch);
    $final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    if (is_string($final) && $final !== '' && preg_match('#^https://#i', $final)) {
        return $final;
    }
    return $url;
}

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

    if (in_array($host, ['bcove.me', 'bcove.video', 'fb.watch'], true)) {
        $url = lv_follow_short_url($url);
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $host = preg_replace('/^www\./', '', $host) ?? $host;
    }

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

    if ($host === 'players.brightcove.net') {
        $bc = lv_normalize_brightcove_url($url);
        if ($bc !== null) {
            return $bc;
        }
        return ['ok' => false, 'error' => '無法解析 Brightcove 影片連結。請貼上 players.brightcove.net 的嵌入網址。'];
    }

    if (in_array($host, ['dailymotion.com', 'm.dailymotion.com', 'dai.ly', 'geo.dailymotion.com'], true)) {
        $videoId = null;
        if ($host === 'dai.ly') {
            $videoId = trim((string) parse_url($url, PHP_URL_PATH), '/');
        } elseif (preg_match('#/(?:embed/)?video/([a-zA-Z0-9]+)#', $url, $m)) {
            $videoId = $m[1];
        } elseif (preg_match('#/player/([a-zA-Z0-9]+)\.html#', $url, $m)) {
            $videoId = $m[1];
        }
        if (!$videoId || !preg_match('/^[a-zA-Z0-9]+$/', $videoId)) {
            return ['ok' => false, 'error' => '無法解析 Dailymotion 影片 ID。'];
        }
        return [
            'ok' => true,
            'embed_url' => 'https://www.dailymotion.com/embed/video/' . $videoId,
            'provider' => 'dailymotion',
        ];
    }

    $host = preg_replace('/^m\./', '', $host) ?? $host;
    if (in_array($host, ['facebook.com', 'web.facebook.com'], true)) {
        if (str_contains($url, '/plugins/video.php')) {
            parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
            $href = trim((string) ($q['href'] ?? ''));
            if ($href !== '' && preg_match('#^https://(?:www\.|m\.|web\.)?facebook\.com/#i', $href)) {
                return [
                    'ok' => true,
                    'embed_url' => 'https://www.facebook.com/plugins/video.php?href='
                        . rawurlencode($href) . '&show_text=false&width=560',
                    'provider' => 'facebook',
                ];
            }
            return ['ok' => false, 'error' => '無法解析 Facebook 影片連結。'];
        }

        $canonical = null;
        parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
        if (!empty($q['v']) && preg_match('/^\d+$/', (string) $q['v'])) {
            $canonical = 'https://www.facebook.com/watch/?v=' . $q['v'];
        } elseif (preg_match('#/(?:reel|videos|video)/(\d+)#', $url, $m)) {
            $videoId = $m[1];
            if (str_contains($url, '/reel/')) {
                $canonical = 'https://www.facebook.com/reel/' . $videoId;
            } else {
                $canonical = 'https://www.facebook.com/watch/?v=' . $videoId;
            }
        }
        if ($canonical === null) {
            return ['ok' => false, 'error' => '無法解析 Facebook 影片連結。'];
        }
        return [
            'ok' => true,
            'embed_url' => 'https://www.facebook.com/plugins/video.php?href='
                . rawurlencode($canonical) . '&show_text=false&width=560',
            'provider' => 'facebook',
        ];
    }

    if (in_array($host, ['instagram.com', 'm.instagram.com'], true)) {
        if (preg_match('#/(?:p|reel|tv)/([A-Za-z0-9_-]+)(?:/embed)?/?#', $url, $m)) {
            $shortcode = $m[1];
            $kind = 'p';
            if (preg_match('#/reel/#', $url)) {
                $kind = 'reel';
            } elseif (preg_match('#/tv/#', $url)) {
                $kind = 'tv';
            }
            return [
                'ok' => true,
                'embed_url' => 'https://www.instagram.com/' . $kind . '/' . $shortcode . '/embed/',
                'provider' => 'instagram',
            ];
        }
        return ['ok' => false, 'error' => '無法解析 Instagram 影片連結。'];
    }

    return ['ok' => false, 'error' => '不支援的影片平台。支援：YouTube、Vimeo、Brightcove、Dailymotion、Facebook、Instagram。'];
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
    $embedZh = trim((string) ($row['embed_url_zh'] ?? ''));
    $embedEn = trim((string) ($row['embed_url_en'] ?? ''));
    $legacyEmbed = trim((string) ($row['embed_url'] ?? ''));
    if ($embedZh === '' && $legacyEmbed !== '') {
        $embedZh = $legacyEmbed;
    }
    if ($embedEn === '' && $embedZh !== '') {
        $embedEn = $embedZh;
    } elseif ($embedEn === '' && $legacyEmbed !== '') {
        $embedEn = $legacyEmbed;
    }

    $providerZh = trim((string) ($row['provider_zh'] ?? ''));
    $providerEn = trim((string) ($row['provider_en'] ?? ''));
    $legacyProvider = trim((string) ($row['provider'] ?? ''));
    if ($providerZh === '' && $legacyProvider !== '') {
        $providerZh = $legacyProvider;
    }
    if ($providerEn === '' && $providerZh !== '') {
        $providerEn = $providerZh;
    } elseif ($providerEn === '' && $legacyProvider !== '') {
        $providerEn = $legacyProvider;
    }

    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title_zh' => $row['title_zh'],
        'title_en' => $row['title_en'],
        'embed_url' => $embedZh !== '' ? $embedZh : ($embedEn !== '' ? $embedEn : $legacyEmbed),
        'provider' => $providerZh !== '' ? $providerZh : ($providerEn !== '' ? $providerEn : $legacyProvider),
        'embed_url_zh' => $embedZh !== '' ? $embedZh : null,
        'embed_url_en' => $embedEn !== '' ? $embedEn : null,
        'provider_zh' => $providerZh !== '' ? $providerZh : null,
        'provider_en' => $providerEn !== '' ? $providerEn : null,
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

/**
 * @return array{embed_url:string,provider:string}
 */
function lv_embed_for_lang(array $row, string $lang): array
{
    $public = lv_public_row($row);
    $isEn = $lang === 'en';
    $embed = $isEn
        ? ($public['embed_url_en'] ?? $public['embed_url_zh'] ?? $public['embed_url'])
        : ($public['embed_url_zh'] ?? $public['embed_url_en'] ?? $public['embed_url']);
    $provider = $isEn
        ? ($public['provider_en'] ?? $public['provider_zh'] ?? $public['provider'])
        : ($public['provider_zh'] ?? $public['provider_en'] ?? $public['provider']);
    return [
        'embed_url' => (string) ($embed ?? ''),
        'provider' => (string) ($provider ?? ''),
    ];
}

/**
 * @return array{ok:bool,embed_url_zh?:?string,provider_zh?:?string,embed_url_en?:?string,provider_en?:?string,embed_url?:string,provider?:string,error?:string}
 */
function lv_normalize_embed_pair(string $sourceUrlZh, string $sourceUrlEn): array
{
    $sourceUrlZh = trim($sourceUrlZh);
    $sourceUrlEn = trim($sourceUrlEn);
    $embedZh = null;
    $providerZh = null;
    $embedEn = null;
    $providerEn = null;

    if ($sourceUrlZh !== '') {
        $norm = lv_normalize_embed_url($sourceUrlZh);
        if (!$norm['ok']) {
            return ['ok' => false, 'error' => '中文：' . ($norm['error'] ?? '影片連結無效。')];
        }
        $embedZh = $norm['embed_url'];
        $providerZh = $norm['provider'];
    }
    if ($sourceUrlEn !== '') {
        $norm = lv_normalize_embed_url($sourceUrlEn);
        if (!$norm['ok']) {
            return ['ok' => false, 'error' => '英文：' . ($norm['error'] ?? '影片連結無效。')];
        }
        $embedEn = $norm['embed_url'];
        $providerEn = $norm['provider'];
    }

    if ($embedZh === null && $embedEn === null) {
        return ['ok' => false, 'error' => '請至少填寫中文或英文影片連結。'];
    }

    return [
        'ok' => true,
        'embed_url_zh' => $embedZh,
        'provider_zh' => $providerZh,
        'embed_url_en' => $embedEn,
        'provider_en' => $providerEn,
        'embed_url' => $embedZh ?? $embedEn,
        'provider' => $providerZh ?? $providerEn,
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
    $sourceUrlZh = trim((string) ($payload['source_url_zh'] ?? $payload['source_url'] ?? ''));
    $sourceUrlEn = trim((string) ($payload['source_url_en'] ?? ''));
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

    $norm = lv_normalize_embed_pair($sourceUrlZh, $sourceUrlEn);
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

        try {
            $upd = $pdo->prepare(
                'UPDATE learning_videos SET slug=?, title_zh=?, title_en=?, embed_url=?, provider=?,
                 embed_url_zh=?, provider_zh=?, embed_url_en=?, provider_en=?,
                 subject_id=?, topic_id=?, duration_minutes=?, status=?, owner_user_id=?,
                 updated_at=CURRENT_TIMESTAMP WHERE id=?'
            );
            $upd->execute([
                $slug, $titleZh, $titleEn, $norm['embed_url'], $norm['provider'],
                $norm['embed_url_zh'], $norm['provider_zh'], $norm['embed_url_en'], $norm['provider_en'],
                $subjectId, $topicId, $duration, $status, $ownerUserId, $id,
            ]);
        } catch (PDOException $e) {
            return lv_save_pdo_error($e);
        }
        return ['ok' => true, 'id' => $id];
    }

    $slug = lv_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    try {
        $ins = $pdo->prepare(
            'INSERT INTO learning_videos (slug, title_zh, title_en, embed_url, provider,
             embed_url_zh, provider_zh, embed_url_en, provider_en,
             subject_id, topic_id, duration_minutes, status, owner_user_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $slug, $titleZh, $titleEn, $norm['embed_url'], $norm['provider'],
            $norm['embed_url_zh'], $norm['provider_zh'], $norm['embed_url_en'], $norm['provider_en'],
            $subjectId, $topicId, $duration, $status, $ownerUserId,
        ]);
    } catch (PDOException $e) {
        return lv_save_pdo_error($e);
    }
    return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
}
