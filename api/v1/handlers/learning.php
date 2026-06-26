<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/learning_analytics_lib.php';
require_once dirname(__DIR__, 3) . '/includes/learning_assessment_lib.php';
require_once dirname(__DIR__, 3) . '/includes/adaptive_lib.php';

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
    $summary = la_user_summary($pdo, $user['id']);
    $goal = la_current_goal($pdo, $user['id']);
    $recommendations = adaptive_recommendations($pdo, $user['id']);

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
        'recent_attempts' => la_user_attempts($pdo, $user['id'], 5),
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
