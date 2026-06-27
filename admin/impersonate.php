<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();
require_login('../login.php?next=' . rawurlencode('admin/users.php'));

$pdo = db();
$action = (string) ($_POST['action'] ?? $_GET['action'] ?? '');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

if (!verify_csrf($_POST['csrf'] ?? null)) {
    http_response_code(403);
    echo 'CSRF 驗證失敗。';
    exit;
}

if ($action === 'start') {
    $targetId = (int) ($_POST['user_id'] ?? 0);
    $r = auth_start_impersonation($pdo, $targetId);
    if (!$r['ok']) {
        header('Location: users.php?impersonate_error=' . rawurlencode($r['error'] ?? '模仿失敗。'));
        exit;
    }
    header('Location: ../app/');
    exit;
}

if ($action === 'stop') {
    $r = auth_stop_impersonation($pdo);
    if (!$r['ok']) {
        header('Location: ../login.php');
        exit;
    }
    header('Location: users.php?impersonate_stopped=1');
    exit;
}

http_response_code(400);
echo '無效的操作。';
