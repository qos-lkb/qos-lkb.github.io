<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/auth.php';
require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';

function api_handle_auth_register(PDO $pdo): void
{
    require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
    require_once dirname(__DIR__, 3) . '/includes/qsis_auth_lib.php';

    $body = api_read_json_body();
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $displayName = trim((string) ($body['display_name'] ?? ''));
    $nameZh = trim((string) ($body['name_zh'] ?? $displayName));
    $nameEn = trim((string) ($body['name_en'] ?? ''));
    $inviteCode = trim((string) ($body['invite_code'] ?? ''));

    $identity = auth_normalize_login_identity($email);
    $rate = api_auth_rate_limit_begin($pdo, 'register', $identity !== '' ? $identity : $email);
    if (!$rate['ok']) {
        api_json_error('rate_limited', '註冊嘗試過於頻繁，請稍後再試。', 429);
    }

    $r = classes_register_student($pdo, $email, $password, $nameZh, $nameEn, $inviteCode);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '註冊失敗。', 422);
    }

    api_rate_limit_reset($pdo, $rate['key']);

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

function api_handle_student_classes_list(PDO $pdo): void
{
    $user = require_api_user();
    $classes = classes_list_for_student($pdo, (int) $user['id']);
    api_json_ok(['classes' => $classes]);
}

/**
 * @param array<string, mixed> $body
 * @return array<string, mixed>
 */
function api_admin_class_body_to_post(array $body, int $actingUserId, ?string $csrf): array
{
    $post = [
        'csrf' => $csrf ?? '',
        'id' => (int) ($body['id'] ?? 0),
        'name' => (string) ($body['name'] ?? ''),
        'school_year' => (string) ($body['school_year'] ?? ''),
        'form_level' => (string) ($body['form_level'] ?? ''),
        'course_subject' => (string) ($body['course_subject'] ?? ''),
        'teacher_user_id' => (int) ($body['teacher_user_id'] ?? $actingUserId),
    ];
    if (!empty($body['is_active'])) {
        $post['is_active'] = 1;
    }
    return $post;
}

