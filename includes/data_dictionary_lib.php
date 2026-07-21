<?php

declare(strict_types=1);

/** @var array<string, string> */
const DD_TABLE_DESCRIPTIONS = [
    'users' => '使用者帳戶（電郵、密碼雜湊、中英文名、啟用狀態）',
    'roles' => '角色定義（admin、teacher、student）',
    'user_roles' => '使用者與角色的多對多關聯',
    'permissions' => '權限代碼與說明',
    'role_permissions' => '角色與權限的多對多關聯',
    'subjects' => '模擬／內容科目（slug、雙語名稱、排序）',
    'topics' => '科目下的課題／單元',
    'simulations' => '互動模擬程式目錄與 HTML 路徑',
    'tags' => '模擬標籤',
    'simulation_tags' => '模擬與標籤的多對多關聯',
    'api_rate_limits' => 'API 速率限制（如登入嘗試）',
    'learning_tools' => '互動學習工具（四選一 MCQ 集）',
    'quiz_questions' => '學習工具題目',
    'quiz_options' => '學習工具 MCQ 選項',
    'science_articles' => '科學文章（Markdown 內文）',
    'article_questions' => '文章理解題',
    'article_options' => '文章理解題選項',
    'learning_notes' => '學習筆記（Markdown）',
    'worksheets' => '工作紙（Markdown，可嵌入模擬／試題）',
    'learning_videos' => '自學課程嵌入影片（雙語 embed URL）',
    'topic_learning_items' => '課題混合編排（筆記、模擬、工作紙等排序）',
    'question_banks' => '試題庫',
    'qb_questions' => '試題庫題目（多題型）',
    'qb_mcq_options' => '試題庫 MCQ 選項',
    'qb_question_parts' => '長答子題',
    'qb_fill_blanks' => '填充題可接受答案',
    'qb_question_media' => '試題附件／圖片',
    'classes' => '教師課程／班級（邀請碼、年級 form_level、科目 course_subject）',
    'class_enrollments' => '學生選課紀錄（班別、班號、MOI）',
    'student_profiles' => '學生延伸資料（學號、級別、語言偏好）',
    'learning_events' => 'SDL 學習行為事件（頁面瀏覽、時數）',
    'learning_attempts' => '測驗／作答提交紀錄',
    'learning_responses' => '單次作答的逐題回應',
    'topic_mastery' => '課題掌握度分數',
    'learning_goals' => '每週學習目標',
    'content_bookmarks' => '使用者書籤',
    'worksheet_assignments' => '工作紙派發（班級、截止、滿分）',
    'worksheet_assignment_students' => '派發對象（全班或指定學生）',
    'worksheet_submissions' => '學生提交、評分、自動計分 JSON',
    'summer_homework_items' => '暑期功課習作（中一／中二；篇章或影片）',
    'summer_homework_questions' => '暑期功課題目（選擇／填充）',
    'summer_homework_mcq_options' => '暑期功課選擇題選項',
    'summer_homework_fill_blanks' => '暑期功課填充題答案',
    'summer_homework_attempts' => '暑期功課作答紀錄（及格／重做）',
    'spa_nav_visibility' => '前台 SPA 上方選單依對象（訪客／學生／教師／管理員）的可見性',
];

/** @var array<string, string> */
const DD_COLUMN_HINTS = [
    'slug' => 'URL 識別碼（唯一）',
    'owner_user_id' => '內容擁有者 users.id',
    'subject_id' => 'subjects.id',
    'topic_id' => 'topics.id',
    'user_id' => 'users.id',
    'role_id' => 'roles.id',
    'permission_id' => 'permissions.id',
    'class_id' => 'classes.id',
    'worksheet_id' => 'worksheets.id',
    'assignment_id' => 'worksheet_assignments.id',
    'bank_id' => 'question_banks.id',
    'question_id' => '題目 id（依上下文）',
    'status' => '狀態（見 ENUM 值）',
    'responses_json' => '工作紙作答 JSON（自動計分）',
    'moi' => '應考語言：E=英文、C=中文',
    'invite_code' => '班級邀請／註冊碼',
];

