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
        $row = $qsis->query('SELECT yearId FROM setting_year WHERE thisYear = 1 LIMIT 1')->fetch();
        if ($row) {
            return (string) $row['yearId'];
        }
    } catch (Throwable $e) {
        // setting_year may not exist
    }

    $years = qsis_list_years($qsis);
    return $years[0]['yearId'] ?? null;
}

/**
 * Coerce a string column to utf8mb4_unicode_ci for joins across mixed QSIS collations.
 */
function qsis_sql_ci(string $expr): string
{
    return $expr . ' COLLATE utf8mb4_unicode_ci';
}

function qsis_school_year_label(PDO $qsis, string $yearId): string
{
    foreach (qsis_list_years($qsis) as $year) {
        if ($year['yearId'] === $yearId) {
            $label = qsis_format_school_year($year['yearFrom'], $year['yearEnd'], $yearId);
            if ($label !== '') {
                return $label;
            }
        }
    }

    return qsis_format_school_year(0, 0, $yearId) ?: $yearId;
}

/**
 * Local classes use 2025/26 (not Chinese yearText or 2025-2026).
 */
function qsis_format_school_year(int $from, int $end, string $yearId): string
{
    if ($from > 0 && $end > 0) {
        return $from . '/' . substr((string) $end, -2);
    }
    if (preg_match('/^(\d{2})(\d{2})$/', $yearId, $m) === 1) {
        $from2 = (int) $m[1];
        $century = $from2 >= 50 ? 1900 : 2000;

        return ($century + $from2) . '/' . $m[2];
    }

    return '';
}

function qsis_year_id_for_school_year_label(PDO $qsis, string $label): ?string
{
    $label = trim($label);
    if ($label === '') {
        return null;
    }
    foreach (qsis_list_years($qsis) as $year) {
        if (qsis_school_year_label($qsis, $year['yearId']) === $label) {
            return $year['yearId'];
        }
    }

    return null;
}

/**
 * Prefer the QSIS year that matches local classes, not QSIS thisYear
 * (which may already be the next year during summer).
 */
function qsis_suggested_year_id(PDO $local, PDO $qsis): ?string
{
    try {
        $row = $local->query(
            'SELECT school_year, COUNT(*) AS n FROM classes WHERE is_active = 1
             GROUP BY school_year ORDER BY n DESC, school_year DESC LIMIT 1'
        )->fetch();
    } catch (Throwable $e) {
        $row = false;
    }
    $label = is_array($row) ? trim((string) ($row['school_year'] ?? '')) : '';
    $fromLocal = $label !== '' ? qsis_year_id_for_school_year_label($qsis, $label) : null;
    if ($fromLocal !== null) {
        return $fromLocal;
    }

    return qsis_current_year_id($qsis);
}

function qsis_dominant_local_school_year(PDO $local): string
{
    try {
        $label = (string) $local->query(
            'SELECT school_year FROM classes WHERE is_active = 1
             GROUP BY school_year ORDER BY COUNT(*) DESC, school_year DESC LIMIT 1'
        )->fetchColumn();
    } catch (Throwable $e) {
        return '';
    }

    return trim($label);
}

/**
 * Map QSIS subject_id to local classes.course_subject (science subjects only).
 */
function qsis_map_local_course_subject(string $subjectId): ?string
{
    $id = strtoupper(trim($subjectId));
    $map = [
        'IS' => 'integrated_science',
        'SCI' => 'integrated_science',
        'INTSCI' => 'integrated_science',
        'PHY' => 'physics',
        'PHYSICS' => 'physics',
        'CHEM' => 'chemistry',
        'CHEMISTRY' => 'chemistry',
        'BIO' => 'biology',
        'BIOLOGY' => 'biology',
    ];

    return $map[$id] ?? null;
}

/**
 * @param array<string, mixed> $course
 */
function qsis_course_display_name(array $course): string
{
    $zh = trim((string) ($course['coursename_c'] ?? ''));
    $en = trim((string) ($course['coursename_e'] ?? ''));
    $name = $zh !== '' ? $zh : $en;
    if ($name === '') {
        $name = trim((string) ($course['course_code'] ?? ''));
    }
    if ($name === '') {
        $name = 'Course ' . (int) ($course['course_id'] ?? 0);
    }

    return $name;
}

