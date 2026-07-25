# Architecture Documentation

## Project overview

Educational site hosting **interactive science simulations** (HKDSE / secondary level): physics, chemistry, biology, integrated science, astronomy, and related folders. Each simulation is typically a **standalone HTML** file using CDN libraries (Tailwind, Chart.js, Three.js, MathJax, etc.).

The same codebase may be deployed as:

| Mode | Entry | Purpose |
|------|--------|---------|
| **SPA frontend (recommended)** | `app/` | Catalogue, self-study courses, notes, worksheets, quizzes, articles, SDL dashboard, assignments, **summer homework** |
| **Legacy redirect** | `index.php` | 302 → `app/` |
| **REST API** | `api/v1/` | JSON endpoints for catalogue, auth, CRUD, review, classes, worksheet assignments, summer homework |
| **Optional redirect** | `index.html` | If `.env` sets validated `DEFAULT_REDIRECT_URL`, sync XHR then `location.replace` |
| **Static hosting** | Individual HTML under `physics/`, `chem/`, … | GitHub Pages–style; **no DB** |
| **Code Space** | `codespace/index.html` | Standalone HTML/CSS/JS live editor (linked from admin) |

**Related repositories (typical setup)**

- **`science_sims`** — canonical app + DB + admin (this tree).
- **`qos-lkb.github.io`** — GitHub Pages mirror / user site; may track the same or a subset of static assets.

---

## Technology stack

### Core

- **HTML5**, **CSS3**, **Vanilla JS**; **Tailwind CSS** via CDN on many pages.
- **PHP 8+** (`declare(strict_types=1);`) for admin, auth, API, DB access.
- **MariaDB / MySQL** for catalogue, learning content, users, roles, classes, assignments (see **`schema.sql`**).
- **Timezone**: `Asia/Hong_Kong` across PHP, MySQL session, and frontend display.

### CDN libraries (representative)

| Library | Typical use |
|---------|----------------|
| Tailwind CSS | Layout, admin UI, SPA shell |
| Chart.js | Graphs in simulations |
| MathJax 3 | Equations (simulations; SPA notes / worksheets / summer homework) |
| Three.js (+ OrbitControls) | 3D sims |
| html2canvas | Simulation modal PNG capture |
| DOMPurify | Sanitized Markdown in SPA |
| jsPDF | Learning note PDF export |
| React 18 + Babel standalone | Selected sims only |

### PHP includes (`includes/`)

| File | Role |
|------|------|
| `config.php` | Loads `.env`, merges `config.local.php`, DB DSN |
| `db.php` | PDO connection |
| `auth.php`, `bootstrap.php` | Sessions, CSRF, impersonation, `bootstrap_public()` |
| `simulations_lib.php`, `simulation_save.php` | Simulation CRUD |
| `learning_tools_lib.php`, `lt_qb_migrate_lib.php`, `articles_lib.php` | Legacy MCQ tools (frozen) + migrate helpers; science articles |
| `learning_notes_lib.php`, `worksheets_lib.php` | Notes and worksheets |
| `worksheet_blocks_lib.php` | Parse worksheet Markdown embed blocks |
| `worksheet_assignments_lib.php`, `worksheet_permissions_lib.php` | Assignments, submissions, grading |
| `learning_videos_lib.php`, `topic_items_lib.php` | Course videos and curriculum items |
| `question_bank_lib.php` | Question banks (multi-type) |
| `classes_lib.php`, `qsis_import_lib.php` | Class/course management, QSIS import |
| `qsis_auth_lib.php` | Login id = QSIS username (no `@qos.edu.hk`); verify QSIS `password_hash` only |
| `summer_homework_lib.php` | S1/S2 summer homework: grading, due dates, class report, attempt analytics |
| `adaptive_lib.php`, `learning_analytics_lib.php`, `learning_assessment_lib.php` | SDL, mastery, attempts |
| `user_names_lib.php`, `account_lib.php` | Bilingual names, profile helpers |
| `api_response.php`, `api_auth.php`, `api_rate_limit.php` | REST JSON helpers |
| `user_admin.php` | Roles (`admin`, `teacher`, `student`), permissions matrix |
| `data_dictionary_lib.php` | Table/column descriptions for `data_dictionary.md` |

