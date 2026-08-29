<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';
require_once dirname(__DIR__, 3) . '/includes/admin_audit_lib.php';
require_once dirname(__DIR__, 3) . '/includes/db_export_sql.php';
require_once dirname(__DIR__, 3) . '/includes/db_import_sql.php';
require_once dirname(__DIR__, 3) . '/includes/data_dictionary_lib.php';
require_once dirname(__DIR__, 3) . '/includes/qsis_import_lib.php';
require_once dirname(__DIR__, 3) . '/includes/qsis_db.php';

const API_DB_IMPORT_MAX_BYTES = 512 * 1024 * 1024;

/**
 * Wipe-gate metadata for the SPA import form (no secrets beyond public confirm phrase).
 */
function api_handle_admin_db_import_status(): void
{
    require_api_permission('user.manage');
    $schemaName = '';
    try {
        $schemaName = db_export_schema_name();
    } catch (Throwable) {
        $schemaName = '';
    }
    api_json_ok([
        'wipe_allowed' => config_allows_db_wipe(),
        'confirm_phrase' => config_db_wipe_confirm_phrase(),
        'app_env' => config_app_env(),
        'schema_name' => $schemaName,
        'max_bytes' => API_DB_IMPORT_MAX_BYTES,
    ]);
}

/**
 * Stream full DB SQL dump as attachment.
 */
function api_handle_admin_db_export(PDO $pdo): void
{
    require_api_permission('user.manage');
    api_verify_csrf_or_fail();

    @set_time_limit(0);

    try {
        $schema = db_export_schema_name();
    } catch (Throwable $e) {
        api_json_error('server_error', '無法讀取資料庫設定：' . $e->getMessage(), 500);
    }

    $safeFile = preg_replace('/[^A-Za-z0-9_-]+/', '_', $schema) ?: 'database';
    $filename = $safeFile . '_' . date('Ymd_His') . '.sql';

    header('Content-Type: application/octet-stream; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');

    try {
        db_export_stream_full_sql($pdo, static function (string $chunk): void {
            echo $chunk;
            if (function_exists('ob_get_level') && ob_get_level() > 0) {
                @ob_flush();
            }
            flush();
        });
    } catch (Throwable $e) {
        if (!headers_sent()) {
            api_json_error('server_error', '匯出失敗：' . $e->getMessage(), 500);
        }
        echo "\n\n-- EXPORT ERROR: " . str_replace(["\r", "\n"], ' ', $e->getMessage());
    }
    exit;
}

/**
 * Dangerous wipe + import. Preserves Phase 5 gates.
 */
