<?php

declare(strict_types=1);

/**
 * @deprecated Classes renamed to courses — Prefer SPA /app/admin/courses.
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

spa_redirect('/admin/courses', false);
