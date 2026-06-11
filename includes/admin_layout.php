<?php

declare(strict_types=1);

/**
 * Admin shell: header bar, side menu, main content (mirrors app/index.html layout).
 */

function admin_has_any_access(): bool
{
    return user_has_permission('user.manage')
        || user_has_permission('simulation.manage_any')
        || user_has_permission('learning_tool.manage_any')
        || user_has_permission('article.manage_any')
        || user_has_permission('learning_note.manage_any')
        || user_has_permission('worksheet.manage_any')
        || user_has_permission('learning_video.manage_any')
        || user_has_permission('topic_item.manage_any');
}

function admin_btn(string $href, string $label, string $type = 'primary'): string
{
    $cls = $type === 'primary'
        ? 'admin-action-btn admin-action-btn-primary'
        : 'admin-action-btn admin-action-btn-secondary';
    return '<a href="' . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . '" class="' . $cls . '">'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';
}

function admin_can_review(): bool
{
    return user_has_permission('learning_tool.manage_any')
        || user_has_permission('article.manage_any')
        || user_has_permission('learning_note.manage_any')
        || user_has_permission('worksheet.manage_any')
        || user_has_permission('learning_video.manage_any');
}

/**
 * @return list<array{label:string,items:list<array{key:string,label:string,href:string,external?:bool,accent?:string}>}>
 */
function admin_menu_sections(): array
{
    $sections = [];

    $sections[] = [
        'label' => '概覽',
        'items' => [
            ['key' => 'dashboard', 'label' => '儀表板', 'href' => 'index.php'],
        ],
    ];

    $contentItems = [];
    if (user_has_permission('learning_note.manage_any')) {
        $contentItems[] = ['key' => 'learning_notes', 'label' => '學習筆記', 'href' => 'learning_notes.php'];
    }
    if (user_has_permission('worksheet.manage_any')) {
        $contentItems[] = ['key' => 'worksheets', 'label' => '工作紙', 'href' => 'worksheets.php'];
    }
    if (user_has_permission('simulation.manage_any')) {
        $contentItems[] = ['key' => 'simulations', 'label' => '模擬程式', 'href' => 'simulations.php'];
    }
    if (user_has_permission('article.manage_any')) {
        $contentItems[] = ['key' => 'articles', 'label' => '科學文章', 'href' => 'articles.php'];
    }
    if (user_has_permission('learning_tool.manage_any')) {
        $contentItems[] = ['key' => 'learning_tools', 'label' => '互動學習工具', 'href' => 'learning_tools.php'];
    }
    if (user_has_permission('learning_video.manage_any')) {
        $contentItems[] = ['key' => 'learning_videos', 'label' => '學習影片', 'href' => 'learning_videos.php'];
    }
    if (user_has_permission('topic_item.manage_any') || user_has_permission('user.manage')) {
        $contentItems[] = ['key' => 'course_curriculum', 'label' => '自學課程編排', 'href' => 'course_curriculum.php', 'accent' => 'indigo'];
    }
    if (admin_can_review()) {
        $contentItems[] = ['key' => 'review_queue', 'label' => '審核佇列', 'href' => 'review_queue.php', 'accent' => 'amber'];
    }
    if ($contentItems !== []) {
        $sections[] = ['label' => '內容管理', 'items' => $contentItems];
    }

    if (user_has_permission('user.manage')) {
        $sections[] = [
            'label' => '平台設定',
            'items' => [
                ['key' => 'subjects', 'label' => '科目與單元', 'href' => 'subjects.php'],
            ],
        ];
        $sections[] = [
            'label' => '使用者與安全',
            'items' => [
                ['key' => 'users', 'label' => '使用者', 'href' => 'users.php'],
                ['key' => 'permissions', 'label' => '角色權限', 'href' => 'permissions.php'],
            ],
        ];
        $sections[] = [
            'label' => '開發與維護',
            'items' => [
                ['key' => 'codespace', 'label' => 'Code Space', 'href' => '../codespace/index.html', 'external' => true],
                ['key' => 'db_export', 'label' => '匯出資料庫', 'href' => 'db_export.php'],
            ],
        ];
    } elseif (user_has_permission('simulation.manage_any')) {
        $sections[] = [
            'label' => '開發與維護',
            'items' => [
                ['key' => 'codespace', 'label' => 'Code Space', 'href' => '../codespace/index.html', 'external' => true],
            ],
        ];
    }

    return $sections;
}

/**
 * @param array{subtitle?:string,actions?:string,wide?:bool,bodyClass?:string,headExtra?:string} $opts
 */
