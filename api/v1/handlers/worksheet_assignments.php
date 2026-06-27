<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';
require_once dirname(__DIR__, 3) . '/includes/worksheets_lib.php';
require_once dirname(__DIR__, 3) . '/includes/worksheet_assignments_lib.php';
require_once dirname(__DIR__, 3) . '/includes/worksheet_permissions_lib.php';

function api_handle_teacher_class_worksheet_assignments(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!worksheet_user_can_assign()) {
        api_json_error('forbidden', '沒有派發工作紙的權限。', 403);
    }
    $class = classes_fetch_by_id($pdo, $classId);
    if (!$class || !classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'GET') {
        $rows = wa_list_for_class($pdo, $classId);
        api_json_ok(['assignments' => $rows, 'students' => classes_students_in_class($pdo, $classId)]);
        return;
    }
    if ($method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $body['class_id'] = $classId;
        $r = wa_create($pdo, $user, $body);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '建立失敗。', 422);
        }
        $a = wa_get_assignment($pdo, $r['id']);
        $ws = $a ? ws_get_by_id($pdo, (int) $a['worksheet_id']) : null;
        api_json_ok([
            'assignment' => $a ? wa_public_assignment($a, $ws ?: null, $class) : null,
            'submissions' => wa_submissions_for_assignment($pdo, $r['id']),
        ]);
        return;
    }
    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_teacher_worksheet_assignment_detail(PDO $pdo, int $assignmentId): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!worksheet_user_can_assign() && !worksheet_user_can_grade()) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    $a = wa_get_assignment($pdo, $assignmentId);
    if (!$a) {
        api_json_error('not_found', '找不到派發。', 404);
    }
    $class = classes_fetch_by_id($pdo, (int) $a['class_id']);
    if (!$class || !classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'GET') {
        $ws = ws_get_by_id($pdo, (int) $a['worksheet_id']);
        api_json_ok([
            'assignment' => wa_public_assignment($a, $ws ?: null, $class),
            'submissions' => array_map('wa_public_submission', wa_submissions_for_assignment($pdo, $assignmentId)),
        ]);
        return;
    }
    if ($method === 'PATCH' || $method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        if (isset($body['status'])) {
            $r = wa_update_status($pdo, $user, $assignmentId, (string) $body['status']);
            if (!$r['ok']) {
                api_json_error('validation_error', $r['error'] ?? '更新失敗。', 422);
            }
        }
        $a = wa_get_assignment($pdo, $assignmentId);
        $ws = $a ? ws_get_by_id($pdo, (int) $a['worksheet_id']) : null;
        api_json_ok([
            'assignment' => $a ? wa_public_assignment($a, $ws ?: null, $class) : null,
        ]);
        return;
    }
    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_teacher_worksheet_submission_grade(PDO $pdo, int $submissionId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions($user['id']);
    if (!worksheet_user_can_grade()) {
        api_json_error('forbidden', '沒有評分工作紙的權限。', 403);
    }
    $body = api_read_json_body();
    $r = wa_grade($pdo, $user, $submissionId, $body);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '評分失敗。', 422);
    }
    $stmt = $pdo->prepare('SELECT * FROM worksheet_submissions WHERE id = ? LIMIT 1');
    $stmt->execute([$submissionId]);
    $sub = $stmt->fetch();
    api_json_ok(['submission' => $sub ? wa_public_submission($sub) : null]);
}

function api_handle_student_worksheet_assignments_list(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!worksheet_user_can_submit()) {
        api_json_error('forbidden', '沒有呈交工作紙的權限。', 403);
    }
    $rows = wa_list_for_student($pdo, $user['id']);
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int) $row['id'],
            'class_id' => (int) $row['class_id'],
            'class_name' => $row['class_name'],
            'worksheet_id' => (int) $row['worksheet_id'],
            'worksheet_slug' => $row['worksheet_slug'],
            'title_zh' => $row['title_zh'] ?: $row['worksheet_title_zh'],
            'title_en' => $row['title_en'] ?: $row['worksheet_title_en'],
            'instructions_zh' => $row['instructions_zh'],
            'instructions_en' => $row['instructions_en'],
            'due_at' => $row['due_at'],
            'max_score' => (float) $row['max_score'],
            'status' => $row['status'],
            'submission' => [
                'id' => (int) $row['submission_id'],
                'status' => $row['submission_status'],
                'score' => $row['score'] !== null ? (float) $row['score'] : null,
                'auto_score' => isset($row['auto_score']) && $row['auto_score'] !== null ? (float) $row['auto_score'] : null,
                'submitted_at' => $row['submitted_at'],
                'graded_at' => $row['graded_at'],
                'feedback_zh' => $row['feedback_zh'],
                'feedback_en' => $row['feedback_en'],
            ],
        ];
    }
    api_json_ok(['assignments' => $out]);
}

function api_handle_student_worksheet_assignment_get(PDO $pdo, int $assignmentId): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!worksheet_user_can_submit()) {
        api_json_error('forbidden', '沒有呈交工作紙的權限。', 403);
    }
    if (!wa_student_assigned($pdo, $assignmentId, $user['id'])) {
        api_json_error('forbidden', '你未被指派此習作。', 403);
    }
    $a = wa_get_assignment($pdo, $assignmentId);
    if (!$a || ($a['status'] ?? '') === 'draft') {
        api_json_error('not_found', '找不到習作。', 404);
    }
    $class = classes_fetch_by_id($pdo, (int) $a['class_id']);
    $ws = ws_get_by_id($pdo, (int) $a['worksheet_id']);
    $sub = wa_get_submission($pdo, $assignmentId, $user['id']);
    api_json_ok([
        'assignment' => wa_public_assignment($a, $ws ?: null, $class ?: null),
        'submission' => $sub ? wa_public_submission($sub) : null,
    ]);
}

function api_handle_student_worksheet_assignment_submit(PDO $pdo, int $assignmentId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions($user['id']);
    if (!worksheet_user_can_submit()) {
        api_json_error('forbidden', '沒有呈交工作紙的權限。', 403);
    }
    $body = api_read_json_body();
    $r = wa_submit($pdo, $assignmentId, $user['id'], $body);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '提交失敗。', 422);
    }
    $sub = wa_get_submission($pdo, $assignmentId, $user['id']);
    api_json_ok(['submission' => $sub ? wa_public_submission($sub) : null]);
}
