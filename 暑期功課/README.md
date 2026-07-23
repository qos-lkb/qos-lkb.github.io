# 暑期功課 | Summer Homework

專為 **中一（S1）**、**中二（S2）** 同學而設的暑期習作模組。

架構總覽見根目錄 [`architecture.md`](../architecture.md)（§ Summer homework）；變更摘要見 [`change_log.md`](../change_log.md)。

## 規則

- 每份習作包含：**閱讀篇章** 或 **影片**，以及跟進 **選擇題（MC）** 與／或 **填充題**。
- 計分：每題 MC 1 分；每個填充空格 1 分。
- **達及格線（預設 80%）→ 及格**；否則 **不及格並須重做**。
- **及格後仍可重做**；若本次分數更高則更新最高分，較低則保留原最高分。
- 列表／報表顯示的百分比為該生的 **最高分數**；資料庫 **每次呈交都會新增一列** `summer_homework_attempts`（含 `responses_json` 與 `grading_json`）。
- 選擇題每次呈交會記錄：
  - `responses_json`：`selected_option_index`
  - `grading_json.details[]`：`selected_option_index`、`correct_option_index`、以及當下各選項 **文字／是否正確** 的快照（`options[]`）
  - 分析頁可計算：**各選項被選百分率**、**錯選佔比**（該錯誤選項 ÷ 答錯次數）
- 每份習作可設 **呈交截止日期（`due_at`）**：
  - **允許遲交**（`allow_late_submit = 1`，預設）：截止後仍可提交，報表標為「遲交」。
  - **截止後封鎖**（`allow_late_submit = 0`）：過期後 API／前台拒絕提交。
- **準時／遲交**：以該生 **最高分那一次** 的 `submitted_at` 對照 `due_at`（同分取較早呈交）。
- **欠交**：該習作尚無任何 attempt。

## 使用方式

### 既有資料庫（升級）

```bash
# 首次建立暑期功課表
mysql -u USER -p DB_NAME < schema_summer_homework.sql

# 截止日期／遲交設定（可重跑）
mysql -u USER -p DB_NAME < schema_summer_homework_due.sql

# 呈交評分明細 grading_json（可重跑；供錯題／選項分析）
mysql -u USER -p DB_NAME < schema_summer_homework_grading.sql
```

### 全新安裝

匯入完整 `schema.sql`（已含暑期功課表、截止日期、`grading_json` 與權限）。

### 學生

開啟 `/app/` 或 `/app/summer-homework`（頂部導覽「暑期功課」），登入後只會看到**自己年級（中一／中二）**需完成的習作。習作內容語言依選課的**修讀語言（MOI）**（E＝英文、C＝中文），不受頂部中／EN 切換影響。篇章與題目支援 MathJax：`$...$`／`$$...$$`。

### 教師／管理員

- 前台首頁 `/app/`：顯示**任教課程列表**，可進入各班暑期功課呈交報表。
- 後台 → **內容管理 → 暑期功課** → 新增／編輯習作（含呈交日期、是否允許遲交），設為「已發佈」。
- 後台 → **暑期功課 → 分析**（或編輯頁「呈交分析」）：
  - 總呈交次數、作答學生數
  - **錯題率**；選擇題 **各選項被選次數／佔全部呈交／錯選佔比**
  - 學生呈交摘要 → 每一次呈交 → 作答明細
- 後台 → **課程管理** → 某課程的 **暑期功課**：班內學生 × 對應年級已發佈習作（準時／遲交／欠交、最高分）；題目欄或「N 次」可連到分析頁。
- 後台 → **課程 → 學生與修讀語言**：僅**管理員**可編輯班別／班號／MOI／加入移出；教師可檢視。

## 呈交資料結構（跟進用）

### `responses_json`（原始作答）

```json
{
  "12": { "selected_option_index": 2 },
  "13": { "blanks": ["answer1", "answer2"] }
}
```

鍵為 `question_id`（字串或數字皆可）。

### `grading_json`（評分快照）

```json
{
  "score": 3,
  "max_score": 4,
  "percent": 75,
  "passed": false,
  "pass_percent": 80,
  "details": [
    {
      "question_id": 12,
      "type": "mcq",
      "correct": false,
      "selected_option_index": 2,
      "correct_option_index": 0,
      "options": [
        { "index": 0, "label": "A", "text_zh": "…", "text_en": "…", "is_correct": true },
        { "index": 1, "label": "B", "text_zh": "…", "text_en": "…", "is_correct": false }
      ]
    },
    {
      "question_id": 13,
      "type": "fill_blank",
      "correct": true,
      "blanks": [
        { "blank_index": 1, "given": "answer1", "correct": true }
      ]
    }
  ]
}
```

分析函式：`sh_item_attempt_analytics($pdo, $itemId)`（`includes/summer_homework_lib.php`）。

| 欄位（每題 MCQ 的 `options[]`） | 意義 |
|--------------------------------|------|
| `selected_count` | 被選次數 |
| `select_rate_percent` | 被選次數 ÷ 該題呈交次數 |
| `wrong_select_rate_percent` | 僅錯誤選項：被選次數 ÷ 答錯次數（正確選項為 `null`） |

舊呈交若無 `grading_json`／無選項快照，仍可依 `responses_json` 的選項索引統計；選項文字則用目前題庫。

## 程式位置

| 路徑 | 說明 |
|------|------|
| `includes/summer_homework_lib.php` | 業務邏輯、計分、班級報表、分析 |
| `api/v1/handlers/summer_homework.php` | REST API |
| `admin/summer_homework.php` | 習作列表（含「分析」連結） |
| `admin/summer_homework_edit.php` | 編輯習作 |
| `admin/summer_homework_analytics.php` | 呈交分析／選項分布／作答明細 |
| `admin/course_summer_homework.php` | 班級呈交報表 |
| `admin/course_students.php` | 學生與 MOI（管理員編輯） |
| `app/assets/js/summer-homework.js` | 前台 UI |
| `schema_summer_homework.sql` | 既有庫：建立表 |
| `schema_summer_homework_due.sql` | 既有庫升級（due_at／allow_late_submit） |
| `schema_summer_homework_grading.sql` | 既有庫升級（attempts.grading_json） |

## 權限

| Permission | 用途 |
|------------|------|
| `summer_homework.manage_any` | 管理全部習作 |
| `summer_homework.manage_own` | 管理自己建立的習作 |
| `summer_homework.submit_own` | 學生呈交 |

**Last updated**: 2026-07-23
