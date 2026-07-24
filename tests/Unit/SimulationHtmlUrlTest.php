<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;
use ScienceSims\Http\ApiPath;

/**
 * Ensures legacy simulation_view URLs map to the canonical API HTML path shape.
 */
final class SimulationHtmlUrlTest extends TestCase
{
    public function testCanonicalHtmlPathShape(): void
    {
        $slug = '0102_heat_capacity';
        $apiPath = '/api/v1/simulations/' . rawurlencode($slug) . '/html';
        self::assertSame('/api/v1/simulations/0102_heat_capacity/html', $apiPath);
        self::assertSame('/simulations/0102_heat_capacity/html', ApiPath::fromRequestUri($apiPath));
    }

    public function testSlugWithSpecialCharsIsEncoded(): void
    {
        $slug = 'wave interference';
        $encoded = rawurlencode($slug);
        self::assertSame('wave%20interference', $encoded);
        $path = ApiPath::fromRequestUri('/api/v1/simulations/' . $encoded . '/html');
        self::assertSame('/simulations/wave%20interference/html', $path);
    }
}
