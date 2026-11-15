<?php

declare(strict_types=1);

/**
 * Map disk-relative simulation HTML paths → existing DB slug (when basename slugify alone is insufficient).
 * Used when resolving simulations.html_path (export and save).
 *
 * @return array<string, string> relative path (forward slashes) => simulations.slug
 */
function sim_path_aliases(): array
{
    return [
        'physics/02/0211_elevator.html' => 'physics-02-elevator',
        'physics/02/0210_cavendish_experiment.html' => 'cavendish-s-g-experiment',
        'physics/03a/0301_how_we_see.html' => 'how-do-we-see',
        'physics/03b/0306_youngs_double_slit.html' => 'youngs-double-slit-expt',
        'physics/03b/0307_signal_generator.html' => 'sound-signal-generator',
        'physics/e02/e0201_photoelectric_effect.html' => 'photoelectric-effect',
        'physics/e02/e0202_electron_stationary_wave.html' => 'de-broglie-electron-stationary-wave',
        'physics/e03/e0301_air_conditioner.html' => 'air-conditioner',
        'physics/e03/e0304_photovoltaic_plate.html' => 'principle-of-photovoltaic-panel',
        'science/electrolysis_of_water.html' => 'science-electrolysis-of-water',
        'science/dna.html' => 'dna-structure',
        'chem/atomic_structure.html' => 'chem-atomic-structure-and-isotopes',
    ];
}
