<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
require_once dirname(__DIR__, 3) . '/includes/tutor_lib.php';

function api_handle_tutor_history(PDO $pdo): void
{
    $user = require_api_user();
    try {
        tutor_ensure_schema($pdo);
        $stmt = $pdo->prepare(
            'SELECT id FROM tutor_conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1'
        );
        $stmt->execute([(int) $user['id']]);
        $id = $stmt->fetchColumn();
        $messages = $id === false ? [] : tutor_recent_messages($pdo, (int) $id, TUTOR_HISTORY_LIMIT);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取科學助教紀錄。', 500);
    }

    api_json_ok(['messages' => $messages]);
}

function api_handle_tutor_chat(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();

    $body = api_read_json_body();
    $normalized = tutor_normalize_messages($body['messages'] ?? null);
    if (!$normalized['ok']) {
        api_json_error('validation_error', $normalized['error'], 422);
    }

    $question = tutor_latest_user_text($normalized['messages']);
    if ($question === '') {
        api_json_error('validation_error', '請輸入問題。', 422);
    }

    $contextRaw = $body['context'] ?? [];
    $context = tutor_normalize_context(is_array($contextRaw) ? $contextRaw : []);

    $rateKey = api_rate_limit_key('tutor_chat', (string) $user['id']);
    if (!api_rate_limit_check($pdo, $rateKey, 30, 600)) {
        api_json_error('rate_limited', '提問過於頻繁，請稍後再試。', 429);
    }

    try {
        tutor_ensure_schema($pdo);
        $conversationId = tutor_open_conversation(
            $pdo,
            (int) $user['id'],
            config_xai_model(),
            $context['title'],
            $context['path']
        );
        tutor_append_user_turn($pdo, $conversationId, $question);
        $messages = tutor_recent_messages($pdo, $conversationId, TUTOR_MAX_MESSAGES);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法儲存科學助教對話。', 500);
    }

    tutor_stream_chat($pdo, $conversationId, $messages, $context['title'], $context['path']);
}
