<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class LtQbMigrateLibTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $root = dirname(__DIR__, 2);
        require_once $root . '/includes/simulations_lib.php';
        require_once $root . '/includes/web_base.php';
        // Load only the pure presentation helper without full DB stack where possible.
        require_once $root . '/includes/question_bank_lib.php';
        require_once $root . '/includes/learning_tools_lib.php';
        require_once $root . '/includes/lt_qb_migrate_lib.php';
    }

    public function testPublicRowFromBankMatchesLtShape(): void
    {
        $row = [
            'id' => 9,
            'slug' => 'demo-bank',
            'title_zh' => '示範',
            'title_en' => 'Demo',
            'description_zh' => null,
            'description_en' => null,
            'subject_id' => 1,
            'topic_id' => null,
            'list_sort_order' => 3,
            'status' => 'published',
            'updated_at' => '2026-07-24 00:00:00',
        ];
        $out = lt_qb_public_row_from_bank($row);
        self::assertSame(9, $out['id']);
        self::assertSame('demo-bank', $out['slug']);
        self::assertArrayHasKey('linked_simulation_id', $out);
        self::assertNull($out['linked_simulation_id']);
    }

    public function testLtSaveIsFrozen(): void
    {
        $pdo = $this->createStub(\PDO::class);
        $r = lt_save_from_payload($pdo, ['id' => 1, 'email' => 'a@b.c', 'display_name' => 'A'], [], true, true);
        self::assertFalse($r['ok']);
        self::assertStringContainsString('凍結', (string) ($r['error'] ?? ''));
    }
}
