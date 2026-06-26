# Architecture Documentation

## Project overview

Educational site hosting **interactive science simulations** (HKDSE / secondary level): physics, chemistry, biology, integrated science, astronomy, and related folders. Each simulation is typically a **standalone HTML** file using CDN libraries (Tailwind, Chart.js, Three.js, MathJax, etc.).

The same codebase may be deployed as:

| Mode | Entry | Purpose |
|------|--------|---------|
| **SPA frontend (recommended)** | `app/` | Catalogue, self-study courses, notes, worksheets, quizzes, articles, question banks |
| **Legacy redirect** | `index.php` | 302 → `app/` |
| **REST API** | `api/v1/` | JSON endpoints for catalogue, auth, CRUD, review |
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
- **MariaDB / MySQL** for catalogue, learning content, users, roles (see migrations).
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

- **`config.php`** — Loads root `.env` (`config_load_dotenv`), merges `config.local.php`, DB DSN from env.
- **`db.php`** — PDO connection.
- **`auth.php`**, **`bootstrap.php`** — Sessions, `bootstrap_public()`.
- **`simulations_lib.php`**, **`simulation_save.php`** — Simulation CRUD.
- **`learning_tools_lib.php`**, **`articles_lib.php`** — MCQ tools and science articles.
- **`learning_notes_lib.php`**, **`worksheets_lib.php`** — Notes and worksheets.
- **`learning_videos_lib.php`**, **`topic_items_lib.php`** — Course videos and mixed curriculum items.
- **`question_bank_lib.php`** — Question banks (MCQ, short/long answer, fill-blank, T/F).
- **`account_lib.php`** — Profile helpers for account menu / auth API.
- **`api_response.php`**, **`api_auth.php`**, **`api_rate_limit.php`** — REST JSON helpers.
- **`user_admin.php`** — Roles (`admin`, `teacher`, `student`), permissions matrix.

---

## REST API (`api/v1/`)

Front controller: [`api/index.php`](api/index.php). Session cookie auth (`SCI_SIM_SESSID`); mutating requests require `X-CSRF-Token`.

### Public / authenticated read

| Method | Path | Description |
|--------|------|-------------|
| GET | `/catalog` | Simulations tree + published learning content |
| GET | `/courses`, `/courses/{subject}` | Self-study course structure |
| GET | `/simulations/{slug}`, `/simulations/{slug}/html` | Simulation metadata / iframe HTML |
| GET | `/learning-tools/{slug}`, `/articles/{slug}` | Interactive quiz / article |
| GET | `/learning-notes/{slug}`, `/worksheets/{slug}` | Notes / worksheets |
| GET | `/learning-videos/{slug}` | Embedded video metadata |
| GET | `/question-banks/{slug}` | Question bank (student view) |
| GET | `/auth/me` | Current user |
| POST | `/auth/login`, `/auth/logout` | Session login / logout (POST+CSRF) |
| POST | `/auth/register` | Student self-registration (invite code) |
| POST | `/auth/student-profile` | Update student profile |
| GET | `/learning/dashboard` | Student SDL dashboard data |
| POST | `/learning/events` | Batch learning events (authenticated) |
| GET | `/learning/events/summary` | Learning time summary |
| POST/GET | `/learning/attempts` | Submit or list quiz attempts |
| GET | `/learning/mastery` | Topic mastery scores |
| GET | `/learning/progress` | Content completion by topic |
| POST | `/learning/goals` | Save weekly learning goal |
| GET | `/learning/recommendations` | Adaptive recommendations |
| GET | `/learning/adaptive-quiz` | Adaptive quiz for topic |
| GET/POST | `/teacher/classes` | Teacher class list / create |
| POST | `/teacher/classes/{id}/enroll` | Enroll students by email |
| POST | `/teacher/classes/{id}/invite` | Reset class invite code |
| GET | `/teacher/classes/{id}/report` | Class learning report |
| GET | `/teacher/classes/{id}/report.csv` | Export class report CSV |
| GET | `/teacher/classes/{id}/students/{user_id}` | Student detail in class |
| POST | `/auth/profile`, `/auth/change-password` | Account settings |

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
| GET | `/review-queue` | Pending review items |
| POST | `/review/{type}/{id}/publish\|reject` | Approve or reject content |

Apply schema in order: [`migrations/001`](migrations/001_api_learning_content.sql) through [`009`](migrations/009_sdl_adaptive_learning.sql) (`009` = classes, learning events, attempts, mastery, goals).

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
| `worksheet.js` | Worksheets |
| `quiz.js`, `article.js` | Interactive tools and science articles |
| `sidebar.js`, `modal-capture.js` | Layout, fullscreen, PNG capture |

