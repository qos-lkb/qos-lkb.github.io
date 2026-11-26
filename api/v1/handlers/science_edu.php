<?php

declare(strict_types=1);

function science_edu_require_editor(): array
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    if (!user_has_permission('article.manage_any') && !user_has_permission('user.manage')) {
        api_json_error('forbidden', '沒有權限。', 403);
    }
    return $user;
}

function api_handle_admin_science_edu(string $method): void
{
    science_edu_require_editor();
    try {
        if ($method === 'GET') {
            api_json_ok(science_edu_read_nav());
        }
        if ($method === 'PUT') {
            api_verify_csrf_or_fail();
            $body = api_read_json_body();
            science_edu_write_nav($body);
            api_json_ok(science_edu_read_nav());
        }
    } catch (InvalidArgumentException $e) {
        api_json_error('invalid', $e->getMessage(), 400);
    } catch (RuntimeException $e) {
        api_json_error('write_failed', $e->getMessage(), 500);
    }
    api_json_error('method_not_allowed', '不支援的方法。', 405);
}

function api_handle_admin_science_edu_page(string $method, string $slug): void
{
    science_edu_require_editor();
    if (!science_edu_slug_ok($slug)) {
        api_json_error('invalid', '頁面代碼不正確。', 400);
    }
    try {
        if ($method === 'GET') {
            api_json_ok(['slug' => $slug, 'html' => science_edu_read_html($slug)]);
        }
        if ($method === 'PUT') {
            api_verify_csrf_or_fail();
            $body = api_read_json_body();
            $html = (string) ($body['html'] ?? '');
            science_edu_write_html($slug, $html);
            $nav = science_edu_read_nav();
            $found = false;
            foreach ($nav['pages'] as &$page) {
                if ($page['slug'] !== $slug) {
                    continue;
                }
                $found = true;
                if (array_key_exists('title', $body)) {
                    $page['title'] = (string) $body['title'];
                }
                if (array_key_exists('summary', $body)) {
                    $page['summary'] = (string) $body['summary'];
                }
                if (array_key_exists('parent', $body)) {
                    $page['parent'] = (string) $body['parent'];
                }
                if (array_key_exists('showOnHome', $body)) {
                    $page['showOnHome'] = !empty($body['showOnHome']);
                }
                if (array_key_exists('sort', $body)) {
                    $page['sort'] = (int) $body['sort'];
                }
            }
            unset($page);
            if (!$found) {
                $nav['pages'][] = [
                    'slug' => $slug,
                    'title' => (string) ($body['title'] ?? $slug),
                    'summary' => (string) ($body['summary'] ?? ''),
                    'parent' => (string) ($body['parent'] ?? ''),
                    'sort' => (int) ($body['sort'] ?? 0),
                    'showOnHome' => !empty($body['showOnHome']),
                ];
            }
            science_edu_write_nav($nav);
            api_json_ok(['slug' => $slug, 'nav' => science_edu_read_nav()]);
        }
        if ($method === 'DELETE') {
            api_verify_csrf_or_fail();
            $nav = science_edu_read_nav();
            foreach ($nav['pages'] as $page) {
                if (($page['parent'] ?? '') === $slug) {
                    api_json_error('has_children', '請先移走或刪除子頁。', 400);
                }
            }
            $nav['pages'] = array_values(array_filter(
                $nav['pages'],
                static fn (array $page): bool => $page['slug'] !== $slug
            ));
            science_edu_write_nav($nav);
            science_edu_delete_page($slug);
            api_json_ok(['deleted' => $slug]);
        }
    } catch (InvalidArgumentException $e) {
        api_json_error('invalid', $e->getMessage(), 400);
    } catch (RuntimeException $e) {
        api_json_error('write_failed', $e->getMessage(), 500);
    }
    api_json_error('method_not_allowed', '不支援的方法。', 405);
}

function api_handle_admin_science_edu_create(): void
{
    science_edu_require_editor();
    api_verify_csrf_or_fail();
    $body = api_read_json_body();
    $slug = strtolower(trim((string) ($body['slug'] ?? '')));
    if (!science_edu_slug_ok($slug)) {
        api_json_error('invalid', '頁面代碼只可用小寫英數與連字號。', 400);
    }
    try {
        $nav = science_edu_read_nav();
        foreach ($nav['pages'] as $page) {
            if ($page['slug'] === $slug) {
                api_json_error('exists', '這個頁面代碼已存在。', 409);
            }
        }
        $sort = 10;
        foreach ($nav['pages'] as $page) {
            $sort = max($sort, ((int) $page['sort']) + 10);
        }
        $nav['pages'][] = [
            'slug' => $slug,
            'title' => (string) ($body['title'] ?? $slug),
            'summary' => (string) ($body['summary'] ?? ''),
            'parent' => (string) ($body['parent'] ?? ''),
            'sort' => $sort,
            'showOnHome' => !empty($body['showOnHome']),
        ];
        science_edu_write_nav($nav);
        if (!is_file(science_edu_page_file($slug))) {
            $title = trim((string) ($body['title'] ?? $slug));
            science_edu_write_html($slug, '<h1>' . htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</h1>\n<p></p>\n");
        }
        api_json_ok(science_edu_read_nav(), 201);
    } catch (InvalidArgumentException $e) {
        api_json_error('invalid', $e->getMessage(), 400);
    } catch (RuntimeException $e) {
        api_json_error('write_failed', $e->getMessage(), 500);
    }
}

function api_handle_admin_science_edu_image(): void
{
    science_edu_require_editor();
    api_verify_csrf_or_fail();
    $slug = strtolower(trim((string) ($_POST['slug'] ?? '')));
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        api_json_error('invalid', '請選擇圖片。', 400);
    }
    try {
        $stored = science_edu_store_upload($slug, $_FILES['file']);
        api_json_ok($stored, 201);
    } catch (InvalidArgumentException $e) {
        api_json_error('invalid', $e->getMessage(), 400);
    } catch (RuntimeException $e) {
        api_json_error('write_failed', $e->getMessage(), 500);
    }
}