/**
 * @return list<array{kla_id:int,kla_code:string,kla_name_zh:?string,kla_name_en:?string}>
 */
function qsis_list_klas(PDO $qsis): array
{
    try {
        $rows = $qsis->query(
            'SELECT kla_id, kla_code, kla_name_zh, kla_name_en FROM v2_kla_record ORDER BY kla_code ASC'
        )->fetchAll() ?: [];
    } catch (Throwable $e) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'kla_id' => (int) ($row['kla_id'] ?? 0),
            'kla_code' => trim((string) ($row['kla_code'] ?? '')),
            'kla_name_zh' => trim((string) ($row['kla_name_zh'] ?? '')) ?: null,
            'kla_name_en' => trim((string) ($row['kla_name_en'] ?? '')) ?: null,
        ];
    }

    return $out;
}

/**
 * @param array{kla_code?:string,kla_name_zh?:?string,kla_name_en?:?string} $kla
 */
function qsis_kla_display_name(array $kla): string
{
    $zh = trim((string) ($kla['kla_name_zh'] ?? ''));
    if ($zh !== '') {
        return $zh;
    }
    $en = trim((string) ($kla['kla_name_en'] ?? ''));
    if ($en !== '') {
        return $en;
    }
    $code = trim((string) ($kla['kla_code'] ?? ''));

    return $code !== '' ? $code : 'KLA';
}

/**
 * v2_course_record columns: course_id, level, class, course_code,
 * coursename_e, coursename_c, subject_id, kla_id, isDSEElective, remark.
 *
 * @param array<string, mixed> $row
 * @return array{course_id:int,course_code:string,coursename_e:string,coursename_c:string,level:int,class:string,subject_id:string,kla_id:?int,kla_code:?string,kla_name:?string,is_dse_elective:bool,remark:string,teacher_id:?string,student_count:int}
 */
function qsis_map_course_row(array $row): array
{
    $electiveRaw = $row['isDSEElective'] ?? 0;

    return [
        'course_id' => (int) $row['course_id'],
        'course_code' => trim((string) ($row['course_code'] ?? '')),
        'coursename_e' => trim((string) ($row['coursename_e'] ?? '')),
        'coursename_c' => trim((string) ($row['coursename_c'] ?? '')),
        'level' => (int) ($row['level'] ?? 0),
        'class' => trim((string) ($row['class'] ?? '')),
        'subject_id' => trim((string) ($row['subject_id'] ?? '')),
        'kla_id' => isset($row['kla_id']) && $row['kla_id'] !== null && $row['kla_id'] !== ''
            ? (int) $row['kla_id'] : null,
        'kla_code' => trim((string) ($row['kla_code'] ?? '')) ?: null,
        'kla_name' => qsis_kla_display_name([
            'kla_code' => (string) ($row['kla_code'] ?? ''),
            'kla_name_zh' => $row['kla_name_zh'] ?? null,
            'kla_name_en' => $row['kla_name_en'] ?? null,
        ]),
        'is_dse_elective' => $electiveRaw === true
            || (int) $electiveRaw === 1
            || strcasecmp(trim((string) $electiveRaw), 'Y') === 0,
        'remark' => trim((string) ($row['remark'] ?? '')),
        // Teachers are no longer on v2_course_record; import uses the UI default.
        'teacher_id' => null,
        'student_count' => (int) ($row['student_count'] ?? 0),
    ];
}

/**
 * v2_course_record has no yearId; the table is the current course catalogue.
 * Year only filters student_count / later student import via setting_student.
 *
 * @return list<array{course_id:int,course_code:string,coursename_e:string,coursename_c:string,level:int,class:string,subject_id:string,kla_id:?int,kla_code:?string,kla_name:?string,is_dse_elective:bool,remark:string,teacher_id:?string,student_count:int}>
 */
