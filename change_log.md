# 變更紀錄 | Changelog

本文件依 Git 提交紀錄整理 **science_sims** 主要功能與架構變更。完整歷史請執行 `git log`。

**格式**：日期（新→舊）→ 摘要 → 代表性 commit（若有）

---

## 2026-06-28

### 文件與 Cursor 規則
- 更新 **`README.md`**、**`architecture.md`**、**`rule.md`**：反映工作紙派發、課程管理、SDL、遷移 001–018、SPA 模組等現況。
- **`ARCHITECTURE.md`** 改為導覽頁，指向 canonical 的 `architecture.md`。
- 新增根目錄 **`.cursorrules`**（Cursor AI 專案規則摘要）；細分規則見 `.cursor/rules/`。
- 本 **`change_log.md`** 補登 2026-06-14 至 2026-06-27 提交。

---

## 2026-06-27

### 工作紙派發、課程管理與嵌入內容
- **工作紙派發**：教師派發予班級、學生於 `/app/assignments` 提交、教師評分回饋；API `worksheet_assignments.php`；lib `worksheet_assignments_lib.php`、`worksheet_permissions_lib.php`。
- **工作紙區塊**：Markdown 嵌入模擬／影片／文章／試題（`::simulation`、`::question` 等）；`worksheet_blocks_lib.php`、SPA `content-embeds.js`、後台 `admin-worksheet-embed.js`。
- **試題自動計分**：提交 `responses_json`、`auto_score`；試題庫 `default_score`（migration `017`）。
- **課程管理後台**：`admin/courses.php`、`course_edit.php`、`course_reports.php`、`course_worksheets.php`；與原 `classes.php` 職能整合／重構。
- **帳戶模仿**：`admin/impersonate.php`；API `POST /auth/stop-impersonation`。
- **學習影片雙語嵌入**：`embed_url_zh` / `embed_url_en`（migration `018`）；`learning_videos_lib.php` 擴充。
- **QSIS 匯入**強化；工作紙／影片／使用者相關後台與 SPA 調整。
- Migrations **`011`–`018`**（班別班號、MOI、影片 provider、派發表、權限、計分、雙語影片）。
- `e3e0370` — Update Database.

---

## 2026-06-26

### QSIS 匯入與使用者雙語姓名
- **`admin/qsis_import.php`**：從 QSIS 資料庫匯入學生；`includes/qsis_import_lib.php`、`qsis_db.php`。
- 使用者 **`name_zh` / `name_en`**（migration `010`）；`user_names_lib.php`。
- 註冊、帳戶選單、後台使用者編輯配合調整。
- `1771e90` — Added Classes.

### SDL 自學導向學習與適性推薦
- Migration **`009_sdl_adaptive_learning.sql`**：學習事件、作答紀錄、掌握度、每週目標、班級等。
- SPA **`/dashboard`**（`dashboard.js`）、**`learning-tracker.js`** 頁面瀏覽／時數追蹤。
- API **`/learning/*`**：dashboard、events、attempts、mastery、progress、goals、recommendations、adaptive-quiz。
- 教師班級：`admin/classes.php`、`class_edit.php`、`class_reports.php`；API **`/teacher/classes/*`**。
- Lib：`adaptive_lib.php`、`learning_analytics_lib.php`、`learning_assessment_lib.php`、`classes_lib.php`。
- 學生自助註冊 **`register.php`**（邀請碼）。
- `e4522c1` — SDL and Adaptive.

---

## 2026-06-14

### 後台科目頁版面
- **`admin/subjects.php`** 版面與其他後台頁一致。
- `cf61f27`

---

## 2026-06-13

### 試題庫、角色與帳戶選單
- 新增 **試題庫**（MCQ、短答、長答子題、填充、是非）；後台 `admin/question_banks.php`、API `/question-banks`。
- 角色調整：原 `user` → **`teacher`**；新增 **`student`**（migration `007`）。
- 權限矩陣頁面強化；SPA 新增 **帳戶選單**（個人資料、登出等）。
- `3cf4952` — Add question bank, role updates, permission matrix, and account menu.

### 試題庫 schema 重設計
- Migration **`008_question_bank_redesign.sql`**：逐題 metadata、MathJax、圖片上傳（`uploads/question_bank/`）。
- 後台編輯器與 `question_bank_lib.php` 大幅擴充。
- `068bb10`, `7cbf165`

### 後台儀表板與資料庫匯入
- **`admin/index.php`** 新版 hero、統計、圖示卡片；`admin/assets/css/admin.css`。
- **`admin/db_import.php`** 匯入 UX 調整；`db_import_sql.php`。
- `1ea69a7`, `724ca30`, `4ed02b5`

### 文件
- 新增 **`change_log.md`**；更新 architecture、README、rules。
- `9ffb5b0`

### 學習筆記 PDF 匯出
- 筆記閱讀頁支援 **PDF 下載**（jsPDF）。
- `8f60520`

### 學習筆記與課程導覽修正
- 後台筆記拖曳排序改為從 **1** 起算。
- 自學課程「下一項」先進入 **模擬預覽頁** 再開啟模態視窗。
- `4f93d77`, `09f6a6d`, `7b648ec`

---

## 2026-06-11

### 時區
- 應用程式、MySQL 與前端統一為 **`Asia/Hong_Kong`**。
- `1900cc1`

### 後台學習筆記強化
- 依 **科目分頁**、**行內編輯**、**拖曳排序**。
- 修正科目分頁切換與連結後備腳本。
- `f376b8f`, `4f5d296`, `0413851`, `372bdcc`

