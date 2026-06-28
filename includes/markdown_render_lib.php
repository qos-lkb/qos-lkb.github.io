<?php

declare(strict_types=1);

function markdown_to_html(string $markdown): string
{
    $lines = explode("\n", $markdown);
    $html = [];
    $inCodeBlock = false;
    $codeBlockContent = [];
    $codeBlockLang = '';
    $inTable = false;
    $tableRows = [];

    foreach ($lines as $line) {
        if (preg_match('/^```(\w+)?$/', $line, $matches)) {
            if ($inCodeBlock) {
                $code = htmlspecialchars(implode("\n", $codeBlockContent), ENT_QUOTES, 'UTF-8');
                $lang = $codeBlockLang !== '' ? ' class="language-' . htmlspecialchars($codeBlockLang, ENT_QUOTES, 'UTF-8') . '"' : '';
                $html[] = '<pre><code' . $lang . '>' . $code . '</code></pre>';
                $codeBlockContent = [];
                $codeBlockLang = '';
                $inCodeBlock = false;
            } else {
                $codeBlockLang = $matches[1] ?? '';
                $inCodeBlock = true;
            }
            continue;
        }

        if ($inCodeBlock) {
            $codeBlockContent[] = $line;
            continue;
        }

        if (preg_match('/^\|(.+)\|$/', $line)) {
            if (!$inTable) {
                $inTable = true;
                $tableRows = [];
            }
            $tableRows[] = $line;
            continue;
        }

        if ($inTable) {
            if (count($tableRows) >= 2) {
                $html[] = markdown_process_table($tableRows);
            }
            $tableRows = [];
            $inTable = false;
        }

        $trimmed = trim($line);

        if ($trimmed === '') {
            $html[] = '';
            continue;
        }

        if (preg_match('/^---+$/', $trimmed)) {
            $html[] = '<hr>';
            continue;
        }

        if (preg_match('/^>\s+(.+)$/', $trimmed, $matches)) {
            $html[] = '<blockquote><p>' . markdown_process_inline($matches[1]) . '</p></blockquote>';
            continue;
        }

        if (preg_match('/^(#{1,6})\s+(.+)$/', $trimmed, $matches)) {
            $level = strlen($matches[1]);
            $raw = $matches[2];
            $id = markdown_heading_anchor($raw);
            $text = markdown_process_inline($raw);
            $html[] = '<h' . $level . ' id="' . htmlspecialchars($id, ENT_QUOTES, 'UTF-8') . '">' . $text . '</h' . $level . '>';
            continue;
        }

        if (preg_match('/^[-*]\s+(.+)$/', $trimmed, $matches)) {
            $html[] = '<ul><li>' . markdown_process_inline($matches[1]) . '</li></ul>';
            continue;
        }

        if (preg_match('/^\d+\.\s+(.+)$/', $trimmed, $matches)) {
            $html[] = '<ol><li>' . markdown_process_inline($matches[1]) . '</li></ol>';
            continue;
        }

        $html[] = '<p>' . markdown_process_inline($trimmed) . '</p>';
    }

    if ($inTable && count($tableRows) >= 2) {
        $html[] = markdown_process_table($tableRows);
    }

    if ($inCodeBlock && $codeBlockContent !== []) {
        $code = htmlspecialchars(implode("\n", $codeBlockContent), ENT_QUOTES, 'UTF-8');
        $lang = $codeBlockLang !== '' ? ' class="language-' . htmlspecialchars($codeBlockLang, ENT_QUOTES, 'UTF-8') . '"' : '';
        $html[] = '<pre><code' . $lang . '>' . $code . '</code></pre>';
    }

    $result = [];
    $prevIsList = false;
    $listType = '';

    foreach ($html as $item) {
        if (preg_match('/^<(ul|ol)><li>(.+?)<\/li><\/\1>$/', $item, $matches)) {
            if ($prevIsList && $listType === $matches[1]) {
                $lastIndex = count($result) - 1;
                $result[$lastIndex] = preg_replace(
                    '/<\/' . $listType . '>$/',
                    '<li>' . $matches[2] . '</li></' . $listType . '>',
                    $result[$lastIndex]
                ) ?? $result[$lastIndex];
            } else {
                $result[] = $item;
                $prevIsList = true;
                $listType = $matches[1];
            }
        } else {
            $result[] = $item;
            $prevIsList = false;
        }
    }

    return implode("\n", $result);
}

