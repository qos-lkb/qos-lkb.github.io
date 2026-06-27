<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';
require_once __DIR__ . '/web_base.php';

function qb_uploads_root(): string
{
    return dirname(__DIR__) . '/uploads/question_bank';
}

function qb_media_public_url(string $relativePath): string
{
    return web_resolve_path(ltrim(str_replace('\\', '/', $relativePath), '/'));
}

function qb_difficulty_labels(): array
{
    return ['easy' => '易', 'medium' => '中', 'hard' => '難'];
}

function qb_valid_difficulties(): array
{
    return array_keys(qb_difficulty_labels());
}

function qb_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'question-bank';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM question_banks WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM question_banks WHERE slug = ? AND id <> ? LIMIT 1');
            $stmt->execute([$candidate, $exceptId]);
        }
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $suffix = '-' . $n;
        $candidate = substr($slug, 0, 190 - strlen($suffix)) . $suffix;
        $n++;
    }
}

/**
 * @return array<string, mixed>|null
 */
function qb_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM question_banks WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function qb_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM question_banks WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function qb_fetch_published(PDO $pdo): array
{
    $sql = 'SELECT qb.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en
            FROM question_banks qb
            LEFT JOIN subjects sub ON sub.id = qb.subject_id
            LEFT JOIN topics t ON t.id = qb.topic_id
            WHERE qb.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999), qb.list_sort_order, qb.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

/**
 * @return array<int, array<string, mixed>>
 */
function qb_fetch_media_for_question(PDO $pdo, int $questionId): array
{
    $stmt = $pdo->prepare('SELECT * FROM qb_question_media WHERE question_id = ? ORDER BY sort_order, id');
    $stmt->execute([$questionId]);
    $rows = $stmt->fetchAll() ?: [];
    foreach ($rows as &$row) {
        $row['id'] = (int) $row['id'];
        $row['question_id'] = (int) $row['question_id'];
        $row['url'] = qb_media_public_url((string) $row['file_path']);
        $row['file_size'] = (int) $row['file_size'];
        if ($row['related_sort'] !== null) {
            $row['related_sort'] = (int) $row['related_sort'];
        }
    }
    unset($row);
    return $rows;
}

function qb_format_question_row(array $q, bool $includeAnswers): array
{
    $out = [
        'id' => (int) $q['id'],
        'question_code' => $q['question_code'] ?? null,
        'question_type' => $q['question_type'],
        'sort_order' => (int) $q['sort_order'],
        'default_score' => isset($q['default_score']) && $q['default_score'] !== null ? (float) $q['default_score'] : null,
        'subject_id' => isset($q['subject_id']) && $q['subject_id'] !== null ? (int) $q['subject_id'] : null,
        'topic_id' => isset($q['topic_id']) && $q['topic_id'] !== null ? (int) $q['topic_id'] : null,
        'difficulty' => $q['difficulty'] ?? null,
        'source_zh' => $q['source_zh'] ?? null,
        'source_en' => $q['source_en'] ?? null,
        'content_format' => $q['content_format'] ?? 'markdown',
        'stem_zh' => $q['stem_zh'],
        'stem_en' => $q['stem_en'],
        'explanation_zh' => $q['explanation_zh'],
        'explanation_en' => $q['explanation_en'],
    ];
    if (isset($q['subject_zh'])) {
        $out['subject_zh'] = $q['subject_zh'];
        $out['subject_en'] = $q['subject_en'] ?? null;
    }
    if (isset($q['topic_zh'])) {
        $out['topic_zh'] = $q['topic_zh'];
        $out['topic_en'] = $q['topic_en'] ?? null;
    }
    if (!empty($q['media'])) {
        $out['media'] = $q['media'];
    }
    if ($includeAnswers) {
        $out['model_answer_zh'] = $q['model_answer_zh'] ?? null;
        $out['model_answer_en'] = $q['model_answer_en'] ?? null;
        if (($q['question_type'] ?? '') === 'true_false' && array_key_exists('true_false_answer', $q)) {
            $out['true_false_answer'] = $q['true_false_answer'] !== null ? (int) $q['true_false_answer'] : null;
        }
    }
    return $out;
}

