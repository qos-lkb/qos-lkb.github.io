<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/simulations_lib.php';

function fc_ensure_unique_slug(PDO $pdo, string $base, ?int $exceptId = null): string
{
    $slug = substr(sim_slugify($base), 0, 190);
    if ($slug === '') {
        $slug = 'flashcard-set';
    }
    $candidate = $slug;
    $n = 2;
    while (true) {
        if ($exceptId === null) {
            $stmt = $pdo->prepare('SELECT id FROM flashcard_sets WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM flashcard_sets WHERE slug = ? AND id <> ? LIMIT 1');
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
function fc_get_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT fs.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                t.name_zh AS topic_zh, t.name_en AS topic_en
         FROM flashcard_sets fs
         LEFT JOIN subjects sub ON sub.id = fs.subject_id
         LEFT JOIN topics t ON t.id = fs.topic_id
         WHERE fs.id = ? LIMIT 1'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<string, mixed>|null
 */
function fc_get_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare(
        'SELECT fs.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                t.name_zh AS topic_zh, t.name_en AS topic_en
         FROM flashcard_sets fs
         LEFT JOIN subjects sub ON sub.id = fs.subject_id
         LEFT JOIN topics t ON t.id = fs.topic_id
         WHERE fs.slug = ? LIMIT 1'
    );
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * @return array<int, array<string, mixed>>
 */
function fc_fetch_published(PDO $pdo): array
{
    $sql = 'SELECT fs.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en,
                   (SELECT COUNT(*) FROM flashcard_cards c WHERE c.set_id = fs.id) AS card_count
            FROM flashcard_sets fs
            LEFT JOIN subjects sub ON sub.id = fs.subject_id
            LEFT JOIN topics t ON t.id = fs.topic_id
            WHERE fs.status = \'published\'
            ORDER BY COALESCE(sub.sort_order, 999999), fs.list_sort_order, fs.title_en';
    return $pdo->query($sql)->fetchAll() ?: [];
}

/**
 * @return array<int, array<string, mixed>>
 */
function fc_fetch_admin_list(PDO $pdo, ?int $ownerUserId): array
{
    $sql = 'SELECT fs.*, sub.name_zh AS subject_zh, sub.name_en AS subject_en,
                   t.name_zh AS topic_zh, t.name_en AS topic_en,
                   (SELECT COUNT(*) FROM flashcard_cards c WHERE c.set_id = fs.id) AS card_count
            FROM flashcard_sets fs
            LEFT JOIN subjects sub ON sub.id = fs.subject_id
            LEFT JOIN topics t ON t.id = fs.topic_id';
    if ($ownerUserId !== null) {
        $sql .= ' WHERE fs.owner_user_id = ?';
    }
    $sql .= ' ORDER BY fs.updated_at DESC';
    if ($ownerUserId !== null) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$ownerUserId]);
        return $stmt->fetchAll() ?: [];
    }
    return $pdo->query($sql)->fetchAll() ?: [];
}

function fc_public_row(array $row): array
{
    $out = [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title_zh' => $row['title_zh'],
        'title_en' => $row['title_en'],
        'description_zh' => $row['description_zh'],
        'description_en' => $row['description_en'],
        'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
        'topic_id' => $row['topic_id'] !== null ? (int) $row['topic_id'] : null,
        'subject_zh' => $row['subject_zh'] ?? null,
        'subject_en' => $row['subject_en'] ?? null,
        'topic_zh' => $row['topic_zh'] ?? null,
        'topic_en' => $row['topic_en'] ?? null,
        'list_sort_order' => (int) $row['list_sort_order'],
        'status' => $row['status'],
        'owner_user_id' => isset($row['owner_user_id']) && $row['owner_user_id'] !== null
            ? (int) $row['owner_user_id'] : null,
        'updated_at' => $row['updated_at'],
    ];
    if (isset($row['card_count'])) {
        $out['card_count'] = (int) $row['card_count'];
    }
    return $out;
}

/**
 * @return array<string, mixed>
 */