function markdown_heading_anchor(string $raw): string
{
    $plain = preg_replace('/`([^`]+)`/', '$1', $raw) ?? $raw;
    $plain = preg_replace('/\[([^\]]*)\]\([^)]*\)/', '$1', $plain) ?? $plain;
    $plain = strtolower(trim($plain));
    $plain = preg_replace('/[^a-z0-9\s_-]+/', '', $plain) ?? $plain;

    return preg_replace('/[\s_]+/', '-', trim($plain)) ?? trim($plain);
}

function markdown_process_inline(string $text): string
{
    $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');

    $text = preg_replace('/`([^`]+)`/', '<code>$1</code>', $text) ?? $text;
    $text = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '<a href="$2">$1</a>', $text) ?? $text;
    $text = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $text) ?? $text;
    $text = preg_replace('/__([^_]+)__/', '<strong>$1</strong>', $text) ?? $text;

    $parts = preg_split('/(<code>.*?<\/code>|<strong>.*?<\/strong>|<a [^>]+>.*?<\/a>)/', $text, -1, PREG_SPLIT_DELIM_CAPTURE);
    $result = '';
    foreach ($parts as $part) {
        if ($part === '') {
            continue;
        }
        if (preg_match('/^<(code|strong|a)/', $part)) {
            $result .= $part;
        } else {
            $part = preg_replace('/\*([^*]+)\*/', '<em>$1</em>', $part) ?? $part;
            $part = preg_replace('/(?<!_)_([^_]+)_(?!_)/', '<em>$1</em>', $part) ?? $part;
            $result .= $part;
        }
    }

    return $result;
}

/**
 * @param list<string> $rows
 */
function markdown_process_table(array $rows): string
{
    if (count($rows) < 2) {
        return '';
    }

    $header = array_map('trim', explode('|', $rows[0]));
    $header = array_values(array_filter($header, static fn (string $cell): bool => $cell !== ''));

    $html = '<table><thead><tr>';
    foreach ($header as $cell) {
        $html .= '<th>' . markdown_process_inline($cell) . '</th>';
    }
    $html .= '</tr></thead><tbody>';

    for ($i = 2, $n = count($rows); $i < $n; $i++) {
        $cells = array_map('trim', explode('|', $rows[$i]));
        $cells = array_values(array_filter($cells, static fn (string $cell): bool => $cell !== ''));
        if ($cells === []) {
            continue;
        }
        $html .= '<tr>';
        foreach ($cells as $cell) {
            $html .= '<td>' . markdown_process_inline($cell) . '</td>';
        }
        $html .= '</tr>';
    }

    $html .= '</tbody></table>';

    return $html;
}

function markdown_reader_css(): string
{
    return <<<'CSS'
.markdown-reader-content h1 { color:#1e293b; border-bottom:3px solid #6366f1; padding-bottom:.5rem; margin-bottom:1rem; }
.markdown-reader-content h2 { color:#334155; border-bottom:2px solid #e2e8f0; padding-bottom:.4rem; margin-top:2rem; margin-bottom:.75rem; scroll-margin-top:5rem; }
.markdown-reader-content h3 { color:#475569; margin-top:1.5rem; margin-bottom:.5rem; scroll-margin-top:5rem; }
.markdown-reader-content h4 { color:#64748b; margin-top:1rem; scroll-margin-top:5rem; }
.markdown-reader-content p { margin-bottom:.75rem; line-height:1.65; }
.markdown-reader-content table { width:100%; border-collapse:collapse; margin:1rem 0; font-size:.875rem; }
.markdown-reader-content thead { background:#eef2ff; color:#312e81; }
.markdown-reader-content th, .markdown-reader-content td { padding:.5rem .75rem; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; }
.markdown-reader-content tbody tr:nth-child(even) { background:#f8fafc; }
.markdown-reader-content tbody tr:hover { background:#f1f5f9; }
.markdown-reader-content code { background:#f1f5f9; padding:.1rem .35rem; border-radius:.25rem; font-size:.85em; color:#be123c; }
.markdown-reader-content pre { background:#1e293b; color:#f8fafc; padding:1rem; border-radius:.5rem; overflow-x:auto; margin:1rem 0; }
.markdown-reader-content pre code { background:transparent; color:inherit; padding:0; }
.markdown-reader-content blockquote { border-left:4px solid #c7d2fe; padding:.5rem 1rem; margin:1rem 0; background:#eef2ff; color:#3730a3; }
.markdown-reader-content a { color:#4f46e5; text-decoration:underline; }
.markdown-reader-content ul, .markdown-reader-content ol { margin:.5rem 0 .75rem 1.25rem; }
.markdown-reader-content hr { border:none; border-top:2px solid #e2e8f0; margin:1.5rem 0; }
CSS;
}
