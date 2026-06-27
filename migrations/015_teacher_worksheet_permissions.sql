-- 教師可設計工作紙、試題庫（015 已棄用，請改執行 016_worksheet_role_permissions.sql）

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.name IN ('worksheet.manage_own', 'question_bank.manage_own');
