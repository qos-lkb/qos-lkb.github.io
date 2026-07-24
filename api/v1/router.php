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
require_once dirname(__DIR__, 2) . '/includes/learning_videos_lib.php';
require_once dirname(__DIR__, 2) . '/includes/topic_items_lib.php';
require_once dirname(__DIR__, 2) . '/includes/question_bank_lib.php';

$__science_sims_autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
if (is_readable($__science_sims_autoload)) {
    require_once $__science_sims_autoload;
}

require_once __DIR__ . '/handlers/auth.php';
require_once __DIR__ . '/handlers/simulations.php';
require_once __DIR__ . '/handlers/learning_tools.php';
require_once __DIR__ . '/handlers/articles.php';
require_once __DIR__ . '/handlers/learning_notes.php';
require_once __DIR__ . '/handlers/worksheets.php';
require_once __DIR__ . '/handlers/courses.php';
require_once __DIR__ . '/handlers/learning_videos.php';
require_once __DIR__ . '/handlers/topic_items.php';
require_once __DIR__ . '/handlers/review.php';
require_once __DIR__ . '/handlers/question_bank.php';
require_once __DIR__ . '/handlers/students.php';
require_once __DIR__ . '/handlers/teacher.php';
require_once __DIR__ . '/handlers/worksheet_assignments.php';
require_once __DIR__ . '/handlers/learning.php';
require_once __DIR__ . '/handlers/summer_homework.php';
require_once __DIR__ . '/handlers/nav_menu.php';
require_once __DIR__ . '/handlers/catalog.php';
require_once __DIR__ . '/build_router.php';

function api_v1_path(): string
{
    if (class_exists(\ScienceSims\Http\ApiPath::class)) {
        return \ScienceSims\Http\ApiPath::fromRequestUri(
            (string) ($_SERVER['REQUEST_URI'] ?? '/'),
            (string) ($_SERVER['SCRIPT_NAME'] ?? '')
        );
    }

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

    try {
        $pdo = db();
    } catch (Throwable $e) {
        api_json_error('db_unavailable', '無法連線資料庫。', 503);
    }

    $router = api_v1_build_router($pdo);
    if ($router->dispatch($method, $path)) {
        return;
    }

    api_json_error('not_found', '找不到資源。', 404);
}
