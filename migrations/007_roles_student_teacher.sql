-- 角色調整：一般使用者 → 教師；新增學生
-- roles 表僅有 name 欄位；顯示名稱由應用層 admin_role_labels() 提供

UPDATE roles SET name = 'teacher' WHERE name = 'user';

INSERT IGNORE INTO roles (name) VALUES ('student');
