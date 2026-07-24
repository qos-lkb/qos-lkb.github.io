<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/summer_homework_lib.php';
require_once dirname(__DIR__) . '/includes/user_names_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
if (!sh_can_review(current_user())) {
    require_permission('summer_homework.manage_own', '../login.php?next=' . rawurlencode('admin/summer_homework_analytics.php'));
}

$pdo = db();
$user = current_user();
assert($user !== null);

$itemId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$filterUserId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
$attemptId = isset($_GET['attempt_id']) ? (int) $_GET['attempt_id'] : 0;

if ($itemId <= 0) {
    header('Location: summer_homework.php');
    exit;
}

$item = sh_get_by_id($pdo, $itemId);
if ($item === null || !sh_can_review_item($user, $item)) {
    http_response_code(403);
    exit('沒有權限。');
}

$canManage = sh_can_manage_row($user, $item);
$title = (string) ($item['title_zh'] ?: $item['title_en']);
$formLabel = ((string) $item['form_level'] === '2') ? '中二' : '中一';
$analytics = sh_item_attempt_analytics($pdo, $itemId);
$students = sh_student_summaries_for_item($pdo, $itemId);
$questions = sh_fetch_questions($pdo, $itemId, true);
/** @var array<int, array<string, mixed>> $qById */
$qById = [];
foreach ($questions as $q) {
    $qById[(int) $q['id']] = $q;
}

$studentAttempts = $filterUserId > 0
    ? sh_list_attempts_for_item($pdo, $itemId, $filterUserId)
    : [];

$selectedAttempt = null;
if ($attemptId > 0) {
    foreach (($filterUserId > 0 ? $studentAttempts : sh_list_attempts_for_item($pdo, $itemId)) as $a) {
        if ((int) $a['id'] === $attemptId) {
            $selectedAttempt = $a;
            break;
        }
    }
}

$filterStudentName = '';
if ($filterUserId > 0) {
    foreach ($students as $s) {
        if ((int) $s['user_id'] === $filterUserId) {
            $filterStudentName = (string) $s['display_name'];
            break;
        }
    }
}