function qb_fetch_questions(PDO $pdo, int $bankId, bool $includeAnswers = false): array
{
    $sql = 'SELECT q.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en
            FROM qb_questions q
            LEFT JOIN subjects sub ON sub.id = q.subject_id
            LEFT JOIN topics t ON t.id = q.topic_id
            WHERE q.bank_id = ? ORDER BY q.sort_order, q.id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$bankId]);
    $questions = $stmt->fetchAll() ?: [];

    $optStmt = $pdo->prepare('SELECT * FROM qb_mcq_options WHERE question_id = ? ORDER BY sort_order, id');
    $partStmt = $pdo->prepare('SELECT * FROM qb_question_parts WHERE question_id = ? ORDER BY sort_order, id');
    $blankStmt = $pdo->prepare('SELECT * FROM qb_fill_blanks WHERE question_id = ? ORDER BY sort_order, blank_index, id');

    foreach ($questions as &$q) {
        $qId = (int) $q['id'];
        $type = (string) $q['question_type'];
        $q['media'] = qb_fetch_media_for_question($pdo, $qId);

        if ($type === 'mcq') {
            $optStmt->execute([$qId]);
            $options = $optStmt->fetchAll() ?: [];
            if (!$includeAnswers) {
                foreach ($options as &$o) {
                    unset($o['is_correct']);
                }
                unset($o);
            }
            $q['options'] = $options;
        } elseif ($type === 'long_answer') {
            $partStmt->execute([$qId]);
            $parts = $partStmt->fetchAll() ?: [];
            if (!$includeAnswers) {
                foreach ($parts as &$p) {
                    unset($p['model_answer_zh'], $p['model_answer_en']);
                }
                unset($p);
            }
            $q['parts'] = $parts;
        } elseif ($type === 'fill_blank') {
            $blankStmt->execute([$qId]);
            $blanks = $blankStmt->fetchAll() ?: [];
            if (!$includeAnswers) {
                foreach ($blanks as &$b) {
                    unset($b['acceptable_answer_zh'], $b['acceptable_answer_en']);
                }
                unset($b);
            }
            $q['blanks'] = $blanks;
        }

        if ($type === 'true_false' && $q['true_false_answer'] !== null) {
            $q['true_false_answer'] = (int) $q['true_false_answer'];
        }

        $child = [
            'options' => $q['options'] ?? null,
            'parts' => $q['parts'] ?? null,
            'blanks' => $q['blanks'] ?? null,
        ];
        $formatted = qb_format_question_row($q, $includeAnswers);
        if ($type === 'mcq') {
            $formatted['options'] = $child['options'] ?? [];
        } elseif ($type === 'long_answer') {
            $formatted['parts'] = $child['parts'] ?? [];
        } elseif ($type === 'fill_blank') {
            $formatted['blanks'] = $child['blanks'] ?? [];
        }
        $q = $formatted;
    }
    unset($q);

    return $questions;
}

function qb_bilingual_required(string $zh, string $en, string $label): ?string
{
    if ($zh === '' && $en === '') {
        return $label . '缺少中文或英文內容。';
    }
    return null;
}

