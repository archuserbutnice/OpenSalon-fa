# Project State

| id | title | status | owner_tool | branch | depends_on | parallel_ok | migration_no |
|---|---|---|---|---|---|---|---|
| T01 | Repo cleanup & gitignore update | done | system | main | none | no | 001 |
| T02 | Migration mechanism & baseline schema | done | system | main | T01 | no | 001 |
| T03 | Modular API route refactoring | todo | unassigned | main | T02 | no | - |
| T04 | i18n, RTL, Vazirmatn font, currency & phone normalization | todo | unassigned | main | T02 | no | - |
| T05 | Jalali calendar integration & formatting utils | todo | unassigned | main | T04 | no | - |
| T06 | Minimal authentication (owner/staff roles & sessions) | todo | unassigned | main | T02 | no | 002 |
| T07 | Smart Inventory DB schema & backend logic | todo | unassigned | main | T03, T06 | yes | 003 |
| T08 | Smart Inventory UI & reorder suggestions | todo | unassigned | main | T07 | no | - |
| T09 | SMS Provider interface & queue engine | todo | unassigned | main | T03 | yes | 004 |
| T10 | Mediana SMS adapter implementation | todo | unassigned | main | T09 | no | - |
| T11 | SMS delivery logs & dry-run toggle UI | todo | unassigned | main | T10 | no | - |
| T12 | Smart Reports backend aggregation | todo | unassigned | main | T03, T06 | yes | - |
| T13 | Smart Reports dashboard widgets & CSV export | todo | unassigned | main | T12 | no | - |
| T14 | Customer profiles extension schema & backend | todo | unassigned | main | T03, T06 | yes | 005 |
| T15 | Customer profiles UI & visit timeline | todo | unassigned | main | T14 | no | - |
| T16 | Automated SMS templates & rule engine | todo | unassigned | main | T10, T14 | no | 006 |
| T17 | Quiet hours, consent & rate-limiting for automated SMS | todo | unassigned | main | T16 | no | - |
| T18 | Automated SMS manual segment send & preview UI | todo | unassigned | main | T17 | no | - |
| T19 | Staff working hours & shift management backend | todo | unassigned | main | T03, T06 | yes | 007 |
| T20 | Tokenized `.ics` calendar feed generation per staff | todo | unassigned | main | T19 | no | - |
| T21 | Staff profiles, specialties & local photo upload | todo | unassigned | main | T06, T19 | yes | 008 |
| T22 | Staff self-service portal | todo | unassigned | main | T21 | no | - |
| T23 | Public booking endpoint (`/book`) & slot calculation | todo | unassigned | main | T03, T19 | yes | - |
| T24 | Public booking frontend wizard (Mobile-first RTL) | todo | unassigned | main | T23 | no | - |
| T25 | Public booking SMS confirmation & cancel/reschedule link | todo | unassigned | main | T10, T24 | no | - |
| T26 | Seed Persian demo data (salon, services, staff, clients) | todo | unassigned | main | T06, T15, T22 | no | 009 |
| T27 | End-to-end booking & SMS dry-run verification | todo | unassigned | main | T25, T26 | no | - |
| T28 | Inventory auto-decrement integration test | todo | unassigned | main | T07, T27 | no | - |
| T29 | Reports validation against seeded demo data | todo | unassigned | main | T13, T26 | no | - |
| T30 | Responsive UI verification (375px & 1440px RTL) | todo | unassigned | main | T24, T28 | no | - |
| T31 | `.env.example` setup & documentation review | todo | unassigned | main | T03 | no | - |
| T32 | Final verification report & license notice check | todo | unassigned | main | T30, T31 | no | - |

## Decisions
- Baseline established with pre-forked structure.
- Migrations stored in `migrations/` and executed sequentially.

## Known Issues
- None so far.
