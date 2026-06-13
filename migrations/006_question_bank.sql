-- 試題庫：支援 MCQ、短答、長答（子題）、填充、是非
-- 不使用 FOREIGN KEY；刪除時請用 qb_delete_by_id

CREATE TABLE IF NOT EXISTS question_banks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title_zh VARCHAR(255) NOT NULL DEFAULT '',
    title_en VARCHAR(255) NOT NULL DEFAULT '',
    description_zh TEXT NULL,
    description_en TEXT NULL,
    subject_id INT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    owner_user_id INT UNSIGNED NULL,
    list_sort_order INT NOT NULL DEFAULT 0,
    status ENUM('draft', 'pending_review', 'published') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_question_banks_slug (slug),
    KEY idx_question_banks_status (status),
    KEY idx_question_banks_owner (owner_user_id),
    KEY idx_question_banks_subject (subject_id),
    KEY idx_question_banks_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qb_questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bank_id INT UNSIGNED NOT NULL,
    question_type ENUM('mcq', 'short_answer', 'long_answer', 'fill_blank', 'true_false') NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    stem_zh TEXT NOT NULL,
    stem_en TEXT NOT NULL,
    explanation_zh TEXT NULL,
    explanation_en TEXT NULL,
    model_answer_zh TEXT NULL,
    model_answer_en TEXT NULL,
    true_false_answer TINYINT(1) NULL,
    KEY idx_qb_questions_bank (bank_id),
    KEY idx_qb_questions_type (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qb_mcq_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh VARCHAR(512) NOT NULL DEFAULT '',
    text_en VARCHAR(512) NOT NULL DEFAULT '',
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_qb_mcq_options_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qb_question_parts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    part_label VARCHAR(16) NOT NULL DEFAULT 'a',
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    prompt_zh TEXT NOT NULL,
    prompt_en TEXT NOT NULL,
    model_answer_zh TEXT NULL,
    model_answer_en TEXT NULL,
    marks TINYINT UNSIGNED NULL,
    KEY idx_qb_question_parts_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qb_fill_blanks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    blank_index TINYINT UNSIGNED NOT NULL DEFAULT 1,
    acceptable_answer_zh VARCHAR(512) NOT NULL DEFAULT '',
    acceptable_answer_en VARCHAR(512) NOT NULL DEFAULT '',
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY idx_qb_fill_blanks_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description) VALUES
    ('question_bank.manage_any', 'Manage all question banks'),
    ('question_bank.manage_own', 'Manage own question banks')
ON DUPLICATE KEY UPDATE description = VALUES(description);
