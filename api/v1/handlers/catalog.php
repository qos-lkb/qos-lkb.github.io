<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/subjects_lib.php';
require_once dirname(__DIR__, 3) . '/includes/simulations_lib.php';
require_once dirname(__DIR__, 3) . '/includes/web_base.php';
require_once dirname(__DIR__, 3) . '/includes/learning_tools_lib.php';
require_once dirname(__DIR__, 3) . '/includes/lt_qb_migrate_lib.php';
require_once dirname(__DIR__, 3) . '/includes/question_bank_lib.php';

function api_catalog_base(): string
{
    return web_base_path() . '/api/v1';
}

function api_catalog_fetch_learning_notes(PDO $pdo): array
{
    try {
        return ln_fetch_published($pdo);
    } catch (Throwable $e) {
        return [];
    }
}

function api_catalog_fetch_worksheets(PDO $pdo): array
{
    try {
        return ws_fetch_published($pdo);
    } catch (Throwable $e) {
        return [];
    }
}

/**
 * @param array<int, array<string, mixed>> $rows
 */
function sim_build_index_structures_for_api(array $rows): array
{
    $struct = sim_build_index_structures($rows);
    $webBase = web_base_path();

    foreach ($struct['subjects'] as &$subject) {
        foreach ($subject['topics'] as &$topic) {
            foreach ($topic['items'] as &$item) {
                $slug = $item['slug'];
                $apiHtml = ($webBase !== '' ? $webBase : '') . '/api/v1/simulations/' . rawurlencode($slug) . '/html';
                $item['url'] = $apiHtml;
                $item['view_url'] = $apiHtml;
                $item['html_url'] = $apiHtml;
                $item['export_url'] = ($webBase !== '' ? $webBase : '') . '/simulation_export.php?slug=' . rawurlencode($slug);

                $shot = (string) ($item['screenshot'] ?? '');
                if ($shot !== '') {
                    $item['screenshot'] = web_resolve_path($shot);
                }
            }
            unset($item);
        }
        unset($topic);
    }
    unset($subject);

    return $struct;
}

function api_handle_catalog(PDO $pdo): void
{
    $rows = sim_fetch_published_for_index($pdo);
    $struct = sim_build_index_structures_for_api($rows);
    $ltRows = lt_qb_fetch_published_quiz_sources($pdo);
    $artRows = art_fetch_published($pdo);
    $noteRows = api_catalog_fetch_learning_notes($pdo);
    $wsRows = api_catalog_fetch_worksheets($pdo);
    try {
        $videoRows = lv_fetch_published($pdo);
    } catch (Throwable $e) {
        $videoRows = [];
    }
    $qbRows = qb_fetch_published($pdo);

    api_json_ok([
        'simulations' => $struct,
        'learning_tools' => $ltRows,
        'question_banks' => array_map('qb_public_row', $qbRows),
        'articles' => array_map(function (array $r) {
            $out = art_public_row($r);
            unset($out['body_zh'], $out['body_en']);
            return $out;
        }, $artRows),
        'learning_notes' => array_map(function (array $r) {
            $out = ln_public_row($r);
            unset($out['body_zh'], $out['body_en']);
            return $out;
        }, $noteRows),
        'learning_videos' => array_map(function (array $r) {
            $out = lv_public_row($r);
            unset($out['embed_url'], $out['embed_url_zh'], $out['embed_url_en']);
            return $out;
        }, $videoRows),
        'worksheets' => array_map(function (array $r) {
            $out = ws_public_row($r);
            unset($out['body_zh'], $out['body_en']);
            return $out;
        }, $wsRows),
        'user' => api_user_payload(),
        'site_base' => web_base_path(),
    ]);
}

function api_handle_subjects(PDO $pdo): void
{
    $subjects = sim_all_subjects($pdo);
    $out = [];
    foreach ($subjects as $s) {
        $out[] = [
            'id' => (int) $s['id'],
            'slug' => $s['slug'],
            'name_zh' => $s['name_zh'],
            'name_en' => $s['name_en'],
            'topics' => array_map(static function (array $t): array {
                return [
                    'id' => (int) $t['id'],
                    'slug' => $t['slug'],
                    'name_zh' => $t['name_zh'],
                    'name_en' => $t['name_en'],
                ];
            }, sim_topics_for_subject($pdo, (int) $s['id'])),
        ];
    }
    api_json_ok($out);
}

function api_handle_admin_subjects(PDO $pdo, string $method): void
{
    require_api_permission('user.manage');

    if ($method === 'GET') {
        api_json_ok(subjects_list_with_topics($pdo));
        return;
    }

    if ($method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $r = subjects_create(
            $pdo,
            (string) ($body['name_en'] ?? ''),
            (string) ($body['name_zh'] ?? '')
        );
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        api_json_ok(['id' => $r['id'], 'slug' => $r['slug'] ?? null], 201);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_subjects_reorder(PDO $pdo): void
{
    require_api_permission('user.manage');
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $order = $body['order'] ?? $body['subject_order'] ?? [];
    if (!is_array($order)) {
        $order = [];
    }
    $r = subjects_reorder($pdo, $order);
    if (!$r['ok']) {
        api_json_error('reorder_failed', $r['error'] ?? '排序失敗。', 422);
    }
    api_json_ok(['reordered' => true]);
}

function api_handle_admin_subject_item(PDO $pdo, int $id, string $method): void
{
    require_api_permission('user.manage');

    if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $r = subjects_update(
            $pdo,
            $id,
            (string) ($body['name_en'] ?? ''),
            (string) ($body['name_zh'] ?? '')
        );
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        api_json_ok($r);
        return;
    }

    if ($method === 'DELETE') {
        api_verify_csrf_or_fail();
        $r = subjects_delete($pdo, $id);
        if (!$r['ok']) {
            api_json_error('delete_failed', $r['error'] ?? '刪除失敗。', 422);
        }
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_subject_topics(PDO $pdo, int $subjectId, string $method): void
{
    require_api_permission('user.manage');

    if ($method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $r = topics_create(
            $pdo,
            $subjectId,
            (string) ($body['name_en'] ?? $body['topic_name_en'] ?? ''),
            (string) ($body['name_zh'] ?? $body['topic_name_zh'] ?? '')
        );
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        api_json_ok(['id' => $r['id'], 'slug' => $r['slug'] ?? null], 201);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_subject_topics_reorder(PDO $pdo, int $subjectId): void
{
    require_api_permission('user.manage');
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $order = $body['order'] ?? $body['topic_order'] ?? [];
    if (!is_array($order)) {
        $order = [];
    }
    $r = topics_reorder($pdo, $subjectId, $order);
    if (!$r['ok']) {
        api_json_error('reorder_failed', $r['error'] ?? '排序失敗。', 422);
    }
    api_json_ok(['reordered' => true]);
}

function api_handle_admin_topic_item(PDO $pdo, int $id, string $method): void
{
    require_api_permission('user.manage');

    if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $r = topics_update(
            $pdo,
            $id,
            (int) ($body['subject_id'] ?? 0),
            (string) ($body['name_en'] ?? $body['topic_name_en'] ?? ''),
            (string) ($body['name_zh'] ?? $body['topic_name_zh'] ?? '')
        );
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        api_json_ok($r);
        return;
    }

    if ($method === 'DELETE') {
        api_verify_csrf_or_fail();
        $r = topics_delete($pdo, $id);
        if (!$r['ok']) {
            api_json_error('delete_failed', $r['error'] ?? '刪除失敗。', 422);
        }
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}
