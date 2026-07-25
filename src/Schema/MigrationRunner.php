<?php

declare(strict_types=1);

namespace ScienceSims\Schema;

use PDO;
use PDOException;
use RuntimeException;
use Throwable;

/**
 * Applies schema_upgrade_all.sql and records it in schema_migrations.
 */
final class MigrationRunner
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly string $projectRoot,
    ) {
    }

    /**
     * Canonical upgrade order for existing databases (idempotent scripts).
     *
     * @return list<string> Basenames relative to project root
     */
    public static function defaultManifest(): array
    {
        return [
            'schema_upgrade_all.sql',
        ];
    }

    public function ensureMigrationsTable(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_schema_migrations_filename (filename)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    /**
     * @return list<string>
     */
    public function appliedFilenames(): array
    {
        $this->ensureMigrationsTable();
        $stmt = $this->pdo->query('SELECT filename FROM schema_migrations ORDER BY id ASC');
        if ($stmt === false) {
            return [];
        }
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        return array_map('strval', $rows);
    }

    /**
     * @param list<string>|null $manifest
     * @return array{applied:list<string>, skipped:list<string>}
     */
    public function applyPending(?array $manifest = null, bool $dryRun = false): array
    {
        $manifest ??= self::defaultManifest();
        $this->ensureMigrationsTable();
        $done = array_fill_keys($this->appliedFilenames(), true);
        $applied = [];
        $skipped = [];

        foreach ($manifest as $file) {
            if (isset($done[$file])) {
                $skipped[] = $file;
                continue;
            }
            $path = $this->projectRoot . '/' . $file;
            if (!is_readable($path)) {
                throw new RuntimeException('Migration file missing or unreadable: ' . $file);
            }
            if ($dryRun) {
                $applied[] = $file;
                continue;
            }
            $this->runSqlFile($path);
            $ins = $this->pdo->prepare('INSERT IGNORE INTO schema_migrations (filename) VALUES (?)');
            $ins->execute([$file]);
            $applied[] = $file;
        }

        return ['applied' => $applied, 'skipped' => $skipped];
    }

    private function runSqlFile(string $path): void
    {
        $sql = file_get_contents($path);
        if ($sql === false) {
            throw new RuntimeException('Cannot read SQL file: ' . $path);
        }

        // Strip BOM
        if (str_starts_with($sql, "\xEF\xBB\xBF")) {
            $sql = substr($sql, 3);
        }

        try {
            $this->pdo->exec($sql);
            return;
        } catch (PDOException $e) {
            // Multi-statement dumps sometimes need splitting when PDO::MYSQL_ATTR_MULTI_STATEMENTS is off.
        }

        $statements = $this->splitStatements($sql);
        foreach ($statements as $statement) {
            $trimmed = trim($statement);
            if ($trimmed === '' || str_starts_with($trimmed, '--')) {
                continue;
            }
            try {
                $this->pdo->exec($trimmed);
            } catch (Throwable $e) {
                throw new RuntimeException(
                    'Failed executing migration ' . basename($path) . ': ' . $e->getMessage(),
                    0,
                    $e instanceof \Exception ? $e : null
                );
            }
        }
    }

    /**
     * Naive splitter: sufficient for project schema_*.sql (no routine bodies with semicolons).
     *
     * @return list<string>
     */
    private function splitStatements(string $sql): array
    {
        $lines = preg_split('/\R/', $sql) ?: [];
        $buf = '';
        $out = [];
        foreach ($lines as $line) {
            $trim = ltrim($line);
            if (str_starts_with($trim, '--')) {
                continue;
            }
            $buf .= $line . "\n";
            if (str_contains($line, ';')) {
                $out[] = $buf;
                $buf = '';
            }
        }
        if (trim($buf) !== '') {
            $out[] = $buf;
        }
        return $out;
    }
}
