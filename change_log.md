# 變更紀錄 | Changelog

本文件依 Git 提交紀錄整理 **science_sims** 主要功能與架構變更。完整歷史請執行 `git log`。

**格式**：日期（新→舊）→ 摘要 → 代表性 commit（若有）

---

## 2026-07-25

### SPA：暑期呈交分析
- 新增 `/admin/summer-homework/{id}/analytics`（KPI、錯題分析、學生摘要、作答明細、長答評分）。
- `summer_homework_analytics.php` 302 → SPA（保留 `user_id`／`attempt_id`）。

### SPA：暑期功課矩陣＋工作紙派發
- 新增 `/admin/courses/{id}/summer`（狀態篩選、矩陣、CSV）、`/admin/courses/{id}/worksheets`（派發／評分）。
- `course_summer_homework.php`／`course_worksheets.php` 302 → SPA。

### SPA：課程學生／學習報告
- 新增 `/admin/courses/{id}/students`（加入／批次 MOI／移出）、`/admin/courses/{id}/report`（KPI＋CSV）。
- `course_students.php`／`course_reports.php` 302 → SPA。

### SPA 深層編輯：課程／使用者
- 新增路由 `/admin/courses/{id}`、`/admin/users/{id}`（REST 讀寫、重設邀請碼、學生名單預覽）。
- `course_edit.php`／`user_edit.php` 302 → SPA；`GET /admin/users/{id}` 與 `GET /admin/classes/{id}` 回傳編輯用選項。

### SPA 後台加深＋impersonate 退役
- `/admin/courses`、`/admin/users` 支援經 REST **新增**（課程／使用者）；列表刪除／模仿亦走 API。
- `admin/impersonate.php` 改 410；帳戶選單停止模仿僅打 `POST /auth/stop-impersonation`（移除 form fallback）。

### SPA 後台＋學習報告 API 化
- SPA 新增 `/admin/courses`、`/admin/users`（列表經 REST；編輯深連 PHP）。
- `course_reports.php` 改打 `GET /teacher/classes/{id}/report` 與 CSV 下載。

### REST API：暑期分析與班級暑期 CSV
- 新增 `GET /admin/summer-homework/{id}/analytics`、`…/attempts`；`GET /admin/classes/{id}/summer-homework`、`…/summer-homework.csv`。
- `course_summer_homework.php` 匯出改打 AdminApi；呈交列表補 `teacher_marks`。

### REST API：課程頁遷移＋P1 運維端點
- `courses.php`／`course_edit.php`／`course_students.php` 改打 `/admin/classes*`。
- 新增 `POST /admin/db/export|import`、`POST /admin/qsis/import`、`GET /admin/qsis/status|courses`、`POST /admin/data-dictionary/regenerate`；對應後台頁改打 AdminApi（import 保留 Phase 5 擋板）。
- `AdminApi` 支援 FormData 與 `rawResponse`（SQL 下載）。

### REST API：補齊 P0（users／classes）並對齊契約
- 新增 `/admin/users`、`/admin/users/{id}`、inline、impersonate；`/admin/permissions`。
- 補齊 `/admin/classes` 寫入：update／delete／bulk、invite、students enroll／CSV／batch／remove。
- 後台 `users`／`permissions`／`nav_menu`／`simulations` 改打 `AdminApi`；OpenAPI 對齊 `build_router.php`。
- 更新 `docs/api_gaps.md`（P0 標為已完成）。

### 一次升級 SQL
- 新增 `schema_upgrade_all.sql`：合併 Phase 0–7 全部增量 `schema_*.sql`，可單檔匯入既有庫；並寫入 `schema_migrations`。

## 2026-07-25

### SPA：加快首頁首屏
- 移除 Tailwind Play CDN（改靜態 `tailwind.min.css`），延後 marked／DOMPurify；html2canvas／jsPDF 改按需載入。
- HTML 直接輸出訪客首頁骨架，不再先顯示「載入中…」。
- 開機先註冊路由並畫首頁；`/auth/me` 與選單可見性改背景載入，登入後再升級為學生／教師首頁。

