-- 課程選課紀錄：MOI 應考語言（E=英文、C=中文）

ALTER TABLE class_enrollments
    ADD COLUMN moi ENUM('E', 'C') NULL AFTER class_no;
