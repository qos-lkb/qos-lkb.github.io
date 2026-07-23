<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/classes_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';

bootstrap_public();
require_permission('class.manage_own', '../login.php?next=' . rawurlencode('admin/courses.php'));

$pdo = db();
$user = current_user();
assert($user !== null);
$canAny = user_has_permission('class.manage_any');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'inline_update') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(classes_inline_update($pdo, $_POST, $user), JSON_UNESCAPED_UNICODE);
    exit;
}

$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'delete') {
        $r = classes_delete($pdo, $_POST, $user);
        $flash = $r['ok'] ? '已刪除課程。' : ($r['error'] ?? '刪除失敗');
    } elseif ($action === 'delete_bulk') {
        $r = classes_delete_many($pdo, $_POST, $user);
        $flash = $r['ok'] ? ($r['message'] ?? '已刪除所選課程。') : ($r['error'] ?? '刪除失敗');
    } elseif ($action === 'import_csv') {
        if (!verify_csrf($_POST['csrf'] ?? null)) {
            $flash = 'CSRF 驗證失敗。';
        } elseif (!classes_can_edit_students($pdo, $user)) {
            $flash = '只有管理員可以匯入班內學生。';
        } else {
            $classId = (int) ($_POST['class_id'] ?? 0);
            $csv = (string) ($_POST['csv_content'] ?? '');
            $r = classes_import_students_csv($pdo, $csv, $classId, $user);
            $flash = $r['ok']
                ? '已匯入，新建 ' . (int) ($r['created'] ?? 0) . ' 個帳戶。'
                : ($r['error'] ?? '匯入失敗');
        }
    }
}

$rows = classes_list_for_teacher($pdo, $user['id'], $canAny);
$canEditStudents = classes_can_edit_students($pdo, $user);
$teacherOptions = $canAny ? classes_teacher_options($pdo) : [];
$formLevelOptions = classes_form_level_options();
$courseSubjectOptions = classes_course_subject_options();
$hasFormSubjectCols = classes_has_form_subject_columns($pdo);
$csrf = csrf_token();

