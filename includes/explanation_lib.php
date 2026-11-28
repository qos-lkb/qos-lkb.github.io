<?php

declare(strict_types=1);

/**
 * Oral science explanations.
 * Audio is transcribed by xAI, then judged against a hidden rubric.
 * The recording is kept so the student and admins can play it back.
 */

const EXPLANATION_STT_URL = 'https://api.x.ai/v1/stt';
const EXPLANATION_STT_MODEL = 'grok-voice-transcribe-2.0';
const EXPLANATION_MAX_BYTES = 6000000;
const EXPLANATION_MIN_BYTES = 1500;
const EXPLANATION_PASS_SCORE = 70;
const EXPLANATION_MAX_SECONDS = 90;

function explanation_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    require_once __DIR__ . '/schema_runtime.php';
    schema_runtime_ensure_table(
        $pdo,
        'CREATE TABLE IF NOT EXISTS explanation_attempts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            question_key VARCHAR(64) NOT NULL,
            transcript VARCHAR(2000) NOT NULL DEFAULT \'\',
            score TINYINT UNSIGNED NOT NULL,
            feedback_zh VARCHAR(800) NOT NULL DEFAULT \'\',
            feedback_en VARCHAR(800) NOT NULL DEFAULT \'\',
            audio_ext VARCHAR(8) NOT NULL DEFAULT \'\',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_explanation_attempts_user (user_id, created_at),
            KEY idx_explanation_attempts_user_question (user_id, question_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    schema_runtime_ensure_column(
        $pdo,
        'explanation_attempts',
        'audio_ext',
        "ALTER TABLE explanation_attempts ADD COLUMN audio_ext VARCHAR(8) NOT NULL DEFAULT '' AFTER feedback_en"
    );
    $ready = true;
}

/**
 * @return list<array{key:string,label_zh:string,label_en:string}>
 */
function explanation_subjects(): array
{
    return [
        ['key' => 'science', 'label_zh' => '綜合科學', 'label_en' => 'Integrated science'],
        ['key' => 'physics', 'label_zh' => '物理', 'label_en' => 'Physics'],
        ['key' => 'chemistry', 'label_zh' => '化學', 'label_en' => 'Chemistry'],
        ['key' => 'biology', 'label_zh' => '生物', 'label_en' => 'Biology'],
    ];
}

/**
 * Rubric fields stay on the server. The catalogue must not include them.
 *
 * @return list<array{
 *   key:string,subject:string,title_zh:string,title_en:string,prompt_zh:string,prompt_en:string,
 *   points_zh:list<string>,points_en:list<string>,misconceptions_zh:list<string>
 * }>
 */
function explanation_questions(): array
{
    return [
        [
            'key' => 'particle_states',
            'subject' => 'science',
            'title_zh' => '三態的粒子',
            'title_en' => 'Particles in three states',
            'prompt_zh' => '冰受熱變成水，水再受熱變成水蒸氣。用粒子模型解釋：三態的粒子排列和運動有什麼不同？加熱時發生了什麼？',
            'prompt_en' => 'Ice is heated into water, then into steam. Use the particle model: how do arrangement and movement differ in the three states, and what does heating do?',
            'points_zh' => [
                '固態粒子緊密、大致有規則排列，只能在固定位置振動',
                '液態粒子仍然靠近，但可以互相滑動，所以沒有固定形狀',
                '氣態粒子相距很遠，快速而不規則地運動，並充滿容器',
                '加熱增加粒子動能；在熔點或沸點，能量用來克服粒子間的吸引力，粒子本身不會變大',
            ],
            'points_en' => [
                'In a solid, particles are close and roughly ordered, vibrating about fixed positions',
                'In a liquid, particles stay close but can slide, so there is no fixed shape',
                'In a gas, particles are far apart, move fast and randomly, and fill the container',
                'Heating raises kinetic energy; at the melting or boiling point the energy overcomes attractions. Particles themselves do not grow',
            ],
            'misconceptions_zh' => [
                '粒子在熔化或沸騰時自己熔化或變大',
                '加熱只是把一種「熱質」加進物質裡',
            ],
        ],
        [
            'key' => 'gas_pressure_heat',
            'subject' => 'physics',
            'title_zh' => '氣體受熱後氣壓上升',
            'title_en' => 'Heated gas, higher pressure',
            'prompt_zh' => '一個密封、體積不變的容器裝有氣體。為什麼氣體受熱後，容器內的氣壓會上升？',
            'prompt_en' => 'A sealed container of fixed volume holds a gas. Why does the pressure rise when the gas is heated?',
            'points_zh' => [
                '溫度上升時，氣體粒子的平均動能增加，運動更快',
                '粒子碰撞器壁更頻密，每次碰撞施加的力也較大',
                '體積不變，單位時間撞在單位面積上的力增加，所以壓強上升',
                '粒子數目沒有因為受熱而增加',
            ],
            'points_en' => [
                'A higher temperature means gas particles have more kinetic energy and move faster',
                'They hit the walls more often, and each collision exerts a larger force',
                'Volume is fixed, so the force per unit area per unit time rises and pressure rises',
                'Heating does not create extra particles',
            ],
            'misconceptions_zh' => [
                '受熱後氣體粒子變多或粒子變大',
                '熱是一種會塞滿容器的物質',
            ],
        ],
        [
            'key' => 'sea_breeze',
            'subject' => 'science',
            'title_zh' => '白天的海風',
            'title_en' => 'Daytime sea breeze',
            'prompt_zh' => '為什麼晴朗的白天，海邊常常吹海風，也就是風從海吹向陸？',
            'prompt_en' => 'Why does a sea breeze, from sea to land, often blow at the coast on a sunny day?',
            'points_zh' => [
                '陸地的比熱容比海水低，白天升溫較快',
                '陸上空氣受熱膨脹上升，近地面氣壓變得比海上低',
                '空氣由氣壓較高的海面流向氣壓較低的陸地，形成海風',
                '這是對流造成的氣壓差，不是風直接由熱處吹向冷處',
            ],
            'points_en' => [
                'Land has a lower specific heat capacity than sea water, so it warms faster by day',
                'Air over the land expands and rises, leaving lower pressure near the ground than over the sea',
                'Air flows from higher pressure over the sea toward lower pressure over the land',
                'The breeze is a convection pressure difference, not simply wind blowing from hot to cold',
            ],
            'misconceptions_zh' => [
                '晚上也吹海風（晚上通常是陸風）',
                '只說熱空氣流向冷空氣，沒有提到上升氣流和氣壓差',
            ],
        ],
        [
            'key' => 'apparent_bend',
            'subject' => 'physics',
            'title_zh' => '水中吸管看起來彎了',
            'title_en' => 'A straw that looks bent',
            'prompt_zh' => '為什麼半截插在水中的直吸管，從上面看下去會好像在水面處彎了？',
            'prompt_en' => 'Why does a straight straw standing half in water look bent at the water surface?',
            'points_zh' => [
                '光由水進入空氣時速度和方向改變，這是折射',
                '水比空氣光密，光線離開水面時偏離法線',
                '眼睛把光線當成直線，水下那段看起來比實際位置高，吸管便好像彎了',
                '吸管本身沒有彎曲',
            ],
            'points_en' => [
                'Light changes speed and direction as it passes from water into air: refraction',
                'Water is optically denser than air, so the ray bends away from the normal as it leaves the water',
                'The eye assumes light travelled in a straight line, so the underwater part looks higher than it is',
                'The straw itself is not bent',
            ],
            'misconceptions_zh' => [
                '吸管真的被水弄彎',
                '主因是放大鏡效應或水的顏色',
            ],
        ],
        [
            'key' => 'series_lamps',
            'subject' => 'physics',
            'title_zh' => '串聯燈泡變暗',
            'title_en' => 'Dimmer lamps in series',
            'prompt_zh' => '兩個相同的燈泡串聯接到同一枚電池，為什麼每個燈泡都比單獨接一個燈泡時更暗？',
            'prompt_en' => 'Two identical lamps are connected in series to one cell. Why is each lamp dimmer than a single lamp connected alone?',
            'points_zh' => [
                '串聯後總電阻增加',
                '電池電壓大致不變，所以電路電流減少',
                '串聯電流處處相同，但每個燈泡分到的電壓和功率下降，所以較暗',
                '電流不會被第一個燈泡用完',
            ],
            'points_en' => [
                'Series connection increases the total resistance',
                'The cell voltage is about the same, so the current in the circuit falls',
                'Current is the same all around a series circuit, but each lamp gets less voltage and power, so it is dimmer',
                'The first lamp does not use up the current',
            ],
            'misconceptions_zh' => [
                '電流通過第一個燈泡後被用盡，第二個幾乎沒有電',
                '燈泡變暗是因為電池的電壓被永久消耗掉',
            ],
        ],
        [
            'key' => 'water_electrolysis',
            'subject' => 'chemistry',
            'title_zh' => '電解水的氣體',
            'title_en' => 'Gases from electrolysing water',
            'prompt_zh' => '電解酸化的水時，為什麼陰極收集到的氣體體積大約是陽極的兩倍？兩種氣體分別是什麼？',
            'prompt_en' => 'When acidified water is electrolysed, why is the volume of gas at the cathode about twice the volume at the anode? Name both gases.',
            'points_zh' => [
                '水分解成氫和氧，比例是 2H2O → 2H2 + O2',
                '陰極還原，產生氫氣；陽極氧化，產生氧氣',
                '同溫同壓下，氣體體積比等於摩爾比，所以氫約為氧的兩倍',
                '體積差不是因為氫比較輕',
            ],
            'points_en' => [
                'Water splits as 2H2O → 2H2 + O2',
                'Reduction at the cathode makes hydrogen; oxidation at the anode makes oxygen',
                'At the same temperature and pressure, gas volume ratio equals the mole ratio, so hydrogen is about twice oxygen',
                'The volume difference is not because hydrogen is lighter',
            ],
            'misconceptions_zh' => [
                '陰極產生氧氣、陽極產生氫氣',
                '氫比較輕或跑得較快，所以體積較大',
            ],
        ],
        [
            'key' => 'neutralisation',
            'subject' => 'chemistry',
            'title_zh' => '酸加鹼會放熱',
            'title_en' => 'Acid plus alkali gives out heat',
            'prompt_zh' => '為什麼把稀鹽酸慢慢加入氫氧化鈉溶液會放熱？什麼情況下溶液會接近中性？',
            'prompt_en' => 'Why does dilute hydrochloric acid added to sodium hydroxide solution give out heat? When is the solution nearly neutral?',
            'points_zh' => [
                '氫離子與氫氧離子結合成水：H+ + OH− → H2O',
                '這是中和作用，反應放熱',
                '同時生成鹽（氯化鈉）',
                '當加入的氫離子與原有氫氧離子的數量相等，pH 接近 7',
            ],
            'points_en' => [
                'Hydrogen ions and hydroxide ions combine to form water: H+ + OH− → H2O',
                'This neutralisation gives out heat',
                'A salt, sodium chloride, is also formed',
                'The solution is nearly pH 7 when the added H+ equals the OH− that was present',
            ],
            'misconceptions_zh' => [
                '酸把鹼消滅後什麼也不剩下',
                '只要加了酸，溶液一定變成中性',
            ],
        ],
        [
            'key' => 'starch_test',
            'subject' => 'biology',
            'title_zh' => '葉片的碘液測試',
            'title_en' => 'Iodine test on a leaf',
            'prompt_zh' => '綠葉有一部分用鋁箔遮光。光照數小時、脫去葉綠素後加碘液。為什麼見光部分變藍黑色，遮光部分不變？',
            'prompt_en' => 'Part of a green leaf is covered with foil. After hours in light, the chlorophyll is removed and iodine is added. Why does only the lit part turn blue-black?',
            'points_zh' => [
                '見光部分有葉綠素，在光下進行光合作用，製造葡萄糖',
                '多餘的葡萄糖轉成澱粉貯存',
                '碘液遇澱粉呈藍黑色',
                '遮光部分缺乏光，不能進行光合作用，沒有新製的澱粉',
            ],
            'points_en' => [
                'The lit part has chlorophyll and photosynthesises in light, making glucose',
                'Spare glucose is stored as starch',
                'Iodine turns blue-black with starch',
                'The covered part gets no light, so it does not photosynthesise and makes no new starch',
            ],
            'misconceptions_zh' => [
                '變色是因為葉綠素或碘液把葉染綠',
                '沒有光，葉仍能製造澱粉',
            ],
        ],
        [
            'key' => 'salted_vegetable',
            'subject' => 'biology',
            'title_zh' => '濃鹽水中的菜葉',
            'title_en' => 'A leaf in salty water',
            'prompt_zh' => '為什麼把新鮮菜葉浸在濃鹽水裡，菜會變軟，外面還會滲出水？',
            'prompt_en' => 'Why does a fresh leaf go soft and leak water when it is soaked in concentrated salt solution?',
            'points_zh' => [
                '細胞膜是部分透膜，水可以通過',
                '濃鹽水的水勢比細胞液低',
                '水藉滲透由細胞內淨移向細胞外',
                '細胞失去水分而軟縮，所以菜變軟並見到水滲出',
            ],
            'points_en' => [
                'The cell membrane is partially permeable, so water can pass',
                'Concentrated salt solution has a lower water potential than the cell sap',
                'Water moves out of the cell by osmosis',
                'The cells lose water and become flaccid, so the leaf softens and water appears outside',
            ],
            'misconceptions_zh' => [
                '這只是食鹽進入細胞把細胞撐破',
                '水由濃溶液流向稀溶液',
            ],
        ],
        [
            'key' => 'breathing_vs_respiration',
            'subject' => 'biology',
            'title_zh' => '呼吸運動與呼吸作用',
            'title_en' => 'Breathing and respiration',
            'prompt_zh' => '呼吸運動和呼吸作用有什麼分別？兩者有什麼關係？',
            'prompt_en' => 'What is the difference between breathing and respiration, and how are they related?',
            'points_zh' => [
                '呼吸運動是胸腔擴大與縮小，令空氣進出肺的機械過程',
                '呼吸作用是細胞內分解食物以釋放能量的化學過程，主要在線粒體進行',
                '需氧呼吸用葡萄糖和氧，產生二氧化碳、水和能量',
                '呼吸運動供應氧並帶走二氧化碳，但肺的起伏本身不是釋放能量的反應',
            ],
            'points_en' => [
                'Breathing is the mechanical movement of the chest that moves air into and out of the lungs',
                'Respiration is the chemical release of energy from food inside cells, mainly in mitochondria',
                'Aerobic respiration uses glucose and oxygen and produces carbon dioxide, water and energy',
                'Breathing supplies oxygen and removes carbon dioxide; chest movement itself does not release the energy',
            ],
            'misconceptions_zh' => [
                '呼吸就只是肺一起一伏',
                '植物只進行光合作用、不進行呼吸作用',
            ],
        ],
    ];
}

/**
 * @return array{
 *   key:string,subject:string,title_zh:string,title_en:string,prompt_zh:string,prompt_en:string,
 *   points_zh:list<string>,points_en:list<string>,misconceptions_zh:list<string>
 * }|null
 */
function explanation_question(string $key): ?array
{
    foreach (explanation_questions() as $question) {
        if ($question['key'] === $key) {
            return $question;
        }
    }

    return null;
}

function explanation_clip(string $text, int $max): string
{
    $text = trim($text);
    if (mb_strlen($text) <= $max) {
        return $text;
    }

    return mb_substr($text, 0, $max);
}

/**
 * @return array{ok:true,score:int,feedback_zh:string,feedback_en:string}|array{ok:false}
 */
function explanation_parse_judge(string $raw): array
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

    return [
        'ok' => true,
        'score' => max(0, min(100, (int) round((float) $json['score']))),
        'feedback_zh' => explanation_clip($zh, 800),
        'feedback_en' => explanation_clip($en, 800),
    ];
}

