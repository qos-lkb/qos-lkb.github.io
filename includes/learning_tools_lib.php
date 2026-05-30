<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

function lt_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'learning-tool';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM learning_tools WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM learning_tools WHERE slug = ? AND id <> ? LIMIT 1');
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
function lt_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM learning_tools WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function lt_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM learning_tools WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function lt_fetch_published(PDO $pdo): array
{
    $sql = 'SELECT lt.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en
            FROM learning_tools lt
            LEFT JOIN subjects sub ON sub.id = lt.subject_id
            LEFT JOIN topics t ON t.id = lt.topic_id
            WHERE lt.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999), lt.list_sort_order, lt.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

/**
 * @return array<int, array<string, mixed>>
 */
function lt_fetch_questions(PDO $pdo, int $toolId, bool $includeCorrect = false): array
{
    $stmt = $pdo->prepare('SELECT * FROM quiz_questions WHERE learning_tool_id = ? ORDER BY sort_order, id');
    $stmt->execute([$toolId]);
    $questions = $stmt->fetchAll() ?: [];
    $optStmt = $pdo->prepare('SELECT * FROM quiz_options WHERE question_id = ? ORDER BY sort_order, id');

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

function lt_validate_questions(array $questions): ?string
{
    if ($questions === []) {
        return '至少需要一題。';
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
            $tz = trim((string) ($o['text_zh'] ?? ''));
            $te = trim((string) ($o['text_en'] ?? ''));
            if ($tz === '' && $te === '') {
                return '第 ' . ($i + 1) . ' 題有空白選項。';
            }
        }
        if ($correctCount !== 1) {
            return '第 ' . ($i + 1) . ' 題必須恰好標記一個正確答案。';
        }
    }
    return null;
}

function lt_sync_questions(PDO $pdo, int $toolId, array $questions): void
{
    $pdo->prepare(
        'DELETE qo FROM quiz_options qo
         INNER JOIN quiz_questions qq ON qq.id = qo.question_id
         WHERE qq.learning_tool_id = ?'
    )->execute([$toolId]);
    $pdo->prepare('DELETE FROM quiz_questions WHERE learning_tool_id = ?')->execute([$toolId]);

    $qIns = $pdo->prepare(
        'INSERT INTO quiz_questions (learning_tool_id, sort_order, stem_zh, stem_en, explanation_zh, explanation_en)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $oIns = $pdo->prepare(
        'INSERT INTO quiz_options (question_id, sort_order, text_zh, text_en, is_correct) VALUES (?, ?, ?, ?, ?)'
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
            $toolId,
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

function lt_resolve_status(string $requested, bool $canPublishAny): string
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
function lt_save_from_payload(PDO $pdo, array $user, array $payload, bool $canPublishAny, bool $isAdmin): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    $descZh = trim((string) ($payload['description_zh'] ?? ''));
    $descEn = trim((string) ($payload['description_en'] ?? ''));
    $subjectId = isset($payload['subject_id']) && $payload['subject_id'] !== '' ? (int) $payload['subject_id'] : null;
    $topicId = isset($payload['topic_id']) && $payload['topic_id'] !== '' ? (int) $payload['topic_id'] : null;
    $linkedSimId = isset($payload['linked_simulation_id']) && $payload['linked_simulation_id'] !== ''
        ? (int) $payload['linked_simulation_id'] : null;
    $listSort = (int) ($payload['list_sort_order'] ?? 0);
    $status = lt_resolve_status((string) ($payload['status'] ?? 'draft'), $canPublishAny);
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

    $qErr = lt_validate_questions(is_array($questions) ? $questions : []);
    if ($qErr !== null) {
        return ['ok' => false, 'error' => $qErr];
    }

    if ($subjectId !== null && $topicId !== null) {
        $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ? AND subject_id = ? LIMIT 1');
        $chk->execute([$topicId, $subjectId]);
        if (!$chk->fetch()) {
            return ['ok' => false, 'error' => '所選單元不屬於該科目。'];
        }
    }

    $ownerUserId = $user['id'];
    if ($isAdmin && isset($payload['owner_user_id']) && $payload['owner_user_id'] !== '') {
        $ownerUserId = (int) $payload['owner_user_id'];
    }

    if ($id > 0) {
        $row = lt_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到學習工具。'];
        }
        if (!$canPublishAny && ((int) ($row['owner_user_id'] ?? 0) !== $user['id'])) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        if (!$canPublishAny) {
            $ownerUserId = (int) $row['owner_user_id'];
        }

        $slug = $slugInput !== '' ? sim_slugify($slugInput) : $row['slug'];
        $slug = lt_ensure_unique_slug($pdo, $slug, $id);

        $upd = $pdo->prepare(
            'UPDATE learning_tools SET slug=?, title_zh=?, title_en=?, description_zh=?, description_en=?,
             subject_id=?, topic_id=?, linked_simulation_id=?, list_sort_order=?, status=?, owner_user_id=?,
             updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn,
            $descZh !== '' ? $descZh : null,
            $descEn !== '' ? $descEn : null,
            $subjectId, $topicId, $linkedSimId, $listSort, $status, $ownerUserId, $id,
        ]);
        lt_sync_questions($pdo, $id, is_array($questions) ? $questions : []);
        return ['ok' => true, 'id' => $id];
    }

    $slug = lt_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO learning_tools (slug, title_zh, title_en, description_zh, description_en,
         subject_id, topic_id, linked_simulation_id, list_sort_order, status, owner_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn,
        $descZh !== '' ? $descZh : null,
        $descEn !== '' ? $descEn : null,
        $subjectId, $topicId, $linkedSimId, $listSort, $status, $ownerUserId,
    ]);
    $newId = (int) $pdo->lastInsertId();
    lt_sync_questions($pdo, $newId, is_array($questions) ? $questions : []);
    return ['ok' => true, 'id' => $newId];
}

function lt_public_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title_zh' => $row['title_zh'],
        'title_en' => $row['title_en'],
        'description_zh' => $row['description_zh'],
        'description_en' => $row['description_en'],
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'topic_id' => $row['topic_id'] !== null ? (int) $row['topic_id'] : null,
        'linked_simulation_id' => $row['linked_simulation_id'] !== null ? (int) $row['linked_simulation_id'] : null,
        'list_sort_order' => (int) $row['list_sort_order'],
        'status' => $row['status'],
        'updated_at' => $row['updated_at'],
    ];
}

function lt_delete_by_id(PDO $pdo, int $id): void
{
    $pdo->prepare(
        'DELETE qo FROM quiz_options qo
         INNER JOIN quiz_questions qq ON qq.id = qo.question_id
         WHERE qq.learning_tool_id = ?'
    )->execute([$id]);
    $pdo->prepare('DELETE FROM quiz_questions WHERE learning_tool_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM learning_tools WHERE id = ?')->execute([$id]);
}
