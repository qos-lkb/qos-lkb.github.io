# API 缺口清單（Phase 2+）

目標：後台／貢獻者 UI 最終只經 `/api/v1`。對照來源：admin／portal PHP 頁與 [`api/v1/build_router.php`](../api/v1/build_router.php)。

## SPA 後台已覆蓋

- 管理首頁、科目、使用者、角色權限、主選單管理
- 課程流、暑期／工作紙／審核／內容設計列表、試題庫、自學課程編排
- 危險運維：`db-export`／`db-import`／`qsis-import`／`data-dictionary`
- 內容編輯：文章、影片、筆記、模擬、工作紙、暑期功課、試題庫
- 審核佇列：文章／筆記／工作紙／影片／學習工具／試題庫／暑期功課

## 剩餘遷移債／可選擴充

- （無強制項）舊 `learning_tools` 若未遷移：審核佇列僅發佈／退回；已對應 `legacy_learning_tool_map` 者可編輯試題庫

## 契約與實作

- 契約：[`docs/openapi.yaml`](openapi.yaml)
- 路由表：[`api/v1/build_router.php`](../api/v1/build_router.php)
- 狀態：**後台主線已收斂**為 API + SPA；`admin/`／`portal/` 為轉址殼；admin／前台 JS **按路由**懶載入（主包約 59KB）
