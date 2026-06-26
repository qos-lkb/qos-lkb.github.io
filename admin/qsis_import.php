<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/qsis_import_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';
require_once dirname(__DIR__) . '/includes/user_names_lib.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/qsis_import.php'));

$pdo = db();
$user = current_user();
assert($user !== null);

/** @var 'success'|'error'|null */
$flashType = null;
$flash = '';

$qsisConfigured = qsis_is_configured();
$connection = $qsisConfigured ? qsis_test_connection() : ['ok' => false, 'error' => '尚未設定 QSIS 資料庫。'];

$years = [];
$classes = [];
$selectedYearId = '';

if ($connection['ok']) {
    try {
        $qsis = qsis_db();
        $years = qsis_list_years($qsis);
        $selectedYearId = trim((string) ($_POST['year_id'] ?? $_GET['year_id'] ?? ''));
        if ($selectedYearId === '') {
            $selectedYearId = qsis_current_year_id($qsis) ?? ($years[0]['yearId'] ?? '');
        }
        if ($selectedYearId !== '') {
            $classes = qsis_list_classes($qsis, $selectedYearId);
        }
    } catch (Throwable $e) {
        $connection = ['ok' => false, 'error' => $e->getMessage()];
    }
}

$teachers = $pdo->query(
    "SELECT DISTINCT u.id, u.display_name, u.name_zh, u.name_en, u.email FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE r.name IN ('teacher', 'admin') AND u.is_active = 1
     ORDER BY u.display_name ASC"
)->fetchAll() ?: [];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $connection['ok']) {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $flashType = 'error';
        $flash = 'CSRF 驗證失敗。';
    } else {
        $action = (string) ($_POST['action'] ?? '');
        $classNames = isset($_POST['class_names']) && is_array($_POST['class_names'])
            ? array_values(array_filter(array_map('strval', $_POST['class_names']), static fn (string $c): bool => trim($c) !== ''))
            : [];

        if ($classNames === []) {
            $flashType = 'error';
            $flash = '請至少勾選一個班級。';
        } else {
        $options = [
            'year_id' => trim((string) ($_POST['year_id'] ?? '')),
            'class_names' => $classNames,
            'teacher_user_id' => (int) ($_POST['teacher_user_id'] ?? $user['id']),
            'default_password' => trim((string) ($_POST['default_password'] ?? '')),
            'enroll' => !empty($_POST['enroll']),
            'update_existing' => !empty($_POST['update_existing']),
        ];

        try {
            $qsis = qsis_db();
            if ($action === 'import_classes') {
                $result = qsis_import_classes($pdo, $qsis, $options, $user['id']);
                if ($result['ok']) {
                    $flashType = 'success';
                    $flash = sprintf(
                        '班級匯入完成：新建 %d、略過 %d（已存在）。',
                        (int) ($result['created'] ?? 0),
                        (int) ($result['skipped'] ?? 0)
                    );
                } else {
                    $flashType = 'error';
                    $flash = $result['error'] ?? '班級匯入失敗。';
                }
            } elseif ($action === 'import_students') {
                $result = qsis_import_students($pdo, $qsis, $options, $user['id']);
                if ($result['ok']) {
                    $flashType = 'success';
                    $flash = sprintf(
                        '學生匯入完成：新建 %d、更新 %d、略過 %d；加入班級 %d 人次。',
                        (int) ($result['created'] ?? 0),
                        (int) ($result['updated'] ?? 0),
                        (int) ($result['skipped'] ?? 0),
                        (int) ($result['enrolled'] ?? 0)
                    );
                } else {
                    $flashType = 'error';
                    $flash = $result['error'] ?? '學生匯入失敗。';
                }
            } elseif ($action === 'import_all') {
                $result = qsis_import_all($pdo, $qsis, $options, $user['id']);
                if ($result['ok']) {
                    $flashType = 'success';
                    $flash = sprintf(
                        '一鍵匯入完成：班級新建 %d（略過 %d）；學生新建 %d、更新 %d、略過 %d、加入班級 %d 人次。',
                        (int) ($result['classes_created'] ?? 0),
                        (int) ($result['classes_skipped'] ?? 0),
                        (int) ($result['students_created'] ?? 0),
                        (int) ($result['students_updated'] ?? 0),
                        (int) ($result['students_skipped'] ?? 0),
                        (int) ($result['students_enrolled'] ?? 0)
                    );
                } else {
                    $flashType = 'error';
                    $flash = $result['error'] ?? '匯入失敗。';
                }
            }

            if ($selectedYearId !== '') {
                $classes = qsis_list_classes($qsis, $selectedYearId);
            }
        } catch (Throwable $e) {
            $flashType = 'error';
            $flash = '匯入失敗：' . $e->getMessage();
        }
        }
    }
}

