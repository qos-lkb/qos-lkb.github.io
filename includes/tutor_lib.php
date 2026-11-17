<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/api_response.php';
require_once __DIR__ . '/schema_runtime.php';
require_once __DIR__ . '/user_names_lib.php';

const TUTOR_MAX_MESSAGES = 12;
const TUTOR_MAX_MESSAGE_CHARS = 4000;
const TUTOR_UPSTREAM_URL = 'https://api.x.ai/v1/chat/completions';
const TUTOR_MAX_SYSTEM_PROMPT_CHARS = 8000;

/** @var list<string> */
const TUTOR_MODEL_CHOICES = [
    'grok-4.7',
    'grok-4.6',
    'grok-4.5',
    'grok-4.3',
    'grok-4.20-0309-non-reasoning',
    'grok-4.20-0309-reasoning',
];

/**
 * Create tutor tables / columns when missing. Do not require operators to run SQL.
 */
function tutor_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }

    schema_runtime_ensure_table(
        $pdo,
        'CREATE TABLE IF NOT EXISTS tutor_conversations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            model VARCHAR(64) NOT NULL DEFAULT \'\',
            title VARCHAR(120) NOT NULL DEFAULT \'\',
            page_title VARCHAR(120) NOT NULL DEFAULT \'\',
            page_path VARCHAR(200) NOT NULL DEFAULT \'\',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_tutor_conversations_user_updated (user_id, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    schema_runtime_ensure_column(
        $pdo,
        'tutor_conversations',
        'title',
        "ALTER TABLE tutor_conversations ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT '' AFTER model"
    );
    schema_runtime_ensure_table(
        $pdo,
        'CREATE TABLE IF NOT EXISTS tutor_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            conversation_id BIGINT UNSIGNED NOT NULL,
            role ENUM(\'user\', \'assistant\') NOT NULL,
            content MEDIUMTEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_tutor_messages_conversation (conversation_id, id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    schema_runtime_ensure_table(
        $pdo,
        'CREATE TABLE IF NOT EXISTS tutor_settings (
            setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
            setting_value MEDIUMTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $ready = true;
}

function tutor_default_system_prompt(): string
{
    return <<<'TXT'
你是「伊中中科學學習平台」的科學助教，服務香港中學學生（初中科學與 HKDSE 物理、化學、生物）。
用繁體中文回答；若學生用英文提問，則用英文回答。
先解釋概念，再給步驟或例子。公式使用 LaTeX：行內 $...$，獨立一行 $$...$$。
物理、化學、生物都可以回答；物理題可以稍為多講受力、能量、電路與實驗設計。
不要代寫可以直接交的整份作業或測驗答案；改為拆開概念、提示下一步，並請學生先試算。
與科學無關的問題，用一兩句帶回科學學習。
不要提及模型供應商，也不要要求學生提供個人資料。
TXT;
}

/**
 * @return array<string, string>
 */
function tutor_settings_map(PDO $pdo): array
{
    tutor_ensure_schema($pdo);
    $stmt = $pdo->query('SELECT setting_key, setting_value FROM tutor_settings');
    if ($stmt === false) {
        return [];
    }
    $map = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $map[(string) $row['setting_key']] = (string) $row['setting_value'];
    }

    return $map;
}

function tutor_setting(PDO $pdo, string $key, string $default = ''): string
{
    $map = tutor_settings_map($pdo);

    return array_key_exists($key, $map) ? $map[$key] : $default;
}

/**
 * @param array<string, string> $values
 */
function tutor_settings_save(PDO $pdo, array $values): void
{
    tutor_ensure_schema($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO tutor_settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    foreach ($values as $key => $value) {
        $stmt->execute([$key, $value]);
    }
}

function tutor_has_api_key(): bool
{
    return config_xai_api_key() !== '';
}

function tutor_is_enabled(PDO $pdo): bool
{
    return tutor_setting($pdo, 'enabled', '1') !== '0' && tutor_has_api_key();
}

function tutor_normalize_model_id(string $model): string
{
    $model = trim($model);
    if ($model === '' || !preg_match('/^[A-Za-z0-9._-]{1,64}$/', $model)) {
        return '';
    }

    return $model;
}

function tutor_effective_model(PDO $pdo): string
{
    $stored = tutor_normalize_model_id(tutor_setting($pdo, 'model', ''));
    if ($stored !== '') {
        return $stored;
    }

    return config_xai_model();
}

function tutor_effective_reasoning_effort(PDO $pdo): string
{
    $stored = strtolower(trim(tutor_setting($pdo, 'reasoning_effort', '')));
    if ($stored === 'none') {
        return '';
    }
    if (in_array($stored, ['low', 'medium', 'high', 'xhigh'], true)) {
        return $stored;
    }

    return config_xai_reasoning_effort();
}

/**
 * @return list<string>
 */
function tutor_model_choices(PDO $pdo): array
{
    $choices = TUTOR_MODEL_CHOICES;
    $current = tutor_effective_model($pdo);
    if ($current !== '' && !in_array($current, $choices, true)) {
        $choices[] = $current;
    }

    return $choices;
}

/**
 * @return array{conversations:int,messages:int,users:int}
 */
function tutor_admin_stats(PDO $pdo): array
{
    tutor_ensure_schema($pdo);
    $conversations = (int) $pdo->query('SELECT COUNT(*) FROM tutor_conversations')->fetchColumn();
    $messages = (int) $pdo->query('SELECT COUNT(*) FROM tutor_messages')->fetchColumn();
    $users = (int) $pdo->query('SELECT COUNT(DISTINCT user_id) FROM tutor_conversations')->fetchColumn();

    return [
        'conversations' => $conversations,
        'messages' => $messages,
        'users' => $users,
    ];
}

/**
 * @return array<string, mixed>
 */
function tutor_status_payload(PDO $pdo): array
{
    return [
        'enabled' => tutor_is_enabled($pdo),
        'configured' => tutor_has_api_key(),
    ];
}

/**
 * @return array<string, mixed>
 */
function tutor_admin_settings_payload(PDO $pdo): array
{
    $map = tutor_settings_map($pdo);

    return [
        'enabled' => ($map['enabled'] ?? '1') !== '0',
        'model' => (string) ($map['model'] ?? ''),
        'reasoning_effort' => (string) ($map['reasoning_effort'] ?? ''),
        'system_prompt' => (string) ($map['system_prompt'] ?? ''),
        'default_system_prompt' => tutor_default_system_prompt(),
        'env_model' => config_xai_model(),
        'env_reasoning_effort' => config_xai_reasoning_effort(),
        'has_api_key' => tutor_has_api_key(),
        'effective_model' => tutor_effective_model($pdo),
        'effective_reasoning_effort' => tutor_effective_reasoning_effort($pdo),
        'models' => tutor_model_choices($pdo),
        'stats' => tutor_admin_stats($pdo),
        'live' => tutor_is_enabled($pdo),
    ];
}

/**
 * @param array<string, mixed> $body
 * @return array{ok:true,values:array<string,string>}|array{ok:false,error:string}
 */
function tutor_normalize_admin_settings(array $body): array
{
    $enabled = !empty($body['enabled']);
    $model = tutor_normalize_model_id((string) ($body['model'] ?? ''));
    $effort = strtolower(trim((string) ($body['reasoning_effort'] ?? '')));
    if ($effort !== '' && !in_array($effort, ['none', 'low', 'medium', 'high', 'xhigh'], true)) {
        return ['ok' => false, 'error' => '推理深度無效。'];
    }
    $prompt = str_replace(["\r\n", "\r"], "\n", (string) ($body['system_prompt'] ?? ''));
    $prompt = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $prompt) ?? '';
    $prompt = trim($prompt);
    if (mb_strlen($prompt) > TUTOR_MAX_SYSTEM_PROMPT_CHARS) {
        $prompt = mb_substr($prompt, 0, TUTOR_MAX_SYSTEM_PROMPT_CHARS);
    }

    return [
        'ok' => true,
        'values' => [
            'enabled' => $enabled ? '1' : '0',
            'model' => $model,
            'reasoning_effort' => $effort,
            'system_prompt' => $prompt,
        ],
    ];
}

function tutor_system_prompt(string $pageTitle, string $pagePath, ?PDO $pdo = null): string
{
    $prompt = tutor_default_system_prompt();
    if ($pdo !== null) {
        $custom = trim(tutor_setting($pdo, 'system_prompt', ''));
        if ($custom !== '') {
            $prompt = $custom;
        }
    }

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
const TUTOR_ADMIN_MESSAGE_LIMIT = 200;

function tutor_can_view_all(array $user): bool
{
    return user_has_permission('user.manage');
}

function tutor_create_conversation(PDO $pdo, int $userId, string $model, string $pageTitle, string $pagePath): int
{
    $ins = $pdo->prepare(
        'INSERT INTO tutor_conversations (user_id, model, title, page_title, page_path) VALUES (?, ?, ?, ?, ?)'
    );
    $ins->execute([$userId, $model, '', $pageTitle, $pagePath]);

    return (int) $pdo->lastInsertId();
}

/**
 * @return array<string, mixed>|null
 */
function tutor_fetch_conversation(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT c.id, c.user_id, c.model, c.title, c.page_title, c.page_path, c.created_at, c.updated_at,
                u.email, u.name_zh, u.name_en, u.display_name
         FROM tutor_conversations c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.id = ?
         LIMIT 1'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
}

function tutor_open_conversation(
    PDO $pdo,
    int $userId,
    string $model,
    string $pageTitle,
    string $pagePath,
    int $conversationId = 0,
    bool $forceNew = false
): int {
    if ($forceNew) {
        return tutor_create_conversation($pdo, $userId, $model, $pageTitle, $pagePath);
    }

    if ($conversationId > 0) {
        $row = tutor_fetch_conversation($pdo, $conversationId);
        if ($row === null || (int) $row['user_id'] !== $userId) {
            throw new InvalidArgumentException('conversation_not_found');
        }
        $upd = $pdo->prepare(
            'UPDATE tutor_conversations SET model = ?, page_title = ?, page_path = ? WHERE id = ?'
        );
        $upd->execute([$model, $pageTitle, $pagePath, $conversationId]);

        return $conversationId;
    }

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

    return tutor_create_conversation($pdo, $userId, $model, $pageTitle, $pagePath);
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function tutor_conversation_payload(array $row, bool $includeOwner = false): array
{
    $title = trim((string) ($row['title'] ?? ''));
    $payload = [
        'id' => (int) $row['id'],
        'title' => $title !== '' ? $title : '新對話',
        'page_title' => (string) ($row['page_title'] ?? ''),
        'page_path' => (string) ($row['page_path'] ?? ''),
        'model' => (string) ($row['model'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
    if ($includeOwner) {
        $payload['user_id'] = (int) ($row['user_id'] ?? 0);
        $payload['user_email'] = (string) ($row['email'] ?? '');
        $payload['user_name'] = user_format_name([
            'name_zh' => (string) ($row['name_zh'] ?? ''),
            'name_en' => (string) ($row['name_en'] ?? ''),
            'display_name' => (string) ($row['display_name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
        ]);
    }

    return $payload;
}

/**
 * @return list<array<string, mixed>>
 */
function tutor_list_conversations(PDO $pdo, ?int $userId, string $query, bool $includeOwner): array
{
    $sql = 'SELECT c.id, c.user_id, c.model, c.title, c.page_title, c.page_path, c.created_at, c.updated_at,
                   u.email, u.name_zh, u.name_en, u.display_name
            FROM tutor_conversations c
            LEFT JOIN users u ON u.id = c.user_id';
    $where = [];
    $params = [];
    if ($userId !== null) {
        $where[] = 'c.user_id = ?';
        $params[] = $userId;
    }
    $query = tutor_context_snippet($query, 80);
    if ($query !== '') {
        $like = '%' . $query . '%';
        $where[] = '(c.title LIKE ? OR u.email LIKE ? OR u.name_zh LIKE ? OR u.name_en LIKE ? OR u.display_name LIKE ?)';
        array_push($params, $like, $like, $like, $like, $like);
    }
    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY c.updated_at DESC, c.id DESC LIMIT 80';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $out[] = tutor_conversation_payload($row, $includeOwner);
    }

    return $out;
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

    $titleStmt = $pdo->prepare('SELECT title FROM tutor_conversations WHERE id = ? LIMIT 1');
    $titleStmt->execute([$conversationId]);
    $current = trim((string) $titleStmt->fetchColumn());
    if ($current === '') {
        $upd = $pdo->prepare('UPDATE tutor_conversations SET title = ? WHERE id = ?');
        $upd->execute([tutor_context_snippet($content, 80), $conversationId]);
    }
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
    if ($apiKey === '' || !tutor_is_enabled($pdo)) {
        api_json_error('tutor_unavailable', '科學助教尚未啟用。', 503);
    }

    $body = [
        'model' => tutor_effective_model($pdo),
        'stream' => true,
        'temperature' => 0.3,
        'max_tokens' => 1500,
        'messages' => array_merge(
            [['role' => 'system', 'content' => tutor_system_prompt($pageTitle, $pagePath, $pdo)]],
            $messages
        ),
    ];
    $effort = tutor_effective_reasoning_effort($pdo);
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

    tutor_emit_sse('done', ['ok' => true, 'conversation_id' => $conversationId]);
}
