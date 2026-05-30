<?php

declare(strict_types=1);

/**
 * Legacy entry point — redirects to the SPA frontend.
 * @deprecated Use app/ as the main catalogue entry.
 */
header('Location: app/', true, 302);
exit;
