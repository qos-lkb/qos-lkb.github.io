<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/summer-homework/{id}/analytics (API-backed).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    spa_redirect('/admin/courses', false);
}

$route = '/admin/summer-homework/' . $id . '/analytics';
$q = [];
if (!empty($_GET['user_id']) && (int) $_GET['user_id'] > 0) {
    $q['user_id'] = (string) (int) $_GET['user_id'];
}
if (!empty($_GET['attempt_id']) && (int) $_GET['attempt_id'] > 0) {
    $q['attempt_id'] = (string) (int) $_GET['attempt_id'];
}
$target = spa_app_path($route);
if ($q !== []) {
    $target .= '?' . http_build_query($q);
}
header('Location: ' . $target, true, 302);
exit;
