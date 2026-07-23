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
    $dueAt = isset($row['due_at']) && $row['due_at'] !== null && $row['due_at'] !== ''
        ? (string) $row['due_at']
        : null;
    $allowLate = array_key_exists('allow_late_submit', $row)
        ? (int) $row['allow_late_submit'] === 1
        : true;

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
        'due_at' => $dueAt,
        'allow_late_submit' => $allowLate,
        'submissions_closed' => sh_submissions_closed($dueAt, $allowLate),
        'list_sort_order' => (int) ($row['list_sort_order'] ?? 0),
        'status' => (string) $row['status'],
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

/**
 * Normalize due_at from form/API (datetime-local or SQL datetime) to Y-m-d H:i:s or null.
 */
function sh_normalize_due_at(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    $raw = trim((string) $value);
    if ($raw === '') {
        return null;
    }
    $raw = str_replace('T', ' ', $raw);
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $raw)) {
        $raw .= ':00';
    }
    $ts = strtotime($raw);
    if ($ts === false) {
        return null;
    }
    return date('Y-m-d H:i:s', $ts);
}

function sh_is_past_due(?string $dueAt): bool
{
    if ($dueAt === null || $dueAt === '') {
        return false;
    }
    $dueTs = strtotime($dueAt);
    if ($dueTs === false) {
        return false;
    }
    return time() > $dueTs;
}

function sh_submissions_closed(?string $dueAt, bool $allowLateSubmit): bool
{
    return sh_is_past_due($dueAt) && !$allowLateSubmit;
}

/**
 * @return 'missing'|'on_time'|'late'
 */
function sh_submission_status(?string $dueAt, ?string $bestSubmittedAt): string
{
    if ($bestSubmittedAt === null || $bestSubmittedAt === '') {
        return 'missing';
    }
    if ($dueAt === null || $dueAt === '') {
        return 'on_time';
    }
    $dueTs = strtotime($dueAt);
    $subTs = strtotime($bestSubmittedAt);
    if ($dueTs === false || $subTs === false) {
        return 'on_time';
    }
    return $subTs <= $dueTs ? 'on_time' : 'late';
}

function sh_submission_status_label(string $status): string
{
    return match ($status) {
        'on_time' => '準時',
        'late' => '遲交',
        default => '欠交',
    };
}

/**
 * Best attempt: highest percent; ties → earliest submitted_at.
 *
 * @return array<string, mixed>|null
 */
