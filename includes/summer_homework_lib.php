<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

function sh_normalize_fill_answer(string $s): string
{
    $s = trim(mb_strtolower($s, 'UTF-8'));
    $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
    return $s;
}

function sh_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'summer-homework';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM summer_homework_items WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM summer_homework_items WHERE slug = ? AND id <> ? LIMIT 1');
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
function sh_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM summer_homework_items WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function sh_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM summer_homework_items WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return list<array<string, mixed>>
 */
function sh_fetch_published(PDO $pdo, ?string $formLevel = null): array
{
    $sql = 'SELECT * FROM summer_homework_items WHERE status = \'published\'';
    $params = [];
    if ($formLevel === '1' || $formLevel === '2') {
        $sql .= ' AND form_level = ?';
        $params[] = $formLevel;
    }
    $sql .= ' ORDER BY form_level ASC, list_sort_order ASC, title_en ASC';
    if ($params === []) {
        return $pdo->query($sql)->fetchAll() ?: [];
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll() ?: [];
}

/**
 * @return list<array<string, mixed>>
 */
function sh_fetch_questions(PDO $pdo, int $itemId, bool $includeAnswers = false): array
{
    $stmt = $pdo->prepare('SELECT * FROM summer_homework_questions WHERE item_id = ? ORDER BY sort_order, id');
    $stmt->execute([$itemId]);
    $questions = $stmt->fetchAll() ?: [];
    $optStmt = $pdo->prepare('SELECT * FROM summer_homework_mcq_options WHERE question_id = ? ORDER BY sort_order, id');
    $blankStmt = $pdo->prepare('SELECT * FROM summer_homework_fill_blanks WHERE question_id = ? ORDER BY sort_order, blank_index, id');

    foreach ($questions as &$q) {
        $qid = (int) $q['id'];
        $type = (string) $q['question_type'];
        if ($type === 'mcq') {
            $optStmt->execute([$qid]);
            $opts = $optStmt->fetchAll() ?: [];
            if (!$includeAnswers) {
                foreach ($opts as &$o) {
                    unset($o['is_correct']);
                }
                unset($o);
            }
            $q['options'] = $opts;
            $q['blanks'] = [];
        } elseif ($type === 'fill_blank') {
            $blankStmt->execute([$qid]);
            $blanks = $blankStmt->fetchAll() ?: [];
            if (!$includeAnswers) {
                foreach ($blanks as &$b) {
                    unset($b['acceptable_answer_zh'], $b['acceptable_answer_en']);
                }
                unset($b);
            }
            $q['blanks'] = $blanks;
            $q['options'] = [];
        } else {
            $q['options'] = [];
            $q['blanks'] = [];
        }
        if (!$includeAnswers) {
            unset($q['explanation_zh'], $q['explanation_en']);
        }
    }
    unset($q);

    return $questions;
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function sh_public_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => (string) $row['slug'],
        'title_zh' => (string) $row['title_zh'],
        'title_en' => (string) $row['title_en'],
        'form_level' => (string) $row['form_level'],
        'content_type' => (string) $row['content_type'],
        'body_zh' => (string) ($row['body_zh'] ?? ''),
        'body_en' => (string) ($row['body_en'] ?? ''),
        'video_embed_url' => (string) ($row['video_embed_url'] ?? ''),
        'video_provider' => (string) ($row['video_provider'] ?? 'youtube'),
        'pass_percent' => (float) ($row['pass_percent'] ?? 80),
        'list_sort_order' => (int) ($row['list_sort_order'] ?? 0),
        'status' => (string) $row['status'],
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function sh_can_manage_row(?array $user, array $row): bool
{
    if ($user === null) {
        return false;
    }
    if (user_has_permission('summer_homework.manage_any')) {
        return true;
    }
    if (!user_has_permission('summer_homework.manage_own')) {
        return false;
    }
    return isset($row['owner_user_id']) && (int) $row['owner_user_id'] === (int) $user['id'];
}

function sh_can_view_item(array $row, ?array $user): bool
{
    if ($row['status'] === 'published') {
        return true;
    }
    return sh_can_manage_row($user, $row);
}

/**
 * @param array<string, mixed> $payload
 * @return array{ok:bool,error?:string,id?:int}
 */
function sh_save_item(PDO $pdo, array $payload, array $user): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請填寫標題。'];
    }
    if ($titleEn === '') {
        $titleEn = $titleZh;
    }
    if ($titleZh === '') {
        $titleZh = $titleEn;
    }

    $formLevel = (string) ($payload['form_level'] ?? '1');
    if ($formLevel !== '1' && $formLevel !== '2') {
        return ['ok' => false, 'error' => '級別必須為中一或中二。'];
    }

    $contentType = (string) ($payload['content_type'] ?? 'passage');
    if ($contentType !== 'passage' && $contentType !== 'video') {
        $contentType = 'passage';
    }

    $status = (string) ($payload['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'pending_review', 'published'], true)) {
        $status = 'draft';
    }

    $passPercent = isset($payload['pass_percent']) ? (float) $payload['pass_percent'] : 80.0;
    if ($passPercent < 1 || $passPercent > 100) {
        $passPercent = 80.0;
    }

    $slugInput = trim((string) ($payload['slug'] ?? ''));
    $bodyZh = (string) ($payload['body_zh'] ?? '');
    $bodyEn = (string) ($payload['body_en'] ?? '');
    $videoUrl = trim((string) ($payload['video_embed_url'] ?? ''));
    $videoProvider = trim((string) ($payload['video_provider'] ?? 'youtube')) ?: 'youtube';
    $listSort = (int) ($payload['list_sort_order'] ?? 0);
    /** @var list<array<string, mixed>> $questions */
    $questions = isset($payload['questions']) && is_array($payload['questions']) ? $payload['questions'] : [];

    if ($id > 0) {
        $row = sh_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到習作。'];
        }
        if (!sh_can_manage_row($user, $row)) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        $slug = $slugInput !== '' ? sh_ensure_unique_slug($pdo, $slugInput, $id) : (string) $row['slug'];
        $ownerId = (int) ($row['owner_user_id'] ?? $user['id']);
        if (user_has_permission('summer_homework.manage_any') && isset($payload['owner_user_id'])) {
            $ownerId = (int) $payload['owner_user_id'];
        }

        $upd = $pdo->prepare(
            'UPDATE summer_homework_items SET slug=?, title_zh=?, title_en=?, form_level=?, content_type=?,
             body_zh=?, body_en=?, video_embed_url=?, video_provider=?, pass_percent=?, list_sort_order=?,
             status=?, owner_user_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn, $formLevel, $contentType,
            $bodyZh, $bodyEn, $videoUrl !== '' ? $videoUrl : null, $videoProvider, $passPercent, $listSort,
            $status, $ownerId, $id,
        ]);
        sh_replace_questions($pdo, $id, $questions);
        return ['ok' => true, 'id' => $id];
    }

    $slug = sh_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO summer_homework_items
         (slug, title_zh, title_en, form_level, content_type, body_zh, body_en, video_embed_url, video_provider,
          pass_percent, list_sort_order, owner_user_id, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn, $formLevel, $contentType, $bodyZh, $bodyEn,
        $videoUrl !== '' ? $videoUrl : null, $videoProvider, $passPercent, $listSort, $user['id'], $status,
    ]);
    $newId = (int) $pdo->lastInsertId();
    sh_replace_questions($pdo, $newId, $questions);
    return ['ok' => true, 'id' => $newId];
}

