<?php

declare(strict_types=1);

require_once __DIR__ . '/classes_lib.php';
require_once __DIR__ . '/worksheets_lib.php';
require_once __DIR__ . '/worksheet_permissions_lib.php';
require_once __DIR__ . '/worksheet_blocks_lib.php';
require_once __DIR__ . '/user_names_lib.php';

/**
 * @return array<string, mixed>|null
 */
function wa_get_assignment(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM worksheet_assignments WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return list<int>
 */
function wa_resolve_student_ids(PDO $pdo, int $classId, bool $assignAll, array $studentIds): array
{
    $enrolled = classes_students_in_class($pdo, $classId);
    $enrolledIds = array_map(static fn(array $s): int => (int) $s['id'], $enrolled);
    if ($assignAll) {
        return $enrolledIds;
    }
    $picked = array_values(array_unique(array_map('intval', $studentIds)));
    return array_values(array_intersect($picked, $enrolledIds));
}

function wa_student_can_view_worksheet(PDO $pdo, int $worksheetId, int $userId): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM worksheet_assignments wa
         INNER JOIN class_enrollments ce ON ce.class_id = wa.class_id AND ce.user_id = ? AND ce.status = \'active\'
         INNER JOIN worksheet_submissions ws ON ws.assignment_id = wa.id AND ws.user_id = ?
         LEFT JOIN worksheet_assignment_students was ON was.assignment_id = wa.id AND was.user_id = ?
         WHERE wa.worksheet_id = ?
           AND wa.status IN (\'active\', \'closed\')
           AND (wa.assign_all = 1 OR was.user_id IS NOT NULL)
         LIMIT 1'
    );
    $stmt->execute([$userId, $userId, $userId, $worksheetId]);
    return (bool) $stmt->fetch();
}

function wa_student_assigned(PDO $pdo, int $assignmentId, int $userId): bool
{
    $a = wa_get_assignment($pdo, $assignmentId);
    if (!$a || ($a['status'] ?? '') === 'draft') {
        return false;
    }
    $classId = (int) $a['class_id'];
    $stmt = $pdo->prepare(
        'SELECT id FROM class_enrollments WHERE class_id = ? AND user_id = ? AND status = \'active\' LIMIT 1'
    );
    $stmt->execute([$classId, $userId]);
    if (!$stmt->fetch()) {
        return false;
    }
    if ((int) ($a['assign_all'] ?? 1) === 1) {
        return true;
    }
    $chk = $pdo->prepare(
        'SELECT 1 FROM worksheet_assignment_students WHERE assignment_id = ? AND user_id = ? LIMIT 1'
    );
    $chk->execute([$assignmentId, $userId]);
    return (bool) $chk->fetch();
}

/**
 * @return array<string, mixed>|null
 */
