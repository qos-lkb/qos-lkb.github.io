<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/learning_notes_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('learning_note.manage_any', '../login.php?next=' . rawurlencode('admin/learning_notes.php'));

$pdo = db();
$rows = ln_fetch_admin_list($pdo);

/** @var array<string, array{label:string,subject_id:?int,topic_id:?int,items:list<array<string,mixed>>}> */
$groups = [];
foreach ($rows as $row) {
    $subjectId = $row['subject_id'] !== null ? (int) $row['subject_id'] : null;
    $topicId = $row['topic_id'] !== null ? (int) $row['topic_id'] : null;
    if ($topicId !== null) {
        $key = 't' . $topicId;
        $subLabel = (string) ($row['subject_zh'] ?: $row['subject_en'] ?: '未分類科目');
        $topLabel = (string) ($row['topic_zh'] ?: $row['topic_en'] ?: '未分類課題');
        $label = $subLabel . ' · ' . $topLabel;
    } elseif ($subjectId !== null) {
        $key = 's' . $subjectId . '_loose';
        $label = (string) ($row['subject_zh'] ?: $row['subject_en'] ?: '未分類科目') . ' · 一般';
    } else {
        $key = 'uncategorized';
        $label = '未分類';
    }
    if (!isset($groups[$key])) {
        $groups[$key] = [
            'label' => $label,
            'subject_id' => $subjectId,
            'topic_id' => $topicId,
            'items' => [],
        ];
    }
    $groups[$key]['items'][] = $row;
}

/** @var array<int, array{id:int,label:string,count:int,sort_order:int}> */
$subjectTabs = [];
$uncategorizedCount = 0;
foreach ($groups as $group) {
    $count = count($group['items']);
    if ($group['subject_id'] === null) {
        $uncategorizedCount += $count;
        continue;
    }
    $sid = (int) $group['subject_id'];
    if (!isset($subjectTabs[$sid])) {
        $label = '';
        foreach ($group['items'] as $item) {
            $label = (string) ($item['subject_zh'] ?: $item['subject_en'] ?: '科目 #' . $sid);
            break;
        }
        $subjectTabs[$sid] = [
            'id' => $sid,
            'label' => $label,
            'count' => 0,
            'sort_order' => (int) ($group['items'][0]['sub_sort'] ?? 999999),
        ];
    }
    $subjectTabs[$sid]['count'] += $count;
}
usort($subjectTabs, static function (array $a, array $b): int {
    return ($a['sort_order'] <=> $b['sort_order']) ?: strcmp($a['label'], $b['label']);
});

$activeSubject = (string) ($_GET['subject'] ?? 'all');
if ($activeSubject !== 'all' && $activeSubject !== 'none' && !isset($subjectTabs[(int) $activeSubject])) {
    $activeSubject = 'all';
}

