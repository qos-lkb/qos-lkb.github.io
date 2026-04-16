<?php

declare(strict_types=1);

/**
 * 舊版 index.csv 編輯器已停用；模擬資料改由 MariaDB 與管理後台維護。
 */

require_once __DIR__ . '/includes/bootstrap.php';

bootstrap_public();

header('Content-Type: text/html; charset=utf-8');

if (!current_user() || !user_has_permission('simulation.manage_any')) {
    http_response_code(403);
    echo '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>已停用</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-100 min-h-screen flex items-center justify-center p-4"><div class="bg-white rounded-xl shadow p-8 max-w-md text-center"><p class="text-slate-700 mb-4">此 CSV 編輯介面已停用。請登入管理員後使用後台管理模擬。</p><p><a href="login.php?next=' . htmlspecialchars(rawurlencode('admin/simulations.php'), ENT_QUOTES, 'UTF-8') . '" class="text-indigo-600 underline">登入</a></p></div></body></html>';
    exit;
}

header('Location: admin/simulations.php');
exit;