function dd_project_root(): string
{
    return dirname(__DIR__);
}

function dd_schema_path(): string
{
    return dd_project_root() . '/schema.sql';
}

function dd_output_path(): string
{
    return dd_project_root() . '/data_dictionary.md';
}

/**
 * @return array{ok:bool,error?:string,output?:string,table_count?:int}
 */
function dd_generate(?string $outputPath = null): array
{
    $schemaFile = dd_schema_path();
    $output = $outputPath ?? dd_output_path();

    if (!is_readable($schemaFile)) {
        return ['ok' => false, 'error' => '找不到或無法讀取 schema.sql。'];
    }

    $sql = file_get_contents($schemaFile);
    if ($sql === false) {
        return ['ok' => false, 'error' => '讀取 schema.sql 失敗。'];
    }

    $sections = dd_parse_schema_sections($sql);
    $md = dd_render_data_dictionary($sections);

    $dir = dirname($output);
    if ($dir !== '' && $dir !== '.' && !is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => '無法建立輸出目錄。'];
    }

    if (file_put_contents($output, $md) === false) {
        return ['ok' => false, 'error' => '寫入 data_dictionary.md 失敗。'];
    }

    $tableCount = 0;
    foreach ($sections as $section) {
        $tableCount += count($section['tables']);
    }

    return [
        'ok' => true,
        'output' => $output,
        'table_count' => $tableCount,
    ];
}

/**
 * @return list<array{title:string, tables:list<array{name:string, engine:string, columns:list<array<string, string>>, keys:list<array<string, string>>}>}>
 */
function dd_parse_schema_sections(string $sql): array
{
    /** @var list<array{pos:int, title:string}> $sectionMarkers */
    $sectionMarkers = [];
    if (preg_match_all('/^--\s+([A-Za-z][^\r\n]*)$/m', $sql, $sm, PREG_OFFSET_CAPTURE)) {
        foreach ($sm[1] as $i => $match) {
            $comment = trim($match[0]);
            $upper = strtoupper($comment);
            if (str_starts_with($upper, 'DROP ')
                || str_starts_with($upper, 'SEED')
                || str_starts_with($comment, 'Science Sims')
                || str_starts_with($comment, 'Fresh install')
                || str_starts_with($comment, '不使用 FOREIGN')) {
                continue;
            }
            $sectionMarkers[] = ['pos' => $sm[0][$i][1], 'title' => $comment];
        }
    }

    $grouped = [];
    if (!preg_match_all(
        '/CREATE TABLE\s+`?(\w+)`?\s*\((.*?)\)\s*ENGINE\s*=\s*(\w+)/is',
        $sql,
        $matches,
        PREG_OFFSET_CAPTURE
    )) {
        return [];
    }

    foreach ($matches[1] as $i => $nameMatch) {
        $name = $nameMatch[0];
        $body = $matches[2][$i][0];
        $engine = $matches[3][$i][0];
        $pos = $nameMatch[1];

        $sectionTitle = 'General';
        foreach ($sectionMarkers as $marker) {
            if ($marker['pos'] < $pos) {
                $sectionTitle = $marker['title'];
            }
        }

        $parsed = dd_parse_create_table($name, "CREATE TABLE {$name} ({$body}) ENGINE={$engine}");
        if ($parsed === null) {
            continue;
        }

        if (!isset($grouped[$sectionTitle])) {
            $grouped[$sectionTitle] = [];
        }
        $grouped[$sectionTitle][] = $parsed;
    }

    $sections = [];
    foreach ($grouped as $title => $tables) {
        $sections[] = ['title' => $title, 'tables' => $tables];
    }

    return $sections;
}

/**
 * @return array{name:string, engine:string, columns:list<array<string, string>>, keys:list<array<string, string>>}|null
 */
