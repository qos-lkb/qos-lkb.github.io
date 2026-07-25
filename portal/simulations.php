<?php

declare(strict_types=1);

/**
 * @deprecated Portal → SPA /app/admin/simulations
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

spa_redirect('/admin/simulations', false);
