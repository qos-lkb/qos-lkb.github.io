<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/simulations_lib.php';

bootstrap_public();

$slug = isset($_GET['slug']) ? trim((string) $_GET['slug']) : '';
if ($slug === '') {
    http_response_code(400);
    exit;
}

try {
    $pdo = db();
} catch (Throwable $e) {
    http_response_code(503);
    exit;
}

$sim = sim_get_by_slug($pdo, $slug);
if (!$sim || $sim['status'] !== 'published') {
    http_response_code(404);
    exit;
}

$filename = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $slug) . '.html';

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Content-Disposition: attachment; filename="' . $filename . '"');

echo $sim['html'];
