<?php

declare(strict_types=1);

/**
 * @deprecated Use GET /api/v1/simulations/{slug}/html
 * Thin redirect kept for old bookmarks and external links.
 */

require_once __DIR__ . '/includes/web_base.php';

$slug = isset($_GET['slug']) ? trim((string) $_GET['slug']) : '';
if ($slug === '') {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Bad request');
}

$base = web_base_path();
$target = ($base !== '' ? $base : '') . '/api/v1/simulations/' . rawurlencode($slug) . '/html';

header('X-Deprecated-Endpoint: simulation_view.php');
header('Location: ' . $target, true, 302);
exit;
