# OpenSalon-fa Specification

Fork https://github.com/clawnify/OpenSalon into a Persian-first salon CRM for the Iranian market.

## 8 Core Features
1. **Smart Inventory**: Product-to-service consumption mapping, auto-decrement on appointment completion, days-to-stockout, reorder suggestions, optional expiry/batch cost, valuation report. Deterministic rules only.
2. **SMS Provider Layer**: Provider-agnostic `SmsProvider` interface + adapter registry. Fully implemented Mediana (https://mediana.ir/sms/). Queue with retry/backoff, delivery log, dry-run mode, Persian segment counting.
3. **Smart Reports**: Revenue by period/staff/service (Jalali), no-show/cancel rates, new vs returning, retention, top clients, busiest hours, product margin, low-stock summary, date-range filter, CSV export.
4. **Customer Profiles**: Preferences, special needs/allergies (tags + free text), birthday (Jalali), referral source, preferred staff, SMS consent flag, behavior metrics, visit timeline.
5. **Automated Personalized SMS**: Persian templates with variables (`{name}`, `{service}`, `{staff}`, `{date}`, `{time}`). Triggers: reminder, thank-you, birthday, win-back, rebooking nudge. Respects consent, quiet hours, daily per-client limits.
6. **Staff Calendar**: Weekly working hours, days off, shifts driving availability. Tokenized read-only `.ics` feed per staff.
7. **Staff Profiles & Auth**: Bio, specialties linked to services, work photos (local upload, size-limited). Minimal auth with owner and staff roles; staff edit only their own profile.
8. **Public Booking (`/book`)**: Service → staff/any → slot → name+phone → confirm. Transactional double-booking prevention, optional SMS OTP, rate limiting, confirmation SMS, cancel/reschedule link.
