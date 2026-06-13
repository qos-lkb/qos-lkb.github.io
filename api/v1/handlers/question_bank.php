<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/question_bank_lib.php';

function api_handle_question_banks_list_public(PDO $pdo): void
{
    $rows = qb_fetch_published($pdo);
    api_json_ok(array_map('qb_public_row', $rows));
}

function api_handle_question_bank_get(PDO $pdo, string $slug): void
{
    $row = qb_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到試題庫。', 404);
    }
    $user = current_user();
    if (!api_can_view_question_bank($row, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    $out = qb_public_row($row);
    $out['questions'] = qb_fetch_questions($pdo, (int) $row['id'], false);
    api_json_ok($out);
}

function api_handle_question_bank_answers(PDO $pdo, string $slug): void
{
    $row = qb_get_by_slug($pdo, $slug);
    if (!$row) {
        api_json_error('not_found', '找不到試題庫。', 404);
    }
    if ($row['status'] !== 'published') {
        $user = current_user();
        if (!api_can_view_question_bank($row, $user)) {
            api_json_error('forbidden', '無權檢視。', 403);
        }
    }

    $questions = qb_fetch_questions($pdo, (int) $row['id'], true);
    $answers = [];
    foreach ($questions as $q) {
        $entry = [
            'question_id' => (int) $q['id'],
            'question_type' => $q['question_type'],
            'explanation_zh' => $q['explanation_zh'],
            'explanation_en' => $q['explanation_en'],
        ];
        if ($q['question_type'] === 'mcq') {
            $correct = null;
            foreach ($q['options'] as $i => $o) {
                if (!empty($o['is_correct'])) {
                    $correct = (int) $i;
                    break;
                }
            }
            $entry['correct_option_index'] = $correct;
        } elseif ($q['question_type'] === 'short_answer') {
            $entry['model_answer_zh'] = $q['model_answer_zh'];
            $entry['model_answer_en'] = $q['model_answer_en'];
        } elseif ($q['question_type'] === 'true_false') {
            $entry['true_false_answer'] = (int) $q['true_false_answer'];
        } elseif ($q['question_type'] === 'long_answer') {
            $entry['parts'] = array_map(static function (array $p): array {
                return [
                    'part_label' => $p['part_label'],
                    'model_answer_zh' => $p['model_answer_zh'],
                    'model_answer_en' => $p['model_answer_en'],
                ];
            }, $q['parts'] ?? []);
        } elseif ($q['question_type'] === 'fill_blank') {
            $entry['blanks'] = array_map(static function (array $b): array {
                return [
                    'blank_index' => (int) $b['blank_index'],
                    'acceptable_answer_zh' => $b['acceptable_answer_zh'],
                    'acceptable_answer_en' => $b['acceptable_answer_en'],
                ];
            }, $q['blanks'] ?? []);
        }
        $answers[] = $entry;
    }
    api_json_ok(['slug' => $slug, 'answers' => $answers]);
}

function api_handle_admin_question_banks(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('question_bank.manage_any');
        if (!$canAny && !user_has_permission('question_bank.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        if ($canAny) {
            $rows = $pdo->query('SELECT * FROM question_banks ORDER BY updated_at DESC')->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare('SELECT * FROM question_banks WHERE owner_user_id = ? ORDER BY updated_at DESC');
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
        $canAny = user_has_permission('question_bank.manage_any');
        if (!$canAny && !user_has_permission('question_bank.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        $body = api_read_json_body();
        $r = qb_save_from_payload($pdo, $user, $body, $canAny, $canAny);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        $saved = qb_get_by_id($pdo, $r['id']);
        if (!$saved) {
            api_json_ok(['id' => $r['id']]);
            return;
        }
        $out = qb_public_row($saved);
        $out['questions'] = qb_fetch_questions($pdo, (int) $saved['id'], true);
        api_json_ok($out);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('question_bank.manage_any');
        $body = api_read_json_body();
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            api_json_error('validation_error', '無效的 ID。', 422);
        }
        $row = qb_get_by_id($pdo, $id);
        if (!$row) {
            api_json_error('not_found', '找不到。', 404);
        }
        if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
            api_json_error('forbidden', '無權刪除。', 403);
        }
        qb_delete_by_id($pdo, $id);
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_question_bank_get(PDO $pdo, int $id): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $canAny = user_has_permission('question_bank.manage_any');
    if (!$canAny && !user_has_permission('question_bank.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $row = qb_get_by_id($pdo, $id);
    if (!$row) {
        api_json_error('not_found', '找不到試題庫。', 404);
    }
    if (!$canAny && (int) ($row['owner_user_id'] ?? 0) !== $user['id']) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    $out = qb_public_row($row);
    $out['questions'] = qb_fetch_questions($pdo, $id, true);
    api_json_ok($out);
}
