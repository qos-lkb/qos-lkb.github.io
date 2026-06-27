<?php

declare(strict_types=1);

require_once __DIR__ . '/user_names_lib.php';

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

function classes_normalize_form_class(?string $value): ?string
{
    if ($value === null) {
        return null;
    }
    $v = strtoupper(trim($value));

    return $v !== '' ? $v : null;
}

function classes_normalize_class_no($value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    $n = (int) $value;

    return $n > 0 ? $n : null;
}

function classes_normalize_moi($value): ?string
{
    $v = strtoupper(trim((string) ($value ?? '')));
    if ($v === 'E' || $v === 'C') {
        return $v;
    }

    return null;
}

function classes_moi_display(?string $moi): string
{
    if ($moi === 'E') {
        return '英文 (E)';
    }
    if ($moi === 'C') {
        return '中文 (C)';
    }

    return '—';
}

/**
 * 加入或更新課程選課；可選 form_class（班別）、class_no（班號）、moi（應考語言 E/C）。
 *
 * @param array{form_class?:string|null,class_no?:int|string|null,moi?:string|null} $meta
 */
function classes_upsert_enrollment(PDO $pdo, int $classId, int $userId, array $meta = []): void
{
    $hasFormClass = array_key_exists('form_class', $meta);
    $hasClassNo = array_key_exists('class_no', $meta);
    $hasMoi = array_key_exists('moi', $meta);
    $formClass = $hasFormClass ? classes_normalize_form_class($meta['form_class'] !== null ? (string) $meta['form_class'] : null) : null;
    $classNo = $hasClassNo ? classes_normalize_class_no($meta['class_no']) : null;
    $moi = $hasMoi ? classes_normalize_moi($meta['moi']) : null;

    $stmt = $pdo->prepare(
        'SELECT id FROM class_enrollments WHERE class_id = ? AND user_id = ? LIMIT 1'
    );
    $stmt->execute([$classId, $userId]);
    $existingId = (int) ($stmt->fetchColumn() ?: 0);

    if ($existingId > 0) {
        $updates = ['status = \'active\''];
        $params = [];
        if ($hasFormClass) {
            $updates[] = 'form_class = ?';
            $params[] = $formClass;
        }
        if ($hasClassNo) {
            $updates[] = 'class_no = ?';
            $params[] = $classNo;
        }
        if ($hasMoi) {
            $updates[] = 'moi = ?';
            $params[] = $moi;
        }
        $params[] = $existingId;
        $pdo->prepare('UPDATE class_enrollments SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

        return;
    }

    $pdo->prepare(
        'INSERT INTO class_enrollments (class_id, user_id, status, form_class, class_no, moi) VALUES (?, ?, \'active\', ?, ?, ?)'
    )->execute([
        $classId,
        $userId,
        $hasFormClass ? $formClass : null,
        $hasClassNo ? $classNo : null,
        $hasMoi ? $moi : null,
    ]);
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
        'SELECT c.id, c.name, c.school_year, c.subject_id, ce.status, ce.joined_at, ce.form_class, ce.class_no, ce.moi
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
function classes_register_student(PDO $pdo, string $email, string $password, string $nameZh, string $nameEn, string $inviteCode): array
{
    $email = trim($email);
    $nameZh = trim($nameZh);
    $nameEn = trim($nameEn);
    $inviteCode = strtoupper(trim($inviteCode));

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => '請輸入有效電郵。'];
    }
    if (strlen($password) < 8) {
        return ['ok' => false, 'error' => '密碼至少 8 字元。'];
    }
    $nameValid = account_validate_names($nameZh, $nameEn);
    if (!$nameValid['ok']) {
        return $nameValid;
    }
    $displayName = account_sync_display_name($nameZh, $nameEn);
    if ($inviteCode === '') {
        return ['ok' => false, 'error' => '請輸入課程邀請碼。'];
    }

    $class = classes_fetch_by_invite_code($pdo, $inviteCode);
    if ($class === null) {
        return ['ok' => false, 'error' => '邀請碼無效或課程已停用。'];
    }

    $studentRoleId = classes_role_id_by_name($pdo, 'student');
    if ($studentRoleId <= 0) {
        return ['ok' => false, 'error' => '系統尚未設定學生角色。'];
    }

    try {
        $pdo->beginTransaction();

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $ins = $pdo->prepare('INSERT INTO users (email, password_hash, name_zh, name_en, display_name, is_active) VALUES (?, ?, ?, ?, ?, 1)');
        $ins->execute([$email, $hash, $nameZh, $nameEn, $displayName]);
        $userId = (int) $pdo->lastInsertId();

        $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$userId, $studentRoleId]);
        $pdo->prepare('INSERT INTO student_profiles (user_id, preferred_lang) VALUES (?, ?)')->execute([$userId, 'zh']);
        classes_upsert_enrollment($pdo, (int) $class['id'], $userId);

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
        return ['ok' => false, 'error' => '請輸入課程名稱。'];
    }

    $acting = current_user();
    assert($acting !== null);
    if (!user_has_permission('class.manage_any') && $teacherUserId !== $acting['id']) {
        return ['ok' => false, 'error' => '無法指定其他教師為課程任教老師。'];
    }

    if ($id > 0) {
        $existing = classes_fetch_by_id($pdo, $id);
        if ($existing === null) {
            return ['ok' => false, 'error' => '找不到課程。'];
        }
        if (!classes_can_manage($pdo, $existing, $acting)) {
            return ['ok' => false, 'error' => '沒有權限編輯此課程。'];
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
    return ['ok' => false, 'error' => '建立課程失敗。'];
}

/**
 * 課程列表內聯更新（學年、任教老師）。
 *
 * @param array<string, mixed> $post 期望 id, school_year, teacher_user_id
 * @return array{ok:bool,error?:string,school_year?:string,teacher_user_id?:int,teacher_name?:string}
 */
function classes_inline_update(PDO $pdo, array $post, array $user): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $id = (int) ($post['id'] ?? 0);
    if ($id <= 0) {
        return ['ok' => false, 'error' => '無效的課程。'];
    }

    $class = classes_fetch_by_id($pdo, $id);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到課程。'];
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        return ['ok' => false, 'error' => '沒有權限編輯此課程。'];
    }

    $schoolYear = trim((string) ($post['school_year'] ?? ''));
    $canAny = user_has_permission('class.manage_any');
    $teacherUserId = (int) ($class['teacher_user_id'] ?? 0);

    if ($canAny) {
        $teacherUserId = (int) ($post['teacher_user_id'] ?? $teacherUserId);
        if ($teacherUserId <= 0) {
            return ['ok' => false, 'error' => '請選擇任教老師。'];
        }
        $tStmt = $pdo->prepare(
            "SELECT u.id FROM users u
             INNER JOIN user_roles ur ON ur.user_id = u.id
             INNER JOIN roles r ON r.id = ur.role_id
             WHERE u.id = ? AND u.is_active = 1 AND r.name IN ('teacher', 'admin')
             LIMIT 1"
        );
        $tStmt->execute([$teacherUserId]);
        if (!$tStmt->fetch()) {
            return ['ok' => false, 'error' => '無效的任教老師。'];
        }
    }

    try {
        $upd = $pdo->prepare(
            'UPDATE classes SET school_year = ?, teacher_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        $upd->execute([$schoolYear, $teacherUserId, $id]);
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '儲存失敗。'];
    }

    $nameStmt = $pdo->prepare('SELECT name_zh, name_en, display_name FROM users WHERE id = ? LIMIT 1');
    $nameStmt->execute([$teacherUserId]);
    $teacherRow = $nameStmt->fetch() ?: [];

    return [
        'ok' => true,
        'school_year' => $schoolYear,
        'teacher_user_id' => $teacherUserId,
        'teacher_name' => user_format_name($teacherRow),
    ];
}

