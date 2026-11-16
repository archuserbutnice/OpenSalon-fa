# Handoff State

- **Current Task**: T04 (i18n, RTL, Vazirmatn font, currency & phone normalization) — CLAIMED
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**:
    - Modularized routes in `src/server/routes/` for `clients`, `staff`, `services`, `appointments`, `products`, `settings` (plus `inventory` and `sms`).
    - Standardized REST patterns, query filters, joined appointment details, error handling, and Iranian phone normalization.
    - Mounted all routers in `src/server/index.ts`.
    - Tested and verified with `tests/test_t03_modular_routes.py` (21/21 suite tests passed).
  - Claimed **T04** to bundle authentic Vazirmatn font files, enforce Persian digits across UI and header dates, and polish i18n/currency/phone foundations.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Download/bundle authentic Vazirmatn woff2 font files, update `app.tsx` date to use Persian digits, extend dictionary, and verify.
- **Blockers**: None.
