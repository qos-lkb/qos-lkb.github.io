<?php

declare(strict_types=1);

/**
 * Validate redirect / external URLs from configuration.
 */
function security_is_allowed_redirect_url(string $url): bool
{
    $url = trim($url);
    if ($url === '') {
        return false;
    }

    $parts = parse_url($url);
    if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
        return false;
    }

    if (!in_array(strtolower($parts['scheme']), ['https', 'http'], true)) {
        return false;
    }

    $whitelist = trim((string) (getenv('REDIRECT_URL_WHITELIST') ?: ''));
    if ($whitelist === '') {
        return strtolower($parts['scheme']) === 'https';
    }

    $hosts = array_map('trim', explode(',', $whitelist));
    $host = strtolower($parts['host']);
    foreach ($hosts as $allowed) {
        if ($allowed !== '' && strcasecmp($host, strtolower($allowed)) === 0) {
            return true;
        }
    }

    return false;
}
