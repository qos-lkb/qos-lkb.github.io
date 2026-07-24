<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PDO;
use PHPUnit\Framework\TestCase;

final class RouteTableTest extends TestCase
{
    public function testBuildRouterRegistersCoreExactAndPatternRoutes(): void
    {
        $root = dirname(__DIR__, 2);
        require_once $root . '/vendor/autoload.php';
        require_once $root . '/tests/stubs/api_handler_stubs.php';
        require_once $root . '/api/v1/build_router.php';

        $pdo = $this->createStub(PDO::class);
        $router = api_v1_build_router($pdo);

        self::assertContains('GET /catalog', $router->exactKeys());
        self::assertContains('POST /auth/dev-login', $router->exactKeys());
        self::assertNotContains('POST /auth/change-password', $router->exactKeys());
        self::assertContains('GET /admin/subjects', $router->exactKeys());
        self::assertContains('POST /admin/subjects', $router->exactKeys());
        self::assertContains('POST /admin/subjects/reorder', $router->exactKeys());
        self::assertGreaterThanOrEqual(40, count($router->exactKeys()));
        self::assertGreaterThanOrEqual(40, $router->patternCount());

        self::assertNotNull($router->match('GET', '/admin/subjects'));
        $hitHtml = $router->match('GET', '/simulations/foo/html');
        self::assertNotNull($hitHtml);
        self::assertSame('foo', $hitHtml['params'][1] ?? null);

        $hitSubject = $router->match('PATCH', '/admin/subjects/12');
        self::assertNotNull($hitSubject);
        self::assertSame('PATCH', $hitSubject['params'][1] ?? null);
        self::assertSame('12', $hitSubject['params'][2] ?? null);
    }
}
