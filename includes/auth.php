<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/user_names_lib.php';

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

function attempt_login(string $email, string $password): bool
{
    auth_session_start();
    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, email, password_hash, display_name, name_zh, name_en, is_active FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || !(int) $u['is_active']) {
        return false;
    }
    if (!password_verify($password, $u['password_hash'])) {
        return false;
    }

    session_regenerate_id(true);
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
