<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/user_names_lib.php';
require_once __DIR__ . '/qsis_auth_lib.php';

function auth_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $cfg = app_config();
    session_name($cfg['session_name']);

    $params = session_get_cookie_params();
    session_set_cookie_params([
        'lifetime' => $params['lifetime'],
        'path' => $params['path'] ?: '/',
        'domain' => $params['domain'] ?: '',
        'secure' => (bool) $cfg['session_cookie_secure'],
        'httponly' => true,
        'samesite' => $cfg['session_cookie_samesite'],
    ]);

    session_start();
}

function auth_refresh_permissions(int $userId): void
{
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT DISTINCT p.name FROM permissions p
         INNER JOIN role_permissions rp ON rp.permission_id = p.id
         INNER JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = ?'
    );
    $stmt->execute([$userId]);
    $_SESSION['permissions'] = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
}

/**
 * @return array{id:int,email:string,display_name:string,name_zh:string,name_en:string}|null
 */
function current_user(): ?array
{
    auth_session_start();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    return [
        'id' => (int) $_SESSION['user_id'],
        'email' => (string) $_SESSION['user_email'],
        'display_name' => (string) ($_SESSION['display_name'] ?? ''),
        'name_zh' => (string) ($_SESSION['name_zh'] ?? ''),
        'name_en' => (string) ($_SESSION['name_en'] ?? ''),
    ];
}

function user_has_permission(string $permission): bool
{
    auth_session_start();
    if (empty($_SESSION['user_id'])) {
        return false;
    }
    $perms = $_SESSION['permissions'] ?? [];
    return in_array($permission, $perms, true);
}

function require_login(string $redirect = 'login.php'): void
{
    if (current_user() === null) {
        header('Location: ' . $redirect);
        exit;
    }
}

function require_permission(string $permission, string $loginRedirect = 'login.php'): void
{
    require_login($loginRedirect);
    if (!user_has_permission($permission)) {
        http_response_code(403);
        echo '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>403</title></head><body><p>沒有權限。</p></body></html>';
        exit;
    }
}

function require_any_permission(array $permissions, string $loginRedirect = 'login.php'): void
{
    require_login($loginRedirect);
    foreach ($permissions as $permission) {
        if (user_has_permission($permission)) {
            return;
        }
    }
    http_response_code(403);
    echo '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>403</title></head><body><p>沒有權限。</p></body></html>';
    exit;
}

function auth_user_is_admin(PDO $pdo, int $userId): bool
{
    require_once __DIR__ . '/classes_lib.php';
    return in_array('admin', classes_user_role_names($pdo, $userId), true);
}

function auth_is_impersonating(): bool
{
    auth_session_start();
    return !empty($_SESSION['impersonator']['user_id']);
}

/**
 * 真實登入者 ID（模仿模式下為管理員，否則為目前 session 使用者）。
 */
function auth_real_user_id(): ?int
{
    auth_session_start();
    if (!empty($_SESSION['impersonator']['user_id'])) {
        return (int) $_SESSION['impersonator']['user_id'];
    }
    if (!empty($_SESSION['user_id'])) {
        return (int) $_SESSION['user_id'];
    }
    return null;
}

/**
 * @return array{id:int,email:string,display_name:string,name_zh:string,name_en:string}|null
 */
function auth_impersonator(): ?array
{
    auth_session_start();
    $imp = $_SESSION['impersonator'] ?? null;
    if (!is_array($imp) || empty($imp['user_id'])) {
        return null;
    }
    return [
        'id' => (int) $imp['user_id'],
        'email' => (string) ($imp['user_email'] ?? ''),
        'display_name' => (string) ($imp['display_name'] ?? ''),
        'name_zh' => (string) ($imp['name_zh'] ?? ''),
        'name_en' => (string) ($imp['name_en'] ?? ''),
    ];
}

/**
 * @param array<string, mixed> $row users 表一列
 */
