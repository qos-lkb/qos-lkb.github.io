<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

/**
 * @param array<string, string> $post
 * @return array{ok:bool,error?:string,id?:int}
 */
function admin_save_user_from_post(PDO $pdo, array $post, int $actingUserId): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $id = isset($post['id']) ? (int) $post['id'] : 0;
    $email = trim((string) ($post['email'] ?? ''));
    $displayName = trim((string) ($post['display_name'] ?? ''));
    $password = (string) ($post['password'] ?? '');
    $isActive = isset($post['is_active']) ? 1 : 0;
    $roleIds = isset($post['roles']) && is_array($post['roles']) ? array_map('intval', $post['roles']) : [];

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => '請輸入有效電郵。'];
    }
    if ($displayName === '') {
        return ['ok' => false, 'error' => '請輸入顯示名稱。'];
    }

    if ($id === 0 && strlen($password) < 8) {
        return ['ok' => false, 'error' => '新使用者密碼至少 8 字元。'];
    }

    if ($id > 0) {
        $stmt = $pdo->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            return ['ok' => false, 'error' => '找不到使用者。'];
        }
        if ($existing['email'] === 'system@science-sims.internal') {
            return ['ok' => false, 'error' => '不可編輯系統帳號。'];
        }

        if ($actingUserId === $id && $isActive === 0) {
            return ['ok' => false, 'error' => '不可停用自己。'];
        }

        if ($password !== '' && strlen($password) < 8) {
            return ['ok' => false, 'error' => '密碼至少 8 字元。'];
        }

        if ($password !== '') {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $upd = $pdo->prepare('UPDATE users SET email = ?, display_name = ?, is_active = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $upd->execute([$email, $displayName, $isActive, $hash, $id]);
        } else {
            $upd = $pdo->prepare('UPDATE users SET email = ?, display_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $upd->execute([$email, $displayName, $isActive, $id]);
        }

        $pdo->prepare('DELETE FROM user_roles WHERE user_id = ?')->execute([$id]);
        foreach ($roleIds as $rid) {
            if ($rid > 0) {
                $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$id, $rid]);
            }
        }

        return ['ok' => true, 'id' => $id];
    }

    // 新增
    $hash = password_hash($password, PASSWORD_DEFAULT);
    try {
        $ins = $pdo->prepare('INSERT INTO users (email, password_hash, display_name, is_active) VALUES (?, ?, ?, ?)');
        $ins->execute([$email, $hash, $displayName, $isActive]);
        $newId = (int) $pdo->lastInsertId();
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '建立失敗（可能電郵重複）。'];
    }

    foreach ($roleIds as $rid) {
        if ($rid > 0) {
            $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$newId, $rid]);
        }
    }

    return ['ok' => true, 'id' => $newId];
}

/**
 * @return array{ok:bool,error?:string}
 */
function admin_delete_user(PDO $pdo, array $post, int $actingUserId): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }
    $id = (int) ($post['id'] ?? 0);
    if ($id <= 0 || $id === $actingUserId) {
        return ['ok' => false, 'error' => '無法刪除此使用者。'];
    }

    $stmt = $pdo->prepare('SELECT email FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $em = $stmt->fetchColumn();
    if ($em === false) {
        return ['ok' => false, 'error' => '找不到使用者。'];
    }
    if ($em === 'system@science-sims.internal') {
        return ['ok' => false, 'error' => '不可刪除系統帳號。'];
    }

    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    return ['ok' => true];
}

/**
 * @return array<string, string>
 */
function admin_permission_labels(): array
{
    return [
        'user.manage' => '管理使用者與角色',
        'simulation.manage_any' => '管理全部模擬',
        'simulation.manage_own' => '管理自己的模擬',
        'learning_tool.manage_any' => '管理全部互動學習工具',
        'learning_tool.manage_own' => '管理自己的互動學習工具',
        'article.manage_any' => '管理全部科學文章',
        'article.manage_own' => '管理自己的科學文章',
        'learning_note.manage_any' => '管理全部學習筆記',
        'learning_note.manage_own' => '管理自己的學習筆記',
        'worksheet.manage_any' => '管理全部工作紙',
        'worksheet.manage_own' => '管理自己的工作紙',
    ];
}