---

## Database schema

Single canonical file: **[`schema.sql`](schema.sql)** — full MariaDB schema for fresh installs.

```bash
mysql -u USER -p DB_NAME < schema.sql
```

- **No FOREIGN KEY** constraints; relations enforced in PHP libs.
- **Timezone**: set `APP_TIMEZONE=Asia/Hong_Kong` in `.env`; schema sets session `+08:00`.
- **Seed data**: roles (`admin`, `teacher`, `student`), all permissions, default role grants, system user (`system@science-sims.internal`).
- **Admin account**: create via SPA `/app/admin/users` after import (no bundled default password).
- **Existing databases**: re-importing `schema.sql` **drops all tables** — back up first via SPA `/app/admin/db-export`.
- **Incremental upgrades**: prefer **`php scripts/apply_schema.php`** or import **`schema_upgrade_all.sql`** (records `schema_migrations`). Check with `php scripts/apply_schema.php --status`.

| File | Purpose |
|------|---------|
| `schema.sql` | Full schema for new databases |
| `schema_upgrade_all.sql` | Single idempotent upgrade for existing DBs |
| `schema_drop_quiz_legacy.sql` | Optional DROP of legacy quiz / learning_tools tables |

### Full API direction

Learner SPA and admin UI are converging on **`/api/v1` only** (session + CSRF). Contract: [`docs/openapi.yaml`](docs/openapi.yaml). Gap list: [`docs/api_gaps.md`](docs/api_gaps.md)（核心／運維／暑期報表已補）. Routes registered in [`api/v1/build_router.php`](api/v1/build_router.php). Simulation HTML on disk can be synced with `php scripts/sync_simulations_to_db.php` (path→slug aliases in `scripts/sim_path_aliases.php`). New sims: [`templates/sim_skeleton.html`](templates/sim_skeleton.html) + checklist [`docs/sim_standards.md`](docs/sim_standards.md); lint with `php scripts/check_sim_standards.php`.

### Tables (summary)

| Group | Tables |
|-------|--------|
| Auth | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `api_rate_limits` |
| Catalogue | `subjects`, `topics`, `simulations`, `tags`, `simulation_tags` |
| Content | `question_banks`, `qb_*`, `science_articles`, `article_*`, `learning_notes`, `worksheets`, `learning_videos`, `topic_learning_items`（`learning_tools`／`quiz_*` 已凍結，見 Phase 7） |
| Question banks | `question_banks`, `qb_questions`, `qb_mcq_options`, `qb_question_parts`, `qb_fill_blanks`, `qb_question_media` |
| Classes & SDL | `classes` (incl. `form_level`, `course_subject`), `class_enrollments` (MOI), `student_profiles`, `learning_events`, `learning_attempts`, `learning_responses`, `topic_mastery`, `learning_goals`, `content_bookmarks` |
| Assignments | `worksheet_assignments`, `worksheet_assignment_students`, `worksheet_submissions` |
| Summer homework | `summer_homework_items` (+ `content_refs_json`), `summer_homework_media`, `summer_homework_questions` (+ `multi_select` / `match_mode`), options / blanks / attempts |
| SPA settings | `spa_nav_visibility` |

---

## REST API (`api/v1/`)

Front controller: [`api/index.php`](api/index.php). Session cookie auth (`SCI_SIM_SESSID`); mutating requests require `X-CSRF-Token`.

Handlers live under [`api/v1/handlers/`](api/v1/handlers/); routing in [`api/v1/router.php`](api/v1/router.php).

### Public / catalogue

| Method | Path | Description |
|--------|------|-------------|
| GET | `/catalog` | Simulations tree + published learning content |
| GET | `/courses`, `/courses/{subject}` | Self-study course structure |
| GET | `/simulations/{slug}`, `/simulations/{slug}/html` | Simulation metadata / iframe HTML |
| GET | `/learning-tools/{slug}`, `/question-banks/{slug}`, `/articles/{slug}` | Quiz（相容 LT）／試題庫／文章 |
| GET | `/learning-notes/{slug}`, `/worksheets/{slug}` | Notes / worksheets |
| GET | `/learning-videos/{slug}` | Embedded video metadata |
| GET | `/question-banks/{slug}` | Question bank (student view) |
| GET | `/subjects` | Subject list |

