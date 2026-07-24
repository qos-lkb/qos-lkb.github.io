<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/db_import_sql.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';
require_once dirname(__DIR__) . '/includes/admin_audit_lib.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/db_import.php'));

/** @var 'success'|'error'|null */
$flashType = null;
$flash = '';
$schemaName = '';
$wipeAllowed = config_allows_db_wipe();
$confirmPhrase = config_db_wipe_confirm_phrase();
$appEnv = config_app_env();

try {
    $schemaName = db_export_schema_name();
} catch (Throwable $e) {
    $flashType = 'error';
    $flash = '無法讀取資料庫設定：' . $e->getMessage();
}

const DB_IMPORT_MAX_BYTES = 512 * 1024 * 1024;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'import' && $flashType !== 'error') {
    $actor = current_user();
    $actorId = $actor !== null ? (int) $actor['id'] : null;

    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $flashType = 'error';
        $flash = 'CSRF 驗證失敗。';
    } elseif (!$wipeAllowed) {
        $flashType = 'error';
        $flash = '目前環境（APP_ENV=' . $appEnv . '）禁止清空資料庫。僅 local／staging 可匯入，或於 .env 設 APP_ALLOW_DB_WIPE=1。';
        try {
            admin_audit_log(db(), 'db_import.blocked', $actorId, [
                'reason' => 'env_gate',
                'app_env' => $appEnv,
            ]);
        } catch (Throwable) {
        }
    } elseif (empty($_POST['confirm_wipe'])) {
        $flashType = 'error';
        $flash = '請勾選確認：您了解此操作會刪除現有全部資料表。';
    } elseif (trim((string) ($_POST['confirm_phrase'] ?? '')) !== $confirmPhrase) {
        $flashType = 'error';
        $flash = '請在確認欄正確輸入「' . $confirmPhrase . '」。';
        try {
            admin_audit_log(db(), 'db_import.blocked', $actorId, [
                'reason' => 'confirm_phrase',
            ]);
        } catch (Throwable) {
        }
    } elseif (!isset($_FILES['sql_file']) || !is_array($_FILES['sql_file'])) {
        $flashType = 'error';
        $flash = '請選擇要上載的 SQL 檔案。';
    } else {
        $file = $_FILES['sql_file'];
        $uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE) {
            $flashType = 'error';
            $flash = '檔案過大，超過伺服器上載限制。';
        } elseif ($uploadError !== UPLOAD_ERR_OK) {
            $flashType = 'error';
            $flash = '上載失敗（錯誤代碼 ' . $uploadError . '）。';
        } else {
            $tmp = (string) ($file['tmp_name'] ?? '');
            $origName = (string) ($file['name'] ?? '');
            $size = (int) ($file['size'] ?? 0);

            if ($tmp === '' || !is_uploaded_file($tmp)) {
                $flashType = 'error';
                $flash = '無效的上載檔案。';
            } elseif ($size <= 0) {
                $flashType = 'error';
                $flash = 'SQL 檔案為空。';
            } elseif ($size > DB_IMPORT_MAX_BYTES) {
                $flashType = 'error';
                $flash = 'SQL 檔案超過允許大小（' . (int) (DB_IMPORT_MAX_BYTES / 1024 / 1024) . ' MB）。';
            } elseif (!preg_match('/\.sql$/i', $origName)) {
                $flashType = 'error';
                $flash = '僅接受副檔名為 .sql 的檔案。';
            } else {
                @set_time_limit(0);

                try {
                    $sql = file_get_contents($tmp);
                    if ($sql === false || $sql === '') {
                        throw new RuntimeException('無法讀取上載的 SQL 檔案。');
                    }

                    $pdo = db();
                    admin_audit_log($pdo, 'db_import.start', $actorId, [
                        'filename' => $origName,
                        'bytes' => $size,
                        'schema' => $schemaName,
                        'app_env' => $appEnv,
                    ]);

                    $result = db_import_from_sql($pdo, $sql);

                    admin_audit_log($pdo, 'db_import.success', $actorId, [
                        'filename' => $origName,
                        'dropped' => $result['dropped'],
                        'executed' => $result['executed'],
                        'tables' => $result['tables'],
                    ]);

                    $flashType = 'success';
                    $flash = sprintf(
                        '匯入完成：已刪除 %d 個原有資料表，執行 %d 條 SQL（略過 %d 條 USE/CREATE DATABASE 等），目前共有 %d 個資料表。',
                        $result['dropped'],
                        $result['executed'],
                        $result['skipped'],
                        $result['tables']
                    );
                } catch (Throwable $e) {
                    try {
                        admin_audit_log(db(), 'db_import.failed', $actorId, [
                            'filename' => $origName,
                            'error' => $e->getMessage(),
                        ]);
                    } catch (Throwable) {
                    }
                    $flashType = 'error';
                    $flash = '匯入失敗：' . $e->getMessage()
                        . '（若中途中斷，資料庫可能處於不完整狀態，請重新匯入或還原備份。）';
                }
            }
        }
    }
}

