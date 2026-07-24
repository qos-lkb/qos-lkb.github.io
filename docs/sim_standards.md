# 模擬 HTML 標準（Phase 6）

新模擬與大幅改版時須通過下列清單。骨架模板：[`templates/sim_skeleton.html`](../templates/sim_skeleton.html)。詳細規則見 [`rule.md`](../rule.md)。

## 新模擬檢查清單

- [ ] 檔名：小寫 `snake_case`（物理主線 `0X0Y_description.html`；選修 `e0X/e0X0Y_….html`）
- [ ] 無空白、無 CamelCase、盡量不用連字號（`_` 優先）
- [ ] `<!DOCTYPE html>`、`lang`（`zh-Hant` 或 `en`）、`charset`、`viewport`、有意義的 `<title>`
- [ ] Tailwind CDN；其餘 CDN 版本與鄰近模擬一致
- [ ] 若使用 React：僅 **`react.production.min.js` / `react-dom.production.min.js`**（禁止 `*.development.js`）
- [ ] **不**依賴 `app/` Vite／bundler；雙擊或靜態伺服器即可運作
- [ ] 鍵盤可操作主要控制；適當 `aria-*`／`alt`
- [ ] 截圖放科目慣用目錄（如 `physics/screenshots/`、`science/screenshots/`），檔名與模擬 basename 對齊（無空白）
- [ ] 同步進 DB：`php scripts/sync_simulations_to_db.php`（必要時 `--create-missing`）
- [ ] 通過：`php scripts/check_sim_standards.php`

## 共用資產

可選：[`assets/sim-common/`](../assets/sim-common/)（CSS／小工具）。模擬**禁止** import SPA 打包結果。

## 檔名重新對照（2026-07 Phase 6）

| 舊路徑 | 新路徑 | 備註 |
|--------|--------|------|
| `physics/02/elevator.html` | `physics/02/0211_elevator.html` | slug 仍為 `physics-02-elevator` |
| `physics/e03/e0301_air-conditioner.html` | `physics/e03/e0301_air_conditioner.html` | slug 不變 |
| `science/electrolysis of water.html` | `science/electrolysis_of_water.html` | 截圖檔一併改名 |
| `other/Wave interference.html` | `other/wave_interference.html` | |
| `other/vertical motion with parachute.html` | `other/vertical_motion_with_parachute.html` | |
| `other/Friction in riding bicycle V9 - 20251209.html` | `other/friction_in_riding_bicycle.html` | |
| `other/Sound interference - 20251120.html` | `other/sound_interference.html` | |
| `other/Stellar life.html` | `other/stellar_life.html` | |
| `other/inclined plane simulation.html` | `other/inclined_plane_simulation.html` | |
| `other/Kinetic theory.html` | `other/kinetic_theory.html` | |
| `other/Coefficient of Static Friction.html` | `other/coefficient_of_static_friction.html` | |
| `other/3Dmagneticfield.html` | `other/magnetic_field_3d.html` | |
| `other/Electrostatic Induction Sims v3 - Good (with minor bugs).html` | `other/electrostatic_induction.html` | |
| `geography/BL_Succession.html` | `geography/bl_succession.html` | |
| `music/drum-set.html` | `music/drum_set.html` | |
| `s4_physics/4A02 - Aero.html` 等 | `s4_physics/4a02_aero.html` 等 | 見目錄內全部 `4a##_*.html` |

別名對照供 sync 使用：[`scripts/sim_path_aliases.php`](../scripts/sim_path_aliases.php)。

## 豁免

目前無長期豁免。若舊檔暫不改名，須在本節列出路徑與原因，並在 `check_sim_standards.php` 的 `$EXEMPTIONS` 登記。
