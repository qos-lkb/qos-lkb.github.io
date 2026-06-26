-- SDL / Adaptive Learning：班級、學習事件、測驗紀錄、掌握度、學習目標
-- 合併原 009_student_classes、010_learning_events、011_learning_assessments
-- 不使用 FOREIGN KEY；關聯由應用層維護

-- ---------------------------------------------------------------------------
-- 班級與學生帳戶
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS classes (
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

CREATE TABLE IF NOT EXISTS class_enrollments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    class_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('active', 'pending', 'left') NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_class_enrollment (class_id, user_id),
    KEY idx_enrollments_user (user_id),
    KEY idx_enrollments_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
    user_id INT UNSIGNED NOT NULL PRIMARY KEY,
    student_number VARCHAR(64) NULL,
    form_level ENUM('1', '2', '3', '4', '5', '6') NULL,
    preferred_lang ENUM('zh', 'en') NOT NULL DEFAULT 'zh',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description) VALUES
    ('class.manage_own', 'Manage own classes and enrollments'),
    ('class.manage_any', 'Manage all classes'),
    ('student.profile_own', 'View and update own student profile')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.name = 'class.manage_own';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name = 'class.manage_any';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.name = 'student.profile_own';

-- ---------------------------------------------------------------------------
-- 學習行為事件
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS learning_events (
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

-- ---------------------------------------------------------------------------
-- 測驗、掌握度、學習目標
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS learning_attempts (
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

CREATE TABLE IF NOT EXISTS learning_responses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT UNSIGNED NOT NULL,
    question_id INT UNSIGNED NOT NULL,
    selected_option_index TINYINT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    response_text TEXT NULL,
    KEY idx_responses_attempt (attempt_id),
    KEY idx_responses_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS topic_mastery (
    user_id INT UNSIGNED NOT NULL,
    topic_id INT UNSIGNED NOT NULL,
    mastery_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, topic_id),
    KEY idx_mastery_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_goals (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    goal_type ENUM('weekly_minutes', 'weekly_items') NOT NULL DEFAULT 'weekly_minutes',
    target_value INT UNSIGNED NOT NULL DEFAULT 60,
    period_start DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_goals_user (user_id),
    KEY idx_goals_user_period (user_id, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_bookmarks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    content_type VARCHAR(32) NOT NULL,
    content_slug VARCHAR(190) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bookmark (user_id, content_type, content_slug),
    KEY idx_bookmarks_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
