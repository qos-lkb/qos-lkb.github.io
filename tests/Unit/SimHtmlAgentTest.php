<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/includes/sim_html_agent_lib.php';

final class SimHtmlAgentTest extends TestCase
{
    public function testParseMarkedReply(): void
    {
        $raw = "NOTES:\n補上按鈕的 aria-label。\nHTML:\n<!DOCTYPE html>\n<html lang=\"zh-Hant\"><body><button>開始</button></body></html>\n";
        $parsed = sim_html_agent_parse_reply($raw);
        self::assertTrue($parsed['ok']);
        self::assertSame('補上按鈕的 aria-label。', $parsed['notes']);
        self::assertStringContainsString('<button>開始</button>', $parsed['html']);
        self::assertStringStartsWith('<!DOCTYPE html>', $parsed['html']);
    }

    public function testParseFencedHtmlFallback(): void
    {
        $raw = "調整了對比。\n```html\n<!DOCTYPE html>\n<html><body><p>光</p></body></html>\n```";
        $parsed = sim_html_agent_parse_reply($raw);
        self::assertTrue($parsed['ok']);
        self::assertStringContainsString('<p>光</p>', $parsed['html']);
        self::assertStringNotContainsString('```', $parsed['html']);
    }

    public function testParseHtmlMarkerWrappedInFence(): void
    {
        $raw = "NOTES:\n整理對比。\nHTML:\n```html\n<!DOCTYPE html>\n<html><body><p>力</p></body></html>\n```";
        $parsed = sim_html_agent_parse_reply($raw);
        self::assertTrue($parsed['ok']);
        self::assertSame('整理對比。', $parsed['notes']);
        self::assertStringStartsWith('<!DOCTYPE html>', $parsed['html']);
        self::assertStringNotContainsString('```', $parsed['html']);
    }

    public function testParseRawDocument(): void
    {
        $parsed = sim_html_agent_parse_reply("<!DOCTYPE html><html><body>ok</body></html>");
        self::assertTrue($parsed['ok']);
        self::assertSame('', $parsed['notes']);
    }

    public function testRejectProse(): void
    {
        $parsed = sim_html_agent_parse_reply("NOTES:\n只寫了說明，沒有文件。\nHTML:\n這不是網頁。");
        self::assertFalse($parsed['ok']);
    }

    public function testLengthFinishDoesNotReturnPartialHtml(): void
    {
        $parsed = sim_html_agent_extract_completion([
            'choices' => [[
                'finish_reason' => 'length',
                'message' => ['content' => "<!DOCTYPE html><html><body>cut"],
            ]],
        ]);
        self::assertFalse($parsed['ok']);
    }

    public function testNormalizeRejectsUnknownModelAndEmptyInstruction(): void
    {
        $allowed = ['grok-4.6', 'grok-4.20-0309-non-reasoning'];
        $empty = sim_html_agent_normalize_request([
            'html' => '<!DOCTYPE html><html></html>',
            'instruction' => '   ',
            'model' => 'grok-4.6',
        ], $allowed);
        self::assertFalse($empty['ok']);

        $model = sim_html_agent_normalize_request([
            'html' => '<!DOCTYPE html><html></html>',
            'instruction' => '改善對比',
            'model' => 'gpt-4o',
        ], $allowed);
        self::assertFalse($model['ok']);
    }

    public function testNormalizeDropsReasoningForNonReasoningModel(): void
    {
        $normalized = sim_html_agent_normalize_request([
            'html' => "<!DOCTYPE html>\n<html lang=\"zh-Hant\"><body></body></html>",
            'instruction' => '改善鍵盤操作',
            'model' => 'grok-4.20-0309-non-reasoning',
            'reasoning_effort' => 'high',
        ], ['grok-4.20-0309-non-reasoning']);
        self::assertTrue($normalized['ok']);
        self::assertSame('', $normalized['reasoning_effort']);
        self::assertSame('grok-4.20-0309-non-reasoning', $normalized['model']);
    }

    public function testOversizedHtmlIsRejected(): void
    {
        $normalized = sim_html_agent_normalize_request([
            'html' => '<!DOCTYPE html><html>' . str_repeat('a', SIM_HTML_AGENT_MAX_BYTES) . '</html>',
            'instruction' => '整理',
            'model' => 'grok-4.6',
        ], ['grok-4.6']);
        self::assertFalse($normalized['ok']);
        self::assertSame(422, $normalized['status']);
    }

    public function testOptionsPayloadKeepsDefaultInsideList(): void
    {
        $payload = sim_html_agent_options_payload(true, ['grok-4.6', 'grok-4.3'], 'missing-model');
        self::assertSame('grok-4.6', $payload['default_model']);
        self::assertTrue($payload['configured']);
        self::assertNotEmpty($payload['presets']);
    }

    public function testNormalizeGenerateAllowsEmptyHtmlAndDefaultInstruction(): void
    {
        $normalized = sim_html_agent_normalize_generate_request([
            'model' => 'grok-4.6',
            'title_zh' => '波動',
        ], ['grok-4.6']);
        self::assertTrue($normalized['ok']);
        self::assertNotSame('', $normalized['instruction']);
        self::assertSame('波動', $normalized['context']['title_zh']);
    }
}
