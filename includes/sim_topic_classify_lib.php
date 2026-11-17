<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/simulation_files.php';
require_once __DIR__ . '/subjects_lib.php';
require_once __DIR__ . '/sim_html_agent_lib.php';
require_once __DIR__ . '/simulations_lib.php';

const SIM_TOPIC_CLASSIFY_BATCH = 8;
const SIM_TOPIC_CLASSIFY_HTML_BYTES = 10000;

/**
 * @return array{
 *   items: list<array<string, mixed>>,
 *   subjects: list<array<string, mixed>>,
 *   counts: array<string, int>
 * }
 */
function sim_topic_classify_plan(PDO $pdo, string $search = ''): array
{
    $subjects = subjects_list_with_topics($pdo);
    $sql = 'SELECT s.id, s.slug, s.title_zh, s.title_en, s.summary_zh, s.summary_en,
                   s.html_path, s.subject_id, s.topic_id, s.status
            FROM simulations s
            LEFT JOIN topics t ON t.id = s.topic_id
            WHERE s.topic_id IS NULL OR s.topic_id = 0 OR t.id IS NULL
            ORDER BY s.id ASC';
    $rows = $pdo->query($sql)->fetchAll() ?: [];
    $needle = mb_strtolower(trim($search), 'UTF-8');
    $items = [];
    foreach ($rows as $row) {
        $item = [
            'id' => (int) $row['id'],
            'slug' => (string) $row['slug'],
            'title_zh' => (string) ($row['title_zh'] ?? ''),
            'title_en' => (string) ($row['title_en'] ?? ''),
            'summary_zh' => (string) ($row['summary_zh'] ?? ''),
            'html_path' => (string) ($row['html_path'] ?? ''),
            'subject_id' => $row['subject_id'] !== null ? (int) $row['subject_id'] : null,
            'topic_id' => $row['topic_id'] !== null ? (int) $row['topic_id'] : null,
            'status' => (string) ($row['status'] ?? ''),
        ];
        if ($needle !== '') {
            $hay = mb_strtolower(implode(' ', [
                $item['slug'],
                $item['title_zh'],
                $item['title_en'],
                $item['html_path'],
            ]), 'UTF-8');
            if (!str_contains($hay, $needle)) {
                continue;
            }
        }
        $items[] = $item;
    }

    return [
        'items' => $items,
        'subjects' => $subjects,
        'counts' => [
            'unclassified' => count($items),
            'topics' => array_sum(array_map(static fn (array $s): int => count($s['topics'] ?? []), $subjects)),
        ],
    ];
}

/**
 * @param list<array<string, mixed>> $subjects
 */
function sim_topic_classify_system_prompt(array $subjects): string
{
    $lines = [];
    foreach ($subjects as $sub) {
        $lines[] = '科目 ' . ($sub['slug'] ?? '') . '（' . ($sub['name_zh'] ?? '') . ' / ' . ($sub['name_en'] ?? '') . '）:';
        foreach ($sub['topics'] ?? [] as $tp) {
            $lines[] = '  - topic_slug=' . ($tp['slug'] ?? '') . '｜' . ($tp['name_zh'] ?? '') . ' / ' . ($tp['name_en'] ?? '');
        }
        if (($sub['topics'] ?? []) === []) {
            $lines[] = '  （尚無課題）';
        }
    }
    $catalog = implode("\n", $lines);

    return <<<TXT
你是香港中學（HKDSE／初中）科學課程目錄助理。請把每個模擬程式分到最合適的「課題／單元」（topic）。

現有科目與課題：
{$catalog}

規則：
- 優先使用現有 topic_slug（同一科目內）。
- 若沒有合適課題，設 is_new_topic 為 true，並給繁中、英文課題名稱；topic_slug 用小寫英文短橫線。
- subject_slug 必須是上列科目之一。若模擬已有科目，盡量沿用。
- 只輸出 JSON 陣列，不要 Markdown。

[
  {
    "sim_id": 1,
    "subject_slug": "physics",
    "topic_slug": "heat-transfer",
    "is_new_topic": false,
    "topic_name_zh": "熱傳遞",
    "topic_name_en": "Heat Transfer",
    "confidence": "high"
  }
]
confidence 只能是 high、medium、low。sim_id 必須與輸入一致。
TXT;
}