function fc_card_row(array $card, bool $includeBack): array
{
    $out = [
        'id' => (int) $card['id'],
        'set_id' => (int) $card['set_id'],
        'front_zh' => $card['front_zh'],
        'front_en' => $card['front_en'],
        'hint_zh' => $card['hint_zh'] ?? null,
        'hint_en' => $card['hint_en'] ?? null,
        'sort_order' => (int) $card['sort_order'],
    ];
    if ($includeBack) {
        $out['back_zh'] = $card['back_zh'];
        $out['back_en'] = $card['back_en'];
    }
    return $out;
}

/**
 * @return array<int, array<string, mixed>>
 */
function fc_fetch_cards(PDO $pdo, int $setId, bool $includeBack = true): array
{
    $stmt = $pdo->prepare('SELECT * FROM flashcard_cards WHERE set_id = ? ORDER BY sort_order, id');
    $stmt->execute([$setId]);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $out[] = fc_card_row($row, $includeBack);
    }
    return $out;
}

function fc_resolve_status(string $requested, bool $canPublishAny): string
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

function fc_fill_bilingual(string $zh, string $en): array
{
    $zh = trim($zh);
    $en = trim($en);
    if ($zh === '' && $en !== '') {
        $zh = $en;
    }
    if ($en === '' && $zh !== '') {
        $en = $zh;
    }
    return [$zh, $en];
}

function fc_normalize_answer(string $text): string
{
    $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
    return mb_strtolower(trim($text), 'UTF-8');
}

/**
 * @param array<int, mixed> $cards
 * @return string|null
 */
function fc_validate_cards(array $cards): ?string
{
    if ($cards === []) {
        return '至少需要一張卡片。';
    }
    foreach ($cards as $i => $card) {
        if (!is_array($card)) {
            return '第 ' . ($i + 1) . ' 張卡片格式無效。';
        }
        [$frontZh, $frontEn] = fc_fill_bilingual(
            (string) ($card['front_zh'] ?? ''),
            (string) ($card['front_en'] ?? '')
        );
        [$backZh, $backEn] = fc_fill_bilingual(
            (string) ($card['back_zh'] ?? ''),
            (string) ($card['back_en'] ?? '')
        );
        if ($frontZh === '' && $frontEn === '') {
            return '第 ' . ($i + 1) . ' 張卡片請填寫正面。';
        }
        if ($backZh === '' && $backEn === '') {
            return '第 ' . ($i + 1) . ' 張卡片請填寫背面。';
        }
    }
    return null;
}

/**
 * @param array{id:int,email:string,display_name:string} $user
 * @return array{ok:bool,error?:string,id?:int}
 */
