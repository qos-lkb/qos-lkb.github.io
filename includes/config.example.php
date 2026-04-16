<?php
/**
 * 資料庫連線請優先使用專案根目錄 .env（複製 .env.example 為 .env）。
 *
 * 若不用 .env，可複製本檔說明建立 includes/config.local.php（已列入 .gitignore）：
 * 首次請先以 root 執行 sql/000_database_and_user.sql（密碼改與應用一致），再匯入 sql/001_initial.sql。
 *
 * return [
 *     'db' => [
 *         'dsn' => 'mysql:host=localhost;dbname=db;charset=utf8mb4',
 *         'user' => 'science_sims',
 *         'pass' => '',
 *         'unix_socket' => '', // 選填，例：/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock
 *     ],
 *     'session_cookie_secure' => false, // HTTPS 環境改為 true
 * ];
 */
