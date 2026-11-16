# AGENTS.md — Autonomous Agent Operating Guide for OpenSalon-fa

## 1. Project Mission & Identity
OpenSalon-fa is a Persian-first, self-hostable salon and spa management platform customized for the Iranian market, forked from OpenSalon (`clawnify/OpenSalon`).
Tech Stack: Preact, TypeScript, Tailwind CSS v4, Hono, SQLite (`data.db`).

## 2. Critical Operating Rules
1. **No Chat Memory**: State is strictly maintained in the workspace. Read project state exclusively from:
   - `AGENTS.md` (this file)
   - `docs/ai/SPEC.md` (architecture, schema, specifications)
   - `docs/ai/STATE.md` (task matrix and tracking)
   - `docs/ai/HANDOFF.md` (session progress and handover notes)
2. **Strict Scope Lock**:
   - Only edit files relevant to the currently claimed task.
   - All backend API endpoints must reside under `/api/...`.
   - Implement only the 8 specified features:
     1. Inventory
     2. SMS Layer / Mediana
     3. Reports & Analytics
     4. Customer Profiles & History
     5. Automated SMS Triggers
     6. Staff Calendar / ICS
     7. Staff Profiles & RBAC Auth
     8. Public Online Booking
3. **Iranian Market Standards**:
   - **Language & Direction**: Default `fa`, RTL (`dir="rtl"`). English fallback via i18n.
   - **Typography**: Vazirmatn font bundled locally in `public/fonts/vazirmatn/`. Never load fonts from external CDNs.
   - **Calendar & Dates**: Jalali (Solar Hijri) calendar for all user-facing inputs and views. The database stores UTC Gregorian ISO strings (`YYYY-MM-DDTHH:mm:ssZ`). The week begins on Saturday (Shanbeh) and weekend is Friday (Jomeh).
   - **Currency**: Toman is the base unit stored as integers. Optional Rial display toggle (1 Toman = 10 Rials). Persian digits (`۰۱۲۳۴۵۶۷۸۹`) for formatted amounts.
   - **Phone Normalization**: Iranian mobile numbers must be normalized to standard `09xxxxxxxxx` (or E.164 `+989xxxxxxxxx`) prior to database storage or SMS transmission.
4. **Third-Party APIs**:
   - For Mediana SMS or external providers, use strictly documented endpoints.
   - Documented Mediana REST endpoints:
     - Pattern send: `POST https://api.mediana.ir/sms/v1/send/pattern`
     - Direct send: `POST https://api.mediana.ir/sms/v1/send/sms`
   - Any undocumented or missing field must be flagged as `[unverified]` and require user clarification before execution.
5. **Database Migrations**:
   - Migrations are strictly additive in `migrations/NNN_<name>.sql`.
   - Never destructively alter or wipe tables with existing user data.

## 3. Session Protocol
At the start of every session:
1. Read `AGENTS.md`, `docs/ai/STATE.md`, and `docs/ai/HANDOFF.md`.
2. Inspect `git status` and recent commit logs.
3. Select the next eligible `todo` task in `docs/ai/STATE.md`.
4. Update `docs/ai/STATE.md` to set task status to `claimed`.
5. Update `docs/ai/HANDOFF.md` to indicate active work.
6. Commit state change: `git commit -m "WIP Txx: Claim task <name>"`.
7. Execute implementation within the defined scope, making frequent atomic commits (`git commit -m "WIP Txx: ..."`).
8. Run automated test suites and verify all constraints.
9. Update `docs/ai/HANDOFF.md` with verification results.
10. Update `docs/ai/STATE.md` setting task status to `done`.
11. Commit final verification: `git commit -m "WIP Txx: Complete task <name>"`.
