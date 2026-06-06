<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();

if (current_user() === null) {
    header('Location: ../login.php?next=' . rawurlencode('admin/index.php'));
    exit;
}

if (!admin_has_any_access()) {
    http_response_code(403);
    exit('沒有權限');
}

$user = current_user();
assert($user !== null);

$cardDescriptions = [
    'learning_notes' => '管理學習筆記內容、題目與發佈狀態。',
    'worksheets' => '管理工作紙與可列印內容。',
    'simulations' => '檢視、編輯與排序全部互動模擬程式。',
    'articles' => '管理科學文章與閱讀測驗。',
    'learning_tools' => '管理互動學習工具與小測。',
    'review_queue' => '審核待發佈的投稿內容。',
    'subjects' => '維護科目、單元與前台側欄目錄結構。',
    'users' => '新增、編輯使用者並指派角色。',
    'permissions' => '調整各角色的系統權限。',
    'codespace' => 'HTML 即時編輯與預覽（新分頁開啟）。',
    'db_export' => '下載完整 MySQL 資料庫 SQL 備份。',
];

admin_page_start('儀表板', 'dashboard', [
    'subtitle' => '歡迎，' . htmlspecialchars($user['display_name'] ?: $user['email'], ENT_QUOTES, 'UTF-8') . '。請從左側選單或下方快捷入口進入各項管理功能。',
]);

foreach (admin_menu_sections() as $section):
    if ($section['label'] === '概覽') {
        continue;
    }
    ?>
    <section>
        <h2 class="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3"><?php echo htmlspecialchars($section['label'], ENT_QUOTES, 'UTF-8'); ?></h2>
        <div class="grid sm:grid-cols-2 gap-3">
            <?php foreach ($section['items'] as $item):
                if ($item['key'] === 'dashboard') {
                    continue;
                }
                $desc = $cardDescriptions[$item['key']] ?? '';
                $external = !empty($item['external']);
                $accent = ($item['accent'] ?? '') === 'amber' ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-indigo-300';
                ?>
                <a href="<?php echo htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8'); ?>"
                   class="block bg-white border <?php echo $accent; ?> rounded-xl p-4 shadow-sm transition"
                   <?php if ($external): ?>target="_blank" rel="noopener"<?php endif; ?>>
                    <span class="font-medium text-slate-900"><?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php if ($desc !== ''): ?>
                        <span class="block text-sm text-slate-500 mt-1"><?php echo htmlspecialchars($desc, ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endif; ?>
                </a>
            <?php endforeach; ?>
        </div>
    </section>
    <?php
endforeach;

admin_page_end();
