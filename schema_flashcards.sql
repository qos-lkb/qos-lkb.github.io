-- Upgrade: flashcard sets, cards, spaced-repetition reviews
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_flashcards.sql
-- Or: php scripts/apply_schema.php (after MigrationRunner includes this file)
-- Safe to re-run (CREATE IF NOT EXISTS; INSERT IGNORE; ENUM modify is idempotent if already extended).

CREATE TABLE IF NOT EXISTS flashcard_sets (
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
    UNIQUE KEY uq_flashcard_sets_slug (slug),
    KEY idx_flashcard_sets_status (status),
    KEY idx_flashcard_sets_owner (owner_user_id),
    KEY idx_flashcard_sets_subject (subject_id),
    KEY idx_flashcard_sets_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flashcard_cards (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    set_id INT UNSIGNED NOT NULL,
    front_zh MEDIUMTEXT NOT NULL,
    front_en MEDIUMTEXT NOT NULL,
    back_zh MEDIUMTEXT NOT NULL,
    back_en MEDIUMTEXT NOT NULL,
    hint_zh TEXT NULL,
    hint_en TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    KEY idx_flashcard_cards_set (set_id),
    KEY idx_flashcard_cards_sort (set_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flashcard_card_reviews (
    user_id INT UNSIGNED NOT NULL,
    card_id INT UNSIGNED NOT NULL,
    ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    interval_days INT UNSIGNED NOT NULL DEFAULT 0,
    repetitions INT UNSIGNED NOT NULL DEFAULT 0,
    due_at DATETIME NOT NULL,
    last_rating ENUM('again', 'good', 'easy') NULL DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, card_id),
    KEY idx_fc_reviews_user_due (user_id, due_at),
    KEY idx_fc_reviews_card (card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE topic_learning_items
    MODIFY content_type ENUM(
        'note',
        'simulation',
        'worksheet',
        'article',
        'learning_tool',
        'video',
        'question_bank',
        'flashcard_set'
    ) NOT NULL;

ALTER TABLE learning_attempts
    MODIFY source_type ENUM('learning_tool', 'article', 'question_bank', 'flashcard_set') NOT NULL;

INSERT IGNORE INTO permissions (name, description) VALUES
    ('flashcard_set.manage_any', 'Manage all flashcard sets'),
    ('flashcard_set.manage_own', 'Manage own flashcard sets');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name IN ('flashcard_set.manage_any', 'flashcard_set.manage_own');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.name = 'flashcard_set.manage_own';

INSERT IGNORE INTO spa_nav_visibility (item_key, audience, is_visible) VALUES
    ('flashcards', 'guest', 1),
    ('flashcards', 'student', 1),
    ('flashcards', 'teacher', 1),
    ('flashcards', 'admin', 1);

INSERT IGNORE INTO spa_nav_order (item_key, sort_order)
SELECT 'flashcards', COALESCE(MAX(sort_order), -1) + 1
FROM (SELECT sort_order FROM spa_nav_order) AS existing_nav_order;
