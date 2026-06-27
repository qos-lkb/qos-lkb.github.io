<?php

declare(strict_types=1);

require_once __DIR__ . '/learning_assessment_lib.php';
require_once __DIR__ . '/learning_analytics_lib.php';
require_once __DIR__ . '/classes_lib.php';
require_once __DIR__ . '/topic_items_lib.php';

/**
 * @return array<string, mixed>
 */
function adaptive_recommendations(PDO $pdo, int $userId): array
{
    $masteryRows = la_user_mastery($pdo, $userId);
    $weakTopics = [];
    foreach ($masteryRows as $m) {
        $score = (float) $m['mastery_score'];
        if ($score < 60 && (int) $m['attempt_count'] >= 1) {
            $topicId = (int) $m['topic_id'];
            $weakTopics[] = [
                'topic_id' => $topicId,
                'topic_slug' => (string) $m['topic_slug'],
                'subject_slug' => (string) $m['subject_slug'],
                'name_zh' => (string) $m['name_zh'],
                'name_en' => (string) $m['name_en'],
                'mastery' => $score,
                'suggested_items' => adaptive_suggested_items_for_topic($pdo, $topicId),
            ];
        }
    }

    $reviewQuestions = adaptive_review_questions($pdo, $userId);
    $nextCourseItem = adaptive_next_course_item($pdo, $userId);

    return [
        'weak_topics' => array_slice($weakTopics, 0, 5),
        'review_questions' => $reviewQuestions,
        'next_course_item' => $nextCourseItem,
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function adaptive_suggested_items_for_topic(PDO $pdo, int $topicId): array
{
    $items = [];
    try {
        $topicItems = ti_fetch_for_topic($pdo, $topicId);
    } catch (Throwable $e) {
        $topicItems = [];
    }

    $priority = ['note' => 1, 'learning_tool' => 2, 'simulation' => 3, 'worksheet' => 4, 'article' => 5, 'video' => 6];
    usort($topicItems, static function (array $a, array $b) use ($priority): int {
        $pa = $priority[$a['content_type'] ?? ''] ?? 99;
        $pb = $priority[$b['content_type'] ?? ''] ?? 99;
        return $pa <=> $pb;
    });

    foreach (array_slice($topicItems, 0, 3) as $item) {
        $slug = (string) ($item['slug'] ?? '');
        if ($slug === '') {
            continue;
        }
        $ctype = (string) $item['content_type'];
        $routeMap = [
            'note' => '/note/',
            'worksheet' => '/worksheet/',
            'article' => '/article/',
            'learning_tool' => '/quiz/',
            'video' => '/video/',
            'simulation' => '/simulation/',
        ];
        $prefix = $routeMap[$ctype] ?? null;
        if ($prefix === null) {
            continue;
        }
        $items[] = [
            'content_type' => $ctype,
            'slug' => $slug,
            'title_zh' => (string) ($item['title_zh'] ?? ''),
            'title_en' => (string) ($item['title_en'] ?? ''),
            'route' => $prefix . rawurlencode($slug),
        ];
    }
    return $items;
}

/**
 * @return list<array<string, mixed>>
 */
function adaptive_review_questions(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT lr.question_id, lr.attempt_id, la.submitted_at AS last_wrong_at, la.source_type, la.source_id, la.topic_id
         FROM learning_responses lr
         INNER JOIN learning_attempts la ON la.id = lr.attempt_id
         WHERE la.user_id = ? AND lr.is_correct = 0
           AND la.submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY la.submitted_at DESC
         LIMIT 20'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll() ?: [];
    $seen = [];
    $out = [];
    foreach ($rows as $r) {
        $qid = (int) $r['question_id'];
        if (isset($seen[$qid])) {
            continue;
        }
        $seen[$qid] = true;
        $out[] = [
            'question_id' => $qid,
            'source_type' => (string) $r['source_type'],
            'source_id' => (int) $r['source_id'],
            'topic_id' => $r['topic_id'] !== null ? (int) $r['topic_id'] : null,
            'last_wrong_at' => (string) $r['last_wrong_at'],
        ];
    }
    return $out;
}

/**
 * @return array<string, mixed>|null
 */
function adaptive_next_course_item(PDO $pdo, int $userId): ?array
{
    $subjects = $pdo->query('SELECT id, slug FROM subjects ORDER BY sort_order, id')->fetchAll() ?: [];
    foreach ($subjects as $sub) {
        $topics = $pdo->prepare('SELECT id, slug FROM topics WHERE subject_id = ? ORDER BY sort_order, id');
        $topics->execute([(int) $sub['id']]);
        foreach ($topics->fetchAll() ?: [] as $topic) {
            $topicId = (int) $topic['id'];
            try {
                $items = ti_fetch_for_topic($pdo, $topicId);
            } catch (Throwable $e) {
                continue;
            }
            $completion = la_content_completion_map($pdo, $userId, $topicId);
            foreach ($items as $item) {
                $ctype = (string) $item['content_type'];
                $slug = (string) ($item['slug'] ?? '');
                if ($slug === '') {
                    continue;
                }
                $done = in_array($slug, $completion[$ctype] ?? [], true);
                if (!$done) {
                    $routeMap = [
                        'note' => '/note/',
                        'worksheet' => '/worksheet/',
                        'article' => '/article/',
                        'learning_tool' => '/quiz/',
                        'video' => '/video/',
                        'simulation' => '/simulation/',
                    ];
                    $prefix = $routeMap[$ctype] ?? null;
                    if ($prefix === null) {
                        continue;
                    }
                    return [
                        'content_type' => $ctype,
                        'slug' => $slug,
                        'title_zh' => (string) ($item['title_zh'] ?? ''),
                        'title_en' => (string) ($item['title_en'] ?? ''),
                        'route' => $prefix . rawurlencode($slug),
                        'subject_slug' => (string) $sub['slug'],
                        'topic_slug' => (string) $topic['slug'],
                        'reason' => 'continue_path',
                    ];
                }
            }
        }
    }
    return null;
}

/**
 * @return array{ok:bool,error?:string,questions?:list<array<string,mixed>>,source?:array<string,mixed>}
 */
function adaptive_quiz_for_topic(PDO $pdo, int $userId, int $topicId, int $limit = 5): array
{
    $limit = max(1, min(20, $limit));
    $wrongStmt = $pdo->prepare(
        'SELECT lr.question_id, la.source_type, la.source_id
         FROM learning_responses lr
         INNER JOIN learning_attempts la ON la.id = lr.attempt_id
         WHERE la.user_id = ? AND la.topic_id = ? AND lr.is_correct = 0
         ORDER BY la.submitted_at DESC
         LIMIT ?'
    );
    $wrongStmt->bindValue(1, $userId, PDO::PARAM_INT);
    $wrongStmt->bindValue(2, $topicId, PDO::PARAM_INT);
    $wrongStmt->bindValue(3, $limit, PDO::PARAM_INT);
    $wrongStmt->execute();
    $wrongRows = $wrongStmt->fetchAll() ?: [];

    if ($wrongRows !== []) {
        return [
            'ok' => true,
            'mode' => 'review_wrong',
            'question_refs' => array_map(static function (array $r): array {
                return [
                    'question_id' => (int) $r['question_id'],
                    'source_type' => (string) $r['source_type'],
                    'source_id' => (int) $r['source_id'],
                ];
            }, $wrongRows),
        ];
    }

    $toolStmt = $pdo->prepare(
        'SELECT id, slug, title_zh, title_en FROM learning_tools
         WHERE topic_id = ? AND status = \'published\' ORDER BY list_sort_order LIMIT 1'
    );
    $toolStmt->execute([$topicId]);
    $tool = $toolStmt->fetch();
    if ($tool) {
        return [
            'ok' => true,
            'mode' => 'learning_tool',
            'source' => [
                'source_type' => 'learning_tool',
                'source_id' => (int) $tool['id'],
                'slug' => (string) $tool['slug'],
                'title_zh' => (string) $tool['title_zh'],
                'title_en' => (string) $tool['title_en'],
                'route' => '/quiz/' . rawurlencode((string) $tool['slug']),
            ],
        ];
    }

    return ['ok' => false, 'error' => '此課題暫無適性測驗內容。'];
}

/**
 * @return list<array<string, mixed>>
 */
function adaptive_class_weak_topics(PDO $pdo, int $classId, int $limit = 5): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id AS topic_id, t.name_zh, t.name_en, AVG(tm.mastery_score) AS avg_mastery, COUNT(DISTINCT tm.user_id) AS student_count
         FROM topic_mastery tm
         INNER JOIN class_enrollments ce ON ce.user_id = tm.user_id AND ce.class_id = ? AND ce.status = \'active\'
         INNER JOIN topics t ON t.id = tm.topic_id
         GROUP BY t.id, t.name_zh, t.name_en
         HAVING avg_mastery < 60
         ORDER BY avg_mastery ASC
         LIMIT ?'
    );
    $stmt->bindValue(1, $classId, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return array_map(static function (array $r): array {
        return [
            'topic_id' => (int) $r['topic_id'],
            'name_zh' => (string) $r['name_zh'],
            'name_en' => (string) $r['name_en'],
            'avg_mastery' => round((float) $r['avg_mastery'], 1),
            'student_count' => (int) $r['student_count'],
        ];
    }, $stmt->fetchAll() ?: []);
}

/**
 * @return list<array<string, mixed>>
 */
function adaptive_class_student_reports(PDO $pdo, int $classId): array
{
    $students = classes_students_in_class($pdo, $classId);
    $out = [];
    foreach ($students as $s) {
        $uid = (int) $s['id'];
        $mastery = la_user_mastery($pdo, $uid);
        $avg = 0.0;
        if ($mastery !== []) {
            $avg = array_sum(array_column($mastery, 'mastery_score')) / count($mastery);
        }
        $lastEvent = $pdo->prepare('SELECT MAX(created_at) FROM learning_events WHERE user_id = ?');
        $lastEvent->execute([$uid]);
        $lastAt = $lastEvent->fetchColumn();

        $lastAttempt = $pdo->prepare(
            'SELECT score, max_score, submitted_at FROM learning_attempts WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1'
        );
        $lastAttempt->execute([$uid]);
        $attempt = $lastAttempt->fetch();

        $weekStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(duration_seconds), 0) FROM learning_events
             WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
        );
        $weekStmt->execute([$uid]);
        $weekSecs = (int) ($weekStmt->fetchColumn() ?: 0);

        $out[] = [
            'user_id' => $uid,
            'display_name' => (string) $s['display_name'],
            'email' => (string) $s['email'],
            'form_class' => isset($s['form_class']) && $s['form_class'] !== null && $s['form_class'] !== ''
                ? (string) $s['form_class'] : null,
            'class_no' => isset($s['class_no']) && $s['class_no'] !== null && $s['class_no'] !== ''
                ? (int) $s['class_no'] : null,
            'moi' => classes_normalize_moi($s['moi'] ?? null),
            'avg_mastery' => round($avg, 1),
            'topic_count' => count($mastery),
            'last_active_at' => $lastAt ? (string) $lastAt : null,
            'minutes_week' => (int) round($weekSecs / 60),
            'last_attempt' => $attempt ? [
                'score' => (int) $attempt['score'],
                'max_score' => (int) $attempt['max_score'],
                'submitted_at' => (string) $attempt['submitted_at'],
            ] : null,
        ];
    }
    return $out;
}

/**
 * @return array<string, mixed>
 */
function adaptive_student_detail(PDO $pdo, int $userId): array
{
    return [
        'mastery' => la_user_mastery($pdo, $userId),
        'attempts' => la_user_attempts($pdo, $userId, 10),
        'summary' => la_user_summary($pdo, $userId),
        'continue_learning' => la_continue_learning($pdo, $userId, 5),
    ];
}
