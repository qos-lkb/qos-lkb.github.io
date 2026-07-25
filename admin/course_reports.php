<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/courses/{id}/report (API-backed).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id > 0) {
    spa_redirect('/admin/courses/' . $id . '/report', false);
}
spa_redirect('/admin/courses', false);
