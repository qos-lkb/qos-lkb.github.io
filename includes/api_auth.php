<?php

declare(strict_types=1);

require_once __DIR__ . '/api_response.php';

/**
 * @return array{id:int,email:string,display_name:string}
 */
function require_api_user(): array
{
    $u = current_user();
    if ($u === null) {
        api_json_error('unauthorized', '請先登入。', 401);
    }
    return $u;
}

function require_api_permission(string $permission): array
{
    $u = require_api_user();
    auth_refresh_permissions($u['id']);
    if (!user_has_permission($permission)) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    return $u;
}

function api_user_payload(?array $user = null): ?array
{
    if ($user === null) {
        $user = current_user();
    }
    if ($user === null) {
        return null;
    }
    auth_refresh_permissions($user['id']);
    return [
        'id' => $user['id'],
        'email' => $user['email'],
        'display_name' => $user['display_name'],
        'permissions' => array_values($_SESSION['permissions'] ?? []),
        'csrf_token' => csrf_token(),
    ];
}

function api_can_manage_simulation(array $sim, array $user): bool
{
    if (user_has_permission('simulation.manage_any')) {
        return true;
    }
    if (!user_has_permission('simulation.manage_own')) {
        return false;
    }
    return $sim['owner_user_id'] !== null && (int) $sim['owner_user_id'] === $user['id'];
}

function api_can_view_simulation(array $sim, ?array $user): bool
{
    if ($sim['status'] === 'published') {
        return true;
    }
    if ($user === null) {
        return false;
    }
    return api_can_manage_simulation($sim, $user);
}

function api_can_manage_learning_tool(array $row, array $user): bool
{
    if (user_has_permission('learning_tool.manage_any')) {
        return true;
    }
    if (!user_has_permission('learning_tool.manage_own')) {
        return false;
    }
    return $row['owner_user_id'] !== null && (int) $row['owner_user_id'] === $user['id'];
}

function api_can_view_learning_tool(array $row, ?array $user): bool
{
    if ($row['status'] === 'published') {
        return true;
    }
    if ($user === null) {
        return false;
    }
    return api_can_manage_learning_tool($row, $user);
}

function api_can_manage_article(array $row, array $user): bool
{
    if (user_has_permission('article.manage_any')) {
        return true;
    }
    if (!user_has_permission('article.manage_own')) {
        return false;
    }
    return $row['owner_user_id'] !== null && (int) $row['owner_user_id'] === $user['id'];
}

function api_can_view_article(array $row, ?array $user): bool
{
    if ($row['status'] === 'published') {
        return true;
    }
    if ($user === null) {
        return false;
    }
    return api_can_manage_article($row, $user);
}
