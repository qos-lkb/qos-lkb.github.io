<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';

function api_handle_auth_login(PDO $pdo): void
{
    $body = api_read_json_body();
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        api_json_error('validation_error', '請填寫電郵與密碼。', 422);
    }

    $rateKey = api_rate_limit_key('login', api_client_ip() . '|' . strtolower($email));
    if (!api_rate_limit_check($pdo, $rateKey, 5, 900)) {
        api_json_error('rate_limited', '登入嘗試過於頻繁，請稍後再試。', 429);
    }

    if (!attempt_login($email, $password)) {
        api_json_error('invalid_credentials', '電郵或密碼錯誤。', 401);
    }

    api_rate_limit_reset($pdo, $rateKey);
    $user = current_user();
    assert($user !== null);
    api_json_ok(api_user_payload($user));
}

function api_handle_auth_logout(PDO $pdo): void
{
    require_api_user();
    api_verify_csrf_or_fail();
    logout_user();
    api_json_ok(['logged_out' => true]);
}

function api_handle_auth_me(PDO $pdo): void
{
    $payload = api_user_payload();
    if ($payload === null) {
        api_json_error('unauthorized', '未登入。', 401);
    }
    api_json_ok($payload);
}

function api_handle_auth_update_profile(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    require_once dirname(__DIR__, 3) . '/includes/account_lib.php';

    $body = api_read_json_body();
    $r = account_update_profile(
        $pdo,
        $user['id'],
        (string) ($body['name_zh'] ?? ''),
        (string) ($body['name_en'] ?? '')
    );
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '更新失敗。', 422);
    }
    api_json_ok(api_user_payload());
}

function api_handle_auth_change_password(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    require_once dirname(__DIR__, 3) . '/includes/account_lib.php';

    $body = api_read_json_body();
    $r = account_change_password(
        $pdo,
        $user['id'],
        (string) ($body['current_password'] ?? ''),
        (string) ($body['new_password'] ?? '')
    );
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '更改密碼失敗。', 422);
    }
    api_json_ok(['changed' => true]);
}
