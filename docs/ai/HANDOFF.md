# HANDOFF.md — Agent Session Handoff & Execution Log

## Current Status
- Project: OpenSalon-fa (Persian-first Salon CRM)
- Workspace: `/mnt/c/Users/infra-01/Desktop/Project/Open Salon CRM`
- Active Task: None (T03 completed, ready for T04)
- Previous Completed: T01 (Scaffolding baseline), T02 (Persian Localization Core), T03 (Inventory Management)

## Session Log
- Baseline environment initialized from scratch in working directory.
- Created `AGENTS.md`, `docs/ai/SPEC.md`, `docs/ai/STATE.md`, and `docs/ai/HANDOFF.md`.
- Completed T03 (Inventory Management):
  - Additive migration `migrations/003_inventory.sql` created and verified.
  - Backend service `src/server/services/inventory.ts` and router `src/server/routes/inventory.ts` mounted under `/api/inventory`.
  - Client Preact UI implemented in `src/client/pages/inventory.tsx` with Persian formatting, RTL, Toman/Rial toggle, Jalali transaction timestamps.
  - Automated test suite `tests/test_t03_inventory.py` passed (10 total tests passed in suite).
- Ready to claim and execute T04 (SMS Layer / Mediana).

## Migration Register
- `migrations/001_initial.sql`: Baseline OpenSalon schema (clients, staff, services, appointments, products).
- `migrations/002_localization.sql`: Salon settings, currency configuration, Jalali defaults.
- `migrations/003_inventory.sql`: Inventory categories, suppliers, items, transactions ledger, low-stock thresholds. (DONE)
- `migrations/004_sms_mediana.sql`: Pending (T04)

## Next Actions
1. Claim T04 (SMS Layer / Mediana) in `docs/ai/STATE.md` and commit.
2. Implement T04 additive migration `migrations/004_sms_mediana.sql`, Mediana service `src/server/services/mediana.ts`, backend `/api/sms/...`, client UI, and tests.
3. Verify T04 and mark done.
