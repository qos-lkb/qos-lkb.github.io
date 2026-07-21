-- Upgrade: SPA top-nav visibility by audience
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_spa_nav_visibility.sql

SET NAMES utf8mb4;
SET time_zone = '+08:00';

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
