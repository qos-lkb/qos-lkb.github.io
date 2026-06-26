<?php

declare(strict_types=1);

require_once __DIR__ . '/qsis_db.php';
require_once __DIR__ . '/classes_lib.php';
require_once __DIR__ . '/user_names_lib.php';

/**
 * @return list<array{yearId:string,yearFrom:int,yearEnd:int,yearText:string,thisYear:bool}>
 */
function qsis_list_years(PDO $qsis): array
{
    try {
        $rows = $qsis->query(
            'SELECT yearId, yearFrom, yearEnd, yearText, thisYear FROM setting_year ORDER BY yearId DESC'
        )->fetchAll() ?: [];
    } catch (Throwable $e) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'yearId' => (string) $row['yearId'],
            'yearFrom' => (int) ($row['yearFrom'] ?? 0),
            'yearEnd' => (int) ($row['yearEnd'] ?? 0),
            'yearText' => trim((string) ($row['yearText'] ?? '')),
            'thisYear' => (string) ($row['thisYear'] ?? '0') === '1',
        ];
    }

    return $out;
}

function qsis_current_year_id(PDO $qsis): ?string
{
    try {
        $row = $qsis->query("SELECT yearId FROM setting_year WHERE thisYear = '1' LIMIT 1")->fetch();
        if ($row) {
            return (string) $row['yearId'];
        }
    } catch (Throwable $e) {
        // setting_year may not exist
    }

    $years = qsis_list_years($qsis);
    return $years[0]['yearId'] ?? null;
}

function qsis_school_year_label(PDO $qsis, string $yearId): string
{
    foreach (qsis_list_years($qsis) as $year) {
        if ($year['yearId'] === $yearId) {
            if ($year['yearText'] !== '') {
                return $year['yearText'];
            }
            if ($year['yearFrom'] > 0 && $year['yearEnd'] > 0) {
                return $year['yearFrom'] . '-' . $year['yearEnd'];
            }
        }
    }

    return $yearId;
}

/**
 * @return list<array{class:string,student_count:int,teacher_id:?string}>
 */
function qsis_list_classes(PDO $qsis, string $yearId, ?string $formLevel = null): array
{
    $sql = "SELECT SS.`class` AS class_name, COUNT(*) AS student_count
            FROM setting_student SS
            WHERE SS.yearId = :yearId AND SS.state = '0' AND SS.`class` <> ''";
    $params = ['yearId' => $yearId];

    if ($formLevel !== null && $formLevel !== '') {
        $sql .= ' AND LEFT(SS.`class`, 1) = :formLevel';
        $params['formLevel'] = $formLevel;
    }

    $sql .= ' GROUP BY SS.`class` ORDER BY SS.`class` ASC';

    try {
        $stmt = $qsis->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        return [];
    }

    $teachers = qsis_class_teachers_map($qsis, $yearId);

    $out = [];
    foreach ($rows as $row) {
        $className = (string) $row['class_name'];
        $out[] = [
            'class' => $className,
            'student_count' => (int) ($row['student_count'] ?? 0),
            'teacher_id' => $teachers[$className] ?? null,
        ];
    }

    return $out;
}

/**
 * @return array<string, string> class => teacher_id
 */
function qsis_class_teachers_map(PDO $qsis, string $yearId): array
{
    $map = [];

    try {
        $stmt = $qsis->prepare(
            'SELECT `class`, teacher_id FROM v2_class_teacher WHERE yearId = :yearId'
        );
        $stmt->execute(['yearId' => $yearId]);
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $map[(string) $row['class']] = trim((string) ($row['teacher_id'] ?? ''));
        }
    } catch (Throwable $e) {
        // v2_class_teacher optional
    }

    if ($map !== []) {
        return $map;
    }

    try {
        $rows = $qsis->query('SELECT `class`, ct1, ct2, ct3 FROM setting_class')->fetchAll() ?: [];
        foreach ($rows as $row) {
            foreach (['ct1', 'ct2', 'ct3'] as $col) {
                $tid = trim((string) ($row[$col] ?? ''));
                if ($tid !== '') {
                    $map[(string) $row['class']] = $tid;
                    break;
                }
            }
        }
    } catch (Throwable $e) {
        // setting_class optional
    }

    return $map;
}

