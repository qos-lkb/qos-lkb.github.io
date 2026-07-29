<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/course_discussions_lib.php';
require_once dirname(__DIR__, 3) . '/includes/classes_lib.php';

function api_handle_course_discussions_get(PDO $pdo): void
{
    $user = require_api_user();

    $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0;
    $topicId = isset($_GET['topic_id']) ? (int) $_GET['topic_id'] : 0;
    if ($classId <= 0 || $topicId <= 0) {
        api_json_error('validation_error', '請提供 class_id 與 topic_id。', 422);
    }

    if (!cd_user_is_student_in_class($pdo, (int) $user['id'], $classId)) {
        api_json_error('forbidden', '你不是此班學生。', 403);
    }

    $thread = cd_fetch_thread($pdo, $classId, $topicId);
    $publishedPosts = cd_list_published_posts($pdo, $classId, $topicId, (int) $user['id'], 100);
    $myPendingPosts = cd_list_my_pending_posts($pdo, (int) $user['id'], $classId, $topicId, 50);

    api_json_ok([
        'thread' => $thread ? [
            'id' => (int) ($thread['id'] ?? 0),
            'class_id' => (int) ($thread['class_id'] ?? 0),
            'topic_id' => (int) ($thread['topic_id'] ?? 0),
            'status' => (string) ($thread['status'] ?? 'published'),
        ] : null,
        'published_posts' => $publishedPosts,
        'my_pending_posts' => $myPendingPosts,
    ]);
}

function api_handle_course_discussions_posts_post(PDO $pdo): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();

    $classId = isset($body['class_id']) ? (int) $body['class_id'] : 0;
    $topicId = isset($body['topic_id']) ? (int) $body['topic_id'] : 0;
    $msgZh = isset($body['message_zh']) ? trim((string) $body['message_zh']) : '';
    $msgEn = isset($body['message_en']) ? trim((string) $body['message_en']) : '';
    $parentPostId = isset($body['parent_post_id']) && $body['parent_post_id'] !== '' && $body['parent_post_id'] !== null
        ? (int) $body['parent_post_id']
        : null;

    if ($classId <= 0 || $topicId <= 0) {
        api_json_error('validation_error', '請提供 class_id 與 topic_id。', 422);
    }
    if ($msgZh === '' && $msgEn === '') {
        api_json_error('validation_error', '請至少提供一種語言的訊息。', 422);
    }

    if (!cd_user_is_student_in_class($pdo, (int) $user['id'], $classId)) {
        api_json_error('forbidden', '你不是此班學生。', 403);
    }

    $thread = cd_ensure_thread($pdo, $classId, $topicId, (int) $user['id']);
    $post = cd_create_student_post(
        $pdo,
        $thread['thread_id'],
        $classId,
        $topicId,
        (int) $user['id'],
        $msgZh !== '' ? $msgZh : null,
        $msgEn !== '' ? $msgEn : null,
        $parentPostId
    );
    if (!$post['ok']) {
        api_json_error('validation_error', $post['error'] ?? '發文失敗。', 422);
    }

    api_json_ok([
        'thread' => $thread,
        'post' => [
            'id' => (int) ($post['post_id'] ?? 0),
            'status' => (string) ($post['status'] ?? 'pending'),
            'parent_post_id' => $parentPostId,
        ],
    ]);
}

function api_handle_course_discussions_reaction_toggle(PDO $pdo, int $postId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();

    $action = (string) ($body['action'] ?? 'toggle');
    $reaction = (string) ($body['reaction'] ?? 'up');
    if ($action !== 'toggle') {
        api_json_error('validation_error', 'action 只支援 toggle。', 422);
    }

    $r = cd_toggle_reaction($pdo, (int) $user['id'], $postId, $reaction);
    if (!$r['ok']) {
        $msg = $r['error'] ?? '操作失敗。';
        $code = (str_contains($msg, '不是此班') || str_contains($msg, '按讚')) ? 403 : 422;
        if (str_contains($msg, '找不到')) {
            $code = 404;
        }
        api_json_error($code === 404 ? 'not_found' : ($code === 403 ? 'forbidden' : 'validation_error'), $msg, $code);
    }

    api_json_ok([
        'post_id' => $postId,
        'reacted' => (bool) ($r['reacted'] ?? false),
        'reaction_count' => (int) ($r['reaction_count'] ?? 0),
    ]);
}

function api_handle_admin_course_discussions_pending(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);

    $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0;
    $topicId = isset($_GET['topic_id']) && $_GET['topic_id'] !== '' ? (int) $_GET['topic_id'] : null;

    if ($classId <= 0) {
        api_json_error('validation_error', '請提供 class_id。', 422);
    }

    $class = classes_fetch_by_id($pdo, $classId);
    if ($class === null) {
        api_json_error('not_found', '找不到課程班別。', 404);
    }
    if (!classes_can_manage($pdo, $class, $user)) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $posts = cd_list_pending_for_moderation($pdo, $classId, $topicId, 100);
    api_json_ok(['pending_posts' => $posts, 'count' => count($posts)]);
}

function api_handle_admin_course_discussions_moderate_post(PDO $pdo, int $postId): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();

    $action = (string) ($body['action'] ?? '');
    if (!in_array($action, ['publish', 'reject'], true)) {
        api_json_error('validation_error', 'action 只支援 publish / reject。', 422);
    }

    $r = cd_moderate_post($pdo, $user, $postId, $action);
    $status = (string) ($r['status'] ?? '');
    if ($status === 'not_found') {
        api_json_error('not_found', '找不到討論留言。', 404);
    }
    if ($status === 'forbidden') {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    if ($status === 'parent_not_published') {
        api_json_error('validation_error', '父留言尚未發布，無法發布此回覆。', 422);
    }
    if ($status === 'invalid_action') {
        api_json_error('validation_error', '無效的 action。', 422);
    }

    api_json_ok(['post_id' => (int) $postId, 'status' => $status]);
}
