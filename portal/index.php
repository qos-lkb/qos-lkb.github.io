<?php

declare(strict_types=1);

/**
 * @deprecated Portal merged into admin/ (manage_own permissions).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

portal_redirect_to_admin('admin/simulations.php');
