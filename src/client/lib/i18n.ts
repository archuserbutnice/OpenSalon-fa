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
    'inventory.title': 'مدیریت موجودی کالا و انبار',
    'inventory.low_stock': 'هشدار کسری موجودی',
    'inventory.add_item': 'افزودن کالای جدید',
    'inventory.sku': 'شناسه کالا (SKU)',
    'inventory.quantity': 'موجودی فعلی',
    'inventory.min_quantity': 'حداقل موجودی هشدار',
    'inventory.transactions': 'گردش انبار',
    'sms.title': 'سامانه پیامک مدیانا',
    'sms.send_pattern': 'ارسال پیامک الگو (پترن)',
    'sms.send_direct': 'ارسال پیامک مستقیم',
    'sms.logs': 'گزارش پیامک‌های ارسالی',
    'sms.config': 'تنظیمات درگاه مدیانا',
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
    'inventory.title': 'Inventory Management',
    'inventory.low_stock': 'Low Stock Alert',
    'inventory.add_item': 'Add New Item',
    'inventory.sku': 'SKU',
    'inventory.quantity': 'Stock Quantity',
    'inventory.min_quantity': 'Min Quantity Threshold',
    'inventory.transactions': 'Transactions Ledger',
    'sms.title': 'Mediana SMS Gateway',
    'sms.send_pattern': 'Send Pattern SMS',
    'sms.send_direct': 'Send Direct SMS',
    'sms.logs': 'SMS Dispatch Logs',
    'sms.config': 'Mediana Gateway Config',
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
