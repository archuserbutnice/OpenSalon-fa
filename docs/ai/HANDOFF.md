# Handoff State

- **Current Task**: none active (T09 completed, ready for T10).
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
  - Completed **T07 (Smart Inventory DB schema & backend logic, migration 006)**.
  - Completed **T08 (Smart Inventory UI & reorder suggestions)**.
  - Completed **T09 (SMS Provider interface & queue engine, migration 007)**:
    - Author and applied additive migration `migrations/007_sms_queue.sql` (`sms_queue` table with retry/backoff tracking, added `segments` to `sms_logs`).
    - Implemented provider-agnostic `SmsProvider` interface, `SmsProviderRegistry`, Persian & GSM segment calculator (`countSmsSegments`), and persistent `SmsQueueEngine` with exponential backoff and retry limits.
    - Updated `MedianaService` to implement `SmsProvider` and auto-register.
    - Added queue management routes under `/api/sms/queue/...` and `/api/sms/calculate-segments`.
    - Verified with `tests/test_t09_sms_provider_queue.py` (all 54 tests pass).
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Start **T10** (Mediana SMS adapter implementation & verification against documented endpoints).
- **Blockers**: None.
