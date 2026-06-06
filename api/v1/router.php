<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/includes/db.php';
require_once dirname(__DIR__, 2) . '/includes/web_base.php';
require_once dirname(__DIR__, 2) . '/includes/api_response.php';
require_once dirname(__DIR__, 2) . '/includes/api_auth.php';
require_once dirname(__DIR__, 2) . '/includes/simulations_lib.php';
require_once dirname(__DIR__, 2) . '/includes/learning_tools_lib.php';
require_once dirname(__DIR__, 2) . '/includes/articles_lib.php';
require_once dirname(__DIR__, 2) . '/includes/learning_notes_lib.php';
require_once dirname(__DIR__, 2) . '/includes/worksheets_lib.php';

function api_v1_path(): string
{
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path)) {
        return '/';
    }

    if (preg_match('#/v1(/.*)?$#', $path, $m)) {
        $path = $m[1] ?? '/';
    } else {
        $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
        if ($script !== '' && str_ends_with($path, $script)) {
            $path = substr($path, 0, -strlen($script));
        }
        $path = preg_replace('#^/api(?:/index\.php)?#', '', $path);
    }

    $path = '/' . trim((string) $path, '/');
    return $path === '/' ? '/' : rtrim($path, '/');
}

function api_v1_dispatch(): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $path = api_v1_path();
    $routeKey = $method . ' ' . $path;

    try {
        $pdo = db();
    } catch (Throwable $e) {
        api_json_error('db_unavailable', '無法連線資料庫。', 503);
    }

    $routes = [
        'GET /catalog' => 'api_handle_catalog',
        'GET /learning-tools' => 'api_handle_learning_tools_list_public',
        'GET /learning-tools/pending' => 'api_handle_learning_tools_pending',
        'GET /articles' => 'api_handle_articles_list_public',
        'GET /articles/pending' => 'api_handle_articles_pending',
        'GET /learning-notes' => 'api_handle_learning_notes_list_public',
        'GET /learning-notes/pending' => 'api_handle_learning_notes_pending',
        'GET /worksheets' => 'api_handle_worksheets_list_public',
        'GET /worksheets/pending' => 'api_handle_worksheets_pending',
        'GET /review-queue' => 'api_handle_review_queue',
        'POST /auth/login' => 'api_handle_auth_login',
        'POST /auth/logout' => 'api_handle_auth_logout',
        'GET /auth/me' => 'api_handle_auth_me',
        'GET /subjects' => 'api_handle_subjects',
    ];

    $key = $routeKey;
    if (isset($routes[$key])) {
        $routes[$key]($pdo);
        return;
    }

    if (preg_match('#^GET /simulations/([^/]+)$#', $routeKey, $m)) {
        api_handle_simulation_get($pdo, rawurldecode($m[1]));
        return;
    }
    if (preg_match('#^GET /simulations/([^/]+)/html$#', $routeKey, $m)) {
        api_handle_simulation_html($pdo, rawurldecode($m[1]));
        return;
    }
    if (preg_match('#^GET /learning-tools/([^/]+)$#', $routeKey, $m)) {
        api_handle_learning_tool_get($pdo, rawurldecode($m[1]));
        return;
    }
    if (preg_match('#^GET /learning-tools/([^/]+)/answers$#', $routeKey, $m)) {
        api_handle_learning_tool_answers($pdo, rawurldecode($m[1]));
        return;
    }
    if (preg_match('#^GET /articles/([^/]+)$#', $routeKey, $m)) {
        api_handle_article_get($pdo, rawurldecode($m[1]));
        return;
    }
    if (preg_match('#^GET /articles/([^/]+)/answers$#', $routeKey, $m)) {
        api_handle_article_answers($pdo, rawurldecode($m[1]));
        return;
    }
    if (preg_match('#^GET /learning-notes/([^/]+)$#', $routeKey, $m)) {
        api_handle_learning_note_get($pdo, rawurldecode($m[1]));
        return;
    }
    if (preg_match('#^GET /worksheets/([^/]+)$#', $routeKey, $m)) {
        api_handle_worksheet_get($pdo, rawurldecode($m[1]));
        return;
    }

    if ($path === '/admin/simulations') {
        api_handle_admin_simulations($pdo, $method);
        return;
    }
    if ($path === '/admin/learning-tools') {
        api_handle_admin_learning_tools($pdo, $method);
        return;
    }
    if ($path === '/admin/articles') {
        api_handle_admin_articles($pdo, $method);
        return;
    }
    if ($path === '/admin/learning-notes') {
        api_handle_admin_learning_notes($pdo, $method);
        return;
    }
    if ($path === '/admin/worksheets') {
        api_handle_admin_worksheets($pdo, $method);
        return;
    }
    if (preg_match('#^POST /review/learning-tools/(\d+)/publish$#', $routeKey, $m)) {
        api_handle_review_lt_publish($pdo, (int) $m[1]);
        return;
    }
    if (preg_match('#^POST /review/learning-tools/(\d+)/reject$#', $routeKey, $m)) {
        api_handle_review_lt_reject($pdo, (int) $m[1]);
        return;
    }
    if (preg_match('#^POST /review/articles/(\d+)/publish$#', $routeKey, $m)) {
        api_handle_review_art_publish($pdo, (int) $m[1]);
        return;
    }
    if (preg_match('#^POST /review/articles/(\d+)/reject$#', $routeKey, $m)) {
        api_handle_review_art_reject($pdo, (int) $m[1]);
        return;
    }
    if (preg_match('#^POST /review/learning-notes/(\d+)/publish$#', $routeKey, $m)) {
        api_handle_review_ln_publish($pdo, (int) $m[1]);
        return;
    }
    if (preg_match('#^POST /review/learning-notes/(\d+)/reject$#', $routeKey, $m)) {
        api_handle_review_ln_reject($pdo, (int) $m[1]);
        return;
    }
    if (preg_match('#^POST /review/worksheets/(\d+)/publish$#', $routeKey, $m)) {
        api_handle_review_ws_publish($pdo, (int) $m[1]);
        return;
    }
    if (preg_match('#^POST /review/worksheets/(\d+)/reject$#', $routeKey, $m)) {
        api_handle_review_ws_reject($pdo, (int) $m[1]);
        return;
    }

    api_json_error('not_found', '找不到資源。', 404);
}

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

