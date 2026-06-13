-- 試題庫重設計：題目層級科目／課題／難度／來源／代號；MathJax 內容；圖片附件
-- 執行於 006_question_bank.sql 之後

-- 題目主表：擴充欄位與 MEDIUMTEXT（支援公式與嵌入圖片 Markdown）
ALTER TABLE qb_questions
    ADD COLUMN question_code VARCHAR(64) NULL DEFAULT NULL AFTER bank_id,
    ADD COLUMN subject_id INT UNSIGNED NULL DEFAULT NULL AFTER question_type,
    ADD COLUMN topic_id INT UNSIGNED NULL DEFAULT NULL AFTER subject_id,
    ADD COLUMN difficulty ENUM('easy', 'medium', 'hard') NULL DEFAULT NULL AFTER topic_id,
    ADD COLUMN source_zh VARCHAR(512) NULL DEFAULT NULL AFTER difficulty,
    ADD COLUMN source_en VARCHAR(512) NULL DEFAULT NULL AFTER source_zh,
    ADD COLUMN content_format ENUM('markdown', 'plain') NOT NULL DEFAULT 'markdown' AFTER source_en;

ALTER TABLE qb_questions
    MODIFY stem_zh MEDIUMTEXT NOT NULL,
    MODIFY stem_en MEDIUMTEXT NOT NULL,
    MODIFY explanation_zh MEDIUMTEXT NULL,
    MODIFY explanation_en MEDIUMTEXT NULL,
    MODIFY model_answer_zh MEDIUMTEXT NULL,
    MODIFY model_answer_en MEDIUMTEXT NULL;

ALTER TABLE qb_questions
    ADD UNIQUE KEY uq_qb_questions_code (question_code),
    ADD KEY idx_qb_questions_subject (subject_id),
    ADD KEY idx_qb_questions_topic (topic_id),
    ADD KEY idx_qb_questions_difficulty (difficulty);

-- 將試題集層級的科目／課題複製到尚未設定的題目
UPDATE qb_questions q
INNER JOIN question_banks b ON b.id = q.bank_id
SET q.subject_id = b.subject_id
WHERE q.subject_id IS NULL AND b.subject_id IS NOT NULL;

UPDATE qb_questions q
INNER JOIN question_banks b ON b.id = q.bank_id
SET q.topic_id = b.topic_id
WHERE q.topic_id IS NULL AND b.topic_id IS NOT NULL;

-- 選項文字改為 TEXT（支援 MathJax）
ALTER TABLE qb_mcq_options
    MODIFY text_zh TEXT NOT NULL,
    MODIFY text_en TEXT NOT NULL;

ALTER TABLE qb_question_parts
    MODIFY prompt_zh MEDIUMTEXT NOT NULL,
    MODIFY prompt_en MEDIUMTEXT NOT NULL,
    MODIFY model_answer_zh MEDIUMTEXT NULL,
    MODIFY model_answer_en MEDIUMTEXT NULL;

ALTER TABLE qb_fill_blanks
    MODIFY acceptable_answer_zh TEXT NOT NULL,
    MODIFY acceptable_answer_en TEXT NOT NULL;

-- 題目圖片／附件（題幹、選項、子題等）
CREATE TABLE IF NOT EXISTS qb_question_media (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    media_role ENUM('stem', 'option', 'part', 'explanation', 'answer', 'general') NOT NULL DEFAULT 'general',
    related_sort TINYINT UNSIGNED NULL DEFAULT NULL,
    file_path VARCHAR(512) NOT NULL,
    original_name VARCHAR(255) NOT NULL DEFAULT '',
    mime_type VARCHAR(128) NOT NULL DEFAULT 'image/jpeg',
    file_size INT UNSIGNED NOT NULL DEFAULT 0,
    alt_zh VARCHAR(255) NULL DEFAULT NULL,
    alt_en VARCHAR(255) NULL DEFAULT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_qb_question_media_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
