<?php
/**
 * 資料庫連線請優先使用專案根目錄 .env（複製 .env.example 為 .env）。
 *
 * 若不用 .env，可複製本檔說明建立 includes/config.local.php（已列入 .gitignore）。
 * 資料庫、使用者與資料表須自行建立並與應用設定一致。
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
