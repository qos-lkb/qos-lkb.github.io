-- Upgrade: simulations pending_review + guest/contributor submission fields
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_simulations_review.sql
-- Or: php scripts/apply_schema.php
-- Safe to re-run.


SET @db := DATABASE();

ALTER TABLE simulations
    MODIFY COLUMN status ENUM('draft', 'pending_review', 'published') NOT NULL DEFAULT 'draft';

SET @has_summary_zh := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'summary_zh'
);
SET @sql_summary_zh := IF(
    @has_summary_zh = 0,
    'ALTER TABLE simulations ADD COLUMN summary_zh VARCHAR(500) NOT NULL DEFAULT \'\' AFTER title_en',
    'SELECT 1'
);
PREPARE stmt_summary_zh FROM @sql_summary_zh;
EXECUTE stmt_summary_zh;
DEALLOCATE PREPARE stmt_summary_zh;

SET @has_summary_en := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'summary_en'
);
SET @sql_summary_en := IF(
    @has_summary_en = 0,
    'ALTER TABLE simulations ADD COLUMN summary_en VARCHAR(500) NOT NULL DEFAULT \'\' AFTER summary_zh',
    'SELECT 1'
);
PREPARE stmt_summary_en FROM @sql_summary_en;
EXECUTE stmt_summary_en;
DEALLOCATE PREPARE stmt_summary_en;

SET @has_submitter_name := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'submitter_name'
);
SET @sql_submitter_name := IF(
    @has_submitter_name = 0,
    'ALTER TABLE simulations ADD COLUMN submitter_name VARCHAR(120) NULL AFTER status',
    'SELECT 1'
);
PREPARE stmt_submitter_name FROM @sql_submitter_name;
EXECUTE stmt_submitter_name;
DEALLOCATE PREPARE stmt_submitter_name;

SET @has_submitter_email := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'submitter_email'
);
SET @sql_submitter_email := IF(
    @has_submitter_email = 0,
    'ALTER TABLE simulations ADD COLUMN submitter_email VARCHAR(190) NULL AFTER submitter_name',
    'SELECT 1'
);
PREPARE stmt_submitter_email FROM @sql_submitter_email;
EXECUTE stmt_submitter_email;
DEALLOCATE PREPARE stmt_submitter_email;

SET @has_submitter_note := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'submitter_note'
);
SET @sql_submitter_note := IF(
    @has_submitter_note = 0,
    'ALTER TABLE simulations ADD COLUMN submitter_note TEXT NULL AFTER submitter_email',
    'SELECT 1'
);
PREPARE stmt_submitter_note FROM @sql_submitter_note;
EXECUTE stmt_submitter_note;
DEALLOCATE PREPARE stmt_submitter_note;

SET @has_submission_source := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'submission_source'
);
SET @sql_submission_source := IF(
    @has_submission_source = 0,
    'ALTER TABLE simulations ADD COLUMN submission_source ENUM(\'editor\', \'guest_form\') NOT NULL DEFAULT \'editor\' AFTER submitter_note',
    'SELECT 1'
);
PREPARE stmt_submission_source FROM @sql_submission_source;
EXECUTE stmt_submission_source;
DEALLOCATE PREPARE stmt_submission_source;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.name = 'simulation.manage_own';