function sh_best_attempt_for_user_item(PDO $pdo, int $userId, int $itemId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM summer_homework_attempts
         WHERE user_id = ? AND item_id = ?
         ORDER BY percent DESC, submitted_at ASC, id ASC
         LIMIT 1'
    );
    $stmt->execute([$userId, $itemId]);
    $row = $stmt->fetch();
    return $row ?: null;
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

    $dueAt = sh_normalize_due_at($payload['due_at'] ?? null);
    if (isset($payload['due_at']) && trim((string) $payload['due_at']) !== '' && $dueAt === null) {
        return ['ok' => false, 'error' => '呈交日期格式無效。'];
    }
    $allowLate = !isset($payload['allow_late_submit']) || !empty($payload['allow_late_submit']) ? 1 : 0;

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
             body_zh=?, body_en=?, video_embed_url=?, video_provider=?, pass_percent=?, due_at=?, allow_late_submit=?,
             list_sort_order=?, status=?, owner_user_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn, $formLevel, $contentType,
            $bodyZh, $bodyEn, $videoUrl !== '' ? $videoUrl : null, $videoProvider, $passPercent,
            $dueAt, $allowLate, $listSort, $status, $ownerId, $id,
        ]);
        sh_replace_questions($pdo, $id, $questions);
        return ['ok' => true, 'id' => $id];
    }

    $slug = sh_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO summer_homework_items
         (slug, title_zh, title_en, form_level, content_type, body_zh, body_en, video_embed_url, video_provider,
          pass_percent, due_at, allow_late_submit, list_sort_order, owner_user_id, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn, $formLevel, $contentType, $bodyZh, $bodyEn,
        $videoUrl !== '' ? $videoUrl : null, $videoProvider, $passPercent, $dueAt, $allowLate,
        $listSort, $user['id'], $status,
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
            $optionSnapshot = [];
            foreach ($q['options'] as $i => $o) {
                $idx = (int) $i;
                $isCorrect = !empty($o['is_correct']);
                if ($isCorrect && $correctIdx === null) {
                    $correctIdx = $idx;
                }
                $optionSnapshot[] = [
                    'index' => $idx,
                    'label' => chr(65 + $idx),
                    'text_zh' => (string) ($o['text_zh'] ?? ''),
                    'text_en' => (string) ($o['text_en'] ?? ''),
                    'is_correct' => $isCorrect,
                ];
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
                // Snapshot at submit time so option-distribution analysis survives later edits.
                'options' => $optionSnapshot,
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
                $blankDetails[] = [
                    'blank_index' => (int) ($blank['blank_index'] ?? ($bi + 1)),
                    'given' => $given,
                    'correct' => $ok,
                ];
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

function sh_attempts_has_grading_json(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM summer_homework_attempts LIKE 'grading_json'");
        $cached = $stmt !== false && (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $cached = false;
    }
    return $cached;
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

    $dueAt = isset($row['due_at']) && $row['due_at'] !== null && $row['due_at'] !== ''
        ? (string) $row['due_at']
        : null;
    $allowLate = !array_key_exists('allow_late_submit', $row) || (int) $row['allow_late_submit'] === 1;
    if (sh_submissions_closed($dueAt, $allowLate)) {
        return ['ok' => false, 'error' => '已過呈交截止日期，無法再提交。'];
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

    $submittedAt = date('Y-m-d H:i:s');
    $responsesJson = json_encode($responses, JSON_UNESCAPED_UNICODE);
    $gradingPayload = [
        'score' => $graded['score'],
        'max_score' => $graded['max_score'],
        'percent' => $graded['percent'],
        'passed' => $graded['passed'],
        'pass_percent' => (float) $row['pass_percent'],
        'details' => $graded['details'],
    ];
    $gradingJson = json_encode($gradingPayload, JSON_UNESCAPED_UNICODE);

    // Always INSERT a new row (UI shows best score only; history is retained for analysis).
    if (sh_attempts_has_grading_json($pdo)) {
        $ins = $pdo->prepare(
            'INSERT INTO summer_homework_attempts
             (user_id, item_id, score, max_score, percent, passed, responses_json, grading_json, submitted_at)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $userId,
            $itemId,
            $graded['score'],
            $graded['max_score'],
            $graded['percent'],
            $graded['passed'] ? 1 : 0,
            $responsesJson,
            $gradingJson,
            $submittedAt,
        ]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO summer_homework_attempts
             (user_id, item_id, score, max_score, percent, passed, responses_json, submitted_at)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $userId,
            $itemId,
            $graded['score'],
            $graded['max_score'],
            $graded['percent'],
            $graded['passed'] ? 1 : 0,
            $responsesJson,
            $submittedAt,
        ]);
    }
    $attemptId = (int) $pdo->lastInsertId();

    $best = sh_best_attempt_for_user_item($pdo, $userId, $itemId);
    $bestPercent = $best !== null ? (float) $best['percent'] : $graded['percent'];
    $bestSubmittedAt = $best !== null ? (string) $best['submitted_at'] : $submittedAt;
    $scoreImproved = $previousBestPercent === null || $graded['percent'] > $previousBestPercent;
    $everPassed = $previouslyPassed || $graded['passed'];
    $status = sh_submission_status($dueAt, $bestSubmittedAt);

    return [
        'ok' => true,
        'result' => [
            'attempt_id' => $attemptId,
            'score' => $graded['score'],
            'max_score' => $graded['max_score'],
            'percent' => $graded['percent'],
            'submitted_at' => $submittedAt,
            'best_percent' => $bestPercent,
            'best_submitted_at' => $bestSubmittedAt,
            'previous_best_percent' => $previousBestPercent,
            'score_improved' => $scoreImproved,
            'passed' => $graded['passed'],
            'ever_passed' => $everPassed,
            'pass_percent' => (float) $row['pass_percent'],
            'due_at' => $dueAt,
            'allow_late_submit' => $allowLate,
            'submission_status' => $status,
            'is_late' => $status === 'late',
            'details' => $graded['details'],
            'must_redo' => !$everPassed,
        ],
    ];
}

/**
 * @param array<string, mixed>|null $itemRow
 * @return array{passed:bool,percent:?float,attempts:int,best_submitted_at:?string,submission_status:string,score:?float,max_score:?float}
 */
function sh_user_progress_for_item(PDO $pdo, int $userId, int $itemId, ?array $itemRow = null): array
{
    if ($itemRow === null) {
        $itemRow = sh_get_by_id($pdo, $itemId) ?: [];
    }
    $dueAt = isset($itemRow['due_at']) && $itemRow['due_at'] !== null && $itemRow['due_at'] !== ''
        ? (string) $itemRow['due_at']
        : null;

    $countStmt = $pdo->prepare(
        'SELECT COUNT(*) AS attempts,
                MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS any_pass
         FROM summer_homework_attempts WHERE user_id = ? AND item_id = ?'
    );
    $countStmt->execute([$userId, $itemId]);
    $countRow = $countStmt->fetch() ?: [];
    $attempts = (int) ($countRow['attempts'] ?? 0);
    if ($attempts === 0) {
        return [
            'passed' => false,
            'percent' => null,
            'attempts' => 0,
            'best_submitted_at' => null,
            'submission_status' => 'missing',
            'score' => null,
            'max_score' => null,
        ];
    }

    $best = sh_best_attempt_for_user_item($pdo, $userId, $itemId);
    $bestSubmittedAt = $best !== null ? (string) $best['submitted_at'] : null;

    return [
        'passed' => (int) ($countRow['any_pass'] ?? 0) === 1,
        'percent' => $best !== null ? (float) $best['percent'] : null,
        'attempts' => $attempts,
        'best_submitted_at' => $bestSubmittedAt,
        'submission_status' => sh_submission_status($dueAt, $bestSubmittedAt),
        'score' => $best !== null ? (float) $best['score'] : null,
        'max_score' => $best !== null ? (float) $best['max_score'] : null,
    ];
}

/**
 * @return array{
 *   class:array<string,mixed>,
 *   items:list<array<string,mixed>>,
 *   students:list<array<string,mixed>>,
 *   rows:list<array<string,mixed>>,
 *   message:?string
 * }
 */
function sh_class_report(PDO $pdo, int $classId): array
{
    require_once __DIR__ . '/classes_lib.php';

    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return [
            'class' => [],
            'items' => [],
            'students' => [],
            'rows' => [],
            'message' => '找不到課程。',
        ];
    }

    $formLevel = isset($class['form_level']) && $class['form_level'] !== null && $class['form_level'] !== ''
        ? (string) $class['form_level']
        : null;

    $classOut = [
        'id' => (int) $class['id'],
        'name' => (string) $class['name'],
        'school_year' => (string) ($class['school_year'] ?? ''),
        'form_level' => $formLevel,
        'form_level_label' => classes_form_level_label($formLevel),
        'course_subject' => isset($class['course_subject']) ? (string) $class['course_subject'] : null,
        'course_subject_label' => classes_course_subject_label(
            isset($class['course_subject']) ? (string) $class['course_subject'] : null
        ),
    ];

    if ($formLevel !== '1' && $formLevel !== '2') {
        return [
            'class' => $classOut,
            'items' => [],
            'students' => classes_students_in_class($pdo, $classId),
            'rows' => [],
            'message' => '此課程年級非中一／中二，沒有對應的暑期功課習作。請先在課程設定年級。',
        ];
    }

    $items = sh_fetch_published($pdo, $formLevel);
    $students = classes_students_in_class($pdo, $classId);
    $rows = [];

    foreach ($students as $student) {
        $uid = (int) ($student['id'] ?? $student['user_id'] ?? 0);
        if ($uid <= 0) {
            continue;
        }
        foreach ($items as $item) {
            $itemId = (int) $item['id'];
            $progress = sh_user_progress_for_item($pdo, $uid, $itemId, $item);
            $status = $progress['submission_status'];
            $rows[] = [
                'student_user_id' => $uid,
                'item_id' => $itemId,
                'status' => $status,
                'status_label' => sh_submission_status_label($status),
                'percent' => $progress['percent'],
                'score' => $progress['score'],
                'max_score' => $progress['max_score'],
                'best_submitted_at' => $progress['best_submitted_at'],
                'attempts' => $progress['attempts'],
                'passed' => $progress['passed'],
            ];
        }
    }

    $itemPublic = [];
    foreach ($items as $item) {
        $p = sh_public_row($item);
        unset($p['body_zh'], $p['body_en']);
        $itemPublic[] = $p;
    }

    return [
        'class' => $classOut,
        'items' => $itemPublic,
        'students' => $students,
        'rows' => $rows,
        'message' => $items === [] ? '尚無對應該年級的已發佈暑期功課。' : null,
    ];
}

