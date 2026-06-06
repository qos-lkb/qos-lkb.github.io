<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/learning_notes_lib.php';

function api_handle_learning_notes_list_public(PDO $pdo): void
{
    $rows = ln_fetch_published($pdo);
    api_json_ok(array_map(function (array $r) {
        $out = ln_public_row($r);
        unset($out['body_zh'], $out['body_en']);
        return $out;
    }, $rows));
}

function api_handle_learning_note_get(PDO $pdo, string $slug): void
{
    $row = ln_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到學習筆記。', 404);
    }
    $user = current_user();
    if (!api_can_view_learning_note($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    api_json_ok(ln_public_row(ln_enrich_row_labels($pdo, $row)));
}

function api_handle_learning_notes_pending(PDO $pdo): void
{
    require_api_permission('learning_note.manage_any');
    $rows = $pdo->query(
        "SELECT ln.*, u.email AS owner_email FROM learning_notes ln
         LEFT JOIN users u ON u.id = ln.owner_user_id
         WHERE ln.status = 'pending_review' ORDER BY ln.updated_at DESC"
    )->fetchAll() ?: [];
    api_json_ok($rows);
}

function api_handle_admin_learning_notes(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('learning_note.manage_any');
        if (!$canAny && !user_has_permission('learning_note.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        if ($canAny) {
            $rows = $pdo->query('SELECT * FROM learning_notes ORDER BY updated_at DESC')->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare('SELECT * FROM learning_notes WHERE owner_user_id = ? ORDER BY updated_at DESC');
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
        $canAny = user_has_permission('learning_note.manage_any');
        if (!$canAny && !user_has_permission('learning_note.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        $body = api_read_json_body();
        $r = ln_save_from_payload($pdo, $user, $body, $canAny, $canAny);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        $saved = ln_get_by_id($pdo, $r['id']);
        api_json_ok($saved ? ln_public_row(ln_enrich_row_labels($pdo, $saved)) : ['id' => $r['id']]);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('learning_note.manage_any');
        $body = api_read_json_body();
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('validation_error', '無效的 ID。', 422);
        }
        $row = ln_get_by_id($pdo, $id);
        if (!$row) {
            api_json_error('not_found', '找不到。', 404);
        }
        if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
            api_json_error('forbidden', '無權刪除。', 403);
        }
        ln_delete_by_id($pdo, $id);
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
