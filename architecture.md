# Architecture Documentation

## Project overview

Educational site hosting **interactive science simulations** (HKDSE / secondary level): physics, chemistry, biology, integrated science, astronomy, and related folders. Each simulation is typically a **standalone HTML** file using CDN libraries (Tailwind, Chart.js, Three.js, MathJax, etc.).

The same codebase may be deployed as:

| Mode | Entry | Purpose |
|------|--------|---------|
| **SPA frontend (recommended)** | `app/` | Catalogue, self-study courses, notes, worksheets, quizzes, articles, SDL dashboard, assignments |
| **Legacy redirect** | `index.php` | 302 → `app/` |
| **REST API** | `api/v1/` | JSON endpoints for catalogue, auth, CRUD, review, classes, worksheet assignments |
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
| MathJax 3 | Equations |
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
| `learning_tools_lib.php`, `articles_lib.php` | MCQ tools and science articles |
| `learning_notes_lib.php`, `worksheets_lib.php` | Notes and worksheets |
| `worksheet_blocks_lib.php` | Parse worksheet Markdown embed blocks |
| `worksheet_assignments_lib.php`, `worksheet_permissions_lib.php` | Assignments, submissions, grading |
| `learning_videos_lib.php`, `topic_items_lib.php` | Course videos and curriculum items |
| `question_bank_lib.php` | Question banks (multi-type) |
| `classes_lib.php`, `qsis_import_lib.php` | Class/course management, QSIS import |
| `adaptive_lib.php`, `learning_analytics_lib.php`, `learning_assessment_lib.php` | SDL, mastery, attempts |
| `user_names_lib.php`, `account_lib.php` | Bilingual names, profile helpers |
| `api_response.php`, `api_auth.php`, `api_rate_limit.php` | REST JSON helpers |
| `user_admin.php` | Roles (`admin`, `teacher`, `student`), permissions matrix |

---

## Database schema

Single canonical file: **[`schema.sql`](schema.sql)** — full MariaDB schema for fresh installs.

```bash
mysql -u USER -p DB_NAME < schema.sql
```

- **No FOREIGN KEY** constraints; relations enforced in PHP libs.
- **Timezone**: set `APP_TIMEZONE=Asia/Hong_Kong` in `.env`; schema sets session `+08:00`.
- **Seed data**: roles (`admin`, `teacher`, `student`), all permissions, default role grants, system user (`system@science-sims.internal`).
- **Admin account**: create via `admin/users.php` after import (no bundled default password).
- **Existing databases**: re-importing `schema.sql` **drops all tables** — back up first via `admin/db_export.php`.

### Tables (summary)

| Group | Tables |
|-------|--------|
| Auth | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `api_rate_limits` |
| Catalogue | `subjects`, `topics`, `simulations`, `tags`, `simulation_tags` |
| Content | `learning_tools`, `quiz_*`, `science_articles`, `article_*`, `learning_notes`, `worksheets`, `learning_videos`, `topic_learning_items` |
| Question banks | `question_banks`, `qb_questions`, `qb_mcq_options`, `qb_question_parts`, `qb_fill_blanks`, `qb_question_media` |
| Classes & SDL | `classes`, `class_enrollments`, `student_profiles`, `learning_events`, `learning_attempts`, `learning_responses`, `topic_mastery`, `learning_goals`, `content_bookmarks` |
| Assignments | `worksheet_assignments`, `worksheet_assignment_students`, `worksheet_submissions` |

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
| GET | `/learning-tools/{slug}`, `/articles/{slug}` | Interactive quiz / article |
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
| POST | `/auth/profile`, `/auth/change-password` | Account settings |
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

### Admin / contributor (RBAC)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/DELETE | `/admin/simulations` | Simulation CRUD |
| GET/POST/DELETE | `/admin/learning-tools` | Learning tool CRUD |
| GET/POST/DELETE | `/admin/articles` | Article CRUD |
| GET/POST/DELETE | `/admin/learning-notes` | Learning note CRUD |
| GET/POST/DELETE | `/admin/worksheets` | Worksheet CRUD |
| GET/POST/DELETE | `/admin/learning-videos` | Learning video CRUD |
| GET/POST/DELETE | `/admin/question-banks` | Question bank CRUD |
| GET/POST/DELETE | `/admin/topic-items` | Course curriculum item ordering |
| GET/POST/DELETE | `/admin/classes` | Class CRUD (admin) |
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
| `dashboard.js`, `learning-tracker.js` | SDL dashboard; page-view / time tracking |
| `quiz.js`, `article.js` | Interactive tools and science articles |
| `markdown.js`, `content-embeds.js`, `inline-edit.js` | Markdown render, embeds, inline editing |
| `sidebar.js`, `modal-capture.js` | Layout, fullscreen, PNG capture |

