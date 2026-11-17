<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
require_once dirname(__DIR__, 3) . '/includes/tutor_lib.php';

function api_handle_tutor_chat(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();

    $body = api_read_json_body();
    $normalized = tutor_normalize_messages($body['messages'] ?? null);
    if (!$normalized['ok']) {
        api_json_error('validation_error', $normalized['error'], 422);
    }

    $contextRaw = $body['context'] ?? [];
    $context = tutor_normalize_context(is_array($contextRaw) ? $contextRaw : []);

    $rateKey = api_rate_limit_key('tutor_chat', (string) $user['id']);
    if (!api_rate_limit_check($pdo, $rateKey, 30, 600)) {
        api_json_error('rate_limited', '提問過於頻繁，請稍後再試。', 429);
    }

    tutor_stream_chat($normalized['messages'], $context['title'], $context['path']);
}
