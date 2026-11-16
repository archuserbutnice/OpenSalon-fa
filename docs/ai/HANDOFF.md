# Handoff State

- **Current Task**: T11 (SMS delivery logs & dry-run toggle UI in `src/client/pages/sms.tsx`) - claimed.
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
- **In Progress**:
  - Claimed **T11**: Enhancing `src/client/pages/sms.tsx` with dry-run/sandbox toggle, live delivery logs filterable by status/phone, persistent queue monitoring & retry controls, and real-time Persian segment counting.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Update `src/client/pages/sms.tsx`, write `tests/test_t11_sms_ui.py`, and verify.
- **Blockers**: None.
