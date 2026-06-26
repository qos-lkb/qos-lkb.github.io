<?php

declare(strict_types=1);

require_once __DIR__ . '/learning_tools_lib.php';
require_once __DIR__ . '/articles_lib.php';

const LA_ASSESSMENT_MAX_RECENT = 10;

/**
 * @param array<string, mixed> $body
 * @return array{ok:bool,error?:string,attempt_id?:int,score?:int,max_score?:int}
 */
function la_submit_attempt(PDO $pdo, int $userId, array $body): array
{
    $sourceType = (string) ($body['source_type'] ?? '');
    if (!in_array($sourceType, ['learning_tool', 'article', 'question_bank'], true)) {
        return ['ok' => false, 'error' => '無效的測驗類型。'];
    }
    $sourceId = (int) ($body['source_id'] ?? 0);
    if ($sourceId <= 0) {
        return ['ok' => false, 'error' => '無效的測驗 ID。'];
    }

    $responses = $body['responses'] ?? [];
    if (!is_array($responses) || $responses === []) {
        return ['ok' => false, 'error' => '請提供作答紀錄。'];
    }

    $meta = la_resolve_source_meta($pdo, $sourceType, $sourceId);
    if ($meta === null) {
        return ['ok' => false, 'error' => '找不到測驗內容。'];
    }

    $score = 0;
    $maxScore = count($responses);
    $parsedResponses = [];

    foreach ($responses as $resp) {
        if (!is_array($resp)) {
            continue;
        }
        $qid = (int) ($resp['question_id'] ?? 0);
        if ($qid <= 0) {
            continue;
        }
        $selected = isset($resp['selected_option_index']) ? (int) $resp['selected_option_index'] : null;
        $correctIdx = $meta['answers'][$qid] ?? null;
        $isCorrect = $correctIdx !== null && $selected === $correctIdx;
        if ($isCorrect) {
            $score++;
        }
        $parsedResponses[] = [
            'question_id' => $qid,
            'selected_option_index' => $selected,
            'is_correct' => $isCorrect ? 1 : 0,
            'response_text' => isset($resp['response_text']) ? (string) $resp['response_text'] : null,
        ];
    }

    if ($parsedResponses === []) {
        return ['ok' => false, 'error' => '作答紀錄無效。'];
    }
    $maxScore = count($parsedResponses);

    try {
        $pdo->beginTransaction();

        $ins = $pdo->prepare(
            'INSERT INTO learning_attempts (user_id, source_type, source_id, subject_id, topic_id, score, max_score, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
        );
        $ins->execute([
            $userId,
            $sourceType,
            $sourceId,
            $meta['subject_id'],
            $meta['topic_id'],
            $score,
            $maxScore,
        ]);
        $attemptId = (int) $pdo->lastInsertId();

        $rIns = $pdo->prepare(
            'INSERT INTO learning_responses (attempt_id, question_id, selected_option_index, is_correct, response_text)
             VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($parsedResponses as $pr) {
            $rIns->execute([
                $attemptId,
                $pr['question_id'],
                $pr['selected_option_index'],
                $pr['is_correct'],
                $pr['response_text'],
            ]);
        }

        if ($meta['topic_id'] !== null) {
            la_recalculate_topic_mastery($pdo, $userId, (int) $meta['topic_id']);
        }

        $pdo->commit();
        return ['ok' => true, 'attempt_id' => $attemptId, 'score' => $score, 'max_score' => $maxScore];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '儲存失敗。'];
    }
}

/**
 * @return array{subject_id:?int,topic_id:?int,answers:array<int,int>}|null
 */
function la_resolve_source_meta(PDO $pdo, string $sourceType, int $sourceId): ?array
{
    $subjectId = null;
    $topicId = null;
    $answers = [];

    if ($sourceType === 'learning_tool') {
        $row = lt_get_by_id($pdo, $sourceId);
        if (!$row) {
            return null;
        }
        $subjectId = $row['subject_id'] !== null ? (int) $row['subject_id'] : null;
        $topicId = $row['topic_id'] !== null ? (int) $row['topic_id'] : null;
        $questions = lt_fetch_questions($pdo, $sourceId, true);
        foreach ($questions as $q) {
            foreach ($q['options'] ?? [] as $i => $opt) {
                if (!empty($opt['is_correct'])) {
                    $answers[(int) $q['id']] = (int) $i;
                }
            }
        }
    } elseif ($sourceType === 'article') {
        $row = art_get_by_id($pdo, $sourceId);
        if (!$row) {
            return null;
        }
        $subjectId = $row['subject_id'] !== null ? (int) $row['subject_id'] : null;
        $topicId = $row['topic_id'] !== null ? (int) $row['topic_id'] : null;
        $questions = art_fetch_questions($pdo, $sourceId, true);
        foreach ($questions as $q) {
            foreach ($q['options'] ?? [] as $i => $opt) {
                if (!empty($opt['is_correct'])) {
                    $answers[(int) $q['id']] = (int) $i;
                }
            }
        }
    } elseif ($sourceType === 'question_bank') {
        require_once __DIR__ . '/question_bank_lib.php';
        $row = qb_get_by_id($pdo, $sourceId);
        if (!$row) {
            return null;
        }
        $subjectId = $row['subject_id'] !== null ? (int) $row['subject_id'] : null;
        $topicId = $row['topic_id'] !== null ? (int) $row['topic_id'] : null;
        $questions = qb_fetch_questions($pdo, $sourceId, true);
        foreach ($questions as $q) {
            if (($q['question_type'] ?? '') === 'mcq' || ($q['question_type'] ?? '') === 'true_false') {
                foreach ($q['options'] ?? [] as $i => $opt) {
                    if (!empty($opt['is_correct'])) {
                        $answers[(int) $q['id']] = (int) $i;
                    }
                }
            }
        }
    }

    return ['subject_id' => $subjectId, 'topic_id' => $topicId, 'answers' => $answers];
}