/**
 * @param list<array<string, mixed>> $questions
 */
function sh_replace_questions(PDO $pdo, int $itemId, array $questions): void
{
    $old = $pdo->prepare('SELECT id FROM summer_homework_questions WHERE item_id = ?');
    $old->execute([$itemId]);
    $oldIds = array_map('intval', $old->fetchAll(PDO::FETCH_COLUMN) ?: []);
    if ($oldIds !== []) {
        $in = implode(',', array_fill(0, count($oldIds), '?'));
        $pdo->prepare("DELETE FROM summer_homework_mcq_options WHERE question_id IN ($in)")->execute($oldIds);
        $pdo->prepare("DELETE FROM summer_homework_fill_blanks WHERE question_id IN ($in)")->execute($oldIds);
        $pdo->prepare('DELETE FROM summer_homework_questions WHERE item_id = ?')->execute([$itemId]);
    }

    $qIns = $pdo->prepare(
        'INSERT INTO summer_homework_questions (item_id, question_type, sort_order, stem_zh, stem_en, explanation_zh, explanation_en)
         VALUES (?,?,?,?,?,?,?)'
    );
    $oIns = $pdo->prepare(
        'INSERT INTO summer_homework_mcq_options (question_id, sort_order, text_zh, text_en, is_correct) VALUES (?,?,?,?,?)'
    );
    $bIns = $pdo->prepare(
        'INSERT INTO summer_homework_fill_blanks (question_id, blank_index, acceptable_answer_zh, acceptable_answer_en, sort_order)
         VALUES (?,?,?,?,?)'
    );

    foreach ($questions as $i => $q) {
        $type = (string) ($q['question_type'] ?? 'mcq');
        if ($type !== 'mcq' && $type !== 'fill_blank') {
            $type = 'mcq';
        }
        $stemZh = trim((string) ($q['stem_zh'] ?? ''));
        $stemEn = trim((string) ($q['stem_en'] ?? ''));
        if ($stemZh === '' && $stemEn === '') {
            continue;
        }
        if ($stemEn === '') {
            $stemEn = $stemZh;
        }
        if ($stemZh === '') {
            $stemZh = $stemEn;
        }
        $qIns->execute([
            $itemId,
            $type,
            (int) ($q['sort_order'] ?? $i),
            $stemZh,
            $stemEn,
            (string) ($q['explanation_zh'] ?? ''),
            (string) ($q['explanation_en'] ?? ''),
        ]);
        $qid = (int) $pdo->lastInsertId();

        if ($type === 'mcq') {
            $opts = isset($q['options']) && is_array($q['options']) ? $q['options'] : [];
            foreach ($opts as $oi => $opt) {
                $tz = trim((string) ($opt['text_zh'] ?? ''));
                $te = trim((string) ($opt['text_en'] ?? ''));
                if ($tz === '' && $te === '') {
                    continue;
                }
                if ($te === '') {
                    $te = $tz;
                }
                if ($tz === '') {
                    $tz = $te;
                }
                $oIns->execute([
                    $qid,
                    (int) ($opt['sort_order'] ?? $oi),
                    $tz,
                    $te,
                    !empty($opt['is_correct']) ? 1 : 0,
                ]);
            }
        } else {
            $blanks = isset($q['blanks']) && is_array($q['blanks']) ? $q['blanks'] : [];
            foreach ($blanks as $bi => $blank) {
                $az = trim((string) ($blank['acceptable_answer_zh'] ?? ''));
                $ae = trim((string) ($blank['acceptable_answer_en'] ?? ''));
                if ($az === '' && $ae === '') {
                    continue;
                }
                if ($ae === '') {
                    $ae = $az;
                }
                if ($az === '') {
                    $az = $ae;
                }
                $bIns->execute([
                    $qid,
                    (int) ($blank['blank_index'] ?? ($bi + 1)),
                    $az,
                    $ae,
                    (int) ($blank['sort_order'] ?? $bi),
                ]);
            }
        }
    }
}

