<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/db_export_sql.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/db_import.php'));

$schemaName = '';
$wipeAllowed = config_allows_db_wipe();
$confirmPhrase = config_db_wipe_confirm_phrase();
$appEnv = config_app_env();
const DB_IMPORT_MAX_BYTES = 512 * 1024 * 1024;

try {
    $schemaName = db_export_schema_name();
} catch (Throwable $e) {
    $schemaName = '';
}

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

        <p id="db-import-flash" class="text-sm rounded-lg px-4 py-3 border hidden mb-4"></p>

        <form id="db-import-form" enctype="multipart/form-data" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 <?php echo $wipeAllowed ? '' : 'opacity-60 pointer-events-none'; ?>">
            <div>
                <label for="sql_file" class="block text-sm font-medium text-slate-700 mb-1">SQL 檔案</label>
                <input type="file" id="sql_file" name="sql_file" accept=".sql,text/plain,application/sql" required
                       class="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                       <?php echo $wipeAllowed ? '' : 'disabled'; ?>>
                <p class="text-xs text-slate-500 mt-1">副檔名須為 .sql；最大 <?php echo (int) (DB_IMPORT_MAX_BYTES / 1024 / 1024); ?> MB。</p>
            </div>

            <label class="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" name="confirm_wipe" id="confirm_wipe" value="1" required class="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
                    <?php echo $wipeAllowed ? '' : 'disabled'; ?>>
                刪除全部資料表並匯入
            </button>
        </form>
<?php
$wipeAllowedJs = $wipeAllowed ? 'true' : 'false';
admin_page_end([
    'scripts' => <<<HTML
<script src="../assets/js/admin-api.js"></script>
<script>
(async function () {
    const form = document.getElementById('db-import-form');
    const flash = document.getElementById('db-import-flash');
    const wipeAllowed = {$wipeAllowedJs};
    function showFlash(msg, isError) {
        if (!flash) return;
        flash.textContent = msg;
        flash.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-800', 'bg-red-50', 'border-red-200', 'text-red-800');
        flash.classList.add(isError ? 'bg-red-50' : 'bg-emerald-50', isError ? 'border-red-200' : 'border-emerald-200', isError ? 'text-red-800' : 'text-emerald-800');
    }
    if (!form || !wipeAllowed) return;
    try {
        await AdminApi.initSession();
    } catch (err) {
        showFlash(err.message || '無法初始化 API 工作階段', true);
        return;
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!confirm('確定要刪除全部資料表並匯入 SQL？此操作無法復原。')) return;
        const fd = new FormData(form);
        fd.set('confirm_wipe', form.confirm_wipe.checked ? '1' : '');
        try {
            const data = await AdminApi.apiFetch('/admin/db/import', { method: 'POST', body: fd });
            showFlash(
                '匯入完成：已刪除 ' + (data.dropped || 0) + ' 個原有資料表，執行 ' + (data.executed || 0)
                + ' 條 SQL（略過 ' + (data.skipped || 0) + '），目前共有 ' + (data.tables || 0) + ' 個資料表。',
                false
            );
            form.reset();
        } catch (err) {
            showFlash(err.message || '匯入失敗', true);
        }
    });
})();
</script>
HTML,
]);
