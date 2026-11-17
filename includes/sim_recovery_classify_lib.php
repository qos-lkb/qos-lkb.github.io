<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/simulation_files.php';
require_once __DIR__ . '/simulation_disk_import.php';
require_once __DIR__ . '/sim_html_agent_lib.php';

const SIM_RECOVERY_CLASSIFY_MAX_ITEMS = 8;
const SIM_RECOVERY_CLASSIFY_HTML_BYTES = 12000;
const SIM_RECOVERY_CLASSIFY_MAX_TOKENS = 4096;

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
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => '伺服器未啟用網路連線元件。', 'status' => 503];
    }
    $apiKey = config_xai_api_key();
    if ($apiKey === '') {
        return ['ok' => false, 'error' => '尚未設定 XAI_API_KEY，無法使用 AI 分類。', 'status' => 503];
    }

    $paths = array_values(array_filter(array_map(
        static fn ($p): ?string => sim_normalize_rel_path((string) $p),
        $paths
    )));
    if ($paths === []) {
        return ['ok' => false, 'error' => '沒有有效的檔案路徑。', 'status' => 422];
    }
    if (count($paths) > SIM_RECOVERY_CLASSIFY_MAX_ITEMS) {
        return ['ok' => false, 'error' => '一次最多分類 ' . SIM_RECOVERY_CLASSIFY_MAX_ITEMS . ' 個檔案。', 'status' => 422];
    }

    $chunks = [];
    foreach ($paths as $path) {
        $html = sim_read_html_file($path);
        if ($html === null) {
            continue;
        }
        $snippet = mb_substr($html, 0, SIM_RECOVERY_CLASSIFY_HTML_BYTES, 'UTF-8');
        $title = sim_title_from_html_document($html);
        $chunks[] = "PATH: {$path}\nTITLE: {$title}\n---\n{$snippet}";
    }
    if ($chunks === []) {
        return ['ok' => false, 'error' => '找不到可讀取的 HTML。', 'status' => 422];
    }

    $userMessage = implode("\n\n====\n\n", $chunks);
    $body = [
        'model' => $model,
        'stream' => false,
        'temperature' => 0.1,
        'max_tokens' => SIM_RECOVERY_CLASSIFY_MAX_TOKENS,
        'messages' => [
            ['role' => 'system', 'content' => sim_recovery_classify_system_prompt($subjects)],
            ['role' => 'user', 'content' => $userMessage],
        ],
    ];
    $payload = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        return ['ok' => false, 'error' => '無法送出分類請求。', 'status' => 500];
    }

    $ch = curl_init(SIM_HTML_AGENT_UPSTREAM_URL);
    if ($ch === false) {
        return ['ok' => false, 'error' => '無法連線到模型服務。', 'status' => 503];
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($raw === false || $errno !== 0) {
        return [
            'ok' => false,
            'error' => $errno === 28 ? '模型回應逾時，請減少勾選數量後再試。' : '無法連線到模型服務。',
            'status' => 503,
        ];
    }
    if ($status >= 400 || !is_string($raw)) {
        return ['ok' => false, 'error' => '模型服務回應失敗。', 'status' => 502];
    }

    $json = json_decode($raw, true);
    if (!is_array($json)) {
        return ['ok' => false, 'error' => '模型服務回應無效。', 'status' => 502];
    }
    $content = '';
    foreach (($json['choices'] ?? []) as $choice) {
        if (!is_array($choice)) {
            continue;
        }
        $message = $choice['message'] ?? null;
        if (is_array($message) && isset($message['content'])) {
            $content .= (string) $message['content'];
        }
    }
    $parsed = sim_recovery_classify_extract_json($content);
    if (!$parsed['ok']) {
        return ['ok' => false, 'error' => $parsed['error'], 'status' => $parsed['status']];
    }

    $slugToId = [];
    foreach ($subjects as $sub) {
        $slugToId[(string) $sub['slug']] = (int) $sub['id'];
    }
    $enriched = [];
    foreach ($parsed['items'] as $row) {
        $slug = (string) ($row['subject_slug'] ?? '');
        $row['subject_id'] = $slugToId[$slug] ?? null;
        $enriched[] = $row;
    }

    return ['ok' => true, 'items' => $enriched, 'model' => $model];
}