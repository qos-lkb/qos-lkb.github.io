<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/includes/pronunciation_lib.php';

final class PronunciationScoreTest extends TestCase
{
    public function testExactAndSplitCompoundsScoreHigh(): void
    {
        self::assertSame(100, pronunciation_string_score('photosynthesis', 'photosynthesis'));
        self::assertSame(100, pronunciation_string_score('photosynthesis', 'photo synthesis'));
        self::assertSame(100, pronunciation_string_score('photosynthesis', 'Um, photosynthesis.'));
        self::assertSame(100, pronunciation_string_score('hydrochloric acid', 'hydrochloric acid'));
    }

    public function testUnrelatedSpeechScoresLow(): void
    {
        self::assertSame(0, pronunciation_string_score('photosynthesis', ''));
        self::assertLessThan(40, pronunciation_string_score('photosynthesis', 'hello there'));
        self::assertGreaterThan(80, pronunciation_string_score('photosynthesis', 'photosyntesis'));
    }

    public function testBlendKeepsAWrongTranscriptFromAPerfectModelScore(): void
    {
        self::assertLessThanOrEqual(40, pronunciation_blend_score(10, 100));
        self::assertGreaterThanOrEqual(90, pronunciation_blend_score(100, 80));
    }

    public function testParseJudgeJson(): void
    {
        $parsed = pronunciation_parse_judge("```json\n{\"score\":88,\"feedback_zh\":\"接近了\",\"feedback_en\":\"Close.\"}\n```");
        self::assertTrue($parsed['ok']);
        self::assertSame(88, $parsed['score']);
        self::assertSame('接近了', $parsed['feedback_zh']);
        self::assertFalse(pronunciation_parse_judge('not json')['ok']);
    }

    public function testCatalogKeys(): void
    {
        self::assertNotNull(pronunciation_term('endoplasmic_reticulum'));
        self::assertSame('hydrochloric acid', pronunciation_term('hydrochloric_acid')['term']);
        self::assertNull(pronunciation_term('not_a_term'));
        self::assertCount(30, pronunciation_terms());
    }
}
