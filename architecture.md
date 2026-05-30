# Architecture Documentation

## Project overview

Educational site hosting **interactive science simulations** (HKDSE / secondary level): physics, chemistry, biology, integrated science, astronomy, and related folders. Each simulation is typically a **standalone HTML** file using CDN libraries (Tailwind, Chart.js, Three.js, MathJax, etc.).

The same codebase may be deployed as:

| Mode | Entry | Purpose |
|------|--------|---------|
| **SPA frontend (recommended)** | `app/` | Vanilla JS catalogue, learning tools, articles; loads data via REST API |
| **Legacy redirect** | `index.php` | 302 → `app/` |
| **REST API** | `api/v1/` | JSON endpoints for catalogue, auth, CRUD, review |
| **Optional redirect** | `index.html` | If `.env` sets validated `DEFAULT_REDIRECT_URL`, sync XHR then `location.replace` |
| **Static hosting** | Individual HTML under `physics/`, `chem/`, … | GitHub Pages–style; **no DB** |

**Related repositories (typical setup)**

- **`science_sims`** — canonical app + DB + admin (this tree).
- **`qos-lkb.github.io`** — GitHub Pages mirror / user site; may track the same or a subset of static assets.

---

## Technology stack

### Core

- **HTML5**, **CSS3**, **Vanilla JS**; **Tailwind CSS** via CDN on many pages.
- **PHP 8+** (`declare(strict_types=1);`) for `index.php`, admin, auth, DB access.
- **MariaDB / MySQL** for published simulations, subjects, topics, users, roles (see migrations / admin).

### CDN libraries (representative)

| Library | Typical use |
|---------|----------------|
| Tailwind CSS | Layout, admin UI, `index.php` shell |
| Chart.js | Graphs in simulations |
| MathJax 3 | Equations |
| Three.js (+ OrbitControls) | 3D sims |
| html2canvas | Screenshots in modal (`index.php`) |
| React 18 + Babel standalone | Selected sims only |

### PHP includes (`includes/`)

- **`config.php`** — Loads root `.env` (`config_load_dotenv`), merges `config.local.php`, DB DSN from env.
- **`db.php`** — PDO connection.
- **`auth.php`**, **`bootstrap.php`** — Sessions, `bootstrap_public()`.
- **`simulations_lib.php`**, **`simulation_save.php`**, **`simulation_form_fragment.php`** — Index structure, CRUD helpers.
- **`learning_tools_lib.php`**, **`articles_lib.php`** — Quiz sets and science articles.
- **`api_response.php`**, **`api_auth.php`**, **`api_rate_limit.php`** — REST JSON helpers.
- **`user_admin.php`** — Permissions (`user.manage`, `simulation.manage_any`, `learning_tool.manage_*`, `article.manage_*`, …).

---

## REST API (`api/v1/`)

