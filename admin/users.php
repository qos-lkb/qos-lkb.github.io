<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/user_admin.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/users.php'));

$pdo = db();
$acting = current_user();
assert($acting !== null);
$canImpersonate = auth_user_is_admin($pdo, (int) $acting['id']);

$flash = '';
if (isset($_GET['impersonate_stopped'])) {
    $flash = '已結束模仿模式，恢復為您的管理員身分。';
}
if (!empty($_GET['impersonate_error'])) {
    $flash = (string) $_GET['impersonate_error'];
}

$rows = $pdo->query(
    'SELECT u.id, u.email, u.name_zh, u.name_en, u.display_name, u.is_active,
            GROUP_CONCAT(r.id ORDER BY r.id SEPARATOR ",") AS role_ids,
            GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ", ") AS role_names
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id, u.email, u.name_zh, u.name_en, u.display_name, u.is_active
     ORDER BY u.id ASC'
)->fetchAll() ?: [];

$allRoles = admin_fetch_roles_with_permissions($pdo);
$roleOptions = [];
foreach ($allRoles as $role) {
    $roleOptions[] = [
        'id' => (int) $role['id'],
        'label' => admin_role_display_name((string) $role['name']),
        'slug' => (string) $role['name'],
    ];
}

admin_page_start('使用者', 'users', [
    'actions' => admin_btn('user_edit.php', '新增') . ' ' . admin_btn('courses.php', '課程管理', 'secondary'),
    'wide' => true,
]);
?>
        <?php if ($flash !== ''): ?>
            <p class="text-sm text-slate-700 mb-4"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php if ($canImpersonate): ?>
        <p class="text-sm text-slate-500 mb-3">管理員可點擊<strong>模仿</strong>以該使用者身分瀏覽前台；模仿期間頂部會顯示提示列，可隨時退回自己的身分。</p>
        <?php endif; ?>
        <p class="text-sm text-slate-500 mb-3">雙擊<strong>中文名</strong>、<strong>英文名</strong>或<strong>角色</strong>欄位可編輯；離開欄位後自動儲存（系統帳號除外）。</p>
        <p id="users-inline-flash" class="text-sm mb-3 hidden"></p>
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table id="users-table" class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <th class="p-3">ID</th>
                        <th class="p-3">電郵</th>
                        <th class="p-3">中文名</th>
                        <th class="p-3">英文名</th>
                        <th class="p-3">角色</th>
                        <th class="p-3">啟用</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rows as $r):
                        $isSystem = $r['email'] === 'system@science-sims.internal';
                        $roleDisplay = admin_format_role_names((string) ($r['role_names'] ?? ''));
                        $roleDisplay = $roleDisplay !== '' ? $roleDisplay : '—';
                        $roleIds = array_values(array_filter(array_map('intval', explode(',', (string) ($r['role_ids'] ?? '')))));
                        ?>
                    <tr class="border-t border-slate-100 users-row"
                        <?php if (!$isSystem): ?>
                        data-user-id="<?php echo (int) $r['id']; ?>"
                        data-name-zh="<?php echo htmlspecialchars((string) ($r['name_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>"
                        data-name-en="<?php echo htmlspecialchars((string) ($r['name_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>"
                        data-role-ids="<?php echo htmlspecialchars(implode(',', $roleIds), ENT_QUOTES, 'UTF-8'); ?>"
                        <?php endif; ?>>
                        <td class="p-3 users-cell-id"><?php echo (int) $r['id']; ?></td>
                        <td class="p-3 users-cell-email"><?php echo htmlspecialchars($r['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 users-cell-name-zh<?php echo $isSystem ? '' : ' users-cell-editable'; ?>"<?php echo $isSystem ? '' : ' title="雙擊編輯"'; ?>><?php echo htmlspecialchars((string) ($r['name_zh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 users-cell-name-en<?php echo $isSystem ? '' : ' users-cell-editable'; ?>"<?php echo $isSystem ? '' : ' title="雙擊編輯"'; ?>><?php echo htmlspecialchars((string) ($r['name_en'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 text-slate-600 users-cell-roles<?php echo $isSystem ? '' : ' users-cell-editable'; ?>"<?php echo $isSystem ? '' : ' title="雙擊編輯"'; ?>><?php echo htmlspecialchars($roleDisplay, ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 users-cell-active"><?php echo (int) $r['is_active'] ? '是' : '否'; ?></td>
                        <td class="p-3 whitespace-nowrap users-cell-actions">
                            <?php if (!$isSystem): ?>
                            <a href="user_edit.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline users-edit-link">編輯</a>
                            <?php if ($canImpersonate && (int) $r['id'] !== (int) $acting['id']): ?>
                            <button type="button" class="users-impersonate-btn text-amber-700 hover:underline ml-2" data-id="<?php echo (int) $r['id']; ?>" data-label="<?php echo htmlspecialchars((string) ($r['name_zh'] ?: $r['name_en'] ?: $r['email']), ENT_QUOTES, 'UTF-8'); ?>" title="以該使用者身分瀏覽前台">模仿</button>
                            <?php endif; ?>
                            <button type="button" class="users-delete-btn text-red-600 hover:underline ml-2" data-id="<?php echo (int) $r['id']; ?>">刪除</button>
                            <?php else: ?>
                            <span class="text-slate-400">—</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
<?php
$rolesJson = json_encode($roleOptions, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
admin_page_end([
    'scripts' => <<<HTML
<script src="../assets/js/admin-api.js"></script>
<script>
(async function () {
    const roleOptions = {$rolesJson};
    const table = document.getElementById('users-table');
    const flashEl = document.getElementById('users-inline-flash');
    /** @type {{cell:HTMLElement,row:HTMLElement,field:string,control:HTMLElement}|null} */
    let editing = null;
    let saving = false;

    function showFlash(msg, isError) {
        if (!flashEl) return;
        flashEl.textContent = msg;
        flashEl.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
        flashEl.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
    }

    try {
        await AdminApi.initSession();
    } catch (err) {
        showFlash(err.message || '無法初始化 API 工作階段', true);
        return;
    }

    function parseRoleIds(row) {
        return (row.dataset.roleIds || '').split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return n > 0; });
    }

    function roleLabelsFromIds(ids) {
        if (!ids.length) return '—';
        return roleOptions
            .filter(function (role) { return ids.indexOf(role.id) >= 0; })
            .map(function (role) { return role.label; })
            .join('、') || '—';
    }

    function roleIdsEqual(a, b) {
        if (a.length !== b.length) return false;
        const sa = a.slice().sort().join(',');
        const sb = b.slice().sort().join(',');
        return sa === sb;
    }

    function getRowValues(row) {
        return {
            nameZh: row.dataset.nameZh || '',
            nameEn: row.dataset.nameEn || '',
            roleIds: parseRoleIds(row),
        };
    }

    function readControlValue(field, control) {
        if (field === 'name_zh') return control.value.trim();
        if (field === 'name_en') return control.value.trim();
        return Array.from(control.selectedOptions).map(function (o) { return parseInt(o.value, 10); }).filter(function (n) { return n > 0; });
    }

    function restoreCellDisplay(cell, row, field) {
        const values = getRowValues(row);
        if (field === 'name_zh') cell.textContent = values.nameZh;
        else if (field === 'name_en') cell.textContent = values.nameEn;
        else cell.textContent = roleLabelsFromIds(values.roleIds);
        cell.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-200');
    }

    function cancelEdit() {
        if (!editing || saving) return;
        restoreCellDisplay(editing.cell, editing.row, editing.field);
        editing = null;
    }

    async function commitEdit() {
        if (!editing || saving) return;
        const cell = editing.cell;
        const row = editing.row;
        const field = editing.field;
        const control = editing.control;
        const before = getRowValues(row);
        const newValue = readControlValue(field, control);

        let nameZh = before.nameZh;
        let nameEn = before.nameEn;
        let roleIds = before.roleIds.slice();
        let changed = false;

        if (field === 'name_zh') {
            changed = newValue !== before.nameZh;
            nameZh = newValue;
        } else if (field === 'name_en') {
            changed = newValue !== before.nameEn;
            nameEn = newValue;
        } else {
            changed = !roleIdsEqual(newValue, before.roleIds);
            roleIds = newValue;
        }

        editing = null;

        if (!changed) {
            restoreCellDisplay(cell, row, field);
            return;
        }

        saving = true;
        try {
            const data = await AdminApi.apiFetch('/admin/users/' + row.dataset.userId + '/inline', {
                method: 'POST',
                body: { name_zh: nameZh, name_en: nameEn, roles: roleIds },
            });
            row.dataset.nameZh = data.name_zh || '';
            row.dataset.nameEn = data.name_en || '';
            row.dataset.roleIds = (data.role_ids || []).join(',');
            if (field === 'name_zh') cell.textContent = data.name_zh || '';
            else if (field === 'name_en') cell.textContent = data.name_en || '';
            else cell.textContent = data.role_names || '—';
            cell.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-200');
            showFlash('已更新使用者 #' + row.dataset.userId + '。', false);
        } catch (e) {
            showFlash(e.message || '儲存失敗，請重試。', true);
            restoreCellDisplay(cell, row, field);
        } finally {
            saving = false;
        }
    }

    function buildRoleSelect(selectedIds) {
        const select = document.createElement('select');
        select.className = 'users-inline-control w-full border rounded-lg px-2 py-1 text-sm bg-white';
        select.multiple = true;
        select.size = Math.min(4, Math.max(2, roleOptions.length));
        roleOptions.forEach(function (role) {
            const opt = document.createElement('option');
            opt.value = String(role.id);
            opt.textContent = role.label + ' (' + role.slug + ')';
            if (selectedIds.indexOf(role.id) >= 0) opt.selected = true;
            select.appendChild(opt);
        });
        return select;
    }

    async function startEdit(cell, field) {
        if (saving) return;
        if (editing && editing.cell === cell) return;
        if (editing) await commitEdit();
        if (saving) return;

        const row = cell.closest('tr.users-row');
        if (!row || !row.dataset.userId) return;

        const values = getRowValues(row);
        cell.classList.add('bg-indigo-50', 'ring-2', 'ring-indigo-200');
        cell.innerHTML = '';

        let control;
        if (field === 'name_zh' || field === 'name_en') {
            control = document.createElement('input');
            control.type = 'text';
            control.className = 'users-inline-control w-full border rounded-lg px-2 py-1 text-sm';
            control.maxLength = 120;
            control.value = field === 'name_zh' ? values.nameZh : values.nameEn;
            control.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    control.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    editing = { cell: cell, row: row, field: field, control: control };
                    cancelEdit();
                }
            });
            control.addEventListener('blur', function () {
                if (editing && editing.control === control) commitEdit();
            });
            cell.appendChild(control);
            control.focus();
            control.select();
        } else {
            control = buildRoleSelect(values.roleIds);
            control.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    editing = { cell: cell, row: row, field: field, control: control };
                    cancelEdit();
                }
            });
            control.addEventListener('blur', function () {
                if (editing && editing.control === control) commitEdit();
            });
            cell.appendChild(control);
            control.focus();
        }

        editing = { cell: cell, row: row, field: field, control: control };
    }

    table?.addEventListener('dblclick', function (e) {
        const cell = e.target.closest('.users-cell-editable');
        if (!cell || e.target.closest('input, select, option')) return;
        let field = '';
        if (cell.classList.contains('users-cell-name-zh')) field = 'name_zh';
        else if (cell.classList.contains('users-cell-name-en')) field = 'name_en';
        else if (cell.classList.contains('users-cell-roles')) field = 'roles';
        if (!field) return;
        void startEdit(cell, field);
    });

    document.querySelectorAll('.users-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const id = parseInt(btn.getAttribute('data-id') || '0', 10);
            if (!id || !confirm('確定刪除？')) return;
            try {
                await AdminApi.apiFetch('/admin/users', { method: 'DELETE', body: { id: id } });
                const row = btn.closest('tr');
                if (row) row.remove();
                showFlash('已刪除使用者。', false);
            } catch (err) {
                showFlash(err.message || '刪除失敗', true);
            }
        });
    });

    document.querySelectorAll('.users-impersonate-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const id = parseInt(btn.getAttribute('data-id') || '0', 10);
            const label = btn.getAttribute('data-label') || '';
            if (!id || !confirm('確定以「' + label + '」的身分瀏覽前台？')) return;
            try {
                await AdminApi.apiFetch('/admin/users/' + id + '/impersonate', { method: 'POST', body: {} });
                location.href = '../app/';
            } catch (err) {
                showFlash(err.message || '模仿失敗', true);
            }
        });
    });
})();
</script>
<style>
.users-cell-editable { cursor: cell; }
.users-cell-editable:hover { background: rgba(99, 102, 241, 0.06); }
</style>
HTML,
]);
?>
