<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/subjects.php'));

$pdo = db();
$error = '';
$ok = '';
/** @var array<string, mixed> */
$jsonExtra = [];

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
            } elseif ($form === 'subject_row') {
                $id = (int) ($_POST['id'] ?? 0);
                $action = (string) ($_POST['action'] ?? '');
                if ($action === 'delete') {
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
                } elseif ($action === 'save') {
                    $en = trim((string) ($_POST['name_en'] ?? ''));
                    $zh = trim((string) ($_POST['name_zh'] ?? ''));
                    if ($id <= 0 || $en === '') {
                        $error = '科目資料不完整。';
                    } else {
                        $slug = substr(sim_slugify($en), 0, 128) ?: 'subject';
                        $pdo->prepare('UPDATE subjects SET slug = ?, name_zh = ?, name_en = ? WHERE id = ?')->execute([$slug, $zh !== '' ? $zh : $en, $en, $id]);
                        $ok = '已更新科目。';
                        $jsonExtra = [
                            'slug' => $slug,
                            'name_zh' => $zh !== '' ? $zh : $en,
                            'name_en' => $en,
                        ];
                    }
                } else {
                    $error = '無效的科目操作。';
                }
            } elseif ($form === 'subjects_reorder') {
                $order = $_POST['subject_order'] ?? [];
                if (!is_array($order)) {
                    $order = [];
                }
                $ids = array_values(array_filter(array_map('intval', $order), static fn (int $x): bool => $x > 0));
                $allIds = array_map('intval', $pdo->query('SELECT id FROM subjects')->fetchAll(PDO::FETCH_COLUMN) ?: []);
                sort($allIds);
                $sorted = $ids;
                sort($sorted);
                if ($ids === [] || $sorted !== $allIds) {
                    $error = '科目排序資料無效。';
                } else {
                    $pdo->beginTransaction();
                    $u = $pdo->prepare('UPDATE subjects SET sort_order = ? WHERE id = ?');
                    foreach ($ids as $i => $sid) {
                        $u->execute([$i, $sid]);
                    }
                    $pdo->commit();
                    $ok = '已更新科目排序。';
                }
            } elseif ($form === 'topic_row') {
                $id = (int) ($_POST['id'] ?? 0);
                $action = (string) ($_POST['action'] ?? '');
                if ($action === 'delete') {
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
                } elseif ($action === 'save') {
                    $sid = (int) ($_POST['subject_id'] ?? 0);
                    $en = trim((string) ($_POST['topic_name_en'] ?? ''));
                    $zh = trim((string) ($_POST['topic_name_zh'] ?? ''));
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
                                $pdo->prepare('UPDATE topics SET subject_id = ?, slug = ?, name_zh = ?, name_en = ? WHERE id = ?')->execute([$sid, $slug, $zh !== '' ? $zh : $en, $en, $id]);
                                $ok = '已更新單元。';
                                $jsonExtra = [
                                    'slug' => $slug,
                                    'name_zh' => $zh !== '' ? $zh : $en,
                                    'name_en' => $en,
                                    'subject_id' => $sid,
                                ];
                            }
                        }
                    }
                } else {
                    $error = '無效的單元操作。';
                }
            } elseif ($form === 'topics_reorder') {
                $sid = (int) ($_POST['subject_id'] ?? 0);
                $order = $_POST['topic_order'] ?? [];
                if (!is_array($order)) {
                    $order = [];
                }
                $ids = array_values(array_filter(array_map('intval', $order), static fn (int $x): bool => $x > 0));
                if ($sid <= 0) {
                    $error = '單元排序：科目無效。';
                } else {
                    $stmt = $pdo->prepare('SELECT id FROM topics WHERE subject_id = ? ORDER BY sort_order, name_en');
                    $stmt->execute([$sid]);
                    $allIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
                    sort($allIds);
                    $sorted = $ids;
                    sort($sorted);
                    if ($ids === [] || $sorted !== $allIds) {
                        $error = '單元排序資料無效。';
                    } else {
                        $pdo->beginTransaction();
                        $u = $pdo->prepare('UPDATE topics SET sort_order = ? WHERE id = ? AND subject_id = ?');
                        foreach ($ids as $i => $tid) {
                            $u->execute([$i, $tid, $sid]);
                        }
                        $pdo->commit();
                        $ok = '已更新單元排序。';
                    }
                }
            }
        } catch (Throwable $e) {
            $error = '操作失敗（可能 slug 重複或資料庫錯誤）。';
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pfJson = (string) ($_POST['form'] ?? '');
    $actJson = (string) ($_POST['action'] ?? '');
    $xhr = strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) === 'xmlhttprequest';
    $wantJson = $xhr && (
        in_array($pfJson, ['subjects_reorder', 'topics_reorder'], true)
        || (in_array($pfJson, ['subject_row', 'topic_row'], true) && $actJson === 'save')
    );
    if ($wantJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array_merge([
            'ok' => $error === '',
            'error' => $error,
            'message' => $ok,
        ], $jsonExtra), JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$activeTab = 'subjects';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pf = (string) ($_POST['form'] ?? '');
    if (in_array($pf, ['topic', 'topic_row', 'topics_reorder'], true)) {
        $activeTab = 'topics';
    } elseif (in_array($pf, ['subject', 'subject_row', 'subjects_reorder'], true)) {
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

$topicsBySubjectId = [];
foreach ($subjects as $s) {
    $topicsBySubjectId[(int) $s['id']] = [];
}
foreach ($topicsRows as $t) {
    $sid = (int) $t['subject_id'];
    if (!isset($topicsBySubjectId[$sid])) {
        $topicsBySubjectId[$sid] = [];
    }
    $topicsBySubjectId[$sid][] = $t;
}

$csrf = htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8');

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>科目與單元 | Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* 全頁字體約小 2px（以常見 16px 為基準 → 14px） */
        html { font-size: 14px; }
    </style>
</head>
<body class="bg-slate-50 min-h-screen leading-snug">
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
                        <input type="hidden" name="csrf" value="<?php echo $csrf; ?>">
                        <input type="hidden" name="form" value="subject">
                        <input type="text" name="name_zh" placeholder="中文名稱" class="w-full border rounded-lg px-3 py-2">
                        <input type="text" name="name_en" placeholder="英文名稱（必填）" required class="w-full border rounded-lg px-3 py-2">
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">新增科目</button>
                    </form>
                </section>

                <section>
                    <h2 class="font-semibold mb-3">科目列表（拖曳排序；雙擊名稱編輯）</h2>
                    <p class="text-slate-500 mb-3 text-xs">左側「⠿」拖曳排序。雙擊中文或英文名稱進入編輯，離開欄位後自動儲存。</p>
                    <div id="subject-sort-list" class="space-y-2" data-csrf="<?php echo $csrf; ?>">
                        <?php foreach ($subjects as $s): ?>
                        <div class="subject-sort-item bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm flex flex-nowrap items-stretch gap-2 min-w-0" data-subject-id="<?php echo (int) $s['id']; ?>">
                            <button type="button" class="subject-drag-handle shrink-0 w-8 flex flex-col items-center justify-center rounded border border-dashed border-slate-300 text-slate-500 cursor-grab active:cursor-grabbing select-none text-xs leading-none" title="拖曳排序" aria-label="拖曳排序">⠿</button>
                            <div class="flex flex-nowrap items-center gap-2 min-w-0 flex-1 overflow-x-auto">
                                <div class="js-subject-inline flex flex-nowrap items-center gap-2 flex-1 min-w-0" data-endpoint="subjects.php">
                                    <input type="hidden" class="js-csrf" value="<?php echo $csrf; ?>">
                                    <input type="hidden" class="js-id" value="<?php echo (int) $s['id']; ?>">
                                    <span class="js-subject-zh-view shrink-0 max-w-[7.5rem] truncate cursor-text border-b border-dotted border-slate-300 hover:border-slate-500 px-0.5" title="雙擊編輯"><?php echo htmlspecialchars((string) $s['name_zh'], ENT_QUOTES, 'UTF-8'); ?></span>
                                    <input type="text" name="name_zh" value="<?php echo htmlspecialchars((string) $s['name_zh'], ENT_QUOTES, 'UTF-8'); ?>" class="js-subject-zh-input hidden w-[7.5rem] shrink-0 border rounded px-2 py-1" placeholder="中文" autocomplete="off">
                                    <span class="js-subject-en-view min-w-[4rem] flex-1 truncate cursor-text border-b border-dotted border-slate-300 hover:border-slate-500 px-0.5" title="雙擊編輯"><?php echo htmlspecialchars((string) $s['name_en'], ENT_QUOTES, 'UTF-8'); ?></span>
                                    <input type="text" name="name_en" value="<?php echo htmlspecialchars((string) $s['name_en'], ENT_QUOTES, 'UTF-8'); ?>" class="js-subject-en-input hidden min-w-[6rem] flex-1 border rounded px-2 py-1" placeholder="英文（必填）" autocomplete="off">
                                    <span class="js-subject-slug shrink-0 text-slate-400 font-mono text-xs truncate max-w-[7rem]" title="<?php echo htmlspecialchars((string) $s['slug'], ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars((string) $s['slug'], ENT_QUOTES, 'UTF-8'); ?></span>
                                </div>
                                <form method="post" class="shrink-0 flex items-center" onsubmit="return confirm('確定刪除此科目？（須無下層單元與模擬）');">
                                    <input type="hidden" name="csrf" value="<?php echo $csrf; ?>">
                                    <input type="hidden" name="form" value="subject_row">
                                    <input type="hidden" name="id" value="<?php echo (int) $s['id']; ?>">
                                    <button type="submit" name="action" value="delete" class="text-red-600 px-2.5 py-1 rounded hover:bg-red-50">刪除</button>
                                </form>
                            </div>
                        </div>
                        <?php endforeach; ?>
                        <?php if (empty($subjects)): ?>
                            <p class="text-slate-500">尚無科目</p>
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
                        <input type="hidden" name="csrf" value="<?php echo $csrf; ?>">
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
                    <h2 class="font-semibold mb-3">單元列表（依科目分組；拖曳排序）</h2>
                    <p class="text-slate-500 mb-3 text-xs">組內「⠿」拖曳排序。雙擊單元中文／英文名稱編輯，離開欄位後自動儲存；變更「科目」下拉後亦會立即儲存。</p>
                    <?php if (empty($topicsRows)): ?>
                        <p class="text-slate-500 bg-white border border-slate-200 rounded-xl p-6">尚無單元</p>
                    <?php else: ?>
                    <div class="space-y-6">
                        <?php foreach ($subjects as $s): ?>
                            <?php
                            $sid = (int) $s['id'];
                            $grp = $topicsBySubjectId[$sid] ?? [];
                            ?>
                        <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div class="bg-slate-50 px-3 py-2 text-slate-700 font-medium border-b border-slate-200">
                                <?php echo htmlspecialchars((string) $s['name_zh'] . ' / ' . (string) $s['name_en'], ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                            <?php if (empty($grp)): ?>
                                <p class="text-slate-500 px-3 py-3 text-xs">此科目尚無單元</p>
                            <?php else: ?>
                            <div class="topic-sort-list divide-y divide-slate-100" data-csrf="<?php echo $csrf; ?>" data-subject-id="<?php echo $sid; ?>">
                                <?php foreach ($grp as $t): ?>
                                <div class="topic-sort-item flex flex-nowrap items-stretch gap-2 px-2 py-1.5 min-w-0" data-topic-id="<?php echo (int) $t['id']; ?>">
                                    <button type="button" class="topic-drag-handle shrink-0 w-8 flex flex-col items-center justify-center rounded border border-dashed border-slate-300 text-slate-500 cursor-grab active:cursor-grabbing select-none text-xs leading-none" title="拖曳排序" aria-label="拖曳排序">⠿</button>
                                    <div class="flex flex-nowrap items-center gap-2 min-w-0 flex-1 overflow-x-auto">
                                        <div class="js-topic-inline flex flex-nowrap items-center gap-2 flex-1 min-w-0" data-endpoint="subjects.php">
                                            <input type="hidden" class="js-csrf" value="<?php echo $csrf; ?>">
                                            <input type="hidden" class="js-id" value="<?php echo (int) $t['id']; ?>">
                                            <select name="subject_id" class="js-topic-subject shrink-0 min-w-[8.5rem] max-w-[11rem] border rounded px-1.5 py-1" title="所屬科目">
                                                <?php foreach ($subjects as $sub): ?>
                                                    <option value="<?php echo (int) $sub['id']; ?>"<?php echo (int) $t['subject_id'] === (int) $sub['id'] ? ' selected' : ''; ?>><?php echo htmlspecialchars($sub['name_zh'] . ' / ' . $sub['name_en'], ENT_QUOTES, 'UTF-8'); ?></option>
                                                <?php endforeach; ?>
                                            </select>
                                            <span class="js-topic-zh-view w-[6.5rem] shrink-0 truncate cursor-text border-b border-dotted border-slate-300 hover:border-slate-500 px-0.5" title="雙擊編輯"><?php echo htmlspecialchars((string) $t['name_zh'], ENT_QUOTES, 'UTF-8'); ?></span>
                                            <input type="text" name="topic_name_zh" value="<?php echo htmlspecialchars((string) $t['name_zh'], ENT_QUOTES, 'UTF-8'); ?>" class="js-topic-zh-input hidden w-[6.5rem] shrink-0 border rounded px-2 py-1" placeholder="中文" autocomplete="off">
                                            <span class="js-topic-en-view min-w-[4rem] flex-1 truncate cursor-text border-b border-dotted border-slate-300 hover:border-slate-500 px-0.5" title="雙擊編輯"><?php echo htmlspecialchars((string) $t['name_en'], ENT_QUOTES, 'UTF-8'); ?></span>
                                            <input type="text" name="topic_name_en" value="<?php echo htmlspecialchars((string) $t['name_en'], ENT_QUOTES, 'UTF-8'); ?>" class="js-topic-en-input hidden min-w-[5rem] flex-1 border rounded px-2 py-1" placeholder="英文（必填）" autocomplete="off">
                                            <span class="js-topic-slug shrink-0 text-slate-400 font-mono text-xs truncate max-w-[6rem]" title="<?php echo htmlspecialchars((string) $t['slug'], ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars((string) $t['slug'], ENT_QUOTES, 'UTF-8'); ?></span>
                                        </div>
                                        <form method="post" class="shrink-0 flex items-center" onsubmit="return confirm('確定刪除此單元？');">
                                            <input type="hidden" name="csrf" value="<?php echo $csrf; ?>">
                                            <input type="hidden" name="form" value="topic_row">
                                            <input type="hidden" name="id" value="<?php echo (int) $t['id']; ?>">
                                            <button type="submit" name="action" value="delete" class="text-red-600 px-2.5 py-1 rounded hover:bg-red-50">刪除</button>
                                        </form>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                            </div>
                            <?php endif; ?>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </section>
            </div>
        </div>
    </main>
    <script>
    (function () {
        function getDragAfterElement(container, y, itemSelector) {
            const els = Array.prototype.slice.call(container.querySelectorAll(itemSelector + ':not(.dragging)'));
            return els.reduce(function (closest, child) {
                var box = child.getBoundingClientRect();
                var offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                }
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY, element: undefined }).element;
        }

        function wireVerticalSort(container, itemSelector, handleSelector, persist) {
            if (!container) return;
            var dragged = null;
            container.addEventListener('dragenter', function (e) {
                e.preventDefault();
            });
            container.addEventListener('dragover', function (e) {
                e.preventDefault();
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'move';
                }
                if (!dragged) return;
                var after = getDragAfterElement(container, e.clientY, itemSelector);
                if (after == null) {
                    container.appendChild(dragged);
                } else {
                    container.insertBefore(dragged, after);
                }
            });
            container.addEventListener('drop', function (e) {
                e.preventDefault();
            });
            Array.prototype.forEach.call(container.querySelectorAll(itemSelector), function (row) {
                var handle = row.querySelector(handleSelector);
                if (!handle) return;
                /* draggable 設在列上時，dragstart 的 target 常為「列」而非控點，closest(handle) 會誤判而 cancel */
                function armSortRow() {
                    row.setAttribute('draggable', 'true');
                    row.dataset.sortArmed = '1';
                }
                handle.addEventListener('pointerdown', armSortRow);
                handle.addEventListener('mousedown', armSortRow);
                row.addEventListener('dragend', function () {
                    row.removeAttribute('draggable');
                    delete row.dataset.sortArmed;
                    row.classList.remove('dragging', 'opacity-60');
                    if (dragged === row) {
                        dragged = null;
                        persist(container);
                    }
                });
                row.addEventListener('dragstart', function (e) {
                    if (row.dataset.sortArmed !== '1') {
                        e.preventDefault();
                        return;
                    }
                    delete row.dataset.sortArmed;
                    dragged = row;
                    row.classList.add('dragging', 'opacity-60');
                    e.dataTransfer.effectAllowed = 'move';
                    try {
                        e.dataTransfer.setData('text/plain', 'sort');
                    } catch (err) { /* ignore */ }
                });
            });
        }

        function postReorder(url, fields) {
            return fetch(url, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: fields,
                credentials: 'same-origin'
            }).then(function (res) { return res.json(); });
        }

        function persistSubjects(listEl) {
            var csrf = listEl.getAttribute('data-csrf') || '';
            var ids = Array.prototype.map.call(listEl.querySelectorAll('.subject-sort-item'), function (r) {
                return r.getAttribute('data-subject-id');
            }).filter(Boolean);
            if (ids.length === 0) return Promise.resolve();
            var body = new URLSearchParams();
            body.set('csrf', csrf);
            body.set('form', 'subjects_reorder');
            ids.forEach(function (id) { body.append('subject_order[]', id); });
            return postReorder('subjects.php', body).then(function (j) {
                if (!j.ok) window.alert(j.error || '科目排序失敗');
            }).catch(function () {
                window.alert('科目排序請求失敗');
            });
        }

        function persistTopics(listEl) {
            var csrf = listEl.getAttribute('data-csrf') || '';
            var sid = listEl.getAttribute('data-subject-id') || '';
            var ids = Array.prototype.map.call(listEl.querySelectorAll('.topic-sort-item'), function (r) {
                return r.getAttribute('data-topic-id');
            }).filter(Boolean);
            if (ids.length === 0) return Promise.resolve();
            var body = new URLSearchParams();
            body.set('csrf', csrf);
            body.set('form', 'topics_reorder');
            body.set('subject_id', sid);
            ids.forEach(function (id) { body.append('topic_order[]', id); });
            return postReorder('subjects.php', body).then(function (j) {
                if (!j.ok) window.alert(j.error || '單元排序失敗');
            }).catch(function () {
                window.alert('單元排序請求失敗');
            });
        }

        function postRowSave(url, body) {
            return fetch(url || 'subjects.php', {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: body,
                credentials: 'same-origin'
            }).then(function (res) { return res.json(); });
        }

        function setVisible(el, on) {
            if (!el) return;
            if (on) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }

        function wireSubjectInline(root) {
            var zhV = root.querySelector('.js-subject-zh-view');
            var zhI = root.querySelector('.js-subject-zh-input');
            var enV = root.querySelector('.js-subject-en-view');
            var enI = root.querySelector('.js-subject-en-input');
            var slugEl = root.querySelector('.js-subject-slug');
            if (!zhV || !zhI || !enV || !enI) return;

            function enterEdit() {
                if (root.dataset.editing === '1') return;
                root.dataset.editing = '1';
                zhI.value = zhV.textContent || '';
                enI.value = enV.textContent || '';
                root.dataset.origZh = zhI.value;
                root.dataset.origEn = enI.value;
                setVisible(zhV, false);
                setVisible(zhI, true);
                setVisible(enV, false);
                setVisible(enI, true);
                window.requestAnimationFrame(function () {
                    zhI.focus();
                    zhI.select();
                });
            }

            function leaveViewOnly() {
                setVisible(zhV, true);
                setVisible(zhI, false);
                setVisible(enV, true);
                setVisible(enI, false);
                delete root.dataset.editing;
            }

            function applyPayload(j) {
                if (j.name_zh != null) zhV.textContent = String(j.name_zh);
                if (j.name_en != null) enV.textContent = String(j.name_en);
                if (j.slug != null) {
                    slugEl.textContent = String(j.slug);
                    slugEl.setAttribute('title', String(j.slug));
                }
                zhI.value = zhV.textContent || '';
                enI.value = enV.textContent || '';
            }

            function saveInline() {
                if (root.dataset.editing !== '1') return;
                var csrf = (root.querySelector('.js-csrf') || {}).value || '';
                var id = (root.querySelector('.js-id') || {}).value || '';
                var zh = String(zhI.value || '').trim();
                var en = String(enI.value || '').trim();
                if (en === '') {
                    window.alert('英文名稱為必填。');
                    enI.focus();
                    return;
                }
                if (zh === root.dataset.origZh && en === root.dataset.origEn) {
                    leaveViewOnly();
                    return;
                }
                var body = new URLSearchParams();
                body.set('csrf', csrf);
                body.set('form', 'subject_row');
                body.set('action', 'save');
                body.set('id', id);
                body.set('name_zh', zh);
                body.set('name_en', en);
                var ep = root.getAttribute('data-endpoint') || 'subjects.php';
                postRowSave(ep, body).then(function (j) {
                    if (!j.ok) {
                        window.alert(j.error || '儲存失敗');
                        return;
                    }
                    applyPayload(j);
                    leaveViewOnly();
                }).catch(function () {
                    window.alert('儲存請求失敗');
                });
            }

            [zhV, enV].forEach(function (el) {
                el.addEventListener('dblclick', function (e) {
                    e.preventDefault();
                    enterEdit();
                });
            });

            [zhI, enI].forEach(function (inp) {
                inp.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        inp.blur();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        zhI.value = root.dataset.origZh || '';
                        enI.value = root.dataset.origEn || '';
                        leaveViewOnly();
                    }
                });
            });

            root.addEventListener('focusout', function (e) {
                if (root.dataset.editing !== '1') return;
                var rt = e.relatedTarget;
                window.setTimeout(function () {
                    if (root.dataset.editing !== '1') return;
                    if (rt && root.contains(rt)) return;
                    if (root.contains(document.activeElement)) return;
                    saveInline();
                }, 0);
            });
        }

        function wireTopicInline(root) {
            var listEl = root.closest('.topic-sort-list');
            var zhV = root.querySelector('.js-topic-zh-view');
            var zhI = root.querySelector('.js-topic-zh-input');
            var enV = root.querySelector('.js-topic-en-view');
            var enI = root.querySelector('.js-topic-en-input');
            var slugEl = root.querySelector('.js-topic-slug');
            var sel = root.querySelector('.js-topic-subject');
            if (!zhV || !zhI || !enV || !enI || !sel) return;

            function readZhEn() {
                if (root.dataset.editing === '1') {
                    return { zh: String(zhI.value || '').trim(), en: String(enI.value || '').trim() };
                }
                return { zh: String(zhV.textContent || '').trim(), en: String(enV.textContent || '').trim() };
            }

            function enterEdit() {
                if (root.dataset.editing === '1') return;
                root.dataset.editing = '1';
                zhI.value = zhV.textContent || '';
                enI.value = enV.textContent || '';
                root.dataset.origZh = zhI.value;
                root.dataset.origEn = enI.value;
                setVisible(zhV, false);
                setVisible(zhI, true);
                setVisible(enV, false);
                setVisible(enI, true);
                window.requestAnimationFrame(function () {
                    zhI.focus();
                    zhI.select();
                });
            }

            function leaveViewOnly() {
                setVisible(zhV, true);
                setVisible(zhI, false);
                setVisible(enV, true);
                setVisible(enI, false);
                delete root.dataset.editing;
            }

            function applyPayload(j) {
                if (j.name_zh != null) zhV.textContent = String(j.name_zh);
                if (j.name_en != null) enV.textContent = String(j.name_en);
                if (j.slug != null) {
                    slugEl.textContent = String(j.slug);
                    slugEl.setAttribute('title', String(j.slug));
                }
                zhI.value = zhV.textContent || '';
                enI.value = enV.textContent || '';
                if (j.subject_id != null) {
                    sel.value = String(j.subject_id);
                }
            }

            function postSaveThenMaybeReload(j) {
                if (!j.ok) {
                    window.alert(j.error || '儲存失敗');
                    sel.value = String(root.dataset.origSubjectId || '');
                    return;
                }
                applyPayload(j);
                root.dataset.origSubjectId = String((j.subject_id != null ? j.subject_id : sel.value) || '');
                var newSid = j.subject_id != null ? String(j.subject_id) : '';
                var curListSid = listEl ? (listEl.getAttribute('data-subject-id') || '') : '';
                if (newSid !== '' && curListSid !== '' && newSid !== curListSid) {
                    window.location.href = 'subjects.php?tab=topics';
                    return;
                }
                leaveViewOnly();
            }

            function saveFromInputs() {
                var csrf = (root.querySelector('.js-csrf') || {}).value || '';
                var id = (root.querySelector('.js-id') || {}).value || '';
                var sid = String(sel.value || '');
                var pair = readZhEn();
                var origSid = String(root.dataset.origSubjectId || '');
                if (pair.en === '') {
                    window.alert('單元英文名稱為必填。');
                    if (root.dataset.editing === '1') enI.focus();
                    return;
                }
                if (root.dataset.editing === '1' && pair.zh === root.dataset.origZh && pair.en === root.dataset.origEn && sid === origSid) {
                    leaveViewOnly();
                    return;
                }
                var body = new URLSearchParams();
                body.set('csrf', csrf);
                body.set('form', 'topic_row');
                body.set('action', 'save');
                body.set('id', id);
                body.set('subject_id', sid);
                body.set('topic_name_zh', pair.zh);
                body.set('topic_name_en', pair.en);
                var ep = root.getAttribute('data-endpoint') || 'subjects.php';
                postRowSave(ep, body).then(postSaveThenMaybeReload).catch(function () {
                    window.alert('儲存請求失敗');
                });
            }

            root.dataset.origSubjectId = String(sel.value || '');

            sel.addEventListener('change', function () {
                saveFromInputs();
            });

            [zhV, enV].forEach(function (el) {
                el.addEventListener('dblclick', function (e) {
                    e.preventDefault();
                    enterEdit();
                });
            });

            [zhI, enI].forEach(function (inp) {
                inp.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        inp.blur();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        zhI.value = root.dataset.origZh || '';
                        enI.value = root.dataset.origEn || '';
                        leaveViewOnly();
                    }
                });
            });

            root.addEventListener('focusout', function (e) {
                if (root.dataset.editing !== '1') return;
                var rt = e.relatedTarget;
                window.setTimeout(function () {
                    if (root.dataset.editing !== '1') return;
                    if (rt && root.contains(rt)) return;
                    if (root.contains(document.activeElement)) return;
                    var sid = String(sel.value || '');
                    var pair = readZhEn();
                    if (pair.zh === root.dataset.origZh && pair.en === root.dataset.origEn && sid === String(root.dataset.origSubjectId || '')) {
                        leaveViewOnly();
                        return;
                    }
                    saveFromInputs();
                }, 0);
            });
        }

        document.addEventListener('DOMContentLoaded', function () {
            document.addEventListener('mouseup', function () {
                Array.prototype.forEach.call(document.querySelectorAll('.subject-sort-item,.topic-sort-item'), function (el) {
                    if (!el.classList.contains('dragging')) {
                        el.removeAttribute('draggable');
                        delete el.dataset.sortArmed;
                    }
                });
            }, true);
            var sub = document.getElementById('subject-sort-list');
            wireVerticalSort(sub, '.subject-sort-item', '.subject-drag-handle', persistSubjects);
            Array.prototype.forEach.call(document.querySelectorAll('.topic-sort-list'), function (el) {
                wireVerticalSort(el, '.topic-sort-item', '.topic-drag-handle', persistTopics);
            });
            Array.prototype.forEach.call(document.querySelectorAll('.js-subject-inline'), wireSubjectInline);
            Array.prototype.forEach.call(document.querySelectorAll('.js-topic-inline'), wireTopicInline);
        });
    })();
    </script>
</body>
</html>
