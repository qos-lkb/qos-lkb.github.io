<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * Best-effort admin audit trail (never throws to callers for logging failures).
 *
 * @param array<string, mixed>|null $detail
 */
function admin_audit_log(PDO $pdo, string $action, ?int $actorUserId = null, ?array $detail = null): void
{
    $action = trim($action);
    if ($action === '') {
        return;
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $ip = is_string($ip) ? substr($ip, 0, 45) : null;
    $json = null;
    if ($detail !== null) {
        try {
            $encoded = json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            $json = is_string($encoded) ? $encoded : null;
        } catch (Throwable) {
            $json = null;
        }
    }

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO admin_audit_log (actor_user_id, action, detail_json, ip) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$actorUserId, substr($action, 0, 64), $json, $ip]);
    } catch (Throwable) {
        // Table may be missing on unmigrated DBs; never break the primary request.
    }
}
