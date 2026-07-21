-- Science Sims — full database schema (MariaDB 10.5+ / MySQL 8.0+)
-- Fresh install:  mysql -u USER -p DB_NAME < schema.sql
-- 不使用 FOREIGN KEY；關聯由應用層維護。時區建議 Asia/Hong_Kong。

SET NAMES utf8mb4;
SET time_zone = '+08:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Drop existing tables (reverse alphabetical; safe for empty or rebuild DB)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS spa_nav_visibility;
DROP TABLE IF EXISTS summer_homework_attempts;
DROP TABLE IF EXISTS summer_homework_fill_blanks;
DROP TABLE IF EXISTS summer_homework_mcq_options;
DROP TABLE IF EXISTS summer_homework_questions;
DROP TABLE IF EXISTS summer_homework_items;
DROP TABLE IF EXISTS worksheet_submissions;
DROP TABLE IF EXISTS worksheet_assignment_students;
DROP TABLE IF EXISTS worksheet_assignments;
DROP TABLE IF EXISTS content_bookmarks;
DROP TABLE IF EXISTS learning_goals;
DROP TABLE IF EXISTS topic_mastery;
DROP TABLE IF EXISTS learning_responses;
DROP TABLE IF EXISTS learning_attempts;
DROP TABLE IF EXISTS learning_events;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS class_enrollments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS qb_question_media;
DROP TABLE IF EXISTS qb_fill_blanks;
DROP TABLE IF EXISTS qb_question_parts;
DROP TABLE IF EXISTS qb_mcq_options;
DROP TABLE IF EXISTS qb_questions;
DROP TABLE IF EXISTS question_banks;
DROP TABLE IF EXISTS topic_learning_items;
DROP TABLE IF EXISTS learning_videos;
DROP TABLE IF EXISTS worksheets;
DROP TABLE IF EXISTS learning_notes;
DROP TABLE IF EXISTS article_options;
DROP TABLE IF EXISTS article_questions;
DROP TABLE IF EXISTS science_articles;
DROP TABLE IF EXISTS quiz_options;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS learning_tools;
DROP TABLE IF EXISTS api_rate_limits;
DROP TABLE IF EXISTS simulation_tags;
DROP TABLE IF EXISTS simulations;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------------
-- Core: users, roles, permissions
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL DEFAULT '',
    name_zh VARCHAR(255) NOT NULL DEFAULT '',
    name_en VARCHAR(255) NOT NULL DEFAULT '',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    user_id INT UNSIGNED NOT NULL,
    role_id SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    KEY idx_user_roles_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(96) NOT NULL,
    description VARCHAR(255) NULL DEFAULT NULL,
    UNIQUE KEY uq_permissions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
    role_id SMALLINT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    KEY idx_rp_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Catalogue: subjects, topics, simulations, tags
-- ---------------------------------------------------------------------------

