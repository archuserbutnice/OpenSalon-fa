# SPEC.md — OpenSalon-fa Technical Specification

## 1. System Overview
OpenSalon-fa is an Iranian-market adaptation of the OpenSalon salon management system (`clawnify/OpenSalon`). It is tailored for beauty salons, barbershops, and spas across Iran, offering native Persian UI, Jalali calendar scheduling, Toman currency tracking, Iranian phone number handling, and Mediana SMS gateway integration.

## 2. Tech Stack & Directory Structure
```text
OpenSalon-fa/
├── migrations/
│   ├── 001_initial.sql          # Core tables: clients, staff, services, appointments, products
│   ├── 002_localization.sql     # Salon settings, locale, currency toggle, calendar configs
│   ├── 003_inventory.sql        # Inventory items, suppliers, transactions, thresholds
│   └── 004_sms_mediana.sql      # SMS gateway config, templates, delivery logs
├── src/
│   ├── server/
│   │   ├── db.ts                # SQLite helper with auto-migration runner
│   │   ├── index.ts             # Hono REST API application
│   │   ├── routes/              # Modular API handlers
│   │   │   ├── inventory.ts     # /api/inventory endpoints
│   │   │   └── sms.ts           # /api/sms endpoints
│   │   └── services/
│   │       ├── mediana.ts       # Documented Mediana SMS client
│   │       └── inventory.ts     # Stock & transaction calculations
│   └── client/
│       ├── app.tsx              # Root Preact component (RTL, Vazirmatn)
│       ├── context.tsx          # Global context (locale, settings, active date)
│       ├── lib/
│       │   ├── i18n.ts          # Persian/English dictionary & t() function
│       │   ├── jalali.ts        # Gregorian-Jalali date conversion & calendar helpers
│       │   ├── currency.ts      # Toman/Rial formatters & Persian digits
│       │   ├── phone.ts         # Iranian mobile normalizer & validator
│       │   └── utils.ts         # Tailwind styling helpers
│       ├── pages/
│       │   ├── appointments.tsx # Scheduling calendar
│       │   ├── inventory.tsx    # Inventory management & alerts
│       │   └── sms.tsx          # SMS configuration, templates & logs
│       └── components/          # Reusable UI widgets
├── public/
│   └── fonts/
│       └── vazirmatn/           # Locally bundled Vazirmatn fonts (woff2)
├── tests/                       # Automated test verification suite
└── docs/ai/                     # Machine-readable project state
```

## 3. Iranian Market Standards
### 3.1 Persian Localization & Typography
- Application markup sets `dir="rtl"` and `lang="fa"` by default.
- Typography uses locally bundled Vazirmatn (`public/fonts/vazirmatn/`). No external font CDNs are permitted.
- Numbers rendered in Persian context are converted to Eastern Arabic/Persian digits (`۰۱۲۳۴۵۶۷۸۹`).

### 3.2 Jalali Calendar & Scheduling
- Database stores standard ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ssZ`).
- User input and displays use the Jalali solar calendar (`YYYY/MM/DD`).
- Week structure:
  - Week start: Saturday (شنبه - Shanbeh)
  - Week end / official holiday: Friday (جمعه - Jomeh)
  - Days of week: شنبه (Sat), یکشنبه (Sun), دوشنبه (Mon), سه‌شنبه (Tue), چهارشنبه (Wed), پنج‌شنبه (Thu), جمعه (Fri).

### 3.3 Currency (Toman / Rial)
- Internal DB storage is integer Toman (`INTEGER NOT NULL`).
- UI allows toggling between Toman (تومان) and Rial (ریال).
- Exchange factor: 1 Toman = 10 Rials.
- Formatted output includes thousands separators (`،` or `,`) and Persian digits.

### 3.4 Phone Number Normalization
- Accepts varied inputs: `+989123456789`, `00989123456789`, `09123456789`, `9123456789`.
- Standard national normalized format: `09xxxxxxxxx` (11 digits, starts with `09`).
- International E.164 normalized format: `+989xxxxxxxxx`.
- Storage and SMS dispatch enforce normalization prior to persistence.

### 3.5 Mediana SMS Gateway Integration
- Documented REST endpoints from `api.mediana.ir`:
  1. **Pattern SMS**: `POST https://api.mediana.ir/sms/v1/send/pattern`
     - Headers: `X-API-KEY: <key>`, `Content-Type: application/json`
     - Payload:
       ```json
       {
         "patternCode": "string",
         "originator": "+98...",
         "recipient": "0912...",
         "values": { "key": "value" }
       }
       ```
  2. **Standard / Direct SMS**: `POST https://api.mediana.ir/sms/v1/send/sms`
     - Headers: `X-API-KEY: <key>`, `Content-Type: application/json`
     - Payload:
       ```json
       {
         "type": "Informational",
         "recipients": ["0912..."],
         "messageText": "string",
         "dateTime": "YYYY-MM-DDTHH:mm:ss"
       }
       ```
- Undocumented parameters must not be assumed; if any unknown parameter is encountered, tag it `[unverified]`.

## 4. The 8 Core Features
1. **Inventory (T03)**:
   - Retail & backbar product tracking
   - Stock in / out / adjustment ledger (`inventory_transactions`)
   - Supplier directory & minimum stock alert thresholds
   - Integration with appointment service usage
2. **SMS Layer / Mediana (T04)**:
   - Configurable API credentials & sender lines
   - Pre-approved pattern templates (OTP, appointment confirmations)
   - Immediate & scheduled direct messaging
   - Comprehensive delivery audit log
3. **Reports & Analytics (T05)**: Revenue, appointment volume, staff earnings, popular services.
4. **Customer Profiles (T06)**: Contact info, visit history, preferred staff, notes & formulas.
5. **Automated SMS Triggers (T07)**: Booking notifications, 24h reminders, post-visit review requests.
6. **Staff Calendar / ICS (T08)**: Shift scheduling, breaks, Jalali day view, iCalendar sync.
7. **Staff Profiles & Auth (T09)**: Commission rates, role-based access control, secure authentication.
8. **Public Booking (T10)**: Online appointment reservation widget for clients.
