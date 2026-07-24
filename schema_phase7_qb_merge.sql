-- Phase 7: question_bank as course content type + LT→QB migration map.
-- Existing DBs: php scripts/apply_schema.php (or mysql < this file)
-- Safe to re-run (map table IF NOT EXISTS; ENUM modify is idempotent if already extended).

SET NAMES utf8mb4;
SET time_zone = '+08:00';

CREATE TABLE IF NOT EXISTS legacy_learning_tool_map (
    old_tool_id INT UNSIGNED NOT NULL,
    old_slug VARCHAR(190) NOT NULL,
    bank_id INT UNSIGNED NOT NULL,
    migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (old_tool_id),
    UNIQUE KEY uq_legacy_lt_map_slug (old_slug),
    KEY idx_legacy_lt_map_bank (bank_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Allow courses to reference question banks (learning_tool kept for read/compat until DROP).
ALTER TABLE topic_learning_items
    MODIFY content_type ENUM(
        'note',
        'simulation',
        'worksheet',
        'article',
        'learning_tool',
        'video',
        'question_bank'
    ) NOT NULL;
