<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';
require_once dirname(__DIR__, 3) . '/includes/adaptive_lib.php';
require_once dirname(__DIR__, 3) . '/includes/learning_analytics_lib.php';
require_once dirname(__DIR__, 3) . '/includes/student_coursework_lib.php';

function api_handle_teacher_classes_list(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $canAny = user_has_permission('class.manage_any');
    if (!$canAny && !user_has_permission('class.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    $rows = classes_list_for_teacher($pdo, $user['id'], $canAny);
    api_json_ok(['classes' => array_map('classes_public_row', $rows)]);
}

function api_handle_teacher_class_create(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('class.manage_any') && !user_has_permission('class.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $body = api_read_json_body();
    $post = [
        'csrf' => csrf_token(),
        'name' => (string) ($body['name'] ?? ''),
        'school_year' => (string) ($body['school_year'] ?? date('Y') . '-' . (date('Y') + 1)),
        'form_level' => (string) ($body['form_level'] ?? ''),
        'course_subject' => (string) ($body['course_subject'] ?? ''),
        'teacher_user_id' => (int) ($body['teacher_user_id'] ?? $user['id']),
    ];
    // Form checkbox semantics: key present ⇒ active. Default new classes to active.
    if (!array_key_exists('is_active', $body) || !empty($body['is_active'])) {
        $post['is_active'] = 1;
    }
    $r = classes_save_from_post($pdo, $post, $user['id']);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '建立失敗。', 422);
    }
    $class = classes_fetch_by_id($pdo, (int) $r['id']);
    api_json_ok(['class' => $class ? classes_public_row($class) : null]);
}

function api_handle_teacher_class_enroll(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $emails = $body['emails'] ?? [];
    if (!is_array($emails)) {
        $emails = [];
    }
    $r = classes_enroll_users($pdo, $classId, $emails, $user);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '加入失敗。', 422);
    }
    api_json_ok(['enrolled' => $r['enrolled'] ?? 0]);
}

function api_handle_teacher_class_invite(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $r = classes_reset_invite_code($pdo, $classId, $user);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '重設失敗。', 422);
    }
    api_json_ok(['invite_code' => $r['invite_code']]);
}

function api_handle_teacher_class_report(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $students = scw_enrich_student_reports(
        $pdo,
        $classId,
        adaptive_class_student_reports($pdo, $classId)
    );

    api_json_ok([
        'class' => classes_public_row($class),
        'summary' => la_class_activity_summary($pdo, $classId),
        'coursework' => scw_class_coursework_kpis($pdo, $classId),
        'weak_topics' => adaptive_class_weak_topics($pdo, $classId),
        'students' => $students,
    ]);
}

function api_handle_teacher_class_student_detail(PDO $pdo, int $classId, int $studentUserId): void
{
    $user = require_api_user();
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $dossier = scw_student_dossier($pdo, $classId, $studentUserId);
    if ($dossier === []) {
        api_json_error('not_found', '學生不在此課程。', 404);
    }

    api_json_ok([
        'class' => classes_public_row($class),
        'student' => $dossier['student'],
        'kpis' => $dossier['kpis'],
        'detail' => $dossier['sdl'],
        'worksheets' => $dossier['worksheets'],
        'summer_homework' => $dossier['summer_homework'],
        'recent_events' => $dossier['recent_events'],
    ]);
}

function api_teacher_class_report_csv(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $students = scw_enrich_student_reports(
        $pdo,
        $classId,
        adaptive_class_student_reports($pdo, $classId)
    );
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="class-' . $classId . '-report.csv"');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    fputcsv($out, [
        '姓名', '電郵', '班別', '班號', 'MOI', '平均掌握度', '本週學習分鐘', '最後上線', '最近測驗',
        '工作紙已交', '工作紙應交', '工作紙待批', '工作紙逾期', '暑期已過', '暑期總數',
    ]);
    foreach ($students as $s) {
        $lastAttempt = '';
        if ($s['last_attempt']) {
            $lastAttempt = $s['last_attempt']['score'] . '/' . $s['last_attempt']['max_score'];
        }
        $ws = $s['worksheets'] ?? [];
        $sh = $s['summer'] ?? [];
        fputcsv($out, [
            $s['display_name'],
            $s['email'],
            $s['form_class'] ?? '',
            $s['class_no'] ?? '',
            $s['moi'] ?? '',
            $s['avg_mastery'],
            $s['minutes_week'],
            $s['last_active_at'] ?? '',
            $lastAttempt,
            $ws['submitted'] ?? 0,
            $ws['assigned'] ?? 0,
            $ws['ungraded'] ?? 0,
            $ws['overdue'] ?? 0,
            $sh['passed'] ?? 0,
            $sh['total'] ?? 0,
        ]);
    }
    fclose($out);
    exit;
}

function api_handle_teacher_inbox(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('class.manage_any') && !user_has_permission('class.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    $filters = [
        'class_id' => isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0,
        'type' => isset($_GET['type']) ? (string) $_GET['type'] : '',
        'status' => isset($_GET['status']) ? (string) $_GET['status'] : '',
    ];
    api_json_ok([
        'items' => scw_teacher_inbox($pdo, $user, $filters),
        'count' => scw_inbox_count($pdo, $user),
    ]);
}

function api_handle_teacher_inbox_count(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('class.manage_any') && !user_has_permission('class.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    api_json_ok(scw_inbox_count($pdo, $user));
}

function api_handle_admin_school_overview(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('class.manage_any')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    api_json_ok(['classes' => scw_school_overview($pdo)]);
}
