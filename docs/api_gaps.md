# API 缺口清單（Phase 2+）

目標：後台／貢獻者 UI 最終只經 `/api/v1`。對照來源：admin／portal PHP 頁與 [`api/v1/build_router.php`](../api/v1/build_router.php)。

## 已有 Admin／Teacher API（節錄）

| 資源 | 路由 | 備註 |
|------|------|------|
| simulations | `GET/POST/DELETE /admin/simulations` | API 齊；**PHP 頁仍有直寫**，需改打 API |
| learning-tools / articles / notes / worksheets / videos | `GET/POST/DELETE /admin/...` | 內容頁多已走 AdminApi |
| question-banks | 集合 CRUD + `/{id}` + media | 齊 |
| summer-homework | 集合 CRUD + `/{id}` + marks | 齊 |
| topic-items | `GET/POST/DELETE /admin/topic-items` + list/available | 齊 |
| nav-menu | `GET/POST /admin/nav-menu` | API 齊；**`nav_menu.php` 仍直寫** |
| review | `POST /review/{type}/{id}/publish\|reject` | 齊 |
| classes（半套） | `GET /admin/classes`；teacher create／enroll／invite／reports | **缺 update／delete／學生批次** |
| **subjects / topics** | `GET/POST /admin/subjects`、`PATCH/DELETE /admin/subjects/{id}`、topics CRUD／reorder | **已補（Phase 2）** |

## P0 仍缺（優先序）

### 1. users / roles / impersonate

| 建議路由 | 現況 |
|----------|------|
| `GET/POST /admin/users`、`GET/PUT/DELETE /admin/users/{id}` | `users.php`／`user_edit.php` 表單 |
| `GET/PUT /admin/permissions` | `permissions.php` |
| `POST /admin/users/{id}/impersonate` | 僅有 `POST /auth/stop-impersonation` |

### 2. courses / classes 完整寫入

| 建議路由 | 現況 |
|----------|------|
| `PUT/DELETE /admin/classes/{id}`、bulk-delete | `courses.php`／`course_edit.php` |
| `POST /admin/classes/{id}/students/import-csv` | CSV 匯入 |
| `DELETE …/students/{userId}`、批次 MOI／班別／班號 | `course_students.php` |

## 遷移債（路由已有，改頁面呼叫）

- `simulation_edit.php`／`simulations.php` → `/admin/simulations`（頁面仍直寫；portal 已 302 至 admin）
- `nav_menu.php` → `/admin/nav-menu`
- 其餘 admin PHP 儀表板／CRUD 仍為過渡 UI；SPA 已有 `/admin`、`/admin/subjects`

## P1／運維

| 建議路由 | 頁面 |
|----------|------|
| `POST /admin/db/export`、`POST /admin/db/import` | PHP 頁面已有 Phase 5 擋板（env＋片語＋audit）；REST 上傳仍為缺口 |
| `POST /admin/qsis/import` | `qsis_import.php` |
| `POST /admin/data-dictionary/regenerate` | `data_dictionary.php` |
| summer analytics／CSV | `summer_homework_analytics.php` 等 |

## 契約與實作

- Stub：[`docs/openapi.yaml`](openapi.yaml)
- 路由表：[`api/v1/build_router.php`](../api/v1/build_router.php)
- 下一刀建議：users／permissions API，或 classes 完整寫入（視後台 SPA 優先頁而定）
