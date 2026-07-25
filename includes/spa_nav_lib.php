<?php

declare(strict_types=1);

/**
 * SPA top navigation visibility by audience (guest / student / teacher / admin).
 */

/**
 * @return list<array{key:string,label_zh:string,label_en:string}>
 */
function spa_nav_item_defs(): array
{
    return [
        ['key' => 'courses', 'label_zh' => '自學課程', 'label_en' => 'Self-study'],
        ['key' => 'notes', 'label_zh' => '課程及學習筆記', 'label_en' => 'Courses & Notes'],
        ['key' => 'worksheets', 'label_zh' => '工作紙', 'label_en' => 'Worksheets'],
        ['key' => 'videos', 'label_zh' => '學習影片', 'label_en' => 'Videos'],
        ['key' => 'simulations', 'label_zh' => '模擬程式', 'label_en' => 'Simulations'],
        ['key' => 'articles', 'label_zh' => '科學文章', 'label_en' => 'Science Articles'],
        ['key' => 'learning', 'label_zh' => '互動學習工具', 'label_en' => 'Interactive Tools'],
        ['key' => 'summer', 'label_zh' => '暑期功課', 'label_en' => 'Summer HW'],
    ];
}

/**
 * @return list<array{key:string,label_zh:string,label_en:string}>
 */
function spa_nav_audience_defs(): array
{
    return [
        ['key' => 'guest', 'label_zh' => '訪客（未登入）', 'label_en' => 'Guest'],
        ['key' => 'student', 'label_zh' => '學生', 'label_en' => 'Student'],
        ['key' => 'teacher', 'label_zh' => '教師', 'label_en' => 'Teacher'],
        ['key' => 'admin', 'label_zh' => '管理員', 'label_en' => 'Admin'],
    ];
}

/**
 * @return list<string>
 */
function spa_nav_item_keys(): array
{
    return array_column(spa_nav_item_defs(), 'key');
}

/**
 * @return list<string>
 */
function spa_nav_audience_keys(): array
{
    return array_column(spa_nav_audience_defs(), 'key');
}

function spa_nav_table_exists(PDO $pdo): bool
{
    try {
        $pdo->query('SELECT 1 FROM spa_nav_visibility LIMIT 1');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Ensure every item × audience row exists (default visible).
 */
function spa_nav_ensure_defaults(PDO $pdo): void
{
    if (!spa_nav_table_exists($pdo)) {
        return;
    }
    $ins = $pdo->prepare(
        'INSERT IGNORE INTO spa_nav_visibility (item_key, audience, is_visible) VALUES (?, ?, 1)'
    );
    foreach (spa_nav_item_keys() as $item) {
        foreach (spa_nav_audience_keys() as $audience) {
            $ins->execute([$item, $audience]);
        }
    }
}

/**
 * @return array<string, array<string, bool>> item_key => audience => visible
 */
function spa_nav_get_matrix(PDO $pdo): array
{
    $matrix = [];
    foreach (spa_nav_item_keys() as $item) {
        $matrix[$item] = [];
        foreach (spa_nav_audience_keys() as $audience) {
            $matrix[$item][$audience] = true;
        }
    }

    if (!spa_nav_table_exists($pdo)) {
        return $matrix;
    }

    spa_nav_ensure_defaults($pdo);
    $stmt = $pdo->query('SELECT item_key, audience, is_visible FROM spa_nav_visibility');
    if (!$stmt) {
        return $matrix;
    }
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $item = (string) ($row['item_key'] ?? '');
        $audience = (string) ($row['audience'] ?? '');
        if (!isset($matrix[$item]) || !array_key_exists($audience, $matrix[$item])) {
            continue;
        }
        $matrix[$item][$audience] = (int) ($row['is_visible'] ?? 1) === 1;
    }
    return $matrix;
}

/**
 * @param array<string, array<string, mixed>> $posted  e.g. $_POST['vis'][item][audience] = '1'
 * @return array{ok:bool,error?:string}
 */
function spa_nav_save_matrix(PDO $pdo, array $posted): array
{
    if (!spa_nav_table_exists($pdo)) {
        return ['ok' => false, 'error' => '資料表尚未建立，請先執行 schema_upgrade_all.sql。'];
    }

    spa_nav_ensure_defaults($pdo);
    $upd = $pdo->prepare(
        'UPDATE spa_nav_visibility SET is_visible = ? WHERE item_key = ? AND audience = ?'
    );

    try {
        $pdo->beginTransaction();
        foreach (spa_nav_item_keys() as $item) {
            foreach (spa_nav_audience_keys() as $audience) {
                $on = !empty($posted[$item][$audience]);
                $upd->execute([$on ? 1 : 0, $item, $audience]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '儲存失敗：' . $e->getMessage()];
    }

    return ['ok' => true];
}

/**
 * Map session user roles to nav audiences.
 *
 * @param array<string, mixed>|null $user
 * @return list<string>
 */
function spa_nav_audiences_for_user(?array $user): array
{
    if ($user === null) {
        return ['guest'];
    }

    $roles = [];
    if (isset($user['roles']) && is_array($user['roles'])) {
        foreach ($user['roles'] as $r) {
            $roles[] = strtolower(trim((string) $r));
        }
    }

    $audiences = [];
    if (in_array('admin', $roles, true)) {
        $audiences[] = 'admin';
    }
    if (in_array('teacher', $roles, true) || in_array('user', $roles, true)) {
        $audiences[] = 'teacher';
    }
    if (in_array('student', $roles, true)) {
        $audiences[] = 'student';
    }

    if ($audiences === []) {
        // Logged-in but no standard role — treat as student for menu purposes.
        $audiences[] = 'student';
    }

    return $audiences;
}

/**
 * Visible nav item keys for the current audiences (OR across roles).
 *
 * @param array<string, mixed>|null $user
 * @return list<string>
 */
function spa_nav_visible_keys(PDO $pdo, ?array $user): array
{
    $matrix = spa_nav_get_matrix($pdo);
    $audiences = spa_nav_audiences_for_user($user);
    $visible = [];
    foreach (spa_nav_item_keys() as $item) {
        foreach ($audiences as $audience) {
            if (!empty($matrix[$item][$audience])) {
                $visible[] = $item;
                break;
            }
        }
    }
    return $visible;
}

/**
 * @param array<string, mixed>|null $user
 * @return array{audience:list<string>,items:array<string,bool>}
 */
function spa_nav_public_payload(PDO $pdo, ?array $user): array
{
    $keys = spa_nav_visible_keys($pdo, $user);
    $set = array_fill_keys($keys, true);
    $items = [];
    foreach (spa_nav_item_keys() as $item) {
        $items[$item] = isset($set[$item]);
    }
    return [
        'audience' => spa_nav_audiences_for_user($user),
        'items' => $items,
    ];
}
