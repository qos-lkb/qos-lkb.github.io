<?php

declare(strict_types=1);

/**
 * Science-term pronunciation practice.
 * Audio is transcribed by xAI speech-to-text, then scored against the term.
 * Recordings are not stored.
 */

const PRONUNCIATION_STT_URL = 'https://api.x.ai/v1/stt';
const PRONUNCIATION_STT_MODEL = 'grok-voice-transcribe-2.0';
const PRONUNCIATION_MAX_BYTES = 2500000;
const PRONUNCIATION_MIN_BYTES = 1500;

function pronunciation_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    require_once __DIR__ . '/schema_runtime.php';
    schema_runtime_ensure_table(
        $pdo,
        'CREATE TABLE IF NOT EXISTS pronunciation_attempts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            term_key VARCHAR(64) NOT NULL,
            transcript VARCHAR(500) NOT NULL DEFAULT \'\',
            score TINYINT UNSIGNED NOT NULL,
            feedback_zh VARCHAR(500) NOT NULL DEFAULT \'\',
            feedback_en VARCHAR(500) NOT NULL DEFAULT \'\',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_pronunciation_attempts_user (user_id, created_at),
            KEY idx_pronunciation_attempts_user_term (user_id, term_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $ready = true;
}

/**
 * @return list<array{key:string,label_zh:string,label_en:string}>
 */
function pronunciation_subjects(): array
{
    return [
        ['key' => 'physics', 'label_zh' => '物理', 'label_en' => 'Physics'],
        ['key' => 'chemistry', 'label_zh' => '化學', 'label_en' => 'Chemistry'],
        ['key' => 'biology', 'label_zh' => '生物', 'label_en' => 'Biology'],
    ];
}

/**
 * @return list<array{key:string,subject:string,term:string,term_zh:string,phonetic:string}>
 */
function pronunciation_terms(): array
{
    return [
        ['key' => 'acceleration', 'subject' => 'physics', 'term' => 'acceleration', 'term_zh' => '加速度', 'phonetic' => 'ak-sel-uh-RAY-shun'],
        ['key' => 'velocity', 'subject' => 'physics', 'term' => 'velocity', 'term_zh' => '速度', 'phonetic' => 'vuh-LOS-i-tee'],
        ['key' => 'refraction', 'subject' => 'physics', 'term' => 'refraction', 'term_zh' => '折射', 'phonetic' => 'ri-FRAK-shun'],
        ['key' => 'wavelength', 'subject' => 'physics', 'term' => 'wavelength', 'term_zh' => '波長', 'phonetic' => 'WAYV-length'],
        ['key' => 'frequency', 'subject' => 'physics', 'term' => 'frequency', 'term_zh' => '頻率', 'phonetic' => 'FREE-kwun-see'],
        ['key' => 'momentum', 'subject' => 'physics', 'term' => 'momentum', 'term_zh' => '動量', 'phonetic' => 'moh-MEN-tum'],
        ['key' => 'diffraction', 'subject' => 'physics', 'term' => 'diffraction', 'term_zh' => '衍射', 'phonetic' => 'di-FRAK-shun'],
        ['key' => 'amplitude', 'subject' => 'physics', 'term' => 'amplitude', 'term_zh' => '振幅', 'phonetic' => 'AM-pli-tood'],
        ['key' => 'equilibrium', 'subject' => 'physics', 'term' => 'equilibrium', 'term_zh' => '平衡', 'phonetic' => 'ee-kwi-LIB-ree-um'],
        ['key' => 'resistance', 'subject' => 'physics', 'term' => 'resistance', 'term_zh' => '電阻', 'phonetic' => 'ri-ZIS-tuns'],
        ['key' => 'molecule', 'subject' => 'chemistry', 'term' => 'molecule', 'term_zh' => '分子', 'phonetic' => 'MOL-uh-kyool'],
        ['key' => 'catalyst', 'subject' => 'chemistry', 'term' => 'catalyst', 'term_zh' => '催化劑', 'phonetic' => 'KAT-uh-list'],
        ['key' => 'oxidation', 'subject' => 'chemistry', 'term' => 'oxidation', 'term_zh' => '氧化', 'phonetic' => 'ok-si-DAY-shun'],
        ['key' => 'electrolysis', 'subject' => 'chemistry', 'term' => 'electrolysis', 'term_zh' => '電解', 'phonetic' => 'ih-lek-TROL-uh-sis'],
        ['key' => 'precipitate', 'subject' => 'chemistry', 'term' => 'precipitate', 'term_zh' => '沉澱', 'phonetic' => 'pri-SIP-i-tayt'],
        ['key' => 'covalent', 'subject' => 'chemistry', 'term' => 'covalent', 'term_zh' => '共價', 'phonetic' => 'koh-VAY-lunt'],
        ['key' => 'titration', 'subject' => 'chemistry', 'term' => 'titration', 'term_zh' => '滴定', 'phonetic' => 'ty-TRAY-shun'],
        ['key' => 'alkali', 'subject' => 'chemistry', 'term' => 'alkali', 'term_zh' => '鹼', 'phonetic' => 'AL-kuh-ly'],
        ['key' => 'isomer', 'subject' => 'chemistry', 'term' => 'isomer', 'term_zh' => '異構物', 'phonetic' => 'EYE-so-mer'],
        ['key' => 'hydrochloric_acid', 'subject' => 'chemistry', 'term' => 'hydrochloric acid', 'term_zh' => '氫氯酸', 'phonetic' => 'hy-dro-KLOR-ik AS-id'],
        ['key' => 'photosynthesis', 'subject' => 'biology', 'term' => 'photosynthesis', 'term_zh' => '光合作用', 'phonetic' => 'foh-toh-SIN-thuh-sis'],
        ['key' => 'mitochondrion', 'subject' => 'biology', 'term' => 'mitochondrion', 'term_zh' => '線粒體', 'phonetic' => 'my-toh-KON-dree-on'],
        ['key' => 'chromosome', 'subject' => 'biology', 'term' => 'chromosome', 'term_zh' => '染色體', 'phonetic' => 'KROH-muh-sohm'],
        ['key' => 'enzyme', 'subject' => 'biology', 'term' => 'enzyme', 'term_zh' => '酶', 'phonetic' => 'EN-zyme'],
        ['key' => 'osmosis', 'subject' => 'biology', 'term' => 'osmosis', 'term_zh' => '滲透', 'phonetic' => 'oz-MOH-sis'],
        ['key' => 'homeostasis', 'subject' => 'biology', 'term' => 'homeostasis', 'term_zh' => '穩態', 'phonetic' => 'hoh-mee-oh-STAY-sis'],
        ['key' => 'cytoplasm', 'subject' => 'biology', 'term' => 'cytoplasm', 'term_zh' => '細胞質', 'phonetic' => 'SY-toh-plaz-um'],
        ['key' => 'respiration', 'subject' => 'biology', 'term' => 'respiration', 'term_zh' => '呼吸作用', 'phonetic' => 'res-pi-RAY-shun'],
        ['key' => 'allele', 'subject' => 'biology', 'term' => 'allele', 'term_zh' => '等位基因', 'phonetic' => 'uh-LEEL'],
        ['key' => 'endoplasmic_reticulum', 'subject' => 'biology', 'term' => 'endoplasmic reticulum', 'term_zh' => '內質網', 'phonetic' => 'en-doh-PLAZ-mik ri-TIK-yuh-lum'],
    ];
}

/**
 * @return array{key:string,subject:string,term:string,term_zh:string,phonetic:string}|null
 */
function pronunciation_term(string $key): ?array
{
    foreach (pronunciation_terms() as $term) {
        if ($term['key'] === $key) {
            return $term;
        }
    }

    return null;
}

function pronunciation_normalize(string $text): string
{
    $text = mb_strtolower($text, 'UTF-8');
    $text = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $text) ?? $text;
    $text = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);

    return $text;
}