function dd_parse_create_table(string $name, string $ddl): ?array
{
    if (!preg_match('/\((.*)\)\s*ENGINE\s*=\s*(\w+)/is', $ddl, $m)) {
        return null;
    }

    $engine = $m[2];
    $bodyLines = preg_split('/\r\n|\r|\n/', $m[1]) ?: [];
    $columns = [];
    $keys = [];

    foreach ($bodyLines as $rawLine) {
        $line = trim($rawLine);
        $line = rtrim($line, ',');
        if ($line === '') {
            continue;
        }

        if (preg_match('/^(PRIMARY KEY|UNIQUE KEY|KEY)\s+/i', $line)) {
            $keys[] = dd_parse_key_line($line);
            continue;
        }

        $col = dd_parse_column_line($line);
        if ($col !== null) {
            $columns[] = $col;
        }
    }

    return [
        'name' => $name,
        'engine' => $engine,
        'columns' => $columns,
        'keys' => $keys,
    ];
}

/**
 * @return array<string, string>|null
 */
function dd_parse_column_line(string $line): ?array
{
    if (!preg_match('/^`?(\w+)`?\s+(.+)$/i', $line, $m)) {
        return null;
    }

    $name = $m[1];
    $rest = $m[2];

    $nullable = stripos($rest, 'NOT NULL') !== false ? 'NO' : 'YES';
    $default = '';
    if (preg_match('/\bDEFAULT\s+((?:CURRENT_TIMESTAMP|\([^\)]*\)|\'[^\']*\'|"[^"]*"|[^\s,]+))/i', $rest, $dm)) {
        $default = $dm[1];
    }

    $keyFlags = [];
    if (preg_match('/\bPRIMARY KEY\b/i', $rest)) {
        $keyFlags[] = 'PK';
    }
    if (preg_match('/\bAUTO_INCREMENT\b/i', $rest)) {
        $keyFlags[] = 'AI';
    }

    return [
        'name' => $name,
        'type' => dd_extract_column_type($rest),
        'nullable' => $nullable,
        'default' => $default,
        'key' => implode(', ', $keyFlags),
        'hint' => DD_COLUMN_HINTS[$name] ?? '',
    ];
}

function dd_extract_column_type(string $rest): string
{
    $rest = preg_replace('/\s+NOT NULL/i', '', $rest) ?? $rest;
    $rest = preg_replace('/\s+NULL/i', '', $rest) ?? $rest;
    $rest = preg_replace('/\s+DEFAULT\s+.*/i', '', $rest) ?? $rest;
    $rest = preg_replace('/\s+AUTO_INCREMENT/i', '', $rest) ?? $rest;
    $rest = preg_replace('/\s+PRIMARY KEY/i', '', $rest) ?? $rest;
    $rest = preg_replace('/\s+ON UPDATE CURRENT_TIMESTAMP/i', '', $rest) ?? $rest;

    return trim($rest);
}

/**
 * @return array<string, string>
 */
function dd_parse_key_line(string $line): array
{
    $kind = 'KEY';
    if (preg_match('/^PRIMARY KEY/i', $line)) {
        $kind = 'PRIMARY';
    } elseif (preg_match('/^UNIQUE KEY/i', $line)) {
        $kind = 'UNIQUE';
    }

    $name = '';
    if (preg_match('/\bKEY\s+`?(\w+)`?\s*\(/i', $line, $nm)) {
        $name = $nm[1];
    } elseif ($kind === 'PRIMARY') {
        $name = 'PRIMARY';
    }

    $cols = '';
    if (preg_match('/\(([^)]+)\)/', $line, $cm)) {
        $cols = preg_replace('/[`\s]/', '', $cm[1]) ?? $cm[1];
    }

    return [
        'name' => $name,
        'kind' => $kind,
        'columns' => $cols,
    ];
}

/**
 * @param list<array{title:string, tables:list<array{name:string, engine:string, columns:list<array<string, string>>, keys:list<array<string, string>>}>}> $sections
 */