/**
 * All attempts for one item (newest first), optionally filtered by student.
 * Joins users for display name / email.
 *
 * @return list<array<string, mixed>>
 */
function sh_list_attempts_for_item(PDO $pdo, int $itemId, ?int $userId = null): array
{
    require_once __DIR__ . '/user_names_lib.php';

    $sql = 'SELECT a.*, u.email, u.display_name, u.name_zh, u.name_en
            FROM summer_homework_attempts a
            INNER JOIN users u ON u.id = a.user_id
            WHERE a.item_id = ?';
    $params = [$itemId];
    if ($userId !== null && $userId > 0) {
        $sql .= ' AND a.user_id = ?';
        $params[] = $userId;
    }
    $sql .= ' ORDER BY a.submitted_at DESC, a.id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'item_id' => (int) $row['item_id'],
            'score' => (float) $row['score'],
            'max_score' => (float) $row['max_score'],
            'percent' => (float) $row['percent'],
            'passed' => (int) $row['passed'] === 1,
            'submitted_at' => (string) $row['submitted_at'],
            'email' => (string) ($row['email'] ?? ''),
            'display_name' => user_format_name($row),
            'name_zh' => (string) ($row['name_zh'] ?? ''),
            'name_en' => (string) ($row['name_en'] ?? ''),
            'responses' => sh_decode_json_column($row['responses_json'] ?? null),
            'grading' => sh_decode_json_column($row['grading_json'] ?? null),
        ];
    }
    return $out;
}

