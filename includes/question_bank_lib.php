<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

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
function qb_fetch_questions(PDO $pdo, int $bankId, bool $includeAnswers = false): array
{
    $stmt = $pdo->prepare('SELECT * FROM qb_questions WHERE bank_id = ? ORDER BY sort_order, id');
    $stmt->execute([$bankId]);
    $questions = $stmt->fetchAll() ?: [];

    $optStmt = $pdo->prepare('SELECT * FROM qb_mcq_options WHERE question_id = ? ORDER BY sort_order, id');
    $partStmt = $pdo->prepare('SELECT * FROM qb_question_parts WHERE question_id = ? ORDER BY sort_order, id');
    $blankStmt = $pdo->prepare('SELECT * FROM qb_fill_blanks WHERE question_id = ? ORDER BY sort_order, blank_index, id');

    foreach ($questions as &$q) {
        $qId = (int) $q['id'];
        $type = (string) $q['question_type'];

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

        if (!$includeAnswers) {
            unset($q['model_answer_zh'], $q['model_answer_en'], $q['true_false_answer']);
        } elseif ($type === 'true_false' && $q['true_false_answer'] !== null) {
            $q['true_false_answer'] = (int) $q['true_false_answer'];
        }
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

    foreach ($questions as $i => $q) {
        $n = $i + 1;
        $type = (string) ($q['question_type'] ?? 'mcq');
        if (!in_array($type, $validTypes, true)) {
            return '第 ' . $n . ' 題題型無效。';
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

function qb_sync_questions(PDO $pdo, int $bankId, array $questions): void
{
    $existing = $pdo->prepare('SELECT id FROM qb_questions WHERE bank_id = ?');
    $existing->execute([$bankId]);
    $oldIds = array_map('intval', $existing->fetchAll(PDO::FETCH_COLUMN) ?: []);

    if ($oldIds !== []) {
        $in = implode(',', array_fill(0, count($oldIds), '?'));
        $pdo->prepare("DELETE FROM qb_mcq_options WHERE question_id IN ($in)")->execute($oldIds);
        $pdo->prepare("DELETE FROM qb_question_parts WHERE question_id IN ($in)")->execute($oldIds);
        $pdo->prepare("DELETE FROM qb_fill_blanks WHERE question_id IN ($in)")->execute($oldIds);
    }
    $pdo->prepare('DELETE FROM qb_questions WHERE bank_id = ?')->execute([$bankId]);

    $qIns = $pdo->prepare(
        'INSERT INTO qb_questions (bank_id, question_type, sort_order, stem_zh, stem_en, explanation_zh, explanation_en, model_answer_zh, model_answer_en, true_false_answer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $oIns = $pdo->prepare(
        'INSERT INTO qb_mcq_options (question_id, sort_order, text_zh, text_en, is_correct) VALUES (?, ?, ?, ?, ?)'
    );
    $pIns = $pdo->prepare(
        'INSERT INTO qb_question_parts (question_id, part_label, sort_order, prompt_zh, prompt_en, model_answer_zh, model_answer_en, marks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $bIns = $pdo->prepare(
        'INSERT INTO qb_fill_blanks (question_id, blank_index, acceptable_answer_zh, acceptable_answer_en, sort_order)
         VALUES (?, ?, ?, ?, ?)'
    );

    $partLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

    foreach ($questions as $sort => $q) {
        $type = (string) ($q['question_type'] ?? 'mcq');
        [$stemZh, $stemEn] = qb_normalize_bilingual(
            trim((string) ($q['stem_zh'] ?? '')),
            trim((string) ($q['stem_en'] ?? ''))
        );

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

        $qIns->execute([
            $bankId,
            $type,
            (int) ($q['sort_order'] ?? $sort),
            $stemZh,
            $stemEn,
            trim((string) ($q['explanation_zh'] ?? '')) ?: null,
            trim((string) ($q['explanation_en'] ?? '')) ?: null,
            $modelZh,
            $modelEn,
            $tfAnswer,
        ]);
        $questionId = (int) $pdo->lastInsertId();

        if ($type === 'mcq') {
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
        qb_sync_questions($pdo, $id, is_array($questions) ? $questions : []);
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
    qb_sync_questions($pdo, $newId, is_array($questions) ? $questions : []);
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
        $in = implode(',', array_fill(0, count($qIds), '?'));
        $pdo->prepare("DELETE FROM qb_mcq_options WHERE question_id IN ($in)")->execute($qIds);
        $pdo->prepare("DELETE FROM qb_question_parts WHERE question_id IN ($in)")->execute($qIds);
        $pdo->prepare("DELETE FROM qb_fill_blanks WHERE question_id IN ($in)")->execute($qIds);
    }
    $pdo->prepare('DELETE FROM qb_questions WHERE bank_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM question_banks WHERE id = ?')->execute([$id]);
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