function pronunciation_strip_fillers(string $normalized): string
{
    $fillers = ['uh' => true, 'um' => true, 'er' => true, 'ah' => true, 'hmm' => true, 'mm' => true];
    if ($normalized === '') {
        return '';
    }
    $kept = [];
    foreach (explode(' ', $normalized) as $word) {
        if ($word === '' || isset($fillers[$word])) {
            continue;
        }
        $kept[] = $word;
    }

    return implode(' ', $kept);
}

function pronunciation_pair_score(string $expected, string $heard): int
{
    if ($expected === '' || $heard === '') {
        return 0;
    }
    if ($heard === $expected) {
        return 100;
    }
    $pattern = '/(?:^|\s)' . preg_quote($expected, '/') . '(?:\s|$)/u';
    if (preg_match($pattern, $heard) === 1) {
        $extra = max(0, substr_count($heard, ' ') - substr_count($expected, ' '));

        return max(80, 98 - ($extra * 6));
    }
    $maxLen = max(strlen($expected), strlen($heard));
    if ($maxLen === 0 || $maxLen > 255) {
        return 0;
    }
    $dist = levenshtein($expected, $heard);
    if ($dist < 0) {
        return 0;
    }

    return max(0, min(99, (int) round((1 - ($dist / $maxLen)) * 100)));
}