/**
 * @return list<array{id:int,label:string}>
 */
function classes_teacher_options(PDO $pdo): array
{
    $rows = $pdo->query(
        "SELECT DISTINCT u.id, u.name_zh, u.name_en, u.display_name FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.name IN ('teacher', 'admin') AND u.is_active = 1
         ORDER BY u.display_name"
    )->fetchAll() ?: [];

    $options = [];
    foreach ($rows as $row) {
        $options[] = [
            'id' => (int) $row['id'],
            'label' => user_format_name($row),
        ];
    }

    return $options;
}

/**
 * @param array<string, mixed> $post
 * @return array{ok:bool,error?:string}
 */
function classes_delete(PDO $pdo, array $post, array $user): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $id = (int) ($post['id'] ?? 0);
    if ($id <= 0) {
        return ['ok' => false, 'error' => '無效的課程。'];
    }

    $class = classes_fetch_by_id($pdo, $id);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到課程。'];
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        return ['ok' => false, 'error' => '沒有權限刪除此課程。'];
    }

    try {
        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM class_enrollments WHERE class_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM classes WHERE id = ?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '刪除課程失敗。'];
    }

    return ['ok' => true];
}

/**
 * @param array<string, mixed> $post 期望 ids[]
 * @return array{ok:bool,error?:string,deleted?:int,message?:string}
 */