function qb_validate_questions(array $questions): ?string
{
    if ($questions === []) {
        return '至少需要一題。';
    }

    $validTypes = ['mcq', 'short_answer', 'long_answer', 'fill_blank', 'true_false'];
    $partLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    $seenCodes = [];

    foreach ($questions as $i => $q) {
        $n = $i + 1;
        $type = (string) ($q['question_type'] ?? 'mcq');
        if (!in_array($type, $validTypes, true)) {
            return '第 ' . $n . ' 題題型無效。';
        }

        $code = trim((string) ($q['question_code'] ?? ''));
        if ($code !== '') {
            if (isset($seenCodes[$code])) {
                return '題目代號「' . $code . '」在本試題集中重複。';
            }
            $seenCodes[$code] = true;
        }

        $difficulty = (string) ($q['difficulty'] ?? '');
        if ($difficulty !== '' && !in_array($difficulty, qb_valid_difficulties(), true)) {
            return '第 ' . $n . ' 題難度無效。';
        }

        $subjectId = isset($q['subject_id']) && $q['subject_id'] !== '' ? (int) $q['subject_id'] : 0;
        if ($subjectId <= 0) {
            return '第 ' . $n . ' 題請選擇科目。';
        }

        $topicId = isset($q['topic_id']) && $q['topic_id'] !== '' ? (int) $q['topic_id'] : 0;
        if ($topicId > 0) {
            // topic-subject match checked in qb_save_from_payload
        }

        $stemZh = trim((string) ($q['stem_zh'] ?? ''));
        $stemEn = trim((string) ($q['stem_en'] ?? ''));
        $err = qb_bilingual_required($stemZh, $stemEn, '第 ' . $n . ' 題題幹');
        if ($err !== null) {
            return $err;
        }

        if ($type === 'mcq') {
            $options = $q['options'] ?? [];
            if (count($options) !== 4) {
                return '第 ' . $n . ' 題（四選一）必須有 4 個選項。';
            }
            $correctCount = 0;
            foreach ($options as $o) {
                if (!empty($o['is_correct'])) {
                    $correctCount++;
                }
                $tz = trim((string) ($o['text_zh'] ?? ''));
                $te = trim((string) ($o['text_en'] ?? ''));
                if ($tz === '' && $te === '') {
                    return '第 ' . $n . ' 題有空白選項。';
                }
            }
            if ($correctCount !== 1) {
                return '第 ' . $n . ' 題必須恰好標記一個正確答案。';
            }
        } elseif ($type === 'short_answer') {
            $mZh = trim((string) ($q['model_answer_zh'] ?? ''));
            $mEn = trim((string) ($q['model_answer_en'] ?? ''));
            $err = qb_bilingual_required($mZh, $mEn, '第 ' . $n . ' 題參考答案');
            if ($err !== null) {
                return $err;
            }
        } elseif ($type === 'long_answer') {
            $parts = $q['parts'] ?? [];
            if ($parts === []) {
                return '第 ' . $n . ' 題（長答）至少需要一個子題。';
            }
            foreach ($parts as $pi => $p) {
                $pZh = trim((string) ($p['prompt_zh'] ?? ''));
                $pEn = trim((string) ($p['prompt_en'] ?? ''));
                $err = qb_bilingual_required($pZh, $pEn, '第 ' . $n . ' 題子題 (' . ($partLabels[$pi] ?? ($pi + 1)) . ')');
                if ($err !== null) {
                    return $err;
                }
                $mZh = trim((string) ($p['model_answer_zh'] ?? ''));
                $mEn = trim((string) ($p['model_answer_en'] ?? ''));
                $err = qb_bilingual_required($mZh, $mEn, '第 ' . $n . ' 題子題 (' . ($partLabels[$pi] ?? ($pi + 1)) . ') 參考答案');
                if ($err !== null) {
                    return $err;
                }
            }
        } elseif ($type === 'fill_blank') {
            $blanks = $q['blanks'] ?? [];
            if ($blanks === []) {
                return '第 ' . $n . ' 題（填充）至少需要一個空格答案。';
            }
            foreach ($blanks as $bi => $b) {
                $aZh = trim((string) ($b['acceptable_answer_zh'] ?? ''));
                $aEn = trim((string) ($b['acceptable_answer_en'] ?? ''));
                $err = qb_bilingual_required($aZh, $aEn, '第 ' . $n . ' 題空格 ' . ($bi + 1));
                if ($err !== null) {
                    return $err;
                }
            }
        } elseif ($type === 'true_false') {
            if (!array_key_exists('true_false_answer', $q) || !in_array((int) $q['true_false_answer'], [0, 1], true)) {
                return '第 ' . $n . ' 題（是非）請選擇正確答案（是／否）。';
            }
        }
    }

    return null;
}

function qb_normalize_bilingual(string $zh, string $en): array
{
    if ($en === '') {
        $en = $zh;
    }
    if ($zh === '') {
        $zh = $en;
    }
    return [$zh, $en];
}

function qb_question_code_taken(PDO $pdo, string $code, ?int $exceptQuestionId = null): bool
{
    if ($code === '') {
        return false;
    }
    if ($exceptQuestionId === null) {
        $stmt = $pdo->prepare('SELECT id FROM qb_questions WHERE question_code = ? LIMIT 1');
        $stmt->execute([$code]);
    } else {
        $stmt = $pdo->prepare('SELECT id FROM qb_questions WHERE question_code = ? AND id <> ? LIMIT 1');
        $stmt->execute([$code, $exceptQuestionId]);
    }
    return (bool) $stmt->fetch();
}