/**
 * @return array{ok:bool,error?:string}
 */
function sh_delete_item(PDO $pdo, int $id, array $user): array
{
    $row = sh_get_by_id($pdo, $id);
    if (!$row) {
        return ['ok' => false, 'error' => '找不到習作。'];
    }
    if (!sh_can_manage_row($user, $row)) {
        return ['ok' => false, 'error' => '無權刪除。'];
    }
    $old = $pdo->prepare('SELECT id FROM summer_homework_questions WHERE item_id = ?');
    $old->execute([$id]);
    $oldIds = array_map('intval', $old->fetchAll(PDO::FETCH_COLUMN) ?: []);
    if ($oldIds !== []) {
        $in = implode(',', array_fill(0, count($oldIds), '?'));
        $pdo->prepare("DELETE FROM summer_homework_mcq_options WHERE question_id IN ($in)")->execute($oldIds);
        $pdo->prepare("DELETE FROM summer_homework_fill_blanks WHERE question_id IN ($in)")->execute($oldIds);
    }
    $pdo->prepare('DELETE FROM summer_homework_questions WHERE item_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM summer_homework_attempts WHERE item_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM summer_homework_items WHERE id = ?')->execute([$id]);
    return ['ok' => true];
}

/**
 * Grade responses. MC: 1 point each. Fill blank: 1 point per blank.
 *
 * @param list<array<string, mixed>> $questionsWithAnswers
 * @param array<string, mixed> $responses question_id => {selected_option_index?:int, blanks?:list<string>}
 * @return array{score:float,max_score:float,percent:float,passed:bool,details:list<array<string,mixed>>}
 */
