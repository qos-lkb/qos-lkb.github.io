<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/summer_homework_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
if (!sh_can_review(current_user())) {
    require_permission('summer_homework.manage_own', '../login.php?next=' . rawurlencode('admin/summer_homework.php'));
}

$pdo = db();
$user = current_user();
assert($user !== null);

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    header('Location: summer_homework.php');
    exit;
}

$item = sh_get_by_id($pdo, $id);
if ($item === null || !sh_can_review_item($user, $item)) {
    http_response_code(403);
    exit('沒有權限。');
}

$canManage = sh_can_manage_row($user, $item);
$title = (string) ($item['title_zh'] ?: $item['title_en']);
$formLabel = ((string) $item['form_level'] === '2') ? '中二' : '中一';
$contentType = (string) ($item['content_type'] ?? 'passage');
$questions = sh_fetch_questions($pdo, $id, true);
$statusLabel = ['draft' => '草稿', 'pending_review' => '待審核', 'published' => '已發佈'];

admin_page_start('檢視暑期功課 — ' . $title, 'summer_homework', [
    'actions' => admin_btn('summer_homework.php', '返回列表', 'secondary')
        . admin_btn('summer_homework_analytics.php?id=' . $id, '呈交分析', 'secondary')
        . ($canManage ? admin_btn('summer_homework_edit.php?id=' . $id, '編輯', 'primary') : ''),
    'wide' => true,
    'subtitle' => $formLabel
        . ' · '
        . ($contentType === 'video' ? '影片' : '閱讀')
        . ' · '
        . ($statusLabel[(string) $item['status']] ?? (string) $item['status'])
        . ' · 含正確答案（教師／管理員檢視）',
]);
?>
        <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-950 mb-6">
            此頁顯示習作全文與<strong>正確答案</strong>，供教師／管理員檢視。學生前台不會看到答案鍵。
        </div>

        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 class="font-bold text-slate-800 mb-3">內容</h2>
            <?php if ($contentType === 'video'): ?>
                <?php
                $vZh = trim((string) ($item['video_url_zh'] ?? ''));
                $vEn = trim((string) ($item['video_url_en'] ?? ''));
                ?>
                <dl class="text-sm space-y-2">
                    <div><dt class="text-slate-500">影片 URL（中）</dt><dd class="font-mono break-all"><?php echo $vZh !== '' ? htmlspecialchars($vZh, ENT_QUOTES, 'UTF-8') : '—'; ?></dd></div>
                    <div><dt class="text-slate-500">影片 URL（英）</dt><dd class="font-mono break-all"><?php echo $vEn !== '' ? htmlspecialchars($vEn, ENT_QUOTES, 'UTF-8') : '—'; ?></dd></div>
                </dl>
            <?php else: ?>
                <div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h3 class="font-medium text-slate-700 mb-2">篇章（中）</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800"><?php echo htmlspecialchars((string) ($item['body_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></pre>
                    </div>
                    <div>
                        <h3 class="font-medium text-slate-700 mb-2">篇章（英）</h3>
                        <pre class="whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 text-slate-800"><?php echo htmlspecialchars((string) ($item['body_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></pre>
                    </div>
                </div>
            <?php endif; ?>
            <p class="text-xs text-slate-500 mt-4">
                及格線 <?php echo htmlspecialchars((string) $item['pass_percent'], ENT_QUOTES, 'UTF-8'); ?>%
                · 截止 <?php echo !empty($item['due_at']) ? htmlspecialchars((string) $item['due_at'], ENT_QUOTES, 'UTF-8') : '無'; ?>
                · 遲交 <?php echo empty($item['due_at']) ? '—' : (!empty($item['allow_late_submit']) ? '允許' : '禁止'); ?>
            </p>
        </div>

        <div class="space-y-4 mb-8">
            <h2 class="font-bold text-slate-800">題目與答案（<?php echo count($questions); ?>）</h2>
            <?php if ($questions === []): ?>
                <p class="text-slate-500 text-sm">尚無題目。</p>
            <?php endif; ?>
            <?php foreach ($questions as $qi => $q): ?>
                <?php
                $stem = (string) ($q['stem_zh'] ?: $q['stem_en']);
                $type = (string) $q['question_type'];
                $typeLabel = match ($type) {
                    'mcq' => '選擇',
                    'fill_blank' => '填充',
                    'true_false' => '是非',
                    'short_answer' => '短答',
                    'long_answer' => '長答',
                    default => $type,
                };
                ?>
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <p class="font-medium text-slate-900 mb-3">
                        <?php echo (int) $qi + 1; ?>.
                        <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mr-1"><?php echo htmlspecialchars($typeLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                        <?php echo htmlspecialchars($stem, ENT_QUOTES, 'UTF-8'); ?>
                    </p>
                    <?php if ($type === 'mcq'): ?>
                        <ul class="text-sm space-y-1.5">
                            <?php foreach ($q['options'] as $oi => $opt): ?>
                                <?php
                                $label = chr(65 + (int) $oi);
                                $text = (string) ($opt['text_zh'] ?: $opt['text_en']);
                                $isCorrect = !empty($opt['is_correct']);
                                ?>
                                <li class="<?php echo $isCorrect ? 'text-emerald-800 font-medium' : 'text-slate-700'; ?>">
                                    <span class="font-bold text-indigo-600 mr-1"><?php echo $label; ?></span>
                                    <?php echo htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); ?>
                                    <?php if ($isCorrect): ?>
                                        <span class="text-xs text-emerald-700 ml-1">✓ 正確答案</span>
                                    <?php endif; ?>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php elseif ($type === 'true_false'): ?>
                        <p class="text-sm text-emerald-800 font-medium">
                            正確答案：<?php echo !empty($q['correct_bool']) ? '是' : '否'; ?>
                        </p>
                    <?php elseif ($type === 'short_answer'): ?>
                        <ul class="text-sm space-y-1">
                            <?php foreach (($q['acceptable_answers'] ?? []) as $ans): ?>
                                <?php if (!is_array($ans)) {
                                    continue;
                                } ?>
                                <li class="font-mono text-emerald-800">
                                    <?php echo htmlspecialchars((string) ($ans['acceptable_answer_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                    /
                                    <?php echo htmlspecialchars((string) ($ans['acceptable_answer_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php elseif ($type === 'long_answer'): ?>
                        <p class="text-sm text-slate-600">
                            滿分 <?php echo htmlspecialchars((string) ($q['max_score'] ?? 5), ENT_QUOTES, 'UTF-8'); ?>
                            （教師評閱；不計入自動及格％）
                        </p>
                        <?php
                        $rubZh = trim((string) ($q['rubric_zh'] ?? ''));
                        $rubEn = trim((string) ($q['rubric_en'] ?? ''));
                        if ($rubZh !== '' || $rubEn !== ''):
                            ?>
                            <div class="mt-2 text-xs text-slate-600 space-y-1">
                                <?php if ($rubZh !== ''): ?><p><span class="text-slate-400">評分指引（中）：</span><?php echo htmlspecialchars($rubZh, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
                                <?php if ($rubEn !== ''): ?><p><span class="text-slate-400">評分指引（英）：</span><?php echo htmlspecialchars($rubEn, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
                            </div>
                        <?php endif; ?>
                    <?php else: ?>
                        <?php foreach ($q['blanks'] as $blank): ?>
                            <div class="text-sm mb-2">
                                <span class="text-slate-500">空格 <?php echo (int) ($blank['blank_index'] ?? 0); ?>：</span>
                                <?php if (!empty($blank['acceptable_answers']) && is_array($blank['acceptable_answers'])): ?>
                                    <?php foreach ($blank['acceptable_answers'] as $ans): ?>
                                        <?php if (!is_array($ans)) {
                                            continue;
                                        } ?>
                                        <span class="font-mono text-emerald-800 mr-2">
                                            <?php echo htmlspecialchars((string) ($ans['acceptable_answer_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                            /
                                            <?php echo htmlspecialchars((string) ($ans['acceptable_answer_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                        </span>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <span class="font-mono text-emerald-800">
                                        <?php echo htmlspecialchars((string) ($blank['acceptable_answer_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                        /
                                        <?php echo htmlspecialchars((string) ($blank['acceptable_answer_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                    </span>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <?php
                    $exZh = trim((string) ($q['explanation_zh'] ?? ''));
                    $exEn = trim((string) ($q['explanation_en'] ?? ''));
                    if ($exZh !== '' || $exEn !== ''):
                        ?>
                        <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                            <?php if ($exZh !== ''): ?><p><span class="text-slate-400">解釋（中）：</span><?php echo htmlspecialchars($exZh, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
                            <?php if ($exEn !== ''): ?><p><span class="text-slate-400">解釋（英）：</span><?php echo htmlspecialchars($exEn, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
<?php
admin_page_end();