function qb_validate_question_codes_unique(PDO $pdo, array $questions): ?string
{
    foreach ($questions as $i => $q) {
        $code = trim((string) ($q['question_code'] ?? ''));
        if ($code === '') {
            continue;
        }
        $qId = isset($q['id']) ? (int) $q['id'] : 0;
        if (qb_question_code_taken($pdo, $code, $qId > 0 ? $qId : null)) {
            return '題目代號「' . $code . '」已被使用。';
        }
    }
    return null;
}

function qb_delete_media_files_for_questions(PDO $pdo, array $questionIds): void
{
    if ($questionIds === []) {
        return;
    }
    $in = implode(',', array_fill(0, count($questionIds), '?'));
    $stmt = $pdo->prepare("SELECT file_path FROM qb_question_media WHERE question_id IN ($in)");
    $stmt->execute($questionIds);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) ?: [] as $path) {
        $full = dirname(__DIR__) . '/' . ltrim(str_replace('\\', '/', (string) $path), '/');
        if (is_file($full)) {
            @unlink($full);
        }
    }
    $pdo->prepare("DELETE FROM qb_question_media WHERE question_id IN ($in)")->execute($questionIds);
}

function qb_delete_child_rows_for_questions(PDO $pdo, array $questionIds): void
{
    if ($questionIds === []) {
        return;
    }
    $in = implode(',', array_fill(0, count($questionIds), '?'));
    $pdo->prepare("DELETE FROM qb_mcq_options WHERE question_id IN ($in)")->execute($questionIds);
    $pdo->prepare("DELETE FROM qb_question_parts WHERE question_id IN ($in)")->execute($questionIds);
    $pdo->prepare("DELETE FROM qb_fill_blanks WHERE question_id IN ($in)")->execute($questionIds);
}

