<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/worksheets_lib.php';
require_once dirname(__DIR__, 3) . '/includes/worksheet_assignments_lib.php';
require_once dirname(__DIR__, 3) . '/includes/worksheet_permissions_lib.php';

function api_handle_worksheets_list_public(PDO $pdo): void
{
    $rows = ws_fetch_published($pdo);
    api_json_ok(array_map(function (array $r) {
        $out = ws_public_row($r);
        unset($out['body_zh'], $out['body_en'], $out['content_blocks_zh'], $out['content_blocks_en']);
        return $out;
    }, $rows));
}

function api_handle_worksheet_get(PDO $pdo, string $slug): void
{
    $row = ws_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到工作紙。', 404);
    }
    $user = current_user();
    if (!api_can_view_worksheet($row, $user)) {
        if ($user === null || !wa_student_can_view_worksheet($pdo, (int) $row['id'], $user['id'])) {
            api_json_error('forbidden', '無權檢視。', 403);
        }
    }

    api_json_ok(ws_public_row($row));
}

function api_handle_worksheets_pending(PDO $pdo): void
{
    require_api_permission('worksheet.manage_any');
    $rows = $pdo->query(
        "SELECT ws.*, u.email AS owner_email FROM worksheets ws
         LEFT JOIN users u ON u.id = ws.owner_user_id
         WHERE ws.status = 'pending_review' ORDER BY ws.updated_at DESC"
    )->fetchAll() ?: [];
    api_json_ok($rows);
}

function api_handle_teacher_worksheets_list(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!worksheet_user_can_assign() && !worksheet_user_can_design()) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    $canAny = user_has_permission('worksheet.manage_any');
    $rows = ws_fetch_assignable_for_teacher($pdo, $user['id'], $canAny);
    api_json_ok(array_map(static function (array $r) use ($user): array {
        $out = ws_public_row($r);
        unset($out['body_zh'], $out['body_en'], $out['content_blocks_zh'], $out['content_blocks_en']);
        $out['is_mine'] = (int) ($r['owner_user_id'] ?? 0) === (int) $user['id'];
        return $out;
    }, $rows));
}

function api_handle_admin_worksheets(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('worksheet.manage_any');
        if (!$canAny && !user_has_permission('worksheet.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        if ($canAny) {
            $rows = $pdo->query('SELECT * FROM worksheets ORDER BY updated_at DESC')->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare('SELECT * FROM worksheets WHERE owner_user_id = ? ORDER BY updated_at DESC');
            $stmt->execute([$user['id']]);
            $rows = $stmt->fetchAll() ?: [];
        }
        api_json_ok($rows);
        return;
    }

    if ($method === 'POST') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('worksheet.manage_any');
        if (!$canAny && !user_has_permission('worksheet.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        $body = api_read_json_body();
        $r = ws_save_from_payload($pdo, $user, $body, $canAny, $canAny);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        $saved = ws_get_by_id($pdo, $r['id']);
        api_json_ok($saved ? ws_public_row($saved) : ['id' => $r['id']]);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('worksheet.manage_any');
        $body = api_read_json_body();
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('validation_error', '無效的 ID。', 422);
        }
        $row = ws_get_by_id($pdo, $id);
        if (!$row) {
            api_json_error('not_found', '找不到。', 404);
        }
        if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
            api_json_error('forbidden', '無權刪除。', 403);
        }
        ws_delete_by_id($pdo, $id);
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
