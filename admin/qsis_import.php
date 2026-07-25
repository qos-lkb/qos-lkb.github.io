<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/qsis_import_lib.php';
require_once dirname(__DIR__) . '/includes/admin_layout.php';
require_once dirname(__DIR__) . '/includes/user_names_lib.php';

bootstrap_public();
require_permission('user.manage', '../login.php?next=' . rawurlencode('admin/qsis_import.php'));

$pdo = db();
$user = current_user();
assert($user !== null);

$qsisConfigured = qsis_is_configured();
$connection = $qsisConfigured ? qsis_test_connection() : ['ok' => false, 'error' => '尚未設定 QSIS 資料庫。'];

$years = [];
$klas = [];
$courses = [];
$previewStudents = [];
$courseNameById = [];
$selectedYearId = '';
$selectedKlaId = 0;

if ($connection['ok']) {
    try {
        $qsis = qsis_db();
        $years = qsis_list_years($qsis);
        $klas = qsis_list_klas($qsis);
        $selectedYearId = trim((string) ($_GET['year_id'] ?? ''));
        if ($selectedYearId === '') {
            $selectedYearId = qsis_current_year_id($qsis) ?? ($years[0]['yearId'] ?? '');
        }
        $selectedKlaId = (int) ($_GET['kla_id'] ?? 0);
        if ($selectedYearId !== '') {
            $courses = qsis_list_courses(
                $qsis,
                $selectedYearId,
                $selectedKlaId > 0 ? $selectedKlaId : null
            );
            foreach ($courses as $courseRow) {
                $courseNameById[(int) $courseRow['course_id']] = qsis_course_display_name($courseRow);
            }
            if ($courses !== []) {
                $courseIds = array_map(static fn (array $row): int => (int) $row['course_id'], $courses);
                $previewStudents = qsis_list_students($qsis, $selectedYearId, $courseIds);
            }
        }
    } catch (Throwable $e) {
        $connection = ['ok' => false, 'error' => $e->getMessage()];
    }
}

$teachers = $pdo->query(
    "SELECT DISTINCT u.id, u.display_name, u.name_zh, u.name_en, u.email FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE r.name IN ('teacher', 'admin') AND u.is_active = 1
     ORDER BY u.display_name ASC"
)->fetchAll() ?: [];