/**
 * @return array<string, array{best_score:int,attempt_count:int}>
 */
function explanation_user_stats(PDO $pdo, int $userId): array
{
    explanation_ensure_schema($pdo);
    $stmt = $pdo->prepare(
        'SELECT question_key, MAX(score) AS best_score, COUNT(*) AS attempt_count
         FROM explanation_attempts
         WHERE user_id = ?
         GROUP BY question_key'
    );
    $stmt->execute([$userId]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $key = (string) ($row['question_key'] ?? '');
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
 * @return array{configured:bool,pass_score:int,max_seconds:int,subjects:list<array<string,string>>,questions:list<array<string,mixed>>}
 */
function explanation_catalog_payload(bool $configured, array $stats): array
{
    $questions = [];
    foreach (explanation_questions() as $question) {
        $stat = $stats[$question['key']] ?? null;
        $questions[] = [
            'key' => $question['key'],
            'subject' => $question['subject'],
            'title_zh' => $question['title_zh'],
            'title_en' => $question['title_en'],
            'prompt_zh' => $question['prompt_zh'],
            'prompt_en' => $question['prompt_en'],
            'best_score' => $stat['best_score'] ?? null,
            'attempt_count' => $stat['attempt_count'] ?? 0,
        ];
    }

    return [
        'configured' => $configured,
        'pass_score' => EXPLANATION_PASS_SCORE,
        'max_seconds' => EXPLANATION_MAX_SECONDS,
        'subjects' => explanation_subjects(),
        'questions' => $questions,
    ];
}

/**
 * @return array{ok:true,path:string,mime:string,filename:string}|array{ok:false,error:string,status:int}
 */
function explanation_audio_upload(): array
{
    if (!isset($_FILES['audio']) || !is_array($_FILES['audio'])) {
        return ['ok' => false, 'error' => '請先錄音。', 'status' => 422];
    }
    $file = $_FILES['audio'];
    $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        return ['ok' => false, 'error' => '錄音太長，請在九十秒內講完。', 'status' => 422];
    }
    if ($err !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => '無法讀取錄音。', 'status' => 422];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => '無法讀取錄音。', 'status' => 422];
    }
    $size = (int) ($file['size'] ?? 0);
    if ($size < EXPLANATION_MIN_BYTES) {
        return ['ok' => false, 'error' => '錄音太短，請用自己的話說出原因。', 'status' => 422];
    }
    if ($size > EXPLANATION_MAX_BYTES) {
        return ['ok' => false, 'error' => '錄音太長，請在九十秒內講完。', 'status' => 422];
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
        'filename' => 'explanation.' . $allowed[$mime],
    ];
}

