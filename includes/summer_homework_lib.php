<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';
require_once __DIR__ . '/summer_homework_grading.php';
require_once __DIR__ . '/web_base.php';

function sh_uploads_root(): string
{
    return dirname(__DIR__) . '/uploads/summer_homework';
}

function sh_media_public_url(string $relativePath): string
{
    return web_resolve_path(ltrim(str_replace('\\', '/', $relativePath), '/'));
}

/**
 * @return list<array<string, mixed>>
 */
function sh_list_media(PDO $pdo, int $itemId): array
{
    try {
        $stmt = $pdo->prepare(
            'SELECT * FROM summer_homework_media WHERE item_id = ? ORDER BY sort_order, id'
        );
        $stmt->execute([$itemId]);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        return [];
    }
    foreach ($rows as &$row) {
        $row['id'] = (int) $row['id'];
        $row['item_id'] = (int) $row['item_id'];
        $row['file_size'] = (int) $row['file_size'];
        $row['sort_order'] = (int) $row['sort_order'];
        $row['url'] = sh_media_public_url((string) $row['file_path']);
    }
    unset($row);
    return $rows;
}

/**
 * @return array{ok:bool,error?:string,media?:array<string,mixed>}
 */
function sh_save_media_upload(
    PDO $pdo,
    int $itemId,
    array $file,
    array $user,
    ?string $altZh = null,
    ?string $altEn = null
): array {
    $item = sh_get_by_id($pdo, $itemId);
    if ($item === null) {
        return ['ok' => false, 'error' => '找不到習作。'];
    }
    if (!sh_can_manage_row($user, $item)) {
        return ['ok' => false, 'error' => '無權編輯。'];
    }
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => '上載失敗。'];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => '無效的上載檔案。'];
    }
    if ((int) ($file['size'] ?? 0) > 5 * 1024 * 1024) {
        return ['ok' => false, 'error' => '圖片不可超過 5 MB。'];
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp) ?: '';
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
    if (!isset($allowed[$mime])) {
        return ['ok' => false, 'error' => '僅支援 JPEG、PNG、GIF、WebP 圖片。'];
    }
    $dir = sh_uploads_root() . '/' . $itemId;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => '無法建立上載目錄。'];
    }
    $basename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    $dest = $dir . '/' . $basename;
    if (!move_uploaded_file($tmp, $dest)) {
        return ['ok' => false, 'error' => '無法儲存檔案。'];
    }
    $relative = 'uploads/summer_homework/' . $itemId . '/' . $basename;
    $original = basename((string) ($file['name'] ?? $basename));
    try {
        $sortStmt = $pdo->prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 FROM summer_homework_media WHERE item_id = ?'
        );
        $sortStmt->execute([$itemId]);
        $sortOrder = (int) $sortStmt->fetchColumn();
        $pdo->prepare(
            'INSERT INTO summer_homework_media
             (item_id, file_path, original_name, mime_type, file_size, alt_zh, alt_en, sort_order)
             VALUES (?,?,?,?,?,?,?,?)'
        )->execute([
            $itemId, $relative, $original, $mime, (int) ($file['size'] ?? 0),
            $altZh !== '' ? $altZh : null, $altEn !== '' ? $altEn : null, $sortOrder,
        ]);
    } catch (Throwable $e) {
        @unlink($dest);
        return ['ok' => false, 'error' => '無法儲存附件資料，請先執行資料庫升級。'];
    }
    return [
        'ok' => true,
        'media' => [
            'id' => (int) $pdo->lastInsertId(),
            'item_id' => $itemId,
            'file_path' => $relative,
            'url' => sh_media_public_url($relative),
            'markdown' => '![' . str_replace(['[', ']'], '', (string) ($altZh ?: $original)) . '](' . sh_media_public_url($relative) . ')',
            'original_name' => $original,
            'mime_type' => $mime,
            'file_size' => (int) ($file['size'] ?? 0),
            'alt_zh' => $altZh,
            'alt_en' => $altEn,
            'sort_order' => $sortOrder,
        ],
    ];
}

/**
 * @return array{ok:bool,error?:string}
 */
function sh_delete_media(PDO $pdo, int $itemId, int $mediaId, array $user): array
{
    $item = sh_get_by_id($pdo, $itemId);
    if ($item === null) {
        return ['ok' => false, 'error' => '找不到習作。'];
    }
    if (!sh_can_manage_row($user, $item)) {
        return ['ok' => false, 'error' => '無權編輯。'];
    }
    $stmt = $pdo->prepare(
        'SELECT id, file_path FROM summer_homework_media WHERE id = ? AND item_id = ? LIMIT 1'
    );
    $stmt->execute([$mediaId, $itemId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => '找不到附件。'];
    }
    $full = dirname(__DIR__) . '/' . ltrim(str_replace('\\', '/', (string) $row['file_path']), '/');
    if (is_file($full)) {
        @unlink($full);
    }
    $pdo->prepare('DELETE FROM summer_homework_media WHERE id = ? AND item_id = ?')
        ->execute([$mediaId, $itemId]);
    return ['ok' => true];
}

/**
 * Whether a column exists (cached per request).
 */
function sh_table_has_column(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $key = $table . '.' . $column;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }
    try {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute([$table, $column]);
        $cache[$key] = (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $e) {
        $cache[$key] = false;
    }
    return $cache[$key];
}

function sh_delete_question_children(PDO $pdo, array $questionIds): void
{
    if ($questionIds === []) {
        return;
    }
    $in = implode(',', array_fill(0, count($questionIds), '?'));
    $pdo->prepare("DELETE FROM summer_homework_mcq_options WHERE question_id IN ($in)")->execute($questionIds);
    $pdo->prepare("DELETE FROM summer_homework_fill_blanks WHERE question_id IN ($in)")->execute($questionIds);
    if (sh_table_has_column($pdo, 'summer_homework_short_answers', 'id')
        || sh_table_exists_short_answers($pdo)
    ) {
        try {
            $pdo->prepare("DELETE FROM summer_homework_short_answers WHERE question_id IN ($in)")->execute($questionIds);
        } catch (Throwable $e) {
            // table may not exist yet
        }
    }
}

function sh_table_exists_short_answers(PDO $pdo): bool
{
    static $exists = null;
    if ($exists !== null) {
        return $exists;
    }
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'summer_homework_short_answers'");
        $exists = $stmt !== false && (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $exists = false;
    }
    return $exists;
}

function sh_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'summer-homework';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM summer_homework_items WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM summer_homework_items WHERE slug = ? AND id <> ? LIMIT 1');
            $stmt->execute([$candidate, $exceptId]);
        }
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $suffix = '-' . $n;
        $candidate = substr($slug, 0, 190 - strlen($suffix)) . $suffix;
        $n++;
    }
}

/**
 * @return array<string, mixed>|null
 */
function sh_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM summer_homework_items WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function sh_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM summer_homework_items WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return list<array<string, mixed>>
 */