admin_page_start('呈交分析 — ' . $title, 'summer_homework', [
    'actions' => admin_btn('summer_homework.php', '返回列表', 'secondary')
        . admin_btn('summer_homework_view.php?id=' . $itemId, '內容／答案', 'secondary')
        . ($canManage ? admin_btn('summer_homework_edit.php?id=' . $itemId, '編輯習作', 'secondary') : '')
        . ($filterUserId > 0
            ? admin_btn('summer_homework_analytics.php?id=' . $itemId, '清除學生篩選', 'secondary')
            : ''),
    'wide' => true,
    'subtitle' => $formLabel . ' · 每次呈交均保留；此頁顯示統計與詳細作答',
]);
?>
        <?php if (!$analytics['grading_json_available']): ?>
            <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                資料庫尚未加入 <code class="font-mono text-xs">grading_json</code>，錯題率統計可能不完整。請執行
                <code class="font-mono text-xs">schema_summer_homework_grading.sql</code>。
            </div>
        <?php endif; ?>
        <?php if (!sh_table_has_column($pdo, 'summer_homework_questions', 'correct_bool')): ?>
            <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                新題型欄位尚未升級。請執行
                <code class="font-mono text-xs">schema_summer_homework_qtypes.sql</code>
                （是非／短答／長答、教師評分）。
            </div>
        <?php endif; ?>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">總呈交次數</p>
                <p class="text-2xl font-bold text-slate-900"><?php echo (int) $analytics['total_attempts']; ?></p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">作答學生數</p>
                <p class="text-2xl font-bold text-indigo-600"><?php echo (int) $analytics['distinct_students']; ?></p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">人均呈交</p>
                <p class="text-2xl font-bold text-slate-900"><?php echo htmlspecialchars((string) $analytics['avg_attempts_per_student'], ENT_QUOTES, 'UTF-8'); ?></p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p class="text-xs text-slate-500 uppercase">題目數</p>
                <p class="text-2xl font-bold text-slate-900"><?php echo count($analytics['questions']); ?></p>
            </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
            <div class="p-4 border-b">
                <h2 class="font-bold text-slate-800">錯題與選項分析</h2>
                <p class="text-xs text-slate-500 mt-1">依所有呈交次數統計（非僅最高分）。選擇題會顯示各選項被選次數與百分率；「錯選佔比」＝該選項在答錯次數中的比例。</p>
            </div>
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">題號</th>
                        <th class="p-3">類型</th>
                        <th class="p-3">題幹摘要</th>
                        <th class="p-3">評分次數</th>
                        <th class="p-3">答對</th>
                        <th class="p-3">答錯</th>
                        <th class="p-3">錯題率</th>
                    </tr>
                </thead>
                <tbody>
                <?php if ($analytics['questions'] === []): ?>
                    <tr><td colspan="7" class="p-6 text-slate-500 text-center">尚無題目或呈交資料。</td></tr>
                <?php endif; ?>
                <?php
                $qi = 0;
                foreach ($analytics['questions'] as $qs):
                    $qi++;
                    $qid = (int) $qs['question_id'];
                    $qrow = $qById[$qid] ?? null;
                    $stem = $qrow
                        ? (string) ($qrow['stem_zh'] ?: $qrow['stem_en'])
                        : '';
                    $stemShort = mb_strlen($stem) > 60 ? mb_substr($stem, 0, 60) . '…' : $stem;
                    $miss = $qs['miss_rate_percent'];
                    $missClass = $miss === null
                        ? 'text-slate-400'
                        : ($miss >= 50 ? 'text-red-700 font-semibold' : ($miss >= 30 ? 'text-orange-700' : 'text-emerald-700'));
                    ?>
                    <tr class="border-t border-slate-100 align-top">
                        <td class="p-3"><?php echo $qi; ?></td>
                        <td class="p-3"><?php
                            echo match ((string) ($qs['type'] ?? '')) {
                                'mcq' => '選擇',
                                'fill_blank' => '填充',
                                'true_false' => '是非',
                                'short_answer' => '短答',
                                'long_answer' => '長答',
                                default => htmlspecialchars((string) ($qs['type'] ?? ''), ENT_QUOTES, 'UTF-8'),
                            };
                        ?></td>
                        <td class="p-3 max-w-md"><?php echo htmlspecialchars($stemShort !== '' ? $stemShort : ('#' . $qid), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo (int) $qs['attempts']; ?></td>
                        <td class="p-3"><?php echo (int) $qs['correct']; ?></td>
                        <td class="p-3"><?php echo (int) $qs['incorrect']; ?></td>
                        <td class="p-3 <?php echo $missClass; ?>">
                            <?php echo $miss === null ? '—' : htmlspecialchars((string) $miss, ENT_QUOTES, 'UTF-8') . '%'; ?>
                        </td>
                    </tr>
                    <?php if ($qs['type'] === 'mcq' && !empty($qs['options']) && is_array($qs['options'])): ?>
                        <tr class="border-t border-slate-50 bg-slate-50/40">
                            <td colspan="7" class="p-0">
                                <table class="min-w-full text-xs">
                                    <thead>
                                        <tr class="text-slate-500 text-left">
                                            <th class="px-3 py-2 pl-8 w-16">選項</th>
                                            <th class="px-3 py-2">內容</th>
                                            <th class="px-3 py-2 w-20">被選次數</th>
                                            <th class="px-3 py-2 w-24">佔全部呈交</th>
                                            <th class="px-3 py-2 w-24">錯選佔比</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    <?php foreach ($qs['options'] as $opt): ?>
                                        <?php
                                        $isCorrectOpt = !empty($opt['is_correct']);
                                        $optText = (string) (($opt['text_zh'] ?? '') !== '' ? $opt['text_zh'] : ($opt['text_en'] ?? ''));
                                        $optTextShort = mb_strlen($optText) > 80 ? mb_substr($optText, 0, 80) . '…' : $optText;
                                        $selRate = $opt['select_rate_percent'] ?? null;
                                        $wrongRate = $opt['wrong_select_rate_percent'] ?? null;
                                        $rowTone = $isCorrectOpt
                                            ? 'text-emerald-800'
                                            : ((float) ($selRate ?? 0) >= 20 ? 'text-red-800' : 'text-slate-700');
                                        ?>
                                        <tr class="border-t border-slate-100/80 <?php echo $rowTone; ?>">
                                            <td class="px-3 py-2 pl-8 font-bold">
                                                <?php echo htmlspecialchars((string) ($opt['label'] ?? chr(65 + (int) $opt['index'])), ENT_QUOTES, 'UTF-8'); ?>
                                                <?php if ($isCorrectOpt): ?>
                                                    <span class="ml-1 font-normal text-emerald-700">✓ 正確</span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="px-3 py-2"><?php echo htmlspecialchars($optTextShort !== '' ? $optTextShort : '—', ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td class="px-3 py-2"><?php echo (int) ($opt['selected_count'] ?? 0); ?></td>
                                            <td class="px-3 py-2">
                                                <?php echo $selRate === null ? '—' : htmlspecialchars((string) $selRate, ENT_QUOTES, 'UTF-8') . '%'; ?>
                                            </td>
                                            <td class="px-3 py-2">
                                                <?php
                                                if ($isCorrectOpt) {
                                                    echo '—';
                                                } else {
                                                    echo $wrongRate === null
                                                        ? '—'
                                                        : htmlspecialchars((string) $wrongRate, ENT_QUOTES, 'UTF-8') . '%';
                                                }
                                                ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                    <?php if ((int) ($qs['unanswered'] ?? 0) > 0): ?>
                                        <tr class="border-t border-slate-100/80 text-slate-500">
                                            <td class="px-3 py-2 pl-8" colspan="2">（未作答）</td>
                                            <td class="px-3 py-2"><?php echo (int) $qs['unanswered']; ?></td>
                                            <td class="px-3 py-2">
                                                <?php
                                                $ua = (int) $qs['attempts'];
                                                echo $ua > 0
                                                    ? htmlspecialchars((string) round(((int) $qs['unanswered'] / $ua) * 100, 2), ENT_QUOTES, 'UTF-8') . '%'
                                                    : '—';
                                                ?>
                                            </td>
                                            <td class="px-3 py-2">—</td>
                                        </tr>
                                    <?php endif; ?>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    <?php endif; ?>
                    <?php if (!empty($qs['blanks']) && is_array($qs['blanks'])): ?>
                        <?php foreach ($qs['blanks'] as $blank): ?>
                            <?php
                            $bMiss = $blank['miss_rate_percent'] ?? null;
                            $bClass = $bMiss === null
                                ? 'text-slate-400'
                                : ($bMiss >= 50 ? 'text-red-700' : ($bMiss >= 30 ? 'text-orange-700' : 'text-emerald-700'));
                            ?>
                            <tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                                <td class="p-2 pl-8 text-slate-500" colspan="2">└ 空格 <?php echo (int) $blank['blank_index']; ?></td>
                                <td class="p-2 text-slate-500">—</td>
                                <td class="p-2"><?php echo (int) $blank['attempts']; ?></td>
                                <td class="p-2"><?php echo (int) $blank['correct']; ?></td>
                                <td class="p-2"><?php echo (int) $blank['incorrect']; ?></td>
                                <td class="p-2 <?php echo $bClass; ?>">
                                    <?php echo $bMiss === null ? '—' : htmlspecialchars((string) $bMiss, ENT_QUOTES, 'UTF-8') . '%'; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <?php if (($qs['type'] ?? '') === 'true_false'): ?>
                        <tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                            <td class="p-2 pl-8 text-slate-500" colspan="3">
                                └ 選「是」 <?php echo (int) ($qs['true_count'] ?? 0); ?>
                                · 選「否」 <?php echo (int) ($qs['false_count'] ?? 0); ?>
                                · 正解：<?php
                                    $cb = $qs['correct_bool'] ?? null;
                                    echo $cb === null ? '—' : ($cb ? '是' : '否');
                                ?>
                            </td>
                            <td colspan="4"></td>
                        </tr>
                    <?php endif; ?>
                    <?php if (($qs['type'] ?? '') === 'short_answer' && !empty($qs['common_wrong_answers']) && is_array($qs['common_wrong_answers'])): ?>
                        <tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                            <td class="p-2 pl-8 text-slate-500" colspan="7">
                                └ 常見錯答：
                                <?php
                                $parts = [];
                                foreach ($qs['common_wrong_answers'] as $wa) {
                                    if (!is_array($wa)) {
                                        continue;
                                    }
                                    $parts[] = htmlspecialchars((string) ($wa['answer'] ?? ''), ENT_QUOTES, 'UTF-8')
                                        . '（' . (int) ($wa['count'] ?? 0) . '）';
                                }
                                echo $parts !== [] ? implode('、', $parts) : '—';
                                ?>
                            </td>
                        </tr>
                    <?php endif; ?>
                    <?php if (($qs['type'] ?? '') === 'long_answer'): ?>
                        <tr class="border-t border-slate-50 bg-slate-50/60 text-xs">
                            <td class="p-2 pl-8 text-slate-500" colspan="7">
                                └ 待評 <?php echo (int) ($qs['needs_marking'] ?? 0); ?>
                                · 已有標記／非待評標記 <?php echo (int) ($qs['marked'] ?? 0); ?>
                                （長答不計入自動及格％；請於呈交明細評分）
                            </td>
                        </tr>
                    <?php endif; ?>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
            <div class="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 class="font-bold text-slate-800">學生呈交摘要</h2>
                    <p class="text-xs text-slate-500 mt-1">點學生可查看該生每一次呈交與作答內容。</p>
                </div>
            </div>
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">學生</th>
                        <th class="p-3">電郵</th>
                        <th class="p-3">次數</th>
                        <th class="p-3">最高分</th>
                        <th class="p-3">及格</th>
                        <th class="p-3">首次及格</th>
                        <th class="p-3">最近呈交</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                <?php if ($students === []): ?>
                    <tr><td colspan="8" class="p-6 text-slate-500 text-center">尚無呈交紀錄。</td></tr>
                <?php endif; ?>
                <?php foreach ($students as $s): ?>
                    <?php
                    $active = $filterUserId === (int) $s['user_id'];
                    $notPassed = empty($s['passed']);
                    $rowTone = $active ? 'bg-indigo-50/50' : ($notPassed ? 'bg-amber-50/70' : '');
                    ?>
                    <tr class="border-t border-slate-100 <?php echo $rowTone; ?>">
                        <td class="p-3 font-medium"><?php echo htmlspecialchars((string) $s['display_name'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs text-slate-600"><?php echo htmlspecialchars((string) $s['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo (int) $s['attempts']; ?></td>
                        <td class="p-3">
                            <?php echo htmlspecialchars((string) $s['best_percent'], ENT_QUOTES, 'UTF-8'); ?>%
                            <?php if ($s['best_score'] !== null): ?>
                                <span class="text-xs text-slate-500">（<?php echo htmlspecialchars((string) $s['best_score'], ENT_QUOTES, 'UTF-8'); ?>/<?php echo htmlspecialchars((string) $s['best_max_score'], ENT_QUOTES, 'UTF-8'); ?>）</span>
                            <?php endif; ?>
                        </td>
                        <td class="p-3 <?php echo $notPassed ? 'text-amber-900 font-semibold' : 'text-emerald-800'; ?>">
                            <?php echo $notPassed ? '否' : '是'; ?>
                        </td>
                        <td class="p-3 text-xs whitespace-nowrap"><?php
                            echo !empty($s['first_passed_at'])
                                ? htmlspecialchars(substr((string) $s['first_passed_at'], 0, 16), ENT_QUOTES, 'UTF-8')
                                : '—';
                        ?></td>
                        <td class="p-3 text-xs whitespace-nowrap"><?php echo htmlspecialchars(substr((string) $s['last_submitted_at'], 0, 16), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <a class="text-indigo-600 hover:underline" href="summer_homework_analytics.php?id=<?php echo $itemId; ?>&amp;user_id=<?php echo (int) $s['user_id']; ?>">詳細</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <?php if ($filterUserId > 0): ?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
            <div class="p-4 border-b">
                <h2 class="font-bold text-slate-800">
                    <?php echo htmlspecialchars($filterStudentName !== '' ? $filterStudentName : ('學生 #' . $filterUserId), ENT_QUOTES, 'UTF-8'); ?>
                    — 全部呈交（<?php echo count($studentAttempts); ?>）
                </h2>
            </div>
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">#</th>
                        <th class="p-3">時間</th>
                        <th class="p-3">分數</th>
                        <th class="p-3">百分比</th>
                        <th class="p-3">及格</th>
                        <th class="p-3">明細</th>
                    </tr>
                </thead>
                <tbody>
                <?php
                $n = count($studentAttempts);
                foreach ($studentAttempts as $i => $a):
                    $seq = $n - $i;
                    $isSel = $selectedAttempt && (int) $selectedAttempt['id'] === (int) $a['id'];
                    ?>
                    <tr class="border-t border-slate-100 <?php echo $isSel ? 'bg-amber-50' : ''; ?>">
                        <td class="p-3"><?php echo $seq; ?></td>
                        <td class="p-3 text-xs whitespace-nowrap"><?php echo htmlspecialchars(substr((string) $a['submitted_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) $a['score'], ENT_QUOTES, 'UTF-8'); ?> / <?php echo htmlspecialchars((string) $a['max_score'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo htmlspecialchars((string) $a['percent'], ENT_QUOTES, 'UTF-8'); ?>%</td>
                        <td class="p-3"><?php echo !empty($a['passed']) ? '是' : '否'; ?></td>
                        <td class="p-3">
                            <a class="text-indigo-600 hover:underline" href="summer_homework_analytics.php?id=<?php echo $itemId; ?>&amp;user_id=<?php echo $filterUserId; ?>&amp;attempt_id=<?php echo (int) $a['id']; ?>#attempt-detail">查看作答</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                <?php if ($studentAttempts === []): ?>
                    <tr><td colspan="6" class="p-6 text-slate-500 text-center">此學生尚無呈交。</td></tr>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>

        <?php if ($selectedAttempt !== null): ?>
        <div id="attempt-detail" class="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 p-6">
            <h2 class="font-bold text-slate-800 mb-1">呈交明細 #<?php echo (int) $selectedAttempt['id']; ?></h2>
            <p class="text-sm text-slate-500 mb-4">
                <?php echo htmlspecialchars((string) $selectedAttempt['display_name'], ENT_QUOTES, 'UTF-8'); ?>
                · <?php echo htmlspecialchars(substr((string) $selectedAttempt['submitted_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?>
                · <?php echo htmlspecialchars((string) $selectedAttempt['score'], ENT_QUOTES, 'UTF-8'); ?>/<?php echo htmlspecialchars((string) $selectedAttempt['max_score'], ENT_QUOTES, 'UTF-8'); ?>
                （<?php echo htmlspecialchars((string) $selectedAttempt['percent'], ENT_QUOTES, 'UTF-8'); ?>%）
                · <?php echo !empty($selectedAttempt['passed']) ? '及格' : '不及格'; ?>
            </p>

            <?php
            $grading = is_array($selectedAttempt['grading'] ?? null) ? $selectedAttempt['grading'] : null;
            $details = is_array($grading['details'] ?? null) ? $grading['details'] : [];
            $responses = is_array($selectedAttempt['responses'] ?? null) ? $selectedAttempt['responses'] : [];
            if ($details === [] && $responses === []):
                ?>
                <p class="text-slate-500 text-sm">此筆呈交沒有可顯示的作答／評分明細（可能是升級前的舊資料）。</p>
            <?php else: ?>
                <div class="space-y-4">
                <?php
                $di = 0;
                foreach ($questions as $q):
                    $di++;
                    $qid = (int) $q['id'];
                    $detail = null;
                    foreach ($details as $d) {
                        if (is_array($d) && (int) ($d['question_id'] ?? 0) === $qid) {
                            $detail = $d;
                            break;
                        }
                    }
                    $resp = $responses[(string) $qid] ?? $responses[$qid] ?? null;
                    $stem = (string) ($q['stem_zh'] ?: $q['stem_en']);
                    $ok = $detail !== null ? !empty($detail['correct']) : null;
                    $badge = $ok === null
                        ? '<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">無評分</span>'
                        : ($ok
                            ? '<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">正確</span>'
                            : '<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">錯誤</span>');
                    ?>
                    <div class="border border-slate-200 rounded-lg p-4">
                        <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <p class="font-medium text-slate-900"><?php echo $di; ?>. <?php echo htmlspecialchars($stem, ENT_QUOTES, 'UTF-8'); ?></p>
                            <?php echo $badge; ?>
                        </div>
                        <?php if ((string) $q['question_type'] === 'mcq'): ?>
                            <?php
                            $selectedIdx = null;
                            if (is_array($detail) && array_key_exists('selected_option_index', $detail)) {
                                $selectedIdx = $detail['selected_option_index'] !== null ? (int) $detail['selected_option_index'] : null;
                            } elseif (is_array($resp) && isset($resp['selected_option_index'])) {
                                $selectedIdx = (int) $resp['selected_option_index'];
                            }
                            $correctIdx = is_array($detail) && isset($detail['correct_option_index'])
                                ? (int) $detail['correct_option_index']
                                : null;
                            ?>
                            <ul class="text-sm space-y-1">
                                <?php foreach ($q['options'] as $oi => $opt): ?>
                                    <?php
                                    $label = chr(65 + (int) $oi);
                                    $text = (string) ($opt['text_zh'] ?: $opt['text_en']);
                                    $marks = [];
                                    if ($selectedIdx !== null && (int) $oi === $selectedIdx) {
                                        $marks[] = '學生選';
                                    }
                                    if ($correctIdx !== null && (int) $oi === $correctIdx) {
                                        $marks[] = '正確答案';
                                    }
                                    $markStr = $marks !== [] ? '（' . implode(' · ', $marks) . '）' : '';
                                    $rowClass = '';
                                    if ($correctIdx !== null && (int) $oi === $correctIdx) {
                                        $rowClass = 'text-emerald-800';
                                    } elseif ($selectedIdx !== null && (int) $oi === $selectedIdx) {
                                        $rowClass = 'text-red-800';
                                    }
                                    ?>
                                    <li class="<?php echo $rowClass; ?>">
                                        <span class="font-bold text-indigo-600 mr-1"><?php echo $label; ?></span>
                                        <?php echo htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); ?>
                                        <?php if ($markStr !== ''): ?>
                                            <span class="text-xs text-slate-500"><?php echo htmlspecialchars($markStr, ENT_QUOTES, 'UTF-8'); ?></span>
                                        <?php endif; ?>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        <?php elseif ((string) $q['question_type'] === 'true_false'): ?>
                            <?php
                            $selB = is_array($detail) && array_key_exists('selected_bool', $detail)
                                ? $detail['selected_bool']
                                : (is_array($resp) && array_key_exists('selected_bool', $resp) ? $resp['selected_bool'] : null);
                            $corB = is_array($detail) && array_key_exists('correct_bool', $detail)
                                ? $detail['correct_bool']
                                : ($q['correct_bool'] ?? null);
                            ?>
                            <p class="text-sm">學生：<?php echo $selB === null ? '—' : ($selB ? '是' : '否'); ?>
                                · 正解：<?php echo $corB === null ? '—' : ($corB ? '是' : '否'); ?></p>
                        <?php elseif ((string) $q['question_type'] === 'short_answer'): ?>
                            <?php
                            $given = is_array($detail) && isset($detail['given'])
                                ? (string) $detail['given']
                                : (is_array($resp) ? (string) ($resp['text'] ?? '') : '');
                            ?>
                            <p class="text-sm font-mono"><?php echo $given !== '' ? htmlspecialchars($given, ENT_QUOTES, 'UTF-8') : '（空白）'; ?></p>
                        <?php elseif ((string) $q['question_type'] === 'long_answer'): ?>
                            <?php
                            $given = is_array($detail) && isset($detail['given'])
                                ? (string) $detail['given']
                                : (is_array($resp) ? (string) ($resp['text'] ?? '') : '');
                            $marksJson = sh_decode_json_column($selectedAttempt['teacher_marks_json'] ?? null) ?? [];
                            $tm = is_array($marksJson) ? ($marksJson[(string) $q['id']] ?? $marksJson[(int) $q['id']] ?? null) : null;
                            ?>
                            <div class="text-sm whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 mb-3"><?php echo $given !== '' ? htmlspecialchars($given, ENT_QUOTES, 'UTF-8') : '（空白）'; ?></div>
                            <form class="sh-mark-form space-y-2 text-sm" data-attempt="<?php echo (int) ($selectedAttempt['id'] ?? 0); ?>" data-qid="<?php echo (int) $q['id']; ?>">
                                <label>教師評分（滿分 <?php echo htmlspecialchars((string) ($q['max_score'] ?? 5), ENT_QUOTES, 'UTF-8'); ?>）
                                    <input type="number" step="0.5" min="0" max="<?php echo htmlspecialchars((string) ($q['max_score'] ?? 5), ENT_QUOTES, 'UTF-8'); ?>"
                                           class="mark-score border rounded px-2 py-1 w-24 ml-1"
                                           value="<?php echo htmlspecialchars((string) ($tm['score'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                </label>
                                <div>
                                    <label class="block text-slate-600">評語</label>
                                    <input type="text" class="mark-comment w-full border rounded px-2 py-1" value="<?php echo htmlspecialchars((string) ($tm['comment'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                </div>
                                <button type="submit" class="text-indigo-600 text-sm">儲存評分</button>
                                <span class="mark-flash text-xs text-slate-500"></span>
                            </form>
                        <?php else: ?>
                            <?php
                            $blankDetails = is_array($detail['blanks'] ?? null) ? $detail['blanks'] : [];
                            $givenBlanks = is_array($resp['blanks'] ?? null) ? $resp['blanks'] : [];
                            foreach ($q['blanks'] as $bi => $blank):
                                $bd = null;
                                foreach ($blankDetails as $x) {
                                    if (is_array($x) && (int) ($x['blank_index'] ?? 0) === (int) ($blank['blank_index'] ?? ($bi + 1))) {
                                        $bd = $x;
                                        break;
                                    }
                                }
                                $given = is_array($bd) && isset($bd['given'])
                                    ? (string) $bd['given']
                                    : (isset($givenBlanks[$bi]) ? (string) $givenBlanks[$bi] : (isset($givenBlanks[(string) $bi]) ? (string) $givenBlanks[(string) $bi] : ''));
                                $blankOk = is_array($bd) ? !empty($bd['correct']) : null;
                                $acceptHint = '';
                                if (!empty($blank['acceptable_answers']) && is_array($blank['acceptable_answers'])) {
                                    $parts = [];
                                    foreach ($blank['acceptable_answers'] as $ans) {
                                        if (!is_array($ans)) {
                                            continue;
                                        }
                                        $parts[] = trim((string) ($ans['acceptable_answer_zh'] ?? '') . ' / ' . (string) ($ans['acceptable_answer_en'] ?? ''));
                                    }
                                    $acceptHint = implode('；', array_filter($parts));
                                } else {
                                    $acceptHint = trim((string) ($blank['acceptable_answer_zh'] ?? '') . ' / ' . (string) ($blank['acceptable_answer_en'] ?? ''));
                                }
                                ?>
                                <div class="text-sm mb-2">
                                    <span class="text-slate-500">空格 <?php echo (int) ($blank['blank_index'] ?? ($bi + 1)); ?>：</span>
                                    <span class="font-mono"><?php echo $given !== '' ? htmlspecialchars($given, ENT_QUOTES, 'UTF-8') : '（空白）'; ?></span>
                                    <?php if ($blankOk === true): ?>
                                        <span class="text-emerald-700 text-xs ml-2">正確</span>
                                    <?php elseif ($blankOk === false): ?>
                                        <span class="text-red-700 text-xs ml-2">錯誤</span>
                                        <span class="text-xs text-slate-500 ml-2">可接受：<?php echo htmlspecialchars($acceptHint, ENT_QUOTES, 'UTF-8'); ?></span>
                                    <?php endif; ?>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>
<?php
admin_page_end([
    'scripts' => '<script src="../assets/js/admin-api.js"></script>
<script>
document.querySelectorAll(".sh-mark-form").forEach(function(form){
  form.addEventListener("submit", async function(e){
    e.preventDefault();
    var attemptId = form.getAttribute("data-attempt");
    var qid = form.getAttribute("data-qid");
    var flash = form.querySelector(".mark-flash");
    try {
      await AdminApi.initSession();
      var marks = {};
      marks[qid] = {
        score: parseFloat(form.querySelector(".mark-score").value || "0"),
        comment: form.querySelector(".mark-comment").value || ""
      };
      await AdminApi.apiFetch("/admin/summer-homework/attempts/" + attemptId + "/marks", {
        method: "POST",
        body: { marks: marks }
      });
      if (flash) { flash.textContent = "已儲存"; flash.className = "mark-flash text-xs text-emerald-700"; }
    } catch (err) {
      if (flash) { flash.textContent = err.message || "失敗"; flash.className = "mark-flash text-xs text-red-600"; }
    }
  });
});
</script>',
]);
