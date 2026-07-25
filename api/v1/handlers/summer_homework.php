<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/summer_homework_lib.php';
require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';

function api_handle_summer_homework_list(PDO $pdo): void
{
    require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';

    $form = isset($_GET['form']) ? (string) $_GET['form'] : null;
    if ($form !== null && $form !== '1' && $form !== '2') {
        $form = null;
    }
    $user = current_user();
    $formLocked = false;
    $studentFormLevel = null;
    $message = null;
    $contentLang = null;
    $summerMoi = null;

    // Students (non-teacher) only see homework for their own form level.
    if ($user !== null
        && classes_user_is_student($pdo, (int) $user['id'])
        && !classes_user_is_teacher($pdo, (int) $user['id'])
    ) {
        $formLocked = true;
        $studentFormLevel = classes_resolve_form_level_for_summer($pdo, (int) $user['id']);
        $summerMoi = classes_resolve_moi_for_summer($pdo, (int) $user['id']);
        $contentLang = classes_moi_to_content_lang($summerMoi);
        if ($studentFormLevel === '1' || $studentFormLevel === '2') {
            $form = $studentFormLevel;
        } else {
            $reason = $studentFormLevel === null
                ? '尚未設定年級，請聯絡教師更新個人資料或加入中一／中二課程。'
                : '暑期功課僅供中一、中二同學；你目前的年級沒有對應習作。';
            api_json_ok([
                'items' => [],
                'form_locked' => true,
                'student_form_level' => $studentFormLevel,
                'content_lang' => $contentLang,
                'summer_moi' => $summerMoi,
                'message' => $reason,
            ]);
            return;
        }
    }

    $rows = sh_fetch_published($pdo, $form);
    $out = [];
    foreach ($rows as $row) {
        $item = sh_public_row($row);
        unset($item['body_zh'], $item['body_en']);
        if ($user !== null) {
            $item['progress'] = sh_user_progress_for_item($pdo, (int) $user['id'], (int) $row['id'], $row);
        } else {
            $item['progress'] = null;
        }
        $out[] = $item;
    }
    api_json_ok([
        'items' => $out,
        'form_locked' => $formLocked,
        'student_form_level' => $studentFormLevel,
        'content_lang' => $contentLang,
        'summer_moi' => $summerMoi,
        'message' => $message,
    ]);
}

function api_handle_summer_homework_get(PDO $pdo, string $slug): void
{
    require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';

    $row = sh_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到暑期功課。', 404);
    }
    $user = current_user();
    if (!sh_can_view_item($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }
    if ($user !== null
        && classes_user_is_student($pdo, (int) $user['id'])
        && !classes_user_is_teacher($pdo, (int) $user['id'])
    ) {
        $studentForm = classes_resolve_form_level_for_summer($pdo, (int) $user['id']);
        if ($studentForm !== (string) $row['form_level']) {
            api_json_error('forbidden', '此習作不屬於你的年級。', 403);
        }
    }

    $out = sh_public_row($row);
    $includeAnswers = sh_can_review($user);
    $out['questions'] = sh_fetch_questions($pdo, (int) $row['id'], $includeAnswers);
    $out['include_answers'] = $includeAnswers;
    $out['can_review'] = $includeAnswers;
    if ($user !== null) {
        $out['progress'] = sh_user_progress_for_item($pdo, (int) $user['id'], (int) $row['id'], $row);
    } else {
        $out['progress'] = null;
    }
    if ($user !== null
        && classes_user_is_student($pdo, (int) $user['id'])
        && !classes_user_is_teacher($pdo, (int) $user['id'])
    ) {
        $summerMoi = classes_resolve_moi_for_summer($pdo, (int) $user['id']);
        $out['summer_moi'] = $summerMoi;
        $out['content_lang'] = classes_moi_to_content_lang($summerMoi);
    } else {
        $out['summer_moi'] = null;
        $out['content_lang'] = null;
    }
    api_json_ok($out);
}