admin_page_start('學習筆記', 'learning_notes', [
    'actions' => admin_btn('learning_note_edit.php', '新增') . admin_btn('review_queue.php', '審核佇列', 'secondary'),
    'subtitle' => '以分頁切換科目；拖曳 ⠿ 調整順序；雙擊標題、slug 可編輯；雙擊狀態可切換發佈狀態。',
    'wide' => true,
    'headExtra' => '<style>.note-inline-input{display:none}.note-row-editing .note-inline-view{display:none}.note-row-editing .note-inline-input{display:block;width:100%}.note-editable{cursor:text;border-radius:.25rem;padding:.125rem .25rem}.note-editable:hover{background:rgb(238 242 255)}.note-status-editable{cursor:pointer;border-radius:.25rem;padding:.125rem .375rem}.note-status-editable:hover{background:rgb(254 243 199)}.note-subject-tab{cursor:pointer;background:transparent}.note-subject-tab.active{background:#fff;border-color:#e2e8f0;color:#4338ca;font-weight:600}.note-subject-tab:not(.active){border-color:transparent;color:#475569}.note-subject-tab:not(.active):hover{color:#0f172a;background:#f8fafc}.note-subject-panel[hidden]{display:none!important}</style>',
]);
?>
        <p id="flash" class="text-sm hidden"></p>
        <?php if ($groups === []): ?>
            <div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 shadow-sm">尚無學習筆記。</div>
        <?php else: ?>
            <nav id="note-subject-tabs" class="flex flex-wrap gap-1 border-b border-slate-200 mb-4 -mt-2" aria-label="科目篩選">
                <?php
                $totalCount = array_sum(array_map(static fn (array $g): int => count($g['items']), $groups));
                $tabClass = static function (string $key) use ($activeSubject): string {
                    $base = 'note-subject-tab inline-block px-3 sm:px-4 py-2 text-sm rounded-t-lg border border-b-0 -mb-px whitespace-nowrap no-underline';
                    return $base . ($activeSubject === $key ? ' active' : '');
                };
                $tabHref = static function (string $key): string {
                    if ($key === 'all') {
                        return 'learning_notes.php';
                    }
                    return 'learning_notes.php?subject=' . rawurlencode($key);
                };
                ?>
                <a href="<?php echo htmlspecialchars($tabHref('all'), ENT_QUOTES, 'UTF-8'); ?>" class="<?php echo $tabClass('all'); ?>" data-subject-filter="all" role="tab" aria-selected="<?php echo $activeSubject === 'all' ? 'true' : 'false'; ?>">
                    全部 <span class="text-xs text-slate-400 ml-1"><?php echo $totalCount; ?></span>
                </a>
                <?php foreach ($subjectTabs as $tab):
                    $tabKey = (string) $tab['id'];
                    ?>
                    <a href="<?php echo htmlspecialchars($tabHref($tabKey), ENT_QUOTES, 'UTF-8'); ?>" class="<?php echo $tabClass($tabKey); ?>" data-subject-filter="<?php echo htmlspecialchars($tabKey, ENT_QUOTES, 'UTF-8'); ?>" role="tab" aria-selected="<?php echo $activeSubject === $tabKey ? 'true' : 'false'; ?>">
                        <?php echo htmlspecialchars($tab['label'], ENT_QUOTES, 'UTF-8'); ?>
                        <span class="text-xs text-slate-400 ml-1"><?php echo (int) $tab['count']; ?></span>
                    </a>
                <?php endforeach; ?>
                <?php if ($uncategorizedCount > 0): ?>
                    <a href="<?php echo htmlspecialchars($tabHref('none'), ENT_QUOTES, 'UTF-8'); ?>" class="<?php echo $tabClass('none'); ?>" data-subject-filter="none" role="tab" aria-selected="<?php echo $activeSubject === 'none' ? 'true' : 'false'; ?>">
                        未分類 <span class="text-xs text-slate-400 ml-1"><?php echo $uncategorizedCount; ?></span>
                    </a>
                <?php endif; ?>
            </nav>
            <div id="note-subject-panels" class="space-y-6">
                <?php foreach ($groups as $group):
                    $filterKey = $group['subject_id'] !== null ? (string) (int) $group['subject_id'] : 'none';
                    $panelHidden = $activeSubject !== 'all' && $activeSubject !== $filterKey;
                    ?>
                    <section class="note-subject-panel bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                             data-subject-filter="<?php echo htmlspecialchars($filterKey, ENT_QUOTES, 'UTF-8'); ?>"
                             <?php if ($panelHidden): ?>hidden<?php endif; ?>>
                        <div class="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <h2 class="text-sm font-semibold text-slate-800"><?php echo htmlspecialchars($group['label'], ENT_QUOTES, 'UTF-8'); ?></h2>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full text-sm">
                                <thead class="bg-slate-100/80">
                                    <tr>
                                        <th class="p-3 w-10" aria-label="排序"></th>
                                        <th class="p-3 text-left">標題</th>
                                        <th class="p-3">slug</th>
                                        <th class="p-3">狀態</th>
                                        <th class="p-3">排序</th>
                                        <th class="p-3">更新</th>
                                        <th class="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody class="note-sort-group"
                                       data-subject-id="<?php echo $group['subject_id'] !== null ? (int) $group['subject_id'] : ''; ?>"
                                       data-topic-id="<?php echo $group['topic_id'] !== null ? (int) $group['topic_id'] : ''; ?>">
                                    <?php foreach ($group['items'] as $row):
                                        $status = (string) $row['status'];
                                        $statusLabel = match ($status) {
                                            'published' => '已發佈',
                                            'pending_review' => '待審核',
                                            default => '草稿',
                                        };
                                        ?>
                                        <tr class="note-sort-item border-t border-slate-100" data-note-id="<?php echo (int) $row['id']; ?>">
                                            <td class="p-3">
                                                <button type="button" class="note-drag-handle w-8 h-8 flex items-center justify-center rounded border border-dashed border-slate-300 text-slate-500 cursor-grab active:cursor-grabbing select-none text-xs" title="拖曳排序" aria-label="拖曳排序">⠿</button>
                                            </td>
                                            <td class="p-3 note-cell-title">
                                                <span class="note-inline-view note-editable note-title-view" title="雙擊編輯"><?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?></span>
                                                <input type="text" class="note-inline-input note-title-input border border-indigo-300 rounded px-2 py-1 text-sm" value="<?php echo htmlspecialchars($row['title_zh'], ENT_QUOTES, 'UTF-8'); ?>">
                                            </td>
                                            <td class="p-3 font-mono text-xs note-cell-slug">
                                                <span class="note-inline-view note-editable note-slug-view" title="雙擊編輯"><?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?></span>
                                                <input type="text" class="note-inline-input note-slug-input border border-indigo-300 rounded px-2 py-1 text-sm font-mono" value="<?php echo htmlspecialchars($row['slug'], ENT_QUOTES, 'UTF-8'); ?>">
                                            </td>
                                            <td class="p-3 note-cell-status">
                                                <span class="note-status-view note-status-editable" data-status="<?php echo htmlspecialchars($status, ENT_QUOTES, 'UTF-8'); ?>" title="雙擊切換狀態"><?php echo htmlspecialchars($statusLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td class="p-3 font-mono text-xs note-sort-order"><?php echo (int) $row['list_sort_order']; ?></td>
                                            <td class="p-3 text-xs"><?php echo htmlspecialchars((string) $row['updated_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td class="p-3"><a href="learning_note_edit.php?id=<?php echo (int) $row['id']; ?>" class="text-indigo-600 hover:underline">編輯</a></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </section>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
<?php
admin_page_end([
    'scripts' => <<<'HTML'
    <script>
    (function () {
        function applySubjectFilter(key) {
            document.querySelectorAll('.note-subject-panel').forEach(function (panel) {
                var panelKey = panel.getAttribute('data-subject-filter') || '';
                panel.hidden = !(key === 'all' || panelKey === key);
            });
            document.querySelectorAll('.note-subject-tab').forEach(function (tab) {
                var active = tab.getAttribute('data-subject-filter') === key;
                tab.classList.toggle('active', active);
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            try {
                var url = new URL(window.location.href);
                if (key === 'all') {
                    url.searchParams.delete('subject');
                } else {
                    url.searchParams.set('subject', key);
                }
                window.history.replaceState({}, '', url.pathname + url.search);
            } catch (e) { /* ignore */ }
        }
        var tabNav = document.getElementById('note-subject-tabs');
        if (!tabNav) return;
        tabNav.addEventListener('click', function (e) {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            var tab = e.target.closest('.note-subject-tab');
            if (!tab || !tabNav.contains(tab)) return;
            e.preventDefault();
            applySubjectFilter(tab.getAttribute('data-subject-filter') || 'all');
        });
    })();
    </script>
HTML
        . '<script src="../assets/js/admin-api.js"></script>'
        . '<script src="assets/js/list-reorder.js"></script>'
        . '<script src="assets/js/learning-notes-list.js"></script>',
]);
