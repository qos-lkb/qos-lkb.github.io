-- Upgrade: summer homework due_at + allow_late_submit
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_summer_homework_due.sql
-- Safe to re-run.

SET NAMES utf8mb4;
SET time_zone = '+08:00';

SET @db := DATABASE();

SET @has_due := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'summer_homework_items' AND COLUMN_NAME = 'due_at'
);
SET @sql_due := IF(
    @has_due = 0,
    'ALTER TABLE summer_homework_items ADD COLUMN due_at DATETIME NULL DEFAULT NULL AFTER pass_percent',
    'SELECT 1'
);
PREPARE stmt_due FROM @sql_due;
EXECUTE stmt_due;
DEALLOCATE PREPARE stmt_due;

SET @has_late := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'summer_homework_items' AND COLUMN_NAME = 'allow_late_submit'
);
SET @sql_late := IF(
    @has_late = 0,
    'ALTER TABLE summer_homework_items ADD COLUMN allow_late_submit TINYINT(1) NOT NULL DEFAULT 1 AFTER due_at',
    'SELECT 1'
);
PREPARE stmt_late FROM @sql_late;
EXECUTE stmt_late;
DEALLOCATE PREPARE stmt_late;

SET @has_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'summer_homework_items' AND INDEX_NAME = 'idx_sh_items_due'
);
SET @sql_idx := IF(
    @has_idx = 0,
    'ALTER TABLE summer_homework_items ADD KEY idx_sh_items_due (due_at)',
    'SELECT 1'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
