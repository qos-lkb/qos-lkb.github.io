<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/learning_tools_lib.php';

function api_handle_learning_tools_list_public(PDO $pdo): void
{
    $rows = lt_fetch_published($pdo);
    api_json_ok(array_map('lt_public_row', $rows));
}

function api_handle_learning_tool_get(PDO $pdo, string $slug): void
{
    $row = lt_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到學習工具。', 404);
    }
    $user = current_user();
    if (!api_can_view_learning_tool($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    $out = lt_public_row($row);
    $out['questions'] = lt_fetch_questions($pdo, (int) $row['id'], false);
    api_json_ok($out);
}

function api_handle_learning_tool_answers(PDO $pdo, string $slug): void
{
    $row = lt_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到學習工具。', 404);
    }
    if ($row['status'] !== 'published') {
        $user = current_user();
        if (!api_can_view_learning_tool($row, $user)) {
            api_json_error('forbidden', '無權檢視。', 403);
        }
    }

    $questions = lt_fetch_questions($pdo, (int) $row['id'], true);
    $answers = [];
    foreach ($questions as $q) {
        $correct = null;
        foreach ($q['options'] as $i => $o) {
            if (!empty($o['is_correct'])) {
                $correct = (int) $i;
                break;
            }
        }
        $answers[] = [
            'question_id' => (int) $q['id'],
            'correct_option_index' => $correct,
            'explanation_zh' => $q['explanation_zh'],
            'explanation_en' => $q['explanation_en'],
        ];
    }
    api_json_ok(['slug' => $slug, 'answers' => $answers]);
}

function api_handle_learning_tools_pending(PDO $pdo): void
{
    require_api_permission('learning_tool.manage_any');
    $rows = $pdo->query(
        "SELECT lt.*, u.email AS owner_email FROM learning_tools lt
         LEFT JOIN users u ON u.id = lt.owner_user_id
         WHERE lt.status = 'pending_review' ORDER BY lt.updated_at DESC"
    )->fetchAll() ?: [];
    api_json_ok($rows);
}

function api_handle_admin_learning_tools(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('learning_tool.manage_any');
        if (!$canAny && !user_has_permission('learning_tool.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        if ($canAny) {
            $rows = $pdo->query('SELECT * FROM learning_tools ORDER BY updated_at DESC')->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare('SELECT * FROM learning_tools WHERE owner_user_id = ? ORDER BY updated_at DESC');
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
        $canAny = user_has_permission('learning_tool.manage_any');
        if (!$canAny && !user_has_permission('learning_tool.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        $body = api_read_json_body();
        $r = lt_save_from_payload($pdo, $user, $body, $canAny, $canAny);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        $saved = lt_get_by_id($pdo, $r['id']);
        api_json_ok($saved ? lt_public_row($saved) : ['id' => $r['id']]);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('learning_tool.manage_any');
        $body = api_read_json_body();
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('validation_error', '無效的 ID。', 422);
        }
        $row = lt_get_by_id($pdo, $id);
        if (!$row) {
            api_json_error('not_found', '找不到。', 404);
        }
        if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
            api_json_error('forbidden', '無權刪除。', 403);
        }
        lt_delete_by_id($pdo, $id);
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
