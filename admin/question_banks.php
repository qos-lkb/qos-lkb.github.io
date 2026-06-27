<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/question_bank_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_any_permission(['question_bank.manage_any', 'question_bank.manage_own'], '../login.php?next=' . rawurlencode('admin/question_banks.php'));

$pdo = db();
$user = current_user();
assert($user !== null);
$canAny = user_has_permission('question_bank.manage_any');

if ($canAny) {
    $list = $pdo->query(
        'SELECT qb.id, qb.slug, qb.title_zh, qb.title_en, qb.status, qb.updated_at, qb.list_sort_order,
                sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                t.name_zh AS topic_zh, t.name_en AS topic_en,
                (SELECT COUNT(*) FROM qb_questions q WHERE q.bank_id = qb.id) AS question_count,
                (SELECT COUNT(DISTINCT q.subject_id) FROM qb_questions q WHERE q.bank_id = qb.id AND q.subject_id IS NOT NULL) AS subject_count
         FROM question_banks qb
         LEFT JOIN subjects sub ON sub.id = qb.subject_id
         LEFT JOIN topics t ON t.id = qb.topic_id
         ORDER BY qb.updated_at DESC'
    )->fetchAll() ?: [];
} else {
    $stmt = $pdo->prepare(
        'SELECT qb.id, qb.slug, qb.title_zh, qb.title_en, qb.status, qb.updated_at, qb.list_sort_order,
                sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                t.name_zh AS topic_zh, t.name_en AS topic_en,
                (SELECT COUNT(*) FROM qb_questions q WHERE q.bank_id = qb.id) AS question_count,
                (SELECT COUNT(DISTINCT q.subject_id) FROM qb_questions q WHERE q.bank_id = qb.id AND q.subject_id IS NOT NULL) AS subject_count
         FROM question_banks qb
         LEFT JOIN subjects sub ON sub.id = qb.subject_id
         LEFT JOIN topics t ON t.id = qb.topic_id
         WHERE qb.owner_user_id = ?
         ORDER BY qb.updated_at DESC'
    );
    $stmt->execute([$user['id']]);
    $list = $stmt->fetchAll() ?: [];
}

$actions = admin_btn('question_bank_edit.php', '新增試題集');
if (user_has_permission('worksheet.manage_any') || user_has_permission('worksheet.manage_own')) {
    $actions .= admin_btn('worksheets.php', '工作紙', 'secondary');
}

admin_page_start($canAny ? '試題庫' : '我的試題庫', 'question_banks', [
    'actions' => $actions,
    'wide' => true,
]);
?>
        <?php if (!$canAny): ?>
        <p class="text-sm text-slate-600 mb-4">建立試題集後，可在「工作紙」編輯頁以「+ 題庫題目」嵌入題目，供學生在工作紙習作中作答。</p>
        <?php endif; ?>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">標題</th>
                        <th class="p-3">slug</th>
                        <th class="p-3">預設科目</th>
                        <th class="p-3">預設課題</th>
                        <th class="p-3">題數</th>
                        <th class="p-3">狀態</th>
                        <th class="p-3">更新</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($list as $row): ?>
                    <tr class="border-t border-slate-100">
                        <td class="p-3">
                            <div class="font-medium"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></div>
                            <?php if (trim((string) ($row['title_en'] ?? '')) !== ''): ?>
                            <div class="text-xs text-slate-500"><?php echo htmlspecialchars($row['title_en'], ENT_QUOTES, 'UTF-8'); ?></div>
                            <?php endif; ?>
                        </td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs text-slate-600"><?php echo htmlspecialchars(trim((string) ($row['subject_zh'] ?? '')) !== '' ? (string) $row['subject_zh'] : '—', ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs text-slate-600"><?php echo htmlspecialchars(trim((string) ($row['topic_zh'] ?? '')) !== '' ? (string) $row['topic_zh'] : '—', ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-center"><?php echo (int) $row['question_count']; ?></td>
                        <td class="p-3"><?php echo htmlspecialchars(qb_status_label((string) $row['status']), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-xs text-slate-500 whitespace-nowrap"><?php echo htmlspecialchars((string) $row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 whitespace-nowrap"><a class="text-indigo-600 hover:underline" href="question_bank_edit.php?id=<?php echo (int) $row['id']; ?>">編輯</a></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$list): ?>
                    <tr><td colspan="8" class="p-6 text-center text-slate-500">尚無試題庫。按「新增試題集」建立第一個試題集。</td></tr>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
<?php
admin_page_end();
