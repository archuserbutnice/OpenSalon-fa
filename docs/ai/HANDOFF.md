# Handoff State

- **Current Task**: T06 (Minimal authentication: owner/staff roles & sessions) — CLAIMED
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**, **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**, and **T05 (Jalali calendar integration & formatting utils)**.
  - Claimed **T06** to author migration `005_auth_sessions.sql`, build authentication service & middleware (owner/staff roles, token sessions, PIN/pass auth), and `/api/auth` endpoints.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Create additive migration `migrations/005_auth_sessions.sql`, implement auth service, `/api/auth` routes, and test suite `tests/test_t06_auth.py`.
- **Blockers**: None.
