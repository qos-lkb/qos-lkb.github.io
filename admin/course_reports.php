<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';
require_once dirname(__DIR__) . '/includes/adaptive_lib.php';
require_once dirname(__DIR__) . '/includes/learning_analytics_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('class.manage_own', '../login.php?next=' . rawurlencode('admin/course_reports.php'));

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

$summary = la_class_activity_summary($pdo, $id);
$weakTopics = adaptive_class_weak_topics($pdo, $id);
$students = adaptive_class_student_reports($pdo, $id);
$exportUrl = '../api/v1/teacher/classes/' . $id . '/report.csv';

admin_page_start('課程學習報告 — ' . (string) $class['name'], 'course_reports', [
    'actions' => admin_btn('courses.php', '返回課程列表', 'secondary')
        . admin_btn('course_worksheets.php?id=' . $id, '工作紙派發', 'secondary')
        . ' ' . admin_btn($exportUrl, '匯出 CSV', 'secondary'),
    'wide' => true,
]);
?>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">學生人數</p>
                <p class="text-2xl font-bold text-slate-900"><?php echo (int) $summary['total_students']; ?></p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">本週活躍</p>
                <p class="text-2xl font-bold text-indigo-600"><?php echo (int) $summary['active_students']; ?></p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">本週學習（分鐘）</p>
                <p class="text-2xl font-bold text-slate-900"><?php echo (int) $summary['minutes_week']; ?></p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">平均掌握度</p>
                <p class="text-2xl font-bold text-emerald-600"><?php echo htmlspecialchars((string) $summary['avg_mastery'], ENT_QUOTES, 'UTF-8'); ?>%</p>
            </div>
        </div>

        <?php if ($weakTopics !== []): ?>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <h2 class="font-bold text-amber-900 mb-2">全班薄弱課題 TOP <?php echo count($weakTopics); ?></h2>
            <ul class="text-sm text-amber-800 space-y-1">
                <?php foreach ($weakTopics as $wt): ?>
                <li><?php echo htmlspecialchars((string) $wt['name_zh'], ENT_QUOTES, 'UTF-8'); ?>
                    — 平均 <?php echo (float) $wt['avg_mastery']; ?>%（<?php echo (int) $wt['student_count']; ?> 人）</li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">學生</th>
                        <th class="p-3">平均掌握度</th>
                        <th class="p-3">本週分鐘</th>
                        <th class="p-3">最後上線</th>
                        <th class="p-3">最近測驗</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($students as $s): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3">
                            <span class="font-medium"><?php echo htmlspecialchars((string) $s['display_name'], ENT_QUOTES, 'UTF-8'); ?></span>
                            <span class="block text-xs text-slate-400"><?php echo htmlspecialchars((string) $s['email'], ENT_QUOTES, 'UTF-8'); ?></span>
                            <?php if (!empty($s['form_class']) || !empty($s['class_no'])): ?>
                            <span class="block text-xs text-slate-500"><?php
                                $fc = (string) ($s['form_class'] ?? '');
                                $cn = isset($s['class_no']) && $s['class_no'] !== null && $s['class_no'] !== '' ? (int) $s['class_no'] : 0;
                                echo htmlspecialchars(trim($fc . ($cn > 0 ? ' #' . $cn : '')), ENT_QUOTES, 'UTF-8');
                            ?></span>
                            <?php endif; ?>
                        </td>
                        <td class="p-3">
                            <?php
                            $m = (float) $s['avg_mastery'];
                            $cls = $m < 60 ? 'text-red-600' : ($m > 80 ? 'text-emerald-600' : 'text-amber-600');
                            ?>
                            <span class="<?php echo $cls; ?> font-medium"><?php echo $m; ?>%</span>
                        </td>
                        <td class="p-3"><?php echo (int) $s['minutes_week']; ?></td>
                        <td class="p-3 text-xs"><?php echo $s['last_active_at'] ? htmlspecialchars((string) $s['last_active_at'], ENT_QUOTES, 'UTF-8') : '—'; ?></td>
                        <td class="p-3">
                            <?php if ($s['last_attempt']): ?>
                            <?php echo (int) $s['last_attempt']['score']; ?>/<?php echo (int) $s['last_attempt']['max_score']; ?>
                            <?php else: ?>—<?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if ($students === []): ?>
                    <tr><td colspan="5" class="p-6 text-slate-500 text-center">尚無學生資料</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
<?php
admin_page_end();
