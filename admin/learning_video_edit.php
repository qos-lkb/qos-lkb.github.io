<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/learning-videos/… (API-backed).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
spa_redirect($id > 0 ? '/admin/learning-videos/' . $id . '/edit' : '/admin/learning-videos/new', false);
