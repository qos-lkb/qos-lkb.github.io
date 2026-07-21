<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/summer_homework_lib.php';

function api_handle_summer_homework_list(PDO $pdo): void
{
    $form = isset($_GET['form']) ? (string) $_GET['form'] : null;
    if ($form !== null && $form !== '1' && $form !== '2') {
        $form = null;
    }
    $rows = sh_fetch_published($pdo, $form);
    $user = current_user();
    $out = [];
    foreach ($rows as $row) {
        $item = sh_public_row($row);
        unset($item['body_zh'], $item['body_en']);
        if ($user !== null) {
            $item['progress'] = sh_user_progress_for_item($pdo, (int) $user['id'], (int) $row['id']);
        } else {
            $item['progress'] = null;
        }
        $out[] = $item;
    }
    api_json_ok(['items' => $out]);
}

function api_handle_summer_homework_get(PDO $pdo, string $slug): void
{
    $row = sh_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到暑期功課。', 404);
    }
    $user = current_user();
    if (!sh_can_view_item($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    $out = sh_public_row($row);
    $out['questions'] = sh_fetch_questions($pdo, (int) $row['id'], false);
    if ($user !== null) {
        $out['progress'] = sh_user_progress_for_item($pdo, (int) $user['id'], (int) $row['id']);
    } else {
        $out['progress'] = null;
    }
    api_json_ok($out);
}

function api_handle_summer_homework_submit(PDO $pdo, string $slug): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();

    $row = sh_get_by_slug($pdo, $slug);
    if (!$row || $row['status'] !== 'published') {
        api_json_error('not_found', '找不到已發佈的暑期功課。', 404);
    }

    $body = api_read_json_body();
    $responses = isset($body['responses']) && is_array($body['responses']) ? $body['responses'] : [];
    $result = sh_submit_attempt($pdo, (int) $user['id'], (int) $row['id'], $responses);
    if (!$result['ok']) {
        api_json_error('submit_failed', $result['error'] ?? '提交失敗。', 400);
    }
    api_json_ok($result['result']);
}

function api_handle_admin_summer_homework(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('summer_homework.manage_any');
        $canOwn = user_has_permission('summer_homework.manage_own');
        if (!$canAny && !$canOwn) {
            api_json_error('forbidden', '無權限。', 403);
        }
        if ($canAny) {
            $rows = $pdo->query(
                'SELECT * FROM summer_homework_items ORDER BY form_level ASC, list_sort_order ASC, updated_at DESC'
            )->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare(
                'SELECT * FROM summer_homework_items WHERE owner_user_id = ? ORDER BY form_level ASC, list_sort_order ASC, updated_at DESC'
            );
            $stmt->execute([(int) $user['id']]);
            $rows = $stmt->fetchAll() ?: [];
        }
        api_json_ok(array_map('sh_public_row', $rows));
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
    if (!sh_can_manage_row($user, $row)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }
    $out = sh_public_row($row);
    $out['questions'] = sh_fetch_questions($pdo, $id, true);
    api_json_ok($out);
}
