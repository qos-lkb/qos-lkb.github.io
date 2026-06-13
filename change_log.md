# 變更紀錄 | Changelog

本文件依 Git 提交紀錄整理 **science_sims** 主要功能與架構變更。完整歷史請執行 `git log`。

**格式**：日期（新→舊）→ 摘要 → 代表性 commit（若有）

---

## 2026-06-13

### 試題庫、角色與帳戶選單
- 新增 **試題庫**（MCQ、短答、長答子題、填充、是非）；後台 `admin/question_banks.php`、API `/question-banks`。
- 角色調整：原 `user` → **`teacher`**；新增 **`student`**（migration `007_roles_student_teacher.sql`）。
- 權限矩陣頁面強化；SPA 新增 **帳戶選單**（個人資料、登出等）。
- `3cf4952` — Add question bank, role updates, permission matrix, and account menu.

### 學習筆記 PDF 匯出
- 筆記閱讀頁支援 **PDF 下載**（jsPDF）。
- `8f60520` — Add PDF export for learning notes on note pages.

### 學習筆記與課程導覽修正
- 後台筆記拖曳排序改為從 **1** 起算。
- 自學課程「下一項」先進入 **模擬預覽頁** 再開啟模態視窗。
- 課程內模擬改為 **預覽頁** 後才嵌入 iframe。
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

新環境請依序執行上述 migrations（詳見 [architecture.md](architecture.md)）。

---

## 相關文件

- [architecture.md](architecture.md) — 架構與部署
- [README.md](README.md) — 快速開始
- [rule.md](rule.md) — 開發規範

---

**最後更新**：2026-06-13  
**維護者**：Mr. Bryan Leung
