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

/**
 * @return array<string, string> value => zh label
 */
function classes_form_level_options(): array
{
    return [
        '1' => '中一',
        '2' => '中二',
        '3' => '中三',
        '4' => '中四',
        '5' => '中五',
        '6' => '中六',
    ];
}

/**
 * @return array<string, string> value => zh label
 */
function classes_course_subject_options(): array
{
    return [
        'integrated_science' => '綜合科學',
        'physics' => '物理',
        'chemistry' => '化學',
        'biology' => '生物',
    ];
}

function classes_form_level_label(?string $value): string
{
    if ($value === null || $value === '') {
        return '—';
    }
    $opts = classes_form_level_options();
    return $opts[$value] ?? $value;
}

function classes_course_subject_label(?string $value): string
{
    if ($value === null || $value === '') {
        return '—';
    }
    $opts = classes_course_subject_options();
    return $opts[$value] ?? $value;
}

/**
 * Whether classes.form_level / course_subject columns exist.
 */
function classes_has_form_subject_columns(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM classes LIKE 'form_level'");
        $cached = $stmt !== false && $stmt->fetch() !== false;
    } catch (Throwable $e) {
        $cached = false;
    }
    return $cached;
}

/**
 * @return string|null normalized form level or null if empty/invalid
 */
function classes_normalize_form_level(mixed $value): ?string
{
    $v = trim((string) ($value ?? ''));
    if ($v === '') {
        return null;
    }
    return array_key_exists($v, classes_form_level_options()) ? $v : null;
}

/**
 * @return string|null normalized course subject or null if empty/invalid
 */
function classes_normalize_course_subject(mixed $value): ?string
{
    $v = trim((string) ($value ?? ''));
    if ($v === '') {
        return null;
    }
    return array_key_exists($v, classes_course_subject_options()) ? $v : null;
}

/**
 * Starting calendar year of a school-year label (e.g. 2025/26 → 2025).
 */
function classes_school_year_start_year(string $label): ?int
{
    $label = trim($label);
    if ($label === '') {
        return null;
    }
    if (preg_match('/^(\d{4})\s*[\/\-]/', $label, $m) === 1) {
        return (int) $m[1];
    }
    if (preg_match('/^(\d{2})(\d{2})$/', $label, $m) === 1) {
        $from = (int) $m[1];

        return ($from >= 90 ? 1900 : 2000) + $from;
    }

    return null;
}

/**
 * Previous school-year label: 2026/27 → 2025/26, 2026-2027 → 2025-2026.
 */
function classes_previous_school_year_label(string $label): ?string
{
    $label = trim($label);
    if ($label === '') {
        return null;
    }
    if (preg_match('/^(\d{4})\/(\d{2})$/', $label, $m) === 1) {
        $from = (int) $m[1] - 1;
        $end = ((int) $m[2] + 99) % 100;

        return $from . '/' . str_pad((string) $end, 2, '0', STR_PAD_LEFT);
    }
    if (preg_match('/^(\d{4})-(\d{4})$/', $label, $m) === 1) {
        return ((int) $m[1] - 1) . '-' . ((int) $m[2] - 1);
    }
    if (preg_match('/^(\d{4})-(\d{2})$/', $label, $m) === 1) {
        $from = (int) $m[1] - 1;
        $end = ((int) $m[2] + 99) % 100;

        return $from . '-' . str_pad((string) $end, 2, '0', STR_PAD_LEFT);
    }

    return null;
}

/**
 * Hong Kong school-year start calendar year: Sep–Dec → this year; Jan–Aug → previous year.
 * Sep 2026 → 2026 (2026/27); Aug 2026 → 2025 (2025/26).
 */
function classes_hk_school_year_start(?DateTimeInterface $now = null): int
{
    $tz = new DateTimeZone('Asia/Hong_Kong');
    if ($now instanceof DateTimeInterface) {
        $d = DateTimeImmutable::createFromInterface($now)->setTimezone($tz);
    } else {
        $d = new DateTimeImmutable('now', $tz);
    }
    $year = (int) $d->format('Y');
    $month = (int) $d->format('n');

    return $month >= 9 ? $year : $year - 1;
}

/**
 * True when the class school_year is the current (or future) HK school year.
 * Used to detect post-promotion enrollments (e.g. 2026/27 classes in Sep 2026).
 */
