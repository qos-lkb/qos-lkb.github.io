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
function tutor_consume_upstream_buffer(string &$buffer, string &$answer): bool
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
        $answer .= $text;
        if (!tutor_emit_sse('delta', ['text' => $text])) {
            return false;
        }
    }

    return true;
}

const TUTOR_HISTORY_LIMIT = 40;

function tutor_open_conversation(PDO $pdo, int $userId, string $model, string $pageTitle, string $pagePath): int
{
    $stmt = $pdo->prepare(
        'SELECT id FROM tutor_conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1'
    );
    $stmt->execute([$userId]);
    $id = $stmt->fetchColumn();
    if ($id !== false) {
        $upd = $pdo->prepare(
            'UPDATE tutor_conversations SET model = ?, page_title = ?, page_path = ? WHERE id = ?'
        );
        $upd->execute([$model, $pageTitle, $pagePath, (int) $id]);

        return (int) $id;
    }

    $ins = $pdo->prepare(
        'INSERT INTO tutor_conversations (user_id, model, page_title, page_path) VALUES (?, ?, ?, ?)'
    );
    $ins->execute([$userId, $model, $pageTitle, $pagePath]);

    return (int) $pdo->lastInsertId();
}

function tutor_append_user_turn(PDO $pdo, int $conversationId, string $content): void
{
    $last = $pdo->prepare(
        'SELECT role, content FROM tutor_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1'
    );
    $last->execute([$conversationId]);
    $row = $last->fetch(PDO::FETCH_ASSOC);
    if (is_array($row) && $row['role'] === 'user' && (string) $row['content'] === $content) {
        return;
    }

    $ins = $pdo->prepare(
        'INSERT INTO tutor_messages (conversation_id, role, content) VALUES (?, ?, ?)'
    );
    $ins->execute([$conversationId, 'user', $content]);
}

function tutor_append_assistant_turn(PDO $pdo, int $conversationId, string $content): void
{
    $content = str_replace(["\r\n", "\r"], "\n", $content);
    $content = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content) ?? '');
    if ($content === '') {
        return;
    }
    $ins = $pdo->prepare(
        'INSERT INTO tutor_messages (conversation_id, role, content) VALUES (?, ?, ?)'
    );
    $ins->execute([$conversationId, 'assistant', $content]);
}

/**
 * @return list<array{role:string,content:string}>
 */
function tutor_recent_messages(PDO $pdo, int $conversationId, int $limit): array
{
    $limit = max(1, min(TUTOR_HISTORY_LIMIT, $limit));
    $stmt = $pdo->prepare(
        'SELECT role, content FROM tutor_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ' . $limit
    );
    $stmt->execute([$conversationId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $rows = array_reverse($rows);
    $out = [];
    foreach ($rows as $row) {
        $role = (string) ($row['role'] ?? '');
        if ($role !== 'user' && $role !== 'assistant') {
            continue;
        }
        $out[] = [
            'role' => $role,
            'content' => (string) ($row['content'] ?? ''),
        ];
    }

    return $out;
}

/**
 * @param list<array{role:string,content:string}> $messages
 */
function tutor_latest_user_text(array $messages): string
{
    for ($i = count($messages) - 1; $i >= 0; $i--) {
        if ($messages[$i]['role'] === 'user') {
            return $messages[$i]['content'];
        }
    }

    return '';
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
function tutor_stream_chat(PDO $pdo, int $conversationId, array $messages, string $pageTitle, string $pagePath): void
{
    if (!function_exists('curl_init')) {
        api_json_error('tutor_unavailable', '科學助教尚未啟用。', 503);
    }

    $apiKey = config_xai_api_key();
    if ($apiKey === '') {
        api_json_error('tutor_unavailable', '科學助教尚未啟用。', 503);
    }

    $body = [
        'model' => config_xai_model(),
        'stream' => true,
        'temperature' => 0.3,
        'max_tokens' => 1500,
        'messages' => array_merge(
            [['role' => 'system', 'content' => tutor_system_prompt($pageTitle, $pagePath)]],
            $messages
        ),
    ];
    $effort = config_xai_reasoning_effort();
    if ($effort !== '') {
        $body['reasoning_effort'] = $effort;
    }
    $payload = json_encode($body, JSON_UNESCAPED_UNICODE);
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
    $answer = '';
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
        CURLOPT_WRITEFUNCTION => static function ($ch, string $chunk) use (&$status, &$errorBody, &$buffer, &$answer, &$alive): int {
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
            if (!tutor_consume_upstream_buffer($buffer, $answer)) {
                $alive = false;

                return 0;
            }

            return strlen($chunk);
        },
    ]);

    $ok = curl_exec($ch);
    $errno = curl_errno($ch);
    curl_close($ch);

    tutor_consume_upstream_buffer($buffer, $answer);
    if ($answer !== '') {
        try {
            tutor_append_assistant_turn($pdo, $conversationId, $answer);
        } catch (Throwable $e) {
            // The student already has the text. A failed save must not hide the reply.
        }
    }

    if (!$alive || connection_aborted()) {
        return;
    }

    if ($ok === false || $errno !== 0 || $status >= 400 || $status === 0) {
        tutor_emit_sse('error', ['message' => '助教暫時無法回答，請稍後再試。']);

        return;
    }

    tutor_emit_sse('done', ['ok' => true]);
}
