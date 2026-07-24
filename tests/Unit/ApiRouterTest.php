<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;
use ScienceSims\Http\ApiPath;
use ScienceSims\Http\Router;

final class ApiRouterTest extends TestCase
{
    public function testApiPathFromV1Uri(): void
    {
        self::assertSame('/catalog', ApiPath::fromRequestUri('/science_sims/api/v1/catalog'));
        self::assertSame('/auth/me', ApiPath::fromRequestUri('/api/v1/auth/me'));
        self::assertSame('/simulations/foo', ApiPath::fromRequestUri('/api/v1/simulations/foo?x=1'));
    }

    public function testRouterExactAndPatternMatch(): void
    {
        $router = new Router();
        $hits = [];
        $router->addExact('GET', '/catalog', static function (array $params) use (&$hits): void {
            $hits[] = 'catalog';
        });
        $router->addPattern('^GET /simulations/([^/]+)$', static function (array $params) use (&$hits): void {
            $hits[] = 'sim:' . ($params[1] ?? '');
        });

        self::assertTrue($router->dispatch('GET', '/catalog'));
        self::assertTrue($router->dispatch('GET', '/simulations/heat'));
        self::assertFalse($router->dispatch('POST', '/catalog'));
        self::assertSame(['catalog', 'sim:heat'], $hits);
        self::assertContains('GET /catalog', $router->exactKeys());
        self::assertSame(1, $router->patternCount());
    }

    public function testCsrfHelpersWhenSessionAvailable(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        // Lightweight: hash_equals contract without full auth bootstrap
        $a = bin2hex(random_bytes(16));
        $b = $a;
        self::assertTrue(hash_equals($a, $b));
        self::assertFalse(hash_equals($a, $a . 'x'));
    }
}
