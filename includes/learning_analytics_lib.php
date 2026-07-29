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

/**
 * @return array{current_streak_days:int,best_streak_days:int}
 */
function la_user_streak(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT DATE(created_at) AS d
         FROM learning_events
         WHERE user_id = ?
           AND event_type IN (\'content_open\', \'content_complete\')
         GROUP BY DATE(created_at)
         ORDER BY d ASC'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll() ?: [];

    $dates = array_values(array_map(static function (array $r): string {
        return (string) ($r['d'] ?? '');
    }, $rows));
    $dates = array_values(array_filter($dates, static fn (string $d): bool => $d !== ''));

    if ($dates === []) {
        return ['current_streak_days' => 0, 'best_streak_days' => 0];
    }

    $today = (string) ($pdo->query('SELECT CURDATE()')->fetchColumn() ?: '');
    if ($today === '') {
        $today = date('Y-m-d');
    }

    // Current streak: walk backwards from today while there is activity.
    $set = array_fill_keys($dates, true);
    $current = 0;
    $cursor = new DateTime($today);
    while (true) {
        $key = $cursor->format('Y-m-d');
        if (!isset($set[$key])) {
            break;
        }
        $current++;
        $cursor->modify('-1 day');
    }

    // Best streak: scan consecutive runs.
    $best = 1;
    $run = 1;
    $prev = $dates[0];
    for ($i = 1; $i < count($dates); $i++) {
        $cur = $dates[$i];
        $prevDt = new DateTime($prev);
        $prevDt->modify('+1 day');
        if ($cur === $prevDt->format('Y-m-d')) {
            $run++;
        } else {
            $run = 1;
        }
        $best = max($best, $run);
        $prev = $cur;
    }

    return [
        'current_streak_days' => (int) $current,
        'best_streak_days' => (int) $best,
    ];
}

/**
 * @return list<array{badge_id:string,label_zh:string,label_en:string,reason_zh?:string,reason_en?:string}>
 */
function la_user_badges(PDO $pdo, int $userId): array
{
    // Note: la_current_goal() lives in learning_assessment_lib.php but is required by api handler.
    $completionsStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM learning_events
         WHERE user_id = ? AND event_type = \'content_complete\''
    );
    $completionsStmt->execute([$userId]);
    $totalCompletions = (int) ($completionsStmt->fetchColumn() ?: 0);

    $streak = la_user_streak($pdo, $userId);
    $bestStreak = (int) ($streak['best_streak_days'] ?? 0);

    $bookmarkStmt = $pdo->prepare('SELECT COUNT(*) FROM content_bookmarks WHERE user_id = ?');
    $bookmarkStmt->execute([$userId]);
    $bookmarkCount = (int) ($bookmarkStmt->fetchColumn() ?: 0);

    $masteredStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM topic_mastery
         WHERE user_id = ? AND mastery_score >= 80'
    );
    $masteredStmt->execute([$userId]);
    $masteredTopicCount = (int) ($masteredStmt->fetchColumn() ?: 0);

    $goal = function () use ($pdo, $userId): ?array {
        return function_exists('la_current_goal') ? la_current_goal($pdo, $userId) : null;
    };
    $goalRow = $goal();

    $goalMet = false;
    if ($goalRow) {
        $periodStart = (string) ($goalRow['period_start'] ?? '');
        if ($periodStart !== '') {
            if (($goalRow['goal_type'] ?? '') === 'weekly_minutes') {
                $stmt = $pdo->prepare(
                    'SELECT COALESCE(SUM(duration_seconds), 0) AS secs
                     FROM learning_events
                     WHERE user_id = ?
                       AND created_at >= ?
                       AND created_at < DATE_ADD(?, INTERVAL 7 DAY)'
                );
                $stmt->execute([$userId, $periodStart, $periodStart]);
                $mins = (int) round(((int) ($stmt->fetchColumn() ?: 0)) / 60);
                $goalMet = $mins >= (int) ($goalRow['target_value'] ?? 0);
            } elseif (($goalRow['goal_type'] ?? '') === 'weekly_items') {
                $stmt = $pdo->prepare(
                    'SELECT COALESCE(COUNT(DISTINCT CONCAT_WS(\'|\', content_type, content_id)), 0) AS items_done
                     FROM learning_events
                     WHERE user_id = ?
                       AND event_type = \'content_complete\'
                       AND content_type IS NOT NULL AND content_id IS NOT NULL
                       AND created_at >= ?
                       AND created_at < DATE_ADD(?, INTERVAL 7 DAY)'
                );
                $stmt->execute([$userId, $periodStart, $periodStart]);
                $itemsDone = (int) ($stmt->fetchColumn() ?: 0);
                $goalMet = $itemsDone >= (int) ($goalRow['target_value'] ?? 0);
            }
        }
    }

    $out = [];

    if ($totalCompletions >= 1) {
        $out[] = [
            'badge_id' => 'first_completion',
            'label_zh' => '完成第一項',
            'label_en' => 'First completion',
            'reason_zh' => '你已完成至少一個內容。',
            'reason_en' => 'You have completed at least one learning item.',
        ];
    }

    foreach ([3, 7, 14] as $n) {
        if ($bestStreak >= $n) {
            $out[] = [
                'badge_id' => 'streak_' . $n,
                'label_zh' => $n . ' 天連續學習',
                'label_en' => $n . '-day streak',
                'reason_zh' => '最佳連續學習達標。',
                'reason_en' => 'Your best streak meets the target.',
            ];
        }
    }

    if ($goalMet) {
        $out[] = [
            'badge_id' => 'weekly_goal_met',
            'label_zh' => '本週目標達成',
            'label_en' => 'Weekly goal met',
            'reason_zh' => '你已達到本週學習目標。',
            'reason_en' => 'You have met your weekly learning goal.',
        ];
    }

    if ($masteredTopicCount >= 1) {
        $out[] = [
            'badge_id' => 'topic_mastered',
            'label_zh' => '掌握一個課題',
            'label_en' => 'Mastered a topic',
            'reason_zh' => '你至少掌握一個課題（≥80%）。',
            'reason_en' => 'You have mastered at least one topic (≥80%).',
        ];
    }

    if ($bookmarkCount >= 1) {
        $out[] = [
            'badge_id' => 'first_bookmark',
            'label_zh' => '已收藏內容',
            'label_en' => 'First bookmark',
            'reason_zh' => '你已收藏至少一項內容。',
            'reason_en' => 'You have bookmarked at least one item.',
        ];
    }

    return $out;
}

