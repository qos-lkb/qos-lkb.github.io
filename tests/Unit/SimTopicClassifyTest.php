<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/includes/sim_topic_classify_lib.php';

final class SimTopicClassifyTest extends TestCase
{
    public function testExtractJsonFromArray(): void
    {
        $raw = '[{"sim_id":12,"subject_slug":"physics","topic_slug":"heat","is_new_topic":false,"topic_name_zh":"熱","topic_name_en":"Heat","confidence":"high"}]';
        $parsed = sim_topic_classify_extract_json($raw);
        self::assertTrue($parsed['ok']);
        self::assertSame(12, $parsed['items'][0]['sim_id']);
        self::assertSame('physics', $parsed['items'][0]['subject_slug']);
        self::assertFalse($parsed['items'][0]['is_new_topic']);
    }

    public function testExtractRejectsProse(): void
    {
        $parsed = sim_topic_classify_extract_json('not json');
        self::assertFalse($parsed['ok']);
    }
}
