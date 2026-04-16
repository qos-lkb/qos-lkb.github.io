<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/subjects.php'));

$pdo = db();
$error = '';
$ok = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf'] ?? null)) {
        $error = 'CSRF 驗證失敗。';
    } elseif (($_POST['form'] ?? '') === 'subject') {
        $en = trim((string) ($_POST['name_en'] ?? ''));
        $zh = trim((string) ($_POST['name_zh'] ?? ''));
        if ($en === '') {
            $error = '請填英文科目名稱。';
        } else {
            $slug = substr(sim_slugify($en), 0, 128) ?: 'subject';
            try {
                $pdo->prepare('INSERT INTO subjects (slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, 0)')->execute([$slug, $zh !== '' ? $zh : $en, $en]);
                $ok = '已新增科目。';
            } catch (Throwable $e) {
                $error = '新增失敗（slug 可能重複）。';
            }
        }
    } elseif (($_POST['form'] ?? '') === 'topic') {
        $sid = (int) ($_POST['subject_id'] ?? 0);
        $en = trim((string) ($_POST['topic_name_en'] ?? ''));
        $zh = trim((string) ($_POST['topic_name_zh'] ?? ''));
        if ($sid <= 0 || $en === '') {
            $error = '請選擇科目並填英文課題名稱。';
        } else {
            $slug = substr(sim_slugify($en), 0, 160) ?: 'topic';
            $mxStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM topics WHERE subject_id = ?');
            $mxStmt->execute([$sid]);
            $mx = (int) $mxStmt->fetchColumn();
            try {
                $pdo->prepare('INSERT INTO topics (subject_id, slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, ?, ?)')->execute([$sid, $slug, $zh !== '' ? $zh : $en, $en, $mx]);
                $ok = '已新增課題。';
            } catch (Throwable $e) {
                $error = '新增失敗（同一科目下 slug 可能重複）。';
            }
        }
    }
}

$subjects = $pdo->query('SELECT * FROM subjects ORDER BY sort_order, name_en')->fetchAll() ?: [];

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>科目與課題 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white shadow">
        <div class="max-w-3xl mx-auto px-4 py-4 flex justify-between">
            <h1 class="font-bold">科目與課題</h1>
            <a href="index.php" class="text-sm text-slate-300 hover:text-white">後台</a>
        </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <?php if ($error !== ''): ?><p class="text-red-600 text-sm"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
        <?php if ($ok !== ''): ?><p class="text-green-700 text-sm"><?php echo htmlspecialchars($ok, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>

        <section class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 class="font-semibold mb-4">新增科目</h2>
            <form method="post" class="space-y-3">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="form" value="subject">
                <input type="text" name="name_zh" placeholder="中文名稱" class="w-full border rounded-lg px-3 py-2">
                <input type="text" name="name_en" placeholder="英文名稱（必填）" required class="w-full border rounded-lg px-3 py-2">
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">新增科目</button>
            </form>
        </section>

        <section class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 class="font-semibold mb-4">新增課題</h2>
            <form method="post" class="space-y-3">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="form" value="topic">
                <select name="subject_id" class="w-full border rounded-lg px-3 py-2" required>
                    <option value="">選擇科目</option>
                    <?php foreach ($subjects as $s): ?>
                        <option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'] . ' / ' . $s['name_en'], ENT_QUOTES, 'UTF-8'); ?></option>
                    <?php endforeach; ?>
                </select>
                <input type="text" name="topic_name_zh" placeholder="課題中文名稱" class="w-full border rounded-lg px-3 py-2">
                <input type="text" name="topic_name_en" placeholder="課題英文名稱（必填）" required class="w-full border rounded-lg px-3 py-2">
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">新增課題</button>
            </form>
        </section>

        <section>
            <h2 class="font-semibold mb-2">現有科目</h2>
            <ul class="text-sm text-slate-700 space-y-1">
                <?php foreach ($subjects as $s): ?>
                    <li><?php echo htmlspecialchars($s['name_en'] . ' — ' . $s['slug'], ENT_QUOTES, 'UTF-8'); ?></li>
                <?php endforeach; ?>
            </ul>
        </section>
    </main>
</body>
</html>