function classes_delete_many(PDO $pdo, array $post, array $user): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }

    $ids = $post['ids'] ?? [];
    if (!is_array($ids)) {
        $ids = [];
    }
    $ids = array_values(array_unique(array_filter(
        array_map('intval', $ids),
        static fn (int $id): bool => $id > 0
    )));
    if ($ids === []) {
        return ['ok' => false, 'error' => '請選擇至少一門課程。'];
    }

    $deleted = 0;
    $skipped = 0;

    foreach ($ids as $id) {
        $class = classes_fetch_by_id($pdo, $id);
        if ($class === null) {
            continue;
        }
        if (!classes_can_manage($pdo, $class, $user)) {
            $skipped++;
            continue;
        }

        try {
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM class_enrollments WHERE class_id = ?')->execute([$id]);
            $pdo->prepare('DELETE FROM classes WHERE id = ?')->execute([$id]);
            $pdo->commit();
            $deleted++;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
        }
    }

    if ($deleted === 0) {
        return ['ok' => false, 'error' => $skipped > 0 ? '沒有權限刪除所選課程。' : '刪除失敗。'];
    }

    $message = '已刪除 ' . $deleted . ' 門課程。';
    if ($skipped > 0) {
        $message .= '（' . $skipped . ' 門因權限不足略過）';
    }

    return ['ok' => true, 'deleted' => $deleted, 'message' => $message];
}

/**
 * @return array{ok:bool,error?:string,enrolled?:int}
 */
function classes_enroll_users(PDO $pdo, int $classId, array $emails, array $user): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到課程。'];
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
        classes_upsert_enrollment($pdo, $classId, $uid);
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
        return ['ok' => false, 'error' => '找不到課程。'];
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
        return ['ok' => false, 'error' => '找不到課程。'];
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
        $nameZh = trim((string) ($parts[1] ?? ''));
        $nameEn = trim((string) ($parts[2] ?? ''));
        $password = trim((string) ($parts[3] ?? ''));
        $formClass = trim((string) ($parts[4] ?? ''));
        $classNoRaw = trim((string) ($parts[5] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            continue;
        }
        if ($nameZh === '' && $nameEn === '') {
            $localPart = strstr($email, '@', true) ?: $email;
            $nameZh = $localPart;
        }
        $displayName = account_sync_display_name($nameZh, $nameEn);
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
                $ins = $pdo->prepare('INSERT INTO users (email, password_hash, name_zh, name_en, display_name, is_active) VALUES (?, ?, ?, ?, ?, 1)');
                $ins->execute([$email, $hash, $nameZh, $nameEn, $displayName]);
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
        $enrollMeta = [];
        if ($formClass !== '') {
            $enrollMeta['form_class'] = $formClass;
        }
        if ($classNoRaw !== '') {
            $enrollMeta['class_no'] = $classNoRaw;
        }
        $moiRaw = trim((string) ($parts[6] ?? ''));
        if ($moiRaw !== '') {
            $enrollMeta['moi'] = $moiRaw;
        }
        classes_upsert_enrollment($pdo, $classId, $uid, $enrollMeta);
    }

    return ['ok' => true, 'created' => $created];
}

/**
 * @return list<array<string, mixed>>
 */
function classes_students_in_class(PDO $pdo, int $classId): array
{
    $stmt = $pdo->prepare(
        'SELECT u.id, u.email, u.display_name, u.name_zh, u.name_en, u.is_active, ce.status, ce.joined_at,
                ce.form_class, ce.class_no, ce.moi, sp.student_number, sp.form_level
         FROM class_enrollments ce
         INNER JOIN users u ON u.id = ce.user_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE ce.class_id = ? AND ce.status = \'active\'
         ORDER BY ce.form_class ASC, ce.class_no ASC, u.display_name ASC'
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
        'name_zh' => (string) ($user['name_zh'] ?? ''),
        'name_en' => (string) ($user['name_en'] ?? ''),
        'display_name' => user_format_name($user),
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
                'form_class' => isset($c['form_class']) && $c['form_class'] !== null && $c['form_class'] !== ''
                    ? (string) $c['form_class'] : null,
                'class_no' => isset($c['class_no']) && $c['class_no'] !== null && $c['class_no'] !== ''
                    ? (int) $c['class_no'] : null,
                'moi' => classes_normalize_moi($c['moi'] ?? null),
            ];
        }, $classList),
    ];
}