/**
 * @return array{ok:true,text:string}|array{ok:false,error:string,status:int}
 */
function explanation_transcribe(string $path, string $mime, string $filename): array
{
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => '伺服器未啟用網路連線元件。', 'status' => 503];
    }
    require_once __DIR__ . '/config.php';
    $apiKey = config_xai_api_key();
    if ($apiKey === '') {
        return ['ok' => false, 'error' => '尚未設定 XAI_API_KEY，暫時不能評分。', 'status' => 503];
    }
    $ch = curl_init(EXPLANATION_STT_URL);
    if ($ch === false) {
        return ['ok' => false, 'error' => '無法連線到語音辨識服務。', 'status' => 503];
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'model' => EXPLANATION_STT_MODEL,
            'language' => 'zh',
            'file' => new CURLFile($path, $mime, $filename),
        ],
        CURLOPT_HTTPHEADER => [
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

    return ['ok' => true, 'text' => explanation_clip((string) ($json['text'] ?? ''), 2000)];
}

/**
 * @param array{prompt_zh:string,points_zh:list<string>,points_en:list<string>,misconceptions_zh:list<string>} $question
 * @return array{ok:true,score:int,feedback_zh:string,feedback_en:string}|array{ok:false}
 */
function explanation_judge(array $question, string $transcript): array
{
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/sim_html_agent_lib.php';
    $points = [];
    foreach ($question['points_zh'] as $i => $point) {
        $n = $i + 1;
        $en = $question['points_en'][$i] ?? '';
        $points[] = $n . '. ' . $point . ($en !== '' ? ' / ' . $en : '');
    }
    $wrongs = [];
    foreach ($question['misconceptions_zh'] as $i => $item) {
        $wrongs[] = ($i + 1) . '. ' . $item;
    }
    $system = '你是香港初中科學老師。學生用口語解釋一題科學問題。你只根據語音轉寫評科學內容，不要假裝聽過錄音。'
        . '轉寫可能是廣東話口語、夾雜英文科學詞，或有同音錯字；按意思判斷，不要因為不夠書面而扣分。'
        . '學生不必背出完整方程式的每一個係數，但關鍵物質、方向或比例錯了要扣分。'
        . '回覆必須是一個 JSON 物件，不要加其他文字。';
    $user = "題目：{$question['prompt_zh']}\n評分要點：\n" . implode("\n", $points)
        . "\n出現以下錯誤時要扣分：\n" . implode("\n", $wrongs)
        . "\n學生轉寫：{$transcript}\n"
        . '輸出 {"score":0到100的整數,"feedback_zh":"不多於160字的繁體中文，先說對了什麼，再說缺了或錯了什麼","feedback_en":"two short English sentences"}。'
        . '四項要點都講到且沒有科學錯誤，score 在 90 以上。主要機制正確但漏了一項，約 70 到 85。'
        . '只講到表面現象，或混有上面的錯誤，約 40 到 65。機制錯誤、離題或幾乎沒有科學內容，低於 40。'
        . '不要在評語裡逐條抄出評分要點。';
    $chat = sim_xai_chat_complete(config_xai_model(), $system, $user, 'low');
    if (!$chat['ok']) {
        return ['ok' => false];
    }

    return explanation_parse_judge($chat['content']);
}

