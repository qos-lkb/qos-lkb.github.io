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
    } else {
        $form = (string) ($_POST['form'] ?? '');
        try {
            if ($form === 'subject') {
                $en = trim((string) ($_POST['name_en'] ?? ''));
                $zh = trim((string) ($_POST['name_zh'] ?? ''));
                if ($en === '') {
                    $error = '請填英文科目名稱。';
                } else {
                    $slug = substr(sim_slugify($en), 0, 128) ?: 'subject';
                    $pdo->prepare('INSERT INTO subjects (slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, 0)')->execute([$slug, $zh !== '' ? $zh : $en, $en]);
                    $ok = '已新增科目。';
                }
            } elseif ($form === 'topic') {
                $sid = (int) ($_POST['subject_id'] ?? 0);
                $en = trim((string) ($_POST['topic_name_en'] ?? ''));
                $zh = trim((string) ($_POST['topic_name_zh'] ?? ''));
                if ($sid <= 0 || $en === '') {
                    $error = '請選擇科目並填英文單元名稱。';
                } else {
                    $slug = substr(sim_slugify($en), 0, 160) ?: 'topic';
                    $mxStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM topics WHERE subject_id = ?');
                    $mxStmt->execute([$sid]);
                    $mx = (int) $mxStmt->fetchColumn();
                    $pdo->prepare('INSERT INTO topics (subject_id, slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, ?, ?)')->execute([$sid, $slug, $zh !== '' ? $zh : $en, $en, $mx]);
                    $ok = '已新增單元。';
                }
            } elseif ($form === 'subject_update') {
                $id = (int) ($_POST['id'] ?? 0);
                $en = trim((string) ($_POST['name_en'] ?? ''));
                $zh = trim((string) ($_POST['name_zh'] ?? ''));
                $sort = (int) ($_POST['sort_order'] ?? 0);
                if ($id <= 0 || $en === '') {
                    $error = '科目資料不完整。';
                } else {
                    $slug = substr(sim_slugify($en), 0, 128) ?: 'subject';
                    $pdo->prepare('UPDATE subjects SET slug = ?, name_zh = ?, name_en = ?, sort_order = ? WHERE id = ?')->execute([$slug, $zh !== '' ? $zh : $en, $en, $sort, $id]);
                    $ok = '已更新科目。';
                }
            } elseif ($form === 'subject_delete') {
                $id = (int) ($_POST['id'] ?? 0);
                if ($id <= 0) {
                    $error = '無效的科目。';
                } else {
                    $stmt = $pdo->prepare('SELECT COUNT(*) FROM topics WHERE subject_id = ?');
                    $stmt->execute([$id]);
                    $nt = (int) $stmt->fetchColumn();
                    $stmt = $pdo->prepare('SELECT COUNT(*) FROM simulations WHERE subject_id = ?');
                    $stmt->execute([$id]);
                    $ns = (int) $stmt->fetchColumn();
                    if ($nt > 0 || $ns > 0) {
                        $error = '無法刪除：請先移除或移轉此科目下的單元與模擬。';
                    } else {
                        $pdo->prepare('DELETE FROM subjects WHERE id = ?')->execute([$id]);
                        $ok = '已刪除科目。';
                    }
                }
            } elseif ($form === 'topic_update') {
                $id = (int) ($_POST['id'] ?? 0);
                $sid = (int) ($_POST['subject_id'] ?? 0);
                $en = trim((string) ($_POST['topic_name_en'] ?? ''));
                $zh = trim((string) ($_POST['topic_name_zh'] ?? ''));
                $sort = (int) ($_POST['sort_order'] ?? 0);
                if ($id <= 0 || $sid <= 0 || $en === '') {
                    $error = '單元資料不完整。';
                } else {
                    $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ?');
                    $chk->execute([$id]);
                    if (!$chk->fetch()) {
                        $error = '找不到此單元。';
                    } else {
                        $subOk = $pdo->prepare('SELECT id FROM subjects WHERE id = ?');
                        $subOk->execute([$sid]);
                        if (!$subOk->fetch()) {
                            $error = '所屬科目不存在。';
                        } else {
                            $slug = substr(sim_slugify($en), 0, 160) ?: 'topic';
                            $pdo->prepare('UPDATE topics SET subject_id = ?, slug = ?, name_zh = ?, name_en = ?, sort_order = ? WHERE id = ?')->execute([$sid, $slug, $zh !== '' ? $zh : $en, $en, $sort, $id]);
                            $ok = '已更新單元。';
                        }
                    }
                }
            } elseif ($form === 'topic_delete') {
                $id = (int) ($_POST['id'] ?? 0);
                if ($id <= 0) {
                    $error = '無效的單元。';
                } else {
                    $stmt = $pdo->prepare('SELECT COUNT(*) FROM simulations WHERE topic_id = ?');
                    $stmt->execute([$id]);
                    if ((int) $stmt->fetchColumn() > 0) {
                        $error = '無法刪除：仍有模擬使用此單元。';
                    } else {
                        $pdo->prepare('DELETE FROM topics WHERE id = ?')->execute([$id]);
                        $ok = '已刪除單元。';
                    }
                }
            }
        } catch (Throwable $e) {
            $error = '操作失敗（可能 slug 重複或資料庫錯誤）。';
        }
    }
}

