<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

function art_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'article';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM science_articles WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM science_articles WHERE slug = ? AND id <> ? LIMIT 1');
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
function art_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM science_articles WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function art_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM science_articles WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function art_fetch_published(PDO $pdo): array
{
    $sql = 'SELECT sa.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en
            FROM science_articles sa
            LEFT JOIN subjects sub ON sub.id = sa.subject_id
            LEFT JOIN topics t ON t.id = sa.topic_id
            WHERE sa.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999), sa.list_sort_order, sa.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

/**
 * @return array<int, array<string, mixed>>
 */
function art_fetch_questions(PDO $pdo, int $articleId, bool $includeCorrect = false): array
{
    $stmt = $pdo->prepare('SELECT * FROM article_questions WHERE article_id = ? ORDER BY sort_order, id');
    $stmt->execute([$articleId]);
    $questions = $stmt->fetchAll() ?: [];
    $optStmt = $pdo->prepare('SELECT * FROM article_options WHERE question_id = ? ORDER BY sort_order, id');

    foreach ($questions as &$q) {
        $optStmt->execute([(int) $q['id']]);
        $options = $optStmt->fetchAll() ?: [];
        if (!$includeCorrect) {
            foreach ($options as &$o) {
                unset($o['is_correct']);
            }
            unset($o);
        }
        $q['options'] = $options;
    }
    unset($q);

    return $questions;
}

function art_validate_questions(array $questions): ?string
{
    if ($questions === []) {
        return null;
    }
    foreach ($questions as $i => $q) {
        $stemZh = trim((string) ($q['stem_zh'] ?? ''));
        $stemEn = trim((string) ($q['stem_en'] ?? ''));
        if ($stemZh === '' && $stemEn === '') {
            return '第 ' . ($i + 1) . ' 題缺少題幹。';
        }
        $options = $q['options'] ?? [];
        if (count($options) !== 4) {
            return '第 ' . ($i + 1) . ' 題必須有 4 個選項。';
        }
        $correctCount = 0;
        foreach ($options as $o) {
            if (!empty($o['is_correct'])) {
                $correctCount++;
            }
        }
        if ($correctCount !== 1) {
            return '第 ' . ($i + 1) . ' 題必須恰好標記一個正確答案。';
        }
    }
    return null;
}

function art_sync_questions(PDO $pdo, int $articleId, array $questions): void
{
    $pdo->prepare(
        'DELETE ao FROM article_options ao
         INNER JOIN article_questions aq ON aq.id = ao.question_id
         WHERE aq.article_id = ?'
    )->execute([$articleId]);
    $pdo->prepare('DELETE FROM article_questions WHERE article_id = ?')->execute([$articleId]);

    $qIns = $pdo->prepare(
        'INSERT INTO article_questions (article_id, sort_order, stem_zh, stem_en, explanation_zh, explanation_en)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $oIns = $pdo->prepare(
        'INSERT INTO article_options (question_id, sort_order, text_zh, text_en, is_correct) VALUES (?, ?, ?, ?, ?)'
    );

    foreach ($questions as $sort => $q) {
        $stemZh = trim((string) ($q['stem_zh'] ?? ''));
        $stemEn = trim((string) ($q['stem_en'] ?? ''));
        if ($stemEn === '') {
            $stemEn = $stemZh;
        }
        if ($stemZh === '') {
            $stemZh = $stemEn;
        }
        $qIns->execute([
            $articleId,
            (int) ($q['sort_order'] ?? $sort),
            $stemZh,
            $stemEn,
            trim((string) ($q['explanation_zh'] ?? '')) ?: null,
            trim((string) ($q['explanation_en'] ?? '')) ?: null,
        ]);
        $questionId = (int) $pdo->lastInsertId();
        foreach ($q['options'] as $oi => $o) {
            $tz = trim((string) ($o['text_zh'] ?? ''));
            $te = trim((string) ($o['text_en'] ?? ''));
            if ($te === '') {
                $te = $tz;
            }
            if ($tz === '') {
                $tz = $te;
            }
            $oIns->execute([
                $questionId,
                (int) ($o['sort_order'] ?? $oi),
                $tz,
                $te,
                !empty($o['is_correct']) ? 1 : 0,
            ]);
        }
    }
}

function art_resolve_status(string $requested, bool $canPublishAny): string
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
function art_save_from_payload(PDO $pdo, array $user, array $payload, bool $canPublishAny, bool $isAdmin): array
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
    $status = art_resolve_status((string) ($payload['status'] ?? 'draft'), $canPublishAny);
    $slugInput = trim((string) ($payload['slug'] ?? ''));
    $questions = $payload['questions'] ?? [];

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
        return ['ok' => false, 'error' => '請填寫文章內容。'];
    }
    if (trim($bodyEn) === '') {
        $bodyEn = $bodyZh;
    }
    if (trim($bodyZh) === '') {
        $bodyZh = $bodyEn;
    }

    $qErr = art_validate_questions(is_array($questions) ? $questions : []);
    if ($qErr !== null) {
        return ['ok' => false, 'error' => $qErr];
    }

    $ownerUserId = $user['id'];
    if ($isAdmin && isset($payload['owner_user_id']) && $payload['owner_user_id'] !== '') {
        $ownerUserId = (int) $payload['owner_user_id'];
    }

    if ($id > 0) {
        $row = art_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到文章。'];
        }
        if (!$canPublishAny && ((int) ($row['owner_user_id'] ?? 0) !== $user['id'])) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        if (!$canPublishAny) {
            $ownerUserId = (int) $row['owner_user_id'];
        }

        $slug = $slugInput !== '' ? sim_slugify($slugInput) : $row['slug'];
        $slug = art_ensure_unique_slug($pdo, $slug, $id);

        $upd = $pdo->prepare(
            'UPDATE science_articles SET slug=?, title_zh=?, title_en=?, body_zh=?, body_en=?,
             subject_id=?, topic_id=?, reading_time_minutes=?, list_sort_order=?, status=?, owner_user_id=?,
             updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn, $bodyZh, $bodyEn,
            $subjectId, $topicId, $readingTime, $listSort, $status, $ownerUserId, $id,
        ]);
        art_sync_questions($pdo, $id, is_array($questions) ? $questions : []);
        return ['ok' => true, 'id' => $id];
    }

    $slug = art_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO science_articles (slug, title_zh, title_en, body_zh, body_en,
         subject_id, topic_id, reading_time_minutes, list_sort_order, status, owner_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn, $bodyZh, $bodyEn,
        $subjectId, $topicId, $readingTime, $listSort, $status, $ownerUserId,
    ]);
    $newId = (int) $pdo->lastInsertId();
    art_sync_questions($pdo, $newId, is_array($questions) ? $questions : []);
    return ['ok' => true, 'id' => $newId];
}

function art_public_row(array $row): array
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
        'reading_time_minutes' => $row['reading_time_minutes'] !== null ? (int) $row['reading_time_minutes'] : null,
        'list_sort_order' => (int) $row['list_sort_order'],
        'status' => $row['status'],
        'updated_at' => $row['updated_at'],
    ];
}

function art_delete_by_id(PDO $pdo, int $id): void
{
    $pdo->prepare(
        'DELETE ao FROM article_options ao
         INNER JOIN article_questions aq ON aq.id = ao.question_id
         WHERE aq.article_id = ?'
    )->execute([$id]);
    $pdo->prepare('DELETE FROM article_questions WHERE article_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM science_articles WHERE id = ?')->execute([$id]);
}
