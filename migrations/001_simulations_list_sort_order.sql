-- 為 simulations 增加首頁／列表顯示排序（同一科目＋同一單元內，數字越小越前）
-- 執行方式（MariaDB／MySQL 客戶端或 phpMyAdmin）：
--   mysql -u USER -p DB_NAME < migrations/001_simulations_list_sort_order.sql
-- 若欄位已存在會報錯，可忽略或先檢查：SHOW COLUMNS FROM simulations LIKE 'list_sort_order';

ALTER TABLE simulations
  ADD COLUMN list_sort_order INT NOT NULL DEFAULT 0 AFTER topic_id;
