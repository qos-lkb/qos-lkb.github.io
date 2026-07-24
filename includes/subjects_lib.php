<?php

declare(strict_types=1);

require_once __DIR__ . '/simulations_lib.php';

/**
 * Subject / topic catalogue helpers (admin API + PHP forms).
 */

/**
 * @return list<array<string, mixed>>
 */
function subjects_list_with_topics(PDO $pdo): array
{
    $subjects = $pdo->query('SELECT * FROM subjects ORDER BY sort_order, name_en')->fetchAll() ?: [];
    $topics = $pdo->query(
        'SELECT * FROM topics ORDER BY subject_id, sort_order, name_en'
    )->fetchAll() ?: [];
    $bySubject = [];
    foreach ($topics as $t) {
        $sid = (int) $t['subject_id'];
        $bySubject[$sid][] = [
            'id' => (int) $t['id'],
            'slug' => (string) $t['slug'],
            'name_zh' => (string) $t['name_zh'],
            'name_en' => (string) $t['name_en'],
            'sort_order' => (int) $t['sort_order'],
            'subject_id' => $sid,
        ];
    }
    $out = [];
    foreach ($subjects as $s) {
        $id = (int) $s['id'];
        $out[] = [
            'id' => $id,
            'slug' => (string) $s['slug'],
            'name_zh' => (string) $s['name_zh'],
            'name_en' => (string) $s['name_en'],
            'sort_order' => (int) $s['sort_order'],
            'topics' => $bySubject[$id] ?? [],
        ];
    }
    return $out;
}

/**
 * @return array{ok:bool,error?:string,id?:int,slug?:string}
 */
function subjects_create(PDO $pdo, string $nameEn, string $nameZh = ''): array
{
    $nameEn = trim($nameEn);
    $nameZh = trim($nameZh);
    if ($nameEn === '') {
        return ['ok' => false, 'error' => '請填英文科目名稱。'];
    }
    $slug = substr(sim_slugify($nameEn), 0, 128) ?: 'subject';
    try {
        $pdo->prepare(
            'INSERT INTO subjects (slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, 0)'
        )->execute([$slug, $nameZh !== '' ? $nameZh : $nameEn, $nameEn]);
        return ['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'slug' => $slug];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '新增失敗（可能 slug 重複）。'];
    }
}

/**
 * @return array{ok:bool,error?:string,slug?:string,name_zh?:string,name_en?:string}
 */
function subjects_update(PDO $pdo, int $id, string $nameEn, string $nameZh = ''): array
{
    $nameEn = trim($nameEn);
    $nameZh = trim($nameZh);
    if ($id <= 0 || $nameEn === '') {
        return ['ok' => false, 'error' => '科目資料不完整。'];
    }
    $slug = substr(sim_slugify($nameEn), 0, 128) ?: 'subject';
    $zh = $nameZh !== '' ? $nameZh : $nameEn;
    try {
        $stmt = $pdo->prepare('UPDATE subjects SET slug = ?, name_zh = ?, name_en = ? WHERE id = ?');
        $stmt->execute([$slug, $zh, $nameEn, $id]);
        if ($stmt->rowCount() === 0) {
            $chk = $pdo->prepare('SELECT id FROM subjects WHERE id = ?');
            $chk->execute([$id]);
            if (!$chk->fetch()) {
                return ['ok' => false, 'error' => '找不到科目。'];
            }
        }
        return ['ok' => true, 'slug' => $slug, 'name_zh' => $zh, 'name_en' => $nameEn];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '更新失敗（可能 slug 重複）。'];
    }
}

/**
 * @return array{ok:bool,error?:string}
 */
function subjects_delete(PDO $pdo, int $id): array
{
    if ($id <= 0) {
        return ['ok' => false, 'error' => '無效的科目。'];
    }
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM topics WHERE subject_id = ?');
    $stmt->execute([$id]);
    $nt = (int) $stmt->fetchColumn();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM simulations WHERE subject_id = ?');
    $stmt->execute([$id]);
    $ns = (int) $stmt->fetchColumn();
    if ($nt > 0 || $ns > 0) {
        return ['ok' => false, 'error' => '無法刪除：請先移除或移轉此科目下的單元與模擬。'];
    }
    $pdo->prepare('DELETE FROM subjects WHERE id = ?')->execute([$id]);
    return ['ok' => true];
}

/**
 * @param list<int> $orderedIds
 * @return array{ok:bool,error?:string}
 */
function subjects_reorder(PDO $pdo, array $orderedIds): array
{
    $ids = array_values(array_filter(array_map('intval', $orderedIds), static fn (int $x): bool => $x > 0));
    $allIds = array_map('intval', $pdo->query('SELECT id FROM subjects')->fetchAll(PDO::FETCH_COLUMN) ?: []);
    sort($allIds);
    $sorted = $ids;
    sort($sorted);
    if ($ids === [] || $sorted !== $allIds) {
        return ['ok' => false, 'error' => '科目排序資料無效。'];
    }
    $pdo->beginTransaction();
    try {
        $u = $pdo->prepare('UPDATE subjects SET sort_order = ? WHERE id = ?');
        foreach ($ids as $i => $sid) {
            $u->execute([$i, $sid]);
        }
        $pdo->commit();
        return ['ok' => true];
    } catch (Throwable $e) {
        $pdo->rollBack();
        return ['ok' => false, 'error' => '排序更新失敗。'];
    }
}