function classes_school_year_is_current_or_future(string $label, ?DateTimeInterface $now = null): bool
{
    $start = classes_school_year_start_year($label);
    if ($start === null) {
        return false;
    }

    return $start >= classes_hk_school_year_start($now);
}

/**
 * Jun–Aug (Asia/Hong_Kong): assignment season — homework for the form the student is in.
 * Sep–May: chase season after promotion — homework for the form they just finished.
 */
function classes_is_summer_assignment_season(?DateTimeInterface $now = null): bool
{
    $tz = new DateTimeZone('Asia/Hong_Kong');
    if ($now instanceof DateTimeInterface) {
        $d = DateTimeImmutable::createFromInterface($now)->setTimezone($tz);
    } else {
        $d = new DateTimeImmutable('now', $tz);
    }
    $month = (int) $d->format('n');

    return $month >= 6 && $month <= 8;
}

function classes_can_chase_previous_summer(?string $classFormLevel): bool
{
    return $classFormLevel === '2' || $classFormLevel === '3';
}

/**
 * Homework form_level for previous-year chase: S2 → S1 items, S3 → S2 items.
 */
function classes_previous_summer_item_form(?string $classFormLevel): ?string
{
    if ($classFormLevel === '2') {
        return '1';
    }
    if ($classFormLevel === '3') {
        return '2';
    }

    return null;
}

/**
 * @param list<array<string, mixed>> $classes
 * @return array{year:string, form:?string}
 */
function classes_newest_enrollment_year_form(array $classes): array
{
    $bestYear = '';
    $bestStart = null;
    $bestForm = null;
    foreach ($classes as $c) {
        $y = trim((string) ($c['school_year'] ?? ''));
        $start = $y !== '' ? classes_school_year_start_year($y) : null;
        $fl = classes_form_level_from_enrollment_row($c);
        if ($start === null) {
            if ($bestStart === null && $bestForm === null && $fl !== null) {
                $bestForm = $fl;
            }
            continue;
        }
        if ($bestStart !== null && $start < $bestStart) {
            continue;
        }
        if ($bestStart !== null && $start === $bestStart) {
            if ($bestForm !== '1' && $bestForm !== '2' && ($fl === '1' || $fl === '2')) {
                $bestForm = $fl;
            }
            continue;
        }
        $bestStart = $start;
        $bestYear = $y;
        $bestForm = $fl;
    }

    return ['year' => $bestYear, 'form' => $bestForm];
}

/**
 * Map user_id → form_class from active enrollments in a given school year.
 *
 * @param list<int> $userIds
 * @return array<int, string>
 */
function classes_form_class_map_for_school_year(PDO $pdo, array $userIds, string $schoolYear): array
{
    $ids = [];
    foreach ($userIds as $id) {
        $uid = (int) $id;
        if ($uid > 0) {
            $ids[$uid] = $uid;
        }
    }
    $ids = array_values($ids);
    $schoolYear = trim($schoolYear);
    if ($ids === [] || $schoolYear === '') {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT ce.user_id, ce.form_class
         FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         WHERE ce.user_id IN ($placeholders)
           AND ce.status = 'active'
           AND c.school_year = ?
           AND ce.form_class IS NOT NULL AND ce.form_class <> ''
         ORDER BY c.id ASC"
    );
    $stmt->execute([...$ids, $schoolYear]);
    $out = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $uid = (int) $row['user_id'];
        if (!isset($out[$uid])) {
            $out[$uid] = (string) $row['form_class'];
        }
    }

    return $out;
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
 * Resolve a student's form level for summer homework (the form they just finished).
 *
 * Jun–Aug (assignment): use the newest enrollment's S1/S2 form.
 * Sep–May (chase): prefer S1/S2 from the previous school year; if the student is
 * already enrolled in the current HK school year (e.g. 2026/27 in Sep 2026),
 * S2 → S1 items and S3 → S2 items. Students still on last year's classes
 * (e.g. 2025/26 in Sep 2026) keep that year's form so S2 homework is not hidden.
 *
 * Returns '1'|'2' when eligible; '3'|'4'|'5'|'6' when known but not S1/S2; null if unknown.
 */
