<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/learning_tools_lib.php';
require_once dirname(__DIR__, 3) . '/includes/lt_qb_migrate_lib.php';

function api_handle_learning_tools_list_public(PDO $pdo): void
{
    api_json_ok(lt_qb_fetch_published_quiz_sources($pdo));
}

function api_handle_learning_tool_get(PDO $pdo, string $slug): void
{
    $src = lt_qb_resolve_quiz_source($pdo, $slug);
    if ($src === null) {
        api_json_error('not_found', '找不到測驗／試題庫。', 404);
    }
    $row = $src['row'];
    $user = current_user();
    if ($src['kind'] === 'learning_tool') {
        if (!api_can_view_learning_tool($row, $user)) {
            api_json_error('forbidden', '無權檢視。', 403);
        }
        $out = lt_public_row($row);
    } else {
        if (!api_can_view_question_bank($row, $user)) {
            api_json_error('forbidden', '無權檢視。', 403);
        }
        $out = lt_qb_public_row_from_bank($row);
    }

    $out['questions'] = lt_qb_mcq_questions_for_quiz($pdo, $src['kind'], (int) $row['id'], false);
    $out['source_kind'] = $src['kind'];
    api_json_ok($out);
}

function api_handle_learning_tool_answers(PDO $pdo, string $slug): void
{
    $src = lt_qb_resolve_quiz_source($pdo, $slug);
    if ($src === null) {
        api_json_error('not_found', '找不到測驗／試題庫。', 404);
    }
    $row = $src['row'];
    if ($row['status'] !== 'published') {
        $user = current_user();
        if ($src['kind'] === 'learning_tool') {
            if (!api_can_view_learning_tool($row, $user)) {
                api_json_error('forbidden', '無權檢視。', 403);
            }
        } elseif (!api_can_view_question_bank($row, $user)) {
            api_json_error('forbidden', '無權檢視。', 403);
        }
    }

    $questions = lt_qb_mcq_questions_for_quiz($pdo, $src['kind'], (int) $row['id'], true);
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
    api_json_ok(['slug' => $slug, 'answers' => $answers, 'source_kind' => $src['kind']]);
}

function api_handle_learning_tools_pending(PDO $pdo): void
{
    require_api_permission('learning_tool.manage_any');
    $rows = $pdo->query(
        "SELECT lt.*, u.email AS owner_email FROM learning_tools lt
         LEFT JOIN users u ON u.id = lt.owner_user_id
         WHERE lt.status = 'pending_review' ORDER BY lt.updated_at DESC"
    )->fetchAll() ?: [];
    api_json_ok($rows);
}

function api_handle_admin_learning_tools(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        auth_refresh_permissions($user['id']);
        $canAny = user_has_permission('learning_tool.manage_any');
        if (!$canAny && !user_has_permission('learning_tool.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        if ($canAny) {
            $rows = $pdo->query('SELECT * FROM learning_tools ORDER BY updated_at DESC')->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare('SELECT * FROM learning_tools WHERE owner_user_id = ? ORDER BY updated_at DESC');
            $stmt->execute([$user['id']]);
            $rows = $stmt->fetchAll() ?: [];
        }
        api_json_ok(array_map('lt_public_row', $rows));
        return;
    }

    if ($method === 'POST' || $method === 'DELETE') {
        api_verify_csrf_or_fail();
        api_json_error(
            'gone',
            '互動學習工具已凍結（Phase 7）。請使用 POST /admin/question-banks 管理試題庫。',
            410
        );
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
