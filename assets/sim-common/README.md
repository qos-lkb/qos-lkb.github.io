# Shared assets for standalone simulation HTML

Optional CSS / tiny helpers shared by multiple sims under `physics/`, `chem/`, etc.

## Rules

- Keep files small and dependency-free (no npm, no Vite).
- Reference with paths relative to the site root when served via API `<base href>`, e.g. `assets/sim-common/sim-base.css`.
- Do **not** import anything from `app/dist/` or SPA modules.

Add shared files here only when at least two sims need the same snippet.
