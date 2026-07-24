# 科學模擬實驗平台 | Science Simulations Platform

專為香港中學文憑試（HKDSE）及中學科學課程設計的互動模擬與學習資源：**物理、化學、生物、綜合科學、天文**等獨立 HTML 實驗頁，並搭配 **PHP + MariaDB** 動態目錄、自學課程、筆記／工作紙、試題庫、課程班別與管理後台。

An interactive science platform for HKDSE and secondary science: standalone HTML labs plus an optional **PHP + MariaDB** stack for catalogue, self-study courses, notes, worksheets, question banks, class management, and administration.

## 專案簡介 | Project overview

| 模式 | 說明 |
|------|------|
| **SPA 前端（推薦）** | **`app/`** — 暑期功課入口、模擬目錄、自學課程、學習筆記、工作紙、互動工具、科學文章、學習儀表板；經 **REST API** 讀取資料庫。 |
| **舊版入口** | `index.php` 302 轉址至 `app/`。 |
| **靜態單頁** | 各子目錄 `.html` 可直接開啟；適合 GitHub Pages **單檔分享**（整站動態功能需 PHP）。 |
| **選用轉址** | 根目錄 `index.html` 可經 `default_redirect_url.php` 讀取 `.env` 的 `DEFAULT_REDIRECT_URL` 並轉址。 |
| **Code Space** | `codespace/index.html` — HTML／CSS／JavaScript 三欄即時編輯（後台選單連結）。 |

**儲存庫**：本樹作 **`science_sims`** 使用；可與 **`qos-lkb.github.io`**（GitHub Pages）等鏡像併行維護。

## 功能特色 | Features

