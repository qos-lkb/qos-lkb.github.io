<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/db_export.php'));

admin_page_start('匯出資料庫', 'db_export');
?>
        <p id="db-export-flash" class="text-sm mb-4 hidden"></p>
        <p class="text-sm text-slate-600 leading-relaxed">
            下載目前 .env 所連線之<strong>整個</strong> MySQL 資料庫結構與資料（僅一般資料表，不含 VIEW）。
            檔案可能含敏感資料，請妥善保管；大型資料庫匯出可能需較久時間。
        </p>
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <button type="button" id="db-export-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                一鍵下載 SQL 備份
            </button>
        </div>
<?php
admin_page_end([
    'scripts' => <<<'HTML'
<script src="../assets/js/admin-api.js"></script>
<script>
(async function () {
    const btn = document.getElementById('db-export-btn');
    const flash = document.getElementById('db-export-flash');
    function showFlash(msg, isError) {
        if (!flash) return;
        flash.textContent = msg;
        flash.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
        flash.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
    }
    try {
        await AdminApi.initSession();
    } catch (err) {
        showFlash(err.message || '無法初始化 API 工作階段', true);
        if (btn) btn.disabled = true;
        return;
    }
    btn?.addEventListener('click', async () => {
        btn.disabled = true;
        showFlash('正在匯出，請稍候…', false);
        try {
            const res = await AdminApi.apiFetch('/admin/db/export', { method: 'POST', body: {}, rawResponse: true });
            const blob = await res.blob();
            const cd = res.headers.get('Content-Disposition') || '';
            const m = /filename="([^"]+)"/.exec(cd);
            const filename = m ? m[1] : ('database_' + Date.now() + '.sql');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showFlash('已開始下載 ' + filename, false);
        } catch (err) {
            showFlash(err.message || '匯出失敗', true);
        } finally {
            btn.disabled = false;
        }
    });
})();
</script>
HTML,
]);
