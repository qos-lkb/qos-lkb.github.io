<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;
use RuntimeException;
use InvalidArgumentException;

final class DbBackupLibTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        require_once dirname(__DIR__, 2) . '/includes/db_backup_lib.php';
    }

    public function testFilenameOkAcceptsSchemaTimestampSql(): void
    {
        self::assertTrue(db_backup_filename_ok('science_sims_20260909_151421.sql'));
        self::assertTrue(db_backup_filename_ok('qss_admin_20260101_000000.sql'));
    }

    public function testFilenameOkRejectsTraversalAndNonSql(): void
    {
        self::assertFalse(db_backup_filename_ok('../science_sims_20260909_151421.sql'));
        self::assertFalse(db_backup_filename_ok('/tmp/evil.sql'));
        self::assertFalse(db_backup_filename_ok('foo/bar.sql'));
        self::assertFalse(db_backup_filename_ok('foo\\bar.sql'));
        self::assertFalse(db_backup_filename_ok('notes.txt'));
        self::assertFalse(db_backup_filename_ok('dump.sql.gz'));
        self::assertFalse(db_backup_filename_ok('.htaccess'));
        self::assertFalse(db_backup_filename_ok('.hidden.sql'));
        self::assertFalse(db_backup_filename_ok('..sql'));
        self::assertFalse(db_backup_filename_ok(''));
    }

    public function testResolveRejectsTraversal(): void
    {
        $this->expectException(InvalidArgumentException::class);
        db_backup_resolve('../etc/passwd.sql');
    }

    public function testResolveRejectsAbsolutePath(): void
    {
        $this->expectException(InvalidArgumentException::class);
        db_backup_resolve('/etc/passwd.sql');
    }

    public function testResolveMissingFileThrows(): void
    {
        $this->expectException(RuntimeException::class);
        db_backup_resolve('missing_20990101_000000.sql');
    }
}