function pronunciation_string_score(string $expected, string $heard): int
{
    $expected = pronunciation_strip_fillers(pronunciation_normalize($expected));
    $heard = pronunciation_strip_fillers(pronunciation_normalize($heard));
    if ($expected === '' || $heard === '') {
        return 0;
    }
    $scores = [pronunciation_pair_score($expected, $heard)];
    $expectedFlat = str_replace(' ', '', $expected);
    $heardFlat = str_replace(' ', '', $heard);
    if ($expectedFlat !== $expected || $heardFlat !== $heard) {
        $scores[] = pronunciation_pair_score($expectedFlat, $heardFlat);
    }

    return max($scores);
}

function pronunciation_blend_score(int $stringScore, int $modelScore): int
{
    $stringScore = max(0, min(100, $stringScore));
    $modelScore = max(0, min(100, $modelScore));
    if ($stringScore >= 90) {
        return (int) round(($stringScore * 0.75) + ($modelScore * 0.25));
    }
    if ($stringScore <= 25) {
        return (int) min(40, (int) round(($stringScore * 0.7) + ($modelScore * 0.3)));
    }

    return (int) round(($stringScore * 0.6) + ($modelScore * 0.4));
}

/**
 * @return array{ok:true,score:int,feedback_zh:string,feedback_en:string}|array{ok:false}
 */
function pronunciation_parse_judge(string $raw): array
{
    $text = trim($raw);
    if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $text, $m) === 1) {
        $text = trim($m[1]);
    }
    $start = strpos($text, '{');
    $end = strrpos($text, '}');
    if ($start === false || $end === false || $end <= $start) {
        return ['ok' => false];
    }
    $json = json_decode(substr($text, $start, $end - $start + 1), true);
    if (!is_array($json) || !isset($json['score']) || !is_numeric($json['score'])) {
        return ['ok' => false];
    }
    $zh = trim((string) ($json['feedback_zh'] ?? ''));
    $en = trim((string) ($json['feedback_en'] ?? ''));
    if (mb_strlen($zh) > 500) {
        $zh = mb_substr($zh, 0, 500);
    }
    if (mb_strlen($en) > 500) {
        $en = mb_substr($en, 0, 500);
    }

    return [
        'ok' => true,
        'score' => max(0, min(100, (int) round((float) $json['score']))),
        'feedback_zh' => $zh,
        'feedback_en' => $en,
    ];
}

/**
 * @return array{feedback_zh:string,feedback_en:string}
 */
function pronunciation_fallback_feedback(int $score, string $transcript, string $term): array
{
    if (trim($transcript) === '') {
        return [
            'feedback_zh' => '沒有聽清楚。請靠近麥克風，清楚讀出整個詞語。',
            'feedback_en' => 'Nothing was heard. Move closer to the microphone and say the whole word.',
        ];
    }
    if ($score >= 85) {
        return [
            'feedback_zh' => '聽起來很接近「' . $term . '」。',
            'feedback_en' => 'That sounded close to "' . $term . '".',
        ];
    }
    if ($score >= 50) {
        return [
            'feedback_zh' => '有一部分聽得懂，但還未穩定讀成「' . $term . '」。可先聽讀音，再重試。',
            'feedback_en' => 'Part of "' . $term . '" came through. Listen once, then try again.',
        ];
    }

    return [
        'feedback_zh' => '這次聽起來不像「' . $term . '」。請對着讀音提示，把每個音節讀完整。',
        'feedback_en' => 'That did not sound like "' . $term . '". Follow the pronunciation hint and say every syllable.',
    ];
}

function pronunciation_clip(string $text, int $max): string
{
    $text = trim($text);
    if (mb_strlen($text) <= $max) {
        return $text;
    }

    return mb_substr($text, 0, $max);
}

/**
 * @return array<string, array{best_score:int,attempt_count:int}>
 */
