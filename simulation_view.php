<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/simulations_lib.php';

bootstrap_public();

$slug = isset($_GET['slug']) ? trim((string) $_GET['slug']) : '';
if ($slug === '') {
    http_response_code(400);
    exit('Bad request');
}

try {
    $pdo = db();
} catch (Throwable $e) {
    http_response_code(503);
    exit('Service unavailable');
}

$sim = sim_get_by_slug($pdo, $slug);
if (!$sim) {
    http_response_code(404);
    exit('Not found');
}

$allowed = false;
if ($sim['status'] === 'published') {
    $allowed = true;
} else {
    $u = current_user();
    if ($u !== null) {
        if (user_has_permission('simulation.manage_any')) {
            $allowed = true;
        } elseif ($sim['owner_user_id'] !== null && (int) $sim['owner_user_id'] === $u['id']) {
            $allowed = true;
        }
    }
}

if (!$allowed) {
    http_response_code(403);
    exit('Forbidden');
}

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header(
    'Content-Security-Policy: default-src * data: blob:; ' .
    "script-src * 'unsafe-inline' 'unsafe-eval'; " .
    "style-src * 'unsafe-inline'; " .
    'img-src * data: blob:; font-src * data:; connect-src *; frame-ancestors \'self\';'
);

echo $sim['html'];
