<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('class.manage_own', '../login.php?next=' . rawurlencode('admin/classes.php'));

$pdo = db();
$user = current_user();
assert($user !== null);
$canAny = user_has_permission('class.manage_any');

$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'import_csv') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $flash = 'CSRF 驗證失敗。';
    } else {
        $classId = (int) ($_POST['class_id'] ?? 0);
        $csv = (string) ($_POST['csv_content'] ?? '');
        $r = classes_import_students_csv($pdo, $csv, $classId, $user);
        $flash = $r['ok']
            ? '已匯入，新建 ' . (int) ($r['created'] ?? 0) . ' 個帳戶。'
            : ($r['error'] ?? '匯入失敗');
    }
}

$rows = classes_list_for_teacher($pdo, $user['id'], $canAny);

admin_page_start('班級管理', 'classes', [
    'actions' => admin_btn('class_edit.php', '新增班級'),
    'wide' => true,
]);
?>
        <?php if ($flash !== ''): ?>
            <p class="text-sm text-slate-700 mb-4"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">班級</th>
                        <th class="p-3">學年</th>
                        <th class="p-3">導師</th>
                        <th class="p-3">學生人數</th>
                        <th class="p-3">邀請碼</th>
                        <th class="p-3">狀態</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rows as $r): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3 font-medium"><?php echo htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) ($r['school_year'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) ($r['teacher_name'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo (int) ($r['student_count'] ?? 0); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars((string) ($r['invite_code'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo (int) $r['is_active'] ? '啟用' : '停用'; ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <a href="class_edit.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline">編輯</a>
                            <a href="class_reports.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline ml-2">報告</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if ($rows === []): ?>
                    <tr><td colspan="7" class="p-6 text-slate-500 text-center">尚無班級</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <?php if ($rows !== []): ?>
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-800 mb-2">批次匯入學生（CSV）</h2>
            <p class="text-sm text-slate-500 mb-4">格式：email, display_name, password（密碼可留空自動產生）</p>
            <form method="post" class="space-y-4">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="action" value="import_csv">
                <div>
                    <label class="block text-sm font-medium text-slate-700">目標班級</label>
                    <select name="class_id" required class="mt-1 w-full border rounded-lg px-3 py-2">
                        <?php foreach ($rows as $r): ?>
                        <option value="<?php echo (int) $r['id']; ?>"><?php echo htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8'); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">CSV 內容</label>
                    <textarea name="csv_content" rows="6" required class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="email,display_name,password&#10;student@example.com,陳小明,"></textarea>
                </div>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">匯入</button>
            </form>
        </div>
        <?php endif; ?>
<?php
admin_page_end();
