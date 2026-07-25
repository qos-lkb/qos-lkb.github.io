<?php

declare(strict_types=1);

/**
 * @deprecated Portal → SPA /app/admin/simulations/…
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
spa_redirect($id > 0 ? '/admin/simulations/' . $id . '/edit' : '/admin/simulations/new', false);
