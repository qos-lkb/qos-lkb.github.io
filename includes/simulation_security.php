<?php

declare(strict_types=1);

/**
 * Scheme+host of this request, for CSP. Sandboxed iframes have an opaque origin,
 * so 'self' does not match the real site and same-host scripts/images are blocked.
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
 * allow-same-origin is omitted so the iframe gets an opaque origin (cannot reach parent
 * DOM / cookies). Screenshots use postMessage + sim-capture-bridge.js inside the HTML.
 */
function simulation_iframe_sandbox_attr(): string
{
    return 'allow-scripts allow-forms allow-popups allow-modals allow-downloads';
}

/**
 * Inline the screenshot bridge. External script src is blocked when the iframe
 * origin is opaque and CSP 'self' no longer matches the site host.
 */
function simulation_inject_capture_bridge(string $html): string
{
    if ($html === '') {
        return $html;
    }
    if (str_contains($html, 'data-sci-sim-capture-bridge') || str_contains($html, 'SCI_SIM_CAPTURE_REQUEST')) {
        return $html;
    }

    $path = dirname(__DIR__) . '/assets/js/sim-capture-bridge.js';
    $js = is_readable($path) ? (string) file_get_contents($path) : '';
    if ($js === '') {
        return $html;
    }
    $tag = '<script data-sci-sim-capture-bridge="1">' . $js . '</script>';
    if (stripos($html, '</body>') !== false) {
        return preg_replace('/<\/body>/i', $tag . '</body>', $html, 1) ?? ($html . $tag);
    }

    return $html . $tag;
}
