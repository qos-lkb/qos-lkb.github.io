<?php

declare(strict_types=1);

/**
 * @deprecated Portal → SPA question-bank editor (Phase 7).
 */
require_once dirname(__DIR__) . '/includes/spa_redirect.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
spa_redirect($id > 0 ? '/admin/question-banks/' . $id . '/edit' : '/admin/question-banks/new', false);
