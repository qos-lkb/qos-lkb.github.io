<?php

declare(strict_types=1);

$target = 'course_reports.php';
if (!empty($_SERVER['QUERY_STRING'])) {
    $target .= '?' . $_SERVER['QUERY_STRING'];
}
header('Location: ' . $target, true, 302);
exit;
