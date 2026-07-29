<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/simulations_lib.php';

function sim_resolve_status(string $requested, bool $canPublishAny): string
{
    if (!in_array($requested, ['draft', 'pending_review', 'published'], true)) {
        $requested = 'draft';
    }
    if ($canPublishAny) {
        return $requested;
    }
    if ($requested === 'published') {
        return 'pending_review';
    }
    return in_array($requested, ['draft', 'pending_review'], true) ? $requested : 'draft';
}

/**
 * @param array{id:int,email:string,display_name:string} $currentUser
 * @param array<string, string> $post
 * @return array{ok:bool,error?:string,id?:int}
 */
function simulation_save_from_request(PDO $pdo, array $currentUser, array $post, bool $isAdmin): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗，請重新整理頁面。'];
    }

    $id = isset($post['id']) ? (int) $post['id'] : 0;
    $titleZh = trim((string) ($post['title_zh'] ?? ''));
    $titleEn = trim((string) ($post['title_en'] ?? ''));
    $summaryZh = trim((string) ($post['summary_zh'] ?? ''));
    $summaryEn = trim((string) ($post['summary_en'] ?? ''));
    $html = (string) ($post['html'] ?? '');
    $screenshot = trim((string) ($post['screenshot_path'] ?? ''));
    $subjectId = isset($post['subject_id']) && $post['subject_id'] !== '' ? (int) $post['subject_id'] : null;
    $topicId = isset($post['topic_id']) && $post['topic_id'] !== '' ? (int) $post['topic_id'] : null;
    $listSortOrder = isset($post['list_sort_order']) && $post['list_sort_order'] !== '' ? (int) $post['list_sort_order'] : 0;
    $status = sim_resolve_status((string) ($post['status'] ?? 'draft'), $isAdmin);
    $tagsRaw = (string) ($post['tags'] ?? '');
    $slugInput = trim((string) ($post['slug'] ?? ''));
    $submitterNote = trim((string) ($post['submitter_note'] ?? ''));

    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請至少填寫中文或英文標題。'];
    }
    if ($titleEn === '') {
        $titleEn = $titleZh;
    }
    if ($titleZh === '') {
        $titleZh = $titleEn;
    }
    if ($summaryEn === '' && $summaryZh !== '') {
        $summaryEn = $summaryZh;
    }
    if ($summaryZh === '' && $summaryEn !== '') {
        $summaryZh = $summaryEn;
    }

    $htmlCheck = sim_validate_html_content($html);
    if (!$htmlCheck['ok']) {
        return $htmlCheck;
    }

    if ($subjectId !== null && $topicId !== null) {
        $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ? AND subject_id = ? LIMIT 1');
        $chk->execute([$topicId, $subjectId]);
        if (!$chk->fetch()) {
            return ['ok' => false, 'error' => '所選單元不屬於該科目。'];
        }
    }

    $ownerUserId = $currentUser['id'];
    if ($isAdmin && isset($post['owner_user_id']) && $post['owner_user_id'] !== '') {
        $ownerUserId = (int) $post['owner_user_id'];
    }

    $submitterName = trim((string) ($post['submitter_name'] ?? ''));
    $submitterEmail = trim((string) ($post['submitter_email'] ?? ''));
    if ($submitterName === '') {
        $submitterName = (string) ($currentUser['display_name'] ?? '');
    }
    if ($submitterEmail === '') {
        $submitterEmail = (string) ($currentUser['email'] ?? '');
    }

    if ($id > 0) {
        $row = sim_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到模擬。'];
        }
        if (!$isAdmin) {
            if ($row['owner_user_id'] === null || (int) $row['owner_user_id'] !== $currentUser['id']) {
                return ['ok' => false, 'error' => '無權編輯此模擬。'];
            }
            $ownerUserId = $row['owner_user_id'] !== null ? (int) $row['owner_user_id'] : $currentUser['id'];
        }

        $slug = $slugInput !== '' ? sim_slugify($slugInput) : $row['slug'];
        $slug = substr($slug, 0, 190);
        if ($slug === '') {
            $slug = sim_slugify($titleEn);
        }
        $slug = sim_ensure_unique_slug($pdo, $slug, $id);

        $upd = $pdo->prepare(
            'UPDATE simulations SET slug = ?, title_zh = ?, title_en = ?, summary_zh = ?, summary_en = ?,
             html = ?, screenshot_path = ?, subject_id = ?, topic_id = ?, list_sort_order = ?, status = ?,
             owner_user_id = ?, submitter_name = ?, submitter_email = ?, submitter_note = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        $upd->execute([
            $slug,
            $titleZh,
            $titleEn,
            $summaryZh,
            $summaryEn,
            $html,
            $screenshot !== '' ? $screenshot : null,
            $subjectId,
            $topicId,
            $listSortOrder,
            $status,
            $ownerUserId,
            $submitterName !== '' ? $submitterName : null,
            $submitterEmail !== '' ? $submitterEmail : null,
            $submitterNote !== '' ? $submitterNote : null,
            $id,
        ]);

        $tagParts = array_filter(array_map('trim', preg_split('/[,，]/u', $tagsRaw) ?: []));
        sim_sync_tags($pdo, $id, $tagParts);

        return ['ok' => true, 'id' => $id];
    }

    // 新增
    $baseSlug = $slugInput !== '' ? sim_slugify($slugInput) : sim_slugify($titleEn);
    $slug = sim_ensure_unique_slug($pdo, substr($baseSlug, 0, 190));

    $ins = $pdo->prepare(
        'INSERT INTO simulations (
            owner_user_id, slug, title_zh, title_en, summary_zh, summary_en, html, screenshot_path,
            subject_id, topic_id, list_sort_order, status, submitter_name, submitter_email, submitter_note,
            submission_source, last_updated
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'editor\', CURDATE())'
    );
    $ins->execute([
        $ownerUserId,
        $slug,
        $titleZh,
        $titleEn,
        $summaryZh,
        $summaryEn,
        $html,
        $screenshot !== '' ? $screenshot : null,
        $subjectId,
        $topicId,
        $listSortOrder,
        $status,
        $submitterName !== '' ? $submitterName : null,
        $submitterEmail !== '' ? $submitterEmail : null,
        $submitterNote !== '' ? $submitterNote : null,
    ]);
    $newId = (int) $pdo->lastInsertId();

    $tagParts = array_filter(array_map('trim', preg_split('/[,，]/u', $tagsRaw) ?: []));
    sim_sync_tags($pdo, $newId, $tagParts);

    return ['ok' => true, 'id' => $newId];
}