$csrf = csrf_token();

admin_page_start('匯入資料庫', 'db_import');
?>
        <p class="text-sm text-slate-600 leading-relaxed">
            將上載的 SQL 檔案匯入至目前 .env 所連線的 MySQL 資料庫
            <?php if ($schemaName !== ''): ?>
                <strong><?php echo htmlspecialchars($schemaName, ENT_QUOTES, 'UTF-8'); ?></strong>
            <?php endif; ?>。
            匯入前會<strong class="text-red-700">先刪除該資料庫內所有現有資料表</strong>，此操作無法復原。
            建議先至 <a href="db_export.php" class="text-indigo-600 hover:underline">匯出資料庫</a> 備份。
        </p>

        <p class="text-sm rounded-lg px-4 py-3 border <?php echo $wipeAllowed
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-red-50 border-red-200 text-red-800'; ?>">
            目前 <code class="font-mono text-xs">APP_ENV=<?php echo htmlspecialchars($appEnv, ENT_QUOTES, 'UTF-8'); ?></code>。
            <?php if ($wipeAllowed): ?>
                此環境允許清空匯入；仍須勾選確認並輸入片語 <code class="font-mono text-xs"><?php echo htmlspecialchars($confirmPhrase, ENT_QUOTES, 'UTF-8'); ?></code>。
            <?php else: ?>
                生產環境預設<strong>拒絕</strong>清空匯入。若為緊急還原，請先備份後於 .env 設 <code class="font-mono text-xs">APP_ALLOW_DB_WIPE=1</code>（用畢請立即移除）。
            <?php endif; ?>
        </p>

        <?php if ($flash !== ''): ?>
            <p class="text-sm rounded-lg px-4 py-3 border <?php echo $flashType === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'; ?>">
                <?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?>
            </p>
        <?php endif; ?>

        <form method="post" enctype="multipart/form-data" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 <?php echo $wipeAllowed ? '' : 'opacity-60 pointer-events-none'; ?>">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="action" value="import">

            <div>
                <label for="sql_file" class="block text-sm font-medium text-slate-700 mb-1">SQL 檔案</label>
                <input type="file" id="sql_file" name="sql_file" accept=".sql,text/plain,application/sql" required
                       class="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                       <?php echo $wipeAllowed ? '' : 'disabled'; ?>>
                <p class="text-xs text-slate-500 mt-1">副檔名須為 .sql；最大 <?php echo (int) (DB_IMPORT_MAX_BYTES / 1024 / 1024); ?> MB。</p>
            </div>

            <label class="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" name="confirm_wipe" value="1" required class="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                       <?php echo $wipeAllowed ? '' : 'disabled'; ?>>
                <span>我了解此操作會<strong class="text-red-700">永久刪除</strong>目前資料庫內所有資料表與資料，並以所上載的 SQL 取代。</span>
            </label>

            <div>
                <label for="confirm_phrase" class="block text-sm font-medium text-slate-700 mb-1">二次確認片語</label>
                <input type="text" id="confirm_phrase" name="confirm_phrase" required autocomplete="off"
                       placeholder="<?php echo htmlspecialchars($confirmPhrase, ENT_QUOTES, 'UTF-8'); ?>"
                       class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"
                       <?php echo $wipeAllowed ? '' : 'disabled'; ?>>
                <p class="text-xs text-slate-500 mt-1">請完整輸入：<code class="font-mono"><?php echo htmlspecialchars($confirmPhrase, ENT_QUOTES, 'UTF-8'); ?></code></p>
            </div>

            <button type="submit"
                    class="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    <?php echo $wipeAllowed ? '' : 'disabled'; ?>
                    onclick="return confirm('確定要刪除全部資料表並匯入 SQL？此操作無法復原。');">
                刪除全部資料表並匯入
            </button>
        </form>
<?php
admin_page_end();
