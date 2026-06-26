-- 使用者帳戶：中英文名（保留 display_name 作相容／排序用）

ALTER TABLE users
    ADD COLUMN name_zh VARCHAR(255) NOT NULL DEFAULT '' AFTER display_name,
    ADD COLUMN name_en VARCHAR(255) NOT NULL DEFAULT '' AFTER name_zh;

UPDATE users SET name_zh = display_name WHERE name_zh = '' AND display_name <> '';
