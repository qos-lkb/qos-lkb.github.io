-- Admin audit trail (impersonation, db wipe, etc.)
-- Existing DBs: apply via scripts/apply_schema.php or:
--   mysql -u USER -p DB_NAME < schema_admin_audit_log.sql
-- Safe to re-run.

SET NAMES utf8mb4;
SET time_zone = '+08:00';

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT UNSIGNED NULL,
    action VARCHAR(64) NOT NULL,
    detail_json TEXT NULL,
    ip VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_admin_audit_action_created (action, created_at),
    KEY idx_admin_audit_actor_created (actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