Answer keys for quizzes: `GET …/{slug}/answers` on learning-tools, articles, question-banks (authenticated / role-gated as implemented).

### Auth & account

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Current user (includes impersonation state) |
| POST | `/auth/login`, `/auth/logout` | Session login / logout |
| POST | `/auth/register` | Student self-registration (invite code) |
| POST | `/auth/student-profile` | Update student profile |
| POST | `/auth/profile` | Account settings |
| POST | `/auth/dev-login` | Local-only passwordless login (`APP_ENV=local`) |
| POST | `/auth/stop-impersonation` | End admin impersonation session |

### Student SDL (`/learning/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/learning/dashboard` | Student SDL dashboard data |
| POST | `/learning/events` | Batch learning events |
| GET | `/learning/events/summary` | Learning time summary |
| POST/GET | `/learning/attempts` | Submit or list quiz attempts |
| GET | `/learning/mastery` | Topic mastery scores |
| GET | `/learning/progress` | Content completion by topic |
| POST | `/learning/goals` | Save weekly learning goal |
| GET | `/learning/recommendations` | Adaptive recommendations |
| GET | `/learning/adaptive-quiz` | Adaptive quiz for topic |

### Student worksheet assignments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/worksheet-assignments` | List assigned worksheets |
| GET | `/student/worksheet-assignments/{id}` | Assignment detail + worksheet |
| POST | `/student/worksheet-assignments/{id}/submit` | Submit responses |

### Teacher classes & assignments

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/teacher/classes` | Teacher class list / create |
| POST | `/teacher/classes/{id}/enroll` | Enroll students by email |
| POST | `/teacher/classes/{id}/invite` | Reset class invite code |
| GET | `/teacher/classes/{id}/report` | Class learning report |
| GET | `/teacher/classes/{id}/report.csv` | Export class report CSV |
| GET | `/teacher/classes/{id}/students/{user_id}` | Student detail in class |
| GET/POST | `/teacher/classes/{id}/worksheet-assignments` | List / create class assignments |
| GET/POST | `/teacher/worksheet-assignments/{id}` | Assignment detail / update |
| POST | `/teacher/worksheet-submissions/{id}/grade` | Grade submission + feedback |
| GET | `/teacher/worksheets` | Worksheets available to teacher |

### Summer homework (S1 / S2)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/summer-homework` | Published items (students filtered by form level) |
| GET | `/summer-homework/{slug}` | Item + questions (no answer keys) + user progress |
| POST | `/summer-homework/{slug}/submit` | Grade & always INSERT a new attempt |
| GET/POST/DELETE | `/admin/summer-homework` | Admin list / create / delete |
| GET | `/admin/summer-homework/{id}` | Admin item detail with answers |
| POST/DELETE | `/admin/summer-homework/{id}/media` | Upload / delete item images |
| POST | `/admin/summer-homework/{id}/import-questions` | Copy questions from a question bank |

Handler: `api/v1/handlers/summer_homework.php`. Business logic: `includes/summer_homework_lib.php`.

### Admin / contributor (RBAC)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/DELETE | `/admin/simulations` | Simulation CRUD |
| GET/POST/DELETE | `/admin/question-banks` | Question bank CRUD（canonical） |
| GET/POST/DELETE | `/admin/learning-tools` | **Frozen** — writes return 410（Phase 7） |
| GET/POST/DELETE | `/admin/articles` | Article CRUD |
| GET/POST/DELETE | `/admin/learning-notes` | Learning note CRUD |
| GET/POST/DELETE | `/admin/worksheets` | Worksheet CRUD |
| GET/POST/DELETE | `/admin/learning-videos` | Learning video CRUD |
| GET/POST/DELETE | `/admin/question-banks` | Question bank CRUD |
| GET/POST/DELETE | `/admin/topic-items` | Course curriculum item ordering |
| GET/POST/DELETE | `/admin/classes` | Class CRUD (admin) |
| GET/PUT | `/admin/nav-menu` | SPA top-nav visibility (`user.manage`) |
| GET | `/nav-menu` | Visible nav items for current audience |
| GET | `/review-queue` | Pending review items |
| POST | `/review/{type}/{id}/publish\|reject` | Approve or reject content |