/**
 * @return array{ok:true,items:list<array<string,mixed>>}|array{ok:false,error:string,status:int}
 */
function sim_topic_classify_extract_json(string $raw): array
{
    $text = trim($raw);
    if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $text, $m)) {
        $text = trim($m[1]);
    }
    $start = strpos($text, '[');
    $end = strrpos($text, ']');
    if ($start === false || $end === false || $end <= $start) {
        return ['ok' => false, 'error' => '模型未回傳有效 JSON。', 'status' => 502];
    }
    $json = json_decode(substr($text, $start, $end - $start + 1), true);
    if (!is_array($json)) {
        return ['ok' => false, 'error' => '無法解析分類結果。', 'status' => 502];
    }
    $out = [];
    foreach ($json as $row) {
        if (!is_array($row)) {
            continue;
        }
        $simId = (int) ($row['sim_id'] ?? 0);
        if ($simId <= 0) {
            continue;
        }
        $out[] = [
            'sim_id' => $simId,
            'subject_slug' => strtolower(trim((string) ($row['subject_slug'] ?? ''))),
            'topic_slug' => strtolower(trim((string) ($row['topic_slug'] ?? ''))),
            'is_new_topic' => !empty($row['is_new_topic']) && $row['is_new_topic'] !== 'false',
            'topic_name_zh' => trim((string) ($row['topic_name_zh'] ?? '')),
            'topic_name_en' => trim((string) ($row['topic_name_en'] ?? '')),
            'confidence' => strtolower(trim((string) ($row['confidence'] ?? 'medium'))),
        ];
    }
    if ($out === []) {
        return ['ok' => false, 'error' => '分類結果為空。', 'status' => 502];
    }

    return ['ok' => true, 'items' => $out];
}

/**
 * @param list<int> $ids
 * @param list<array<string, mixed>> $subjects
 * @return array{ok:true,items:list<array<string,mixed>>,model:string}|array{ok:false,error:string,status:int}
 */
function sim_topic_classify_ids(PDO $pdo, array $ids, string $model, array $subjects): array
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn (int $id): bool => $id > 0)));
    if ($ids === []) {
        return ['ok' => false, 'error' => '沒有選取任何模擬。', 'status' => 422];
    }

    $subjectBySlug = [];
    $topicBySubjectSlug = [];
    foreach ($subjects as $sub) {
        $sslug = strtolower((string) ($sub['slug'] ?? ''));
        $subjectBySlug[$sslug] = $sub;
        foreach ($sub['topics'] ?? [] as $tp) {
            $topicBySubjectSlug[$sslug][strtolower((string) ($tp['slug'] ?? ''))] = $tp;
        }
    }

    $enriched = [];
    foreach (array_chunk($ids, SIM_TOPIC_CLASSIFY_BATCH) as $batch) {
        $chunks = [];
        foreach ($batch as $id) {
            $row = sim_get_by_id($pdo, $id);
            if ($row === null) {
                continue;
            }
            $html = '';
            $path = (string) ($row['html_path'] ?? '');
            if ($path !== '') {
                $rawHtml = sim_read_html_file($path);
                if ($rawHtml !== null) {
                    $html = mb_substr($rawHtml, 0, SIM_TOPIC_CLASSIFY_HTML_BYTES, 'UTF-8');
                }
            }
            $chunks[] = 'SIM_ID: ' . $id
                . "\nSLUG: " . ($row['slug'] ?? '')
                . "\nTITLE_ZH: " . ($row['title_zh'] ?? '')
                . "\nTITLE_EN: " . ($row['title_en'] ?? '')
                . "\nSUMMARY: " . ($row['summary_zh'] ?? '')
                . "\nHTML_PATH: " . $path
                . "\nSUBJECT_ID: " . ($row['subject_id'] ?? '')
                . "\n---\n" . $html;
        }
        if ($chunks === []) {
            continue;
        }
        $chat = sim_xai_chat_complete(
            $model,
            sim_topic_classify_system_prompt($subjects),
            implode("\n\n====\n\n", $chunks),
            'low'
        );
        if (!$chat['ok']) {
            return ['ok' => false, 'error' => $chat['error'], 'status' => $chat['status']];
        }
        $parsed = sim_topic_classify_extract_json($chat['content']);
        if (!$parsed['ok']) {
            return ['ok' => false, 'error' => $parsed['error'], 'status' => $parsed['status']];
        }
        $idSet = array_fill_keys($batch, true);
        foreach ($parsed['items'] as $row) {
            $simId = (int) $row['sim_id'];
            if (!isset($idSet[$simId])) {
                continue;
            }
            $sslug = (string) $row['subject_slug'];
            $sub = $subjectBySlug[$sslug] ?? null;
            $row['subject_id'] = $sub ? (int) $sub['id'] : null;
            $tslug = (string) $row['topic_slug'];
            $existing = ($sub && $tslug !== '') ? ($topicBySubjectSlug[$sslug][$tslug] ?? null) : null;
            if ($existing) {
                $row['is_new_topic'] = false;
                $row['topic_id'] = (int) $existing['id'];
                if ($row['topic_name_zh'] === '') {
                    $row['topic_name_zh'] = (string) $existing['name_zh'];
                }
                if ($row['topic_name_en'] === '') {
                    $row['topic_name_en'] = (string) $existing['name_en'];
                }
            } else {
                $row['is_new_topic'] = true;
                $row['topic_id'] = null;
            }
            $enriched[] = $row;
        }
    }
    if ($enriched === []) {
        return ['ok' => false, 'error' => '找不到可分類的模擬。', 'status' => 422];
    }

    return ['ok' => true, 'items' => $enriched, 'model' => $model];
}