/**
 * Guest / public contribute → always pending_review.
 *
 * @param array<string, mixed> $post
 * @param array{id:int,email:string,display_name:string}|null $user
 * @return array{ok:bool,error?:string,id?:int}
 */
function simulation_contribute_from_request(PDO $pdo, array $post, ?array $user): array
{
    // Honeypot
    $honeypot = trim((string) ($post['website'] ?? $post['hp_website'] ?? ''));
    if ($honeypot !== '') {
        return ['ok' => true, 'id' => 0]; // pretend success
    }

    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗，請重新整理頁面。'];
    }

    $titleZh = trim((string) ($post['title_zh'] ?? ''));
    $titleEn = trim((string) ($post['title_en'] ?? ''));
    $summaryZh = trim((string) ($post['summary_zh'] ?? ''));
    $summaryEn = trim((string) ($post['summary_en'] ?? ''));
    $html = (string) ($post['html'] ?? '');
    $screenshot = trim((string) ($post['screenshot_path'] ?? ''));
    $subjectId = isset($post['subject_id']) && $post['subject_id'] !== '' ? (int) $post['subject_id'] : null;
    $topicId = isset($post['topic_id']) && $post['topic_id'] !== '' ? (int) $post['topic_id'] : null;
    $tagsRaw = (string) ($post['tags'] ?? '');
    $submitterName = trim((string) ($post['submitter_name'] ?? ''));
    $submitterEmail = trim((string) ($post['submitter_email'] ?? ''));
    $submitterNote = trim((string) ($post['submitter_note'] ?? ''));

    if ($user !== null) {
        if ($submitterName === '') {
            $submitterName = (string) ($user['display_name'] ?? '');
        }
        if ($submitterEmail === '') {
            $submitterEmail = (string) ($user['email'] ?? '');
        }
    }

    if ($submitterName === '' || $submitterEmail === '') {
        return ['ok' => false, 'error' => '請填寫姓名與電郵。'];
    }
    if (!filter_var($submitterEmail, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => '電郵格式不正確。'];
    }
    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請至少填寫中文或英文標題。'];
    }
    if ($titleEn === '') {
        $titleEn = $titleZh;
    }
    if ($titleZh === '') {
        $titleZh = $titleEn;
    }
    if ($summaryEn === '' && $summaryZh !== '') {
        $summaryEn = $summaryZh;
    }
    if ($summaryZh === '' && $summaryEn !== '') {
        $summaryZh = $summaryEn;
    }

    $htmlCheck = sim_validate_html_content($html);
    if (!$htmlCheck['ok']) {
        return $htmlCheck;
    }

    if ($subjectId !== null && $topicId !== null) {
        $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ? AND subject_id = ? LIMIT 1');
        $chk->execute([$topicId, $subjectId]);
        if (!$chk->fetch()) {
            return ['ok' => false, 'error' => '所選單元不屬於該科目。'];
        }
    }

    $baseSlug = sim_slugify($titleEn !== '' ? $titleEn : $titleZh);
    $slug = sim_ensure_unique_slug($pdo, substr($baseSlug !== '' ? $baseSlug : 'sim-submission', 0, 190));
    $ownerId = $user !== null ? (int) $user['id'] : null;

    $ins = $pdo->prepare(
        'INSERT INTO simulations (
            owner_user_id, slug, title_zh, title_en, summary_zh, summary_en, html, screenshot_path,
            subject_id, topic_id, list_sort_order, status, submitter_name, submitter_email, submitter_note,
            submission_source, last_updated
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, \'pending_review\', ?, ?, ?, \'guest_form\', CURDATE())'
    );
    $ins->execute([
        $ownerId,
        $slug,
        $titleZh,
        $titleEn,
        $summaryZh,
        $summaryEn,
        $html,
        $screenshot !== '' ? $screenshot : null,
        $subjectId,
        $topicId,
        $submitterName,
        $submitterEmail,
        $submitterNote !== '' ? $submitterNote : null,
    ]);
    $newId = (int) $pdo->lastInsertId();

    $tagParts = array_filter(array_map('trim', preg_split('/[,，]/u', $tagsRaw) ?: []));
    sim_sync_tags($pdo, $newId, $tagParts);

    return ['ok' => true, 'id' => $newId];
}

/**
 * @param array{id:int,email:string,display_name:string} $currentUser
 * @return array{ok:bool,error?:string}
 */
function simulation_delete_from_request(PDO $pdo, array $currentUser, array $post, bool $isAdmin): array
{
    if (!verify_csrf($post['csrf'] ?? null)) {
        return ['ok' => false, 'error' => 'CSRF 驗證失敗。'];
    }
    $id = (int) ($post['id'] ?? 0);
    if ($id <= 0) {
        return ['ok' => false, 'error' => '無效的 ID。'];
    }
    $row = sim_get_by_id($pdo, $id);
    if (!$row) {
        return ['ok' => false, 'error' => '找不到模擬。'];
    }
    if (!$isAdmin) {
        if ($row['owner_user_id'] === null || (int) $row['owner_user_id'] !== $currentUser['id']) {
            return ['ok' => false, 'error' => '無權刪除。'];
        }
    }
    $pdo->prepare('DELETE FROM simulations WHERE id = ?')->execute([$id]);
    return ['ok' => true];
}
