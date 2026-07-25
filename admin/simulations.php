<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulation_save.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('simulation.manage_any', '../login.php?next=' . rawurlencode('admin/simulations.php'));

$pdo = db();
$u = current_user();
assert($u !== null);

$list = $pdo->query(
    'SELECT s.id, s.slug, s.title_zh, s.title_en, s.status, s.updated_at, s.list_sort_order,
            sub.name_zh AS subject_zh, sub.name_en AS subject_en,
            t.name_zh AS topic_zh, t.name_en AS topic_en,
            u.email AS owner_email
     FROM simulations s
     LEFT JOIN users u ON u.id = s.owner_user_id
     LEFT JOIN subjects sub ON sub.id = s.subject_id
     LEFT JOIN topics t ON t.id = s.topic_id
     ORDER BY COALESCE(sub.sort_order, 999999) ASC, sub.name_en ASC,
              COALESCE(t.sort_order, 999999) ASC, t.name_en ASC,
              s.list_sort_order ASC, s.updated_at DESC'
)->fetchAll() ?: [];

admin_page_start('模擬程式', 'simulations', [
    'actions' => admin_btn('simulation_edit.php', '新增'),
    'wide' => true,
]);
?>
        <p id="sims-flash" class="text-sm mb-3 hidden"></p>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">標題</th>
                        <th class="p-3">slug</th>
                        <th class="p-3">科目</th>
                        <th class="p-3">單元</th>
                        <th class="p-3">列表排序</th>
                        <th class="p-3">擁有者</th>
                        <th class="p-3">狀態</th>
                        <th class="p-3">更新</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($list as $row): ?>
                    <tr class="border-t border-slate-100" data-sim-id="<?php echo (int) $row['id']; ?>">
                        <td class="p-3"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs text-slate-600"><?php
                            $szh = trim((string) ($row['subject_zh'] ?? ''));
                            $sen = trim((string) ($row['subject_en'] ?? ''));
                            $sout = ($szh === '' && $sen === '') ? '—' : ($szh === '' ? $sen : ($sen !== '' ? $szh . ' / ' . $sen : $szh));
                            echo htmlspecialchars($sout, ENT_QUOTES, 'UTF-8');
                        ?></td>
                        <td class="p-3 text-xs text-slate-600"><?php
                            $tzh = trim((string) ($row['topic_zh'] ?? ''));
                            $ten = trim((string) ($row['topic_en'] ?? ''));
                            $tout = ($tzh === '' && $ten === '') ? '—' : ($tzh === '' ? $ten : ($ten !== '' ? $tzh . ' / ' . $ten : $tzh));
                            echo htmlspecialchars($tout, ENT_QUOTES, 'UTF-8');
                        ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo (int) ($row['list_sort_order'] ?? 0); ?></td>
                        <td class="p-3 text-xs"><?php echo htmlspecialchars((string) $row['owner_email'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars($row['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-slate-500"><?php echo htmlspecialchars($row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <a href="simulation_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600 hover:underline">編輯</a>
                            <button type="button" class="sim-delete-btn text-red-600 hover:underline ml-2" data-id="<?php echo (int) $row['id']; ?>">刪除</button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
<?php
admin_page_end([
    'scripts' => <<<'HTML'
<script src="../assets/js/admin-api.js"></script>
<script>
(async function () {
    const flash = document.getElementById('sims-flash');
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
        return;
    }
    document.querySelectorAll('.sim-delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id') || '0', 10);
            if (!id || !confirm('確定刪除？')) return;
            try {
                await AdminApi.apiFetch('/admin/simulations', { method: 'DELETE', body: { id } });
                const row = btn.closest('tr');
                if (row) row.remove();
                showFlash('已刪除。', false);
            } catch (err) {
                showFlash(err.message || '刪除失敗', true);
            }
        });
    });
})();
</script>
HTML,
]);
