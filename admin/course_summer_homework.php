<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/courses/{id}/summer (API-backed).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$status = isset($_GET['status']) ? (string) $_GET['status'] : '';
if ($id > 0) {
    $route = '/admin/courses/' . $id . '/summer';
    if ($status !== '' && in_array($status, ['missing', 'on_time', 'late'], true)) {
        // spa_redirect keepQuery would append full QS including id; build target manually.
        $target = spa_app_path($route) . '?status=' . rawurlencode($status);
        header('Location: ' . $target, true, 302);
        exit;
    }
    spa_redirect($route, false);
}
spa_redirect('/admin/courses', false);
