<?php

declare(strict_types=1);

/**
 * SPA top navigation visibility and display order by audience.
 */

/**
 * Canonical item definitions (labels). Display order comes from spa_nav_order when available.
 *
 * @return list<array{key:string,label_zh:string,label_en:string}>
 */
function spa_nav_item_defs(): array
{
    return [
        ['key' => 'summer', 'label_zh' => '暑期功課', 'label_en' => 'Summer HW'],
        ['key' => 'courses', 'label_zh' => '自學課程', 'label_en' => 'Self-study'],
        ['key' => 'notes', 'label_zh' => '課程及學習筆記', 'label_en' => 'Courses & Notes'],
        ['key' => 'worksheets', 'label_zh' => '工作紙', 'label_en' => 'Worksheets'],
        ['key' => 'videos', 'label_zh' => '學習影片', 'label_en' => 'Videos'],
        ['key' => 'simulations', 'label_zh' => '模擬程式', 'label_en' => 'Simulations'],
        ['key' => 'articles', 'label_zh' => '科學文章', 'label_en' => 'Science Articles'],
        ['key' => 'learning', 'label_zh' => '互動學習工具', 'label_en' => 'Interactive Tools'],
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

function spa_nav_order_table_exists(PDO $pdo): bool
{
    try {
        $pdo->query('SELECT 1 FROM spa_nav_order LIMIT 1');
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
 * Ensure every known item has a sort_order row (append at end if missing).
 */
function spa_nav_ensure_order_defaults(PDO $pdo): void
{
    if (!spa_nav_order_table_exists($pdo)) {
        return;
    }
    $existing = [];
    $stmt = $pdo->query('SELECT item_key FROM spa_nav_order');
    if ($stmt) {
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) ?: [] as $k) {
            $existing[(string) $k] = true;
        }
    }
    $maxStmt = $pdo->query('SELECT COALESCE(MAX(sort_order), -1) FROM spa_nav_order');
    $next = (int) ($maxStmt ? $maxStmt->fetchColumn() : -1) + 1;
    $ins = $pdo->prepare('INSERT INTO spa_nav_order (item_key, sort_order) VALUES (?, ?)');
    foreach (spa_nav_item_keys() as $item) {
        if (isset($existing[$item])) {
            continue;
        }
        $ins->execute([$item, $next]);
        $next++;
    }
}

/**
 * Ordered item keys (all known items). Falls back to spa_nav_item_defs order.
 *
 * @return list<string>
 */
function spa_nav_ordered_keys(PDO $pdo): array
{
    $defaults = spa_nav_item_keys();
    if (!spa_nav_order_table_exists($pdo)) {
        return $defaults;
    }
    spa_nav_ensure_order_defaults($pdo);
    $stmt = $pdo->query(
        'SELECT item_key FROM spa_nav_order ORDER BY sort_order ASC, item_key ASC'
    );
    if (!$stmt) {
        return $defaults;
    }
    $known = array_fill_keys($defaults, true);
    $ordered = [];
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) ?: [] as $key) {
        $key = (string) $key;
        if (isset($known[$key])) {
            $ordered[] = $key;
            unset($known[$key]);
        }
    }
    foreach (array_keys($known) as $key) {
        $ordered[] = $key;
    }
    return $ordered;
}

/**
 * Item defs sorted by spa_nav_order.
 *
 * @return list<array{key:string,label_zh:string,label_en:string,sort_order:int}>
 */
function spa_nav_ordered_item_defs(PDO $pdo): array
{
    $byKey = [];
    foreach (spa_nav_item_defs() as $i => $def) {
        $byKey[$def['key']] = $def + ['sort_order' => $i];
    }
    $out = [];
    foreach (spa_nav_ordered_keys($pdo) as $i => $key) {
        if (!isset($byKey[$key])) {
            continue;
        }
        $row = $byKey[$key];
        $row['sort_order'] = $i;
        $out[] = $row;
    }
    return $out;
}

/**
 * @param list<string> $orderKeys
 * @return array{ok:bool,error?:string}
 */
function spa_nav_save_order(PDO $pdo, array $orderKeys): array
{
    if (!spa_nav_order_table_exists($pdo)) {
        return ['ok' => false, 'error' => '資料表尚未建立，請先執行 schema_spa_nav_order.sql。'];
    }

    $known = spa_nav_item_keys();
    $knownSet = array_fill_keys($known, true);
    $clean = [];
    foreach ($orderKeys as $key) {
        $key = (string) $key;
        if (!isset($knownSet[$key]) || isset($clean[$key])) {
            continue;
        }
        $clean[$key] = true;
    }
    foreach ($known as $key) {
        if (!isset($clean[$key])) {
            $clean[$key] = true;
        }
    }
    $ordered = array_keys($clean);

    try {
        $pdo->beginTransaction();
        spa_nav_ensure_order_defaults($pdo);
        $upd = $pdo->prepare('UPDATE spa_nav_order SET sort_order = ? WHERE item_key = ?');
        foreach ($ordered as $i => $key) {
            $upd->execute([$i, $key]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '儲存排序失敗：' . $e->getMessage()];
    }

    return ['ok' => true];
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
        $audiences[] = 'student';
    }

    return $audiences;
}

/**
 * Visible nav item keys for the current audiences (OR across roles), in display order.
 *
 * @param array<string, mixed>|null $user
 * @return list<string>
 */
function spa_nav_visible_keys(PDO $pdo, ?array $user): array
{
    $matrix = spa_nav_get_matrix($pdo);
    $audiences = spa_nav_audiences_for_user($user);
    $visible = [];
    foreach (spa_nav_ordered_keys($pdo) as $item) {
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
 * @return array{audience:list<string>,items:array<string,bool>,order:list<string>}
 */
function spa_nav_public_payload(PDO $pdo, ?array $user): array
{
    $keys = spa_nav_visible_keys($pdo, $user);
    $set = array_fill_keys($keys, true);
    $order = spa_nav_ordered_keys($pdo);
    $items = [];
    foreach ($order as $item) {
        $items[$item] = isset($set[$item]);
    }
    return [
        'audience' => spa_nav_audiences_for_user($user),
        'items' => $items,
        'order' => $order,
    ];
}
