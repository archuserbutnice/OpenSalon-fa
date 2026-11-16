# Handoff State

- **Current Task**: none active (T07 completed, ready for T08).
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
  - Completed **T07 (Smart Inventory DB schema & backend logic, migration 006)**:
    - Author and applied additive migration `migrations/006_smart_inventory.sql` (`service_consumptions`, `inventory_batches`, `appointment_consumption_logs`, plus `expiry_date` and `batch_number` columns).
    - Implemented service consumption mapping CRUD, auto-decrement on appointment completion (with strict idempotency), deterministic 30-day burn rate and days-to-stockout calculations, deterministic reorder suggestions, valuation reports, and batch/expiry management.
    - Hooked appointment auto-decrement into `/api/appointments` create and update-to-complete workflows.
    - Verified with `tests/test_t07_smart_inventory.py` (all 43 tests pass).
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Start **T08** (Smart Inventory UI & reorder suggestions in `src/client/pages/inventory.tsx`).
- **Blockers**: None.
