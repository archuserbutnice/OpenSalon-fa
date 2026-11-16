# HANDOFF.md — Agent Session Handoff & Execution Log

## Current Status
- Project: OpenSalon-fa (Persian-first Salon CRM)
- Workspace: `/mnt/c/Users/infra-01/Desktop/Project/Open Salon CRM`
- Active Task: T04 (SMS Layer / Mediana) — CLAIMED
- Previous Completed: T01 (Scaffolding baseline), T02 (Persian Localization Core), T03 (Inventory Management)

## Session Log
- Baseline environment initialized from scratch in working directory.
- Created `AGENTS.md`, `docs/ai/SPEC.md`, `docs/ai/STATE.md`, and `docs/ai/HANDOFF.md`.
- Completed T03 (Inventory Management) with verified test suite.
- Claimed T04 (SMS Layer / Mediana). Starting additive migration 004_sms_mediana.sql.

## Migration Register
- `migrations/001_initial.sql`: Baseline OpenSalon schema (clients, staff, services, appointments, products).
- `migrations/002_localization.sql`: Salon settings, currency configuration, Jalali defaults.
- `migrations/003_inventory.sql`: Inventory categories, suppliers, items, transactions ledger, low-stock thresholds. (DONE)
- `migrations/004_sms_mediana.sql`: Claimed / In development (T04)

## Next Actions
1. Author `migrations/004_sms_mediana.sql` with sms_configs, sms_templates, sms_logs.
2. Implement Mediana client in `src/server/services/mediana.ts` with documented endpoints (`/sms/v1/send/pattern` and `/sms/v1/send/sms`).
3. Implement `/api/sms` endpoints in `src/server/routes/sms.ts`.
4. Implement Preact UI for SMS in `src/client/pages/sms.tsx`.
5. Add automated test suite `tests/test_t04_sms.py` and verify all tests pass.
6. Mark T04 done.
