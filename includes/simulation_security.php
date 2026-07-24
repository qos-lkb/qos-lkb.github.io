<?php

declare(strict_types=1);

/**
 * Content-Security-Policy for simulation HTML served via /api/v1/simulations/{slug}/html.
 * Allows common CDNs used by standalone sims; blocks framing by other origins.
 */
function simulation_html_csp(): string
{
    return implode('; ', [
        "default-src 'self' https: data: blob:",
        "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' https: 'unsafe-inline'",
        'img-src \'self\' https: data: blob:',
        'font-src \'self\' https: data:',
        'connect-src \'self\' https: wss: ws: data: blob:',
        'media-src \'self\' https: data: blob:',
        'worker-src \'self\' blob: https:',
        'child-src \'self\' blob: https:',
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self' https:",
    ]);
}

/**
 * Sandbox tokens for the SPA sim modal iframe.
 * allow-same-origin is omitted so the iframe gets an opaque origin (cannot reach parent
 * DOM / cookies). Modal screenshot may fall back when contentDocument is blocked.
 */
function simulation_iframe_sandbox_attr(): string
{
    return 'allow-scripts allow-forms allow-popups allow-modals allow-downloads';
}
