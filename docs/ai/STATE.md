# STATE.md — Project Task Matrix & Status Tracking

## Active Task
- Current active task: None (Ready for claiming)

## Task Matrix
| Task ID | Feature Name | Description | Status | Blockers | Commits |
|---|---|---|---|---|---|
| T01 | Project Scaffolding | OpenSalon fork baseline, package structure, SQLite db runner | done | None | Initial |
| T02 | Persian Localization Core | RTL, local Vazirmatn fonts, Jalali calendar, Toman currency, phone normalizer, i18n | done | None | Initial |
| T03 | Inventory Management | Stock tracking, low-stock alerts, transactions ledger, suppliers, /api/inventory | todo | None | Pending |
| T04 | SMS Layer / Mediana | Mediana API integration, pattern & direct sends, logs, /api/sms | todo | None | Pending |
| T05 | Reports & Analytics | Revenue, staff performance, service stats | todo | T01, T03 | Pending |
| T06 | Customer Profiles | Visit history, client preferences, notes | todo | T01 | Pending |
| T07 | Automated SMS Triggers | Booking confirmation & reminder SMS | todo | T04, T06 | Pending |
| T08 | Staff Calendar & ICS | Staff shift schedule, Jalali day view, RFC 5545 ICS | todo | T01, T02 | Pending |
| T09 | Staff Profiles & Auth | RBAC, staff credentials, commission rates | todo | T01 | Pending |
| T10 | Public Booking Portal | Client-facing booking interface with Jalali date picker | todo | T01, T02, T07 | Pending |

## Task Status Legend
- `todo`: Eligible for claiming according to dependencies
- `claimed`: Currently owned and in progress by agent
- `done`: Fully implemented, verified with tests, and committed
- `blocked`: Cannot proceed until specified prerequisite is completed