function qb_sync_question_children(PDO $pdo, int $questionId, array $q): void
{
    $pdo->prepare('DELETE FROM qb_mcq_options WHERE question_id = ?')->execute([$questionId]);
    $pdo->prepare('DELETE FROM qb_question_parts WHERE question_id = ?')->execute([$questionId]);
    $pdo->prepare('DELETE FROM qb_fill_blanks WHERE question_id = ?')->execute([$questionId]);

    $type = (string) ($q['question_type'] ?? 'mcq');
    $partLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

    if ($type === 'mcq') {
        $oIns = $pdo->prepare(
            'INSERT INTO qb_mcq_options (question_id, sort_order, text_zh, text_en, is_correct) VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($q['options'] as $oi => $o) {
            [$tz, $te] = qb_normalize_bilingual(
                trim((string) ($o['text_zh'] ?? '')),
                trim((string) ($o['text_en'] ?? ''))
            );
            $oIns->execute([
                $questionId,
                (int) ($o['sort_order'] ?? $oi),
                $tz,
                $te,
                !empty($o['is_correct']) ? 1 : 0,
            ]);
        }
    } elseif ($type === 'long_answer') {
        $pIns = $pdo->prepare(
            'INSERT INTO qb_question_parts (question_id, part_label, sort_order, prompt_zh, prompt_en, model_answer_zh, model_answer_en, marks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($q['parts'] as $pi => $p) {
            [$pZh, $pEn] = qb_normalize_bilingual(
                trim((string) ($p['prompt_zh'] ?? '')),
                trim((string) ($p['prompt_en'] ?? ''))
            );
            [$mZh, $mEn] = qb_normalize_bilingual(
                trim((string) ($p['model_answer_zh'] ?? '')),
                trim((string) ($p['model_answer_en'] ?? ''))
            );
            $label = trim((string) ($p['part_label'] ?? ''));
            if ($label === '') {
                $label = $partLabels[$pi] ?? chr(97 + $pi);
            }
            $marks = isset($p['marks']) && $p['marks'] !== '' ? (int) $p['marks'] : null;
            $pIns->execute([
                $questionId,
                $label,
                (int) ($p['sort_order'] ?? $pi),
                $pZh,
                $pEn,
                $mZh,
                $mEn,
                $marks,
            ]);
        }
    } elseif ($type === 'fill_blank') {
        $bIns = $pdo->prepare(
            'INSERT INTO qb_fill_blanks (question_id, blank_index, acceptable_answer_zh, acceptable_answer_en, sort_order)
             VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($q['blanks'] as $bi => $b) {
            [$aZh, $aEn] = qb_normalize_bilingual(
                trim((string) ($b['acceptable_answer_zh'] ?? '')),
                trim((string) ($b['acceptable_answer_en'] ?? ''))
            );
            $blankIndex = isset($b['blank_index']) ? (int) $b['blank_index'] : ($bi + 1);
            $bIns->execute([
                $questionId,
                $blankIndex,
                $aZh,
                $aEn,
                (int) ($b['sort_order'] ?? $bi),
            ]);
        }
    }
}

function qb_upsert_question(PDO $pdo, int $bankId, array $q, int $sort, ?int $bankSubjectId, ?int $bankTopicId): int
{
    $type = (string) ($q['question_type'] ?? 'mcq');
    [$stemZh, $stemEn] = qb_normalize_bilingual(
        trim((string) ($q['stem_zh'] ?? '')),
        trim((string) ($q['stem_en'] ?? ''))
    );

    $subjectId = isset($q['subject_id']) && $q['subject_id'] !== ''
        ? (int) $q['subject_id']
        : ($bankSubjectId ?? null);
    $topicId = isset($q['topic_id']) && $q['topic_id'] !== ''
        ? (int) $q['topic_id']
        : ($bankTopicId ?? null);

    $difficulty = trim((string) ($q['difficulty'] ?? ''));
    $difficulty = $difficulty !== '' ? $difficulty : null;

    $code = trim((string) ($q['question_code'] ?? ''));
    $code = $code !== '' ? $code : null;

    $sourceZh = trim((string) ($q['source_zh'] ?? ''));
    $sourceEn = trim((string) ($q['source_en'] ?? ''));
    $contentFormat = (string) ($q['content_format'] ?? 'markdown');
    if (!in_array($contentFormat, ['markdown', 'plain'], true)) {
        $contentFormat = 'markdown';
    }

    $modelZh = null;
    $modelEn = null;
    $tfAnswer = null;

    if ($type === 'short_answer') {
        [$modelZh, $modelEn] = qb_normalize_bilingual(
            trim((string) ($q['model_answer_zh'] ?? '')),
            trim((string) ($q['model_answer_en'] ?? ''))
        );
    } elseif ($type === 'true_false') {
        $tfAnswer = !empty($q['true_false_answer']) ? 1 : 0;
    }

    $questionId = isset($q['id']) ? (int) $q['id'] : 0;
    $defaultScore = null;
    if (isset($q['default_score']) && $q['default_score'] !== '' && $q['default_score'] !== null) {
        $defaultScore = (float) $q['default_score'];
        if ($defaultScore <= 0) {
            $defaultScore = null;
        }
    }
    if ($questionId > 0) {
        $chk = $pdo->prepare('SELECT id FROM qb_questions WHERE id = ? AND bank_id = ? LIMIT 1');
        $chk->execute([$questionId, $bankId]);
        if (!$chk->fetch()) {
            $questionId = 0;
        }
    }

    if ($questionId > 0) {
        $upd = $pdo->prepare(
            'UPDATE qb_questions SET question_code=?, question_type=?, sort_order=?, default_score=?, subject_id=?, topic_id=?,
             difficulty=?, source_zh=?, source_en=?, content_format=?, stem_zh=?, stem_en=?, explanation_zh=?, explanation_en=?,
             model_answer_zh=?, model_answer_en=?, true_false_answer=? WHERE id=? AND bank_id=?'
        );
        $upd->execute([
            $code, $type, $sort, $defaultScore, $subjectId, $topicId,
            $difficulty,
            $sourceZh !== '' ? $sourceZh : null,
            $sourceEn !== '' ? $sourceEn : null,
            $contentFormat,
            $stemZh, $stemEn,
            trim((string) ($q['explanation_zh'] ?? '')) ?: null,
            trim((string) ($q['explanation_en'] ?? '')) ?: null,
            $modelZh, $modelEn, $tfAnswer,
            $questionId, $bankId,
        ]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO qb_questions (bank_id, question_code, question_type, sort_order, default_score, subject_id, topic_id,
             difficulty, source_zh, source_en, content_format, stem_zh, stem_en, explanation_zh, explanation_en,
             model_answer_zh, model_answer_en, true_false_answer)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $bankId, $code, $type, $sort, $defaultScore, $subjectId, $topicId,
            $difficulty,
            $sourceZh !== '' ? $sourceZh : null,
            $sourceEn !== '' ? $sourceEn : null,
            $contentFormat,
            $stemZh, $stemEn,
            trim((string) ($q['explanation_zh'] ?? '')) ?: null,
            trim((string) ($q['explanation_en'] ?? '')) ?: null,
            $modelZh, $modelEn, $tfAnswer,
        ]);
        $questionId = (int) $pdo->lastInsertId();
    }

    qb_sync_question_children($pdo, $questionId, $q);
    return $questionId;
}

