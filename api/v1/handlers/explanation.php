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

    api_json_ok(explanation_catalog_payload($pdo, config_xai_api_key() !== '', $stats));
}

function api_handle_explanation_attempt(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    if (config_xai_api_key() === '') {
        api_json_error('xai_unconfigured', '尚未設定 XAI_API_KEY，暫時不能評分。', 503);
    }
    $questionKey = trim((string) ($_POST['question_key'] ?? ''));
    try {
        $question = explanation_question($pdo, $questionKey, true);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取題目。', 500);
    }
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
        $hasAudio = explanation_store_audio((int) $user['id'], $stats['id'], $audio['path'], $audio['filename']);
        if ($hasAudio) {
            explanation_mark_audio($pdo, $stats['id'], $audio['filename']);
        }
    } catch (PDOException $e) {
        api_json_error('db_error', '分數未能儲存，請再試一次。', 500);
    }

    api_json_ok([
        'id' => $stats['id'],
        'question_key' => $question['key'],
        'transcript' => $scored['transcript'],
        'score' => $scored['score'],
        'feedback_zh' => $scored['feedback_zh'],
        'feedback_en' => $scored['feedback_en'],
        'key_points_zh' => $scored['key_points_zh'],
        'key_points_en' => $scored['key_points_en'],
        'has_audio' => $hasAudio,
        'best_score' => $stats['best_score'],
        'attempt_count' => $stats['attempt_count'],
    ]);
}

function api_handle_explanation_attempt_list(PDO $pdo): void
{
    $user = require_api_user();
    $questionKey = trim((string) ($_GET['question_key'] ?? ''));
    try {
        $question = explanation_question($pdo, $questionKey, true);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取題目。', 500);
    }
    if ($question === null) {
        api_json_error('validation_error', '找不到這條科學問題。', 422);
    }
    try {
        $attempts = explanation_list_user_attempts($pdo, (int) $user['id'], $questionKey);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取之前的錄音。', 500);
    }

    api_json_ok(['attempts' => $attempts]);
}

function api_handle_explanation_audio(PDO $pdo, string $id): void
{
    $user = require_api_user();
    $attemptId = (int) $id;
    try {
        $row = explanation_fetch_attempt($pdo, $attemptId);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取錄音。', 500);
    }
    if ($row === null) {
        api_json_error('not_found', '找不到這段錄音。', 404);
    }
    $owner = (int) $row['user_id'] === (int) $user['id'];
    if (!$owner && !explanation_can_manage()) {
        api_json_error('not_found', '找不到這段錄音。', 404);
    }
    explanation_stream_audio($row);
}

function api_handle_admin_explanations(PDO $pdo): void
{
    explanation_require_manage();
    $query = trim((string) ($_GET['q'] ?? ''));
    $questionKey = trim((string) ($_GET['question_key'] ?? ''));
    try {
        if ($questionKey !== '' && explanation_question($pdo, $questionKey, false) === null) {
            api_json_error('validation_error', '找不到這條科學問題。', 422);
        }
        $attempts = explanation_list_admin_attempts($pdo, $query, $questionKey);
        $questions = [];
        foreach (explanation_questions($pdo, false) as $question) {
            $questions[] = [
                'id' => $question['id'],
                'key' => $question['key'],
                'title_zh' => $question['title_zh'],
                'title_en' => $question['title_en'],
                'subject' => $question['subject'],
            ];
        }
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取口述解釋紀錄。', 500);
    }

    api_json_ok([
        'attempts' => $attempts,
        'questions' => $questions,
    ]);
}

function api_handle_admin_explanation_bank(PDO $pdo): void
{
    explanation_require_manage();
    try {
        $subjects = explanation_subjects($pdo, false);
        $questions = explanation_questions($pdo, false);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取口述解釋題庫。', 500);
    }

    api_json_ok([
        'subjects' => $subjects,
        'questions' => $questions,
    ]);
}

function api_handle_admin_explanation_subject_create(PDO $pdo): void
{
    explanation_require_manage();
    api_verify_csrf_or_fail();
    try {
        $saved = explanation_save_subject($pdo, api_read_json_body());
    } catch (PDOException $e) {
        api_json_error('db_error', '無法儲存科目。', 500);
    }
    if (!$saved['ok']) {
        api_json_error('validation_error', $saved['error'], $saved['status']);
    }
    api_json_ok(['subject' => $saved['subject']]);
}

function api_handle_admin_explanation_subject_update(PDO $pdo, string $id): void
{
    explanation_require_manage();
    api_verify_csrf_or_fail();
    try {
        $saved = explanation_save_subject($pdo, api_read_json_body(), (int) $id);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法儲存科目。', 500);
    }
    if (!$saved['ok']) {
        api_json_error($saved['status'] === 404 ? 'not_found' : 'validation_error', $saved['error'], $saved['status']);
    }
    api_json_ok(['subject' => $saved['subject']]);
}

function api_handle_admin_explanation_subject_delete(PDO $pdo, string $id): void
{
    explanation_require_manage();
    api_verify_csrf_or_fail();
    try {
        $deleted = explanation_delete_subject($pdo, (int) $id);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法刪除科目。', 500);
    }
    if (!$deleted['ok']) {
        api_json_error($deleted['status'] === 404 ? 'not_found' : 'validation_error', $deleted['error'], $deleted['status']);
    }
    api_json_ok(['ok' => true]);
}

function api_handle_admin_explanation_question_create(PDO $pdo): void
{
    explanation_require_manage();
    api_verify_csrf_or_fail();
    try {
        $saved = explanation_save_question($pdo, api_read_json_body());
    } catch (PDOException $e) {
        api_json_error('db_error', '無法儲存問題。', 500);
    }
    if (!$saved['ok']) {
        api_json_error('validation_error', $saved['error'], $saved['status']);
    }
    api_json_ok(['question' => $saved['question']]);
}

function api_handle_admin_explanation_question_update(PDO $pdo, string $id): void
{
    explanation_require_manage();
    api_verify_csrf_or_fail();
    try {
        $saved = explanation_save_question($pdo, api_read_json_body(), (int) $id);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法儲存問題。', 500);
    }
    if (!$saved['ok']) {
        api_json_error($saved['status'] === 404 ? 'not_found' : 'validation_error', $saved['error'], $saved['status']);
    }
    api_json_ok(['question' => $saved['question']]);
}

function api_handle_admin_explanation_question_delete(PDO $pdo, string $id): void
{
    explanation_require_manage();
    api_verify_csrf_or_fail();
    try {
        $deleted = explanation_delete_question($pdo, (int) $id);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法刪除問題。', 500);
    }
    if (!$deleted['ok']) {
        api_json_error($deleted['status'] === 404 ? 'not_found' : 'validation_error', $deleted['error'], $deleted['status']);
    }
    api_json_ok(['ok' => true]);
}
