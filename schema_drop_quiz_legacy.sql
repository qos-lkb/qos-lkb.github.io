-- Phase 7 (optional final step): DROP frozen learning_tools / quiz_* after migration.
-- Do NOT run until:
--   1) php scripts/migrate_learning_tools_to_question_banks.php succeeded
--   2) learning_tools row count is 0 OR all mapped in legacy_learning_tool_map
--   3) no topic_learning_items / learning_attempts still reference learning_tool
-- Prefer: php scripts/migrate_learning_tools_to_question_banks.php --drop-legacy

SET NAMES utf8mb4;
SET time_zone = '+08:00';

DROP TABLE IF EXISTS quiz_options;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS learning_tools;