/**
 * Per-student summary for one item (attempt count + best score).
 *
 * @return list<array<string, mixed>>
 */
function sh_student_summaries_for_item(PDO $pdo, int $itemId): array
{
    require_once __DIR__ . '/user_names_lib.php';

    $stmt = $pdo->prepare(
        'SELECT a.user_id, u.email, u.display_name, u.name_zh, u.name_en,
                COUNT(*) AS attempts,
                MAX(a.percent) AS best_percent,
                MAX(a.passed) AS any_pass,
                MAX(a.submitted_at) AS last_submitted_at,
                MIN(a.submitted_at) AS first_submitted_at
         FROM summer_homework_attempts a
         INNER JOIN users u ON u.id = a.user_id
         WHERE a.item_id = ?
         GROUP BY a.user_id, u.email, u.display_name, u.name_zh, u.name_en
         ORDER BY best_percent DESC, attempts DESC, u.display_name ASC'
    );
    $stmt->execute([$itemId]);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $uid = (int) $row['user_id'];
        $best = sh_best_attempt_for_user_item($pdo, $uid, $itemId);
        $out[] = [
            'user_id' => $uid,
            'email' => (string) ($row['email'] ?? ''),
            'display_name' => user_format_name($row),
            'attempts' => (int) $row['attempts'],
            'best_percent' => $best !== null ? (float) $best['percent'] : (float) $row['best_percent'],
            'best_score' => $best !== null ? (float) $best['score'] : null,
            'best_max_score' => $best !== null ? (float) $best['max_score'] : null,
            'best_submitted_at' => $best !== null ? (string) $best['submitted_at'] : null,
            'passed' => (int) ($row['any_pass'] ?? 0) === 1,
            'first_submitted_at' => (string) ($row['first_submitted_at'] ?? ''),
            'last_submitted_at' => (string) ($row['last_submitted_at'] ?? ''),
        ];
    }
    return $out;
}

