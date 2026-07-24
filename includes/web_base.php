<?php

declare(strict_types=1);

/**
 * 網站根目錄的 URL 路徑前綴（例如 /science_sims），不含尾隨斜線。
 * 依 api/index.php 或任一根目錄 PHP 的 SCRIPT_NAME 推算。
 */
function web_base_path(): string
{
    static $base = null;
    if ($base !== null) {
        return $base;
    }

    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($script === '') {
        $base = '';
        return $base;
    }

    // .../api/index.php → 上兩層；根目錄 PHP（如 login.php）→ 上一層
    if (str_contains($script, '/api/')) {
        $base = rtrim(dirname(dirname($script)), '/');
    } else {
        $base = rtrim(dirname($script), '/');
    }

    if ($base === '/') {
        $base = '';
    }

    return $base;
}

function web_resolve_path(string $path): string
{
    $path = trim($path);
    if ($path === '') {
        return $path;
    }
    if (preg_match('#^https?://#i', $path) || str_starts_with($path, '//')) {
        return $path;
    }
    if (str_starts_with($path, '/')) {
        return $path;
    }

    $base = web_base_path();
    return ($base !== '' ? $base : '') . '/' . ltrim($path, '/');
}
