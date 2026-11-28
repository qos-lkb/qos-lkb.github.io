<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/includes/explanation_lib.php';

final class ExplanationQuestionTest extends TestCase
{
    public function testTenQuestionsCoverTheFourSubjects(): void
    {
        $questions = explanation_builtin_questions();
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
        $payload = explanation_catalog_payload_from_lists(
            true,
            [],
            explanation_builtin_subjects(),
            explanation_builtin_questions()
        );
        self::assertCount(10, $payload['questions']);
        self::assertSame(70, $payload['pass_score']);
        self::assertSame(90, $payload['max_seconds']);
        self::assertFalse($payload['can_manage']);
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE);
        self::assertIsString($encoded);
        self::assertStringNotContainsString('points_zh', $encoded);
        self::assertStringNotContainsString('粒子本身不會變大', $encoded);
        self::assertStringNotContainsString('misconceptions', $encoded);
        $first = $payload['questions'][0];
        self::assertSame('particle_states', $first['key']);
        self::assertArrayNotHasKey('points_zh', $first);
    }

    public function testSlugAndListHelpers(): void
    {
        self::assertSame('sea_breeze', explanation_slug('Sea_Breeze'));
        self::assertSame('', explanation_slug('1bad'));
        self::assertSame('', explanation_slug('../x'));
        self::assertSame(['A', 'B'], explanation_decode_list("A\nB\n"));
        self::assertSame('["A","B"]', explanation_encode_list("A\nB"));
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

    public function testAudioExtensionRejectsUnsafeNames(): void
    {
        self::assertSame('webm', explanation_audio_extension('explanation.webm'));
        self::assertSame('m4a', explanation_audio_extension('clip.M4A'));
        self::assertSame('', explanation_audio_extension('clip.php'));
        self::assertSame('', explanation_audio_extension('clip'));
        self::assertNull(explanation_audio_disk_path(0, 1, 'webm'));
        self::assertNull(explanation_audio_disk_path(1, 2, 'php'));
        self::assertNull(explanation_audio_disk_path(4, 9, '../webm'));
        $path = explanation_audio_disk_path(4, 9, 'webm');
        self::assertNotNull($path);
        self::assertStringEndsWith('/4/9.webm', $path);
    }

    public function testUnknownBuiltinQuestionIsMissing(): void
    {
        $keys = array_column(explanation_builtin_questions(), 'key');
        self::assertContains('breathing_vs_respiration', $keys);
        self::assertNotContains('not_a_question', $keys);
    }
}