function auth_apply_user_to_session(array $row): void
{
    $_SESSION['user_id'] = (int) $row['id'];
    $_SESSION['user_email'] = (string) $row['email'];
    $_SESSION['name_zh'] = (string) ($row['name_zh'] ?? '');
    $_SESSION['name_en'] = (string) ($row['name_en'] ?? '');
    $_SESSION['display_name'] = (string) ($row['display_name'] ?? account_sync_display_name(
        (string) ($row['name_zh'] ?? ''),
        (string) ($row['name_en'] ?? '')
    ));
    auth_refresh_permissions((int) $row['id']);
}

/**
 * @return array{ok:bool,error?:string}
 */
function auth_start_impersonation(PDO $pdo, int $targetUserId): array
{
    auth_session_start();
    $actorId = auth_real_user_id();
    if ($actorId === null) {
        return ['ok' => false, 'error' => '請先登入。'];
    }
    if (!auth_user_is_admin($pdo, $actorId)) {
        return ['ok' => false, 'error' => '僅管理員可模仿其他使用者。'];
    }
    if ($targetUserId === $actorId) {
        return ['ok' => false, 'error' => '無法模仿自己。'];
    }
    if (auth_is_impersonating()) {
        return ['ok' => false, 'error' => '請先結束目前的模仿模式。'];
    }

    $stmt = $pdo->prepare('SELECT id, email, display_name, name_zh, name_en, is_active FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$targetUserId]);
    $target = $stmt->fetch();
    if (!$target) {
        return ['ok' => false, 'error' => '找不到使用者。'];
    }
    if ($target['email'] === 'system@science-sims.internal') {
        return ['ok' => false, 'error' => '無法模仿系統帳號。'];
    }
    if (!(int) $target['is_active']) {
        return ['ok' => false, 'error' => '該使用者已停用。'];
    }

    $current = current_user();
    if ($current === null) {
        return ['ok' => false, 'error' => '請先登入。'];
    }

    $_SESSION['impersonator'] = [
        'user_id' => $current['id'],
        'user_email' => $current['email'],
        'name_zh' => $current['name_zh'],
        'name_en' => $current['name_en'],
        'display_name' => $current['display_name'],
    ];
    auth_apply_user_to_session($target);

    return ['ok' => true];
}

/**
 * @return array{ok:bool,error?:string}
 */
function auth_stop_impersonation(PDO $pdo): array
{
    auth_session_start();
    $imp = auth_impersonator();
    if ($imp === null) {
        return ['ok' => false, 'error' => '目前並非模仿模式。'];
    }

    $stmt = $pdo->prepare('SELECT id, email, display_name, name_zh, name_en, is_active FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$imp['id']]);
    $admin = $stmt->fetch();
    if (!$admin || !(int) $admin['is_active']) {
        unset($_SESSION['impersonator']);
        logout_user();
        return ['ok' => false, 'error' => '原管理員帳號已失效，已登出。'];
    }

    unset($_SESSION['impersonator']);
    auth_apply_user_to_session($admin);

    return ['ok' => true];
}

function attempt_login(string $email, string $password): bool
{
    auth_session_start();
    require_once __DIR__ . '/qsis_auth_lib.php';

    $identity = auth_normalize_login_identity($email);
    if ($identity === '' || $password === '') {
        return false;
    }

    $pdo = db();
    $u = auth_find_local_user_by_login($pdo, $identity);
    if ($u === null || !(int) $u['is_active']) {
        return false;
    }

    // Passwords are verified only against QSIS; local users.password_hash is removed.
    if (qsis_verify_password_for_login($identity, $password) !== 'ok') {
        return false;
    }

    session_regenerate_id(true);
    unset($_SESSION['impersonator']);
    $_SESSION['user_id'] = (int) $u['id'];
    $_SESSION['user_email'] = $u['email'];
    $_SESSION['name_zh'] = (string) ($u['name_zh'] ?? '');
    $_SESSION['name_en'] = (string) ($u['name_en'] ?? '');
    $_SESSION['display_name'] = (string) ($u['display_name'] ?? account_sync_display_name(
        (string) ($u['name_zh'] ?? ''),
        (string) ($u['name_en'] ?? '')
    ));
    auth_refresh_permissions((int) $u['id']);
    return true;
}

function logout_user(): void
{
    auth_session_start();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function csrf_token(): string
{
    auth_session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(?string $token): bool
{
    auth_session_start();
    return is_string($token)
        && isset($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $token);
}
