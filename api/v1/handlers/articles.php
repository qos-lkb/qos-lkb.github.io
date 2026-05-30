<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/articles_lib.php';

function api_handle_articles_list_public(PDO $pdo): void
{
    $rows = art_fetch_published($pdo);
    api_json_ok(array_map(function (array $r) {
        $out = art_public_row($r);
        unset($out['body_zh'], $out['body_en']);
        return $out;
    }, $rows));
}

function api_handle_article_get(PDO $pdo, string $slug): void
{
    $row = art_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到文章。', 404);
    }
    $user = current_user();
    if (!api_can_view_article($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    $out = art_public_row($row);
    $out['questions'] = art_fetch_questions($pdo, (int) $row['id'], false);
    api_json_ok($out);
}

function api_handle_article_answers(PDO $pdo, string $slug): void
{
    $row = art_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到文章。', 404);
    }
    if ($row['status'] !== 'published') {
        $user = current_user();
        if (!api_can_view_article($row, $user)) {
            api_json_error('forbidden', '無權檢視。', 403);
        }
    }

    $questions = art_fetch_questions($pdo, (int) $row['id'], true);
    $answers = [];
    foreach ($questions as $q) {
        $correct = null;
        foreach ($q['options'] as $i => $o) {
            if (!empty($o['is_correct'])) {
                $correct = (int) $i;
                break;
            }
        }
        $answers[] = [
            'question_id' => (int) $q['id'],
            'correct_option_index' => $correct,
            'explanation_zh' => $q['explanation_zh'],
            'explanation_en' => $q['explanation_en'],
        ];
    }
    api_json_ok(['slug' => $slug, 'answers' => $answers]);
}

function api_handle_articles_pending(PDO $pdo): void
{
    require_api_permission('article.manage_any');
    $rows = $pdo->query(
        "SELECT sa.*, u.email AS owner_email FROM science_articles sa
         LEFT JOIN users u ON u.id = sa.owner_user_id
         WHERE sa.status = 'pending_review' ORDER BY sa.updated_at DESC"
    )->fetchAll() ?: [];
    api_json_ok($rows);
}

function api_handle_admin_articles(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('article.manage_any');
        if (!$canAny && !user_has_permission('article.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        if ($canAny) {
            $rows = $pdo->query('SELECT * FROM science_articles ORDER BY updated_at DESC')->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare('SELECT * FROM science_articles WHERE owner_user_id = ? ORDER BY updated_at DESC');
            $stmt->execute([$user['id']]);
            $rows = $stmt->fetchAll() ?: [];
        }
        api_json_ok($rows);
        return;
    }

    if ($method === 'POST') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('article.manage_any');
        if (!$canAny && !user_has_permission('article.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        $body = api_read_json_body();
        $r = art_save_from_payload($pdo, $user, $body, $canAny, $canAny);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        $saved = art_get_by_id($pdo, $r['id']);
        api_json_ok($saved ? art_public_row($saved) : ['id' => $r['id']]);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('article.manage_any');
        $body = api_read_json_body();
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('validation_error', '無效的 ID。', 422);
        }
        $row = art_get_by_id($pdo, $id);
        if (!$row) {
            api_json_error('not_found', '找不到。', 404);
        }
        if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
            api_json_error('forbidden', '無權刪除。', 403);
        }
        art_delete_by_id($pdo, $id);
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
