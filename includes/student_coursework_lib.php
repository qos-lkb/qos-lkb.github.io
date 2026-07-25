<?php

declare(strict_types=1);

/**
 * Cross-type student coursework aggregation for teacher/admin views.
 */

require_once __DIR__ . '/classes_lib.php';
require_once __DIR__ . '/adaptive_lib.php';
require_once __DIR__ . '/worksheet_assignments_lib.php';
require_once __DIR__ . '/summer_homework_lib.php';
require_once __DIR__ . '/learning_analytics_lib.php';

/**
 * @return list<int>
 */
function scw_accessible_class_ids(PDO $pdo, array $user): array
{
    $canAny = user_has_permission('class.manage_any');
    if (!$canAny && !user_has_permission('class.manage_own')) {
        return [];
    }
    $rows = classes_list_for_teacher($pdo, (int) $user['id'], $canAny);
    $ids = [];
    foreach ($rows as $row) {
        $id = (int) ($row['id'] ?? 0);
        if ($id > 0) {
            $ids[] = $id;
        }
    }
    return $ids;
}

/**
 * Enrollment + profile fields for one student in a class.
 *
 * @return array<string, mixed>|null
 */
function scw_enrollment_profile(PDO $pdo, int $classId, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT u.id, u.email, u.display_name, u.name_zh, u.name_en,
                ce.form_class, ce.class_no, ce.moi, ce.joined_at,
                sp.student_number, sp.form_level, sp.preferred_lang
         FROM class_enrollments ce
         INNER JOIN users u ON u.id = ce.user_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE ce.class_id = ? AND ce.user_id = ? AND ce.status = \'active\'
         LIMIT 1'
    );
    $stmt->execute([$classId, $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    return [
        'id' => (int) $row['id'],
        'email' => (string) $row['email'],
        'display_name' => (string) ($row['display_name'] ?? ''),
        'name_zh' => isset($row['name_zh']) ? (string) $row['name_zh'] : null,
        'name_en' => isset($row['name_en']) ? (string) $row['name_en'] : null,
        'form_class' => isset($row['form_class']) && $row['form_class'] !== '' ? (string) $row['form_class'] : null,
        'class_no' => isset($row['class_no']) && $row['class_no'] !== null && $row['class_no'] !== ''
            ? (int) $row['class_no'] : null,
        'moi' => classes_normalize_moi($row['moi'] ?? null),
        'joined_at' => isset($row['joined_at']) ? (string) $row['joined_at'] : null,
        'student_number' => isset($row['student_number']) && $row['student_number'] !== ''
            ? (string) $row['student_number'] : null,
        'form_level' => isset($row['form_level']) && $row['form_level'] !== ''
            ? (string) $row['form_level'] : null,
        'preferred_lang' => isset($row['preferred_lang']) ? (string) $row['preferred_lang'] : null,
    ];
}

/**
 * Worksheet assignments for a student within one class.
 *
 * @return list<array<string, mixed>>
 */
function scw_worksheets_for_student(PDO $pdo, int $classId, int $userId): array
{
    $sql = 'SELECT wa.id AS assignment_id, wa.worksheet_id, wa.due_at, wa.max_score, wa.status AS assignment_status,
                   wa.title_zh, wa.title_en,
                   w.slug AS worksheet_slug, w.title_zh AS worksheet_title_zh, w.title_en AS worksheet_title_en,
                   ws.id AS submission_id, ws.status AS submission_status, ws.score, ws.auto_score,
                   ws.submitted_at, ws.graded_at, ws.feedback_zh, ws.feedback_en
            FROM worksheet_assignments wa
            INNER JOIN worksheets w ON w.id = wa.worksheet_id
            LEFT JOIN worksheet_assignment_students was ON was.assignment_id = wa.id AND was.user_id = ?
            LEFT JOIN worksheet_submissions ws ON ws.assignment_id = wa.id AND ws.user_id = ?
            WHERE wa.class_id = ?
              AND wa.status IN (\'active\', \'closed\')
              AND (wa.assign_all = 1 OR was.user_id IS NOT NULL)
            ORDER BY wa.due_at IS NULL, wa.due_at ASC, wa.created_at DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId, $userId, $classId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $out = [];
    $now = time();
    foreach ($rows as $row) {
        $dueAt = isset($row['due_at']) && $row['due_at'] !== null && $row['due_at'] !== ''
            ? (string) $row['due_at'] : null;
        $subStatus = isset($row['submission_status']) && $row['submission_status'] !== null
            ? (string) $row['submission_status'] : null;
        $overdue = false;
        if ($dueAt !== null && ($subStatus === null || $subStatus === 'pending')) {
            $dueTs = strtotime($dueAt);
            if ($dueTs !== false && $dueTs < $now) {
                $overdue = true;
            }
        }
        $out[] = [
            'assignment_id' => (int) $row['assignment_id'],
            'worksheet_id' => (int) $row['worksheet_id'],
            'worksheet_slug' => (string) ($row['worksheet_slug'] ?? ''),
            'title_zh' => (string) ((isset($row['title_zh']) && $row['title_zh'] !== '')
                ? $row['title_zh'] : ($row['worksheet_title_zh'] ?? '')),
            'title_en' => (string) ((isset($row['title_en']) && $row['title_en'] !== '')
                ? $row['title_en'] : ($row['worksheet_title_en'] ?? '')),
            'due_at' => $dueAt,
            'max_score' => (float) $row['max_score'],
            'assignment_status' => (string) $row['assignment_status'],
            'submission_id' => isset($row['submission_id']) && $row['submission_id'] !== null
                ? (int) $row['submission_id'] : null,
            'submission_status' => $subStatus ?: 'missing',
            'score' => $row['score'] !== null ? (float) $row['score'] : null,
            'auto_score' => $row['auto_score'] !== null ? (float) $row['auto_score'] : null,
            'submitted_at' => isset($row['submitted_at']) ? (string) $row['submitted_at'] : null,
            'graded_at' => isset($row['graded_at']) ? (string) $row['graded_at'] : null,
            'feedback_zh' => isset($row['feedback_zh']) ? (string) $row['feedback_zh'] : null,
            'overdue' => $overdue,
            'deep_link' => '/admin/courses/' . $classId . '/worksheets?assignment=' . (int) $row['assignment_id'],
        ];
    }
    return $out;
}

/**
 * Summer homework progress for a student in a class (by form_level).
 *
 * @return list<array<string, mixed>>
 */
function scw_summer_for_student(PDO $pdo, int $classId, int $userId): array
{
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return [];
    }
    $formLevel = isset($class['form_level']) && $class['form_level'] !== null && $class['form_level'] !== ''
        ? (string) $class['form_level'] : null;
    if ($formLevel !== '1' && $formLevel !== '2') {
        return [];
    }
    $items = sh_fetch_published($pdo, $formLevel);
    $out = [];
    foreach ($items as $item) {
        $itemId = (int) $item['id'];
        $progress = sh_user_progress_for_item($pdo, $userId, $itemId, $item);
        $out[] = [
            'item_id' => $itemId,
            'slug' => (string) ($item['slug'] ?? ''),
            'title_zh' => (string) ($item['title_zh'] ?? ''),
            'title_en' => (string) ($item['title_en'] ?? ''),
            'due_at' => isset($item['due_at']) && $item['due_at'] !== null && $item['due_at'] !== ''
                ? (string) $item['due_at'] : null,
            'status' => (string) $progress['submission_status'],
            'status_label' => sh_submission_status_label((string) $progress['submission_status']),
            'passed' => (bool) $progress['passed'],
            'percent' => $progress['percent'],
            'score' => $progress['score'],
            'max_score' => $progress['max_score'],
            'attempts' => (int) $progress['attempts'],
            'best_submitted_at' => $progress['best_submitted_at'],
            'first_passed_at' => $progress['first_passed_at'],
            'deep_link' => '/admin/summer-homework/' . $itemId . '/analytics?user_id=' . $userId,
        ];
    }
    return $out;
}

/**
 * @return list<array<string, mixed>>
 */
function scw_recent_events(PDO $pdo, int $userId, int $limit = 15): array
{
    $limit = max(1, min(50, $limit));
    $stmt = $pdo->prepare(
        'SELECT event_type, content_type, content_id, subject_id, topic_id, duration_seconds, created_at
         FROM learning_events
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    return array_map(static function (array $r): array {
        return [
            'event_type' => (string) ($r['event_type'] ?? ''),
            'content_type' => isset($r['content_type']) ? (string) $r['content_type'] : null,
            'content_id' => isset($r['content_id']) ? (string) $r['content_id'] : null,
            'subject_id' => isset($r['subject_id']) ? (int) $r['subject_id'] : null,
            'topic_id' => isset($r['topic_id']) ? (int) $r['topic_id'] : null,
            'duration_seconds' => isset($r['duration_seconds']) ? (int) $r['duration_seconds'] : null,
            'created_at' => (string) ($r['created_at'] ?? ''),
        ];
    }, $rows);
}

/**
 * Full student dossier for one class enrollment.
 *
 * @return array<string, mixed>
 */
function scw_student_dossier(PDO $pdo, int $classId, int $userId): array
{
    $profile = scw_enrollment_profile($pdo, $classId, $userId);
    if ($profile === null) {
        return [];
    }
    $worksheets = scw_worksheets_for_student($pdo, $classId, $userId);
    $summer = scw_summer_for_student($pdo, $classId, $userId);
    $detail = adaptive_student_detail($pdo, $userId);

    $wsAssigned = count($worksheets);
    $wsSubmitted = 0;
    $wsGraded = 0;
    $wsOverdue = 0;
    $wsUngraded = 0;
    foreach ($worksheets as $w) {
        $st = (string) ($w['submission_status'] ?? 'missing');
        if ($st === 'submitted' || $st === 'graded') {
            $wsSubmitted++;
        }
        if ($st === 'graded') {
            $wsGraded++;
        }
        if ($st === 'submitted') {
            $wsUngraded++;
        }
        if (!empty($w['overdue'])) {
            $wsOverdue++;
        }
    }

    $shTotal = count($summer);
    $shPassed = 0;
    foreach ($summer as $s) {
        if (!empty($s['passed'])) {
            $shPassed++;
        }
    }

    $mastery = $detail['mastery'] ?? [];
    $avgMastery = null;
    if (is_array($mastery) && $mastery !== []) {
        $avgMastery = round(array_sum(array_column($mastery, 'mastery_score')) / count($mastery), 1);
    }

    return [
        'student' => $profile,
        'kpis' => [
            'worksheets_assigned' => $wsAssigned,
            'worksheets_submitted' => $wsSubmitted,
            'worksheets_graded' => $wsGraded,
            'worksheets_ungraded' => $wsUngraded,
            'worksheets_overdue' => $wsOverdue,
            'summer_total' => $shTotal,
            'summer_passed' => $shPassed,
            'avg_mastery' => $avgMastery,
            'minutes_week' => (int) (($detail['summary']['minutes_week'] ?? 0)),
        ],
        'sdl' => $detail,
        'worksheets' => $worksheets,
        'summer_homework' => $summer,
        'recent_events' => scw_recent_events($pdo, $userId, 15),
    ];
}

/**
 * Class-level coursework KPIs for report dashboard.
 *
 * @return array{
 *   worksheet_assigned:int,
 *   worksheet_submit_rate:float|null,
 *   worksheet_ungraded:int,
 *   worksheet_overdue:int,
 *   summer_completion_rate:float|null,
 *   summer_items:int,
 *   summer_passed_cells:int,
 *   summer_total_cells:int
 * }
 */
function scw_class_coursework_kpis(PDO $pdo, int $classId): array
{
    $students = classes_students_in_class($pdo, $classId);
    $studentCount = count($students);
    $assignments = wa_list_for_class($pdo, $classId);
    $activeAssignments = array_values(array_filter(
        $assignments,
        static fn (array $a): bool => in_array((string) ($a['status'] ?? ''), ['active', 'closed'], true)
    ));

    $assignedSlots = 0;
    $submittedSlots = 0;
    $ungraded = 0;
    $overdue = 0;
    $now = time();

    foreach ($activeAssignments as $a) {
        $aid = (int) $a['id'];
        $dueAt = isset($a['due_at']) && $a['due_at'] !== null && $a['due_at'] !== ''
            ? (string) $a['due_at'] : null;
        $duePast = false;
        if ($dueAt !== null) {
            $ts = strtotime($dueAt);
            $duePast = $ts !== false && $ts < $now;
        }

        // Expected students for this assignment
        $assignAll = (int) ($a['assign_all'] ?? 1) === 1;
        if ($assignAll) {
            $expected = $studentCount;
            $expectedIds = array_map(static fn (array $s): int => (int) $s['id'], $students);
        } else {
            $st = $pdo->prepare('SELECT user_id FROM worksheet_assignment_students WHERE assignment_id = ?');
            $st->execute([$aid]);
            $expectedIds = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
            $expected = count($expectedIds);
        }
        $assignedSlots += $expected;

        $subs = $pdo->prepare(
            'SELECT user_id, status FROM worksheet_submissions WHERE assignment_id = ?'
        );
        $subs->execute([$aid]);
        $byUser = [];
        foreach ($subs->fetchAll(PDO::FETCH_ASSOC) ?: [] as $sub) {
            $byUser[(int) $sub['user_id']] = (string) $sub['status'];
        }

        foreach ($expectedIds as $uid) {
            $st = $byUser[$uid] ?? null;
            if ($st === 'submitted' || $st === 'graded') {
                $submittedSlots++;
            }
            if ($st === 'submitted') {
                $ungraded++;
            }
            if ($duePast && ($st === null || $st === 'pending')) {
                $overdue++;
            }
        }
    }

    $submitRate = $assignedSlots > 0
        ? round(100.0 * $submittedSlots / $assignedSlots, 1)
        : null;

    $summerPassed = 0;
    $summerTotal = 0;
    $summerItems = 0;
    $class = classes_fetch_by_id($pdo, $classId);
    $formLevel = $class !== null && isset($class['form_level']) && $class['form_level'] !== ''
        ? (string) $class['form_level'] : null;
    if ($formLevel === '1' || $formLevel === '2') {
        $items = sh_fetch_published($pdo, $formLevel);
        $summerItems = count($items);
        foreach ($students as $s) {
            $uid = (int) $s['id'];
            foreach ($items as $item) {
                $summerTotal++;
                $progress = sh_user_progress_for_item($pdo, $uid, (int) $item['id'], $item);
                if (!empty($progress['passed'])) {
                    $summerPassed++;
                }
            }
        }
    }
    $summerRate = $summerTotal > 0
        ? round(100.0 * $summerPassed / $summerTotal, 1)
        : null;

    return [
        'worksheet_assigned' => count($activeAssignments),
        'worksheet_submit_rate' => $submitRate,
        'worksheet_ungraded' => $ungraded,
        'worksheet_overdue' => $overdue,
        'summer_completion_rate' => $summerRate,
        'summer_items' => $summerItems,
        'summer_passed_cells' => $summerPassed,
        'summer_total_cells' => $summerTotal,
    ];
}

/**
 * Enrich adaptive student report rows with worksheet/summer summaries.
 *
 * @param list<array<string, mixed>> $students
 * @return list<array<string, mixed>>
 */
function scw_enrich_student_reports(PDO $pdo, int $classId, array $students): array
{
    $assignments = wa_list_for_class($pdo, $classId);
    $activeAssignments = array_values(array_filter(
        $assignments,
        static fn (array $a): bool => in_array((string) ($a['status'] ?? ''), ['active', 'closed'], true)
    ));
    $now = time();

    // Preload all submissions for class assignments
    $assignmentIds = array_map(static fn (array $a): int => (int) $a['id'], $activeAssignments);
    $subsByAssignUser = [];
    if ($assignmentIds !== []) {
        $placeholders = implode(',', array_fill(0, count($assignmentIds), '?'));
        $st = $pdo->prepare(
            "SELECT assignment_id, user_id, status FROM worksheet_submissions WHERE assignment_id IN ($placeholders)"
        );
        $st->execute($assignmentIds);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $subsByAssignUser[(int) $row['assignment_id']][(int) $row['user_id']] = (string) $row['status'];
        }
    }

    // Target sets for non-assign_all
    $targetsByAssign = [];
    foreach ($activeAssignments as $a) {
        $aid = (int) $a['id'];
        if ((int) ($a['assign_all'] ?? 1) === 1) {
            $targetsByAssign[$aid] = null; // all
        } else {
            $t = $pdo->prepare('SELECT user_id FROM worksheet_assignment_students WHERE assignment_id = ?');
            $t->execute([$aid]);
            $targetsByAssign[$aid] = array_map('intval', $t->fetchAll(PDO::FETCH_COLUMN) ?: []);
        }
    }

    $class = classes_fetch_by_id($pdo, $classId);
    $formLevel = $class !== null && isset($class['form_level']) && $class['form_level'] !== ''
        ? (string) $class['form_level'] : null;
    $summerItems = ($formLevel === '1' || $formLevel === '2')
        ? sh_fetch_published($pdo, $formLevel)
        : [];

    $out = [];
    foreach ($students as $s) {
        $uid = (int) $s['user_id'];
        $wsAssigned = 0;
        $wsSubmitted = 0;
        $wsUngraded = 0;
        $wsOverdue = 0;
        foreach ($activeAssignments as $a) {
            $aid = (int) $a['id'];
            $targets = $targetsByAssign[$aid] ?? null;
            if ($targets !== null && !in_array($uid, $targets, true)) {
                continue;
            }
            $wsAssigned++;
            $st = $subsByAssignUser[$aid][$uid] ?? null;
            if ($st === 'submitted' || $st === 'graded') {
                $wsSubmitted++;
            }
            if ($st === 'submitted') {
                $wsUngraded++;
            }
            $dueAt = isset($a['due_at']) && $a['due_at'] !== null && $a['due_at'] !== ''
                ? (string) $a['due_at'] : null;
            if ($dueAt !== null) {
                $ts = strtotime($dueAt);
                if ($ts !== false && $ts < $now && ($st === null || $st === 'pending')) {
                    $wsOverdue++;
                }
            }
        }

        $shTotal = count($summerItems);
        $shPassed = 0;
        foreach ($summerItems as $item) {
            $progress = sh_user_progress_for_item($pdo, $uid, (int) $item['id'], $item);
            if (!empty($progress['passed'])) {
                $shPassed++;
            }
        }

        $s['worksheets'] = [
            'assigned' => $wsAssigned,
            'submitted' => $wsSubmitted,
            'ungraded' => $wsUngraded,
            'overdue' => $wsOverdue,
        ];
        $s['summer'] = [
            'total' => $shTotal,
            'passed' => $shPassed,
        ];
        $out[] = $s;
    }

    return $out;
}

/**
 * Teacher/admin grading & chase inbox.
 *
 * @param array{class_id?:int,type?:string,status?:string} $filters
 * @return list<array<string, mixed>>
 */
function scw_teacher_inbox(PDO $pdo, array $user, array $filters = []): array
{
    $classIds = scw_accessible_class_ids($pdo, $user);
    $filterClass = isset($filters['class_id']) ? (int) $filters['class_id'] : 0;
    if ($filterClass > 0) {
        if (!in_array($filterClass, $classIds, true)) {
            return [];
        }
        $classIds = [$filterClass];
    }
    if ($classIds === []) {
        return [];
    }

    $typeFilter = isset($filters['type']) ? (string) $filters['type'] : '';
    $statusFilter = isset($filters['status']) ? (string) $filters['status'] : '';
    $items = [];
    $now = time();

    foreach ($classIds as $classId) {
        $class = classes_fetch_by_id($pdo, $classId);
        if ($class === null) {
            continue;
        }
        $className = (string) ($class['name'] ?? '');
        $students = classes_students_in_class($pdo, $classId);
        $studentMap = [];
        foreach ($students as $s) {
            $studentMap[(int) $s['id']] = $s;
        }

        if ($typeFilter === '' || $typeFilter === 'worksheet_submission' || $typeFilter === 'overdue_missing') {
            $assignments = wa_list_for_class($pdo, $classId);
            foreach ($assignments as $a) {
                if (!in_array((string) ($a['status'] ?? ''), ['active', 'closed'], true)) {
                    continue;
                }
                $aid = (int) $a['id'];
                $title = (string) ((isset($a['title_zh']) && $a['title_zh'] !== '')
                    ? $a['title_zh'] : ($a['worksheet_title_zh'] ?? ''));
                $dueAt = isset($a['due_at']) && $a['due_at'] !== null && $a['due_at'] !== ''
                    ? (string) $a['due_at'] : null;
                $duePast = false;
                if ($dueAt !== null) {
                    $ts = strtotime($dueAt);
                    $duePast = $ts !== false && $ts < $now;
                }

                $assignAll = (int) ($a['assign_all'] ?? 1) === 1;
                if ($assignAll) {
                    $expectedIds = array_keys($studentMap);
                } else {
                    $t = $pdo->prepare('SELECT user_id FROM worksheet_assignment_students WHERE assignment_id = ?');
                    $t->execute([$aid]);
                    $expectedIds = array_map('intval', $t->fetchAll(PDO::FETCH_COLUMN) ?: []);
                }

                $subs = $pdo->prepare(
                    'SELECT id, user_id, status, submitted_at FROM worksheet_submissions WHERE assignment_id = ?'
                );
                $subs->execute([$aid]);
                $byUser = [];
                foreach ($subs->fetchAll(PDO::FETCH_ASSOC) ?: [] as $sub) {
                    $byUser[(int) $sub['user_id']] = $sub;
                }

                foreach ($expectedIds as $uid) {
                    $stu = $studentMap[$uid] ?? null;
                    if ($stu === null) {
                        continue;
                    }
                    $sub = $byUser[$uid] ?? null;
                    $st = $sub ? (string) $sub['status'] : null;

                    if ($st === 'submitted' && ($typeFilter === '' || $typeFilter === 'worksheet_submission')
                        && ($statusFilter === '' || $statusFilter === 'ungraded')) {
                        $items[] = [
                            'type' => 'worksheet_submission',
                            'status' => 'ungraded',
                            'class_id' => $classId,
                            'class_name' => $className,
                            'student_user_id' => $uid,
                            'student_name' => (string) ($stu['display_name'] ?? ''),
                            'student_email' => (string) ($stu['email'] ?? ''),
                            'title' => $title,
                            'due_at' => $dueAt,
                            'submitted_at' => isset($sub['submitted_at']) ? (string) $sub['submitted_at'] : null,
                            'assignment_id' => $aid,
                            'submission_id' => (int) $sub['id'],
                            'deep_link' => '/admin/courses/' . $classId . '/worksheets?assignment=' . $aid,
                        ];
                    }

                    if ($duePast && ($st === null || $st === 'pending')
                        && ($typeFilter === '' || $typeFilter === 'overdue_missing')
                        && ($statusFilter === '' || $statusFilter === 'overdue_missing')) {
                        $items[] = [
                            'type' => 'worksheet_submission',
                            'status' => 'overdue_missing',
                            'class_id' => $classId,
                            'class_name' => $className,
                            'student_user_id' => $uid,
                            'student_name' => (string) ($stu['display_name'] ?? ''),
                            'student_email' => (string) ($stu['email'] ?? ''),
                            'title' => $title,
                            'due_at' => $dueAt,
                            'submitted_at' => null,
                            'assignment_id' => $aid,
                            'submission_id' => null,
                            'deep_link' => '/admin/courses/' . $classId . '/students/' . $uid,
                        ];
                    }
                }
            }
        }
    }

    usort($items, static function (array $a, array $b): int {
        $da = $a['due_at'] ?? $a['submitted_at'] ?? '';
        $db = $b['due_at'] ?? $b['submitted_at'] ?? '';
        return strcmp((string) $da, (string) $db);
    });

    return $items;
}

/**
 * @return array{ungraded:int,overdue_missing:int,total:int}
 */
function scw_inbox_count(PDO $pdo, array $user): array
{
    $items = scw_teacher_inbox($pdo, $user);
    $ungraded = 0;
    $overdue = 0;
    foreach ($items as $it) {
        if (($it['status'] ?? '') === 'ungraded') {
            $ungraded++;
        } elseif (($it['status'] ?? '') === 'overdue_missing') {
            $overdue++;
        }
    }
    return [
        'ungraded' => $ungraded,
        'overdue_missing' => $overdue,
        'total' => $ungraded + $overdue,
    ];
}

/**
 * School-wide overview for class.manage_any.
 *
 * @return list<array<string, mixed>>
 */
function scw_school_overview(PDO $pdo): array
{
    $classes = classes_list_for_teacher($pdo, 0, true);
    $out = [];
    foreach ($classes as $c) {
        $classId = (int) $c['id'];
        $summary = la_class_activity_summary($pdo, $classId);
        $coursework = scw_class_coursework_kpis($pdo, $classId);
        $out[] = [
            'class_id' => $classId,
            'name' => (string) ($c['name'] ?? ''),
            'school_year' => (string) ($c['school_year'] ?? ''),
            'form_level' => isset($c['form_level']) ? (string) $c['form_level'] : null,
            'form_level_label' => classes_form_level_label(
                isset($c['form_level']) ? (string) $c['form_level'] : null
            ),
            'teacher_user_id' => isset($c['teacher_user_id']) ? (int) $c['teacher_user_id'] : null,
            'total_students' => (int) ($summary['total_students'] ?? 0),
            'active_students' => (int) ($summary['active_students'] ?? 0),
            'minutes_week' => (int) ($summary['minutes_week'] ?? 0),
            'avg_mastery' => $summary['avg_mastery'] ?? null,
            'worksheet_submit_rate' => $coursework['worksheet_submit_rate'],
            'worksheet_ungraded' => $coursework['worksheet_ungraded'],
            'worksheet_overdue' => $coursework['worksheet_overdue'],
            'summer_completion_rate' => $coursework['summer_completion_rate'],
            'deep_link' => '/admin/courses/' . $classId . '/report',
        ];
    }
    return $out;
}