/**
 * Decode JSON column that may already be an array (some PDO drivers).
 *
 * @return array<string, mixed>|list<mixed>|null
 */
function sh_decode_json_column(mixed $value): ?array
{
    if ($value === null || $value === '') {
        return null;
    }
    if (is_array($value)) {
        return $value;
    }
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : null;
}

/**
 * All attempts for one student on one item (oldest first). Includes responses + grading when present.
 *
 * @return list<array<string, mixed>>
 */
function sh_list_attempts_for_user_item(PDO $pdo, int $userId, int $itemId): array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM summer_homework_attempts
         WHERE user_id = ? AND item_id = ?
         ORDER BY submitted_at ASC, id ASC'
    );
    $stmt->execute([$userId, $itemId]);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'item_id' => (int) $row['item_id'],
            'score' => (float) $row['score'],
            'max_score' => (float) $row['max_score'],
            'percent' => (float) $row['percent'],
            'passed' => (int) $row['passed'] === 1,
            'submitted_at' => (string) $row['submitted_at'],
            'responses' => sh_decode_json_column($row['responses_json'] ?? null),
            'grading' => sh_decode_json_column($row['grading_json'] ?? null),
        ];
    }
    return $out;
}

/**
 * Ensure option bucket exists in MCQ option_stats.
 *
 * @param array<string, mixed> $statsQ
 * @param array<string, mixed>|null $meta
 */
function sh_analytics_ensure_option(array &$statsQ, int $idx, ?array $meta = null): void
{
    if (!isset($statsQ['option_stats']) || !is_array($statsQ['option_stats'])) {
        $statsQ['option_stats'] = [];
    }
    if (!isset($statsQ['option_stats'][$idx])) {
        $statsQ['option_stats'][$idx] = [
            'index' => $idx,
            'label' => chr(65 + $idx),
            'text_zh' => '',
            'text_en' => '',
            'is_correct' => false,
            'selected_count' => 0,
        ];
    }
    if ($meta !== null) {
        if (isset($meta['label']) && (string) $meta['label'] !== '') {
            $statsQ['option_stats'][$idx]['label'] = (string) $meta['label'];
        }
        if (isset($meta['text_zh'])) {
            $statsQ['option_stats'][$idx]['text_zh'] = (string) $meta['text_zh'];
        }
        if (isset($meta['text_en'])) {
            $statsQ['option_stats'][$idx]['text_en'] = (string) $meta['text_en'];
        }
        if (array_key_exists('is_correct', $meta)) {
            $statsQ['option_stats'][$idx]['is_correct'] = !empty($meta['is_correct']);
        }
    }
}

/**
 * Aggregate attempt counts, miss rates, and MCQ option-selection rates for one homework item.
 *
 * @return array{
 *   item_id:int,
 *   total_attempts:int,
 *   distinct_students:int,
 *   avg_attempts_per_student:float,
 *   questions:list<array<string,mixed>>,
 *   grading_json_available:bool
 * }
 */
