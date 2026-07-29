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
    $canLn = user_has_permission('learning_note.manage_any');
    $canWs = user_has_permission('worksheet.manage_any');
    $canLv = user_has_permission('learning_video.manage_any');
    $canQb = user_has_permission('question_bank.manage_any');
    $canSh = user_has_permission('summer_homework.manage_any');
    $canSim = user_has_permission('simulation.manage_any');
    if (!$canLt && !$canArt && !$canLn && !$canWs && !$canLv && !$canQb && !$canSh && !$canSim) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $items = [];

    if ($canLt) {
        try {
            $lt = $pdo->query(
                "SELECT lt.id, lt.slug, lt.title_zh, lt.title_en, lt.status, lt.updated_at, lt.owner_user_id,
                        'learning_tool' AS type, m.bank_id AS mapped_bank_id
                 FROM learning_tools lt
                 LEFT JOIN legacy_learning_tool_map m ON m.old_tool_id = lt.id
                 WHERE lt.status = 'pending_review'"
            )->fetchAll() ?: [];
        } catch (Throwable) {
            $lt = $pdo->query(
                "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'learning_tool' AS type
                 FROM learning_tools WHERE status = 'pending_review'"
            )->fetchAll() ?: [];
        }
        $items = array_merge($items, $lt);
    }

    if ($canArt) {
        $articles = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'article' AS type
             FROM science_articles WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
        $items = array_merge($items, $articles);
    }

    if ($canLn) {
        $notes = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'learning_note' AS type
             FROM learning_notes WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
        $items = array_merge($items, $notes);
    }

    if ($canWs) {
        $worksheets = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'worksheet' AS type
             FROM worksheets WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
        $items = array_merge($items, $worksheets);
    }

    if ($canLv) {
        $videos = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'learning_video' AS type
             FROM learning_videos WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
        $items = array_merge($items, $videos);
    }

    if ($canQb) {
        $banks = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'question_bank' AS type
             FROM question_banks WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
        $items = array_merge($items, $banks);
    }

    if ($canSh) {
        $summer = $pdo->query(
            "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'summer_homework' AS type
             FROM summer_homework_items WHERE status = 'pending_review'"
        )->fetchAll() ?: [];
        $items = array_merge($items, $summer);
    }

    if ($canSim) {
        try {
            $sims = $pdo->query(
                "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id,
                        submitter_name, submitter_email, submission_source, 'simulation' AS type
                 FROM simulations WHERE status = 'pending_review'"
            )->fetchAll() ?: [];
        } catch (Throwable) {
            $sims = $pdo->query(
                "SELECT id, slug, title_zh, title_en, status, updated_at, owner_user_id, 'simulation' AS type
                 FROM simulations WHERE status = 'pending_review'"
            )->fetchAll() ?: [];
        }
        $items = array_merge($items, $sims);
    }

    usort($items, static function (array $a, array $b): int {
        return strcmp((string) ($b['updated_at'] ?? ''), (string) ($a['updated_at'] ?? ''));
    });

    api_json_ok($items);
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

function api_handle_review_ln_publish(PDO $pdo, int $id): void
{
    require_api_permission('learning_note.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE learning_notes SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_ln_reject(PDO $pdo, int $id): void
{
    require_api_permission('learning_note.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE learning_notes SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}

function api_handle_review_ws_publish(PDO $pdo, int $id): void
{
    require_api_permission('worksheet.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE worksheets SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_ws_reject(PDO $pdo, int $id): void
{
    require_api_permission('worksheet.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE worksheets SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}

function api_handle_review_lv_publish(PDO $pdo, int $id): void
{
    require_api_permission('learning_video.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE learning_videos SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_lv_reject(PDO $pdo, int $id): void
{
    require_api_permission('learning_video.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE learning_videos SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}

function api_handle_review_qb_publish(PDO $pdo, int $id): void
{
    require_api_permission('question_bank.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE question_banks SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_qb_reject(PDO $pdo, int $id): void
{
    require_api_permission('question_bank.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE question_banks SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}

function api_handle_review_sh_publish(PDO $pdo, int $id): void
{
    require_api_permission('summer_homework.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE summer_homework_items SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_sh_reject(PDO $pdo, int $id): void
{
    require_api_permission('summer_homework.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE summer_homework_items SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}

function api_handle_review_sim_publish(PDO $pdo, int $id): void
{
    require_api_permission('simulation.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE simulations SET status = 'published', last_updated = CURDATE(), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_sim_reject(PDO $pdo, int $id): void
{
    require_api_permission('simulation.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE simulations SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}