### SPA：修正 Tailwind 版面全壞
- 先前 jsDelivr 靜態 `tailwind.min.css` 路徑 **404**，導致無任何 utility 樣式。
- 改為專案內建置 `app/assets/css/tailwind.generated.css`（PostCSS + Vite 一併打包），不依賴失效 CDN。

## 2026-07-24

### 重構 Phase 7：learning_tools／quiz_* → question_bank
- 凍結 LT 寫入（API 410）；後台 `learning_tools*` 轉址試題庫；選單只推題庫。
- 遷移腳本＋`legacy_learning_tool_map`；課程 `content_type` 支援 `question_bank`。
- 學習端 `/quiz/:slug` 改走題庫（相容舊 LT slug）；catalog 在 LT 空時回傳已發佈題庫。
- 文件：`docs/phase7_question_bank_merge.md`；可選 `schema_drop_quiz_legacy.sql`。

### 重構 Phase 6：模擬 HTML 標準化（首波）
- 新增 `templates/sim_skeleton.html`、`docs/sim_standards.md`、`scripts/check_sim_standards.php`、`assets/sim-common/`。
- 違規檔名改為 `snake_case`（含 `other/`、`science/electrolysis_of_water`、`0211_elevator`、`e0301_air_conditioner`）；截圖路徑對齊並更新 DB。
- `0103_thermal_equilibrium.html` 改用 React **production** CDN；禁止 `*.development.js`。
- `sync_simulations_to_db.php` 支援 `scripts/sim_path_aliases.php`；CI 跑 standards check。
- 更新 `rule.md` 檔名／CDN 規則。

### 重構 Phase 5：安全與 Workflow 硬化
- 登入／註冊限流對齊 API 與 `login.php`／`register.php`（5／15 分鐘）。
- 模擬 HTML CSP 收緊（`includes/simulation_security.php`）；SPA iframe sandbox 移除 `allow-same-origin`。
- `admin/db_import.php`：非 local／staging 預設拒絕；需輸入片語 `DELETE ALL TABLES`；寫入 `admin_audit_log`。
- 移除殭屍 `POST /auth/change-password`；新增 `POST /auth/dev-login`（僅 `APP_ENV=local`）。
- 模仿模式 1 小時 TTL＋審計；模擬狀態 UI 標明「免審」（draft／published）。
- 遷移：`schema_admin_audit_log.sql`；安全清單更新 `architecture.md`。

### 重構 Phase 4：Portal 併入 Admin、科目頁轉 SPA
- `portal/*.php` 全部改為 302 → 對應 `admin/*.php`（保留 query）；見 `portal/README.md`。
- `admin/subjects.php` → SPA `/app/admin/subjects`；後台選單／帳戶選單改連 SPA／admin（不再指向 portal）。
- 新增 `includes/spa_redirect.php`（`spa_app_path`／`portal_redirect_to_admin`）。

### 重構 Phase 3：Vite SPA 建置 + 宣告式路由 + 後台／登入入口
- `app/` 引入 Vite：`src/main.js` 打包模組；`npm run build` → `app/dist/`；`index.php` 優先服務 dist（並改寫 asset 路徑）。
- 廢除 `document.write` 腳本串；來源為 `index.html` + ESM；未建置時退回 `index.legacy.html`。
- `AppRouter` 改宣告式 `PATH_MATCHERS`；新增 SPA 路由 `/login`、`/admin`、`/admin/subjects`（打 `/admin/subjects` API）。
- CI 增加 `spa-build` job。

### 重構 Phase 2：表驅動 Router + 科目／單元 Admin API
- `api/v1/build_router.php`：以 `ScienceSims\Http\Router` 註冊全部路由；`router.php` 僅負責 bootstrap／dispatch。
- Catalog／subjects 處理器移至 `api/v1/handlers/catalog.php`。
- 新增 `includes/subjects_lib.php` 與 Admin API：`/admin/subjects`、`/admin/topics/{id}`、reorder；`admin/subjects.php` 改呼叫同一 lib。
- 缺口清單：`docs/api_gaps.md`；擴充 `docs/openapi.yaml`。