function qsis_list_courses(PDO $qsis, string $yearId, ?int $klaId = null): array
{
    $sidJoin = qsis_sql_ci('S.sid') . ' = ' . qsis_sql_ci('E.member_id');
    $subjectJoin = qsis_sql_ci('C.subject_id') . ' = ' . qsis_sql_ci('Sub.subject_id');
    // C.kla_id is varchar; v2_kla_record.kla_id is numeric.
    $klaJoin = "K.kla_id = COALESCE(IF(C.kla_id REGEXP '^[0-9]+$', NULLIF(CAST(C.kla_id AS UNSIGNED), 0), NULL), NULLIF(Sub.kla_id, 0))";

    $sql = "SELECT C.course_id, C.course_code, C.coursename_e, C.coursename_c,
                   C.level, C.`class`, C.subject_id, C.isDSEElective, C.remark,
                   K.kla_id, K.kla_code, K.kla_name_zh, K.kla_name_en,
                   COUNT(DISTINCT S.sid) AS student_count
            FROM v2_course_record C
            LEFT JOIN v2_enrolment_record E ON E.course_id = C.course_id AND E.role = 'S'
            LEFT JOIN setting_student S ON {$sidJoin} AND S.yearId = :yearId AND S.state = 0
            LEFT JOIN v2_subject_record Sub ON {$subjectJoin}
            LEFT JOIN v2_kla_record K ON {$klaJoin}
            WHERE 1=1";
    $params = ['yearId' => $yearId];

    if ($klaId !== null && $klaId > 0) {
        $sql .= ' AND K.kla_id = :klaId';
        $params['klaId'] = $klaId;
    }

    $sql .= ' GROUP BY C.course_id, C.course_code, C.coursename_e, C.coursename_c,
                     C.level, C.`class`, C.subject_id, C.isDSEElective, C.remark,
                     K.kla_id, K.kla_code, K.kla_name_zh, K.kla_name_en
              ORDER BY K.kla_code ASC, C.level ASC, C.`class` ASC, C.coursename_e ASC, C.course_id ASC';

    try {
        $stmt = $qsis->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        if ($klaId !== null && $klaId > 0) {
            throw $e;
        }
        // Fallback: list the catalogue even if KLA / collation joins fail.
        $rows = $qsis->query(
            'SELECT course_id, course_code, coursename_e, coursename_c, level, `class`,
                    subject_id, kla_id, isDSEElective, remark,
                    NULL AS kla_code, NULL AS kla_name_zh, NULL AS kla_name_en,
                    0 AS student_count
             FROM v2_course_record
             ORDER BY level ASC, `class` ASC, coursename_e ASC, course_id ASC'
        )->fetchAll() ?: [];
    }

    $out = [];
    foreach ($rows as $row) {
        $out[] = qsis_map_course_row($row);
    }

    return $out;
}

/**
 * @return array<int, array<string, mixed>> course_id => course row
 */
function qsis_fetch_courses_by_ids(PDO $qsis, string $yearId, array $courseIds): array
{
    $all = qsis_list_courses($qsis, $yearId);
    $wanted = array_flip(array_map('intval', $courseIds));
    $map = [];
    foreach ($all as $row) {
        $id = (int) $row['course_id'];
        if (isset($wanted[$id])) {
            $map[$id] = $row;
        }
    }

    return $map;
}

/**
 * @return list<array{sid:string,classNo:int,nameChi:string,nameEng:string,class:string,form_level:?string,course_id:int,moi:?string}>
 */