function api_handle_admin_db_import(PDO $pdo): void
{
    $user = require_api_permission('user.manage');
    api_verify_csrf_or_fail();

    $actorId = (int) $user['id'];
    $wipeAllowed = config_allows_db_wipe();
    $confirmPhrase = config_db_wipe_confirm_phrase();
    $appEnv = config_app_env();

    $confirmWipe = false;
    $phrase = '';
    $sql = '';
    $origName = '';
    $size = 0;

    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    if (stripos($contentType, 'multipart/form-data') !== false || isset($_FILES['sql_file'])) {
        $confirmWipe = !empty($_POST['confirm_wipe']);
        $phrase = trim((string) ($_POST['confirm_phrase'] ?? ''));
        if (!isset($_FILES['sql_file']) || !is_array($_FILES['sql_file'])) {
            api_json_error('validation_error', '請選擇要上載的 SQL 檔案。', 422);
        }
        $file = $_FILES['sql_file'];
        $uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE) {
            api_json_error('validation_error', '檔案過大，超過伺服器上載限制。', 422);
        }
        if ($uploadError !== UPLOAD_ERR_OK) {
            api_json_error('validation_error', '上載失敗（錯誤代碼 ' . $uploadError . '）。', 422);
        }
        $tmp = (string) ($file['tmp_name'] ?? '');
        $origName = (string) ($file['name'] ?? '');
        $size = (int) ($file['size'] ?? 0);
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            api_json_error('validation_error', '無效的上載檔案。', 422);
        }
        if ($size <= 0) {
            api_json_error('validation_error', '檔案為空。', 422);
        }
        if ($size > API_DB_IMPORT_MAX_BYTES) {
            api_json_error('validation_error', '檔案超過 512MB 上限。', 422);
        }
        if (!preg_match('/\.sql$/i', $origName)) {
            api_json_error('validation_error', '僅接受 .sql 檔案。', 422);
        }
        $raw = file_get_contents($tmp);
        if ($raw === false) {
            api_json_error('server_error', '無法讀取上載檔案。', 500);
        }
        $sql = $raw;
    } else {
        $body = api_read_json_body();
        $confirmWipe = !empty($body['confirm_wipe']);
        $phrase = trim((string) ($body['confirm_phrase'] ?? ''));
        $sql = (string) ($body['sql'] ?? '');
        $origName = (string) ($body['filename'] ?? 'inline.sql');
        $size = strlen($sql);
        if ($sql === '') {
            api_json_error('validation_error', '請提供 SQL 內容或上載檔案。', 422);
        }
        if ($size > API_DB_IMPORT_MAX_BYTES) {
            api_json_error('validation_error', 'SQL 超過 512MB 上限。', 422);
        }
    }

    if (!$wipeAllowed) {
        try {
            admin_audit_log($pdo, 'db_import.blocked', $actorId, [
                'reason' => 'env_gate',
                'app_env' => $appEnv,
                'via' => 'api',
            ]);
        } catch (Throwable) {
        }
        api_json_error(
            'forbidden',
            '目前環境（APP_ENV=' . $appEnv . '）禁止清空資料庫。僅 local／staging 可匯入，或於 .env 設 APP_ALLOW_DB_WIPE=1。',
            403
        );
    }

    if (!$confirmWipe) {
        api_json_error('validation_error', '請勾選確認：您了解此操作會刪除現有全部資料表。', 422);
    }

    if ($phrase !== $confirmPhrase) {
        try {
            admin_audit_log($pdo, 'db_import.blocked', $actorId, [
                'reason' => 'confirm_phrase',
                'via' => 'api',
            ]);
        } catch (Throwable) {
        }
        api_json_error('validation_error', '請在確認欄正確輸入「' . $confirmPhrase . '」。', 422);
    }

    try {
        admin_audit_log($pdo, 'db_import.start', $actorId, [
            'filename' => $origName,
            'bytes' => $size,
            'via' => 'api',
        ]);
    } catch (Throwable) {
    }

    @set_time_limit(0);

    try {
        $result = db_import_from_sql($pdo, $sql);
        try {
            admin_audit_log($pdo, 'db_import.success', $actorId, [
                'filename' => $origName,
                'bytes' => $size,
                'dropped' => $result['dropped'] ?? 0,
                'executed' => $result['executed'] ?? 0,
                'tables' => $result['tables'] ?? 0,
                'via' => 'api',
            ]);
        } catch (Throwable) {
        }
        api_json_ok($result);
    } catch (Throwable $e) {
        try {
            admin_audit_log($pdo, 'db_import.failed', $actorId, [
                'filename' => $origName,
                'bytes' => $size,
                'error' => $e->getMessage(),
                'via' => 'api',
            ]);
        } catch (Throwable) {
        }
        api_json_error('server_error', '匯入失敗：' . $e->getMessage(), 500);
    }
}

function api_handle_admin_data_dictionary_get(): void
{
    require_api_permission('user.manage');
    $mdPath = dd_output_path();
    $schemaPath = dd_schema_path();
    $exists = is_readable($mdPath);
    $markdown = '';
    if ($exists) {
        $raw = file_get_contents($mdPath);
        $markdown = $raw !== false ? $raw : '';
    }
    api_json_ok([
        'exists' => $exists && $markdown !== '',
        'size' => $exists ? (int) (filesize($mdPath) ?: 0) : 0,
        'mtime' => $exists ? date('Y-m-d H:i:s', (int) filemtime($mdPath)) : '',
        'schema_mtime' => is_readable($schemaPath)
            ? date('Y-m-d H:i:s', (int) filemtime($schemaPath))
            : '—',
        'markdown' => $markdown,
        'reader_url' => 'markdown_reader.php?file=data_dictionary.md',
    ]);
}

function api_handle_admin_data_dictionary_regenerate(): void
{
    require_api_permission('user.manage');
    api_verify_csrf_or_fail();

    $result = dd_generate();
    if (!$result['ok']) {
        api_json_error('server_error', $result['error'] ?? '產生失敗。', 500);
    }
    api_json_ok([
        'table_count' => (int) ($result['table_count'] ?? 0),
        'output' => (string) ($result['output'] ?? dd_output_path()),
    ]);
}

