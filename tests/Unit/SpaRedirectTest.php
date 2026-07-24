<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class SpaRedirectTest extends TestCase
{
    public function testSpaAppPathFromAdminScript(): void
    {
        require_once dirname(__DIR__, 2) . '/includes/spa_redirect.php';

        self::assertSame(
            '/science_sims/app/admin/subjects',
            spa_app_path('/admin/subjects', '/science_sims/admin/subjects.php')
        );
        self::assertSame(
            '/science_sims/app/admin',
            spa_app_path('/admin', '/science_sims/portal/simulations.php')
        );
        self::assertSame(
            '/app/login',
            spa_app_path('/login', '/app/index.php')
        );
    }

    public function testSpaSiteRootStripsApi(): void
    {
        require_once dirname(__DIR__, 2) . '/includes/spa_redirect.php';
        self::assertSame('/science_sims', spa_site_root('/science_sims/api/index.php'));
    }
}
