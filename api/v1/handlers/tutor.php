<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
require_once dirname(__DIR__, 3) . '/includes/tutor_lib.php';

function api_handle_tutor_status(PDO $pdo): void
{
    require_api_user();
    try {
        tutor_ensure_schema($pdo);
        api_json_ok(tutor_status_payload($pdo));
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取科學助教狀態。', 500);
    }
}

function api_handle_tutor_settings_get(PDO $pdo): void
{
    require_api_permission('user.manage');
    try {
        tutor_ensure_schema($pdo);
        api_json_ok(tutor_admin_settings_payload($pdo));
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取 Chatbot 設定。', 500);
    }
}

function api_handle_tutor_settings_put(PDO $pdo): void
{
    require_api_permission('user.manage');
    api_verify_csrf_or_fail();
    $normalized = tutor_normalize_admin_settings(api_read_json_body());
    if (!$normalized['ok']) {
        api_json_error('validation_error', $normalized['error'], 422);
    }
    try {
        tutor_ensure_schema($pdo);
        tutor_settings_save($pdo, $normalized['values']);
        api_json_ok(tutor_admin_settings_payload($pdo));
    } catch (PDOException $e) {
        api_json_error('db_error', '無法儲存 Chatbot 設定。', 500);
    }
}

function api_handle_tutor_history(PDO $pdo): void
{
    $user = require_api_user();
    $conversationId = (int) ($_GET['id'] ?? 0);
    try {
        tutor_ensure_schema($pdo);
        if ($conversationId > 0) {
            $row = tutor_fetch_conversation($pdo, $conversationId);
            if ($row === null || ((int) $row['user_id'] !== (int) $user['id'] && !tutor_can_view_all($user))) {
                api_json_error('not_found', '找不到這段對話。', 404);
            }
        } else {
            $stmt = $pdo->prepare(
                'SELECT id FROM tutor_conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1'
            );
            $stmt->execute([(int) $user['id']]);
            $id = $stmt->fetchColumn();
            $conversationId = $id === false ? 0 : (int) $id;
            $row = $conversationId > 0 ? tutor_fetch_conversation($pdo, $conversationId) : null;
        }
        $messages = $conversationId > 0
            ? tutor_recent_messages($pdo, $conversationId, TUTOR_HISTORY_LIMIT)
            : [];
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取科學助教紀錄。', 500);
    }

    api_json_ok([
        'conversation_id' => $conversationId,
        'conversation' => $row ? tutor_conversation_payload($row, tutor_can_view_all($user)) : null,
        'messages' => $messages,
    ]);
}

function api_handle_tutor_conversations_list(PDO $pdo): void
{
    $user = require_api_user();
    $all = ($_GET['all'] ?? '') === '1' || strtolower((string) ($_GET['all'] ?? '')) === 'true';
    if ($all && !tutor_can_view_all($user)) {
        api_json_error('forbidden', '沒有權限查看全部對話。', 403);
    }
    $q = (string) ($_GET['q'] ?? '');
    try {
        tutor_ensure_schema($pdo);
        $items = tutor_list_conversations(
            $pdo,
            $all ? null : (int) $user['id'],
            $q,
            $all
        );
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取科學助教紀錄。', 500);
    }

    api_json_ok([
        'conversations' => $items,
        'can_view_all' => tutor_can_view_all($user),
    ]);
}

function api_handle_tutor_conversations_create(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $context = tutor_normalize_context(is_array($body['context'] ?? null) ? $body['context'] : []);
    try {
        tutor_ensure_schema($pdo);
        if (!tutor_is_enabled($pdo)) {
            api_json_error('tutor_unavailable', '科學助教尚未啟用。', 503);
        }
        $id = tutor_create_conversation(
            $pdo,
            (int) $user['id'],
            tutor_effective_model($pdo),
            $context['title'],
            $context['path']
        );
        $row = tutor_fetch_conversation($pdo, $id);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法開始新對話。', 500);
    }

    api_json_ok(['conversation' => $row ? tutor_conversation_payload($row) : ['id' => $id]]);
}

function api_handle_tutor_conversation_get(PDO $pdo, string $idRaw): void
{
    $user = require_api_user();
    $id = (int) $idRaw;
    if ($id < 1) {
        api_json_error('not_found', '找不到這段對話。', 404);
    }
    try {
        tutor_ensure_schema($pdo);
        $row = tutor_fetch_conversation($pdo, $id);
        if ($row === null || ((int) $row['user_id'] !== (int) $user['id'] && !tutor_can_view_all($user))) {
            api_json_error('not_found', '找不到這段對話。', 404);
        }
        $limit = tutor_can_view_all($user) ? TUTOR_ADMIN_MESSAGE_LIMIT : TUTOR_HISTORY_LIMIT;
        $messages = tutor_recent_messages($pdo, $id, $limit);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法讀取科學助教紀錄。', 500);
    }

    api_json_ok([
        'conversation' => tutor_conversation_payload($row, tutor_can_view_all($user) || (int) $row['user_id'] !== (int) $user['id']),
        'messages' => $messages,
    ]);
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
    $requestedId = (int) ($body['conversation_id'] ?? 0);
    $forceNew = !empty($body['new']);

    $rateKey = api_rate_limit_key('tutor_chat', (string) $user['id']);
    if (!api_rate_limit_check($pdo, $rateKey, 30, 600)) {
        api_json_error('rate_limited', '提問過於頻繁，請稍後再試。', 429);
    }

    try {
        tutor_ensure_schema($pdo);
        if (!tutor_is_enabled($pdo)) {
            api_json_error('tutor_unavailable', '科學助教尚未啟用。', 503);
        }
        $conversationId = tutor_open_conversation(
            $pdo,
            (int) $user['id'],
            tutor_effective_model($pdo),
            $context['title'],
            $context['path'],
            $requestedId,
            $forceNew
        );
        tutor_append_user_turn($pdo, $conversationId, $question);
        $messages = tutor_recent_messages($pdo, $conversationId, TUTOR_MAX_MESSAGES);
    } catch (InvalidArgumentException $e) {
        api_json_error('not_found', '找不到這段對話。', 404);
    } catch (PDOException $e) {
        api_json_error('db_error', '無法儲存科學助教對話。', 500);
    }

    tutor_stream_chat($pdo, $conversationId, $messages, $context['title'], $context['path']);
}