function dd_render_data_dictionary(array $sections): string
{
    $now = (new DateTimeImmutable('now', new DateTimeZone('Asia/Hong_Kong')))->format('Y-m-d H:i');

    $out = [];
    $out[] = '# 資料字典 | Data Dictionary';
    $out[] = '';
    $out[] = '本文件由 [`update_data_dictionary.php`](update_data_dictionary.php) 自 [`schema.sql`](schema.sql) 自動產生；';
    $out[] = '亦可於後台 [`admin/data_dictionary.php`](admin/data_dictionary.php) 閱讀並重新產生。';
    $out[] = '';
    $out[] = '```bash';
    $out[] = 'php update_data_dictionary.php';
    $out[] = '```';
    $out[] = '';
    $out[] = '> **注意**：本專案不使用 FOREIGN KEY；關聯由 PHP 應用層維護。';
    $out[] = '';
    $out[] = '**最後更新**：' . $now . ' HKT';
    $out[] = '';

    $out[] = '## 目錄 | Table of contents';
    $out[] = '';
    foreach ($sections as $section) {
        if ($section['tables'] === []) {
            continue;
        }
        $anchor = dd_slug_anchor($section['title']);
        $out[] = '- [' . dd_md_escape($section['title']) . '](#' . $anchor . ')';
        foreach ($section['tables'] as $table) {
            $out[] = '  - [`' . $table['name'] . '`](#' . dd_slug_anchor($table['name']) . ')';
        }
    }
    $out[] = '';

    $out[] = '## 概覽 | Overview';
    $out[] = '';
    $out[] = '| 資料表 | 說明 | 引擎 |';
    $out[] = '|--------|------|------|';
    foreach ($sections as $section) {
        foreach ($section['tables'] as $table) {
            $desc = DD_TABLE_DESCRIPTIONS[$table['name']] ?? '';
            $out[] = '| `' . $table['name'] . '` | ' . dd_md_escape($desc) . ' | ' . $table['engine'] . ' |';
        }
    }
    $out[] = '';

    foreach ($sections as $section) {
        if ($section['tables'] === []) {
            continue;
        }
        $out[] = '## ' . dd_md_escape($section['title']);
        $out[] = '';

        foreach ($section['tables'] as $table) {
            $out[] = '### `' . $table['name'] . '`';
            $out[] = '';
            $desc = DD_TABLE_DESCRIPTIONS[$table['name']] ?? '';
            if ($desc !== '') {
                $out[] = dd_md_escape($desc);
                $out[] = '';
            }
            $out[] = '**引擎**：`' . $table['engine'] . '` · **欄位數**：' . count($table['columns']);
            $out[] = '';
            $out[] = '| 欄位 | 型別 | NULL | 預設 | 鍵 | 備註 |';
            $out[] = '|------|------|:----:|------|:---:|------|';
            foreach ($table['columns'] as $col) {
                $out[] = '| `' . $col['name'] . '` | `' . dd_md_escape($col['type']) . '` | '
                    . $col['nullable'] . ' | '
                    . ($col['default'] !== '' ? '`' . dd_md_escape($col['default']) . '`' : '—') . ' | '
                    . ($col['key'] !== '' ? dd_md_escape($col['key']) : '—') . ' | '
                    . ($col['hint'] !== '' ? dd_md_escape($col['hint']) : '—') . ' |';
            }
            $out[] = '';

            if ($table['keys'] !== []) {
                $out[] = '#### 索引 | Indexes';
                $out[] = '';
                $out[] = '| 名稱 | 類型 | 欄位 |';
                $out[] = '|------|------|------|';
                foreach ($table['keys'] as $key) {
                    $out[] = '| `' . dd_md_escape($key['name']) . '` | ' . $key['kind'] . ' | `' . dd_md_escape($key['columns']) . '` |';
                }
                $out[] = '';
            }
        }
    }

    $out[] = '---';
    $out[] = '';
    $out[] = '## 相關文件';
    $out[] = '';
    $out[] = '- [`schema.sql`](schema.sql) — 完整 DDL';
    $out[] = '- [`architecture.md`](architecture.md) — 架構與 API';
    $out[] = '- [`admin/data_dictionary.php`](admin/data_dictionary.php) — 後台閱讀器';
    $out[] = '';

    return implode("\n", $out) . "\n";
}

function dd_slug_anchor(string $text): string
{
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9\s_-]+/', '', $text) ?? $text;
    $text = preg_replace('/[\s_]+/', '-', trim($text)) ?? $text;

    return $text;
}

function dd_md_escape(string $text): string
{
    return str_replace(['|', "\n"], ['\\|', ' '], $text);
}
