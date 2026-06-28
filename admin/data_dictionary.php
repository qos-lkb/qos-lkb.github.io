<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/data_dictionary_lib.php';
require_once dirname(__DIR__) . '/includes/markdown_render_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/data_dictionary.php'));

$mdPath = dd_output_path();
$flash = '';
$flashError = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'regenerate') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $flash = 'CSRF 驗證失敗。';
        $flashError = true;
    } else {
        $result = dd_generate();
        if ($result['ok']) {
            $flash = '已更新 data_dictionary.md（' . (int) ($result['table_count'] ?? 0) . ' 張資料表）。';
        } else {
            $flash = $result['error'] ?? '產生失敗。';
            $flashError = true;
        }
    }
} elseif (isset($_GET['ok'])) {
    $flash = '已更新 data_dictionary.md（' . (int) ($_GET['tables'] ?? 0) . ' 張資料表）。';
} elseif (isset($_GET['error'])) {
    $flash = (string) $_GET['error'];
    $flashError = true;
}

$markdown = '';
$htmlContent = '';
$fileMeta = [
    'exists' => false,
    'size' => 0,
    'mtime' => '',
];

if (is_readable($mdPath)) {
    $raw = file_get_contents($mdPath);
    if ($raw !== false) {
        $markdown = $raw;
        $htmlContent = markdown_to_html($markdown);
        $fileMeta = [
            'exists' => true,
            'size' => filesize($mdPath) ?: 0,
            'mtime' => date('Y-m-d H:i:s', filemtime($mdPath)),
        ];
    }
}

$schemaMtime = is_readable(dd_schema_path())
    ? date('Y-m-d H:i:s', filemtime(dd_schema_path()))
    : '—';

$csrf = csrf_token();
$mdCss = markdown_reader_css();

admin_page_start('資料字典', 'data_dictionary', [
    'wide' => true,
    'headExtra' => '<style>' . $mdCss . '</style>',
    'actions' => admin_btn('../update_data_dictionary.php', 'Web 產生器', 'secondary'),
]);
?>
        <?php if ($flash !== ''): ?>
            <p class="text-sm mb-4 <?php echo $flashError ? 'text-red-700' : 'text-emerald-700'; ?>">
                <?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?>
            </p>
        <?php endif; ?>

        <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="text-sm text-slate-600 space-y-1">
                <p><strong class="text-slate-800">來源：</strong><code class="text-xs bg-slate-100 px-1 rounded">schema.sql</code>
                    <span class="text-slate-400">（<?php echo htmlspecialchars($schemaMtime, ENT_QUOTES, 'UTF-8'); ?>）</span></p>
                <p><strong class="text-slate-800">文件：</strong><code class="text-xs bg-slate-100 px-1 rounded">data_dictionary.md</code>
                    <?php if ($fileMeta['exists']): ?>
                        · <?php echo number_format($fileMeta['size']); ?> bytes
                        · <?php echo htmlspecialchars($fileMeta['mtime'], ENT_QUOTES, 'UTF-8'); ?>
                    <?php else: ?>
                        · <span class="text-amber-700">尚未產生</span>
                    <?php endif; ?>
                </p>
            </div>
            <form method="post" class="flex flex-wrap gap-2">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="action" value="regenerate">
                <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                    重新產生
                </button>
                <?php if ($fileMeta['exists']): ?>
                <a href="../markdown_reader.php?file=data_dictionary.md" target="_blank" rel="noopener"
                   class="admin-action-btn admin-action-btn-secondary text-sm">公開閱讀器</a>
                <?php endif; ?>
            </form>
        </div>

        <?php if (!$fileMeta['exists']): ?>
            <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-sm">
                尚未找到 <code>data_dictionary.md</code>。請按上方「重新產生」，或執行
                <code>php update_data_dictionary.php</code>。
            </div>
        <?php else: ?>
            <article class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 markdown-reader-content overflow-x-auto">
                <?php echo $htmlContent; ?>
            </article>
        <?php endif; ?>
<?php
admin_page_end();
