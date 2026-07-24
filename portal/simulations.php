<?php

declare(strict_types=1);

/**
 * @deprecated Use admin/simulations.php (same manage_own / manage_any permissions).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

portal_redirect_to_admin('admin/simulations.php');