function fc_save_from_payload(PDO $pdo, array $user, array $payload, bool $canPublishAny, bool $isAdmin): array
{
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $titleZh = trim((string) ($payload['title_zh'] ?? ''));
    $titleEn = trim((string) ($payload['title_en'] ?? ''));
    $descZh = trim((string) ($payload['description_zh'] ?? ''));
    $descEn = trim((string) ($payload['description_en'] ?? ''));
    $subjectId = isset($payload['subject_id']) && $payload['subject_id'] !== '' ? (int) $payload['subject_id'] : null;
    $topicId = isset($payload['topic_id']) && $payload['topic_id'] !== '' ? (int) $payload['topic_id'] : null;
    $listSort = (int) ($payload['list_sort_order'] ?? 0);
    $status = fc_resolve_status((string) ($payload['status'] ?? 'draft'), $canPublishAny);
    $slugInput = trim((string) ($payload['slug'] ?? ''));
    $cards = $payload['cards'] ?? null;

    if ($titleZh === '' && $titleEn === '') {
        return ['ok' => false, 'error' => '請至少填寫中文或英文標題。'];
    }
    [$titleZh, $titleEn] = fc_fill_bilingual($titleZh, $titleEn);
    [$descZh, $descEn] = fc_fill_bilingual($descZh, $descEn);

    if (is_array($cards) && $cards !== []) {
        $cardErr = fc_validate_cards($cards);
        if ($cardErr !== null) {
            return ['ok' => false, 'error' => $cardErr];
        }
    } elseif ($status === 'published' && is_array($cards) && $cards === []) {
        return ['ok' => false, 'error' => '發佈前至少需要一張卡片。'];
    }

    $ownerUserId = $user['id'];
    if ($isAdmin && isset($payload['owner_user_id']) && $payload['owner_user_id'] !== '') {
        $ownerUserId = (int) $payload['owner_user_id'];
    }

    try {
        $pdo->beginTransaction();

        if ($id > 0) {
            $row = fc_get_by_id($pdo, $id);
            if (!$row) {
                $pdo->rollBack();
                return ['ok' => false, 'error' => '找不到閃卡組。'];
            }
            if (!$canPublishAny && ((int) ($row['owner_user_id'] ?? 0) !== $user['id'])) {
                $pdo->rollBack();
                return ['ok' => false, 'error' => '無權編輯。'];
            }
            if (!$canPublishAny) {
                $ownerUserId = (int) $row['owner_user_id'];
            }
            $slug = $slugInput !== '' ? sim_slugify($slugInput) : (string) $row['slug'];
            $slug = fc_ensure_unique_slug($pdo, $slug, $id);
            $upd = $pdo->prepare(
                'UPDATE flashcard_sets SET slug=?, title_zh=?, title_en=?, description_zh=?, description_en=?,
                 subject_id=?, topic_id=?, list_sort_order=?, status=?, owner_user_id=?,
                 updated_at=CURRENT_TIMESTAMP WHERE id=?'
            );
            $upd->execute([
                $slug, $titleZh, $titleEn,
                $descZh !== '' ? $descZh : null,
                $descEn !== '' ? $descEn : null,
                $subjectId, $topicId, $listSort, $status, $ownerUserId, $id,
            ]);
        } else {
            $slug = fc_ensure_unique_slug($pdo, $slugInput !== '' ? $slugInput : $titleEn);
            $ins = $pdo->prepare(
                'INSERT INTO flashcard_sets (slug, title_zh, title_en, description_zh, description_en,
                 subject_id, topic_id, list_sort_order, status, owner_user_id)
                 VALUES (?,?,?,?,?,?,?,?,?,?)'
            );
            $ins->execute([
                $slug, $titleZh, $titleEn,
                $descZh !== '' ? $descZh : null,
                $descEn !== '' ? $descEn : null,
                $subjectId, $topicId, $listSort, $status, $ownerUserId,
            ]);
            $id = (int) $pdo->lastInsertId();
        }

        if (is_array($cards)) {
            $sync = fc_sync_cards($pdo, $id, $cards);
            if (!$sync['ok']) {
                $pdo->rollBack();
                return $sync;
            }
        }

        $pdo->commit();
        return ['ok' => true, 'id' => $id];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => '儲存失敗。'];
    }
}

/**
 * @param array<int, array<string, mixed>> $cards
 * @return array{ok:bool,error?:string}
 */
