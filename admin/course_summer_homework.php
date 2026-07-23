<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';
require_once dirname(__DIR__) . '/includes/summer_homework_lib.php';
require_once dirname(__DIR__) . '/includes/user_names_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('class.manage_own', '../login.php?next=' . rawurlencode('admin/course_summer_homework.php'));

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

$report = sh_class_report($pdo, $id);
$items = $report['items'];
$students = $report['students'];
$rows = $report['rows'];
$message = $report['message'] ?? null;

/** @var array<string, array<int, array<string, mixed>>> $byStudent */
$byStudent = [];
foreach ($rows as $r) {
    $uid = (int) $r['student_user_id'];
    $iid = (int) $r['item_id'];
    if (!isset($byStudent[$uid])) {
        $byStudent[$uid] = [];
    }
    $byStudent[$uid][$iid] = $r;
}

$statusClass = [
    'on_time' => 'bg-sky-100 text-sky-900',
    'late' => 'bg-orange-100 text-orange-900',
    'missing' => 'bg-slate-100 text-slate-600',
];

admin_page_start('暑期功課紀錄 — ' . (string) $class['name'], 'courses', [
    'actions' => admin_btn('courses.php', '返回課程列表', 'secondary')
        . admin_btn('course_students.php?id=' . $id, '學生與修讀語言', 'secondary')
        . admin_btn('course_reports.php?id=' . $id, '學習報告', 'secondary')
        . admin_btn('course_worksheets.php?id=' . $id, '工作紙派發', 'secondary'),
    'wide' => true,
    'subtitle' => trim(
        ($report['class']['form_level_label'] ?? '—')
        . ' · '
        . ($report['class']['course_subject_label'] ?? '—')
        . ' · 準時／遲交以最高分那次呈交時間判斷；點標題可檢視內容與答案'
    ),
]);
?>
        <?php if ($message): ?>
            <div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <?php echo htmlspecialchars((string) $message, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <?php if ($items !== [] && $students !== []): ?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3 sticky left-0 bg-slate-100 z-10">學生</th>
                        <?php foreach ($items as $item): ?>
                        <th class="p-3 min-w-[11rem]">
                            <div class="font-semibold">
                                <a class="text-indigo-700 hover:underline" href="summer_homework_view.php?id=<?php echo (int) $item['id']; ?>" title="檢視內容、題目與答案">
                                    <?php echo htmlspecialchars((string) ($item['title_zh'] ?: $item['title_en']), ENT_QUOTES, 'UTF-8'); ?>
                                </a>
                            </div>
                            <div class="text-xs font-normal text-slate-500 mt-0.5">
                                <?php if (!empty($item['due_at'])): ?>
                                    截止 <?php echo htmlspecialchars(substr((string) $item['due_at'], 0, 16), ENT_QUOTES, 'UTF-8'); ?>
                                <?php else: ?>
                                    無截止
                                <?php endif; ?>
                            </div>
                            <a class="text-xs text-indigo-600 hover:underline mt-1 inline-block" href="summer_homework_analytics.php?id=<?php echo (int) $item['id']; ?>">分析</a>
                        </th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($students as $stu):
                    $uid = (int) ($stu['id'] ?? $stu['user_id'] ?? 0);
                    $name = user_format_name($stu);
                    ?>
                    <tr class="border-t border-slate-100 align-top">
                        <td class="p-3 sticky left-0 bg-white font-medium whitespace-nowrap">
                            <?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?>
                            <div class="text-xs text-slate-500 font-normal"><?php echo htmlspecialchars((string) ($stu['email'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></div>
                        </td>
                        <?php foreach ($items as $item):
                            $iid = (int) $item['id'];
                            $cell = $byStudent[$uid][$iid] ?? null;
                            if ($cell === null) {
                                echo '<td class="p-3 text-slate-400">—</td>';
                                continue;
                            }
                            $st = (string) $cell['status'];
                            $badge = $statusClass[$st] ?? $statusClass['missing'];
                            ?>
                            <td class="p-3">
                                <span class="inline-block text-xs px-2 py-0.5 rounded-full <?php echo $badge; ?>">
                                    <?php echo htmlspecialchars((string) $cell['status_label'], ENT_QUOTES, 'UTF-8'); ?>
                                </span>
                                <?php if ($cell['attempts'] > 0): ?>
                                    <div class="mt-1.5 text-slate-800">
                                        <?php echo htmlspecialchars((string) $cell['percent'], ENT_QUOTES, 'UTF-8'); ?>%
                                        <?php if ($cell['score'] !== null): ?>
                                            <span class="text-slate-500 text-xs">（<?php echo htmlspecialchars((string) $cell['score'], ENT_QUOTES, 'UTF-8'); ?>/<?php echo htmlspecialchars((string) $cell['max_score'], ENT_QUOTES, 'UTF-8'); ?>）</span>
                                        <?php endif; ?>
                                    </div>
                                    <div class="text-xs text-slate-500 mt-0.5">
                                        <?php echo $cell['best_submitted_at']
                                            ? htmlspecialchars(substr((string) $cell['best_submitted_at'], 0, 16), ENT_QUOTES, 'UTF-8')
                                            : '—'; ?>
                                        · <a class="text-indigo-600 hover:underline" href="summer_homework_analytics.php?id=<?php echo $iid; ?>&amp;user_id=<?php echo $uid; ?>"><?php echo (int) $cell['attempts']; ?> 次</a>
                                        <?php if (!empty($cell['passed'])): ?> · 及格<?php endif; ?>
                                    </div>
                                <?php else: ?>
                                    <div class="mt-1.5 text-xs text-slate-400">尚未呈交</div>
                                <?php endif; ?>
                            </td>
                        <?php endforeach; ?>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php elseif ($items === [] && !$message): ?>
            <p class="text-slate-500 text-sm">尚無習作資料。</p>
        <?php elseif ($students === [] && $items !== []): ?>
            <p class="text-slate-500 text-sm">此課程尚無在籍學生。</p>
        <?php endif; ?>
<?php
admin_page_end();
