# 變更紀錄 | Changelog

本文件依 Git 提交紀錄整理 **science_sims** 主要功能與架構變更。完整歷史請執行 `git log`。

**格式**：日期（新→舊）→ 摘要 → 代表性 commit（若有）

---

## 2026-07-24

### 暑期功課：未及格不標「準時」
- 已呈交但未達及格線：狀態為 **未及格**（不再顯示準時／遲交）。
- 準時／遲交僅在**已及格**後，依最高分那次呈交時間判斷。
- 前台列表／習作頁加強「未及格，請再次完成」提示；班級報表主標籤顯示「未及格」。

### 登入改為僅驗證 QSIS 密碼；移除本站 password_hash
- `attempt_login()` **不再**回退本站 `users.password_hash`；必須 QSIS 驗證成功。
- 既有庫執行：`mysql … < schema_users_drop_password.sql`（刪除 `users.password_hash`）。
- `schema.sql` 新建庫已不含密碼欄；後台／匯入／註冊不再寫入本站密碼。

### 訪客首頁
- 未登入開啟 `/app/` 顯示歡迎頁（品牌、簡介、登入與模擬／課程／暑期捷徑）；已登入學生／教師行為不變。
- 新增 `app/assets/js/guest-home.js`；`/summer-homework` 仍為公開習作列表。

## 2026-07-23

### 暫時關閉使用者自助更改密碼
- （已由「僅驗證 QSIS 密碼」取代：本站不再儲存密碼，更改密碼請於 QSIS。）

### 暑期功課：教師／管理員可檢視分析與答案
- 教師（`summer_homework.manage_own`／`class.manage_*`）與管理員可檢視**全部**習作的呈交分析、內容與正確答案。
- 編輯／刪除仍限擁有者或 `manage_any`；新增後台頁 `admin/summer_homework_view.php`。
- Lib：`sh_can_review()`／`sh_can_review_item()`。

### 文件：暑期功課說明併入 README
- 原 **`暑期功課/README.md`** 內容併入根目錄 **`README.md`**（§ 暑期功課），並刪除 `暑期功課/` 目錄；相關文件連結已更新。

### 登入：帳戶名與 QSIS 對齊（不用 @qos.edu.hk）
- 本站 `users.email` 與 QSIS `user.username` 一致：學校帳戶只存帳戶名（如 `s20171060`），**不使用** `@qos.edu.hk`。
- 登入請輸入帳戶名；若仍輸入 `sid@qos.edu.hk` 會自動剝離網域。密碼以 QSIS `password_hash` 驗證。
- 既有庫執行 `schema_users_login_id.sql` 批次剝離學校網域；登入時亦會自動遷移舊電郵格式。
- 新增／更新：`includes/qsis_auth_lib.php`。

### 登入：自動補網域＋QSIS 密碼
- （已由「帳戶名與 QSIS 對齊」及「僅驗證 QSIS 密碼」取代。）
- 歷史：曾以 QSIS 為優先、本站 `password_hash` 為後備；後備已移除。

### 文件同步（暑期功課呈交／選項分析）
- 更新 **`architecture.md`**、**`README.md`**、**`rule.md`**、**`暑期功課/README.md`**、**`change_log.md`**：紀錄每次呈交、`grading_json` 選項快照、錯選百分率分析、截止日期、MOI、班級報表與後台入口。
- 注意：macOS 預設大小寫不敏感時，`ARCHITECTURE.md` 與 `architecture.md` 為同一檔；以 **`architecture.md`** 為唯一架構文件。
- **`data_dictionary.md`** 請於本機執行 `php update_data_dictionary.php` 自最新 `schema.sql` 重新產生（含 `summer_homework_*`）。

### 首頁依身分分流
- SPA 首頁 `/app/` 改為暑期功課入口：學生只見自己年級習作；教師／管理員見任教課程列表（連至班級暑期功課報表）。
- API 對純學生強制依 `student_profiles`／就讀班級 `form_level` 過濾；非中一／中二顯示說明。

### 課程學生與修讀語言（管理員）
- 新增 `admin/course_students.php`：編輯班別、班號、修讀語言（MOI）、加入／移出學生。
- 僅 **管理員**（`class.manage_any`／admin 角色）可編輯；教師可檢視。CSV 匯入亦限管理員。