/**
 * @return array<int, array{id:int,name:string,description:?string,label:string}>
 */
function admin_fetch_permissions(PDO $pdo): array
{
    $labels = admin_permission_labels();
    $rows = $pdo->query('SELECT id, name, description FROM permissions ORDER BY name ASC')->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $name = (string) $row['name'];
        $out[] = [
            'id' => (int) $row['id'],
            'name' => $name,
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'label' => $labels[$name] ?? $name,
        ];
    }
    return $out;
}

/**
 * @return array<int, array{id:int,name:string,permission_ids:int[]}>
 */
function admin_fetch_roles_with_permissions(PDO $pdo): array
{
    $roles = $pdo->query('SELECT id, name FROM roles ORDER BY name ASC')->fetchAll() ?: [];
    $permMap = [];
    foreach ($pdo->query('SELECT role_id, permission_id FROM role_permissions')->fetchAll() ?: [] as $rp) {
        $rid = (int) $rp['role_id'];
        $permMap[$rid][] = (int) $rp['permission_id'];
    }
    $out = [];
    foreach ($roles as $role) {
        $id = (int) $role['id'];
        $out[] = [
            'id' => $id,
            'name' => (string) $role['name'],
            'permission_ids' => $permMap[$id] ?? [],
        ];
    }
    return $out;
}

function admin_permission_id_by_name(PDO $pdo, string $name): int
{
    $stmt = $pdo->prepare('SELECT id FROM permissions WHERE name = ? LIMIT 1');
    $stmt->execute([$name]);
    return (int) ($stmt->fetchColumn() ?: 0);
}

function admin_acting_user_keeps_user_manage(PDO $pdo, int $actingUserId, int $editRoleId, array $newPermIds): bool
{
    $userManageId = admin_permission_id_by_name($pdo, 'user.manage');
    if ($userManageId <= 0 || in_array($userManageId, $newPermIds, true)) {
        return true;
    }

    $rolesStmt = $pdo->prepare('SELECT role_id FROM user_roles WHERE user_id = ?');
    $rolesStmt->execute([$actingUserId]);
    $userRoleIds = array_map('intval', $rolesStmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    if (!in_array($editRoleId, $userRoleIds, true)) {
        return true;
    }

    $check = $pdo->prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ? LIMIT 1');
    foreach ($userRoleIds as $rid) {
        if ($rid === $editRoleId) {
            continue;
        }
        $check->execute([$rid, $userManageId]);
        if ($check->fetch()) {
            return true;
        }
    }

    return false;
}

/**
 * @param array<string, mixed> $post
 * @return array{ok:bool,error?:string}
 */
function admin_save_role_permissions_from_post(PDO $pdo, array $post, int $actingUserId): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $roleId = (int) ($post['role_id'] ?? 0);
    if ($roleId <= 0) {
        return ['ok' => false, 'error' => '無效的角色。'];
    }

    $roleStmt = $pdo->prepare('SELECT id, name FROM roles WHERE id = ? LIMIT 1');
    $roleStmt->execute([$roleId]);
    $role = $roleStmt->fetch();
    if (!$role) {
        return ['ok' => false, 'error' => '找不到角色。'];
    }

    $rawIds = isset($post['permissions']) && is_array($post['permissions'])
        ? array_map('intval', $post['permissions'])
        : [];
    $validIds = array_map('intval', array_column(admin_fetch_permissions($pdo), 'id'));
    $permIds = array_values(array_unique(array_filter($rawIds, static fn (int $id): bool => in_array($id, $validIds, true))));

    if (!admin_acting_user_keeps_user_manage($pdo, $actingUserId, $roleId, $permIds)) {
        return ['ok' => false, 'error' => '不可移除此角色上的「管理使用者與角色」權限，否則您將無法再存取後台。'];
    }

    $pdo->prepare('DELETE FROM role_permissions WHERE role_id = ?')->execute([$roleId]);
    $ins = $pdo->prepare('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    foreach ($permIds as $pid) {
        if ($pid > 0) {
            $ins->execute([$roleId, $pid]);
        }
    }

    auth_refresh_permissions($actingUserId);

    return ['ok' => true];
}