function api_handle_catalog(PDO $pdo): void
{
    $rows = sim_fetch_published_for_index($pdo);
    $struct = sim_build_index_structures_for_api($rows);
    $ltRows = lt_fetch_published($pdo);
    $artRows = art_fetch_published($pdo);
    $noteRows = api_catalog_fetch_learning_notes($pdo);
    $wsRows = api_catalog_fetch_worksheets($pdo);

    api_json_ok([
        'simulations' => $struct,
        'learning_tools' => array_map('lt_public_row', $ltRows),
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
        'worksheets' => array_map(function (array $r) {
            $out = ws_public_row($r);
            unset($out['body_zh'], $out['body_en']);
            return $out;
        }, $wsRows),
        'user' => api_user_payload(),
        'site_base' => web_base_path(),
    ]);
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
                $viewUrl = ($webBase !== '' ? $webBase : '') . '/simulation_view.php?slug=' . rawurlencode($slug);
                $item['url'] = $viewUrl;
                $item['view_url'] = $viewUrl;
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
            'topics' => array_map(function (array $t) {
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

require_once __DIR__ . '/handlers/auth.php';
require_once __DIR__ . '/handlers/simulations.php';
require_once __DIR__ . '/handlers/learning_tools.php';
require_once __DIR__ . '/handlers/articles.php';
require_once __DIR__ . '/handlers/learning_notes.php';
require_once __DIR__ . '/handlers/worksheets.php';
require_once __DIR__ . '/handlers/review.php';
