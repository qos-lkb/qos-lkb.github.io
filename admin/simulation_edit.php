<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/simulations_lib.php';
require_once dirname(__DIR__) . '/includes/simulation_save.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('simulation.manage_any', '../login.php?next=' . rawurlencode('admin/simulation_edit.php'));

$pdo = db();
$u = current_user();
assert($u !== null);

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$editSim = null;
if ($id > 0) {
    $editSim = sim_get_by_id($pdo, $id);
    if (!$editSim) {
        http_response_code(404);
        exit;
    }
    $editSim['_tags'] = sim_get_tag_slugs($pdo, $id);
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $res = simulation_save_from_request($pdo, $u, $_POST, true);
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
        'owner_user_id' => $_POST['owner_user_id'] ?? $u['id'],
        '_tags' => array_filter(array_map('trim', preg_split('/[,，]/u', (string) ($_POST['tags'] ?? '')) ?: [])),
    ];
}

$subjects = sim_all_subjects($pdo);
$topicsBySubject = [];
foreach ($subjects as $s) {
    $topicsBySubject[(int) $s['id']] = sim_topics_for_subject($pdo, (int) $s['id']);
}

$allUsers = $pdo->query('SELECT id, email, display_name FROM users ORDER BY email ASC')->fetchAll() ?: [];
if (!$editSim) {
    $editSim = [
        'owner_user_id' => $u['id'],
        'status' => 'draft',
    ];
}

$formAction = 'simulation_edit.php';
$isAdmin = true;
$csrf = csrf_token();

admin_page_start($id ? '編輯模擬' : '新增模擬', 'simulations', [
    'actions' => admin_btn('simulations.php', '返回列表', 'secondary'),
]);
?>
        <?php if ($error !== ''): ?>
            <p class="text-red-600 text-sm"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php include dirname(__DIR__) . '/includes/simulation_form_fragment.php'; ?>
<?php
admin_page_end();
