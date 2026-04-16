-- 以具管理權限的帳號執行（例如 root），在匯入 001_initial.sql 之前執行一次。
-- 將下方三處 YOUR_PASSWORD_HERE 改為與 includes/config.local.php 內 db.pass 相同。

CREATE DATABASE IF NOT EXISTS `db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'science_sims'@'127.0.0.1' IDENTIFIED BY 'YOUR_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON `db`.* TO 'science_sims'@'127.0.0.1';

CREATE USER IF NOT EXISTS 'science_sims'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON `db`.* TO 'science_sims'@'localhost';

FLUSH PRIVILEGES;