function sh_item_attempt_analytics(PDO $pdo, int $itemId): array
{
    $summaryStmt = $pdo->prepare(
        'SELECT COUNT(*) AS total_attempts,
                COUNT(DISTINCT user_id) AS distinct_students
         FROM summer_homework_attempts WHERE item_id = ?'
    );
    $summaryStmt->execute([$itemId]);
    $summary = $summaryStmt->fetch() ?: [];
    $totalAttempts = (int) ($summary['total_attempts'] ?? 0);
    $distinctStudents = (int) ($summary['distinct_students'] ?? 0);

    $questions = sh_fetch_questions($pdo, $itemId, true);
    /** @var array<int, array<string, mixed>> $stats */
    $stats = [];
    foreach ($questions as $q) {
        $qid = (int) $q['id'];
        $type = (string) $q['question_type'];
        $stats[$qid] = [
            'question_id' => $qid,
            'type' => $type,
            'attempts' => 0,
            'correct' => 0,
            'incorrect' => 0,
            'unanswered' => 0,
        ];
        if ($type === 'mcq') {
            $stats[$qid]['option_stats'] = [];
            $stats[$qid]['correct_option_index'] = null;
            foreach ($q['options'] as $i => $o) {
                $idx = (int) $i;
                sh_analytics_ensure_option($stats[$qid], $idx, [
                    'label' => chr(65 + $idx),
                    'text_zh' => (string) ($o['text_zh'] ?? ''),
                    'text_en' => (string) ($o['text_en'] ?? ''),
                    'is_correct' => !empty($o['is_correct']),
                ]);
                if (!empty($o['is_correct']) && $stats[$qid]['correct_option_index'] === null) {
                    $stats[$qid]['correct_option_index'] = $idx;
                }
            }
        } elseif ($type === 'fill_blank') {
            $stats[$qid]['blank_stats'] = [];
        }
    }

    if ($totalAttempts > 0) {
        $cols = sh_attempts_has_grading_json($pdo)
            ? 'grading_json, responses_json'
            : 'responses_json';
        $attStmt = $pdo->prepare(
            "SELECT {$cols} FROM summer_homework_attempts WHERE item_id = ?"
        );
        $attStmt->execute([$itemId]);
        while ($row = $attStmt->fetch()) {
            $grading = isset($row['grading_json'])
                ? sh_decode_json_column($row['grading_json'] ?? null)
                : null;
            $responses = sh_decode_json_column($row['responses_json'] ?? null) ?? [];
            $details = (is_array($grading) && isset($grading['details']) && is_array($grading['details']))
                ? $grading['details']
                : [];

            /** @var array<int, array<string, mixed>> $detailByQ */
            $detailByQ = [];
            foreach ($details as $detail) {
                if (!is_array($detail)) {
                    continue;
                }
                $qid = (int) ($detail['question_id'] ?? 0);
                if ($qid > 0) {
                    $detailByQ[$qid] = $detail;
                }
            }

            foreach ($stats as $qid => &$s) {
                $detail = $detailByQ[$qid] ?? null;
                $resp = is_array($responses)
                    ? ($responses[(string) $qid] ?? $responses[$qid] ?? null)
                    : null;

                if (($s['type'] ?? '') === 'mcq') {
                    $selected = null;
                    $correctIdx = $s['correct_option_index'] ?? null;
                    $isCorrect = null;

                    if (is_array($detail)) {
                        if (array_key_exists('selected_option_index', $detail)) {
                            $selected = $detail['selected_option_index'] !== null
                                ? (int) $detail['selected_option_index']
                                : null;
                        }
                        if (isset($detail['correct_option_index'])) {
                            $correctIdx = (int) $detail['correct_option_index'];
                            $s['correct_option_index'] = $correctIdx;
                        }
                        if (array_key_exists('correct', $detail)) {
                            $isCorrect = !empty($detail['correct']);
                        }
                        if (isset($detail['options']) && is_array($detail['options'])) {
                            foreach ($detail['options'] as $optSnap) {
                                if (!is_array($optSnap) || !isset($optSnap['index'])) {
                                    continue;
                                }
                                sh_analytics_ensure_option($s, (int) $optSnap['index'], $optSnap);
                            }
                        }
                    }
                    if ($selected === null && is_array($resp) && isset($resp['selected_option_index'])) {
                        $selected = (int) $resp['selected_option_index'];
                    }
                    if ($isCorrect === null && $selected !== null && $correctIdx !== null) {
                        $isCorrect = $selected === (int) $correctIdx;
                    }

                    if ($detail === null && $selected === null && !is_array($resp)) {
                        continue;
                    }

                    $s['attempts']++;
                    if ($selected === null) {
                        $s['unanswered']++;
                        $s['incorrect']++;
                    } elseif ($isCorrect === true) {
                        $s['correct']++;
                        sh_analytics_ensure_option($s, $selected);
                        $s['option_stats'][$selected]['selected_count']++;
                    } else {
                        $s['incorrect']++;
                        sh_analytics_ensure_option($s, $selected);
                        $s['option_stats'][$selected]['selected_count']++;
                    }
                } elseif (($s['type'] ?? '') === 'fill_blank') {
                    if (!is_array($detail)) {
                        continue;
                    }
                    $s['attempts']++;
                    if (!empty($detail['correct'])) {
                        $s['correct']++;
                    } else {
                        $s['incorrect']++;
                    }
                    if (isset($detail['blanks']) && is_array($detail['blanks'])) {
                        if (!isset($s['blank_stats']) || !is_array($s['blank_stats'])) {
                            $s['blank_stats'] = [];
                        }
                        foreach ($detail['blanks'] as $blank) {
                            if (!is_array($blank)) {
                                continue;
                            }
                            $bi = (int) ($blank['blank_index'] ?? 0);
                            if ($bi <= 0) {
                                continue;
                            }
                            if (!isset($s['blank_stats'][$bi])) {
                                $s['blank_stats'][$bi] = [
                                    'blank_index' => $bi,
                                    'attempts' => 0,
                                    'correct' => 0,
                                    'incorrect' => 0,
                                ];
                            }
                            $s['blank_stats'][$bi]['attempts']++;
                            if (!empty($blank['correct'])) {
                                $s['blank_stats'][$bi]['correct']++;
                            } else {
                                $s['blank_stats'][$bi]['incorrect']++;
                            }
                        }
                    }
                }
            }
            unset($s);
        }
    }

    $questionOut = [];
    foreach ($stats as $s) {
        $attempts = (int) $s['attempts'];
        $incorrect = (int) $s['incorrect'];
        $missRate = $attempts > 0 ? round(($incorrect / $attempts) * 100, 2) : null;
        $row = [
            'question_id' => $s['question_id'],
            'type' => $s['type'],
            'attempts' => $attempts,
            'correct' => (int) $s['correct'],
            'incorrect' => $incorrect,
            'unanswered' => (int) ($s['unanswered'] ?? 0),
            'miss_rate_percent' => $missRate,
            'correct_option_index' => $s['correct_option_index'] ?? null,
        ];
        if (isset($s['option_stats']) && is_array($s['option_stats'])) {
            $options = array_values($s['option_stats']);
            usort($options, static fn (array $a, array $b): int => $a['index'] <=> $b['index']);
            foreach ($options as &$opt) {
                $sel = (int) $opt['selected_count'];
                $opt['select_rate_percent'] = $attempts > 0 ? round(($sel / $attempts) * 100, 2) : null;
                $isCorrectOpt = !empty($opt['is_correct']);
                if ($isCorrectOpt) {
                    $opt['wrong_select_rate_percent'] = null;
                } else {
                    $opt['wrong_select_rate_percent'] = $incorrect > 0
                        ? round(($sel / $incorrect) * 100, 2)
                        : null;
                }
            }
            unset($opt);
            $row['options'] = $options;
        }
        if (isset($s['blank_stats']) && is_array($s['blank_stats'])) {
            $blanks = array_values($s['blank_stats']);
            usort($blanks, static fn (array $a, array $b): int => $a['blank_index'] <=> $b['blank_index']);
            foreach ($blanks as &$b) {
                $ba = (int) $b['attempts'];
                $b['miss_rate_percent'] = $ba > 0 ? round(((int) $b['incorrect'] / $ba) * 100, 2) : null;
            }
            unset($b);
            $row['blanks'] = $blanks;
        }
        $questionOut[] = $row;
    }

    return [
        'item_id' => $itemId,
        'total_attempts' => $totalAttempts,
        'distinct_students' => $distinctStudents,
        'avg_attempts_per_student' => $distinctStudents > 0
            ? round($totalAttempts / $distinctStudents, 2)
            : 0.0,
        'questions' => $questionOut,
        'grading_json_available' => sh_attempts_has_grading_json($pdo),
    ];
}
