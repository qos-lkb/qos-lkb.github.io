<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
require_once dirname(__DIR__, 3) . '/includes/explanation_lib.php';
require_once dirname(__DIR__, 3) . '/includes/config.php';

function api_handle_explanation_catalog(PDO $pdo): void
{
    $stats = [];
    try {
        explanation_ensure_schema($pdo);
        $user = current_user();
        if ($user !== null) {
            $stats = explanation_user_stats($pdo, (int) $user['id']);
        }
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取口述解釋。', 500);
    }

    api_json_ok(explanation_catalog_payload(config_xai_api_key() !== '', $stats));
}

function api_handle_explanation_attempt(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    if (config_xai_api_key() === '') {
        api_json_error('xai_unconfigured', '尚未設定 XAI_API_KEY，暫時不能評分。', 503);
    }
    $questionKey = trim((string) ($_POST['question_key'] ?? ''));
    $question = explanation_question($questionKey);
    if ($question === null) {
        api_json_error('validation_error', '找不到這條科學問題。', 422);
    }
    $audio = explanation_audio_upload();
    if (!$audio['ok']) {
        api_json_error('validation_error', $audio['error'], $audio['status']);
    }
    $limitKey = api_rate_limit_key('explanation', (string) $user['id']);
    try {
        explanation_ensure_schema($pdo);
        if (!api_rate_limit_check($pdo, $limitKey, 10, 600)) {
            api_json_error('rate_limited', '評分次數太多，請稍後再試。', 429);
        }
    } catch (PDOException $e) {
        api_json_error('db_error', '無法開始評分。', 500);
    }

    $scored = explanation_score_audio($question, $audio);
    if (!$scored['ok']) {
        api_json_error('explanation_failed', $scored['error'], $scored['status']);
    }
    try {
        $stats = explanation_save_attempt(
            $pdo,
            (int) $user['id'],
            $question['key'],
            $scored['transcript'],
            $scored['score'],
            $scored['feedback_zh'],
            $scored['feedback_en']
        );
    } catch (PDOException $e) {
        api_json_error('db_error', '分數未能儲存，請再試一次。', 500);
    }

    api_json_ok([
        'question_key' => $question['key'],
        'transcript' => $scored['transcript'],
        'score' => $scored['score'],
        'feedback_zh' => $scored['feedback_zh'],
        'feedback_en' => $scored['feedback_en'],
        'key_points_zh' => $scored['key_points_zh'],
        'key_points_en' => $scored['key_points_en'],
        'best_score' => $stats['best_score'],
        'attempt_count' => $stats['attempt_count'],
    ]);
}
