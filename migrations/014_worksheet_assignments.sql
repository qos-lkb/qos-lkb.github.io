-- 課程工作紙派發、提交與評分
-- 不使用 FOREIGN KEY；關聯由應用層維護

CREATE TABLE IF NOT EXISTS worksheet_assignments (
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

CREATE TABLE IF NOT EXISTS worksheet_assignment_students (
    assignment_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (assignment_id, user_id),
    KEY idx_was_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worksheet_submissions (
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ws_submission (assignment_id, user_id),
    KEY idx_ws_sub_user (user_id),
    KEY idx_ws_sub_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
