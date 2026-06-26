<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/user_names_lib.php';

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
    $nameZh = trim((string) ($post['name_zh'] ?? ''));
    $nameEn = trim((string) ($post['name_en'] ?? ''));
    $password = (string) ($post['password'] ?? '');
    $isActive = isset($post['is_active']) ? 1 : 0;
    $roleIds = isset($post['roles']) && is_array($post['roles']) ? array_map('intval', $post['roles']) : [];

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => '請輸入有效電郵。'];
    }
    $nameValid = account_validate_names($nameZh, $nameEn);
    if (!$nameValid['ok']) {
        return $nameValid;
    }
    $displayName = account_sync_display_name($nameZh, $nameEn);

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
            $upd = $pdo->prepare('UPDATE users SET email = ?, name_zh = ?, name_en = ?, display_name = ?, is_active = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $upd->execute([$email, $nameZh, $nameEn, $displayName, $isActive, $hash, $id]);
        } else {
            $upd = $pdo->prepare('UPDATE users SET email = ?, name_zh = ?, name_en = ?, display_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $upd->execute([$email, $nameZh, $nameEn, $displayName, $isActive, $id]);
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
        $ins = $pdo->prepare('INSERT INTO users (email, password_hash, name_zh, name_en, display_name, is_active) VALUES (?, ?, ?, ?, ?, ?)');
        $ins->execute([$email, $hash, $nameZh, $nameEn, $displayName, $isActive]);
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
 * 列表內聯編輯：中文名、英文名、角色。
 *
 * @param array<string, mixed> $post 期望 id, name_zh, name_en, roles[]
 * @return array{ok:bool,error?:string,name_zh?:string,name_en?:string,role_names?:string}
 */
function admin_inline_update_user(PDO $pdo, array $post, int $actingUserId): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $id = (int) ($post['id'] ?? 0);
    if ($id <= 0) {
        return ['ok' => false, 'error' => '無效的使用者。'];
    }

    $stmt = $pdo->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        return ['ok' => false, 'error' => '找不到使用者。'];
    }
    if ($existing['email'] === 'system@science-sims.internal') {
        return ['ok' => false, 'error' => '不可編輯系統帳號。'];
    }

    $nameZh = trim((string) ($post['name_zh'] ?? ''));
    $nameEn = trim((string) ($post['name_en'] ?? ''));
    $nameValid = account_validate_names($nameZh, $nameEn);
    if (!$nameValid['ok']) {
        return $nameValid;
    }

    $validRoleIds = array_map('intval', array_column(admin_fetch_roles_with_permissions($pdo), 'id'));
    $rawRoleIds = isset($post['roles']) && is_array($post['roles']) ? array_map('intval', $post['roles']) : [];
    $roleIds = array_values(array_unique(array_filter(
        $rawRoleIds,
        static fn (int $rid): bool => in_array($rid, $validRoleIds, true)
    )));

    $displayName = account_sync_display_name($nameZh, $nameEn);

    try {
        $pdo->beginTransaction();
        $pdo->prepare(
            'UPDATE users SET name_zh = ?, name_en = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )->execute([$nameZh, $nameEn, $displayName, $id]);

        $pdo->prepare('DELETE FROM user_roles WHERE user_id = ?')->execute([$id]);
        $ins = $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)');
        foreach ($roleIds as $rid) {
            if ($rid > 0) {
                $ins->execute([$id, $rid]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '儲存失敗。'];
    }

    if ($actingUserId === $id) {
        auth_session_start();
        $_SESSION['name_zh'] = $nameZh;
        $_SESSION['name_en'] = $nameEn;
        $_SESSION['display_name'] = $displayName;
        auth_refresh_permissions($actingUserId);
    }

    $roleStmt = $pdo->prepare(
        'SELECT GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ", ") AS role_names
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?'
    );
    $roleStmt->execute([$id]);
    $roleCsv = (string) ($roleStmt->fetchColumn() ?: '');
    $roleDisplay = admin_format_role_names($roleCsv);

    return [
        'ok' => true,
        'name_zh' => $nameZh,
        'name_en' => $nameEn,
        'role_names' => $roleDisplay !== '' ? $roleDisplay : '—',
        'role_ids' => $roleIds,
    ];
}

/**
 * @return array<string, string> slug => 顯示名稱
 */
function admin_role_labels(): array
{
    return [
        'admin' => '管理員',
        'teacher' => '教師',
        'contributor' => '貢獻者',
        'student' => '學生',
        'user' => '教師', // 舊 slug，migration 前相容
    ];
}

/**
 * @return array<string, string> slug => 簡短說明
 */
function admin_role_descriptions(): array
{
    return [
        'admin' => '擁有平台完整管理權限（依下方勾選）。',
        'teacher' => '教職員帳號；可瀏覽前台並依權限管理教學內容。',
        'contributor' => '可提交模擬或學習資源，通常需經審核後發佈。',
        'student' => '學生帳號；預設僅使用前台學習功能，無後台管理權限。',
    ];
}

function admin_role_display_name(string $name): string
{
    $key = strtolower(trim($name));
    return admin_role_labels()[$key] ?? $name;
}

/**
 * @return list<string>
 */
function admin_role_sort_order(): array
{
    return ['admin', 'teacher', 'contributor', 'student'];
}

/**
 * @return array<string, array{label:string,prefixes:list<string>}>
 */
function admin_permission_groups(): array
{
    return [
        'platform' => [
            'label' => '平台管理',
            'prefixes' => ['user.'],
        ],
        'simulation' => [
            'label' => '模擬程式',
            'prefixes' => ['simulation.'],
        ],
        'content' => [
            'label' => '學習內容',
            'prefixes' => [
                'learning_tool.',
                'article.',
                'learning_note.',
                'worksheet.',
                'question_bank.',
                'learning_video.',
            ],
        ],
        'course' => [
            'label' => '課程編排',
            'prefixes' => ['topic_item.'],
        ],
        'class' => [
            'label' => '班級與學習',
            'prefixes' => ['class.', 'student.'],
        ],
    ];
}

function admin_permission_group_key(string $permName): string
{
    foreach (admin_permission_groups() as $key => $group) {
        foreach ($group['prefixes'] as $prefix) {
            if (str_starts_with($permName, $prefix)) {
                return $key;
            }
        }
    }
    return 'other';
}

/**
 * @return array<string, array{label:string,permissions:list<array{id:int,name:string,description:?string,label:string}>}>
 */
function admin_permissions_grouped(PDO $pdo): array
{
    $groups = admin_permission_groups();
    $grouped = [];
    foreach ($groups as $key => $meta) {
        $grouped[$key] = ['label' => $meta['label'], 'permissions' => []];
    }
    $grouped['other'] = ['label' => '其他', 'permissions' => []];

    foreach (admin_fetch_permissions($pdo) as $perm) {
        $key = admin_permission_group_key((string) $perm['name']);
        $grouped[$key]['permissions'][] = $perm;
    }

    foreach ($grouped as $key => $meta) {
        if ($meta['permissions'] === [] && $key !== 'other') {
            unset($grouped[$key]);
        }
    }
    if ($grouped['other']['permissions'] === []) {
        unset($grouped['other']);
    }

    return $grouped;
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
        'question_bank.manage_any' => '管理全部試題庫',
        'question_bank.manage_own' => '管理自己的試題庫',
        'learning_video.manage_any' => '管理全部學習影片',
        'learning_video.manage_own' => '管理自己的學習影片',
        'topic_item.manage_any' => '管理自學課程編排',
        'class.manage_any' => '管理全部班級',
        'class.manage_own' => '管理自己的班級',
        'student.profile_own' => '管理自己的學生檔案',
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

    $order = admin_role_sort_order();
    usort($out, static function (array $a, array $b) use ($order): int {
        $ia = array_search(strtolower($a['name']), $order, true);
        $ib = array_search(strtolower($b['name']), $order, true);
        $ia = $ia === false ? 999 : $ia;
        $ib = $ib === false ? 999 : $ib;
        if ($ia !== $ib) {
            return $ia <=> $ib;
        }
        return strcasecmp($a['name'], $b['name']);
    });

    return $out;
}

/**
 * 將逗號分隔的角色 slug 轉為顯示名稱。
 */
function admin_format_role_names(?string $csv): string
{
    if ($csv === null || trim($csv) === '') {
        return '';
    }
    $parts = array_map('trim', explode(',', $csv));
    $labels = array_map('admin_role_display_name', $parts);
    return implode('、', $labels);
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

    admin_apply_role_permissions($pdo, $roleId, $permIds);

    auth_refresh_permissions($actingUserId);

    return ['ok' => true];
}

function admin_apply_role_permissions(PDO $pdo, int $roleId, array $permIds): void
{
    $pdo->prepare('DELETE FROM role_permissions WHERE role_id = ?')->execute([$roleId]);
    $ins = $pdo->prepare('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    foreach ($permIds as $pid) {
        if ($pid > 0) {
            $ins->execute([$roleId, $pid]);
        }
    }
}

/**
 * 權限矩陣：一次儲存所有角色的勾選結果。
 *
 * @param array<string, mixed> $post 期望 role_perms[role_id][] = permission_id
 * @return array{ok:bool,error?:string}
 */
function admin_save_all_role_permissions_from_post(PDO $pdo, array $post, int $actingUserId): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $roles = admin_fetch_roles_with_permissions($pdo);
    $validPermIds = array_map('intval', array_column(admin_fetch_permissions($pdo), 'id'));
    $raw = $post['role_perms'] ?? [];
    if (!is_array($raw)) {
        $raw = [];
    }

    $updates = [];
    foreach ($roles as $role) {
        $roleId = (int) $role['id'];
        $rawIds = isset($raw[$roleId]) && is_array($raw[$roleId]) ? array_map('intval', $raw[$roleId]) : [];
        $permIds = array_values(array_unique(array_filter(
            $rawIds,
            static fn (int $id): bool => in_array($id, $validPermIds, true)
        )));

        if (!admin_acting_user_keeps_user_manage($pdo, $actingUserId, $roleId, $permIds)) {
            return [
                'ok' => false,
                'error' => '不可移除「' . admin_role_display_name((string) $role['name']) . '」的「管理使用者與角色」權限，否則您將無法再存取後台。',
            ];
        }
        $updates[$roleId] = $permIds;
    }

    try {
        $pdo->beginTransaction();
        foreach ($updates as $roleId => $permIds) {
            admin_apply_role_permissions($pdo, (int) $roleId, $permIds);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '儲存失敗。'];
    }

    auth_refresh_permissions($actingUserId);

    return ['ok' => true];
}
