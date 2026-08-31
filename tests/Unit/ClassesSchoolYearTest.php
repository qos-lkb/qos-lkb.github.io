<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use DateTimeImmutable;
use DateTimeZone;
use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/includes/classes_lib.php';

final class ClassesSchoolYearTest extends TestCase
{
    public function testPreviousSchoolYearLabel(): void
    {
        self::assertSame('2025/26', \classes_previous_school_year_label('2026/27'));
        self::assertSame('2024/25', \classes_previous_school_year_label('2025/26'));
        self::assertSame('2025-2026', \classes_previous_school_year_label('2026-2027'));
        self::assertSame('2025-26', \classes_previous_school_year_label('2026-27'));
        self::assertNull(\classes_previous_school_year_label(''));
    }

    public function testSchoolYearStartYear(): void
    {
        self::assertSame(2026, \classes_school_year_start_year('2026/27'));
        self::assertSame(2025, \classes_school_year_start_year('2025-2026'));
        self::assertSame(2026, \classes_school_year_start_year('2627'));
    }

    public function testPreviousSummerItemForm(): void
    {
        self::assertSame('1', \classes_previous_summer_item_form('2'));
        self::assertSame('2', \classes_previous_summer_item_form('3'));
        self::assertNull(\classes_previous_summer_item_form('1'));
        self::assertNull(\classes_previous_summer_item_form('4'));
        self::assertTrue(\classes_can_chase_previous_summer('2'));
        self::assertTrue(\classes_can_chase_previous_summer('3'));
        self::assertFalse(\classes_can_chase_previous_summer('1'));
    }

    public function testAssignmentSeasonJunAug(): void
    {
        $tz = new DateTimeZone('Asia/Hong_Kong');
        self::assertTrue(\classes_is_summer_assignment_season(new DateTimeImmutable('2026-06-01', $tz)));
        self::assertTrue(\classes_is_summer_assignment_season(new DateTimeImmutable('2026-08-31', $tz)));
        self::assertFalse(\classes_is_summer_assignment_season(new DateTimeImmutable('2026-09-01', $tz)));
        self::assertFalse(\classes_is_summer_assignment_season(new DateTimeImmutable('2026-05-31', $tz)));
    }

    public function testHkSchoolYearStart(): void
    {
        $tz = new DateTimeZone('Asia/Hong_Kong');
        self::assertSame(2026, \classes_hk_school_year_start(new DateTimeImmutable('2026-09-01', $tz)));
        self::assertSame(2025, \classes_hk_school_year_start(new DateTimeImmutable('2026-08-31', $tz)));
        self::assertSame(2026, \classes_hk_school_year_start(new DateTimeImmutable('2027-01-15', $tz)));
    }

    public function testSchoolYearIsCurrentOrFuture(): void
    {
        $tz = new DateTimeZone('Asia/Hong_Kong');
        $sep2026 = new DateTimeImmutable('2026-09-01', $tz);
        self::assertTrue(\classes_school_year_is_current_or_future('2026/27', $sep2026));
        self::assertFalse(\classes_school_year_is_current_or_future('2025/26', $sep2026));
    }

    public function testNewestEnrollmentPrefersLaterSchoolYear(): void
    {
        $got = \classes_newest_enrollment_year_form([
            ['school_year' => '2025/26', 'form_level' => '1'],
            ['school_year' => '2026/27', 'form_level' => '2'],
        ]);
        self::assertSame('2026/27', $got['year']);
        self::assertSame('2', $got['form']);
    }
}
