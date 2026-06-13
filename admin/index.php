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

$pdo = db();
$stats = admin_dashboard_stats($pdo);
$totals = $stats['_totals'] ?? ['published' => 0, 'pending' => 0, 'draft' => 0];
$cardMeta = admin_dashboard_card_meta();
$displayName = htmlspecialchars($user['display_name'] ?: $user['email'], ENT_QUOTES, 'UTF-8');
$siteName = htmlspecialchars(config_site_name(), ENT_QUOTES, 'UTF-8');
$appHref = admin_site_asset_url('app/');

admin_page_start('儀表板', 'dashboard', [
    'wide' => true,
    'hideTitle' => true,
    'bodyClass' => 'admin-dashboard-page',
]);
?>

<div class="admin-dashboard">
    <header class="admin-dashboard-hero">
        <div class="admin-dashboard-hero-text">
            <p class="admin-dashboard-eyebrow">管理後台</p>
            <h1 class="admin-dashboard-title">儀表板</h1>
            <p class="admin-dashboard-greeting">歡迎回來，<?php echo $displayName; ?>。管理 <?php echo $siteName; ?> 的內容與平台設定。</p>
        </div>
        <div class="admin-dashboard-hero-actions">
            <a href="<?php echo htmlspecialchars($appHref, ENT_QUOTES, 'UTF-8'); ?>" class="admin-dashboard-hero-btn admin-dashboard-hero-btn-primary">前往前台</a>
            <?php if (admin_can_review()): ?>
                <a href="review_queue.php" class="admin-dashboard-hero-btn admin-dashboard-hero-btn-secondary">
                    審核佇列
                    <?php if ($totals['pending'] > 0): ?>
                        <span class="admin-dashboard-badge"><?php echo (int) $totals['pending']; ?></span>
                    <?php endif; ?>
                </a>
            <?php endif; ?>
        </div>
    </header>

    <?php if ($totals['published'] + $totals['pending'] + $totals['draft'] > 0): ?>
    <section class="admin-dashboard-stats" aria-label="內容概況">
        <article class="admin-stat-card">
            <span class="admin-stat-label">已發佈</span>
            <span class="admin-stat-value admin-stat-value-emerald"><?php echo (int) $totals['published']; ?></span>
        </article>
        <article class="admin-stat-card">
            <span class="admin-stat-label">待審核</span>
            <span class="admin-stat-value admin-stat-value-amber"><?php echo (int) $totals['pending']; ?></span>
        </article>
        <article class="admin-stat-card">
            <span class="admin-stat-label">草稿</span>
            <span class="admin-stat-value admin-stat-value-slate"><?php echo (int) $totals['draft']; ?></span>
        </article>
    </section>
    <?php endif; ?>

    <?php foreach (admin_menu_sections() as $section):
        if ($section['label'] === '概覽') {
            continue;
        }
        $items = array_values(array_filter(
            $section['items'],
            static fn (array $item): bool => $item['key'] !== 'dashboard'
        ));
        if ($items === []) {
            continue;
        }
        ?>
    <section class="admin-dashboard-section">
        <div class="admin-dashboard-section-head">
            <h2 class="admin-dashboard-section-title"><?php echo htmlspecialchars($section['label'], ENT_QUOTES, 'UTF-8'); ?></h2>
        </div>
        <div class="admin-dash-grid">
            <?php foreach ($items as $item):
                $key = $item['key'];
                $meta = $cardMeta[$key] ?? ['icon' => 'folder', 'tone' => 'slate', 'desc' => ''];
                $tone = ($item['accent'] ?? '') === 'amber' ? 'amber' : ($meta['tone'] ?? 'slate');
                $external = !empty($item['external']);
                $href = htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8');
                $label = htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8');
                $desc = htmlspecialchars($meta['desc'], ENT_QUOTES, 'UTF-8');
                ?>
            <a href="<?php echo $href; ?>"
               class="admin-dash-card admin-dash-card-<?php echo htmlspecialchars($tone, ENT_QUOTES, 'UTF-8'); ?>"
               <?php if ($external): ?>target="_blank" rel="noopener"<?php endif; ?>>
                <span class="admin-dash-card-icon" aria-hidden="true">
                    <?php echo admin_dashboard_icon_svg($meta['icon']); ?>
                </span>
                <span class="admin-dash-card-body">
                    <span class="admin-dash-card-title">
                        <?php echo $label; ?>
                        <?php if ($external): ?><span class="admin-dash-card-ext">↗</span><?php endif; ?>
                    </span>
                    <?php if ($desc !== ''): ?>
                        <span class="admin-dash-card-desc"><?php echo $desc; ?></span>
                    <?php endif; ?>
                </span>
                <span class="admin-dash-card-arrow" aria-hidden="true">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </span>
            </a>
            <?php endforeach; ?>
        </div>
    </section>
    <?php endforeach; ?>
</div>

<?php
admin_page_end();