### 課程編排修正
- 課程課題拖曳排序改為儲存 **使用者自訂順序**（非僅 ID 排序）。
- `8c3fa31`

---

## 2026-06-09

### 自學課程平台
- 新增 **自學課程**：依科目／課題瀏覽混合學習項目（筆記、模擬、工作紙、文章、互動工具、**嵌入影片**）。
- 資料表 `learning_videos`、`topic_learning_items`；migration `005_self_study_courses.sql`。
- SPA 路由：`/courses`、`/course/{subject}`、`/course/{subject}/{topic}`、`/video/{slug}`、`/simulation/{slug}`。
- `62c0f78`

---

## 2026-06-07

### 費曼學習法參考文本
- 新增 `book.md`、`book.txt` 及轉換腳本 `convert_book_to_md.py`（《別鬧了，費曼先生》相關摘錄，供教學參考）。
- `864c1e3`

---

## 2026-06-06

### 筆記與工作紙平台
- SPA 整合 **學習筆記**、**工作紙** 列表與閱讀頁；加寬閱讀版面。
- 課程側欄導覽延伸至工作紙與科學文章。
- `c7afcf0`, `f0fafb2`, `29251bd`

---

## 2026-05-31

### 學習筆記、工作紙與權限管理
- 資料庫 schema：`learning_notes`、`worksheets`（migration `003`、`004`）。
- 後台 CRUD、審核佇列、角色權限管理頁。
- `8fa306e`

---

## 2026-05-30

### REST API 與 SPA 前端（重大架構）
- 新增 **`app/`** 單頁應用：模擬目錄、互動學習工具、科學文章。
- 新增 **`api/v1/`** REST API：目錄、認證、CRUD、審核；CSRF、速率限制等安全強化。
- Migration `001_api_learning_content.sql`；`index.php` 改為 **302 轉址至 `app/`**。
- 修正 SPA 靜態資源 URL；恢復模態全螢幕與 PNG 截圖。
- `9218cac`, `6fdb856`

### 首頁版面現代化
- 可收合側欄、課題面板；模擬路線圖擴充。
- `e0179a9`, `bbe583a`

### Code Space
- 新增 **`codespace/index.html`**：HTML／CSS／JavaScript 三欄即時編輯與預覽。
- 後台選單連結至 Code Space（新分頁）。
- `c9950ea`, `294e3d3`

---

## 2026-04-14 — 2026-04-20

### 資料庫驅動首頁
- 由 CSV 過渡至 **MariaDB** 管理模擬、科目、課題。
- 科目／單元 **CRUD**、排序、管理後台強化。
- `b126858`, `3c59c89`, `9168d59`, `12c469e`

### 選用轉址
- 根目錄 `index.html` + `default_redirect_url.php`；`.env` 設定 `DEFAULT_REDIRECT_URL`。
- 預設停止寫入 Git 快照，減少雜訊。
- `8af517f` … `3e76d99`

### 模擬內容
- 天文：月球圖集、太陽系改進；化學：石油分餾等。
- `39f9fd2`, `c7e89cf`, `4ad9cff`, `06ed30f`

---

## 2026-01 — 2026-03

### 專案文件與工具
- 新增／更新 `README.md`、`architecture.md`。
- CSV 編輯器（後續已 deprecated，改由 DB／後台維護）。
- `ef69de0`, `64c2e22`, `0342c94`

### 模擬新增與改進
- 電梯、電解水、電子駐波、量子、顯微鏡等物理／化學模擬。
- 首頁截圖、原始碼下載等功能調整。
- `e4b87e1`, `b034fed`, `8a8eca2`, `1fbdcbc`

---

## 遷移檔一覽 | Migrations

| 檔案 | 內容 |
|------|------|
| `001_api_learning_content.sql` | 互動學習工具、科學文章、quiz／article 題目、權限 |
| `002_permissions_description.sql` | 權限描述欄位 |
| `003_learning_notes_worksheets.sql` | 學習筆記、工作紙 |
| `004_worksheets_markdown.sql` | 工作紙 Markdown 支援 |
| `005_self_study_courses.sql` | 學習影片、課題混合編排 |
| `006_question_bank.sql` | 試題庫與各題型 |
| `007_roles_student_teacher.sql` | 教師／學生角色 |
| `008_question_bank_redesign.sql` | 試題庫逐題 metadata、圖片上傳 |
| `009_sdl_adaptive_learning.sql` | SDL：班級、學習事件、作答、掌握度、目標 |
| `010_user_names_bilingual.sql` | 使用者中英文名 |
| `011_class_enrollment_form_class.sql` | 選課：行政班、班號 |
| `012_class_enrollment_moi.sql` | 選課：MOI（E/C） |
| `013_learning_video_providers.sql` | 影片 provider 擴充 |
| `014_worksheet_assignments.sql` | 工作紙派發、提交 |
| `015_teacher_worksheet_permissions.sql` | *(已棄用，請改執行 016)* |
| `016_worksheet_role_permissions.sql` | 工作紙派發／評分／提交權限 |
| `017_worksheet_question_scores.sql` | 試題分數、提交 JSON、自動計分 |
| `018_learning_video_bilingual.sql` | 學習影片雙語嵌入 URL |

新環境請依序執行 **`001` 至 `018`**（詳見 [architecture.md](architecture.md)）。

---

## 相關文件

- [architecture.md](architecture.md) — 架構與部署
- [README.md](README.md) — 快速開始
- [rule.md](rule.md) — 開發規範
- [.cursorrules](.cursorrules) — Cursor AI 專案規則

---

**最後更新**：2026-06-28  
**維護者**：Mr. Bryan Leung
