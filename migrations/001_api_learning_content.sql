-- Science Simulations: learning tools, science articles, permissions
-- Run against science_sims database after existing schema is in place.
-- 不使用 FOREIGN KEY（避免 errno 150）；關聯由應用層維護，刪除時請用 lib 的 lt_delete / art_delete。

CREATE TABLE IF NOT EXISTS learning_tools (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title_zh VARCHAR(255) NOT NULL DEFAULT '',
    title_en VARCHAR(255) NOT NULL DEFAULT '',
    description_zh TEXT NULL,
    description_en TEXT NULL,
    subject_id INT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    owner_user_id INT UNSIGNED NULL,
    linked_simulation_id INT UNSIGNED NULL,
    list_sort_order INT NOT NULL DEFAULT 0,
    status ENUM('draft', 'pending_review', 'published') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_learning_tools_slug (slug),
    KEY idx_learning_tools_status (status),
    KEY idx_learning_tools_owner (owner_user_id),
    KEY idx_learning_tools_subject (subject_id),
    KEY idx_learning_tools_topic (topic_id),
    KEY idx_learning_tools_simulation (linked_simulation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    learning_tool_id INT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    stem_zh TEXT NOT NULL,
    stem_en TEXT NOT NULL,
    explanation_zh TEXT NULL,
    explanation_en TEXT NULL,
    KEY idx_quiz_questions_tool (learning_tool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh VARCHAR(512) NOT NULL DEFAULT '',
    text_en VARCHAR(512) NOT NULL DEFAULT '',
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_quiz_options_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS science_articles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title_zh VARCHAR(255) NOT NULL DEFAULT '',
    title_en VARCHAR(255) NOT NULL DEFAULT '',
    body_zh MEDIUMTEXT NOT NULL,
    body_en MEDIUMTEXT NOT NULL,
    subject_id INT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    owner_user_id INT UNSIGNED NULL,
    reading_time_minutes TINYINT UNSIGNED NULL,
    list_sort_order INT NOT NULL DEFAULT 0,
    status ENUM('draft', 'pending_review', 'published') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_science_articles_slug (slug),
    KEY idx_science_articles_status (status),
    KEY idx_science_articles_owner (owner_user_id),
    KEY idx_science_articles_subject (subject_id),
    KEY idx_science_articles_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    article_id INT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    stem_zh TEXT NOT NULL,
    stem_en TEXT NOT NULL,
    explanation_zh TEXT NULL,
    explanation_en TEXT NULL,
    KEY idx_article_questions_article (article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh VARCHAR(512) NOT NULL DEFAULT '',
    text_en VARCHAR(512) NOT NULL DEFAULT '',
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_article_options_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_rate_limits (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rate_key VARCHAR(128) NOT NULL,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
    window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_api_rate_limits_key (rate_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- permissions 表補上 description（MariaDB / MySQL 8.0.12+ 支援 IF NOT EXISTS）
ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL DEFAULT NULL;

INSERT INTO permissions (name, description) VALUES
    ('learning_tool.manage_any', 'Manage all learning tools'),
    ('learning_tool.manage_own', 'Manage own learning tools'),
    ('article.manage_any', 'Manage all science articles'),
    ('article.manage_own', 'Manage own science articles')
ON DUPLICATE KEY UPDATE description = VALUES(description);
