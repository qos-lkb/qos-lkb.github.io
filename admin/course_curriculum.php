<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/course-curriculum (API-backed).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

spa_redirect('/admin/course-curriculum', false);
