# Handoff State

- **Current Task**: T05 (Jalali calendar integration & formatting utils) — CLAIMED
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)** and **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**.
  - Claimed **T05** to build comprehensive Jalali calendar algorithms (leap years, month days, grid generation, string parsing, relative formatting) and interactive Jalali date picker component.
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Implement Jalali calendar extensions in `src/client/lib/jalali.ts`, create `src/client/components/JalaliDatePicker.tsx`, and add test suite `tests/test_t05_jalali.py`.
- **Blockers**: None.
