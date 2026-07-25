-- Upgrade: summer homework media, content references, and enhanced question grading
-- Existing DBs: mysql -u USER -p DB_NAME < schema_summer_homework_media.sql
-- Safe to re-run.

SET NAMES utf8mb4;
SET time_zone = '+08:00';

CREATE TABLE IF NOT EXISTS summer_homework_media (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    item_id INT UNSIGNED NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    original_name VARCHAR(255) NOT NULL DEFAULT '',
    mime_type VARCHAR(128) NOT NULL DEFAULT 'image/jpeg',
    file_size INT UNSIGNED NOT NULL DEFAULT 0,
    alt_zh VARCHAR(255) NULL DEFAULT NULL,
    alt_en VARCHAR(255) NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sh_media_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db := DATABASE();

SET @has_content_refs := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'summer_homework_items' AND COLUMN_NAME = 'content_refs_json'
);
SET @sql_content_refs := IF(
    @has_content_refs = 0,
    'ALTER TABLE summer_homework_items ADD COLUMN content_refs_json JSON NULL DEFAULT NULL AFTER body_en',
    'SELECT 1'
);
PREPARE stmt_content_refs FROM @sql_content_refs;
EXECUTE stmt_content_refs;
DEALLOCATE PREPARE stmt_content_refs;

ALTER TABLE summer_homework_questions
    MODIFY COLUMN question_type ENUM(
        'mcq', 'multi_select', 'fill_blank', 'true_false', 'short_answer', 'long_answer'
    ) NOT NULL;

SET @has_match_mode := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'summer_homework_questions' AND COLUMN_NAME = 'match_mode'
);
SET @sql_match_mode := IF(
    @has_match_mode = 0,
    'ALTER TABLE summer_homework_questions ADD COLUMN match_mode VARCHAR(16) NOT NULL DEFAULT ''exact'' AFTER explanation_en',
    'SELECT 1'
);
PREPARE stmt_match_mode FROM @sql_match_mode;
EXECUTE stmt_match_mode;
DEALLOCATE PREPARE stmt_match_mode;