Pending lists for contributors: `GET /{type}/pending` on learning-tools, articles, learning-notes, worksheets, learning-videos.

---

## Frontend SPA (`app/`)

Vanilla JS modules (no bundler):

| Module | Role |
|--------|------|
| `api.js`, `auth.js` | REST client, session, account menu |
| `router.js`, `app.js` | Client routes, nav tabs, shell |
| `catalog.js`, `simulation.js` | Simulation catalogue and preview/modal |
| `course.js`, `video.js` | Self-study courses and embedded videos |
| `note.js`, `note-pdf.js` | Learning notes + PDF export |
| `worksheet.js`, `assignments.js` | Worksheets; class assignment list & submit flow |
| `summer-homework.js` | Summer homework list / item / submit (home hub by role) |
| `dashboard.js`, `learning-tracker.js` | SDL dashboard; page-view / time tracking |
| `quiz.js`, `article.js` | Interactive tools and science articles |
| `markdown.js`, `content-embeds.js`, `inline-edit.js` | Markdown render (+ MathJax), embeds, inline editing |
| `sidebar.js`, `modal-capture.js` | Layout, fullscreen, PNG capture |

### Main routes

| Section | Paths |
|---------|-------|
| 暑期功課（首頁分流） | `/`（學生：習作列表；教師／管理員：任教課程入口）、`/summer-homework`, `/summer-homework/{slug}` |
| 自學課程 | `/courses`, `/course/{subject}/{topic}` |
| 課程及學習筆記 | `/learning-notes`, `/note/{slug}` |
| 工作紙 | `/worksheets`, `/worksheet/{slug}` |
| 模擬程式 | `/simulations`, `/simulation/{slug}` (preview before modal) |
| 科學文章 | `/articles`, `/article/{slug}` |
| 試題庫測驗 | `/learning-tools`, `/quiz/{slug}`（資料來自 question banks） |
| SDL 儀表板 | `/dashboard` |
| 工作紙作業 | `/assignments`, `/worksheet/{slug}?assignment={id}` |

Simulations open in a **sandboxed iframe** via `/api/v1/simulations/{slug}/html`. Markdown content is rendered client-side with **DOMPurify**; notes / worksheets / summer homework support **MathJax** (`$…$` / `$$…$$`).

---

## Data & admin (current model)

- **Catalogue data** comes from **MariaDB** (`/api/v1/catalog`). Disk HTML is source of truth; sync with `scripts/sync_simulations_to_db.php`. `index.csv` is retired (`docs/reference/index.csv.bak`).
- **Content types** (each with `draft` → `pending_review` → `published` workflow):

| Tables | Purpose |
|--------|---------|
| `simulations`, `subjects`, `topics` | Simulation catalogue |
| `question_banks`, `qb_*` | Canonical multi-type question banks |
| `learning_tools`, `quiz_*` | **Legacy** four-option MCQ（frozen; migrate then DROP） |
| `science_articles`, `article_*` | Markdown articles + comprehension |
| `learning_notes` | Bilingual notes (Markdown) |
| `worksheets` | Worksheet content (Markdown + embed blocks) |
| `learning_videos` | Bilingual embed URLs (YouTube, Vimeo, …) |
| `topic_learning_items` | Mixed ordering per topic (self-study curriculum) |
| `question_banks`, `qb_*` | Multi-type question banks |
| `classes`, `class_enrollments` | Teacher courses; form level, subject, form class, class no, MOI |
| `worksheet_assignments`, `worksheet_assignment_students`, `worksheet_submissions` | Class worksheet workflow |
| `summer_homework_*` | S1/S2 summer assessments (see pattern below) |
| `spa_nav_visibility` | Per-audience SPA top-nav visibility |

### Roles & permissions

