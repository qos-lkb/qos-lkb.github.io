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

$formAction = '#';
$isAdmin = true;
$csrf = csrf_token();

admin_page_start($id ? '編輯模擬' : '新增模擬', 'simulations', [
    'actions' => admin_btn('simulations.php', '返回列表', 'secondary'),
]);
?>
        <p id="flash" class="text-red-600 text-sm hidden mb-3"></p>
        <?php include dirname(__DIR__) . '/includes/simulation_form_fragment.php'; ?>
<?php
$editIdJs = (int) $id;
admin_page_end([
    'scripts' => <<<HTML
<script src="../assets/js/admin-api.js"></script>
<script>
(async function () {
    const flash = document.getElementById('flash');
    const form = document.querySelector('form');
    if (!form) return;
    try {
        await AdminApi.initSession();
    } catch (err) {
        if (flash) {
            flash.textContent = err.message || '無法初始化 API 工作階段';
            flash.classList.remove('hidden');
        }
        return;
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {};
        fd.forEach((value, key) => {
            if (key === 'csrf') return;
            payload[key] = value;
        });
        payload.id = {$editIdJs} || parseInt(payload.id || '0', 10) || 0;
        if (flash) {
            flash.classList.add('hidden');
            flash.textContent = '';
        }
        try {
            await AdminApi.apiFetch('/admin/simulations', { method: 'POST', body: payload });
            location.href = 'simulations.php';
        } catch (err) {
            if (flash) {
                flash.textContent = err.message || '儲存失敗';
                flash.classList.remove('hidden');
            }
        }
    });
})();
</script>
HTML,
]);