function fc_sync_cards(PDO $pdo, int $setId, array $cards): array
{
    $keepIds = [];
    $sort = 0;
    foreach ($cards as $card) {
        [$frontZh, $frontEn] = fc_fill_bilingual(
            (string) ($card['front_zh'] ?? ''),
            (string) ($card['front_en'] ?? '')
        );
        [$backZh, $backEn] = fc_fill_bilingual(
            (string) ($card['back_zh'] ?? ''),
            (string) ($card['back_en'] ?? '')
        );
        [$hintZh, $hintEn] = fc_fill_bilingual(
            (string) ($card['hint_zh'] ?? ''),
            (string) ($card['hint_en'] ?? '')
        );
        $cardId = isset($card['id']) ? (int) $card['id'] : 0;
        if ($cardId > 0) {
            $chk = $pdo->prepare('SELECT id FROM flashcard_cards WHERE id = ? AND set_id = ? LIMIT 1');
            $chk->execute([$cardId, $setId]);
            if (!$chk->fetch()) {
                $cardId = 0;
            }
        }
        if ($cardId > 0) {
            $upd = $pdo->prepare(
                'UPDATE flashcard_cards SET front_zh=?, front_en=?, back_zh=?, back_en=?,
                 hint_zh=?, hint_en=?, sort_order=? WHERE id=? AND set_id=?'
            );
            $upd->execute([
                $frontZh, $frontEn, $backZh, $backEn,
                $hintZh !== '' ? $hintZh : null,
                $hintEn !== '' ? $hintEn : null,
                $sort, $cardId, $setId,
            ]);
            $keepIds[] = $cardId;
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO flashcard_cards (set_id, front_zh, front_en, back_zh, back_en, hint_zh, hint_en, sort_order)
                 VALUES (?,?,?,?,?,?,?,?)'
            );
            $ins->execute([
                $setId, $frontZh, $frontEn, $backZh, $backEn,
                $hintZh !== '' ? $hintZh : null,
                $hintEn !== '' ? $hintEn : null,
                $sort,
            ]);
            $keepIds[] = (int) $pdo->lastInsertId();
        }
        $sort++;
    }

    if ($keepIds === []) {
        $pdo->prepare('DELETE FROM flashcard_cards WHERE set_id = ?')->execute([$setId]);
        return ['ok' => true];
    }
    $placeholders = implode(',', array_fill(0, count($keepIds), '?'));
    $delIds = $pdo->prepare("SELECT id FROM flashcard_cards WHERE set_id = ? AND id NOT IN ({$placeholders})");
    $delIds->execute(array_merge([$setId], $keepIds));
    $remove = array_map('intval', $delIds->fetchAll(PDO::FETCH_COLUMN) ?: []);
    if ($remove !== []) {
        fc_delete_cards_by_ids($pdo, $remove);
    }
    return ['ok' => true];
}

/**
 * @param list<int> $ids
 */
function fc_delete_cards_by_ids(PDO $pdo, array $ids): void
{
    if ($ids === []) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $pdo->prepare("DELETE FROM flashcard_card_reviews WHERE card_id IN ({$placeholders})")->execute($ids);
    $pdo->prepare("DELETE FROM flashcard_cards WHERE id IN ({$placeholders})")->execute($ids);
}

function fc_delete_by_id(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare('SELECT id FROM flashcard_cards WHERE set_id = ?');
    $stmt->execute([$id]);
    $cardIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    if ($cardIds !== []) {
        fc_delete_cards_by_ids($pdo, $cardIds);
    }
    $pdo->prepare('DELETE FROM flashcard_sets WHERE id = ?')->execute([$id]);
}

/**
 * @return array<int, array<string, mixed>>
 */
function fc_fetch_reviews_for_user(PDO $pdo, int $userId, int $setId): array
{
    $stmt = $pdo->prepare(
        'SELECT r.card_id, r.ease_factor, r.interval_days, r.repetitions, r.due_at, r.last_rating
         FROM flashcard_card_reviews r
         INNER JOIN flashcard_cards c ON c.id = r.card_id
         WHERE r.user_id = ? AND c.set_id = ?'
    );
    $stmt->execute([$userId, $setId]);
    $rows = $stmt->fetchAll() ?: [];
    $now = time();
    $out = [];
    foreach ($rows as $row) {
        $dueTs = strtotime((string) $row['due_at']) ?: 0;
        $out[] = [
            'card_id' => (int) $row['card_id'],
            'ease_factor' => (float) $row['ease_factor'],
            'interval_days' => (int) $row['interval_days'],
            'repetitions' => (int) $row['repetitions'],
            'due_at' => $row['due_at'],
            'last_rating' => $row['last_rating'],
            'is_due' => $dueTs <= $now,
        ];
    }
    return $out;
}

/**
 * @param array<string, mixed>|null $current
 * @return array{ease_factor:float,interval_days:int,repetitions:int,due_at:string,last_rating:string}
 */
