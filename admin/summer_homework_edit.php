<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
if (!user_has_permission('summer_homework.manage_any') && !user_has_permission('summer_homework.manage_own')) {
    require_permission('summer_homework.manage_any', '../login.php?next=' . rawurlencode('admin/summer_homework_edit.php'));
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

admin_page_start($id ? '編輯暑期功課' : '新增暑期功課', 'summer_homework', [
    'actions' => admin_btn('summer_homework.php', '返回列表', 'secondary')
        . ($id ? admin_btn('summer_homework_analytics.php?id=' . $id, '呈交分析', 'secondary') : ''),
    'wide' => true,
]);
?>
        <p id="flash" class="text-red-600 text-sm hidden mb-3"></p>
        <form id="edit-form" class="space-y-4 bg-white rounded-xl border p-6 shadow-sm">
            <input type="hidden" id="item-id" value="<?php echo $id; ?>">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="text-sm font-medium">標題（中）</label><input id="title-zh" class="w-full border rounded-lg px-3 py-2 mt-1" required></div>
                <div><label class="text-sm font-medium">標題（英）</label><input id="title-en" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label class="text-sm font-medium">slug（選填）</label><input id="slug" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm"></div>
                <div><label class="text-sm font-medium">級別</label>
                    <select id="form-level" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <option value="1">中一 (S1)</option>
                        <option value="2">中二 (S2)</option>
                    </select>
                </div>
                <div><label class="text-sm font-medium">內容類型</label>
                    <select id="content-type" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <option value="passage">閱讀篇章</option>
                        <option value="video">影片</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label class="text-sm font-medium">及格百分比</label><input type="number" id="pass-percent" min="1" max="100" step="1" value="80" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">排序</label><input type="number" id="list-sort" value="0" class="w-full border rounded-lg px-3 py-2 mt-1"></div>
                <div><label class="text-sm font-medium">狀態</label>
                    <select id="status" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <option value="draft">草稿</option>
                        <option value="pending_review">待審核</option>
                        <option value="published">已發佈</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-sm font-medium">呈交截止日期</label>
                    <input type="datetime-local" id="due-at" class="w-full border rounded-lg px-3 py-2 mt-1">
                    <p class="text-xs text-slate-500 mt-1">留空表示不設截止。時區：香港</p>
                </div>
                <div class="flex items-end pb-1">
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" id="allow-late" value="1" checked class="rounded border-slate-300 text-indigo-600">
                        截止後仍允許呈交（遲交）
                    </label>
                </div>
            </div>

            <div id="passage-fields" class="space-y-3">
                <div>
                    <label class="text-sm font-medium">篇章（中，Markdown）</label>
                    <p class="text-xs text-slate-500 mt-0.5">支援公式：行內 <code>$E=mc^2$</code>、區塊 <code>$$...$$</code></p>
                    <textarea id="body-zh" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="6"></textarea>
                </div>
                <div>
                    <label class="text-sm font-medium">篇章（英，Markdown）</label>
                    <textarea id="body-en" class="w-full border rounded-lg px-3 py-2 mt-1 font-mono text-sm" rows="6"></textarea>
                </div>
            </div>
            <div id="video-fields" class="space-y-3 hidden">
                <div><label class="text-sm font-medium">影片嵌入 URL</label><input id="video-url" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="https://www.youtube.com/embed/..."></div>
                <div><label class="text-sm font-medium">平台</label>
                    <select id="video-provider" class="w-full border rounded-lg px-3 py-2 mt-1">
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                        <option value="other">其他</option>
                    </select>
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-medium">跟進題目（選擇題／填充題）</label>
                    <div class="flex gap-2">
                        <button type="button" id="add-mcq" class="text-sm text-indigo-600">+ 選擇題</button>
                        <button type="button" id="add-fill" class="text-sm text-indigo-600">+ 填充題</button>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mb-2">題幹與選項可用 <code>$...$</code>／<code>$$...$$</code> 寫公式（學生端以 MathJax 顯示）。</p>
                <div id="questions" class="space-y-4"></div>
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium">儲存</button>
        </form>
<?php
admin_page_end([
    'scripts' => '<script>const EDIT_ID=' . $id . ';</script>'
        . '<script src="../assets/js/admin-api.js"></script>'
        . '<script src="../assets/js/admin-summer-homework.js"></script>',
]);
