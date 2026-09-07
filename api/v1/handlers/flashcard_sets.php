<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/flashcard_sets_lib.php';

function fc_require_manage_perm(): array
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $canAny = user_has_permission('flashcard_set.manage_any');
    if (!$canAny && !user_has_permission('flashcard_set.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    return [$user, $canAny];
}

function api_handle_flashcard_sets_list_public(PDO $pdo): void
{
    $rows = fc_fetch_published($pdo);
    api_json_ok(array_map('fc_public_row', $rows));
}

function api_handle_flashcard_set_get(PDO $pdo, string $slug): void
{
    $row = fc_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到閃卡組。', 404);
    }
    $user = current_user();
    if (!api_can_view_flashcard_set($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    $mode = strtolower((string) ($_GET['mode'] ?? 'study'));
    $out = fc_public_row($row);
    $cards = fc_fetch_cards($pdo, (int) $row['id'], true);
    if ($mode === 'quiz') {
        $out['cards'] = fc_build_quiz_items($cards);
        $out['mode'] = 'quiz';
    } else {
        $out['cards'] = $cards;
        $out['mode'] = 'study';
    }
    api_json_ok($out);
}

function api_handle_flashcard_set_reviews_get(PDO $pdo, string $slug): void
{
    $user = require_api_user();
    $row = fc_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到閃卡組。', 404);
    }
    if (!api_can_view_flashcard_set($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }
    api_json_ok([
        'slug' => $slug,
        'reviews' => fc_fetch_reviews_for_user($pdo, (int) $user['id'], (int) $row['id']),
    ]);
}

function api_handle_flashcard_set_reviews_post(PDO $pdo, string $slug): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    $row = fc_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到閃卡組。', 404);
    }
    if (!api_can_view_flashcard_set($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }
    $body = api_read_json_body();
    $cardId = (int) ($body['card_id'] ?? 0);
    $rating = (string) ($body['rating'] ?? '');
    $r = fc_apply_rating($pdo, (int) $user['id'], (int) $row['id'], $cardId, $rating);
    if (!$r['ok']) {
        api_json_error('review_failed', $r['error'] ?? '記錄失敗。', 422);
    }
    api_json_ok($r['review']);
}

function api_handle_flashcard_set_attempts_post(PDO $pdo, string $slug): void
{
    $row = fc_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到閃卡組。', 404);
    }
    $user = current_user();
    if (!api_can_view_flashcard_set($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }
    if ($user !== null) {
        api_verify_csrf_or_fail();
    }
    $body = api_read_json_body();
    $responses = $body['responses'] ?? [];
    if (!is_array($responses)) {
        api_json_error('validation_error', '請提供作答紀錄。', 422);
    }
    $graded = fc_grade_attempt($pdo, $row, $responses);
    if (!$graded['ok']) {
        api_json_error('grade_failed', $graded['error'] ?? '評分失敗。', 422);
    }
    if ($user !== null) {
        $saved = fc_record_attempt($pdo, (int) $user['id'], $row, $graded);
        api_json_ok($saved);
        return;
    }
    api_json_ok([
        'score' => $graded['score'],
        'max_score' => $graded['max_score'],
        'results' => $graded['results'],
    ]);
}

function api_handle_admin_flashcard_sets(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        [$user, $canAny] = fc_require_manage_perm();
        $rows = fc_fetch_admin_list($pdo, $canAny ? null : (int) $user['id']);
        api_json_ok(array_map('fc_public_row', $rows));
        return;
    }

    if ($method === 'POST') {
        [$user, $canAny] = fc_require_manage_perm();
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $r = fc_save_from_payload($pdo, $user, $body, $canAny, $canAny);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        $saved = fc_get_by_id($pdo, $r['id']);
        if (!$saved) {
            api_json_ok(['id' => $r['id']]);
            return;
        }
        $out = fc_public_row($saved);
        $out['cards'] = fc_fetch_cards($pdo, (int) $saved['id'], true);
        api_json_ok($out);
        return;
    }

    if ($method === 'DELETE') {
        [$user, $canAny] = fc_require_manage_perm();
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('validation_error', '無效的 ID。', 422);
        }
        $row = fc_get_by_id($pdo, $id);
        if (!$row) {
            api_json_error('not_found', '找不到。', 404);
        }
        if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
            api_json_error('forbidden', '無權刪除。', 403);
        }
        fc_delete_by_id($pdo, $id);
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_flashcard_set_get(PDO $pdo, int $id): void
{
    [$user, $canAny] = fc_require_manage_perm();
    $row = fc_get_by_id($pdo, $id);
    if (!$row) {
        api_json_error('not_found', '找不到閃卡組。', 404);
    }
    if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
        api_json_error('forbidden', '無權檢視。', 403);
    }
    $out = fc_public_row($row);
    $out['cards'] = fc_fetch_cards($pdo, $id, true);
    api_json_ok($out);
}

function api_handle_admin_flashcard_set_cards(PDO $pdo, int $setId, string $method): void
{
    [$user, $canAny] = fc_require_manage_perm();
    $row = fc_get_by_id($pdo, $setId);
    if (!$row) {
        api_json_error('not_found', '找不到閃卡組。', 404);
    }
    if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
        api_json_error('forbidden', '無權編輯。', 403);
    }

    if ($method === 'GET') {
        api_json_ok(fc_fetch_cards($pdo, $setId, true));
        return;
    }

    api_verify_csrf_or_fail();
    $body = api_read_json_body();

    if ($method === 'POST' || $method === 'PUT') {
        $cards = $body['cards'] ?? null;
        if (!is_array($cards)) {
            $cards = [$body];
        }
        $err = fc_validate_cards($cards);
        if ($err !== null && count($cards) > 0) {
            api_json_error('validation_error', $err, 422);
        }
        $r = fc_sync_cards($pdo, $setId, $cards);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        $pdo->prepare('UPDATE flashcard_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$setId]);
        api_json_ok(fc_fetch_cards($pdo, $setId, true));
        return;
    }

    if ($method === 'DELETE') {
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('validation_error', '無效的卡片 ID。', 422);
        }
        fc_delete_cards_by_ids($pdo, [$id]);
        $pdo->prepare('UPDATE flashcard_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$setId]);
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_review_fc_publish(PDO $pdo, int $id): void
{
    require_api_permission('flashcard_set.manage_any');
    api_verify_csrf_or_fail();
    $cards = fc_fetch_cards($pdo, $id, false);
    if ($cards === []) {
        api_json_error('validation_error', '發佈前至少需要一張卡片。', 422);
    }
    $pdo->prepare("UPDATE flashcard_sets SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'published']);
}

function api_handle_review_fc_reject(PDO $pdo, int $id): void
{
    require_api_permission('flashcard_set.manage_any');
    api_verify_csrf_or_fail();
    $pdo->prepare("UPDATE flashcard_sets SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$id]);
    api_json_ok(['id' => $id, 'status' => 'draft']);
}