### Main nav sections

- **自學課程** — `/courses`, `/course/{subject}/{topic}`
- **課程及學習筆記** — `/learning-notes`, `/note/{slug}`
- **工作紙** — `/worksheets`, `/worksheet/{slug}`
- **模擬程式** — `/simulations`, `/simulation/{slug}` (preview before modal)
- **科學文章** — `/articles`, `/article/{slug}`
- **互動學習工具** — `/learning-tools`, `/quiz/{slug}`

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
| `worksheets` | Worksheet content |
| `learning_videos` | YouTube/Vimeo embeds |
| `topic_learning_items` | Mixed ordering per topic (course curriculum) |
| `question_banks`, `qb_*` | Multi-type question banks |

- **Roles**: `admin`, `teacher` (formerly `user`), `student`.
- **Permissions**: `*.manage_own` (contributors) and `*.manage_any` (admins); `user.manage`, `topic_item.manage_any`, etc.
- **`admin/`** — Users, permissions, subjects, simulations, all content types, course curriculum, review queue, DB export.
- **`portal/`** — Contributor entry for owned content.
- **`assets/js/user-menu.js`**, **`assets/css/user-menu.css`** — Shared account dropdown (SPA + admin).

---

## Repository layout (high level)

```
science_sims/
├── app/                   # SPA frontend (main user UI)
├── api/                   # REST API front controller
├── assets/js/             # admin-api.js, admin-question-bank.js, user-menu.js
├── assets/css/            # user-menu.css
├── codespace/             # HTML/CSS/JS live editor
├── index.php              # Legacy redirect → app/
├── index.html             # Optional redirect shell
├── default_redirect_url.php
├── login.php, logout.php  # logout: POST + CSRF only
├── simulation_view.php    # Deprecated; prefer API html endpoint
├── markdown_reader.php    # Whitelist + admin for sensitive .md
├── index_csv_editor.php   # Legacy redirect to admin
│
├── includes/              # PHP config, DB, auth, API, content libs
├── admin/                 # Back office
├── portal/                # Contributor portal
├── migrations/            # SQL migrations 001–007
│
├── physics/               # HKDSE-style units (01, 02, 03a, …, e01–e03)
├── chem/ / chemistry/     # Chemistry sims (naming varies by history)
├── biology/
├── science/               # Integrated science
├── astronomy/
├── s4_physics/, other/, geography/, music/ …
├── dev/                   # Planning notes (e.g. plan.md)
│
├── architecture.md        # This file (canonical architecture doc)
├── ARCHITECTURE.md        # Pointer to this file
├── change_log.md          # Git-derived changelog
├── README.md, rule.md, prompt.md, link.txt
└── .env, .env.example     # Env template (do not commit real .env)
```

Adjust folder names to match your checkout (`chem` vs `chemistry`, etc.).

---

## Architecture patterns

### 1. Standalone simulation HTML

Self-contained pages, CDN scripts, optional inline JS. No bundler required. Suited for static hosting and embedding from SPA modal (iframe).

### 2. SPA catalogue (`app/`)

- Client fetches **`GET /api/v1/catalog`** (and type-specific list endpoints) and renders subjects → topics → cards.
- **Course mode** merges notes, sims, worksheets, articles, tools, and videos via `topic_learning_items`.
- **Preview page** for simulations in course flow before opening the modal iframe.

### 3. Auth & permissions

Session-based login; admin routes and API mutations check RBAC capabilities. Account menu exposes profile and logout in SPA.

### 4. Bilingual UI

`AppRouter.t(zh, en)`, `data-zh` / `data-en` on simulations; language persisted in `localStorage`.

### 5. Security notes

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
3. Run migrations **`001` through `007`** in order on MariaDB.
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

- Follow **`rule.md`** for naming, HTML skeleton, and quality bar.
- New simulations: add HTML under the correct subject folder; register via **admin / DB workflow**.
- Learning content: use **admin/** or **portal/** editors (REST API backend).
- Document significant changes in **`change_log.md`**.
- Prefer **small, focused diffs**; match existing style in each directory.

---

## Related docs

- **`README.md`** — Overview, quick start, links.
- **`change_log.md`** — Version history from Git.
- **`rule.md`** — File naming, structure, accessibility.
- **`dev/plan.md`** — Optional curriculum / project ideation list (Traditional Chinese).

---

**Last updated**: 2026-06-13  
**Maintainer**: Mr. Bryan Leung (see README)
