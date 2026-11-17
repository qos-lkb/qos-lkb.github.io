<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/includes/sim_recovery_classify_lib.php';

final class SimRecoveryClassifyTest extends TestCase
{
    public function testExtractJsonFromFencedArray(): void
    {
        $raw = "Here is the list:\n```json\n[\n"
            . "{\"path\":\"physics/0101_foo.html\",\"subject_slug\":\"physics\",\"title_zh\":\"測試\",\"title_en\":\"Test\",\"confidence\":\"high\"}\n"
            . "]\n```";
        $parsed = sim_recovery_classify_extract_json($raw);
        self::assertTrue($parsed['ok']);
        self::assertCount(1, $parsed['items']);
        self::assertSame('physics/0101_foo.html', $parsed['items'][0]['path']);
        self::assertSame('physics', $parsed['items'][0]['subject_slug']);
    }

    public function testExtractRejectsProse(): void
    {
        $parsed = sim_recovery_classify_extract_json('No JSON here.');
        self::assertFalse($parsed['ok']);
    }
}