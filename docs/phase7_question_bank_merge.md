# Phase 7 — 題庫模型合併

**目標**：後台／API／學習端只推 `question_banks`／`qb_*`；`learning_tools`／`quiz_*` 凍結並可遷移後 DROP。

## 現況（本波）

| 面向 | 行為 |
|------|------|
| 寫入 | `lt_save_from_payload` 凍結；`POST/DELETE /admin/learning-tools` → **410** |
| 讀取相容 | `GET /learning-tools*` 可解析 LT、遷移對照表或同 slug 的試題庫（僅 MCQ） |
| 學習端 | `/quiz/:slug` 優先打 `/question-banks/{slug}`；進度 `source_type=question_bank` |
| Catalog | `learning_tools` 在 LT 為空時回傳已發佈試題庫；另加 `question_banks` |
| 後台 | `admin/learning_tools*.php` → `question_banks*`；選單只留「試題庫」 |
| 課程項目 | `topic_learning_items.content_type` 新增 `question_bank` |
| 嵌入 | 早已統一 `::question bank="…" id|code|index`（不變） |

## 遷移（有舊 LT 資料的環境）

```bash
# 套用 ENUM + legacy_learning_tool_map
php scripts/apply_schema.php

# 遷移（可先 --dry-run）
php scripts/migrate_learning_tools_to_question_banks.php
php scripts/migrate_learning_tools_to_question_banks.php --dry-run

# 確認無殘留引用後再 DROP quiz_* / learning_tools
php scripts/migrate_learning_tools_to_question_banks.php --drop-legacy
```

對照表：`legacy_learning_tool_map`（`old_tool_id`／`old_slug` → `bank_id`）。

## 刻意未做（後續）

- 文章內建 MCQ（`article_questions`／`article_options`）合併
- 學習端完整支援非 MCQ 整庫作答 UI（筆記／工作紙嵌入已支援多題型）
- 自動從權限表移除 `learning_tool.*`（仍可讀舊資料）

## 相關檔

- `includes/lt_qb_migrate_lib.php`
- `scripts/migrate_learning_tools_to_question_banks.php`
- `schema_upgrade_all.sql`（含 Phase 7 QB merge）／`schema_drop_quiz_legacy.sql`
