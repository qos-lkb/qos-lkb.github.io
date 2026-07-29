<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/learning_analytics_lib.php';
require_once dirname(__DIR__, 3) . '/includes/learning_assessment_lib.php';
require_once dirname(__DIR__, 3) . '/includes/adaptive_lib.php';
require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';
require_once dirname(__DIR__, 3) . '/includes/worksheet_assignments_lib.php';
require_once dirname(__DIR__, 3) . '/includes/worksheet_permissions_lib.php';

function api_handle_learning_events(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $events = $body['events'] ?? [];
    if (!is_array($events)) {
        api_json_error('validation_error', 'events 必須為陣列。', 422);
    }
    $r = la_insert_events($pdo, $user['id'], $events);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '寫入失敗。', 422);
    }
    api_json_ok(['inserted' => $r['inserted'] ?? 0]);
}

function api_handle_learning_events_summary(PDO $pdo): void
{
    $user = require_api_user();
    $days = isset($_GET['days']) ? (int) $_GET['days'] : 7;
    api_json_ok(la_user_summary($pdo, $user['id'], $days));
}

function api_handle_learning_attempts_post(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $r = la_submit_attempt($pdo, $user['id'], $body);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '提交失敗。', 422);
    }
    api_json_ok([
        'attempt_id' => $r['attempt_id'],
        'score' => $r['score'],
        'max_score' => $r['max_score'],
    ]);
}

function api_handle_learning_attempts_list(PDO $pdo): void
{
    $user = require_api_user();
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
    api_json_ok(['attempts' => la_user_attempts($pdo, $user['id'], $limit)]);
}

function api_handle_learning_mastery(PDO $pdo): void
{
    $user = require_api_user();
    $subjectId = isset($_GET['subject_id']) && $_GET['subject_id'] !== '' ? (int) $_GET['subject_id'] : null;
    $rows = la_user_mastery($pdo, $user['id'], $subjectId);
    api_json_ok([
        'mastery' => array_map(static function (array $m): array {
            $score = (float) $m['mastery_score'];
            $status = 'in_progress';
            if ($score < 60) {
                $status = 'weak';
            } elseif ($score > 80) {
                $status = 'mastered';
            }
            return [
                'topic_id' => (int) $m['topic_id'],
                'topic_slug' => (string) ($m['topic_slug'] ?? ''),
                'subject_slug' => (string) ($m['subject_slug'] ?? ''),
                'name_zh' => (string) ($m['name_zh'] ?? ''),
                'name_en' => (string) ($m['name_en'] ?? ''),
                'mastery_score' => $score,
                'status' => $status,
                'attempt_count' => (int) $m['attempt_count'],
                'last_attempt_at' => $m['last_attempt_at'],
            ];
        }, $rows),
    ]);
}

function api_handle_learning_progress(PDO $pdo): void
{
    $user = require_api_user();
    $topicId = isset($_GET['topic_id']) ? (int) $_GET['topic_id'] : 0;
    if ($topicId <= 0) {
        api_json_error('validation_error', '請提供 topic_id。', 422);
    }
    api_json_ok(['completed' => la_content_completion_map($pdo, $user['id'], $topicId)]);
}

function api_handle_learning_dashboard(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $summary = la_user_summary($pdo, $user['id']);
    $goal = la_current_goal($pdo, $user['id']);
    $recommendations = adaptive_recommendations($pdo, $user['id']);
    $streak = la_user_streak($pdo, $user['id']);
    $badges = la_user_badges($pdo, $user['id']);
    $bookmarks = la_user_bookmarks($pdo, $user['id'], 8);

    $worksheetAssignments = [];
    if (worksheet_user_can_submit()) {
        foreach (wa_list_for_student($pdo, $user['id']) as $row) {
            $subStatus = (string) ($row['submission_status'] ?? 'pending');
            if ($subStatus === 'graded') {
                continue;
            }
            $worksheetAssignments[] = [
                'id' => (int) $row['id'],
                'title_zh' => $row['title_zh'] ?: $row['worksheet_title_zh'],
                'title_en' => $row['title_en'] ?: $row['worksheet_title_en'],
                'class_name' => $row['class_name'],
                'due_at' => $row['due_at'],
                'submission_status' => $subStatus,
                'route' => '/assignment/' . (int) $row['id'],
            ];
            if (count($worksheetAssignments) >= 6) {
                break;
            }
        }
    }

    api_json_ok([
        'summary' => $summary,
        'continue_learning' => la_continue_learning($pdo, $user['id']),
        'mastery' => la_user_mastery($pdo, $user['id']),
        'goal' => $goal ? [
            'goal_type' => (string) $goal['goal_type'],
            'target_value' => (int) $goal['target_value'],
            'period_start' => (string) $goal['period_start'],
        ] : null,
        'recommendations' => $recommendations,
        'streak' => $streak,
        'badges' => $badges,
        'bookmarks' => $bookmarks,
        'recent_attempts' => la_user_attempts($pdo, $user['id'], 5),
        'worksheet_assignments' => $worksheetAssignments,
    ]);
}

function api_handle_learning_goals_post(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $r = la_save_goal($pdo, $user['id'], $body);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
    }
    api_json_ok(['goal' => la_current_goal($pdo, $user['id'])]);
}

function api_handle_learning_recommendations(PDO $pdo): void
{
    $user = require_api_user();
    api_json_ok(adaptive_recommendations($pdo, $user['id']));
}

