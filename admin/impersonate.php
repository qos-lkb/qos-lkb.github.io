<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA user impersonation via API + /app/admin/users.
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

spa_redirect('/admin/users', false);
