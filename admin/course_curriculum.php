<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
if (!user_has_permission('topic_item.manage_any') && !user_has_permission('user.manage')) {
    require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/course_curriculum.php'));
}

$pdo = db();
$subjects = sim_all_subjects($pdo);
$topicsBySubject = [];
foreach ($subjects as $s) {
    $topicsBySubject[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

$typeLabels = [
    'note' => '學習筆記',
    'simulation' => '模擬實驗',
    'worksheet' => '工作紙',
    'article' => '科學文章',
    'learning_tool' => '互動測驗',
    'video' => '影片',
];

admin_page_start('自學課程編排', 'course_curriculum', [
    'subtitle' => '為各課題安排混合學習內容的順序。學習者將依此順序在「自學課程」分頁學習。',
    'wide' => true,
    'headExtra' => '<link rel="stylesheet" href="assets/css/course-curriculum.css">',
]);
?>
        <p id="flash" class="text-sm hidden"></p>
        <div class="curriculum-layout">
            <aside class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-fit">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">科目</label>
                <select id="subject-select" class="w-full border rounded-lg px-3 py-2 mt-1 mb-4 text-sm">
                    <?php foreach ($subjects as $s): ?>
                        <option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'], ENT_QUOTES, 'UTF-8'); ?></option>
                    <?php endforeach; ?>
                </select>
                <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">課題（學習順序）</div>
                <div id="topic-list" class="space-y-1 max-h-[60vh] overflow-y-auto"></div>
            </aside>
            <section class="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm min-h-[420px]">
                <div id="topic-empty" class="text-slate-500 text-sm py-12 text-center">請選擇課題以編排學習內容。</div>
                <div id="topic-editor" class="hidden">
                    <div class="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                        <div>
                            <h2 id="editor-topic-title" class="text-lg font-bold text-slate-900"></h2>
                            <p class="text-xs text-slate-500 mt-1">拖曳調整學習順序；僅已發佈內容會顯示給學習者。</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" id="btn-import-all" class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">從課題匯入全部</button>
                            <button type="button" id="btn-add-item" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">加入內容</button>
                        </div>
                    </div>
                    <ul id="items-list" class="space-y-2"></ul>
                    <p id="items-empty" class="text-slate-500 text-sm py-8 text-center hidden">此課題尚無編排項目。</p>
                </div>
            </section>
        </div>

        <dialog id="add-dialog" class="rounded-xl border border-slate-200 p-0 w-full max-w-md shadow-xl backdrop:bg-slate-900/50">
            <form method="dialog" class="p-5 space-y-4">
                <h3 class="font-bold text-lg">加入學習內容</h3>
                <div>
                    <label class="text-sm font-medium">內容類型</label>
                    <select id="add-type" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                        <?php foreach ($typeLabels as $k => $label): ?>
                            <option value="<?php echo htmlspecialchars($k, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="text-sm font-medium">選擇項目</label>
                    <select id="add-content" class="w-full border rounded-lg px-3 py-2 mt-1 text-sm"><option value="">載入中…</option></select>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" id="add-cancel" class="px-3 py-1.5 text-sm border rounded-lg">取消</button>
                    <button type="button" id="add-confirm" class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg">加入</button>
                </div>
            </form>
        </dialog>
<?php
admin_page_end([
    'scripts' => '<script>window.CURRICULUM_TOPICS=' . json_encode($topicsBySubject, JSON_HEX_TAG | JSON_HEX_AMP)
        . ';window.CURRICULUM_TYPE_LABELS=' . json_encode($typeLabels, JSON_HEX_TAG | JSON_HEX_AMP) . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . '<script src="assets/js/list-reorder.js"></script>'
        . '<script src="assets/js/course-curriculum.js"></script>',
]);
