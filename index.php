<?php
// 輸出緩衝（可選：WRITE_INDEX_HTML_SNAPSHOT=1 時寫出靜態 index.html）
ob_start();

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/simulations_lib.php';

bootstrap_public();

try {
    $pdo = db();
    $struct = sim_build_index_structures(sim_fetch_published_for_index($pdo));
    $subjectsData = $struct['subjects'];
    $categoryMap = $struct['categoryMap'];
    $titleMap = $struct['titleMap'];
} catch (Throwable $e) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>無法載入</title></head><body><p>無法連線資料庫或尚未設定 .env／includes/config.local.php。</p><p>若已設定，請確認 MariaDB 服務已啟動，且資料庫與資料表已正確建立。</p></body></html>';
    exit;
}

if (empty($subjectsData)) {
    $subjectsData = [
        'Empty' => [
            'label_zh' => '尚無已發佈模擬',
            'label_en' => 'No published simulations',
            'topics' => [
                '__none__' => [
                    'label_zh' => '—',
                    'label_en' => '—',
                    'items' => [],
                ],
            ],
        ],
    ];
    $categoryMap['Empty'] = ['zh' => '尚無已發佈模擬', 'en' => 'No published simulations'];
}

$firstSubjectKey = array_key_first($subjectsData);
$firstSubjectInfo = $firstSubjectKey !== null ? $subjectsData[$firstSubjectKey] : null;

