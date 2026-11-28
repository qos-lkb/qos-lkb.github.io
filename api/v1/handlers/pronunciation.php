<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
require_once dirname(__DIR__, 3) . '/includes/pronunciation_lib.php';
require_once dirname(__DIR__, 3) . '/includes/config.php';

function api_handle_pronunciation_catalog(PDO $pdo): void
{
    $stats = [];
    try {
        pronunciation_ensure_schema($pdo);
        $user = current_user();
        if ($user !== null) {
            $stats = pronunciation_user_stats($pdo, (int) $user['id']);
        }
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取讀音練習。', 500);
    }

    api_json_ok(pronunciation_catalog_payload(config_xai_api_key() !== '', $stats));
}

function api_handle_pronunciation_attempt(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    if (config_xai_api_key() === '') {
        api_json_error('xai_unconfigured', '尚未設定 XAI_API_KEY，暫時不能評分。', 503);
    }
    $termKey = trim((string) ($_POST['term_key'] ?? ''));
    $term = pronunciation_term($termKey);
    if ($term === null) {
        api_json_error('validation_error', '找不到這個科學詞語。', 422);
    }
    $audio = pronunciation_audio_upload();
    if (!$audio['ok']) {
        api_json_error('validation_error', $audio['error'], $audio['status']);
    }
    $limitKey = api_rate_limit_key('pronunciation', (string) $user['id']);
    try {
        pronunciation_ensure_schema($pdo);
        if (!api_rate_limit_check($pdo, $limitKey, 20, 600)) {
            api_json_error('rate_limited', '評分次數太多，請稍後再試。', 429);
        }
    } catch (PDOException $e) {
        api_json_error('db_error', '無法開始評分。', 500);
    }

    $scored = pronunciation_score_audio($term, $audio);
    if (!$scored['ok']) {
        api_json_error('pronunciation_failed', $scored['error'], $scored['status']);
    }
    try {
        $stats = pronunciation_save_attempt(
            $pdo,
            (int) $user['id'],
            $term['key'],
            $scored['transcript'],
            $scored['score'],
            $scored['feedback_zh'],
            $scored['feedback_en']
        );
    } catch (PDOException $e) {
        api_json_error('db_error', '分數未能儲存，請再試一次。', 500);
    }

    api_json_ok([
        'term_key' => $term['key'],
        'transcript' => $scored['transcript'],
        'score' => $scored['score'],
        'feedback_zh' => $scored['feedback_zh'],
        'feedback_en' => $scored['feedback_en'],
        'best_score' => $stats['best_score'],
        'attempt_count' => $stats['attempt_count'],
    ]);
}