function sh_fetch_published(PDO $pdo, ?string $formLevel = null): array
{
    $sql = 'SELECT * FROM summer_homework_items WHERE status = \'published\'';
    $params = [];
    if ($formLevel === '1' || $formLevel === '2') {
        $sql .= ' AND form_level = ?';
        $params[] = $formLevel;
    }
    $sql .= ' ORDER BY form_level ASC, list_sort_order ASC, title_en ASC';
    if ($params === []) {
        return $pdo->query($sql)->fetchAll() ?: [];
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll() ?: [];
}

/**
 * @return list<array<string, mixed>>
 */
function sh_fetch_questions(PDO $pdo, int $itemId, bool $includeAnswers = false): array
{
    $stmt = $pdo->prepare('SELECT * FROM summer_homework_questions WHERE item_id = ? ORDER BY sort_order, id');
    $stmt->execute([$itemId]);
    $questions = $stmt->fetchAll() ?: [];
    $optStmt = $pdo->prepare('SELECT * FROM summer_homework_mcq_options WHERE question_id = ? ORDER BY sort_order, id');
    $blankStmt = $pdo->prepare('SELECT * FROM summer_homework_fill_blanks WHERE question_id = ? ORDER BY blank_index, sort_order, id');
    $shortStmt = null;
    if (sh_table_exists_short_answers($pdo)) {
        $shortStmt = $pdo->prepare(
            'SELECT * FROM summer_homework_short_answers WHERE question_id = ? ORDER BY sort_order, id'
        );
    }

    foreach ($questions as &$q) {
        $qid = (int) $q['id'];
        $type = sh_normalize_question_type((string) $q['question_type']);
        $q['question_type'] = $type;
        $q['options'] = [];
        $q['blanks'] = [];
        $q['acceptable_answers'] = [];
        $q['max_score'] = isset($q['max_score']) ? (float) $q['max_score'] : 1.0;
        if (array_key_exists('correct_bool', $q) && $q['correct_bool'] !== null) {
            $q['correct_bool'] = (int) $q['correct_bool'] === 1;
        } else {
            $q['correct_bool'] = null;
        }

        if ($type === 'mcq' || $type === 'multi_select') {
            $optStmt->execute([$qid]);
            $opts = $optStmt->fetchAll() ?: [];
            if (!$includeAnswers) {
                foreach ($opts as &$o) {
                    unset($o['is_correct']);
                }
                unset($o);
            }
            $q['options'] = $opts;
        } elseif ($type === 'fill_blank') {
            $blankStmt->execute([$qid]);
            $rows = $blankStmt->fetchAll() ?: [];
            /** @var array<int, array<string, mixed>> $grouped */
            $grouped = [];
            foreach ($rows as $row) {
                $bi = (int) ($row['blank_index'] ?? 1);
                if (!isset($grouped[$bi])) {
                    $grouped[$bi] = [
                        'blank_index' => $bi,
                        'sort_order' => (int) ($row['sort_order'] ?? 0),
                        'acceptable_answers' => [],
                    ];
                }
                $az = (string) ($row['acceptable_answer_zh'] ?? '');
                $ae = (string) ($row['acceptable_answer_en'] ?? '');
                if ($includeAnswers) {
                    $grouped[$bi]['acceptable_answers'][] = [
                        'acceptable_answer_zh' => $az,
                        'acceptable_answer_en' => $ae,
                    ];
                }
                // Legacy single-field compatibility for older UI
                if ($includeAnswers && empty($grouped[$bi]['acceptable_answer_zh']) && $az !== '') {
                    $grouped[$bi]['acceptable_answer_zh'] = $az;
                    $grouped[$bi]['acceptable_answer_en'] = $ae;
                }
            }
            ksort($grouped);
            $q['blanks'] = array_values($grouped);
            if (!$includeAnswers) {
                foreach ($q['blanks'] as &$b) {
                    unset($b['acceptable_answers'], $b['acceptable_answer_zh'], $b['acceptable_answer_en']);
                }
                unset($b);
            }
        } elseif ($type === 'true_false') {
            if (!$includeAnswers) {
                unset($q['correct_bool']);
            }
        } elseif ($type === 'short_answer') {
            if ($shortStmt !== null) {
                $shortStmt->execute([$qid]);
                $answers = $shortStmt->fetchAll() ?: [];
                if ($includeAnswers) {
                    $q['acceptable_answers'] = $answers;
                }
            }
        } elseif ($type === 'long_answer') {
            if (!$includeAnswers) {
                unset($q['rubric_zh'], $q['rubric_en']);
            }
        }

        if (!$includeAnswers) {
            unset($q['explanation_zh'], $q['explanation_en']);
        }
    }
    unset($q);

    return $questions;
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function sh_public_row(array $row): array
{
    $dueAt = isset($row['due_at']) && $row['due_at'] !== null && $row['due_at'] !== ''
        ? (string) $row['due_at']
        : null;
    $allowLate = array_key_exists('allow_late_submit', $row)
        ? (int) $row['allow_late_submit'] === 1
        : true;

    $contentRefs = sh_decode_json_column($row['content_refs_json'] ?? null);

    return [
        'id' => (int) $row['id'],
        'slug' => (string) $row['slug'],
        'title_zh' => (string) $row['title_zh'],
        'title_en' => (string) $row['title_en'],
        'form_level' => (string) $row['form_level'],
        'content_type' => (string) $row['content_type'],
        'body_zh' => (string) ($row['body_zh'] ?? ''),
        'body_en' => (string) ($row['body_en'] ?? ''),
        'content_refs' => is_array($contentRefs) ? array_values($contentRefs) : [],
        'video_embed_url' => (string) ($row['video_embed_url'] ?? ''),
        'video_provider' => (string) ($row['video_provider'] ?? 'youtube'),
        'pass_percent' => (float) ($row['pass_percent'] ?? 80),
        'due_at' => $dueAt,
        'allow_late_submit' => $allowLate,
        'submissions_closed' => sh_submissions_closed($dueAt, $allowLate),
        'list_sort_order' => (int) ($row['list_sort_order'] ?? 0),
        'status' => (string) $row['status'],
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

/**
 * @return list<array{type:string,slug:string}>
 */
function sh_normalize_content_refs(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }
    $out = [];
    foreach ($value as $ref) {
        if (!is_array($ref)) {
            continue;
        }
        $type = trim((string) ($ref['type'] ?? ''));
        $slug = trim((string) ($ref['slug'] ?? ''));
        if (!in_array($type, ['note', 'article', 'video'], true) || $slug === '') {
            continue;
        }
        $out[] = ['type' => $type, 'slug' => substr($slug, 0, 190)];
    }
    return $out;
}

/**
 * Normalize due_at from form/API (datetime-local or SQL datetime) to Y-m-d H:i:s or null.
 */
function sh_normalize_due_at(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    $raw = trim((string) $value);
    if ($raw === '') {
        return null;
    }
    $raw = str_replace('T', ' ', $raw);
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $raw)) {
        $raw .= ':00';
    }
    $ts = strtotime($raw);
    if ($ts === false) {
        return null;
    }
    return date('Y-m-d H:i:s', $ts);
}

function sh_is_past_due(?string $dueAt): bool
{
    if ($dueAt === null || $dueAt === '') {
        return false;
    }
    $dueTs = strtotime($dueAt);
    if ($dueTs === false) {
        return false;
    }
    return time() > $dueTs;
}

function sh_submissions_closed(?string $dueAt, bool $allowLateSubmit): bool
{
    return sh_is_past_due($dueAt) && !$allowLateSubmit;
}

/**
 * Timing vs due date for a completion timestamp (first pass).
 *
 * @return 'missing'|'on_time'|'late'
 */
function sh_submission_status(?string $dueAt, ?string $completedAt): string
{
    if ($completedAt === null || $completedAt === '') {
        return 'missing';
    }
    if ($dueAt === null || $dueAt === '') {
        return 'on_time';
    }
    $dueTs = strtotime($dueAt);
    $subTs = strtotime($completedAt);
    if ($dueTs === false || $subTs === false) {
        return 'on_time';
    }
    return $subTs <= $dueTs ? 'on_time' : 'late';
}

/**
 * Report / student display status.
 * - 未交 (missing): never passed (未完成)
 * - 準時 (on_time): first pass on or before due
 * - 欠交 (late): first pass after due
 *
 * @return 'missing'|'on_time'|'late'
 */
function sh_progress_display_status(bool $passed, ?string $dueAt, ?string $firstPassedAt): string
{
    if (!$passed || $firstPassedAt === null || $firstPassedAt === '') {
        return 'missing';
    }

    return sh_submission_status($dueAt, $firstPassedAt);
}

function sh_submission_status_label(string $status): string
{
    return match ($status) {
        'on_time' => '準時',
        'late' => '欠交',
        default => '未交',
    };
}

/**
 * Best attempt: highest percent; ties → earliest submitted_at.
 *
 * @return array<string, mixed>|null
 */
function sh_best_attempt_for_user_item(PDO $pdo, int $userId, int $itemId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM summer_homework_attempts
         WHERE user_id = ? AND item_id = ?
         ORDER BY percent DESC, submitted_at ASC, id ASC
         LIMIT 1'
    );
    $stmt->execute([$userId, $itemId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * First passing attempt (earliest submitted_at among passed = 1).
 *
 * @return array<string, mixed>|null
 */
function sh_first_pass_attempt_for_user_item(PDO $pdo, int $userId, int $itemId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM summer_homework_attempts
         WHERE user_id = ? AND item_id = ? AND passed = 1
         ORDER BY submitted_at ASC, id ASC
         LIMIT 1'
    );
    $stmt->execute([$userId, $itemId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function sh_can_manage_row(?array $user, array $row): bool
{
    if ($user === null) {
        return false;
    }
    if (user_has_permission('summer_homework.manage_any')) {
        return true;
    }
    if (!user_has_permission('summer_homework.manage_own')) {
        return false;
    }
    return isset($row['owner_user_id']) && (int) $row['owner_user_id'] === (int) $user['id'];
}

/**
 * Admin / teacher may review all summer homework (content, answers, analytics).
 * Does not grant create/edit/delete of others' items — use sh_can_manage_row for that.
 */
function sh_can_review(?array $user): bool
{
    if ($user === null) {
        return false;
    }
    return user_has_permission('summer_homework.manage_any')
        || user_has_permission('summer_homework.manage_own')
        || user_has_permission('class.manage_any')
        || user_has_permission('class.manage_own');
}

function sh_can_review_item(?array $user, array $row): bool
{
    return sh_can_review($user);
}

function sh_can_view_item(array $row, ?array $user): bool
{
    if ($row['status'] === 'published') {
        return true;
    }
    return sh_can_review_item($user, $row) || sh_can_manage_row($user, $row);
}

/**
 * @param array<string, mixed> $payload
 * @return array{ok:bool,error?:string,id?:int,regraded_attempts?:int}
 */
function sh_save_item(PDO $pdo, array $payload, array $user): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請填寫標題。'];
    }
    if ($titleEn === '') {
        $titleEn = $titleZh;
    }
    if ($titleZh === '') {
        $titleZh = $titleEn;
    }

    $formLevel = (string) ($payload['form_level'] ?? '1');
    if ($formLevel !== '1' && $formLevel !== '2') {
        return ['ok' => false, 'error' => '級別必須為中一或中二。'];
    }

    $contentType = (string) ($payload['content_type'] ?? 'passage');
    if ($contentType !== 'passage' && $contentType !== 'video') {
        $contentType = 'passage';
    }

    $status = (string) ($payload['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'pending_review', 'published'], true)) {
        $status = 'draft';
    }

    $passPercent = isset($payload['pass_percent']) ? (float) $payload['pass_percent'] : 80.0;
    if ($passPercent < 1 || $passPercent > 100) {
        $passPercent = 80.0;
    }

    $dueAt = sh_normalize_due_at($payload['due_at'] ?? null);
    if (isset($payload['due_at']) && trim((string) $payload['due_at']) !== '' && $dueAt === null) {
        return ['ok' => false, 'error' => '呈交日期格式無效。'];
    }
    $allowLate = !isset($payload['allow_late_submit']) || !empty($payload['allow_late_submit']) ? 1 : 0;

    $slugInput = trim((string) ($payload['slug'] ?? ''));
    $bodyZh = (string) ($payload['body_zh'] ?? '');
    $bodyEn = (string) ($payload['body_en'] ?? '');
    $contentRefsJson = json_encode(
        sh_normalize_content_refs($payload['content_refs'] ?? []),
        JSON_UNESCAPED_UNICODE
    );
    $videoUrl = trim((string) ($payload['video_embed_url'] ?? ''));
    $videoProvider = trim((string) ($payload['video_provider'] ?? 'youtube')) ?: 'youtube';
    $listSort = (int) ($payload['list_sort_order'] ?? 0);
    /** @var list<array<string, mixed>> $questions */
    $questions = isset($payload['questions']) && is_array($payload['questions']) ? $payload['questions'] : [];
    $qValid = sh_validate_questions($questions);
    if (!$qValid['ok']) {
        return $qValid;
    }

    if ($id > 0) {
        $row = sh_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到習作。'];
        }
        if (!sh_can_manage_row($user, $row)) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        $slug = $slugInput !== '' ? sh_ensure_unique_slug($pdo, $slugInput, $id) : (string) $row['slug'];
        $ownerId = (int) ($row['owner_user_id'] ?? $user['id']);
        if (user_has_permission('summer_homework.manage_any') && isset($payload['owner_user_id'])) {
            $ownerId = (int) $payload['owner_user_id'];
        }

        $startedTx = false;
        try {
            if (!$pdo->inTransaction()) {
                $pdo->beginTransaction();
                $startedTx = true;
            }
            $hasContentRefs = sh_table_has_column($pdo, 'summer_homework_items', 'content_refs_json');
            $sql = 'UPDATE summer_homework_items SET slug=?, title_zh=?, title_en=?, form_level=?, content_type=?,
                    body_zh=?, body_en=?';
            $values = [$slug, $titleZh, $titleEn, $formLevel, $contentType, $bodyZh, $bodyEn];
            if ($hasContentRefs) {
                $sql .= ', content_refs_json=?';
                $values[] = $contentRefsJson;
            }
            $sql .= ', video_embed_url=?, video_provider=?, pass_percent=?, due_at=?, allow_late_submit=?,
                     list_sort_order=?, status=?, owner_user_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?';
            array_push(
                $values,
                $videoUrl !== '' ? $videoUrl : null,
                $videoProvider,
                $passPercent,
                $dueAt,
                $allowLate,
                $listSort,
                $status,
                $ownerId,
                $id
            );
            $pdo->prepare($sql)->execute($values);
            sh_replace_questions($pdo, $id, $questions);
            // Re-score existing attempts against the latest answers / pass mark.
            $regrade = sh_regrade_item_attempts($pdo, $id, $passPercent);
            if ($startedTx) {
                $pdo->commit();
            }
            return [
                'ok' => true,
                'id' => $id,
                'regraded_attempts' => (int) ($regrade['updated'] ?? 0),
            ];
        } catch (Throwable $e) {
            if ($startedTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['ok' => false, 'error' => '儲存或重算分數失敗，請重試。'];
        }
    }

    $slug = sh_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $columns = [
        'slug', 'title_zh', 'title_en', 'form_level', 'content_type', 'body_zh', 'body_en',
    ];
    $values = [$slug, $titleZh, $titleEn, $formLevel, $contentType, $bodyZh, $bodyEn];
    if (sh_table_has_column($pdo, 'summer_homework_items', 'content_refs_json')) {
        $columns[] = 'content_refs_json';
        $values[] = $contentRefsJson;
    }
    array_push(
        $columns,
        'video_embed_url',
        'video_provider',
        'pass_percent',
        'due_at',
        'allow_late_submit',
        'list_sort_order',
        'owner_user_id',
        'status'
    );
    array_push(
        $values,
        $videoUrl !== '' ? $videoUrl : null,
        $videoProvider,
        $passPercent,
        $dueAt,
        $allowLate,
        $listSort,
        $user['id'],
        $status
    );
    $placeholders = implode(',', array_fill(0, count($columns), '?'));
    $ins = $pdo->prepare(
        'INSERT INTO summer_homework_items (' . implode(',', $columns) . ') VALUES (' . $placeholders . ')'
    );
    $ins->execute($values);
    $newId = (int) $pdo->lastInsertId();
    sh_replace_questions($pdo, $newId, $questions);
    return ['ok' => true, 'id' => $newId];
}

/**
 * @param list<array<string, mixed>> $questions
 * @return array{ok:bool,error?:string}
 */
function sh_validate_questions(array $questions): array
{
    $usable = 0;
    foreach ($questions as $i => $q) {
        if (!is_array($q)) {
            continue;
        }
        $type = sh_normalize_question_type((string) ($q['question_type'] ?? 'mcq'));
        $stemZh = trim((string) ($q['stem_zh'] ?? ''));
        $stemEn = trim((string) ($q['stem_en'] ?? ''));
        if ($stemZh === '' && $stemEn === '') {
            continue;
        }
        $usable++;
        $n = $i + 1;
        if ($type === 'mcq' || $type === 'multi_select') {
            $opts = isset($q['options']) && is_array($q['options']) ? $q['options'] : [];
            $hasText = false;
            $hasCorrect = false;
            foreach ($opts as $opt) {
                if (!is_array($opt)) {
                    continue;
                }
                $tz = trim((string) ($opt['text_zh'] ?? ''));
                $te = trim((string) ($opt['text_en'] ?? ''));
                if ($tz !== '' || $te !== '') {
                    $hasText = true;
                }
                if (!empty($opt['is_correct']) && ($tz !== '' || $te !== '')) {
                    $hasCorrect = true;
                }
            }
            if (!$hasText) {
                return ['ok' => false, 'error' => "題目 {$n}：選擇題請至少填一個選項。"];
            }
            if (!$hasCorrect) {
                return ['ok' => false, 'error' => "題目 {$n}：選擇題請指定正確選項。"];
            }
        } elseif ($type === 'fill_blank') {
            $blanks = isset($q['blanks']) && is_array($q['blanks']) ? $q['blanks'] : [];
            if ($blanks === []) {
                return ['ok' => false, 'error' => "題目 {$n}：填充題請至少一個空格。"];
            }
            foreach ($blanks as $bi => $blank) {
                if (!is_array($blank)) {
                    continue;
                }
                $answers = isset($blank['acceptable_answers']) && is_array($blank['acceptable_answers'])
                    ? $blank['acceptable_answers']
                    : [[
                        'acceptable_answer_zh' => (string) ($blank['acceptable_answer_zh'] ?? ''),
                        'acceptable_answer_en' => (string) ($blank['acceptable_answer_en'] ?? ''),
                    ]];
                $okAns = false;
                foreach ($answers as $ans) {
                    if (!is_array($ans)) {
                        continue;
                    }
                    if (trim((string) ($ans['acceptable_answer_zh'] ?? '')) !== ''
                        || trim((string) ($ans['acceptable_answer_en'] ?? '')) !== ''
                    ) {
                        $okAns = true;
                        break;
                    }
                }
                if (!$okAns) {
                    return ['ok' => false, 'error' => '題目 ' . $n . '：空格 ' . ($bi + 1) . ' 請填可接受答案。'];
                }
            }
        } elseif ($type === 'true_false') {
            if (!array_key_exists('correct_bool', $q)) {
                return ['ok' => false, 'error' => "題目 {$n}：是非題請指定正確答案（是／否）。"];
            }
        } elseif ($type === 'short_answer') {
            $answers = isset($q['acceptable_answers']) && is_array($q['acceptable_answers'])
                ? $q['acceptable_answers']
                : [];
            $okAns = false;
            foreach ($answers as $ans) {
                if (!is_array($ans)) {
                    continue;
                }
                if (trim((string) ($ans['acceptable_answer_zh'] ?? '')) !== ''
                    || trim((string) ($ans['acceptable_answer_en'] ?? '')) !== ''
                ) {
                    $okAns = true;
                    break;
                }
            }
            if (!$okAns) {
                return ['ok' => false, 'error' => "題目 {$n}：短答題請至少一個可接受答案。"];
            }
        } elseif ($type === 'long_answer') {
            $max = isset($q['max_score']) ? (float) $q['max_score'] : 0.0;
            if ($max <= 0) {
                return ['ok' => false, 'error' => "題目 {$n}：長答題滿分須大於 0。"];
            }
        }
    }
    if ($usable === 0) {
        return ['ok' => false, 'error' => '請至少新增一題有效題目（題幹不可全空）。'];
    }

    return ['ok' => true];
}

/**
 * Upsert questions (stable ids). Children are replaced per question.
 *
 * @param list<array<string, mixed>> $questions
 */
function sh_replace_questions(PDO $pdo, int $itemId, array $questions): void
{
    $old = $pdo->prepare('SELECT id FROM summer_homework_questions WHERE item_id = ?');
    $old->execute([$itemId]);
    $oldIds = array_map('intval', $old->fetchAll(PDO::FETCH_COLUMN) ?: []);
    $keptIds = [];

    $hasExtraCols = sh_table_has_column($pdo, 'summer_homework_questions', 'correct_bool');
    $hasMatchMode = sh_table_has_column($pdo, 'summer_homework_questions', 'match_mode');
    $hasShort = sh_table_exists_short_answers($pdo);

    $insertColumns = [
        'item_id', 'question_type', 'sort_order', 'stem_zh', 'stem_en', 'explanation_zh', 'explanation_en',
    ];
    $updateParts = [
        'question_type=?', 'sort_order=?', 'stem_zh=?', 'stem_en=?', 'explanation_zh=?', 'explanation_en=?',
    ];
    if ($hasMatchMode) {
        $insertColumns[] = 'match_mode';
        $updateParts[] = 'match_mode=?';
    }
    if ($hasExtraCols) {
        array_push($insertColumns, 'correct_bool', 'max_score', 'rubric_zh', 'rubric_en');
        array_push($updateParts, 'correct_bool=?', 'max_score=?', 'rubric_zh=?', 'rubric_en=?');
    }
    $qIns = $pdo->prepare(
        'INSERT INTO summer_homework_questions (' . implode(',', $insertColumns) . ') VALUES ('
        . implode(',', array_fill(0, count($insertColumns), '?')) . ')'
    );
    $qUpd = $pdo->prepare(
        'UPDATE summer_homework_questions SET ' . implode(',', $updateParts) . ' WHERE id=? AND item_id=?'
    );
    $oIns = $pdo->prepare(
        'INSERT INTO summer_homework_mcq_options (question_id, sort_order, text_zh, text_en, is_correct) VALUES (?,?,?,?,?)'
    );
    $bIns = $pdo->prepare(
        'INSERT INTO summer_homework_fill_blanks (question_id, blank_index, acceptable_answer_zh, acceptable_answer_en, sort_order)
         VALUES (?,?,?,?,?)'
    );
    $sIns = $hasShort
        ? $pdo->prepare(
            'INSERT INTO summer_homework_short_answers (question_id, sort_order, acceptable_answer_zh, acceptable_answer_en)
             VALUES (?,?,?,?)'
        )
        : null;

    foreach ($questions as $i => $q) {
        if (!is_array($q)) {
            continue;
        }
        $type = sh_normalize_question_type((string) ($q['question_type'] ?? 'mcq'));
        $stemZh = trim((string) ($q['stem_zh'] ?? ''));
        $stemEn = trim((string) ($q['stem_en'] ?? ''));
        if ($stemZh === '' && $stemEn === '') {
            continue;
        }
        if ($stemEn === '') {
            $stemEn = $stemZh;
        }
        if ($stemZh === '') {
            $stemZh = $stemEn;
        }
        $explZh = (string) ($q['explanation_zh'] ?? '');
        $explEn = (string) ($q['explanation_en'] ?? '');
        $matchMode = ($q['match_mode'] ?? 'exact') === 'contains' ? 'contains' : 'exact';
        $sort = (int) ($q['sort_order'] ?? $i);
        $correctBool = null;
        if ($type === 'true_false') {
            $correctBool = !empty($q['correct_bool']) ? 1 : 0;
        }
        $maxScore = $type === 'long_answer'
            ? max(0.5, (float) ($q['max_score'] ?? 5))
            : 1.0;
        $rubricZh = (string) ($q['rubric_zh'] ?? '');
        $rubricEn = (string) ($q['rubric_en'] ?? '');

        $qid = isset($q['id']) ? (int) $q['id'] : 0;
        $questionValues = [$type, $sort, $stemZh, $stemEn, $explZh, $explEn];
        if ($hasMatchMode) {
            $questionValues[] = $matchMode;
        }
        if ($hasExtraCols) {
            array_push($questionValues, $correctBool, $maxScore, $rubricZh, $rubricEn);
        }
        if ($qid > 0 && in_array($qid, $oldIds, true)) {
            $qUpd->execute([...$questionValues, $qid, $itemId]);
            $keptIds[] = $qid;
            sh_delete_question_children($pdo, [$qid]);
        } else {
            $qIns->execute([$itemId, ...$questionValues]);
            $qid = (int) $pdo->lastInsertId();
            $keptIds[] = $qid;
        }

        if ($type === 'mcq' || $type === 'multi_select') {
            $opts = isset($q['options']) && is_array($q['options']) ? $q['options'] : [];
            foreach ($opts as $oi => $opt) {
                if (!is_array($opt)) {
                    continue;
                }
                $tz = trim((string) ($opt['text_zh'] ?? ''));
                $te = trim((string) ($opt['text_en'] ?? ''));
                if ($tz === '' && $te === '') {
                    continue;
                }
                if ($te === '') {
                    $te = $tz;
                }
                if ($tz === '') {
                    $tz = $te;
                }
                $oIns->execute([
                    $qid,
                    (int) ($opt['sort_order'] ?? $oi),
                    $tz,
                    $te,
                    !empty($opt['is_correct']) ? 1 : 0,
                ]);
            }
        } elseif ($type === 'fill_blank') {
            $blanks = isset($q['blanks']) && is_array($q['blanks']) ? $q['blanks'] : [];
            foreach ($blanks as $bi => $blank) {
                if (!is_array($blank)) {
                    continue;
                }
                $blankIndex = (int) ($blank['blank_index'] ?? ($bi + 1));
                $answers = isset($blank['acceptable_answers']) && is_array($blank['acceptable_answers'])
                    ? $blank['acceptable_answers']
                    : [[
                        'acceptable_answer_zh' => (string) ($blank['acceptable_answer_zh'] ?? ''),
                        'acceptable_answer_en' => (string) ($blank['acceptable_answer_en'] ?? ''),
                    ]];
                $si = 0;
                foreach ($answers as $ans) {
                    if (!is_array($ans)) {
                        continue;
                    }
                    $az = trim((string) ($ans['acceptable_answer_zh'] ?? ''));
                    $ae = trim((string) ($ans['acceptable_answer_en'] ?? ''));
                    if ($az === '' && $ae === '') {
                        continue;
                    }
                    if ($ae === '') {
                        $ae = $az;
                    }
                    if ($az === '') {
                        $az = $ae;
                    }
                    $bIns->execute([$qid, $blankIndex, $az, $ae, $si]);
                    $si++;
                }
            }
        } elseif ($type === 'short_answer' && $sIns !== null) {
            $answers = isset($q['acceptable_answers']) && is_array($q['acceptable_answers'])
                ? $q['acceptable_answers']
                : [];
            foreach ($answers as $si => $ans) {
                if (!is_array($ans)) {
                    continue;
                }
                $az = trim((string) ($ans['acceptable_answer_zh'] ?? ''));
                $ae = trim((string) ($ans['acceptable_answer_en'] ?? ''));
                if ($az === '' && $ae === '') {
                    continue;
                }
                if ($ae === '') {
                    $ae = $az;
                }
                if ($az === '') {
                    $az = $ae;
                }
                $sIns->execute([$qid, (int) $si, $az, $ae]);
            }
        }
    }

    $toDelete = array_values(array_diff($oldIds, $keptIds));
    if ($toDelete !== []) {
        sh_delete_question_children($pdo, $toDelete);
        $in = implode(',', array_fill(0, count($toDelete), '?'));
        $pdo->prepare("DELETE FROM summer_homework_questions WHERE id IN ($in) AND item_id = ?")
            ->execute([...$toDelete, $itemId]);
    }
}

/**
 * Copy selected question-bank questions into a summer-homework item.
 *
 * @param list<int> $questionIds
 * @return array{ok:bool,error?:string,imported?:int,skipped?:int}
 */
function sh_import_questions_from_bank(
    PDO $pdo,
    int $itemId,
    int $bankId,
    array $questionIds,
    array $user
): array {
    $item = sh_get_by_id($pdo, $itemId);
    if ($item === null) {
        return ['ok' => false, 'error' => '找不到習作。'];
    }
    if (!sh_can_manage_row($user, $item)) {
        return ['ok' => false, 'error' => '無權編輯。'];
    }
    $questionIds = array_values(array_unique(array_filter(
        array_map('intval', $questionIds),
        static fn (int $id): bool => $id > 0
    )));
    if ($bankId <= 0 || $questionIds === []) {
        return ['ok' => false, 'error' => '請選擇試題庫及至少一題。'];
    }

    require_once __DIR__ . '/question_bank_lib.php';
    if (qb_get_by_id($pdo, $bankId) === null) {
        return ['ok' => false, 'error' => '找不到試題庫。'];
    }
    $wanted = array_fill_keys($questionIds, true);
    $bankQuestions = qb_fetch_questions($pdo, $bankId, true);
    $existing = sh_fetch_questions($pdo, $itemId, true);
    $nextSort = count($existing);
    $imported = [];

    foreach ($bankQuestions as $source) {
        if (!isset($wanted[(int) ($source['id'] ?? 0)])) {
            continue;
        }
        $type = (string) ($source['question_type'] ?? '');
        if (!in_array($type, ['mcq', 'fill_blank', 'true_false', 'short_answer', 'long_answer'], true)) {
            continue;
        }
        $q = [
            'question_type' => $type,
            'sort_order' => $nextSort++,
            'stem_zh' => (string) ($source['stem_zh'] ?? ''),
            'stem_en' => (string) ($source['stem_en'] ?? ''),
            'explanation_zh' => (string) ($source['explanation_zh'] ?? ''),
            'explanation_en' => (string) ($source['explanation_en'] ?? ''),
            'match_mode' => 'exact',
        ];
        if ($type === 'mcq') {
            $q['options'] = array_map(
                static fn (array $option): array => [
                    'sort_order' => (int) ($option['sort_order'] ?? 0),
                    'text_zh' => (string) ($option['text_zh'] ?? ''),
                    'text_en' => (string) ($option['text_en'] ?? ''),
                    'is_correct' => !empty($option['is_correct']),
                ],
                is_array($source['options'] ?? null) ? $source['options'] : []
            );
        } elseif ($type === 'fill_blank') {
            $grouped = [];
            foreach (is_array($source['blanks'] ?? null) ? $source['blanks'] : [] as $blank) {
                if (!is_array($blank)) {
                    continue;
                }
                $index = (int) ($blank['blank_index'] ?? 1);
                $grouped[$index] ??= ['blank_index' => $index, 'acceptable_answers' => []];
                $grouped[$index]['acceptable_answers'][] = [
                    'acceptable_answer_zh' => (string) ($blank['acceptable_answer_zh'] ?? ''),
                    'acceptable_answer_en' => (string) ($blank['acceptable_answer_en'] ?? ''),
                ];
            }
            $q['blanks'] = array_values($grouped);
        } elseif ($type === 'true_false') {
            $q['correct_bool'] = !empty($source['true_false_answer']);
        } elseif ($type === 'short_answer') {
            $q['acceptable_answers'] = [[
                'acceptable_answer_zh' => (string) ($source['model_answer_zh'] ?? ''),
                'acceptable_answer_en' => (string) ($source['model_answer_en'] ?? ''),
            ]];
        } elseif ($type === 'long_answer') {
            $parts = is_array($source['parts'] ?? null) ? $source['parts'] : [];
            $marks = 0.0;
            $rubricZh = [];
            $rubricEn = [];
            foreach ($parts as $part) {
                if (!is_array($part)) {
                    continue;
                }
                $marks += (float) ($part['marks'] ?? 0);
                $rubricZh[] = trim(
                    (string) ($part['part_label'] ?? '') . ' ' . (string) ($part['model_answer_zh'] ?? '')
                );
                $rubricEn[] = trim(
                    (string) ($part['part_label'] ?? '') . ' ' . (string) ($part['model_answer_en'] ?? '')
                );
            }
            $defaultScore = isset($source['default_score']) && $source['default_score'] !== null
                ? (float) $source['default_score']
                : 5.0;
            $q['max_score'] = $marks > 0 ? $marks : max(0.5, $defaultScore);
            $q['rubric_zh'] = implode("\n", array_filter($rubricZh));
            $q['rubric_en'] = implode("\n", array_filter($rubricEn));
        }
        if (!sh_validate_questions([$q])['ok']) {
            continue;
        }
        $imported[] = $q;
    }

    if ($imported === []) {
        return ['ok' => false, 'error' => '所選題目不在該試題庫或不受支援。'];
    }
    $all = [...$existing, ...$imported];
    $valid = sh_validate_questions($all);
    if (!$valid['ok']) {
        return $valid;
    }
    try {
        $pdo->beginTransaction();
        sh_replace_questions($pdo, $itemId, $all);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '匯入題目失敗。'];
    }
    return [
        'ok' => true,
        'imported' => count($imported),
        'skipped' => count($questionIds) - count($imported),
    ];
}

/**
 * @return array{ok:bool,error?:string}
 */
function sh_delete_item(PDO $pdo, int $id, array $user): array
{
    $row = sh_get_by_id($pdo, $id);
    if (!$row) {
        return ['ok' => false, 'error' => '找不到習作。'];
    }
    if (!sh_can_manage_row($user, $row)) {
        return ['ok' => false, 'error' => '無權刪除。'];
    }
    $old = $pdo->prepare('SELECT id FROM summer_homework_questions WHERE item_id = ?');
    $old->execute([$id]);
    $oldIds = array_map('intval', $old->fetchAll(PDO::FETCH_COLUMN) ?: []);
    sh_delete_question_children($pdo, $oldIds);
    foreach (sh_list_media($pdo, $id) as $media) {
        $full = dirname(__DIR__) . '/' . ltrim(str_replace('\\', '/', (string) $media['file_path']), '/');
        if (is_file($full)) {
            @unlink($full);
        }
    }
    try {
        $pdo->prepare('DELETE FROM summer_homework_media WHERE item_id = ?')->execute([$id]);
    } catch (Throwable $e) {
        // Migration may not have been applied yet.
    }
    $pdo->prepare('DELETE FROM summer_homework_questions WHERE item_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM summer_homework_attempts WHERE item_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM summer_homework_items WHERE id = ?')->execute([$id]);
    return ['ok' => true];
}

/**
 * Re-grade all attempts for an item using current questions/answers and pass %.
 * Preserves responses_json, submitted_at, and teacher_marks_json; refreshes score columns + grading_json.
 *
 * @return array{ok:bool,updated:int,error?:string}
 */
function sh_regrade_item_attempts(PDO $pdo, int $itemId, ?float $passPercent = null): array
{
    $row = sh_get_by_id($pdo, $itemId);
    if ($row === null) {
        return ['ok' => false, 'updated' => 0, 'error' => '找不到習作。'];
    }
    if ($passPercent === null) {
        $passPercent = (float) $row['pass_percent'];
    }

    $questions = sh_fetch_questions($pdo, $itemId, true);
    $hasGrading = sh_attempts_has_grading_json($pdo);
    $stmt = $pdo->prepare(
        'SELECT id, responses_json FROM summer_homework_attempts WHERE item_id = ? ORDER BY id ASC'
    );
    $stmt->execute([$itemId]);

    if ($hasGrading) {
        $upd = $pdo->prepare(
            'UPDATE summer_homework_attempts
             SET score = ?, max_score = ?, percent = ?, passed = ?, grading_json = ?
             WHERE id = ? AND item_id = ?'
        );
    } else {
        $upd = $pdo->prepare(
            'UPDATE summer_homework_attempts
             SET score = ?, max_score = ?, percent = ?, passed = ?
             WHERE id = ? AND item_id = ?'
        );
    }

    $updated = 0;
    while ($attempt = $stmt->fetch()) {
        $attemptId = (int) $attempt['id'];
        $responses = sh_decode_json_column($attempt['responses_json'] ?? null);
        if (!is_array($responses)) {
            $responses = [];
        }
        $aligned = sh_align_responses_to_questions($questions, $responses);
        $graded = sh_grade_responses($questions, $aligned, $passPercent);
        if ($hasGrading) {
            $gradingPayload = [
                'score' => $graded['score'],
                'max_score' => $graded['max_score'],
                'percent' => $graded['percent'],
                'passed' => $graded['passed'],
                'pass_percent' => $passPercent,
                'details' => $graded['details'],
                'regraded_at' => date('Y-m-d H:i:s'),
            ];
            $upd->execute([
                $graded['score'],
                $graded['max_score'],
                $graded['percent'],
                $graded['passed'] ? 1 : 0,
                json_encode($gradingPayload, JSON_UNESCAPED_UNICODE),
                $attemptId,
                $itemId,
            ]);
        } else {
            $upd->execute([
                $graded['score'],
                $graded['max_score'],
                $graded['percent'],
                $graded['passed'] ? 1 : 0,
                $attemptId,
                $itemId,
            ]);
        }
        $updated++;
    }

    return ['ok' => true, 'updated' => $updated];
}

function sh_attempts_has_grading_json(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM summer_homework_attempts LIKE 'grading_json'");
        $cached = $stmt !== false && (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $cached = false;
    }
    return $cached;
}

/**
 * @param array<string, mixed> $responses
 * @return array{ok:bool,error?:string,result?:array<string,mixed>}
 */
function sh_submit_attempt(PDO $pdo, int $userId, int $itemId, array $responses): array
{
    $row = sh_get_by_id($pdo, $itemId);
    if (!$row || $row['status'] !== 'published') {
        return ['ok' => false, 'error' => '找不到已發佈的習作。'];
    }

    $dueAt = isset($row['due_at']) && $row['due_at'] !== null && $row['due_at'] !== ''
        ? (string) $row['due_at']
        : null;
    $allowLate = !array_key_exists('allow_late_submit', $row) || (int) $row['allow_late_submit'] === 1;
    if (sh_submissions_closed($dueAt, $allowLate)) {
        return ['ok' => false, 'error' => '已過呈交截止日期，無法再提交。'];
    }

    $prevBestStmt = $pdo->prepare(
        'SELECT MAX(percent) AS best_percent,
                MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS any_pass
         FROM summer_homework_attempts WHERE user_id = ? AND item_id = ?'
    );
    $prevBestStmt->execute([$userId, $itemId]);
    $prevBestRow = $prevBestStmt->fetch() ?: [];
    $previousBestPercent = $prevBestRow['best_percent'] !== null && $prevBestRow['best_percent'] !== ''
        ? (float) $prevBestRow['best_percent']
        : null;
    $previouslyPassed = (int) ($prevBestRow['any_pass'] ?? 0) === 1;

    $questions = sh_fetch_questions($pdo, $itemId, true);
    $graded = sh_grade_responses($questions, $responses, (float) $row['pass_percent']);

    $submittedAt = date('Y-m-d H:i:s');
    $responsesJson = json_encode($responses, JSON_UNESCAPED_UNICODE);
    $gradingPayload = [
        'score' => $graded['score'],
        'max_score' => $graded['max_score'],
        'percent' => $graded['percent'],
        'passed' => $graded['passed'],
        'pass_percent' => (float) $row['pass_percent'],
        'details' => $graded['details'],
    ];
    $gradingJson = json_encode($gradingPayload, JSON_UNESCAPED_UNICODE);

    // Always INSERT a new row (UI shows best score only; history is retained for analysis).
    if (sh_attempts_has_grading_json($pdo)) {
        $ins = $pdo->prepare(
            'INSERT INTO summer_homework_attempts
             (user_id, item_id, score, max_score, percent, passed, responses_json, grading_json, submitted_at)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $userId,
            $itemId,
            $graded['score'],
            $graded['max_score'],
            $graded['percent'],
            $graded['passed'] ? 1 : 0,
            $responsesJson,
            $gradingJson,
            $submittedAt,
        ]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO summer_homework_attempts
             (user_id, item_id, score, max_score, percent, passed, responses_json, submitted_at)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $userId,
            $itemId,
            $graded['score'],
            $graded['max_score'],
            $graded['percent'],
            $graded['passed'] ? 1 : 0,
            $responsesJson,
            $submittedAt,
        ]);
    }
    $attemptId = (int) $pdo->lastInsertId();

    $best = sh_best_attempt_for_user_item($pdo, $userId, $itemId);
    $bestPercent = $best !== null ? (float) $best['percent'] : $graded['percent'];
    $bestSubmittedAt = $best !== null ? (string) $best['submitted_at'] : $submittedAt;
    $firstPass = sh_first_pass_attempt_for_user_item($pdo, $userId, $itemId);
    $firstPassedAt = $firstPass !== null ? (string) $firstPass['submitted_at'] : null;
    $scoreImproved = $previousBestPercent === null || $graded['percent'] > $previousBestPercent;
    $everPassed = $previouslyPassed || $graded['passed'];
    $status = sh_progress_display_status($everPassed, $dueAt, $firstPassedAt);

    return [
        'ok' => true,
        'result' => [
            'attempt_id' => $attemptId,
            'score' => $graded['score'],
            'max_score' => $graded['max_score'],
            'percent' => $graded['percent'],
            'submitted_at' => $submittedAt,
            'best_percent' => $bestPercent,
            'best_submitted_at' => $bestSubmittedAt,
            'first_passed_at' => $firstPassedAt,
            'previous_best_percent' => $previousBestPercent,
            'score_improved' => $scoreImproved,
            'passed' => $graded['passed'],
            'ever_passed' => $everPassed,
            'pass_percent' => (float) $row['pass_percent'],
            'due_at' => $dueAt,
            'allow_late_submit' => $allowLate,
            'submission_status' => $status,
            'is_late' => $status === 'late',
            'details' => $graded['details'],
            'must_redo' => !$everPassed,
        ],
    ];
}

/**
 * @param array<string, mixed>|null $itemRow
 * @return array{
 *   passed:bool,
 *   percent:?float,
 *   attempts:int,
 *   best_submitted_at:?string,
 *   first_passed_at:?string,
 *   submission_status:string,
 *   score:?float,
 *   max_score:?float
 * }
 */
function sh_user_progress_for_item(PDO $pdo, int $userId, int $itemId, ?array $itemRow = null): array
{
    if ($itemRow === null) {
        $itemRow = sh_get_by_id($pdo, $itemId) ?: [];
    }
    $dueAt = isset($itemRow['due_at']) && $itemRow['due_at'] !== null && $itemRow['due_at'] !== ''
        ? (string) $itemRow['due_at']
        : null;

    $countStmt = $pdo->prepare(
        'SELECT COUNT(*) AS attempts,
                MAX(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS any_pass
         FROM summer_homework_attempts WHERE user_id = ? AND item_id = ?'
    );
    $countStmt->execute([$userId, $itemId]);
    $countRow = $countStmt->fetch() ?: [];
    $attempts = (int) ($countRow['attempts'] ?? 0);
    if ($attempts === 0) {
        return [
            'passed' => false,
            'percent' => null,
            'attempts' => 0,
            'best_submitted_at' => null,
            'first_passed_at' => null,
            'submission_status' => 'missing',
            'score' => null,
            'max_score' => null,
        ];
    }

    $best = sh_best_attempt_for_user_item($pdo, $userId, $itemId);
    $firstPass = sh_first_pass_attempt_for_user_item($pdo, $userId, $itemId);
    $firstPassedAt = $firstPass !== null ? (string) $firstPass['submitted_at'] : null;
    $passed = (int) ($countRow['any_pass'] ?? 0) === 1;

    return [
        'passed' => $passed,
        'percent' => $best !== null ? (float) $best['percent'] : null,
        'attempts' => $attempts,
        'best_submitted_at' => $best !== null ? (string) $best['submitted_at'] : null,
        'first_passed_at' => $firstPassedAt,
        'submission_status' => sh_progress_display_status($passed, $dueAt, $firstPassedAt),
        'score' => $best !== null ? (float) $best['score'] : null,
        'max_score' => $best !== null ? (float) $best['max_score'] : null,
    ];
}

/**
 * @return array{
 *   class:array<string,mixed>,
 *   items:list<array<string,mixed>>,
 *   students:list<array<string,mixed>>,
 *   rows:list<array<string,mixed>>,
 *   message:?string
 * }
 */
function sh_class_report(PDO $pdo, int $classId): array
{
    require_once __DIR__ . '/classes_lib.php';

    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return [
            'class' => [],
            'items' => [],
            'students' => [],
            'rows' => [],
            'message' => '找不到課程。',
        ];
    }

    $formLevel = isset($class['form_level']) && $class['form_level'] !== null && $class['form_level'] !== ''
        ? (string) $class['form_level']
        : null;

    $classOut = [
        'id' => (int) $class['id'],
        'name' => (string) $class['name'],
        'school_year' => (string) ($class['school_year'] ?? ''),
        'form_level' => $formLevel,
        'form_level_label' => classes_form_level_label($formLevel),
        'course_subject' => isset($class['course_subject']) ? (string) $class['course_subject'] : null,
        'course_subject_label' => classes_course_subject_label(
            isset($class['course_subject']) ? (string) $class['course_subject'] : null
        ),
    ];

    if ($formLevel !== '1' && $formLevel !== '2') {
        return [
            'class' => $classOut,
            'items' => [],
            'students' => classes_students_in_class($pdo, $classId),
            'rows' => [],
            'message' => '此課程年級非中一／中二，沒有對應的暑期功課習作。請先在課程設定年級。',
        ];
    }

    $items = sh_fetch_published($pdo, $formLevel);
    $students = classes_students_in_class($pdo, $classId);
    $rows = [];

    foreach ($students as $student) {
        $uid = (int) ($student['id'] ?? $student['user_id'] ?? 0);
        if ($uid <= 0) {
            continue;
        }
        foreach ($items as $item) {
            $itemId = (int) $item['id'];
            $progress = sh_user_progress_for_item($pdo, $uid, $itemId, $item);
            $status = $progress['submission_status'];
            $rows[] = [
                'student_user_id' => $uid,
                'item_id' => $itemId,
                'status' => $status,
                'status_label' => sh_submission_status_label($status),
                'percent' => $progress['percent'],
                'score' => $progress['score'],
                'max_score' => $progress['max_score'],
                'best_submitted_at' => $progress['best_submitted_at'],
                'first_passed_at' => $progress['first_passed_at'],
                'attempts' => $progress['attempts'],
                'passed' => $progress['passed'],
            ];
        }
    }

    $itemPublic = [];
    foreach ($items as $item) {
        $p = sh_public_row($item);
        unset($p['body_zh'], $p['body_en']);
        $itemPublic[] = $p;
    }

    return [
        'class' => $classOut,
        'items' => $itemPublic,
        'students' => $students,
        'rows' => $rows,
        'message' => $items === [] ? '尚無對應該年級的已發佈暑期功課。' : null,
    ];
}

/**
 * All attempts for one item (newest first), optionally filtered by student.
 * Joins users for display name / email.
 *
 * @return list<array<string, mixed>>
 */
function sh_list_attempts_for_item(PDO $pdo, int $itemId, ?int $userId = null): array
{
    require_once __DIR__ . '/user_names_lib.php';

    $sql = 'SELECT a.*, u.email, u.display_name, u.name_zh, u.name_en
            FROM summer_homework_attempts a
            INNER JOIN users u ON u.id = a.user_id
            WHERE a.item_id = ?';
    $params = [$itemId];
    if ($userId !== null && $userId > 0) {
        $sql .= ' AND a.user_id = ?';
        $params[] = $userId;
    }
    $sql .= ' ORDER BY a.submitted_at DESC, a.id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'item_id' => (int) $row['item_id'],
            'score' => (float) $row['score'],
            'max_score' => (float) $row['max_score'],
            'percent' => (float) $row['percent'],
            'passed' => (int) $row['passed'] === 1,
            'submitted_at' => (string) $row['submitted_at'],
            'email' => (string) ($row['email'] ?? ''),
            'display_name' => user_format_name($row),
            'name_zh' => (string) ($row['name_zh'] ?? ''),
            'name_en' => (string) ($row['name_en'] ?? ''),
            'responses' => sh_decode_json_column($row['responses_json'] ?? null),
            'grading' => sh_decode_json_column($row['grading_json'] ?? null),
            'teacher_marks' => sh_decode_json_column($row['teacher_marks_json'] ?? null),
            // Keep raw key for admin analytics.php which still reads teacher_marks_json.
            'teacher_marks_json' => $row['teacher_marks_json'] ?? null,
        ];
    }
    return $out;
}