/**
 * @param list<array<string, mixed>> $items
 * @return array{ok:bool,updated:int,created_topics:int,errors:list<string>}
 */
function sim_topic_classify_apply(PDO $pdo, array $items, array $user, bool $isAdmin): array
{
    $updated = 0;
    $createdTopics = 0;
    $errors = [];
    foreach ($items as $row) {
        if (!is_array($row)) {
            continue;
        }
        $simId = (int) ($row['sim_id'] ?? 0);
        if ($simId <= 0) {
            continue;
        }
        $subjectId = isset($row['subject_id']) && $row['subject_id'] !== '' ? (int) $row['subject_id'] : 0;
        $topicId = isset($row['topic_id']) && $row['topic_id'] !== '' ? (int) $row['topic_id'] : 0;
        $create = isset($row['create_topic']) && is_array($row['create_topic']) ? $row['create_topic'] : null;
        if ($topicId <= 0 && $create !== null) {
            $cSid = (int) ($create['subject_id'] ?? $subjectId);
            $found = topics_find_or_create(
                $pdo,
                $cSid,
                (string) ($create['name_en'] ?? ''),
                (string) ($create['name_zh'] ?? ''),
                (string) ($create['slug'] ?? '')
            );
            if (!$found['ok']) {
                $errors[] = '#' . $simId . ' ' . ($found['error'] ?? '無法建立課題');
                continue;
            }
            $topicId = (int) $found['id'];
            $subjectId = $cSid;
            if (!empty($found['created'])) {
                $createdTopics++;
            }
        }
        if ($subjectId <= 0 || $topicId <= 0) {
            $errors[] = '#' . $simId . ' 缺少科目或課題。';
            continue;
        }
        $r = sim_patch_classification($pdo, $simId, [
            'subject_id' => $subjectId,
            'topic_id' => $topicId,
        ], $user, $isAdmin);
        if (!$r['ok']) {
            $errors[] = '#' . $simId . ' ' . ($r['error'] ?? '儲存失敗');
            continue;
        }
        $updated++;
    }

    return [
        'ok' => $updated > 0 || $errors === [],
        'updated' => $updated,
        'created_topics' => $createdTopics,
        'errors' => $errors,
    ];
}
