-- Upgrade: store per-attempt grading details for summer homework analysis
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_summer_homework_grading.sql
-- Safe to re-run.
-- Note: every submit already INSERTs a row in summer_homework_attempts (best score is display-only).
-- This adds grading_json so wrong-answer analysis does not depend on re-grading against possibly changed keys.

SET NAMES utf8mb4;
SET time_zone = '+08:00';

SET @db := DATABASE();

SET @has_grading := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'summer_homework_attempts' AND COLUMN_NAME = 'grading_json'
);
SET @sql_grading := IF(
    @has_grading = 0,
    'ALTER TABLE summer_homework_attempts ADD COLUMN grading_json JSON NULL DEFAULT NULL AFTER responses_json',
    'SELECT 1'
);
PREPARE stmt_grading FROM @sql_grading;
EXECUTE stmt_grading;
DEALLOCATE PREPARE stmt_grading;
