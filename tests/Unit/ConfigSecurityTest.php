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

    public function testIframeSandboxOmitsSameOrigin(): void
    {
        $sandbox = simulation_iframe_sandbox_attr();
        self::assertStringContainsString('allow-scripts', $sandbox);
        self::assertStringNotContainsString('allow-same-origin', $sandbox);
    }

    public function testCaptureBridgeIsInjectedBeforeBodyClose(): void
    {
        $html = '<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>';
        $out = simulation_inject_capture_bridge($html);
        self::assertStringContainsString('data-sci-sim-capture-bridge', $out);
        self::assertStringContainsString('SCI_SIM_CAPTURE_REQUEST', $out);
        $posScript = stripos($out, 'data-sci-sim-capture-bridge');
        $posBody = stripos($out, '</body>');
        self::assertNotFalse($posScript);
        self::assertNotFalse($posBody);
        self::assertLessThan($posBody, $posScript);
    }

    public function testCaptureBridgeIsNotDuplicated(): void
    {
        $html = '<body><script data-sci-sim-capture-bridge="1">SCI_SIM_CAPTURE_REQUEST</script></body>';
        $out = simulation_inject_capture_bridge($html);
        self::assertSame(1, substr_count($out, 'data-sci-sim-capture-bridge'));
    }

    public function testDbWipeConfirmPhraseIsStable(): void
    {
        self::assertSame('DELETE ALL TABLES', config_db_wipe_confirm_phrase());
    }
}
