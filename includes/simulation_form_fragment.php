<?php

declare(strict_types=1);

/**
 * @var string $formAction
 * @var array<string, mixed>|null $editSim
 * @var array<int, array<string, mixed>> $subjects
 * @var array<int, array<int, array<string, mixed>>> $topicsBySubject
 * @var list<array{id:int,email:string,display_name:string}> $allUsers
 * @var bool $isAdmin
 * @var string $csrf
 */

$id = $editSim ? (int) $editSim['id'] : 0;
$titleZh = $editSim['title_zh'] ?? '';
$titleEn = $editSim['title_en'] ?? '';
$slug = $editSim['slug'] ?? '';
$html = $editSim['html'] ?? '';
$screenshot = $editSim['screenshot_path'] ?? '';
$subjectId = $editSim['subject_id'] ?? '';
$topicId = $editSim['topic_id'] ?? '';
$listSortOrder = isset($editSim['list_sort_order']) ? (int) $editSim['list_sort_order'] : 0;
$status = $editSim['status'] ?? 'draft';
$ownerId = $editSim['owner_user_id'] ?? '';
$tagSlugs = $editSim['_tags'] ?? [];
$tagsStr = is_array($tagSlugs) ? implode(', ', $tagSlugs) : '';

?>
<form method="post" action="<?php echo htmlspecialchars($formAction, ENT_QUOTES, 'UTF-8'); ?>" class="space-y-4">
    <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
    <input type="hidden" name="id" value="<?php echo $id; ?>">

    <div class="grid md:grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-medium text-slate-700">中文標題</label>
            <input type="text" name="title_zh" value="<?php echo htmlspecialchars((string) $titleZh, ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2">
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700">英文標題</label>
            <input type="text" name="title_en" value="<?php echo htmlspecialchars((string) $titleEn, ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2">
        </div>
    </div>

    <div>
        <label class="block text-sm font-medium text-slate-700">網址 slug（留空則依標題自動產生）</label>
        <input type="text" name="slug" value="<?php echo htmlspecialchars((string) $slug, ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="例如 physics-01-gas-laws">
    </div>

    <?php if ($isAdmin): ?>
    <div>
        <label class="block text-sm font-medium text-slate-700">擁有者</label>
        <select name="owner_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
            <?php foreach ($allUsers as $u): ?>
                <option value="<?php echo (int) $u['id']; ?>" <?php echo (string) $ownerId === (string) $u['id'] ? 'selected' : ''; ?>>
                    <?php echo htmlspecialchars($u['email'] . ' — ' . $u['display_name'], ENT_QUOTES, 'UTF-8'); ?>
                </option>
            <?php endforeach; ?>
        </select>
    </div>
    <?php endif; ?>

    <div class="grid md:grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-medium text-slate-700">科目</label>
            <select name="subject_id" id="field-subject" class="mt-1 w-full border rounded-lg px-3 py-2">
                <option value="">—</option>
                <?php foreach ($subjects as $s): ?>
                    <option value="<?php echo (int) $s['id']; ?>" <?php echo (string) $subjectId === (string) $s['id'] ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($s['name_zh'] . ' / ' . $s['name_en'], ENT_QUOTES, 'UTF-8'); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700">單元（課題）</label>
            <select name="topic_id" id="field-topic" class="mt-1 w-full border rounded-lg px-3 py-2">
                <option value="">—</option>
            </select>
        </div>
    </div>

    <div>
        <label class="block text-sm font-medium text-slate-700">列表排序（同一科目＋同一單元內，數字越小越前）</label>
        <input type="number" name="list_sort_order" value="<?php echo (int) $listSortOrder; ?>" min="0" step="1" class="mt-1 w-full border rounded-lg px-3 py-2 md:w-40">
    </div>

    <div>
        <label class="block text-sm font-medium text-slate-700">標籤（逗號分隔）</label>
        <input type="text" name="tags" value="<?php echo htmlspecialchars($tagsStr, ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2" placeholder="互動, 力學">
    </div>

    <div>
        <label class="block text-sm font-medium text-slate-700">截圖路徑（相對網站根目錄，可空）</label>
        <input type="text" name="screenshot_path" value="<?php echo htmlspecialchars((string) $screenshot, ENT_QUOTES, 'UTF-8'); ?>" class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm">
    </div>

    <div>
        <label class="block text-sm font-medium text-slate-700">狀態</label>
        <select name="status" class="mt-1 w-full border rounded-lg px-3 py-2 md:w-48">
            <option value="draft" <?php echo $status === 'draft' ? 'selected' : ''; ?>>草稿</option>
            <option value="published" <?php echo $status === 'published' ? 'selected' : ''; ?>>已發佈</option>
        </select>
    </div>

    <div>
        <label class="block text-sm font-medium text-slate-700">HTML 內容</label>
        <textarea name="html" rows="16" class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm" required><?php echo htmlspecialchars((string) $html, ENT_QUOTES, 'UTF-8'); ?></textarea>
    </div>

    <div class="flex gap-3 flex-wrap">
        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
    </div>
</form>

<script>
(function() {
    const topicsBySubject = <?php echo json_encode($topicsBySubject, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
    const subjectEl = document.getElementById('field-subject');
    const topicEl = document.getElementById('field-topic');
    const selectedTopic = <?php echo json_encode((string) $topicId, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;

    function refillTopics() {
        const sid = subjectEl.value;
        topicEl.innerHTML = '<option value="">—</option>';
        const list = topicsBySubject[sid] || [];
        list.forEach(function(t) {
            const o = document.createElement('option');
            o.value = t.id;
            o.textContent = (t.name_zh || '') + ' / ' + (t.name_en || '');
            if (String(t.id) === selectedTopic) o.selected = true;
            topicEl.appendChild(o);
        });
    }
    subjectEl.addEventListener('change', function() { refillTopics(); });
    refillTopics();
})();
</script>
