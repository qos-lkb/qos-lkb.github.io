<?php

declare(strict_types=1);

/**
 * Site root URL path (e.g. "/science_sims") derived from SCRIPT_NAME.
 * Does not use web_base_path() cache so admin/portal/app scripts resolve correctly.
 */
function spa_site_root(?string $scriptName = null): string
{
    $script = str_replace('\\', '/', $scriptName ?? (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($script === '') {
        return '';
    }

    $dir = rtrim(dirname($script), '/');
    // /…/api/index.php → /…/api
    if (str_ends_with($dir, '/api')) {
        $dir = rtrim(dirname($dir), '/');
    }
    foreach (['/admin', '/portal', '/app'] as $suffix) {
        if (str_ends_with($dir, $suffix)) {
            $dir = rtrim(dirname($dir), '/');
            break;
        }
    }

    return ($dir === '/' || $dir === '.') ? '' : $dir;
}

/**
 * Absolute path for SPA routes under /app (e.g. "/science_sims/app/admin/subjects").
 */
function spa_app_path(string $route = '/', ?string $scriptName = null): string
{
    $route = '/' . ltrim($route, '/');
    if ($route !== '/') {
        $route = rtrim($route, '/');
    }
    $base = spa_site_root($scriptName);
    return ($base !== '' ? $base : '') . '/app' . ($route === '/' ? '/' : $route);
}

/**
 * 302 to an SPA app route. Preserves query string when $keepQuery is true.
 */
function spa_redirect(string $route, bool $keepQuery = true): never
{
    $target = spa_app_path($route);
    if ($keepQuery) {
        $qs = $_SERVER['QUERY_STRING'] ?? '';
        if (is_string($qs) && $qs !== '') {
            $target .= (str_contains($target, '?') ? '&' : '?') . $qs;
        }
    }
    header('Location: ' . $target, true, 302);
    exit;
}

/**
 * 302 from portal/* to the matching admin/* page (same basename + query).
 */
function portal_redirect_to_admin(string $adminScript): never
{
    $adminScript = ltrim(str_replace('\\', '/', $adminScript), '/');
    if (!str_starts_with($adminScript, 'admin/')) {
        $adminScript = 'admin/' . $adminScript;
    }
    $base = spa_site_root();
    $target = ($base !== '' ? $base : '') . '/' . $adminScript;
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    if (is_string($qs) && $qs !== '') {
        $target .= '?' . $qs;
    }
    header('Location: ' . $target, true, 302);
    exit;
}
