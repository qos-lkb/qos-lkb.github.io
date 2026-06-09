<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/topic_items_lib.php';
require_once dirname(__DIR__, 3) . '/includes/web_base.php';

function api_handle_courses_list(PDO $pdo): void
{
    try {
        $tree = ti_build_courses_tree($pdo);
    } catch (Throwable $e) {
        api_json_ok(['subjects' => []]);
        return;
    }
    api_json_ok(array_merge($tree, ['site_base' => web_base_path()]));
}

function api_handle_courses_subject(PDO $pdo, string $subjectSlug): void
{
    try {
        $tree = ti_build_courses_tree($pdo, $subjectSlug);
    } catch (Throwable $e) {
        api_json_error('not_found', '找不到科目。', 404);
    }
    if ($tree['subjects'] === []) {
        api_json_error('not_found', '找不到科目。', 404);
    }
    api_json_ok(array_merge($tree['subjects'][0], ['site_base' => web_base_path()]));
}
