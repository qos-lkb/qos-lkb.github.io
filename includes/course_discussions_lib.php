<?php

declare(strict_types=1);

require_once __DIR__ . '/classes_lib.php';

/**
 * @return bool
 */
function cd_user_is_student_in_class(PDO $pdo, int $userId, int $classId): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM class_enrollments ce
         WHERE ce.class_id = ?
           AND ce.user_id = ?
           AND ce.status IN (\'active\', \'pending\')
         LIMIT 1'
    );
    $stmt->execute([$classId, $userId]);
    return $stmt->fetchColumn() !== false;
}

/**
 * @return array<string, mixed>|null
 */
function cd_fetch_thread(PDO $pdo, int $classId, int $topicId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT t.*
         FROM course_discussion_threads t
         WHERE t.class_id = ?
           AND t.topic_id = ?
         LIMIT 1'
    );
    $stmt->execute([$classId, $topicId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function cd_fetch_post(PDO $pdo, int $postId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM course_discussion_posts WHERE id = ? LIMIT 1');
    $stmt->execute([$postId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Ensure a thread exists and return it.
 *
 * @return array{thread_id:int,status:string}
 */
function cd_ensure_thread(PDO $pdo, int $classId, int $topicId, int $creatorUserId): array
{
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare(
            'INSERT INTO course_discussion_threads (class_id, topic_id, created_by_user_id, status)
             VALUES (?, ?, ?, \'published\')
             ON DUPLICATE KEY UPDATE
                status = course_discussion_threads.status,
                created_by_user_id = IFNULL(course_discussion_threads.created_by_user_id, VALUES(created_by_user_id))'
        );
        $ins->execute([$classId, $topicId, $creatorUserId]);

        $thread = cd_fetch_thread($pdo, $classId, $topicId);
        if ($thread === null) {
            throw new RuntimeException('Failed to create discussion thread.');
        }
        $pdo->commit();
        return [
            'thread_id' => (int) $thread['id'],
            'status' => (string) ($thread['status'] ?? 'published'),
        ];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/**
 * @return array{ok:bool,error?:string,parent_post_id?:int|null}
 */
function cd_validate_parent_post(PDO $pdo, int $threadId, ?int $parentPostId): array
{
    if ($parentPostId === null || $parentPostId <= 0) {
        return ['ok' => true, 'parent_post_id' => null];
    }

    $parent = cd_fetch_post($pdo, $parentPostId);
    if ($parent === null) {
        return ['ok' => false, 'error' => '找不到要回覆的留言。'];
    }
    if ((int) ($parent['thread_id'] ?? 0) !== $threadId) {
        return ['ok' => false, 'error' => '回覆必須屬於同一討論串。'];
    }
    if ((string) ($parent['status'] ?? '') !== 'published') {
        return ['ok' => false, 'error' => '只能回覆已發布的留言。'];
    }
    // Single-level replies only.
    if (!empty($parent['parent_post_id'])) {
        return ['ok' => false, 'error' => '不支援對回覆再回覆。'];
    }

    return ['ok' => true, 'parent_post_id' => $parentPostId];
}

/**
 * @return array{ok:bool,error?:string,post_id?:int,status?:string}
 */
function cd_create_student_post(
    PDO $pdo,
    int $threadId,
    int $classId,
    int $topicId,
    int $authorUserId,
    ?string $msgZh,
    ?string $msgEn,
    ?int $parentPostId = null
): array {
    $parentCheck = cd_validate_parent_post($pdo, $threadId, $parentPostId);
    if (!$parentCheck['ok']) {
        return ['ok' => false, 'error' => $parentCheck['error'] ?? '無效的回覆目標。'];
    }
    $parentId = $parentCheck['parent_post_id'] ?? null;

    $ins = $pdo->prepare(
        'INSERT INTO course_discussion_posts
            (thread_id, class_id, topic_id, author_user_id, parent_post_id, message_zh, message_en, status)
         VALUES
            (?, ?, ?, ?, ?, ?, ?, \'pending\')'
    );
    $ins->execute([$threadId, $classId, $topicId, $authorUserId, $parentId, $msgZh, $msgEn]);

    return [
        'ok' => true,
        'post_id' => (int) $pdo->lastInsertId(),
        'status' => 'pending',
    ];
}

/**
 * @param list<array<string, mixed>> $posts
 * @return list<array<string, mixed>>
 */
function cd_attach_reaction_meta(PDO $pdo, array $posts, int $viewerUserId): array
{
    if ($posts === []) {
        return [];
    }

    $ids = array_values(array_unique(array_map(static fn (array $p): int => (int) ($p['id'] ?? 0), $posts)));
    $ids = array_values(array_filter($ids, static fn (int $id): bool => $id > 0));
    if ($ids === []) {
        return $posts;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $countStmt = $pdo->prepare(
        "SELECT post_id, COUNT(*) AS cnt
         FROM course_discussion_reactions
         WHERE post_id IN ($placeholders) AND reaction = 'up'
         GROUP BY post_id"
    );
    $countStmt->execute($ids);
    $counts = [];
    foreach ($countStmt->fetchAll() ?: [] as $row) {
        $counts[(int) $row['post_id']] = (int) $row['cnt'];
    }

    $mineStmt = $pdo->prepare(
        "SELECT post_id
         FROM course_discussion_reactions
         WHERE user_id = ? AND reaction = 'up' AND post_id IN ($placeholders)"
    );
    $mineStmt->execute(array_merge([$viewerUserId], $ids));
    $mine = [];
    foreach ($mineStmt->fetchAll() ?: [] as $row) {
        $mine[(int) $row['post_id']] = true;
    }

    foreach ($posts as &$p) {
        $pid = (int) ($p['id'] ?? 0);
        $p['reaction_count'] = $counts[$pid] ?? 0;
        $p['my_reacted'] = !empty($mine[$pid]);
        if (isset($p['parent_post_id'])) {
            $p['parent_post_id'] = $p['parent_post_id'] !== null ? (int) $p['parent_post_id'] : null;
        }
    }
    unset($p);

    return $posts;
}

/**
 * @return list<array<string, mixed>>
 */
function cd_list_published_posts(PDO $pdo, int $classId, int $topicId, int $viewerUserId, int $limit = 50): array
{
    $limit = max(1, min(200, $limit));

    $thread = cd_fetch_thread($pdo, $classId, $topicId);
    if ($thread === null) {
        return [];
    }
    if (($thread['status'] ?? '') !== 'published') {
        return [];
    }

    $stmt = $pdo->prepare(
        'SELECT p.id, p.author_user_id, p.parent_post_id, p.message_zh, p.message_en, p.created_at,
                u.display_name
         FROM course_discussion_posts p
         INNER JOIN users u ON u.id = p.author_user_id
         WHERE p.thread_id = ?
           AND p.status = \'published\'
         ORDER BY p.created_at ASC
         LIMIT ?'
    );
    $stmt->bindValue(1, (int) $thread['id'], PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();

    return cd_attach_reaction_meta($pdo, $stmt->fetchAll() ?: [], $viewerUserId);
}

/**
 * @return list<array<string, mixed>>
 */
function cd_list_my_pending_posts(PDO $pdo, int $userId, int $classId, int $topicId, int $limit = 20): array
{
    $limit = max(1, min(100, $limit));

    $thread = cd_fetch_thread($pdo, $classId, $topicId);
    if ($thread === null) {
        return [];
    }

    $stmt = $pdo->prepare(
        'SELECT p.id, p.parent_post_id, p.message_zh, p.message_en, p.created_at, u.display_name
         FROM course_discussion_posts p
         INNER JOIN users u ON u.id = p.author_user_id
         WHERE p.thread_id = ?
           AND p.author_user_id = ?
           AND p.status = \'pending\'
         ORDER BY p.created_at DESC
         LIMIT ?'
    );
    $stmt->bindValue(1, (int) $thread['id'], PDO::PARAM_INT);
    $stmt->bindValue(2, $userId, PDO::PARAM_INT);
    $stmt->bindValue(3, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll() ?: [];
    foreach ($rows as &$r) {
        $r['parent_post_id'] = isset($r['parent_post_id']) && $r['parent_post_id'] !== null
            ? (int) $r['parent_post_id'] : null;
    }
    unset($r);
    return $rows;
}

/**
 * @return list<array<string, mixed>>
 */
function cd_list_pending_for_moderation(PDO $pdo, int $classId, ?int $topicId = null, int $limit = 100): array
{
    $limit = max(1, min(500, $limit));

    if ($topicId !== null) {
        $stmt = $pdo->prepare(
            'SELECT p.id, p.thread_id, p.topic_id, p.author_user_id, u.display_name,
                    p.parent_post_id, p.message_zh, p.message_en, p.created_at,
                    parent.message_zh AS parent_message_zh,
                    parent.message_en AS parent_message_en,
                    pu.display_name AS parent_display_name
             FROM course_discussion_posts p
             INNER JOIN course_discussion_threads t ON t.id = p.thread_id
             INNER JOIN users u ON u.id = p.author_user_id
             LEFT JOIN course_discussion_posts parent ON parent.id = p.parent_post_id
             LEFT JOIN users pu ON pu.id = parent.author_user_id
             WHERE t.class_id = ?
               AND p.topic_id = ?
               AND p.status = \'pending\'
             ORDER BY p.created_at DESC
             LIMIT ?'
        );
        $stmt->bindValue(1, $classId, PDO::PARAM_INT);
        $stmt->bindValue(2, $topicId, PDO::PARAM_INT);
        $stmt->bindValue(3, $limit, PDO::PARAM_INT);
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare(
            'SELECT p.id, p.thread_id, p.topic_id, p.author_user_id, u.display_name,
                    p.parent_post_id, p.message_zh, p.message_en, p.created_at,
                    parent.message_zh AS parent_message_zh,
                    parent.message_en AS parent_message_en,
                    pu.display_name AS parent_display_name
             FROM course_discussion_posts p
             INNER JOIN course_discussion_threads t ON t.id = p.thread_id
             INNER JOIN users u ON u.id = p.author_user_id
             LEFT JOIN course_discussion_posts parent ON parent.id = p.parent_post_id
             LEFT JOIN users pu ON pu.id = parent.author_user_id
             WHERE t.class_id = ?
               AND p.status = \'pending\'
             ORDER BY p.created_at DESC
             LIMIT ?'
        );
        $stmt->bindValue(1, $classId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
    }

    $rows = $stmt->fetchAll() ?: [];
    foreach ($rows as &$r) {
        $r['parent_post_id'] = isset($r['parent_post_id']) && $r['parent_post_id'] !== null
            ? (int) $r['parent_post_id'] : null;
        $parentZh = (string) ($r['parent_message_zh'] ?? '');
        $parentEn = (string) ($r['parent_message_en'] ?? '');
        $parentText = $parentZh !== '' ? $parentZh : $parentEn;
        if (mb_strlen($parentText) > 120) {
            $parentText = mb_substr($parentText, 0, 120) . '…';
        }
        $r['parent_excerpt'] = $parentText !== '' ? $parentText : null;
        $r['parent_display_name'] = isset($r['parent_display_name']) ? (string) $r['parent_display_name'] : null;
        unset($r['parent_message_zh'], $r['parent_message_en']);
    }
    unset($r);

    return $rows;
}

/**
 * Moderate a post.
 *
 * @return array{post_id:int,status:string}
 */
function cd_moderate_post(PDO $pdo, array $moderatorUser, int $postId, string $action): array
{
    $postStmt = $pdo->prepare(
        'SELECT p.*, t.class_id
         FROM course_discussion_posts p
         INNER JOIN course_discussion_threads t ON t.id = p.thread_id
         WHERE p.id = ?
         LIMIT 1'
    );
    $postStmt->execute([$postId]);
    $p = $postStmt->fetch();
    if (!$p) {
        return ['post_id' => $postId, 'status' => 'not_found'];
    }

    $classId = (int) ($p['class_id'] ?? 0);
    if ($classId <= 0) {
        return ['post_id' => $postId, 'status' => 'not_found'];
    }
    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        return ['post_id' => $postId, 'status' => 'not_found'];
    }
    if (!classes_can_manage($pdo, $class, $moderatorUser)) {
        return ['post_id' => $postId, 'status' => 'forbidden'];
    }

    if ($action === 'publish') {
        $parentId = isset($p['parent_post_id']) && $p['parent_post_id'] !== null ? (int) $p['parent_post_id'] : null;
        if ($parentId) {
            $parent = cd_fetch_post($pdo, $parentId);
            if ($parent === null || (string) ($parent['status'] ?? '') !== 'published') {
                return ['post_id' => $postId, 'status' => 'parent_not_published'];
            }
        }
        $newStatus = 'published';
    } elseif ($action === 'reject') {
        $newStatus = 'rejected';
    } else {
        return ['post_id' => $postId, 'status' => 'invalid_action'];
    }

    $upd = $pdo->prepare(
        'UPDATE course_discussion_posts
         SET status = ?, moderated_by_user_id = ?, moderated_at = CURRENT_TIMESTAMP
         WHERE id = ?'
    );
    $upd->execute([$newStatus, (int) $moderatorUser['id'], $postId]);

    return ['post_id' => $postId, 'status' => $newStatus];
}

/**
 * @return array{ok:bool,error?:string,reacted?:bool,reaction_count?:int}
 */
function cd_toggle_reaction(PDO $pdo, int $userId, int $postId, string $reaction = 'up'): array
{
    if ($reaction !== 'up') {
        return ['ok' => false, 'error' => '不支援的反應類型。'];
    }

    $post = cd_fetch_post($pdo, $postId);
    if ($post === null) {
        return ['ok' => false, 'error' => '找不到留言。'];
    }
    if ((string) ($post['status'] ?? '') !== 'published') {
        return ['ok' => false, 'error' => '只能對已發布留言按讚。'];
    }

    $classId = (int) ($post['class_id'] ?? 0);
    if ($classId <= 0 || !cd_user_is_student_in_class($pdo, $userId, $classId)) {
        return ['ok' => false, 'error' => '你不是此班學生。'];
    }

    $existsStmt = $pdo->prepare(
        'SELECT id FROM course_discussion_reactions
         WHERE post_id = ? AND user_id = ? AND reaction = ?
         LIMIT 1'
    );
    $existsStmt->execute([$postId, $userId, $reaction]);
    $existingId = $existsStmt->fetchColumn();

    if ($existingId !== false) {
        $del = $pdo->prepare('DELETE FROM course_discussion_reactions WHERE id = ?');
        $del->execute([(int) $existingId]);
        $reacted = false;
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO course_discussion_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)'
        );
        try {
            $ins->execute([$postId, $userId, $reaction]);
        } catch (Throwable $e) {
            // race: treat as reacted
        }
        $reacted = true;
    }

    $cntStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM course_discussion_reactions WHERE post_id = ? AND reaction = ?'
    );
    $cntStmt->execute([$postId, $reaction]);

    return [
        'ok' => true,
        'reacted' => $reacted,
        'reaction_count' => (int) ($cntStmt->fetchColumn() ?: 0),
    ];
}
