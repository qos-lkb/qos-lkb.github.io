<?php

declare(strict_types=1);

/**
 * @return string 8-char uppercase invite code
 */
function classes_generate_invite_code(): string
{
    return strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
}

function classes_role_id_by_name(PDO $pdo, string $name): int
{
    $stmt = $pdo->prepare('SELECT id FROM roles WHERE name = ? LIMIT 1');
    $stmt->execute([$name]);
    return (int) ($stmt->fetchColumn() ?: 0);
}

/**
 * @return list<string>
 */
function classes_user_role_names(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT r.name FROM roles r
         INNER JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = ?
         ORDER BY r.name ASC'
    );
    $stmt->execute([$userId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
}

function classes_user_is_student(PDO $pdo, int $userId): bool
{
    return in_array('student', classes_user_role_names($pdo, $userId), true);
}

function classes_user_is_teacher(PDO $pdo, int $userId): bool
{
    $roles = classes_user_role_names($pdo, $userId);
    return in_array('teacher', $roles, true) || in_array('admin', $roles, true);
}

/**
 * @return array<string, mixed>|null
 */
function classes_fetch_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM classes WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function classes_fetch_by_invite_code(PDO $pdo, string $code): ?array
{
    $code = strtoupper(trim($code));
    if ($code === '') {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM classes WHERE invite_code = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function classes_can_manage(PDO $pdo, array $classRow, array $user): bool
{
    if (user_has_permission('class.manage_any')) {
        return true;
    }
    if (!user_has_permission('class.manage_own')) {
        return false;
    }
    return (int) $classRow['teacher_user_id'] === $user['id'];
}

/**
 * @return list<array<string, mixed>>
 */
function classes_list_for_teacher(PDO $pdo, int $teacherUserId, bool $canAny): array
{
    if ($canAny) {
        return $pdo->query(
            'SELECT c.*, u.display_name AS teacher_name,
                    (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.status = \'active\') AS student_count
             FROM classes c
             LEFT JOIN users u ON u.id = c.teacher_user_id
             ORDER BY c.school_year DESC, c.name ASC'
        )->fetchAll() ?: [];
    }
    $stmt = $pdo->prepare(
        'SELECT c.*, u.display_name AS teacher_name,
                (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.status = \'active\') AS student_count
         FROM classes c
         LEFT JOIN users u ON u.id = c.teacher_user_id
         WHERE c.teacher_user_id = ?
         ORDER BY c.school_year DESC, c.name ASC'
    );
    $stmt->execute([$teacherUserId]);
    return $stmt->fetchAll() ?: [];
}

/**
 * @return list<array<string, mixed>>
 */
function classes_list_for_student(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT c.id, c.name, c.school_year, c.subject_id, ce.status, ce.joined_at
         FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE ce.user_id = ? AND ce.status IN (\'active\', \'pending\')
         ORDER BY c.name ASC'
    );
    $stmt->execute([$userId]);
    return $stmt->fetchAll() ?: [];
}

/**
 * @return array<string, mixed>|null
 */
function classes_student_profile(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM student_profiles WHERE user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @param array<string, mixed> $data
 * @return array{ok:bool,error?:string}
 */
function classes_save_student_profile(PDO $pdo, int $userId, array $data): array
{
    $studentNumber = trim((string) ($data['student_number'] ?? ''));
    $formLevel = trim((string) ($data['form_level'] ?? ''));
    $preferredLang = ($data['preferred_lang'] ?? 'zh') === 'en' ? 'en' : 'zh';

    $validForms = ['1', '2', '3', '4', '5', '6'];
    $formDb = in_array($formLevel, $validForms, true) ? $formLevel : null;

    $existing = classes_student_profile($pdo, $userId);
    if ($existing) {
        $upd = $pdo->prepare(
            'UPDATE student_profiles SET student_number = ?, form_level = ?, preferred_lang = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        );
        $upd->execute([
            $studentNumber !== '' ? $studentNumber : null,
            $formDb,
            $preferredLang,
            $userId,
        ]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO student_profiles (user_id, student_number, form_level, preferred_lang) VALUES (?, ?, ?, ?)'
        );
        $ins->execute([
            $userId,
            $studentNumber !== '' ? $studentNumber : null,
            $formDb,
            $preferredLang,
        ]);
    }
    return ['ok' => true];
}

/**
 * @return array{ok:bool,error?:string,user_id?:int}
 */
function classes_register_student(PDO $pdo, string $email, string $password, string $displayName, string $inviteCode): array
{
    $email = trim($email);
    $displayName = trim($displayName);
    $inviteCode = strtoupper(trim($inviteCode));

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => '請輸入有效電郵。'];
    }
    if (strlen($password) < 8) {
        return ['ok' => false, 'error' => '密碼至少 8 字元。'];
    }
    if ($displayName === '') {
        return ['ok' => false, 'error' => '請輸入顯示名稱。'];
    }
    if ($inviteCode === '') {
        return ['ok' => false, 'error' => '請輸入班級邀請碼。'];
    }

    $class = classes_fetch_by_invite_code($pdo, $inviteCode);
    if ($class === null) {
        return ['ok' => false, 'error' => '邀請碼無效或班級已停用。'];
    }

    $studentRoleId = classes_role_id_by_name($pdo, 'student');
    if ($studentRoleId <= 0) {
        return ['ok' => false, 'error' => '系統尚未設定學生角色。'];
    }

    try {
        $pdo->beginTransaction();

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $ins = $pdo->prepare('INSERT INTO users (email, password_hash, display_name, is_active) VALUES (?, ?, ?, 1)');
        $ins->execute([$email, $hash, $displayName]);
        $userId = (int) $pdo->lastInsertId();

        $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$userId, $studentRoleId]);
        $pdo->prepare('INSERT INTO student_profiles (user_id, preferred_lang) VALUES (?, ?)')->execute([$userId, 'zh']);
        $pdo->prepare('INSERT INTO class_enrollments (class_id, user_id, status) VALUES (?, ?, \'active\')')->execute([(int) $class['id'], $userId]);

        $pdo->commit();
        return ['ok' => true, 'user_id' => $userId];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '註冊失敗（可能電郵已被使用）。'];
    }
}

/**
 * @return array{ok:bool,error?:string,id?:int}
 */
function classes_save_from_post(PDO $pdo, array $post, int $actingUserId): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $id = isset($post['id']) ? (int) $post['id'] : 0;
    $name = trim((string) ($post['name'] ?? ''));
    $schoolYear = trim((string) ($post['school_year'] ?? ''));
    $subjectId = isset($post['subject_id']) && $post['subject_id'] !== '' ? (int) $post['subject_id'] : null;
    $teacherUserId = (int) ($post['teacher_user_id'] ?? $actingUserId);
    $isActive = isset($post['is_active']) ? 1 : 0;

    if ($name === '') {
        return ['ok' => false, 'error' => '請輸入班級名稱。'];
    }

    $acting = current_user();
    assert($acting !== null);
    if (!user_has_permission('class.manage_any') && $teacherUserId !== $acting['id']) {
        return ['ok' => false, 'error' => '無法指定其他教師為班級導師。'];
    }

    if ($id > 0) {
        $existing = classes_fetch_by_id($pdo, $id);
        if ($existing === null) {
            return ['ok' => false, 'error' => '找不到班級。'];
        }
        if (!classes_can_manage($pdo, $existing, $acting)) {
            return ['ok' => false, 'error' => '沒有權限編輯此班級。'];
        }
        $upd = $pdo->prepare(
            'UPDATE classes SET name = ?, school_year = ?, subject_id = ?, teacher_user_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        $upd->execute([$name, $schoolYear, $subjectId, $teacherUserId, $isActive, $id]);
        return ['ok' => true, 'id' => $id];
    }

    $inviteCode = classes_generate_invite_code();
    for ($i = 0; $i < 5; $i++) {
        try {
            $ins = $pdo->prepare(
                'INSERT INTO classes (name, school_year, subject_id, invite_code, teacher_user_id, is_active) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $ins->execute([$name, $schoolYear, $subjectId, $inviteCode, $teacherUserId, $isActive]);
            return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
        } catch (Throwable $e) {
            $inviteCode = classes_generate_invite_code();
        }
    }
    return ['ok' => false, 'error' => '建立班級失敗。'];
}

/**
 * @return array{ok:bool,error?:string,enrolled?:int}
 */
function classes_enroll_users(PDO $pdo, int $classId, array $emails, array $user): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到班級。'];
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    $studentRoleId = classes_role_id_by_name($pdo, 'student');
    $enrolled = 0;

    foreach ($emails as $email) {
        $email = trim((string) $email);
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            continue;
        }
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $uid = (int) ($stmt->fetchColumn() ?: 0);
        if ($uid <= 0) {
            continue;
        }
        if ($studentRoleId > 0) {
            $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$uid, $studentRoleId]);
        }
        $ins = $pdo->prepare('INSERT INTO class_enrollments (class_id, user_id, status) VALUES (?, ?, \'active\') ON DUPLICATE KEY UPDATE status = \'active\'');
        $ins->execute([$classId, $uid]);
        $enrolled++;
    }

    return ['ok' => true, 'enrolled' => $enrolled];
}

