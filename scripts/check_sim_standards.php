#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Lint simulation HTML filenames and React CDN usage under subject folders.
 *
 * Exit 0 = clean; 1 = violations (unless only warnings).
 *
 * Usage: php scripts/check_sim_standards.php
 */

$root = dirname(__DIR__);
$subjectDirs = ['physics', 'chem', 'biology', 'science', 'astronomy', 'other', 'geography', 'music', 's4_physics'];

/** @var list<string> Relative paths allowed to violate naming (empty = none) */
$EXEMPTIONS = [];

$errors = [];
$warnings = [];

foreach ($subjectDirs as $dir) {
    $base = $root . '/' . $dir;
    if (!is_dir($base)) {
        continue;
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS)
    );
    /** @var SplFileInfo $file */
    foreach ($iterator as $file) {
        if (!$file->isFile() || strtolower($file->getExtension()) !== 'html') {
            continue;
        }
        $rel = substr($file->getPathname(), strlen($root) + 1);
        $rel = str_replace('\\', '/', $rel);
        if (in_array($rel, $EXEMPTIONS, true)) {
            continue;
        }

        $basename = $file->getBasename();
        if (preg_match('/[A-Z\s]/', $basename)) {
            $errors[] = "{$rel}: filename must be lowercase snake_case (no spaces / CamelCase)";
        } elseif (str_contains($basename, '-')) {
            $warnings[] = "{$rel}: prefer underscores over hyphens in new files";
        }

        $html = file_get_contents($file->getPathname());
        if ($html === false) {
            $errors[] = "{$rel}: cannot read file";
            continue;
        }
        if (preg_match('/react\.development\.js|react-dom\.development\.js/i', $html)) {
            $errors[] = "{$rel}: use React production CDN (*.production.min.js), not development";
        }
        if (preg_match('#app/dist/|/src/modules/#', $html)) {
            $errors[] = "{$rel}: must not depend on SPA bundler paths";
        }
    }
}

foreach ($warnings as $w) {
    fwrite(STDOUT, "WARN  {$w}\n");
}
foreach ($errors as $e) {
    fwrite(STDERR, "ERROR {$e}\n");
}

fwrite(STDOUT, sprintf(
    "Checked sim HTML under %s — %d error(s), %d warning(s)\n",
    implode('/', $subjectDirs),
    count($errors),
    count($warnings)
) . "\n");

exit(count($errors) > 0 ? 1 : 0);
