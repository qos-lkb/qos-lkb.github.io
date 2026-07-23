<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';
require_once dirname(__DIR__) . '/includes/user_names_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('class.manage_own', '../login.php?next=' . rawurlencode('admin/course_edit.php'));

$pdo = db();
$acting = current_user();
assert($acting !== null);
$canAny = user_has_permission('class.manage_any');

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$row = null;
$students = [];
if ($id > 0) {
    $row = classes_fetch_by_id($pdo, $id);
    if (!$row || !classes_can_manage($pdo, $row, $acting)) {
        http_response_code(403);
        exit('沒有權限。');
    }
    $students = classes_students_in_class($pdo, $id);
}

$teachers = [];
if ($canAny) {
    $teachers = $pdo->query(
        "SELECT DISTINCT u.id, u.name_zh, u.name_en, u.display_name FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.name IN ('teacher', 'admin') AND u.is_active = 1
         ORDER BY u.display_name"
    )->fetchAll() ?: [];
}

$formLevelOptions = classes_form_level_options();
$courseSubjectOptions = classes_course_subject_options();
$hasFormSubjectCols = classes_has_form_subject_columns($pdo);
$error = '';
$inviteFlash = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? 'save');
    if ($action === 'delete' && $id > 0 && $row) {
        $r = classes_delete($pdo, $_POST, $acting);
        if ($r['ok']) {
            header('Location: courses.php');
            exit;
        }
        $error = $r['error'] ?? '刪除失敗';
    } elseif ($action === 'reset_invite' && $id > 0 && $row) {
        if (!verify_csrf($_POST['csrf'] ?? null)) {
            $error = 'CSRF 驗證失敗。';
        } else {
            $r = classes_reset_invite_code($pdo, $id, $acting);
            if ($r['ok']) {
                $inviteFlash = '新邀請碼：' . ($r['invite_code'] ?? '');
                $row = classes_fetch_by_id($pdo, $id);
            } else {
                $error = $r['error'] ?? '重設失敗';
            }
        }
    } elseif ($action === 'enroll' && $id > 0) {
        if (!verify_csrf($_POST['csrf'] ?? null)) {
            $error = 'CSRF 驗證失敗。';
        } elseif (!classes_can_edit_students($pdo, $acting)) {
            $error = '只有管理員可以編輯班內學生。請前往「學生與修讀語言」頁面（管理員）。';
        } else {
            $emails = preg_split('/[\s,;]+/', (string) ($_POST['emails'] ?? '')) ?: [];
            $r = classes_enroll_users($pdo, $id, $emails, $acting);
            if ($r['ok']) {
                $inviteFlash = '已加入 ' . (int) ($r['enrolled'] ?? 0) . ' 位學生。';
                $students = classes_students_in_class($pdo, $id);
            } else {
                $error = $r['error'] ?? '加入失敗';
            }
        }
    } else {
        $res = classes_save_from_post($pdo, $_POST, $acting['id']);
        if ($res['ok']) {
            header('Location: course_edit.php?id=' . (int) $res['id']);
            exit;
        }
        $error = $res['error'] ?? '儲存失敗';
        $row = [
            'id' => (int) ($_POST['id'] ?? 0),
            'name' => $_POST['name'] ?? '',
            'school_year' => $_POST['school_year'] ?? '',
            'form_level' => $_POST['form_level'] ?? null,
            'course_subject' => $_POST['course_subject'] ?? null,
            'subject_id' => $_POST['subject_id'] ?? null,
            'teacher_user_id' => (int) ($_POST['teacher_user_id'] ?? $acting['id']),
            'is_active' => isset($_POST['is_active']) ? 1 : 0,
            'invite_code' => $row['invite_code'] ?? '',
        ];
    }
}

