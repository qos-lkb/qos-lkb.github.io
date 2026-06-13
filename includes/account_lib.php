<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

/**
 * @return array{ok:bool,error?:string}
 */
function account_update_profile(PDO $pdo, int $userId, string $displayName): array
{
    $displayName = trim($displayName);
    if ($displayName === '') {
        return ['ok' => false, 'error' => '請輸入顯示名稱。'];
    }
    if (mb_strlen($displayName) > 120) {
        return ['ok' => false, 'error' => '顯示名稱過長（最多 120 字元）。'];
    }

    $stmt = $pdo->prepare('SELECT email FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => '找不到使用者。'];
    }
    if ($row['email'] === 'system@science-sims.internal') {
        return ['ok' => false, 'error' => '不可修改系統帳號。'];
    }

    $pdo->prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        ->execute([$displayName, $userId]);

    auth_session_start();
    $_SESSION['display_name'] = $displayName;

    return ['ok' => true];
}

/**
 * @return array{ok:bool,error?:string}
 */
function account_change_password(PDO $pdo, int $userId, string $currentPassword, string $newPassword): array
{
    if ($currentPassword === '') {
        return ['ok' => false, 'error' => '請輸入目前密碼。'];
    }
    if (strlen($newPassword) < 8) {
        return ['ok' => false, 'error' => '新密碼至少 8 字元。'];
    }
    if ($currentPassword === $newPassword) {
        return ['ok' => false, 'error' => '新密碼不可與目前密碼相同。'];
    }

    $stmt = $pdo->prepare('SELECT email, password_hash FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => '找不到使用者。'];
    }
    if ($row['email'] === 'system@science-sims.internal') {
        return ['ok' => false, 'error' => '不可修改系統帳號密碼。'];
    }
    if (!password_verify($currentPassword, (string) $row['password_hash'])) {
        return ['ok' => false, 'error' => '目前密碼不正確。'];
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        ->execute([$hash, $userId]);

    return ['ok' => true];
}