function classes_resolve_form_level_for_summer(PDO $pdo, int $userId): ?string
{
    $classes = classes_list_for_student($pdo, $userId);
    $newest = classes_newest_enrollment_year_form($classes);
    $newestForm = $newest['form'];
    $newestYear = $newest['year'];

    $fallback = null;
    if ($newestForm !== null && in_array($newestForm, ['3', '4', '5', '6'], true)) {
        $fallback = $newestForm;
    }
    if ($fallback === null) {
        foreach ($classes as $c) {
            $fl = classes_form_level_from_enrollment_row($c);
            if ($fallback === null && in_array($fl, ['3', '4', '5', '6'], true)) {
                $fallback = $fl;
            }
        }
    }

    $profileForm = null;
    $profile = classes_student_profile($pdo, $userId);
    if ($profile !== null && isset($profile['form_level']) && $profile['form_level'] !== null && $profile['form_level'] !== '') {
        $fl = (string) $profile['form_level'];
        if (in_array($fl, ['1', '2', '3', '4', '5', '6'], true)) {
            $profileForm = $fl;
        }
    }

    if ($newestForm === null) {
        $newestForm = $profileForm;
    }

    if (classes_is_summer_assignment_season()) {
        if ($newestForm === '1' || $newestForm === '2') {
            return $newestForm;
        }
        if ($newestForm === '3') {
            return '2';
        }

        return $newestForm ?? $fallback ?? $profileForm;
    }

    $prevYear = $newestYear !== '' ? classes_previous_school_year_label($newestYear) : null;
    if ($prevYear !== null) {
        foreach ($classes as $c) {
            if (trim((string) ($c['school_year'] ?? '')) !== $prevYear) {
                continue;
            }
            $fl = classes_form_level_from_enrollment_row($c);
            if ($fl === '1' || $fl === '2') {
                return $fl;
            }
        }
    }

    $promotedIntoCurrentYear = $newestYear !== ''
        && classes_school_year_is_current_or_future($newestYear);
    if ($promotedIntoCurrentYear) {
        $chased = classes_previous_summer_item_form($newestForm);
        if ($chased !== null) {
            return $chased;
        }
    }

    if ($newestForm === '1' || $newestForm === '2') {
        return $newestForm;
    }
    if ($newestForm === '3') {
        return '2';
    }

    return $newestForm ?? $fallback ?? $profileForm;
}

function classes_summer_is_chasing_previous(PDO $pdo, int $userId, ?string $homeworkForm): bool
{
    if ($homeworkForm !== '1' && $homeworkForm !== '2') {
        return false;
    }
    $newest = classes_newest_enrollment_year_form(classes_list_for_student($pdo, $userId));
    $nf = $newest['form'];

    return ($homeworkForm === '1' && $nf === '2')
        || ($homeworkForm === '2' && $nf === '3');
}

/**
 * @param array<string, mixed> $row class + enrollment fields
 */
function classes_form_level_from_enrollment_row(array $row): ?string
{
    if (isset($row['form_level']) && $row['form_level'] !== null && $row['form_level'] !== '') {
        $fl = classes_normalize_form_level($row['form_level']);
        if ($fl !== null) {
            return $fl;
        }
    }
    $formClass = trim((string) ($row['form_class'] ?? ''));
    if ($formClass !== '') {
        return classes_normalize_form_level($formClass[0]);
    }

    return null;
}

/**
 * Resolve MOI (E/C) for summer homework from the student's course enrollment.
 * Prefers a class matching their summer form level; then integrated_science; then any MOI set.
 *
 * @return 'E'|'C'|null
 */
function classes_resolve_moi_for_summer(PDO $pdo, int $userId): ?string
{
    $classes = classes_list_for_student($pdo, $userId);
    if ($classes === []) {
        return null;
    }

    $formLevel = classes_resolve_form_level_for_summer($pdo, $userId);
    $newestYear = classes_newest_enrollment_year_form($classes)['year'];
    $candidates = [];
    foreach ($classes as $c) {
        $moi = classes_normalize_moi($c['moi'] ?? null);
        if ($moi === null) {
            continue;
        }
        $cForm = isset($c['form_level']) && $c['form_level'] !== null && $c['form_level'] !== ''
            ? (string) $c['form_level']
            : null;
        $subject = isset($c['course_subject']) ? (string) $c['course_subject'] : '';
        $cYear = trim((string) ($c['school_year'] ?? ''));
        $score = 0;
        if ($formLevel !== null && $cForm === $formLevel) {
            $score += 100;
        }
        // After promotion, current-class MOI still applies when last year's class is gone.
        if ($newestYear !== '' && $cYear === $newestYear) {
            $score += 25;
        }
        if ($cForm === '1' || $cForm === '2') {
            $score += 20;
        }
        if ($subject === 'integrated_science') {
            $score += 10;
        } elseif (in_array($subject, ['physics', 'chemistry', 'biology'], true)) {
            $score += 5;
        }
        $candidates[] = ['moi' => $moi, 'score' => $score];
    }

    if ($candidates === []) {
        return null;
    }

    usort($candidates, static function (array $a, array $b): int {
        return $b['score'] <=> $a['score'];
    });

    return $candidates[0]['moi'];
}

