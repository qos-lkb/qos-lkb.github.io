<?php

declare(strict_types=1);

require_once __DIR__ . '/question_bank_lib.php';
require_once __DIR__ . '/learning_tools_lib.php';

/**
 * Phase 7: learning_tools / quiz_* → question_banks / qb_* helpers.
 */

/**
 * Present a question bank row in the legacy learning_tools public shape (SPA list compat).
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function lt_qb_public_row_from_bank(array $row): array
{
    $pub = qb_public_row($row);
    $pub['linked_simulation_id'] = null;

    return $pub;
}

/**
 * Published tools for catalogue / quiz list: legacy LT first, else published banks.
 *
 * @return list<array<string, mixed>>
 */
function lt_qb_fetch_published_quiz_sources(PDO $pdo): array
{
    $lt = lt_fetch_published($pdo);
    if ($lt !== []) {
        return array_map('lt_public_row', $lt);
    }

    return array_map('lt_qb_public_row_from_bank', qb_fetch_published($pdo));
}

/**
 * Resolve a quiz slug: legacy learning_tool, migration map, or question_bank.
 *
 * @return array{kind:'learning_tool'|'question_bank', row:array<string, mixed>}|null
 */
function lt_qb_resolve_quiz_source(PDO $pdo, string $slug): ?array
{
    $lt = lt_get_by_slug($pdo, $slug);
    if ($lt !== null) {
        return ['kind' => 'learning_tool', 'row' => $lt];
    }

    try {
        $stmt = $pdo->prepare(
            'SELECT bank_id FROM legacy_learning_tool_map WHERE old_slug = ? LIMIT 1'
        );
        $stmt->execute([$slug]);
        $bankId = $stmt->fetchColumn();
        if ($bankId !== false) {
            $bank = qb_get_by_id($pdo, (int) $bankId);
            if ($bank !== null) {
                return ['kind' => 'question_bank', 'row' => $bank];
            }
        }
    } catch (Throwable) {
        // Table may not exist yet on unmigrated hosts.
    }

    $bank = qb_get_by_slug($pdo, $slug);
    if ($bank !== null) {
        return ['kind' => 'question_bank', 'row' => $bank];
    }

    return null;
}

/**
 * MCQ-only questions in the shape expected by SPA quiz.js (id, stem_*, options[]).
 *
 * @return list<array<string, mixed>>
 */
function lt_qb_mcq_questions_for_quiz(PDO $pdo, string $kind, int $id, bool $includeCorrect): array
{
    if ($kind === 'learning_tool') {
        return lt_fetch_questions($pdo, $id, $includeCorrect);
    }

    $questions = qb_fetch_questions($pdo, $id, $includeCorrect);
    $out = [];
    foreach ($questions as $q) {
        if (($q['question_type'] ?? '') !== 'mcq') {
            continue;
        }
        $out[] = [
            'id' => (int) $q['id'],
            'stem_zh' => $q['stem_zh'],
            'stem_en' => $q['stem_en'],
            'explanation_zh' => $q['explanation_zh'] ?? null,
            'explanation_en' => $q['explanation_en'] ?? null,
            'options' => $q['options'] ?? [],
        ];
    }

    return $out;
}

/**
 * Migrate one learning_tool (+ quiz_*) into a question_bank (+ qb_* MCQ).
 *
 * @return array{ok:bool,error?:string,bank_id?:int,slug?:string,skipped?:bool}
 */
