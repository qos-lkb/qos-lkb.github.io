<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';
require_once dirname(__DIR__) . '/includes/user_names_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('class.manage_own', '../login.php?next=' . rawurlencode('admin/course_students.php'));

$pdo = db();
$user = current_user();
assert($user !== null);

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    header('Location: courses.php');
    exit;
}

$class = classes_fetch_by_id($pdo, $id);
if ($class === null || !classes_can_manage($pdo, $class, $user)) {
    http_response_code(403);
    exit('沒有權限。');
}

$canEdit = classes_can_edit_students($pdo, $user);
$error = '';
$flash = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $error = 'CSRF 驗證失敗。';
    } elseif (!$canEdit) {
        $error = '只有管理員可以編輯班內學生與修讀語言。';
    } else {
        $action = (string) ($_POST['action'] ?? '');
        if ($action === 'save_rows') {
            $raw = $_POST['students'] ?? [];
            $rows = [];
            if (is_array($raw)) {
                foreach ($raw as $uid => $fields) {
                    if (!is_array($fields)) {
                        continue;
                    }
                    $rows[] = [
                        'user_id' => (int) $uid,
                        'form_class' => (string) ($fields['form_class'] ?? ''),
                        'class_no' => (string) ($fields['class_no'] ?? ''),
                        'moi' => (string) ($fields['moi'] ?? ''),
                    ];
                }
            }
            $r = classes_save_students_enrollments_batch($pdo, $id, $rows, $user);
            if ($r['ok']) {
                $flash = '已更新 ' . (int) ($r['updated'] ?? 0) . ' 位學生。';
            } else {
                $error = $r['error'] ?? '儲存失敗。';
            }
        } elseif ($action === 'enroll') {
            $emails = preg_split('/[\s,;]+/', (string) ($_POST['emails'] ?? '')) ?: [];
            $r = classes_enroll_users($pdo, $id, $emails, $user);
            if ($r['ok']) {
                $flash = '已加入 ' . (int) ($r['enrolled'] ?? 0) . ' 位學生。';
            } else {
                $error = $r['error'] ?? '加入失敗。';
            }
        } elseif ($action === 'remove') {
            $studentId = (int) ($_POST['user_id'] ?? 0);
            $r = classes_remove_student_from_class($pdo, $id, $studentId, $user);
            if ($r['ok']) {
                $flash = '已移出學生。';
            } else {
                $error = $r['error'] ?? '移出失敗。';
            }
        }
    }
}

$students = classes_students_in_class($pdo, $id);
$formLabel = classes_form_level_label(isset($class['form_level']) ? (string) $class['form_level'] : null);
$subjectLabel = classes_course_subject_label(isset($class['course_subject']) ? (string) $class['course_subject'] : null);

