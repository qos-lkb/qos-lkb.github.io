-- Drop local password storage: authentication uses QSIS `user.password_hash` only.
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_users_drop_password.sql
-- Idempotent on MariaDB / MySQL (skips if column already absent).

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- Optional backup before drop:
--   CREATE TABLE users_password_hash_backup AS
--   SELECT id, email, password_hash FROM users
--   WHERE password_hash IS NOT NULL AND password_hash <> '';

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password_hash'
);

SET @sql := IF(
    @col_exists > 0,
    'ALTER TABLE users DROP COLUMN password_hash',
    'SELECT 1 AS password_hash_already_dropped'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
