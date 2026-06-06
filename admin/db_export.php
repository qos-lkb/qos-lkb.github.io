<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/db_export_sql.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/db_export.php'));

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'export') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'CSRF 驗證失敗。';
        exit;
    }

    @set_time_limit(0);

    try {
        $pdo = db();
        $schema = db_export_schema_name();
    } catch (Throwable $e) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo '無法連線或讀取設定：' . $e->getMessage();
        exit;
    }

    $safeFile = preg_replace('/[^A-Za-z0-9_-]+/', '_', $schema) ?: 'database';
    $filename = $safeFile . '_' . date('Ymd_His') . '.sql';

    try {
        header('Content-Type: application/octet-stream; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Pragma: no-cache');

        db_export_stream_full_sql($pdo, static function (string $chunk): void {
            echo $chunk;
            if (function_exists('ob_get_level') && ob_get_level() > 0) {
                @ob_flush();
            }
            flush();
        });
    } catch (Throwable $e) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: text/plain; charset=utf-8');
            echo '匯出失敗：' . $e->getMessage();
        } else {
            echo "\n\n-- EXPORT ERROR: " . str_replace(["\r", "\n"], ' ', $e->getMessage());
        }
    }
    exit;
}

$csrf = csrf_token();

admin_page_start('匯出資料庫', 'db_export');
?>
        <p class="text-sm text-slate-600 leading-relaxed">
            下載目前 .env 所連線之<strong>整個</strong> MySQL 資料庫結構與資料（僅一般資料表，不含 VIEW）。
            檔案可能含敏感資料，請妥善保管；大型資料庫匯出可能需較久時間。
        </p>
        <form method="post" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="action" value="export">
            <button type="submit" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                一鍵下載 SQL 備份
            </button>
        </form>
<?php
admin_page_end();
