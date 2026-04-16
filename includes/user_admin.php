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