function qsis_list_students(PDO $qsis, string $yearId, ?array $courseIds = null): array
{
    $sidJoin = qsis_sql_ci('SS.sid') . ' = ' . qsis_sql_ci('E.member_id');
    $infoJoin = qsis_sql_ci('D.sid') . ' = ' . qsis_sql_ci('SS.sid');

    $sql = "SELECT SS.sid, SS.classNo, SS.`class` AS class_name,
                   COALESCE(D.nameChi, '') AS nameChi,
                   COALESCE(D.nameEng, '') AS nameEng,
                   E.course_id, E.moi
            FROM v2_enrolment_record E
            INNER JOIN setting_student SS ON {$sidJoin} AND SS.yearId = :yearId AND SS.state = 0
            LEFT JOIN data_student_info D ON {$infoJoin}
            WHERE E.role = 'S'";
    $params = ['yearId' => $yearId];

    if ($courseIds !== null && $courseIds !== []) {
        $placeholders = [];
        foreach (array_values($courseIds) as $i => $courseId) {
            $key = 'course' . $i;
            $placeholders[] = ':' . $key;
            $params[$key] = (int) $courseId;
        }
        $sql .= ' AND E.course_id IN (' . implode(', ', $placeholders) . ')';
    }

    $sql .= ' ORDER BY E.course_id ASC, SS.`class` ASC, SS.classNo ASC, SS.sid ASC';

    $stmt = $qsis->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

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
            'course_id' => (int) ($row['course_id'] ?? 0),
            'moi' => classes_normalize_moi($row['moi'] ?? null),
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
    // Login id = QSIS username (sid); no @qos.edu.hk — keep both DBs aligned.
    return strtolower(trim($sid));
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
 * @param array<string, mixed> $course
 */
function qsis_resolve_local_class_name(PDO $local, array $course, string $schoolYear): string
{
    $base = qsis_course_display_name($course);
    if (qsis_find_local_class_id($local, $base, $schoolYear) <= 0) {
        return $base;
    }

    $code = trim((string) ($course['course_code'] ?? ''));
    if ($code !== '') {
        $withCode = $base . ' [' . $code . ']';
        if (qsis_find_local_class_id($local, $withCode, $schoolYear) <= 0) {
            return $withCode;
        }
    }

    return $base . ' #' . (int) ($course['course_id'] ?? 0);
}

/**
 * @param array<string, mixed> $course
 * @return list<string>
 */
function qsis_local_class_name_candidates(array $course): array
{
    $base = qsis_course_display_name($course);
    $classLabel = trim((string) ($course['class'] ?? ''));
    $code = trim((string) ($course['course_code'] ?? ''));

    $candidates = [$base];
    if ($classLabel !== '') {
        $candidates[] = $base . ' (' . $classLabel . ')';
    }
    if ($code !== '') {
        $candidates[] = $base . ' [' . $code . ']';
    }

    $out = [];
    foreach ($candidates as $name) {
        $name = trim($name);
        if ($name === '' || in_array($name, $out, true)) {
            continue;
        }
        $out[] = $name;
    }

    return $out;
}

/**
 * @param array<string, mixed> $options year_id, course_ids[], teacher_user_id
 * @return array{ok:bool,error?:string,created?:int,skipped?:int}
 */
function qsis_import_courses(PDO $local, PDO $qsis, array $options, int $actingUserId): array
{
    $yearId = trim((string) ($options['year_id'] ?? ''));
    if ($yearId === '') {
        $yearId = qsis_current_year_id($qsis) ?? '';
    }
    if ($yearId === '') {
        return ['ok' => false, 'error' => '無法取得 QSIS 學年。'];
    }

    $courseIds = $options['course_ids'] ?? [];
    if (!is_array($courseIds)) {
        $courseIds = [];
    }
    $courseIds = array_values(array_filter(array_map('intval', $courseIds), static fn (int $id): bool => $id > 0));
    if ($courseIds === []) {
        return ['ok' => false, 'error' => '請選擇至少一門課程。'];
    }

    $schoolYear = qsis_school_year_label($qsis, $yearId);
    $fallbackTeacher = (int) ($options['teacher_user_id'] ?? $actingUserId);
    $courses = qsis_fetch_courses_by_ids($qsis, $yearId, $courseIds);

    if ($courses === []) {
        return ['ok' => false, 'error' => 'QSIS 中沒有可匯入的課程。'];
    }

    $created = 0;
    $skipped = 0;

    foreach ($courseIds as $courseId) {
        $course = $courses[$courseId] ?? null;
        if ($course === null) {
            continue;
        }

        $className = qsis_resolve_local_class_name($local, $course, $schoolYear);
        if (qsis_find_local_class_id($local, $className, $schoolYear) > 0) {
            $skipped++;
            continue;
        }

        $teacherId = qsis_find_local_teacher_id($local, (string) ($course['teacher_id'] ?? ''), $fallbackTeacher);
        $inviteCode = classes_generate_invite_code();
        $formLevel = classes_normalize_form_level((string) ((int) ($course['level'] ?? 0)));
        $courseSubject = qsis_map_local_course_subject((string) ($course['subject_id'] ?? ''));
        $hasFormSubject = classes_has_form_subject_columns($local);

        for ($i = 0; $i < 5; $i++) {
            try {
                if ($hasFormSubject) {
                    $ins = $local->prepare(
                        'INSERT INTO classes (name, school_year, form_level, course_subject, subject_id, invite_code, teacher_user_id, is_active)
                         VALUES (?, ?, ?, ?, NULL, ?, ?, 1)'
                    );
                    $ins->execute([$className, $schoolYear, $formLevel, $courseSubject, $inviteCode, $teacherId]);
                } else {
                    $ins = $local->prepare(
                        'INSERT INTO classes (name, school_year, subject_id, invite_code, teacher_user_id, is_active)
                         VALUES (?, ?, NULL, ?, ?, 1)'
                    );
                    $ins->execute([$className, $schoolYear, $inviteCode, $teacherId]);
                }
                $created++;
                break;
            } catch (Throwable $e) {
                $inviteCode = classes_generate_invite_code();
                if ($i === 4) {
                    return ['ok' => false, 'error' => '建立課程「' . $className . '」失敗。'];
                }
            }
        }
    }

    return ['ok' => true, 'created' => $created, 'skipped' => $skipped];
}

/**
 * @return array<int, string> course_id => local class name
 */
function qsis_local_class_names_for_courses(PDO $local, PDO $qsis, string $yearId, array $courseIds): array
{
    $schoolYear = qsis_school_year_label($qsis, $yearId);
    $courses = qsis_fetch_courses_by_ids($qsis, $yearId, $courseIds);
    $map = [];

    foreach ($courseIds as $courseId) {
        $courseId = (int) $courseId;
        $course = $courses[$courseId] ?? null;
        if ($course === null) {
            continue;
        }
        $candidates = qsis_local_class_name_candidates($course);
        $candidates[] = ($candidates[0] ?? qsis_course_display_name($course)) . ' #' . $courseId;
        foreach ($candidates as $name) {
            $name = trim($name);
            if ($name === '' || str_ends_with($name, ' []')) {
                continue;
            }
            if (qsis_find_local_class_id($local, $name, $schoolYear) > 0) {
                $map[$courseId] = $name;
                break;
            }
        }
    }

    return $map;
}

/**
 * @param array<string, mixed> $options year_id, course_ids[], enroll, update_existing
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

    $courseIds = $options['course_ids'] ?? [];
    if (!is_array($courseIds)) {
        $courseIds = [];
    }
    $courseIds = array_values(array_filter(array_map('intval', $courseIds), static fn (int $id): bool => $id > 0));
    if ($courseIds === []) {
        return ['ok' => false, 'error' => '請選擇至少一門課程。'];
    }

    $enroll = !empty($options['enroll']);
    $updateExisting = !empty($options['update_existing']);
    $schoolYear = qsis_school_year_label($qsis, $yearId);
    $studentRoleId = classes_role_id_by_name($local, 'student');
    $classNameByCourse = qsis_local_class_names_for_courses($local, $qsis, $yearId, $courseIds);

    $students = qsis_list_students($qsis, $yearId, $courseIds);
    if ($students === []) {
        return ['ok' => false, 'error' => 'QSIS 中沒有可匯入的學生。'];
    }

    $created = 0;
    $enrolled = 0;
    $skipped = 0;
    $updated = 0;
    $processedAccounts = [];

    foreach ($students as $student) {
        $sid = (string) $student['sid'];
        $courseId = (int) ($student['course_id'] ?? 0);
        $email = qsis_student_email($sid);
        $nameZh = trim((string) ($student['nameChi'] ?? ''));
        $nameEn = trim((string) ($student['nameEng'] ?? ''));
        if ($nameZh === '' && $nameEn === '') {
            $nameZh = $sid;
        }
        $displayName = account_sync_display_name($nameZh, $nameEn);
        $formLevel = $student['form_level'];

        if (!isset($processedAccounts[$sid])) {
            require_once __DIR__ . '/qsis_auth_lib.php';
            $loginId = auth_normalize_login_identity($email);
            $existing = auth_find_local_user_by_login($local, $loginId);
            $userId = $existing !== null ? (int) $existing['id'] : 0;

            if ($userId <= 0) {
                $profileStmt = $local->prepare('SELECT user_id FROM student_profiles WHERE student_number = ? LIMIT 1');
                $profileStmt->execute([$sid]);
                $userId = (int) ($profileStmt->fetchColumn() ?: 0);
            }

            if ($userId <= 0) {
                try {
                    $ins = $local->prepare(
                        'INSERT INTO users (email, name_zh, name_en, display_name, is_active) VALUES (?, ?, ?, ?, 1)'
                    );
                    $ins->execute([$loginId, $nameZh, $nameEn, $displayName]);
                    $userId = (int) $local->lastInsertId();
                    $created++;
                } catch (Throwable $e) {
                    $skipped++;
                    $processedAccounts[$sid] = 0;
                    continue;
                }
            } elseif ($updateExisting) {
                $upd = $local->prepare(
                    'UPDATE users SET email = ?, name_zh = ?, name_en = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
                );
                $upd->execute([$loginId, $nameZh, $nameEn, $displayName, $userId]);
                $updated++;
            } else {
                // Still align login id with QSIS username when possible.
                if ($existing !== null && (string) $existing['email'] !== $loginId) {
                    try {
                        $local->prepare(
                            'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
                        )->execute([$loginId, $userId]);
                    } catch (Throwable $e) {
                        // ignore unique conflicts
                    }
                }
                $skipped++;
            }

            if ($userId > 0) {
                if ($studentRoleId > 0) {
                    $local->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$userId, $studentRoleId]);
                }

                $profileExists = classes_student_profile($local, $userId);
                if ($profileExists) {
                    // Do not overwrite form_level / student_number unless explicitly requested.
                    // QSIS thisYear may already be the next school year during summer.
                    if ($updateExisting) {
                        $local->prepare(
                            'UPDATE student_profiles SET student_number = ?, form_level = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
                        )->execute([$sid, $formLevel, $userId]);
                    }
                } else {
                    $local->prepare(
                        'INSERT INTO student_profiles (user_id, student_number, form_level, preferred_lang) VALUES (?, ?, ?, ?)'
                    )->execute([$userId, $sid, $formLevel, 'zh']);
                }
            }

            $processedAccounts[$sid] = $userId;
        }

        $userId = (int) ($processedAccounts[$sid] ?? 0);
        if ($enroll && $userId > 0 && $courseId > 0) {
            $localClassName = $classNameByCourse[$courseId] ?? null;
            if ($localClassName !== null) {
                $classId = qsis_find_local_class_id($local, $localClassName, $schoolYear);
                if ($classId > 0) {
                    classes_upsert_enrollment($local, $classId, $userId, [
                        'form_class' => (string) ($student['class'] ?? ''),
                        'class_no' => (int) ($student['classNo'] ?? 0),
                        'moi' => $student['moi'] ?? null,
                    ]);
                    $enrolled++;
                }
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
 * @return array{ok:bool,error?:string,courses_created?:int,courses_skipped?:int,students_created?:int,students_enrolled?:int,students_skipped?:int,students_updated?:int}
 */
function qsis_import_all(PDO $local, PDO $qsis, array $options, int $actingUserId): array
{
    $courseResult = qsis_import_courses($local, $qsis, $options, $actingUserId);
    if (!$courseResult['ok']) {
        return $courseResult;
    }

    $studentOptions = $options;
    $studentOptions['enroll'] = true;
    $studentResult = qsis_import_students($local, $qsis, $studentOptions, $actingUserId);
    if (!$studentResult['ok']) {
        return $studentResult;
    }

    return [
        'ok' => true,
        'courses_created' => (int) ($courseResult['created'] ?? 0),
        'courses_skipped' => (int) ($courseResult['skipped'] ?? 0),
        'students_created' => (int) ($studentResult['created'] ?? 0),
        'students_enrolled' => (int) ($studentResult['enrolled'] ?? 0),
        'students_skipped' => (int) ($studentResult['skipped'] ?? 0),
        'students_updated' => (int) ($studentResult['updated'] ?? 0),
    ];
}
