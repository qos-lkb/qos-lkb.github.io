<?php

declare(strict_types=1);

/**
 * Pure summer-homework grading helpers (no DB).
 * Loaded by summer_homework_lib.php; safe for unit tests in isolation.
 */

function sh_normalize_fill_answer(string $s): string
{
    $s = trim(mb_strtolower($s, 'UTF-8'));
    $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
    return $s;
}

/** @return list<string> */
function sh_question_types(): array
{
    return ['mcq', 'fill_blank', 'true_false', 'short_answer', 'long_answer'];
}

function sh_normalize_question_type(string $type): string
{
    $type = trim($type);
    return in_array($type, sh_question_types(), true) ? $type : 'mcq';
}

/**
 * Grade responses. Auto-scored types count toward pass %; long_answer is excluded (manual).
 *
 * @param list<array<string, mixed>> $questionsWithAnswers
 * @param array<string, mixed> $responses
 * @return array{score:float,max_score:float,percent:float,passed:bool,details:list<array<string,mixed>>}
 */
function sh_grade_responses(array $questionsWithAnswers, array $responses, float $passPercent = 80.0): array
{
    $score = 0.0;
    $max = 0.0;
    $details = [];

    foreach ($questionsWithAnswers as $q) {
        $qid = (int) $q['id'];
        $type = sh_normalize_question_type((string) $q['question_type']);
        $resp = $responses[(string) $qid] ?? $responses[$qid] ?? null;
        $detail = match ($type) {
            'mcq' => sh_grade_mcq($q, $resp),
            'fill_blank' => sh_grade_fill_blank($q, $resp),
            'true_false' => sh_grade_true_false($q, $resp),
            'short_answer' => sh_grade_short_answer($q, $resp),
            'long_answer' => sh_grade_long_answer($q, $resp),
            default => [
                'question_id' => $qid,
                'type' => $type,
                'correct' => false,
                'score' => 0.0,
                'max' => 0.0,
            ],
        };
        $details[] = $detail;
        if (empty($detail['exclude_from_auto'])) {
            $score += (float) ($detail['score'] ?? 0);
            $max += (float) ($detail['max'] ?? 0);
        }
    }

    $percent = $max > 0 ? round(($score / $max) * 100, 2) : 0.0;
    $passed = $percent >= $passPercent;

    return [
        'score' => $score,
        'max_score' => $max,
        'percent' => $percent,
        'passed' => $passed,
        'details' => $details,
    ];
}

/**
 * Map attempt responses onto current question ids.
 * Prefer id keys when they still match; otherwise map by sort order
 * (legacy attempts after delete-and-recreate of questions).
 *
 * @param list<array<string, mixed>> $questions
 * @param array<string|int, mixed> $responses
 * @return array<string, mixed>
 */
function sh_align_responses_to_questions(array $questions, array $responses): array
{
    if ($questions === [] || $responses === []) {
        return is_array($responses) ? $responses : [];
    }

    $idHits = 0;
    foreach ($questions as $q) {
        $qid = (int) ($q['id'] ?? 0);
        if ($qid <= 0) {
            continue;
        }
        if (array_key_exists((string) $qid, $responses) || array_key_exists($qid, $responses)) {
            $idHits++;
        }
    }

    $threshold = max(1, (int) ceil(count($questions) / 2));
    if ($idHits >= $threshold) {
        return $responses;
    }

    $oldKeys = array_keys($responses);
    usort($oldKeys, static fn ($a, $b): int => (int) $a <=> (int) $b);

    $aligned = [];
    foreach ($questions as $i => $q) {
        if (!isset($oldKeys[$i])) {
            break;
        }
        $qid = (int) ($q['id'] ?? 0);
        if ($qid <= 0) {
            continue;
        }
        $k = $oldKeys[$i];
        $aligned[(string) $qid] = $responses[$k] ?? $responses[(string) $k] ?? null;
    }

    return $aligned;
}

/**
 * @param array<string, mixed> $q
 * @param mixed $resp
 * @return array<string, mixed>
 */
function sh_grade_mcq(array $q, mixed $resp): array
{
    $qid = (int) $q['id'];
    $correctIdx = null;
    $optionSnapshot = [];
    foreach ($q['options'] ?? [] as $i => $o) {
        $idx = (int) $i;
        $isCorrect = !empty($o['is_correct']);
        if ($isCorrect && $correctIdx === null) {
            $correctIdx = $idx;
        }
        $optionSnapshot[] = [
            'index' => $idx,
            'label' => chr(65 + $idx),
            'text_zh' => (string) ($o['text_zh'] ?? ''),
            'text_en' => (string) ($o['text_en'] ?? ''),
            'is_correct' => $isCorrect,
        ];
    }
    $selected = is_array($resp) && isset($resp['selected_option_index'])
        ? (int) $resp['selected_option_index']
        : null;
    $ok = $correctIdx !== null && $selected === $correctIdx;

    return [
        'question_id' => $qid,
        'type' => 'mcq',
        'correct' => $ok,
        'score' => $ok ? 1.0 : 0.0,
        'max' => 1.0,
        'selected_option_index' => $selected,
        'correct_option_index' => $correctIdx,
        'options' => $optionSnapshot,
    ];
}