admin_page_start($id ? '編輯課程' : '新增課程', 'courses', [
    'actions' => admin_btn('courses.php', '返回列表', 'secondary')
        . ($id
            ? admin_btn('course_students.php?id=' . $id, '學生與修讀語言', 'secondary')
                . admin_btn('course_reports.php?id=' . $id, '學習報告', 'secondary')
                . admin_btn('course_summer_homework.php?id=' . $id, '暑期功課', 'secondary')
                . admin_btn('course_worksheets.php?id=' . $id, '工作紙派發', 'secondary')
            : ''),
]);
?>
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php if (!$hasFormSubjectCols): ?>
            <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                資料庫尚未加入年級／科目欄位，儲存會失敗。請先執行
                <code class="font-mono text-xs">mysql … &lt; schema_classes_form_subject.sql</code>
            </div>
        <?php endif; ?>
        <?php if ($inviteFlash !== ''): ?>
            <p class="text-emerald-700 text-sm"><?php echo htmlspecialchars($inviteFlash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>

        <form method="post" class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm mb-8">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="id" value="<?php echo (int) ($row['id'] ?? 0); ?>">
            <div>
                <label class="block text-sm font-medium text-slate-700">課程名稱</label>
                <input type="text" name="name" required value="<?php echo htmlspecialchars((string) ($row['name'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">學年</label>
                <input type="text" name="school_year" value="<?php echo htmlspecialchars((string) ($row['school_year'] ?? date('Y') . '-' . (date('Y') + 1)), ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2" placeholder="2025-2026">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700">年級 <span class="text-red-500">*</span></label>
                    <select name="form_level" required class="mt-1 w-full border rounded-lg px-3 py-2">
                        <option value="">請選擇</option>
                        <?php foreach ($formLevelOptions as $val => $label): ?>
                        <option value="<?php echo htmlspecialchars($val, ENT_QUOTES, 'UTF-8'); ?>"
                            <?php echo (string) ($row['form_level'] ?? '') === (string) $val ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">科目 <span class="text-red-500">*</span></label>
                    <select name="course_subject" required class="mt-1 w-full border rounded-lg px-3 py-2">
                        <option value="">請選擇</option>
                        <?php foreach ($courseSubjectOptions as $val => $label): ?>
                        <option value="<?php echo htmlspecialchars($val, ENT_QUOTES, 'UTF-8'); ?>"
                            <?php echo (string) ($row['course_subject'] ?? '') === (string) $val ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <?php if ($canAny): ?>
            <div>
                <label class="block text-sm font-medium text-slate-700">任教老師</label>
                <select name="teacher_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
                    <?php foreach ($teachers as $t): ?>
                    <option value="<?php echo (int) $t['id']; ?>" <?php echo (int) ($row['teacher_user_id'] ?? $acting['id']) === (int) $t['id'] ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars(user_format_name($t), ENT_QUOTES, 'UTF-8'); ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php else: ?>
            <input type="hidden" name="teacher_user_id" value="<?php echo (int) $acting['id']; ?>">
            <?php endif; ?>
            <div class="flex items-center gap-2">
                <input type="checkbox" name="is_active" id="is_active" value="1" <?php echo !isset($row['is_active']) || (int) $row['is_active'] ? 'checked' : ''; ?>>
                <label for="is_active" class="text-sm text-slate-700">啟用</label>
            </div>
            <?php if ($id > 0 && !empty($row['invite_code'])): ?>
            <p class="text-sm text-slate-600">邀請碼：<code class="bg-slate-100 px-2 py-1 rounded"><?php echo htmlspecialchars((string) $row['invite_code'], ENT_QUOTES, 'UTF-8'); ?></code></p>
            <?php endif; ?>
            <div class="flex flex-wrap items-center gap-3">
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
                <?php if ($id > 0 && $row): ?>
                <button type="submit" name="action" value="delete" class="text-red-600 hover:underline text-sm" onclick="return confirm('確定刪除此課程？學生選課紀錄將一併移除。');">刪除課程</button>
                <?php endif; ?>
            </div>
        </form>

        <?php if ($id > 0 && $row): ?>
        <?php $canEditStudents = classes_can_edit_students($pdo, $acting); ?>
        <form method="post" class="inline mb-8">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="action" value="reset_invite">
            <button type="submit" class="text-sm text-indigo-600 hover:underline" onclick="return confirm('重設邀請碼？舊碼將失效。');">重設邀請碼</button>
        </form>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-4">
            <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                <h2 class="font-bold text-slate-800">學生名單（<?php echo count($students); ?>）</h2>
                <a href="course_students.php?id=<?php echo (int) $id; ?>" class="text-sm text-indigo-600 hover:underline">
                    <?php echo $canEditStudents ? '編輯學生與修讀語言' : '查看學生與修讀語言'; ?>
                </a>
            </div>
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">中文名</th>
                        <th class="p-3">英文名</th>
                        <th class="p-3">電郵</th>
                        <th class="p-3">學號</th>
                        <th class="p-3">班別</th>
                        <th class="p-3">班號</th>
                        <th class="p-3">MOI</th>
                        <th class="p-3">加入日期</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($students as $s): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3"><?php echo htmlspecialchars((string) ($s['name_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) ($s['name_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) $s['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) ($s['student_number'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) ($s['form_class'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo isset($s['class_no']) && $s['class_no'] !== null && $s['class_no'] !== '' ? (int) $s['class_no'] : '—'; ?></td>
                        <td class="p-3"><?php
                            $moi = classes_normalize_moi($s['moi'] ?? null);
                            echo $moi ? htmlspecialchars(classes_moi_display($moi), ENT_QUOTES, 'UTF-8') : '—';
                        ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) ($s['joined_at'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if ($students === []): ?>
                    <tr><td colspan="8" class="p-6 text-slate-500 text-center">尚無學生</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php if (!$canEditStudents): ?>
            <p class="text-sm text-slate-500 mb-8">加入／移出學生與修改修讀語言僅限管理員操作。</p>
        <?php endif; ?>
        <?php endif; ?>
<?php
admin_page_end();
