<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/simulation_save.php';

bootstrap_public();
require_permission('simulation.manage_own', '../login.php?next=' . rawurlencode('portal/simulation_edit.php'));

$pdo = db();
$u = current_user();
assert($u !== null);

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$editSim = null;
if ($id > 0) {
    $editSim = sim_get_by_id($pdo, $id);
    if (!$editSim || $editSim['owner_user_id'] === null || (int) $editSim['owner_user_id'] !== $u['id']) {
        http_response_code(403);
        exit('無權編輯');
    }
    $editSim['_tags'] = sim_get_tag_slugs($pdo, $id);
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $res = simulation_save_from_request($pdo, $u, $_POST, false);
    if ($res['ok']) {
        header('Location: simulations.php');
        exit;
    }
    $error = $res['error'] ?? '儲存失敗';
    $editSim = [
        'id' => (int) ($_POST['id'] ?? 0),
        'title_zh' => $_POST['title_zh'] ?? '',
        'title_en' => $_POST['title_en'] ?? '',
        'slug' => $_POST['slug'] ?? '',
        'html' => $_POST['html'] ?? '',
        'screenshot_path' => $_POST['screenshot_path'] ?? '',
        'subject_id' => $_POST['subject_id'] ?? '',
        'topic_id' => $_POST['topic_id'] ?? '',
        'list_sort_order' => isset($_POST['list_sort_order']) && $_POST['list_sort_order'] !== '' ? (int) $_POST['list_sort_order'] : 0,
        'status' => $_POST['status'] ?? 'draft',
        '_tags' => array_filter(array_map('trim', preg_split('/[,，]/u', (string) ($_POST['tags'] ?? '')) ?: [])),
    ];
}

$subjects = sim_all_subjects($pdo);
$topicsBySubject = [];
foreach ($subjects as $s) {
    $topicsBySubject[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

$formAction = 'simulation_edit.php';
$isAdmin = false;
$allUsers = [];
$csrf = csrf_token();

?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $id ? '編輯' : '新增'; ?>模擬 | Science Sims</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <header class="bg-indigo-900 text-white shadow">
        <div class="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 class="font-bold text-lg"><?php echo $id ? '編輯模擬' : '新增模擬'; ?></h1>
            <a href="simulations.php" class="text-sm text-indigo-200 hover:text-white">返回列表</a>
        </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm mb-4"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php include dirname(__DIR__) . '/includes/simulation_form_fragment.php'; ?>
    </main>
</body>
</html>
