<?php

declare(strict_types=1);

/**
 * QSIS 登入密碼驗證與登入識別正規化。
 *
 * 本站 users.email 與 QSIS user.username 對齊：學校帳戶一律存「帳戶名」
 * （例如 s20171060），不使用 @qos.edu.hk。
 */

require_once __DIR__ . '/qsis_db.php';
require_once __DIR__ . '/config.php';

/**
 * 學校登入網域（僅用於辨識／剝離舊電郵；登入與儲存皆不使用）。
 */
function auth_login_email_domain(): string
{
    $domain = config_qsis_student_email_domain();
    if ($domain === '') {
        return 'qos.edu.hk';
    }

    return strtolower($domain);
}

/**
 * 正規化登入身分：剝離學校網域 → 與 QSIS username 一致；其他網域保留完整電郵。
 */
function auth_normalize_login_identity(string $raw): string
{
    $raw = trim($raw);
    if ($raw === '') {
        return '';
    }

    $schoolDomain = auth_login_email_domain();

    if (!str_contains($raw, '@')) {
        return strtolower($raw);
    }

    $parts = explode('@', $raw, 2);
    $local = strtolower(trim($parts[0]));
    $domain = strtolower(trim($parts[1] ?? ''));
    if ($local === '') {
        return '';
    }

    // School domain (and empty): store/login as username only — match QSIS.
    if ($domain === '' || $domain === $schoolDomain) {
        return $local;
    }

    // Legacy alternate student domains → also strip to username.
    $legacySchoolDomains = [
        'student.qos.edu.hk',
        'student.qsis.local',
        'qsis.local',
    ];
    if (in_array($domain, $legacySchoolDomains, true)) {
        return $local;
    }

    return $local . '@' . $domain;
}

/**
 * 驗證登入識別是否可接受（學校帳戶名或外部電郵）。
 */
function auth_is_valid_login_id(string $raw): bool
{
    $id = auth_normalize_login_identity($raw);
    if ($id === '') {
        return false;
    }
    if (!str_contains($id, '@')) {
        return (bool) preg_match('/^[a-z0-9][a-z0-9._-]{1,63}$/i', $id);
    }

    return (bool) filter_var($id, FILTER_VALIDATE_EMAIL);
}

/**
 * 自登入識別取出 QSIS username（@ 前方，或整段帳戶名）。
 */
function auth_qsis_username_from_email(string $email): string
{
    $id = auth_normalize_login_identity($email);
    if ($id === '') {
        return '';
    }
    if (!str_contains($id, '@')) {
        return $id;
    }

    return trim(explode('@', $id, 2)[0]);
}

/**
 * 查找本地使用者；相容舊版 email = username@qos.edu.hk，並在成功時遷移為 username。
 *
 * @return array<string, mixed>|null
 */
function auth_find_local_user_by_login(PDO $pdo, string $rawIdentity): ?array
{
    $identity = auth_normalize_login_identity($rawIdentity);
    if ($identity === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, email, password_hash, display_name, name_zh, name_en, is_active
         FROM users WHERE email = ? LIMIT 1'
    );
    $stmt->execute([$identity]);
    $row = $stmt->fetch();
    if ($row) {
        return $row;
    }

    // Legacy: username@school-domain still in DB
    if (!str_contains($identity, '@')) {
        $domain = auth_login_email_domain();
        $candidates = [
            $identity . '@' . $domain,
            $identity . '@student.qos.edu.hk',
            $identity . '@student.qsis.local',
        ];
        foreach ($candidates as $legacy) {
            $stmt->execute([$legacy]);
            $row = $stmt->fetch();
            if (!$row) {
                continue;
            }
            // Migrate to username-only for QSIS consistency.
            try {
                $upd = $pdo->prepare(
                    'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND email = ?'
                );
                $upd->execute([$identity, (int) $row['id'], $legacy]);
                $row['email'] = $identity;
            } catch (Throwable $e) {
                // Unique conflict: keep legacy email in row for this session.
            }
            return $row;
        }
    }

    return null;
}

/**
 * @return array{username:string,password_hash:string,position:string,is_disabled:int}|null
 */
function qsis_fetch_auth_user(string $username): ?array
{
    $username = trim($username);
    if ($username === '' || !qsis_is_configured()) {
        return null;
    }

    try {
        $pdo = qsis_db();
        $stmt = $pdo->prepare(
            'SELECT username, password_hash, position, is_disabled
             FROM `user`
             WHERE LOWER(username) = LOWER(?)
             LIMIT 1'
        );
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        return [
            'username' => (string) ($row['username'] ?? ''),
            'password_hash' => (string) ($row['password_hash'] ?? ''),
            'position' => (string) ($row['position'] ?? ''),
            'is_disabled' => (int) ($row['is_disabled'] ?? 0),
        ];
    } catch (Throwable $e) {
        return null;
    }
}

function qsis_password_hash_matches(string $storedHash, string $plainPassword): bool
{
    $storedHash = trim($storedHash);
    if ($storedHash === '' || $plainPassword === '') {
        return false;
    }

    if (str_starts_with($storedHash, '$2') || str_starts_with($storedHash, '$argon')) {
        return password_verify($plainPassword, $storedHash);
    }

    if (preg_match('/^[a-f0-9]{32}$/i', $storedHash) === 1) {
        return hash_equals(strtolower($storedHash), md5($plainPassword));
    }

    return password_verify($plainPassword, $storedHash);
}

/**
 * @return 'ok'|'fail'|'unavailable'
 */
function qsis_verify_password_for_login(string $emailOrUsername, string $password): string
{
    if (!qsis_is_configured()) {
        return 'unavailable';
    }

    $username = auth_qsis_username_from_email($emailOrUsername);
    if ($username === '') {
        return 'unavailable';
    }

    try {
        qsis_db();
    } catch (Throwable $e) {
        return 'unavailable';
    }

    $row = qsis_fetch_auth_user($username);
    if ($row === null) {
        return 'unavailable';
    }
    if ($row['is_disabled'] === 1) {
        return 'fail';
    }
    if (!qsis_password_hash_matches($row['password_hash'], $password)) {
        return 'fail';
    }

    return 'ok';
}

function qsis_user_exists_for_email(string $email): bool
{
    if (!qsis_is_configured()) {
        return false;
    }
    $username = auth_qsis_username_from_email($email);
    if ($username === '') {
        return false;
    }

    return qsis_fetch_auth_user($username) !== null;
}
