<?php

declare(strict_types=1);

/**
 * 解析工作紙 Markdown 內容為結構化區塊（文字、影片、文章、模擬、試題等）。
 *
 * @return list<array<string, mixed>>
 */
function ws_parse_content_blocks(string $markdown): array
{
    $blocks = [];
    $lines = preg_split('/\r\n|\r|\n/', $markdown) ?: [];
    $textBuf = [];
    $flushText = static function () use (&$blocks, &$textBuf): void {
        $content = trim(implode("\n", $textBuf));
        $textBuf = [];
        if ($content !== '') {
            $blocks[] = ['type' => 'markdown', 'content' => $content];
        }
    };

    foreach ($lines as $line) {
        if (preg_match('/^::(video|simulation|sim|article|question)\s+(.+)\s*$/', $line, $m)) {
            $flushText();
            $type = $m[1] === 'sim' ? 'simulation' : $m[1];
            $attrs = ws_parse_embed_attrs($m[2]);
            $block = ['type' => $type, 'attrs' => $attrs];
            if ($type === 'question') {
                $block['bank'] = (string) ($attrs['bank'] ?? '');
                $block['question_id'] = isset($attrs['id']) ? (int) $attrs['id'] : null;
                $block['question_code'] = (string) ($attrs['code'] ?? '');
                $block['question_index'] = isset($attrs['index']) ? (int) $attrs['index'] : null;
                $block['score'] = ws_parse_embed_score($attrs);
            } elseif ($type === 'simulation' || $type === 'video' || $type === 'article') {
                $block['slug'] = (string) ($attrs['slug'] ?? '');
            }
            $blocks[] = $block;
            continue;
        }
        $textBuf[] = $line;
    }
    $flushText();
    return $blocks;
}

/**
 * @return array<string, string>
 */
function ws_parse_embed_attrs(string $attrStr): array
{
    $attrs = [];
    preg_match_all('/([\w-]+)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|(\S+))/', $attrStr, $matches, PREG_SET_ORDER);
    foreach ($matches as $m) {
        $attrs[$m[1]] = $m[2] !== '' ? $m[2] : ($m[3] !== '' ? $m[3] : ($m[4] ?? ''));
    }
    return $attrs;
}

/**
 * @param array<string, string> $attrs
 */
function ws_parse_embed_score(array $attrs): ?float
{
    if (!isset($attrs['score']) || $attrs['score'] === '') {
        return null;
    }
    $score = (float) $attrs['score'];
    return $score > 0 ? $score : null;
}

/**
 * @param list<array<string, mixed>> $blocks
 * @return array{question_count:int,total_score:float,questions:list<array<string,mixed>>}
 */
function ws_summarize_question_scores(array $blocks): array
{
    $questions = [];
    $total = 0.0;
    foreach ($blocks as $i => $block) {
        if (($block['type'] ?? '') !== 'question') {
            continue;
        }
        $score = isset($block['score']) && $block['score'] !== null ? (float) $block['score'] : null;
        if ($score !== null) {
            $total += $score;
        }
        $questions[] = [
            'index' => $i,
            'bank' => $block['bank'] ?? '',
            'question_id' => $block['question_id'] ?? null,
            'score' => $score,
        ];
    }
    return [
        'question_count' => count($questions),
        'total_score' => round($total, 2),
        'questions' => $questions,
    ];
}