### 重構 Phase 1：Legacy 入口與目錄規則清理
- `simulation_view.php`、`index_csv_editor.php` 改為 **302 轉址**（分別至 API HTML／`admin/simulations.php`）。
- 刪除已無引用的 `assets/js/admin-worksheet-embed.js`（改用 `admin-content-embed.js`）。
- 根目錄參考檔（書摘、PDF、`index.csv.bak`、`pdf_viewer.html` 等）移至 **`docs/reference/`**。
- 更新 `.cursorrules`、`.cursor/rules/*`：MariaDB + `/api/v1` + 磁碟 HTML SoT；移除以 CSV 為準的指引。

### 重構 Phase 0／1 起步：Composer、測試、schema 遷移、全 API 方向
- 新增 `composer.json`（PHPUnit、PSR-4 `ScienceSims\` → `src/`）、`phpunit.xml`、`.github/workflows/ci.yml`。
- 抽出 `includes/summer_homework_grading.php`（純計分函式）並加單元測試；新增 `ScienceSims\Http\ApiPath`／`Router`、`ScienceSims\Schema\MigrationRunner`。
- `scripts/apply_schema.php` + `schema_migrations` 表（`schema_migrations.sql`／`schema.sql`）；`scripts/sync_simulations_to_db.php`（磁碟 HTML → DB）。
- Catalog／模擬 metadata 的 `html_url`／`view_url` 改指向 `/api/v1/simulations/{slug}/html`（不再用 `simulation_view.php`）。
- 初版契約：`docs/openapi.yaml`。

### 暑期功課：儲存時重算既有呈交分數
- 更新習作（含答案／及格線）後，依最新題目對所有 `summer_homework_attempts` 重新計分並更新 `score`／`percent`／`passed`／`grading_json`。
- 保留原作答 `responses_json`、`submitted_at` 與長答 `teacher_marks_json`；首次及格狀態隨重算後的 `passed` 自動調整。
- 若舊呈交的 `question_id` 已因昔日全刪再建而對不上，會依題目順序對齊作答後再計分。
- 後台儲存成功時顯示重算筆數。

### 暑期功課：題型擴充與基礎強化
- **題目 upsert**：重存習作保留既有 `question_id`（歷史 `responses_json`／分析可對上同一題）。
- **儲存驗證**：無題目、stem 皆空、MC 無正解／選項空、填充無答案等拒絕儲存。
- **計分拆分**：`sh_grade_mcq`／`fill_blank`／`true_false`／`short_answer`／`long_answer`；`details[]` 含 `question_id`、`type`、`correct`、`score`、`max`。
- **新題型**：是非、短答（多可接受答案）、長答（教師評閱；**不擋自動及格**）。MC 選項 2–6；填充每空可多答案。
- Schema：`schema_summer_homework_qtypes.sql`（ENUM、`correct_bool`／`max_score`／`rubric_*`、`summer_homework_short_answers`、`teacher_marks_json`）。
- 學生 SPA：提交後逐題對錯／解釋；列表顯示實際 `pass_percent`。
- 後台：班級報表狀態篩選＋CSV 匯出；分析頁新題型統計／長答評分；內容檢視支援新題型。
- API：`POST /admin/summer-homework/attempts/{id}/marks`；提交需 `summer_homework.submit_own`（或管理權限）。
- 已重產 **`data_dictionary.md`**（含新表／欄位說明）。

### 暑期功課：狀態改為未交／準時／欠交；呈交時間＝首次及格
- **未交**：尚未及格（含未呈交或未達及格線）。
- **準時**：首次及格 ≤ 截止日期；**欠交**：首次及格在截止日期之後。
- 報表／分析的呈交紀錄時間改為 **首次及格** 時間；最高分仍另行顯示。

### 暑期功課：未及格不標「準時」
- （已由「未交／準時／欠交」定義取代。）

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
