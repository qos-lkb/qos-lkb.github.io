<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

bootstrap_public();
if (current_user() === null) {
    header('Location: ../login.php?next=' . rawurlencode('admin/review_queue.php'));
    exit;
}
if (!user_has_permission('learning_tool.manage_any') && !user_has_permission('article.manage_any')) {
    http_response_code(403);
    exit('沒有權限');
}

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>審核佇列 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white px-4 py-4">
        <div class="max-w-4xl mx-auto flex justify-between">
            <h1 class="font-bold">待審核內容</h1>
            <a href="index.php" class="text-sm text-slate-300">後台</a>
        </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">
        <p id="flash" class="text-sm mb-4 hidden"></p>
        <div id="queue" class="space-y-3"></div>
    </main>
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
            box.innerHTML = items.map(it => `
                <div class="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center">
                    <div>
                        <span class="text-xs uppercase text-amber-600 font-bold">${it.type === 'article' ? '文章' : '學習工具'}</span>
                        <h2 class="font-semibold">${it.title_zh || it.title_en}</h2>
                        <p class="text-xs text-slate-500 font-mono">${it.slug}</p>
                    </div>
                    <div class="flex gap-2">
                        <button type="button" class="px-3 py-1 bg-green-600 text-white rounded-lg text-sm" data-action="publish" data-type="${it.type}" data-id="${it.id}">發佈</button>
                        <button type="button" class="px-3 py-1 bg-slate-200 rounded-lg text-sm" data-action="reject" data-type="${it.type}" data-id="${it.id}">退回</button>
                    </div>
                </div>`).join('');
            box.querySelectorAll('button').forEach(btn => {
                btn.onclick = async () => {
                    const type = btn.dataset.type;
                    const id = btn.dataset.id;
                    const action = btn.dataset.action;
                    const path = `/review/${type === 'article' ? 'articles' : 'learning-tools'}/${id}/${action}`;
                    try {
                        await AdminApi.apiFetch(path, { method: 'POST', body: {} });
                        load();
                    } catch (e) {
                        flash.textContent = e.message;
                        flash.className = 'text-red-600 text-sm mb-4';
                    }
                };
            });
        }
        load();
    })();
    </script>
</body>
</html>
