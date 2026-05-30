<?php

declare(strict_types=1);

function api_json_headers(): void
{
    if (headers_sent()) {
        return;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store, no-cache, must-revalidate');
}

/**
 * @param mixed $data
 */
function api_json_ok($data, int $status = 200, ?array $meta = null): never
{
    api_json_headers();
    http_response_code($status);
    $payload = ['data' => $data];
    if ($meta !== null) {
        $payload['meta'] = $meta;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function api_json_error(string $code, string $message, int $status = 400, ?array $details = null): never
{
    api_json_headers();
    http_response_code($status);
    $error = ['code' => $code, 'message' => $message];
    if ($details !== null) {
        $error['details'] = $details;
    }
    echo json_encode(['error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function api_read_json_body(): array
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        $cached = [];
        return $cached;
    }
    $decoded = json_decode($raw, true);
    $cached = is_array($decoded) ? $decoded : [];
    return $cached;
}

function api_request_csrf(): ?string
{
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (is_string($header) && $header !== '') {
        return $header;
    }
    $body = api_read_json_body();
    if (isset($body['csrf']) && is_string($body['csrf'])) {
        return $body['csrf'];
    }
    if (isset($_POST['csrf']) && is_string($_POST['csrf'])) {
        return $_POST['csrf'];
    }
    return null;
}

function api_verify_csrf_or_fail(): void
{
    if (!verify_csrf(api_request_csrf())) {
        api_json_error('csrf_invalid', 'CSRF 驗證失敗，請重新整理頁面。', 403);
    }
}

function api_cors_headers(): void
{
    $allowed = trim((string) (getenv('CORS_ALLOWED_ORIGINS') ?: ''));
    if ($allowed === '') {
        return;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $list = array_map('trim', explode(',', $allowed));
    if ($origin !== '' && in_array($origin, $list, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    }
}

function api_handle_options(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        api_cors_headers();
        http_response_code(204);
        exit;
    }
}
