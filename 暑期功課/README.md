# 暑期功課 | Summer Homework

專為 **中一（S1）**、**中二（S2）** 同學而設的暑期習作模組。

## 規則

- 每份習作包含：**閱讀篇章** 或 **影片**，以及跟進 **選擇題（MC）** 與／或 **填充題**。
- 計分：每題 MC 1 分；每個填充空格 1 分。
- **達及格線（預設 80%）→ 及格**；否則 **不及格並須重做**。
- **及格後仍可重做**；若本次分數更高則更新最高分，較低則保留原最高分。
- 列表顯示的百分比為該生的 **最高分數**。

## 使用方式

### 既有資料庫（升級）

```bash
mysql -u USER -p DB_NAME < schema_summer_homework.sql
```

### 全新安裝

匯入完整 `schema.sql`（已含暑期功課表與權限）。

### 學生

開啟 `/app/summer-homework`（或頂部導覽「暑期功課」），登入後作答。

### 教師／管理員

後台 → **內容管理 → 暑期功課** → 新增習作，設為「已發佈」。

## 程式位置

| 路徑 | 說明 |
|------|------|
| `includes/summer_homework_lib.php` | 業務邏輯與計分 |
| `api/v1/handlers/summer_homework.php` | REST API |
| `admin/summer_homework.php` | 列表 |
| `admin/summer_homework_edit.php` | 編輯 |
| `app/assets/js/summer-homework.js` | 前台 UI |