function fc_sm2_next(?array $current, string $rating): array
{
    $ease = $current !== null ? (float) $current['ease_factor'] : 2.5;
    $interval = $current !== null ? (int) $current['interval_days'] : 0;
    $reps = $current !== null ? (int) $current['repetitions'] : 0;

    if ($rating === 'again') {
        $reps = 0;
        $interval = 1;
        $ease = max(1.3, $ease - 0.2);
    } elseif ($rating === 'easy') {
        $reps++;
        if ($reps === 1) {
            $interval = 4;
        } else {
            $interval = max(4, (int) round($interval * $ease * 1.3));
        }
        $ease += 0.15;
    } else {
        $reps++;
        if ($reps === 1) {
            $interval = 1;
        } elseif ($reps === 2) {
            $interval = 3;
        } else {
            $interval = max(1, (int) round($interval * $ease));
        }
        $ease += 0.05;
    }
    $ease = min(3.0, max(1.3, round($ease, 2)));
    $dueAt = (new DateTimeImmutable('now', new DateTimeZone('Asia/Hong_Kong')))
        ->modify('+' . $interval . ' days')
        ->format('Y-m-d H:i:s');

    return [
        'ease_factor' => $ease,
        'interval_days' => $interval,
        'repetitions' => $reps,
        'due_at' => $dueAt,
        'last_rating' => $rating,
    ];
}

/**
 * @return array{ok:bool,error?:string,review?:array<string,mixed>}
 */
function fc_apply_rating(PDO $pdo, int $userId, int $setId, int $cardId, string $rating): array
{
    if (!in_array($rating, ['again', 'good', 'easy'], true)) {
        return ['ok' => false, 'error' => '評等無效。'];
    }
    $chk = $pdo->prepare('SELECT id FROM flashcard_cards WHERE id = ? AND set_id = ? LIMIT 1');
    $chk->execute([$cardId, $setId]);
    if (!$chk->fetch()) {
        return ['ok' => false, 'error' => '找不到卡片。'];
    }

    $stmt = $pdo->prepare(
        'SELECT ease_factor, interval_days, repetitions FROM flashcard_card_reviews
         WHERE user_id = ? AND card_id = ? LIMIT 1'
    );
    $stmt->execute([$userId, $cardId]);
    $current = $stmt->fetch() ?: null;
    $next = fc_sm2_next($current ?: null, $rating);

    $upsert = $pdo->prepare(
        'INSERT INTO flashcard_card_reviews (user_id, card_id, ease_factor, interval_days, repetitions, due_at, last_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            ease_factor = VALUES(ease_factor),
            interval_days = VALUES(interval_days),
            repetitions = VALUES(repetitions),
            due_at = VALUES(due_at),
            last_rating = VALUES(last_rating)'
    );
    $upsert->execute([
        $userId,
        $cardId,
        $next['ease_factor'],
        $next['interval_days'],
        $next['repetitions'],
        $next['due_at'],
        $next['last_rating'],
    ]);
    $next['card_id'] = $cardId;
    $next['is_due'] = false;
    return ['ok' => true, 'review' => $next];
}

/**
 * @param array<int, array<string, mixed>> $cards
 * @return array<int, array<string, mixed>>
 */
function fc_build_quiz_items(array $cards): array
{
    $n = count($cards);
    $out = [];
    foreach ($cards as $card) {
        $item = [
            'card_id' => (int) $card['id'],
            'front_zh' => $card['front_zh'],
            'front_en' => $card['front_en'],
            'hint_zh' => $card['hint_zh'] ?? null,
            'hint_en' => $card['hint_en'] ?? null,
        ];
        if ($n >= 4) {
            $others = [];
            foreach ($cards as $other) {
                if ((int) $other['id'] === (int) $card['id']) {
                    continue;
                }
                $others[] = $other;
            }
            shuffle($others);
            $distractors = array_slice($others, 0, 3);
            $options = [
                [
                    'id' => (int) $card['id'],
                    'text_zh' => $card['back_zh'],
                    'text_en' => $card['back_en'],
                ],
            ];
            foreach ($distractors as $d) {
                $options[] = [
                    'id' => (int) $d['id'],
                    'text_zh' => $d['back_zh'],
                    'text_en' => $d['back_en'],
                ];
            }
            shuffle($options);
            $item['question_type'] = 'mcq';
            $item['options'] = $options;
        } else {
            $item['question_type'] = 'short_answer';
        }
        $out[] = $item;
    }
    shuffle($out);
    return $out;
}

