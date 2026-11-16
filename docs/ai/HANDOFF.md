# Handoff State

- **Current Task**: T13 (Smart Reports dashboard widgets & CSV export in `src/client/pages/reports.tsx`) - claimed.
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
  - Completed **T07 (Smart Inventory DB schema & backend logic, migration 006)**.
  - Completed **T08 (Smart Inventory UI & reorder suggestions)**.
  - Completed **T09 (SMS Provider interface & queue engine, migration 007)**.
  - Completed **T10 (Mediana SMS adapter implementation)**.
  - Completed **T11 (SMS delivery logs & dry-run toggle UI)**.
  - Completed **T12 (Smart Reports backend aggregation)**.
- **In Progress**:
  - Claimed **T13**: Building `src/client/pages/reports.tsx` with date-range filters, revenue by staff/service charts, busiest hours heatmap, VIP client rankings, and one-click UTF-8 BOM CSV export. Connecting to `src/client/app.tsx`.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Create `reports.tsx`, add nav item to `app.tsx`, write `tests/test_t13_reports_ui.py`, and verify.
- **Blockers**: None.
