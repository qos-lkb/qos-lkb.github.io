<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class SummerHomeworkGradingTest extends TestCase
{
    public function testNormalizeFillAnswerCollapsesWhitespaceAndCase(): void
    {
        self::assertSame('hello world', \sh_normalize_fill_answer("  Hello   WORLD  "));
        self::assertSame('abc123', \sh_normalize_fill_answer('ＡＢＣ１２３'));
    }

    public function testGradeMcqCorrectAndIncorrect(): void
    {
        $q = [
            'id' => 10,
            'options' => [
                ['text_zh' => 'A', 'text_en' => 'A', 'is_correct' => false],
                ['text_zh' => 'B', 'text_en' => 'B', 'is_correct' => true],
            ],
        ];
        $ok = \sh_grade_mcq($q, ['selected_option_index' => 1]);
        self::assertTrue($ok['correct']);
        self::assertSame(1.0, $ok['score']);

        $bad = \sh_grade_mcq($q, ['selected_option_index' => 0]);
        self::assertFalse($bad['correct']);
        self::assertSame(0.0, $bad['score']);
    }

    public function testGradeTrueFalse(): void
    {
        $q = ['id' => 2, 'correct_bool' => true];
        $ok = \sh_grade_true_false($q, ['selected_bool' => true]);
        self::assertTrue($ok['correct']);
        $bad = \sh_grade_true_false($q, ['selected_bool' => false]);
        self::assertFalse($bad['correct']);
    }

    public function testGradeMultiSelectRequiresExactSet(): void
    {
        $q = [
            'id' => 3,
            'options' => [
                ['is_correct' => true],
                ['is_correct' => false],
                ['is_correct' => true],
            ],
        ];
        self::assertTrue(\sh_grade_multi_select($q, ['selected_option_indexes' => [2, 0]])['correct']);
        self::assertFalse(\sh_grade_multi_select($q, ['selected_option_indexes' => [0]])['correct']);
        self::assertFalse(\sh_grade_multi_select($q, ['selected_option_indexes' => [0, 1, 2]])['correct']);
    }

    public function testShortAnswerContainsMatchMode(): void
    {
        $q = [
            'id' => 4,
            'match_mode' => 'contains',
            'acceptable_answers' => [[
                'acceptable_answer_zh' => '氧氣',
                'acceptable_answer_en' => 'oxygen',
            ]],
        ];
        self::assertTrue(\sh_grade_short_answer($q, ['text' => '混合物含有氧氣'])['correct']);
        $q['match_mode'] = 'exact';
        self::assertFalse(\sh_grade_short_answer($q, ['text' => '混合物含有氧氣'])['correct']);
    }

    public function testGradeResponsesPassPercentIgnoresLongAnswer(): void
    {
        $questions = [
            [
                'id' => 1,
                'question_type' => 'mcq',
                'options' => [
                    ['is_correct' => true, 'text_zh' => 'Y', 'text_en' => 'Y'],
                    ['is_correct' => false, 'text_zh' => 'N', 'text_en' => 'N'],
                ],
            ],
            [
                'id' => 2,
                'question_type' => 'long_answer',
                'max_score' => 5,
            ],
        ];
        $result = \sh_grade_responses($questions, [
            '1' => ['selected_option_index' => 0],
            '2' => ['text' => 'essay'],
        ], 80.0);

        self::assertSame(1.0, $result['score']);
        self::assertSame(1.0, $result['max_score']);
        self::assertTrue($result['passed']);
        self::assertCount(2, $result['details']);
        self::assertTrue($result['details'][1]['exclude_from_auto']);
    }

    public function testAlignResponsesByOrderWhenIdsMiss(): void
    {
        $questions = [
            ['id' => 100],
            ['id' => 200],
        ];
        $old = [
            '1' => ['selected_option_index' => 0],
            '2' => ['selected_option_index' => 1],
        ];
        $aligned = \sh_align_responses_to_questions($questions, $old);
        self::assertSame(0, $aligned['100']['selected_option_index']);
        self::assertSame(1, $aligned['200']['selected_option_index']);
    }
}
