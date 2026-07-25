# API 缺口清單（Phase 2+）

目標：後台／貢獻者 UI 最終只經 `/api/v1`。對照來源：admin／portal PHP 頁與 [`api/v1/build_router.php`](../api/v1/build_router.php)。

## 已有 Admin／Teacher API（節錄）

| 資源 | 路由 | 備註 |
|------|------|------|
| simulations | `GET/POST/DELETE /admin/simulations` | PHP 頁已改打 AdminApi |
| learning-tools / articles / notes / worksheets / videos | `GET/POST/DELETE /admin/...` | LT 寫入 410 |
| question-banks | 集合 CRUD + `/{id}` + media | 齊 |
| summer-homework | 集合 CRUD + `/{id}` + marks | 齊 |
| topic-items | `GET/POST/DELETE /admin/topic-items` + list/available | 齊 |
| nav-menu | `GET/POST /admin/nav-menu` | PHP 頁已改打 AdminApi |
| review | `POST /review/{type}/{id}/publish\|reject` | 不含題庫／模擬／暑期 |
| users / permissions / impersonate | `/admin/users*`、`/admin/permissions` | 齊 |
| classes | `/admin/classes*`（含 students／CSV／invite） | 齊；**`courses*.php` 已改打 API** |
| subjects / topics | `/admin/subjects*`、`/admin/topics/{id}` | 齊 |
| **db export／import** | `POST /admin/db/export`、`POST /admin/db/import` | 齊（Phase 5 擋板） |
| **QSIS import** | `GET /admin/qsis/status|courses`、`POST /admin/qsis/import` | 齊 |
| **data dictionary** | `POST /admin/data-dictionary/regenerate` | 齊 |
| **summer analytics／班級報表** | `GET /admin/summer-homework/{id}/analytics`、`…/attempts`；`GET /admin/classes/{id}/summer-homework`、`…/summer-homework.csv` | **已補**；班級頁 CSV 改打 API |

## P0／P1 — 已完成

平台核心 CRUD、課程班級、使用者／權限、運維匯入匯出、暑期分析／班級暑期 CSV 均已有 REST；對應 admin PHP 頁多已改打 `AdminApi`（分析頁仍以 PHP 渲染讀取，資料來源與 API 相同 lib）。

## 剩餘遷移債／可選擴充

- SPA 課程流＋暑期分析已齊：`/admin/courses…`、`/admin/summer-homework/{id}/analytics`
- 內容設計仍 PHP：`summer_homework.php`／`_view`／`_edit`、`worksheets.php`／`worksheet_edit.php`
- Review 擴充至 question_banks／summer_homework（若要統一審核流）

## 契約與實作

- 契約：[`docs/openapi.yaml`](openapi.yaml)
- 路由表：[`api/v1/build_router.php`](../api/v1/build_router.php)
- 下一刀建議：SPA 暑期／工作紙設計列表，或 Review 統一審核流
