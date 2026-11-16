# Handoff State

- **Current Task**: T10 (Mediana SMS adapter implementation) - claimed.
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
  - Completed **T07 (Smart Inventory DB schema & backend logic, migration 006)**.
  - Completed **T08 (Smart Inventory UI & reorder suggestions)**.
  - Completed **T09 (SMS Provider interface & queue engine, migration 007)**.
- **In Progress**:
  - Claimed **T10**: Polishing `MedianaService` adapter implementation, ensuring strict compliance with documented Mediana endpoints, pattern template variable validation, sandbox/dry-run mode, and test verification.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Polish `MedianaService`, write `tests/test_t10_mediana_adapter.py`, run test suite, and verify.
- **Blockers**: None.