/**
 * @param array{key:string,prompt_zh:string,points_zh:list<string>,points_en:list<string>,misconceptions_zh:list<string>} $question
 * @param array{path:string,mime:string,filename:string} $audio
 * @return array{ok:true,score:int,transcript:string,feedback_zh:string,feedback_en:string,key_points_zh:list<string>,key_points_en:list<string>}|array{ok:false,error:string,status:int}
 */
function explanation_score_audio(array $question, array $audio): array
{
    $stt = explanation_transcribe($audio['path'], $audio['mime'], $audio['filename']);
    if (!$stt['ok']) {
        return $stt;
    }
    $transcript = $stt['text'];
    if ($transcript === '') {
        return [
            'ok' => true,
            'score' => 0,
            'transcript' => '',
            'feedback_zh' => '沒有聽清楚。請靠近麥克風，用自己的話說出原因。',
            'feedback_en' => 'Nothing was heard. Move closer to the microphone and explain the reason in your own words.',
            'key_points_zh' => $question['points_zh'],
            'key_points_en' => $question['points_en'],
        ];
    }
    $judge = explanation_judge($question, $transcript);
    if (!$judge['ok']) {
        return ['ok' => false, 'error' => '暫時未能分析這段解釋，請再試一次。', 'status' => 502];
    }

    return [
        'ok' => true,
        'score' => $judge['score'],
        'transcript' => $transcript,
        'feedback_zh' => $judge['feedback_zh'] !== ''
            ? $judge['feedback_zh']
            : '已收到解釋。請再看參考要點，補上未提到的科學原因。',
        'feedback_en' => $judge['feedback_en'] !== ''
            ? $judge['feedback_en']
            : 'Your explanation was received. Compare it with the key points and add any missing science.',
        'key_points_zh' => $question['points_zh'],
        'key_points_en' => $question['points_en'],
    ];
}