admin_page_start('課程管理', 'courses', [
    'actions' => (user_has_permission('worksheet.manage_own') || user_has_permission('worksheet.manage_any')
        ? admin_btn('worksheets.php', '工作紙設計', 'secondary') . admin_btn('worksheet_edit.php', '新增工作紙', 'secondary')
        : '') . admin_btn('course_edit.php', '新增課程'),
    'wide' => true,
]);
?>
        <?php if ($flash !== ''): ?>
            <p class="text-sm text-slate-700 mb-4"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></p>
        <?php endif; ?>
        <?php if (!$hasFormSubjectCols): ?>
            <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                資料庫尚未加入年級／科目欄位。請執行
                <code class="font-mono text-xs">schema_classes_form_subject.sql</code>
                後再編輯這兩欄。
            </div>
        <?php endif; ?>
        <p id="courses-inline-flash" class="text-sm mb-3 hidden"></p>

        <?php if ($rows !== []): ?>
        <form method="post" id="courses-bulk-form" class="mb-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="action" value="delete_bulk">
            <button type="submit" id="courses-bulk-delete-btn" disabled
                class="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed">
                刪除所選（<span id="courses-selected-count">0</span>）
            </button>
            <span class="text-xs text-slate-500">勾選課程後可一次刪除多門</span>
        </form>
        <?php endif; ?>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
            <table id="courses-table" class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                    <tr>
                        <?php if ($rows !== []): ?>
                        <th class="p-3 w-10">
                            <input type="checkbox" id="select-all-courses" class="rounded border-slate-300" title="全選" aria-label="全選">
                        </th>
                        <?php endif; ?>
                        <th class="p-3">課程</th>
                        <th class="p-3">年級</th>
                        <th class="p-3">科目</th>
                        <th class="p-3">學年</th>
                        <th class="p-3">任教老師</th>
                        <th class="p-3">學生人數</th>
                        <th class="p-3">邀請碼</th>
                        <th class="p-3">狀態</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rows as $r):
                        $flVal = isset($r['form_level']) && $r['form_level'] !== null && $r['form_level'] !== ''
                            ? (string) $r['form_level'] : '';
                        $csVal = isset($r['course_subject']) && $r['course_subject'] !== null && $r['course_subject'] !== ''
                            ? (string) $r['course_subject'] : '';
                        ?>
                    <tr class="border-t border-slate-100 courses-row"
                        data-course-id="<?php echo (int) $r['id']; ?>"
                        data-school-year="<?php echo htmlspecialchars((string) ($r['school_year'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>"
                        data-form-level="<?php echo htmlspecialchars($flVal, ENT_QUOTES, 'UTF-8'); ?>"
                        data-course-subject="<?php echo htmlspecialchars($csVal, ENT_QUOTES, 'UTF-8'); ?>"
                        data-teacher-id="<?php echo (int) ($r['teacher_user_id'] ?? 0); ?>"
                        data-teacher-name="<?php echo htmlspecialchars((string) ($r['teacher_name'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                        <td class="p-3 w-10">
                            <input type="checkbox" form="courses-bulk-form" name="ids[]" value="<?php echo (int) $r['id']; ?>"
                                class="course-checkbox rounded border-slate-300" aria-label="選取課程">
                        </td>
                        <td class="p-3 font-medium"><?php echo htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 courses-cell-form-level<?php echo $hasFormSubjectCols ? ' courses-cell-editable' : ''; ?>"
                            <?php echo $hasFormSubjectCols ? ' title="雙擊編輯"' : ''; ?>>
                            <?php echo htmlspecialchars(classes_form_level_label($flVal !== '' ? $flVal : null), ENT_QUOTES, 'UTF-8'); ?>
                        </td>
                        <td class="p-3 courses-cell-course-subject<?php echo $hasFormSubjectCols ? ' courses-cell-editable' : ''; ?>"
                            <?php echo $hasFormSubjectCols ? ' title="雙擊編輯"' : ''; ?>>
                            <?php echo htmlspecialchars(classes_course_subject_label($csVal !== '' ? $csVal : null), ENT_QUOTES, 'UTF-8'); ?>
                        </td>
                        <td class="p-3 courses-cell-school-year courses-cell-editable" title="雙擊編輯"><?php echo htmlspecialchars((string) ($r['school_year'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3 courses-cell-teacher<?php echo $canAny ? ' courses-cell-editable' : ''; ?>"<?php echo $canAny ? ' title="雙擊編輯"' : ''; ?>><?php echo htmlspecialchars((string) ($r['teacher_name'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo (int) ($r['student_count'] ?? 0); ?></td>
                        <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars((string) ($r['invite_code'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="p-3"><?php echo (int) $r['is_active'] ? '啟用' : '停用'; ?></td>
                        <td class="p-3 whitespace-nowrap">
                            <a href="course_edit.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline">編輯</a>
                            <a href="course_students.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline ml-2">學生</a>
                            <a href="course_reports.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline ml-2">報告</a>
                            <a href="course_summer_homework.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline ml-2">暑期功課</a>
                            <a href="course_worksheets.php?id=<?php echo (int) $r['id']; ?>" class="text-indigo-600 hover:underline ml-2">習作</a>
                            <form method="post" class="inline ml-2" onsubmit="return confirm('確定刪除此課程？學生選課紀錄將一併移除。');">
                                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="text-red-600 hover:underline">刪除</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if ($rows === []): ?>
                    <tr><td colspan="10" class="p-6 text-slate-500 text-center">尚無課程</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <?php if ($rows !== [] && $canEditStudents): ?>
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-800 mb-2">批次匯入學生（CSV）</h2>
            <p class="text-sm text-slate-500 mb-4">僅管理員可用。格式：email, name_zh, name_en, password, form_class, class_no, moi（moi 為 E 或 C；各欄可留空；姓名至少填一項）</p>
            <form method="post" class="space-y-4">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="action" value="import_csv">
                <div>
                    <label class="block text-sm font-medium text-slate-700">目標課程</label>
                    <select name="class_id" required class="mt-1 w-full border rounded-lg px-3 py-2">
                        <?php foreach ($rows as $r): ?>
                        <option value="<?php echo (int) $r['id']; ?>">
                            <?php
                            echo htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8');
                            $fl = classes_form_level_label(isset($r['form_level']) ? (string) $r['form_level'] : null);
                            $cs = classes_course_subject_label(isset($r['course_subject']) ? (string) $r['course_subject'] : null);
                            if ($fl !== '—' || $cs !== '—') {
                                echo '（' . htmlspecialchars($fl . ' · ' . $cs, ENT_QUOTES, 'UTF-8') . '）';
                            }
                            ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">CSV 內容</label>
                    <textarea name="csv_content" rows="6" required class="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm" placeholder="email,name_zh,name_en,password,form_class,class_no,moi&#10;student@example.com,陳小明,Chan Siu Ming,,6A,12,E"></textarea>
                </div>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">匯入</button>
            </form>
        </div>
        <?php endif; ?>
<?php
$teachersJson = json_encode($teacherOptions, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$formLevelJson = json_encode($formLevelOptions, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$courseSubjectJson = json_encode($courseSubjectOptions, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$csrfJson = json_encode($csrf, JSON_UNESCAPED_UNICODE);
$canAnyJson = $canAny ? 'true' : 'false';
$hasFormSubjectJson = $hasFormSubjectCols ? 'true' : 'false';
admin_page_end([
    'scripts' => <<<HTML
<script>
(function () {
    const csrf = {$csrfJson};
    const teacherOptions = {$teachersJson};
    const formLevelOptions = {$formLevelJson};
    const courseSubjectOptions = {$courseSubjectJson};
    const canAny = {$canAnyJson};
    const hasFormSubject = {$hasFormSubjectJson};
    const table = document.getElementById('courses-table');
    const flashEl = document.getElementById('courses-inline-flash');
    /** @type {{cell:HTMLElement,row:HTMLElement,field:string,control:HTMLElement}|null} */
    let editing = null;
    let saving = false;

    function showFlash(msg, isError) {
        if (!flashEl) return;
        flashEl.textContent = msg;
        flashEl.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
        flashEl.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
    }

    function getRowValues(row) {
        return {
            schoolYear: row.dataset.schoolYear || '',
            formLevel: row.dataset.formLevel || '',
            courseSubject: row.dataset.courseSubject || '',
            teacherId: parseInt(row.dataset.teacherId || '0', 10) || 0,
            teacherName: row.dataset.teacherName || '',
        };
    }

    function teacherLabelFromId(id) {
        const opt = teacherOptions.find(function (t) { return t.id === id; });
        return opt ? opt.label : '—';
    }

    function labelFromMap(map, value) {
        if (!value) return '—';
        return map[value] || value;
    }

    function restoreCellDisplay(cell, row, field) {
        const values = getRowValues(row);
        if (field === 'school_year') cell.textContent = values.schoolYear;
        else if (field === 'form_level') cell.textContent = labelFromMap(formLevelOptions, values.formLevel);
        else if (field === 'course_subject') cell.textContent = labelFromMap(courseSubjectOptions, values.courseSubject);
        else cell.textContent = values.teacherName || teacherLabelFromId(values.teacherId);
        cell.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-200');
    }

    function cancelEdit() {
        if (!editing || saving) return;
        restoreCellDisplay(editing.cell, editing.row, editing.field);
        editing = null;
    }

    function buildSelect(optionsMap, selectedValue) {
        const select = document.createElement('select');
        select.className = 'courses-inline-control w-full border rounded-lg px-2 py-1 text-sm bg-white';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '請選擇';
        select.appendChild(empty);
        Object.keys(optionsMap).forEach(function (key) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = optionsMap[key];
            if (key === selectedValue) opt.selected = true;
            select.appendChild(opt);
        });
        return select;
    }

    function buildTeacherSelect(selectedId) {
        const select = document.createElement('select');
        select.className = 'courses-inline-control w-full border rounded-lg px-2 py-1 text-sm bg-white';
        teacherOptions.forEach(function (teacher) {
            const opt = document.createElement('option');
            opt.value = String(teacher.id);
            opt.textContent = teacher.label;
            if (teacher.id === selectedId) opt.selected = true;
            select.appendChild(opt);
        });
        return select;
    }

    function bindSelectCommit(control, cell, row, field) {
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
        control.addEventListener('change', function () {
            if (editing && editing.control === control) control.blur();
        });
    }

    async function commitEdit() {
        if (!editing || saving) return;
        const cell = editing.cell;
        const row = editing.row;
        const field = editing.field;
        const control = editing.control;
        const before = getRowValues(row);

        let schoolYear = before.schoolYear;
        let formLevel = before.formLevel;
        let courseSubject = before.courseSubject;
        let teacherId = before.teacherId;
        let changed = false;

        if (field === 'school_year') {
            const newValue = control.value.trim();
            changed = newValue !== before.schoolYear;
            schoolYear = newValue;
        } else if (field === 'form_level') {
            const newValue = control.value;
            changed = newValue !== before.formLevel;
            formLevel = newValue;
        } else if (field === 'course_subject') {
            const newValue = control.value;
            changed = newValue !== before.courseSubject;
            courseSubject = newValue;
        } else {
            const newId = parseInt(control.value, 10) || 0;
            changed = newId !== before.teacherId;
            teacherId = newId;
        }

        editing = null;

        if (!changed) {
            restoreCellDisplay(cell, row, field);
            return;
        }

        saving = true;
        const body = new FormData();
        body.append('csrf', csrf);
        body.append('action', 'inline_update');
        body.append('field', field);
        body.append('id', row.dataset.courseId);
        body.append('school_year', schoolYear);
        body.append('form_level', formLevel);
        body.append('course_subject', courseSubject);
        body.append('teacher_user_id', String(teacherId));

        try {
            const res = await fetch('courses.php', { method: 'POST', body: body, credentials: 'same-origin' });
            const data = await res.json();
            if (!data.ok) {
                showFlash(data.error || '儲存失敗。', true);
                restoreCellDisplay(cell, row, field);
                saving = false;
                return;
            }
            row.dataset.schoolYear = data.school_year || '';
            row.dataset.formLevel = data.form_level || '';
            row.dataset.courseSubject = data.course_subject || '';
            row.dataset.teacherId = String(data.teacher_user_id || 0);
            row.dataset.teacherName = data.teacher_name || '';
            if (field === 'school_year') cell.textContent = data.school_year || '';
            else if (field === 'form_level') cell.textContent = data.form_level_label || '—';
            else if (field === 'course_subject') cell.textContent = data.course_subject_label || '—';
            else cell.textContent = data.teacher_name || '—';
            cell.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-200');
            showFlash('已更新課程 #' + row.dataset.courseId + '。', false);
        } catch (e) {
            showFlash('儲存失敗，請重試。', true);
            restoreCellDisplay(cell, row, field);
        } finally {
            saving = false;
        }
    }

    async function startEdit(cell, field) {
        if (saving) return;
        if (editing && editing.cell === cell) return;
        if (editing) await commitEdit();
        if (saving) return;

        const row = cell.closest('tr.courses-row');
        if (!row || !row.dataset.courseId) return;

        const values = getRowValues(row);
        cell.classList.add('bg-indigo-50', 'ring-2', 'ring-indigo-200');
        cell.innerHTML = '';

        let control;
        if (field === 'school_year') {
            control = document.createElement('input');
            control.type = 'text';
            control.className = 'courses-inline-control w-full border rounded-lg px-2 py-1 text-sm';
            control.maxLength = 32;
            control.value = values.schoolYear;
            control.placeholder = '2025-2026';
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
        } else if (field === 'form_level') {
            control = buildSelect(formLevelOptions, values.formLevel);
            bindSelectCommit(control, cell, row, field);
            cell.appendChild(control);
            control.focus();
        } else if (field === 'course_subject') {
            control = buildSelect(courseSubjectOptions, values.courseSubject);
            bindSelectCommit(control, cell, row, field);
            cell.appendChild(control);
            control.focus();
        } else {
            control = buildTeacherSelect(values.teacherId);
            bindSelectCommit(control, cell, row, field);
            cell.appendChild(control);
            control.focus();
        }

        editing = { cell: cell, row: row, field: field, control: control };
    }

    table?.addEventListener('dblclick', function (e) {
        const cell = e.target.closest('.courses-cell-editable');
        if (!cell || e.target.closest('input, select, option, a, button, form')) return;
        let field = '';
        if (cell.classList.contains('courses-cell-school-year')) field = 'school_year';
        else if (cell.classList.contains('courses-cell-form-level') && hasFormSubject) field = 'form_level';
        else if (cell.classList.contains('courses-cell-course-subject') && hasFormSubject) field = 'course_subject';
        else if (cell.classList.contains('courses-cell-teacher') && canAny) field = 'teacher';
        if (!field) return;
        void startEdit(cell, field);
    });

    const bulkForm = document.getElementById('courses-bulk-form');
    const bulkBtn = document.getElementById('courses-bulk-delete-btn');
    const selectedCountEl = document.getElementById('courses-selected-count');
    const selectAll = document.getElementById('select-all-courses');
    const rowBoxes = document.querySelectorAll('.course-checkbox');

    function updateBulkSelection() {
        const checked = document.querySelectorAll('.course-checkbox:checked');
        const n = checked.length;
        if (selectedCountEl) selectedCountEl.textContent = String(n);
        if (bulkBtn) bulkBtn.disabled = n === 0;
        if (selectAll && rowBoxes.length) {
            selectAll.checked = n > 0 && n === rowBoxes.length;
            selectAll.indeterminate = n > 0 && n < rowBoxes.length;
        }
    }

    rowBoxes.forEach(function (cb) {
        cb.addEventListener('change', updateBulkSelection);
    });
    selectAll?.addEventListener('change', function () {
        rowBoxes.forEach(function (cb) { cb.checked = selectAll.checked; });
        updateBulkSelection();
    });
    bulkForm?.addEventListener('submit', function (e) {
        const n = document.querySelectorAll('.course-checkbox:checked').length;
        if (n === 0) {
            e.preventDefault();
            return;
        }
        if (!confirm('確定刪除所選 ' + n + ' 門課程？學生選課紀錄將一併移除。')) {
            e.preventDefault();
        }
    });
})();
</script>
<style>
.courses-cell-editable { cursor: cell; }
.courses-cell-editable:hover { background: rgba(99, 102, 241, 0.06); }
</style>
HTML,
]);
?>