/**
 * @param array<int, mixed> $responses
 * @return array{ok:bool,error?:string,score?:int,max_score?:int,results?:list<array<string,mixed>>}
 */
function fc_grade_attempt(PDO $pdo, array $setRow, array $responses): array
{
    $cards = [];
    foreach (fc_fetch_cards($pdo, (int) $setRow['id'], true) as $c) {
        $cards[(int) $c['id']] = $c;
    }
    if ($cards === []) {
        return ['ok' => false, 'error' => '此閃卡組沒有卡片。'];
    }

    $score = 0;
    $results = [];
    foreach ($responses as $resp) {
        if (!is_array($resp)) {
            continue;
        }
        $cardId = (int) ($resp['card_id'] ?? 0);
        if ($cardId <= 0 || !isset($cards[$cardId])) {
            continue;
        }
        $card = $cards[$cardId];
        $isCorrect = false;
        $selectedId = isset($resp['selected_card_id']) && $resp['selected_card_id'] !== ''
            ? (int) $resp['selected_card_id'] : null;
        $responseText = isset($resp['response_text']) ? (string) $resp['response_text'] : '';

        if ($selectedId !== null) {
            $isCorrect = $selectedId === $cardId;
        } else {
            $norm = fc_normalize_answer($responseText);
            if ($norm !== '') {
                $isCorrect = $norm === fc_normalize_answer((string) $card['back_zh'])
                    || $norm === fc_normalize_answer((string) $card['back_en']);
            }
        }
        if ($isCorrect) {
            $score++;
        }
        $results[] = [
            'card_id' => $cardId,
            'is_correct' => $isCorrect,
            'back_zh' => $card['back_zh'],
            'back_en' => $card['back_en'],
        ];
    }
    if ($results === []) {
        return ['ok' => false, 'error' => '作答紀錄無效。'];
    }
    return [
        'ok' => true,
        'score' => $score,
        'max_score' => count($results),
        'results' => $results,
    ];
}

/**
 * @return array{ok:bool,error?:string,attempt_id?:int,score?:int,max_score?:int,results?:list<array<string,mixed>>}
 */
function fc_record_attempt(PDO $pdo, int $userId, array $setRow, array $graded): array
{
    $ins = $pdo->prepare(
        'INSERT INTO learning_attempts (user_id, source_type, source_id, subject_id, topic_id, score, max_score, submitted_at)
         VALUES (?, \'flashcard_set\', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
    );
    $ins->execute([
        $userId,
        (int) $setRow['id'],
        $setRow['subject_id'] !== null ? (int) $setRow['subject_id'] : null,
        $setRow['topic_id'] !== null ? (int) $setRow['topic_id'] : null,
        $graded['score'],
        $graded['max_score'],
    ]);
    $attemptId = (int) $pdo->lastInsertId();
    $respIns = $pdo->prepare(
        'INSERT INTO learning_responses (attempt_id, question_id, selected_option_index, is_correct, response_text)
         VALUES (?, ?, NULL, ?, NULL)'
    );
    foreach ($graded['results'] as $r) {
        $respIns->execute([$attemptId, (int) $r['card_id'], $r['is_correct'] ? 1 : 0]);
    }
    return [
        'ok' => true,
        'attempt_id' => $attemptId,
        'score' => $graded['score'],
        'max_score' => $graded['max_score'],
        'results' => $graded['results'],
    ];
}