$emailDomain = config_qsis_student_email_domain();
$emailDomainDisplay = $emailDomain !== '' ? $emailDomain : 'student.qsis.local';

admin_page_start('QSIS 匯入', 'qsis_import', ['wide' => true]);
?>
        <?php if ($flash !== ''): ?>
            <p class="text-sm mb-4 <?php echo $flashType === 'success' ? 'text-emerald-700' : 'text-red-600'; ?>">
                <?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?>
            </p>
        <?php endif; ?>

        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <h2 class="text-lg font-bold text-slate-800 mb-2">QSIS 資料庫連線</h2>
            <?php if (!$qsisConfigured): ?>
                <p class="text-sm text-amber-700 mb-2">請在專案根目錄 <code class="text-xs bg-slate-100 px-1 rounded">.env</code> 設定 <code class="text-xs bg-slate-100 px-1 rounded">QSIS_DB_*</code> 變數（見 <code class="text-xs bg-slate-100 px-1 rounded">.env.example</code>）。</p>
            <?php elseif ($connection['ok']): ?>
                <p class="text-sm text-emerald-700">已連線至 QSIS 資料庫 <strong><?php echo htmlspecialchars((string) ($connection['database'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></strong>。</p>
            <?php else: ?>
                <p class="text-sm text-red-600">連線失敗：<?php echo htmlspecialchars((string) ($connection['error'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></p>
            <?php endif; ?>
            <p class="text-xs text-slate-500 mt-2">此連線為<strong>唯讀</strong>用途，僅從校本 QSIS 讀取學生與班級資料。</p>
        </div>

        <?php if ($connection['ok']): ?>
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <h2 class="text-lg font-bold text-slate-800 mb-4">匯入設定</h2>
            <form method="get" class="mb-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700">QSIS 學年</label>
                    <select name="year_id" class="mt-1 w-full sm:max-w-md border rounded-lg px-3 py-2" onchange="this.form.submit()">
                        <?php foreach ($years as $year): ?>
                        <option value="<?php echo htmlspecialchars($year['yearId'], ENT_QUOTES, 'UTF-8'); ?>"
                            <?php echo $selectedYearId === $year['yearId'] ? 'selected' : ''; ?>>
                            <?php
                            $label = $year['yearText'] !== ''
                                ? $year['yearText']
                                : ($year['yearFrom'] . '-' . $year['yearEnd']);
                            if ($year['thisYear']) {
                                $label .= '（本學年）';
                            }
                            echo htmlspecialchars($label . ' [' . $year['yearId'] . ']', ENT_QUOTES, 'UTF-8');
                            ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </form>

            <form method="post" class="space-y-4">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="year_id" value="<?php echo htmlspecialchars($selectedYearId, ENT_QUOTES, 'UTF-8'); ?>">
                <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700">預設導師（無法對應 QSIS 班主任時）</label>
                        <select name="teacher_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
                            <?php foreach ($teachers as $t): ?>
                            <option value="<?php echo (int) $t['id']; ?>" <?php echo (int) $t['id'] === (int) $user['id'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars(user_format_name($t) . ' (' . $t['email'] . ')', ENT_QUOTES, 'UTF-8'); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700">新學生預設密碼（選填，至少 8 字元）</label>
                        <input type="text" name="default_password" class="mt-1 w-full border rounded-lg px-3 py-2" placeholder="留空則自動產生隨機密碼">
                    </div>
                </div>
                <p class="text-xs text-slate-500 mt-3">
                    學生登入電郵格式：<code class="bg-slate-100 px-1 rounded">{學號}@<?php echo htmlspecialchars($emailDomainDisplay, ENT_QUOTES, 'UTF-8'); ?></code>
                    （可在 .env 設定 <code class="bg-slate-100 px-1 rounded">QSIS_STUDENT_EMAIL_DOMAIN</code>）
                </p>

            <div class="mt-6 pt-6 border-t border-slate-100">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 class="text-lg font-bold text-slate-800">QSIS 班級預覽</h2>
                    <label class="text-sm text-slate-600">
                        <input type="checkbox" id="select-all-classes" class="mr-1" checked> 全選
                    </label>
                </div>
                <?php if ($classes === []): ?>
                    <p class="text-sm text-slate-500">此學年沒有在學班級資料。</p>
                <?php else: ?>
                <div class="overflow-x-auto mb-4">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3 w-10"></th>
                                <th class="p-3">班別</th>
                                <th class="p-3">學生人數</th>
                                <th class="p-3">QSIS 班主任</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($classes as $classRow): ?>
                            <tr class="border-t border-slate-100">
                                <td class="p-3">
                                    <input type="checkbox" name="class_names[]" value="<?php echo htmlspecialchars((string) $classRow['class'], ENT_QUOTES, 'UTF-8'); ?>" class="class-checkbox" checked>
                                </td>
                                <td class="p-3 font-medium"><?php echo htmlspecialchars((string) $classRow['class'], ENT_QUOTES, 'UTF-8'); ?></td>
                                <td class="p-3"><?php echo (int) $classRow['student_count']; ?></td>
                                <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars((string) ($classRow['teacher_id'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>

                <div class="flex flex-wrap gap-3 items-center">
                    <button type="submit" name="action" value="import_all" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">
                        一鍵匯入班級＋學生
                    </button>
                    <button type="submit" name="action" value="import_classes" class="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800">
                        只匯入班級
                    </button>
                    <button type="submit" name="action" value="import_students" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
                        只匯入學生
                    </button>
                </div>

                <div class="mt-4 space-y-2 text-sm text-slate-600">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="enroll" value="1" checked>
                        匯入學生時自動加入對應本地班級（須先匯入或已存在同名班級）
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="update_existing" value="1">
                        更新已存在學生的中英文名（依 QSIS 資料）
                    </label>
                </div>
            </div>
            </form>
        </div>
        <?php endif; ?>

        <div class="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
            <h3 class="font-semibold text-slate-800 mb-2">說明</h3>
            <ul class="list-disc pl-5 space-y-1">
                <li>班級名稱沿用 QSIS 行政班代碼（如 1A、2B），學年取自 QSIS <code class="text-xs bg-white px-1 rounded">setting_year</code>。</li>
                <li>班主任會嘗試以 QSIS 教師代碼對應本地教師帳戶（電郵前綴或顯示名稱）；對應失敗則使用上方「預設導師」。</li>
                <li>已存在同名同學年班級或同電郵／學號學生會略過，不會覆寫密碼。</li>
                <li>匯入後可至 <a href="classes.php" class="text-indigo-600 underline">班級管理</a> 檢視邀請碼與名單。</li>
            </ul>
        </div>
<?php
admin_page_end([
    'scripts' => <<<'HTML'
<script>
document.addEventListener('DOMContentLoaded', function () {
    var master = document.getElementById('select-all-classes');
    var boxes = document.querySelectorAll('.class-checkbox');
    if (!master || !boxes.length) return;
    master.addEventListener('change', function () {
        boxes.forEach(function (cb) { cb.checked = master.checked; });
    });
});
</script>
HTML,
]);
?>