/**
 * Map MOI to SPA content language: E→en, C→zh.
 *
 * @return 'zh'|'en'|null
 */
function classes_moi_to_content_lang(?string $moi): ?string
{
    $moi = classes_normalize_moi($moi);
    if ($moi === 'E') {
        return 'en';
    }
    if ($moi === 'C') {
        return 'zh';
    }
    return null;
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
    return (int) ($classRow['teacher_user_id'] ?? 0) === (int) $user['id'];
}

/**
 * 班內學生名單／修讀語言（MOI）等選課資料：僅管理員可編輯。
 */
function classes_can_edit_students(PDO $pdo, array $user): bool
{
    if (user_has_permission('class.manage_any')) {
        return true;
    }
    require_once __DIR__ . '/auth.php';
    return auth_user_is_admin($pdo, (int) $user['id']);
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
        'SELECT c.id, c.name, c.school_year, c.form_level, c.course_subject, c.subject_id,
                ce.status, ce.joined_at, ce.form_class, ce.class_no, ce.moi
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
    require_once __DIR__ . '/qsis_auth_lib.php';

    $email = auth_normalize_login_identity($email);
    $nameZh = trim($nameZh);
    $nameEn = trim($nameEn);
    $inviteCode = strtoupper(trim($inviteCode));

    if (!auth_is_valid_login_id($email)) {
        return ['ok' => false, 'error' => '請輸入有效帳戶名稱或電郵。'];
    }
    if ($password === '') {
        return ['ok' => false, 'error' => '請輸入 QSIS 密碼。'];
    }
    $qsisAuth = qsis_verify_password_for_login($email, $password);
    if ($qsisAuth === 'unavailable') {
        return ['ok' => false, 'error' => '無法連接 QSIS 驗證密碼，請稍後再試。'];
    }
    if ($qsisAuth !== 'ok') {
        return ['ok' => false, 'error' => 'QSIS 帳戶或密碼不正確。'];
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

        $ins = $pdo->prepare('INSERT INTO users (email, name_zh, name_en, display_name, is_active) VALUES (?, ?, ?, ?, 1)');
        $ins->execute([$email, $nameZh, $nameEn, $displayName]);
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
    $formLevel = classes_normalize_form_level($post['form_level'] ?? '');
    $courseSubject = classes_normalize_course_subject($post['course_subject'] ?? '');
    $teacherUserId = (int) ($post['teacher_user_id'] ?? $actingUserId);
    $isActive = isset($post['is_active']) ? 1 : 0;

    if ($name === '') {
        return ['ok' => false, 'error' => '請輸入課程名稱。'];
    }
    if ($formLevel === null) {
        return ['ok' => false, 'error' => '請選擇年級（中一至中六）。'];
    }
    if ($courseSubject === null) {
        return ['ok' => false, 'error' => '請選擇科目（綜合科學、物理、化學或生物）。'];
    }
    if (!classes_has_form_subject_columns($pdo)) {
        return [
            'ok' => false,
            'error' => '資料庫尚未升級：請執行 schema_upgrade_all.sql 後再儲存年級／科目。',
        ];
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
        try {
            $upd = $pdo->prepare(
                'UPDATE classes SET name = ?, school_year = ?, form_level = ?, course_subject = ?,
                 teacher_user_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $upd->execute([$name, $schoolYear, $formLevel, $courseSubject, $teacherUserId, $isActive, $id]);
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => '儲存失敗：' . $e->getMessage()];
        }
        return ['ok' => true, 'id' => $id];
    }

    $inviteCode = classes_generate_invite_code();
    for ($i = 0; $i < 5; $i++) {
        try {
            $ins = $pdo->prepare(
                'INSERT INTO classes (name, school_year, form_level, course_subject, invite_code, teacher_user_id, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $ins->execute([$name, $schoolYear, $formLevel, $courseSubject, $inviteCode, $teacherUserId, $isActive]);
            return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
        } catch (Throwable $e) {
            $msg = $e->getMessage();
            if (stripos($msg, 'form_level') !== false || stripos($msg, 'course_subject') !== false || stripos($msg, 'Unknown column') !== false) {
                return [
                    'ok' => false,
                    'error' => '資料庫尚未升級：請執行 schema_upgrade_all.sql。',
                ];
            }
            $inviteCode = classes_generate_invite_code();
        }
    }
    return ['ok' => false, 'error' => '建立課程失敗。'];
}

/**
 * 課程列表內聯更新（年級、科目、學年、任教老師）。
 *
 * @param array<string, mixed> $post 期望 id, school_year, teacher_user_id, form_level?, course_subject?
 * @return array{ok:bool,error?:string,school_year?:string,teacher_user_id?:int,teacher_name?:string,form_level?:?string,form_level_label?:string,course_subject?:?string,course_subject_label?:string}
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

    $editingField = trim((string) ($post['field'] ?? ''));

    $schoolYear = array_key_exists('school_year', $post)
        ? trim((string) $post['school_year'])
        : trim((string) ($class['school_year'] ?? ''));

    // Empty posted values mean "keep existing" (JS always sends all fields).
    $formLevel = classes_normalize_form_level($class['form_level'] ?? null);
    if (array_key_exists('form_level', $post)) {
        $rawForm = trim((string) $post['form_level']);
        if ($rawForm !== '') {
            $normalized = classes_normalize_form_level($rawForm);
            if ($normalized === null) {
                return ['ok' => false, 'error' => '年級無效。'];
            }
            $formLevel = $normalized;
        } elseif ($editingField === 'form_level') {
            return ['ok' => false, 'error' => '請選擇年級。'];
        }
    }

    $courseSubject = classes_normalize_course_subject($class['course_subject'] ?? null);
    if (array_key_exists('course_subject', $post)) {
        $rawSubj = trim((string) $post['course_subject']);
        if ($rawSubj !== '') {
            $normalized = classes_normalize_course_subject($rawSubj);
            if ($normalized === null) {
                return ['ok' => false, 'error' => '科目無效。'];
            }
            $courseSubject = $normalized;
        } elseif ($editingField === 'course_subject') {
            return ['ok' => false, 'error' => '請選擇科目。'];
        }
    }

    $canAny = user_has_permission('class.manage_any');
    $teacherUserId = (int) ($class['teacher_user_id'] ?? 0);

    if ($canAny && array_key_exists('teacher_user_id', $post)) {
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

    $hasFormSubject = classes_has_form_subject_columns($pdo);
    if (in_array($editingField, ['form_level', 'course_subject'], true) && !$hasFormSubject) {
        return [
            'ok' => false,
            'error' => '資料庫尚未升級：請執行 schema_upgrade_all.sql。',
        ];
    }

    try {
        if ($hasFormSubject) {
            $upd = $pdo->prepare(
                'UPDATE classes SET school_year = ?, form_level = ?, course_subject = ?, teacher_user_id = ?,
                 updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $upd->execute([$schoolYear, $formLevel, $courseSubject, $teacherUserId, $id]);
        } else {
            $upd = $pdo->prepare(
                'UPDATE classes SET school_year = ?, teacher_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $upd->execute([$schoolYear, $teacherUserId, $id]);
        }
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '儲存失敗：' . $e->getMessage()];
    }

    // Re-read to confirm persisted values.
    $fresh = classes_fetch_by_id($pdo, $id) ?: $class;
    $formLevel = classes_normalize_form_level($fresh['form_level'] ?? null);
    $courseSubject = classes_normalize_course_subject($fresh['course_subject'] ?? null);
    $schoolYear = trim((string) ($fresh['school_year'] ?? $schoolYear));
    $teacherUserId = (int) ($fresh['teacher_user_id'] ?? $teacherUserId);

    $nameStmt = $pdo->prepare('SELECT name_zh, name_en, display_name FROM users WHERE id = ? LIMIT 1');
    $nameStmt->execute([$teacherUserId]);
    $teacherRow = $nameStmt->fetch() ?: [];

    return [
        'ok' => true,
        'school_year' => $schoolYear,
        'teacher_user_id' => $teacherUserId,
        'teacher_name' => user_format_name($teacherRow),
        'form_level' => $formLevel,
        'form_level_label' => classes_form_level_label($formLevel),
        'course_subject' => $courseSubject,
        'course_subject_label' => classes_course_subject_label($courseSubject),
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
    if (!classes_can_edit_students($pdo, $user)) {
        return ['ok' => false, 'error' => '只有管理員可以編輯班內學生。'];
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    $studentRoleId = classes_role_id_by_name($pdo, 'student');
    $enrolled = 0;

    foreach ($emails as $email) {
        require_once __DIR__ . '/qsis_auth_lib.php';
        $email = auth_normalize_login_identity((string) $email);
        if (!auth_is_valid_login_id($email)) {
            continue;
        }
        $existing = auth_find_local_user_by_login($pdo, $email);
        $uid = $existing !== null ? (int) $existing['id'] : 0;
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
 * Update one student's enrollment meta (班別／班號／修讀語言).
 *
 * @param array{form_class?:string|null,class_no?:int|string|null,moi?:string|null} $meta
 * @return array{ok:bool,error?:string}
 */
function classes_update_student_enrollment(PDO $pdo, int $classId, int $studentUserId, array $meta, array $actingUser): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到課程。'];
    }
    if (!classes_can_edit_students($pdo, $actingUser)) {
        return ['ok' => false, 'error' => '只有管理員可以編輯班內學生與修讀語言。'];
    }
    if (!classes_can_manage($pdo, $class, $actingUser)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM class_enrollments WHERE class_id = ? AND user_id = ? AND status = \'active\' LIMIT 1'
    );
    $stmt->execute([$classId, $studentUserId]);
    if (!(int) ($stmt->fetchColumn() ?: 0)) {
        return ['ok' => false, 'error' => '找不到該學生的選課紀錄。'];
    }

    classes_upsert_enrollment($pdo, $classId, $studentUserId, [
        'form_class' => $meta['form_class'] ?? null,
        'class_no' => $meta['class_no'] ?? null,
        'moi' => $meta['moi'] ?? null,
    ]);

    return ['ok' => true];
}

