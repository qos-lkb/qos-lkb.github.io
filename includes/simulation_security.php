<?php

declare(strict_types=1);

/**
 * Scheme+host of this request, for CSP. A sandboxed iframe without allow-same-origin
 * has an opaque origin, so 'self' does not match the site and same-host assets are blocked.
 */
function simulation_serving_origin(): string
{
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($host === '' || !preg_match('/^[A-Za-z0-9.-]+(?::\d+)?$/', $host)) {
        return '';
    }
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';

    return $scheme . '://' . $host;
}

/**
 * Content-Security-Policy for simulation HTML served via /api/v1/simulations/{slug}/html.
 * Allows common CDNs used by standalone sims; blocks framing by other origins.
 */
function simulation_html_csp(): string
{
    $origin = simulation_serving_origin();
    $hostSrc = $origin !== '' ? $origin . ' ' : '';

    return implode('; ', [
        "default-src 'self' {$hostSrc}https: data: blob:",
        "script-src 'self' {$hostSrc}https: 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' {$hostSrc}https: 'unsafe-inline'",
        "img-src 'self' {$hostSrc}https: data: blob:",
        "font-src 'self' {$hostSrc}https: data:",
        "connect-src 'self' {$hostSrc}https: wss: ws: data: blob:",
        "media-src 'self' {$hostSrc}https: data: blob:",
        "worker-src 'self' blob: {$hostSrc}https:",
        "child-src 'self' blob: {$hostSrc}https:",
        "frame-ancestors 'self'",
        "base-uri 'self' {$hostSrc}",
        "object-src 'none'",
        "form-action 'self' {$hostSrc}https:",
    ]);
}

/**
 * Sandbox tokens for the SPA sim modal iframe.
 * allow-same-origin is required so the parent can snapshot the live document
 * (same approach as a same-origin preview iframe).
 */
function simulation_iframe_sandbox_attr(): string
{
    return 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads';
}

/**
 * Prepare simulation HTML for the sim modal iframe.
 * Injects a site-root base href when the app is not hosted at /.
 *
 * Pass $baseHref to override (no trailing slash). Null reads web_base_path().
 * An empty string skips the base tag (same as a domain-root install).
 */
function simulation_prepare_iframe_html(string $html, ?string $baseHref = null): string
{
    if ($baseHref === null) {
        require_once __DIR__ . '/web_base.php';
        $baseHref = web_base_path();
    }
    $baseHref = rtrim($baseHref, '/');
    if ($baseHref !== '') {
        $baseTag = '<base href="' . htmlspecialchars($baseHref . '/', ENT_QUOTES, 'UTF-8') . '">';
        if (stripos($html, '<head>') !== false) {
            $html = preg_replace('/<head>/i', '<head>' . $baseTag, $html, 1) ?? ($baseTag . $html);
        } else {
            $html = $baseTag . $html;
        }
    }

    return $html;
}

/**
 * Temp-file path for a preview token. Rejects anything that is not 32 hex chars.
 */
function simulation_preview_token_path(string $dir, string $token): ?string
{
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return null;
    }

    return rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . $token . '.html';
}