function la_recalculate_topic_mastery(PDO $pdo, int $userId, int $topicId): void
{
    $stmt = $pdo->prepare(
        'SELECT score, max_score FROM learning_attempts
         WHERE user_id = ? AND topic_id = ? AND max_score > 0
         ORDER BY submitted_at DESC
         LIMIT ?'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $topicId, PDO::PARAM_INT);
    $stmt->bindValue(3, LA_ASSESSMENT_MAX_RECENT, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll() ?: [];
    if ($rows === []) {
        return;
    }

    $weights = [];
    $totalWeight = 0.0;
    $weight = 0.5;
    foreach ($rows as $i => $r) {
        $weights[$i] = $weight;
        $totalWeight += $weight;
        $weight *= 0.5;
    }

    $mastery = 0.0;
    foreach ($rows as $i => $r) {
        $pct = ((int) $r['score']) / max(1, (int) $r['max_score']) * 100;
        $mastery += $pct * ($weights[$i] / $totalWeight);
    }

    $count = count($rows);
    $ups = $pdo->prepare(
        'INSERT INTO topic_mastery (user_id, topic_id, mastery_score, attempt_count, last_attempt_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE mastery_score = VALUES(mastery_score), attempt_count = VALUES(attempt_count), last_attempt_at = CURRENT_TIMESTAMP'
    );
    $ups->execute([$userId, $topicId, round($mastery, 2), $count]);
}

/**
 * @return list<array<string, mixed>>
 */
function la_user_mastery(PDO $pdo, int $userId, ?int $subjectId = null): array
{
    if ($subjectId !== null) {
        $stmt = $pdo->prepare(
            'SELECT tm.topic_id, tm.mastery_score, tm.attempt_count, tm.last_attempt_at,
                    t.name_zh, t.name_en, t.slug AS topic_slug, s.slug AS subject_slug
             FROM topic_mastery tm
             INNER JOIN topics t ON t.id = tm.topic_id
             INNER JOIN subjects s ON s.id = t.subject_id
             WHERE tm.user_id = ? AND t.subject_id = ?
             ORDER BY tm.mastery_score ASC'
        );
        $stmt->execute([$userId, $subjectId]);
    } else {
        $stmt = $pdo->prepare(
            'SELECT tm.topic_id, tm.mastery_score, tm.attempt_count, tm.last_attempt_at,
                    t.name_zh, t.name_en, t.slug AS topic_slug, s.slug AS subject_slug, s.name_zh AS subject_name_zh, s.name_en AS subject_name_en
             FROM topic_mastery tm
             INNER JOIN topics t ON t.id = tm.topic_id
             INNER JOIN subjects s ON s.id = t.subject_id
             WHERE tm.user_id = ?
             ORDER BY s.name_zh ASC, tm.mastery_score ASC'
        );
        $stmt->execute([$userId]);
    }
    return $stmt->fetchAll() ?: [];
}

/**
 * @return list<array<string, mixed>>
 */
function la_user_attempts(PDO $pdo, int $userId, int $limit = 20): array
{
    $limit = max(1, min(100, $limit));
    $stmt = $pdo->prepare(
        'SELECT id, source_type, source_id, subject_id, topic_id, score, max_score, submitted_at
         FROM learning_attempts WHERE user_id = ? ORDER BY submitted_at DESC LIMIT ?'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll() ?: [];
}

/**
 * @return array<string, list<string>>
 */
function la_content_completion_map(PDO $pdo, int $userId, int $topicId): array
{
    $stmt = $pdo->prepare(
        'SELECT content_type, content_id FROM learning_events
         WHERE user_id = ? AND topic_id = ? AND event_type = \'content_complete\''
    );
    $stmt->execute([$userId, $topicId]);
    $map = [];
    foreach ($stmt->fetchAll() ?: [] as $r) {
        $ct = (string) $r['content_type'];
        $map[$ct][] = (string) $r['content_id'];
    }
    return $map;
}

/**
 * @param array<string, mixed> $body
 * @return array{ok:bool,error?:string}
 */
function la_save_goal(PDO $pdo, int $userId, array $body): array
{
    $goalType = ($body['goal_type'] ?? '') === 'weekly_items' ? 'weekly_items' : 'weekly_minutes';
    $target = max(1, min(9999, (int) ($body['target_value'] ?? 60)));
    $periodStart = (string) ($body['period_start'] ?? date('Y-m-d', strtotime('monday this week')));

    $pdo->prepare('DELETE FROM learning_goals WHERE user_id = ? AND period_start = ?')->execute([$userId, $periodStart]);
    $pdo->prepare('INSERT INTO learning_goals (user_id, goal_type, target_value, period_start) VALUES (?, ?, ?, ?)')
        ->execute([$userId, $goalType, $target, $periodStart]);
    return ['ok' => true];
}

/**
 * @return array<string, mixed>|null
 */
function la_current_goal(PDO $pdo, int $userId): ?array
{
    $periodStart = date('Y-m-d', strtotime('monday this week'));
    $stmt = $pdo->prepare('SELECT * FROM learning_goals WHERE user_id = ? AND period_start = ? LIMIT 1');
    $stmt->execute([$userId, $periodStart]);
    $row = $stmt->fetch();
    return $row ?: null;
}