/**
 * @param list<array{user_id:int,form_class?:string,class_no?:string,moi?:string}> $rows
 * @return array{ok:bool,error?:string,updated?:int}
 */
function classes_save_students_enrollments_batch(PDO $pdo, int $classId, array $rows, array $actingUser): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到課程。'];
    }
    if (!classes_can_edit_students($pdo, $actingUser)) {
        return ['ok' => false, 'error' => '只有管理員可以編輯班內學生與修讀語言。'];
    }
    if (!classes_can_manage($pdo, $class, $actingUser)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    $updated = 0;
    foreach ($rows as $row) {
        $uid = (int) ($row['user_id'] ?? 0);
        if ($uid <= 0) {
            continue;
        }
        $r = classes_update_student_enrollment($pdo, $classId, $uid, [
            'form_class' => $row['form_class'] ?? null,
            'class_no' => $row['class_no'] ?? null,
            'moi' => $row['moi'] ?? null,
        ], $actingUser);
        if ($r['ok']) {
            $updated++;
        }
    }

    return ['ok' => true, 'updated' => $updated];
}

/**
 * @return array{ok:bool,error?:string}
 */
function classes_remove_student_from_class(PDO $pdo, int $classId, int $studentUserId, array $actingUser): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到課程。'];
    }
    if (!classes_can_edit_students($pdo, $actingUser)) {
        return ['ok' => false, 'error' => '只有管理員可以編輯班內學生。'];
    }
    if (!classes_can_manage($pdo, $class, $actingUser)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    $del = $pdo->prepare('DELETE FROM class_enrollments WHERE class_id = ? AND user_id = ?');
    $del->execute([$classId, $studentUserId]);
    if ($del->rowCount() < 1) {
        return ['ok' => false, 'error' => '找不到該學生的選課紀錄。'];
    }

    return ['ok' => true];
}

