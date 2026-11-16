/**
 * Jalali (Solar Hijri) Date Conversion and Calendar Utilities
 * Accurate algorithmic conversion between Gregorian and Jalali calendars.
 * Standard Iranian week: Starts on Saturday (Shanbeh), ends on Friday (Jomeh - weekend).
 */

import { toPersianDigits } from './currency';

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export const JALALI_MONTH_NAMES_FA = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const JALALI_MONTH_NAMES_EN = [
  'Farvardin', 'Ordibehesht', 'Khordad',
  'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar',
  'Dey', 'Bahman', 'Esfand'
];

export const WEEKDAY_NAMES_FA = [
  'شنبه',        // Shanbeh (Saturday - Start of week)
  'یکشنبه',      // Yekshanbeh (Sunday)
  'دوشنبه',      // Doshanbeh (Monday)
  'سه‌شنبه',     // Seshanbeh (Tuesday)
  'چهارشنبه',    // Chaharshanbeh (Wednesday)
  'پنج‌شنبه',    // Panjshanbeh (Thursday)
  'جمعه'         // Jomeh (Friday - Weekend)
];

export const WEEKDAY_NAMES_SHORT_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * Converts Gregorian date to Jalali (Solar Hijri)
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Converts Jalali date to Gregorian
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  let jy2 = jy + 1595;
  let days = -355668 + (365 * jy2) + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    let v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return { gy, gm, gd };
}

/**
 * Returns Iranian day index (0 = Shanbeh/Saturday ... 6 = Jomeh/Friday)
 */
export function getIranianDayOfWeek(date: Date): number {
  // JavaScript getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const jsDay = date.getDay();
  // Map: Saturday (6) -> 0, Sunday (0) -> 1, ..., Friday (5) -> 6
  return (jsDay + 1) % 7;
}

/**
 * Returns whether given date is weekend (Friday in Iran)
 */
export function isIranianWeekend(date: Date): boolean {
  return getIranianDayOfWeek(date) === 6; // Friday is weekend
}

/**
 * Format Date object to Jalali string YYYY/MM/DD
 */
export function formatJalaliDate(date: Date, delimiter: string = '/', persianDigits: boolean = true): string {
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const mm = String(j.jm).padStart(2, '0');
  const dd = String(j.jd).padStart(2, '0');
  const str = `${j.jy}${delimiter}${mm}${delimiter}${dd}`;
  return persianDigits ? toPersianDigits(str) : str;
}

/**
 * Format Date object to full Persian text e.g. "شنبه ۲۵ فروردین ۱۴۰۳"
 */
export function formatJalaliFullText(date: Date, persianDigits: boolean = true): string {
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const dayName = WEEKDAY_NAMES_FA[getIranianDayOfWeek(date)];
  const monthName = JALALI_MONTH_NAMES_FA[j.jm - 1];
  const dayNum = persianDigits ? toPersianDigits(j.jd) : j.jd;
  const yearNum = persianDigits ? toPersianDigits(j.jy) : j.jy;
  return `${dayName} ${dayNum} ${monthName} ${yearNum}`;
}