function admin_page_start(string $title, string $activeKey = '', array $opts = []): void
{
    $siteName = htmlspecialchars(config_site_name(), ENT_QUOTES, 'UTF-8');
    $siteNameEn = htmlspecialchars(config_site_name_en(), ENT_QUOTES, 'UTF-8');
    $user = current_user();
    $subtitle = $opts['subtitle'] ?? '';
    $actions = $opts['actions'] ?? '';
    $wide = !empty($opts['wide']);
    $bodyClass = $opts['bodyClass'] ?? '';
    $headExtra = $opts['headExtra'] ?? '';
    $maxW = $wide ? 'max-w-7xl' : 'max-w-6xl';
    $displayName = $user !== null ? htmlspecialchars($user['display_name'] ?: $user['email'], ENT_QUOTES, 'UTF-8') : '';

    $pageTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . ' | 管理後台';
    ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="assets/css/admin.css">
    <script>window.__APP_TIMEZONE__=<?php echo json_encode(config_timezone(), JSON_UNESCAPED_UNICODE); ?>;</script>
    <?php echo $headExtra; ?>
</head>
<body class="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 font-sans text-slate-900 min-h-screen flex flex-col antialiased <?php echo htmlspecialchars($bodyClass, ENT_QUOTES, 'UTF-8'); ?>">

    <header class="fixed w-full z-50 top-0 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 text-white shadow-lg border-b border-white/10">
        <div class="flex items-center h-16 px-4 sm:px-6 lg:px-8 justify-between gap-3">
            <div class="flex items-center gap-2 min-w-0">
                <button type="button" id="btn-sidebar" class="md:hidden p-2 rounded-lg hover:bg-white/10" aria-label="選單">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
                <a href="index.php" class="font-bold text-base sm:text-lg truncate">管理後台</a>
                <span class="hidden sm:inline text-indigo-300/80 text-xs truncate"><?php echo $siteNameEn; ?></span>
            </div>
            <nav class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0">
                <a href="../app/" class="px-2 py-1 rounded-lg text-indigo-200 hover:bg-white/10 whitespace-nowrap">前台首頁</a>
                <a href="../portal/simulations.php" class="hidden sm:inline px-2 py-1 rounded-lg text-indigo-200 hover:bg-white/10 whitespace-nowrap">我的模擬</a>
                <?php if ($displayName !== ''): ?>
                    <span class="hidden md:inline text-indigo-300/70 px-1 truncate max-w-[10rem]" title="<?php echo $displayName; ?>"><?php echo $displayName; ?></span>
                <?php endif; ?>
                <a href="../logout.php" class="px-2 py-1 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 whitespace-nowrap">登出</a>
            </nav>
        </div>
    </header>

    <div id="overlay" class="fixed inset-0 bg-slate-900/60 z-30 md:hidden"></div>

    <button id="sidebar-expand" type="button" class="items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label="展開選單">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
        </svg>
    </button>

    <div class="admin-shell pt-16 flex-1">
        <aside id="sidebar" class="bg-slate-900/95 text-slate-300 border-r border-slate-700/60">
            <div id="sidebar-inner">
                <div class="flex items-center justify-between px-4 pt-4 pb-2">
                    <div class="text-[10px] font-bold text-slate-500 tracking-widest uppercase">管理選單</div>
                    <button type="button" id="btn-sidebar-collapse" class="hidden md:flex p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors" aria-label="收合選單" title="收合選單">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
                        </svg>
                    </button>
                </div>
                <nav class="px-2 pb-8 space-y-4" aria-label="後台導覽">
                    <?php foreach (admin_menu_sections() as $section): ?>
                        <div>
                            <div class="px-3 py-1 text-[10px] font-bold text-slate-500 tracking-widest uppercase"><?php echo htmlspecialchars($section['label'], ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="mt-0.5 space-y-0.5">
                                <?php foreach ($section['items'] as $item):
                                    $isActive = $activeKey !== '' && $activeKey === $item['key'];
                                    $accent = $item['accent'] ?? '';
                                    $baseClass = 'block px-3 py-2 rounded-lg text-sm transition-colors';
                                    if ($isActive) {
                                        $linkClass = $baseClass . ' active-nav font-medium';
                                    } elseif ($accent === 'amber') {
                                        $linkClass = $baseClass . ' text-amber-300/90 hover:bg-amber-500/10 hover:text-amber-200';
                                    } else {
                                        $linkClass = $baseClass . ' text-slate-300 hover:bg-slate-700/50 hover:text-white';
                                    }
                                    $external = !empty($item['external']);
                                    ?>
                                    <a href="<?php echo htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8'); ?>"
                                       class="<?php echo $linkClass; ?>"
                                       <?php if ($external): ?>target="_blank" rel="noopener"<?php endif; ?>>
                                        <?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?>
                                        <?php if ($external): ?>
                                            <span class="text-[10px] text-slate-500 ml-1" aria-hidden="true">↗</span>
                                        <?php endif; ?>
                                    </a>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </nav>
            </div>
        </aside>

        <main id="main-content" class="flex-1 py-4 md:py-8 px-3 sm:px-6 lg:px-10">
            <div class="<?php echo $maxW; ?> mx-auto w-full">
                <div class="mb-6 pb-6 border-b border-slate-200/80 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900"><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></h1>
                        <?php if ($subtitle !== ''): ?>
                            <p class="text-slate-500 text-sm mt-1"><?php echo $subtitle; ?></p>
                        <?php endif; ?>
                    </div>
                    <?php if ($actions !== ''): ?>
                        <div class="flex flex-wrap items-center gap-2 text-sm"><?php echo $actions; ?></div>
                    <?php endif; ?>
                </div>
                <div class="admin-page-body space-y-4">
    <?php
}

/**
 * @param array{scripts?:string} $opts
 */
function admin_page_end(array $opts = []): void
{
    $siteName = htmlspecialchars(config_site_name(), ENT_QUOTES, 'UTF-8');
    $siteNameEn = htmlspecialchars(config_site_name_en(), ENT_QUOTES, 'UTF-8');
    $scripts = $opts['scripts'] ?? '';
    ?>
                </div>
            </div>
        </main>
    </div>

    <footer class="bg-slate-900 text-slate-400 text-xs py-4 px-6 text-center border-t border-slate-800">
        <span>管理後台 · <?php echo $siteName; ?> · <?php echo $siteNameEn; ?></span>
    </footer>

    <script src="assets/js/admin-shell.js"></script>
    <?php echo $scripts; ?>
</body>
</html>
    <?php
}
