-- Upgrade: classes form_level + course_subject
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_classes_form_subject.sql
-- Safe to re-run: skips columns that already exist.

SET NAMES utf8mb4;
SET time_zone = '+08:00';

SET @db := DATABASE();

SET @has_form := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'form_level'
);
SET @sql_form := IF(
    @has_form = 0,
    'ALTER TABLE classes ADD COLUMN form_level ENUM(''1'', ''2'', ''3'', ''4'', ''5'', ''6'') NULL DEFAULT NULL AFTER school_year',
    'SELECT 1'
);
PREPARE stmt_form FROM @sql_form;
EXECUTE stmt_form;
DEALLOCATE PREPARE stmt_form;

SET @has_subj := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'course_subject'
);
SET @sql_subj := IF(
    @has_subj = 0,
    'ALTER TABLE classes ADD COLUMN course_subject ENUM(''integrated_science'', ''physics'', ''chemistry'', ''biology'') NULL DEFAULT NULL AFTER form_level',
    'SELECT 1'
);
PREPARE stmt_subj FROM @sql_subj;
EXECUTE stmt_subj;
DEALLOCATE PREPARE stmt_subj;

SET @has_idx_form := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'classes' AND INDEX_NAME = 'idx_classes_form_level'
);
SET @sql_idx_form := IF(
    @has_idx_form = 0,
    'ALTER TABLE classes ADD KEY idx_classes_form_level (form_level)',
    'SELECT 1'
);
PREPARE stmt_idx_form FROM @sql_idx_form;
EXECUTE stmt_idx_form;
DEALLOCATE PREPARE stmt_idx_form;

SET @has_idx_subj := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'classes' AND INDEX_NAME = 'idx_classes_course_subject'
);
SET @sql_idx_subj := IF(
    @has_idx_subj = 0,
    'ALTER TABLE classes ADD KEY idx_classes_course_subject (course_subject)',
    'SELECT 1'
);
PREPARE stmt_idx_subj FROM @sql_idx_subj;
EXECUTE stmt_idx_subj;
DEALLOCATE PREPARE stmt_idx_subj;
