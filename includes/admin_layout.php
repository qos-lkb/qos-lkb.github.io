<?php

declare(strict_types=1);

require_once __DIR__ . '/web_base.php';

const ADMIN_ASSET_VERSION = '20260724regrade';

/**
 * Admin shell: header bar, side menu, main content (mirrors app/index.html layout).
 */

function admin_web_base(): string
{
    static $base = null;
    if ($base !== null) {
        return $base;
    }

    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($script !== '' && str_contains($script, '/admin/')) {
        $base = rtrim(dirname($script), '/');
    } else {
        $base = rtrim(web_base_path() . '/admin', '/');
    }

    if ($base === '/') {
        $base = '';
    }

    return $base;
}

function admin_site_base(): string
{
    static $base = null;
    if ($base !== null) {
        return $base;
    }

    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($script !== '' && str_contains($script, '/admin/')) {
        $base = rtrim(dirname(dirname($script)), '/');
    } else {
        $base = web_base_path();
    }

    if ($base === '/') {
        $base = '';
    }

    return $base;
}

function admin_asset_url(string $rel): string
{
    return admin_web_base() . '/' . ltrim(str_replace('\\', '/', $rel), '/');
}

function admin_site_asset_url(string $rel): string
{
    return admin_site_base() . '/' . ltrim(str_replace('\\', '/', $rel), '/');
}

