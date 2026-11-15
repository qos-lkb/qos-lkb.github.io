<?php

declare(strict_types=1);

namespace ScienceSims\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class SimulationFilesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        require_once dirname(__DIR__, 2) . '/includes/simulation_files.php';
    }

    public function testNormalizeRelPathRejectsTraversalAndForeignRoots(): void
    {
        self::assertSame('physics/01/0105_gas_laws.html', sim_normalize_rel_path('physics/01/0105_gas_laws.html'));
        self::assertNull(sim_normalize_rel_path('../physics/01/a.html'));
        self::assertNull(sim_normalize_rel_path('physics/../chem/a.html'));
        self::assertNull(sim_normalize_rel_path('templates/sim_skeleton.html'));
        self::assertNull(sim_normalize_rel_path('physics/01/notes.txt'));
    }

    public function testCurriculumPaths(): void
    {
        self::assertSame('physics/01/0105_gas_laws.html', sim_curriculum_rel_path('0105_gas_laws'));
        self::assertSame('physics/e02/e0201_photoelectric_effect.html', sim_curriculum_rel_path('e0201-photoelectric-effect'));
        self::assertSame('s4_physics/4a02_aero.html', sim_curriculum_rel_path('4a02_aero'));
        self::assertNull(sim_curriculum_rel_path('osmosis'));
    }

    public function testNewPathUsesCurriculumFolderBeforeSubject(): void
    {
        self::assertSame('physics/01/0105_gas_laws.html', sim_new_rel_path('0105-gas-laws', 'other'));
        self::assertSame('biology/osmosis.html', sim_new_rel_path('osmosis', 'biology'));
        self::assertSame('other/custom_sim.html', sim_new_rel_path('custom-sim', 'not-a-subject'));
    }

    public function testSubjectDirMap(): void
    {
        self::assertSame('chem', sim_subject_dir_from_meta('chemistry', 'Chemistry', '化學'));
        self::assertSame('s4_physics', sim_subject_dir_from_meta('s4-physics', 'S4 Physics', ''));
        self::assertSame('other', sim_subject_dir_from_meta(null, null, null));
    }

    public function testAliasSlug(): void
    {
        self::assertSame('physics/02/0211_elevator.html', sim_alias_path_for_slug('physics-02-elevator'));
        self::assertSame('physics/03a/0301_how_we_see.html', sim_alias_path_for_slug('how-do-we-see'));
        self::assertNull(sim_alias_path_for_slug('osmosis'));
    }

    public function testSlugMatchesPrefixedCatalogueAndCurriculumNames(): void
    {
        $index = [
            ['path' => 'physics/01/0101_calibration_of_thermometer.html', 'key' => '0101-calibration-of-thermometer'],
            ['path' => 'physics/03a/0301_laws_of_reflection.html', 'key' => '0301-laws-of-reflection'],
            ['path' => 'physics/03a/0301_plane_mirror_ray_diagram.html', 'key' => '0301-plane-mirror-ray-diagram'],
            ['path' => 'physics/03a/0301_plane_mirror_ray_diagram2.html', 'key' => '0301-plane-mirror-ray-diagram2'],
            ['path' => 'biology/osmosis.html', 'key' => 'osmosis'],
            ['path' => 'other/circuit.html', 'key' => 'circuit'],
            ['path' => 'physics/e02/e0201_photoelectric_effect.html', 'key' => 'e0201-photoelectric-effect'],
        ];
        self::assertSame(
            ['physics/01/0101_calibration_of_thermometer.html'],
            sim_disk_matches_for_slug($index, 'physics-01-0101_calibration_of_thermometer')
        );
        self::assertSame(
            ['physics/03a/0301_laws_of_reflection.html'],
            sim_disk_matches_for_slug($index, 'laws-of-reflection')
        );
        self::assertSame(
            ['physics/03a/0301_plane_mirror_ray_diagram2.html'],
            sim_disk_matches_for_slug($index, 'physics-03a-0301_plane_mirror_ray_diagram2')
        );
        self::assertSame(['biology/osmosis.html'], sim_disk_matches_for_slug($index, 'biology-osmosis'));
        self::assertSame([], sim_disk_matches_for_slug($index, 'water-current-circuit'));
        self::assertSame(
            ['physics/e02/e0201_photoelectric_effect.html'],
            sim_disk_matches_for_slug($index, 'photoelectric-effect')
        );
    }

    public function testHtmlSameIgnoresNewlineStyle(): void
    {
        self::assertTrue(sim_html_same("<p>a</p>\n", "<p>a</p>\r\n"));
        self::assertFalse(sim_html_same('<p>a</p>', '<p>b</p>'));
    }
}
