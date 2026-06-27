-- 課程選課紀錄：班別與班號（行政班資料，隨選課一併儲存）

ALTER TABLE class_enrollments
    ADD COLUMN form_class VARCHAR(16) NULL AFTER status,
    ADD COLUMN class_no SMALLINT UNSIGNED NULL AFTER form_class;