function qb_sync_questions(PDO $pdo, int $bankId, array $questions, ?int $bankSubjectId = null, ?int $bankTopicId = null): void
{
    $existing = $pdo->prepare('SELECT id FROM qb_questions WHERE bank_id = ?');
    $existing->execute([$bankId]);
    $oldIds = array_map('intval', $existing->fetchAll(PDO::FETCH_COLUMN) ?: []);

    $keptIds = [];
    foreach ($questions as $sort => $q) {
        $keptIds[] = qb_upsert_question($pdo, $bankId, $q, (int) ($q['sort_order'] ?? $sort), $bankSubjectId, $bankTopicId);
    }

    $removeIds = array_values(array_diff($oldIds, $keptIds));
    if ($removeIds !== []) {
        qb_delete_media_files_for_questions($pdo, $removeIds);
        qb_delete_child_rows_for_questions($pdo, $removeIds);
        $in = implode(',', array_fill(0, count($removeIds), '?'));
        $pdo->prepare("DELETE FROM qb_questions WHERE id IN ($in)")->execute($removeIds);
    }
}

function qb_resolve_status(string $requested, bool $canPublishAny): string
{
    if (!in_array($requested, ['draft', 'pending_review', 'published'], true)) {
        $requested = 'draft';
    }
    if ($canPublishAny) {
        return $requested;
    }
    if ($requested === 'published') {
        return 'pending_review';
    }
    return in_array($requested, ['draft', 'pending_review'], true) ? $requested : 'draft';
}

/**
 * @param array{id:int,email:string,display_name:string} $user
 * @return array{ok:bool,error?:string,id?:int}
 */
