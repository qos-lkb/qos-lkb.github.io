-- Additive patch for existing databases (already imported full schema.sql before summer homework).
-- Safe to re-run: CREATE IF NOT EXISTS + INSERT IGNORE / ON DUPLICATE KEY.

SET NAMES utf8mb4;

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