CREATE TABLE subjects (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(128) NOT NULL,
    name_zh VARCHAR(255) NOT NULL DEFAULT '',
    name_en VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_subjects_slug (slug),
    KEY idx_subjects_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE topics (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subject_id SMALLINT UNSIGNED NOT NULL,
    slug VARCHAR(160) NOT NULL,
    name_zh VARCHAR(255) NOT NULL DEFAULT '',
    name_en VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_topics_subject_slug (subject_id, slug),
    KEY idx_topics_subject_sort (subject_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE simulations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    owner_user_id INT UNSIGNED NULL,
    slug VARCHAR(200) NOT NULL,
    title_zh VARCHAR(512) NOT NULL DEFAULT '',
    title_en VARCHAR(512) NOT NULL DEFAULT '',
    html LONGTEXT NOT NULL,
    screenshot_path VARCHAR(512) NULL,
    subject_id SMALLINT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    list_sort_order INT NOT NULL DEFAULT 0,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    last_updated DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_simulations_slug (slug),
    KEY idx_sim_owner (owner_user_id),
    KEY idx_sim_subject_topic (subject_id, topic_id),
    KEY idx_sim_status (status),
    KEY idx_sim_list_sort (subject_id, topic_id, list_sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tags (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    UNIQUE KEY uq_tags_slug (slug),
    KEY idx_tags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE simulation_tags (
    simulation_id INT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (simulation_id, tag_id),
    KEY idx_st_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- API / auth helpers
-- ---------------------------------------------------------------------------

CREATE TABLE api_rate_limits (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rate_key VARCHAR(128) NOT NULL,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
    window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_api_rate_limits_key (rate_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Learning tools & science articles
-- ---------------------------------------------------------------------------

CREATE TABLE learning_tools (
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

CREATE TABLE quiz_questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    learning_tool_id INT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    stem_zh TEXT NOT NULL,
    stem_en TEXT NOT NULL,
    explanation_zh TEXT NULL,
    explanation_en TEXT NULL,
    KEY idx_quiz_questions_tool (learning_tool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quiz_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh VARCHAR(512) NOT NULL DEFAULT '',
    text_en VARCHAR(512) NOT NULL DEFAULT '',
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_quiz_options_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE science_articles (
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

CREATE TABLE article_questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    article_id INT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    stem_zh TEXT NOT NULL,
    stem_en TEXT NOT NULL,
    explanation_zh TEXT NULL,
    explanation_en TEXT NULL,
    KEY idx_article_questions_article (article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE article_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh VARCHAR(512) NOT NULL DEFAULT '',
    text_en VARCHAR(512) NOT NULL DEFAULT '',
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_article_options_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Learning notes & worksheets
-- ---------------------------------------------------------------------------

CREATE TABLE learning_notes (
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
    UNIQUE KEY uq_learning_notes_slug (slug),
    KEY idx_learning_notes_status (status),
    KEY idx_learning_notes_owner (owner_user_id),
    KEY idx_learning_notes_subject (subject_id),
    KEY idx_learning_notes_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE worksheets (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title_zh VARCHAR(255) NOT NULL DEFAULT '',
    title_en VARCHAR(255) NOT NULL DEFAULT '',
    description_zh TEXT NULL,
    description_en TEXT NULL,
    body_zh MEDIUMTEXT NOT NULL,
    body_en MEDIUMTEXT NOT NULL,
    subject_id INT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    owner_user_id INT UNSIGNED NULL,
    list_sort_order INT NOT NULL DEFAULT 0,
    status ENUM('draft', 'pending_review', 'published') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_worksheets_slug (slug),
    KEY idx_worksheets_status (status),
    KEY idx_worksheets_owner (owner_user_id),
    KEY idx_worksheets_subject (subject_id),
    KEY idx_worksheets_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Self-study courses: videos & curriculum items
-- ---------------------------------------------------------------------------

CREATE TABLE learning_videos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title_zh VARCHAR(255) NOT NULL DEFAULT '',
    title_en VARCHAR(255) NOT NULL DEFAULT '',
    embed_url VARCHAR(512) NOT NULL DEFAULT '',
    provider VARCHAR(32) NOT NULL DEFAULT 'youtube',
    embed_url_zh VARCHAR(512) NULL DEFAULT NULL,
    provider_zh VARCHAR(32) NULL DEFAULT NULL,
    embed_url_en VARCHAR(512) NULL DEFAULT NULL,
    provider_en VARCHAR(32) NULL DEFAULT NULL,
    subject_id INT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    owner_user_id INT UNSIGNED NULL,
    duration_minutes TINYINT UNSIGNED NULL,
    status ENUM('draft', 'pending_review', 'published') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_learning_videos_slug (slug),
    KEY idx_learning_videos_status (status),
    KEY idx_learning_videos_owner (owner_user_id),
    KEY idx_learning_videos_subject (subject_id),
    KEY idx_learning_videos_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE topic_learning_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    topic_id INT UNSIGNED NOT NULL,
    content_type ENUM('note', 'simulation', 'worksheet', 'article', 'learning_tool', 'video') NOT NULL,
    content_id INT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_topic_learning_item (topic_id, content_type, content_id),
    KEY idx_topic_learning_items_topic (topic_id),
    KEY idx_topic_learning_items_sort (topic_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Question banks
-- ---------------------------------------------------------------------------

CREATE TABLE question_banks (
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

CREATE TABLE qb_questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bank_id INT UNSIGNED NOT NULL,
    question_code VARCHAR(64) NULL DEFAULT NULL,
    question_type ENUM('mcq', 'short_answer', 'long_answer', 'fill_blank', 'true_false') NOT NULL,
    subject_id INT UNSIGNED NULL DEFAULT NULL,
    topic_id INT UNSIGNED NULL DEFAULT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NULL DEFAULT NULL,
    source_zh VARCHAR(512) NULL DEFAULT NULL,
    source_en VARCHAR(512) NULL DEFAULT NULL,
    content_format ENUM('markdown', 'plain') NOT NULL DEFAULT 'markdown',
    sort_order INT NOT NULL DEFAULT 0,
    default_score DECIMAL(6,2) NULL DEFAULT NULL,
    stem_zh MEDIUMTEXT NOT NULL,
    stem_en MEDIUMTEXT NOT NULL,
    explanation_zh MEDIUMTEXT NULL,
    explanation_en MEDIUMTEXT NULL,
    model_answer_zh MEDIUMTEXT NULL,
    model_answer_en MEDIUMTEXT NULL,
    true_false_answer TINYINT(1) NULL,
    UNIQUE KEY uq_qb_questions_code (question_code),
    KEY idx_qb_questions_bank (bank_id),
    KEY idx_qb_questions_type (question_type),
    KEY idx_qb_questions_subject (subject_id),
    KEY idx_qb_questions_topic (topic_id),
    KEY idx_qb_questions_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE qb_mcq_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh TEXT NOT NULL,
    text_en TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_qb_mcq_options_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE qb_question_parts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    part_label VARCHAR(16) NOT NULL DEFAULT 'a',
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    prompt_zh MEDIUMTEXT NOT NULL,
    prompt_en MEDIUMTEXT NOT NULL,
    model_answer_zh MEDIUMTEXT NULL,
    model_answer_en MEDIUMTEXT NULL,
    marks TINYINT UNSIGNED NULL,
    KEY idx_qb_question_parts_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE qb_fill_blanks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    blank_index TINYINT UNSIGNED NOT NULL DEFAULT 1,
    acceptable_answer_zh TEXT NOT NULL,
    acceptable_answer_en TEXT NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY idx_qb_fill_blanks_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE qb_question_media (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    media_role ENUM('stem', 'option', 'part', 'explanation', 'answer', 'general') NOT NULL DEFAULT 'general',
    related_sort TINYINT UNSIGNED NULL DEFAULT NULL,
    file_path VARCHAR(512) NOT NULL,
    original_name VARCHAR(255) NOT NULL DEFAULT '',
    mime_type VARCHAR(128) NOT NULL DEFAULT 'image/jpeg',
    file_size INT UNSIGNED NOT NULL DEFAULT 0,
    alt_zh VARCHAR(255) NULL DEFAULT NULL,
    alt_en VARCHAR(255) NULL DEFAULT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_qb_question_media_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Classes & SDL / adaptive learning
-- ---------------------------------------------------------------------------

CREATE TABLE classes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_year VARCHAR(32) NOT NULL DEFAULT '',
    subject_id INT UNSIGNED NULL,
    invite_code VARCHAR(32) NOT NULL,
    teacher_user_id INT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_classes_invite (invite_code),
    KEY idx_classes_teacher (teacher_user_id),
    KEY idx_classes_subject (subject_id),
    KEY idx_classes_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE class_enrollments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    class_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('active', 'pending', 'left') NOT NULL DEFAULT 'active',
    form_class VARCHAR(16) NULL,
    class_no SMALLINT UNSIGNED NULL,
    moi ENUM('E', 'C') NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_class_enrollment (class_id, user_id),
    KEY idx_enrollments_user (user_id),
    KEY idx_enrollments_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_profiles (
    user_id INT UNSIGNED NOT NULL PRIMARY KEY,
    student_number VARCHAR(64) NULL,
    form_level ENUM('1', '2', '3', '4', '5', '6') NULL,
    preferred_lang ENUM('zh', 'en') NOT NULL DEFAULT 'zh',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_id VARCHAR(64) NOT NULL DEFAULT '',
    event_type VARCHAR(64) NOT NULL,
    content_type VARCHAR(32) NULL,
    content_id VARCHAR(190) NULL,
    subject_id INT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    duration_seconds INT UNSIGNED NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_learning_events_user (user_id),
    KEY idx_learning_events_user_created (user_id, created_at),
    KEY idx_learning_events_type (event_type),
    KEY idx_learning_events_topic (user_id, topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    source_type ENUM('learning_tool', 'article', 'question_bank') NOT NULL,
    source_id INT UNSIGNED NOT NULL,
    subject_id INT UNSIGNED NULL,
    topic_id INT UNSIGNED NULL,
    score SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    max_score SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    started_at TIMESTAMP NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_attempts_user (user_id),
    KEY idx_attempts_user_submitted (user_id, submitted_at),
    KEY idx_attempts_source (source_type, source_id),
    KEY idx_attempts_topic (user_id, topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_responses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT UNSIGNED NOT NULL,
    question_id INT UNSIGNED NOT NULL,
    selected_option_index TINYINT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    response_text TEXT NULL,
    KEY idx_responses_attempt (attempt_id),
    KEY idx_responses_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE topic_mastery (
    user_id INT UNSIGNED NOT NULL,
    topic_id INT UNSIGNED NOT NULL,
    mastery_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, topic_id),
    KEY idx_mastery_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_goals (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    goal_type ENUM('weekly_minutes', 'weekly_items') NOT NULL DEFAULT 'weekly_minutes',
    target_value INT UNSIGNED NOT NULL DEFAULT 60,
    period_start DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_goals_user (user_id),
    KEY idx_goals_user_period (user_id, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_bookmarks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    content_type VARCHAR(32) NOT NULL,
    content_slug VARCHAR(190) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bookmark (user_id, content_type, content_slug),
    KEY idx_bookmarks_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Worksheet assignments
-- ---------------------------------------------------------------------------

CREATE TABLE worksheet_assignments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    class_id INT UNSIGNED NOT NULL,
    worksheet_id INT UNSIGNED NOT NULL,
    assigned_by_user_id INT UNSIGNED NOT NULL,
    title_zh VARCHAR(255) NULL,
    title_en VARCHAR(255) NULL,
    instructions_zh TEXT NULL,
    instructions_en TEXT NULL,
    due_at TIMESTAMP NULL,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    status ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'active',
    assign_all TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_wa_class (class_id),
    KEY idx_wa_worksheet (worksheet_id),
    KEY idx_wa_status (status),
    KEY idx_wa_teacher (assigned_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE worksheet_assignment_students (
    assignment_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (assignment_id, user_id),
    KEY idx_was_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE worksheet_submissions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('pending', 'submitted', 'graded') NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP NULL,
    score DECIMAL(6,2) NULL,
    feedback_zh TEXT NULL,
    feedback_en TEXT NULL,
    graded_by_user_id INT UNSIGNED NULL,
    graded_at TIMESTAMP NULL,
    student_comment TEXT NULL,
    responses_json JSON NULL,
    auto_score DECIMAL(6,2) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ws_submission (assignment_id, user_id),
    KEY idx_ws_sub_user (user_id),
    KEY idx_ws_sub_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Summer homework (S1 / S2): passage or video + MC / fill-blank, 80% pass
-- ---------------------------------------------------------------------------

CREATE TABLE summer_homework_items (
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

CREATE TABLE summer_homework_questions (
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

CREATE TABLE summer_homework_mcq_options (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    text_zh VARCHAR(512) NOT NULL DEFAULT '',
    text_en VARCHAR(512) NOT NULL DEFAULT '',
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_sh_mcq_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE summer_homework_fill_blanks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    blank_index TINYINT UNSIGNED NOT NULL DEFAULT 1,
    acceptable_answer_zh VARCHAR(512) NOT NULL DEFAULT '',
    acceptable_answer_en VARCHAR(512) NOT NULL DEFAULT '',
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY idx_sh_fill_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE summer_homework_attempts (
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

-- ---------------------------------------------------------------------------
-- SPA top-nav visibility by audience (guest / student / teacher / admin)
-- ---------------------------------------------------------------------------

CREATE TABLE spa_nav_visibility (
    item_key VARCHAR(64) NOT NULL,
    audience ENUM('guest', 'student', 'teacher', 'admin') NOT NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_key, audience),
    KEY idx_spa_nav_audience (audience)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Seed: roles, permissions, system user
-- ---------------------------------------------------------------------------

INSERT INTO roles (name) VALUES
    ('admin'),
    ('teacher'),
    ('student');

INSERT INTO permissions (name, description) VALUES
    ('user.manage', 'Manage users and roles'),
    ('role.manage', 'Manage role definitions'),
    ('simulation.manage_any', 'Manage all simulations'),
    ('simulation.manage_own', 'Manage own simulations'),
    ('learning_tool.manage_any', 'Manage all learning tools'),
    ('learning_tool.manage_own', 'Manage own learning tools'),
    ('article.manage_any', 'Manage all science articles'),
    ('article.manage_own', 'Manage own science articles'),
    ('learning_note.manage_any', 'Manage all learning notes'),
    ('learning_note.manage_own', 'Manage own learning notes'),
    ('worksheet.manage_any', 'Manage all worksheets'),
    ('worksheet.manage_own', 'Manage own worksheets'),
    ('worksheet.assign_own', 'Assign worksheets to own classes'),
    ('worksheet.grade_own', 'Grade and give feedback on worksheet submissions in own classes'),
    ('worksheet.submit_own', 'Complete and submit assigned worksheets'),
    ('learning_video.manage_any', 'Manage all learning videos'),
    ('learning_video.manage_own', 'Manage own learning videos'),
    ('topic_item.manage_any', 'Manage course curriculum topic items'),
    ('question_bank.manage_any', 'Manage all question banks'),
    ('question_bank.manage_own', 'Manage own question banks'),
    ('class.manage_own', 'Manage own classes and enrollments'),
    ('class.manage_any', 'Manage all classes'),
    ('student.profile_own', 'View and update own student profile'),
    ('summer_homework.manage_any', 'Manage all summer homework assessments'),
    ('summer_homework.manage_own', 'Manage own summer homework assessments'),
    ('summer_homework.submit_own', 'Complete summer homework assessments');

-- admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin';

-- teacher: default teaching permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.name IN (
    'simulation.manage_own',
    'worksheet.manage_own',
    'worksheet.assign_own',
    'worksheet.grade_own',
    'question_bank.manage_own',
    'class.manage_own',
    'summer_homework.manage_own'
);

-- student
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.name IN (
    'worksheet.submit_own',
    'student.profile_own',
    'summer_homework.submit_own'
);

-- System account (CSV import / orphaned content owner; cannot log in)
INSERT INTO users (email, password_hash, display_name, name_zh, name_en, is_active)
VALUES (
    'system@science-sims.internal',
    '$2y$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'System',
    'System',
    'System',
    0
);

-- SPA top nav: all items visible for all audiences by default
INSERT INTO spa_nav_visibility (item_key, audience, is_visible) VALUES
    ('courses', 'guest', 1), ('courses', 'student', 1), ('courses', 'teacher', 1), ('courses', 'admin', 1),
    ('notes', 'guest', 1), ('notes', 'student', 1), ('notes', 'teacher', 1), ('notes', 'admin', 1),
    ('worksheets', 'guest', 1), ('worksheets', 'student', 1), ('worksheets', 'teacher', 1), ('worksheets', 'admin', 1),
    ('videos', 'guest', 1), ('videos', 'student', 1), ('videos', 'teacher', 1), ('videos', 'admin', 1),
    ('simulations', 'guest', 1), ('simulations', 'student', 1), ('simulations', 'teacher', 1), ('simulations', 'admin', 1),
    ('articles', 'guest', 1), ('articles', 'student', 1), ('articles', 'teacher', 1), ('articles', 'admin', 1),
    ('learning', 'guest', 1), ('learning', 'student', 1), ('learning', 'teacher', 1), ('learning', 'admin', 1),
    ('summer', 'guest', 1), ('summer', 'student', 1), ('summer', 'teacher', 1), ('summer', 'admin', 1);