function qb_save_from_payload(PDO $pdo, array $user, array $payload, bool $canPublishAny, bool $isAdmin): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    $descZh = trim((string) ($payload['description_zh'] ?? ''));
    $descEn = trim((string) ($payload['description_en'] ?? ''));
    $subjectId = isset($payload['subject_id']) && $payload['subject_id'] !== '' ? (int) $payload['subject_id'] : null;
    $topicId = isset($payload['topic_id']) && $payload['topic_id'] !== '' ? (int) $payload['topic_id'] : null;
    $listSort = (int) ($payload['list_sort_order'] ?? 0);
    $status = qb_resolve_status((string) ($payload['status'] ?? 'draft'), $canPublishAny);
    $slugInput = trim((string) ($payload['slug'] ?? ''));
    $questions = $payload['questions'] ?? [];

    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請至少填寫中文或英文標題。'];
    }
    [$titleZh, $titleEn] = qb_normalize_bilingual($titleZh, $titleEn);

    $qErr = qb_validate_questions(is_array($questions) ? $questions : []);
    if ($qErr !== null) {
        return ['ok' => false, 'error' => $qErr];
    }

    $questionsArr = is_array($questions) ? $questions : [];
    $codeErr = qb_validate_question_codes_unique($pdo, $questionsArr);
    if ($codeErr !== null) {
        return ['ok' => false, 'error' => $codeErr];
    }

    foreach ($questionsArr as $i => $q) {
        $qSubjectId = (int) ($q['subject_id'] ?? 0);
        $qTopicId = isset($q['topic_id']) && $q['topic_id'] !== '' ? (int) $q['topic_id'] : 0;
        if ($qTopicId > 0) {
            $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ? AND subject_id = ? LIMIT 1');
            $chk->execute([$qTopicId, $qSubjectId]);
            if (!$chk->fetch()) {
                return ['ok' => false, 'error' => '第 ' . ($i + 1) . ' 題所選課題不屬於該科目。'];
            }
        }
    }

    if ($subjectId !== null && $topicId !== null) {
        $chk = $pdo->prepare('SELECT id FROM topics WHERE id = ? AND subject_id = ? LIMIT 1');
        $chk->execute([$topicId, $subjectId]);
        if (!$chk->fetch()) {
            return ['ok' => false, 'error' => '所選單元不屬於該科目。'];
        }
    }

    $ownerUserId = $user['id'];
    if ($isAdmin && isset($payload['owner_user_id']) && $payload['owner_user_id'] !== '') {
        $ownerUserId = (int) $payload['owner_user_id'];
    }

    if ($id > 0) {
        $row = qb_get_by_id($pdo, $id);
        if (!$row) {
            return ['ok' => false, 'error' => '找不到試題庫。'];
        }
        if (!$canPublishAny && ((int) ($row['owner_user_id'] ?? 0) !== $user['id'])) {
            return ['ok' => false, 'error' => '無權編輯。'];
        }
        if (!$canPublishAny) {
            $ownerUserId = (int) $row['owner_user_id'];
        }

        $slug = $slugInput !== '' ? sim_slugify($slugInput) : $row['slug'];
        $slug = qb_ensure_unique_slug($pdo, $slug, $id);

        $upd = $pdo->prepare(
            'UPDATE question_banks SET slug=?, title_zh=?, title_en=?, description_zh=?, description_en=?,
             subject_id=?, topic_id=?, list_sort_order=?, status=?, owner_user_id=?,
             updated_at=CURRENT_TIMESTAMP WHERE id=?'
        );
        $upd->execute([
            $slug, $titleZh, $titleEn,
            $descZh !== '' ? $descZh : null,
            $descEn !== '' ? $descEn : null,
            $subjectId, $topicId, $listSort, $status, $ownerUserId, $id,
        ]);
        qb_sync_questions($pdo, $id, $questionsArr, $subjectId, $topicId);
        return ['ok' => true, 'id' => $id];
    }

    $slug = qb_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
    $ins = $pdo->prepare(
        'INSERT INTO question_banks (slug, title_zh, title_en, description_zh, description_en,
         subject_id, topic_id, list_sort_order, status, owner_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $slug, $titleZh, $titleEn,
        $descZh !== '' ? $descZh : null,
        $descEn !== '' ? $descEn : null,
        $subjectId, $topicId, $listSort, $status, $ownerUserId,
    ]);
    $newId = (int) $pdo->lastInsertId();
    qb_sync_questions($pdo, $newId, $questionsArr, $subjectId, $topicId);
    return ['ok' => true, 'id' => $newId];
}

function qb_public_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title_zh' => $row['title_zh'],
        'title_en' => $row['title_en'],
        'description_zh' => $row['description_zh'],
        'description_en' => $row['description_en'],
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'topic_id' => $row['topic_id'] !== null ? (int) $row['topic_id'] : null,
        'list_sort_order' => (int) $row['list_sort_order'],
        'status' => $row['status'],
        'updated_at' => $row['updated_at'],
    ];
}

function qb_delete_by_id(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare('SELECT id FROM qb_questions WHERE bank_id = ?');
    $stmt->execute([$id]);
    $qIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);

    if ($qIds !== []) {
        qb_delete_media_files_for_questions($pdo, $qIds);
        qb_delete_child_rows_for_questions($pdo, $qIds);
    }
    $pdo->prepare('DELETE FROM qb_questions WHERE bank_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM question_banks WHERE id = ?')->execute([$id]);

    $bankDir = qb_uploads_root() . '/' . $id;
    if (is_dir($bankDir)) {
        foreach (glob($bankDir . '/*') ?: [] as $f) {
            if (is_file($f)) {
                @unlink($f);
            }
        }
        @rmdir($bankDir);
    }
}

function qb_question_type_label(string $type): string
{
    return match ($type) {
        'mcq' => '四選一',
        'short_answer' => '短答題',
        'long_answer' => '長答題',
        'fill_blank' => '填充題',
        'true_false' => '是非題',
        default => $type,
    };
}

function qb_status_label(string $status): string
{
    return match ($status) {
        'draft' => '草稿',
        'pending_review' => '待審核',
        'published' => '已發佈',
        default => $status,
    };
}