### Main routes

| Section | Paths |
|---------|-------|
| 自學課程 | `/courses`, `/course/{subject}/{topic}` |
| 課程及學習筆記 | `/learning-notes`, `/note/{slug}` |
| 工作紙 | `/worksheets`, `/worksheet/{slug}` |
| 模擬程式 | `/simulations`, `/simulation/{slug}` (preview before modal) |
| 科學文章 | `/articles`, `/article/{slug}` |
| 互動學習工具 | `/learning-tools`, `/quiz/{slug}` |
| SDL 儀表板 | `/dashboard` |
| 工作紙作業 | `/assignments`, `/worksheet/{slug}?assignment={id}` |

Simulations open in a **sandboxed iframe** via `/api/v1/simulations/{slug}/html`. Markdown content is rendered client-side with **DOMPurify**.

---

## Data & admin (current model)

- **Catalogue data** comes from **MariaDB**, not `index.csv` (legacy CSV deprecated).
- **Content types** (each with `draft` → `pending_review` → `published` workflow):

| Tables | Purpose |
|--------|---------|
| `simulations`, `subjects`, `topics` | Simulation catalogue |
| `learning_tools`, `quiz_*` | Four-option MCQ sets |
| `science_articles`, `article_*` | Markdown articles + comprehension |
| `learning_notes` | Bilingual notes (Markdown) |
| `worksheets` | Worksheet content (Markdown + embed blocks) |
| `learning_videos` | Bilingual embed URLs (YouTube, Vimeo, …) |
| `topic_learning_items` | Mixed ordering per topic (self-study curriculum) |
| `question_banks`, `qb_*` | Multi-type question banks |
| `classes`, `class_enrollments` | Teacher courses; form class, class no, MOI |
| `worksheet_assignments`, `worksheet_assignment_students`, `worksheet_submissions` | Class worksheet workflow |

### Roles & permissions

- **Roles**: `admin`, `teacher`, `student`.
- **Content**: `*.manage_own` (contributors) and `*.manage_any` (admins).
- **Worksheets**: `worksheet.assign_own`, `worksheet.grade_own`, `worksheet.submit_own` (seeded in **`schema.sql`**).
- **Classes**: `class.manage_own`, `class.manage_any`.

### Admin pages (representative)

| Area | Files |
|------|-------|
| Users & roles | `users.php`, `user_edit.php`, `permissions.php`, `impersonate.php` |
| Catalogue | `subjects.php`, `simulations.php`, `simulation_edit.php` |
| Learning content | `learning_notes.php`, `worksheets.php`, `worksheet_edit.php`, `articles.php`, `learning_tools.php`, `learning_videos.php`, `question_banks.php` |
| Curriculum | `course_curriculum.php` |
| Classes / courses | `courses.php`, `course_edit.php`, `course_reports.php`, `course_worksheets.php`, `classes.php`, `class_edit.php`, `class_reports.php`, `qsis_import.php` |
| Ops | `review_queue.php`, `db_export.php`, `db_import.php` |

- **`portal/`** — Contributor entry for owned content.
- **`assets/js/`** — `admin-api.js`, `admin-question-bank.js`, `admin-worksheet-embed.js`, `admin-content-embed.js`, `user-menu.js`.
- **`assets/css/user-menu.css`** — Shared account dropdown (SPA + admin).

---

## Repository layout (high level)

