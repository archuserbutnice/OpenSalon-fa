# Handoff State

- **Current Task**: none active (T04 completed, ready for T05 / T06).
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**:
    - Modularized routes in `src/server/routes/` for `clients`, `staff`, `services`, `appointments`, `products`, `settings` (plus `inventory` and `sms`).
    - Standardized REST patterns, query filters, joined appointment details, error handling, and Iranian phone normalization.
    - Mounted all routers in `src/server/index.ts`.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**:
    - Bundled genuine Vazirmatn WOFF2 fonts (Regular, Medium, Bold: 50 KB each) in `public/fonts/vazirmatn/`.
    - Formatted header and Jalali dates with Persian digits (`۰۱۲۳۴۵۶۷۸۹`).
    - Expanded bilingual dictionary in `src/client/lib/i18n.ts` for all core salon entities.
    - Verified currency formatting (Toman / Rial toggle) and phone normalization (`09xxxxxxxxx`).
    - Full test suite verified with `tests/runner.py` (26/26 tests passed).
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Start **T05** (Jalali calendar integration & formatting utils) or **T06** (Minimal authentication).
- **Blockers**: None.