/**
 * @return list<array{content_type:string,content_slug:string,title_zh:string,title_en:string,route:string,created_at:string}>
 */
function la_user_bookmarks(PDO $pdo, int $userId, int $limit = 12): array
{
    $limit = max(1, min(50, $limit));
    $stmt = $pdo->prepare(
        'SELECT content_type, content_slug, created_at
         FROM content_bookmarks
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $r) {
        $ctype = (string) ($r['content_type'] ?? '');
        $slug = (string) ($r['content_slug'] ?? '');
        if ($ctype === '' || $slug === '') {
            continue;
        }
        $resolved = la_resolve_content_item($pdo, $ctype, $slug);
        if (!$resolved) {
            continue;
        }
        $out[] = [
            'content_type' => $ctype,
            'content_slug' => $slug,
            'title_zh' => (string) ($resolved['title_zh'] ?? ''),
            'title_en' => (string) ($resolved['title_en'] ?? ''),
            'route' => (string) ($resolved['route'] ?? ''),
            'created_at' => (string) ($r['created_at'] ?? ''),
        ];
    }

    return $out;
}

/**
 * Class-level streak / badge summary for teacher reports.
 *
 * @param list<array<string, mixed>>|null $students Optional preloaded student rows with user_id + display_name
 * @return array<string, mixed>
 */
function la_class_achievements_summary(PDO $pdo, int $classId, ?array $students = null, int $maxStudents = 80): array
{
    if ($students === null) {
        require_once __DIR__ . '/classes_lib.php';
        $students = classes_students_in_class($pdo, $classId);
    }

    $maxStudents = max(1, min(200, $maxStudents));
    $slice = array_slice($students, 0, $maxStudents);

    $streakSum = 0;
    $streakCount = 0;
    $ge3 = 0;
    $badgeCounts = [];
    $topStreaks = [];

    foreach ($slice as $s) {
        $uid = (int) ($s['user_id'] ?? $s['id'] ?? 0);
        if ($uid <= 0) {
            continue;
        }
        $display = (string) ($s['display_name'] ?? '');
        $streak = la_user_streak($pdo, $uid);
        $cur = (int) ($streak['current_streak_days'] ?? 0);
        $streakSum += $cur;
        $streakCount++;
        if ($cur >= 3) {
            $ge3++;
        }
        $topStreaks[] = [
            'user_id' => $uid,
            'display_name' => $display,
            'current_streak_days' => $cur,
            'best_streak_days' => (int) ($streak['best_streak_days'] ?? 0),
        ];

        foreach (la_user_badges($pdo, $uid) as $b) {
            $bid = (string) ($b['badge_id'] ?? '');
            if ($bid === '') {
                continue;
            }
            if (!isset($badgeCounts[$bid])) {
                $badgeCounts[$bid] = [
                    'badge_id' => $bid,
                    'label_zh' => (string) ($b['label_zh'] ?? $bid),
                    'label_en' => (string) ($b['label_en'] ?? $bid),
                    'count' => 0,
                ];
            }
            $badgeCounts[$bid]['count']++;
        }
    }

    usort($topStreaks, static function (array $a, array $b): int {
        $ac = (int) ($a['current_streak_days'] ?? 0);
        $bc = (int) ($b['current_streak_days'] ?? 0);
        if ($bc !== $ac) {
            return $bc <=> $ac;
        }
        return ((int) ($b['best_streak_days'] ?? 0)) <=> ((int) ($a['best_streak_days'] ?? 0));
    });

    $badgeList = array_values($badgeCounts);
    usort($badgeList, static fn (array $a, array $b): int => ((int) $b['count']) <=> ((int) $a['count']));

    return [
        'students_sampled' => $streakCount,
        'avg_current_streak' => $streakCount > 0 ? round($streakSum / $streakCount, 1) : 0,
        'students_with_streak_ge_3' => $ge3,
        'badge_unlock_counts' => array_slice($badgeList, 0, 8),
        'top_streaks' => array_slice($topStreaks, 0, 3),
    ];
}
