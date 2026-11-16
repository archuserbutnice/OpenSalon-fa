# Project State

| id | title | status | owner_tool | branch | depends_on | parallel_ok | migration_no |
|---|---|---|---|---|---|---|---|
| T01 | Repo cleanup & gitignore update | done | system | main | none | no | - |
| T02 | Migration mechanism & baseline schema | done | system | main | T01 | no | 001, 002 |
| T03 | Modular API route refactoring | done | lead-agent | main | T02 | no | - |
| T04 | i18n, RTL, Vazirmatn font, currency & phone normalization | done | lead-agent | main | T02 | no | - |
| T05 | Jalali calendar integration & formatting utils | done | lead-agent | main | T04 | no | - |
| T06 | Minimal authentication (owner/staff roles & sessions) | todo | unassigned | main | T02 | no | 005 |
| T07 | Smart Inventory DB schema & backend logic | todo | unassigned | main | T03, T06 | yes | 006 |
| T08 | Smart Inventory UI & reorder suggestions | todo | unassigned | main | T07 | no | - |
| T09 | SMS Provider interface & queue engine | todo | unassigned | main | T03 | yes | 007 |
| T10 | Mediana SMS adapter implementation | todo | unassigned | main | T09 | no | - |
| T11 | SMS delivery logs & dry-run toggle UI | todo | unassigned | main | T10 | no | - |
| T12 | Smart Reports backend aggregation | todo | unassigned | main | T03, T06 | yes | - |
| T13 | Smart Reports dashboard widgets & CSV export | todo | unassigned | main | T12 | no | - |
| T14 | Customer profiles extension schema & backend | todo | unassigned | main | T03, T06 | yes | 008 |
| T15 | Customer profiles UI & visit timeline | todo | unassigned | main | T14 | no | - |
| T16 | Automated SMS templates & rule engine | todo | unassigned | main | T10, T14 | no | 009 |
| T17 | Quiet hours, consent & rate-limiting for automated SMS | todo | unassigned | main | T16 | no | - |
| T18 | Automated SMS manual segment send & preview UI | todo | unassigned | main | T17 | no | - |
| T19 | Staff working hours & shift management backend | todo | unassigned | main | T03, T06 | yes | 010 |
| T20 | Tokenized `.ics` calendar feed generation per staff | todo | unassigned | main | T19 | no | - |
| T21 | Staff profiles, specialties & local photo upload | todo | unassigned | main | T06, T19 | yes | 011 |
| T22 | Staff self-service portal | todo | unassigned | main | T21 | no | - |
| T23 | Public booking endpoint (`/book`) & slot calculation | todo | unassigned | main | T03, T19 | yes | - |
| T24 | Public booking frontend wizard (Mobile-first RTL) | todo | unassigned | main | T23 | no | - |
| T25 | Public booking SMS confirmation & cancel/reschedule link | todo | unassigned | main | T10, T24 | no | - |
| T26 | Seed Persian demo data (salon, services, staff, clients) | todo | unassigned | main | T06, T15, T22 | no | 012 |
| T27 | End-to-end booking & SMS dry-run verification | todo | unassigned | main | T25, T26 | no | - |
| T28 | Inventory auto-decrement integration test | todo | unassigned | main | T07, T27 | no | - |
| T29 | Reports validation against seeded demo data | todo | unassigned | main | T13, T26 | no | - |
| T30 | Responsive UI verification (375px & 1440px RTL) | todo | unassigned | main | T24, T28 | no | - |
| T31 | `.env.example` setup & documentation review | todo | unassigned | main | T03 | no | - |
| T32 | Final verification report & license notice check | todo | unassigned | main | T30, T31 | no | - |

## Existing Code (pre-plan, partial)
The baseline already contains partial work that later tasks must extend, not recreate:
- Migrations on disk: `001_initial`, `002_localization`, `003_inventory` (items/categories/suppliers/transactions), `004_sms_mediana` (configs/templates/logs). Next free number is **005**.
- T04/T05: `src/client/lib/{i18n,currency,phone,jalali}.ts` and `src/client/context.tsx` exist. Font files are placeholders (see Known Issues). Header date renders Latin digits.
- T07/T08: `src/server/{routes,services}/inventory.ts` (CRUD, transactions, low stock) and `src/client/pages/inventory.tsx`. Missing: service-consumption mapping, auto-decrement, days-to-stockout, reorder, valuation.
- T09-T11: `src/server/services/mediana.ts` is a concrete Mediana client with sandbox mode and logs; `src/client/pages/sms.tsx` exists. Missing: `SmsProvider` interface/registry, queue with retry/backoff, segment counting.

## Decisions
- Migrations stored in `migrations/` and executed sequentially by `src/server/db.ts`. The runner owns `schema_migrations` rows; migrations must NOT insert their own version.
- Dev tooling (approved 2026-11-16): `@hono/node-server` + `tsx` (dev). `npm run server` = API on `PORT` (default 8787); `npm run dev` = Vite on 5173 proxying `/api`.
- `better-sqlite3` pinned to ^13 (prebuilt binaries for Node 26; v11 needs a C++ toolchain on Windows).

## Known Issues
- Authentic Vazirmatn fonts bundled in `public/fonts/vazirmatn/` (50KB WOFF2 files) and verified in T04.
- `npm test` calls `python3`, which on Windows is often the Microsoft Store stub; use `python tests/runner.py` there.
- `tsc` reports 6 errors, all from missing `@types/node` / `@types/better-sqlite3` (not installed; adding them needs approval).
- Tests in `tests/` re-implement logic in Python and hit SQLite directly; they do not exercise the TypeScript services or HTTP routes.