/**
 * @return list<array{sid:string,classNo:int,nameChi:string,nameEng:string,class:string,form_level:?string}>
 */
function qsis_list_students(PDO $qsis, string $yearId, ?array $classNames = null): array
{
    $sql = "SELECT SS.sid, SS.classNo, SS.`class` AS class_name,
                   COALESCE(D.nameChi, '') AS nameChi,
                   COALESCE(D.nameEng, '') AS nameEng
            FROM setting_student SS
            LEFT JOIN data_student_info D ON D.sid = SS.sid
            WHERE SS.yearId = :yearId AND SS.state = '0'";
    $params = ['yearId' => $yearId];

    if ($classNames !== null && $classNames !== []) {
        $placeholders = [];
        foreach (array_values($classNames) as $i => $className) {
            $key = 'class' . $i;
            $placeholders[] = ':' . $key;
            $params[$key] = $className;
        }
        $sql .= ' AND SS.`class` IN (' . implode(', ', $placeholders) . ')';
    }

    $sql .= ' ORDER BY SS.`class` ASC, SS.classNo ASC, SS.sid ASC';

    try {
        $stmt = $qsis->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        $className = (string) ($row['class_name'] ?? '');
        $out[] = [
            'sid' => (string) $row['sid'],
            'classNo' => (int) ($row['classNo'] ?? 0),
            'nameChi' => trim((string) ($row['nameChi'] ?? '')),
            'nameEng' => trim((string) ($row['nameEng'] ?? '')),
            'class' => $className,
            'form_level' => qsis_form_level_from_class($className),
        ];
    }

    return $out;
}

function qsis_form_level_from_class(string $className): ?string
{
    if ($className === '') {
        return null;
    }
    $level = $className[0];
    if (in_array($level, ['1', '2', '3', '4', '5', '6'], true)) {
        return $level;
    }

    return null;
}

function qsis_student_email(string $sid): string
{
    $domain = config_qsis_student_email_domain();
    if ($domain === '') {
        $domain = 'student.qsis.local';
    }

    return strtolower(trim($sid)) . '@' . $domain;
}

function qsis_find_local_teacher_id(PDO $local, string $qsisTeacherId, int $fallbackUserId): int
{
    $qsisTeacherId = trim($qsisTeacherId);
    if ($qsisTeacherId === '') {
        return $fallbackUserId;
    }

    $stmt = $local->prepare(
        "SELECT id FROM users
         WHERE is_active = 1
           AND (
             LOWER(SUBSTRING_INDEX(email, '@', 1)) = LOWER(?)
             OR LOWER(display_name) = LOWER(?)
             OR email LIKE ?
           )
         ORDER BY id ASC
         LIMIT 1"
    );
    $stmt->execute([$qsisTeacherId, $qsisTeacherId, $qsisTeacherId . '@%']);
    $id = (int) ($stmt->fetchColumn() ?: 0);

    return $id > 0 ? $id : $fallbackUserId;
}

function qsis_find_local_class_id(PDO $local, string $className, string $schoolYear): int
{
    $stmt = $local->prepare('SELECT id FROM classes WHERE name = ? AND school_year = ? LIMIT 1');
    $stmt->execute([$className, $schoolYear]);
    return (int) ($stmt->fetchColumn() ?: 0);
}

/**
 * @param array<string, mixed> $options year_id, class_names[], teacher_user_id
 * @return array{ok:bool,error?:string,created?:int,skipped?:int,updated?:int}
 */
