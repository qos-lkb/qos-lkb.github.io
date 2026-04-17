# 科學模擬實驗平台 | Science Simulations Platform

專為香港中學文憑試（HKDSE）及中學科學課程設計的互動模擬資源：**物理、化學、生物、綜合科學、天文**等獨立 HTML 實驗頁，並可搭配 **PHP + 資料庫** 動態首頁與管理後台。

An interactive science simulation resource for HKDSE and secondary science: standalone HTML labs across Physics, Chemistry, Biology, Integrated Science, and Astronomy, with an optional **PHP + MariaDB** stack for the main index and administration.

## 專案簡介 | Project overview

| 模式 | 說明 |
|------|------|
| **動態首頁（推薦本機／伺服器）** | `index.php` 從資料庫讀取已發佈模擬，產生側欄導覽、搜尋、模態視窗嵌入模擬、截圖下載等。需設定 `.env` 與 MariaDB。 |
| **靜態單頁** | 各子目錄內 `.html` 可直接以瀏覽器或靜態主機開啟；適合 GitHub Pages **單檔分享**（整站動態功能需 PHP）。 |
| **選用轉址** | 根目錄 `index.html` 可於載入時同步請求 `default_redirect_url.php`；若 `.env` 設有 `DEFAULT_REDIRECT_URL`，則**立即**轉往該 URL（僅在有 PHP 的環境有效）。 |

**儲存庫**：本樹常作 **`science_sims`** 使用；另可與 **`qos-lkb.github.io`**（GitHub Pages）等鏡像併行維護，依部署需求推送。

## 功能特色 | Features

- 雙語介面（繁中／英）與響應式排版（Tailwind 等）
- 動態首頁：依**科目／單元**瀏覽、搜尋與篩選（`index.php`）
- 模擬以**彈出模態＋ iframe** 開啟；支援截圖（html2canvas）與原始碼下載連結（視資料欄位）
- **管理後台**（`admin/`）：使用者與角色、科目／單元、模擬維護、資料庫匯出（權限控管）
- 模擬本體多為 **Vanilla JS**；少數使用 Three.js、Chart.js、MathJax、React standalone 等 CDN

## 技術棧 | Technology stack

- **HTML5 / CSS3 / JavaScript**；**Tailwind CSS**（CDN）
- **PHP 8+**、`PDO`、**MariaDB / MySQL**
- 常見 CDN：**Three.js**、**Chart.js**、**MathJax**、**html2canvas**；部分頁使用 **React 18 + Babel standalone**

詳見 [architecture.md](architecture.md)（或 [ARCHITECTURE.md](ARCHITECTURE.md) 導覽）。

## 目錄結構（精簡）| Project structure (abridged)

```
science_sims/
├── index.php                 # 動態主頁（資料庫）
├── index.html                # 選用：依 .env 轉址
├── default_redirect_url.php  # 回傳 DEFAULT_REDIRECT_URL（JSON）
├── login.php, logout.php
├── includes/                 # 設定、DB、auth、模擬邏輯
├── admin/                    # 後台
├── portal/                   # 使用者入口相關頁面
├── physics/, chem/ or chemistry/, biology/, science/, astronomy/, …
├── dev/plan.md               # 選讀：教學／模擬構想清單
├── architecture.md, ARCHITECTURE.md, rule.md, README.md
└── .env, .env.example
```

> **注意**：模擬清單已改由 **資料庫與後台** 維護；舊版 **`index.csv`** 流程已停用（見 `index_csv_editor.php` 註解）。

## 快速開始 | Quick start

### 1. PHP + 資料庫（完整功能）

1. 安裝 **PHP 8+**、**MariaDB**，建立資料庫並執行專案內 migrations（若有的話）。
2. 複製 **`.env.example`** 為 **`.env`**，填入 `DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASS` 等。
3. 將網站根目錄指到本專案，於瀏覽器開啟 **`/index.php`**。
4. 選填：在 `.env` 設定 **`DEFAULT_REDIRECT_URL`**，則訪問 **`/index.html`** 時會先向 `default_redirect_url.php` 取網址並轉址。

### 2. 僅預覽單一模擬（無 PHP）

在子目錄中直接開啟對應 **`.html`**，或使用本機靜態伺服器：

```bash
python3 -m http.server 8000
# 瀏覽 http://localhost:8000/physics/02/0202_freefall.html 等
```

### 3. GitHub Pages

靜態 HTML 可部署；**`index.php` 與後台不會在 Pages 上執行**。若需公開入口頁，請使用靜態策略或另設 PHP 主機。

## 新增模擬 | Adding a simulation

1. 在適當學科目錄建立 **`.html`**，於 `<head>` 引入所需 CDN（與同目錄風格一致）。
2. 依 **`rule.md`** 命名與結構（標題、無障礙、語言標記等）。
3. 透過 **`admin/`**（或既有資料庫流程）登記模擬 URL、科目／單元、中英標題等，並設為發佈。
4. 多瀏覽器測試後提交變更。

## 瀏覽器相容性 | Browser compatibility

建議使用最新版 **Chrome、Firefox、Safari、Edge**；Three.js 需 **WebGL**；部分腳本使用 **ES6+**。

## 授權 | License

[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

## 維護者 | Maintainer

**Mr. Bryan Leung** — Copyright © Mr. Bryan Leung

## 相關文件 | Related documentation

- [architecture.md](architecture.md) — 架構、部署、資料流（主文件）
- [ARCHITECTURE.md](ARCHITECTURE.md) — 同上之導覽入口
- [rule.md](rule.md) — 開發規範
- [prompt.md](prompt.md) — 建立新模擬之提示範本
- [dev/plan.md](dev/plan.md) — 各科模擬／網頁輔助教學構想（參考用）

## 連結 | Links

- 範例儲存庫：**`https://github.com/qos-lkb/science_sims`**（名稱以實際遠端為準）
- GitHub Pages 使用者站：**`https://qos-lkb.github.io`**（若與本專案分開部署）
- 其他：**`link.txt`**

---

**最後更新 | Last updated**：2026-04-18

如有問題或建議，歡迎開 Issue 或 Pull Request。  
Questions or suggestions: Issues / PRs welcome.
