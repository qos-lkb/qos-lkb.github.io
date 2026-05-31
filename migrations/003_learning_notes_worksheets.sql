-- 學習筆記、工作紙（無 FOREIGN KEY）
-- 刪除時請用 ln_delete_by_id / ws_delete_by_id

CREATE TABLE IF NOT EXISTS learning_notes (
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

CREATE TABLE IF NOT EXISTS worksheets (
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

INSERT INTO permissions (name, description) VALUES
    ('learning_note.manage_any', 'Manage all learning notes'),
    ('learning_note.manage_own', 'Manage own learning notes'),
    ('worksheet.manage_any', 'Manage all worksheets'),
    ('worksheet.manage_own', 'Manage own worksheets')
ON DUPLICATE KEY UPDATE description = VALUES(description);