/**
 * @param array<string, mixed> $q
 * @param mixed $resp
 * @return array<string, mixed>
 */
function sh_grade_fill_blank(array $q, mixed $resp): array
{
    $qid = (int) $q['id'];
    $blanks = $q['blanks'] ?? [];
    $answers = is_array($resp) && isset($resp['blanks']) && is_array($resp['blanks'])
        ? $resp['blanks']
        : [];
    $blankDetails = [];
    $score = 0.0;
    $max = 0.0;
    foreach ($blanks as $bi => $blank) {
        $max += 1;
        $given = isset($answers[$bi])
            ? (string) $answers[$bi]
            : (isset($answers[(string) $bi]) ? (string) $answers[(string) $bi] : '');
        $norm = sh_normalize_fill_answer($given);
        $acceptList = [];
        if (isset($blank['acceptable_answers']) && is_array($blank['acceptable_answers'])) {
            foreach ($blank['acceptable_answers'] as $ans) {
                if (!is_array($ans)) {
                    continue;
                }
                $acceptList[] = sh_normalize_fill_answer((string) ($ans['acceptable_answer_zh'] ?? ''));
                $acceptList[] = sh_normalize_fill_answer((string) ($ans['acceptable_answer_en'] ?? ''));
            }
        } else {
            $acceptList[] = sh_normalize_fill_answer((string) ($blank['acceptable_answer_zh'] ?? ''));
            $acceptList[] = sh_normalize_fill_answer((string) ($blank['acceptable_answer_en'] ?? ''));
        }
        $acceptList = array_values(array_filter($acceptList, static fn (string $s): bool => $s !== ''));
        $ok = $norm !== '' && in_array($norm, $acceptList, true);
        if ($ok) {
            $score += 1;
        }
        $blankDetails[] = [
            'blank_index' => (int) ($blank['blank_index'] ?? ($bi + 1)),
            'given' => $given,
            'correct' => $ok,
            'acceptable_answers' => $acceptList,
        ];
    }

    return [
        'question_id' => $qid,
        'type' => 'fill_blank',
        'blanks' => $blankDetails,
        'correct' => $blankDetails !== [] && !in_array(false, array_column($blankDetails, 'correct'), true),
        'score' => $score,
        'max' => $max,
    ];
}

/**
 * @param array<string, mixed> $q
 * @param mixed $resp
 * @return array<string, mixed>
 */
function sh_grade_true_false(array $q, mixed $resp): array
{
    $qid = (int) $q['id'];
    $correct = !empty($q['correct_bool']);
    $selected = null;
    if (is_array($resp) && array_key_exists('selected_bool', $resp)) {
        $selected = (bool) $resp['selected_bool'];
    } elseif (is_array($resp) && array_key_exists('value', $resp)) {
        $selected = (bool) $resp['value'];
    }
    $ok = $selected !== null && $selected === $correct;

    return [
        'question_id' => $qid,
        'type' => 'true_false',
        'correct' => $ok,
        'score' => $ok ? 1.0 : 0.0,
        'max' => 1.0,
        'selected_bool' => $selected,
        'correct_bool' => $correct,
    ];
}

/**
 * @param array<string, mixed> $q
 * @param mixed $resp
 * @return array<string, mixed>
 */
function sh_grade_short_answer(array $q, mixed $resp): array
{
    $qid = (int) $q['id'];
    $given = is_array($resp) ? trim((string) ($resp['text'] ?? $resp['answer'] ?? '')) : '';
    $norm = sh_normalize_fill_answer($given);
    $acceptList = [];
    foreach ($q['acceptable_answers'] ?? [] as $ans) {
        if (!is_array($ans)) {
            continue;
        }
        $acceptList[] = sh_normalize_fill_answer((string) ($ans['acceptable_answer_zh'] ?? ''));
        $acceptList[] = sh_normalize_fill_answer((string) ($ans['acceptable_answer_en'] ?? ''));
    }
    $acceptList = array_values(array_filter($acceptList, static fn (string $s): bool => $s !== ''));
    $ok = $norm !== '' && in_array($norm, $acceptList, true);

    return [
        'question_id' => $qid,
        'type' => 'short_answer',
        'correct' => $ok,
        'score' => $ok ? 1.0 : 0.0,
        'max' => 1.0,
        'given' => $given,
        'acceptable_answers' => $acceptList,
    ];
}

/**
 * Long answer: not auto-scored; excluded from pass percent.
 *
 * @param array<string, mixed> $q
 * @param mixed $resp
 * @return array<string, mixed>
 */
function sh_grade_long_answer(array $q, mixed $resp): array
{
    $qid = (int) $q['id'];
    $text = is_array($resp) ? trim((string) ($resp['text'] ?? '')) : '';
    $maxScore = max(0.5, (float) ($q['max_score'] ?? 5));

    return [
        'question_id' => $qid,
        'type' => 'long_answer',
        'correct' => null,
        'needs_marking' => true,
        'exclude_from_auto' => true,
        'score' => 0.0,
        'max' => $maxScore,
        'manual_score' => null,
        'given' => $text,
    ];
}