function pronunciation_user_stats(PDO $pdo, int $userId): array
{
    pronunciation_ensure_schema($pdo);
    $stmt = $pdo->prepare(
        'SELECT term_key, MAX(score) AS best_score, COUNT(*) AS attempt_count
         FROM pronunciation_attempts
         WHERE user_id = ?
         GROUP BY term_key'
    );
    $stmt->execute([$userId]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $key = (string) ($row['term_key'] ?? '');
        if ($key === '') {
            continue;
        }
        $out[$key] = [
            'best_score' => (int) ($row['best_score'] ?? 0),
            'attempt_count' => (int) ($row['attempt_count'] ?? 0),
        ];
    }

    return $out;
}

/**
 * @param array<string, array{best_score:int,attempt_count:int}> $stats
 * @return array{configured:bool,subjects:list<array<string,string>>,terms:list<array<string,mixed>>}
 */
function pronunciation_catalog_payload(bool $configured, array $stats): array
{
    $terms = [];
    foreach (pronunciation_terms() as $term) {
        $stat = $stats[$term['key']] ?? null;
        $terms[] = [
            'key' => $term['key'],
            'subject' => $term['subject'],
            'term' => $term['term'],
            'term_zh' => $term['term_zh'],
            'phonetic' => $term['phonetic'],
            'best_score' => $stat['best_score'] ?? null,
            'attempt_count' => $stat['attempt_count'] ?? 0,
        ];
    }

    return [
        'configured' => $configured,
        'subjects' => pronunciation_subjects(),
        'terms' => $terms,
    ];
}

/**
 * @return array{ok:true,path:string,mime:string,filename:string}|array{ok:false,error:string,status:int}
 */
function pronunciation_audio_upload(): array
{
    if (!isset($_FILES['audio']) || !is_array($_FILES['audio'])) {
        return ['ok' => false, 'error' => '請先錄音。', 'status' => 422];
    }
    $file = $_FILES['audio'];
    $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        return ['ok' => false, 'error' => '錄音太長，請在八秒內讀完。', 'status' => 422];
    }
    if ($err !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => '無法讀取錄音。', 'status' => 422];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => '無法讀取錄音。', 'status' => 422];
    }
    $size = (int) ($file['size'] ?? 0);
    if ($size < PRONUNCIATION_MIN_BYTES) {
        return ['ok' => false, 'error' => '錄音太短，請清楚讀出整個詞語。', 'status' => 422];
    }
    if ($size > PRONUNCIATION_MAX_BYTES) {
        return ['ok' => false, 'error' => '錄音太長，請在八秒內讀完。', 'status' => 422];
    }
    $allowed = [
        'audio/webm' => 'webm',
        'video/webm' => 'webm',
        'audio/mp4' => 'm4a',
        'audio/m4a' => 'm4a',
        'audio/x-m4a' => 'm4a',
        'audio/mpeg' => 'mp3',
        'audio/wav' => 'wav',
        'audio/x-wav' => 'wav',
        'audio/wave' => 'wav',
        'audio/ogg' => 'ogg',
        'audio/opus' => 'ogg',
        'application/ogg' => 'ogg',
    ];
    $declared = strtolower(trim(explode(';', (string) ($file['type'] ?? ''))[0]));
    $detected = '';
    if (class_exists(finfo::class)) {
        $fi = new finfo(FILEINFO_MIME_TYPE);
        $detected = strtolower((string) $fi->file($tmp));
    }
    $mime = isset($allowed[$detected]) ? $detected : $declared;
    if (!isset($allowed[$mime])) {
        return ['ok' => false, 'error' => '不支援這個錄音格式。', 'status' => 422];
    }

    return [
        'ok' => true,
        'path' => $tmp,
        'mime' => $mime,
        'filename' => 'sample.' . $allowed[$mime],
    ];
}

/**
 * Transcribe without biasing the model toward the answer, so a wrong word stays wrong.
 *
 * @return array{ok:true,text:string}|array{ok:false,error:string,status:int}
 */
