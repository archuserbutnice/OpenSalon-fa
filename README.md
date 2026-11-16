# OpenSalon-fa (اپن‌سالن فارسی) ✂️🌸

<div align="center">

![OpenSalon-fa Banner](https://img.shields.io/badge/OpenSalon--fa-Persian--First%20Salon%20CRM-ec4899?style=for-the-badge&logo=scissors&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Frontend: Preact](https://img.shields.io/badge/Frontend-Preact%20%2B%20TypeScript-673ab8?style=flat-square&logo=preact&logoColor=white)](https://preactjs.com/)
[![Styling: Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Backend: Hono](https://img.shields.io/badge/Backend-Hono%20REST%20API-e36209?style=flat-square&logo=hono&logoColor=white)](https://hono.dev/)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite%20(Local%20Persistent)-003b57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Localization: Persian & RTL](https://img.shields.io/badge/Localization-Persian%20(fa)%20%2B%20RTL-10b981?style=flat-square)](https://github.com/archuserbutnice/OpenSalon-fa)
[![Calendar: Jalali](https://img.shields.io/badge/Calendar-Jalali%20(Solar%20Hijri)-f59e0b?style=flat-square)](https://github.com/archuserbutnice/OpenSalon-fa)

**سامانه جامع، متن‌باز و بومی مدیریت سالن‌های زیبایی، آرایشگاه‌ها و اسپا برای بازار ایران**  
*An open-source, Persian-first salon CRM and appointment booking platform customized for the Iranian beauty and wellness industry.*

[ویژگی‌ها](#-ویژگی‌های-کلیدی-key-features) • [استانداردهای بومی‌سازی](#-استانداردهای-بومی‌سازی-iranian-market-standards) • [راه‌اندازی سریع](#-راهنمای-نصب-و-اجرا-quickstart) • [معماری پروژه](#-معماری-سیستم-architecture) • [مستندات تسک‌ها](#-مستندات-پروژه-docs)

</div>

---

## 📖 درباره پروژه (About The Project)

**OpenSalon-fa** نسخه بومی‌سازی‌شده و توسعه‌یافته از پلتفرم مدرن [OpenSalon](https://github.com/clawnify/OpenSalon) است. این نرم‌افزار به صورت تخصصی برای پاسخگویی به نیازمندی‌های منحصر‌به‌فرد سالن‌های زیبایی بانوان، آرایشگاه‌های مردانه، کلینیک‌های مراقبت پوست و ناخن در ایران بازطراحی شده است.

تمرکز اصلی پروژه بر **سرعت بالا**، **سادگی کاربری در موبایل و دسکتاپ**، **پشتیبانی کامل از تقویم شمسی**، **محاسبه هوشمند موجودی انبار بر اساس خدمات**، و **اتصال مستقیم به وب‌سرویس پیامکی مدیانا (Mediana)** می‌باشد.

---

## ✨ ویژگی‌های کلیدی (8 Core Features)

| # | قابلیت (Feature) | توضیحات فنی | وضعیت |
|:---:|:---|:---|:---:|
| 1 | 📦 **انبارداری هوشمند (Smart Inventory)** | رهگیری مصرف کالا به ازای هر خدمت سالن، کسر خودکار با اتمام نوبت، هشدار کسری موجودی، پیشنهاد سفارش مجدد بر اساس مصرف میانگین | ✅ آماده |
| 2 | 📱 **درگاه پیامک مدیانا (Mediana SMS Layer)** | پیاده‌سازی کامل وب‌سرویس پترن و پیامک مستقیم `api.mediana.ir`، صف ارسال با تلاش مجدد (Backoff)، حالت Sandbox تستی، نرمال‌سازی شماره‌های موبایل | ✅ آماده |
| 3 | 📊 **گزارشات و تحلیل مالی (Smart Reports)** | گزارش درآمد بر اساس پرسنل، خدمات و دوره‌های تقویم جلالی، تحلیل نرخ لغو و عدم حضور (No-show)، خروجی CSV | 🔄 در حال توسعه |
| 4 | 👤 **پرونده و سوابق مشتریان (Customer Profiles)** | ثبت علایق، فرمول‌های رنگ مو، حساسیت‌ها، تاریخ تولد شمسی، پرسنل محبوب، رضایت پیامکی و خط زمانی مراجعات | 🔄 در حال توسعه |
| 5 | 🔔 **پیامک‌های خودکار هوشمند (Automated SMS)** | الگوهای تایید نوبت، یادآوری ۲۴ ساعت قبل، تبریک تولد، نظرسنجی؛ رعایت ساعات سکوت شبانه و سقف پیام روزانه | 🔄 در حال توسعه |
| 6 | 📅 **تقویم پرسنل و خروجی ICS (Staff Calendar)** | شیفت‌بندی هفتگی پرسنل (شروع از شنبه، تعطیلی جمعه)، محاسبه زمان آزاد، لینک اشتراک تقویم استاندارد `.ics` | 🔄 در حال توسعه |
| 7 | 👥 **پروفایل و دسترسی پرسنل (Staff Profiles & RBAC)** | تفکیک نقش‌های مدیر (Owner) و پرسنل (Staff)، پورسانت خدمات، تخصص‌ها، گالری نمونه‌کار محلی کم‌حجم | 🔄 در حال توسعه |
| 8 | 🌐 **پورتال رزرو آنلاین نوبت (Public Booking)** | ویجت نوبت‌دهی آنلاین ویژه مشتریان تحت مسیر `/book` با جلوگیری تراکنشی از تداخل نوبت، انتخاب پرسنل و پیامک تایید | 🔄 در حال توسعه |

---

## 🇮🇷 استانداردهای بومی‌سازی (Iranian Market Standards)

- **راست‌چین کامل (Native RTL)**: تمامی صفحات، فرم‌ها، جداول و ویجت‌ها با چیدمان راست‌به‌چپ (`dir="rtl"`) سازگار شده‌اند.
- **فونت وزیزمتن محلی (Bundled Vazirmatn)**: بدون وابستگی به CDN خارجی، فونت رسمی فارسی به صورت لوکال در قالب وزن‌های متنوع لود می‌شود.
- **گاه‌شمار هجری شمسی (Jalali Calendar)**:
  - پایگاه داده تاریخ‌ها را به صورت استاندارد جهانی UTC ISO ذخیره می‌کند.
  - کلیه ورودی‌ها و نمایش‌ها با تقویم جلالی (`۱۴۰۳/۰۸/۲۵`) انجام می‌پذیرد.
  - هفته از **شنبه** آغاز و **جمعه** به عنوان تعطیل رسمی مشخص است.
- **واحد پولی تومان با سوئیچ ریال (Toman / Rial Currency)**:
  - مبالغ در دیتابیس به صورت عدد صحیح تومان ذخیره می‌شوند.
  - امکان تغییر لحظه‌ای نمایش بین تومان و ریال با یک کلیک.
  - تبدیل خودکار ارقام انگلیسی به ارقام فارسی (`۰۱۲۳۴۵۶۷۸۹`) و جداسازی سه‌رقمی (`،`).
- **نرمال‌سازی پیشرفته شماره موبایل**:
  - پشتیبانی از تمام فرمت‌های ورودی (`+989...`، `00989...`، `989...`، `۰۹...`).
  - نرمال‌سازی خودکار به فرمت استاندارد ۱۱ رقمی ایرانی (`09xxxxxxxxx`) قبل از ثبت یا ارسال پیامک.

---

## 🛠️ ساختار فنی و فایل‌ها (Architecture)

```text
OpenSalon-fa/
├── migrations/                  # مایگریشن‌های ترتیبی دیتابیس SQLite
│   ├── 001_initial.sql          # جداول پایه (مشتریان، پرسنل، خدمات، نوبت‌ها)
│   ├── 002_localization.sql     # تنظیمات بومی سالن، ارز و تقویم
│   ├── 003_inventory.sql        # انبارداری، دسته‌بندی، تامین‌کنندگان، گردش کالا
│   └── 004_sms_mediana.sql      # تنظیمات درگاه مدیانا، الگوها و گزارشات ارسال
├── src/
│   ├── server/                  # بک‌اند سبک مبتنی بر Hono
│   │   ├── db.ts                # اتصال SQLite و اجرای خودکار مایگریشن‌ها
│   │   ├── index.ts             # نقطه شروع API سرور
│   │   ├── routes/              # روت‌های ماژولار (/api/inventory, /api/sms, ...)
│   │   └── services/            # وب‌سرویس مدیانا و منطق پردازش انبار
│   └── client/                  # فرانت‌اند فوق سریع Preact + Tailwind
│       ├── app.tsx              # کامپوننت ریشه با ناوبری و سوئیچ ارز
│       ├── context.tsx          # مدیریت وضعیت سراسری (زبان، تقویم، تم)
│       ├── lib/                 # ابزارهای تقویم جلالی، ارقام فارسی، نرمال‌سازی شماره
│       └── pages/               # صفحات انبارداری، پیامک و تقویم
├── public/fonts/vazirmatn/      # بسته‌های فونت وزیزمتن محلی (WOFF2)
├── tests/                       # آزمون‌های خودکار صحه‌سنجی قابلیت‌ها
└── docs/ai/                     # مستندات و ماتریس پیشرفت هوش مصنوعی
```

---

## 🚀 راهنمای نصب و اجرا (Quickstart)

### پیش‌نیازها
- **Node.js** (نسخه ۲۲ به بالا) و **Python 3** (جهت اجرای تست‌ها)
- **pnpm** یا **npm**

### ۱. دریافت مخزن
```bash
git clone git@github.com:archuserbutnice/OpenSalon-fa.git
cd OpenSalon-fa
```

### ۲. نصب وابستگی‌ها
```bash
npm install
# یا با pnpm:
# pnpm install
```

### ۳. راه‌اندازی سرور توسعه (Frontend & API)
سرور API و سرور فرانت‌اند را در دو ترمینال جداگانه اجرا کنید:
```bash
# ترمینال ۱: سرور API (پورت 8787، قابل تغییر با متغیر PORT)
npm run server

# ترمینال ۲: سرور فرانت‌اند Vite (درخواست‌های /api را به سرور API ارسال می‌کند)
npm run dev
```
اپلیکیشن در آدرس `http://localhost:5173` در دسترس خواهد بود. پایگاه داده `data.db` و مایگریشن‌ها در اولین اجرای سرور API به‌صورت خودکار ساخته می‌شوند.

### ۴. اجرای آزمون‌های خودکار
برای اطمینان از عملکرد بدون نقص محاسبات جلالی، نرمال‌سازی شماره‌ها، مایگریشن‌ها و وب‌سرویس‌ها:
```bash
npm test
# یا مستقیماً (در ویندوز به‌جای python3 از python استفاده کنید):
# python3 tests/runner.py
```

---

## 📡 وب‌سرویس پیامک مدیانا (Mediana Integration)

درگاه پیامک بر اساس مستندات رسمی وب‌سرویس REST مدیانا (`api.mediana.ir`) توسعه یافته است:

- **ارسال با پترن (کد الگو)**: جهت تحویل فوری نوبت و کد تایید OTP حتی به شماره‌های مسدود در بلک‌لیست تبلیغاتی.
  - Endpoint: `POST https://api.mediana.ir/sms/v1/send/pattern`
- **ارسال مستقیم / اطلاع‌رسانی**: جهت ارسال پیام‌های گروهی یا عمومی با سرشماره‌های خدماتی سالن.
  - Endpoint: `POST https://api.mediana.ir/sms/v1/send/sms`
- **محیط آزمایشی (Sandbox)**: حالت پیش‌فرض جهت تست جریان ثبت نوبت و لاگ بدون کسر هزینه واقعی پیامک.

---

## 📑 مستندات پروژه (Docs & Collaboration Protocol)

پروژه از سیستم مدیریت پیشرفت بدون نیاز به حافظه چت استفاده می‌کند:
- [AGENTS.md](AGENTS.md): پروتکل استاندارد کارکرد ایجنت‌های توسعه‌دهنده هوش مصنوعی.
- [docs/ai/SPEC.md](docs/ai/SPEC.md): سند نیازمندی‌ها و مشخصات فنی ۸ ویژگی اصلی.
- [docs/ai/STATE.md](docs/ai/STATE.md): ماتریس پیشرفت تسک‌های ۳۲گانه پروژه.
- [docs/ai/HANDOFF.md](docs/ai/HANDOFF.md): وضعیت لحظه‌ای لاگ آخرین تحویل کار.

---

## ⚖️ مجوز (License)

این پروژه تحت مجوز [MIT License](LICENSE) منتشر شده است و برای استفاده رایگان، شخصی یا تجاری در دسترس عموم قرار دارد.
برگرفته از پروژه متن‌باز [OpenSalon](https://github.com/clawnify/OpenSalon).