function qsis_import_classes(PDO $local, PDO $qsis, array $options, int $actingUserId): array
{
    $yearId = trim((string) ($options['year_id'] ?? ''));
    if ($yearId === '') {
        $yearId = qsis_current_year_id($qsis) ?? '';
    }
    if ($yearId === '') {
        return ['ok' => false, 'error' => '無法取得 QSIS 學年。'];
    }

    $classNames = $options['class_names'] ?? null;
    if (!is_array($classNames)) {
        $classNames = null;
    } else {
        $classNames = array_values(array_filter(array_map('strval', $classNames), static fn (string $c): bool => trim($c) !== ''));
        if ($classNames === []) {
            $classNames = null;
        }
    }

    $schoolYear = qsis_school_year_label($qsis, $yearId);
    $fallbackTeacher = (int) ($options['teacher_user_id'] ?? $actingUserId);

    $qsisClasses = qsis_list_classes($qsis, $yearId);
    if ($classNames !== null) {
        $allowed = array_flip($classNames);
        $qsisClasses = array_values(array_filter(
            $qsisClasses,
            static fn (array $row): bool => isset($allowed[$row['class']])
        ));
    }

    if ($qsisClasses === []) {
        return ['ok' => false, 'error' => 'QSIS 中沒有可匯入的班級。'];
    }

    $created = 0;
    $skipped = 0;

    foreach ($qsisClasses as $row) {
        $className = (string) $row['class'];
        if (qsis_find_local_class_id($local, $className, $schoolYear) > 0) {
            $skipped++;
            continue;
        }

        $teacherId = qsis_find_local_teacher_id($local, (string) ($row['teacher_id'] ?? ''), $fallbackTeacher);
        $inviteCode = classes_generate_invite_code();

        for ($i = 0; $i < 5; $i++) {
            try {
                $ins = $local->prepare(
                    'INSERT INTO classes (name, school_year, subject_id, invite_code, teacher_user_id, is_active)
                     VALUES (?, ?, NULL, ?, ?, 1)'
                );
                $ins->execute([$className, $schoolYear, $inviteCode, $teacherId]);
                $created++;
                break;
            } catch (Throwable $e) {
                $inviteCode = classes_generate_invite_code();
                if ($i === 4) {
                    return ['ok' => false, 'error' => '建立班級「' . $className . '」失敗。'];
                }
            }
        }
    }

    return ['ok' => true, 'created' => $created, 'skipped' => $skipped];
}

/**
 * @param array<string, mixed> $options year_id, class_names[], default_password, enroll, update_existing
 * @return array{ok:bool,error?:string,created?:int,enrolled?:int,skipped?:int,updated?:int}
 */
