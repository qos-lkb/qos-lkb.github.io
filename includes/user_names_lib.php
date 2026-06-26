<?php

declare(strict_types=1);

function account_sync_display_name(string $nameZh, string $nameEn): string
{
    $nameZh = trim($nameZh);
    $nameEn = trim($nameEn);
    if ($nameZh !== '') {
        return $nameZh;
    }
    if ($nameEn !== '') {
        return $nameEn;
    }

    return '';
}

/**
 * @param array{name_zh?:string,name_en?:string,display_name?:string,email?:string} $user
 */
function user_format_name(array $user, string $lang = 'zh'): string
{
    $zh = trim((string) ($user['name_zh'] ?? ''));
    $en = trim((string) ($user['name_en'] ?? ''));
    $legacy = trim((string) ($user['display_name'] ?? ''));

    if ($lang === 'en') {
        return $en !== '' ? $en : ($zh !== '' ? $zh : ($legacy !== '' ? $legacy : (string) ($user['email'] ?? '')));
    }

    return $zh !== '' ? $zh : ($en !== '' ? $en : ($legacy !== '' ? $legacy : (string) ($user['email'] ?? '')));
}

/**
 * @return array{ok:bool,error?:string}
 */
function account_validate_names(string $nameZh, string $nameEn): array
{
    $nameZh = trim($nameZh);
    $nameEn = trim($nameEn);
    if ($nameZh === '' && $nameEn === '') {
        return ['ok' => false, 'error' => '請至少輸入中文名或英文名。'];
    }
    if (mb_strlen($nameZh) > 120 || mb_strlen($nameEn) > 120) {
        return ['ok' => false, 'error' => '姓名過長（每欄最多 120 字元）。'];
    }

    return ['ok' => true];
}
