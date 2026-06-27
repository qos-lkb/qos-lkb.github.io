-- 試題庫題目預設分數；工作紙提交作答紀錄與自動計分

ALTER TABLE qb_questions
    ADD COLUMN default_score DECIMAL(6,2) NULL DEFAULT NULL AFTER sort_order;

ALTER TABLE worksheet_submissions
    ADD COLUMN responses_json JSON NULL AFTER student_comment,
    ADD COLUMN auto_score DECIMAL(6,2) NULL AFTER score;