function api_handle_learning_adaptive_quiz(PDO $pdo): void
{
    $user = require_api_user();
    $topicId = isset($_GET['topic_id']) ? (int) $_GET['topic_id'] : 0;
    if ($topicId <= 0) {
        api_json_error('validation_error', '請提供 topic_id。', 422);
    }
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 5;
    $r = adaptive_quiz_for_topic($pdo, $user['id'], $topicId, $limit);
    if (!$r['ok']) {
        api_json_error('not_found', $r['error'] ?? '無法產生測驗。', 404);
    }
    api_json_ok($r);
}

function api_handle_learning_class_leaderboard(PDO $pdo): void
{
    $user = require_api_user();
    $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0;
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 5;

    if ($classId <= 0) {
        api_json_error('validation_error', '請提供 class_id。', 422);
    }
    $limit = max(1, min(10, $limit));

    $enrollStmt = $pdo->prepare(
        'SELECT 1 FROM class_enrollments
         WHERE class_id = ? AND user_id = ? AND status IN (\'active\', \'pending\')
         LIMIT 1'
    );
    $enrollStmt->execute([$classId, (int) $user['id']]);
    if ($enrollStmt->fetchColumn() === false) {
        api_json_error('forbidden', '你不是此班學生。', 403);
    }

    $students = adaptive_class_student_reports($pdo, $classId);

    $sortedByMastery = $students;
    usort($sortedByMastery, static function (array $a, array $b): int {
        $am = (float) ($a['avg_mastery'] ?? 0);
        $bm = (float) ($b['avg_mastery'] ?? 0);
        if ($bm < $am) return -1;
        if ($bm > $am) return 1;

        $at = (int) ($a['minutes_week'] ?? 0);
        $bt = (int) ($b['minutes_week'] ?? 0);
        if ($bt < $at) return -1;
        if ($bt > $at) return 1;

        return ((int) ($a['user_id'] ?? 0)) <=> ((int) ($b['user_id'] ?? 0));
    });

    $leaders = array_slice($sortedByMastery, 0, $limit);

    $myRank = null;
    foreach ($sortedByMastery as $idx => $s) {
        if ((int) ($s['user_id'] ?? 0) === (int) $user['id']) {
            $myRank = $idx + 1;
            break;
        }
    }

    $challengeSorted = $students;
    usort($challengeSorted, static function (array $a, array $b): int {
        $at = (int) ($a['minutes_week'] ?? 0);
        $bt = (int) ($b['minutes_week'] ?? 0);
        if ($bt < $at) return -1;
        if ($bt > $at) return 1;
        return ((int) ($a['user_id'] ?? 0)) <=> ((int) ($b['user_id'] ?? 0));
    });
    $weeklyChampion = $challengeSorted[0] ?? null;

    api_json_ok([
        'class_id' => $classId,
        'leaders' => $leaders,
        'weekly_champion' => $weeklyChampion ? [
            'user_id' => (int) ($weeklyChampion['user_id'] ?? 0),
            'display_name' => (string) ($weeklyChampion['display_name'] ?? ''),
            'minutes_week' => (int) ($weeklyChampion['minutes_week'] ?? 0),
        ] : null,
        'my_rank' => $myRank,
    ]);
}

function api_handle_learning_streak(PDO $pdo): void
{
    $user = require_api_user();
    api_json_ok(la_user_streak($pdo, $user['id']));
}

function api_handle_learning_badges(PDO $pdo): void
{
    $user = require_api_user();
    api_json_ok(['badges' => la_user_badges($pdo, $user['id'])]);
}

function api_handle_learning_bookmarks_list(PDO $pdo): void
{
    $user = require_api_user();
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 12;
    api_json_ok(['bookmarks' => la_user_bookmarks($pdo, $user['id'], $limit)]);
}

function api_handle_learning_bookmarks_toggle(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();

    $contentType = (string) ($body['content_type'] ?? '');
    $contentSlug = (string) ($body['content_slug'] ?? '');
    $action = (string) ($body['action'] ?? 'toggle');

    $allowedTypes = ['note', 'worksheet', 'article', 'learning_tool', 'question_bank', 'video', 'simulation'];
    if (!in_array($contentType, $allowedTypes, true)) {
        api_json_error('validation_error', '無效的內容類型。', 422);
    }
    if (trim($contentSlug) === '') {
        api_json_error('validation_error', '請提供內容 slug。', 422);
    }

    // Only allow bookmarking published content.
    $resolved = la_resolve_content_item($pdo, $contentType, $contentSlug);
    if ($resolved === null) {
        api_json_error('not_found', '找不到此內容。', 404);
    }

    $existsStmt = $pdo->prepare(
        'SELECT 1 FROM content_bookmarks WHERE user_id = ? AND content_type = ? AND content_slug = ? LIMIT 1'
    );
    $existsStmt->execute([$user['id'], $contentType, $contentSlug]);
    $exists = (bool) ($existsStmt->fetchColumn() !== false);

    if ($action === 'remove' || ($action === 'toggle' && $exists)) {
        $del = $pdo->prepare('DELETE FROM content_bookmarks WHERE user_id = ? AND content_type = ? AND content_slug = ?');
        $del->execute([$user['id'], $contentType, $contentSlug]);
        api_json_ok(['bookmarked' => false]);
        return;
    }

    if ($action === 'add' || $action === 'toggle') {
        if (!$exists) {
            $ins = $pdo->prepare(
                'INSERT INTO content_bookmarks (user_id, content_type, content_slug) VALUES (?, ?, ?)'
            );
            try {
                $ins->execute([$user['id'], $contentType, $contentSlug]);
            } catch (Throwable $e) {
                // Unique collision can happen during race; treat as "already exists".
            }
        }
        api_json_ok(['bookmarked' => true]);
        return;
    }

    api_json_error('validation_error', '無效的 action。', 422);
}