admin_page_start('學生與修讀語言 — ' . (string) $class['name'], 'courses', [
    'actions' => admin_btn('courses.php', '返回課程列表', 'secondary')
        . admin_btn('course_edit.php?id=' . $id, '編輯課程', 'secondary')
        . admin_btn('course_summer_homework.php?id=' . $id, '暑期功課', 'secondary')
        . admin_btn('course_reports.php?id=' . $id, '學習報告', 'secondary'),
    'wide' => true,
    'subtitle' => trim($formLabel . ' · ' . $subjectLabel . ' · ' . (string) ($class['school_year'] ?? '')),
]);
?>
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm mb-4"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php if ($flash !== ''): ?>
            <p class="text-emerald-700 text-sm mb-4"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>

        <?php if (!$canEdit): ?>
            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                此頁僅供檢視。班內學生、班別、班號與修讀語言（MOI）由<strong>管理員</strong>編輯。
            </div>
        <?php endif; ?>

        <?php if ($canEdit): ?>
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
            <h2 class="font-bold text-slate-800 mb-3">加入學生（帳戶名稱）</h2>
            <form method="post" class="space-y-3">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="action" value="enroll">
                <textarea name="emails" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="多個帳戶名以逗號或換行分隔（須已存在；如 s20171060）"></textarea>
                <button type="submit" class="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm">加入課程</button>
            </form>
        </div>
        <?php endif; ?>

        <form method="post">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="action" value="save_rows">
            <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                    <h2 class="font-bold text-slate-800">學生名單（<?php echo count($students); ?>）</h2>
                    <?php if ($canEdit): ?>
                    <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">儲存班別／班號／修讀語言</button>
                    <?php endif; ?>
                </div>
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-left">
                        <tr>
                            <th class="p-3">姓名</th>
                            <th class="p-3">帳戶</th>
                            <th class="p-3">學號</th>
                            <th class="p-3">班別</th>
                            <th class="p-3">班號</th>
                            <th class="p-3">修讀語言（MOI）</th>
                            <?php if ($canEdit): ?>
                            <th class="p-3">操作</th>
                            <?php endif; ?>
                        </tr>
                    </thead>
                    <tbody>
                    <?php foreach ($students as $s):
                        $uid = (int) $s['id'];
                        $moi = classes_normalize_moi($s['moi'] ?? null);
                        ?>
                        <tr class="border-t border-slate-100 align-middle">
                            <td class="p-3">
                                <div class="font-medium"><?php echo htmlspecialchars(user_format_name($s), ENT_QUOTES, 'UTF-8'); ?></div>
                                <div class="text-xs text-slate-500">
                                    <?php echo htmlspecialchars(trim((string) ($s['name_zh'] ?? '') . ' / ' . (string) ($s['name_en'] ?? ''), ' /'), ENT_QUOTES, 'UTF-8'); ?>
                                </div>
                            </td>
                            <td class="p-3"><?php echo htmlspecialchars((string) $s['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td class="p-3"><?php echo htmlspecialchars((string) ($s['student_number'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                            <?php if ($canEdit): ?>
                            <td class="p-3">
                                <input type="text" name="students[<?php echo $uid; ?>][form_class]"
                                    value="<?php echo htmlspecialchars((string) ($s['form_class'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>"
                                    class="w-24 border rounded-lg px-2 py-1.5" maxlength="32" placeholder="如 1A">
                            </td>
                            <td class="p-3">
                                <input type="number" name="students[<?php echo $uid; ?>][class_no]"
                                    value="<?php echo isset($s['class_no']) && $s['class_no'] !== null && $s['class_no'] !== '' ? (int) $s['class_no'] : ''; ?>"
                                    class="w-20 border rounded-lg px-2 py-1.5" min="1" max="99" placeholder="—">
                            </td>
                            <td class="p-3">
                                <select name="students[<?php echo $uid; ?>][moi]" class="border rounded-lg px-2 py-1.5">
                                    <option value="" <?php echo $moi === null ? 'selected' : ''; ?>>—</option>
                                    <option value="E" <?php echo $moi === 'E' ? 'selected' : ''; ?>>英文 (E)</option>
                                    <option value="C" <?php echo $moi === 'C' ? 'selected' : ''; ?>>中文 (C)</option>
                                </select>
                            </td>
                            <td class="p-3 whitespace-nowrap">
                                <button type="submit" form="remove-<?php echo $uid; ?>"
                                    class="text-red-600 hover:underline text-xs"
                                    onclick="return confirm('確定將此學生移出本課程？');">移出</button>
                            </td>
                            <?php else: ?>
                            <td class="p-3"><?php echo htmlspecialchars((string) ($s['form_class'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                            <td class="p-3"><?php echo isset($s['class_no']) && $s['class_no'] !== null && $s['class_no'] !== '' ? (int) $s['class_no'] : '—'; ?></td>
                            <td class="p-3"><?php echo $moi ? htmlspecialchars(classes_moi_display($moi), ENT_QUOTES, 'UTF-8') : '—'; ?></td>
                            <?php endif; ?>
                        </tr>
                    <?php endforeach; ?>
                    <?php if ($students === []): ?>
                        <tr>
                            <td colspan="<?php echo $canEdit ? 7 : 6; ?>" class="p-6 text-slate-500 text-center">尚無學生</td>
                        </tr>
                    <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </form>

        <?php if ($canEdit): ?>
            <?php foreach ($students as $s):
                $uid = (int) $s['id'];
                ?>
            <form method="post" id="remove-<?php echo $uid; ?>" class="hidden">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="action" value="remove">
                <input type="hidden" name="user_id" value="<?php echo $uid; ?>">
            </form>
            <?php endforeach; ?>
        <?php endif; ?>
<?php
admin_page_end();
