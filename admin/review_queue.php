<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
if (current_user() === null) {
    header('Location: ../login.php?next=' . rawurlencode('admin/review_queue.php'));
    exit;
}
if (!admin_can_review()) {
    http_response_code(403);
    exit('沒有權限');
}

admin_page_start('審核佇列', 'review_queue', [
    'subtitle' => '審核待發佈的學習筆記、工作紙、文章與互動學習工具。',
]);
?>
        <p id="flash" class="text-sm hidden"></p>
        <div id="queue" class="space-y-3"></div>
<?php
admin_page_end([
    'scripts' => <<<'HTML'
    <script src="../assets/js/admin-api.js"></script>
    <script>
    (async function() {
        await AdminApi.initSession();
        const box = document.getElementById('queue');
        const flash = document.getElementById('flash');
        async function load() {
            const items = await AdminApi.apiFetch('/review-queue');
            if (!items.length) {
                box.innerHTML = '<p class="text-slate-500">目前沒有待審核項目。</p>';
                return;
            }
            box.innerHTML = items.map(it => {
                const typeLabel = {
                    article: '文章',
                    learning_tool: '學習工具',
                    learning_note: '學習筆記',
                    worksheet: '工作紙',
                }[it.type] || it.type;
                const reviewPath = {
                    article: 'articles',
                    learning_tool: 'learning-tools',
                    learning_note: 'learning-notes',
                    worksheet: 'worksheets',
                }[it.type] || it.type;
                return `
                <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center shadow-sm">
                    <div>
                        <span class="text-xs uppercase text-amber-600 font-bold">${typeLabel}</span>
                        <h2 class="font-semibold">${it.title_zh || it.title_en}</h2>
                        <p class="text-xs text-slate-500 font-mono">${it.slug}</p>
                    </div>
                    <div class="flex gap-2">
                        <button type="button" class="px-3 py-1 bg-green-600 text-white rounded-lg text-sm" data-action="publish" data-path="${reviewPath}" data-id="${it.id}">發佈</button>
                        <button type="button" class="px-3 py-1 bg-slate-200 rounded-lg text-sm" data-action="reject" data-path="${reviewPath}" data-id="${it.id}">退回</button>
                    </div>
                </div>`;
            }).join('');
            box.querySelectorAll('button').forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.dataset.id;
                    const action = btn.dataset.action;
                    const path = `/review/${btn.dataset.path}/${id}/${action}`;
                    try {
                        await AdminApi.apiFetch(path, { method: 'POST', body: {} });
                        load();
                    } catch (e) {
                        flash.textContent = e.message;
                        flash.className = 'text-red-600 text-sm';
                        flash.classList.remove('hidden');
                    }
                };
            });
        }
        load();
    })();
    </script>
HTML,
]);