function sh_grade_responses(array $questionsWithAnswers, array $responses, float $passPercent = 80.0): array
{
    $score = 0.0;
    $max = 0.0;
    $details = [];

    foreach ($questionsWithAnswers as $q) {
        $qid = (int) $q['id'];
        $type = (string) $q['question_type'];
        $resp = $responses[(string) $qid] ?? $responses[$qid] ?? null;
        if ($type === 'mcq') {
            $max += 1;
            $correctIdx = null;
            foreach ($q['options'] as $i => $o) {
                if (!empty($o['is_correct'])) {
                    $correctIdx = (int) $i;
                    break;
                }
            }
            $selected = is_array($resp) && isset($resp['selected_option_index'])
                ? (int) $resp['selected_option_index']
                : null;
            $ok = $correctIdx !== null && $selected === $correctIdx;
            if ($ok) {
                $score += 1;
            }
            $details[] = [
                'question_id' => $qid,
                'type' => 'mcq',
                'correct' => $ok,
                'selected_option_index' => $selected,
                'correct_option_index' => $correctIdx,
            ];
        } elseif ($type === 'fill_blank') {
            $blanks = $q['blanks'] ?? [];
            $answers = is_array($resp) && isset($resp['blanks']) && is_array($resp['blanks'])
                ? $resp['blanks']
                : [];
            $blankDetails = [];
            foreach ($blanks as $bi => $blank) {
                $max += 1;
                $given = isset($answers[$bi]) ? (string) $answers[$bi] : (isset($answers[(string) $bi]) ? (string) $answers[(string) $bi] : '');
                $acceptZh = sh_normalize_fill_answer((string) ($blank['acceptable_answer_zh'] ?? ''));
                $acceptEn = sh_normalize_fill_answer((string) ($blank['acceptable_answer_en'] ?? ''));
                $norm = sh_normalize_fill_answer($given);
                $ok = $norm !== '' && ($norm === $acceptZh || $norm === $acceptEn);
                if ($ok) {
                    $score += 1;
                }
                $blankDetails[] = ['blank_index' => (int) ($blank['blank_index'] ?? ($bi + 1)), 'correct' => $ok];
            }
            $details[] = [
                'question_id' => $qid,
                'type' => 'fill_blank',
                'blanks' => $blankDetails,
                'correct' => $blankDetails !== [] && !in_array(false, array_column($blankDetails, 'correct'), true),
            ];
        }
    }

    $percent = $max > 0 ? round(($score / $max) * 100, 2) : 0.0;
    $passed = $percent >= $passPercent;

    return [
        'score' => $score,
        'max_score' => $max,
        'percent' => $percent,
        'passed' => $passed,
        'details' => $details,
    ];
}

/**
 * @param array<string, mixed> $responses
 * @return array{ok:bool,error?:string,result?:array<string,mixed>}
 */
function sh_submit_attempt(PDO $pdo, int $userId, int $itemId, array $responses): array
{
    $row = sh_get_by_id($pdo, $itemId);
    if (!$row || $row['status'] !== 'published') {
        return ['ok' => false, 'error' => '找不到已發佈的習作。'];
    }

    $prevBestStmt = $pdo->prepare(
        'SELECT MAX(percent) AS best_percent,
                MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS any_pass
         FROM summer_homework_attempts WHERE user_id = ? AND item_id = ?'
    );
    $prevBestStmt->execute([$userId, $itemId]);
    $prevBestRow = $prevBestStmt->fetch() ?: [];
    $previousBestPercent = $prevBestRow['best_percent'] !== null && $prevBestRow['best_percent'] !== ''
        ? (float) $prevBestRow['best_percent']
        : null;
    $previouslyPassed = (int) ($prevBestRow['any_pass'] ?? 0) === 1;

    $questions = sh_fetch_questions($pdo, $itemId, true);
    $graded = sh_grade_responses($questions, $responses, (float) $row['pass_percent']);

    $ins = $pdo->prepare(
        'INSERT INTO summer_homework_attempts
         (user_id, item_id, score, max_score, percent, passed, responses_json)
         VALUES (?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $userId,
        $itemId,
        $graded['score'],
        $graded['max_score'],
        $graded['percent'],
        $graded['passed'] ? 1 : 0,
        json_encode($responses, JSON_UNESCAPED_UNICODE),
    ]);
    $attemptId = (int) $pdo->lastInsertId();

    $bestPercent = $previousBestPercent !== null
        ? max($previousBestPercent, $graded['percent'])
        : $graded['percent'];
    $scoreImproved = $previousBestPercent === null || $graded['percent'] > $previousBestPercent;
    $everPassed = $previouslyPassed || $graded['passed'];

    return [
        'ok' => true,
        'result' => [
            'attempt_id' => $attemptId,
            'score' => $graded['score'],
            'max_score' => $graded['max_score'],
            'percent' => $graded['percent'],
            'best_percent' => $bestPercent,
            'previous_best_percent' => $previousBestPercent,
            'score_improved' => $scoreImproved,
            'passed' => $graded['passed'],
            'ever_passed' => $everPassed,
            'pass_percent' => (float) $row['pass_percent'],
            'details' => $graded['details'],
            'must_redo' => !$everPassed,
        ],
    ];
}

/**
 * @return array{passed:bool,percent:?float,attempts:int}|null
 */
function sh_user_progress_for_item(PDO $pdo, int $userId, int $itemId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS attempts,
                MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS any_pass,
                MAX(percent) AS best_percent
         FROM summer_homework_attempts WHERE user_id = ? AND item_id = ?'
    );
    $stmt->execute([$userId, $itemId]);
    $row = $stmt->fetch();
    if (!$row || (int) $row['attempts'] === 0) {
        return ['passed' => false, 'percent' => null, 'attempts' => 0];
    }
    return [
        'passed' => (int) $row['any_pass'] === 1,
        'percent' => $row['best_percent'] !== null ? (float) $row['best_percent'] : null,
        'attempts' => (int) $row['attempts'],
    ];
}
