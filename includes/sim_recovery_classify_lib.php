<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/simulation_files.php';
require_once __DIR__ . '/simulation_disk_import.php';
require_once __DIR__ . '/sim_html_agent_lib.php';

const SIM_RECOVERY_CLASSIFY_BATCH = 8;
const SIM_RECOVERY_CLASSIFY_HTML_BYTES = 12000;

/**
 * @param list<array{id:int, slug:string, name_zh:string, name_en:string}> $subjects
 */
function sim_recovery_classify_system_prompt(array $subjects): string
{
    $slugLines = [];
    foreach ($subjects as $row) {
        $slugLines[] = '- ' . $row['slug'] . '（' . $row['name_zh'] . ' / ' . $row['name_en'] . '）';
    }
    $subjectBlock = implode("\n", $slugLines);

    return <<<TXT
你是香港中學科學模擬目錄助理。使用者會提供多個模擬 HTML 檔的路徑與摘錄。
請依 HKDSE／初中科學，為每一檔建議科目、繁體中文標題、英文標題與一句繁中摘要。

可用科目 slug（只能從下列擇一；若不確定選最接近者）：
{$subjectBlock}

只輸出 JSON 陣列，不要 Markdown，格式：
[
  {
    "path": "science/example.html",
    "subject_slug": "science",
    "title_zh": "繁體標題",
    "title_en": "English title",
    "summary_zh": "一句課堂用摘要",
    "confidence": "high"
  }
]
confidence 只能是 high、medium、low。path 必須與輸入完全一致。
TXT;
}

/**
 * @return array{ok:true,items:list<array<string,mixed>>}|array{ok:false,error:string,status:int}
 */
function sim_recovery_classify_extract_json(string $raw): array
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
        $path = sim_normalize_rel_path((string) ($row['path'] ?? ''));
        if ($path === null) {
            continue;
        }
        $out[] = [
            'path' => $path,
            'subject_slug' => strtolower(trim((string) ($row['subject_slug'] ?? ''))),
            'title_zh' => trim((string) ($row['title_zh'] ?? '')),
            'title_en' => trim((string) ($row['title_en'] ?? '')),
            'summary_zh' => trim((string) ($row['summary_zh'] ?? '')),
            'confidence' => strtolower(trim((string) ($row['confidence'] ?? 'medium'))),
        ];
    }
    if ($out === []) {
        return ['ok' => false, 'error' => '分類結果為空。', 'status' => 502];
    }

    return ['ok' => true, 'items' => $out];
}

/**
 * @param list<string> $paths
 * @param list<array{id:int, slug:string, name_zh:string, name_en:string}> $subjects
 * @return array{ok:true,items:list<array<string,mixed>>,model:string}|array{ok:false,error:string,status:int}
 */
function sim_recovery_classify_paths(PDO $pdo, array $paths, string $model, array $subjects): array
{
    $paths = array_values(array_filter(array_map(
        static fn ($p): ?string => sim_normalize_rel_path((string) $p),
        $paths
    )));
    if ($paths === []) {
        return ['ok' => false, 'error' => '沒有有效的檔案路徑。', 'status' => 422];
    }

    $slugToId = [];
    foreach ($subjects as $sub) {
        $slugToId[(string) $sub['slug']] = (int) $sub['id'];
    }
    $enriched = [];
    foreach (array_chunk($paths, SIM_RECOVERY_CLASSIFY_BATCH) as $batch) {
        $chunks = [];
        foreach ($batch as $path) {
            $html = sim_read_html_file($path);
            if ($html === null) {
                continue;
            }
            $snippet = mb_substr($html, 0, SIM_RECOVERY_CLASSIFY_HTML_BYTES, 'UTF-8');
            $title = sim_title_from_html_document($html);
            $chunks[] = "PATH: {$path}\nTITLE: {$title}\n---\n{$snippet}";
        }
        if ($chunks === []) {
            continue;
        }
        $chat = sim_xai_chat_complete(
            $model,
            sim_recovery_classify_system_prompt($subjects),
            implode("\n\n====\n\n", $chunks),
            'low'
        );
        if (!$chat['ok']) {
            return ['ok' => false, 'error' => $chat['error'], 'status' => $chat['status']];
        }
        $parsed = sim_recovery_classify_extract_json($chat['content']);
        if (!$parsed['ok']) {
            return ['ok' => false, 'error' => $parsed['error'], 'status' => $parsed['status']];
        }
        foreach ($parsed['items'] as $row) {
            $slug = (string) ($row['subject_slug'] ?? '');
            $row['subject_id'] = $slugToId[$slug] ?? null;
            $enriched[] = $row;
        }
    }
    if ($enriched === []) {
        return ['ok' => false, 'error' => '找不到可讀取的 HTML。', 'status' => 422];
    }

    return ['ok' => true, 'items' => $enriched, 'model' => $model];
}