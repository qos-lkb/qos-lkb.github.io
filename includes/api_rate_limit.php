<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function api_rate_limit_key(string $action, string $identifier): string
{
    return $action . ':' . hash('sha256', $identifier);
}

function api_rate_limit_check(PDO $pdo, string $key, int $maxAttempts = 5, int $windowSeconds = 900): bool
{
    $stmt = $pdo->prepare('SELECT id, attempt_count, window_start FROM api_rate_limits WHERE rate_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();

    $now = time();
    if (!$row) {
        $ins = $pdo->prepare('INSERT INTO api_rate_limits (rate_key, attempt_count, window_start) VALUES (?, 1, CURRENT_TIMESTAMP)');
        $ins->execute([$key]);
        return true;
    }

    $windowStart = strtotime((string) $row['window_start']);
    if ($windowStart === false || ($now - $windowStart) >= $windowSeconds) {
        $upd = $pdo->prepare('UPDATE api_rate_limits SET attempt_count = 1, window_start = CURRENT_TIMESTAMP WHERE id = ?');
        $upd->execute([(int) $row['id']]);
        return true;
    }

    if ((int) $row['attempt_count'] >= $maxAttempts) {
        return false;
    }

    $upd = $pdo->prepare('UPDATE api_rate_limits SET attempt_count = attempt_count + 1 WHERE id = ?');
    $upd->execute([(int) $row['id']]);
    return true;
}

function api_rate_limit_reset(PDO $pdo, string $key): void
{
    $pdo->prepare('DELETE FROM api_rate_limits WHERE rate_key = ?')->execute([$key]);
}

function api_client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return is_string($ip) ? $ip : '0.0.0.0';
}

/**
 * Shared login/register limits: 5 attempts / 15 minutes per IP+identity.
 *
 * @return array{ok:bool,key:string}
 */
function api_auth_rate_limit_begin(PDO $pdo, string $action, string $identity): array
{
    $identity = strtolower(trim($identity));
    $key = api_rate_limit_key($action, api_client_ip() . '|' . ($identity !== '' ? $identity : '_'));
    $ok = api_rate_limit_check($pdo, $key, 5, 900);

    return ['ok' => $ok, 'key' => $key];
}

