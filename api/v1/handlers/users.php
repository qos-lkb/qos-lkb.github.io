<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/user_admin.php';
require_once dirname(__DIR__, 3) . '/includes/auth.php';

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function api_admin_user_public_row(array $row): array
{
    $roleIds = [];
    if (isset($row['role_ids']) && is_array($row['role_ids'])) {
        $roleIds = array_values(array_map('intval', $row['role_ids']));
    } elseif (isset($row['role_ids']) && is_string($row['role_ids']) && $row['role_ids'] !== '') {
        $roleIds = array_values(array_filter(array_map('intval', explode(',', $row['role_ids']))));
    }

    $roleNamesCsv = (string) ($row['role_names'] ?? '');
    $roleDisplay = admin_format_role_names($roleNamesCsv);

    return [
        'id' => (int) $row['id'],
        'email' => (string) $row['email'],
        'name_zh' => (string) ($row['name_zh'] ?? ''),
        'name_en' => (string) ($row['name_en'] ?? ''),
        'display_name' => (string) ($row['display_name'] ?? ''),
        'is_active' => (bool) (int) ($row['is_active'] ?? 0),
        'is_system' => ((string) $row['email']) === 'system@science-sims.internal',
        'role_ids' => $roleIds,
        'role_names' => $roleDisplay !== '' ? $roleDisplay : null,
        'role_slugs' => $roleNamesCsv !== ''
            ? array_values(array_filter(array_map('trim', explode(',', $roleNamesCsv))))
            : [],
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function api_admin_users_fetch_list(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT u.id, u.email, u.name_zh, u.name_en, u.display_name, u.is_active,
                GROUP_CONCAT(r.id ORDER BY r.id SEPARATOR ",") AS role_ids,
                GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ", ") AS role_names
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         GROUP BY u.id, u.email, u.name_zh, u.name_en, u.display_name, u.is_active
         ORDER BY u.id ASC'
    )->fetchAll() ?: [];

    return array_map('api_admin_user_public_row', $rows);
}

/**
 * @return array<string, mixed>|null
 */
function api_admin_users_fetch_one(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT u.id, u.email, u.name_zh, u.name_en, u.display_name, u.is_active,
                GROUP_CONCAT(r.id ORDER BY r.id SEPARATOR ",") AS role_ids,
                GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ", ") AS role_names
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = ?
         GROUP BY u.id, u.email, u.name_zh, u.name_en, u.display_name, u.is_active
         LIMIT 1'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? api_admin_user_public_row($row) : null;
}

/**
 * @param array<string, mixed> $body
 * @return array<string, mixed>
 */
function api_admin_user_body_to_post(array $body, ?string $csrf): array
{
    $post = [
        'csrf' => $csrf ?? '',
        'id' => (int) ($body['id'] ?? 0),
        'email' => (string) ($body['email'] ?? ''),
        'name_zh' => (string) ($body['name_zh'] ?? ''),
        'name_en' => (string) ($body['name_en'] ?? ''),
        'roles' => isset($body['roles']) && is_array($body['roles'])
            ? array_map('intval', $body['roles'])
            : (isset($body['role_ids']) && is_array($body['role_ids'])
                ? array_map('intval', $body['role_ids'])
                : []),
    ];
    // Match form checkbox semantics: key present ⇒ active.
    if (!empty($body['is_active'])) {
        $post['is_active'] = 1;
    }
    return $post;
}

