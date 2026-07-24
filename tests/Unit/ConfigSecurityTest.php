<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class ConfigSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        require_once dirname(__DIR__, 2) . '/includes/config.php';
        require_once dirname(__DIR__, 2) . '/includes/simulation_security.php';
    }

    public function testSimulationHtmlCspBlocksWildcardAndForeignFraming(): void
    {
        $csp = simulation_html_csp();
        self::assertStringContainsString("frame-ancestors 'self'", $csp);
        self::assertStringContainsString("object-src 'none'", $csp);
        self::assertStringNotContainsString('default-src *', $csp);
        self::assertStringNotContainsString('script-src *', $csp);
    }

    public function testIframeSandboxOmitsSameOrigin(): void
    {
        $sandbox = simulation_iframe_sandbox_attr();
        self::assertStringContainsString('allow-scripts', $sandbox);
        self::assertStringNotContainsString('allow-same-origin', $sandbox);
    }

    public function testDbWipeConfirmPhraseIsStable(): void
    {
        self::assertSame('DELETE ALL TABLES', config_db_wipe_confirm_phrase());
    }
}
