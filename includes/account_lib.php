<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/user_names_lib.php';

/**
 * @return array{ok:bool,error?:string}
 */
function account_update_profile(PDO $pdo, int $userId, string $nameZh, string $nameEn): array
{
    $nameZh = trim($nameZh);
    $nameEn = trim($nameEn);
    $valid = account_validate_names($nameZh, $nameEn);
    if (!$valid['ok']) {
        return $valid;
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

    $displayName = account_sync_display_name($nameZh, $nameEn);
    $pdo->prepare(
        'UPDATE users SET name_zh = ?, name_en = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )->execute([$nameZh, $nameEn, $displayName, $userId]);

    auth_session_start();
    $_SESSION['name_zh'] = $nameZh;
    $_SESSION['name_en'] = $nameEn;
    $_SESSION['display_name'] = $displayName;

    return ['ok' => true];
}

/**
 * @return array{ok:bool,error?:string}
 */
function account_change_password(PDO $pdo, int $userId, string $currentPassword, string $newPassword): array
{
    // Temporarily disabled — flip to true with UI CHANGE_PASSWORD_ENABLED in assets/js/user-menu.js
    $changePasswordEnabled = false;
    if (!$changePasswordEnabled) {
        return ['ok' => false, 'error' => '更改密碼功能暫未開放。QSIS 帳戶請於校本系統更改密碼。'];
    }

    if ($currentPassword === '') {
        return ['ok' => false, 'error' => '請輸入目前密碼。'];
    }
    if (strlen($newPassword) < 8) {
        return ['ok' => false, 'error' => '新密碼至少 8 字元。'];
    }
    if ($currentPassword === $newPassword) {
        return ['ok' => false, 'error' => '新密碼不可與目前密碼相同。'];
    }

    require_once __DIR__ . '/qsis_auth_lib.php';

    $stmt = $pdo->prepare('SELECT email, password_hash FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => '找不到使用者。'];
    }
    if ($row['email'] === 'system@science-sims.internal') {
        return ['ok' => false, 'error' => '不可修改系統帳號密碼。'];
    }

    $email = (string) $row['email'];
    if (qsis_user_exists_for_email($email)) {
        return ['ok' => false, 'error' => '此帳戶使用校本 QSIS 密碼，請於 QSIS／學校系統更改密碼。'];
    }

    if (!password_verify($currentPassword, (string) $row['password_hash'])) {
        return ['ok' => false, 'error' => '目前密碼不正確。'];
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        ->execute([$hash, $userId]);

    return ['ok' => true];
}