### 暑期功課內容語言依 MOI
- 學生在暑期功課頁的標題／篇章／題目語言由選課 **修讀語言（MOI）** 決定（E→英文、C→中文），無視頂部中／EN 切換。
- 教師／訪客仍跟從介面語言。

### 工作紙／暑期功課 MathJax
- 篇章與題幹／選項支援 `$...$`／`$$...$$` 公式；學生 SPA 於渲染後呼叫 MathJax typeset。

### 暑期功課：完整呈交歷史
- 每次提交皆 **INSERT** 一筆 `summer_homework_attempts`（含 `responses_json`）；介面仍只顯示最高分。
- 新增 **`grading_json`**（評分明細／對錯，含填充題作答文字與選擇題選項快照），既有庫執行 `schema_summer_homework_grading.sql`。
- Lib：`sh_list_attempts_for_user_item`、`sh_item_attempt_analytics`（作答次數、錯題率、**各選項被選／錯選百分率**）。
- 後台：**暑期功課 → 分析**（`admin/summer_homework_analytics.php`）— 錯題率、選項分布、學生呈交摘要、每次作答明細。

### 暑期功課：截止日期與班級呈交報表
- `summer_homework_items` 新增 **`due_at`**、**`allow_late_submit`**（預設允許遲交）；既有庫執行 `schema_summer_homework_due.sql`。
- 提交閘道：過期且不允許遲交時拒絕；結果回傳 `submitted_at`、最高分 attempt 時間與準時／遲交狀態。
- 前台 SPA 顯示截止資訊；封鎖時停用提交。
- 教師課程頁新增 **`admin/course_summer_homework.php`**：依班級年級（中一／中二）彙總學生準時／遲交／欠交與最高分。

## 2026-07-22

### 課程管理：年級與科目
- `classes` 新增 **`form_level`**（中一至中六）與 **`course_subject`**（綜合科學／物理／化學／生物）。
- 後台課程列表與編輯表單顯示／必填；既有庫請執行 `schema_classes_form_subject.sql`。

### 前台選單可見性（管理員）
- 新增資料表 **`spa_nav_visibility`**（`schema.sql`／既有庫執行 `schema_spa_nav_visibility.sql`）。
- 後台 **平台設定 → 前台選單可見性**：矩陣控制訪客／學生／教師／管理員可見的 SPA 上方選單。
- API：`GET /nav-menu`（依目前身分回傳可見項目）；`GET|PUT /admin/nav-menu`（`user.manage`）。

## 2026-06-28

### 暑期功課（中一／中二）
- 新 Git 分支 **`暑期功課`**：S1／S2 暑期習作平台。
- 每份習作含 **閱讀篇章或影片**，加上 **選擇題** 與 **填充題**；預設 **80%** 及格，未及格可重做。
- **及格後仍可重做**；系統保留 **最高分數**（較低的重做不會覆蓋）。
- 工作紙習作於老師評分後亦可重做，同樣只保留最高分。
- 資料表：`summer_homework_*`（見 `schema.sql`／既有庫請執行 `schema_summer_homework.sql`）。
- 前台：`/app/summer-homework`；後台：`admin/summer_homework.php`。

### 資料庫 schema 整併
- 新增根目錄 **`schema.sql`**：完整 MariaDB schema（含 seed 角色／權限／系統帳號）。
- 刪除 **`migrations/`** 逐步遷移檔（001–018）；新環境改為一次匯入 `schema.sql`。
- 更新 README、architecture、rule、change_log 與 `.cursorrules` 說明。

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

## 資料庫 schema | Database

新環境請匯入 **[`schema.sql`](schema.sql)**（會 DROP 既有資料表後重建）。

```bash
mysql -u USER -p DB_NAME < schema.sql
```

舊版 **`migrations/001`–`018`** 已整併入 `schema.sql` 並自儲存庫移除。

---

## 相關文件

- [architecture.md](architecture.md) — 架構與部署
- [schema.sql](schema.sql) — 完整資料庫 schema
- [README.md](README.md) — 快速開始
- [rule.md](rule.md) — 開發規範
- [.cursorrules](.cursorrules) — Cursor AI 專案規則

---

**最後更新**：2026-06-28  
**維護者**：Mr. Bryan Leung