```
science_sims/
├── app/                   # SPA frontend (main user UI)
├── api/v1/                # REST router + handlers
├── assets/js/, assets/css/
├── codespace/             # HTML/CSS/JS live editor
├── index.php              # Legacy redirect → app/
├── index.html             # Optional redirect shell
├── default_redirect_url.php
├── login.php, logout.php, register.php
├── simulation_view.php    # Deprecated; prefer API html endpoint
├── markdown_reader.php    # Whitelist + admin for sensitive .md
├── index_csv_editor.php   # Legacy redirect to admin
│
├── includes/              # PHP config, DB, auth, content libs
├── admin/                 # Back office
├── portal/                # Contributor portal
├── schema.sql             # Full database schema (canonical)
│
├── physics/               # HKDSE-style units (01, 02, …, e01–e03)
├── chem/ / chemistry/
├── biology/, science/, astronomy/, …
├── dev/                   # Planning notes (e.g. plan.md)
│
├── .cursorrules           # Cursor AI project rules (summary)
├── .cursor/rules/         # Cursor file-specific rules
├── architecture.md        # This file (canonical)
├── ARCHITECTURE.md        # Doc index → this file
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

### 3. Worksheet embed blocks

Worksheet Markdown is parsed server-side (`worksheet_blocks_lib.php`) into blocks. Directive lines embed resources:

```
::simulation slug="0105_gas_laws"
::video slug="intro-forces"
::article slug="gas-laws-intro"
::question bank="physics-mcq" id="42" score="2"
```

Rendered in SPA via `content-embeds.js`; assignment submissions store answers in `worksheet_submissions.responses_json` with optional auto-scoring.

### 4. Auth & permissions

Session-based login; admin routes and API mutations check RBAC capabilities. Admins may **impersonate** users via `admin/impersonate.php` (audit via session flags; stop via `/auth/stop-impersonation`).

### 5. Bilingual UI

`AppRouter.t(zh, en)`, `data-zh` / `data-en` on simulations; language persisted in `localStorage`. User display names: `name_zh` / `name_en`. Videos: separate `embed_url_zh` / `embed_url_en`.

### 6. Security notes

- **`.env`** must not be web-readable; root `.htaccess` denies dotfiles.
- Admin/API mutating requests use **CSRF** (`X-CSRF-Token` or JSON `csrf`).
- **`logout.php`**: POST only (GET shows confirmation form).
- **Login rate limit**: 5 attempts / 15 min per IP+email (`api_rate_limits` table).
- **`DEFAULT_REDIRECT_URL`**: validated via `REDIRECT_URL_WHITELIST` / HTTPS check.
- **`markdown_reader.php`**: public whitelist only; other files require `user.manage`.
- **Markdown / HTML content**: client-side sanitization (DOMPurify).

---

## Deployment

### PHP / LAMPP

1. PHP 8+ with PDO MySQL, MariaDB with schema applied.
2. Copy `.env.example` → `.env`, set `DB_*` and optional `DEFAULT_REDIRECT_URL`.
3. Import **`schema.sql`** on MariaDB.
4. Point vhost document root at project root; open **`/app/`**.

### GitHub Pages (static subset)

- **No PHP execution**: `index.php`, admin, API, and DB-backed catalogue **will not run**.
- Use **per-simulation HTML URLs** or a static mirror strategy; `index.html` redirect only works on **PHP hosts**.

### Environment variables (subset)

| Variable | Role |
|----------|------|
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, … | Database |
| `DEFAULT_REDIRECT_URL` | Optional validated redirect for `index.html` |
| `REDIRECT_URL_WHITELIST` | Comma-separated allowed redirect hosts |
| `CORS_ALLOWED_ORIGINS` | Optional cross-origin API access |
| `SESSION_COOKIE_SECURE` | Set on HTTPS production |

---

## Development guidelines

- Follow **`rule.md`** for naming, HTML skeleton, PHP/SPA conventions, and worksheet embed syntax.
- New simulations: add HTML under the correct subject folder; register via **admin / DB workflow**.
- Learning content: use **admin/** or **portal/** editors (REST API backend).
- Schema changes: edit **`schema.sql`** and document in **`change_log.md`**; existing DBs need manual ALTER or export/re-import.
- Document significant changes in **`change_log.md`**.
- Prefer **small, focused diffs**; match existing style in each directory.
- Cursor AI: see **`.cursorrules`** and **`.cursor/rules/`**.

---

## Related docs

- **`README.md`** — Overview, quick start, links.
- **`change_log.md`** — Version history from Git.
- **`schema.sql`** — Full database schema for fresh installs.
- **`data_dictionary.md`** — Table/column reference (run `php update_data_dictionary.php`).
- **`rule.md`** — File naming, structure, accessibility, PHP/SPA rules.
- **`dev/plan.md`** — Optional curriculum / project ideation list (Traditional Chinese).

---

**Last updated**: 2026-06-28  
**Maintainer**: Mr. Bryan Leung (see README)
