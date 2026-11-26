<?php

declare(strict_types=1);

/**
 * 科學教育網頁：只讀寫 science-edu/ 靜態檔，不使用資料庫。
 */

function science_edu_root(): string
{
    $root = dirname(__DIR__) . '/science-edu';
    if (!is_dir($root) && !mkdir($root, 0775, true) && !is_dir($root)) {
        throw new RuntimeException('無法建立 science-edu 目錄。');
    }
    foreach (['pages', 'images'] as $dir) {
        $path = $root . '/' . $dir;
        if (!is_dir($path) && !mkdir($path, 0775, true) && !is_dir($path)) {
            throw new RuntimeException('無法建立 science-edu/' . $dir . '。');
        }
    }
    $real = realpath($root);
    if ($real === false) {
        throw new RuntimeException('無法定位 science-edu 目錄。');
    }
    return $real;
}

function science_edu_slug_ok(string $slug): bool
{
    return (bool) preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug);
}

/**
 * @return array{title:string,lead:string,pages:list<array<string,mixed>>}
 */
function science_edu_read_nav(): array
{
    $file = science_edu_root() . '/nav.json';
    if (!is_file($file)) {
        return ['title' => '科學教育', 'lead' => '', 'pages' => []];
    }
    $raw = file_get_contents($file);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data)) {
        return ['title' => '科學教育', 'lead' => '', 'pages' => []];
    }
    return science_edu_normalize_nav($data);
}

/**
 * @param array<string,mixed> $data
 * @return array{title:string,lead:string,pages:list<array<string,mixed>>}
 */
function science_edu_normalize_nav(array $data): array
{
    $title = trim((string) ($data['title'] ?? '科學教育'));
    $lead = trim((string) ($data['lead'] ?? ''));
    if (mb_strlen($title) > 80) {
        $title = mb_substr($title, 0, 80);
    }
    if (mb_strlen($lead) > 400) {
        $lead = mb_substr($lead, 0, 400);
    }
    $pages = [];
    $seen = [];
    $rows = $data['pages'] ?? [];
    if (!is_array($rows)) {
        $rows = [];
    }
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $slug = strtolower(trim((string) ($row['slug'] ?? '')));
        if (!science_edu_slug_ok($slug) || isset($seen[$slug])) {
            continue;
        }
        $seen[$slug] = true;
        $pageTitle = trim((string) ($row['title'] ?? $slug));
        $summary = trim((string) ($row['summary'] ?? ''));
        $parent = strtolower(trim((string) ($row['parent'] ?? '')));
        if ($parent !== '' && !science_edu_slug_ok($parent)) {
            $parent = '';
        }
        if (mb_strlen($pageTitle) > 120) {
            $pageTitle = mb_substr($pageTitle, 0, 120);
        }
        if (mb_strlen($summary) > 300) {
            $summary = mb_substr($summary, 0, 300);
        }
        $pages[] = [
            'slug' => $slug,
            'title' => $pageTitle !== '' ? $pageTitle : $slug,
            'summary' => $summary,
            'parent' => $parent,
            'sort' => (int) ($row['sort'] ?? 0),
            'showOnHome' => !empty($row['showOnHome']),
        ];
    }
    if (count($pages) > 80) {
        $pages = array_slice($pages, 0, 80);
    }
    $slugs = array_fill_keys(array_column($pages, 'slug'), true);
    foreach ($pages as &$page) {
        if ($page['parent'] === $page['slug'] || ($page['parent'] !== '' && !isset($slugs[$page['parent']]))) {
            $page['parent'] = '';
        }
    }
    unset($page);
    usort($pages, static fn (array $a, array $b): int => $a['sort'] <=> $b['sort']);
    return ['title' => $title !== '' ? $title : '科學教育', 'lead' => $lead, 'pages' => $pages];
}

/**
 * @param array{title:string,lead:string,pages:list<array<string,mixed>>} $nav
 */
function science_edu_write_nav(array $nav): void
{
    $nav = science_edu_normalize_nav($nav);
    $file = science_edu_root() . '/nav.json';
    $json = json_encode($nav, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false || file_put_contents($file, $json . "\n", LOCK_EX) === false) {
        throw new RuntimeException('無法寫入 nav.json。');
    }
}

function science_edu_page_file(string $slug): string
{
    if (!science_edu_slug_ok($slug)) {
        throw new InvalidArgumentException('頁面代碼不正確。');
    }
    $root = science_edu_root();
    $path = $root . '/pages/' . $slug . '.html';
    $dir = realpath($root . '/pages');
    if ($dir === false || !str_starts_with($dir, $root)) {
        throw new RuntimeException('pages 目錄不正確。');
    }
    return $dir . '/' . $slug . '.html';
}

function science_edu_read_html(string $slug): string
{
    $file = science_edu_page_file($slug);
    if (!is_file($file)) {
        return '';
    }
    $raw = file_get_contents($file);
    return is_string($raw) ? $raw : '';
}

function science_edu_sanitize_html(string $html): string
{
    if (strlen($html) > 400000) {
        throw new InvalidArgumentException('內文過長。');
    }
    $html = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html) ?? '';
    $html = preg_replace('#<\?(?:php)?[\s\S]*?\?>#i', '', $html) ?? '';
    $html = preg_replace('#\s+on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $html) ?? '';
    $html = preg_replace('#(href|src)\s*=\s*(["\'])\s*javascript:[^"\']*\2#i', '$1=$2#$2', $html) ?? '';
    return $html;
}

function science_edu_write_html(string $slug, string $html): void
{
    $file = science_edu_page_file($slug);
    $clean = science_edu_sanitize_html($html);
    if (file_put_contents($file, $clean, LOCK_EX) === false) {
        throw new RuntimeException('無法寫入頁面。');
    }
}

function science_edu_delete_page(string $slug): void
{
    $file = science_edu_page_file($slug);
    if (is_file($file) && !unlink($file)) {
        throw new RuntimeException('無法刪除頁面。');
    }
    $dir = science_edu_root() . '/images';
    $pattern = '/^' . preg_quote($slug, '/') . '-(?:\d{2}|\d{14}-[a-f0-9]{6})\.(?:jpe?g|png|webp|gif)$/i';
    foreach (scandir($dir) ?: [] as $name) {
        if (!preg_match($pattern, $name)) {
            continue;
        }
        $full = $dir . '/' . $name;
        if (is_file($full)) {
            unlink($full);
        }
    }
}

/**
 * @return array{path:string,name:string}
 */
function science_edu_store_upload(string $slug, array $file): array
{
    if (!science_edu_slug_ok($slug)) {
        throw new InvalidArgumentException('頁面代碼不正確。');
    }
    $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('上傳失敗。');
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    $size = (int) ($file['size'] ?? 0);
    if ($tmp === '' || !is_uploaded_file($tmp) || $size < 1 || $size > 4 * 1024 * 1024) {
        throw new InvalidArgumentException('圖片需為 4MB 以內。');
    }
    $info = @getimagesize($tmp);
    $mime = is_array($info) ? (string) ($info['mime'] ?? '') : '';
    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        default => '',
    };
    if ($ext === '') {
        throw new InvalidArgumentException('只接受 JPEG、PNG、WebP 或 GIF。');
    }
    $name = $slug . '-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
    $dest = science_edu_root() . '/images/' . $name;
    if (!move_uploaded_file($tmp, $dest)) {
        throw new RuntimeException('無法儲存圖片。');
    }
    return ['path' => 'images/' . $name, 'name' => $name];
}
