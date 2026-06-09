<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/topic_items_lib.php';
require_once dirname(__DIR__, 3) . '/includes/simulations_lib.php';

function api_require_topic_item_manage(): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('topic_item.manage_any') && !user_has_permission('user.manage')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
}

function api_handle_topic_items_list(PDO $pdo, int $topicId): void
{
    api_require_topic_item_manage();
    if ($topicId <= 0) {
        api_json_error('validation_error', '無效的課題 ID。', 422);
    }
    $items = ti_fetch_for_topic($pdo, $topicId, true);
    api_json_ok(['topic_id' => $topicId, 'items' => $items]);
}

function api_handle_topic_items_available(PDO $pdo, int $topicId, string $contentType): void
{
    api_require_topic_item_manage();
    if ($topicId <= 0) {
        api_json_error('validation_error', '無效的課題 ID。', 422);
    }
    if (!ti_validate_content_type($contentType)) {
        api_json_error('validation_error', '無效的內容類型。', 422);
    }
    api_json_ok(ti_fetch_available_for_topic($pdo, $topicId, $contentType));
}

function api_handle_admin_topic_items(PDO $pdo, string $method): void
{
    if ($method === 'POST') {
        api_require_topic_item_manage();
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $action = (string) ($body['action'] ?? 'add');

        if ($action === 'reorder') {
            $topicId = (int) ($body['topic_id'] ?? 0);
            $order = $body['order'] ?? [];
            if (!is_array($order)) {
                $order = [];
            }
            $r = ti_reorder_items($pdo, $topicId, array_map('intval', $order));
            if (!$r['ok']) {
                api_json_error('validation_error', $r['error'] ?? '排序失敗。', 422);
            }
            api_json_ok(['topic_id' => $topicId, 'items' => ti_fetch_for_topic($pdo, $topicId, true)]);
            return;
        }

        if ($action === 'import_all') {
            $topicId = (int) ($body['topic_id'] ?? 0);
            $r = ti_import_all_from_topic($pdo, $topicId);
            if (!$r['ok']) {
                api_json_error('validation_error', $r['error'] ?? '匯入失敗。', 422);
            }
            api_json_ok([
                'topic_id' => $topicId,
                'added' => $r['added'] ?? 0,
                'items' => ti_fetch_for_topic($pdo, $topicId, true),
            ]);
            return;
        }

        if ($action === 'remove') {
            $itemId = (int) ($body['id'] ?? 0);
            if ($itemId <= 0) {
                api_json_error('validation_error', '無效的項目 ID。', 422);
            }
            ti_remove_item($pdo, $itemId);
            api_json_ok(['removed' => true]);
            return;
        }

        $topicId = (int) ($body['topic_id'] ?? 0);
        $contentType = (string) ($body['content_type'] ?? '');
        $contentId = (int) ($body['content_id'] ?? 0);
        $r = ti_add_item($pdo, $topicId, $contentType, $contentId);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '加入失敗。', 422);
        }
        api_json_ok(['id' => $r['id'], 'items' => ti_fetch_for_topic($pdo, $topicId, true)]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
