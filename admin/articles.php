<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/articles (API-backed list).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

spa_redirect('/admin/articles', false);
