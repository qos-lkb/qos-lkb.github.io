<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

bootstrap_public();
logout_user();
header('Location: index.php');
exit;
