<?php

declare(strict_types=1);

namespace ScienceSims\Http;

/**
 * Normalize an HTTP request URI into an /api/v1 relative path (e.g. "/catalog").
 */
final class ApiPath
{
    public static function fromRequestUri(string $uri, string $scriptName = ''): string
    {
        $path = parse_url($uri, PHP_URL_PATH);
        if (!is_string($path)) {
            return '/';
        }

        if (preg_match('#/v1(/.*)?$#', $path, $m)) {
            $path = $m[1] ?? '/';
        } else {
            $script = str_replace('\\', '/', $scriptName);
            if ($script !== '' && str_ends_with($path, $script)) {
                $path = substr($path, 0, -strlen($script));
            }
            $path = preg_replace('#^/api(?:/index\.php)?#', '', $path) ?? $path;
        }

        $path = '/' . trim((string) $path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    }
}
