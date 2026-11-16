# Handoff State

- **Current Task**: T09 (SMS Provider interface & queue engine, migration 007) - claimed.
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
  - Completed **T07 (Smart Inventory DB schema & backend logic, migration 006)**.
  - Completed **T08 (Smart Inventory UI & reorder suggestions)**.
- **In Progress**:
  - Claimed **T09**: Authoring `migrations/007_sms_queue.sql`, creating provider-agnostic `SmsProvider` interface, registry, Persian segment counter, and persistent queue engine with retry/backoff.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Author migration `007_sms_queue.sql`, implement `SmsProvider` interface & queue engine in `src/server/services/sms/`, update routes, and verify.
- **Blockers**: None.
