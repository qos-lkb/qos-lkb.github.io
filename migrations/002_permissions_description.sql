-- 若已執行過 001 但未含 description 欄位，可單獨執行本檔。
-- MariaDB / MySQL 8.0.12+：ADD COLUMN IF NOT EXISTS
-- 若 MySQL 不支援 IF NOT EXISTS，請改用手動：
--   ALTER TABLE permissions ADD COLUMN description VARCHAR(255) NULL DEFAULT NULL;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL DEFAULT NULL;

INSERT INTO permissions (name, description) VALUES
    ('learning_tool.manage_any', 'Manage all learning tools'),
    ('learning_tool.manage_own', 'Manage own learning tools'),
    ('article.manage_any', 'Manage all science articles'),
    ('article.manage_own', 'Manage own science articles')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 既有權限（若 name 已存在且 description 為空，可選填說明）
UPDATE permissions SET description = 'Manage users and roles' WHERE name = 'user.manage' AND (description IS NULL OR description = '');
UPDATE permissions SET description = 'Manage all simulations' WHERE name = 'simulation.manage_any' AND (description IS NULL OR description = '');
UPDATE permissions SET description = 'Manage own simulations' WHERE name = 'simulation.manage_own' AND (description IS NULL OR description = '');
