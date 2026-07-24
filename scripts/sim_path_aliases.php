<?php

declare(strict_types=1);

/**
 * Map disk-relative simulation HTML paths → existing DB slug (when basename slugify alone is insufficient).
 * Used by scripts/sync_simulations_to_db.php after Phase 6 renames.
 *
 * @return array<string, string> relative path (forward slashes) => simulations.slug
 */
function sim_path_aliases(): array
{
    return [
        'physics/02/0211_elevator.html' => 'physics-02-elevator',
        'physics/e03/e0301_air_conditioner.html' => 'physics-e03-e0301_air-conditioner',
        'science/electrolysis_of_water.html' => 'science-electrolysis-of-water',
    ];
}
