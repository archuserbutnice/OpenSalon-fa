# Handoff State

- **Current Task**: none active (T10 completed, ready for T11).
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
  - Completed **T07 (Smart Inventory DB schema & backend logic, migration 006)**.
  - Completed **T08 (Smart Inventory UI & reorder suggestions)**.
  - Completed **T09 (SMS Provider interface & queue engine, migration 007)**.
  - Completed **T10 (Mediana SMS adapter implementation)**:
    - Verified strict compliance with documented endpoints (`/sms/v1/send/pattern` and `/sms/v1/send/sms`).
    - Added template variable validation, template rendering with placeholders, and segment calculation tracking.
    - Verified with `tests/test_t10_mediana_adapter.py` (all 58 tests pass).
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Start **T11** (SMS delivery logs & dry-run toggle UI in `src/client/pages/sms.tsx`).
- **Blockers**: None.
