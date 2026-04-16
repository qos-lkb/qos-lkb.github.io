<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/simulations_lib.php';

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
    $html = (string) ($post['html'] ?? '');
    $screenshot = trim((string) ($post['screenshot_path'] ?? ''));
    $subjectId = isset($post['subject_id']) && $post['subject_id'] !== '' ? (int) $post['subject_id'] : null;
    $topicId = isset($post['topic_id']) && $post['topic_id'] !== '' ? (int) $post['topic_id'] : null;
    $status = ($post['status'] ?? 'draft') === 'published' ? 'published' : 'draft';
    $tagsRaw = (string) ($post['tags'] ?? '');
    $slugInput = trim((string) ($post['slug'] ?? ''));

    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請至少填寫中文或英文標題。'];
    }
    if ($titleEn === '') {
        $titleEn = $titleZh;
    }
    if ($titleZh === '') {
        $titleZh = $titleEn;
    }

    if ($subjectId !== null && $topicId !== null) {
        $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ? AND subject_id = ? LIMIT 1');
        $chk->execute([$topicId, $subjectId]);
        if (!$chk->fetch()) {
            return ['ok' => false, 'error' => '所選課題不屬於該科目。'];
        }
    }

    $ownerUserId = $currentUser['id'];
    if ($isAdmin && isset($post['owner_user_id']) && $post['owner_user_id'] !== '') {
        $ownerUserId = (int) $post['owner_user_id'];
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
            'UPDATE simulations SET slug = ?, title_zh = ?, title_en = ?, html = ?, screenshot_path = ?,
             subject_id = ?, topic_id = ?, status = ?, owner_user_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        $upd->execute([
            $slug,
            $titleZh,
            $titleEn,
            $html,
            $screenshot !== '' ? $screenshot : null,
            $subjectId,
            $topicId,
            $status,
            $ownerUserId,
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
        'INSERT INTO simulations (owner_user_id, slug, title_zh, title_en, html, screenshot_path, subject_id, topic_id, status, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())'
    );
    $ins->execute([
        $ownerUserId,
        $slug,
        $titleZh,
        $titleEn,
        $html,
        $screenshot !== '' ? $screenshot : null,
        $subjectId,
        $topicId,
        $status,
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