function api_handle_summer_homework_submit(PDO $pdo, string $slug): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';

    auth_refresh_permissions((int) $user['id']);
    $canSubmit = user_has_permission('summer_homework.submit_own')
        || user_has_permission('summer_homework.manage_own')
        || user_has_permission('summer_homework.manage_any')
        || user_has_permission('class.manage_own')
        || user_has_permission('class.manage_any');
    if (!$canSubmit) {
        api_json_error('forbidden', '沒有呈交暑期功課的權限。', 403);
    }

    $row = sh_get_by_slug($pdo, $slug);
    if (!$row || $row['status'] !== 'published') {
        api_json_error('not_found', '找不到已發佈的暑期功課。', 404);
    }
    if (classes_user_is_student($pdo, (int) $user['id'])
        && !classes_user_is_teacher($pdo, (int) $user['id'])
    ) {
        $studentForm = classes_resolve_form_level_for_summer($pdo, (int) $user['id']);
        if ($studentForm !== (string) $row['form_level']) {
            api_json_error('forbidden', '此習作不屬於你的年級。', 403);
        }
    }

    $body = api_read_json_body();
    $responses = isset($body['responses']) && is_array($body['responses']) ? $body['responses'] : [];
    $result = sh_submit_attempt($pdo, (int) $user['id'], (int) $row['id'], $responses);
    if (!$result['ok']) {
        api_json_error('submit_failed', $result['error'] ?? '提交失敗。', 400);
    }
    api_json_ok($result['result']);
}

function api_handle_admin_summer_homework_mark_attempt(PDO $pdo, int $attemptId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions((int) $user['id']);
    if (!sh_can_review($user)) {
        api_json_error('forbidden', '無權限。', 403);
    }
    $body = api_read_json_body();
    $marks = isset($body['marks']) && is_array($body['marks']) ? $body['marks'] : [];
    $r = sh_save_teacher_marks($pdo, $attemptId, $marks, $user);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '評分失敗。', 422);
    }
    api_json_ok(['saved' => true]);
}

function api_handle_admin_summer_homework(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        if (!sh_can_review($user)) {
            api_json_error('forbidden', '無權限。', 403);
        }
        $canAny = user_has_permission('summer_homework.manage_any');
        // Teachers / reviewers see all items; manage_any also sees all.
        // Only restrict to own items when user can manage_own but somehow not review-all —
        // sh_can_review already covers manage_own, so list all for reviewers.
        if ($canAny || sh_can_review($user)) {
            $rows = $pdo->query(
                'SELECT * FROM summer_homework_items ORDER BY form_level ASC, list_sort_order ASC, updated_at DESC'
            )->fetchAll() ?: [];
        } else {
            $rows = [];
        }
        api_json_ok(array_map(static function (array $row) use ($user): array {
            $out = sh_public_row($row);
            $out['owner_user_id'] = (int) ($row['owner_user_id'] ?? 0);
            $out['can_manage'] = sh_can_manage_row($user, $row);
            return $out;
        }, $rows));
        return;
    }

    if ($method === 'POST') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        if (!user_has_permission('summer_homework.manage_any') && !user_has_permission('summer_homework.manage_own')) {
            api_json_error('forbidden', '無權限。', 403);
        }
        $body = api_read_json_body();
        $r = sh_save_item($pdo, $body, $user);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 400);
        }
        $row = sh_get_by_id($pdo, (int) $r['id']);
        $out = sh_public_row($row ?: []);
        $out['questions'] = sh_fetch_questions($pdo, (int) $r['id'], true);
        $out['media'] = sh_list_media($pdo, (int) $r['id']);
        if (isset($r['regraded_attempts'])) {
            $out['regraded_attempts'] = (int) $r['regraded_attempts'];
        }
        api_json_ok($out);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $body = api_read_json_body();
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('invalid', '缺少 id。', 400);
        }
        $r = sh_delete_item($pdo, $id, $user);
        if (!$r['ok']) {
            api_json_error('delete_failed', $r['error'] ?? '刪除失敗。', 400);
        }
        api_json_ok(['deleted' => true, 'id' => $id]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_summer_homework_get(PDO $pdo, int $id): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $row = sh_get_by_id($pdo, $id);
    if (!$row) {
        api_json_error('not_found', '找不到習作。', 404);
    }
    if (!sh_can_review_item($user, $row)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }
    $out = sh_public_row($row);
    $out['questions'] = sh_fetch_questions($pdo, $id, true);
    $out['media'] = sh_list_media($pdo, $id);
    $out['can_manage'] = sh_can_manage_row($user, $row);
    $out['can_review'] = true;
    api_json_ok($out);
}

function api_handle_admin_summer_homework_media_upload(PDO $pdo, int $id): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions((int) $user['id']);
    $file = $_FILES['file'] ?? null;
    if (!is_array($file)) {
        api_json_error('validation_error', '請上載圖片檔案。', 422);
    }
    $altZh = isset($_POST['alt_zh']) ? trim((string) $_POST['alt_zh']) : null;
    $altEn = isset($_POST['alt_en']) ? trim((string) $_POST['alt_en']) : null;
    $result = sh_save_media_upload($pdo, $id, $file, $user, $altZh, $altEn);
    if (!$result['ok']) {
        api_json_error('upload_failed', $result['error'] ?? '上載失敗。', 422);
    }
    api_json_ok($result['media']);
}

