-- Summer homework: expand question types + teacher marks.
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_summer_homework_qtypes.sql
-- Idempotent where practical (MariaDB / MySQL).

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- Expand ENUM (recreate column — safe when only mcq/fill_blank exist)
ALTER TABLE summer_homework_questions
    MODIFY COLUMN question_type ENUM(
        'mcq',
        'fill_blank',
        'true_false',
        'short_answer',
        'long_answer'
    ) NOT NULL;

-- true_false / long_answer metadata on questions
SET @c := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'summer_homework_questions' AND COLUMN_NAME = 'correct_bool'
);
SET @sql := IF(@c = 0,
    'ALTER TABLE summer_homework_questions ADD COLUMN correct_bool TINYINT(1) NULL DEFAULT NULL AFTER explanation_en',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'summer_homework_questions' AND COLUMN_NAME = 'max_score'
);
SET @sql := IF(@c = 0,
    'ALTER TABLE summer_homework_questions ADD COLUMN max_score DECIMAL(6,2) NOT NULL DEFAULT 1.00 AFTER correct_bool',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'summer_homework_questions' AND COLUMN_NAME = 'rubric_zh'
);
SET @sql := IF(@c = 0,
    'ALTER TABLE summer_homework_questions ADD COLUMN rubric_zh TEXT NULL AFTER max_score',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'summer_homework_questions' AND COLUMN_NAME = 'rubric_en'
);
SET @sql := IF(@c = 0,
    'ALTER TABLE summer_homework_questions ADD COLUMN rubric_en TEXT NULL AFTER rubric_zh',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS summer_homework_short_answers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    acceptable_answer_zh VARCHAR(512) NOT NULL DEFAULT '',
    acceptable_answer_en VARCHAR(512) NOT NULL DEFAULT '',
    KEY idx_sh_short_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @c := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'summer_homework_attempts' AND COLUMN_NAME = 'teacher_marks_json'
);
SET @sql := IF(@c = 0,
    'ALTER TABLE summer_homework_attempts ADD COLUMN teacher_marks_json JSON NULL AFTER grading_json',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