function explanation_audio_extension(string $filename): string
{
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $allowed = ['webm' => true, 'm4a' => true, 'mp3' => true, 'wav' => true, 'ogg' => true];

    return isset($allowed[$ext]) ? $ext : '';
}

function explanation_audio_mime(string $ext): string
{
    return match ($ext) {
        'webm' => 'audio/webm',
        'm4a' => 'audio/mp4',
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/wav',
        'ogg' => 'audio/ogg',
        default => 'application/octet-stream',
    };
}

function explanation_storage_dir(): string
{
    return dirname(__DIR__) . '/uploads/explanations';
}

function explanation_audio_disk_path(int $userId, int $attemptId, string $ext): ?string
{
    $ext = explanation_audio_extension('clip.' . $ext);
    if ($userId < 1 || $attemptId < 1 || $ext === '') {
        return null;
    }
    $root = explanation_storage_dir();
    $path = $root . '/' . $userId . '/' . $attemptId . '.' . $ext;
    $rootReal = realpath($root);
    $fileReal = realpath($path);
    if ($rootReal !== false && $fileReal !== false && !str_starts_with($fileReal, $rootReal . DIRECTORY_SEPARATOR)) {
        return null;
    }

    return $path;
}

function explanation_store_audio(int $userId, int $attemptId, string $tmpPath, string $filename): bool
{
    $ext = explanation_audio_extension($filename);
    $dest = explanation_audio_disk_path($userId, $attemptId, $ext);
    if ($dest === null || $tmpPath === '' || !is_file($tmpPath)) {
        return false;
    }
    $dir = dirname($dest);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return false;
    }

    return copy($tmpPath, $dest);
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function explanation_attempt_payload(array $row, bool $withOwner = false): array
{
    $ext = explanation_audio_extension('clip.' . (string) ($row['audio_ext'] ?? ''));
    $payload = [
        'id' => (int) ($row['id'] ?? 0),
        'question_key' => (string) ($row['question_key'] ?? ''),
        'score' => (int) ($row['score'] ?? 0),
        'transcript' => (string) ($row['transcript'] ?? ''),
        'feedback_zh' => (string) ($row['feedback_zh'] ?? ''),
        'feedback_en' => (string) ($row['feedback_en'] ?? ''),
        'has_audio' => $ext !== '',
        'created_at' => (string) ($row['created_at'] ?? ''),
    ];
    $question = explanation_question($payload['question_key']);
    if ($question !== null) {
        $payload['title_zh'] = $question['title_zh'];
        $payload['title_en'] = $question['title_en'];
        $payload['subject'] = $question['subject'];
    }
    if ($withOwner) {
        require_once __DIR__ . '/user_names_lib.php';
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
function explanation_list_user_attempts(PDO $pdo, int $userId, string $questionKey): array
{
    explanation_ensure_schema($pdo);
    $stmt = $pdo->prepare(
        'SELECT id, question_key, transcript, score, feedback_zh, feedback_en, audio_ext, created_at
         FROM explanation_attempts
         WHERE user_id = ? AND question_key = ?
         ORDER BY id DESC
         LIMIT 20'
    );
    $stmt->execute([$userId, $questionKey]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $out[] = explanation_attempt_payload($row, false);
    }

    return $out;
}

/**
 * @return list<array<string, mixed>>
 */
function explanation_list_admin_attempts(PDO $pdo, string $query, string $questionKey): array
{
    explanation_ensure_schema($pdo);
    $sql = 'SELECT a.id, a.user_id, a.question_key, a.transcript, a.score, a.feedback_zh, a.feedback_en,
                   a.audio_ext, a.created_at, u.email, u.name_zh, u.name_en, u.display_name
            FROM explanation_attempts a
            LEFT JOIN users u ON u.id = a.user_id';
    $where = [];
    $params = [];
    if ($questionKey !== '') {
        $where[] = 'a.question_key = ?';
        $params[] = $questionKey;
    }
    $query = trim($query);
    if ($query !== '') {
        $where[] = '(u.email LIKE ? OR u.name_zh LIKE ? OR u.name_en LIKE ? OR u.display_name LIKE ?)';
        $like = '%' . $query . '%';
        array_push($params, $like, $like, $like, $like);
    }
    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY a.id DESC LIMIT 80';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $out[] = explanation_attempt_payload($row, true);
    }

    return $out;
}

/**
 * @return array<string, mixed>|null
 */
function explanation_fetch_attempt(PDO $pdo, int $id): ?array
{
    explanation_ensure_schema($pdo);
    $stmt = $pdo->prepare(
        'SELECT id, user_id, question_key, transcript, score, feedback_zh, feedback_en, audio_ext, created_at
         FROM explanation_attempts WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
}

function explanation_stream_audio(array $attempt): void
{
    $path = explanation_audio_disk_path(
        (int) ($attempt['user_id'] ?? 0),
        (int) ($attempt['id'] ?? 0),
        (string) ($attempt['audio_ext'] ?? '')
    );
    if ($path === null || !is_file($path)) {
        api_json_error('not_found', '找不到這段錄音。', 404);
    }
    $ext = explanation_audio_extension('clip.' . (string) ($attempt['audio_ext'] ?? ''));
    header('Content-Type: ' . explanation_audio_mime($ext));
    header('Content-Length: ' . (string) filesize($path));
    header('Content-Disposition: inline; filename="explanation-' . (int) $attempt['id'] . '.' . $ext . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, max-age=3600');
    readfile($path);
    exit;
}

/**
 * @return array{id:int,best_score:int,attempt_count:int}
 */
function explanation_save_attempt(
    PDO $pdo,
    int $userId,
    string $questionKey,
    string $transcript,
    int $score,
    string $feedbackZh,
    string $feedbackEn
): array {
    explanation_ensure_schema($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO explanation_attempts (user_id, question_key, transcript, score, feedback_zh, feedback_en)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $userId,
        $questionKey,
        explanation_clip($transcript, 2000),
        max(0, min(100, $score)),
        explanation_clip($feedbackZh, 800),
        explanation_clip($feedbackEn, 800),
    ]);
    $id = (int) $pdo->lastInsertId();
    $stats = explanation_user_stats($pdo, $userId);

    return [
        'id' => $id,
        'best_score' => $stats[$questionKey]['best_score'] ?? $score,
        'attempt_count' => $stats[$questionKey]['attempt_count'] ?? 1,
    ];
}

function explanation_mark_audio(PDO $pdo, int $attemptId, string $filename): void
{
    $ext = explanation_audio_extension($filename);
    if ($attemptId < 1 || $ext === '') {
        return;
    }
    $stmt = $pdo->prepare('UPDATE explanation_attempts SET audio_ext = ? WHERE id = ?');
    $stmt->execute([$ext, $attemptId]);
}
