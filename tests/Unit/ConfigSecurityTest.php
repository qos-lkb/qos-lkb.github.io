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
        $_SERVER['HTTP_HOST'] = 'example.test';
        $_SERVER['HTTPS'] = 'on';
        $cspHttps = simulation_html_csp();
        self::assertStringContainsString('https://example.test', $cspHttps);
        unset($_SERVER['HTTP_HOST'], $_SERVER['HTTPS']);
    }

    public function testIframeSandboxAllowsSameOriginSnapshot(): void
    {
        $sandbox = simulation_iframe_sandbox_attr();
        self::assertStringContainsString('allow-scripts', $sandbox);
        self::assertStringContainsString('allow-same-origin', $sandbox);
    }

    public function testPrepareIframeHtmlInjectsBaseOnly(): void
    {
        $html = '<!DOCTYPE html><html><head><title>t</title></head><body><p>hi</p></body></html>';
        $out = simulation_prepare_iframe_html($html, '/science_sims');
        self::assertStringContainsString('<head><base href="/science_sims/">', $out);
        self::assertStringNotContainsString('data-sci-sim-capture-bridge', $out);

        $plain = simulation_prepare_iframe_html('<p>x</p>', '');
        self::assertStringNotContainsString('<base ', $plain);
    }

    public function testPreviewTokenPathRejectsTraversal(): void
    {
        $dir = '/tmp/sci_sim_preview';
        self::assertNull(simulation_preview_token_path($dir, '../etc/passwd'));
        self::assertNull(simulation_preview_token_path($dir, 'not-a-token'));
        $ok = simulation_preview_token_path($dir, '0123456789abcdef0123456789abcdef');
        self::assertSame($dir . DIRECTORY_SEPARATOR . '0123456789abcdef0123456789abcdef.html', $ok);
    }

    public function testDbWipeConfirmPhraseIsStable(): void
    {
        self::assertSame('DELETE ALL TABLES', config_db_wipe_confirm_phrase());
    }
}
