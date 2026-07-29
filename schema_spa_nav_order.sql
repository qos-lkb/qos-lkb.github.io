-- Upgrade: SPA top-nav item display order
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_spa_nav_order.sql
-- Or: php scripts/apply_schema.php (after MigrationRunner includes this file)

CREATE TABLE IF NOT EXISTS spa_nav_order (
    item_key VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_key),
    KEY idx_spa_nav_order_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default order matches current SPA header (summer first)
INSERT IGNORE INTO spa_nav_order (item_key, sort_order) VALUES
    ('summer', 0),
    ('courses', 1),
    ('notes', 2),
    ('worksheets', 3),
    ('videos', 4),
    ('simulations', 5),
    ('articles', 6),
    ('learning', 7);
