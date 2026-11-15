<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_save.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_security.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_files.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_disk_import.php';
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
        $result = sim_disk_import_execute($pdo, $paths, (int) $user['id'], $status, $canPublish);
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