function admin_has_any_access(): bool
{
    return user_has_permission('user.manage')
        || user_has_permission('simulation.manage_any')
        || user_has_permission('learning_tool.manage_any')
        || user_has_permission('article.manage_any')
        || user_has_permission('learning_note.manage_any')
        || user_has_permission('worksheet.manage_any')
        || user_has_permission('worksheet.manage_own')
        || user_has_permission('worksheet.assign_own')
        || user_has_permission('worksheet.grade_own')
        || user_has_permission('learning_video.manage_any')
        || user_has_permission('topic_item.manage_any')
        || user_has_permission('question_bank.manage_any')
        || user_has_permission('question_bank.manage_own')
        || user_has_permission('class.manage_own')
        || user_has_permission('class.manage_any')
        || user_has_permission('summer_homework.manage_any')
        || user_has_permission('summer_homework.manage_own');
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
    } elseif (user_has_permission('worksheet.manage_own')) {
        $contentItems[] = ['key' => 'worksheets', 'label' => '我的工作紙', 'href' => 'worksheets.php', 'accent' => 'indigo'];
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
    if (user_has_permission('summer_homework.manage_any')
        || user_has_permission('summer_homework.manage_own')
        || user_has_permission('class.manage_any')
        || user_has_permission('class.manage_own')
    ) {
        $contentItems[] = ['key' => 'summer_homework', 'label' => '暑期功課', 'href' => 'summer_homework.php', 'accent' => 'amber'];
    }
    if (user_has_permission('question_bank.manage_any')) {
        $contentItems[] = ['key' => 'question_banks', 'label' => '試題庫', 'href' => 'question_banks.php'];
    } elseif (user_has_permission('question_bank.manage_own')) {
        $contentItems[] = ['key' => 'question_banks', 'label' => '我的試題庫', 'href' => 'question_banks.php', 'accent' => 'indigo'];
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

    $courseItems = [];
    if (user_has_permission('class.manage_any') || user_has_permission('class.manage_own')) {
        $courseItems[] = ['key' => 'courses', 'label' => '課程管理', 'href' => 'courses.php', 'accent' => 'blue'];
        $courseItems[] = ['key' => 'course_reports', 'label' => '課程報告', 'href' => 'courses.php', 'accent' => 'teal'];
        if (user_has_permission('worksheet.assign_own') || user_has_permission('class.manage_any')) {
            $courseItems[] = ['key' => 'course_worksheets', 'label' => '工作紙派發', 'href' => 'courses.php', 'accent' => 'violet'];
        }
    }
    if ($courseItems !== []) {
        $sections[] = ['label' => '學習分析', 'items' => $courseItems];
    }

    if (user_has_permission('user.manage')) {
        $sections[] = [
            'label' => '平台設定',
            'items' => [
                ['key' => 'subjects', 'label' => '科目與單元', 'href' => 'subjects.php'],
                ['key' => 'nav_menu', 'label' => '前台選單可見性', 'href' => 'nav_menu.php'],
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
                ['key' => 'qsis_import', 'label' => 'QSIS 匯入', 'href' => 'qsis_import.php', 'accent' => 'teal'],
                ['key' => 'db_import', 'label' => '匯入資料庫', 'href' => 'db_import.php'],
                ['key' => 'db_export', 'label' => '匯出資料庫', 'href' => 'db_export.php'],
                ['key' => 'data_dictionary', 'label' => '資料字典', 'href' => 'data_dictionary.php', 'accent' => 'violet'],
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
 * @return array<string, array<string, int>|array{published:int,pending:int,draft:int}>
 */
function admin_dashboard_stats(PDO $pdo): array
{
    $stats = [];
    $tables = [];
    if (user_has_permission('learning_note.manage_any')) {
        $tables[] = 'learning_notes';
    }
    if (user_has_permission('worksheet.manage_any')) {
        $tables[] = 'worksheets';
    }
    if (user_has_permission('article.manage_any')) {
        $tables[] = 'science_articles';
    }
    if (user_has_permission('learning_tool.manage_any')) {
        $tables[] = 'learning_tools';
    }
    if (user_has_permission('learning_video.manage_any')) {
        $tables[] = 'learning_videos';
    }
    if (user_has_permission('simulation.manage_any')) {
        $tables[] = 'simulations';
    }

    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query(
                "SELECT
                    SUM(status = 'published') AS published,
                    SUM(status = 'pending_review') AS pending,
                    SUM(status = 'draft') AS draft
                 FROM {$table}"
            );
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                continue;
            }
            $stats[$table] = [
                'published' => (int) ($row['published'] ?? 0),
                'pending' => (int) ($row['pending'] ?? 0),
                'draft' => (int) ($row['draft'] ?? 0),
            ];
        } catch (Throwable $e) {
            // table may not exist on older installs
        }
    }

    $stats['_totals'] = ['published' => 0, 'pending' => 0, 'draft' => 0];
    foreach ($stats as $key => $row) {
        if ($key === '_totals' || !is_array($row)) {
            continue;
        }
        $stats['_totals']['published'] += $row['published'];
        $stats['_totals']['pending'] += $row['pending'];
        $stats['_totals']['draft'] += $row['draft'];
    }

    return $stats;
}

/**
 * @return array<string, array{icon:string, tone:string, desc:string}>
 */
function admin_dashboard_card_meta(): array
{
    return [
        'learning_notes' => ['icon' => 'note', 'tone' => 'indigo', 'desc' => '管理學習筆記內容、排序與發佈狀態。'],
        'worksheets' => ['icon' => 'sheet', 'tone' => 'sky', 'desc' => '管理工作紙與可列印內容。'],
        'simulations' => ['icon' => 'sim', 'tone' => 'violet', 'desc' => '檢視、編輯與排序全部互動模擬程式。'],
        'articles' => ['icon' => 'article', 'tone' => 'emerald', 'desc' => '管理科學文章與閱讀測驗。'],
        'learning_tools' => ['icon' => 'quiz', 'tone' => 'cyan', 'desc' => '管理互動學習工具與小測。'],
        'summer_homework' => ['icon' => 'note', 'tone' => 'amber', 'desc' => '中一／中二暑期功課：閱讀或影片 + 選擇／填充題。'],
        'question_banks' => ['icon' => 'bank', 'tone' => 'rose', 'desc' => '維護試題庫與題目資料。'],
        'learning_videos' => ['icon' => 'video', 'tone' => 'fuchsia', 'desc' => '管理學習影片與發佈狀態。'],
        'course_curriculum' => ['icon' => 'course', 'tone' => 'indigo', 'desc' => '編排自學課程與前台課程樹結構。'],
        'review_queue' => ['icon' => 'review', 'tone' => 'amber', 'desc' => '審核待發佈的投稿內容。'],
        'subjects' => ['icon' => 'folder', 'tone' => 'slate', 'desc' => '維護科目、單元與前台側欄目錄結構。'],
        'nav_menu' => ['icon' => 'course', 'tone' => 'indigo', 'desc' => '控制各類使用者在前台上方選單可見的項目。'],
        'users' => ['icon' => 'users', 'tone' => 'blue', 'desc' => '新增、編輯使用者並指派角色。'],
        'courses' => ['icon' => 'users', 'tone' => 'blue', 'desc' => '管理課程、邀請碼與學生名單。'],
        'course_reports' => ['icon' => 'sheet', 'tone' => 'teal', 'desc' => '檢視課程學習報告與掌握度。'],
        'permissions' => ['icon' => 'lock', 'tone' => 'slate', 'desc' => '調整各角色的系統權限。'],
        'codespace' => ['icon' => 'code', 'tone' => 'slate', 'desc' => 'HTML 即時編輯與預覽（新分頁開啟）。'],
        'db_import' => ['icon' => 'db', 'tone' => 'orange', 'desc' => '上載 SQL 還原或取代整個資料庫。'],
        'db_export' => ['icon' => 'db', 'tone' => 'teal', 'desc' => '下載完整 MySQL 資料庫 SQL 備份。'],
        'data_dictionary' => ['icon' => 'note', 'tone' => 'violet', 'desc' => '閱讀 schema 資料字典並重新產生 Markdown。'],
        'qsis_import' => ['icon' => 'users', 'tone' => 'teal', 'desc' => '從校本 QSIS 資料庫匯入課程與學生帳戶。'],
    ];
}

function admin_dashboard_icon_svg(string $icon): string
{
    $paths = [
        'note' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
        'sheet' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 17v-2m3 2v-4m3 4v-6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
        'sim' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        'article' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2"/>',
        'quiz' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        'bank' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M8 11h8"/>',
        'video' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
        'course' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 6h16M4 10h16M4 14h10M4 18h6"/>',
        'review' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        'folder' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
        'users' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
        'lock' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>',
        'code' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
        'db' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>',
    ];
    $path = $paths[$icon] ?? $paths['folder'];
    return '<svg class="admin-dash-card-icon-svg" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' . $path . '</svg>';
}

/**
 * @param array{subtitle?:string,actions?:string,wide?:bool,bodyClass?:string,headExtra?:string,hideTitle?:bool} $opts
 */
function admin_page_start(string $title, string $activeKey = '', array $opts = []): void
{
    $siteName = htmlspecialchars(config_site_name(), ENT_QUOTES, 'UTF-8');
    $siteNameEn = htmlspecialchars(config_site_name_en(), ENT_QUOTES, 'UTF-8');
    $user = current_user();
    $subtitle = $opts['subtitle'] ?? '';
    $actions = $opts['actions'] ?? '';
    $wide = !empty($opts['wide']);
    $hideTitle = !empty($opts['hideTitle']);
    $bodyClass = $opts['bodyClass'] ?? '';
    $headExtra = $opts['headExtra'] ?? '';
    $maxW = $wide ? 'max-w-7xl' : 'max-w-6xl';
    $adminBaseHref = admin_web_base() . '/';
    $adminCssUrl = admin_asset_url('assets/css/admin.css') . '?v=' . ADMIN_ASSET_VERSION;
    $userMenuCssUrl = admin_site_asset_url('assets/css/user-menu.css') . '?v=' . ADMIN_ASSET_VERSION;
    $appHref = admin_site_asset_url('app/');

    $pageTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . ' | 管理後台';
    ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="<?php echo htmlspecialchars($adminBaseHref, ENT_QUOTES, 'UTF-8'); ?>">
    <title><?php echo $pageTitle; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="<?php echo htmlspecialchars($adminCssUrl, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="stylesheet" href="<?php echo htmlspecialchars($userMenuCssUrl, ENT_QUOTES, 'UTF-8'); ?>">
    <script>window.__APP_TIMEZONE__=<?php echo json_encode(config_timezone(), JSON_UNESCAPED_UNICODE); ?>;</script>
    <?php if ($bodyClass === 'admin-dashboard-page'): ?>
    <style id="admin-dashboard-critical">
    .admin-dashboard{display:flex;flex-direction:column;gap:1.75rem}
    .admin-dashboard-hero{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1.25rem;padding:1.5rem 1.75rem;border-radius:1.25rem;background:linear-gradient(135deg,#312e81 0%,#4338ca 45%,#6366f1 100%);color:#fff;box-shadow:0 12px 40px -12px rgba(49,46,129,.55)}
    .admin-dashboard-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.875rem}
    .admin-stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:1rem 1.25rem}
    .admin-dash-grid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:.75rem}
    @media(min-width:640px){.admin-dash-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1024px){.admin-dash-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    .admin-dash-card{display:flex;align-items:flex-start;gap:.875rem;padding:1rem 1.125rem;background:#fff;border:1px solid #e2e8f0;border-radius:1rem;text-decoration:none;color:inherit}
    .admin-dash-card-icon{display:flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;border-radius:.75rem;flex-shrink:0}
    .admin-dash-card-icon svg,.admin-dash-card-icon-svg{width:1.375rem!important;height:1.375rem!important;max-width:1.375rem;max-height:1.375rem;display:block}
    .admin-dash-card-arrow svg{width:1.125rem!important;height:1.125rem!important;display:block}
    </style>
    <?php endif; ?>
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
                <a href="<?php echo htmlspecialchars($appHref, ENT_QUOTES, 'UTF-8'); ?>" class="hidden sm:inline px-2 py-1 rounded-lg text-indigo-200 hover:bg-white/10 whitespace-nowrap">前台首頁</a>
                <div id="auth-nav"></div>
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
                <?php if (!$hideTitle): ?>
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
                <?php endif; ?>
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
    $adminShellJsUrl = admin_asset_url('assets/js/admin-shell.js') . '?v=' . ADMIN_ASSET_VERSION;
    $userMenuJsUrl = admin_site_asset_url('assets/js/user-menu.js') . '?v=' . ADMIN_ASSET_VERSION;
    ?>
                </div>
            </div>
        </main>
    </div>

    <footer class="bg-slate-900 text-slate-400 text-xs py-4 px-6 text-center border-t border-slate-800">
        <span>管理後台 · <?php echo $siteName; ?> · <?php echo $siteNameEn; ?></span>
    </footer>

    <script src="<?php echo htmlspecialchars($adminShellJsUrl, ENT_QUOTES, 'UTF-8'); ?>"></script>
    <script src="<?php echo htmlspecialchars($userMenuJsUrl, ENT_QUOTES, 'UTF-8'); ?>"></script>
    <script>
    document.addEventListener('DOMContentLoaded', function () {
        if (window.AppUserMenu) {
            AppUserMenu.init();
            AppUserMenu.updateAuthNav('auth-nav');
        }
    });
    </script>
    <?php echo $scripts; ?>
</body>
</html>
    <?php
}