- **Roles**: `admin`, `teacher`, `student`.
- **Content**: `*.manage_own` (contributors) and `*.manage_any` (admins).
- **Worksheets**: `worksheet.assign_own`, `worksheet.grade_own`, `worksheet.submit_own` (seeded in **`schema.sql`**).
- **Classes**: `class.manage_own`, `class.manage_any` — **only admin** may edit class roster / MOI (`classes_can_edit_students()`).
- **Summer homework**: `summer_homework.manage_own`, `summer_homework.manage_any`, `summer_homework.submit_own`. Teachers/admins with review access (`sh_can_review`) may view all items' answers and analytics; editing remains owner/`manage_any` only.

### Admin pages (representative)

後台 UI 以 SPA **`/app/admin/…`** 為準（經 `/api/v1`）。`admin/*.php`／`portal/*.php` 僅 **302 轉址**（相容舊書籤）。

| Area | SPA routes |
|------|------------|
| Home | `/admin` |
| Users & roles | `/admin/users`、`/admin/permissions`（模仿走 REST） |
| Catalogue | `/admin/subjects`、`/admin/simulations` |
| Learning content | `/admin/learning-notes`、`/admin/worksheets`、`/admin/articles`、`/admin/question-banks`、`/admin/learning-videos` |
| Summer homework | `/admin/summer-homework`（含 edit／view／analytics） |
| Curriculum | `/admin/course-curriculum` |
| Classes / courses | `/admin/courses`（含 students／report／worksheets／summer） |
| Platform / ops | `/admin/nav-menu`、`/admin/review-queue`、`/admin/db-export`、`/admin/db-import`、`/admin/qsis-import`、`/admin/data-dictionary` |

- **`portal/`** — Deprecated；302 直連 SPA。
- **`assets/js/`** — 仍含 `admin-api.js`、`user-menu.js` 等（PHP 殼或共用）；SPA 主要用 `ScienceApi`。
- **`assets/css/user-menu.css`** — Shared account dropdown (SPA + admin).

---

## Repository layout (high level)

```
science_sims/
├── app/                   # SPA frontend (Vite; build → app/dist/)
│   ├── src/main.js        # ESM entry
│   ├── src/modules/       # Converted app modules
│   ├── index.php          # Prefers dist/, else index.legacy.html
│   └── package.json
├── api/v1/                # REST router + handlers
├── assets/js/, assets/css/
├── codespace/             # HTML/CSS/JS live editor
├── index.php              # Legacy redirect → app/
├── index.html             # Optional redirect shell
├── default_redirect_url.php # Optional index.html redirect helper
├── login.php, logout.php, register.php
├── simulation_view.php      # 302 → /api/v1/simulations/{slug}/html
├── markdown_reader.php    # Whitelist + admin for sensitive .md
├── index_csv_editor.php     # 302 → /app/admin/simulations
├── docs/openapi.yaml        # API contract stub
├── docs/reference/          # Non-runtime teaching/legacy files
├── scripts/apply_schema.php
├── scripts/sync_simulations_to_db.php
├── src/                     # PSR-4 ScienceSims\
├── tests/                   # PHPUnit
│
├── includes/              # PHP config, DB, auth, content libs
├── admin/                 # Redirect shells → /app/admin/…
├── portal/                # Deprecated redirects → SPA
├── schema.sql             # Full database schema (canonical)
├── schema.sql / schema_upgrade_all.sql / schema_drop_quiz_legacy.sql
│
├── physics/               # HKDSE-style units (01, 02, …, e01–e03)
├── chem/ / chemistry/
├── biology/, science/, astronomy/, …
├── dev/                   # Planning notes (e.g. plan.md)
│
├── .cursorrules           # Cursor AI project rules (summary)
├── .cursor/rules/         # Cursor file-specific rules
├── architecture.md        # This file (canonical; on case-insensitive FS same as ARCHITECTURE.md)
├── change_log.md, README.md, rule.md, prompt.md
└── .env, .env.example
```

---

## Architecture patterns

### 1. Standalone simulation HTML

Self-contained pages, CDN scripts, optional inline JS. No bundler required. Suited for static hosting and embedding from SPA modal (iframe).

### 2. SPA catalogue (`app/`)

- Client fetches **`GET /api/v1/catalog`** and type-specific list endpoints.
- **Course mode** merges notes, sims, worksheets, articles, tools, and videos via `topic_learning_items`.
- **Preview page** for simulations in course flow before opening the modal iframe.
- **Home (`/`)** is a role hub: students → summer homework for their form; teachers/admins → teaching courses → class summer-homework report.