/**
 * Per-student summary for one item (attempt count + best score).
 *
 * @return list<array<string, mixed>>
 */
function sh_student_summaries_for_item(PDO $pdo, int $itemId): array
{
    require_once __DIR__ . '/user_names_lib.php';

    $stmt = $pdo->prepare(
        'SELECT a.user_id, u.email, u.display_name, u.name_zh, u.name_en,
                COUNT(*) AS attempts,
                MAX(a.percent) AS best_percent,
                MAX(a.passed) AS any_pass,
                MAX(a.submitted_at) AS last_submitted_at,
                MIN(a.submitted_at) AS first_submitted_at
         FROM summer_homework_attempts a
         INNER JOIN users u ON u.id = a.user_id
         WHERE a.item_id = ?
         GROUP BY a.user_id, u.email, u.display_name, u.name_zh, u.name_en
         ORDER BY best_percent DESC, attempts DESC, u.display_name ASC'
    );
    $stmt->execute([$itemId]);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $uid = (int) $row['user_id'];
        $best = sh_best_attempt_for_user_item($pdo, $uid, $itemId);
        $firstPass = sh_first_pass_attempt_for_user_item($pdo, $uid, $itemId);
        $out[] = [
            'user_id' => $uid,
            'email' => (string) ($row['email'] ?? ''),
            'display_name' => user_format_name($row),
            'attempts' => (int) $row['attempts'],
            'best_percent' => $best !== null ? (float) $best['percent'] : (float) $row['best_percent'],
            'best_score' => $best !== null ? (float) $best['score'] : null,
            'best_max_score' => $best !== null ? (float) $best['max_score'] : null,
            'best_submitted_at' => $best !== null ? (string) $best['submitted_at'] : null,
            'first_passed_at' => $firstPass !== null ? (string) $firstPass['submitted_at'] : null,
            'passed' => (int) ($row['any_pass'] ?? 0) === 1,
            'first_submitted_at' => (string) ($row['first_submitted_at'] ?? ''),
            'last_submitted_at' => (string) ($row['last_submitted_at'] ?? ''),
        ];
    }
    return $out;
}