function api_handle_admin_users(PDO $pdo, string $method): void
{
    require_api_permission('user.manage');

    if ($method === 'GET') {
        $roles = admin_fetch_roles_with_permissions($pdo);
        $roleOptions = [];
        foreach ($roles as $role) {
            $roleOptions[] = [
                'id' => (int) $role['id'],
                'slug' => (string) $role['name'],
                'label' => admin_role_display_name((string) $role['name']),
                'description' => admin_role_descriptions()[strtolower((string) $role['name'])] ?? null,
                'permission_ids' => $role['permission_ids'],
            ];
        }
        api_json_ok([
            'users' => api_admin_users_fetch_list($pdo),
            'roles' => $roleOptions,
            'can_impersonate' => auth_user_is_admin($pdo, (int) (current_user()['id'] ?? 0)),
        ]);
        return;
    }

    if ($method === 'POST') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $post = api_admin_user_body_to_post($body, api_request_csrf());
        $r = admin_save_user_from_post($pdo, $post, $user['id']);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
        }
        $saved = api_admin_users_fetch_one($pdo, (int) $r['id']);
        api_json_ok(['user' => $saved]);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $post = [
            'csrf' => api_request_csrf() ?? '',
            'id' => (int) ($body['id'] ?? 0),
        ];
        $r = admin_delete_user($pdo, $post, $user['id']);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '刪除失敗。', 422);
        }
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_user_item(PDO $pdo, int $id, string $method): void
{
    require_api_permission('user.manage');

    if ($method === 'GET') {
        $user = api_admin_users_fetch_one($pdo, $id);
        if ($user === null) {
            api_json_error('not_found', '找不到使用者。', 404);
        }
        $roles = admin_fetch_roles_with_permissions($pdo);
        $roleOptions = [];
        foreach ($roles as $role) {
            $roleOptions[] = [
                'id' => (int) $role['id'],
                'slug' => (string) $role['name'],
                'label' => admin_role_display_name((string) $role['name']),
            ];
        }
        api_json_ok([
            'user' => $user,
            'roles' => $roleOptions,
            'can_impersonate' => auth_user_is_admin($pdo, (int) (current_user()['id'] ?? 0)),
        ]);
        return;
    }

    if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
        $acting = require_api_user();
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $body['id'] = $id;
        $post = api_admin_user_body_to_post($body, api_request_csrf());
        $r = admin_save_user_from_post($pdo, $post, $acting['id']);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
        }
        api_json_ok(['user' => api_admin_users_fetch_one($pdo, $id)]);
        return;
    }

    if ($method === 'DELETE') {
        $acting = require_api_user();
        api_verify_csrf_or_fail();
        $post = [
            'csrf' => api_request_csrf() ?? '',
            'id' => $id,
        ];
        $r = admin_delete_user($pdo, $post, $acting['id']);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '刪除失敗。', 422);
        }
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_user_inline(PDO $pdo, int $id): void
{
    $acting = require_api_permission('user.manage');
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $post = [
        'csrf' => api_request_csrf() ?? '',
        'id' => $id,
        'name_zh' => (string) ($body['name_zh'] ?? ''),
        'name_en' => (string) ($body['name_en'] ?? ''),
        'roles' => isset($body['roles']) && is_array($body['roles'])
            ? array_map('intval', $body['roles'])
            : (isset($body['role_ids']) && is_array($body['role_ids'])
                ? array_map('intval', $body['role_ids'])
                : []),
    ];
    $r = admin_inline_update_user($pdo, $post, $acting['id']);
    if (!$r['ok']) {
        api_json_error('validation_error', $r['error'] ?? '更新失敗。', 422);
    }
    api_json_ok([
        'name_zh' => $r['name_zh'] ?? '',
        'name_en' => $r['name_en'] ?? '',
        'role_names' => $r['role_names'] ?? '—',
        'role_ids' => $r['role_ids'] ?? [],
        'user' => api_admin_users_fetch_one($pdo, $id),
    ]);
}

function api_handle_admin_user_impersonate(PDO $pdo, int $id): void
{
    require_api_user();
    api_verify_csrf_or_fail();
    $r = auth_start_impersonation($pdo, $id);
    if (!$r['ok']) {
        api_json_error('forbidden', $r['error'] ?? '模仿失敗。', 403);
    }
    api_json_ok(['impersonating' => true, 'user' => api_user_payload()]);
}

function api_handle_admin_permissions(PDO $pdo, string $method): void
{
    require_api_permission('user.manage');

    if ($method === 'GET') {
        $roles = admin_fetch_roles_with_permissions($pdo);
        $outRoles = [];
        foreach ($roles as $role) {
            $slug = (string) $role['name'];
            $outRoles[] = [
                'id' => (int) $role['id'],
                'slug' => $slug,
                'label' => admin_role_display_name($slug),
                'description' => admin_role_descriptions()[strtolower($slug)] ?? null,
                'permission_ids' => $role['permission_ids'],
            ];
        }
        api_json_ok([
            'roles' => $outRoles,
            'permissions' => admin_fetch_permissions($pdo),
            'groups' => admin_permissions_grouped($pdo),
        ]);
        return;
    }

    if ($method === 'PUT' || $method === 'POST') {
        $acting = require_api_user();
        api_verify_csrf_or_fail();
        $body = api_read_json_body();

        // Prefer full matrix: role_perms[roleId] = [permIds]
        if (isset($body['role_perms']) && is_array($body['role_perms'])) {
            $post = [
                'csrf' => api_request_csrf() ?? '',
                'role_perms' => $body['role_perms'],
            ];
            $r = admin_save_all_role_permissions_from_post($pdo, $post, $acting['id']);
            if (!$r['ok']) {
                api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
            }
            api_json_ok(['saved' => true, 'roles' => admin_fetch_roles_with_permissions($pdo)]);
            return;
        }

        // Single role update
        $post = [
            'csrf' => api_request_csrf() ?? '',
            'role_id' => (int) ($body['role_id'] ?? 0),
            'permissions' => isset($body['permissions']) && is_array($body['permissions'])
                ? array_map('intval', $body['permissions'])
                : (isset($body['permission_ids']) && is_array($body['permission_ids'])
                    ? array_map('intval', $body['permission_ids'])
                    : []),
        ];
        $r = admin_save_role_permissions_from_post($pdo, $post, $acting['id']);
        if (!$r['ok']) {
            api_json_error('validation_error', $r['error'] ?? '儲存失敗。', 422);
        }
        api_json_ok(['saved' => true, 'roles' => admin_fetch_roles_with_permissions($pdo)]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