### 3. Worksheet embed blocks

Worksheet Markdown is parsed server-side (`worksheet_blocks_lib.php`) into blocks. Directive lines embed resources:

```
::simulation slug="0105_gas_laws"
::video slug="intro-forces"
::article slug="gas-laws-intro"
::question bank="physics-mcq" id="42" score="2"
```

Rendered in SPA via `content-embeds.js`; assignment submissions store answers in `worksheet_submissions.responses_json` with optional auto-scoring.

### 4. Summer homework (attempts & analytics)

- **Items** (`summer_homework_items`): form_level `1`|`2`, reading or video body, `pass_percent` (default 80), optional `due_at` + `allow_late_submit`.
- **Questions**: `mcq` (2–6 options), `fill_blank` (multiple acceptable answers per blank), `true_false`, `short_answer`, `long_answer` (manual marks; excluded from auto pass %). Upsert on save keeps stable `question_id`. Saving an item **re-grades all existing attempts** against the latest answers / `pass_percent` (keeps `responses_json`, `submitted_at`, `teacher_marks_json`).
- **Every submit** `INSERT`s into `summer_homework_attempts` (UI still shows **best** percent only).
  - `responses_json` — raw answers (`selected_option_index` / blanks / `selected_bool` / `text`).
  - `grading_json` — score summary + per-question `details[]` (`question_id`, `type`, `correct`, `score`, `max`, …); MCQ includes options snapshot.
  - `teacher_marks_json` — optional teacher scores/comments for long-answer items.
- **Due status**: **準時** / **欠交** / **未交** from **first passing** attempt’s `submitted_at` vs `due_at` (not best-score attempt). Incomplete (never passed) = 未交; first pass after due = 欠交.
- **Class report**: SPA `/app/admin/courses/{id}/summer` via `sh_class_report()` — status filter + CSV export.
- **Item analytics**: SPA `/app/admin/summer-homework/{id}/analytics` via `GET /admin/summer-homework/{id}/analytics` + attempts/marks APIs (`sh_item_attempt_analytics()`). Legacy `admin/summer_homework_analytics.php` 302s to SPA.
- **Student content language**: follows enrollment **MOI** (E→en, C→zh), not the SPA UI language toggle.
- Upgrade script: **`schema_upgrade_all.sql`** (includes summer homework media, `content_refs_json`, `multi_select`, `match_mode`, and prior SH / classes / nav / auth patches).
- Content embeds: `::note` / `::article` / `::video` / `::simulation` / `::question` (see `app/src/modules/content-embeds.js`).
- Module docs: **[`README.md`](README.md)** § 暑期功課.

### 5. Auth & permissions

Session-based login; admin routes and API mutations check RBAC capabilities. Admins may **impersonate** via `POST /api/v1/admin/users/{id}/impersonate` (audit via session flags; stop via `POST /api/v1/auth/stop-impersonation`). Legacy `admin/impersonate.php` returns 410.

**Login identity**: school accounts use the **same login id as QSIS `user.username`** (e.g. `s20171060`) — **no** `@qos.edu.hk`. If a user still types `sid@qos.edu.hk`, the domain is stripped. Legacy DB rows are migrated on login / via **`schema_upgrade_all.sql`**.

**Password**: login always verifies against **QSIS** `user.password_hash` (bcrypt or legacy MD5). This platform does **not** store passwords (`users.password_hash` removed; migrate with **`schema_upgrade_all.sql`**). Password changes must be done in the school QSIS system. QSIS must be configured in `.env` (`QSIS_DB_*`) or login will fail.

### 6. Bilingual UI

`AppRouter.t(zh, en)`, `data-zh` / `data-en` on simulations; language persisted in `localStorage`. User display names: `name_zh` / `name_en`. Videos: separate `embed_url_zh` / `embed_url_en`. Summer homework **body language for students** follows MOI (see pattern 4).

### 7. Security notes