Front controller: [`api/index.php`](api/index.php). Session cookie auth (`SCI_SIM_SESSID`); mutating requests require `X-CSRF-Token`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/catalog` | Public | Simulations tree + published learning tools & articles |
| GET | `/simulations/{slug}` | Public/owner | Simulation metadata |
| GET | `/simulations/{slug}/html` | Public/owner | HTML for iframe |
| GET/POST | `/auth/*` | Varies | Login, logout (POST+CSRF), me |
| GET/POST/DELETE | `/admin/simulations` | RBAC | Simulation list/save/delete |
| GET/POST/DELETE | `/admin/learning-tools` | RBAC | Learning tool CRUD |
| GET/POST/DELETE | `/admin/articles` | RBAC | Article CRUD |
| GET | `/review-queue` | Admin | Pending review items |
| POST | `/review/.../publish\|reject` | Admin | Approve or reject content |

Apply schema: [`migrations/001_api_learning_content.sql`](migrations/001_api_learning_content.sql).

---

## Frontend SPA (`app/`)

- **Vanilla JS** modules: `api.js`, `router.js`, `catalog.js`, `quiz.js`, `article.js`, `auth.js`.
- Three main sections: **模擬實驗**, **互動學習工具** (四選一 MCQ), **科學文章** (Markdown + comprehension).
- Simulations open in **sandboxed iframe** via `/api/v1/simulations/{slug}/html`.

---

## Data & admin (current model)

- **Catalogue data** comes from **MariaDB**, not `index.csv` (legacy CSV deprecated).
- **`learning_tools`**, **`quiz_questions`**, **`quiz_options`**, **`science_articles`**, **`article_questions`**, **`article_options`** — interactive learning content.
- **Publish workflow**: contributors save `draft` or `pending_review`; admins with `*.manage_any` publish via admin or `/review/*` API.
- **`admin/`** — Users, subjects, simulations, learning tools, articles, review queue, DB export.
- **`portal/`** — Contributor simulations, learning tools, articles.

---

## Repository layout (high level)

```
science_sims/
├── app/                   # SPA frontend (main user UI)
├── api/                   # REST API front controller
├── assets/js/             # Shared admin-api.js
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
├── migrations/            # SQL migrations
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
├── README.md, rule.md, prompt.md, link.txt
└── .env, .env.example     # Env template (do not commit real .env)
```

Adjust folder names to match your checkout (`chem` vs `chemistry`, etc.).

---

## Architecture patterns

### 1. Standalone simulation HTML

Self-contained pages, CDN scripts, optional inline JS. No bundler required. Suited for static hosting and embedding from `index.php` modal (iframe).

### 2. SPA catalogue (`app/`)

- Client fetches **`GET /api/v1/catalog`** and renders subjects → topics → simulation cards.
- **Modal + sandbox iframe** for simulations; quiz/article pages are client-rendered routes.

### 3. Auth & permissions

Session-based login; admin routes check capabilities before rendering or mutating data.

### 4. Bilingual UI

`data-zh` / `data-en` toggles and similar patterns on `index.php` and many sims; MathJax for notation.

### 5. Security notes

- **`.env`** must not be web-readable; root `.htaccess` denies dotfiles.
- Admin/API mutating requests use **CSRF** (`X-CSRF-Token` or JSON `csrf`).
- **`logout.php`**: POST only (GET shows confirmation form).
- **Login rate limit**: 5 attempts / 15 min per IP+email (`api_rate_limits` table).
- **`DEFAULT_REDIRECT_URL`**: validated via `REDIRECT_URL_WHITELIST` / HTTPS check.
- **`markdown_reader.php`**: public whitelist only; other files require `user.manage`.
- **Articles / quizzes**: Markdown rendered client-side with DOMPurify.

---

## Deployment

### PHP / LAMPP

1. PHP 8+ with PDO MySQL, MariaDB with schema applied.
2. Copy `.env.example` → `.env`, set `DB_*` and optional `DEFAULT_REDIRECT_URL`.
3. Run `migrations/001_api_learning_content.sql` on MariaDB.
4. Point vhost document root at project root; open `/app/`.

### GitHub Pages (static subset)

- **No PHP execution**: `index.php`, admin, and DB-backed catalogue **will not run**.
- Use **per-simulation HTML URLs** or a static mirror strategy; `index.html` redirect only works if Pages somehow serves PHP (it does not) — redirect bridge is for **PHP hosts** (e.g. school server) that still ship `index.html`.

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
- Learning tools & articles: use **admin/** or **portal/** editors (REST API backend).
- Prefer **small, focused diffs**; match existing style in each directory.

---

## Related docs

- **`README.md`** — Overview, quick start, links.
- **`rule.md`** — File naming, structure, accessibility.
- **`dev/plan.md`** — Optional curriculum / project ideation list (Traditional Chinese).

---

**Last updated**: 2026-05-30  
**Maintainer**: Mr. Bryan Leung (see README)
