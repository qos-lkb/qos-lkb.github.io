<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_save.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_security.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_files.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_disk_import.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_recovery.php';
require_once dirname(__DIR__, 3) . '/includes/sim_recovery_classify_lib.php';
require_once dirname(__DIR__, 3) . '/includes/sim_topic_classify_lib.php';
require_once dirname(__DIR__, 3) . '/includes/sim_screenshot_lib.php';
require_once dirname(__DIR__, 3) . '/includes/web_base.php';

/**
 * @return array{id:int,email:string,display_name:string}
 */
function api_require_sim_html_export(): array
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('simulation.manage_any') && !user_has_permission('user.manage')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    return $user;
}

function api_handle_admin_simulations_import_disk(PDO $pdo, string $method): void
{
    $user = api_require_sim_html_export();
    if ($method === 'GET') {
        $search = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
        api_json_ok(sim_unregistered_disk_plan($pdo, $search));
        return;
    }
    if ($method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $status = (string) ($body['status'] ?? 'draft');
        $search = trim((string) ($body['search'] ?? ''));
        $paths = [];
        if (!empty($body['import_all'])) {
            $scan = sim_unregistered_disk_plan($pdo, $search);
            foreach ($scan['items'] as $item) {
                if ($item['importable'] ?? false) {
                    $paths[] = (string) $item['path'];
                }
            }
        } elseif (isset($body['paths']) && is_array($body['paths'])) {
            $paths = array_map('strval', $body['paths']);
        }
        if ($paths === []) {
            api_json_error('validation_error', '沒有選取任何檔案。', 422);
        }
        $canPublish = user_has_permission('simulation.manage_any');
        $overrides = [];
        if (isset($body['overrides']) && is_array($body['overrides'])) {
            foreach ($body['overrides'] as $pathKey => $row) {
                if (!is_string($pathKey) || !is_array($row)) {
                    continue;
                }
                $rel = sim_normalize_rel_path($pathKey);
                if ($rel === null) {
                    continue;
                }
                $overrides[$rel] = $row;
            }
        }
        $result = sim_disk_import_execute($pdo, $paths, (int) $user['id'], $status, $canPublish, $overrides);
        if (!$result['ok']) {
            api_json_error('import_failed', (string) ($result['error'] ?? '匯入失敗。'), 422);
        }
        api_json_ok([
            'created' => $result['created'],
            'linked' => $result['linked'],
            'skipped' => $result['skipped'],
            'errors' => $result['errors'],
            'plan' => sim_unregistered_disk_plan($pdo, $search),
        ]);
        return;
    }
    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_simulations_recovery(PDO $pdo, string $method): void
{
    $user = api_require_sim_html_export();
    if ($method === 'GET') {
        $search = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
        $plan = sim_recovery_plan($pdo, $search);
        $models = api_sim_html_agent_model_ids($pdo);
        $plan['models'] = $models['ids'];
        $plan['default_model'] = $models['default'];
        api_json_ok($plan);
        return;
    }
    if ($method !== 'POST') {
        api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
    }

    api_verify_csrf_or_fail();
    require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
    $body = api_read_json_body();
    $action = (string) ($body['action'] ?? '');

    if ($action === 'link') {
        $links = [];
        if (isset($body['links']) && is_array($body['links'])) {
            foreach ($body['links'] as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $links[] = [
                    'sim_id' => (int) ($row['sim_id'] ?? 0),
                    'path' => (string) ($row['path'] ?? ''),
                ];
            }
        }
        if ($links === []) {
            api_json_error('validation_error', '沒有選取任何連結。', 422);
        }
        $result = sim_recovery_link_paths($pdo, $links);
        if (!$result['ok'] && $result['linked'] === 0) {
            api_json_error('link_failed', implode('；', $result['errors'] ?: ['連結失敗。']), 422);
        }
        api_json_ok([
            'linked' => $result['linked'],
            'skipped' => $result['skipped'],
            'errors' => $result['errors'],
            'plan' => sim_recovery_plan($pdo, trim((string) ($body['search'] ?? ''))),
        ]);
        return;
    }

    if ($action === 'classify') {
        $paths = isset($body['paths']) && is_array($body['paths']) ? array_map('strval', $body['paths']) : [];
        if ($paths === []) {
            api_json_error('validation_error', '沒有選取任何檔案。', 422);
        }
        $rateKey = api_rate_limit_key('sim_recovery_classify', (string) $user['id']);
        if (!api_rate_limit_check($pdo, $rateKey, 6, 600)) {
            api_json_error('rate_limited', '分類次數過多，請約十分鐘後再試。', 429);
        }
        $model = trim((string) ($body['model'] ?? ''));
        $models = api_sim_html_agent_model_ids($pdo);
        if ($model === '' || !in_array($model, $models['ids'], true)) {
            $model = $models['default'];
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        set_time_limit(150);
        $plan = sim_recovery_plan($pdo, '');
        $result = sim_recovery_classify_paths($pdo, $paths, $model, $plan['subjects']);
        if (!$result['ok']) {
            api_json_error('classify_failed', $result['error'], $result['status']);
        }
        api_json_ok([
            'items' => $result['items'],
            'model' => $result['model'],
        ]);
        return;
    }

    if ($action === 'import') {
        $status = (string) ($body['status'] ?? 'draft');
        $search = trim((string) ($body['search'] ?? ''));
        $paths = [];
        if (!empty($body['import_all_disk'])) {
            $scan = sim_recovery_plan($pdo, $search);
            foreach ($scan['disk_items'] as $item) {
                if ($item['importable'] ?? false) {
                    $paths[] = (string) $item['path'];
                }
            }
        } elseif (isset($body['paths']) && is_array($body['paths'])) {
            $paths = array_map('strval', $body['paths']);
        }
        if ($paths === []) {
            api_json_error('validation_error', '沒有選取任何檔案。', 422);
        }
        $overrides = [];
        if (isset($body['overrides']) && is_array($body['overrides'])) {
            foreach ($body['overrides'] as $pathKey => $row) {
                if (!is_string($pathKey) || !is_array($row)) {
                    continue;
                }
                $rel = sim_normalize_rel_path($pathKey);
                if ($rel === null) {
                    continue;
                }
                $overrides[$rel] = $row;
            }
        }
        $canPublish = user_has_permission('simulation.manage_any');
        $result = sim_disk_import_execute($pdo, $paths, (int) $user['id'], $status, $canPublish, $overrides);
        if (!$result['ok']) {
            api_json_error('import_failed', (string) ($result['error'] ?? '匯入失敗。'), 422);
        }
        api_json_ok([
            'created' => $result['created'],
            'linked' => $result['linked'],
            'skipped' => $result['skipped'],
            'errors' => $result['errors'],
            'plan' => sim_recovery_plan($pdo, $search),
        ]);
        return;
    }

    api_json_error('validation_error', '不支援的 action。', 422);
}

function api_handle_admin_simulations_topic_classify(PDO $pdo, string $method): void
{
    $user = api_require_sim_html_export();
    if ($method === 'GET') {
        $search = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
        $plan = sim_topic_classify_plan($pdo, $search);
        $models = api_sim_html_agent_model_ids($pdo);
        $plan['models'] = $models['ids'];
        $plan['default_model'] = $models['default'];
        $plan['xai_configured'] = config_xai_api_key() !== '';
        api_json_ok($plan);
        return;
    }
    if ($method !== 'POST') {
        api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
    }
    api_verify_csrf_or_fail();
    require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
    $body = api_read_json_body();
    $action = (string) ($body['action'] ?? '');
    $search = trim((string) ($body['search'] ?? ''));

    if ($action === 'classify') {
        $ids = isset($body['ids']) && is_array($body['ids']) ? array_map('intval', $body['ids']) : [];
        if ($ids === []) {
            api_json_error('validation_error', '沒有選取任何模擬。', 422);
        }
        $rateKey = api_rate_limit_key('sim_topic_classify', (string) $user['id']);
        if (!api_rate_limit_check($pdo, $rateKey, 6, 600)) {
            api_json_error('rate_limited', '分類次數過多，請約十分鐘後再試。', 429);
        }
        $model = trim((string) ($body['model'] ?? ''));
        $models = api_sim_html_agent_model_ids($pdo);
        if ($model === '' || !in_array($model, $models['ids'], true)) {
            $model = $models['default'];
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        set_time_limit(150);
        $plan = sim_topic_classify_plan($pdo, '');
        $result = sim_topic_classify_ids($pdo, $ids, $model, $plan['subjects']);
        if (!$result['ok']) {
            api_json_error('classify_failed', $result['error'], $result['status']);
        }
        api_json_ok([
            'items' => $result['items'],
            'model' => $result['model'],
        ]);
        return;
    }

    if ($action === 'apply') {
        $items = isset($body['items']) && is_array($body['items']) ? $body['items'] : [];
        if ($items === []) {
            api_json_error('validation_error', '沒有可寫入的分類。', 422);
        }
        $isAdmin = user_has_permission('simulation.manage_any');
        $result = sim_topic_classify_apply($pdo, $items, $user, $isAdmin);
        if (!$result['ok'] && $result['updated'] === 0) {
            api_json_error('save_failed', implode('；', $result['errors'] ?: ['寫入失敗。']), 422);
        }
        api_json_ok([
            'updated' => $result['updated'],
            'created_topics' => $result['created_topics'],
            'errors' => $result['errors'],
            'plan' => sim_topic_classify_plan($pdo, $search),
        ]);
        return;
    }

    api_json_error('validation_error', '不支援的 action。', 422);
}

function api_handle_admin_simulations_screenshots(PDO $pdo, string $method): void
{
    $user = api_require_sim_html_export();
    if ($method === 'GET') {
        $search = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
        $filter = isset($_GET['filter']) ? trim((string) $_GET['filter']) : 'all';
        if ($filter !== 'missing') {
            $filter = 'all';
        }
        api_json_ok(sim_screenshot_plan($pdo, $search, $filter));
        return;
    }
    if ($method !== 'POST') {
        api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
    }
    api_verify_csrf_or_fail();

    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (str_contains(strtolower($contentType), 'multipart/form-data')) {
        $id = (int) ($_POST['sim_id'] ?? 0);
        if ($id <= 0 || !isset($_FILES['file'])) {
            api_json_error('validation_error', '請提供模擬與 PNG 檔。', 422);
        }
        $r = sim_screenshot_store_upload_for_sim($pdo, $id, $_FILES['file']);
        if (!$r['ok']) {
            api_json_error('upload_failed', $r['error'] ?? '上載失敗。', 422);
        }
        api_json_ok(['id' => $id, 'path' => $r['path'] ?? '']);
        return;
    }

    $body = api_read_json_body();
    $action = (string) ($body['action'] ?? '');
    $mode = (string) ($body['mode'] ?? 'missing');
    if ($mode !== 'all') {
        $mode = 'missing';
    }
    $search = trim((string) ($body['search'] ?? ''));
    $filter = $mode === 'missing' ? 'missing' : 'all';

    if ($action === 'capture' || $action === 'link') {
        $ids = [];
        if (!empty($body['all'])) {
            $plan = sim_screenshot_plan($pdo, $search, $filter);
            foreach ($plan['items'] as $item) {
                if ($mode === 'missing' && ($item['kind'] ?? '') === 'ok') {
                    continue;
                }
                $ids[] = (int) $item['id'];
                if (count($ids) >= SIM_SCREENSHOT_BATCH) {
                    break;
                }
            }
        } elseif (isset($body['ids']) && is_array($body['ids'])) {
            $ids = array_map('intval', $body['ids']);
        }
        if ($ids === []) {
            api_json_error('validation_error', '沒有選取任何模擬。', 422);
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        set_time_limit(180);
        $allowChrome = $action === 'capture';
        $result = sim_screenshot_process($pdo, $ids, $mode, $allowChrome);
        api_json_ok([
            'updated' => $result['updated'],
            'skipped' => $result['skipped'],
            'errors' => $result['errors'],
            'results' => $result['results'],
            'chrome_available' => sim_screenshot_chrome_bin() !== null,
            'plan' => sim_screenshot_plan($pdo, $search, $filter),
        ]);
        return;
    }

    api_json_error('validation_error', '不支援的 action。', 422);
}

function api_handle_admin_simulations_export_html(PDO $pdo, string $method): void
{
    api_require_sim_html_export();
    if ($method === 'GET') {
        api_json_ok(sim_export_plan($pdo));
        return;
    }
    if ($method === 'POST') {
        api_verify_csrf_or_fail();
        $body = api_read_json_body();
        $mode = (string) ($body['mode'] ?? 'apply');
        $result = sim_export_execute($pdo, $mode);
        if (!$result['ok']) {
            api_json_error('export_failed', (string) ($result['error'] ?? '匯出失敗。'), 422);
        }
        api_json_ok([
            'written' => $result['written'],
            'linked' => $result['linked'],
            'skipped' => $result['skipped'],
            'plan' => $result['plan'],
        ]);
        return;
    }
    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_simulation_get(PDO $pdo, string $slug): void
{
    $sim = sim_get_by_slug($pdo, $slug);
    if (!$sim) {
        api_json_error('not_found', '找不到模擬。', 404);
    }
    $user = current_user();
    if (!api_can_view_simulation($sim, $user)) {
        api_json_error('forbidden', '無權檢視。', 403);
    }

    api_json_ok([
        'id' => (int) $sim['id'],
        'slug' => $sim['slug'],
        'title_zh' => $sim['title_zh'],
        'title_en' => $sim['title_en'],
        'summary_zh' => (string) ($sim['summary_zh'] ?? ''),
        'summary_en' => (string) ($sim['summary_en'] ?? ''),
        'screenshot_path' => $sim['screenshot_path'],
        'subject_id' => $sim['subject_id'] !== null ? (int) $sim['subject_id'] : null,
        'topic_id' => $sim['topic_id'] !== null ? (int) $sim['topic_id'] : null,
        'status' => $sim['status'],
        'last_updated' => $sim['last_updated'] ?? null,
        'html_url' => web_base_path() . '/api/v1/simulations/' . rawurlencode($slug) . '/html',
        'export_url' => web_base_path() . '/simulation_export.php?slug=' . rawurlencode($slug),
        'tags' => sim_get_tag_slugs($pdo, (int) $sim['id']),
    ]);
}

function api_handle_simulation_html(PDO $pdo, string $slug): void
{
    $sim = sim_get_by_slug($pdo, $slug);
    if (!$sim) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
        exit;
    }
    $user = current_user();
    if (!api_can_view_simulation($sim, $user)) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Forbidden';
        exit;
    }

    $body = sim_body_from_row($sim);
    if (trim($body) === '') {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
        exit;
    }

    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Content-Security-Policy: ' . simulation_html_csp());
    echo simulation_prepare_iframe_html($body);
    exit;
}

function api_handle_admin_simulations(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $user = require_api_user();
        $isAdmin = user_has_permission('simulation.manage_any');
        if (!$isAdmin && !user_has_permission('simulation.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }

        if (isset($_GET['assignable_owners'])) {
            if (!$isAdmin) {
                api_json_error('forbidden', '沒有權限。', 403);
            }
            api_json_ok(sim_assignable_owners($pdo));
            return;
        }

        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id > 0) {
            $sim = sim_get_by_id($pdo, $id);
            if (!$sim) {
                api_json_error('not_found', '找不到模擬。', 404);
            }
            if (!$isAdmin && (int) ($sim['owner_user_id'] ?? 0) !== (int) $user['id']) {
                api_json_error('forbidden', '沒有權限。', 403);
            }
            $sim['tags'] = sim_get_tag_slugs($pdo, $id);
            $sim['html'] = sim_body_from_row($sim);
            api_json_ok($sim);
            return;
        }

        $list = $isAdmin
            ? sim_admin_list($pdo)
            : sim_admin_list($pdo, (int) $user['id']);
        api_json_ok($list);
        return;
    }

    if ($method === 'POST') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $isAdmin = user_has_permission('simulation.manage_any');
        if (!$isAdmin && !user_has_permission('simulation.manage_own')) {
            api_json_error('forbidden', '沒有權限。', 403);
        }
        $body = api_read_json_body();
        $post = array_merge($_POST, $body);
        if (!isset($post['csrf'])) {
            $post['csrf'] = api_request_csrf();
        }

        $action = (string) ($post['action'] ?? '');
        if ($action === 'reorder') {
            $order = $post['order'] ?? [];
            if (!is_array($order)) {
                api_json_error('validation_error', '排序清單無效。', 422);
            }
            $r = sim_reorder_items($pdo, $order, $user);
            if (!$r['ok']) {
                api_json_error('reorder_failed', $r['error'] ?? '排序失敗。', 422);
            }
            api_json_ok(['reordered' => true]);
            return;
        }
        if ($action === 'patch') {
            $id = isset($post['id']) ? (int) $post['id'] : 0;
            $fields = [];
            if (array_key_exists('subject_id', $post)) {
                $fields['subject_id'] = $post['subject_id'];
            }
            if (array_key_exists('topic_id', $post)) {
                $fields['topic_id'] = $post['topic_id'];
            }
            if (array_key_exists('owner_user_id', $post)) {
                $fields['owner_user_id'] = $post['owner_user_id'];
            }
            $r = sim_patch_classification($pdo, $id, $fields, $user, $isAdmin);
            if (!$r['ok']) {
                api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
            }
            unset($r['ok']);
            api_json_ok($r);
            return;
        }

        $r = simulation_save_from_request($pdo, $user, $post, $isAdmin);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '儲存失敗。', 422);
        }
        api_json_ok(['id' => $r['id']]);
        return;
    }

    if ($method === 'DELETE') {
        $user = require_api_user();
        api_verify_csrf_or_fail();
        auth_refresh_permissions($user['id']);
        $isAdmin = user_has_permission('simulation.manage_any');
        $body = api_read_json_body();
        $post = ['id' => $body['id'] ?? 0, 'csrf' => api_request_csrf()];
        $r = simulation_delete_from_request($pdo, $user, $post, $isAdmin);
        if (!$r['ok']) {
            api_json_error('delete_failed', $r['error'] ?? '刪除失敗。', 422);
        }
        api_json_ok(['deleted' => true]);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_simulations_contribute(PDO $pdo, string $method): void
{
    require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';
    require_once dirname(__DIR__, 3) . '/includes/auth.php';

    if ($method === 'GET') {
        $subjects = sim_all_subjects($pdo);
        $topicsBySubject = [];
        foreach ($subjects as $s) {
            $sid = (int) $s['id'];
            $topicsBySubject[$sid] = sim_topics_for_subject($pdo, $sid);
        }
        $user = current_user();
        api_json_ok([
            'csrf_token' => csrf_token(),
            'subjects' => $subjects,
            'topics_by_subject' => $topicsBySubject,
            'user' => $user !== null ? [
                'id' => (int) $user['id'],
                'email' => (string) $user['email'],
                'display_name' => (string) ($user['display_name'] ?? ''),
            ] : null,
            'html_max_bytes' => sim_html_max_bytes(),
        ]);
        return;
    }

    if ($method === 'POST') {
        $rate = api_auth_rate_limit_begin($pdo, 'sim_contribute', api_client_ip());
        if (!$rate['ok']) {
            api_json_error('rate_limited', '投稿過於頻繁，請稍後再試。', 429);
        }

        $body = api_read_json_body();
        $post = array_merge($_POST, $body);
        if (!isset($post['csrf'])) {
            $post['csrf'] = api_request_csrf();
        }

        // Optional screenshot via multipart
        if (isset($_FILES['screenshot']) && is_array($_FILES['screenshot'])
            && (int) ($_FILES['screenshot']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $up = sim_store_screenshot_upload($_FILES['screenshot']);
            if (!$up['ok']) {
                api_json_error('upload_failed', $up['error'] ?? '截圖上載失敗。', 422);
            }
            $post['screenshot_path'] = $up['path'];
        }

        // Optional HTML file via multipart
        if (isset($_FILES['html_file']) && is_array($_FILES['html_file']) && ($_FILES['html_file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $htmlUp = sim_store_html_upload($_FILES['html_file']);
            if (!$htmlUp['ok']) {
                api_json_error('upload_failed', $htmlUp['error'] ?? 'HTML 上載失敗。', 422);
            }
            $post['html'] = $htmlUp['html'];
            if (trim((string) ($post['title_zh'] ?? '')) === '' && trim((string) ($post['title_en'] ?? '')) === '' && ($htmlUp['suggested_title'] ?? '') !== '') {
                $post['title_zh'] = $htmlUp['suggested_title'];
                $post['title_en'] = $htmlUp['suggested_title'];
            }
        }

        $user = current_user();
        $r = simulation_contribute_from_request($pdo, $post, $user);
        if (!$r['ok']) {
            api_json_error('save_failed', $r['error'] ?? '投稿失敗。', 422);
        }
        api_json_ok(['id' => $r['id'], 'status' => 'pending_review']);
        return;
    }

    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_handle_admin_simulation_upload(PDO $pdo, string $kind): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('simulation.manage_any') && !user_has_permission('simulation.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    if ($kind === 'html') {
        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            api_json_error('validation_error', '請選擇 HTML 檔。', 422);
        }
        $r = sim_store_html_upload($_FILES['file']);
        if (!$r['ok']) {
            api_json_error('upload_failed', $r['error'] ?? '上載失敗。', 422);
        }
        api_json_ok([
            'html' => $r['html'],
            'suggested_title' => $r['suggested_title'] ?? '',
        ]);
        return;
    }

    if ($kind === 'screenshot') {
        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            api_json_error('validation_error', '請選擇截圖檔。', 422);
        }
        $r = sim_store_screenshot_upload($_FILES['file']);
        if (!$r['ok']) {
            api_json_error('upload_failed', $r['error'] ?? '上載失敗。', 422);
        }
        api_json_ok(['path' => $r['path']]);
        return;
    }

    api_json_error('not_found', '未知上載類型。', 404);
}

/**
 * Editor sandbox preview.
 * POST stores HTML outside the session and returns a token.
 * GET renders that HTML with simulation_html_csp() so the iframe does not inherit the SPA CSP.
 * Blob and srcdoc previews are blocked or stripped by the SPA frame-src / script-src policy.
 */
function api_handle_admin_simulation_preview(PDO $pdo, string $method): void
{
    if ($method === 'POST') {
        api_admin_simulation_preview_store();
        return;
    }
    if ($method === 'GET') {
        api_admin_simulation_preview_show();
        return;
    }
    api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
}

function api_admin_simulation_preview_store(): void
{
    $user = require_api_user();
    api_verify_csrf_or_fail();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('simulation.manage_any') && !user_has_permission('simulation.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $body = api_read_json_body();
    $raw = $body['html'] ?? ($_POST['html'] ?? '');
    if (!is_string($raw)) {
        api_json_error('validation_error', 'HTML 內容無效。', 422);
    }
    if (strlen($raw) > sim_html_max_bytes()) {
        api_json_error('validation_error', 'HTML 內容過大（上限約 1.5 MB）。', 422);
    }
    if (trim($raw) === '') {
        $raw = '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>預覽</title></head><body><p style="font-family:sans-serif;color:#64748b;padding:1rem">尚無 HTML 可預覽。</p></body></html>';
    }

    try {
        $dir = simulation_preview_storage_dir();
    } catch (RuntimeException $e) {
        api_json_error('preview_failed', '無法建立預覽。', 500);
    }
    simulation_preview_sweep($dir);

    $token = bin2hex(random_bytes(16));
    $path = simulation_preview_token_path($dir, $token);
    if ($path === null || file_put_contents($path, $raw, LOCK_EX) === false) {
        api_json_error('preview_failed', '無法建立預覽。', 500);
    }
    chmod($path, 0600);

    $_SESSION['sim_html_preview'] = [
        'token' => $token,
        'uid' => (int) $user['id'],
        'exp' => time() + 600,
    ];
    api_json_ok(['token' => $token]);
}

function api_admin_simulation_preview_show(): void
{
    $user = current_user();
    $token = isset($_GET['token']) && is_string($_GET['token']) ? $_GET['token'] : '';
    $stored = $_SESSION['sim_html_preview'] ?? null;
    $valid = $user !== null
        && is_array($stored)
        && isset($stored['token'], $stored['uid'], $stored['exp'])
        && is_string($stored['token'])
        && hash_equals($stored['token'], $token)
        && (int) $stored['uid'] === (int) $user['id']
        && (int) $stored['exp'] >= time();

    $path = null;
    if ($valid) {
        try {
            $path = simulation_preview_token_path(simulation_preview_storage_dir(), $token);
        } catch (RuntimeException $e) {
            $path = null;
        }
    }
    if ($path === null || !is_file($path)) {
        api_simulation_preview_error_page('預覽已失效，請再按「更新預覽」。', 404);
    }

    $html = file_get_contents($path);
    if ($html === false) {
        api_simulation_preview_error_page('無法載入預覽。', 500);
    }

    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Referrer-Policy: no-referrer');
    header('Content-Security-Policy: ' . simulation_html_csp());
    echo simulation_prepare_iframe_html($html);
    exit;
}

function api_simulation_preview_error_page(string $message, int $status): never
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    header('Content-Security-Policy: ' . "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'");
    $safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"></head><body><p style="font-family:sans-serif;color:#b91c1c;padding:1rem">'
        . $safe . '</p></body></html>';
    exit;
}

function simulation_preview_storage_dir(): string
{
    $dir = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'sci_sim_preview';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Cannot create simulation preview directory.');
    }

    return $dir;
}

/**
 * AI revision for the simulation HTML editor.
 * GET lists models and prompt presets. POST returns revised HTML; it does not save.
 */
function api_handle_admin_simulation_html_agent(PDO $pdo, string $method): void
{
    require_once dirname(__DIR__, 3) . '/includes/sim_html_agent_lib.php';
    require_once dirname(__DIR__, 3) . '/includes/tutor_lib.php';
    require_once dirname(__DIR__, 3) . '/includes/api_rate_limit.php';

    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('simulation.manage_any') && !user_has_permission('simulation.manage_own')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }

    $models = api_sim_html_agent_model_ids($pdo);

    if ($method === 'GET') {
        api_json_ok(sim_html_agent_options_payload(
            tutor_has_api_key(),
            $models['ids'],
            $models['default']
        ));
    }

    if ($method !== 'POST') {
        api_json_error('method_not_allowed', '不支援的 HTTP 方法。', 405);
    }

    api_verify_csrf_or_fail();
    $normalized = sim_html_agent_normalize_request(api_read_json_body(), $models['ids']);
    if (!$normalized['ok']) {
        api_json_error('validation_error', $normalized['error'], $normalized['status']);
    }

    $rateKey = api_rate_limit_key('sim_html_agent', (string) $user['id']);
    if (!api_rate_limit_check($pdo, $rateKey, 8, 600)) {
        api_json_error('rate_limited', '優化次數過多，請約十分鐘後再試。', 429);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    set_time_limit(200);

    $result = sim_html_agent_complete(
        $normalized['model'],
        $normalized['reasoning_effort'],
        $normalized['instruction'],
        $normalized['html']
    );
    if (!$result['ok']) {
        api_json_error('agent_failed', $result['error'], $result['status']);
    }

    api_json_ok([
        'html' => $result['html'],
        'notes' => $result['notes'],
        'model' => $result['model'],
    ]);
}

/**
 * @return array{ids:list<string>,default:string}
 */
function api_sim_html_agent_model_ids(PDO $pdo): array
{
    try {
        return [
            'ids' => tutor_model_choices($pdo),
            'default' => tutor_effective_model($pdo),
        ];
    } catch (Throwable $e) {
        return [
            'ids' => TUTOR_MODEL_CHOICES,
            'default' => config_xai_model(),
        ];
    }
}

function simulation_preview_sweep(string $dir): void
{
    $cutoff = time() - 600;
    $files = glob($dir . DIRECTORY_SEPARATOR . '*.html') ?: [];
    foreach ($files as $file) {
        if (!is_file($file)) {
            continue;
        }
        $mtime = filemtime($file);
        if ($mtime !== false && $mtime < $cutoff) {
            unlink($file);
        }
    }
}
