# Handoff State

- **Current Task**: none active (T08 completed, ready for T09).
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**.
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Completed **T05 (Jalali calendar integration & formatting utils)**.
  - Completed **T06 (Minimal authentication: owner/staff roles & sessions)**.
  - Completed **T07 (Smart Inventory DB schema & backend logic, migration 006)**.
  - Completed **T08 (Smart Inventory UI & reorder suggestions)**:
    - Extended `src/client/pages/inventory.tsx` with dedicated sub-tabs: Items Catalog, Smart Reorder Suggestions, Service Consumption Formula Mappings, Valuation & Profit Margin Report, Batches & Expiry Dates, and Transactions Ledger.
    - Integrated Persian digits, Toman/Rial toggle support, Jalali date formatting, and live API fetch with fallback to sensible mock defaults.
    - Verified with `tests/test_t08_inventory_ui.py` (all 48 tests pass).
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Start **T09** (SMS Provider interface & queue engine, migration `007`).
- **Blockers**: None.
