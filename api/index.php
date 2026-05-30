<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/api_response.php';

api_handle_options();
api_cors_headers();
bootstrap_public();

require_once __DIR__ . '/v1/router.php';

api_v1_dispatch();