/**
 * @return array{ok:bool,error?:string,invite_code?:string}
 */
function classes_reset_invite_code(PDO $pdo, int $classId, array $user): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到班級。'];
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    for ($i = 0; $i < 5; $i++) {
        $code = classes_generate_invite_code();
        try {
            $upd = $pdo->prepare('UPDATE classes SET invite_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $upd->execute([$code, $classId]);
            return ['ok' => true, 'invite_code' => $code];
        } catch (Throwable $e) {
            continue;
        }
    }
    return ['ok' => false, 'error' => '重設邀請碼失敗。'];
}

/**
 * @return array{ok:bool,error?:string,created?:int}
 */
function classes_import_students_csv(PDO $pdo, string $csvContent, int $classId, array $actingUser): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到班級。'];
    }
    if (!classes_can_manage($pdo, $class, $actingUser) && !user_has_permission('user.manage')) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    $lines = preg_split('/\r\n|\r|\n/', trim($csvContent)) ?: [];
    $studentRoleId = classes_role_id_by_name($pdo, 'student');
    $created = 0;

    foreach ($lines as $i => $line) {
        $line = trim($line);
        if ($line === '' || ($i === 0 && stripos($line, 'email') !== false)) {
            continue;
        }
        $parts = str_getcsv($line);
        $email = trim((string) ($parts[0] ?? ''));
        $displayName = trim((string) ($parts[1] ?? ''));
        $password = trim((string) ($parts[2] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            continue;
        }
        if ($displayName === '') {
            $displayName = strstr($email, '@', true) ?: $email;
        }
        if ($password === '') {
            $password = bin2hex(random_bytes(4)) . 'Aa1!';
        }
        if (strlen($password) < 8) {
            continue;
        }

        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $uid = (int) ($stmt->fetchColumn() ?: 0);
        if ($uid <= 0) {
            try {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $ins = $pdo->prepare('INSERT INTO users (email, password_hash, display_name, is_active) VALUES (?, ?, ?, 1)');
                $ins->execute([$email, $hash, $displayName]);
                $uid = (int) $pdo->lastInsertId();
                $pdo->prepare('INSERT INTO student_profiles (user_id, preferred_lang) VALUES (?, ?)')->execute([$uid, 'zh']);
                $created++;
            } catch (Throwable $e) {
                continue;
            }
        }
        if ($studentRoleId > 0) {
            $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$uid, $studentRoleId]);
        }
        $pdo->prepare('INSERT INTO class_enrollments (class_id, user_id, status) VALUES (?, ?, \'active\') ON DUPLICATE KEY UPDATE status = \'active\'')->execute([$classId, $uid]);
    }

    return ['ok' => true, 'created' => $created];
}

