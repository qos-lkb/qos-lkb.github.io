-- Add simulations.html_path. Keep simulations.html until every row has a file.
-- Existing DBs: php scripts/apply_schema.php
-- Safe to re-run. Does not DROP html.

SET @db := DATABASE();
SET @has_html_path := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'html_path'
);
SET @sql_html_path := IF(
    @has_html_path = 0,
    'ALTER TABLE simulations ADD COLUMN html_path VARCHAR(512) NULL AFTER summary_en',
    'SELECT 1'
);
PREPARE stmt_html_path FROM @sql_html_path;
EXECUTE stmt_html_path;
DEALLOCATE PREPARE stmt_html_path;

SET @has_html := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'simulations' AND COLUMN_NAME = 'html'
);
SET @sql_html_null := IF(
    @has_html = 1,
    'ALTER TABLE simulations MODIFY COLUMN html LONGTEXT NULL',
    'SELECT 1'
);
PREPARE stmt_html_null FROM @sql_html_null;
EXECUTE stmt_html_null;
DEALLOCATE PREPARE stmt_html_null;