function wa_get_submission(PDO $pdo, int $assignmentId, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM worksheet_submissions WHERE assignment_id = ? AND user_id = ? LIMIT 1'
    );
    $stmt->execute([$assignmentId, $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function wa_public_assignment(array $row, ?array $worksheet = null, ?array $class = null): array
{
    $out = [
        'id' => (int) $row['id'],
        'class_id' => (int) $row['class_id'],
        'worksheet_id' => (int) $row['worksheet_id'],
        'title_zh' => $row['title_zh'] ?? null,
        'title_en' => $row['title_en'] ?? null,
        'instructions_zh' => $row['instructions_zh'] ?? null,
        'instructions_en' => $row['instructions_en'] ?? null,
        'due_at' => $row['due_at'],
        'max_score' => (float) $row['max_score'],
        'status' => $row['status'],
        'assign_all' => (int) ($row['assign_all'] ?? 1) === 1,
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
    if ($class) {
        $out['class_name'] = $class['name'] ?? null;
    }
    if ($worksheet) {
        $out['worksheet_slug'] = $worksheet['slug'];
        $out['worksheet_title_zh'] = $worksheet['title_zh'];
        $out['worksheet_title_en'] = $worksheet['title_en'];
    }
    return $out;
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function wa_public_submission(array $row): array
{
    $out = [
        'id' => (int) $row['id'],
        'assignment_id' => (int) $row['assignment_id'],
        'user_id' => (int) $row['user_id'],
        'status' => $row['status'],
        'submitted_at' => $row['submitted_at'],
        'score' => $row['score'] !== null ? (float) $row['score'] : null,
        'auto_score' => isset($row['auto_score']) && $row['auto_score'] !== null ? (float) $row['auto_score'] : null,
        'feedback_zh' => $row['feedback_zh'],
        'feedback_en' => $row['feedback_en'],
        'graded_at' => $row['graded_at'],
        'student_comment' => $row['student_comment'],
        'responses' => wa_decode_submission_responses($row['responses_json'] ?? null),
    ];
    if (!empty($row['student_name'])) {
        $out['student_name'] = $row['student_name'];
    }
    if (!empty($row['email'])) {
        $out['email'] = $row['email'];
    }
    return $out;
}

/**
 * @return list<array<string, mixed>>
 */
function wa_decode_submission_responses(mixed $json): array
{
    if ($json === null || $json === '') {
        return [];
    }
    if (is_string($json)) {
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
    }
    if (is_array($json)) {
        return $json;
    }
    return [];
}

/**
 * @param list<array<string, mixed>> $responses
 */
function wa_compute_auto_score(PDO $pdo, int $worksheetId, array $responses): float
{
    $ws = ws_get_by_id($pdo, $worksheetId);
    if (!$ws) {
        return 0.0;
    }
    $body = (string) ($ws['body_zh'] ?? '');
    if (trim($body) === '') {
        $body = (string) ($ws['body_en'] ?? '');
    }
    $blocks = ws_parse_content_blocks($body);
    $scoreMap = [];
    foreach ($blocks as $block) {
        if (($block['type'] ?? '') !== 'question') {
            continue;
        }
        $bank = (string) ($block['bank'] ?? '');
        $qid = (int) ($block['question_id'] ?? 0);
        if ($bank === '' || $qid <= 0) {
            continue;
        }
        $scoreMap[$bank . '#' . $qid] = isset($block['score']) && $block['score'] !== null
            ? (float) $block['score']
            : null;
    }

    $total = 0.0;
    foreach ($responses as $resp) {
        if (empty($resp['auto_gradable'])) {
            continue;
        }
        $key = (string) ($resp['bank'] ?? '') . '#' . (int) ($resp['question_id'] ?? 0);
        if (!array_key_exists($key, $scoreMap)) {
            continue;
        }
        $max = $scoreMap[$key];
        if ($max === null || $max <= 0) {
            continue;
        }
        if (!empty($resp['is_correct'])) {
            $total += $max;
        }
    }
    return round($total, 2);
}

/**
 * @return list<array<string, mixed>>
 */
function wa_list_for_class(PDO $pdo, int $classId): array
{
    $stmt = $pdo->prepare(
        'SELECT wa.*, w.slug AS worksheet_slug, w.title_zh AS worksheet_title_zh, w.title_en AS worksheet_title_en,
                (SELECT COUNT(*) FROM worksheet_submissions ws WHERE ws.assignment_id = wa.id) AS student_count,
                (SELECT COUNT(*) FROM worksheet_submissions ws WHERE ws.assignment_id = wa.id AND ws.status IN (\'submitted\',\'graded\')) AS submitted_count,
                (SELECT COUNT(*) FROM worksheet_submissions ws WHERE ws.assignment_id = wa.id AND ws.status = \'graded\') AS graded_count
         FROM worksheet_assignments wa
         INNER JOIN worksheets w ON w.id = wa.worksheet_id
         WHERE wa.class_id = ?
         ORDER BY wa.created_at DESC'
    );
    $stmt->execute([$classId]);
    return $stmt->fetchAll() ?: [];
}

/**
 * @return list<array<string, mixed>>
 */
function wa_list_for_student(PDO $pdo, int $userId): array
{
    $sql = 'SELECT wa.*, w.slug AS worksheet_slug, w.title_zh AS worksheet_title_zh, w.title_en AS worksheet_title_en,
                   c.name AS class_name,
                   ws.id AS submission_id, ws.status AS submission_status, ws.score, ws.auto_score, ws.submitted_at, ws.graded_at,
                   ws.feedback_zh, ws.feedback_en
            FROM worksheet_assignments wa
            INNER JOIN worksheets w ON w.id = wa.worksheet_id
            INNER JOIN classes c ON c.id = wa.class_id
            INNER JOIN class_enrollments ce ON ce.class_id = wa.class_id AND ce.user_id = ? AND ce.status = \'active\'
            INNER JOIN worksheet_submissions ws ON ws.assignment_id = wa.id AND ws.user_id = ?
            LEFT JOIN worksheet_assignment_students was ON was.assignment_id = wa.id AND was.user_id = ?
            WHERE wa.status IN (\'active\', \'closed\')
              AND (wa.assign_all = 1 OR was.user_id IS NOT NULL)
            ORDER BY wa.due_at IS NULL, wa.due_at ASC, wa.created_at DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId, $userId, $userId]);
    return $stmt->fetchAll() ?: [];
}

/**
 * @return list<array<string, mixed>>
 */
function wa_submissions_for_assignment(PDO $pdo, int $assignmentId): array
{
    $stmt = $pdo->prepare(
        'SELECT ws.*, u.email, u.display_name, u.name_zh, u.name_en, ce.form_class, ce.class_no
         FROM worksheet_submissions ws
         INNER JOIN users u ON u.id = ws.user_id
         LEFT JOIN worksheet_assignments wa ON wa.id = ws.assignment_id
         LEFT JOIN class_enrollments ce ON ce.class_id = wa.class_id AND ce.user_id = ws.user_id AND ce.status = \'active\'
         WHERE ws.assignment_id = ?
         ORDER BY ce.form_class ASC, ce.class_no ASC, u.display_name ASC'
    );
    $stmt->execute([$assignmentId]);
    $rows = $stmt->fetchAll() ?: [];
    foreach ($rows as &$r) {
        $r['student_name'] = user_format_name($r);
    }
    unset($r);
    return $rows;
}

/**
 * @param array{id:int,email:string,display_name:string} $teacher
 * @return array{ok:bool,error?:string,id?:int}
 */
function wa_create(PDO $pdo, array $teacher, array $payload): array
{
    if (!worksheet_user_can_assign()) {
        return ['ok' => false, 'error' => '沒有派發工作紙的權限。'];
    }

    $classId = (int) ($payload['class_id'] ?? 0);
    $worksheetId = (int) ($payload['worksheet_id'] ?? 0);
    $assignAll = !isset($payload['assign_all']) || !empty($payload['assign_all']);
    $studentIds = is_array($payload['student_ids'] ?? null) ? $payload['student_ids'] : [];

    $class = classes_fetch_by_id($pdo, $classId);
    if (!$class || !classes_can_manage($pdo, $class, $teacher)) {
        return ['ok' => false, 'error' => '找不到課程或沒有權限。'];
    }

    $ws = ws_get_by_id($pdo, $worksheetId);
    if (!$ws) {
        return ['ok' => false, 'error' => '找不到工作紙。'];
    }
    if (($ws['status'] ?? '') !== 'published' && !ws_teacher_can_assign($ws, $teacher)) {
        return ['ok' => false, 'error' => '工作紙尚未發佈或無權派發。'];
    }

    $targets = wa_resolve_student_ids($pdo, $classId, $assignAll, $studentIds);
    if ($targets === []) {
        return ['ok' => false, 'error' => '請至少指定一位班內學生。'];
    }

    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    if ($titleZh === '' && $titleEn === '') {
        $titleZh = (string) $ws['title_zh'];
        $titleEn = (string) $ws['title_en'];
    }
    $instructionsZh = trim((string) ($payload['instructions_zh'] ?? ''));
    $instructionsEn = trim((string) ($payload['instructions_en'] ?? ''));
    $maxScore = isset($payload['max_score']) ? (float) $payload['max_score'] : 100.0;
    if ($maxScore <= 0) {
        $maxScore = 100.0;
    }
    $dueAt = trim((string) ($payload['due_at'] ?? ''));
    $dueAtVal = $dueAt !== '' ? $dueAt : null;
    $status = in_array($payload['status'] ?? 'active', ['draft', 'active', 'closed'], true)
        ? (string) $payload['status'] : 'active';

    try {
        $pdo->beginTransaction();
        $ins = $pdo->prepare(
            'INSERT INTO worksheet_assignments (class_id, worksheet_id, assigned_by_user_id,
             title_zh, title_en, instructions_zh, instructions_en, due_at, max_score, status, assign_all)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $classId, $worksheetId, $teacher['id'],
            $titleZh !== '' ? $titleZh : null,
            $titleEn !== '' ? $titleEn : null,
            $instructionsZh !== '' ? $instructionsZh : null,
            $instructionsEn !== '' ? $instructionsEn : null,
            $dueAtVal,
            $maxScore,
            $status,
            $assignAll ? 1 : 0,
        ]);
        $assignmentId = (int) $pdo->lastInsertId();

        if (!$assignAll) {
            $was = $pdo->prepare(
                'INSERT INTO worksheet_assignment_students (assignment_id, user_id) VALUES (?,?)'
            );
            foreach ($targets as $uid) {
                $was->execute([$assignmentId, $uid]);
            }
        }

        $sub = $pdo->prepare(
            'INSERT INTO worksheet_submissions (assignment_id, user_id, status) VALUES (?,?,\'pending\')'
        );
        foreach ($targets as $uid) {
            $sub->execute([$assignmentId, $uid]);
        }

        $pdo->commit();
        return ['ok' => true, 'id' => $assignmentId];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '建立派發失敗。'];
    }
}

/**
 * @return array{ok:bool,error?:string}
 */
function wa_submit(PDO $pdo, int $assignmentId, int $userId, array $payload): array
{
    if (!worksheet_user_can_submit()) {
        return ['ok' => false, 'error' => '沒有呈交工作紙的權限。'];
    }

    $a = wa_get_assignment($pdo, $assignmentId);
    if (!$a || ($a['status'] ?? '') !== 'active') {
        return ['ok' => false, 'error' => '此習作不可提交。'];
    }
    if (!wa_student_assigned($pdo, $assignmentId, $userId)) {
        return ['ok' => false, 'error' => '你未被指派此習作。'];
    }
    if (!empty($a['due_at']) && strtotime((string) $a['due_at']) < time()) {
        return ['ok' => false, 'error' => '已過截止時間。'];
    }

    $sub = wa_get_submission($pdo, $assignmentId, $userId);
    if (!$sub) {
        return ['ok' => false, 'error' => '找不到提交紀錄。'];
    }
    if (($sub['status'] ?? '') === 'graded') {
        return ['ok' => false, 'error' => '已評分，無法重新提交。'];
    }

    $comment = trim((string) ($payload['student_comment'] ?? ''));
    $responses = is_array($payload['responses'] ?? null) ? $payload['responses'] : [];
    $responsesJson = $responses !== [] ? json_encode($responses, JSON_UNESCAPED_UNICODE) : null;
    $worksheetId = (int) ($a['worksheet_id'] ?? 0);
    $autoScore = $responses !== [] ? wa_compute_auto_score($pdo, $worksheetId, $responses) : null;

    $upd = $pdo->prepare(
        'UPDATE worksheet_submissions SET status = \'submitted\', submitted_at = CURRENT_TIMESTAMP,
         student_comment = ?, responses_json = ?, auto_score = ?, updated_at = CURRENT_TIMESTAMP
         WHERE assignment_id = ? AND user_id = ?'
    );
    $upd->execute([
        $comment !== '' ? $comment : null,
        $responsesJson,
        $autoScore,
        $assignmentId,
        $userId,
    ]);
    return ['ok' => true];
}

/**
 * @param array{id:int,email:string,display_name:string} $teacher
 * @return array{ok:bool,error?:string}
 */
function wa_grade(PDO $pdo, array $teacher, int $submissionId, array $payload): array
{
    if (!worksheet_user_can_grade()) {
        return ['ok' => false, 'error' => '沒有評分工作紙的權限。'];
    }

    $stmt = $pdo->prepare('SELECT ws.*, wa.class_id, wa.max_score FROM worksheet_submissions ws
                           INNER JOIN worksheet_assignments wa ON wa.id = ws.assignment_id
                           WHERE ws.id = ? LIMIT 1');
    $stmt->execute([$submissionId]);
    $sub = $stmt->fetch();
    if (!$sub) {
        return ['ok' => false, 'error' => '找不到提交紀錄。'];
    }

    $class = classes_fetch_by_id($pdo, (int) $sub['class_id']);
    if (!$class || !classes_can_manage($pdo, $class, $teacher)) {
        return ['ok' => false, 'error' => '沒有權限評分。'];
    }

    if (!isset($payload['score']) || $payload['score'] === '' || $payload['score'] === null) {
        return ['ok' => false, 'error' => '請填寫分數。'];
    }
    $score = (float) $payload['score'];
    $maxScore = (float) ($sub['max_score'] ?? 100);
    if ($score < 0 || $score > $maxScore) {
        return ['ok' => false, 'error' => '分數須在 0 至 ' . $maxScore . ' 之間。'];
    }

    $feedbackZh = trim((string) ($payload['feedback_zh'] ?? ''));
    $feedbackEn = trim((string) ($payload['feedback_en'] ?? ''));

    $upd = $pdo->prepare(
        'UPDATE worksheet_submissions SET status = \'graded\', score = ?,
         feedback_zh = ?, feedback_en = ?, graded_by_user_id = ?, graded_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    $upd->execute([
        $score,
        $feedbackZh !== '' ? $feedbackZh : null,
        $feedbackEn !== '' ? $feedbackEn : null,
        $teacher['id'],
        $submissionId,
    ]);
    return ['ok' => true];
}

/**
 * @param array{id:int,email:string,display_name:string} $teacher
 * @return array{ok:bool,error?:string}
 */
function wa_update_status(PDO $pdo, array $teacher, int $assignmentId, string $status): array
{
    if (!in_array($status, ['draft', 'active', 'closed'], true)) {
        return ['ok' => false, 'error' => '無效狀態。'];
    }
    $a = wa_get_assignment($pdo, $assignmentId);
    if (!$a) {
        return ['ok' => false, 'error' => '找不到派發。'];
    }
    $class = classes_fetch_by_id($pdo, (int) $a['class_id']);
    if (!$class || !classes_can_manage($pdo, $class, $teacher)) {
        return ['ok' => false, 'error' => '沒有權限。'];
    }
    $pdo->prepare('UPDATE worksheet_assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        ->execute([$status, $assignmentId]);
    return ['ok' => true];
}