function qsis_import_students(PDO $local, PDO $qsis, array $options, int $actingUserId): array
{
    $yearId = trim((string) ($options['year_id'] ?? ''));
    if ($yearId === '') {
        $yearId = qsis_current_year_id($qsis) ?? '';
    }
    if ($yearId === '') {
        return ['ok' => false, 'error' => '無法取得 QSIS 學年。'];
    }

    $classNames = $options['class_names'] ?? null;
    if (!is_array($classNames)) {
        $classNames = null;
    } else {
        $classNames = array_values(array_filter(array_map('strval', $classNames), static fn (string $c): bool => trim($c) !== ''));
        if ($classNames === []) {
            $classNames = null;
        }
    }

    $defaultPassword = trim((string) ($options['default_password'] ?? ''));
    $enroll = !empty($options['enroll']);
    $updateExisting = !empty($options['update_existing']);
    $schoolYear = qsis_school_year_label($qsis, $yearId);
    $studentRoleId = classes_role_id_by_name($local, 'student');

    $students = qsis_list_students($qsis, $yearId, $classNames);
    if ($students === []) {
        return ['ok' => false, 'error' => 'QSIS 中沒有可匯入的學生。'];
    }

    $created = 0;
    $enrolled = 0;
    $skipped = 0;
    $updated = 0;

    foreach ($students as $student) {
        $sid = (string) $student['sid'];
        $email = qsis_student_email($sid);
        $nameZh = trim((string) ($student['nameChi'] ?? ''));
        $nameEn = trim((string) ($student['nameEng'] ?? ''));
        if ($nameZh === '' && $nameEn === '') {
            $nameZh = $sid;
        }
        $displayName = account_sync_display_name($nameZh, $nameEn);
        $formLevel = $student['form_level'];
        $className = (string) $student['class'];

        $stmt = $local->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $userId = (int) ($stmt->fetchColumn() ?: 0);

        if ($userId <= 0) {
            $profileStmt = $local->prepare('SELECT user_id FROM student_profiles WHERE student_number = ? LIMIT 1');
            $profileStmt->execute([$sid]);
            $userId = (int) ($profileStmt->fetchColumn() ?: 0);
        }

        if ($userId <= 0) {
            $password = $defaultPassword !== '' ? $defaultPassword : (bin2hex(random_bytes(4)) . 'Aa1!');
            if (strlen($password) < 8) {
                $skipped++;
                continue;
            }

            try {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $ins = $local->prepare(
                    'INSERT INTO users (email, password_hash, name_zh, name_en, display_name, is_active) VALUES (?, ?, ?, ?, ?, 1)'
                );
                $ins->execute([$email, $hash, $nameZh, $nameEn, $displayName]);
                $userId = (int) $local->lastInsertId();
                $created++;
            } catch (Throwable $e) {
                $skipped++;
                continue;
            }
        } elseif ($updateExisting) {
            $upd = $local->prepare(
                'UPDATE users SET name_zh = ?, name_en = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $upd->execute([$nameZh, $nameEn, $displayName, $userId]);
            $updated++;
        } else {
            $skipped++;
        }

        if ($studentRoleId > 0) {
            $local->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$userId, $studentRoleId]);
        }

        $profileExists = classes_student_profile($local, $userId);
        if ($profileExists) {
            $local->prepare(
                'UPDATE student_profiles SET student_number = ?, form_level = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
            )->execute([$sid, $formLevel, $userId]);
        } else {
            $local->prepare(
                'INSERT INTO student_profiles (user_id, student_number, form_level, preferred_lang) VALUES (?, ?, ?, ?)'
            )->execute([$userId, $sid, $formLevel, 'zh']);
        }

        if ($enroll && $className !== '') {
            $classId = qsis_find_local_class_id($local, $className, $schoolYear);
            if ($classId > 0) {
                $local->prepare(
                    'INSERT INTO class_enrollments (class_id, user_id, status) VALUES (?, ?, \'active\')
                     ON DUPLICATE KEY UPDATE status = \'active\''
                )->execute([$classId, $userId]);
                $enrolled++;
            }
        }
    }

    return [
        'ok' => true,
        'created' => $created,
        'enrolled' => $enrolled,
        'skipped' => $skipped,
        'updated' => $updated,
    ];
}

/**
 * @return array{ok:bool,error?:string,classes_created?:int,classes_skipped?:int,students_created?:int,students_enrolled?:int,students_skipped?:int,students_updated?:int}
 */
function qsis_import_all(PDO $local, PDO $qsis, array $options, int $actingUserId): array
{
    $classResult = qsis_import_classes($local, $qsis, $options, $actingUserId);
    if (!$classResult['ok']) {
        return $classResult;
    }

    $studentOptions = $options;
    $studentOptions['enroll'] = true;
    $studentResult = qsis_import_students($local, $qsis, $studentOptions, $actingUserId);
    if (!$studentResult['ok']) {
        return $studentResult;
    }

    return [
        'ok' => true,
        'classes_created' => (int) ($classResult['created'] ?? 0),
        'classes_skipped' => (int) ($classResult['skipped'] ?? 0),
        'students_created' => (int) ($studentResult['created'] ?? 0),
        'students_enrolled' => (int) ($studentResult['enrolled'] ?? 0),
        'students_skipped' => (int) ($studentResult['skipped'] ?? 0),
        'students_updated' => (int) ($studentResult['updated'] ?? 0),
    ];
}
