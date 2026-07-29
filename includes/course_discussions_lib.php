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
 * @return array{post_id:int,status:string}
 */
function cd_create_student_post(PDO $pdo, int $threadId, int $classId, int $topicId, int $authorUserId, ?string $msgZh, ?string $msgEn): array
{
    $ins = $pdo->prepare(
        'INSERT INTO course_discussion_posts
            (thread_id, class_id, topic_id, author_user_id, message_zh, message_en, status)
         VALUES
            (?, ?, ?, ?, ?, ?, \'pending\')'
    );
    $ins->execute([$threadId, $classId, $topicId, $authorUserId, $msgZh, $msgEn]);

    return ['post_id' => (int) $pdo->lastInsertId(), 'status' => 'pending'];
}

/**
 * @return list<array<string, mixed>>
 */
function cd_list_published_posts(PDO $pdo, int $classId, int $topicId, int $limit = 50): array
{
    $limit = max(1, min(200, $limit));

    $thread = cd_fetch_thread($pdo, $classId, $topicId);
    if ($thread === null) return [];
    if (($thread['status'] ?? '') !== 'published') return [];

    $stmt = $pdo->prepare(
        'SELECT p.id, p.author_user_id, p.message_zh, p.message_en, p.created_at,
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

    return $stmt->fetchAll() ?: [];
}

/**
 * @return list<array<string, mixed>>
 */
function cd_list_my_pending_posts(PDO $pdo, int $userId, int $classId, int $topicId, int $limit = 20): array
{
    $limit = max(1, min(100, $limit));

    $thread = cd_fetch_thread($pdo, $classId, $topicId);
    if ($thread === null) return [];

    $stmt = $pdo->prepare(
        'SELECT p.id, p.message_zh, p.message_en, p.created_at, u.display_name
         FROM course_discussion_posts p
         INNER JOIN users u ON u.id = p.author_user_id
         WHERE p.thread_id = ?
           AND p.author_user_id = ?
           AND p.status = \'pending\'
         ORDER BY p.created_at DESC
         LIMIT ?'
    );
    $stmt->execute([(int) $thread['id'], $userId, $limit]);
    return $stmt->fetchAll() ?: [];
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
                    p.message_zh, p.message_en, p.created_at
             FROM course_discussion_posts p
             INNER JOIN course_discussion_threads t ON t.id = p.thread_id
             INNER JOIN users u ON u.id = p.author_user_id
             WHERE t.class_id = ?
               AND p.topic_id = ?
               AND p.status = \'pending\'
             ORDER BY p.created_at DESC
             LIMIT ?'
        );
        $stmt->execute([$classId, $topicId, $limit]);
    } else {
        $stmt = $pdo->prepare(
            'SELECT p.id, p.thread_id, p.topic_id, p.author_user_id, u.display_name,
                    p.message_zh, p.message_en, p.created_at
             FROM course_discussion_posts p
             INNER JOIN course_discussion_threads t ON t.id = p.thread_id
             INNER JOIN users u ON u.id = p.author_user_id
             WHERE t.class_id = ?
               AND p.status = \'pending\'
             ORDER BY p.created_at DESC
             LIMIT ?'
        );
        $stmt->execute([$classId, $limit]);
    }

    return $stmt->fetchAll() ?: [];
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

    $newStatus = 'rejected';
    if ($action === 'publish') $newStatus = 'published';
    if ($action === 'reject') $newStatus = 'rejected';
    if (!in_array($newStatus, ['published', 'rejected'], true)) {
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

