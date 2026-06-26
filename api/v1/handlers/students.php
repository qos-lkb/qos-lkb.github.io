<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/auth.php';
require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';

function api_handle_auth_register(PDO $pdo): void
{
    $body = api_read_json_body();
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $displayName = trim((string) ($body['display_name'] ?? ''));
    $inviteCode = trim((string) ($body['invite_code'] ?? ''));

    $r = classes_register_student($pdo, $email, $password, $displayName, $inviteCode);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '註冊失敗。', 422);
    }

    if (!attempt_login($email, $password)) {
        api_json_error('server_error', '帳戶已建立但自動登入失敗，請手動登入。', 500);
    }

    api_json_ok(api_user_payload());
}

function api_handle_student_profile_update(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();

    $body = api_read_json_body();
    $r = classes_save_student_profile($pdo, $user['id'], $body);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '更新失敗。', 422);
    }
    api_json_ok(api_user_payload());
}

function api_handle_admin_classes(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        require_api_permission('class.manage_any');
        $rows = classes_list_for_teacher($pdo, 0, true);
        api_json_ok(['classes' => array_map('classes_public_row', $rows)]);
        return;
    }
    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}