$activeTab = 'subjects';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pf = (string) ($_POST['form'] ?? '');
    if (in_array($pf, ['topic', 'topic_update', 'topic_delete'], true)) {
        $activeTab = 'topics';
    } elseif (in_array($pf, ['subject', 'subject_update', 'subject_delete'], true)) {
        $activeTab = 'subjects';
    }
} else {
    $g = (string) ($_GET['tab'] ?? 'subjects');
    $activeTab = ($g === 'topics') ? 'topics' : 'subjects';
}

$subjects = $pdo->query('SELECT * FROM subjects ORDER BY sort_order, name_en')->fetchAll() ?: [];
$topicsRows = $pdo->query(
    'SELECT t.*, s.name_zh AS subject_name_zh, s.name_en AS subject_name_en
     FROM topics t
     INNER JOIN subjects s ON s.id = t.subject_id
     ORDER BY s.sort_order, s.name_en, t.sort_order, t.name_en'
)->fetchAll() ?: [];

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>科目與單元 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-slate-900 text-white shadow">
        <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between">
            <h1 class="font-bold">科目與單元</h1>
            <a href="index.php" class="text-sm text-slate-300 hover:text-white">後台</a>
        </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <?php if ($error !== ''): ?><p class="text-red-600 text-sm"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
        <?php if ($ok !== ''): ?><p class="text-green-700 text-sm"><?php echo htmlspecialchars($ok, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>

        <nav class="flex gap-1 border-b border-slate-200" aria-label="管理分頁">
            <a href="subjects.php?tab=subjects"
               class="px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 -mb-px <?php echo $activeTab === 'subjects' ? 'bg-white border-slate-200 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-900'; ?>">
                科目
            </a>
            <a href="subjects.php?tab=topics"
               class="px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 -mb-px <?php echo $activeTab === 'topics' ? 'bg-white border-slate-200 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-900'; ?>">
                單元
            </a>
        </nav>

        <div class="<?php echo $activeTab === 'subjects' ? '' : 'hidden'; ?>" id="panel-subjects">
            <div class="space-y-8">
                <section class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm rounded-tl-none">
                    <h2 class="font-semibold mb-4">新增科目</h2>
                    <form method="post" class="space-y-3">
                        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                        <input type="hidden" name="form" value="subject">
                        <input type="text" name="name_zh" placeholder="中文名稱" class="w-full border rounded-lg px-3 py-2">
                        <input type="text" name="name_en" placeholder="英文名稱（必填）" required class="w-full border rounded-lg px-3 py-2">
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">新增科目</button>
                    </form>
                </section>

                <section>
                    <h2 class="font-semibold mb-4">科目列表（排序與編輯）</h2>
                    <div class="space-y-4">
                        <?php foreach ($subjects as $s): ?>
                        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <form method="post" class="space-y-3 mb-4">
                                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                <input type="hidden" name="form" value="subject_update">
                                <input type="hidden" name="id" value="<?php echo (int) $s['id']; ?>">
                                <div class="flex flex-wrap gap-3 items-end">
                                    <div class="flex-1 min-w-[140px]">
                                        <label class="text-xs text-slate-500">中文</label>
                                        <input type="text" name="name_zh" value="<?php echo htmlspecialchars((string) $s['name_zh'], ENT_QUOTES, 'UTF-8'); ?>" class="w-full border rounded-lg px-3 py-2 text-sm">
                                    </div>
                                    <div class="flex-1 min-w-[140px]">
                                        <label class="text-xs text-slate-500">英文</label>
                                        <input type="text" name="name_en" value="<?php echo htmlspecialchars((string) $s['name_en'], ENT_QUOTES, 'UTF-8'); ?>" required class="w-full border rounded-lg px-3 py-2 text-sm">
                                    </div>
                                    <div class="w-24">
                                        <label class="text-xs text-slate-500">排序</label>
                                        <input type="number" name="sort_order" value="<?php echo (int) $s['sort_order']; ?>" class="w-full border rounded-lg px-3 py-2 text-sm">
                                    </div>
                                    <button type="submit" class="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm">儲存</button>
                                </div>
                                <p class="text-xs text-slate-400 font-mono">slug: <?php echo htmlspecialchars((string) $s['slug'], ENT_QUOTES, 'UTF-8'); ?></p>
                            </form>
                            <form method="post" class="inline" onsubmit="return confirm('確定刪除此科目？（須無下層單元與模擬）');">
                                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                <input type="hidden" name="form" value="subject_delete">
                                <input type="hidden" name="id" value="<?php echo (int) $s['id']; ?>">
                                <button type="submit" class="text-red-600 text-sm hover:underline">刪除科目</button>
                            </form>
                        </div>
                        <?php endforeach; ?>
                        <?php if (empty($subjects)): ?>
                            <p class="text-sm text-slate-500">尚無科目</p>
                        <?php endif; ?>
                    </div>
                </section>
            </div>
        </div>

        <div class="<?php echo $activeTab === 'topics' ? '' : 'hidden'; ?>" id="panel-topics">
            <div class="space-y-8">
                <section class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm rounded-tl-none">
                    <h2 class="font-semibold mb-4">新增單元（課題）</h2>
                    <form method="post" class="space-y-3">
                        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                        <input type="hidden" name="form" value="topic">
                        <select name="subject_id" class="w-full border rounded-lg px-3 py-2" required>
                            <option value="">選擇科目</option>
                            <?php foreach ($subjects as $s): ?>
                                <option value="<?php echo (int) $s['id']; ?>"><?php echo htmlspecialchars($s['name_zh'] . ' / ' . $s['name_en'], ENT_QUOTES, 'UTF-8'); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <input type="text" name="topic_name_zh" placeholder="單元中文名稱" class="w-full border rounded-lg px-3 py-2">
                        <input type="text" name="topic_name_en" placeholder="單元英文名稱（必填）" required class="w-full border rounded-lg px-3 py-2">
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">新增單元</button>
                    </form>
                </section>

                <section>
                    <h2 class="font-semibold mb-4">單元列表（依科目排序）</h2>
                    <?php if (empty($topicsRows)): ?>
                        <p class="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6">尚無單元</p>
                    <?php else: ?>
                    <div class="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-50 text-left">
                                <tr>
                                    <th class="p-3">科目</th>
                                    <th class="p-3">單元（中／英）</th>
                                    <th class="p-3 w-24">排序</th>
                                    <th class="p-3 w-32"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($topicsRows as $t): ?>
                                <tr class="border-t border-slate-100 align-top">
                                    <td class="p-3 text-slate-700 whitespace-nowrap">
                                        <?php echo htmlspecialchars((string) $t['subject_name_zh'] . ' / ' . (string) $t['subject_name_en'], ENT_QUOTES, 'UTF-8'); ?>
                                    </td>
                                    <td class="p-3" colspan="3">
                                        <form method="post" class="space-y-2">
                                            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                            <input type="hidden" name="form" value="topic_update">
                                            <input type="hidden" name="id" value="<?php echo (int) $t['id']; ?>">
                                            <div class="flex flex-wrap gap-2 items-center">
                                                <label class="text-xs text-slate-500 sr-only">所屬科目</label>
                                                <select name="subject_id" class="min-w-[180px] border rounded-lg px-2 py-1.5 text-sm" title="所屬科目">
                                                    <?php foreach ($subjects as $s): ?>
                                                        <option value="<?php echo (int) $s['id']; ?>"<?php echo (int) $t['subject_id'] === (int) $s['id'] ? ' selected' : ''; ?>><?php echo htmlspecialchars($s['name_zh'] . ' / ' . $s['name_en'], ENT_QUOTES, 'UTF-8'); ?></option>
                                                    <?php endforeach; ?>
                                                </select>
                                                <input type="text" name="topic_name_zh" value="<?php echo htmlspecialchars((string) $t['name_zh'], ENT_QUOTES, 'UTF-8'); ?>" class="flex-1 min-w-[120px] border rounded-lg px-2 py-1.5 text-sm" placeholder="單元中文">
                                                <input type="text" name="topic_name_en" value="<?php echo htmlspecialchars((string) $t['name_en'], ENT_QUOTES, 'UTF-8'); ?>" required class="flex-1 min-w-[120px] border rounded-lg px-2 py-1.5 text-sm" placeholder="單元英文">
                                                <input type="number" name="sort_order" value="<?php echo (int) $t['sort_order']; ?>" class="w-20 border rounded-lg px-2 py-1.5 text-sm" title="排序">
                                                <button type="submit" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm shrink-0">儲存</button>
                                            </div>
                                            <p class="text-xs text-slate-400 font-mono">slug: <?php echo htmlspecialchars((string) $t['slug'], ENT_QUOTES, 'UTF-8'); ?></p>
                                        </form>
                                        <form method="post" class="mt-2 inline" onsubmit="return confirm('確定刪除此單元？');">
                                            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                            <input type="hidden" name="form" value="topic_delete">
                                            <input type="hidden" name="id" value="<?php echo (int) $t['id']; ?>">
                                            <button type="submit" class="text-red-600 text-sm hover:underline">刪除單元</button>
                                        </form>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <?php endif; ?>
                </section>
            </div>
        </div>
    </main>
</body>
</html>
