<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_save.php';
require_once dirname(__DIR__, 3) . '/includes/simulation_security.php';
require_once dirname(__DIR__, 3) . '/includes/web_base.php';

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

    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Content-Security-Policy: ' . simulation_html_csp());

    $html = (string) $sim['html'];
    $baseHref = web_base_path();
    if ($baseHref !== '') {
        $baseTag = '<base href="' . htmlspecialchars($baseHref . '/', ENT_QUOTES, 'UTF-8') . '">';
        if (stripos($html, '<head>') !== false) {
            $html = preg_replace('/<head>/i', '<head>' . $baseTag, $html, 1) ?? ($baseTag . $html);
        } else {
            $html = $baseTag . $html;
        }
    }

    echo $html;
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
            api_json_ok($sim);
            return;
        }

        if ($isAdmin) {
            $list = $pdo->query(
                'SELECT s.id, s.slug, s.title_zh, s.title_en, s.status, s.updated_at, s.list_sort_order,
                        s.subject_id, s.topic_id, s.owner_user_id
                 FROM simulations s ORDER BY s.updated_at DESC'
            )->fetchAll() ?: [];
        } else {
            $stmt = $pdo->prepare(
                'SELECT s.id, s.slug, s.title_zh, s.title_en, s.status, s.updated_at, s.list_sort_order,
                        s.subject_id, s.topic_id, s.owner_user_id
                 FROM simulations s WHERE s.owner_user_id = ? ORDER BY s.updated_at DESC'
            );
            $stmt->execute([$user['id']]);
            $list = $stmt->fetchAll() ?: [];
        }
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