- 雙語介面（繁中／英）、響應式排版（Tailwind）
- **暑期功課**（中一／中二）：閱讀或影片 + 選擇／填充／是非／短答／長答；每次呈交保留完整紀錄；截止／遲交；班級報表與**錯題分析**（詳見下方 [暑期功課](#暑期功課--summer-homework)）
- **自學課程**：依科目／課題混合編排筆記、模擬、工作紙、文章、互動工具、嵌入影片
- **學習筆記**（含 PDF 匯出）、**工作紙**（Markdown + 嵌入模擬／影片／試題）、**試題庫**（MCQ、短答、長答、填充、是非）
- **模擬程式**：側欄瀏覽、搜尋；課程流程先 **預覽頁** 再模態 iframe；PNG 截圖
- **互動學習工具**（四選一 MCQ）、**科學文章**（Markdown + 理解題）
- **SDL 學習儀表板**（`/app/dashboard`）：學習時數、掌握度、適性推薦、每週目標
- **課程班別**：教師／管理員建立課程（年級、科目）、邀請碼選課、QSIS 匯入、班別／班號／MOI；**僅管理員**可改班內學生與 MOI
- **登入**：帳戶名與 QSIS 相同（如學號，**不用** `@qos.edu.hk`）；密碼以校本 **QSIS** 為準
- **工作紙派發**：教師派發予班級、學生於 `/app/assignments` 完成提交、教師評分與回饋、試題自動計分
- **管理後台**（`admin/`）：使用者／角色（admin、teacher、student）、權限矩陣、各科內容 CRUD、暑期功課分析、課程編排、前台選單可見性、審核佇列、帳戶模仿（除錯）
- **帳戶選單**：SPA 與後台共用個人設定與登出
- 模擬本體多為 **Vanilla JS**；少數使用 Three.js、Chart.js、MathJax、React standalone；SPA 篇章／題目支援 MathJax

## 技術棧 | Technology stack

- **HTML5 / CSS3 / JavaScript**；**Tailwind CSS**（CDN）
- **PHP 8+**（`declare(strict_types=1);`）、`PDO`、**MariaDB / MySQL**；時區 **Asia/Hong_Kong**
- **Vanilla JS SPA**（`app/`，無 bundler）+ **REST API**（`api/v1/`）
- CDN：**Three.js**、**Chart.js**、**MathJax**、**html2canvas**、**DOMPurify**、**jsPDF**

詳見 [architecture.md](architecture.md)。

## 目錄結構（精簡）| Project structure (abridged)

```
science_sims/
├── app/                      # SPA 前端（主要入口）
├── api/v1/                   # REST API（router + handlers）
├── assets/js/, assets/css/   # 後台共用腳本（含 user-menu、admin-api）
├── codespace/                # HTML 即時編輯
├── index.php                 # 302 → app/
├── index.html                # 選用轉址
├── includes/                 # 設定、DB、auth、內容 lib
├── admin/                    # 後台（含 courses、classes、qsis_import）
├── portal/                   # 貢獻者入口
├── schema.sql                # 完整資料庫 schema（新環境一次匯入）
├── schema_*.sql              # 既有庫增量升級（暑期功課、課程年級等）
├── physics/, chem/, biology/, science/, astronomy/, …
├── .cursorrules              # Cursor AI 專案規則（摘要）
├── .cursor/rules/            # Cursor 細分規則（依檔案類型）
├── change_log.md             # 變更紀錄
├── architecture.md, rule.md, README.md
└── .env, .env.example
```

> **注意**：模擬與學習內容清單由 **資料庫與後台** 維護；舊版 **`index.csv`** 已停用。在大小寫不敏感磁碟（如預設 macOS）上，`ARCHITECTURE.md` 與 `architecture.md` 為同一檔。

## 快速開始 | Quick start

### 1. PHP + 資料庫（完整功能）

1. 安裝 **PHP 8+**、**MariaDB**。
2. 複製 **`.env.example`** 為 **`.env`**，填入 `DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASS` 等。
3. 匯入 **`schema.sql`** 建立完整資料庫結構（見 [architecture.md](architecture.md)）。
4. 將網站根目錄指到本專案，於瀏覽器開啟 **`/app/`**。
5. 選填：`.env` 設定 **`DEFAULT_REDIRECT_URL`**，則 **`/index.html`** 會轉址。

### 2. 僅預覽單一模擬（無 PHP）

在子目錄中直接開啟 **`.html`**，或使用本機靜態伺服器：

```bash
python3 -m http.server 8000
# 瀏覽 http://localhost:8000/physics/02/0202_freefall.html 等
```

### 3. GitHub Pages

靜態 HTML 可部署；**`app/`、API 與後台不會在 Pages 上執行**。公開入口需靜態策略或另設 PHP 主機。

## 新增模擬 | Adding a simulation

1. 在適當學科目錄建立 **`.html`**，於 `<head>` 引入所需 CDN（與同目錄風格一致）。
2. 依 **`rule.md`** 命名與結構（標題、無障礙、語言標記等）。
3. 透過 **`admin/simulations.php`**（或 portal）登記 URL、科目／課題、中英標題，並設為 **已發佈**。
4. 多瀏覽器測試後提交；重大變更請更新 **`change_log.md`**。

## 新增學習內容 | Adding learning content

- **筆記、文章、互動工具、影片、試題庫**：經 `admin/` 或 `portal/` 編輯，走 `draft` → `pending_review` → `published` 流程。
- **工作紙**：`admin/worksheet_edit.php`；Markdown 內可嵌入模擬、影片、試題（語法見 **`rule.md`** §16）。
- **自學課程編排**：`admin/course_curriculum.php`（`topic_learning_items`）。
- **課程班別**：`admin/courses.php`；學生與 MOI 見 `admin/course_students.php`；派發工作紙見 `admin/course_worksheets.php`；暑期功課班級報表見 `admin/course_summer_homework.php`。
- **暑期功課**：`admin/summer_homework.php`（編輯／分析）；規則與資料結構見下方 [暑期功課](#暑期功課--summer-homework)。

---

## 暑期功課 | Summer Homework

專為 **中一（S1）**、**中二（S2）** 同學而設的暑期習作模組。架構細節見 [architecture.md](architecture.md)（§ Summer homework）；變更摘要見 [change_log.md](change_log.md)。

### 規則

- 每份習作包含：**閱讀篇章** 或 **影片**，以及跟進題目。
- **題型**：選擇題（MC，2–6 選項）、填充題（每空可多個可接受答案）、是非題、短答題、長答題（教師評閱）。
- 計分：自動評分題各題／各空 1 分；長答有 `max_score` 但 **不計入自動及格百分比**（另存 `teacher_marks_json`）。
- **達及格線（預設 80%，可調）→ 及格**；否則 **不及格並須重做**。長答不擋自動及格。
- **及格後仍可重做**；若本次分數更高則更新最高分，較低則保留原最高分。
- 列表／報表顯示的百分比為該生的 **最高分數**；資料庫 **每次呈交都會新增一列** `summer_homework_attempts`（含 `responses_json` 與 `grading_json`）。
- 重存習作時題目採 **upsert**（保留 `question_id`），避免歷史呈交對不上題號。
- 選擇題每次呈交會記錄：
  - `responses_json`：`selected_option_index`
  - `grading_json.details[]`：`selected_option_index`、`correct_option_index`、以及當下各選項 **文字／是否正確** 的快照（`options[]`）
  - 分析頁可計算：**各選項被選百分率**、**錯選佔比**（該錯誤選項 ÷ 答錯次數）
- 是非／短答／填充同樣寫入 `details[]`（含 `given`／`selected_bool`／可接受答案正規化比對）。
- 長答：`correct: null`、`needs_marking: true`、`exclude_from_auto: true`；教師於分析頁評分寫入 `teacher_marks_json`。
- 每份習作可設 **呈交截止日期（`due_at`）**：
  - **允許遲交**（`allow_late_submit = 1`，預設）：截止後仍可提交；首次及格若在截止後則報表標為「欠交」。
  - **截止後封鎖**（`allow_late_submit = 0`）：過期後 API／前台拒絕提交。
- **準時**：首次及格時間在截止日期當日或之前（無截止日期亦視為準時）。
- **欠交**：首次及格時間在截止日期之後。
- **未交**：尚未及格（含從未呈交、或已呈交但未達及格線）。
- **呈交紀錄時間**：以該生 **首次及格** 那一次的 `submitted_at` 為準（分數仍顯示最高分）。

### 使用方式

#### 既有資料庫（升級）

```bash
# 首次建立暑期功課表
mysql -u USER -p DB_NAME < schema_summer_homework.sql

# 截止日期／遲交設定（可重跑）
mysql -u USER -p DB_NAME < schema_summer_homework_due.sql

# 呈交評分明細 grading_json（可重跑；供錯題／選項分析）
mysql -u USER -p DB_NAME < schema_summer_homework_grading.sql

# 新題型（是非／短答／長答）＋教師評分欄（可重跑）
mysql -u USER -p DB_NAME < schema_summer_homework_qtypes.sql
```

#### 全新安裝

匯入完整 `schema.sql`（已含暑期功課表、截止日期、`grading_json`、新題型與權限）。

#### 學生

開啟 `/app/` 或 `/app/summer-homework`（頂部導覽「暑期功課」），登入後只會看到**自己年級（中一／中二）**需完成的習作。習作內容語言依選課的**修讀語言（MOI）**（E＝英文、C＝中文），不受頂部中／EN 切換影響。篇章與題目支援 MathJax：`$...$`／`$$...$$`。

#### 教師／管理員

- 前台首頁 `/app/`：顯示**任教課程列表**，可進入各班暑期功課呈交報表。
- 後台 → **內容管理 → 暑期功課** → 新增／編輯習作（含呈交日期、是否允許遲交），設為「已發佈」。
- 後台 → **暑期功課 → 分析**／**內容／答案**：教師與管理員可檢視全部習作的呈交統計與正確答案（編輯仍限擁有者或管理員）。
- 後台 → **課程管理** → 某課程的 **暑期功課**：班內學生 × 對應年級已發佈習作（準時／欠交／未交、最高分、首次及格時間）；題目欄或「N 次」可連到分析頁。
- 後台 → **課程 → 學生與修讀語言**：僅**管理員**可編輯班別／班號／MOI／加入移出；教師可檢視。

### 呈交資料結構（跟進用）

#### `responses_json`（原始作答）

```json
{
  "12": { "selected_option_index": 2 },
  "13": { "blanks": ["answer1", "answer2"] },
  "14": { "selected_bool": true },
  "15": { "text": "short answer" },
  "16": { "text": "longer free-response text…" }
}
```

鍵為 `question_id`（字串或數字皆可）。

#### `grading_json`（評分快照）

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
      "score": 0,
      "max": 1,
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
      "score": 2,
      "max": 2,
      "blanks": [
        { "blank_index": 1, "given": "answer1", "correct": true }
      ]
    },
    {
      "question_id": 14,
      "type": "true_false",
      "correct": true,
      "score": 1,
      "max": 1,
      "selected_bool": true,
      "correct_bool": true
    },
    {
      "question_id": 15,
      "type": "short_answer",
      "correct": false,
      "score": 0,
      "max": 1,
      "given": "…"
    },
    {
      "question_id": 16,
      "type": "long_answer",
      "correct": null,
      "score": 0,
      "max": 5,
      "needs_marking": true,
      "exclude_from_auto": true,
      "given": "…"
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

### 程式位置

| 路徑 | 說明 |
|------|------|
| `includes/summer_homework_lib.php` | 業務邏輯、計分、班級報表、分析 |
| `api/v1/handlers/summer_homework.php` | REST API |
| `admin/summer_homework.php` | 習作列表（含「分析」連結） |
| `admin/summer_homework_edit.php` | 編輯習作 |
| `admin/summer_homework_analytics.php` | 呈交分析／選項分布／作答明細 |
| `admin/summer_homework_view.php` | 檢視習作內容與正確答案（教師／管理員） |
| `admin/course_summer_homework.php` | 班級呈交報表 |
| `admin/course_students.php` | 學生與 MOI（管理員編輯） |
| `app/assets/js/summer-homework.js` | 前台 UI |
| `schema_summer_homework.sql` | 既有庫：建立表 |
| `schema_summer_homework_due.sql` | 既有庫升級（due_at／allow_late_submit） |
| `schema_summer_homework_grading.sql` | 既有庫升級（attempts.grading_json） |

### 權限

| Permission | 用途 |
|------------|------|
| `summer_homework.manage_any` | 管理全部習作 |
| `summer_homework.manage_own` | 管理自己建立的習作 |
| `summer_homework.submit_own` | 學生呈交 |

---

## 瀏覽器相容性 | Browser compatibility

建議最新版 **Chrome、Firefox、Safari、Edge**；Three.js 需 **WebGL**；SPA 使用 **ES6+**。

## 授權 | License

[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

## 維護者 | Maintainer

**Mr. Bryan Leung** — Copyright © Mr. Bryan Leung

## 相關文件 | Related documentation

- [change_log.md](change_log.md) — 依 Git 整理的變更紀錄
- [architecture.md](architecture.md) — 架構、API、部署、資料模型（含暑期功課呈交／分析；大小寫不敏感磁碟上等同 `ARCHITECTURE.md`）
- [schema.sql](schema.sql) — 完整資料庫 schema
- [data_dictionary.md](data_dictionary.md) — 資料表欄位字典（`php update_data_dictionary.php` 產生）
- [rule.md](rule.md) — 開發規範（模擬 HTML、PHP、SPA、工作紙嵌入、暑期功課）
- [.cursorrules](.cursorrules) — Cursor AI 專案規則摘要
- [prompt.md](prompt.md) — 建立新模擬之提示範本
- [dev/plan.md](dev/plan.md) — 各科模擬／教學構想（參考）

## 連結 | Links

- 範例儲存庫：**`https://github.com/qos-lkb/science_sims`**
- GitHub Pages：**`https://qos-lkb.github.io`**
- 其他：**`link.txt`**

---

**最後更新 | Last updated**：2026-07-23

如有問題或建議，歡迎開 Issue 或 Pull Request。  
Questions or suggestions: Issues / PRs welcome.
