<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/spa_nav_lib.php';

/**
 * Public: visible top-nav items for the current session (guest or logged-in roles).
 */
function api_handle_nav_menu(PDO $pdo): void
{
    $user = current_user();
    if ($user !== null) {
        $payload = api_user_payload($user);
        $enriched = $payload ?? $user;
        api_json_ok(spa_nav_public_payload($pdo, $enriched));
        return;
    }
    api_json_ok(spa_nav_public_payload($pdo, null));
}

/**
 * Admin: full visibility matrix.
 */
function api_handle_admin_nav_menu(PDO $pdo, string $method): void
{
    require_api_user();
    if (!user_has_permission('user.manage')) {
        api_json_error('forbidden', '沒有管理平台設定的權限。', 403);
    }

    if ($method === 'GET') {
        api_json_ok([
            'items' => spa_nav_ordered_item_defs($pdo),
            'audiences' => spa_nav_audience_defs(),
            'matrix' => spa_nav_get_matrix($pdo),
            'order' => spa_nav_ordered_keys($pdo),
            'table_ready' => spa_nav_table_exists($pdo),
            'order_table_ready' => spa_nav_order_table_exists($pdo),
        ]);
        return;
    }

    if ($method === 'PUT' || $method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $vis = isset($body['matrix']) && is_array($body['matrix']) ? $body['matrix'] : [];
        // Normalise checkbox-style payload: truthy values
        $posted = [];
        foreach (spa_nav_item_keys() as $item) {
            $posted[$item] = [];
            foreach (spa_nav_audience_keys() as $audience) {
                $posted[$item][$audience] = !empty($vis[$item][$audience]) ? '1' : '';
            }
        }
        $r = spa_nav_save_matrix($pdo, $posted);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
        }

        if (isset($body['order']) && is_array($body['order'])) {
            $orderKeys = [];
            foreach ($body['order'] as $k) {
                if (is_string($k) || is_int($k)) {
                    $orderKeys[] = (string) $k;
                }
            }
            $ro = spa_nav_save_order($pdo, $orderKeys);
            if (!$ro['ok']) {
                api_json_error('validation_error', $ro['error'] ?? '儲存排序失敗。', 422);
            }
        }

        api_json_ok([
            'saved' => true,
            'matrix' => spa_nav_get_matrix($pdo),
            'order' => spa_nav_ordered_keys($pdo),
            'items' => spa_nav_ordered_item_defs($pdo),
        ]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的方法。', 405);
}
