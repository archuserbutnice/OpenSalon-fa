# Handoff State

- **Current Task**: none active. Dev environment setup completed on branch `chore/dev-env-setup` (not yet merged to `main`).
- **What Is Done**:
  - Fixed unresolvable deps (`lucide-preact` ^0.451, `better-sqlite3` ^13).
  - Added `vite.config.ts` (Preact + `/api` proxy), `tsconfig.json`, Tailwind/PostCSS config, `src/client/index.css`, `render()` mount in `app.tsx`, `src/server/main.ts` (Hono node server).
  - Fixed `002_localization.sql` self-registering in `schema_migrations` (crashed server on fresh DB); test helper now mirrors the TS runner.
  - Reconciled `STATE.md` with existing code; planned migrations renumbered from 005.
  - Verified: `python tests/runner.py` (16 OK), `/api/health` + proxied `/api/*`, UI renders RTL in browser.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Merge `chore/dev-env-setup` into `main`, then start **T03** (Modular API route refactoring).
- **Blockers**: None.
