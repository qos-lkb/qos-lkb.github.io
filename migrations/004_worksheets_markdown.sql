-- 工作紙改為 Markdown 內容（body_zh / body_en）
-- 若已執行舊版 003（含 file_path），執行本 migration 即可升級。

ALTER TABLE worksheets
    ADD COLUMN IF NOT EXISTS body_zh MEDIUMTEXT NOT NULL DEFAULT '' AFTER description_en,
    ADD COLUMN IF NOT EXISTS body_en MEDIUMTEXT NOT NULL DEFAULT '' AFTER body_zh;

ALTER TABLE worksheets
    MODIFY COLUMN file_path VARCHAR(512) NULL DEFAULT NULL;