/**
 * Decode JSON column that may already be an array (some PDO drivers).
 *
 * @return array<string, mixed>|list<mixed>|null
 */
function sh_decode_json_column(mixed $value): ?array
{
    if ($value === null || $value === '') {
        return null;
    }
    if (is_array($value)) {
        return $value;
    }
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : null;
}

/**
 * All attempts for one student on one item (oldest first). Includes responses + grading when present.
 *
 * @return list<array<string, mixed>>
 */
function sh_list_attempts_for_user_item(PDO $pdo, int $userId, int $itemId): array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM summer_homework_attempts
         WHERE user_id = ? AND item_id = ?
         ORDER BY submitted_at ASC, id ASC'
    );
    $stmt->execute([$userId, $itemId]);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'item_id' => (int) $row['item_id'],
            'score' => (float) $row['score'],
            'max_score' => (float) $row['max_score'],
            'percent' => (float) $row['percent'],
            'passed' => (int) $row['passed'] === 1,
            'submitted_at' => (string) $row['submitted_at'],
            'responses' => sh_decode_json_column($row['responses_json'] ?? null),
            'grading' => sh_decode_json_column($row['grading_json'] ?? null),
        ];
    }
    return $out;
}

/**
 * Ensure option bucket exists in MCQ option_stats.
 *
 * @param array<string, mixed> $statsQ
 * @param array<string, mixed>|null $meta
 */
