-- 自學課程：外部影片、課題混合學習項目編排
-- 不使用 FOREIGN KEY；關聯由應用層維護

CREATE TABLE IF NOT EXISTS learning_videos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title_zh VARCHAR(255) NOT NULL DEFAULT '',
    title_en VARCHAR(255) NOT NULL DEFAULT '',
    embed_url VARCHAR(512) NOT NULL DEFAULT '',
    provider ENUM('youtube', 'vimeo', 'other') NOT NULL DEFAULT 'youtube',
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

CREATE TABLE IF NOT EXISTS topic_learning_items (
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

INSERT INTO permissions (name, description) VALUES
    ('learning_video.manage_any', 'Manage all learning videos'),
    ('learning_video.manage_own', 'Manage own learning videos'),
    ('topic_item.manage_any', 'Manage course curriculum topic items')
ON DUPLICATE KEY UPDATE description = VALUES(description);