function api_handle_admin_summer_homework_media_delete(PDO $pdo, int $id, int $mediaId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions((int) $user['id']);
    $result = sh_delete_media($pdo, $id, $mediaId, $user);
    if (!$result['ok']) {
        api_json_error('delete_failed', $result['error'] ?? '刪除失敗。', 422);
    }
    api_json_ok(['deleted' => true]);
}

function api_handle_admin_summer_homework_import_questions(PDO $pdo, int $id): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions((int) $user['id']);
    $body = api_read_json_body();
    $questionIds = isset($body['question_ids']) && is_array($body['question_ids'])
        ? $body['question_ids']
        : [];
    $result = sh_import_questions_from_bank(
        $pdo,
        $id,
        (int) ($body['bank_id'] ?? 0),
        $questionIds,
        $user
    );
    if (!$result['ok']) {
        api_json_error('import_failed', $result['error'] ?? '匯入失敗。', 422);
    }
    api_json_ok([
        'imported' => (int) ($result['imported'] ?? 0),
        'skipped' => (int) ($result['skipped'] ?? 0),
        'questions' => sh_fetch_questions($pdo, $id, true),
    ]);
}

function api_handle_admin_summer_homework_analytics(PDO $pdo, int $id): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $row = sh_get_by_id($pdo, $id);
    if ($row === null) {
        api_json_error('not_found', '找不到習作。', 404);
    }
    if (!sh_can_review_item($user, $row)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    api_json_ok([
        'item' => sh_public_row($row),
        'analytics' => sh_item_attempt_analytics($pdo, $id),
        'students' => sh_student_summaries_for_item($pdo, $id),
        'questions' => sh_fetch_questions($pdo, $id, true),
        'can_manage' => sh_can_manage_row($user, $row),
    ]);
}

function api_handle_admin_summer_homework_attempts(PDO $pdo, int $id): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $row = sh_get_by_id($pdo, $id);
    if ($row === null) {
        api_json_error('not_found', '找不到習作。', 404);
    }
    if (!sh_can_review_item($user, $row)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    $filterUserId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $attempts = sh_list_attempts_for_item($pdo, $id, $filterUserId > 0 ? $filterUserId : null);
    api_json_ok([
        'item_id' => $id,
        'user_id' => $filterUserId > 0 ? $filterUserId : null,
        'attempts' => $attempts,
    ]);
}

function api_handle_admin_class_summer_homework(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('class.manage_any') && !user_has_permission('class.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限管理此課程。', 403);
    }

    $report = sh_class_report($pdo, $classId);
    $statusFilter = isset($_GET['status']) ? (string) $_GET['status'] : '';
    if (!in_array($statusFilter, ['', 'missing', 'on_time', 'late'], true)) {
        $statusFilter = '';
    }

    if ($statusFilter !== '') {
        $items = $report['items'];
        $rows = $report['rows'];
        /** @var array<int, array<int, array<string, mixed>>> $byStudent */
        $byStudent = [];
        foreach ($rows as $r) {
            $uid = (int) $r['student_user_id'];
            $iid = (int) $r['item_id'];
            $byStudent[$uid][$iid] = $r;
        }
        $report['students'] = array_values(array_filter(
            $report['students'],
            static function (array $stu) use ($byStudent, $items, $statusFilter): bool {
                $uid = (int) ($stu['id'] ?? $stu['user_id'] ?? 0);
                foreach ($items as $item) {
                    $cell = $byStudent[$uid][(int) $item['id']] ?? null;
                    if ($cell !== null && (string) ($cell['status'] ?? '') === $statusFilter) {
                        return true;
                    }
                }
                return false;
            }
        ));
        $report['status_filter'] = $statusFilter;
    }

    api_json_ok($report);
}

function api_handle_admin_class_summer_homework_csv(PDO $pdo, int $classId): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('class.manage_any') && !user_has_permission('class.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限管理此課程。', 403);
    }

    $report = sh_class_report($pdo, $classId);
    $csvRows = sh_class_report_csv_rows($report);

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="summer_homework_class_' . $classId . '.csv"');
    header('Cache-Control: no-store');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    if ($out !== false) {
        foreach ($csvRows as $line) {
            fputcsv($out, $line);
        }
        fclose($out);
    }
    exit;
}