function pronunciation_transcribe(string $path, string $mime, string $filename): array
{
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => '伺服器未啟用網路連線元件。', 'status' => 503];
    }
    require_once __DIR__ . '/config.php';
    $apiKey = config_xai_api_key();
    if ($apiKey === '') {
        return ['ok' => false, 'error' => '尚未設定 XAI_API_KEY，暫時不能評分。', 'status' => 503];
    }
    $ch = curl_init(PRONUNCIATION_STT_URL);
    if ($ch === false) {
        return ['ok' => false, 'error' => '無法連線到語音辨識服務。', 'status' => 503];
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'model' => PRONUNCIATION_STT_MODEL,
            'language' => 'en',
            'file' => new CURLFile($path, $mime, $filename),
        ],
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 60,
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
            'error' => $errno === 28 ? '語音辨識逾時，請再試一次。' : '無法連線到語音辨識服務。',
            'status' => 503,
        ];
    }
    if ($status >= 400 || !is_string($raw)) {
        return ['ok' => false, 'error' => '語音辨識暫時未能完成，請稍後再試。', 'status' => 502];
    }
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        return ['ok' => false, 'error' => '語音辨識回應無效。', 'status' => 502];
    }

    return ['ok' => true, 'text' => pronunciation_clip((string) ($json['text'] ?? ''), 500)];
}

/**
 * @param array{term:string,term_zh:string,phonetic:string} $term
 * @return array{ok:true,score:int,feedback_zh:string,feedback_en:string}|array{ok:false}
 */
function pronunciation_judge(array $term, string $transcript, int $stringScore): array
{
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/sim_html_agent_lib.php';
    $system = '你是中學科學英文讀音教練。你只根據語音轉寫判斷學生有沒有把目標科學詞語讀清楚，不要假裝聽過音檔。回覆必須是一個 JSON 物件，不要加其他文字。';
    $user = "目標詞：{$term['term']}\n中文：{$term['term_zh']}\n讀音提示：{$term['phonetic']}\n語音轉寫：{$transcript}\n字面相似度：{$stringScore}\n"
        . '輸出 {"score":0到100的整數,"feedback_zh":"給學生的一句繁體中文","feedback_en":"one short English sentence"}。'
        . '轉寫與目標詞相同，或只是被拆成數個字，score 應在 90 以上。完全是別的詞則低於 40。分數應接近字面相似度。回饋指出聽起來不對的部分，不要長篇。';
    $chat = sim_xai_chat_complete(config_xai_model(), $system, $user, 'low');
    if (!$chat['ok']) {
        return ['ok' => false];
    }

    return pronunciation_parse_judge($chat['content']);
}

/**
 * @param array{key:string,term:string,term_zh:string,phonetic:string} $term
 * @param array{path:string,mime:string,filename:string} $audio
 * @return array{ok:true,score:int,transcript:string,feedback_zh:string,feedback_en:string}|array{ok:false,error:string,status:int}
 */
function pronunciation_score_audio(array $term, array $audio): array
{
    $stt = pronunciation_transcribe($audio['path'], $audio['mime'], $audio['filename']);
    if (!$stt['ok']) {
        return $stt;
    }
    $transcript = $stt['text'];
    $stringScore = pronunciation_string_score($term['term'], $transcript);
    $feedback = pronunciation_fallback_feedback($stringScore, $transcript, $term['term']);
    $score = $stringScore;
    if ($transcript !== '') {
        $judge = pronunciation_judge($term, $transcript, $stringScore);
        if ($judge['ok']) {
            $score = pronunciation_blend_score($stringScore, $judge['score']);
            if ($judge['feedback_zh'] !== '') {
                $feedback['feedback_zh'] = $judge['feedback_zh'];
            }
            if ($judge['feedback_en'] !== '') {
                $feedback['feedback_en'] = $judge['feedback_en'];
            }
        }
    }

    return [
        'ok' => true,
        'score' => $score,
        'transcript' => $transcript,
        'feedback_zh' => pronunciation_clip($feedback['feedback_zh'], 500),
        'feedback_en' => pronunciation_clip($feedback['feedback_en'], 500),
    ];
}

/**
 * @return array{best_score:int,attempt_count:int}
 */
function pronunciation_save_attempt(
    PDO $pdo,
    int $userId,
    string $termKey,
    string $transcript,
    int $score,
    string $feedbackZh,
    string $feedbackEn
): array {
    pronunciation_ensure_schema($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO pronunciation_attempts (user_id, term_key, transcript, score, feedback_zh, feedback_en)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $userId,
        $termKey,
        pronunciation_clip($transcript, 500),
        max(0, min(100, $score)),
        pronunciation_clip($feedbackZh, 500),
        pronunciation_clip($feedbackEn, 500),
    ]);
    $stats = pronunciation_user_stats($pdo, $userId);

    return $stats[$termKey] ?? ['best_score' => $score, 'attempt_count' => 1];
}
