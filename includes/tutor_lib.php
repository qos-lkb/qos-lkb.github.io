<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/api_response.php';

const TUTOR_MAX_MESSAGES = 12;
const TUTOR_MAX_MESSAGE_CHARS = 4000;
const TUTOR_UPSTREAM_URL = 'https://api.x.ai/v1/chat/completions';

function tutor_system_prompt(string $pageTitle, string $pagePath): string
{
    $prompt = <<<'TXT'
你是「伊中中科學學習平台」的科學助教，服務香港中學學生（初中科學與 HKDSE 物理、化學、生物）。
用繁體中文回答；若學生用英文提問，則用英文回答。
先解釋概念，再給步驟或例子。公式使用 LaTeX：行內 $...$，獨立一行 $$...$$。
物理、化學、生物都可以回答；物理題可以稍為多講受力、能量、電路與實驗設計。
不要代寫可以直接交的整份作業或測驗答案；改為拆開概念、提示下一步，並請學生先試算。
與科學無關的問題，用一兩句帶回科學學習。
不要提及模型供應商，也不要要求學生提供個人資料。
TXT;

    $pageTitle = tutor_context_snippet($pageTitle, 120);
    $pagePath = tutor_context_snippet($pagePath, 200);
    if ($pageTitle !== '' || $pagePath !== '') {
        $prompt .= "\n學生目前正在看的頁面：" . $pageTitle;
        if ($pagePath !== '') {
            $prompt .= '（' . $pagePath . '）';
        }
        $prompt .= '。若問題與這頁有關，可以順著這個課題說明。';
    }

    return $prompt;
}

function tutor_context_snippet(string $value, int $max): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '';
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    if (mb_strlen($value) > $max) {
        $value = mb_substr($value, 0, $max);
    }

    return $value;
}

function tutor_clean_message(string $value): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value) ?? '';
    $value = trim($value);
    if (mb_strlen($value) > TUTOR_MAX_MESSAGE_CHARS) {
        $value = mb_substr($value, 0, TUTOR_MAX_MESSAGE_CHARS);
    }

    return $value;
}

/**
 * Keep only recent user/assistant turns. System text is never taken from the client.
 *
 * @param mixed $raw
 * @return array{ok:true,messages:list<array{role:string,content:string}>}|array{ok:false,error:string}
 */
function tutor_normalize_messages(mixed $raw): array
{
    if (!is_array($raw)) {
        return ['ok' => false, 'error' => '請輸入問題。'];
    }

    $out = [];
    foreach ($raw as $item) {
        if (!is_array($item)) {
            continue;
        }
        $role = (string) ($item['role'] ?? '');
        if ($role !== 'user' && $role !== 'assistant') {
            continue;
        }
        $content = tutor_clean_message((string) ($item['content'] ?? ''));
        if ($content === '') {
            continue;
        }
        $out[] = ['role' => $role, 'content' => $content];
    }

    if (count($out) > TUTOR_MAX_MESSAGES) {
        $out = array_slice($out, -TUTOR_MAX_MESSAGES);
    }

    $last = $out[array_key_last($out)] ?? null;
    if ($last === null || $last['role'] !== 'user') {
        return ['ok' => false, 'error' => '請輸入問題。'];
    }

    return ['ok' => true, 'messages' => $out];
}

/**
 * @param array{title?:mixed,path?:mixed} $context
 * @return array{title:string,path:string}
 */
function tutor_normalize_context(array $context): array
{
    return [
        'title' => tutor_context_snippet((string) ($context['title'] ?? ''), 120),
        'path' => tutor_context_snippet((string) ($context['path'] ?? ''), 200),
    ];
}

function tutor_emit_sse(string $event, array $data): bool
{
    if (connection_aborted()) {
        return false;
    }
    echo 'event: ' . $event . "\n";
    echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
    flush();

    return !connection_aborted();
}

/**
 * Pull complete upstream SSE lines and forward visible answer text only.
 */
function tutor_consume_upstream_buffer(string &$buffer): bool
{
    while (($pos = strpos($buffer, "\n")) !== false) {
        $line = rtrim(substr($buffer, 0, $pos), "\r");
        $buffer = substr($buffer, $pos + 1);
        if ($line === '' || !str_starts_with($line, 'data:')) {
            continue;
        }
        $data = trim(substr($line, 5));
        if ($data === '' || $data === '[DONE]') {
            continue;
        }
        $json = json_decode($data, true);
        if (!is_array($json)) {
            continue;
        }
        $text = $json['choices'][0]['delta']['content'] ?? '';
        if (!is_string($text) || $text === '') {
            continue;
        }
        if (!tutor_emit_sse('delta', ['text' => $text])) {
            return false;
        }
    }

    return true;
}

function tutor_begin_sse(): void
{
    while (ob_get_level() > 0) {
        ob_end_flush();
    }
    @ini_set('zlib.output_compression', '0');
    @ini_set('implicit_flush', '1');
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-store');
    header('X-Accel-Buffering: no');
    header('X-Content-Type-Options: nosniff');
}

/**
 * Stream a tutor reply. JSON errors are only used before the SSE response starts.
 *
 * @param list<array{role:string,content:string}> $messages
 */
function tutor_stream_chat(array $messages, string $pageTitle, string $pagePath): void
{
    if (!function_exists('curl_init')) {
        api_json_error('tutor_unavailable', '科學助教尚未啟用。', 503);
    }

    $apiKey = config_xai_api_key();
    if ($apiKey === '') {
        api_json_error('tutor_unavailable', '科學助教尚未啟用。', 503);
    }

    $payload = json_encode([
        'model' => config_xai_model(),
        'stream' => true,
        'temperature' => 0.3,
        'max_tokens' => 1500,
        'messages' => array_merge(
            [['role' => 'system', 'content' => tutor_system_prompt($pageTitle, $pagePath)]],
            $messages
        ),
    ], JSON_UNESCAPED_UNICODE);
    if ($payload === false) {
        api_json_error('server_error', '無法送出問題。', 500);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    tutor_begin_sse();

    $status = 0;
    $errorBody = '';
    $buffer = '';
    $alive = true;
    $ch = curl_init(TUTOR_UPSTREAM_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: text/event-stream',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_HEADERFUNCTION => static function ($ch, string $header) use (&$status): int {
            if (preg_match('#^HTTP/\S+\s+(\d+)#', $header, $m)) {
                $status = (int) $m[1];
            }

            return strlen($header);
        },
        CURLOPT_WRITEFUNCTION => static function ($ch, string $chunk) use (&$status, &$errorBody, &$buffer, &$alive): int {
            if (connection_aborted()) {
                $alive = false;

                return 0;
            }
            if ($status >= 400) {
                if (strlen($errorBody) < 2000) {
                    $errorBody .= $chunk;
                }

                return strlen($chunk);
            }
            $buffer .= $chunk;
            if (!tutor_consume_upstream_buffer($buffer)) {
                $alive = false;

                return 0;
            }

            return strlen($chunk);
        },
    ]);

    $ok = curl_exec($ch);
    $errno = curl_errno($ch);
    curl_close($ch);

    if (!$alive || connection_aborted()) {
        return;
    }

    if ($ok === false || $errno !== 0 || $status >= 400 || $status === 0) {
        tutor_emit_sse('error', ['message' => '助教暫時無法回答，請稍後再試。']);

        return;
    }

    tutor_consume_upstream_buffer($buffer);
    tutor_emit_sse('done', ['ok' => true]);
}
