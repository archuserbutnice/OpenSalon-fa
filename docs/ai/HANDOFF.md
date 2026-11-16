# Handoff State

- **Current Task**: T07 (Smart Inventory DB schema & backend logic, migration 006) - claimed.
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
- **In Progress**:
  - Claimed **T07**: Authoring `migrations/006_smart_inventory.sql`, service consumption mapping, auto-decrement on appointment completion, days-to-stockout calculation, reorder suggestions, valuation reports.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Author migration `006_smart_inventory.sql`, extend `inventory.ts` service & routes, hook into `appointments.ts`, and create test suite.
- **Blockers**: None.
