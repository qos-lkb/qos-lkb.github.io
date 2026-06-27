-- 工作紙權限：管理員／教師（設計、派發、回饋）；學生（完成及呈交）
-- 015 若已執行，本檔以 INSERT IGNORE 補齊，可安全重複執行

INSERT INTO permissions (name, description) VALUES
    ('worksheet.assign_own', 'Assign worksheets to own classes'),
    ('worksheet.grade_own', 'Grade and give feedback on worksheet submissions in own classes'),
    ('worksheet.submit_own', 'Complete and submit assigned worksheets')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 管理員：設計全部工作紙、派發、評分回饋
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name IN (
    'worksheet.manage_any',
    'worksheet.assign_own',
    'worksheet.grade_own',
    'question_bank.manage_any',
    'class.manage_any'
);

-- 教師：設計自己的工作紙、派發予任教班級、評分回饋
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.name IN (
    'worksheet.manage_own',
    'worksheet.assign_own',
    'worksheet.grade_own',
    'question_bank.manage_own',
    'class.manage_own'
);

-- 學生：完成及呈交工作紙
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.name IN (
    'worksheet.submit_own',
    'student.profile_own'
);