function qb_difficulty_label(?string $difficulty): string
{
    if ($difficulty === null || $difficulty === '') {
        return '—';
    }
    return qb_difficulty_labels()[$difficulty] ?? $difficulty;
}

/**
 * @return array{ok:bool,error?:string,media?:array<string,mixed>}
 */
function qb_save_media_upload(PDO $pdo, int $bankId, int $questionId, array $file, string $role = 'stem', ?int $relatedSort = null, ?string $altZh = null, ?string $altEn = null): array
{
    $validRoles = ['stem', 'option', 'part', 'explanation', 'answer', 'general'];
    if (!in_array($role, $validRoles, true)) {
        $role = 'general';
    }

    $qStmt = $pdo->prepare('SELECT id FROM qb_questions WHERE id = ? AND bank_id = ? LIMIT 1');
    $qStmt->execute([$questionId, $bankId]);
    if (!$qStmt->fetch()) {
        return ['ok' => false, 'error' => '找不到題目。'];
    }

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => '上載失敗。'];
    }

    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => '無效的上載檔案。'];
    }

    $maxBytes = 5 * 1024 * 1024;
    if ((int) ($file['size'] ?? 0) > $maxBytes) {
        return ['ok' => false, 'error' => '圖片不可超過 5 MB。'];
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp) ?: '';
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
    if (!isset($allowed[$mime])) {
        return ['ok' => false, 'error' => '僅支援 JPEG、PNG、GIF、WebP 圖片。'];
    }

    $dir = qb_uploads_root() . '/' . $bankId;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => '無法建立上載目錄。'];
    }

    $basename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    $dest = $dir . '/' . $basename;
    if (!move_uploaded_file($tmp, $dest)) {
        return ['ok' => false, 'error' => '無法儲存檔案。'];
    }

    $relative = 'uploads/question_bank/' . $bankId . '/' . $basename;
    $original = basename((string) ($file['name'] ?? $basename));
    $sortStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM qb_question_media WHERE question_id = ?');
    $sortStmt->execute([$questionId]);
    $sortOrder = (int) $sortStmt->fetchColumn();

    $ins = $pdo->prepare(
        'INSERT INTO qb_question_media (question_id, media_role, related_sort, file_path, original_name, mime_type, file_size, alt_zh, alt_en, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $questionId,
        $role,
        $relatedSort,
        $relative,
        $original,
        $mime,
        (int) ($file['size'] ?? 0),
        $altZh !== null && $altZh !== '' ? $altZh : null,
        $altEn !== null && $altEn !== '' ? $altEn : null,
        $sortOrder,
    ]);
    $mediaId = (int) $pdo->lastInsertId();
    $url = qb_media_public_url($relative);
    $alt = $altZh !== null && $altZh !== '' ? $altZh : ($altEn !== null && $altEn !== '' ? $altEn : $original);
    $markdown = '![' . str_replace(['[', ']'], ['\\[', '\\]'], $alt) . '](' . $url . ')';

    return [
        'ok' => true,
        'media' => [
            'id' => $mediaId,
            'question_id' => $questionId,
            'media_role' => $role,
            'related_sort' => $relatedSort,
            'file_path' => $relative,
            'url' => $url,
            'markdown' => $markdown,
            'original_name' => $original,
            'mime_type' => $mime,
            'file_size' => (int) ($file['size'] ?? 0),
            'alt_zh' => $altZh,
            'alt_en' => $altEn,
            'sort_order' => $sortOrder,
        ],
    ];
}

/**
 * @return array{ok:bool,error?:string}
 */
function qb_delete_media(PDO $pdo, int $bankId, int $mediaId): array
{
    $stmt = $pdo->prepare(
        'SELECT m.id, m.file_path FROM qb_question_media m
         INNER JOIN qb_questions q ON q.id = m.question_id
         WHERE m.id = ? AND q.bank_id = ? LIMIT 1'
    );
    $stmt->execute([$mediaId, $bankId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => '找不到附件。'];
    }

    $full = dirname(__DIR__) . '/' . ltrim(str_replace('\\', '/', (string) $row['file_path']), '/');
    if (is_file($full)) {
        @unlink($full);
    }
    $pdo->prepare('DELETE FROM qb_question_media WHERE id = ?')->execute([$mediaId]);
    return ['ok' => true];
}
