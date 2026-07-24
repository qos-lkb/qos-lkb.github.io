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
 * Self-service password change is disabled — passwords live in QSIS only.
 *
 * @return array{ok:bool,error?:string}
 */
function account_change_password(PDO $pdo, int $userId, string $currentPassword, string $newPassword): array
{
    unset($pdo, $userId, $currentPassword, $newPassword);

    return ['ok' => false, 'error' => '本站不儲存密碼。請於校本 QSIS／學校系統更改密碼。'];
}