- **`.env`** must not be web-readable; root `.htaccess` denies dotfiles.
- Admin/API mutating requests use **CSRF** (`X-CSRF-Token` or JSON `csrf`).
- **`logout.php`**: POST only (GET shows confirmation form).
- **Login / register rate limit**: 5 attempts / 15 min per IP+identity (`api_rate_limits`); applies to API and `login.php` / `register.php`.
- **`POST /auth/dev-login`**: passwordless login only when `APP_ENV=local`; audited.
- **Passwords**: verified against QSIS only; no self-service change-password API (removed).
- **Impersonation**: admin-only; 1-hour TTL auto-stop; start/stop/timeout written to `admin_audit_log`.
- **DB wipe import** (`admin/db_import.php`): blocked unless `APP_ENV` is `local`/`staging` or `APP_ALLOW_DB_WIPE=1`; requires checkbox + typed phrase `DELETE ALL TABLES`; audited.
- **Simulation HTML**: CSP via `simulation_html_csp()` (HTTPS CDNs allowed; `frame-ancestors 'self'`); SPA iframe sandbox **omits** `allow-same-origin` (opaque origin; modal screenshot may fall back).
- **Simulation workflow**: draft ↔ published only (**免審**); other content types use `pending_review`.
- **`DEFAULT_REDIRECT_URL`**: validated via `REDIRECT_URL_WHITELIST` / HTTPS check.
- **`markdown_reader.php`**: public whitelist only; other files require `user.manage`.
- **Markdown / HTML content**: client-side sanitization (DOMPurify).

---

## Deployment

### PHP / LAMPP

1. PHP 8+ with PDO MySQL, MariaDB with schema applied.
2. Copy `.env.example` → `.env`, set `DB_*` and optional `DEFAULT_REDIRECT_URL`.
3. Import **`schema.sql`** on MariaDB (or **`schema_upgrade_all.sql`** on existing DBs).
4. Point vhost document root at project root; open **`/app/`**.

### GitHub Pages (static subset)

- **No PHP execution**: `index.php`, admin, API, and DB-backed catalogue **will not run**.
- Use **per-simulation HTML URLs** or a static mirror strategy; `index.html` redirect only works on **PHP hosts**.

### Environment variables (subset)

| Variable | Role |
|----------|------|
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, … | Database |
| `APP_ENV` | `local` / `staging` / `production` (default); gates dev-login & DB wipe |
| `APP_ALLOW_DB_WIPE` | Emergency override to allow production DB import wipe |
| `DEFAULT_REDIRECT_URL` | Optional validated redirect for `index.html` |
| `REDIRECT_URL_WHITELIST` | Comma-separated allowed redirect hosts |
| `CORS_ALLOWED_ORIGINS` | Optional cross-origin API access |
| `SESSION_COOKIE_SECURE` | Set on HTTPS production |

---

## Development guidelines

- Follow **`rule.md`** for naming, HTML skeleton, PHP/SPA conventions, and worksheet embed syntax.
- New simulations: add HTML under the correct subject folder; register via **SPA `/app/admin/simulations`**.
- Learning content: use **SPA `/app/admin/…`** editors (`admin/`／`portal/` redirect shells); SPA reads published items via **`/api/v1/`**. Subjects: SPA `/app/admin/subjects`.
- Schema changes: edit **`schema.sql`** and document in **`change_log.md`**; for existing DBs update **`schema_upgrade_all.sql`**.
- Document significant changes in **`change_log.md`**; summer-homework module notes in **`README.md`**.
- Prefer **small, focused diffs**; match existing style in each directory.
- Cursor AI: see **`.cursorrules`** and **`.cursor/rules/`**.

---

## Related docs

- **`README.md`** — Overview, quick start, summer homework guide, links.
- **`change_log.md`** — Version history from Git.
- **`schema.sql`** — Full database schema for fresh installs.
- **`data_dictionary.md`** — Table/column reference (run `php update_data_dictionary.php`).
- **`rule.md`** — File naming, structure, accessibility, PHP/SPA rules.
- **`dev/plan.md`** — Optional curriculum / project ideation list (Traditional Chinese).

> **Note (macOS / case-insensitive volumes):** `ARCHITECTURE.md` and `architecture.md` resolve to the **same file**. Keep this document as the single canonical architecture source; do not maintain a separate thin index under the other casing.

---

**Last updated**: 2026-07-23  
**Maintainer**: Mr. Bryan Leung (see README)