function lt_qb_migrate_one_tool(PDO $pdo, int $toolId, bool $dryRun = false): array
{
    $tool = lt_get_by_id($pdo, $toolId);
    if ($tool === null) {
        return ['ok' => false, 'error' => '找不到 learning_tool #' . $toolId];
    }

    try {
        $chk = $pdo->prepare('SELECT bank_id FROM legacy_learning_tool_map WHERE old_tool_id = ? LIMIT 1');
        $chk->execute([$toolId]);
        $existing = $chk->fetchColumn();
        if ($existing !== false) {
            return [
                'ok' => true,
                'skipped' => true,
                'bank_id' => (int) $existing,
                'slug' => (string) ($tool['slug'] ?? ''),
            ];
        }
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => '缺少 legacy_learning_tool_map（請先套用 schema_upgrade_all.sql）'];
    }

    $oldSlug = (string) $tool['slug'];
    $desiredSlug = $oldSlug;
    $bank = qb_get_by_slug($pdo, $desiredSlug);
    if ($bank !== null) {
        $desiredSlug = qb_ensure_unique_slug($pdo, $oldSlug . '-from-lt');
    } else {
        $desiredSlug = qb_ensure_unique_slug($pdo, $desiredSlug);
    }

    $questions = lt_fetch_questions($pdo, $toolId, true);
    $qbQuestions = [];
    foreach ($questions as $i => $q) {
        $opts = [];
        foreach ($q['options'] ?? [] as $oi => $o) {
            $opts[] = [
                'text_zh' => (string) ($o['text_zh'] ?? ''),
                'text_en' => (string) ($o['text_en'] ?? ''),
                'is_correct' => !empty($o['is_correct']),
                'sort_order' => (int) ($o['sort_order'] ?? $oi),
            ];
        }
        $qbQuestions[] = [
            'question_type' => 'mcq',
            'content_format' => 'plain',
            'sort_order' => (int) ($q['sort_order'] ?? $i),
            'stem_zh' => (string) ($q['stem_zh'] ?? ''),
            'stem_en' => (string) ($q['stem_en'] ?? ''),
            'explanation_zh' => $q['explanation_zh'] ?? null,
            'explanation_en' => $q['explanation_en'] ?? null,
            'options' => $opts,
        ];
    }

    if ($dryRun) {
        return [
            'ok' => true,
            'slug' => $desiredSlug,
            'bank_id' => 0,
        ];
    }

    $ownerId = $tool['owner_user_id'] !== null ? (int) $tool['owner_user_id'] : 0;
    if ($ownerId <= 0) {
        $ownerId = 1;
    }

    $bankId = 0;
    if ($qbQuestions === []) {
        $ins = $pdo->prepare(
            'INSERT INTO question_banks (slug, title_zh, title_en, description_zh, description_en,
             subject_id, topic_id, list_sort_order, status, owner_user_id)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $desiredSlug,
            (string) $tool['title_zh'],
            (string) $tool['title_en'],
            $tool['description_zh'],
            $tool['description_en'],
            $tool['subject_id'],
            $tool['topic_id'],
            (int) $tool['list_sort_order'],
            (string) $tool['status'],
            $ownerId,
        ]);
        $bankId = (int) $pdo->lastInsertId();
    } else {
        $user = [
            'id' => $ownerId,
            'email' => 'migrate@science-sims.internal',
        ];
        $payload = [
            'slug' => $desiredSlug,
            'title_zh' => (string) $tool['title_zh'],
            'title_en' => (string) $tool['title_en'],
            'description_zh' => $tool['description_zh'],
            'description_en' => $tool['description_en'],
            'subject_id' => $tool['subject_id'],
            'topic_id' => $tool['topic_id'],
            'list_sort_order' => (int) $tool['list_sort_order'],
            'status' => (string) $tool['status'],
            'questions' => $qbQuestions,
        ];
        $r = qb_save_from_payload($pdo, $user, $payload, true, true);
        if (!$r['ok']) {
            return ['ok' => false, 'error' => $r['error'] ?? '寫入試題庫失敗'];
        }
        $bankId = (int) ($r['id'] ?? 0);
    }

    if ($bankId <= 0) {
        $saved = qb_get_by_slug($pdo, $desiredSlug);
        $bankId = $saved ? (int) $saved['id'] : 0;
    }
    if ($bankId <= 0) {
        return ['ok' => false, 'error' => '遷移後找不到 bank id'];
    }

    $map = $pdo->prepare(
        'INSERT INTO legacy_learning_tool_map (old_tool_id, old_slug, bank_id) VALUES (?, ?, ?)'
    );
    $map->execute([$toolId, $oldSlug, $bankId]);

    // Remap course items & attempts when IDs differ.
    try {
        $pdo->prepare(
            "UPDATE topic_learning_items SET content_type = 'question_bank', content_id = ?
             WHERE content_type = 'learning_tool' AND content_id = ?"
        )->execute([$bankId, $toolId]);
    } catch (Throwable) {
        // ENUM may lack question_bank until schema applied.
    }

    $pdo->prepare(
        "UPDATE learning_attempts SET source_type = 'question_bank', source_id = ?
         WHERE source_type = 'learning_tool' AND source_id = ?"
    )->execute([$bankId, $toolId]);

    return ['ok' => true, 'bank_id' => $bankId, 'slug' => $desiredSlug];
}

/**
 * @return array{ok:bool,migrated:int,skipped:int,errors:list<string>}
 */
function lt_qb_migrate_all(PDO $pdo, bool $dryRun = false): array
{
    $ids = $pdo->query('SELECT id FROM learning_tools ORDER BY id ASC')->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $migrated = 0;
    $skipped = 0;
    $errors = [];
    foreach ($ids as $id) {
        $r = lt_qb_migrate_one_tool($pdo, (int) $id, $dryRun);
        if (!$r['ok']) {
            $errors[] = 'tool #' . $id . ': ' . ($r['error'] ?? 'failed');
            continue;
        }
        if (!empty($r['skipped'])) {
            $skipped++;
        } else {
            $migrated++;
        }
    }

    return [
        'ok' => $errors === [],
        'migrated' => $migrated,
        'skipped' => $skipped,
        'errors' => $errors,
    ];
}
