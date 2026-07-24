<?php

declare(strict_types=1);

const LA_MAX_EVENTS_BATCH = 50;

const LA_ALLOWED_EVENT_TYPES = [
    'page_view',
    'content_open',
    'content_complete',
    'simulation_open',
    'simulation_close',
    'course_topic_view',
];

const LA_ALLOWED_CONTENT_TYPES = [
    'note',
    'simulation',
    'worksheet',
    'article',
    'learning_tool',
    'video',
    'course',
    'page',
];

/**
 * @param list<array<string, mixed>> $events
 * @return array{ok:bool,error?:string,inserted?:int}
 */
function la_insert_events(PDO $pdo, int $userId, array $events): array
{
    if ($events === []) {
        return ['ok' => true, 'inserted' => 0];
    }
    if (count($events) > LA_MAX_EVENTS_BATCH) {
        return ['ok' => false, 'error' => '每次最多上傳 ' . LA_MAX_EVENTS_BATCH . ' 筆事件。'];
    }

    $ins = $pdo->prepare(
        'INSERT INTO learning_events (user_id, session_id, event_type, content_type, content_id, subject_id, topic_id, duration_seconds, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $inserted = 0;
    foreach ($events as $ev) {
        if (!is_array($ev)) {
            continue;
        }
        $eventType = (string) ($ev['event_type'] ?? '');
        if (!in_array($eventType, LA_ALLOWED_EVENT_TYPES, true)) {
            continue;
        }
        $contentType = isset($ev['content_type']) ? (string) $ev['content_type'] : null;
        if ($contentType !== null && $contentType !== '' && !in_array($contentType, LA_ALLOWED_CONTENT_TYPES, true)) {
            continue;
        }
        $sessionId = substr((string) ($ev['session_id'] ?? ''), 0, 64);
        $contentId = isset($ev['content_id']) ? substr((string) $ev['content_id'], 0, 190) : null;
        $subjectId = isset($ev['subject_id']) && $ev['subject_id'] !== '' ? (int) $ev['subject_id'] : null;
        $topicId = isset($ev['topic_id']) && $ev['topic_id'] !== '' ? (int) $ev['topic_id'] : null;
        $duration = isset($ev['duration_seconds']) ? (int) $ev['duration_seconds'] : null;
        if ($duration !== null && $duration < 0) {
            $duration = null;
        }
        $meta = $ev['metadata'] ?? null;
        $metaJson = null;
        if (is_array($meta) && $meta !== []) {
            $metaJson = json_encode($meta, JSON_UNESCAPED_UNICODE);
        }

        $ins->execute([
            $userId,
            $sessionId,
            $eventType,
            $contentType !== '' ? $contentType : null,
            $contentId !== '' ? $contentId : null,
            $subjectId,
            $topicId,
            $duration,
            $metaJson,
        ]);
        $inserted++;
    }

    return ['ok' => true, 'inserted' => $inserted];
}

/**
 * @return array{minutes_today:int,minutes_week:int,completions_today:int,top_topics:list<array<string,mixed>>}
 */
function la_user_summary(PDO $pdo, int $userId, int $days = 7): array
{
    $days = max(1, min(90, $days));

    $todayStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(duration_seconds), 0) AS secs,
                SUM(CASE WHEN event_type = \'content_complete\' THEN 1 ELSE 0 END) AS completions
         FROM learning_events
         WHERE user_id = ? AND DATE(created_at) = CURDATE()'
    );
    $todayStmt->execute([$userId]);
    $today = $todayStmt->fetch() ?: ['secs' => 0, 'completions' => 0];

    $weekStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(duration_seconds), 0) AS secs
         FROM learning_events
         WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)'
    );
    $weekStmt->execute([$userId, $days]);
    $weekSecs = (int) ($weekStmt->fetchColumn() ?: 0);

    $topicStmt = $pdo->prepare(
        'SELECT le.topic_id, t.name_zh, t.name_en, COUNT(*) AS cnt
         FROM learning_events le
         LEFT JOIN topics t ON t.id = le.topic_id
         WHERE le.user_id = ? AND le.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND le.topic_id IS NOT NULL
         GROUP BY le.topic_id, t.name_zh, t.name_en
         ORDER BY cnt DESC
         LIMIT 5'
    );
    $topicStmt->execute([$userId, $days]);
    $topTopics = $topicStmt->fetchAll() ?: [];

    return [
        'minutes_today' => (int) round(((int) $today['secs']) / 60),
        'minutes_week' => (int) round($weekSecs / 60),
        'completions_today' => (int) ($today['completions'] ?? 0),
        'top_topics' => array_map(static function (array $r): array {
            return [
                'topic_id' => (int) $r['topic_id'],
                'name_zh' => (string) ($r['name_zh'] ?? ''),
                'name_en' => (string) ($r['name_en'] ?? ''),
                'event_count' => (int) $r['cnt'],
            ];
        }, $topTopics),
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function la_continue_learning(PDO $pdo, int $userId, int $limit = 5): array
{
    $stmt = $pdo->prepare(
        'SELECT content_type, content_id, MAX(created_at) AS last_at
         FROM learning_events
         WHERE user_id = ? AND event_type = \'content_open\'
           AND content_type IS NOT NULL AND content_id IS NOT NULL
         GROUP BY content_type, content_id
         ORDER BY last_at DESC
         LIMIT ?'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit * 3, PDO::PARAM_INT);
    $stmt->execute();
    $opens = $stmt->fetchAll() ?: [];

    $out = [];
    foreach ($opens as $row) {
        $ctype = (string) $row['content_type'];
        $cid = (string) $row['content_id'];
        $done = $pdo->prepare(
            'SELECT 1 FROM learning_events
             WHERE user_id = ? AND content_type = ? AND content_id = ? AND event_type = \'content_complete\'
             LIMIT 1'
        );
        $done->execute([$userId, $ctype, $cid]);
        if ($done->fetch()) {
            continue;
        }
        $item = la_resolve_content_item($pdo, $ctype, $cid);
        if ($item !== null) {
            $out[] = $item;
        }
        if (count($out) >= $limit) {
            break;
        }
    }
    return $out;
}

/**
 * @return array<string, mixed>|null
 */
function la_resolve_content_item(PDO $pdo, string $contentType, string $contentId): ?array
{
    $slug = $contentId;
    $tables = [
        'note' => ['learning_notes', 'note'],
        'worksheet' => ['worksheets', 'worksheet'],
        'article' => ['science_articles', 'article'],
        'learning_tool' => ['learning_tools', 'quiz'],
        'question_bank' => ['question_banks', 'quiz'],
        'video' => ['learning_videos', 'video'],
        'simulation' => ['simulations', 'simulation'],
    ];
    if (!isset($tables[$contentType])) {
        return null;
    }
    [$table, $routePrefix] = $tables[$contentType];
    $stmt = $pdo->prepare("SELECT slug, title_zh, title_en FROM {$table} WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    return [
        'content_type' => $contentType,
        'slug' => (string) $row['slug'],
        'title_zh' => (string) $row['title_zh'],
        'title_en' => (string) $row['title_en'],
        'route' => '/' . $routePrefix . '/' . rawurlencode((string) $row['slug']),
    ];
}

/**
 * @return array<string, mixed>
 */
function la_class_activity_summary(PDO $pdo, int $classId, int $days = 7): array
{
    $days = max(1, min(90, $days));
    $stmt = $pdo->prepare(
        'SELECT COUNT(DISTINCT le.user_id) AS active_students,
                COALESCE(SUM(le.duration_seconds), 0) AS total_secs
         FROM learning_events le
         INNER JOIN class_enrollments ce ON ce.user_id = le.user_id AND ce.class_id = ? AND ce.status = \'active\'
         WHERE le.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)'
    );
    $stmt->execute([$classId, $days]);
    $row = $stmt->fetch() ?: ['active_students' => 0, 'total_secs' => 0];

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM class_enrollments WHERE class_id = ? AND status = \'active\'');
    $countStmt->execute([$classId]);
    $totalStudents = (int) ($countStmt->fetchColumn() ?: 0);

    $avgMastery = 0.0;
    $mStmt = $pdo->prepare(
        'SELECT AVG(tm.mastery_score) AS avg_m
         FROM topic_mastery tm
         INNER JOIN class_enrollments ce ON ce.user_id = tm.user_id AND ce.class_id = ? AND ce.status = \'active\''
    );
    $mStmt->execute([$classId]);
    $avgMastery = round((float) ($mStmt->fetchColumn() ?: 0), 1);

    return [
        'total_students' => $totalStudents,
        'active_students' => (int) ($row['active_students'] ?? 0),
        'minutes_week' => (int) round(((int) ($row['total_secs'] ?? 0)) / 60),
        'avg_mastery' => $avgMastery,
    ];
}
