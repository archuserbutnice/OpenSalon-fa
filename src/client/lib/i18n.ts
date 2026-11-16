/**
 * Localization (i18n) Engine with Persian Default and English Fallback
 */

export type Locale = 'fa' | 'en';

export const DICTIONARY: Record<Locale, Record<string, string>> = {
  fa: {
    'app.name': 'سامانه مدیریت سالن رز',
    'nav.calendar': 'تقویم نوبت‌ها',
    'nav.clients': 'مشتریان',
    'nav.services': 'خدمات',
    'nav.inventory': 'انبار و محصولات',
    'nav.sms': 'سامانه پیامک',
    'nav.reports': 'گزارشات',
    'nav.settings': 'تنظیمات',
    'common.save': 'ذخیره',
    'common.cancel': 'انصراف',
    'common.delete': 'حذف',
    'common.edit': 'ویرایش',
    'common.add': 'افزودن',
    'common.search': 'جستجو...',
    'common.status': 'وضعیت',
    'common.date': 'تاریخ',
    'common.time': 'زمان',
    'common.phone': 'شماره موبایل',
    'common.price': 'قیمت',
    'common.total': 'مجموع',
    'common.currency.toman': 'تومان',
    'common.currency.rial': 'ریال',
    'common.actions': 'عملیات',
    'common.active': 'فعال',
    'common.inactive': 'غیرفعال',

    // Clients
    'clients.title': 'مدیریت مشتریان',
    'clients.add': 'افزودن مشتری جدید',
    'clients.name': 'نام و نام خانوادگی',
    'clients.phone': 'شماره تماس (همراه)',
    'clients.email': 'پست الکترونیک',
    'clients.notes': 'یادداشت‌ها و فرمول‌ها',
    'clients.last_visit': 'آخرین مراجعه',

    // Staff
    'staff.title': 'مدیریت پرسنل و همکاران',
    'staff.add': 'افزودن پرسنل جدید',
    'staff.role': 'سمت / تخصص',
    'staff.color': 'رنگ در تقویم',
    'staff.stylist': 'آرایشگر / استایلیست',
    'staff.manager': 'مدیر سالن',
    'staff.assistant': 'دستیار',

    // Services
    'services.title': 'لیست خدمات سالن',
    'services.add': 'افزودن خدمت جدید',
    'services.duration': 'مدت زمان (دقیقه)',
    'services.category': 'دسته‌بندی',

    // Appointments
    'appointments.title': 'نوبت‌دهی و تقویم',
    'appointments.new': 'ثبت نوبت جدید',
    'appointments.client': 'مشتری',
    'appointments.staff': 'پرسنل ارائه دهنده',
    'appointments.service': 'نوع خدمت',
    'appointments.start_time': 'زمان شروع',
    'appointments.end_time': 'زمان پایان',
    'appointments.status.confirmed': 'تایید شده',
    'appointments.status.completed': 'انجام شده',
    'appointments.status.cancelled': 'لغو شده',
    'appointments.status.no_show': 'عدم حضور',

    // Inventory
    'inventory.title': 'مدیریت موجودی کالا و انبار',
    'inventory.low_stock': 'هشدار کسری موجودی',
    'inventory.add_item': 'افزودن کالای جدید',
    'inventory.sku': 'شناسه کالا (SKU)',
    'inventory.quantity': 'موجودی فعلی',
    'inventory.min_quantity': 'حداقل موجودی هشدار',
    'inventory.transactions': 'گردش انبار',

    // SMS
    'sms.title': 'سامانه پیامک مدیانا',
    'sms.send_pattern': 'ارسال پیامک الگو (پترن)',
    'sms.send_direct': 'ارسال پیامک مستقیم',
    'sms.logs': 'گزارش پیامک‌های ارسالی',
    'sms.config': 'تنظیمات درگاه مدیانا',

    // Settings
    'settings.title': 'تنظیمات سامانه',
    'settings.salon_name': 'نام سالن',
    'settings.calendar': 'تقویم پیش‌فرض',
    'settings.currency': 'واحد پول اصلی'
  },
  en: {
    'app.name': 'Rose Salon Management',
    'nav.calendar': 'Calendar',
    'nav.clients': 'Clients',
    'nav.services': 'Services',
    'nav.inventory': 'Inventory',
    'nav.sms': 'SMS Gateway',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search...',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.time': 'Time',
    'common.phone': 'Phone Number',
    'common.price': 'Price',
    'common.total': 'Total',
    'common.currency.toman': 'Toman',
    'common.currency.rial': 'Rial',
    'common.actions': 'Actions',
    'common.active': 'Active',
    'common.inactive': 'Inactive',

    // Clients
    'clients.title': 'Client Management',
    'clients.add': 'Add New Client',
    'clients.name': 'Full Name',
    'clients.phone': 'Mobile Number',
    'clients.email': 'Email',
    'clients.notes': 'Notes & Formulas',
    'clients.last_visit': 'Last Visit',

    // Staff
    'staff.title': 'Staff Management',
    'staff.add': 'Add Staff Member',
    'staff.role': 'Role / Specialty',
    'staff.color': 'Calendar Color',
    'staff.stylist': 'Hair Stylist',
    'staff.manager': 'Salon Manager',
    'staff.assistant': 'Assistant',

    // Services
    'services.title': 'Salon Services',
    'services.add': 'Add New Service',
    'services.duration': 'Duration (minutes)',
    'services.category': 'Category',

    // Appointments
    'appointments.title': 'Appointments & Scheduling',
    'appointments.new': 'New Appointment',
    'appointments.client': 'Client',
    'appointments.staff': 'Staff Provider',
    'appointments.service': 'Service',
    'appointments.start_time': 'Start Time',
    'appointments.end_time': 'End Time',
    'appointments.status.confirmed': 'Confirmed',
    'appointments.status.completed': 'Completed',
    'appointments.status.cancelled': 'Cancelled',
    'appointments.status.no_show': 'No Show',

    // Inventory
    'inventory.title': 'Inventory Management',
    'inventory.low_stock': 'Low Stock Alert',
    'inventory.add_item': 'Add New Item',
    'inventory.sku': 'SKU',
    'inventory.quantity': 'Stock Quantity',
    'inventory.min_quantity': 'Min Quantity Threshold',
    'inventory.transactions': 'Transactions Ledger',

    // SMS
    'sms.title': 'Mediana SMS Gateway',
    'sms.send_pattern': 'Send Pattern SMS',
    'sms.send_direct': 'Send Direct SMS',
    'sms.logs': 'SMS Dispatch Logs',
    'sms.config': 'Mediana Gateway Config',

    // Settings
    'settings.title': 'System Settings',
    'settings.salon_name': 'Salon Name',
    'settings.calendar': 'Default Calendar',
    'settings.currency': 'Base Currency'
  }
};

let currentLocale: Locale = 'fa';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = DICTIONARY[currentLocale] || DICTIONARY.fa;
  let text = dict[key] || DICTIONARY.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }
  }
  return text;
}