function api_handle_admin_classes(PDO $pdo, string $method): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $canAny = user_has_permission('class.manage_any');
    $canOwn = user_has_permission('class.manage_own');
    if (!$canAny && !$canOwn) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    if ($method === 'GET') {
        $rows = classes_list_for_teacher($pdo, $user['id'], $canAny);
        $payload = [
            'classes' => array_map('classes_public_row', $rows),
            'form_level_options' => classes_form_level_options(),
            'course_subject_options' => classes_course_subject_options(),
            'can_edit_students' => classes_can_edit_students($pdo, $user),
            'has_form_subject_columns' => classes_has_form_subject_columns($pdo),
        ];
        if ($canAny) {
            $payload['teacher_options'] = classes_teacher_options($pdo);
        }
        api_json_ok($payload);
        return;
    }

    if ($method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $action = (string) ($body['action'] ?? 'save');

        if ($action === 'delete_bulk' || $action === 'bulk_delete') {
            $ids = isset($body['ids']) && is_array($body['ids']) ? $body['ids'] : [];
            $post = [
                'csrf' => api_request_csrf() ?? '',
                'ids' => $ids,
            ];
            $r = classes_delete_many($pdo, $post, $user);
            if (!$r['ok']) {
                api_json_error('validation_error', $r['error'] ?? '批次刪除失敗。', 422);
            }
            api_json_ok([
                'deleted' => (int) ($r['deleted'] ?? count($ids)),
                'message' => (string) ($r['message'] ?? ''),
            ]);
            return;
        }

        if ($action === 'inline_update') {
            $post = array_merge($body, ['csrf' => api_request_csrf() ?? '']);
            $r = classes_inline_update($pdo, $post, $user);
            if (!$r['ok']) {
                api_json_error('validation_error', $r['error'] ?? '更新失敗。', 422);
            }
            unset($r['ok']);
            api_json_ok($r);
            return;
        }

        $post = api_admin_class_body_to_post($body, $user['id'], api_request_csrf());
        $r = classes_save_from_post($pdo, $post, $user['id']);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
        }
        $class = classes_fetch_by_id($pdo, (int) $r['id']);
        api_json_ok(['class' => $class ? classes_public_row($class) : null]);
        return;
    }

    if ($method === 'DELETE') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $post = [
            'csrf' => api_request_csrf() ?? '',
            'id' => (int) ($body['id'] ?? 0),
        ];
        $r = classes_delete($pdo, $post, $user);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '刪除失敗。', 422);
        }
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_class_item(PDO $pdo, int $id, string $method): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $canAny = user_has_permission('class.manage_any');
    $canOwn = user_has_permission('class.manage_own');
    if (!$canAny && !$canOwn) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $class = classes_fetch_by_id($pdo, $id);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限管理此課程。', 403);
    }

    if ($method === 'GET') {
        $students = classes_students_in_class($pdo, $id);
        $payload = [
            'class' => classes_public_row($class),
            'students' => $students,
            'can_edit_students' => classes_can_edit_students($pdo, $user),
            'form_level_options' => classes_form_level_options(),
            'course_subject_options' => classes_course_subject_options(),
            'has_form_subject_columns' => classes_has_form_subject_columns($pdo),
        ];
        if ($canAny) {
            $payload['teacher_options'] = classes_teacher_options($pdo);
        }
        api_json_ok($payload);
        return;
    }

    if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $body['id'] = $id;
        if (!array_key_exists('is_active', $body)) {
            $body['is_active'] = !empty($class['is_active']);
        }
        $post = api_admin_class_body_to_post($body, $user['id'], api_request_csrf());
        $r = classes_save_from_post($pdo, $post, $user['id']);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
        }
        $updated = classes_fetch_by_id($pdo, $id);
        api_json_ok(['class' => $updated ? classes_public_row($updated) : null]);
        return;
    }

    if ($method === 'DELETE') {
        api_verify_csrf_or_fail();
        $post = [
            'csrf' => api_request_csrf() ?? '',
            'id' => $id,
        ];
        $r = classes_delete($pdo, $post, $user);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '刪除失敗。', 422);
        }
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_class_students(PDO $pdo, int $classId, string $method): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions($user['id']);

    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限管理此課程。', 403);
    }

    $body = api_read_json_body();
    $action = (string) ($body['action'] ?? ($method === 'DELETE' ? 'remove' : 'enroll'));

    if ($action === 'import_csv') {
        if (!classes_can_edit_students($pdo, $user)) {
            api_json_error('forbidden', '沒有權限匯入學生。', 403);
        }
        $csv = (string) ($body['csv'] ?? $body['csv_content'] ?? '');
        if ($csv === '') {
            api_json_error('validation_error', '請提供 CSV 內容。', 422);
        }
        $r = classes_import_students_csv($pdo, $csv, $classId, $user);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '匯入失敗。', 422);
        }
        api_json_ok([
            'created' => $r['created'] ?? 0,
            'students' => classes_students_in_class($pdo, $classId),
        ]);
        return;
    }

    if ($action === 'batch_update' || $action === 'save_batch') {
        if (!classes_can_edit_students($pdo, $user)) {
            api_json_error('forbidden', '沒有權限批次更新學生。', 403);
        }
        $rows = isset($body['rows']) && is_array($body['rows']) ? $body['rows'] : [];
        $r = classes_save_students_enrollments_batch($pdo, $classId, $rows, $user);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '批次更新失敗。', 422);
        }
        api_json_ok([
            'updated' => $r['updated'] ?? 0,
            'students' => classes_students_in_class($pdo, $classId),
        ]);
        return;
    }

    if ($action === 'enroll') {
        $emails = $body['emails'] ?? [];
        if (!is_array($emails)) {
            $emails = [];
        }
        $r = classes_enroll_users($pdo, $classId, $emails, $user);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '加入失敗。', 422);
        }
        api_json_ok([
            'enrolled' => $r['enrolled'] ?? 0,
            'students' => classes_students_in_class($pdo, $classId),
        ]);
        return;
    }

    api_json_error('validation_error', '未知的學生操作。', 422);
}

function api_handle_admin_class_student_item(PDO $pdo, int $classId, int $studentUserId, string $method): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions($user['id']);

    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限管理此課程。', 403);
    }

    if ($method === 'DELETE') {
        $r = classes_remove_student_from_class($pdo, $classId, $studentUserId, $user);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '移除失敗。', 422);
        }
        api_json_ok(['removed' => true, 'students' => classes_students_in_class($pdo, $classId)]);
        return;
    }

    if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
        if (!classes_can_edit_students($pdo, $user)) {
            api_json_error('forbidden', '沒有權限更新學生資料。', 403);
        }
        $body = api_read_json_body();
        $meta = [
            'form_class' => $body['form_class'] ?? null,
            'class_no' => $body['class_no'] ?? null,
            'moi' => $body['moi'] ?? null,
        ];
        $r = classes_update_student_enrollment($pdo, $classId, $studentUserId, $meta, $user);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '更新失敗。', 422);
        }
        api_json_ok(['updated' => true, 'students' => classes_students_in_class($pdo, $classId)]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_class_invite(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $r = classes_reset_invite_code($pdo, $classId, $user);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '重設失敗。', 422);
    }
    api_json_ok(['invite_code' => $r['invite_code']]);
}