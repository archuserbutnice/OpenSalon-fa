# Handoff State

- **Current Task**: T03 (Modular API route refactoring) — CLAIMED
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Reconciled `STATE.md` with baseline schema & existing codebase.
  - Claimed T03 to build and modularize core REST routes under `/api/...`.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Implement modular API routers for `clients`, `staff`, `services`, `appointments`, `products`, `settings` in `src/server/routes/`, mount in `src/server/index.ts`, and test with verification suite.
- **Blockers**: None.