$navUser = current_user();
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>科學模擬實驗平台 | Science Simulations Platform</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- MathJax -->
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <!-- html2canvas for screenshot -->
    <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
    <style>
        :root {
            --header-h: 4rem;
            --sidebar-w: 16rem;
        }

        /* 子選單展開動畫 */
        .submenu { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
        .submenu.open { max-height: 1200px; }
        .rotate-icon { transition: transform 0.3s; }
        .rotate-icon.active { transform: rotate(180deg); }

        /* App shell */
        .app-shell {
            display: flex;
            min-height: calc(100vh - var(--header-h));
        }

        /* 側邊欄：桌面 sticky + 可收合；行動 fixed overlay */
        #sidebar {
            width: var(--sidebar-w);
            flex-shrink: 0;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.25s ease;
            will-change: transform, width;
        }
        @media (min-width: 768px) {
            #sidebar {
                position: sticky;
                top: var(--header-h);
                height: calc(100vh - var(--header-h));
            }
            #sidebar.sidebar-collapsed {
                width: 0;
                opacity: 0;
                pointer-events: none;
                overflow: hidden;
            }
        }
        @media (max-width: 767px) {
            #sidebar {
                position: fixed;
                left: 0;
                top: var(--header-h);
                height: calc(100vh - var(--header-h));
                width: min(var(--sidebar-w), 88vw);
                transform: translateX(-100%);
                z-index: 40;
            }
            #sidebar.sidebar-open {
                transform: translateX(0);
            }
        }

        /* 收合後浮動展開鈕 */
        #sidebar-expand {
            display: none;
            position: fixed;
            left: 0;
            top: calc(var(--header-h) + 1rem);
            z-index: 35;
            border-radius: 0 0.5rem 0.5rem 0;
            padding: 0.625rem 0.5rem 0.625rem 0.375rem;
            background: linear-gradient(135deg, #312e81, #4338ca);
            color: white;
            box-shadow: 2px 2px 12px rgba(49, 46, 129, 0.35);
            transition: opacity 0.2s, transform 0.2s;
        }
        #sidebar-expand:hover { transform: translateX(2px); }
        body.sidebar-is-collapsed #sidebar-expand { display: flex; }

        /* 側欄內捲軸 */
        #sidebar-inner {
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
        }
        #sidebar-inner::-webkit-scrollbar { width: 5px; }
        #sidebar-inner::-webkit-scrollbar-track { background: transparent; }
        #sidebar-inner::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }

        /* 導航項目 */
        .nav-group-btn {
            border-left: 3px solid transparent;
        }
        .nav-group-btn.active-nav {
            background: rgba(99, 102, 241, 0.15);
            color: #e0e7ff;
            border-left-color: #818cf8;
        }
        .topic-nav-btn:hover {
            background: rgba(99, 102, 241, 0.08);
        }
        .topic-nav-btn.active-nav {
            background: rgba(99, 102, 241, 0.12);
            color: #c7d2fe;
        }

        /* 主內容：課題可收合區塊 */
        .topic-panel-body {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .topic-panel.open .topic-panel-body {
            max-height: 8000px;
        }
        .topic-panel.open .topic-panel-icon {
            transform: rotate(180deg);
        }
        .topic-panel-header:focus-visible {
            outline: 2px solid #818cf8;
            outline-offset: -2px;
        }

        /* 主內容區 */
        #main-content {
            flex: 1;
            min-width: 0;
            transition: padding 0.3s ease;
        }

        /* 自定義捲軸（全站） */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* 遮罩層 */
        #overlay {
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        #overlay.active {
            display: block;
            opacity: 1;
        }

        /* Container 樣式 */
        .container {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 1rem;
            width: 100%;
        }
        @media (min-width: 640px) {
            .container { padding: 0 1.5rem; }
        }
        @media (min-width: 1024px) {
            .container { padding: 0 2rem; }
        }

        /* 模擬卡片 */
        .sim-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .sim-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 24px -8px rgba(49, 46, 129, 0.15);
            border-color: #c7d2fe;
        }

        /* 麵包屑 */
        .breadcrumb-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.625rem;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid #e2e8f0;
            font-size: 0.75rem;
        }
        @media (min-width: 768px) {
            .breadcrumb-pill { font-size: 0.8125rem; }
        }
        
        /* Modal 樣式 */
        #sim-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100;
            background-color: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
        }
        #sim-modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #sim-modal-content {
            position: relative;
            width: 95%;
            height: 90%;
            max-width: 1200px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .sim-modal-tool-btn {
            position: absolute;
            top: 2vh;
            width: 3rem;
            height: 3rem;
            background-color: rgba(0, 0, 0, 0.75);
            border: 2px solid rgba(255, 255, 255, 0.95);
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 101;
            backdrop-filter: blur(4px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
        .sim-modal-tool-btn:hover {
            background-color: rgba(0, 0, 0, 0.8);
            border-color: white;
            transform: scale(1.1);
        }
        .sim-modal-tool-btn:active {
            transform: scale(0.95);
        }
        .sim-modal-tool-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        #sim-modal-fullscreen {
            left: 2vw;
        }
        #sim-modal-capture {
            right: calc(2vw + 4rem);
        }
        #sim-modal-close {
            right: 2vw;
        }
        #sim-modal.fullscreen-mode {
            background-color: #ffffff;
            backdrop-filter: none;
        }
        #sim-modal.fullscreen-mode #sim-modal-content {
            width: 100%;
            height: 100%;
            max-width: none;
            border-radius: 0;
            box-shadow: none;
        }
        #sim-modal-iframe {
            flex: 1;
            width: 100%;
            border: none;
            background-color: white;
        }
        @media (max-width: 768px) {
            #sim-modal-content {
                width: 100%;
                height: 100%;
                border-radius: 0;
            }
            .sim-modal-tool-btn {
                top: 1rem;
                width: 2.75rem;
                height: 2.75rem;
            }
            #sim-modal-fullscreen {
                left: 1rem;
            }
            #sim-modal-capture {
                right: calc(1rem + 3.5rem);
            }
            #sim-modal-close {
                right: 1rem;
            }
        }
        
        /* Footer 樣式 */
        footer {
            background: linear-gradient(to right, #0f172a, #1e293b);
            color: #cbd5e1;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            margin-top: auto;
            padding: 0.875rem 0;
        }
        footer .container {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 1rem;
            text-align: right;
            flex-wrap: wrap;
        }
        .footer-copyright {
            font-size: 0.8125rem;
            color: #94a3b8;
        }
        .footer-license {
            font-size: 0.8125rem;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        .footer-license a {
            color: #60a5fa;
            text-decoration: none;
            transition: all 0.2s;
        }
        .footer-license a:hover {
            color: #93c5fd;
        }
        .cc-badge {
            display: inline-block;
            padding: 0.2rem 0.4rem;
            background-color: rgba(96, 165, 250, 0.1);
            border: 1px solid #60a5fa;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .footer-license a:hover .cc-badge {
            background-color: rgba(96, 165, 250, 0.2);
            border-color: #93c5fd;
        }
        @media (max-width: 768px) {
            footer {
                padding: 0.625rem 0;
            }
            footer .container {
                justify-content: center;
                text-align: center;
                gap: 0.5rem;
            }
            .footer-copyright,
            .footer-license {
                font-size: 0.75rem;
            }
        }
    </style>
</head>
<body class="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 font-sans text-slate-900 overflow-x-hidden flex flex-col min-h-screen antialiased">

    <!-- 1. 標題列 -->
    <header class="fixed w-full z-50 top-0 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 text-white shadow-lg shadow-indigo-950/20 border-b border-white/10 backdrop-blur-md">
        <div class="flex items-center h-16 w-full">
            <div class="flex flex-1 justify-between items-center min-w-0 pl-3 sm:pl-6 lg:pl-8 pr-3 sm:pr-6 lg:pr-8">
                <div class="flex-shrink min-w-0 flex items-center gap-2 cursor-pointer" onclick="location.reload()">
                    <div class="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <svg class="w-5 h-5 md:w-6 md:h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </div>
                    <span class="font-bold text-base sm:text-lg md:text-xl tracking-tight truncate" id="app-title">科學模擬實驗平台</span>
                </div>

                <div class="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
                    <?php if ($navUser !== null): ?>
                        <a href="portal/simulations.php" class="hidden sm:inline px-2 py-1 md:px-3 text-xs md:text-sm text-indigo-200 hover:text-white rounded-lg hover:bg-white/5 transition-colors">我的模擬</a>
                        <?php if (user_has_permission('user.manage') || user_has_permission('simulation.manage_any')): ?>
                            <a href="admin/index.php" class="hidden sm:inline px-2 py-1 md:px-3 text-xs md:text-sm text-amber-200 hover:text-white rounded-lg hover:bg-white/5 transition-colors">管理</a>
                        <?php endif; ?>
                        <a href="logout.php" class="hidden sm:inline px-2 py-1 md:px-3 text-xs md:text-sm text-indigo-200 hover:text-white rounded-lg hover:bg-white/5 transition-colors">登出</a>
                    <?php else: ?>
                        <a href="login.php" class="hidden sm:inline px-2 py-1 md:px-3 text-xs md:text-sm text-indigo-200 hover:text-white rounded-lg hover:bg-white/5 transition-colors">登入</a>
                    <?php endif; ?>
                    <button onclick="toggleLang()" class="px-2.5 py-1 md:px-4 md:py-1.5 rounded-full bg-white/10 border border-white/20 hover:bg-white hover:text-indigo-900 transition-all text-xs md:text-sm font-medium backdrop-blur-sm">
                        中 / EN
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- 背景遮罩 (Mobile 選單開啟時) -->
    <div id="overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden" onclick="toggleSidebar()"></div>

    <!-- 桌面收合後的展開鈕 -->
    <button id="sidebar-expand" type="button" aria-label="展開選單" onclick="toggleSidebar()"
            class="items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
        </svg>
    </button>

    <div class="app-shell pt-16 flex-1">
        <!-- 2. 左方選單列 -->
        <aside id="sidebar" class="bg-slate-900/95 text-slate-300 border-r border-slate-700/60 backdrop-blur-xl shadow-xl md:shadow-none z-40">
            <div id="sidebar-inner">
                <div class="flex items-center justify-between px-4 pt-4 pb-2">
                    <div class="uppercase text-[10px] font-bold text-slate-500 tracking-[2px]" id="core-label">核心單元 Compulsory</div>
                    <button type="button" onclick="toggleSidebar()" aria-label="收合選單"
                            class="hidden md:flex p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
                        </svg>
                    </button>
                </div>

            <nav class="mt-1 space-y-0.5 px-2 pb-8" id="main-nav">
                <?php
                $firstCategory = true;
                foreach ($subjectsData as $category => $subInfo):
                    $categoryId = strtolower(str_replace(' ', '-', $category));
                    $categoryZh = isset($categoryMap[$category]) ? $categoryMap[$category]['zh'] : $category;
                    $categoryEn = isset($categoryMap[$category]) ? $categoryMap[$category]['en'] : $category;
                    $topicsNav = $subInfo['topics'] ?? [];
                ?>
                <div class="nav-group <?php echo $firstCategory ? '' : 'border-t border-slate-700/40 mt-1 pt-1'; ?>">
                    <button type="button" onclick="toggleSub(this); showCategory(<?php echo htmlspecialchars(json_encode($categoryId), ENT_QUOTES, 'UTF-8'); ?>, null);" class="nav-group-btn group w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">
                        <span class="main-label" data-zh="<?php echo htmlspecialchars($categoryZh); ?>" data-en="<?php echo htmlspecialchars($categoryEn); ?>"><?php echo htmlspecialchars($categoryZh); ?></span>
                        <svg class="w-4 h-4 rotate-icon <?php echo $firstCategory ? 'active' : ''; ?>" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="submenu bg-slate-950/50 rounded-lg mx-1 mb-1 <?php echo $firstCategory ? 'open' : ''; ?>">
                        <?php foreach ($topicsNav as $topicKey => $topicInfo):
                            $tZh = $topicInfo['label_zh'] ?? '';
                            $tEn = $topicInfo['label_en'] ?? '';
                            $itemCount = count($topicInfo['items'] ?? []);
                        ?>
                            <button type="button" class="topic-nav-btn w-full text-left px-3 py-2 text-xs font-semibold text-slate-400 hover:text-indigo-300 rounded-md transition-colors border-t border-slate-700/30 first:border-t-0" onclick="event.stopPropagation(); showCategory(<?php echo htmlspecialchars(json_encode($categoryId), ENT_QUOTES, 'UTF-8'); ?>, <?php echo htmlspecialchars(json_encode((string) $topicKey), ENT_QUOTES, 'UTF-8'); ?>);">
                                <span class="topic-nav-label" data-zh="<?php echo htmlspecialchars($tZh, ENT_QUOTES, 'UTF-8'); ?>" data-en="<?php echo htmlspecialchars($tEn, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($tZh); ?></span>
                                <?php if ($itemCount > 0): ?>
                                    <span class="topic-nav-count ml-1 text-slate-500">(<?php echo $itemCount; ?>)</span>
                                <?php endif; ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php
                $firstCategory = false;
                endforeach;
                ?>
            </nav>
            </div>
        </aside>

        <!-- 3. 主顯示區域 -->
        <main id="main-content" class="py-4 md:py-8 px-3 sm:px-5 md:px-8 lg:px-10">
            <div class="max-w-6xl mx-auto w-full">
                <div class="mb-6 md:mb-8 pb-6 border-b border-slate-200/80">
                    <nav class="flex flex-wrap items-center gap-2 mb-3" aria-label="breadcrumb">
                        <span class="breadcrumb-pill text-slate-500">
                            <span id="breadcrumb-parent" data-zh="<?php echo $firstSubjectInfo ? htmlspecialchars($firstSubjectInfo['label_zh']) : ''; ?>" data-en="<?php echo $firstSubjectInfo ? htmlspecialchars($firstSubjectInfo['label_en']) : ''; ?>"><?php echo $firstSubjectInfo ? htmlspecialchars($firstSubjectInfo['label_zh']) : ''; ?></span>
                            <span class="text-slate-300 mx-0.5">/</span>
                            <span id="breadcrumb-topic" data-zh="所有單元" data-en="All units">所有單元</span>
                            <span class="text-slate-300 mx-0.5">/</span>
                            <span id="breadcrumb-child" class="text-indigo-600 font-medium" data-zh="模擬列表" data-en="Simulations">模擬列表</span>
                        </span>
                    </nav>
                    <h1 id="page-title" class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight" data-zh="<?php echo $firstSubjectInfo ? htmlspecialchars($firstSubjectInfo['label_zh'] . '模擬實驗') : ''; ?>" data-en="<?php echo $firstSubjectInfo ? htmlspecialchars($firstSubjectInfo['label_en'] . ' Simulations') : ''; ?>"><?php echo $firstSubjectInfo ? htmlspecialchars($firstSubjectInfo['label_zh']) : ''; ?>模擬實驗</h1>
                </div>

                <div id="card-container" class="space-y-3 md:space-y-4">
                <?php
                if ($firstSubjectInfo !== null):
                    $topicIndex = 0;
                    foreach ($firstSubjectInfo['topics'] as $topicKey => $topicInfo):
                        $isFirstTopic = ($topicIndex === 0);
                        $topicItemCount = count($topicInfo['items'] ?? []);
                ?>
                <section class="topic-panel bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden <?php echo $isFirstTopic ? 'open' : ''; ?>" data-topic-key="<?php echo htmlspecialchars((string) $topicKey, ENT_QUOTES, 'UTF-8'); ?>">
                    <button type="button" class="topic-panel-header w-full flex items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 hover:bg-slate-50/80 transition-colors text-left"
                            onclick="toggleTopicPanel(this)" aria-expanded="<?php echo $isFirstTopic ? 'true' : 'false'; ?>">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-1 h-6 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true"></span>
                            <h2 class="topic-heading text-base sm:text-lg font-semibold text-slate-800 truncate" data-zh="<?php echo htmlspecialchars($topicInfo['label_zh'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" data-en="<?php echo htmlspecialchars($topicInfo['label_en'] ?? '', ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($topicInfo['label_zh'] ?? ''); ?></h2>
                            <span class="topic-count flex-shrink-0 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"><?php echo $topicItemCount; ?></span>
                        </div>
                        <svg class="topic-panel-icon w-5 h-5 text-slate-400 flex-shrink-0 rotate-icon <?php echo $isFirstTopic ? 'active' : ''; ?>" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <div class="topic-panel-body">
                        <div class="px-3 pb-4 md:px-5 md:pb-5 pt-1 border-t border-slate-100">
                            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 topic-card-grid">
                <?php
                        foreach ($topicInfo['items'] as $item):
                            $exportUrl = $item['export_url'] ?? $item['url'];
                            $titleZh = isset($titleMap[$item['title']]) ? $titleMap[$item['title']]['zh'] : $item['title'];
                            $titleEn = isset($titleMap[$item['title']]) ? $titleMap[$item['title']]['en'] : $item['title'];
                            $lastUpdated = isset($item['last_updated']) ? $item['last_updated'] : '2026-01-01';
                            $unitZh = $item['topic_label_zh'] ?? '';
                            $unitEn = $item['topic_label_en'] ?? '';
                ?>
                <div onclick="openModal('<?php echo htmlspecialchars($item['url'], ENT_QUOTES, 'UTF-8'); ?>')" class="sim-card bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col cursor-pointer">
                    <div class="h-32 md:h-36 bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center border-b border-slate-100 relative group overflow-hidden">
                        <?php if (!empty($item['screenshot'])): ?>
                            <img src="<?php echo htmlspecialchars($item['screenshot']); ?>" alt="<?php echo htmlspecialchars($titleZh); ?>" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span class="text-slate-400 text-sm image-placeholder" data-zh="[實驗影像]" data-en="[Experiment Image]" style="display: none;">[實驗影像]</span>
                        <?php else: ?>
                            <span class="text-slate-400 text-sm image-placeholder" data-zh="[實驗影像]" data-en="[Experiment Image]">[實驗影像]</span>
                        <?php endif; ?>
                        <div class="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors"></div>
                    </div>
                    <div class="p-4 md:p-5 flex-grow">
                        <p class="topic-badge text-[11px] text-indigo-600 font-medium mb-1" data-zh="<?php echo htmlspecialchars($unitZh, ENT_QUOTES, 'UTF-8'); ?>" data-en="<?php echo htmlspecialchars($unitEn, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($unitZh); ?></p>
                        <h3 class="font-bold text-base md:text-lg text-slate-800 mb-2 card-t" data-zh="<?php echo htmlspecialchars($titleZh); ?>" data-en="<?php echo htmlspecialchars($titleEn); ?>"><?php echo htmlspecialchars($titleZh); ?></h3>
                        <p class="text-slate-600 text-xs md:text-sm leading-relaxed mb-4 card-d" data-zh="點擊進入模擬實驗" data-en="Click to enter simulation">點擊進入模擬實驗</p>
                    </div>
                    <div class="px-4 py-2 md:px-5 md:py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <p class="text-[10px] md:text-[11px] text-slate-400 font-medium tracking-wide update-text" data-zh="最後更新日期：<?php echo htmlspecialchars($lastUpdated); ?>" data-en="Last Updated: <?php echo htmlspecialchars($lastUpdated); ?>">最後更新日期：<?php echo htmlspecialchars($lastUpdated); ?></p>
                        <button onclick="downloadSourceCode('<?php echo htmlspecialchars($exportUrl, ENT_QUOTES, 'UTF-8'); ?>'); event.stopPropagation();"
                                class="px-2 py-1 text-[10px] md:text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 download-btn"
                                title="下載源程式碼 / Download Source Code"
                                data-zh="下載源碼"
                                data-en="Download">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span class="download-btn-text" data-zh="下載源碼" data-en="Download">下載源碼</span>
                        </button>
                    </div>
                </div>
                <?php
                        endforeach;
                ?>
                    </div>
                        </div>
                    </div>
                </section>
                <?php
                    $topicIndex++;
                    endforeach;
                endif;
                ?>
                </div>
            </div>
        </main>
    </div>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-copyright" id="footer-copyright" data-zh="版權 © Mr. Bryan Leung" data-en="Copyright © Mr. Bryan Leung">版權 © Mr. Bryan Leung</div>
            <div class="footer-license" id="footer-license">
                <span data-zh="開源及 Creative Commons，可以自由使用。" data-en="Open source and Creative Commons, free to use.">開源及 Creative Commons，可以自由使用。</span>
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" class="cc-link" title="Creative Commons Attribution 4.0 International License">
                    <span class="cc-badge">CC BY 4.0</span>
                </a>
            </div>
        </div>
    </footer>

    <!-- Modal for Simulation -->
    <div id="sim-modal" onclick="closeModalOnBackdrop(event)">
        <button id="sim-modal-fullscreen" type="button" class="sim-modal-tool-btn" onclick="toggleModalFullscreen(); event.stopPropagation();" aria-label="全螢幕" title="顯示成全螢幕">
            <svg id="sim-modal-fullscreen-expand" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
            <svg id="sim-modal-fullscreen-compress" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"></path>
            </svg>
        </button>
        <button id="sim-modal-close" type="button" class="sim-modal-tool-btn" onclick="closeModal(); event.stopPropagation();" aria-label="關閉" title="關閉">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
        <button id="sim-modal-capture" type="button" class="sim-modal-tool-btn" onclick="captureModal(); event.stopPropagation();" aria-label="截圖" title="截圖並下載為 PNG">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
        </button>
        <div id="sim-modal-content" onclick="event.stopPropagation()">
            <iframe id="sim-modal-iframe" src="" title="模擬內容" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-same-origin"></iframe>
        </div>
    </div>

    <script>
        let currentLang = 'zh';
        const subjectData = <?php echo json_encode($subjectsData, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
        const categoryMap = <?php echo json_encode($categoryMap, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
        const titleMap = <?php echo json_encode($titleMap, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;

        // 摺疊/展開子選單（側欄科目）
        function toggleSub(btn) {
            const submenu = btn.nextElementSibling;
            const icon = btn.querySelector('.rotate-icon');
            submenu.classList.toggle('open');
            icon.classList.toggle('active');
        }

        // 摺疊/展開課題區塊（主內容）
        function toggleTopicPanel(btn) {
            const panel = btn.closest('.topic-panel');
            if (!panel) return;
            const icon = btn.querySelector('.topic-panel-icon');
            const willOpen = !panel.classList.contains('open');
            panel.classList.toggle('open');
            btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            if (icon) icon.classList.toggle('active', willOpen);
        }

        function cardHtmlFromItem(item) {
            const titleZh = titleMap[item.title] ? titleMap[item.title]['zh'] : item.title;
            const titleEn = titleMap[item.title] ? titleMap[item.title]['en'] : item.title;
            const screenshot = item.screenshot || '';
            const hasScreenshot = screenshot && screenshot.trim() !== '';
            const lastUpdated = item.last_updated || '2026-01-01';
            const exportUrl = item.export_url || item.url;
            const unitZh = item.topic_label_zh || '';
            const unitEn = item.topic_label_en || '';
            return `
                <div onclick="openModal('${escapeHtml(item.url)}')" class="sim-card bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col cursor-pointer">
                    <div class="h-32 md:h-36 bg-gradient-to-br from-slate-100 to-indigo-50/50 flex items-center justify-center border-b border-slate-100 relative group overflow-hidden">
                        ${hasScreenshot ?
                            `<img src="${escapeHtml(screenshot)}" alt="${escapeHtml(titleZh)}" class="w-full h-full object-cover">` :
                            `<span class="text-slate-400 text-sm image-placeholder" data-zh="[實驗影像]" data-en="[Experiment Image]">${currentLang === 'zh' ? '[實驗影像]' : '[Experiment Image]'}</span>`
                        }
                        <div class="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors"></div>
                    </div>
                    <div class="p-4 md:p-5 flex-grow">
                        <p class="topic-badge text-[11px] text-indigo-600 font-medium mb-1" data-zh="${escapeHtml(unitZh)}" data-en="${escapeHtml(unitEn)}">${escapeHtml(currentLang === 'zh' ? unitZh : unitEn)}</p>
                        <h3 class="font-bold text-base md:text-lg text-slate-800 mb-2 card-t" data-zh="${escapeHtml(titleZh)}" data-en="${escapeHtml(titleEn)}">${escapeHtml(currentLang === 'zh' ? titleZh : titleEn)}</h3>
                        <p class="text-slate-600 text-xs md:text-sm leading-relaxed mb-4 card-d" data-zh="點擊進入模擬實驗" data-en="Click to enter simulation">${currentLang === 'zh' ? '點擊進入模擬實驗' : 'Click to enter simulation'}</p>
                    </div>
                    <div class="px-4 py-2 md:px-5 md:py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <p class="text-[10px] md:text-[11px] text-slate-400 font-medium tracking-wide update-text" data-zh="最後更新日期：${escapeHtml(lastUpdated)}" data-en="Last Updated: ${escapeHtml(lastUpdated)}">${currentLang === 'zh' ? '最後更新日期：' + escapeHtml(lastUpdated) : 'Last Updated: ' + escapeHtml(lastUpdated)}</p>
                        <button onclick="downloadSourceCode('${escapeHtml(exportUrl)}'); event.stopPropagation();"
                                class="px-2 py-1 text-[10px] md:text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 download-btn"
                                title="${currentLang === 'zh' ? '下載源程式碼' : 'Download Source Code'}"
                                data-zh="下載源碼"
                                data-en="Download">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span class="download-btn-text" data-zh="下載源碼" data-en="Download">${currentLang === 'zh' ? '下載源碼' : 'Download'}</span>
                        </button>
                    </div>
                </div>`;
        }

        function topicSectionHtml(topicKey, tInfo, expanded) {
            const cards = (tInfo.items || []).map(item => cardHtmlFromItem(item)).join('');
            const hZh = tInfo.label_zh || '';
            const hEn = tInfo.label_en || '';
            const hDisp = currentLang === 'zh' ? hZh : hEn;
            const count = (tInfo.items || []).length;
            const openClass = expanded ? 'open' : '';
            const ariaExpanded = expanded ? 'true' : 'false';
            const iconActive = expanded ? 'active' : '';
            return `
                <section class="topic-panel bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${openClass}" data-topic-key="${escapeHtml(topicKey)}">
                    <button type="button" class="topic-panel-header w-full flex items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 hover:bg-slate-50/80 transition-colors text-left"
                            onclick="toggleTopicPanel(this)" aria-expanded="${ariaExpanded}">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-1 h-6 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true"></span>
                            <h2 class="topic-heading text-base sm:text-lg font-semibold text-slate-800 truncate" data-zh="${escapeHtml(hZh)}" data-en="${escapeHtml(hEn)}">${escapeHtml(hDisp)}</h2>
                            <span class="topic-count flex-shrink-0 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">${count}</span>
                        </div>
                        <svg class="topic-panel-icon w-5 h-5 text-slate-400 flex-shrink-0 rotate-icon ${iconActive}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <div class="topic-panel-body">
                        <div class="px-3 pb-4 md:px-5 md:pb-5 pt-1 border-t border-slate-100">
                            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 topic-card-grid">${cards}</div>
                        </div>
                    </div>
                </section>`;
        }

        // 顯示科目（可選單元篩選）：topicKey 為 null 時顯示該科目下所有單元區塊
        function showCategory(categoryId, topicKey) {
            const subjectKey = Object.keys(subjectData).find(cat =>
                cat.toLowerCase().replace(/\s+/g, '-') === categoryId
            ) || Object.keys(subjectData)[0];
            const sub = subjectData[subjectKey];
            const container = document.getElementById('card-container');
            const breadcrumbParent = document.getElementById('breadcrumb-parent');
            const breadcrumbTopic = document.getElementById('breadcrumb-topic');
            const pageTitle = document.getElementById('page-title');

            if (!sub || !sub.topics) {
                return;
            }

            const categoryZh = categoryMap[subjectKey] ? categoryMap[subjectKey]['zh'] : sub.label_zh || subjectKey;
            const categoryEn = categoryMap[subjectKey] ? categoryMap[subjectKey]['en'] : sub.label_en || subjectKey;

            breadcrumbParent.setAttribute('data-zh', categoryZh);
            breadcrumbParent.setAttribute('data-en', categoryEn);
            breadcrumbParent.textContent = currentLang === 'zh' ? categoryZh : categoryEn;

            const titleZh = categoryZh + '模擬實驗';
            const titleEn = categoryEn + ' Simulations';
            pageTitle.setAttribute('data-zh', titleZh);
            pageTitle.setAttribute('data-en', titleEn);
            pageTitle.textContent = currentLang === 'zh' ? titleZh : titleEn;

            const allZh = '所有單元';
            const allEn = 'All units';

            if (topicKey === undefined || topicKey === null) {
                breadcrumbTopic.setAttribute('data-zh', allZh);
                breadcrumbTopic.setAttribute('data-en', allEn);
                breadcrumbTopic.textContent = currentLang === 'zh' ? allZh : allEn;
                const topicKeys = Object.keys(sub.topics);
                container.innerHTML = topicKeys.map((tk, i) => topicSectionHtml(tk, sub.topics[tk], i === 0)).join('');
            } else {
                const tInfo = sub.topics[topicKey];
                if (!tInfo) {
                    showCategory(categoryId, null);
                    return;
                }
                breadcrumbTopic.setAttribute('data-zh', tInfo.label_zh || '');
                breadcrumbTopic.setAttribute('data-en', tInfo.label_en || '');
                breadcrumbTopic.textContent = currentLang === 'zh' ? (tInfo.label_zh || '') : (tInfo.label_en || '');
                container.innerHTML = topicSectionHtml(topicKey, tInfo, true);
            }

            updateUI();
            highlightActiveNav(categoryId, topicKey);
            closeMobileSidebar();
        }

        function highlightActiveNav(categoryId, topicKey) {
            document.querySelectorAll('.nav-group-btn').forEach(btn => btn.classList.remove('active-nav'));
            document.querySelectorAll('.topic-nav-btn').forEach(btn => btn.classList.remove('active-nav'));
            document.querySelectorAll('.nav-group').forEach(group => {
                const btn = group.querySelector('.nav-group-btn');
                if (!btn) return;
                const onclick = btn.getAttribute('onclick') || '';
                if (onclick.includes(JSON.stringify(categoryId))) {
                    btn.classList.add('active-nav');
                }
            });
            if (topicKey !== undefined && topicKey !== null) {
                document.querySelectorAll('.topic-nav-btn').forEach(btn => {
                    const onclick = btn.getAttribute('onclick') || '';
                    if (onclick.includes(JSON.stringify(String(topicKey)))) {
                        btn.classList.add('active-nav');
                    }
                });
            }
        }

        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        // 側邊欄切換（行動 overlay + 桌面收合）
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const SIDEBAR_KEY = 'science-sims-sidebar-collapsed';
        const mqDesktop = window.matchMedia('(min-width: 768px)');

        function isDesktop() {
            return mqDesktop.matches;
        }

        function applyDesktopSidebar(collapsed) {
            if (collapsed) {
                sidebar.classList.add('sidebar-collapsed');
                document.body.classList.add('sidebar-is-collapsed');
            } else {
                sidebar.classList.remove('sidebar-collapsed');
                document.body.classList.remove('sidebar-is-collapsed');
            }
            try { localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0'); } catch (e) {}
        }

        function applyMobileSidebar(open) {
            if (open) {
                sidebar.classList.add('sidebar-open');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                document.body.classList.remove('sidebar-is-collapsed');
            } else {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                document.body.classList.add('sidebar-is-collapsed');
            }
        }

        function toggleSidebar() {
            if (isDesktop()) {
                const collapsed = !sidebar.classList.contains('sidebar-collapsed');
                applyDesktopSidebar(collapsed);
            } else {
                const open = !sidebar.classList.contains('sidebar-open');
                applyMobileSidebar(open);
            }
        }

        function closeMobileSidebar() {
            if (!isDesktop()) {
                applyMobileSidebar(false);
            }
        }

        function initSidebar() {
            if (isDesktop()) {
                let collapsed = false;
                try { collapsed = localStorage.getItem(SIDEBAR_KEY) === '1'; } catch (e) {}
                applyDesktopSidebar(collapsed);
            } else {
                applyMobileSidebar(false);
            }
        }

        mqDesktop.addEventListener('change', function() {
            sidebar.classList.remove('sidebar-open', 'sidebar-collapsed');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-is-collapsed');
            document.body.style.overflow = '';
            initSidebar();
        });

        initSidebar();

        // 切換語言
        function toggleLang() {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            updateUI();
        }

        // Modal 函數
        let currentModalUrl = '';
        let modalFullscreen = false;
        const SIM_MODAL_TOOL_IDS = ['sim-modal-close', 'sim-modal-capture', 'sim-modal-fullscreen'];

        function isModalToolElement(el) {
            return el && SIM_MODAL_TOOL_IDS.includes(el.id);
        }

        function getIframeAccess(iframe) {
            try {
                const win = iframe.contentWindow;
                const doc = iframe.contentDocument || (win ? win.document : null);
                if (!win || !doc) {
                    return null;
                }
                return { win, doc };
            } catch (e) {
                return null;
            }
        }

        async function waitForIframeRender(doc, win) {
            if (doc.fonts && doc.fonts.ready) {
                await doc.fonts.ready;
            }
            if (win && win.MathJax && typeof win.MathJax.typesetPromise === 'function') {
                try {
                    await win.MathJax.typesetPromise();
                } catch (e) {
                    console.warn('MathJax typeset before capture:', e);
                }
            }
            const images = Array.from(doc.images || []);
            await Promise.all(images.filter(function(img) { return !img.complete; }).map(function(img) {
                return new Promise(function(resolve) {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
            await new Promise(function(resolve) {
                requestAnimationFrame(function() {
                    requestAnimationFrame(resolve);
                });
            });
        }

        function temporarilyFixPositionedElements(doc, win) {
            const restored = [];
            doc.querySelectorAll('*').forEach(function(el) {
                const style = win.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky') {
                    restored.push({
                        element: el,
                        position: el.style.position,
                        top: el.style.top,
                        left: el.style.left
                    });
                    el.style.position = 'absolute';
                    const rect = el.getBoundingClientRect();
                    el.style.top = (rect.top + (win.scrollY || 0)) + 'px';
                    el.style.left = (rect.left + (win.scrollX || 0)) + 'px';
                }
            });
            return function() {
                restored.forEach(function(item) {
                    item.element.style.position = item.position;
                    item.element.style.top = item.top;
                    item.element.style.left = item.left;
                });
            };
        }

        function withCaptureDocumentFixes(doc, fn) {
            const style = doc.createElement('style');
            style.id = 'html2canvas-live-metric-fix';
            // html2canvas 量測 baseline 時會在 body 末尾插入含 img 的節點，需覆寫 Tailwind img{display:block}
            style.textContent = 'body > div:last-child img { display: inline-block !important; vertical-align: baseline !important; }';
            (doc.head || doc.documentElement).appendChild(style);
            return Promise.resolve(fn()).finally(function() {
                style.remove();
            });
        }

        function copyCaptureStyles(sourceEl, targetEl, computed) {
            const props = [
                'boxSizing', 'display', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
                'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                'borderTopWidth', 'borderTopStyle', 'borderTopColor',
                'borderRightWidth', 'borderRightStyle', 'borderRightColor',
                'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor',
                'borderLeftWidth', 'borderLeftStyle', 'borderLeftColor',
                'borderRadius', 'backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight',
                'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'whiteSpace',
                'verticalAlign', 'flex', 'flexGrow', 'flexShrink', 'alignSelf',
                'justifyContent', 'alignItems', 'gap', 'overflow', 'textOverflow', 'boxShadow', 'opacity'
            ];
            props.forEach(function(prop) {
                targetEl.style[prop] = computed[prop];
            });
        }

        function applyHtml2canvasCloneFixes(clonedDoc) {
            if (clonedDoc.getElementById('html2canvas-capture-fix')) {
                return;
            }
            const style = clonedDoc.createElement('style');
            style.id = 'html2canvas-capture-fix';
            style.textContent = [
                'img, svg, video, canvas { display: inline-block !important; vertical-align: middle !important; height: auto; max-width: 100%; }',
                'svg { overflow: visible; }',
                'button, label, a { vertical-align: middle; }',
                'input, select, textarea { line-height: normal; vertical-align: middle; box-sizing: border-box; }',
                'input[type="range"] { vertical-align: middle; }',
                'mjx-container, mjx-assistive-mml, .MathJax, .MathJax_Display { display: inline-block !important; vertical-align: middle !important; }',
                'p, h1, h2, h3, h4, h5, h6, span, li, td, th, div { -webkit-font-smoothing: antialiased; }'
            ].join('\n');
            (clonedDoc.head || clonedDoc.documentElement).appendChild(style);
        }

        function replaceFormControlsInClone(clonedRoot, sourceRoot, sourceWin) {
            if (!sourceWin) {
                return;
            }

            function replacePair(sourceSelector, createReplacement) {
                const sourceNodes = sourceRoot.querySelectorAll(sourceSelector);
                const clonedNodes = clonedRoot.querySelectorAll(sourceSelector);
                clonedNodes.forEach(function(clonedNode, index) {
                    const sourceNode = sourceNodes[index];
                    if (!sourceNode) {
                        return;
                    }
                    const replacement = createReplacement(sourceNode, clonedNode.ownerDocument, sourceWin);
                    if (replacement) {
                        clonedNode.replaceWith(replacement);
                    }
                });
            }

            replacePair('textarea', function(sourceEl, clonedDoc, win) {
                const computed = win.getComputedStyle(sourceEl);
                const replacement = clonedDoc.createElement('div');
                replacement.textContent = sourceEl.value || sourceEl.placeholder || '';
                replacement.className = sourceEl.className;
                replacement.style.whiteSpace = 'pre-wrap';
                replacement.style.wordBreak = 'break-word';
                replacement.setAttribute('aria-hidden', 'true');
                copyCaptureStyles(sourceEl, replacement, computed);
                return replacement;
            });

            replacePair('select', function(sourceEl, clonedDoc, win) {
                const computed = win.getComputedStyle(sourceEl);
                const replacement = clonedDoc.createElement('span');
                const option = sourceEl.options[sourceEl.selectedIndex];
                replacement.textContent = option ? option.text : '';
                replacement.className = sourceEl.className;
                replacement.setAttribute('aria-hidden', 'true');
                copyCaptureStyles(sourceEl, replacement, computed);
                if (computed.display === 'inline' || computed.display === 'inline-block') {
                    replacement.style.display = computed.display;
                } else {
                    replacement.style.display = 'inline-block';
                }
                return replacement;
            });

            replacePair(
                'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
                function(sourceEl, clonedDoc, win) {
                    const computed = win.getComputedStyle(sourceEl);
                    const replacement = clonedDoc.createElement('span');
                    replacement.textContent = sourceEl.value || sourceEl.getAttribute('placeholder') || '';
                    replacement.className = sourceEl.className;
                    replacement.setAttribute('aria-hidden', 'true');
                    copyCaptureStyles(sourceEl, replacement, computed);
                    if (computed.display === 'block') {
                        replacement.style.display = 'block';
                    } else if (computed.display === 'inline') {
                        replacement.style.display = 'inline';
                    } else {
                        replacement.style.display = 'inline-block';
                    }
                    return replacement;
                }
            );
        }

        function normalizeFlexButtonsInClone(clonedRoot, sourceRoot, sourceWin) {
            if (!sourceWin) {
                return;
            }
            const sourceButtons = sourceRoot.querySelectorAll('button, [role="button"]');
            clonedRoot.querySelectorAll('button, [role="button"]').forEach(function(clonedBtn, index) {
                const sourceBtn = sourceButtons[index];
                if (!sourceBtn) {
                    return;
                }
                const computed = sourceWin.getComputedStyle(sourceBtn);
                if (computed.display === 'flex' || computed.display === 'inline-flex') {
                    clonedBtn.style.display = computed.display;
                    clonedBtn.style.alignItems = computed.alignItems;
                    clonedBtn.style.justifyContent = computed.justifyContent;
                    clonedBtn.style.gap = computed.gap;
                    clonedBtn.style.lineHeight = computed.lineHeight;
                }
                clonedBtn.querySelectorAll('svg').forEach(function(svg) {
                    svg.style.display = 'inline-block';
                    svg.style.verticalAlign = 'middle';
                    svg.style.flexShrink = '0';
                });
            });
        }

        function injectCanvasSnapshots(clonedRoot, sourceRoot) {
            const clonedCanvases = clonedRoot.querySelectorAll('canvas');
            const sourceCanvases = sourceRoot.querySelectorAll('canvas');
            clonedCanvases.forEach(function(clonedCanvas, index) {
                const sourceCanvas = sourceCanvases[index];
                if (!sourceCanvas) {
                    return;
                }
                try {
                    const dataUrl = sourceCanvas.toDataURL('image/png');
                    const img = clonedCanvas.ownerDocument.createElement('img');
                    img.src = dataUrl;
                    img.alt = '';
                    const sourceWin = sourceCanvas.ownerDocument.defaultView;
                    const computed = sourceWin ? sourceWin.getComputedStyle(sourceCanvas) : null;
                    if (computed) {
                        img.style.width = computed.width;
                        img.style.height = computed.height;
                        img.style.maxWidth = computed.maxWidth;
                        img.style.maxHeight = computed.maxHeight;
                    }
                    img.style.display = 'inline-block';
                    img.style.verticalAlign = 'middle';
                    if (sourceCanvas.className) {
                        img.className = sourceCanvas.className;
                    }
                    clonedCanvas.replaceWith(img);
                } catch (e) {
                    console.warn('Canvas snapshot failed:', e);
                }
            });
        }

        function prepareCaptureClone(clonedDoc, clonedEl, sourceRoot) {
            const sourceWin = sourceRoot.ownerDocument ? sourceRoot.ownerDocument.defaultView : null;
            applyHtml2canvasCloneFixes(clonedDoc);
            injectCanvasSnapshots(clonedEl, sourceRoot);
            replaceFormControlsInClone(clonedEl, sourceRoot, sourceWin);
            normalizeFlexButtonsInClone(clonedEl, sourceRoot, sourceWin);
            clonedEl.querySelectorAll('img, svg').forEach(function(el) {
                el.style.display = 'inline-block';
                el.style.verticalAlign = 'middle';
            });
        }

        async function html2canvasCapture(targetEl, sourceEl, extraOptions) {
            const sourceWin = (sourceEl || targetEl).ownerDocument.defaultView;
            const windowWidth = sourceWin ? sourceWin.innerWidth : targetEl.clientWidth;
            const windowHeight = sourceWin ? sourceWin.innerHeight : targetEl.clientHeight;
            const scrollX = sourceWin ? -(sourceWin.scrollX || 0) : 0;
            const scrollY = sourceWin ? -(sourceWin.scrollY || 0) : 0;
            const options = Object.assign({
                backgroundColor: '#ffffff',
                scale: Math.min(window.devicePixelRatio || 1, 2),
                useCORS: true,
                allowTaint: true,
                logging: false,
                windowWidth: windowWidth,
                windowHeight: windowHeight,
                scrollX: scrollX,
                scrollY: scrollY,
                onclone: function(clonedDoc, clonedEl) {
                    prepareCaptureClone(clonedDoc, clonedEl, sourceEl || targetEl);
                }
            }, extraOptions || {});
            return html2canvas(targetEl, options);
        }

        async function captureIframeContent(iframe) {
            const access = getIframeAccess(iframe);
            if (!access) {
                throw new Error('Cannot access iframe content');
            }
            const { win, doc } = access;
            const root = doc.body || doc.documentElement;
            const originalScrollX = win.scrollX || 0;
            const originalScrollY = win.scrollY || 0;
            await waitForIframeRender(doc, win);
            return withCaptureDocumentFixes(doc, async function() {
                const restorePositioned = temporarilyFixPositionedElements(doc, win);
                try {
                    return await html2canvasCapture(root, root);
                } finally {
                    restorePositioned();
                    win.scrollTo(originalScrollX, originalScrollY);
                }
            });
        }

        async function captureModalContainer() {
            const modalContent = document.getElementById('sim-modal-content');
            return withCaptureDocumentFixes(document, async function() {
                return html2canvasCapture(modalContent, modalContent, {
                    ignoreElements: function(element) {
                        return isModalToolElement(element);
                    }
                });
            });
        }

        function downloadPngFromCanvas(canvas, baseName) {
            return new Promise((resolve, reject) => {
                canvas.toBlob(function(blob) {
                    if (!blob) {
                        reject(new Error('Failed to create PNG blob'));
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = baseName + '_' + getFormattedTimestamp() + '.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/png', 1);
            });
        }

        function updateFullscreenButtonUI() {
            const btn = document.getElementById('sim-modal-fullscreen');
            const expandIcon = document.getElementById('sim-modal-fullscreen-expand');
            const compressIcon = document.getElementById('sim-modal-fullscreen-compress');
            if (!btn || !expandIcon || !compressIcon) {
                return;
            }
            if (modalFullscreen) {
                btn.setAttribute('aria-label', currentLang === 'zh' ? '退出全螢幕' : 'Exit fullscreen');
                btn.title = currentLang === 'zh' ? '退出全螢幕' : 'Exit fullscreen';
                expandIcon.classList.add('hidden');
                compressIcon.classList.remove('hidden');
            } else {
                btn.setAttribute('aria-label', currentLang === 'zh' ? '全螢幕' : 'Fullscreen');
                btn.title = currentLang === 'zh' ? '顯示成全螢幕' : 'Enter fullscreen';
                expandIcon.classList.remove('hidden');
                compressIcon.classList.add('hidden');
            }
        }

        function setModalFullscreen(enabled) {
            const modal = document.getElementById('sim-modal');
            modalFullscreen = !!enabled;
            modal.classList.toggle('fullscreen-mode', modalFullscreen);
            updateFullscreenButtonUI();
        }

        function toggleModalFullscreen() {
            setModalFullscreen(!modalFullscreen);
        }

        function openModal(url) {
            const modal = document.getElementById('sim-modal');
            const iframe = document.getElementById('sim-modal-iframe');
            const captureBtn = document.getElementById('sim-modal-capture');
            currentModalUrl = url;
            setModalFullscreen(false);
            iframe.src = url;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            captureBtn.disabled = true;
            iframe.onload = function() {
                setTimeout(function() {
                    captureBtn.disabled = false;
                }, 1000);
            };
        }

        function closeModal() {
            const modal = document.getElementById('sim-modal');
            const iframe = document.getElementById('sim-modal-iframe');
            const captureBtn = document.getElementById('sim-modal-capture');
            setModalFullscreen(false);
            modal.classList.remove('active');
            iframe.src = '';
            document.body.style.overflow = '';
            captureBtn.disabled = true;
            currentModalUrl = '';
        }

        async function captureModal() {
            const captureBtn = document.getElementById('sim-modal-capture');
            const iframe = document.getElementById('sim-modal-iframe');

            if (!iframe || !iframe.src) {
                alert(currentLang === 'zh' ? '無法截圖：內容尚未載入' : 'Cannot capture: Content not loaded');
                return;
            }

            captureBtn.disabled = true;
            try {
                await document.fonts.ready;
                let canvas;
                try {
                    canvas = await captureIframeContent(iframe);
                } catch (iframeError) {
                    console.warn('Iframe capture failed, using modal fallback:', iframeError);
                    canvas = await captureModalContainer();
                }
                const fileName = getFileNameFromUrl(currentModalUrl) || 'simulation';
                await downloadPngFromCanvas(canvas, fileName);
            } catch (error) {
                console.error('截圖失敗:', error);
                alert(currentLang === 'zh' ? '截圖失敗，請稍後再試' : 'Capture failed, please try again');
            } finally {
                captureBtn.disabled = false;
            }
        }
        
        // 從 URL 獲取文件名
        function getFileNameFromUrl(url) {
            if (!url) return '';
            try {
                const urlObj = new URL(url, window.location.origin);
                const slug = urlObj.searchParams.get('slug');
                if (slug) {
                    return slug.replace(/[^a-zA-Z0-9_-]/g, '_') || 'simulation';
                }
                const pathname = urlObj.pathname;
                const fileName = pathname.split('/').pop().replace(/\.html?$/i, '');
                return fileName || 'simulation';
            } catch (e) {
                return 'simulation';
            }
        }
        
        // 獲取格式化的時間戳（年月日時分秒）
        function getFormattedTimestamp() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}${hours}${minutes}${seconds}`;
        }

        function closeModalOnBackdrop(event) {
            // 如果點擊的是背景（不是 modal 內容），則關閉
            if (event.target.id === 'sim-modal') {
                closeModal();
            }
        }

        // ESC 鍵：全螢幕時先退出全螢幕，否則關閉 modal
        document.addEventListener('keydown', function(event) {
            if (event.key !== 'Escape') {
                return;
            }
            const modal = document.getElementById('sim-modal');
            if (!modal.classList.contains('active')) {
                return;
            }
            if (modalFullscreen) {
                setModalFullscreen(false);
                return;
            }
            closeModal();
        });

        // 下載源程式碼
        function downloadSourceCode(url) {
            if (!url) {
                alert(currentLang === 'zh' ? '無法下載：URL 無效' : 'Cannot download: Invalid URL');
                return;
            }
            
            try {
                // 獲取文件名
                const fileName = url.split('/').pop() || 'simulation.html';
                
                // 嘗試使用 fetch 下載（適用於同源文件）
                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .then(html => {
                        // 創建 Blob 並下載
                        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        // 延遲釋放 URL，確保下載開始
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                    })
                    .catch(error => {
                        console.warn('Fetch failed, trying direct link:', error);
                        // 如果 fetch 失敗，嘗試直接打開新標籤頁（用戶可以手動保存）
                        const a = document.createElement('a');
                        a.href = url;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        // 提示用戶可以右鍵保存
                        if (currentLang === 'zh') {
                            console.info('如果下載未開始，請在新打開的頁面中右鍵選擇「另存為」');
                        } else {
                            console.info('If download did not start, please right-click and select "Save As" in the new tab');
                        }
                    });
            } catch (error) {
                console.error('下載失敗:', error);
                alert(currentLang === 'zh' ? '下載失敗，請稍後再試' : 'Download failed, please try again');
            }
        }

        function updateUI() {
            const texts = {
                zh: { title: "科學模擬實驗平台", core: "核心單元 Compulsory" },
                en: { title: "Science Simulations Platform", core: "Compulsory Part" }
            };
            document.getElementById('app-title').innerText = texts[currentLang].title;
            document.getElementById('core-label').innerText = texts[currentLang].core;
            updateFullscreenButtonUI();

            // 更新所有帶有 data-zh 和 data-en 屬性的元素
            document.querySelectorAll('.main-label, .topic-nav-label, .topic-heading, .topic-badge, .card-t, .card-d, .update-text, .image-placeholder, #breadcrumb-parent, #breadcrumb-topic, #breadcrumb-child, #page-title, #footer-copyright, #footer-license span, .download-btn-text').forEach(el => {
                const val = el.getAttribute(`data-${currentLang}`);
                if (val) el.innerText = val;
            });
        }

        // 初始化顯示第一個科目（所有單元）
        window.addEventListener('DOMContentLoaded', function() {
            const firstCategory = Object.keys(subjectData)[0];
            if (!firstCategory) return;
            const categoryId = firstCategory.toLowerCase().replace(/\s+/g, '-');
            showCategory(categoryId, null);
        });
    </script>
</body>
</html>
<?php
$htmlContent = ob_get_contents();
ob_end_flush();

// 預設不寫入 index.html：避免每次載入首頁都產生巨大快照、造成 Git 無謂差異與合併困擾。
// 需要離線／靜態快照時，於 .env 設定 WRITE_INDEX_HTML_SNAPSHOT=1。
$indexHtmlPath = __DIR__ . '/index.html';
$snap = trim((string) (getenv('WRITE_INDEX_HTML_SNAPSHOT') ?: ($_ENV['WRITE_INDEX_HTML_SNAPSHOT'] ?? '')));
if ($snap === '1' || strcasecmp($snap, 'true') === 0) {
    file_put_contents($indexHtmlPath, $htmlContent);
}
?>