function sh_analytics_ensure_option(array &$statsQ, int $idx, ?array $meta = null): void
{
    if (!isset($statsQ['option_stats']) || !is_array($statsQ['option_stats'])) {
        $statsQ['option_stats'] = [];
    }
    if (!isset($statsQ['option_stats'][$idx])) {
        $statsQ['option_stats'][$idx] = [
            'index' => $idx,
            'label' => chr(65 + $idx),
            'text_zh' => '',
            'text_en' => '',
            'is_correct' => false,
            'selected_count' => 0,
        ];
    }
    if ($meta !== null) {
        if (isset($meta['label']) && (string) $meta['label'] !== '') {
            $statsQ['option_stats'][$idx]['label'] = (string) $meta['label'];
        }
        if (isset($meta['text_zh'])) {
            $statsQ['option_stats'][$idx]['text_zh'] = (string) $meta['text_zh'];
        }
        if (isset($meta['text_en'])) {
            $statsQ['option_stats'][$idx]['text_en'] = (string) $meta['text_en'];
        }
        if (array_key_exists('is_correct', $meta)) {
            $statsQ['option_stats'][$idx]['is_correct'] = !empty($meta['is_correct']);
        }
    }
}

/**
 * Aggregate attempt counts, miss rates, and MCQ option-selection rates for one homework item.
 *
 * @return array{
 *   item_id:int,
 *   total_attempts:int,
 *   distinct_students:int,
 *   avg_attempts_per_student:float,
 *   questions:list<array<string,mixed>>,
 *   grading_json_available:bool
 * }
 */
