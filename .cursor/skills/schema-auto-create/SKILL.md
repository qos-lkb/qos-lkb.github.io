---
name: schema-auto-create
description: >-
  Creates MariaDB tables and missing columns at runtime (CREATE TABLE IF NOT EXISTS)
  so deploys never require operators to run SQL. Use when adding tables, columns,
  migrations, schema.sql, schema_upgrade_all.sql, apply_schema.php, or when a
  feature would otherwise ask the user to 建表 / 手動加入 SQL.
---

# 未建表則建表

本專案**不要期望任何人手動加入 SQL**。遠端與本機第一次用該功能時，API 必須自己建表。

## 必做

1. 在對應 `includes/*_lib.php` 寫 `{feature}_ensure_schema(PDO $pdo): void`。
2. **每個**會讀寫該表的 handler／入口，在第一句查詢前呼叫它（可 `static $ready` 避免同請求重跑）。
3. 用 `includes/schema_runtime.php`：
   - `schema_runtime_ensure_table($pdo, 'CREATE TABLE IF NOT EXISTS ...')`
   - `schema_runtime_ensure_column($pdo, 'table', 'col', 'ALTER TABLE ... ADD COLUMN ...')`
4. 仍把相同 DDL 抄進 `schema.sql` 與 `schema_upgrade_all.sql`（全新安裝用），並在 `change_log.md` 記一筆。這**不能**代替 runtime ensure。
5. 對使用者與 commit 說明都寫「首次 API 會自動建表」，**禁止**寫成必須執行 `php scripts/apply_schema.php` 或手動匯入 `.sql` 才能用。

## 禁止

- 功能上線後還要人去 phpMyAdmin／CLI 貼 SQL。
- 只改 `schema_*.sql`、只登記 `MigrationRunner`，沒有 PHP ensure。
- 用「請先跑 apply_schema」當錯誤訊息或驗收步驟。

## 範本

科學助教：`tutor_ensure_schema()`（`includes/tutor_lib.php`），由 `api/v1/handlers/tutor.php` 每個 handler 呼叫。

```php
function example_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    schema_runtime_ensure_table($pdo, 'CREATE TABLE IF NOT EXISTS example_items ( ... )');
    schema_runtime_ensure_column(
        $pdo,
        'example_items',
        'title',
        "ALTER TABLE example_items ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT ''"
    );
    $ready = true;
}
```

`CREATE TABLE` 必須含新欄；`ensure_column` 只服務**舊表已存在、缺新欄**的庫。
