# Handoff State

- **Current Task**: none active (T05 completed, ready for T06).
- **What Is Done**:
  - Dev environment setup merged to `main` with runnable server & Vite dev proxies.
  - Completed **T03 (Modular API route refactoring)**:
    - Modularized routes in `src/server/routes/` for `clients`, `staff`, `services`, `appointments`, `products`, `settings` (plus `inventory` and `sms`).
  - Completed **T04 (i18n, RTL, Vazirmatn font, currency & phone normalization)**:
    - Bundled genuine Vazirmatn WOFF2 fonts (Regular, Medium, Bold: 50 KB each) in `public/fonts/vazirmatn/`.
    - Formatted header and Jalali dates with Persian digits (`۰۱۲۳۴۵۶۷۸۹`).
  - Completed **T05 (Jalali calendar integration & formatting utils)**:
    - Implemented astronomical leap year calculations (`isJalaliLeapYear`), days per month, string parsing (`parseJalaliDate`), relative formatting (`formatJalaliRelative`), time slot generation, and month calendar grid.
    - Built interactive mobile-first RTL `JalaliDatePicker` component in `src/client/components/JalaliDatePicker.tsx` and mounted in header navigation.
    - Verified all algorithms with `tests/test_t05_jalali.py` (31/31 suite tests passed).
- **How to run**: `npm install`, then `npm run server` and `npm run dev` in two terminals; open http://localhost:5173.
- **Next Step**: Start **T06** (Minimal authentication: owner/staff roles & sessions, migration `005`).
- **Blockers**: None.
