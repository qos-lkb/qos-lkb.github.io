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
- **暑期功課**（中一／中二）：閱讀或影片 + 選擇／填充；每次呈交保留完整紀錄與選項快照；截止／遲交；班級報表與**錯題／選項分析**（詳見 [`暑期功課/README.md`](暑期功課/README.md)）
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
├── 暑期功課/                 # 暑期功課模組說明
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
- **暑期功課**：`admin/summer_homework.php`（編輯／分析）；模組說明見 **[`暑期功課/README.md`](暑期功課/README.md)**。

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
- [暑期功課/README.md](暑期功課/README.md) — 暑期功課規則、升級腳本、選項分析資料結構
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