/**
 * @param list<int|string> $studentUserIds
 * @return array{ok:bool,error?:string,removed?:int}
 */
function classes_remove_students_from_class(PDO $pdo, int $classId, array $studentUserIds, array $actingUser): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['ok' => false, 'error' => '找不到課程。'];
    }
    if (!classes_can_edit_students($pdo, $actingUser)) {
        return ['ok' => false, 'error' => '只有管理員可以編輯班內學生。'];
    }
    if (!classes_can_manage($pdo, $class, $actingUser)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }

    $ids = array_values(array_unique(array_filter(
        array_map('intval', $studentUserIds),
        static fn (int $id): bool => $id > 0
    )));
    if ($ids === []) {
        return ['ok' => false, 'error' => '請選擇至少一位學生。'];
    }

    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    $del = $pdo->prepare(
        'DELETE FROM class_enrollments WHERE class_id = ? AND user_id IN (' . $placeholders . ')'
    );
    $del->execute(array_merge([$classId], $ids));

    return ['ok' => true, 'removed' => (int) $del->rowCount()];
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
    if (!classes_can_edit_students($pdo, $actingUser)) {
        return ['ok' => false, 'error' => '只有管理員可以匯入／編輯班內學生。'];
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
        require_once __DIR__ . '/qsis_auth_lib.php';
        $email = auth_normalize_login_identity((string) ($parts[0] ?? ''));
        $nameZh = trim((string) ($parts[1] ?? ''));
        $nameEn = trim((string) ($parts[2] ?? ''));
        // parts[3] was legacy local password — ignored (auth via QSIS only)
        $formClass = trim((string) ($parts[4] ?? ''));
        $classNoRaw = trim((string) ($parts[5] ?? ''));
        if (!auth_is_valid_login_id($email)) {
            continue;
        }
        if ($nameZh === '' && $nameEn === '') {
            $nameZh = str_contains($email, '@') ? (strstr($email, '@', true) ?: $email) : $email;
        }
        $displayName = account_sync_display_name($nameZh, $nameEn);

        $existing = auth_find_local_user_by_login($pdo, $email);
        $uid = $existing !== null ? (int) $existing['id'] : 0;
        if ($uid <= 0) {
            try {
                $ins = $pdo->prepare('INSERT INTO users (email, name_zh, name_en, display_name, is_active) VALUES (?, ?, ?, ?, 1)');
                $ins->execute([$email, $nameZh, $nameEn, $displayName]);
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
        'form_level' => isset($row['form_level']) && $row['form_level'] !== null && $row['form_level'] !== ''
            ? (string) $row['form_level']
            : null,
        'form_level_label' => classes_form_level_label(
            isset($row['form_level']) ? (string) $row['form_level'] : null
        ),
        'course_subject' => isset($row['course_subject']) && $row['course_subject'] !== null && $row['course_subject'] !== ''
            ? (string) $row['course_subject']
            : null,
        'course_subject_label' => classes_course_subject_label(
            isset($row['course_subject']) ? (string) $row['course_subject'] : null
        ),
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'invite_code' => (string) ($row['invite_code'] ?? ''),
        'teacher_user_id' => (int) $row['teacher_user_id'],
        'teacher_name' => (string) ($row['teacher_name'] ?? ''),
        'is_active' => (bool) (int) ($row['is_active'] ?? 0),
        'student_count' => (int) ($row['student_count'] ?? 0),
        'can_chase_previous_summer' => classes_can_chase_previous_summer(
            isset($row['form_level']) && $row['form_level'] !== null && $row['form_level'] !== ''
                ? (string) $row['form_level']
                : null
        ),
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

    $summerMoi = classes_resolve_moi_for_summer($pdo, (int) $user['id']);

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
        'summer_form_level' => classes_resolve_form_level_for_summer($pdo, (int) $user['id']),
        'summer_moi' => $summerMoi,
        'summer_content_lang' => classes_moi_to_content_lang($summerMoi),
        'classes' => array_map(static function (array $c): array {
            return [
                'id' => (int) $c['id'],
                'name' => (string) $c['name'],
                'school_year' => (string) $c['school_year'],
                'form_level' => isset($c['form_level']) && $c['form_level'] !== null && $c['form_level'] !== ''
                    ? (string) $c['form_level'] : null,
                'form_level_label' => classes_form_level_label(
                    isset($c['form_level']) ? (string) $c['form_level'] : null
                ),
                'course_subject' => isset($c['course_subject']) && $c['course_subject'] !== null && $c['course_subject'] !== ''
                    ? (string) $c['course_subject'] : null,
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
