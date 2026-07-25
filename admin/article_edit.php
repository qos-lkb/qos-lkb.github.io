<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/articles/… (API-backed).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
spa_redirect($id > 0 ? '/admin/articles/' . $id . '/edit' : '/admin/articles/new', false);
