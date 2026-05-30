<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';

function api_handle_review_queue(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $canLt = user_has_permission('learning_tool.manage_any');
    $canArt = user_has_permission('article.manage_any');
    if (!$canLt && !$canArt) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $lt = [];
    if ($canLt) {
        $lt = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'learning_tool' AS type
             FROM learning_tools WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
    }

    $articles = [];
    if ($canArt) {
        $articles = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'article' AS type
             FROM science_articles WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
    }

    api_json_ok(array_merge($lt, $articles));
}

function api_handle_review_lt_publish(PDO $pdo, int $id): void
{
    require_api_permission('learning_tool.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE learning_tools SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_lt_reject(PDO $pdo, int $id): void
{
    require_api_permission('learning_tool.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE learning_tools SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}

function api_handle_review_art_publish(PDO $pdo, int $id): void
{
    require_api_permission('article.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE science_articles SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_art_reject(PDO $pdo, int $id): void
{
    require_api_permission('article.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE science_articles SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}
