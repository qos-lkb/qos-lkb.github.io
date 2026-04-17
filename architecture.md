# Architecture Documentation

## Project overview

Educational site hosting **interactive science simulations** (HKDSE / secondary level): physics, chemistry, biology, integrated science, astronomy, and related folders. Each simulation is typically a **standalone HTML** file using CDN libraries (Tailwind, Chart.js, Three.js, MathJax, etc.).

The same codebase may be deployed as:

| Mode | Entry | Purpose |
|------|--------|---------|
| **Dynamic (LAMPP / PHP)** | `index.php` | Main catalogue: data from **MariaDB**, session-aware UI, modal viewer |
| **Optional redirect** | `index.html` | If `.env` sets `DEFAULT_REDIRECT_URL`, sync XHR to `default_redirect_url.php` then `location.replace` (PHP host only) |
| **Static hosting** | Individual HTML under `physics/`, `chem/`, … | GitHub Pages–style: open files directly; **no DB** |

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
- **`user_admin.php`** — Permissions (`user.manage`, `simulation.manage_any`, …).

---

## Data & admin (current model)

- **Catalogue data** for `index.php` comes from the **database** (`sim_fetch_published_for_index` and related tables), **not** from `index.csv` (legacy CSV flow has been superseded; `index_csv_editor.php` is deprecated).
- **`admin/`** — Protected UI: users/roles, subjects & units (`subjects.php`), simulations list/edit, DB export (permission-gated).
- **`portal/`** — Contributor-facing flows (e.g. “my simulations”) where applicable.
- **`.env`** — DB credentials, optional `DEFAULT_REDIRECT_URL` for `index.html` redirect bridge via `default_redirect_url.php` (JSON `{ "url": … }` only; no secrets in response).

---

## Repository layout (high level)

```
science_sims/   (example root name)
├── index.php              # Main dynamic homepage (DB-driven)
├── index.html             # Minimal shell; optional redirect to DEFAULT_REDIRECT_URL
├── default_redirect_url.php   # Reads .env; JSON for index.html
├── login.php, logout.php
├── markdown_reader.php    # Optional Markdown helper
├── index_csv_editor.php   # Legacy; comments note DB/admin path
│
├── includes/                # PHP config, DB, auth, simulation helpers
├── admin/                 # Back office (Tailwind, CSRF, permissions)
├── portal/                # User portal pages
├── migrations/            # SQL migrations (if present)
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

### 2. Dynamic index (`index.php`)

- Server renders navigation from **DB structures** (subjects → topics → items).
- **Modal + iframe** to open sim URLs; **html2canvas** for PNG capture where enabled.
- **503** page if DB unavailable (prompts `.env` / MariaDB).

### 3. Auth & permissions

Session-based login; admin routes check capabilities before rendering or mutating data.

### 4. Bilingual UI

`data-zh` / `data-en` toggles and similar patterns on `index.php` and many sims; MathJax for notation.

### 5. Security notes

- **`.env`** must not be web-readable; root `.htaccess` should deny direct access to dotfiles.
- Admin forms use **CSRF** tokens.
- **`default_redirect_url.php`** exposes only the redirect URL string, not DB secrets.

---

## Deployment

### PHP / LAMPP

1. PHP 8+ with PDO MySQL, MariaDB with schema applied.
2. Copy `.env.example` → `.env`, set `DB_*` and optional `DEFAULT_REDIRECT_URL`.
3. Point vhost document root at project root; open `/index.php`.

### GitHub Pages (static subset)

- **No PHP execution**: `index.php`, admin, and DB-backed catalogue **will not run**.
- Use **per-simulation HTML URLs** or a static mirror strategy; `index.html` redirect only works if Pages somehow serves PHP (it does not) — redirect bridge is for **PHP hosts** (e.g. school server) that still ship `index.html`.

### Environment variables (subset)

| Variable | Role |
|----------|------|
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, … | Database |
| `DEFAULT_REDIRECT_URL` | Optional; `index.html` + `default_redirect_url.php` immediate redirect |

---

## Development guidelines

- Follow **`rule.md`** for naming, HTML skeleton, and quality bar.
- New simulations: add HTML under the correct subject folder; register via **admin / DB workflow** (not legacy CSV) unless your fork still uses CSV.
- Prefer **small, focused diffs**; match existing style in each directory.

---

## Related docs

- **`README.md`** — Overview, quick start, links.
- **`rule.md`** — File naming, structure, accessibility.
- **`dev/plan.md`** — Optional curriculum / project ideation list (Traditional Chinese).

---

**Last updated**: 2026-04-18  
**Maintainer**: Mr. Bryan Leung (see README)