/**
 * @return list<array<string, mixed>>
 */
function classes_students_in_class(PDO $pdo, int $classId): array
{
    $stmt = $pdo->prepare(
        'SELECT u.id, u.email, u.display_name, u.is_active, ce.status, ce.joined_at,
                sp.student_number, sp.form_level
         FROM class_enrollments ce
         INNER JOIN users u ON u.id = ce.user_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE ce.class_id = ? AND ce.status = \'active\'
         ORDER BY u.display_name ASC'
    );
    $stmt->execute([$classId]);
    return $stmt->fetchAll() ?: [];
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function classes_public_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => (string) $row['name'],
        'school_year' => (string) ($row['school_year'] ?? ''),
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'invite_code' => (string) ($row['invite_code'] ?? ''),
        'teacher_user_id' => (int) $row['teacher_user_id'],
        'teacher_name' => (string) ($row['teacher_name'] ?? ''),
        'is_active' => (bool) (int) ($row['is_active'] ?? 0),
        'student_count' => (int) ($row['student_count'] ?? 0),
    ];
}

/**
 * @param array{id:int,email:string,display_name:string} $user
 * @return array<string, mixed>
 */
function classes_enrich_user_payload(PDO $pdo, array $user): array
{
    $roles = classes_user_role_names($pdo, $user['id']);
    $profile = classes_student_profile($pdo, $user['id']);
    $classList = classes_list_for_student($pdo, $user['id']);

    return [
        'id' => $user['id'],
        'email' => $user['email'],
        'display_name' => $user['display_name'],
        'roles' => $roles,
        'is_student' => in_array('student', $roles, true),
        'is_teacher' => in_array('teacher', $roles, true) || in_array('admin', $roles, true),
        'profile' => $profile ? [
            'student_number' => $profile['student_number'],
            'form_level' => $profile['form_level'],
            'preferred_lang' => $profile['preferred_lang'],
        ] : null,
        'classes' => array_map(static function (array $c): array {
            return [
                'id' => (int) $c['id'],
                'name' => (string) $c['name'],
                'school_year' => (string) $c['school_year'],
                'status' => (string) $c['status'],
            ];
        }, $classList),
    ];
}
