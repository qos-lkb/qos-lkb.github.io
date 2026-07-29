-- =============================================================================
-- science_sims — 既有資料庫單一升級檔
-- 適用：已有舊庫、不要砍資料。全新環境請改用 schema.sql。
-- 用法：
--   mysql -u USER -p DB_NAME < schema_upgrade_all.sql
--   或：php scripts/apply_schema.php
-- 可重跑（多數步驟冪等）。不含 DROP learning_tools／quiz_*（見 schema_drop_quiz_legacy.sql）。
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+08:00';


-- ---------------------------------------------------------------------------
-- BEGIN schema_summer_homework.sql
-- ---------------------------------------------------------------------------
-- Additive patch for existing databases (already imported full schema.sql before summer homework).
-- Safe to re-run: CREATE IF NOT EXISTS + INSERT IGNORE / ON DUPLICATE KEY.


CREATE TABLE IF NOT EXISTS summer_homework_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title_zh VARCHAR(255) NOT NULL DEFAULT '',
    title_en VARCHAR(255) NOT NULL DEFAULT '',
    form_level ENUM('1', '2') NOT NULL,
    content_type ENUM('passage', 'video') NOT NULL DEFAULT 'passage',
    body_zh MEDIUMTEXT NULL,
    body_en MEDIUMTEXT NULL,
    video_embed_url VARCHAR(512) NULL DEFAULT NULL,
    video_provider VARCHAR(32) NULL DEFAULT 'youtube',
    pass_percent DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    list_sort_order INT NOT NULL DEFAULT 0,
    owner_user_id INT UNSIGNED NULL,
    status ENUM('draft', 'pending_review', 'published') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sh_items_slug (slug),
    KEY idx_sh_items_form (form_level),
    KEY idx_sh_items_status (status),
    KEY idx_sh_items_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS summer_homework_questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    item_id INT UNSIGNED NOT NULL,
    question_type ENUM('mcq', 'fill_blank') NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    stem_zh TEXT NOT NULL,
    stem_en TEXT NOT NULL,
    explanation_zh TEXT NULL,
    explanation_en TEXT NULL,
    KEY idx_sh_questions_item (item_id),
    KEY idx_sh_questions_type (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS summer_homework_mcq_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh VARCHAR(512) NOT NULL DEFAULT '',
    text_en VARCHAR(512) NOT NULL DEFAULT '',
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_sh_mcq_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS summer_homework_fill_blanks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    blank_index TINYINT UNSIGNED NOT NULL DEFAULT 1,
    acceptable_answer_zh VARCHAR(512) NOT NULL DEFAULT '',
    acceptable_answer_en VARCHAR(512) NOT NULL DEFAULT '',
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY idx_sh_fill_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS summer_homework_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    score DECIMAL(6,2) NOT NULL DEFAULT 0,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    passed TINYINT(1) NOT NULL DEFAULT 0,
    responses_json JSON NULL,
    grading_json JSON NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sh_attempts_user (user_id),
    KEY idx_sh_attempts_item (item_id),
    KEY idx_sh_attempts_user_item (user_id, item_id),
    KEY idx_sh_attempts_passed (user_id, item_id, passed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description) VALUES
    ('summer_homework.manage_any', 'Manage all summer homework assessments'),
    ('summer_homework.manage_own', 'Manage own summer homework assessments'),
    ('summer_homework.submit_own', 'Complete summer homework assessments')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name IN (
    'summer_homework.manage_any',
    'summer_homework.manage_own',
    'summer_homework.submit_own'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.name = 'summer_homework.manage_own';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.name = 'summer_homework.submit_own';
-- END schema_summer_homework.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_summer_homework_due.sql
-- ---------------------------------------------------------------------------
-- Upgrade: summer homework due_at + allow_late_submit
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_summer_homework_due.sql
-- Safe to re-run.


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
-- END schema_summer_homework_due.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_summer_homework_grading.sql
-- ---------------------------------------------------------------------------
-- Upgrade: store per-attempt grading details for summer homework analysis
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_summer_homework_grading.sql
-- Safe to re-run.
-- Note: every submit already INSERTs a row in summer_homework_attempts (best score is display-only).
-- This adds grading_json so wrong-answer analysis does not depend on re-grading against possibly changed keys.


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
-- END schema_summer_homework_grading.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_summer_homework_qtypes.sql
-- ---------------------------------------------------------------------------
-- Summer homework: expand question types + teacher marks.
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_summer_homework_qtypes.sql
-- Idempotent where practical (MariaDB / MySQL).


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
-- END schema_summer_homework_qtypes.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_summer_homework_media.sql
-- ---------------------------------------------------------------------------
-- Upgrade: summer homework media, content references, and enhanced question grading
-- Safe to re-run.

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
-- END schema_summer_homework_media.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_classes_form_subject.sql
-- ---------------------------------------------------------------------------
-- Upgrade: classes form_level + course_subject
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_classes_form_subject.sql
-- Safe to re-run: skips columns that already exist.


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
-- END schema_classes_form_subject.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_spa_nav_visibility.sql
-- ---------------------------------------------------------------------------
-- Upgrade: SPA top-nav visibility by audience
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_spa_nav_visibility.sql


CREATE TABLE IF NOT EXISTS spa_nav_visibility (
    item_key VARCHAR(64) NOT NULL,
    audience ENUM('guest', 'student', 'teacher', 'admin') NOT NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_key, audience),
    KEY idx_spa_nav_audience (audience)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO spa_nav_visibility (item_key, audience, is_visible) VALUES
    ('courses', 'guest', 1), ('courses', 'student', 1), ('courses', 'teacher', 1), ('courses', 'admin', 1),
    ('notes', 'guest', 1), ('notes', 'student', 1), ('notes', 'teacher', 1), ('notes', 'admin', 1),
    ('worksheets', 'guest', 1), ('worksheets', 'student', 1), ('worksheets', 'teacher', 1), ('worksheets', 'admin', 1),
    ('videos', 'guest', 1), ('videos', 'student', 1), ('videos', 'teacher', 1), ('videos', 'admin', 1),
    ('simulations', 'guest', 1), ('simulations', 'student', 1), ('simulations', 'teacher', 1), ('simulations', 'admin', 1),
    ('articles', 'guest', 1), ('articles', 'student', 1), ('articles', 'teacher', 1), ('articles', 'admin', 1),
    ('learning', 'guest', 1), ('learning', 'student', 1), ('learning', 'teacher', 1), ('learning', 'admin', 1),
    ('summer', 'guest', 1), ('summer', 'student', 1), ('summer', 'teacher', 1), ('summer', 'admin', 1);
-- END schema_spa_nav_visibility.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_users_login_id.sql
-- ---------------------------------------------------------------------------
-- Align science_sims users.email with QSIS user.username (no @qos.edu.hk).
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_users_login_id.sql
-- Idempotent: only rewrites school-domain emails; skips when target username already exists.


-- Strip @qos.edu.hk / legacy student domains when the bare username is free.
UPDATE users u
INNER JOIN (
    SELECT id,
           LOWER(SUBSTRING_INDEX(email, '@', 1)) AS login_id
    FROM users
    WHERE email LIKE '%@%'
      AND (
          LOWER(SUBSTRING_INDEX(email, '@', -1)) IN (
              'qos.edu.hk',
              'student.qos.edu.hk',
              'student.qsis.local',
              'qsis.local'
          )
      )
) x ON x.id = u.id
LEFT JOIN users taken ON taken.email = x.login_id AND taken.id <> u.id
SET u.email = x.login_id,
    u.updated_at = CURRENT_TIMESTAMP
WHERE taken.id IS NULL
  AND u.email <> x.login_id;
-- END schema_users_login_id.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_users_drop_password.sql
-- ---------------------------------------------------------------------------
-- Drop local password storage: authentication uses QSIS `user.password_hash` only.
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_users_drop_password.sql
-- Idempotent on MariaDB / MySQL (skips if column already absent).


-- Optional backup before drop:
--   CREATE TABLE users_password_hash_backup AS
--   SELECT id, email, password_hash FROM users
--   WHERE password_hash IS NOT NULL AND password_hash <> '';

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password_hash'
);

SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE users DROP COLUMN password_hash',
    'SELECT 1 AS password_hash_already_dropped'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- END schema_users_drop_password.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_admin_audit_log.sql
-- ---------------------------------------------------------------------------
-- Admin audit trail (impersonation, db wipe, etc.)
-- Existing DBs: apply via scripts/apply_schema.php or:
--   mysql -u USER -p DB_NAME < schema_admin_audit_log.sql
-- Safe to re-run.


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
-- END schema_admin_audit_log.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_phase7_qb_merge.sql
-- ---------------------------------------------------------------------------
-- Phase 7: question_bank as course content type + LT→QB migration map.
-- Existing DBs: php scripts/apply_schema.php (or mysql < this file)
-- Safe to re-run (map table IF NOT EXISTS; ENUM modify is idempotent if already extended).


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
-- END schema_phase7_qb_merge.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_migrations.sql
-- ---------------------------------------------------------------------------
-- Track applied schema_*.sql upgrades (used by scripts/apply_schema.php).
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_migrations.sql
-- Safe to re-run.


CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_schema_migrations_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- END schema_migrations.sql

-- ---------------------------------------------------------------------------
-- BEGIN schema_spa_nav_order.sql
-- ---------------------------------------------------------------------------
-- Upgrade: SPA top-nav item display order
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_spa_nav_order.sql


CREATE TABLE IF NOT EXISTS spa_nav_order (
    item_key VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_key),
    KEY idx_spa_nav_order_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO spa_nav_order (item_key, sort_order) VALUES
    ('summer', 0),
    ('courses', 1),
    ('notes', 2),
    ('worksheets', 3),
    ('videos', 4),
    ('simulations', 5),
    ('articles', 6),
    ('learning', 7);
-- END schema_spa_nav_order.sql

-- ---------------------------------------------------------------------------
-- Record upgrade in schema_migrations (for apply_schema.php --status)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO schema_migrations (filename) VALUES
  ('schema_upgrade_all.sql');

SELECT 'schema_upgrade_all.sql finished' AS status, COUNT(*) AS migrations_tracked
FROM schema_migrations;