/**
 * @return array{ok:bool,error?:string,id?:int,slug?:string}
 */
function topics_create(PDO $pdo, int $subjectId, string $nameEn, string $nameZh = ''): array
{
    $nameEn = trim($nameEn);
    $nameZh = trim($nameZh);
    if ($subjectId <= 0 || $nameEn === '') {
        return ['ok' => false, 'error' => '請選擇科目並填英文單元名稱。'];
    }
    $subOk = $pdo->prepare('SELECT id FROM subjects WHERE id = ?');
    $subOk->execute([$subjectId]);
    if (!$subOk->fetch()) {
        return ['ok' => false, 'error' => '所屬科目不存在。'];
    }
    $slug = substr(sim_slugify($nameEn), 0, 160) ?: 'topic';
    $mxStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM topics WHERE subject_id = ?');
    $mxStmt->execute([$subjectId]);
    $mx = (int) $mxStmt->fetchColumn();
    try {
        $pdo->prepare(
            'INSERT INTO topics (subject_id, slug, name_zh, name_en, sort_order) VALUES (?, ?, ?, ?, ?)'
        )->execute([$subjectId, $slug, $nameZh !== '' ? $nameZh : $nameEn, $nameEn, $mx]);
        return ['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'slug' => $slug];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '新增單元失敗（可能 slug 重複）。'];
    }
}

/**
 * @return array{ok:bool,error?:string,slug?:string,name_zh?:string,name_en?:string,subject_id?:int}
 */
function topics_update(PDO $pdo, int $id, int $subjectId, string $nameEn, string $nameZh = ''): array
{
    $nameEn = trim($nameEn);
    $nameZh = trim($nameZh);
    if ($id <= 0 || $subjectId <= 0 || $nameEn === '') {
        return ['ok' => false, 'error' => '單元資料不完整。'];
    }
    $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ?');
    $chk->execute([$id]);
    if (!$chk->fetch()) {
        return ['ok' => false, 'error' => '找不到此單元。'];
    }
    $subOk = $pdo->prepare('SELECT id FROM subjects WHERE id = ?');
    $subOk->execute([$subjectId]);
    if (!$subOk->fetch()) {
        return ['ok' => false, 'error' => '所屬科目不存在。'];
    }
    $slug = substr(sim_slugify($nameEn), 0, 160) ?: 'topic';
    $zh = $nameZh !== '' ? $nameZh : $nameEn;
    try {
        $pdo->prepare(
            'UPDATE topics SET subject_id = ?, slug = ?, name_zh = ?, name_en = ? WHERE id = ?'
        )->execute([$subjectId, $slug, $zh, $nameEn, $id]);
        return ['ok' => true, 'slug' => $slug, 'name_zh' => $zh, 'name_en' => $nameEn, 'subject_id' => $subjectId];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '更新失敗（可能 slug 重複）。'];
    }
}

/**
 * @return array{ok:bool,error?:string}
 */
function topics_delete(PDO $pdo, int $id): array
{
    if ($id <= 0) {
        return ['ok' => false, 'error' => '無效的單元。'];
    }
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM simulations WHERE topic_id = ?');
    $stmt->execute([$id]);
    if ((int) $stmt->fetchColumn() > 0) {
        return ['ok' => false, 'error' => '無法刪除：仍有模擬使用此單元。'];
    }
    $pdo->prepare('DELETE FROM topics WHERE id = ?')->execute([$id]);
    return ['ok' => true];
}

/**
 * @param list<int> $orderedIds
 * @return array{ok:bool,error?:string}
 */
function topics_reorder(PDO $pdo, int $subjectId, array $orderedIds): array
{
    if ($subjectId <= 0) {
        return ['ok' => false, 'error' => '單元排序：科目無效。'];
    }
    $ids = array_values(array_filter(array_map('intval', $orderedIds), static fn (int $x): bool => $x > 0));
    $stmt = $pdo->prepare('SELECT id FROM topics WHERE subject_id = ? ORDER BY sort_order, name_en');
    $stmt->execute([$subjectId]);
    $allIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    sort($allIds);
    $sorted = $ids;
    sort($sorted);
    if ($ids === [] || $sorted !== $allIds) {
        return ['ok' => false, 'error' => '單元排序資料無效。'];
    }
    $pdo->beginTransaction();
    try {
        $u = $pdo->prepare('UPDATE topics SET sort_order = ? WHERE id = ? AND subject_id = ?');
        foreach ($ids as $i => $tid) {
            $u->execute([$i, $tid, $subjectId]);
        }
        $pdo->commit();
        return ['ok' => true];
    } catch (Throwable $e) {
        $pdo->rollBack();
        return ['ok' => false, 'error' => '排序更新失敗。'];
    }
}
