<?php

declare(strict_types=1);

/**
 * @deprecated Prefer SPA /app/admin/question-banks (API-backed list).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

spa_redirect('/admin/question-banks', false);
