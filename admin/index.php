<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin (API-backed admin home).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

spa_redirect('/admin', false);
