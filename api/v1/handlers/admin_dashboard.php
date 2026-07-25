<?php

declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/includes/api_response.php';
require_once dirname(__DIR__, 3) . '/includes/api_auth.php';

/**
 * Lightweight admin home stats (published / pending_review / draft), permission-scoped.
 *
 * Response:
 * {
 *   "totals": { "published": int, "pending": int, "draft": int },
 *   "by_type": { "<key>": { "published": int, "pending": int, "draft": int }, ... }
 * }
 */
function api_handle_admin_dashboard(PDO $pdo): void
{
    $user = require_api_user();
    auth_refresh_permissions($user['id']);
    $uid = (int) $user['id'];

    /** @var list<array{key:string,table:string,any:string,own:string}> */
    $sources = [
        ['key' => 'learning_notes', 'table' => 'learning_notes', 'any' => 'learning_note.manage_any', 'own' => 'learning_note.manage_own'],
        ['key' => 'worksheets', 'table' => 'worksheets', 'any' => 'worksheet.manage_any', 'own' => 'worksheet.manage_own'],
        ['key' => 'articles', 'table' => 'science_articles', 'any' => 'article.manage_any', 'own' => 'article.manage_own'],
        ['key' => 'learning_tools', 'table' => 'learning_tools', 'any' => 'learning_tool.manage_any', 'own' => 'learning_tool.manage_own'],
        ['key' => 'learning_videos', 'table' => 'learning_videos', 'any' => 'learning_video.manage_any', 'own' => 'learning_video.manage_own'],
        ['key' => 'question_banks', 'table' => 'question_banks', 'any' => 'question_bank.manage_any', 'own' => 'question_bank.manage_own'],
        ['key' => 'summer_homework', 'table' => 'summer_homework_items', 'any' => 'summer_homework.manage_any', 'own' => 'summer_homework.manage_own'],
        ['key' => 'simulations', 'table' => 'simulations', 'any' => 'simulation.manage_any', 'own' => 'simulation.manage_own'],
    ];

    $byType = [];
    $totals = ['published' => 0, 'pending' => 0, 'draft' => 0];

    foreach ($sources as $src) {
        $canAny = user_has_permission($src['any']);
        $canOwn = user_has_permission($src['own']);
        if (!$canAny && !$canOwn) {
            continue;
        }

        $sql = "SELECT
                    SUM(status = 'published') AS published,
                    SUM(status = 'pending_review') AS pending,
                    SUM(status = 'draft') AS draft
                FROM {$src['table']}";
        $params = [];
        if (!$canAny) {
            $sql .= ' WHERE owner_user_id = ?';
            $params[] = $uid;
        }

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable) {
            continue;
        }

        $counts = [
            'published' => (int) ($row['published'] ?? 0),
            'pending' => (int) ($row['pending'] ?? 0),
            'draft' => (int) ($row['draft'] ?? 0),
        ];
        $byType[$src['key']] = $counts;
        $totals['published'] += $counts['published'];
        $totals['pending'] += $counts['pending'];
        $totals['draft'] += $counts['draft'];
    }

    api_json_ok([
        'totals' => $totals,
        'by_type' => $byType,
    ]);
}
