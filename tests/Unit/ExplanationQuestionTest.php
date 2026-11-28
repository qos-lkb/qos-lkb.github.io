<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/includes/explanation_lib.php';

final class ExplanationQuestionTest extends TestCase
{
    public function testTenQuestionsCoverTheFourSubjects(): void
    {
        $questions = explanation_questions();
        self::assertCount(10, $questions);
        $keys = array_column($questions, 'key');
        self::assertSame($keys, array_values(array_unique($keys)));
        $subjects = array_values(array_unique(array_column($questions, 'subject')));
        sort($subjects);
        self::assertSame(['biology', 'chemistry', 'physics', 'science'], $subjects);
        foreach ($questions as $question) {
            self::assertGreaterThanOrEqual(3, count($question['points_zh']));
            self::assertSame(count($question['points_zh']), count($question['points_en']));
            self::assertNotSame('', $question['prompt_zh']);
            self::assertNotSame('', $question['misconceptions_zh'][0] ?? '');
        }
    }

    public function testCatalogueHidesTheRubric(): void
    {
        $payload = explanation_catalog_payload(true, []);
        self::assertCount(10, $payload['questions']);
        self::assertSame(70, $payload['pass_score']);
        self::assertSame(90, $payload['max_seconds']);
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE);
        self::assertIsString($encoded);
        self::assertStringNotContainsString('points_zh', $encoded);
        self::assertStringNotContainsString('粒子本身不會變大', $encoded);
        self::assertStringNotContainsString('misconceptions', $encoded);
        $first = $payload['questions'][0];
        self::assertSame('particle_states', $first['key']);
        self::assertArrayNotHasKey('points_zh', $first);
    }

    public function testParseJudgeClampsScoreAndReadsFencedJson(): void
    {
        $parsed = explanation_parse_judge("```json\n{\"score\":140,\"feedback_zh\":\"主要機制正確。\",\"feedback_en\":\"The main idea is right.\"}\n```");
        self::assertTrue($parsed['ok']);
        self::assertSame(100, $parsed['score']);
        self::assertSame('主要機制正確。', $parsed['feedback_zh']);
        self::assertFalse(explanation_parse_judge('not json')['ok']);
        self::assertSame(0, explanation_parse_judge('{"score":-4,"feedback_zh":"再試","feedback_en":"Try"}')['score']);
    }

    public function testUnknownQuestionIsMissing(): void
    {
        self::assertNotNull(explanation_question('breathing_vs_respiration'));
        self::assertNull(explanation_question('not_a_question'));
    }
}