function api_handle_admin_qsis_status(PDO $pdo): void
{
    require_api_permission('user.manage');

    $configured = qsis_is_configured();
    $connection = $configured
        ? qsis_test_connection()
        : ['ok' => false, 'error' => '尚未設定 QSIS 資料庫。'];

    $payload = [
        'configured' => $configured,
        'connection' => $connection,
        'years' => [],
        'klas' => [],
        'teachers' => [],
    ];

    $teachers = $pdo->query(
        "SELECT DISTINCT u.id, u.display_name, u.name_zh, u.name_en, u.email FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.name IN ('teacher', 'admin') AND u.is_active = 1
         ORDER BY u.display_name ASC"
    )->fetchAll() ?: [];
    $payload['teachers'] = $teachers;

    if (!empty($connection['ok'])) {
        try {
            $qsis = qsis_db();
            $payload['years'] = qsis_list_years($qsis);
            $payload['klas'] = qsis_list_klas($qsis);
            $payload['current_year_id'] = qsis_current_year_id($qsis);
            $payload['local_school_year'] = qsis_dominant_local_school_year($pdo);
            $payload['suggested_year_id'] = qsis_suggested_year_id($pdo, $qsis);
        } catch (Throwable $e) {
            $payload['connection'] = ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    api_json_ok($payload);
}

function api_handle_admin_qsis_courses(): void
{
    require_api_permission('user.manage');
    if (!qsis_is_configured()) {
        api_json_error('misconfigured', '尚未設定 QSIS 資料庫。', 503);
    }

    $yearId = trim((string) ($_GET['year_id'] ?? ''));
    $klaId = (int) ($_GET['kla_id'] ?? 0);
    if ($yearId === '') {
        api_json_error('validation_error', '請提供 year_id。', 422);
    }

    try {
        $qsis = qsis_db();
        $courses = qsis_list_courses($qsis, $yearId, $klaId > 0 ? $klaId : null);
        $out = [];
        foreach ($courses as $row) {
            $out[] = [
                'course_id' => (int) $row['course_id'],
                'name' => qsis_course_display_name($row),
                'course_code' => (string) ($row['course_code'] ?? ''),
                'level' => (int) ($row['level'] ?? 0),
                'class' => (string) ($row['class'] ?? ''),
                'student_count' => (int) ($row['student_count'] ?? 0),
                'kla_name' => (string) ($row['kla_name'] ?? ''),
                'is_dse_elective' => !empty($row['is_dse_elective']),
                'raw' => $row,
            ];
        }
        api_json_ok(['courses' => $out]);
    } catch (Throwable $e) {
        api_json_error('server_error', $e->getMessage(), 500);
    }
}

function api_handle_admin_qsis_import(PDO $pdo): void
{
    $user = require_api_permission('user.manage');
    api_verify_csrf_or_fail();

    if (!qsis_is_configured()) {
        api_json_error('misconfigured', '尚未設定 QSIS 資料庫。', 503);
    }

    $conn = qsis_test_connection();
    if (empty($conn['ok'])) {
        api_json_error('misconfigured', (string) ($conn['error'] ?? '無法連線 QSIS。'), 503);
    }

    $body = api_read_json_body();
    $mode = (string) ($body['mode'] ?? $body['action'] ?? '');
    $mode = match ($mode) {
        'import_courses', 'courses' => 'courses',
        'import_students', 'students' => 'students',
        'import_all', 'all' => 'all',
        default => '',
    };
    if ($mode === '') {
        api_json_error('validation_error', 'mode 須為 courses、students 或 all。', 422);
    }

    $courseIds = isset($body['course_ids']) && is_array($body['course_ids'])
        ? array_values(array_filter(array_map('intval', $body['course_ids']), static fn (int $id): bool => $id > 0))
        : [];
    if ($courseIds === []) {
        api_json_error('validation_error', '請至少勾選一門課程。', 422);
    }

    $options = [
        'year_id' => trim((string) ($body['year_id'] ?? '')),
        'course_ids' => $courseIds,
        'teacher_user_id' => (int) ($body['teacher_user_id'] ?? $user['id']),
        'default_password' => '',
        'enroll' => !empty($body['enroll']),
        'update_existing' => !empty($body['update_existing']),
    ];

    try {
        $qsis = qsis_db();
        $result = match ($mode) {
            'courses' => qsis_import_courses($pdo, $qsis, $options, $user['id']),
            'students' => qsis_import_students($pdo, $qsis, $options, $user['id']),
            'all' => qsis_import_all($pdo, $qsis, $options, $user['id']),
        };
        if (empty($result['ok'])) {
            api_json_error('validation_error', $result['error'] ?? '匯入失敗。', 422);
        }
        unset($result['ok']);
        api_json_ok(array_merge(['mode' => $mode], $result));
    } catch (Throwable $e) {
        api_json_error('server_error', $e->getMessage(), 500);
    }
}