function sh_item_attempt_analytics(PDO $pdo, int $itemId): array
{
    $summaryStmt = $pdo->prepare(
        'SELECT COUNT(*) AS total_attempts,
                COUNT(DISTINCT user_id) AS distinct_students
         FROM summer_homework_attempts WHERE item_id = ?'
    );
    $summaryStmt->execute([$itemId]);
    $summary = $summaryStmt->fetch() ?: [];
    $totalAttempts = (int) ($summary['total_attempts'] ?? 0);
    $distinctStudents = (int) ($summary['distinct_students'] ?? 0);

    $questions = sh_fetch_questions($pdo, $itemId, true);
    /** @var array<int, array<string, mixed>> $stats */
    $stats = [];
    foreach ($questions as $q) {
        $qid = (int) $q['id'];
        $type = (string) $q['question_type'];
        $stats[$qid] = [
            'question_id' => $qid,
            'type' => $type,
            'attempts' => 0,
            'correct' => 0,
            'incorrect' => 0,
            'unanswered' => 0,
        ];
        if ($type === 'mcq') {
            $stats[$qid]['option_stats'] = [];
            $stats[$qid]['correct_option_index'] = null;
            foreach ($q['options'] as $i => $o) {
                $idx = (int) $i;
                sh_analytics_ensure_option($stats[$qid], $idx, [
                    'label' => chr(65 + $idx),
                    'text_zh' => (string) ($o['text_zh'] ?? ''),
                    'text_en' => (string) ($o['text_en'] ?? ''),
                    'is_correct' => !empty($o['is_correct']),
                ]);
                if (!empty($o['is_correct']) && $stats[$qid]['correct_option_index'] === null) {
                    $stats[$qid]['correct_option_index'] = $idx;
                }
            }
        } elseif ($type === 'fill_blank') {
            $stats[$qid]['blank_stats'] = [];
        } elseif ($type === 'true_false') {
            $stats[$qid]['true_count'] = 0;
            $stats[$qid]['false_count'] = 0;
            $stats[$qid]['correct_bool'] = array_key_exists('correct_bool', $q)
                ? ($q['correct_bool'] === null ? null : (bool) $q['correct_bool'])
                : null;
        } elseif ($type === 'short_answer') {
            $stats[$qid]['wrong_answer_counts'] = [];
        } elseif ($type === 'long_answer') {
            $stats[$qid]['needs_marking'] = 0;
            $stats[$qid]['marked'] = 0;
        }
    }

    if ($totalAttempts > 0) {
        $cols = sh_attempts_has_grading_json($pdo)
            ? 'grading_json, responses_json'
            : 'responses_json';
        $attStmt = $pdo->prepare(
            "SELECT {$cols} FROM summer_homework_attempts WHERE item_id = ?"
        );
        $attStmt->execute([$itemId]);
        while ($row = $attStmt->fetch()) {
            $grading = isset($row['grading_json'])
                ? sh_decode_json_column($row['grading_json'] ?? null)
                : null;
            $responses = sh_decode_json_column($row['responses_json'] ?? null) ?? [];
            $details = (is_array($grading) && isset($grading['details']) && is_array($grading['details']))
                ? $grading['details']
                : [];

            /** @var array<int, array<string, mixed>> $detailByQ */
            $detailByQ = [];
            foreach ($details as $detail) {
                if (!is_array($detail)) {
                    continue;
                }
                $qid = (int) ($detail['question_id'] ?? 0);
                if ($qid > 0) {
                    $detailByQ[$qid] = $detail;
                }
            }

            foreach ($stats as $qid => &$s) {
                $detail = $detailByQ[$qid] ?? null;
                $resp = is_array($responses)
                    ? ($responses[(string) $qid] ?? $responses[$qid] ?? null)
                    : null;

                if (($s['type'] ?? '') === 'mcq') {
                    $selected = null;
                    $correctIdx = $s['correct_option_index'] ?? null;
                    $isCorrect = null;

                    if (is_array($detail)) {
                        if (array_key_exists('selected_option_index', $detail)) {
                            $selected = $detail['selected_option_index'] !== null
                                ? (int) $detail['selected_option_index']
                                : null;
                        }
                        if (isset($detail['correct_option_index'])) {
                            $correctIdx = (int) $detail['correct_option_index'];
                            $s['correct_option_index'] = $correctIdx;
                        }
                        if (array_key_exists('correct', $detail)) {
                            $isCorrect = !empty($detail['correct']);
                        }
                        if (isset($detail['options']) && is_array($detail['options'])) {
                            foreach ($detail['options'] as $optSnap) {
                                if (!is_array($optSnap) || !isset($optSnap['index'])) {
                                    continue;
                                }
                                sh_analytics_ensure_option($s, (int) $optSnap['index'], $optSnap);
                            }
                        }
                    }
                    if ($selected === null && is_array($resp) && isset($resp['selected_option_index'])) {
                        $selected = (int) $resp['selected_option_index'];
                    }
                    if ($isCorrect === null && $selected !== null && $correctIdx !== null) {
                        $isCorrect = $selected === (int) $correctIdx;
                    }

                    if ($detail === null && $selected === null && !is_array($resp)) {
                        continue;
                    }

                    $s['attempts']++;
                    if ($selected === null) {
                        $s['unanswered']++;
                        $s['incorrect']++;
                    } elseif ($isCorrect === true) {
                        $s['correct']++;
                        sh_analytics_ensure_option($s, $selected);
                        $s['option_stats'][$selected]['selected_count']++;
                    } else {
                        $s['incorrect']++;
                        sh_analytics_ensure_option($s, $selected);
                        $s['option_stats'][$selected]['selected_count']++;
                    }
                } elseif (($s['type'] ?? '') === 'fill_blank') {
                    if (!is_array($detail)) {
                        continue;
                    }
                    $s['attempts']++;
                    if (!empty($detail['correct'])) {
                        $s['correct']++;
                    } else {
                        $s['incorrect']++;
                    }
                    if (isset($detail['blanks']) && is_array($detail['blanks'])) {
                        if (!isset($s['blank_stats']) || !is_array($s['blank_stats'])) {
                            $s['blank_stats'] = [];
                        }
                        foreach ($detail['blanks'] as $blank) {
                            if (!is_array($blank)) {
                                continue;
                            }
                            $bi = (int) ($blank['blank_index'] ?? 0);
                            if ($bi <= 0) {
                                continue;
                            }
                            if (!isset($s['blank_stats'][$bi])) {
                                $s['blank_stats'][$bi] = [
                                    'blank_index' => $bi,
                                    'attempts' => 0,
                                    'correct' => 0,
                                    'incorrect' => 0,
                                ];
                            }
                            $s['blank_stats'][$bi]['attempts']++;
                            if (!empty($blank['correct'])) {
                                $s['blank_stats'][$bi]['correct']++;
                            } else {
                                $s['blank_stats'][$bi]['incorrect']++;
                            }
                        }
                    }
                } elseif (($s['type'] ?? '') === 'true_false') {
                    if ($detail === null && !is_array($resp)) {
                        continue;
                    }
                    $selected = null;
                    $isCorrect = null;
                    if (is_array($detail)) {
                        if (array_key_exists('selected_bool', $detail)) {
                            $selected = $detail['selected_bool'] === null
                                ? null
                                : (bool) $detail['selected_bool'];
                        }
                        if (array_key_exists('correct', $detail)) {
                            $isCorrect = $detail['correct'] === null ? null : !empty($detail['correct']);
                        }
                        if (array_key_exists('correct_bool', $detail) && $detail['correct_bool'] !== null) {
                            $s['correct_bool'] = (bool) $detail['correct_bool'];
                        }
                    }
                    if ($selected === null && is_array($resp) && array_key_exists('selected_bool', $resp)) {
                        $selected = $resp['selected_bool'] === null ? null : (bool) $resp['selected_bool'];
                    }
                    if ($isCorrect === null && $selected !== null && array_key_exists('correct_bool', $s) && $s['correct_bool'] !== null) {
                        $isCorrect = $selected === (bool) $s['correct_bool'];
                    }
                    $s['attempts']++;
                    if ($selected === null) {
                        $s['unanswered']++;
                        $s['incorrect']++;
                    } elseif ($isCorrect === true) {
                        $s['correct']++;
                    } else {
                        $s['incorrect']++;
                    }
                    if ($selected === true) {
                        $s['true_count'] = (int) ($s['true_count'] ?? 0) + 1;
                    } elseif ($selected === false) {
                        $s['false_count'] = (int) ($s['false_count'] ?? 0) + 1;
                    }
                } elseif (($s['type'] ?? '') === 'short_answer') {
                    if ($detail === null && !is_array($resp)) {
                        continue;
                    }
                    $given = '';
                    $isCorrect = null;
                    if (is_array($detail)) {
                        $given = trim((string) ($detail['given'] ?? ''));
                        if (array_key_exists('correct', $detail)) {
                            $isCorrect = !empty($detail['correct']);
                        }
                    }
                    if ($given === '' && is_array($resp)) {
                        $given = trim((string) ($resp['text'] ?? ''));
                    }
                    $s['attempts']++;
                    if ($given === '') {
                        $s['unanswered']++;
                        $s['incorrect']++;
                    } elseif ($isCorrect === true) {
                        $s['correct']++;
                    } else {
                        $s['incorrect']++;
                        if ($given !== '') {
                            if (!isset($s['wrong_answer_counts']) || !is_array($s['wrong_answer_counts'])) {
                                $s['wrong_answer_counts'] = [];
                            }
                            $key = mb_strtolower($given);
                            if (!isset($s['wrong_answer_counts'][$key])) {
                                $s['wrong_answer_counts'][$key] = ['answer' => $given, 'count' => 0];
                            }
                            $s['wrong_answer_counts'][$key]['count']++;
                        }
                    }
                } elseif (($s['type'] ?? '') === 'long_answer') {
                    if ($detail === null && !is_array($resp)) {
                        continue;
                    }
                    $given = '';
                    if (is_array($detail)) {
                        $given = trim((string) ($detail['given'] ?? ''));
                    }
                    if ($given === '' && is_array($resp)) {
                        $given = trim((string) ($resp['text'] ?? ''));
                    }
                    $s['attempts']++;
                    if ($given === '') {
                        $s['unanswered']++;
                    }
                    if (is_array($detail) && !empty($detail['needs_marking'])) {
                        $s['needs_marking'] = (int) ($s['needs_marking'] ?? 0) + 1;
                    } else {
                        $s['marked'] = (int) ($s['marked'] ?? 0) + 1;
                    }
                }
            }
            unset($s);
        }
    }

    $questionOut = [];
    foreach ($stats as $s) {
        $attempts = (int) $s['attempts'];
        $incorrect = (int) $s['incorrect'];
        $missRate = $attempts > 0 ? round(($incorrect / $attempts) * 100, 2) : null;
        $row = [
            'question_id' => $s['question_id'],
            'type' => $s['type'],
            'attempts' => $attempts,
            'correct' => (int) $s['correct'],
            'incorrect' => $incorrect,
            'unanswered' => (int) ($s['unanswered'] ?? 0),
            'miss_rate_percent' => $missRate,
            'correct_option_index' => $s['correct_option_index'] ?? null,
        ];
        if (isset($s['option_stats']) && is_array($s['option_stats'])) {
            $options = array_values($s['option_stats']);
            usort($options, static fn (array $a, array $b): int => $a['index'] <=> $b['index']);
            foreach ($options as &$opt) {
                $sel = (int) $opt['selected_count'];
                $opt['select_rate_percent'] = $attempts > 0 ? round(($sel / $attempts) * 100, 2) : null;
                $isCorrectOpt = !empty($opt['is_correct']);
                if ($isCorrectOpt) {
                    $opt['wrong_select_rate_percent'] = null;
                } else {
                    $opt['wrong_select_rate_percent'] = $incorrect > 0
                        ? round(($sel / $incorrect) * 100, 2)
                        : null;
                }
            }
            unset($opt);
            $row['options'] = $options;
        }
        if (isset($s['blank_stats']) && is_array($s['blank_stats'])) {
            $blanks = array_values($s['blank_stats']);
            usort($blanks, static fn (array $a, array $b): int => $a['blank_index'] <=> $b['blank_index']);
            foreach ($blanks as &$b) {
                $ba = (int) $b['attempts'];
                $b['miss_rate_percent'] = $ba > 0 ? round(((int) $b['incorrect'] / $ba) * 100, 2) : null;
            }
            unset($b);
            $row['blanks'] = $blanks;
        }
        if (($s['type'] ?? '') === 'true_false') {
            $row['true_count'] = (int) ($s['true_count'] ?? 0);
            $row['false_count'] = (int) ($s['false_count'] ?? 0);
            $row['correct_bool'] = $s['correct_bool'] ?? null;
        }
        if (($s['type'] ?? '') === 'short_answer' && isset($s['wrong_answer_counts']) && is_array($s['wrong_answer_counts'])) {
            $wrongs = array_values($s['wrong_answer_counts']);
            usort($wrongs, static fn (array $a, array $b): int => ((int) $b['count']) <=> ((int) $a['count']));
            $row['common_wrong_answers'] = array_slice($wrongs, 0, 5);
        }
        if (($s['type'] ?? '') === 'long_answer') {
            $row['needs_marking'] = (int) ($s['needs_marking'] ?? 0);
            $row['marked'] = (int) ($s['marked'] ?? 0);
            $row['miss_rate_percent'] = null;
            $row['correct'] = 0;
            $row['incorrect'] = 0;
        }
        $questionOut[] = $row;
    }

    return [
        'item_id' => $itemId,
        'total_attempts' => $totalAttempts,
        'distinct_students' => $distinctStudents,
        'avg_attempts_per_student' => $distinctStudents > 0
            ? round($totalAttempts / $distinctStudents, 2)
            : 0.0,
        'questions' => $questionOut,
        'grading_json_available' => sh_attempts_has_grading_json($pdo),
    ];
}