admin_page_start('QSIS 匯入', 'qsis_import', ['wide' => true]);
?>
        <p id="qsis-flash" class="text-sm mb-4 hidden"></p>

        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <h2 class="text-lg font-bold text-slate-800 mb-2">QSIS 資料庫連線</h2>
            <?php if (!$qsisConfigured): ?>
                <p class="text-sm text-amber-700 mb-2">請在專案根目錄 <code class="text-xs bg-slate-100 px-1 rounded">.env</code> 設定 <code class="text-xs bg-slate-100 px-1 rounded">QSIS_DB_*</code> 變數（見 <code class="text-xs bg-slate-100 px-1 rounded">.env.example</code>）。</p>
            <?php elseif ($connection['ok']): ?>
                <p class="text-sm text-emerald-700">已連線至 QSIS 資料庫 <strong><?php echo htmlspecialchars((string) ($connection['database'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></strong>。</p>
            <?php else: ?>
                <p class="text-sm text-red-600">連線失敗：<?php echo htmlspecialchars((string) ($connection['error'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></p>
            <?php endif; ?>
            <p class="text-xs text-slate-500 mt-2">此連線為<strong>唯讀</strong>用途，從 QSIS 讀取課程與選課學生資料。</p>
        </div>

        <?php if ($connection['ok']): ?>
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <h2 class="text-lg font-bold text-slate-800 mb-4">匯入設定</h2>
            <form method="get" class="mb-4 grid sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700">QSIS 學年</label>
                    <select name="year_id" class="mt-1 w-full border rounded-lg px-3 py-2" onchange="this.form.submit()">
                        <?php foreach ($years as $year): ?>
                        <option value="<?php echo htmlspecialchars($year['yearId'], ENT_QUOTES, 'UTF-8'); ?>"
                            <?php echo $selectedYearId === $year['yearId'] ? 'selected' : ''; ?>>
                            <?php
                            $label = $year['yearText'] !== ''
                                ? $year['yearText']
                                : ($year['yearFrom'] . '-' . $year['yearEnd']);
                            if ($year['thisYear']) {
                                $label .= '（本學年）';
                            }
                            echo htmlspecialchars($label . ' [' . $year['yearId'] . ']', ENT_QUOTES, 'UTF-8');
                            ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700">學習領域（KLA）</label>
                    <select name="kla_id" class="mt-1 w-full border rounded-lg px-3 py-2" onchange="this.form.submit()">
                        <option value="0" <?php echo $selectedKlaId <= 0 ? 'selected' : ''; ?>>全部 KLA</option>
                        <?php foreach ($klas as $kla): ?>
                        <option value="<?php echo (int) $kla['kla_id']; ?>" <?php echo $selectedKlaId === (int) $kla['kla_id'] ? 'selected' : ''; ?>>
                            <?php
                            $klaLabel = qsis_kla_display_name($kla);
                            if ($kla['kla_code'] !== '' && $klaLabel !== $kla['kla_code']) {
                                $klaLabel .= ' [' . $kla['kla_code'] . ']';
                            }
                            echo htmlspecialchars($klaLabel, ENT_QUOTES, 'UTF-8');
                            ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </form>

            <form id="qsis-import-form" class="space-y-4">
            <input type="hidden" name="year_id" value="<?php echo htmlspecialchars($selectedYearId, ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="kla_id" value="<?php echo (int) $selectedKlaId; ?>">
                <div>
                    <label class="block text-sm font-medium text-slate-700">預設任教老師（無法對應 QSIS 教師代碼時）</label>
                    <select name="teacher_user_id" class="mt-1 w-full border rounded-lg px-3 py-2">
                        <?php foreach ($teachers as $t): ?>
                        <option value="<?php echo (int) $t['id']; ?>" <?php echo (int) $t['id'] === (int) $user['id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars(user_format_name($t) . ' (' . $t['email'] . ')', ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <p class="text-xs text-slate-500 mt-3">
                    學生登入帳戶與 QSIS 一致：僅<strong>學號</strong>（例如 <code class="bg-slate-100 px-1 rounded">s20171060</code>），不使用 <code class="bg-slate-100 px-1 rounded">@qos.edu.hk</code>。
                    密碼僅以 QSIS 驗證，本站不產生／不儲存密碼。
                    （可在 .env 設定 <code class="bg-slate-100 px-1 rounded">QSIS_STUDENT_EMAIL_DOMAIN</code>）
                </p>

            <div class="mt-6 pt-6 border-t border-slate-100">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 class="text-lg font-bold text-slate-800">QSIS 課程預覽</h2>
                    <label class="text-sm text-slate-600">
                        <input type="checkbox" id="select-all-courses" class="mr-1" checked> 全選
                    </label>
                </div>
                <?php if ($courses === []): ?>
                    <p class="text-sm text-slate-500"><?php echo $selectedKlaId > 0 ? '此學年與 KLA 沒有含在學學生的課程資料。' : '此學年沒有含在學學生的課程資料。'; ?></p>
                <?php else: ?>
                <div class="overflow-x-auto mb-4">
                    <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-left">
                            <tr>
                                <th class="p-3 w-10"></th>
                                <th class="p-3">課程編號</th>
                                <th class="p-3">課程名稱</th>
                                <th class="p-3">KLA</th>
                                <th class="p-3">科目</th>
                                <th class="p-3">級別</th>
                                <th class="p-3">學生人數</th>
                                <th class="p-3">任教老師</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($courses as $courseRow):
                                $displayName = qsis_course_display_name($courseRow);
                                ?>
                            <tr class="border-t border-slate-100">
                                <td class="p-3">
                                    <input type="checkbox" name="course_ids[]" value="<?php echo (int) $courseRow['course_id']; ?>" class="course-checkbox" checked>
                                </td>
                                <td class="p-3 font-mono text-xs"><?php echo (int) $courseRow['course_id']; ?></td>
                                <td class="p-3 font-medium">
                                    <?php echo htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8'); ?>
                                    <?php if ($courseRow['course_code'] !== ''): ?>
                                    <span class="text-xs text-slate-400 block"><?php echo htmlspecialchars((string) $courseRow['course_code'], ENT_QUOTES, 'UTF-8'); ?></span>
                                    <?php endif; ?>
                                </td>
                                <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars((string) ($courseRow['kla_name'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                                <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars((string) $courseRow['subject_id'], ENT_QUOTES, 'UTF-8'); ?></td>
                                <td class="p-3"><?php echo (int) $courseRow['level']; ?></td>
                                <td class="p-3"><?php echo (int) $courseRow['student_count']; ?></td>
                                <td class="p-3 font-mono text-xs"><?php echo htmlspecialchars((string) ($courseRow['teacher_id'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>

                <?php if ($previewStudents !== []): ?>
                <div class="mt-6 mb-4">
                    <h3 class="text-base font-bold text-slate-800 mb-2">學生預覽（<?php echo count($previewStudents); ?> 人次）</h3>
                    <p class="text-xs text-slate-500 mb-3">匯入學生時會一併寫入班別、班號及 MOI（<strong>E</strong>=英文應考、<strong>C</strong>=中文應考；資料來自 QSIS <code class="bg-slate-100 px-1 rounded">v2_enrolment_record.moi</code>）。</p>
                    <div class="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-100 text-left sticky top-0">
                                <tr>
                                    <th class="p-2">學號</th>
                                    <th class="p-2">中文名</th>
                                    <th class="p-2">英文名</th>
                                    <th class="p-2">課程</th>
                                    <th class="p-2">班別</th>
                                    <th class="p-2">班號</th>
                                    <th class="p-2">MOI</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($previewStudents as $studentRow):
                                    $courseId = (int) ($studentRow['course_id'] ?? 0);
                                    $courseLabel = $courseNameById[$courseId] ?? ('#' . $courseId);
                                    $moi = $studentRow['moi'] ?? null;
                                    ?>
                                <tr class="border-t border-slate-100">
                                    <td class="p-2 font-mono text-xs"><?php echo htmlspecialchars((string) $studentRow['sid'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td class="p-2"><?php echo htmlspecialchars((string) ($studentRow['nameChi'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td class="p-2"><?php echo htmlspecialchars((string) ($studentRow['nameEng'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td class="p-2"><?php echo htmlspecialchars($courseLabel, ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td class="p-2"><?php echo htmlspecialchars((string) ($studentRow['class'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td class="p-2"><?php echo (int) ($studentRow['classNo'] ?? 0) > 0 ? (int) $studentRow['classNo'] : '—'; ?></td>
                                    <td class="p-2 font-mono text-xs"><?php echo $moi ? htmlspecialchars($moi, ENT_QUOTES, 'UTF-8') : '—'; ?></td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
                <?php endif; ?>

                <div class="flex flex-wrap gap-3 items-center">
                    <button type="button" data-mode="all" class="qsis-import-btn bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">
                        一鍵匯入課程＋學生
                    </button>
                    <button type="button" data-mode="courses" class="qsis-import-btn bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800">
                        只匯入課程
                    </button>
                    <button type="button" data-mode="students" class="qsis-import-btn bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
                        只匯入學生
                    </button>
                </div>

                <div class="mt-4 space-y-2 text-sm text-slate-600">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="enroll" value="1" checked>
                        匯入學生時自動加入對應本地課程（須先匯入或已存在同名課程）
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="update_existing" value="1">
                        更新已存在學生的中英文名（依 QSIS 資料）
                    </label>
                    <p class="text-xs text-slate-500 pl-6">重新匯入時亦會更新已選課學生的班別、班號與 MOI。</p>
                </div>
            </div>
            </form>
        </div>
        <?php endif; ?>

        <div class="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
            <h3 class="font-semibold text-slate-800 mb-2">說明</h3>
            <ul class="list-disc pl-5 space-y-1">
                <li>課程資料來自 QSIS <code class="text-xs bg-white px-1 rounded">v2_course_record</code>，並依科目／課程的 <code class="text-xs bg-white px-1 rounded">kla_id</code> 對應 <code class="text-xs bg-white px-1 rounded">v2_kla_record</code> 篩選學習領域。</li>
                <li>學生名單來自 <code class="text-xs bg-white px-1 rounded">v2_enrolment_record</code>（角色 S）；每位學生的 <code class="text-xs bg-white px-1 rounded">moi</code>（E/C）會寫入本地選課紀錄。</li>
                <li>匯入後在本系統建立對應「課程」條目（名稱為課程中文／英文名稱），學年取自 QSIS <code class="text-xs bg-white px-1 rounded">setting_year</code>。</li>
                <li>任教老師會嘗試以 QSIS <code class="text-xs bg-white px-1 rounded">teacher1_id</code> 對應本地教師帳戶；對應失敗則使用上方「預設任教老師」。</li>
                <li>已存在同名同學年課程或同電郵／學號學生會略過，不會覆寫密碼。</li>
                <li>匯入後可至 <a href="courses.php" class="text-indigo-600 underline">課程管理</a> 檢視邀請碼與名單。</li>
            </ul>
        </div>
<?php
admin_page_end([
    'scripts' => <<<'HTML'
<script src="../assets/js/admin-api.js"></script>
<script>
(async function () {
    var master = document.getElementById('select-all-courses');
    var boxes = document.querySelectorAll('.course-checkbox');
    if (master && boxes.length) {
        master.addEventListener('change', function () {
            boxes.forEach(function (cb) { cb.checked = master.checked; });
        });
    }

    const form = document.getElementById('qsis-import-form');
    const flash = document.getElementById('qsis-flash');
    function showFlash(msg, isError) {
        if (!flash) return;
        flash.textContent = msg;
        flash.classList.remove('hidden', 'text-emerald-700', 'text-red-600');
        flash.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
    }
    if (!form) return;
    try {
        await AdminApi.initSession();
    } catch (err) {
        showFlash(err.message || '無法初始化 API 工作階段', true);
        return;
    }

    document.querySelectorAll('.qsis-import-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const mode = btn.getAttribute('data-mode') || 'all';
            const courseIds = Array.from(form.querySelectorAll('.course-checkbox:checked')).map((el) => parseInt(el.value, 10)).filter((n) => n > 0);
            if (!courseIds.length) {
                showFlash('請至少勾選一門課程。', true);
                return;
            }
            const payload = {
                mode: mode,
                year_id: form.year_id.value,
                course_ids: courseIds,
                teacher_user_id: parseInt(form.teacher_user_id.value, 10) || 0,
                enroll: !!(form.enroll && form.enroll.checked),
                update_existing: !!(form.update_existing && form.update_existing.checked),
            };
            btn.disabled = true;
            try {
                const data = await AdminApi.apiFetch('/admin/qsis/import', { method: 'POST', body: payload });
                let msg = '匯入完成。';
                if (mode === 'courses') {
                    msg = '課程匯入完成：新建 ' + (data.created || 0) + '、略過 ' + (data.skipped || 0) + '（已存在）。';
                } else if (mode === 'students') {
                    msg = '學生匯入完成：新建 ' + (data.created || 0) + '、更新 ' + (data.updated || 0)
                        + '、略過 ' + (data.skipped || 0) + '；加入課程 ' + (data.enrolled || 0) + ' 人次。';
                } else {
                    msg = '一鍵匯入完成：課程新建 ' + (data.courses_created || 0) + '（略過 ' + (data.courses_skipped || 0)
                        + '）；學生新建 ' + (data.students_created || 0) + '、更新 ' + (data.students_updated || 0)
                        + '、略過 ' + (data.students_skipped || 0) + '、加入課程 ' + (data.students_enrolled || 0) + ' 人次。';
                }
                showFlash(msg, false);
            } catch (err) {
                showFlash(err.message || '匯入失敗', true);
            } finally {
                btn.disabled = false;
            }
        });
    });
})();
</script>
HTML,
]);
?>
