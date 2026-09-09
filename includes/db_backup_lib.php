<?php

declare(strict_types=1);

require_once __DIR__ . '/db_export_sql.php';

/**
 * Absolute path of the server-side SQL backup directory.
 */
function db_backup_dir(): string
{
    return dirname(__DIR__) . '/backup';
}

/**
 * Ensure backup/ exists and is writable.
 *
 * @throws RuntimeException
 */
function db_backup_ensure_dir(): string
{
    $dir = db_backup_dir();
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new RuntimeException('無法建立 backup 目錄。');
        }
    }
    if (!is_writable($dir)) {
        throw new RuntimeException('backup 目錄不可寫入。');
    }

    return $dir;
}

/**
 * True only for a safe basename like schema_YYYYMMDD_HHMMSS.sql.
 */
function db_backup_filename_ok(string $name): bool
{
    if ($name === '' || str_starts_with($name, '.')) {
        return false;
    }
    if ($name !== basename($name)) {
        return false;
    }
    if (str_contains($name, '/') || str_contains($name, '\\') || str_contains($name, "\0")) {
        return false;
    }
    if (str_contains($name, '..')) {
        return false;
    }

    return (bool) preg_match('/^[A-Za-z0-9._-]+\.sql$/i', $name);
}

/**
 * Resolve a backup basename to a real file inside backup/.
 *
 * @throws InvalidArgumentException invalid name
 * @throws RuntimeException missing directory or file
 */
function db_backup_resolve(string $name): string
{
    if (!db_backup_filename_ok($name)) {
        throw new InvalidArgumentException('無效的備份檔名。');
    }

    $dir = db_backup_dir();
    $dirReal = realpath($dir);
    if ($dirReal === false || !is_dir($dirReal)) {
        throw new RuntimeException('backup 目錄不存在。');
    }

    $full = $dirReal . DIRECTORY_SEPARATOR . $name;
    $fileReal = realpath($full);
    if ($fileReal === false || !is_file($fileReal)) {
        throw new RuntimeException('找不到備份檔。');
    }

    $prefix = $dirReal . DIRECTORY_SEPARATOR;
    if (!str_starts_with($fileReal, $prefix)) {
        throw new InvalidArgumentException('無效的備份路徑。');
    }

    return $fileReal;
}

function db_backup_format_hkt(int $ts): string
{
    try {
        $tzName = function_exists('config_timezone') ? config_timezone() : 'Asia/Hong_Kong';
    } catch (Throwable) {
        $tzName = 'Asia/Hong_Kong';
    }
    try {
        $tz = new DateTimeZone($tzName);
    } catch (Throwable) {
        $tz = new DateTimeZone('Asia/Hong_Kong');
    }
    $dt = (new DateTimeImmutable('@' . $ts))->setTimezone($tz);

    return $dt->format('Y-m-d H:i:s');
}

/**
 * @return list<array{filename:string,size:int,mtime:int,mtime_hkt:string}>
 */
function db_backup_list(): array
{
    $dir = db_backup_dir();
    if (!is_dir($dir)) {
        return [];
    }

    $files = [];
    $names = scandir($dir);
    if ($names === false) {
        return [];
    }
    foreach ($names as $name) {
        if (!db_backup_filename_ok($name)) {
            continue;
        }
        $path = $dir . DIRECTORY_SEPARATOR . $name;
        if (!is_file($path)) {
            continue;
        }
        $mtime = (int) (filemtime($path) ?: 0);
        $files[] = [
            'filename' => $name,
            'size' => (int) (filesize($path) ?: 0),
            'mtime' => $mtime,
            'mtime_hkt' => db_backup_format_hkt($mtime),
        ];
    }

    usort($files, static function (array $a, array $b): int {
        return ($b['mtime'] <=> $a['mtime']) ?: strcmp($b['filename'], $a['filename']);
    });

    return $files;
}

/**
 * Stream a full SQL dump into backup/{schema}_{Ymd_His}.sql.
 *
 * @return array{filename:string,size:int}
 *
 * @throws RuntimeException
 */
function db_backup_create(PDO $pdo): array
{
    $dir = db_backup_ensure_dir();
    $schema = db_export_schema_name();
    $safeFile = preg_replace('/[^A-Za-z0-9_-]+/', '_', $schema) ?: 'database';
    $filename = $safeFile . '_' . date('Ymd_His') . '.sql';
    if (!db_backup_filename_ok($filename)) {
        throw new RuntimeException('無法產生有效的備份檔名。');
    }

    $path = $dir . DIRECTORY_SEPARATOR . $filename;
    $fp = fopen($path, 'wb');
    if ($fp === false) {
        throw new RuntimeException('無法寫入備份檔。');
    }

    try {
        db_export_stream_full_sql($pdo, static function (string $chunk) use ($fp): void {
            if (fwrite($fp, $chunk) === false) {
                throw new RuntimeException('寫入備份檔時失敗。');
            }
        });
    } catch (Throwable $e) {
        fclose($fp);
        @unlink($path);
        throw $e;
    }
    fclose($fp);

    return [
        'filename' => $filename,
        'size' => (int) (filesize($path) ?: 0),
    ];
}

/**
 * @param list<mixed> $names
 * @return array{deleted:list<string>,missing:list<string>}
 *
 * @throws InvalidArgumentException
 * @throws RuntimeException
 */
function db_backup_delete(array $names): array
{
    $normalized = [];
    foreach ($names as $name) {
        $name = trim((string) $name);
        if ($name === '') {
            continue;
        }
        if (!db_backup_filename_ok($name)) {
            throw new InvalidArgumentException('無效的備份檔名。');
        }
        $normalized[$name] = true;
    }
    $unique = array_keys($normalized);
    if ($unique === []) {
        throw new InvalidArgumentException('請選擇要刪除的備份檔。');
    }

    $deleted = [];
    $missing = [];
    foreach ($unique as $name) {
        try {
            $path = db_backup_resolve($name);
        } catch (RuntimeException) {
            $missing[] = $name;
            continue;
        }
        if (!unlink($path)) {
            throw new RuntimeException('無法刪除備份檔：' . $name);
        }
        $deleted[] = $name;
    }

    return [
        'deleted' => $deleted,
        'missing' => $missing,
    ];
}