/**
 * Save teacher marks for long_answer questions on one attempt.
 *
 * @param array<string, array{score?:float,comment?:string}> $marks question_id => mark
 * @return array{ok:bool,error?:string}
 */
function sh_save_teacher_marks(PDO $pdo, int $attemptId, array $marks, array $user): array
{
    if (!sh_can_review($user)) {
        return ['ok' => false, 'error' => '無權評分。'];
    }
    $stmt = $pdo->prepare('SELECT * FROM summer_homework_attempts WHERE id = ? LIMIT 1');
    $stmt->execute([$attemptId]);
    $attempt = $stmt->fetch();
    if (!$attempt) {
        return ['ok' => false, 'error' => '找不到呈交紀錄。'];
    }
    if (!sh_table_has_column($pdo, 'summer_homework_attempts', 'teacher_marks_json')) {
        return ['ok' => false, 'error' => '請先執行 schema_summer_homework_qtypes.sql。'];
    }

    $questions = sh_fetch_questions($pdo, (int) $attempt['item_id'], true);
    $byId = [];
    foreach ($questions as $q) {
        $byId[(int) $q['id']] = $q;
    }

    $existing = sh_decode_json_column($attempt['teacher_marks_json'] ?? null) ?? [];
    if (!is_array($existing)) {
        $existing = [];
    }

    foreach ($marks as $qidRaw => $mark) {
        $qid = (int) $qidRaw;
        if (!isset($byId[$qid]) || ($byId[$qid]['question_type'] ?? '') !== 'long_answer') {
            continue;
        }
        if (!is_array($mark)) {
            continue;
        }
        $max = (float) ($byId[$qid]['max_score'] ?? 5);
        $score = isset($mark['score']) ? (float) $mark['score'] : 0.0;
        if ($score < 0) {
            $score = 0.0;
        }
        if ($score > $max) {
            $score = $max;
        }
        $existing[(string) $qid] = [
            'score' => $score,
            'max' => $max,
            'comment' => trim((string) ($mark['comment'] ?? '')),
            'marked_by' => (int) ($user['id'] ?? 0),
            'marked_at' => date('Y-m-d H:i:s'),
        ];
    }

    $pdo->prepare(
        'UPDATE summer_homework_attempts SET teacher_marks_json = ? WHERE id = ?'
    )->execute([json_encode($existing, JSON_UNESCAPED_UNICODE), $attemptId]);

    return ['ok' => true];
}

