<?php

declare(strict_types=1);

/**
 * @deprecated Phase 7 — learning tools merged into question banks.
 * Redirects to admin/question_bank_edit.php
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();
require_any_permission(
    ['question_bank.manage_any', 'question_bank.manage_own', 'learning_tool.manage_any', 'learning_tool.manage_own'],
    '../login.php?next=' . rawurlencode('admin/question_banks.php')
);

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$target = 'question_bank_edit.php' . ($id > 0 ? '?id=' . $id : '');
header('Location: ' . $target, true, 302);
exit;