/**
 * CSV rows for class summer homework report.
 *
 * @return list<list<string>>
 */
function sh_class_report_csv_rows(array $report): array
{
    $items = $report['items'] ?? [];
    $students = $report['students'] ?? [];
    $rows = $report['rows'] ?? [];
    /** @var array<string, array<string, mixed>> $by */
    $by = [];
    foreach ($rows as $r) {
        $by[(int) $r['student_user_id'] . ':' . (int) $r['item_id']] = $r;
    }

    $header = ['學生', '帳戶'];
    foreach ($items as $item) {
        $title = (string) ($item['title_zh'] ?: $item['title_en']);
        $header[] = $title . '｜狀態';
        $header[] = $title . '｜最高％';
        $header[] = $title . '｜首次及格';
    }
    $out = [$header];
    foreach ($students as $stu) {
        $uid = (int) ($stu['id'] ?? $stu['user_id'] ?? 0);
        $line = [
            user_format_name($stu),
            (string) ($stu['email'] ?? ''),
        ];
        foreach ($items as $item) {
            $cell = $by[$uid . ':' . (int) $item['id']] ?? null;
            if ($cell === null) {
                $line[] = '';
                $line[] = '';
                $line[] = '';
                continue;
            }
            $line[] = (string) ($cell['status_label'] ?? '');
            $line[] = $cell['percent'] !== null ? (string) $cell['percent'] : '';
            $line[] = !empty($cell['first_passed_at'])
                ? substr((string) $cell['first_passed_at'], 0, 16)
                : '';
        }
        $out[] = $line;
    }
    return $out;
}
